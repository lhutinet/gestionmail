const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { getSettings } = require('./settings-store');

const USER_FILES = ['accounts.json', 'composer.json', 'todos.json', 'TODO.md'];

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

function backupName() {
  return `GestionMail-sauvegarde-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
}

function createBackup(parentDirectory) {
  const root = path.join(path.resolve(parentDirectory), backupName());
  if (fs.existsSync(root)) throw new Error('Le dossier de sauvegarde existe déjà.');
  fs.mkdirSync(root, { recursive: false });
  const userData = app.getPath('userData');
  const settings = getSettings();
  for (const filename of USER_FILES) copyIfExists(path.join(userData, filename), path.join(root, 'profil', filename));
  copyIfExists(path.join(settings.dataDirectory, 'messages.sqlite'), path.join(root, 'donnees', 'messages.sqlite'));
  copyIfExists(path.join(settings.dataDirectory, 'Dossiers locaux'), path.join(root, 'donnees', 'Dossiers locaux'));
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({
    format: 1,
    application: 'GestionMail',
    createdAt: new Date().toISOString(),
    version: app.getVersion(),
    settings: { ...settings, dataDirectory: undefined }
  }, null, 2), 'utf8');
  return { created: true, path: root };
}

function validateBackup(root) {
  const manifestPath = path.join(root, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('Ce dossier ne contient pas de sauvegarde GestionMail.');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.application !== 'GestionMail' || Number(manifest.format) !== 1) throw new Error('Format de sauvegarde non reconnu.');
  if (!fs.existsSync(path.join(root, 'donnees', 'messages.sqlite'))) throw new Error('La base de messages manque dans cette sauvegarde.');
  return manifest;
}

function scheduleRestore(root) {
  const resolved = path.resolve(root);
  const manifest = validateBackup(resolved);
  fs.writeFileSync(path.join(app.getPath('userData'), 'pending-restore.json'), JSON.stringify({ path: resolved, requestedAt: new Date().toISOString() }, null, 2), 'utf8');
  return { scheduled: true, createdAt: manifest.createdAt };
}

function applyPendingRestore() {
  const userData = app.getPath('userData');
  const requestPath = path.join(userData, 'pending-restore.json');
  if (!fs.existsSync(requestPath)) return { restored: false };
  const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
  const root = path.resolve(request.path);
  validateBackup(root);
  const currentSettings = getSettings();
  const recovery = path.join(userData, `avant-restauration-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(recovery, { recursive: true });
  for (const filename of USER_FILES) copyIfExists(path.join(userData, filename), path.join(recovery, 'profil', filename));
  copyIfExists(path.join(userData, 'settings.json'), path.join(recovery, 'profil', 'settings.json'));
  copyIfExists(path.join(currentSettings.dataDirectory, 'messages.sqlite'), path.join(recovery, 'donnees', 'messages.sqlite'));
  copyIfExists(path.join(currentSettings.dataDirectory, 'Dossiers locaux'), path.join(recovery, 'donnees', 'Dossiers locaux'));

  for (const filename of USER_FILES) copyIfExists(path.join(root, 'profil', filename), path.join(userData, filename));
  const backedSettings = { ...currentSettings, ...JSON.parse(JSON.stringify(validateBackup(root).settings || {})), dataDirectory: currentSettings.dataDirectory };
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify(backedSettings, null, 2), 'utf8');
  fs.rmSync(path.join(currentSettings.dataDirectory, 'messages.sqlite-wal'), { force: true });
  fs.rmSync(path.join(currentSettings.dataDirectory, 'messages.sqlite-shm'), { force: true });
  copyIfExists(path.join(root, 'donnees', 'messages.sqlite'), path.join(currentSettings.dataDirectory, 'messages.sqlite'));
  const targetLocal = path.join(currentSettings.dataDirectory, 'Dossiers locaux');
  if (fs.existsSync(targetLocal)) fs.renameSync(targetLocal, `${targetLocal}.avant-restauration-${Date.now()}`);
  copyIfExists(path.join(root, 'donnees', 'Dossiers locaux'), targetLocal);
  fs.rmSync(requestPath, { force: true });
  return { restored: true, recoveryPath: recovery };
}

module.exports = { applyPendingRestore, createBackup, scheduleRestore, validateBackup };
