const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gestionMail', {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  saveAccount: (account) => ipcRenderer.invoke('accounts:save', account),
  testAccount: (account) => ipcRenderer.invoke('accounts:test', account),
  deleteAccount: (accountId) => ipcRenderer.invoke('accounts:delete', accountId),
  listFolders: (accountId) => ipcRenderer.invoke('folders:list', accountId),
  listLocalFolders: () => ipcRenderer.invoke('local-folders:list'),
  createLocalFolder: (name) => ipcRenderer.invoke('local-folders:create', name),
  deleteLocalFolder: (localFolderId) => ipcRenderer.invoke('local-folders:delete', localFolderId),
  copyMessageToLocal: (messageId, localFolderId) => ipcRenderer.invoke('local-folders:copy-message', messageId, localFolderId),
  listMessages: (accountId, folder) => ipcRenderer.invoke('messages:list', accountId, folder),
  getMessage: (messageId) => ipcRenderer.invoke('messages:get', messageId),
  setMessageRead: (messageId, isRead) => ipcRenderer.invoke('messages:read-state', messageId, isRead),
  moveMessage: (messageId, destination) => ipcRenderer.invoke('messages:move', messageId, destination),
  deleteLocalMessage: (messageId) => ipcRenderer.invoke('messages:delete-local', messageId),
  chooseAttachments: () => ipcRenderer.invoke('attachments:choose'),
  saveAttachment: (messageId, attachmentIndex) => ipcRenderer.invoke('attachments:save', messageId, attachmentIndex),
  showNotification: (title, body) => ipcRenderer.invoke('notifications:show', title, body),
  syncMessages: (accountId, folder) => ipcRenderer.invoke('messages:sync', accountId, folder),
  sendMessage: (accountId, message) => ipcRenderer.invoke('messages:send', accountId, message)
});

