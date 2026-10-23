const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app } = require('electron');
const { DatabaseSync } = require('node:sqlite');
const sanitizeHtml = require('sanitize-html');

let database;

function db() {
  if (database) return database;
  database = new DatabaseSync(path.join(app.getPath('userData'), 'messages.sqlite'));
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
  `);
  const columns = database.prepare('PRAGMA table_info(messages)').all();
  if (!columns.some((column) => column.name === 'folder')) {
    database.exec("ALTER TABLE messages ADD COLUMN folder TEXT NOT NULL DEFAULT 'INBOX'");
  }
  return database;
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
}

function listMessages(accountId, folder = 'INBOX', limit = 100) {
  return db().prepare(`
    SELECT id, account_id AS accountId, subject, sender, recipients,
           received_at AS receivedAt, preview, is_read AS isRead
      FROM messages
     WHERE account_id = ? AND folder = ?
     ORDER BY COALESCE(received_at, created_at) DESC
     LIMIT ?
  `).all(accountId, folder, Math.min(Math.max(Number(limit) || 100, 1), 500));
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
    SELECT attachment_index AS attachmentIndex, filename, content_type AS contentType, size
      FROM attachments WHERE message_id = ? ORDER BY attachment_index
  `).all(id);
  const safeHtml = message.htmlBody ? sanitizeHtml(message.htmlBody, {
    allowedTags: [
      'p', 'div', 'span', 'br', 'hr', 'b', 'strong', 'i', 'em', 'u', 's',
      'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'
    ],
    allowedAttributes: {
      table: ['cellpadding', 'cellspacing'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan']
    },
    allowedSchemes: [],
    disallowedTagsMode: 'discard'
  }) : '';
  return { ...message, htmlBody: safeHtml, attachments };
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
  database.exec('BEGIN');
  try {
    database.prepare('DELETE FROM attachments WHERE message_id = ?').run(id);
    const result = database.prepare('DELETE FROM messages WHERE id = ?').run(id);
    if (!result.changes) throw new Error('Message introuvable.');
    database.exec('COMMIT');
    return { removed: true };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function listLocalFolders() {
  return db().prepare(`
    SELECT id, name,
           (SELECT COUNT(*) FROM messages
             WHERE account_id = '__local__' AND folder = 'local:' || local_folders.id) AS messageCount
      FROM local_folders
     ORDER BY name COLLATE NOCASE
  `).all().map((folder) => ({ ...folder, id: Number(folder.id), messageCount: Number(folder.messageCount) }));
}

function createLocalFolder(name) {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Le nom du dossier local est obligatoire.');
  if (cleanName.length > 80) throw new Error('Le nom du dossier local est trop long.');
  const duplicate = db().prepare('SELECT id FROM local_folders WHERE name = ? COLLATE NOCASE').get(cleanName);
  if (duplicate) throw new Error('Un dossier local porte déjà ce nom.');
  const result = db().prepare('INSERT INTO local_folders (name, created_at) VALUES (?, ?)')
    .run(cleanName, new Date().toISOString());
  return { id: Number(result.lastInsertRowid), name: cleanName, messageCount: 0 };
}

function copyMessageToLocal(messageId, localFolderId) {
  const database = db();
  const source = database.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!source) throw new Error('Message source introuvable.');
  const folder = database.prepare('SELECT id FROM local_folders WHERE id = ?').get(Number(localFolderId));
  if (!folder) throw new Error('Dossier local introuvable.');

  const copyId = `local:${localFolderId}:${randomUUID()}`;
  const remoteId = `local-${randomUUID()}`;
  database.exec('BEGIN');
  try {
    database.prepare(`
      INSERT INTO messages (
        id, account_id, folder, remote_id, subject, sender, recipients, received_at,
        preview, text_body, html_body, raw_message, is_read, created_at
      ) VALUES (?, '__local__', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    database.exec('COMMIT');
    return { copied: true, id: copyId };
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function deleteLocalFolder(localFolderId) {
  const database = db();
  const folderKey = `local:${Number(localFolderId)}`;
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
    return { deleted: true };
  } catch (error) {
    database.exec('ROLLBACK');
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

module.exports = {
  deleteAccountMessages,
  copyMessageToLocal,
  createLocalFolder,
  deleteLocalFolder,
  getAttachment,
  getMessage,
  getMessageReference,
  listMessages,
  listLocalFolders,
  removeLocalMessage,
  setMessageRead,
  storeMessage
};

