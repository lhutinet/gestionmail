const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { performance } = require('node:perf_hooks');
const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, shell, Tray } = require('electron');
const { simpleParser } = require('mailparser');
const { autoUpdater } = require('electron-updater');
const { deleteAccount, getAccountWithPassword, listAccounts, saveAccount, validateAccount } = require('./account-store');
const {
  changeDataDirectory, checkpointDatabase, copyMessageToLocal, copyStoredFolderToLocal, copyStoredFolderTreeToLocal, countUnreadMessages, createLocalFolder, deleteAccountMessages, deleteContact, deleteContactGroup, deleteLocalFolder, deleteLocalFolderTree, deleteMailRule, duplicateLocalFolderTree,
  getAttachment, getLocalFolderPath, getMessage, getMessageReference, listContactGroups, listContacts, listLocalFolders,
  deleteDraft, getDraft, isMailRuleApplied, listDrafts, listMailRules, listMessages, listRuleCandidateMessages, listUnindexedEmlFiles, markMailRuleApplied, mergeDuplicateContacts, moveLocalFolder, registerLocalEmlFile, removeLocalMessage, renameLocalFolder, saveContact, saveContactGroup, saveDraft, saveMailRule, searchMessages, setLocalFolderColor, setMessageRead, storeMessage, storeSentMessage
} = require('./message-store');
const { getSettings, saveSettings } = require('./settings-store');
const { deleteTodo, listTodos, saveTodo } = require('./todo-store');
const { deleteTemplate, getComposerData, saveSignature, saveTemplate } = require('./composer-store');
const { applyPendingRestore, createBackup, scheduleRestore } = require('./backup-store');
const { authorizeOAuth } = require('./oauth-service');
const {
  listFolders, moveRemoteMessage, sendMessage, setRemoteReadState,
  syncAccount, testConfiguration
} = require('./mail-service');
const isSmokeTest = process.argv.includes('--smoke-test');
const startupStartedAt = performance.now();
const startupMetrics = { processStartedAt: new Date().toISOString(), windowReadyMs: null, localScanMs: null, localScanFiles: 0 };
let mainWindow = null;
let tray = null;
let isQuitting = false;
const messageWindows = new Map();
const folderCopyJobs = new Map();
let localScanPromise = null;
let updateAvailable = false;
let updateDownloaded = false;

function csvCell(value) {
  return `"${String(value || '').replaceAll('"', '""')}"`;
}

function contactsToCsv(contacts) {
  const rows = [['Nom', 'E-mail', 'Téléphone', 'Société', 'Notes']];
  for (const contact of contacts) rows.push([contact.name, contact.email, contact.phone, contact.company, contact.notes]);
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

function contactsToVcard(contacts) {
  const clean = (value) => String(value || '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
  return contacts.map((contact) => [
    'BEGIN:VCARD', 'VERSION:3.0', `FN:${clean(contact.name)}`, `EMAIL:${clean(contact.email)}`,
    contact.phone ? `TEL:${clean(contact.phone)}` : '', contact.company ? `ORG:${clean(contact.company)}` : '',
    contact.notes ? `NOTE:${clean(contact.notes)}` : '', 'END:VCARD'
  ].filter(Boolean).join('\r\n')).join('\r\n');
}

function parseCsvLine(line, separator) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === separator && !quoted) { values.push(value.trim()); value = ''; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

function parseContactFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  if (/\.vcf$/i.test(filePath) || /BEGIN:VCARD/i.test(content)) {
    return [...content.matchAll(/BEGIN:VCARD([\s\S]*?)END:VCARD/gi)].map((match) => {
      const fields = {};
      for (const line of match[1].replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
        const separator = line.indexOf(':');
        if (separator < 0) continue;
        const key = line.slice(0, separator).split(';')[0].toUpperCase();
        fields[key] = line.slice(separator + 1).replace(/\\n/gi, '\n').replace(/\\([\\;,])/g, '$1');
      }
      return { name: fields.FN || fields.N || fields.EMAIL, email: fields.EMAIL, phone: fields.TEL || '', company: fields.ORG || '', notes: fields.NOTE || '' };
    }).filter((contact) => contact.email);
  }
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const separator = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = parseCsvLine(lines.shift(), separator).map((value) => value.toLocaleLowerCase('fr'));
  const column = (...names) => headers.findIndex((header) => names.some((name) => header.includes(name)));
  const indices = { name: column('nom', 'name'), email: column('mail'), phone: column('téléphone', 'telephone', 'phone'), company: column('société', 'societe', 'company', 'entreprise'), notes: column('note') };
  return lines.map((line) => {
    const cells = parseCsvLine(line, separator);
    const get = (index) => index >= 0 ? cells[index] || '' : '';
    return { name: get(indices.name) || get(indices.email), email: get(indices.email), phone: get(indices.phone), company: get(indices.company), notes: get(indices.notes) };
  }).filter((contact) => contact.email);
}

if (isSmokeTest) {
  const smokeProfile = path.join(os.tmpdir(), `gestionmail-smoke-${process.pid}`);
  app.setPath('userData', smokeProfile);
  app.commandLine.appendSwitch('disk-cache-dir', path.join(smokeProfile, 'Cache'));
} else {
  // Conserver le profil historique malgré le changement de nom de l’application.
  app.setPath('userData', path.join(app.getPath('appData'), 'GestionMail'));
  // Les caches Chromium sont temporaires et appartiennent à AppData Local, pas aux données sauvegardées.
  const localCacheRoot = path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Monmail', 'Cache');
  fs.mkdirSync(localCacheRoot, { recursive: true });
  app.commandLine.appendSwitch('disk-cache-dir', localCacheRoot);
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const visible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Afficher Monmail', enabled: !visible, click: showMainWindow },
    { label: 'Masquer Monmail', enabled: visible, click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Rechercher les mises à jour', click: () => checkForUpdates().catch((error) => broadcastUpdate({ state: 'error', message: error.message })) },
    { type: 'separator' },
    { label: 'Quitter Monmail', click: () => { isQuitting = true; app.quit(); } }
  ]));
}

function broadcastUpdate(status) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('updates:status', status);
  }
}

