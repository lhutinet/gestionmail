const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { app, BrowserWindow, dialog, ipcMain, Notification, shell } = require('electron');
const { simpleParser } = require('mailparser');
const { deleteAccount, getAccountWithPassword, listAccounts, saveAccount, validateAccount } = require('./account-store');
const {
  changeDataDirectory, copyMessageToLocal, copyStoredFolderToLocal, copyStoredFolderTreeToLocal, createLocalFolder, deleteAccountMessages, deleteContact, deleteContactGroup, deleteLocalFolder,
  getAttachment, getLocalFolderPath, getMessage, getMessageReference, listContactGroups, listContacts, listLocalFolders,
  listMessages, listUnindexedEmlFiles, moveLocalFolder, registerLocalEmlFile, removeLocalMessage, saveContact, saveContactGroup, setMessageRead, storeMessage
} = require('./message-store');
const { getSettings, saveSettings } = require('./settings-store');
const {
  listFolders, moveRemoteMessage, sendMessage, setRemoteReadState,
  syncAccount, testConfiguration
} = require('./mail-service');
const isSmokeTest = process.argv.includes('--smoke-test');
let mainWindow = null;
const messageWindows = new Map();

if (isSmokeTest) {
  app.setPath('userData', path.join(os.tmpdir(), `gestionmail-smoke-${process.pid}`));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1080,
    minHeight: 600,
    show: !isSmokeTest,
    backgroundColor: '#f3f5f8',
    title: 'GestionMail',
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
  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  if (isSmokeTest) {
    window.webContents.once('did-finish-load', () => app.quit());
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
  for (const file of listUnindexedEmlFiles()) {
    try {
      const raw = fs.readFileSync(file.path);
      const parsed = await simpleParser(raw);
      registerLocalEmlFile(file.localFolderId, file.filename, parsed, raw);
    } catch (error) {
      console.warn(`Fichier EML ignoré (${file.path}) : ${error.message}`);
    }
  }
}

app.whenReady().then(async () => {
  if (isSmokeTest) {
    try {
      storeMessage({
        accountId: '__smoke__', remoteId: 'test', folder: 'INBOX',
        subject: 'Test', text: 'Test',
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
        name: 'Contact test', email: 'contact@example.test', phone: '0102030405', company: 'GestionMail'
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
      deleteContactGroup(smokeGroup.id);
      deleteContact(smokeContact.id);
      deleteContact(secondContact.id);
      if (listContacts().length) throw new Error('Échec du contrôle de suppression du contact.');
      const localFolder = createLocalFolder('Archives test');
      const localCopy = copyMessageToLocal('__smoke__:test', localFolder.id);
      if (
        listMessages('__local__', `local:${localFolder.id}`).length !== 1 ||
        getMessage(localCopy.id).attachments.length !== 2 ||
        !fs.existsSync(localCopy.path) ||
        path.extname(localCopy.path).toLocaleLowerCase('en') !== '.eml'
      ) {
        throw new Error('Échec du contrôle de copie dans un dossier local.');
      }
      const copiedFolder = copyStoredFolderToLocal('__smoke__', 'INBOX', 'Dossier complet test');
      if (
        copiedFolder.messageCount !== 1 ||
        listMessages('__local__', `local:${copiedFolder.id}`).length !== 1 ||
        fs.readdirSync(copiedFolder.path).filter((name) => path.extname(name).toLocaleLowerCase('en') === '.eml').length !== 1
      ) {
        throw new Error('Échec du contrôle de copie complète d’un dossier.');
      }
      storeMessage({
        accountId: '__smoke__', remoteId: 'child-test', folder: 'INBOX/Sous-dossier',
        subject: 'Message enfant', text: 'Conserver dans le sous-dossier'
      });
      const copiedTree = copyStoredFolderTreeToLocal('__smoke__', [
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
      removeLocalMessage('__smoke__:child-test');
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
      storeMessage({
        accountId: '__migration__', remoteId: 'test', folder: 'INBOX',
        subject: 'Migration', text: 'Conserver ce message'
      });
      const migrationFolder = createLocalFolder('Migration locale');
      copyMessageToLocal('__migration__:test', migrationFolder.id);
      const migration = changeDataDirectory(path.join(app.getPath('userData'), 'stockage-test'));
      saveSettings({ autoSyncMinutes: 5, notificationsEnabled: false });
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
        !fs.existsSync(path.join(getSettings().dataDirectory, 'Dossiers locaux', migrationFolder.diskName)) ||
        listMessages('__local__', `local:${migrationFolder.id}`).length !== 2 ||
        getSettings().autoSyncMinutes !== 5 ||
        getSettings().notificationsEnabled !== false
      ) {
        throw new Error('Échec du contrôle de migration des paramètres et du stockage.');
      }
      fs.rmSync(externalEmlPath, { force: true });
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
    const testedAccount = account.id && !String(account.password || '').length
      ? { ...account, password: (await getAccountWithPassword(account.id)).password }
      : account;
    validateAccount(testedAccount);
    return testConfiguration(testedAccount);
  });
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
  ipcMain.handle('contact-groups:save', (_event, name, contactIds) => saveContactGroup(name, contactIds));
  ipcMain.handle('contact-groups:delete', (_event, groupId) => deleteContactGroup(groupId));
  ipcMain.handle('folders:list', async (_event, accountId) => {
    const account = await getAccountWithPassword(accountId);
    return listFolders(account);
  });
  ipcMain.handle('local-folders:list', async () => {
    await refreshLocalEmlFiles();
    return listLocalFolders();
  });
  ipcMain.handle('local-folders:create', (_event, name, parentId) => createLocalFolder(name, parentId));
  ipcMain.handle('local-folders:delete', (_event, localFolderId) => deleteLocalFolder(localFolderId));
  ipcMain.handle('local-folders:move', (_event, localFolderId, targetParentId) => moveLocalFolder(localFolderId, targetParentId));
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
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const reportProgress = (progress, taskbarValue = null) => {
      if (!event.sender.isDestroyed()) event.sender.send('local-folders:copy-progress', progress);
      if (ownerWindow && !ownerWindow.isDestroyed() && taskbarValue !== null) ownerWindow.setProgressBar(taskbarValue);
    };
    reportProgress({ label: String(folderName || folderPath), detail: 'Lecture de l’arborescence du serveur…' }, 2);
    try {
      const account = await getAccountWithPassword(accountId);
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
        reportProgress({
          label: String(folderName || sourceFolder?.name || sourcePath),
          detail: `Téléchargement de « ${remoteFolder.name || remoteFolder.path} » — ${serverTotal} message${serverTotal > 1 ? 's' : ''}`,
          current: index,
          total: foldersToSync.length
        }, foldersToSync.length ? index / foldersToSync.length : 0);
        const syncResult = await syncAccount(account, remoteFolder.path, true);
        serverTotal += Number(syncResult.total || 0);
      }
      reportProgress({
        label: String(folderName || sourceFolder?.name || sourcePath),
        detail: `Création de ${descriptorByPath.size} dossier${descriptorByPath.size > 1 ? 's' : ''} dans le stockage local…`,
        current: foldersToSync.length,
        total: foldersToSync.length || 1
      }, 1);
      const result = copyStoredFolderTreeToLocal(account.id, [...descriptorByPath.values()]);
      reportProgress({
        label: String(folderName || sourceFolder?.name || sourcePath),
        detail: `Copie terminée — ${result.totalMessages} message${result.totalMessages > 1 ? 's' : ''}`,
        current: 1,
        total: 1
      }, 1);
      return { ...result, serverTotal };
    } finally {
      if (ownerWindow && !ownerWindow.isDestroyed()) ownerWindow.setProgressBar(-1);
    }
  });
  ipcMain.handle('messages:list', (_event, accountId, folder) => listMessages(accountId, folder));
  ipcMain.handle('messages:get', (_event, messageId) => getMessage(messageId));
  ipcMain.handle('messages:open-window', (_event, messageId) => openMessageWindow(messageId));
  ipcMain.handle('messages:read-state', async (_event, messageId, isRead) => {
    const reference = getMessageReference(messageId);
    if (reference.accountId === '__local__') {
      setMessageRead(messageId, Boolean(isRead));
      return { updated: true, localOnly: true };
    }
    const account = await getAccountWithPassword(reference.accountId);
    await setRemoteReadState(account, reference, Boolean(isRead));
    setMessageRead(messageId, Boolean(isRead));
    return { updated: true };
  });
  ipcMain.handle('messages:delete-local', (_event, messageId) => {
    const reference = getMessageReference(messageId);
    if (reference.accountId !== '__local__') throw new Error('Ce message n’est pas une copie locale.');
    return removeLocalMessage(messageId);
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
  ipcMain.handle('notifications:show', (_event, title, body) => {
    if (!Notification.isSupported()) return { shown: false };
    const notification = new Notification({
      title: String(title || 'GestionMail').slice(0, 120),
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
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:choose-directory', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'Choisir le dossier de stockage GestionMail',
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
      dataDirectory: migration.dataDirectory || current.dataDirectory
    });
    return { settings, migration };
  });
  ipcMain.handle('messages:sync', async (_event, accountId, folder) => {
    const account = await getAccountWithPassword(accountId);
    const result = await syncAccount(account, folder);
    return { ...result, messages: listMessages(accountId, folder) };
  });
  ipcMain.handle('messages:send', async (_event, accountId, message) => {
    const account = await getAccountWithPassword(accountId);
    return sendMessage(account, message);
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

