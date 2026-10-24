const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app } = require('electron');

function storePath() {
  return path.join(app.getPath('userData'), 'composer.json');
}

function readStore() {
  try {
    const value = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    return { signatures: value.signatures || {}, templates: Array.isArray(value.templates) ? value.templates : [] };
  } catch {
    return { signatures: {}, templates: [] };
  }
}

function writeStore(value) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  const temporaryPath = `${storePath()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(temporaryPath, storePath());
}

function getComposerData(accountId) {
  const store = readStore();
  return { signature: String(store.signatures[String(accountId || '')] || ''), templates: store.templates };
}

function saveSignature(accountId, html) {
  const id = String(accountId || '').trim();
  if (!id) throw new Error('Sélectionnez un compte.');
  const store = readStore();
  store.signatures[id] = String(html || '').slice(0, 20000);
  writeStore(store);
  return { saved: true, signature: store.signatures[id] };
}

function saveTemplate(template) {
  const store = readStore();
  const name = String(template?.name || '').trim();
  if (!name) throw new Error('Le nom du modèle est obligatoire.');
  const id = String(template?.id || '').trim() || randomUUID();
  const value = { id, name: name.slice(0, 120), subject: String(template?.subject || '').slice(0, 500), htmlBody: String(template?.htmlBody || '').slice(0, 100000) };
  const index = store.templates.findIndex((item) => item.id === id);
  if (index >= 0) store.templates[index] = value;
  else store.templates.push(value);
  writeStore(store);
  return value;
}

function deleteTemplate(templateId) {
  const store = readStore();
  const before = store.templates.length;
  store.templates = store.templates.filter((item) => item.id !== String(templateId || ''));
  writeStore(store);
  return { deleted: store.templates.length < before };
}

module.exports = { deleteTemplate, getComposerData, saveSignature, saveTemplate };