async function checkForUpdates(automatic = false) {
  if (!app.isPackaged) return { state: 'development', message: 'La recherche de mise à jour fonctionne dans la version Windows installée.' };
  autoUpdater.autoDownload = false;
  broadcastUpdate({ state: 'checking', message: automatic ? 'Recherche automatique d’une mise à jour…' : 'Recherche d’une mise à jour…' });
  await autoUpdater.checkForUpdates();
  return { state: 'checking' };
}

autoUpdater.on('update-available', (info) => { updateAvailable = true; broadcastUpdate({ state: 'available', message: `Version ${info.version} disponible.`, version: info.version }); });
autoUpdater.on('update-not-available', () => broadcastUpdate({ state: 'current', message: 'Monmail est à jour.' }));
autoUpdater.on('download-progress', (progress) => broadcastUpdate({ state: 'downloading', message: `Téléchargement : ${Math.round(progress.percent)} %`, percent: progress.percent }));
autoUpdater.on('update-downloaded', (info) => { updateDownloaded = true; broadcastUpdate({ state: 'downloaded', message: `Version ${info.version} prête à être installée.`, version: info.version }); });
autoUpdater.on('error', (error) => broadcastUpdate({ state: 'error', message: `Mise à jour impossible : ${error.message}` }));

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}

function trayIcon(unread = 0) {
  const width = 32;
  const height = 32;
  const pixels = Buffer.alloc(width * height * 4);
  const pixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    pixels.set(color, offset);
  };
  for (let y = 4; y < 28; y += 1) for (let x = 1; x < 27; x += 1) pixel(x, y, [20, 36, 60, 255]);
  for (let step = 0; step < 9; step += 1) {
    pixel(5 + step, 10 + Math.floor(step * .65), [110, 231, 210, 255]);
    pixel(21 - step, 10 + Math.floor(step * .65), [110, 231, 210, 255]);
  }
  if (unread > 0) {
    for (let y = 0; y < 17; y += 1) for (let x = 15; x < 32; x += 1) if ((x - 23) ** 2 + (y - 8) ** 2 <= 64) pixel(x, y, [216, 59, 53, 255]);
    const glyphs = {
      '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
      '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
      '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
      '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
      '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
      '+': ['000', '010', '111', '010', '000']
    };
    const label = unread > 99 ? '9+' : String(unread);
    const startX = 24 - Math.floor((label.length * 4 - 1) / 2);
    for (const [characterIndex, character] of [...label].entries()) {
      for (const [row, pattern] of glyphs[character].entries()) for (const [column, enabled] of [...pattern].entries()) if (enabled === '1') pixel(startX + characterIndex * 4 + column, 6 + row, [255, 255, 255, 255]);
    }
  }
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
  return nativeImage.createFromBuffer(png);
}

function updateUnreadBadge() {
  if (!tray || tray.isDestroyed()) return;
  try {
    const unread = countUnreadMessages();
    const icon = trayIcon(unread);
    tray.setImage(icon);
    tray.setToolTip(unread ? `Monmail — ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : 'Monmail — aucun message non lu');
    if (process.platform === 'win32' && mainWindow && !mainWindow.isDestroyed()) mainWindow.setOverlayIcon(unread ? icon : null, unread ? `${unread} messages non lus` : '');
  } catch (error) {
    console.warn(`Compteur non lu indisponible : ${error.message}`);
  }
}

async function createTray() {
  if (isSmokeTest || tray) return;
  tray = new Tray(trayIcon(0));
  tray.setToolTip('Monmail');
  tray.on('double-click', showMainWindow);
  tray.on('click', showMainWindow);
  updateTrayMenu();
  updateUnreadBadge();
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1080,
    minHeight: 600,
    show: !isSmokeTest,
    backgroundColor: '#f3f5f8',
    title: 'Monmail',
    icon: trayIcon(0),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  window.webContents.once('did-finish-load', () => {
    startupMetrics.windowReadyMs = Math.round(performance.now() - startupStartedAt);
  });
  mainWindow = window;
  window.on('minimize', (event) => {
    if (!getSettings().minimizeToTray || isQuitting) return;
    event.preventDefault();
    window.hide();
    updateTrayMenu();
  });
  window.on('close', (event) => {
    if (!getSettings().minimizeToTray || isQuitting) return;
    event.preventDefault();
    window.hide();
    updateTrayMenu();
  });
  window.on('show', updateTrayMenu);
  window.on('hide', updateTrayMenu);
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  if (isSmokeTest) {
    window.webContents.once('did-finish-load', async () => {
      try {
        const colorResult = await window.webContents.executeJavaScript(`(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const editor = document.querySelector('#compose-body-editor');
          const picker = document.querySelector('#compose-text-color');
          editor.innerHTML = '<p>Texte en couleur</p>';
          const range = document.createRange();
          range.selectNodeContents(editor.querySelector('p'));
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          picker.value = '#d02020';
          picker.dispatchEvent(new Event('input', { bubbles: true }));
          const inputHtml = editor.innerHTML;
          editor.innerHTML = '<p>Autre texte en couleur</p>';
          const changeRange = document.createRange();
          changeRange.selectNodeContents(editor.querySelector('p'));
          selection.removeAllRanges();
          selection.addRange(changeRange);
          editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          picker.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          picker.value = '#2080d0';
          picker.dispatchEvent(new Event('change', { bubbles: true }));
          const changeHtml = editor.innerHTML;
          const subject = document.querySelector('#compose-form input[name="subject"]');
          subject.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
          const contextLabels = [...document.querySelectorAll('.context-menu button')].map((button) => button.textContent);
          const rootStyle = document.documentElement.style;
          return {
            inputHtml,
            changeHtml,
            contextLabels,
            interfaceColor: rootStyle.getPropertyValue('--accent-color').trim(),
            interfaceContrast: rootStyle.getPropertyValue('--accent-contrast').trim(),
            hasAdvancedSearch: Boolean(document.querySelector('#advanced-search-form input[name="dateFrom"]')),
            hasEditorBackground: Boolean(document.querySelector('#compose-background-color')),
            hasBackupActions: Boolean(document.querySelector('#create-backup'))
          };
        })()`);
        if (
          !/color:\s*(?:#d02020|rgb\(208,\s*32,\s*32\))/i.test(colorResult.inputHtml) ||
          !/color:\s*(?:#2080d0|rgb\(32,\s*128,\s*208\))/i.test(colorResult.changeHtml) ||
          !colorResult.contextLabels.includes('Copier') ||
          !colorResult.contextLabels.includes('Coller') ||
          colorResult.interfaceColor !== '#d04f85' ||
          !['#102033', '#ffffff'].includes(colorResult.interfaceContrast) ||
          !colorResult.hasAdvancedSearch || !colorResult.hasEditorBackground || !colorResult.hasBackupActions
        ) {
          throw new Error(`Couleur non appliquée dans l'éditeur : ${JSON.stringify(colorResult)}`);
        }
      } catch (error) {
        console.error(error);
        process.exitCode = 1;
      }
      app.quit();
    });
    window.webContents.once('did-fail-load', (_event, code, description) => {
      console.error(`Chargement impossible (${code}) : ${description}`);
      process.exitCode = 1;
      app.quit();
    });
  }
}

