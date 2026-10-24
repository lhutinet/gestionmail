const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const sanitizeHtml = require('sanitize-html');
const { getSettings, saveSettings } = require('./settings-store');

let database;

function databasePath() {
  return path.join(getSettings().dataDirectory, 'messages.sqlite');
}

function localRootPath(dataDirectory = getSettings().dataDirectory) {
  return path.join(dataDirectory, 'Dossiers locaux');
}

function safeWindowsSegment(value, fallback = 'Dossier local') {
  let clean = String(value || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').trim();
  if (!clean) clean = fallback;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(clean)) clean = `${clean}_`;
  return clean.slice(0, 120);
}

function uniqueDiskName(database, requestedName, parentDiskName = '') {
  const root = localRootPath();
  fs.mkdirSync(root, { recursive: true });
  const base = safeWindowsSegment(requestedName);
  let candidate = base;
  let suffix = 1;
  const existsInDatabase = database.prepare('SELECT 1 FROM local_folders WHERE disk_name = ? COLLATE NOCASE');
  const relativePath = () => parentDiskName ? path.join(parentDiskName, candidate) : candidate;
  while (existsInDatabase.get(relativePath()) || fs.existsSync(path.join(root, relativePath()))) {
    suffix += 1;
    const ending = ` (${suffix})`;
    candidate = `${base.slice(0, 120 - ending.length)}${ending}`;
  }
  return relativePath();
}

function folderPathFromDiskName(diskName) {
  const root = path.resolve(localRootPath());
  const folderPath = path.resolve(root, String(diskName));
  if (!folderPath.startsWith(`${root}${path.sep}`)) throw new Error('Chemin de dossier local invalide.');
  return folderPath;
}

function base64Lines(value) {
  return Buffer.from(value || '').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
}

