const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');
const sanitizeHtml = require('sanitize-html');
const { Pop3Client } = require('./pop3-client');
const { reconcileRemoteFolderMessages, storeMessage } = require('./message-store');

function imapOptions(account) {
  return {
    host: account.incomingHost,
    port: Number(account.incomingPort),
    secure: Boolean(account.incomingSecure),
    auth: account.authType === 'oauth2'
      ? { user: account.username, accessToken: account.accessToken }
      : { user: account.username, pass: account.password },
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
    auth: account.authType === 'oauth2'
      ? { type: 'OAuth2', user: account.username, accessToken: account.accessToken }
      : { user: account.username, pass: account.password },
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
    const serverUids = await client.search({ all: true }, { uid: true });
    const remoteId = (uid) => folder.toUpperCase() === 'INBOX' ? `imap-${uid}` : `imap-${folder}-${uid}`;
    const activeRemoteIds = Array.isArray(serverUids) ? serverUids.map(remoteId) : null;
    if (!total) {
      const reconciliation = activeRemoteIds ? reconcileRemoteFolderMessages(account.id, folder, activeRemoteIds) : { removed: 0 };
      return { imported: 0, total: 0, removed: reconciliation.removed };
    }
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
        remoteId: remoteId(item.uid),
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
    const reconciliation = activeRemoteIds ? reconcileRemoteFolderMessages(account.id, folder, activeRemoteIds) : { removed: 0 };
    return { imported, total, removed: reconciliation.removed };
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

async function copyRemoteMessage(account, reference, destination) {
  if (account.protocol !== 'imap') throw new Error('La copie entre dossiers nécessite un compte IMAP.');
  if (!String(destination || '').trim()) throw new Error('Dossier de destination introuvable.');
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock(reference.folder);
    const copied = await client.messageCopy(imapUid(reference), destination, { uid: true });
    if (!copied) throw new Error('Le serveur a refusé la copie du message.');
    return { copied: true };
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => undefined);
  }
}

async function deleteRemoteMessage(account, reference) {
  if (account.protocol !== 'imap') throw new Error('La suppression sur le serveur nécessite un compte IMAP.');
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock(reference.folder);
    const deleted = await client.messageDelete(imapUid(reference), { uid: true });
    if (!deleted) throw new Error('Le serveur a refusé la suppression définitive du message.');
    return { deleted: true };
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => undefined);
  }
}

async function createRemoteFolder(account, folderPath) {
  if (account.protocol !== 'imap') throw new Error('La création de dossiers nécessite un compte IMAP.');
  const target = String(folderPath || '').trim();
  if (!target) throw new Error('Le nom du dossier est obligatoire.');
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  try {
    await client.mailboxCreate(target);
    return { created: true, path: target };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

async function renameRemoteFolder(account, folderPath, newPath) {
  if (account.protocol !== 'imap') throw new Error('Le renommage de dossiers nécessite un compte IMAP.');
  const source = String(folderPath || '').trim();
  const target = String(newPath || '').trim();
  if (!source || !target) throw new Error('Le nom du dossier est obligatoire.');
  if (source.toUpperCase() === 'INBOX') throw new Error('La boîte de réception ne peut pas être renommée.');
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  try {
    await client.mailboxRename(source, target);
    return { renamed: true, path: target };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

async function deleteRemoteFolder(account, folderPath) {
  if (account.protocol !== 'imap') throw new Error('La suppression de dossiers nécessite un compte IMAP.');
  const target = String(folderPath || '').trim();
  if (!target) throw new Error('Dossier introuvable.');
  if (target.toUpperCase() === 'INBOX') throw new Error('La boîte de réception ne peut pas être supprimée.');
  const client = new ImapFlow(imapOptions(account));
  await client.connect();
  try {
    await client.mailboxDelete(target);
    return { deleted: true };
  } finally {
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
    allowedTags: ['p', 'div', 'span', 'br', 'hr', 'b', 'strong', 'i', 'em', 'u', 's', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a', 'img'],
    allowedAttributes: { '*': ['style'], a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['data'] },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i],
        'font-family': [/^[a-z0-9 ,'-]{1,80}$/i],
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
  copyRemoteMessage,
  createRemoteFolder,
  deleteRemoteFolder,
  deleteRemoteMessage,
  listFolders,
  moveRemoteMessage,
  renameRemoteFolder,
  sendMessage,
  setRemoteReadState,
  syncAccount,
  testConfiguration
};