function openMessageWindow(messageId) {
  const message = getMessage(messageId);
  const existing = messageWindows.get(messageId);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return { opened: true, reused: true };
  }

  const window = new BrowserWindow({
    width: 900,
    height: 760,
    minWidth: 600,
    minHeight: 450,
    backgroundColor: '#fafbfc',
    title: message.subject || '(Sans objet)',
    icon: trayIcon(0),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.loadFile(path.join(__dirname, '..', 'renderer', 'message-window.html'), {
    query: { id: String(messageId) }
  });
  messageWindows.set(messageId, window);
  window.on('closed', () => messageWindows.delete(messageId));
  return { opened: true, reused: false };
}

async function refreshLocalEmlFiles() {
  const startedAt = performance.now();
  let imported = 0;
  for (const file of listUnindexedEmlFiles()) {
    try {
      const raw = fs.readFileSync(file.path);
      const parsed = await simpleParser(raw);
      registerLocalEmlFile(file.localFolderId, file.filename, parsed, raw);
      imported += 1;
    } catch (error) {
      console.warn(`Fichier EML ignoré (${file.path}) : ${error.message}`);
    }
  }
  startupMetrics.localScanMs = Math.round(performance.now() - startedAt);
  startupMetrics.localScanFiles = imported;
  return { imported, durationMs: startupMetrics.localScanMs };
}

function scheduleLocalEmlRefresh(sender = null, accountId = null, accountEmail = '', accountDirectory = '') {
  if (localScanPromise) return localScanPromise;
  localScanPromise = new Promise((resolve) => setTimeout(resolve, 150)).then(refreshLocalEmlFiles).then((result) => {
    if (sender && !sender.isDestroyed()) sender.send('local-folders:refreshed', {
      accountId,
      folders: accountId ? listLocalFolders(accountId, accountEmail, accountDirectory) : listLocalFolders(),
      ...result
    });
    updateUnreadBadge();
    return result;
  }).catch((error) => console.warn(`Analyse différée des fichiers EML impossible : ${error.message}`)).finally(() => {
    localScanPromise = null;
  });
  return localScanPromise;
}

app.whenReady().then(async () => {
  const restore = applyPendingRestore();
  if (restore.restored) console.info(`Sauvegarde restaurée. Copie précédente : ${restore.recoveryPath}`);
  if (isSmokeTest) {
    try {
      if (trayIcon(12).isEmpty()) throw new Error('Échec de la génération de l’icône avec compteur non lu.');
      storeMessage({
        accountId: '__smoke__', remoteId: 'test', folder: 'INBOX',
        subject: 'Test', from: 'Expéditeur <expediteur@exemple.test>', text: 'Test',
        html: '<p style="text-align:center;color:#123456">Contenu sûr</p><script>alert(1)</script><a href="javascript:alert(1)">Lien</a><img src="cid:logo@test"><img src="https://example.test/pixel.png">',
        attachments: [
          { filename: 'test.txt', content: Buffer.from('ok') },
          { filename: 'logo.png', contentType: 'image/png', cid: 'logo@test', content: Buffer.from([137, 80, 78, 71]) }
        ]
      });
      const smokeMessage = getMessage('__smoke__:test');
      const smokeAttachment = getAttachment('__smoke__:test', 0);
      if (
        smokeMessage.attachments.length !== 2 ||
        smokeAttachment.content.toString() !== 'ok' ||
        !smokeMessage.htmlBody.includes('Contenu sûr') ||
         !smokeMessage.htmlBody.includes('text-align:center') ||
         smokeMessage.htmlBody.includes('javascript:') ||
        /<script/i.test(smokeMessage.htmlBody) ||
        !smokeMessage.htmlBody.includes('src="data:image/png;base64,') ||
        !smokeMessage.htmlBody.includes('data-remote-src="https://example.test/pixel.png"') ||
        /<img\s+src="https:\/\/example\.test\/pixel\.png"/i.test(smokeMessage.htmlBody)
      ) {
        throw new Error('Échec du contrôle du contenu des messages.');
      }
      setMessageRead('__smoke__:test', true);
      if (!getMessageReference('__smoke__:test').isRead) {
        throw new Error('Échec du contrôle de l’état lu/non lu.');
      }
      const smokeContact = saveContact({
        name: 'Contact test', email: 'contact@example.test', phone: '0102030405', company: 'Monmail'
      });
      const updatedContact = saveContact({ ...smokeContact, name: 'Contact modifié', notes: 'Note test' });
      if (updatedContact.name !== 'Contact modifié' || listContacts().length !== 1) {
        throw new Error('Échec du contrôle du carnet de contacts.');
      }
      const secondContact = saveContact({ name: 'Deuxième contact', email: 'deuxieme@example.test' });
      const smokeGroup = saveContactGroup('Groupe test', [smokeContact.id, secondContact.id]);
      if (smokeGroup.members.length !== 2 || listContactGroups().length !== 1) {
        throw new Error('Échec du contrôle des groupes de contacts.');
      }
      const editedGroup = saveContactGroup('Groupe modifié', [smokeContact.id, secondContact.id], smokeGroup.id);
      const duplicateContact = saveContact({ name: 'Doublon test', email: 'CONTACT@example.test', notes: 'Note doublon' });
      const mergeResult = mergeDuplicateContacts();
      if (editedGroup.name !== 'Groupe modifié' || mergeResult.merged !== 1 || listContacts().length !== 2) {
        throw new Error('Échec du contrôle de modification des groupes ou de fusion des doublons.');
      }
      if (listContacts().some((contact) => contact.id === duplicateContact.id)) {
        throw new Error('Échec du contrôle de suppression du doublon fusionné.');
      }
      deleteContactGroup(editedGroup.id);
      deleteContact(smokeContact.id);
      deleteContact(secondContact.id);
      if (listContacts().length) throw new Error('Échec du contrôle de suppression du contact.');
      saveSignature('__smoke__', '<strong>Signature test</strong>');
      const template = saveTemplate({ name: 'Modèle test', subject: 'Objet', htmlBody: '<p>Corps</p>' });
      if (getComposerData('__smoke__').signature !== '<strong>Signature test</strong>' || getComposerData('__smoke__').templates.length !== 1) {
        throw new Error('Échec du contrôle des signatures et modèles.');
      }
      deleteTemplate(template.id);
      const localFolder = createLocalFolder('Archives test');
      setLocalFolderColor(localFolder.id, 'purple');
      const localCopy = copyMessageToLocal('__smoke__:test', localFolder.id);
      if (
        listMessages('__local__', `local:${localFolder.id}`).length !== 1 ||
        listLocalFolders().find((folder) => folder.id === localFolder.id)?.color !== 'purple' ||
        getMessage(localCopy.id).attachments.length !== 2 ||
        !fs.existsSync(localCopy.path) ||
        path.extname(localCopy.path).toLocaleLowerCase('en') !== '.eml'
      ) {
        throw new Error('Échec du contrôle de copie dans un dossier local.');
      }
      renameLocalFolder(localFolder.id, 'Archives renommées');
      const renamedFolder = listLocalFolders().find((folder) => folder.id === localFolder.id);
      if (renamedFolder?.name !== 'Archives renommées' || !fs.existsSync(renamedFolder.path)) throw new Error('Échec du renommage d’un dossier local.');
      const duplicatedTree = duplicateLocalFolderTree(localFolder.id);
      if (duplicatedTree.folderCount !== 1 || listMessages('__local__', `local:${duplicatedTree.folder.id}`).length !== 1) throw new Error('Échec de la duplication d’un dossier local.');
      const advancedResults = searchMessages({ sender: 'exemple.test', hasAttachments: true, readState: 'read' });
      if (!advancedResults.some((message) => message.id === '__smoke__:test') || !advancedResults.every((message) => message.attachmentCount > 0)) throw new Error('Échec de la recherche avancée.');
      setMessageRead(localCopy.id, false);
      if (countUnreadMessages() < 1) throw new Error('Échec du compteur de messages non lus.');
      setMessageRead(localCopy.id, true);
      deleteLocalFolderTree(duplicatedTree.folder.id);
      const copiedFolder = copyStoredFolderToLocal('__smoke__', 'INBOX', 'Dossier complet test');
      if (
        copiedFolder.messageCount !== 1 ||
        listMessages('__local__', `local:${copiedFolder.id}`).length !== 1 ||
        fs.readdirSync(copiedFolder.path).filter((name) => path.extname(name).toLocaleLowerCase('en') === '.eml').length !== 1
      ) {
        throw new Error('Échec du contrôle de copie complète d’un dossier.');
      }
      storeMessage({
        accountId: '__smoke_tree__', remoteId: 'root-test', folder: 'INBOX',
        subject: 'Message racine', text: 'Conserver dans la racine'
      });
      storeMessage({
        accountId: '__smoke_tree__', remoteId: 'child-test', folder: 'INBOX/Sous-dossier',
        subject: 'Message enfant', text: 'Conserver dans le sous-dossier'
      });
      const copiedTree = copyStoredFolderTreeToLocal('__smoke_tree__', [
        { sourcePath: 'INBOX', parentSourcePath: null, name: 'Arbre complet test' },
        { sourcePath: 'INBOX/Sous-dossier', parentSourcePath: 'INBOX', name: 'Sous-dossier' },
        { sourcePath: 'INBOX/Sous-dossier/Vide', parentSourcePath: 'INBOX/Sous-dossier', name: 'Vide' }
      ]);
      const copiedTreeFolders = listLocalFolders();
      const copiedTreeChild = copiedTreeFolders.find((folder) => folder.parentId === copiedTree.folder.id && folder.name === 'Sous-dossier');
      const copiedTreeLeaf = copiedTreeFolders.find((folder) => folder.parentId === copiedTreeChild?.id && folder.name === 'Vide');
      if (
        copiedTree.folderCount !== 3 ||
        copiedTree.totalMessages !== 2 ||
        !copiedTreeChild ||
        !copiedTreeLeaf ||
        path.dirname(copiedTreeChild.path) !== copiedTree.folder.path ||
        path.dirname(copiedTreeLeaf.path) !== copiedTreeChild.path ||
        listMessages('__local__', `local:${copiedTreeChild.id}`).length !== 1
      ) {
        throw new Error('Échec du contrôle de copie récursive d’un dossier.');
      }
      const treeRoot = createLocalFolder('Branche test');
      const treeTarget = createLocalFolder('Cible test');
      const treeChild = createLocalFolder('Sous-dossier test', treeRoot.id);
      if (path.dirname(treeChild.path) !== treeRoot.path || treeChild.parentId !== treeRoot.id) {
        throw new Error('Échec du contrôle de création d’un sous-dossier Windows.');
      }
      moveLocalFolder(treeChild.id, treeTarget.id);
      const movedChild = listLocalFolders().find((folder) => folder.id === treeChild.id);
      if (!movedChild || movedChild.parentId !== treeTarget.id || path.dirname(movedChild.path) !== treeTarget.path) {
        throw new Error('Échec du contrôle de déplacement d’un sous-dossier Windows.');
      }
      deleteLocalFolder(treeChild.id);
      deleteLocalFolder(treeRoot.id);
      deleteLocalFolder(treeTarget.id);
      deleteLocalFolder(copiedTreeLeaf.id);
      deleteLocalFolder(copiedTreeChild.id);
      deleteLocalFolder(copiedTree.folder.id);
      removeLocalMessage('__smoke__:test');
      removeLocalMessage('__smoke_tree__:root-test');
      removeLocalMessage('__smoke_tree__:child-test');
      if (listMessages('__smoke__', 'INBOX').length) {
        throw new Error('Échec du contrôle de suppression locale du message.');
      }
      deleteLocalFolder(localFolder.id);
      deleteLocalFolder(copiedFolder.id);
      if (
        listLocalFolders().some((folder) => folder.id === localFolder.id) ||
        fs.existsSync(localFolder.path) ||
        fs.existsSync(copiedFolder.path)
      ) {
        throw new Error('Échec du contrôle de suppression du dossier local.');
      }
      const smokeAccount = await saveAccount({
        name: 'Compte test', email: 'test@example.test', protocol: 'imap',
        incomingHost: 'imap.example.test', incomingPort: 993, incomingSecure: true,
        outgoingHost: 'smtp.example.test', outgoingPort: 465, outgoingSecure: true,
        username: 'test@example.test', password: 'secret-test'
      });
      const updatedAccount = await saveAccount({
        ...smokeAccount, name: 'Compte modifié', password: ''
      });
      if (updatedAccount.name !== 'Compte modifié' || (await getAccountWithPassword(smokeAccount.id)).password !== 'secret-test') {
        throw new Error('Échec du contrôle de modification du compte.');
      }
      deleteAccountMessages(smokeAccount.id);
      deleteAccount(smokeAccount.id);
      if (listAccounts().some((account) => account.id === smokeAccount.id)) {
        throw new Error('Échec du contrôle de suppression du compte.');
      }
      const oauthAccount = await saveAccount({
        name: 'OAuth test', email: 'oauth@example.test', protocol: 'imap', authType: 'oauth2', oauthProvider: 'google',
        oauthClientId: 'client-test', oauthTenant: '', accessToken: 'access-test', refreshToken: 'refresh-test', expiresAt: Date.now() + 3600000,
        incomingHost: 'imap.gmail.com', incomingPort: 993, incomingSecure: true,
        outgoingHost: 'smtp.gmail.com', outgoingPort: 465, outgoingSecure: true, username: 'oauth@example.test'
      });
      const oauthCredentials = await getAccountWithPassword(oauthAccount.id);
      if (oauthCredentials.accessToken !== 'access-test' || listAccounts().find((account) => account.id === oauthAccount.id)?.accessToken) throw new Error('Échec du stockage chiffré OAuth2.');
      deleteAccount(oauthAccount.id);
      storeMessage({ accountId: '__conversation__', remoteId: 'one', folder: 'INBOX', subject: 'Sujet commun', text: 'Premier' });
      storeMessage({ accountId: '__conversation__', remoteId: 'two', folder: 'INBOX', subject: 'Re: Sujet commun', text: 'Réponse' });
      const conversationMessages = listMessages('__conversation__', 'INBOX');
      if (conversationMessages.length !== 2 || conversationMessages[0].conversationKey !== conversationMessages[1].conversationKey) throw new Error('Échec du regroupement par conversation.');
      deleteAccountMessages('__conversation__');
      storeMessage({
        accountId: '__migration__', remoteId: 'test', folder: 'INBOX',
        subject: 'Migration', text: 'Conserver ce message'
      });
      const migrationFolder = createLocalFolder('Migration locale');
      copyMessageToLocal('__migration__:test', migrationFolder.id);
      const migration = changeDataDirectory(path.join(app.getPath('userData'), 'stockage-test'));
      saveSettings({ autoSyncMinutes: 5, notificationsEnabled: false, fontSize: 14, interfaceColor: '#d04f85', minimizeToTray: true, groupConversations: false, autoUpdateEnabled: false });
      const externalEmlPath = path.join(getLocalFolderPath(migrationFolder.id), 'message-externe.eml');
      fs.writeFileSync(
        externalEmlPath,
        'From: externe@example.test\r\nTo: test@example.test\r\nSubject: Message externe\r\n\r\nImport Windows',
        'utf8'
      );
      await refreshLocalEmlFiles();
      if (
        !migration.changed ||
        listMessages('__migration__', 'INBOX').length !== 1 ||
        !fs.existsSync(migrationFolder.path) ||
        listMessages('__local__', `local:${migrationFolder.id}`).length !== 2 ||
        getSettings().autoSyncMinutes !== 5 ||
        getSettings().notificationsEnabled !== false ||
        getSettings().fontSize !== 14 ||
        getSettings().interfaceColor !== '#d04f85' ||
        getSettings().minimizeToTray !== true ||
        getSettings().groupConversations !== false ||
        getSettings().autoUpdateEnabled !== false
      ) {
        throw new Error('Échec du contrôle de migration des paramètres et du stockage.');
      }
      fs.rmSync(externalEmlPath, { force: true });
      checkpointDatabase();
      const smokeBackup = createBackup(app.getPath('userData'));
      if (!fs.existsSync(path.join(smokeBackup.path, 'manifest.json')) || !fs.existsSync(path.join(smokeBackup.path, 'donnees', 'messages.sqlite'))) throw new Error('Échec de la sauvegarde complète.');
      fs.rmSync(smokeBackup.path, { recursive: true, force: true });
      listLocalFolders();
      if (listMessages('__local__', `local:${migrationFolder.id}`).length !== 1) {
        throw new Error('Échec du contrôle de suppression d’un fichier EML depuis Windows.');
      }
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
      app.quit();
      return;
    }
  }
  ipcMain.handle('accounts:list', () => listAccounts());
  ipcMain.handle('accounts:save', (_event, account) => saveAccount(account));
  ipcMain.handle('accounts:test', async (_event, account) => {
    const needsStoredCredentials = account.id && (
      (account.authType !== 'oauth2' && !String(account.password || '').length) ||
      (account.authType === 'oauth2' && !String(account.accessToken || '').length)
    );
    const storedAccount = needsStoredCredentials ? await getAccountWithPassword(account.id) : null;
    const testedAccount = storedAccount ? {
      ...storedAccount,
      ...account,
      password: account.password || storedAccount.password,
      accessToken: account.accessToken || storedAccount.accessToken
    } : account;
    validateAccount(testedAccount);
    return testConfiguration(testedAccount);
  });
  ipcMain.handle('oauth2:authorize', (_event, values) => authorizeOAuth(values));
  ipcMain.handle('accounts:delete', async (_event, accountId) => {
    const account = await getAccountWithPassword(accountId);
    const removedMessages = deleteAccountMessages(account.id);
    deleteAccount(account.id);
    return { deleted: true, removedMessages };
  });
  ipcMain.handle('contacts:list', () => listContacts());
  ipcMain.handle('contacts:save', (_event, contact) => saveContact(contact));
  ipcMain.handle('contacts:delete', (_event, contactId) => deleteContact(contactId));
  ipcMain.handle('contact-groups:list', () => listContactGroups());
  ipcMain.handle('contact-groups:save', (_event, name, contactIds, groupId) => saveContactGroup(name, contactIds, groupId));
  ipcMain.handle('contact-groups:delete', (_event, groupId) => deleteContactGroup(groupId));
  ipcMain.handle('contacts:merge-duplicates', () => mergeDuplicateContacts());
  ipcMain.handle('contacts:export', async (event, format = 'csv') => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const useVcard = format === 'vcf';
    const result = await dialog.showSaveDialog(owner, {
      title: 'Exporter les contacts',
      defaultPath: `contacts-monmail.${useVcard ? 'vcf' : 'csv'}`,
      filters: [{ name: useVcard ? 'vCard' : 'CSV', extensions: [useVcard ? 'vcf' : 'csv'] }]
    });
    if (result.canceled || !result.filePath) return { exported: false };
    const contacts = listContacts();
    fs.writeFileSync(result.filePath, useVcard ? contactsToVcard(contacts) : contactsToCsv(contacts), 'utf8');
    return { exported: true, count: contacts.length, path: result.filePath };
  });
  ipcMain.handle('contacts:import', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Importer des contacts', properties: ['openFile'],
      filters: [{ name: 'Contacts CSV ou vCard', extensions: ['csv', 'vcf'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { imported: false, count: 0 };
    const imported = parseContactFile(result.filePaths[0]);
    const existing = new Map(listContacts().map((contact) => [contact.email.toLocaleLowerCase('fr'), contact]));
    let count = 0;
    for (const contact of imported) {
      const previous = existing.get(contact.email.toLocaleLowerCase('fr'));
      const saved = saveContact({
        ...previous, ...contact,
        id: previous?.id || '',
        name: contact.name || previous?.name || contact.email,
        phone: contact.phone || previous?.phone || '',
        company: contact.company || previous?.company || '',
        notes: contact.notes || previous?.notes || ''
      });
      existing.set(saved.email.toLocaleLowerCase('fr'), saved);
      count += 1;
    }
    return { imported: true, count };
  });
  ipcMain.handle('todos:list', () => listTodos());
  ipcMain.handle('todos:save', (_event, todo) => saveTodo(todo));
  ipcMain.handle('todos:delete', (_event, todoId) => deleteTodo(todoId));
  ipcMain.handle('mail-rules:list', () => listMailRules());
  ipcMain.handle('mail-rules:save', (_event, rule) => saveMailRule(rule));
  ipcMain.handle('mail-rules:delete', (_event, ruleId) => deleteMailRule(ruleId));
  ipcMain.handle('drafts:list', () => listDrafts());
  ipcMain.handle('drafts:get', (_event, draftId) => getDraft(draftId));
  ipcMain.handle('drafts:save', (_event, draft) => saveDraft(draft));
  ipcMain.handle('drafts:delete', (_event, draftId) => deleteDraft(draftId));
  ipcMain.handle('composer:get-data', (_event, accountId) => getComposerData(accountId));
  ipcMain.handle('composer:save-signature', (_event, accountId, html) => saveSignature(accountId, html));
  ipcMain.handle('composer:save-template', (_event, template) => saveTemplate(template));
  ipcMain.handle('composer:delete-template', (_event, templateId) => deleteTemplate(templateId));
  ipcMain.handle('performance:get-startup', () => ({ ...startupMetrics }));
  ipcMain.handle('updates:check', () => checkForUpdates());
  ipcMain.handle('updates:download', async () => {
    if (!updateAvailable) throw new Error('Aucune mise à jour disponible.');
    await autoUpdater.downloadUpdate();
    return { downloading: true };
  });
  ipcMain.handle('updates:install', () => {
    if (!updateDownloaded) throw new Error('Aucune mise à jour téléchargée.');
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
    return { installing: true };
  });
  ipcMain.handle('folders:list', async (_event, accountId) => {
    const account = await getAccountWithPassword(accountId);
    return listFolders(account);
  });
  ipcMain.handle('local-folders:list', (event, accountId) => {
    const account = listAccounts().find((item) => item.id === String(accountId || ''));
    if (!account) return [];
    const folders = listLocalFolders(account.id, account.email, account.localDirectory);
    scheduleLocalEmlRefresh(event.sender, account.id, account.email, account.localDirectory);
    return folders;
  });
  ipcMain.handle('local-folders:create', (_event, accountId, name, parentId) => {
    const account = listAccounts().find((item) => item.id === String(accountId || ''));
    if (!account) throw new Error('Sélectionnez un compte avant de créer un dossier local.');
    return createLocalFolder(name, parentId, account.id, account.email, account.localDirectory);
  });
  ipcMain.handle('local-folders:delete', (_event, localFolderId) => deleteLocalFolder(localFolderId));
  ipcMain.handle('local-folders:delete-tree', (_event, localFolderId) => deleteLocalFolderTree(localFolderId));
  ipcMain.handle('local-folders:cancel-copy', (event) => {
    const job = folderCopyJobs.get(event.sender.id);
    if (job) job.cancelled = true;
    return { cancelled: Boolean(job) };
  });
  ipcMain.handle('local-folders:move', (_event, localFolderId, targetParentId) => moveLocalFolder(localFolderId, targetParentId));
  ipcMain.handle('local-folders:rename', (_event, localFolderId, name) => renameLocalFolder(localFolderId, name));
  ipcMain.handle('local-folders:duplicate', (_event, localFolderId) => duplicateLocalFolderTree(localFolderId));
  ipcMain.handle('local-folders:set-color', (_event, localFolderId, color) => setLocalFolderColor(localFolderId, color));
  ipcMain.handle('local-folders:open', async (_event, localFolderId) => {
    const folderPath = getLocalFolderPath(localFolderId);
    const error = await shell.openPath(folderPath);
    if (error) throw new Error(error);
    return { opened: true, path: folderPath };
  });
  ipcMain.handle('local-folders:copy-message', (_event, messageId, localFolderId) => {
    return copyMessageToLocal(messageId, localFolderId);
  });
  ipcMain.handle('local-folders:copy-remote-folder', async (event, accountId, folderPath, folderName) => {
    const job = { cancelled: false };
    folderCopyJobs.set(event.sender.id, job);
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const reportProgress = (progress, taskbarValue = null) => {
      if (!event.sender.isDestroyed()) event.sender.send('local-folders:copy-progress', progress);
      if (ownerWindow && !ownerWindow.isDestroyed() && taskbarValue !== null) ownerWindow.setProgressBar(taskbarValue);
    };
    reportProgress({ label: String(folderName || folderPath), detail: 'Lecture de l’arborescence du serveur…' }, 2);
    try {
      const account = await getAccountWithPassword(accountId);
      if (job.cancelled) throw new Error('Copie annulée.');
      const sourcePath = String(folderPath);
      const remoteFolders = await listFolders(account);
      const sourceFolder = remoteFolders.find((folder) => folder.path === sourcePath);
      const delimiter = sourceFolder?.delimiter || '/';
      const prefix = `${sourcePath}${delimiter}`;
      const descendants = remoteFolders.filter((folder) => folder.path === sourcePath || folder.path.startsWith(prefix));
      if (!descendants.some((folder) => folder.path === sourcePath)) {
        descendants.unshift({ path: sourcePath, name: folderName || sourcePath, delimiter, selectable: true });
      }

      const remoteByPath = new Map(descendants.map((folder) => [folder.path, folder]));
      const descriptorByPath = new Map();
      descriptorByPath.set(sourcePath, {
        sourcePath,
        parentSourcePath: null,
        name: String(folderName || sourceFolder?.name || sourcePath)
      });
      const orderedRemoteFolders = [...descendants].sort((left, right) => left.path.length - right.path.length);
      for (const remoteFolder of orderedRemoteFolders) {
        if (remoteFolder.path === sourcePath) continue;
        const relativeParts = remoteFolder.path.slice(prefix.length).split(delimiter).filter(Boolean);
        let parentSourcePath = sourcePath;
        for (const part of relativeParts) {
          const currentPath = `${parentSourcePath}${delimiter}${part}`;
          if (!descriptorByPath.has(currentPath)) {
            const exactFolder = remoteByPath.get(currentPath);
            descriptorByPath.set(currentPath, {
              sourcePath: currentPath,
              parentSourcePath,
              name: String(exactFolder?.name || part)
            });
          }
          parentSourcePath = currentPath;
        }
      }

      const foldersToSync = descendants.filter((folder) => folder.selectable !== false);
      let serverTotal = 0;
      for (const [index, remoteFolder] of foldersToSync.entries()) {
        if (job.cancelled) throw new Error('Copie annulée.');
        reportProgress({
          label: String(folderName || sourceFolder?.name || sourcePath),
          detail: `Téléchargement de « ${remoteFolder.name || remoteFolder.path} » — ${serverTotal} message${serverTotal > 1 ? 's' : ''}`,
          current: index,
          total: foldersToSync.length
        }, foldersToSync.length ? index / foldersToSync.length : 0);
        const syncResult = await syncAccount(account, remoteFolder.path, true);
        serverTotal += Number(syncResult.total || 0);
      }
      if (job.cancelled) throw new Error('Copie annulée.');
      reportProgress({
        label: String(folderName || sourceFolder?.name || sourcePath),
        detail: `Création de ${descriptorByPath.size} dossier${descriptorByPath.size > 1 ? 's' : ''} dans le stockage local…`,
        current: foldersToSync.length,
        total: foldersToSync.length || 1
      }, 1);
      const result = copyStoredFolderTreeToLocal(account.id, [...descriptorByPath.values()], account.email, account.localDirectory);
      reportProgress({
        label: String(folderName || sourceFolder?.name || sourcePath),
        detail: `Copie terminée — ${result.totalMessages} message${result.totalMessages > 1 ? 's' : ''}`,
        current: 1,
        total: 1
      }, 1);
      return { ...result, serverTotal };
    } finally {
      folderCopyJobs.delete(event.sender.id);
      if (ownerWindow && !ownerWindow.isDestroyed()) ownerWindow.setProgressBar(-1);
    }
  });
  ipcMain.handle('messages:list', (_event, accountId, folder) => listMessages(accountId, folder));
  ipcMain.handle('messages:search', (_event, criteria) => searchMessages(criteria));
  ipcMain.handle('messages:unread-count', () => countUnreadMessages());
  ipcMain.handle('messages:get', (_event, messageId) => getMessage(messageId));
  ipcMain.handle('messages:open-window', (_event, messageId) => openMessageWindow(messageId));
  ipcMain.handle('messages:read-state', async (_event, messageId, isRead) => {
    const reference = getMessageReference(messageId);
    if (reference.accountId === '__local__') {
      setMessageRead(messageId, Boolean(isRead));
      updateUnreadBadge();
      return { updated: true, localOnly: true };
    }
    const account = await getAccountWithPassword(reference.accountId);
    await setRemoteReadState(account, reference, Boolean(isRead));
    setMessageRead(messageId, Boolean(isRead));
    updateUnreadBadge();
    return { updated: true };
  });
  ipcMain.handle('messages:delete-local', (_event, messageId) => {
    const reference = getMessageReference(messageId);
    if (reference.accountId !== '__local__') throw new Error('Ce message n’est pas une copie locale.');
    const result = removeLocalMessage(messageId);
    updateUnreadBadge();
    return result;
  });
  ipcMain.handle('messages:move', async (_event, messageId, destination) => {
    const reference = getMessageReference(messageId);
    const account = await getAccountWithPassword(reference.accountId);
    await moveRemoteMessage(account, reference, destination);
    removeLocalMessage(messageId);
    return { moved: true };
  });
  ipcMain.handle('attachments:choose', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Choisir les pièces jointes',
      properties: ['openFile', 'multiSelections']
    });
    if (result.canceled) return [];
    return result.filePaths.map((filePath) => {
      const stats = fs.statSync(filePath);
      return { path: filePath, name: path.basename(filePath), size: stats.size };
    });
  });
  ipcMain.handle('composer:choose-inline-image', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Insérer une image', properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);
    if (stats.size > 5 * 1024 * 1024) throw new Error('L’image dépasse la limite de 5 Mo.');
    const extension = path.extname(filePath).slice(1).toLowerCase();
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[extension];
    if (!mime) throw new Error('Format d’image non pris en charge.');
    return { name: path.basename(filePath), dataUrl: `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}` };
  });
  ipcMain.handle('attachments:save', async (event, messageId, attachmentIndex) => {
    const attachment = getAttachment(messageId, attachmentIndex);
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(owner, {
      title: 'Enregistrer la pièce jointe',
      defaultPath: path.basename(attachment.filename)
    });
    if (result.canceled || !result.filePath) return { saved: false };
    fs.writeFileSync(result.filePath, attachment.content);
    return { saved: true, path: result.filePath };
  });
  ipcMain.handle('attachments:open', async (_event, messageId, attachmentIndex) => {
    const attachment = getAttachment(messageId, attachmentIndex);
    const safeName = String(path.basename(attachment.filename || 'piece-jointe'))
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/[. ]+$/g, '') || 'piece-jointe';
    const messageKey = crypto.createHash('sha256').update(String(messageId)).digest('hex').slice(0, 16);
    const attachmentDirectory = path.join(app.getPath('temp'), 'GestionMail', 'pieces-jointes', messageKey);
    const filePath = path.join(attachmentDirectory, `${Number(attachmentIndex)}-${safeName}`);
    fs.mkdirSync(attachmentDirectory, { recursive: true });
    fs.writeFileSync(filePath, attachment.content);
    const error = await shell.openPath(filePath);
    if (error) throw new Error(`Windows ne peut pas ouvrir ce fichier : ${error}`);
    return { opened: true, path: filePath };
  });
  ipcMain.handle('notifications:show', (_event, title, body) => {
    if (!Notification.isSupported()) return { shown: false };
    const notification = new Notification({
      title: String(title || 'Monmail').slice(0, 120),
      body: String(body || '').slice(0, 300),
      silent: false
    });
    notification.on('click', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });
    notification.show();
    return { shown: true };
  });
  ipcMain.handle('editor:command', (event, command) => {
    const allowed = new Set(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']);
    if (!allowed.has(command) || typeof event.sender[command] !== 'function') throw new Error('Commande d’édition inconnue.');
    event.sender[command]();
    return { executed: true };
  });
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('backup:create', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, { title: 'Choisir où créer la sauvegarde Monmail', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { created: false };
    checkpointDatabase();
    return createBackup(result.filePaths[0]);
  });
  ipcMain.handle('backup:restore', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, { title: 'Choisir une sauvegarde Monmail', properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { scheduled: false };
    const scheduled = scheduleRestore(result.filePaths[0]);
    setTimeout(() => { isQuitting = true; app.relaunch(); app.quit(); }, 300);
    return scheduled;
  });
  ipcMain.handle('accounts:choose-local-directory', async (event, currentPath) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Choisir le dossier local de ce compte',
      defaultPath: String(currentPath || app.getPath('documents')),
      properties: ['openDirectory', 'createDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('settings:choose-directory', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Choisir le dossier de stockage Monmail',
      defaultPath: getSettings().dataDirectory,
      properties: ['openDirectory', 'createDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('settings:save', (_event, values) => {
    const current = getSettings();
    let migration = { changed: false, backupPath: null };
    if (values.dataDirectory && path.resolve(values.dataDirectory) !== path.resolve(current.dataDirectory)) {
      migration = changeDataDirectory(values.dataDirectory);
    }
    const settings = saveSettings({
      autoSyncMinutes: values.autoSyncMinutes,
      notificationsEnabled: values.notificationsEnabled,
      fontSize: values.fontSize,
      interfaceColor: values.interfaceColor,
      minimizeToTray: values.minimizeToTray,
      groupConversations: values.groupConversations,
      autoUpdateEnabled: values.autoUpdateEnabled,
      dataDirectory: migration.dataDirectory || current.dataDirectory
    });
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('settings:changed', settings);
    }
    return { settings, migration };
  });
  ipcMain.handle('messages:sync', async (_event, accountId, folder) => {
    const account = await getAccountWithPassword(accountId);
    const result = await syncAccount(account, folder);
    const rules = listMailRules().filter((rule) => rule.enabled && rule.accountId === account.id);
    let sorted = 0;
    for (const message of listRuleCandidateMessages(account.id, folder)) {
      for (const rule of rules) {
        if (isMailRuleApplied(rule.id, message.id)) continue;
        const actual = String(message[rule.matchField] || '').toLocaleLowerCase('fr');
        const expected = rule.matchValue.toLocaleLowerCase('fr');
        const matches = rule.matchType === 'equals' ? actual === expected
          : rule.matchType === 'startsWith' ? actual.startsWith(expected)
            : rule.matchType === 'endsWith' ? actual.endsWith(expected)
              : actual.includes(expected);
        if (!matches) continue;
        if (rule.targetType === 'local') {
          copyMessageToLocal(message.id, Number(rule.targetValue));
        } else {
          if (account.protocol !== 'imap') continue;
          await moveRemoteMessage(account, message, rule.targetValue);
          removeLocalMessage(message.id);
        }
        markMailRuleApplied(rule.id, message.id);
        sorted += 1;
        break;
      }
    }
    updateUnreadBadge();
    return { ...result, sorted, messages: listMessages(accountId, folder) };
  });
  ipcMain.handle('messages:send', async (_event, accountId, message) => {
    const account = await getAccountWithPassword(accountId);
    const result = await sendMessage(account, message);
    const localCopy = storeSentMessage(account, message);
    return { ...result, localCopy };
  });
  createWindow();
  await createTray();
  if (!isSmokeTest && getSettings().autoUpdateEnabled) {
    setTimeout(() => checkForUpdates(true).catch((error) => broadcastUpdate({ state: 'error', message: error.message })), 5000);
  }

  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

