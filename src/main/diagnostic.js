const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');
app.setPath('userData', path.join(app.getPath('appData'), 'GestionMail'));
const { getAccountWithPassword, listAccounts } = require('./account-store');
const { createBackup } = require('./backup-store');
const { listFolders, syncAccount, testConfiguration } = require('./mail-service');
const { checkpointDatabase, getMessageReference, listLocalFolders, listMessages, searchMessages } = require('./message-store');

async function run() {
  const report = { accounts: [], local: {}, backup: {} };
  for (const publicAccount of listAccounts()) {
    const accountReport = { name: publicAccount.name, email: publicAccount.email, protocol: publicAccount.protocol };
    try {
      const account = await getAccountWithPassword(publicAccount.id);
      const connection = await testConfiguration(account);
      accountReport.connection = connection.incoming && connection.outgoing ? 'ok' : 'incomplète';
      const folders = await listFolders(account);
      accountReport.folders = folders.length;
      const inbox = folders.find((folder) => String(folder.path).toUpperCase() === 'INBOX')?.path || 'INBOX';
      const sync = await syncAccount(account, inbox);
      const storedMessages = listMessages(account.id, inbox, 500);
      accountReport.inbox = {
        serverTotal: sync.total,
        downloadedOrUpdated: sync.imported,
        stored: storedMessages.length,
        technicalIds: storedMessages.map((message) => getMessageReference(message.id).remoteId)
      };
    } catch (error) {
      accountReport.error = error.message;
    }
    report.accounts.push(accountReport);
  }
  const localFolders = listLocalFolders();
  report.local = {
    folders: localFolders.length,
    indexedMessages: localFolders.reduce((total, folder) => total + Number(folder.messageCount || 0), 0),
    advancedSearchOperational: Array.isArray(searchMessages({ readState: 'unread' }))
  };
  checkpointDatabase();
  const backupParent = fs.mkdtempSync(path.join(os.tmpdir(), 'gestionmail-diagnostic-'));
  try {
    const backup = createBackup(backupParent);
    report.backup = {
      created: fs.existsSync(path.join(backup.path, 'manifest.json')) && fs.existsSync(path.join(backup.path, 'donnees', 'messages.sqlite')),
      size: fs.statSync(path.join(backup.path, 'donnees', 'messages.sqlite')).size
    };
  } finally {
    fs.rmSync(backupParent, { recursive: true, force: true });
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

app.whenReady().then(run).then(() => app.quit()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
  app.quit();
});
