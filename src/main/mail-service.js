const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');
const sanitizeHtml = require('sanitize-html');
const { Pop3Client } = require('./pop3-client');
const { storeMessage } = require('./message-store');

function imapOptions(account) {
  return {
    host: account.incomingHost,
    port: Number(account.incomingPort),
    secure: Boolean(account.incomingSecure),
    auth: { user: account.username, pass: account.password },
    logger: false,
    tls: { rejectUnauthorized: true },
    socketTimeout: 30000
  };
}

function smtpTransport(account) {
  return nodemailer.createTransport({
    host: account.outgoingHost,
    port: Number(account.outgoingPort),
    secure: Boolean(account.outgoingSecure),
    auth: { user: account.username, pass: account.password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: { rejectUnauthorized: true }
  });
}

async function withPop3(account, action) {
  const client = new Pop3Client({
    host: account.incomingHost,
    port: Number(account.incomingPort),
    secure: Boolean(account.incomingSecure)
  });
  await client.connect();
  try {
    await client.login(account.username, account.password);
    return await action(client);
  } finally {
    await client.close();
  }
}

async function testConfiguration(account) {
  if (account.protocol === 'pop3') {
    await withPop3(account, async () => undefined);
  } else {
    const client = new ImapFlow(imapOptions(account));
    await client.connect();
    await client.logout();
  }
  const transport = smtpTransport(account);
  await transport.verify();
  transport.close();
  return { incoming: true, outgoing: true };
}

async function listFolders(account) {
  if (account.protocol === 'pop3') {
    return [{ path: 'INBOX', name: 'Boîte de réception', specialUse: '\\Inbox' }];
  }
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  try {
    const folders = await client.list();
    return folders
      .map((folder) => ({
        path: folder.path,
        name: folder.path.toUpperCase() === 'INBOX' ? 'Boîte de réception' : folder.name || folder.path,
        specialUse: folder.specialUse || '',
        delimiter: folder.delimiter || '/',
        selectable: !folder.flags?.has('\\Noselect')
      }))
      .sort((left, right) => {
        if (left.path.toUpperCase() === 'INBOX') return -1;
        if (right.path.toUpperCase() === 'INBOX') return 1;
        return left.name.localeCompare(right.name, 'fr');
      });
  } finally {
    await client.logout().catch(() => undefined);
  }
}

async function syncImap(account, folder, fetchAll = false) {
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  let imported = 0;
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    const total = client.mailbox.exists;
    if (!total) return { imported: 0, total: 0 };
    const start = fetchAll ? 1 : Math.max(1, total - 49);
    for await (const item of client.fetch(`${start}:*`, {
      uid: true,
      flags: true,
      internalDate: true,
      source: true
    })) {
      const parsed = await simpleParser(item.source);
      storeMessage({
        accountId: account.id,
        folder,
        remoteId: folder.toUpperCase() === 'INBOX' ? `imap-${item.uid}` : `imap-${folder}-${item.uid}`,
        subject: parsed.subject,
        from: parsed.from,
        to: parsed.to,
        date: parsed.date || item.internalDate,
        text: parsed.text,
        html: parsed.html,
        attachments: parsed.attachments,
        raw: item.source,
        isRead: item.flags?.has('\\Seen')
      });
      imported += 1;
    }
    return { imported, total };
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => undefined);
  }
}

async function syncPop3(account, fetchAll = false) {
  return withPop3(account, async (client) => {
    const uidLines = await client.command('UIDL', true);
    const entries = uidLines.map((line) => {
      const [number, uid] = line.split(/\s+/, 2);
      return { number: Number(number), uid };
    }).filter((entry) => entry.number && entry.uid);
    const selected = fetchAll ? entries : entries.slice(-50);
    for (const entry of selected) {
      const lines = await client.command(`RETR ${entry.number}`, true);
      const raw = Buffer.from(`${lines.join('\r\n')}\r\n`, 'latin1');
      const parsed = await simpleParser(raw);
      storeMessage({
        accountId: account.id,
        folder: 'INBOX',
        remoteId: `pop3-${entry.uid}`,
        subject: parsed.subject,
        from: parsed.from,
        to: parsed.to,
        date: parsed.date,
        text: parsed.text,
        html: parsed.html,
        attachments: parsed.attachments,
        raw,
        isRead: false
      });
    }
    return { imported: selected.length, total: entries.length };
  });
}

async function syncAccount(account, folder = 'INBOX', fetchAll = false) {
  return account.protocol === 'pop3' ? syncPop3(account, fetchAll) : syncImap(account, folder, fetchAll);
}

function imapUid(reference) {
  const match = String(reference.remoteId || '').match(/-(\d+)$/);
  if (!match) throw new Error('Identifiant IMAP du message invalide.');
  return Number(match[1]);
}

async function setRemoteReadState(account, reference, isRead) {
  if (account.protocol !== 'imap') return { updated: false, localOnly: true };
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock(reference.folder);
    const uid = imapUid(reference);
    if (isRead) await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
    else await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
    return { updated: true };
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => undefined);
  }
}

async function moveRemoteMessage(account, reference, destination) {
  if (account.protocol !== 'imap') throw new Error('Le déplacement dans les dossiers nécessite un compte IMAP.');
  if (!String(destination || '').trim()) throw new Error('Dossier de destination introuvable.');
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock(reference.folder);
    const moved = await client.messageMove(imapUid(reference), destination, { uid: true });
    if (!moved) throw new Error('Le serveur a refusé le déplacement du message.');
    return { moved: true };
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => undefined);
  }
}

async function sendMessage(account, message) {
  if (!String(message.to || '').trim()) throw new Error('Le destinataire est obligatoire.');
  const attachments = [];
  let totalAttachmentSize = 0;
  for (const candidate of Array.isArray(message.attachments) ? message.attachments : []) {
    if (!candidate || typeof candidate.path !== 'string') continue;
    const stats = require('node:fs').statSync(candidate.path);
    if (!stats.isFile()) throw new Error('Une pièce jointe sélectionnée n’est plus disponible.');
    totalAttachmentSize += stats.size;
    attachments.push({ filename: require('node:path').basename(candidate.path), path: candidate.path });
  }
  if (totalAttachmentSize > 25 * 1024 * 1024) {
    throw new Error('Le total des pièces jointes dépasse la limite de 25 Mo.');
  }
  const transport = smtpTransport(account);
  const html = sanitizeHtml(String(message.htmlBody || ''), {
    allowedTags: ['p', 'div', 'span', 'br', 'hr', 'b', 'strong', 'i', 'em', 'u', 's', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a'],
    allowedAttributes: { '*': ['style'], a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i],
        'font-size': [/^(?:xx-small|x-small|small|medium|large|x-large|xx-large|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/i],
        'font-weight': [/^(?:normal|bold|[1-9]00)$/i],
        'font-style': [/^(?:normal|italic|oblique)$/i],
        'text-decoration': [/^(?:none|underline|line-through)(?:\s+solid)?$/i],
        'text-align': [/^(?:left|center|right|justify)$/i]
      }
    },
    disallowedTagsMode: 'discard'
  });
  try {
    const result = await transport.sendMail({
      from: { name: account.name, address: account.email },
      to: String(message.to).trim(),
      cc: String(message.cc || '').trim() || undefined,
      subject: String(message.subject || '').trim() || '(Sans objet)',
      text: String(message.body || ''),
      html: html || undefined,
      attachments
    });
    return { messageId: result.messageId };
  } finally {
    transport.close();
  }
}

module.exports = {
  listFolders,
  moveRemoteMessage,
  sendMessage,
  setRemoteReadState,
  syncAccount,
  testConfiguration
};

