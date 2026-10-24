const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gestionMail', {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  saveAccount: (account) => ipcRenderer.invoke('accounts:save', account),
  testAccount: (account) => ipcRenderer.invoke('accounts:test', account),
  authorizeOAuth: (values) => ipcRenderer.invoke('oauth2:authorize', values),
  deleteAccount: (accountId) => ipcRenderer.invoke('accounts:delete', accountId),
  listContacts: () => ipcRenderer.invoke('contacts:list'),
  saveContact: (contact) => ipcRenderer.invoke('contacts:save', contact),
  deleteContact: (contactId) => ipcRenderer.invoke('contacts:delete', contactId),
  importContacts: () => ipcRenderer.invoke('contacts:import'),
  exportContacts: (format) => ipcRenderer.invoke('contacts:export', format),
  mergeDuplicateContacts: () => ipcRenderer.invoke('contacts:merge-duplicates'),
  listContactGroups: () => ipcRenderer.invoke('contact-groups:list'),
  saveContactGroup: (name, contactIds, groupId = null) => ipcRenderer.invoke('contact-groups:save', name, contactIds, groupId),
  deleteContactGroup: (groupId) => ipcRenderer.invoke('contact-groups:delete', groupId),
  listTodos: () => ipcRenderer.invoke('todos:list'),
  saveTodo: (todo) => ipcRenderer.invoke('todos:save', todo),
  deleteTodo: (todoId) => ipcRenderer.invoke('todos:delete', todoId),
  listMailRules: () => ipcRenderer.invoke('mail-rules:list'),
  saveMailRule: (rule) => ipcRenderer.invoke('mail-rules:save', rule),
  deleteMailRule: (ruleId) => ipcRenderer.invoke('mail-rules:delete', ruleId),
  listDrafts: () => ipcRenderer.invoke('drafts:list'),
  getDraft: (draftId) => ipcRenderer.invoke('drafts:get', draftId),
  saveDraft: (draft) => ipcRenderer.invoke('drafts:save', draft),
  deleteDraft: (draftId) => ipcRenderer.invoke('drafts:delete', draftId),
  getComposerData: (accountId) => ipcRenderer.invoke('composer:get-data', accountId),
  saveSignature: (accountId, html) => ipcRenderer.invoke('composer:save-signature', accountId, html),
  saveTemplate: (template) => ipcRenderer.invoke('composer:save-template', template),
  deleteTemplate: (templateId) => ipcRenderer.invoke('composer:delete-template', templateId),
  chooseInlineImage: () => ipcRenderer.invoke('composer:choose-inline-image'),
  listFolders: (accountId) => ipcRenderer.invoke('folders:list', accountId),
  listLocalFolders: () => ipcRenderer.invoke('local-folders:list'),
  createLocalFolder: (name, parentId = null) => ipcRenderer.invoke('local-folders:create', name, parentId),
  deleteLocalFolder: (localFolderId) => ipcRenderer.invoke('local-folders:delete', localFolderId),
  deleteLocalFolderTree: (localFolderId) => ipcRenderer.invoke('local-folders:delete-tree', localFolderId),
  moveLocalFolder: (localFolderId, targetParentId = null) => ipcRenderer.invoke('local-folders:move', localFolderId, targetParentId),
  renameLocalFolder: (localFolderId, name) => ipcRenderer.invoke('local-folders:rename', localFolderId, name),
  duplicateLocalFolder: (localFolderId) => ipcRenderer.invoke('local-folders:duplicate', localFolderId),
  setLocalFolderColor: (localFolderId, color) => ipcRenderer.invoke('local-folders:set-color', localFolderId, color),
  openLocalFolder: (localFolderId) => ipcRenderer.invoke('local-folders:open', localFolderId),
  copyMessageToLocal: (messageId, localFolderId) => ipcRenderer.invoke('local-folders:copy-message', messageId, localFolderId),
  copyRemoteFolderToLocal: (accountId, folderPath, folderName) => ipcRenderer.invoke('local-folders:copy-remote-folder', accountId, folderPath, folderName),
  cancelFolderCopy: () => ipcRenderer.invoke('local-folders:cancel-copy'),
  onFolderCopyProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('local-folders:copy-progress', listener);
    return () => ipcRenderer.removeListener('local-folders:copy-progress', listener);
  },
  onLocalFoldersRefreshed: (callback) => {
    const listener = (_event, result) => callback(result);
    ipcRenderer.on('local-folders:refreshed', listener);
    return () => ipcRenderer.removeListener('local-folders:refreshed', listener);
  },
  listMessages: (accountId, folder) => ipcRenderer.invoke('messages:list', accountId, folder),
  searchMessages: (query) => ipcRenderer.invoke('messages:search', query),
  getUnreadCount: () => ipcRenderer.invoke('messages:unread-count'),
  getMessage: (messageId) => ipcRenderer.invoke('messages:get', messageId),
  openMessageWindow: (messageId) => ipcRenderer.invoke('messages:open-window', messageId),
  setMessageRead: (messageId, isRead) => ipcRenderer.invoke('messages:read-state', messageId, isRead),
  moveMessage: (messageId, destination) => ipcRenderer.invoke('messages:move', messageId, destination),
  deleteLocalMessage: (messageId) => ipcRenderer.invoke('messages:delete-local', messageId),
  chooseAttachments: () => ipcRenderer.invoke('attachments:choose'),
  saveAttachment: (messageId, attachmentIndex) => ipcRenderer.invoke('attachments:save', messageId, attachmentIndex),
  showNotification: (title, body) => ipcRenderer.invoke('notifications:show', title, body),
  editorCommand: (command) => ipcRenderer.invoke('editor:command', command),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  getStartupPerformance: () => ipcRenderer.invoke('performance:get-startup'),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('updates:status', listener);
    return () => ipcRenderer.removeListener('updates:status', listener);
  },
  onSettingsChanged: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  chooseDataDirectory: () => ipcRenderer.invoke('settings:choose-directory'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  syncMessages: (accountId, folder) => ipcRenderer.invoke('messages:sync', accountId, folder),
  sendMessage: (accountId, message) => ipcRenderer.invoke('messages:send', accountId, message)
});

