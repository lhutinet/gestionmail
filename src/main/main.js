const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { app, BrowserWindow, dialog, ipcMain, Notification } = require('electron');
const { deleteAccount, getAccountWithPassword, listAccounts, saveAccount, validateAccount } = require('./account-store');
const {
  copyMessageToLocal, createLocalFolder, deleteAccountMessages, deleteLocalFolder,
  getAttachment, getMessage, getMessageReference, listLocalFolders,
  listMessages, removeLocalMessage, setMessageRead, storeMessage
} = require('./message-store');
const {
  listFolders, moveRemoteMessage, sendMessage, setRemoteReadState,
  syncAccount, testConfiguration
} = require('./mail-service');
const isSmokeTest = process.argv.includes('--smoke-test');
let mainWindow = null;

if (isSmokeTest) {
  app.setPath('userData', path.join(os.tmpdir(), `gestionmail-smoke-${process.pid}`));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
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

app.whenReady().then(async () => {
  if (isSmokeTest) {
    try {
      storeMessage({
        accountId: '__smoke__', remoteId: 'test', folder: 'INBOX',
        subject: 'Test', text: 'Test',
        html: '<p>Contenu sûr</p><script>alert(1)</script><img src="https://example.test/pixel.png">',
        attachments: [{ filename: 'test.txt', content: Buffer.from('ok') }]
      });
      const smokeMessage = getMessage('__smoke__:test');
      const smokeAttachment = getAttachment('__smoke__:test', 0);
      if (
        smokeMessage.attachments.length !== 1 ||
        smokeAttachment.content.toString() !== 'ok' ||
        !smokeMessage.htmlBody.includes('Contenu sûr') ||
        /<script|<img/i.test(smokeMessage.htmlBody)
      ) {
        throw new Error('Échec du contrôle du contenu des messages.');
      }
      setMessageRead('__smoke__:test', true);
      if (!getMessageReference('__smoke__:test').isRead) {
        throw new Error('Échec du contrôle de l’état lu/non lu.');
      }
      const localFolder = createLocalFolder('Archives test');
      const localCopy = copyMessageToLocal('__smoke__:test', localFolder.id);
      if (
        listMessages('__local__', `local:${localFolder.id}`).length !== 1 ||
        getMessage(localCopy.id).attachments.length !== 1
      ) {
        throw new Error('Échec du contrôle de copie dans un dossier local.');
      }
      removeLocalMessage('__smoke__:test');
      if (listMessages('__smoke__', 'INBOX').length) {
        throw new Error('Échec du contrôle de suppression locale du message.');
      }
      deleteLocalFolder(localFolder.id);
      if (listLocalFolders().some((folder) => folder.id === localFolder.id)) {
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
  ipcMain.handle('folders:list', async (_event, accountId) => {
    const account = await getAccountWithPassword(accountId);
    return listFolders(account);
  });
  ipcMain.handle('local-folders:list', () => listLocalFolders());
  ipcMain.handle('local-folders:create', (_event, name) => createLocalFolder(name));
  ipcMain.handle('local-folders:delete', (_event, localFolderId) => deleteLocalFolder(localFolderId));
  ipcMain.handle('local-folders:copy-message', (_event, messageId, localFolderId) => {
    return copyMessageToLocal(messageId, localFolderId);
  });
  ipcMain.handle('messages:list', (_event, accountId, folder) => listMessages(accountId, folder));
  ipcMain.handle('messages:get', (_event, messageId) => getMessage(messageId));
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