function buildEml(database, source) {
  if (source.raw_message && Buffer.from(source.raw_message).length) return Buffer.from(source.raw_message);
  const attachments = database.prepare('SELECT * FROM attachments WHERE message_id = ? ORDER BY attachment_index').all(source.id);
  const headers = [
    `From: ${String(source.sender || '').replace(/[\r\n]+/g, ' ')}`,
    `To: ${String(source.recipients || '').replace(/[\r\n]+/g, ' ')}`,
    `Subject: =?UTF-8?B?${Buffer.from(String(source.subject || '(Sans objet)')).toString('base64')}?=`,
    `Date: ${source.received_at ? new Date(source.received_at).toUTCString() : new Date().toUTCString()}`,
    'MIME-Version: 1.0'
  ];
  const bodyValue = source.html_body || source.text_body || '';
  const bodyType = source.html_body ? 'text/html' : 'text/plain';
  if (!attachments.length) {
    headers.push(`Content-Type: ${bodyType}; charset=UTF-8`, 'Content-Transfer-Encoding: base64');
    return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${base64Lines(bodyValue)}\r\n`, 'utf8');
  }
  const boundary = `gestionmail-${randomUUID()}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const parts = [
    `${headers.join('\r\n')}\r\n\r\n--${boundary}`,
    `Content-Type: ${bodyType}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Lines(bodyValue)}`
  ];
  for (const attachment of attachments) {
    const filename = safeWindowsSegment(attachment.filename, 'piece-jointe');
    parts.push(
      `--${boundary}\r\nContent-Type: ${attachment.content_type || 'application/octet-stream'}\r\n` +
      `Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(filename)}\r\n\r\n` +
      base64Lines(attachment.content)
    );
  }
  parts.push(`--${boundary}--`, '');
  return Buffer.from(parts.join('\r\n'), 'utf8');
}

function uniqueEmlFilename(directory, source, preferredName = '') {
  const date = source.received_at ? new Date(source.received_at) : new Date();
  const stamp = Number.isNaN(date.getTime()) ? 'date-inconnue' : date.toISOString().replace('T', '_').slice(0, 19).replace(/:/g, '-');
  const preferredBase = preferredName ? path.basename(preferredName, path.extname(preferredName)) : `${stamp} - ${source.subject || 'Sans objet'}`;
  const base = safeWindowsSegment(preferredBase, 'Message').slice(0, 100);
  let filename = `${base}.eml`;
  let suffix = 1;
  while (fs.existsSync(path.join(directory, filename))) {
    suffix += 1;
    filename = `${base.slice(0, 100 - String(suffix).length - 3)} (${suffix}).eml`;
  }
  return filename;
}

function writeMessageFile(database, source, diskName, preferredName = '') {
  const directory = folderPathFromDiskName(diskName);
  fs.mkdirSync(directory, { recursive: true });
  const filename = uniqueEmlFilename(directory, source, preferredName);
  fs.writeFileSync(path.join(directory, filename), buildEml(database, source));
  return filename;
}

function ensureLocalStorage(database) {
  fs.mkdirSync(localRootPath(), { recursive: true });
  const folders = database.prepare('SELECT * FROM local_folders ORDER BY id').all();
  const updateFolder = database.prepare('UPDATE local_folders SET disk_name = ? WHERE id = ?');
  const updateMessage = database.prepare('UPDATE messages SET eml_filename = ? WHERE id = ?');
  const deleteAttachments = database.prepare('DELETE FROM attachments WHERE message_id = ?');
  const deleteMessage = database.prepare('DELETE FROM messages WHERE id = ?');
  for (const folder of folders) {
    let diskName = folder.disk_name;
    if (!diskName) {
      diskName = uniqueDiskName(database, folder.name);
      updateFolder.run(diskName, folder.id);
    }
    const directory = folderPathFromDiskName(diskName);
    fs.mkdirSync(directory, { recursive: true });
    const messages = database.prepare("SELECT * FROM messages WHERE account_id = '__local__' AND folder = ?")
      .all(`local:${folder.id}`);
    for (const message of messages) {
      const existingPath = message.eml_filename ? path.join(directory, message.eml_filename) : '';
      if (existingPath && fs.existsSync(existingPath)) continue;
      if (message.eml_filename) {
        deleteAttachments.run(message.id);
        deleteMessage.run(message.id);
        continue;
      }
      updateMessage.run(writeMessageFile(database, message, diskName, message.eml_filename), message.id);
    }
  }
}

function db() {
  if (database) return database;
  const filePath = databasePath();
  require('node:fs').mkdirSync(path.dirname(filePath), { recursive: true });
  database = new DatabaseSync(filePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      folder TEXT NOT NULL DEFAULT 'INBOX',
      remote_id TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      sender TEXT NOT NULL DEFAULT '',
      recipients TEXT NOT NULL DEFAULT '',
      received_at TEXT,
      preview TEXT NOT NULL DEFAULT '',
      text_body TEXT NOT NULL DEFAULT '',
      html_body TEXT NOT NULL DEFAULT '',
      raw_message BLOB,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(account_id, remote_id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_account_date
      ON messages(account_id, received_at DESC);
    CREATE TABLE IF NOT EXISTS attachments (
      message_id TEXT NOT NULL,
      attachment_index INTEGER NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      content_id TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0,
      content BLOB NOT NULL,
      PRIMARY KEY(message_id, attachment_index)
    );
    CREATE TABLE IF NOT EXISTS local_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name COLLATE NOCASE);
    CREATE TABLE IF NOT EXISTS contact_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_group_members (
      group_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      PRIMARY KEY(group_id, contact_id)
    );
    CREATE TABLE IF NOT EXISTS mail_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      account_id TEXT NOT NULL,
      match_field TEXT NOT NULL,
      match_type TEXT NOT NULL,
      match_value TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_value TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mail_rule_applications (
      rule_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      PRIMARY KEY(rule_id, message_id)
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      recipients_to TEXT NOT NULL DEFAULT '',
      recipients_cc TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      text_body TEXT NOT NULL DEFAULT '',
      html_body TEXT NOT NULL DEFAULT '',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = database.prepare('PRAGMA table_info(messages)').all();
  if (!columns.some((column) => column.name === 'folder')) {
    database.exec("ALTER TABLE messages ADD COLUMN folder TEXT NOT NULL DEFAULT 'INBOX'");
  }
  if (!columns.some((column) => column.name === 'eml_filename')) {
    database.exec('ALTER TABLE messages ADD COLUMN eml_filename TEXT');
  }
  const localFolderColumns = database.prepare('PRAGMA table_info(local_folders)').all();
  if (!localFolderColumns.some((column) => column.name === 'disk_name')) {
    database.exec('ALTER TABLE local_folders ADD COLUMN disk_name TEXT');
  }
  if (!localFolderColumns.some((column) => column.name === 'parent_id')) {
    database.exec('ALTER TABLE local_folders ADD COLUMN parent_id INTEGER');
  }
  if (!localFolderColumns.some((column) => column.name === 'system_type')) {
    database.exec('ALTER TABLE local_folders ADD COLUMN system_type TEXT');
  }
  if (!localFolderColumns.some((column) => column.name === 'source_account_id')) {
    database.exec('ALTER TABLE local_folders ADD COLUMN source_account_id TEXT');
  }
  if (!localFolderColumns.some((column) => column.name === 'source_folder_path')) {
    database.exec('ALTER TABLE local_folders ADD COLUMN source_folder_path TEXT');
  }
  if (!localFolderColumns.some((column) => column.name === 'color')) {
    database.exec("ALTER TABLE local_folders ADD COLUMN color TEXT NOT NULL DEFAULT ''");
  }
  ensureLocalStorage(database);
  return database;
}

function changeDataDirectory(directory) {
  const currentPath = databasePath();
  const currentDirectory = path.dirname(currentPath);
  const currentLocalRoot = localRootPath(currentDirectory);
  const targetDirectory = path.resolve(String(directory || ''));
  if (!targetDirectory) throw new Error('Emplacement de stockage invalide.');
  const targetPath = path.join(targetDirectory, 'messages.sqlite');
  const targetLocalRoot = localRootPath(targetDirectory);
  if (path.resolve(currentPath).toLocaleLowerCase('en') === path.resolve(targetPath).toLocaleLowerCase('en')) {
    return { changed: false, dataDirectory: targetDirectory, backupPath: null };
  }
  fs.mkdirSync(targetDirectory, { recursive: true });
  if (fs.existsSync(targetPath)) {
    throw new Error('Cet emplacement contient déjà une base GestionMail. Choisissez un dossier vide.');
  }
  if (fs.existsSync(targetLocalRoot)) {
    throw new Error('Cet emplacement contient déjà un dossier « Dossiers locaux ». Choisissez un dossier vide.');
  }

  if (database) {
    database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    database.close();
    database = null;
  }

  try {
    if (fs.existsSync(currentPath)) fs.copyFileSync(currentPath, targetPath, fs.constants.COPYFILE_EXCL);
    if (fs.existsSync(currentLocalRoot)) fs.cpSync(currentLocalRoot, targetLocalRoot, { recursive: true, errorOnExist: true });
    saveSettings({ dataDirectory: targetDirectory });
    return {
      changed: true,
      dataDirectory: targetDirectory,
      backupPath: fs.existsSync(currentPath) ? currentPath : null
    };
  } catch (error) {
    if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { force: true });
    if (fs.existsSync(targetLocalRoot)) fs.rmSync(targetLocalRoot, { recursive: true, force: true });
    throw error;
  }
}

function normaliseAddress(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(normaliseAddress).filter(Boolean).join(', ');
  if (value.text) return value.text;
  if (value.address) return value.name ? `${value.name} <${value.address}>` : value.address;
  return '';
}

function storeMessage(message) {
  const messageId = `${message.accountId}:${message.remoteId}`;
  const statement = db().prepare(`
    INSERT INTO messages (
      id, account_id, folder, remote_id, subject, sender, recipients, received_at,
      preview, text_body, html_body, raw_message, is_read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, remote_id) DO UPDATE SET
      subject = excluded.subject,
      sender = excluded.sender,
      recipients = excluded.recipients,
      received_at = excluded.received_at,
      preview = excluded.preview,
      text_body = excluded.text_body,
      html_body = excluded.html_body,
      raw_message = excluded.raw_message,
      is_read = excluded.is_read
  `);
  const text = String(message.text || '').trim();
  statement.run(
    messageId,
    message.accountId,
    message.folder || 'INBOX',
    String(message.remoteId),
    String(message.subject || '(Sans objet)'),
    normaliseAddress(message.from),
    normaliseAddress(message.to),
    message.date ? new Date(message.date).toISOString() : null,
    text.replace(/\s+/g, ' ').slice(0, 180),
    text,
    String(message.html || ''),
    message.raw ? Buffer.from(message.raw) : null,
    message.isRead ? 1 : 0,
    new Date().toISOString()
  );

  const removeAttachments = db().prepare('DELETE FROM attachments WHERE message_id = ?');
  const insertAttachment = db().prepare(`
    INSERT INTO attachments (
      message_id, attachment_index, filename, content_type, content_id, size, content
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  removeAttachments.run(messageId);
  for (const [index, attachment] of (message.attachments || []).entries()) {
    const content = Buffer.from(attachment.content || []);
    insertAttachment.run(
      messageId,
      index,
      String(attachment.filename || `piece-jointe-${index + 1}`),
      String(attachment.contentType || 'application/octet-stream'),
      String(attachment.cid || ''),
      content.length,
      content
    );
  }
  return messageId;
}

function listMessages(accountId, folder = 'INBOX', limit = 100) {
  return db().prepare(`
    SELECT id, account_id AS accountId, subject, sender, recipients,
           received_at AS receivedAt, preview, is_read AS isRead,
           (SELECT COUNT(*) FROM attachments WHERE message_id = messages.id) AS attachmentCount
      FROM messages
     WHERE account_id = ? AND folder = ?
     ORDER BY COALESCE(received_at, created_at) DESC
     LIMIT ?
  `).all(accountId, folder, Math.min(Math.max(Number(limit) || 100, 1), 500)).map(addConversationKey);
}

function conversationKey(subject) {
  return String(subject || '(sans objet)')
    .replace(/^\s*((re|réf|ref|fw|fwd|tr)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr') || '(sans objet)';
}

function addConversationKey(message) {
  return { ...message, attachmentCount: Number(message.attachmentCount || 0), conversationKey: conversationKey(message.subject) };
}

function searchMessages(criteria, limit = 300) {
  const filters = typeof criteria === 'string' ? { query: criteria } : (criteria || {});
  const clauses = [];
  const parameters = [];
  const like = (value) => `%${String(value || '').trim().replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
  if (String(filters.query || '').trim()) {
    const value = like(filters.query);
    clauses.push(`(subject LIKE ? ESCAPE '\\' COLLATE NOCASE OR sender LIKE ? ESCAPE '\\' COLLATE NOCASE OR recipients LIKE ? ESCAPE '\\' COLLATE NOCASE OR text_body LIKE ? ESCAPE '\\' COLLATE NOCASE)`);
    parameters.push(value, value, value, value);
  }
  if (String(filters.sender || '').trim()) {
    clauses.push("sender LIKE ? ESCAPE '\\' COLLATE NOCASE");
    parameters.push(like(filters.sender));
  }
  if (String(filters.dateFrom || '').trim()) {
    clauses.push('date(COALESCE(received_at, created_at)) >= date(?)');
    parameters.push(String(filters.dateFrom));
  }
  if (String(filters.dateTo || '').trim()) {
    clauses.push('date(COALESCE(received_at, created_at)) <= date(?)');
    parameters.push(String(filters.dateTo));
  }
  if (filters.readState === 'read') clauses.push('is_read = 1');
  if (filters.readState === 'unread') clauses.push('is_read = 0');
  if (filters.hasAttachments === true || filters.hasAttachments === 'yes') clauses.push('EXISTS (SELECT 1 FROM attachments WHERE message_id = messages.id)');
  if (filters.hasAttachments === false || filters.hasAttachments === 'no') clauses.push('NOT EXISTS (SELECT 1 FROM attachments WHERE message_id = messages.id)');
  if (!clauses.length) return [];
  parameters.push(Math.min(Math.max(Number(limit) || 300, 1), 1000));
  return db().prepare(`
    SELECT id, account_id AS accountId, folder, subject, sender, recipients,
           received_at AS receivedAt, preview, is_read AS isRead,
           (SELECT COUNT(*) FROM attachments WHERE message_id = messages.id) AS attachmentCount
      FROM messages
     WHERE ${clauses.join(' AND ')}
     ORDER BY COALESCE(received_at, created_at) DESC
     LIMIT ?
  `).all(...parameters).map(addConversationKey);
}

function countUnreadMessages() {
  return Number(db().prepare('SELECT COUNT(*) AS count FROM messages WHERE is_read = 0').get().count || 0);
}

function checkpointDatabase() {
  db().exec('PRAGMA wal_checkpoint(TRUNCATE)');
  return databasePath();
}

function listDrafts() {
  return db().prepare(`
    SELECT id, account_id AS accountId, recipients_to AS recipientsTo,
           subject, substr(text_body, 1, 180) AS preview,
           created_at AS createdAt, updated_at AS updatedAt
      FROM drafts ORDER BY updated_at DESC
  `).all();
}

function getDraft(draftId) {
  const draft = db().prepare(`
    SELECT id, account_id AS accountId, recipients_to AS recipientsTo,
           recipients_cc AS recipientsCc, subject, text_body AS textBody,
           html_body AS htmlBody, attachments_json AS attachmentsJson,
           created_at AS createdAt, updated_at AS updatedAt
      FROM drafts WHERE id = ?
  `).get(String(draftId));
  if (!draft) throw new Error('Brouillon introuvable.');
  try {
    draft.attachments = JSON.parse(draft.attachmentsJson || '[]');
  } catch {
    draft.attachments = [];
  }
  delete draft.attachmentsJson;
  return draft;
}

function saveDraft(draft) {
  const existing = draft?.id ? db().prepare('SELECT created_at AS createdAt FROM drafts WHERE id = ?').get(String(draft.id)) : null;
  const id = existing ? String(draft.id) : randomUUID();
  const now = new Date().toISOString();
  const attachments = (Array.isArray(draft?.attachments) ? draft.attachments : [])
    .filter((attachment) => attachment && typeof attachment.path === 'string')
    .map((attachment) => ({ path: attachment.path, name: String(attachment.name || ''), size: Number(attachment.size || 0) }));
  db().prepare(`
    INSERT INTO drafts (
      id, account_id, recipients_to, recipients_cc, subject, text_body,
      html_body, attachments_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      account_id = excluded.account_id, recipients_to = excluded.recipients_to,
      recipients_cc = excluded.recipients_cc, subject = excluded.subject,
      text_body = excluded.text_body, html_body = excluded.html_body,
      attachments_json = excluded.attachments_json, updated_at = excluded.updated_at
  `).run(
    id, String(draft?.accountId || ''), String(draft?.to || ''), String(draft?.cc || ''),
    String(draft?.subject || ''), String(draft?.body || ''), String(draft?.htmlBody || ''),
    JSON.stringify(attachments), existing?.createdAt || now, now
  );
  return getDraft(id);
}

function deleteDraft(draftId) {
  const result = db().prepare('DELETE FROM drafts WHERE id = ?').run(String(draftId));
  return { deleted: Boolean(result.changes) };
}

function ensureSystemLocalFolder(systemType, name) {
  const database = db();
  let folder = database.prepare('SELECT id, name, disk_name AS diskName FROM local_folders WHERE system_type = ?').get(String(systemType));
  if (folder) return { ...folder, id: Number(folder.id) };
  let chosenName = String(name).slice(0, 80);
  let suffix = 1;
  const nameExists = database.prepare('SELECT 1 FROM local_folders WHERE name = ? COLLATE NOCASE AND parent_id IS NULL');
  while (nameExists.get(chosenName)) {
    suffix += 1;
    const ending = ` (${suffix})`;
    chosenName = `${String(name).slice(0, 80 - ending.length)}${ending}`;
  }
  const diskName = uniqueDiskName(database, chosenName);
  const directory = folderPathFromDiskName(diskName);
  fs.mkdirSync(directory, { recursive: false });
  const result = database.prepare('INSERT INTO local_folders (name, parent_id, disk_name, system_type, created_at) VALUES (?, NULL, ?, ?, ?)')
    .run(chosenName, diskName, String(systemType), new Date().toISOString());
  return { id: Number(result.lastInsertRowid), name: chosenName, diskName };
}

function storeSentMessage(account, message) {
  const folder = ensureSystemLocalFolder('sent', 'Envoyés');
  const attachments = [];
  for (const candidate of Array.isArray(message.attachments) ? message.attachments : []) {
    if (!candidate?.path || !fs.existsSync(candidate.path)) continue;
    const content = fs.readFileSync(candidate.path);
    attachments.push({ filename: path.basename(candidate.path), content, contentType: 'application/octet-stream' });
  }
  const messageId = storeMessage({
    accountId: '__local__',
    folder: `local:${folder.id}`,
    remoteId: `sent-${randomUUID()}`,
    subject: message.subject,
    from: `${account.name} <${account.email}>`,
    to: [message.to, message.cc].filter(Boolean).join(', '),
    date: new Date(),
    text: message.body,
    html: message.htmlBody,
    attachments,
    isRead: true
  });
  const stored = db().prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  const emlFilename = writeMessageFile(db(), stored, folder.diskName);
  db().prepare('UPDATE messages SET eml_filename = ? WHERE id = ?').run(emlFilename, messageId);
  return { id: messageId, folderId: folder.id, path: path.join(folderPathFromDiskName(folder.diskName), emlFilename) };
}

function getMessage(id) {
  const message = db().prepare(`
    SELECT id, account_id AS accountId, folder, remote_id AS remoteId, subject, sender, recipients,
           received_at AS receivedAt, text_body AS textBody,
           html_body AS htmlBody, is_read AS isRead
      FROM messages WHERE id = ?
  `).get(id);
  if (!message) throw new Error('Message introuvable.');
  const attachments = db().prepare(`
    SELECT attachment_index AS attachmentIndex, filename, content_type AS contentType,
           content_id AS contentId, size, content
      FROM attachments WHERE message_id = ? ORDER BY attachment_index
  `).all(id);
  const inlineImages = new Map();
  for (const attachment of attachments) {
    const contentType = String(attachment.contentType || '').toLocaleLowerCase('en');
    const contentId = String(attachment.contentId || '').trim().replace(/^<|>$/g, '');
    if (!contentId || !['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'].includes(contentType)) continue;
    inlineImages.set(contentId.toLocaleLowerCase('en'), `data:${contentType};base64,${Buffer.from(attachment.content).toString('base64')}`);
  }
  const safeHtml = message.htmlBody ? sanitizeHtml(message.htmlBody, {
    allowedTags: [
      'p', 'div', 'span', 'br', 'hr', 'b', 'strong', 'i', 'em', 'u', 's',
      'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'title'],
      table: ['cellpadding', 'cellspacing'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      img: ['src', 'data-remote-src', 'alt', 'title', 'width', 'height']
    },
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
    transformTags: {
      img: (_tagName, attributes) => {
        const next = {};
        for (const key of ['alt', 'title', 'width', 'height']) {
          if (attributes[key]) next[key] = attributes[key];
        }
        let source = String(attributes.src || '').trim();
        if (/^cid:/i.test(source)) {
          try {
            source = decodeURIComponent(source.slice(4)).replace(/^<|>$/g, '').toLocaleLowerCase('en');
          } catch {
            source = source.slice(4).replace(/^<|>$/g, '').toLocaleLowerCase('en');
          }
          const embedded = inlineImages.get(source);
          if (embedded) next.src = embedded;
        } else if (/^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(source)) {
          next.src = source;
        } else {
          if (source.startsWith('//')) source = `https:${source}`;
          try {
            const remote = new URL(source);
            if (remote.protocol === 'http:' || remote.protocol === 'https:') next['data-remote-src'] = remote.href;
          } catch {
            // Les sources invalides ou locales restent bloquées.
          }
        }
        return { tagName: 'img', attribs: next };
      }
    },
    disallowedTagsMode: 'discard'
  }) : '';
  return {
    ...message,
    htmlBody: safeHtml,
    attachments: attachments.map(({ content, contentId, ...attachment }) => attachment)
  };
}

function listRuleCandidateMessages(accountId, folder) {
  return db().prepare(`
    SELECT id, account_id AS accountId, folder, remote_id AS remoteId,
           subject, sender, recipients, text_body AS textBody
      FROM messages
     WHERE account_id = ? AND folder = ?
     ORDER BY COALESCE(received_at, created_at) DESC
  `).all(String(accountId), String(folder));
}

function listMailRules() {
  return db().prepare(`
    SELECT id, name, account_id AS accountId, match_field AS matchField,
           match_type AS matchType, match_value AS matchValue,
           target_type AS targetType, target_value AS targetValue,
           enabled, created_at AS createdAt, updated_at AS updatedAt
      FROM mail_rules ORDER BY enabled DESC, name COLLATE NOCASE
  `).all().map((rule) => ({ ...rule, enabled: Boolean(rule.enabled) }));
}

function saveMailRule(rule) {
  const allowedFields = ['sender', 'recipients', 'subject', 'textBody'];
  const allowedTypes = ['contains', 'equals', 'startsWith', 'endsWith'];
  const allowedTargets = ['local', 'server'];
  const name = String(rule?.name || '').trim();
  const accountId = String(rule?.accountId || '').trim();
  const matchField = allowedFields.includes(rule?.matchField) ? rule.matchField : 'sender';
  const matchType = allowedTypes.includes(rule?.matchType) ? rule.matchType : 'contains';
  const matchValue = String(rule?.matchValue || '').trim();
  const targetType = allowedTargets.includes(rule?.targetType) ? rule.targetType : 'local';
  const targetValue = String(rule?.targetValue || '').trim();
  if (!name || !accountId || !matchValue || !targetValue) throw new Error('Tous les champs de la règle sont obligatoires.');
  const existing = rule?.id ? db().prepare('SELECT created_at AS createdAt FROM mail_rules WHERE id = ?').get(String(rule.id)) : null;
  const id = existing ? String(rule.id) : randomUUID();
  const now = new Date().toISOString();
  db().prepare(`
    INSERT INTO mail_rules (
      id, name, account_id, match_field, match_type, match_value,
      target_type, target_value, enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, account_id = excluded.account_id,
      match_field = excluded.match_field, match_type = excluded.match_type,
      match_value = excluded.match_value, target_type = excluded.target_type,
      target_value = excluded.target_value, enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(id, name, accountId, matchField, matchType, matchValue, targetType, targetValue, rule.enabled === false ? 0 : 1, existing?.createdAt || now, now);
  return listMailRules().find((item) => item.id === id);
}

function deleteMailRule(ruleId) {
  const database = db();
  database.prepare('DELETE FROM mail_rule_applications WHERE rule_id = ?').run(String(ruleId));
  const result = database.prepare('DELETE FROM mail_rules WHERE id = ?').run(String(ruleId));
  if (!result.changes) throw new Error('Règle introuvable.');
  return { deleted: true };
}

function isMailRuleApplied(ruleId, messageId) {
  return Boolean(db().prepare('SELECT 1 FROM mail_rule_applications WHERE rule_id = ? AND message_id = ?').get(String(ruleId), String(messageId)));
}

function markMailRuleApplied(ruleId, messageId) {
  db().prepare('INSERT OR IGNORE INTO mail_rule_applications (rule_id, message_id, applied_at) VALUES (?, ?, ?)')
    .run(String(ruleId), String(messageId), new Date().toISOString());
}

function getMessageReference(id) {
  const message = db().prepare(`
    SELECT id, account_id AS accountId, folder, remote_id AS remoteId, is_read AS isRead
      FROM messages WHERE id = ?
  `).get(id);
  if (!message) throw new Error('Message introuvable.');
  return message;
}

function setMessageRead(id, isRead) {
  const result = db().prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id);
  if (!result.changes) throw new Error('Message introuvable.');
  return { updated: true };
}

function removeLocalMessage(id) {
  const database = db();
  const storedFile = database.prepare(`
    SELECT messages.eml_filename AS filename, local_folders.disk_name AS diskName
      FROM messages
      JOIN local_folders ON messages.folder = 'local:' || local_folders.id
     WHERE messages.id = ? AND messages.account_id = '__local__'
  `).get(id);
  database.exec('BEGIN');
  try {
    database.prepare('DELETE FROM attachments WHERE message_id = ?').run(id);
    const result = database.prepare('DELETE FROM messages WHERE id = ?').run(id);
    if (!result.changes) throw new Error('Message introuvable.');
    database.exec('COMMIT');
    if (storedFile?.filename && storedFile?.diskName) {
      const filePath = path.join(folderPathFromDiskName(storedFile.diskName), path.basename(storedFile.filename));
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    }
    return { removed: true };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function listLocalFolders() {
  const database = db();
  ensureLocalStorage(database);
  return database.prepare(`
    SELECT id, name, parent_id AS parentId, disk_name AS diskName, color,
           (SELECT COUNT(*) FROM messages
             WHERE account_id = '__local__' AND folder = 'local:' || local_folders.id) AS messageCount
      FROM local_folders
     ORDER BY name COLLATE NOCASE
  `).all().map((folder) => ({
    ...folder,
    id: Number(folder.id),
    parentId: folder.parentId === null ? null : Number(folder.parentId),
    messageCount: Number(folder.messageCount),
    path: folderPathFromDiskName(folder.diskName)
  }));
}

function getLocalFolderPath(localFolderId) {
  const folder = db().prepare('SELECT disk_name AS diskName FROM local_folders WHERE id = ?')
    .get(Number(localFolderId));
  if (!folder) throw new Error('Dossier local introuvable.');
  const directory = folderPathFromDiskName(folder.diskName);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function setLocalFolderColor(localFolderId, colorValue) {
  const allowedColors = ['', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'gray'];
  const color = allowedColors.includes(String(colorValue || '')) ? String(colorValue || '') : '';
  const result = db().prepare('UPDATE local_folders SET color = ? WHERE id = ?').run(color, Number(localFolderId));
  if (!result.changes) throw new Error('Dossier local introuvable.');
  return { updated: true, id: Number(localFolderId), color };
}

function listUnindexedEmlFiles() {
  const database = db();
  const result = [];
  for (const folder of listLocalFolders()) {
    const indexed = new Set(database.prepare(`
      SELECT eml_filename AS filename FROM messages
       WHERE account_id = '__local__' AND folder = ? AND eml_filename IS NOT NULL
    `).all(`local:${folder.id}`).map((item) => String(item.filename).toLocaleLowerCase('en')));
    for (const entry of fs.readdirSync(folder.path, { withFileTypes: true })) {
      if (!entry.isFile() || path.extname(entry.name).toLocaleLowerCase('en') !== '.eml') continue;
      if (!indexed.has(entry.name.toLocaleLowerCase('en'))) {
        result.push({ localFolderId: folder.id, filename: entry.name, path: path.join(folder.path, entry.name) });
      }
    }
  }
  return result;
}

function registerLocalEmlFile(localFolderId, filename, parsed, raw) {
  const database = db();
  const folder = database.prepare('SELECT id FROM local_folders WHERE id = ?').get(Number(localFolderId));
  if (!folder) throw new Error('Dossier local introuvable.');
  const messageId = storeMessage({
    accountId: '__local__',
    folder: `local:${folder.id}`,
    remoteId: `eml-${folder.id}-${randomUUID()}`,
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
  database.prepare('UPDATE messages SET eml_filename = ? WHERE id = ?')
    .run(path.basename(filename), messageId);
  return messageId;
}

function createLocalFolder(name, parentId = null) {
  const database = db();
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Le nom du dossier local est obligatoire.');
  if (cleanName.length > 80) throw new Error('Le nom du dossier local est trop long.');
  const numericParentId = parentId === null || parentId === undefined ? null : Number(parentId);
  const parent = numericParentId === null
    ? null
    : database.prepare('SELECT id, disk_name AS diskName FROM local_folders WHERE id = ?').get(numericParentId);
  if (numericParentId !== null && !parent) throw new Error('Dossier parent introuvable.');
  const duplicate = database.prepare('SELECT id FROM local_folders WHERE name = ? COLLATE NOCASE AND parent_id IS ?')
    .get(cleanName, numericParentId);
  if (duplicate) throw new Error('Un dossier local porte déjà ce nom.');
  const diskName = uniqueDiskName(database, cleanName, parent?.diskName || '');
  const directory = folderPathFromDiskName(diskName);
  fs.mkdirSync(directory, { recursive: false });
  try {
    const result = database.prepare('INSERT INTO local_folders (name, parent_id, disk_name, created_at) VALUES (?, ?, ?, ?)')
      .run(cleanName, numericParentId, diskName, new Date().toISOString());
    return { id: Number(result.lastInsertRowid), name: cleanName, parentId: numericParentId, diskName, path: directory, messageCount: 0 };
  } catch (error) {
    if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

function copyMessageToLocal(messageId, localFolderId) {
  const database = db();
  const source = database.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!source) throw new Error('Message source introuvable.');
  const folder = database.prepare('SELECT id, disk_name AS diskName FROM local_folders WHERE id = ?').get(Number(localFolderId));
  if (!folder) throw new Error('Dossier local introuvable.');

  const copyId = `local:${localFolderId}:${randomUUID()}`;
  const remoteId = `local-${randomUUID()}`;
  let emlFilename = '';
  database.exec('BEGIN');
  try {
    database.prepare(`
      INSERT INTO messages (
        id, account_id, folder, remote_id, subject, sender, recipients, received_at,
        preview, text_body, html_body, raw_message, is_read, created_at, eml_filename
      ) VALUES (?, '__local__', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      copyId, `local:${localFolderId}`, remoteId, source.subject, source.sender,
      source.recipients, source.received_at, source.preview, source.text_body,
      source.html_body, source.raw_message, source.is_read, new Date().toISOString()
    );
    database.prepare(`
      INSERT INTO attachments (message_id, attachment_index, filename, content_type, content_id, size, content)
      SELECT ?, attachment_index, filename, content_type, content_id, size, content
        FROM attachments WHERE message_id = ?
    `).run(copyId, messageId);
    const localSource = database.prepare('SELECT * FROM messages WHERE id = ?').get(copyId);
    emlFilename = writeMessageFile(database, localSource, folder.diskName);
    database.prepare('UPDATE messages SET eml_filename = ? WHERE id = ?').run(emlFilename, copyId);
    database.exec('COMMIT');
    return { copied: true, id: copyId, path: path.join(folderPathFromDiskName(folder.diskName), emlFilename) };
  } catch (error) {
    database.exec('ROLLBACK');
    if (emlFilename) fs.rmSync(path.join(folderPathFromDiskName(folder.diskName), emlFilename), { force: true });
    throw error;
  }
}

function copyStoredFolderTreeToLocal(accountId, folderDescriptors) {
  const database = db();
  const descriptors = [];
  const seenPaths = new Set();
  for (const candidate of Array.isArray(folderDescriptors) ? folderDescriptors : []) {
    const sourcePath = String(candidate?.sourcePath || '').trim();
    if (!sourcePath || seenPaths.has(sourcePath)) continue;
    seenPaths.add(sourcePath);
    descriptors.push({
      sourcePath,
      parentSourcePath: candidate.parentSourcePath === null || candidate.parentSourcePath === undefined
        ? null
        : String(candidate.parentSourcePath),
      name: String(candidate.name || sourcePath).trim().slice(0, 80) || 'Dossier copié'
    });
  }
  const rootDescriptor = descriptors.find((descriptor) => descriptor.parentSourcePath === null);
  if (!rootDescriptor) throw new Error('Le dossier source est introuvable.');
  const existingCopy = database.prepare('SELECT name FROM local_folders WHERE source_account_id = ? AND source_folder_path = ? LIMIT 1')
    .get(String(accountId), rootDescriptor.sourcePath);
  if (existingCopy) throw new Error(`Ce dossier a déjà été copié localement sous le nom « ${existingCopy.name} ».`);

  const pending = [...descriptors];
  const createdFolders = new Map();
  const createdDirectories = [];
  const writtenFiles = [];
  let totalMessages = 0;
  database.exec('BEGIN');
  try {
    const insertMessage = database.prepare(`
      INSERT INTO messages (
        id, account_id, folder, remote_id, subject, sender, recipients, received_at,
        preview, text_body, html_body, raw_message, is_read, created_at, eml_filename
      ) VALUES (?, '__local__', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);
    const copyAttachments = database.prepare(`
      INSERT INTO attachments (message_id, attachment_index, filename, content_type, content_id, size, content)
      SELECT ?, attachment_index, filename, content_type, content_id, size, content
        FROM attachments WHERE message_id = ?
    `);
    while (pending.length) {
      const descriptorIndex = pending.findIndex((descriptor) => (
        descriptor.parentSourcePath === null || createdFolders.has(descriptor.parentSourcePath)
      ));
      if (descriptorIndex < 0) throw new Error('La hiérarchie du dossier source est invalide.');
      const [descriptor] = pending.splice(descriptorIndex, 1);
      const parent = descriptor.parentSourcePath === null ? null : createdFolders.get(descriptor.parentSourcePath);
      const requestedName = descriptor.name;
      let suffix = 1;
      let name = requestedName;
      const nameExists = database.prepare('SELECT 1 FROM local_folders WHERE name = ? COLLATE NOCASE AND parent_id IS ?');
      while (nameExists.get(name, parent?.id ?? null)) {
        suffix += 1;
        const ending = ` (${suffix})`;
        name = `${requestedName.slice(0, 80 - ending.length)}${ending}`;
      }
      const diskName = uniqueDiskName(database, name, parent?.diskName || '');
      const directory = folderPathFromDiskName(diskName);
      fs.mkdirSync(directory, { recursive: false });
      createdDirectories.push(directory);
      const folderResult = database.prepare('INSERT INTO local_folders (name, parent_id, disk_name, source_account_id, source_folder_path, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(
          name, parent?.id ?? null, diskName,
          descriptor.parentSourcePath === null ? String(accountId) : null,
          descriptor.parentSourcePath === null ? descriptor.sourcePath : null,
          new Date().toISOString()
        );
      const localFolderId = Number(folderResult.lastInsertRowid);
      const sources = database.prepare('SELECT * FROM messages WHERE account_id = ? AND folder = ?')
        .all(String(accountId), descriptor.sourcePath);
      for (const source of sources) {
        const copyId = `local:${localFolderId}:${randomUUID()}`;
        insertMessage.run(
          copyId, `local:${localFolderId}`, `local-${randomUUID()}`, source.subject, source.sender,
          source.recipients, source.received_at, source.preview, source.text_body,
          source.html_body, source.raw_message, source.is_read, new Date().toISOString()
        );
        copyAttachments.run(copyId, source.id);
        const localSource = database.prepare('SELECT * FROM messages WHERE id = ?').get(copyId);
        const emlFilename = writeMessageFile(database, localSource, diskName);
        writtenFiles.push(path.join(directory, emlFilename));
        database.prepare('UPDATE messages SET eml_filename = ? WHERE id = ?').run(emlFilename, copyId);
      }
      totalMessages += sources.length;
      createdFolders.set(descriptor.sourcePath, {
        id: localFolderId,
        name,
        parentId: parent?.id ?? null,
        diskName,
        path: directory,
        messageCount: sources.length
      });
    }
    database.exec('COMMIT');
    return {
      folder: createdFolders.get(rootDescriptor.sourcePath),
      folderCount: createdFolders.size,
      totalMessages
    };
  } catch (error) {
    database.exec('ROLLBACK');
    for (const filePath of writtenFiles) fs.rmSync(filePath, { force: true });
    for (const directory of createdDirectories.reverse()) {
      if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true, force: true });
    }
    throw error;
  }
}

function copyStoredFolderToLocal(accountId, sourceFolder, preferredName) {
  return copyStoredFolderTreeToLocal(accountId, [{
    sourcePath: String(sourceFolder),
    parentSourcePath: null,
    name: String(preferredName || sourceFolder || 'Dossier copié')
  }]).folder;
}

function moveLocalFolder(localFolderId, targetParentId = null) {
  const database = db();
  const folders = database.prepare('SELECT id, parent_id AS parentId, disk_name AS diskName FROM local_folders').all();
  const source = folders.find((folder) => Number(folder.id) === Number(localFolderId));
  if (!source) throw new Error('Dossier local introuvable.');
  const numericParentId = targetParentId === null || targetParentId === undefined ? null : Number(targetParentId);
  if (numericParentId === (source.parentId === null ? null : Number(source.parentId))) return { moved: false };
  const parent = numericParentId === null
    ? null
    : folders.find((folder) => Number(folder.id) === numericParentId);
  if (numericParentId !== null && !parent) throw new Error('Dossier parent introuvable.');
  const sourcePrefix = `${source.diskName}${path.sep}`.toLocaleLowerCase('en');
  if (parent && (Number(parent.id) === Number(source.id) || String(parent.diskName).toLocaleLowerCase('en').startsWith(sourcePrefix))) {
    throw new Error('Un dossier ne peut pas être déplacé dans lui-même ou dans l’un de ses sous-dossiers.');
  }

  const targetDiskName = uniqueDiskName(database, path.basename(source.diskName), parent?.diskName || '');
  const sourceDirectory = folderPathFromDiskName(source.diskName);
  const targetDirectory = folderPathFromDiskName(targetDiskName);
  fs.mkdirSync(path.dirname(targetDirectory), { recursive: true });
  fs.renameSync(sourceDirectory, targetDirectory);
  database.exec('BEGIN');
  try {
    database.prepare('UPDATE local_folders SET parent_id = ?, disk_name = ? WHERE id = ?')
      .run(numericParentId, targetDiskName, Number(source.id));
    const updateChild = database.prepare('UPDATE local_folders SET disk_name = ? WHERE id = ?');
    for (const child of folders) {
      if (Number(child.id) === Number(source.id)) continue;
      if (!String(child.diskName).toLocaleLowerCase('en').startsWith(sourcePrefix)) continue;
      updateChild.run(`${targetDiskName}${String(child.diskName).slice(String(source.diskName).length)}`, Number(child.id));
    }
    database.exec('COMMIT');
    return { moved: true, id: Number(source.id), parentId: numericParentId, path: targetDirectory };
  } catch (error) {
    database.exec('ROLLBACK');
    if (fs.existsSync(targetDirectory) && !fs.existsSync(sourceDirectory)) fs.renameSync(targetDirectory, sourceDirectory);
    throw error;
  }
}

function renameLocalFolder(localFolderId, name) {
  const database = db();
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Le nom du dossier local est obligatoire.');
  if (cleanName.length > 80) throw new Error('Le nom du dossier local est trop long.');
  const folders = database.prepare('SELECT id, name, parent_id AS parentId, disk_name AS diskName FROM local_folders').all();
  const source = folders.find((folder) => Number(folder.id) === Number(localFolderId));
  if (!source) throw new Error('Dossier local introuvable.');
  const duplicate = folders.find((folder) => Number(folder.id) !== Number(source.id) && Number(folder.parentId) === Number(source.parentId) && String(folder.name).localeCompare(cleanName, 'fr', { sensitivity: 'base' }) === 0);
  if (duplicate) throw new Error('Un dossier local porte déjà ce nom.');
  const parent = source.parentId === null ? null : folders.find((folder) => Number(folder.id) === Number(source.parentId));
  const targetDiskName = uniqueDiskName(database, cleanName, parent?.diskName || '');
  const sourceDirectory = folderPathFromDiskName(source.diskName);
  const targetDirectory = folderPathFromDiskName(targetDiskName);
  const sourcePrefix = `${source.diskName}${path.sep}`.toLocaleLowerCase('en');
  fs.renameSync(sourceDirectory, targetDirectory);
  database.exec('BEGIN');
  try {
    database.prepare('UPDATE local_folders SET name = ?, disk_name = ? WHERE id = ?').run(cleanName, targetDiskName, Number(source.id));
    const updateChild = database.prepare('UPDATE local_folders SET disk_name = ? WHERE id = ?');
    for (const child of folders) {
      if (!String(child.diskName).toLocaleLowerCase('en').startsWith(sourcePrefix)) continue;
      updateChild.run(`${targetDiskName}${String(child.diskName).slice(String(source.diskName).length)}`, Number(child.id));
    }
    database.exec('COMMIT');
    return { renamed: true, id: Number(source.id), name: cleanName, path: targetDirectory };
  } catch (error) {
    database.exec('ROLLBACK');
    if (fs.existsSync(targetDirectory) && !fs.existsSync(sourceDirectory)) fs.renameSync(targetDirectory, sourceDirectory);
    throw error;
  }
}

function duplicateLocalFolderTree(localFolderId) {
  const database = db();
  const folders = database.prepare('SELECT id, name, parent_id AS parentId FROM local_folders ORDER BY id').all();
  const root = folders.find((folder) => Number(folder.id) === Number(localFolderId));
  if (!root) throw new Error('Dossier local introuvable.');
  const created = new Map();
  const copyFolder = (source, targetParentId, preferredName = source.name) => {
    let name = preferredName;
    let suffix = 1;
    while (database.prepare('SELECT 1 FROM local_folders WHERE name = ? COLLATE NOCASE AND parent_id IS ?').get(name, targetParentId)) {
      suffix += 1;
      name = `${preferredName} (${suffix})`;
    }
    const target = createLocalFolder(name, targetParentId);
    created.set(Number(source.id), target);
    const messages = database.prepare("SELECT id FROM messages WHERE account_id = '__local__' AND folder = ?").all(`local:${source.id}`);
    for (const message of messages) copyMessageToLocal(message.id, target.id);
    for (const child of folders.filter((folder) => Number(folder.parentId) === Number(source.id))) copyFolder(child, target.id);
    return target;
  };
  const copy = copyFolder(root, root.parentId === null ? null : Number(root.parentId), `${root.name} - copie`);
  return { folder: copy, folderCount: created.size };
}

function deleteLocalFolder(localFolderId) {
  const database = db();
  const folderKey = `local:${Number(localFolderId)}`;
  const folder = database.prepare('SELECT disk_name AS diskName FROM local_folders WHERE id = ?').get(Number(localFolderId));
  if (!folder) throw new Error('Dossier local introuvable.');
  const child = database.prepare('SELECT id FROM local_folders WHERE parent_id = ? LIMIT 1').get(Number(localFolderId));
  if (child) throw new Error('Ce dossier contient des sous-dossiers. Déplacez ou supprimez-les d’abord.');
  const directory = folderPathFromDiskName(folder.diskName);
  const temporaryDirectory = path.join(localRootPath(), `.suppression-${Number(localFolderId)}-${randomUUID()}`);
  if (fs.existsSync(directory)) fs.renameSync(directory, temporaryDirectory);
  database.exec('BEGIN');
  try {
    database.prepare(`
      DELETE FROM attachments
       WHERE message_id IN (
         SELECT id FROM messages WHERE account_id = '__local__' AND folder = ?
       )
    `).run(folderKey);
    database.prepare("DELETE FROM messages WHERE account_id = '__local__' AND folder = ?").run(folderKey);
    const result = database.prepare('DELETE FROM local_folders WHERE id = ?').run(Number(localFolderId));
    if (!result.changes) throw new Error('Dossier local introuvable.');
    database.exec('COMMIT');
    if (fs.existsSync(temporaryDirectory)) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    return { deleted: true };
  } catch (error) {
    database.exec('ROLLBACK');
    if (fs.existsSync(temporaryDirectory) && !fs.existsSync(directory)) fs.renameSync(temporaryDirectory, directory);
    throw error;
  }
}

function deleteLocalFolderTree(localFolderId) {
  const database = db();
  const folders = database.prepare('SELECT id, parent_id AS parentId, disk_name AS diskName FROM local_folders').all();
  const root = folders.find((folder) => Number(folder.id) === Number(localFolderId));
  if (!root) throw new Error('Dossier local introuvable.');
  const ids = [];
  const collect = (parentId) => {
    for (const folder of folders.filter((item) => Number(item.parentId) === Number(parentId))) collect(folder.id);
    ids.push(Number(parentId));
  };
  collect(root.id);
  const directory = folderPathFromDiskName(root.diskName);
  const temporaryDirectory = path.join(localRootPath(), `.suppression-arbre-${Number(root.id)}-${randomUUID()}`);
  if (fs.existsSync(directory)) fs.renameSync(directory, temporaryDirectory);
  database.exec('BEGIN');
  try {
    const deleteAttachments = database.prepare(`DELETE FROM attachments WHERE message_id IN (SELECT id FROM messages WHERE account_id = '__local__' AND folder = ?)`);
    const deleteMessages = database.prepare("DELETE FROM messages WHERE account_id = '__local__' AND folder = ?");
    const deleteFolder = database.prepare('DELETE FROM local_folders WHERE id = ?');
    for (const id of ids) {
      deleteAttachments.run(`local:${id}`);
      deleteMessages.run(`local:${id}`);
      deleteFolder.run(id);
    }
    database.exec('COMMIT');
    if (fs.existsSync(temporaryDirectory)) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    return { deleted: true, folderCount: ids.length };
  } catch (error) {
    database.exec('ROLLBACK');
    if (fs.existsSync(temporaryDirectory) && !fs.existsSync(directory)) fs.renameSync(temporaryDirectory, directory);
    throw error;
  }
}

function getAttachment(messageId, attachmentIndex) {
  const attachment = db().prepare(`
    SELECT filename, content_type AS contentType, size, content
      FROM attachments WHERE message_id = ? AND attachment_index = ?
  `).get(messageId, Number(attachmentIndex));
  if (!attachment) throw new Error('Pièce jointe introuvable.');
  return { ...attachment, content: Buffer.from(attachment.content) };
}

function deleteAccountMessages(accountId) {
  const database = db();
  database.exec('BEGIN');
  try {
    database.prepare(`
      DELETE FROM attachments
       WHERE message_id IN (SELECT id FROM messages WHERE account_id = ?)
    `).run(accountId);
    const result = database.prepare('DELETE FROM messages WHERE account_id = ?').run(accountId);
    database.exec('COMMIT');
    return Number(result.changes || 0);
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function listContacts() {
  return db().prepare(`
    SELECT id, name, email, phone, company, notes,
           created_at AS createdAt, updated_at AS updatedAt
      FROM contacts
     ORDER BY name COLLATE NOCASE, email COLLATE NOCASE
  `).all();
}

function saveContact(contact) {
  const database = db();
  const name = String(contact?.name || '').trim();
  const email = String(contact?.email || '').trim();
  const phone = String(contact?.phone || '').trim();
  const company = String(contact?.company || '').trim();
  const notes = String(contact?.notes || '').trim();
  if (!name) throw new Error('Le nom du contact est obligatoire.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Adresse e-mail invalide.');
  if (name.length > 120 || email.length > 254 || phone.length > 80 || company.length > 120 || notes.length > 4000) {
    throw new Error('Une information du contact est trop longue.');
  }
  const now = new Date().toISOString();
  let id = String(contact?.id || '').trim();
  if (id) {
    const result = database.prepare(`
      UPDATE contacts SET name = ?, email = ?, phone = ?, company = ?, notes = ?, updated_at = ?
       WHERE id = ?
    `).run(name, email, phone, company, notes, now, id);
    if (!result.changes) throw new Error('Contact introuvable.');
  } else {
    id = randomUUID();
    database.prepare(`
      INSERT INTO contacts (id, name, email, phone, company, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, phone, company, notes, now, now);
  }
  return database.prepare(`
    SELECT id, name, email, phone, company, notes,
           created_at AS createdAt, updated_at AS updatedAt
      FROM contacts WHERE id = ?
  `).get(id);
}

function deleteContact(contactId) {
  const database = db();
  database.exec('BEGIN');
  try {
    database.prepare('DELETE FROM contact_group_members WHERE contact_id = ?').run(String(contactId || ''));
    const result = database.prepare('DELETE FROM contacts WHERE id = ?').run(String(contactId || ''));
    if (!result.changes) throw new Error('Contact introuvable.');
    database.exec('COMMIT');
    return { deleted: true };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function listContactGroups() {
  const database = db();
  const groups = database.prepare('SELECT id, name, created_at AS createdAt FROM contact_groups ORDER BY name COLLATE NOCASE').all();
  const members = database.prepare(`
    SELECT contact_group_members.group_id AS groupId, contacts.id, contacts.name, contacts.email
      FROM contact_group_members
      JOIN contacts ON contacts.id = contact_group_members.contact_id
     ORDER BY contacts.name COLLATE NOCASE
  `).all();
  return groups.map((group) => ({
    ...group,
    members: members.filter((member) => member.groupId === group.id)
      .map(({ groupId, ...member }) => member)
  }));
}

function saveContactGroup(nameValue, contactIds, groupId = null) {
  const database = db();
  const name = String(nameValue || '').trim();
  const ids = [...new Set((Array.isArray(contactIds) ? contactIds : []).map(String).filter(Boolean))];
  if (!name) throw new Error('Le nom du groupe est obligatoire.');
  if (name.length > 120) throw new Error('Le nom du groupe est trop long.');
  if (ids.length < 2) throw new Error('Sélectionnez au moins deux contacts pour créer un groupe.');
  const placeholders = ids.map(() => '?').join(', ');
  const existing = database.prepare(`SELECT id FROM contacts WHERE id IN (${placeholders})`).all(...ids);
  if (existing.length !== ids.length) throw new Error('Un des contacts sélectionnés est introuvable.');
  const id = String(groupId || '').trim() || randomUUID();
  database.exec('BEGIN');
  try {
    if (groupId) {
      const result = database.prepare('UPDATE contact_groups SET name = ? WHERE id = ?').run(name, id);
      if (!result.changes) throw new Error('Groupe introuvable.');
      database.prepare('DELETE FROM contact_group_members WHERE group_id = ?').run(id);
    } else {
      database.prepare('INSERT INTO contact_groups (id, name, created_at) VALUES (?, ?, ?)')
        .run(id, name, new Date().toISOString());
    }
    const insertMember = database.prepare('INSERT INTO contact_group_members (group_id, contact_id) VALUES (?, ?)');
    for (const contactId of ids) insertMember.run(id, contactId);
    database.exec('COMMIT');
    return listContactGroups().find((group) => group.id === id);
  } catch (error) {
    database.exec('ROLLBACK');
    if (/UNIQUE/i.test(String(error.message))) throw new Error('Un groupe porte déjà ce nom.');
    throw error;
  }
}

function mergeDuplicateContacts() {
  const database = db();
  const contacts = database.prepare(`
    SELECT id, name, email, phone, company, notes, created_at AS createdAt
      FROM contacts ORDER BY created_at, id
  `).all();
  const groups = new Map();
  for (const contact of contacts) {
    const key = String(contact.email || '').trim().toLocaleLowerCase('fr');
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(contact);
  }
  let merged = 0;
  database.exec('BEGIN');
  try {
    const updateContact = database.prepare(`
      UPDATE contacts SET name = ?, phone = ?, company = ?, notes = ?, updated_at = ? WHERE id = ?
    `);
    const copyMemberships = database.prepare(`
      INSERT OR IGNORE INTO contact_group_members (group_id, contact_id)
      SELECT group_id, ? FROM contact_group_members WHERE contact_id = ?
    `);
    const deleteMemberships = database.prepare('DELETE FROM contact_group_members WHERE contact_id = ?');
    const deleteDuplicate = database.prepare('DELETE FROM contacts WHERE id = ?');
    for (const duplicates of groups.values()) {
      if (duplicates.length < 2) continue;
      const keep = duplicates[0];
      for (const duplicate of duplicates.slice(1)) {
        keep.name = keep.name || duplicate.name;
        keep.phone = keep.phone || duplicate.phone;
        keep.company = keep.company || duplicate.company;
        keep.notes = [keep.notes, duplicate.notes].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join('\n');
        copyMemberships.run(keep.id, duplicate.id);
        deleteMemberships.run(duplicate.id);
        deleteDuplicate.run(duplicate.id);
        merged += 1;
      }
      updateContact.run(keep.name, keep.phone, keep.company, keep.notes, new Date().toISOString(), keep.id);
    }
    database.exec('COMMIT');
    return { merged };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function deleteContactGroup(groupId) {
  const database = db();
  database.exec('BEGIN');
  try {
    database.prepare('DELETE FROM contact_group_members WHERE group_id = ?').run(String(groupId || ''));
    const result = database.prepare('DELETE FROM contact_groups WHERE id = ?').run(String(groupId || ''));
    if (!result.changes) throw new Error('Groupe introuvable.');
    database.exec('COMMIT');
    return { deleted: true };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  checkpointDatabase,
  changeDataDirectory,
  countUnreadMessages,
  deleteContact,
  deleteContactGroup,
  deleteDraft,
  deleteMailRule,
  deleteAccountMessages,
  copyMessageToLocal,
  copyStoredFolderToLocal,
  copyStoredFolderTreeToLocal,
  createLocalFolder,
  duplicateLocalFolderTree,
  deleteLocalFolder,
  deleteLocalFolderTree,
  getAttachment,
  getDraft,
  getLocalFolderPath,
  getMessage,
  getMessageReference,
  listMessages,
  listContacts,
  listContactGroups,
  listMailRules,
  listDrafts,
  listRuleCandidateMessages,
  listLocalFolders,
  listUnindexedEmlFiles,
  mergeDuplicateContacts,
  moveLocalFolder,
  renameLocalFolder,
  registerLocalEmlFile,
  removeLocalMessage,
  setMessageRead,
  saveContact,
  saveContactGroup,
  saveMailRule,
  saveDraft,
  setLocalFolderColor,
  isMailRuleApplied,
  markMailRuleApplied,
  storeMessage,
  storeSentMessage,
  searchMessages
};

