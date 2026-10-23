const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gestionMail', {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  saveAccount: (account) => ipcRenderer.invoke('accounts:save', account),
  testAccount: (account) => ipcRenderer.invoke('accounts:test', account),
  deleteAccount: (accountId) => ipcRenderer.invoke('accounts:delete', accountId),
  listContacts: () => ipcRenderer.invoke('contacts:list'),
  saveContact: (contact) => ipcRenderer.invoke('contacts:save', contact),
  deleteContact: (contactId) => ipcRenderer.invoke('contacts:delete', contactId),
  listContactGroups: () => ipcRenderer.invoke('contact-groups:list'),
  saveContactGroup: (name, contactIds) => ipcRenderer.invoke('contact-groups:save', name, contactIds),
  deleteContactGroup: (groupId) => ipcRenderer.invoke('contact-groups:delete', groupId),
  listFolders: (accountId) => ipcRenderer.invoke('folders:list', accountId),
  listLocalFolders: () => ipcRenderer.invoke('local-folders:list'),
  createLocalFolder: (name, parentId = null) => ipcRenderer.invoke('local-folders:create', name, parentId),
  deleteLocalFolder: (localFolderId) => ipcRenderer.invoke('local-folders:delete', localFolderId),
  moveLocalFolder: (localFolderId, targetParentId = null) => ipcRenderer.invoke('local-folders:move', localFolderId, targetParentId),
  openLocalFolder: (localFolderId) => ipcRenderer.invoke('local-folders:open', localFolderId),
  copyMessageToLocal: (messageId, localFolderId) => ipcRenderer.invoke('local-folders:copy-message', messageId, localFolderId),
  copyRemoteFolderToLocal: (accountId, folderPath, folderName) => ipcRenderer.invoke('local-folders:copy-remote-folder', accountId, folderPath, folderName),
  onFolderCopyProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('local-folders:copy-progress', listener);
    return () => ipcRenderer.removeListener('local-folders:copy-progress', listener);
  },
  listMessages: (accountId, folder) => ipcRenderer.invoke('messages:list', accountId, folder),
  getMessage: (messageId) => ipcRenderer.invoke('messages:get', messageId),
  openMessageWindow: (messageId) => ipcRenderer.invoke('messages:open-window', messageId),
  setMessageRead: (messageId, isRead) => ipcRenderer.invoke('messages:read-state', messageId, isRead),
  moveMessage: (messageId, destination) => ipcRenderer.invoke('messages:move', messageId, destination),
  deleteLocalMessage: (messageId) => ipcRenderer.invoke('messages:delete-local', messageId),
  chooseAttachments: () => ipcRenderer.invoke('attachments:choose'),
  saveAttachment: (messageId, attachmentIndex) => ipcRenderer.invoke('attachments:save', messageId, attachmentIndex),
  showNotification: (title, body) => ipcRenderer.invoke('notifications:show', title, body),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  chooseDataDirectory: () => ipcRenderer.invoke('settings:choose-directory'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  syncMessages: (accountId, folder) => ipcRenderer.invoke('messages:sync', accountId, folder),
  sendMessage: (accountId, message) => ipcRenderer.invoke('messages:send', accountId, message)
});

