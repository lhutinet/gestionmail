const accountDialog = document.querySelector('#account-dialog');
const accountForm = document.querySelector('#account-form');
const accountError = document.querySelector('#form-error');
const accountList = document.querySelector('#account-list');
const folderList = document.querySelector('#folder-list');
const favoriteList = document.querySelector('#favorite-list');
const localFolderList = document.querySelector('#local-folder-list');
const saveAccountButton = document.querySelector('#save-account');
const deleteAccountButton = document.querySelector('#delete-account');
const statusLine = document.querySelector('#status-line');
const welcome = document.querySelector('#welcome');
const mailView = document.querySelector('#mail-view');
const messageList = document.querySelector('#message-list');
const messageContent = document.querySelector('#message-content');
const syncButton = document.querySelector('#sync-button');
const composeButton = document.querySelector('#new-message');
const composeDialog = document.querySelector('#compose-dialog');
const composeForm = document.querySelector('#compose-form');
const composeError = document.querySelector('#compose-error');
const sendButton = document.querySelector('#send-message');
const searchInput = document.querySelector('#message-search');
const autoSyncSelect = document.querySelector('#auto-sync');
const selectedAttachments = document.querySelector('#selected-attachments');
const copyLocalDialog = document.querySelector('#copy-local-dialog');
const copyLocalForm = document.querySelector('#copy-local-form');
const copyLocalTarget = document.querySelector('#copy-local-target');
const copyLocalError = document.querySelector('#copy-local-error');

let accounts = [];
let selectedAccountId = null;
let selectedFolder = 'INBOX';
let folders = [];
let localFolders = [];
let messages = [];
let composeAttachments = [];
let autoSyncTimer = null;
let syncInProgress = false;
let viewingLocal = false;
let messageToCopy = null;
const collapsedFolders = new Set();

function readableError(error) {
  const value = String(error?.message || error || 'Erreur inconnue');
  return value.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function accountPayload() {
  const data = new FormData(accountForm);
  const account = Object.fromEntries(data.entries());
  account.incomingSecure = data.has('incomingSecure');
  account.outgoingSecure = data.has('outgoingSecure');
  return account;
}

function openAccountDialog(account = null) {
  accountForm.reset();
  accountForm.elements.incomingPort.value = '993';
  accountForm.elements.outgoingPort.value = '465';
  accountForm.elements.password.required = !account;
  deleteAccountButton.hidden = !account;
  document.querySelector('#account-dialog-title').textContent = account ? 'Modifier le compte' : 'Ajouter un compte';
  document.querySelector('#password-help').textContent = account
    ? 'Laissez vide pour conserver le mot de passe actuel.'
    : 'Il sera chiffré avec la protection de votre session Windows.';
  if (account) {
    for (const field of ['id', 'name', 'email', 'protocol', 'incomingHost', 'incomingPort', 'outgoingHost', 'outgoingPort', 'username']) {
      accountForm.elements[field].value = account[field] ?? '';
    }
    accountForm.elements.incomingSecure.checked = Boolean(account.incomingSecure);
    accountForm.elements.outgoingSecure.checked = Boolean(account.outgoingSecure);
  }
  accountError.textContent = '';
  accountDialog.showModal();
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {})
  }).format(date);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function renderComposeAttachments() {
  selectedAttachments.replaceChildren();
  composeAttachments.forEach((attachment, index) => {
    const row = document.createElement('div');
    row.className = 'selected-file';
    const label = document.createElement('span');
    label.textContent = `${attachment.name} (${formatSize(attachment.size)})`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-file';
    remove.setAttribute('aria-label', `Retirer ${attachment.name}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      composeAttachments.splice(index, 1);
      renderComposeAttachments();
    });
    row.append(label, remove);
    selectedAttachments.append(row);
  });
}

function extractEmail(value) {
  const bracketed = String(value || '').match(/<([^<>]+@[^<>]+)>/);
  if (bracketed) return bracketed[1];
  const plain = String(value || '').match(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return plain ? plain[0] : String(value || '');
}

function prefixedSubject(prefix, subject) {
  const value = String(subject || '(Sans objet)');
  return new RegExp(`^${prefix}:`, 'i').test(value) ? value : `${prefix}: ${value}`;
}

function openComposer(prefill = {}) {
  const account = accounts.find((item) => item.id === selectedAccountId);
  document.querySelector('#compose-from').textContent = account ? `Depuis ${account.email}` : '';
  composeForm.elements.to.value = prefill.to || '';
  composeForm.elements.cc.value = prefill.cc || '';
  composeForm.elements.subject.value = prefill.subject || '';
  composeForm.elements.body.value = prefill.body || '';
  composeAttachments = [];
  renderComposeAttachments();
  composeError.textContent = '';
  composeDialog.showModal();
}

function renderAccounts() {
  accountList.replaceChildren();
  for (const account of accounts) {
    const row = document.createElement('div');
    row.className = 'account-row';
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `account${account.id === selectedAccountId ? ' active' : ''}`;
    const name = document.createElement('b');
    const email = document.createElement('small');
    name.textContent = account.name;
    email.textContent = account.email;
    item.append(name, email);
    item.addEventListener('click', () => selectAccount(account.id));
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-account';
    edit.title = `Modifier ${account.email}`;
    edit.setAttribute('aria-label', `Modifier ${account.email}`);
    edit.textContent = '⚙';
    edit.addEventListener('click', () => openAccountDialog(account));
    row.append(item, edit);
    accountList.append(row);
  }
}

function favoriteStorageKey() {
  return selectedAccountId ? `gestionmail.favorites.${selectedAccountId}` : '';
}

function favoritePaths() {
  try {
    const value = JSON.parse(localStorage.getItem(favoriteStorageKey()) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function toggleFavorite(path) {
  const favorites = new Set(favoritePaths());
  if (favorites.has(path)) favorites.delete(path);
  else favorites.add(path);
  localStorage.setItem(favoriteStorageKey(), JSON.stringify([...favorites]));
  renderFolders();
}

function renderFavorites() {
  favoriteList.replaceChildren();
  const favorites = new Set(favoritePaths());
  const selected = folders.filter((folder) => folder.selectable !== false && favorites.has(folder.path));
  if (!selected.length) {
    const empty = document.createElement('div');
    empty.className = 'sidebar-empty';
    empty.textContent = 'Aucun favori';
    favoriteList.append(empty);
    return;
  }
  for (const folder of selected) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `nav-item${!viewingLocal && folder.path === selectedFolder ? ' active' : ''}`;
    item.textContent = `★ ${folder.name || folder.path}`;
    item.title = folder.path;
    item.addEventListener('click', () => selectFolder(folder.path));
    favoriteList.append(item);
  }
}

function folderTree() {
  const delimiter = folders.find((folder) => folder.delimiter)?.delimiter || '/';
  const roots = [];
  const nodes = new Map();
  for (const folder of folders) {
    const parts = folder.path.split(delimiter).filter(Boolean);
    let parentChildren = roots;
    let currentPath = '';
    for (const [index, part] of parts.entries()) {
      currentPath = currentPath ? `${currentPath}${delimiter}${part}` : part;
      let node = nodes.get(currentPath);
      if (!node) {
        node = { path: currentPath, name: part, selectable: false, children: [] };
        nodes.set(currentPath, node);
        parentChildren.push(node);
      }
      if (index === parts.length - 1) Object.assign(node, folder, { children: node.children });
      parentChildren = node.children;
    }
  }
  return roots;
}

function appendFolderNodes(container, nodes, depth = 0) {
  const favorites = new Set(favoritePaths());
  for (const node of nodes) {
    const row = document.createElement('div');
    row.className = 'folder-row';
    row.style.paddingLeft = `${depth * 12}px`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree-toggle';
    toggle.textContent = node.children.length ? (collapsedFolders.has(node.path) ? '▶' : '▼') : '';
    toggle.disabled = !node.children.length;
    toggle.addEventListener('click', () => {
      if (collapsedFolders.has(node.path)) collapsedFolders.delete(node.path);
      else collapsedFolders.add(node.path);
      renderFolders();
    });
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `nav-item${!viewingLocal && node.path === selectedFolder ? ' active' : ''}`;
    item.textContent = node.name || node.path;
    item.title = node.path;
    item.disabled = node.selectable === false;
    if (node.selectable !== false) item.addEventListener('click', () => selectFolder(node.path));
    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = `favorite-toggle${favorites.has(node.path) ? ' active' : ''}`;
    favorite.textContent = node.selectable === false ? '' : '★';
    favorite.disabled = node.selectable === false;
    favorite.title = favorites.has(node.path) ? 'Retirer des favoris' : 'Ajouter aux favoris';
    if (node.selectable !== false) favorite.addEventListener('click', () => toggleFavorite(node.path));
    row.append(toggle, item, favorite);
    container.append(row);
    if (node.children.length) {
      const children = document.createElement('div');
      children.className = `folder-children${collapsedFolders.has(node.path) ? ' collapsed' : ''}`;
      appendFolderNodes(children, node.children, depth + 1);
      container.append(children);
    }
  }
}

function renderFolders() {
  folderList.replaceChildren();
  appendFolderNodes(folderList, folderTree());
  renderFavorites();
}

function renderLocalFolders() {
  localFolderList.replaceChildren();
  if (!localFolders.length) {
    const empty = document.createElement('div');
    empty.className = 'sidebar-empty';
    empty.textContent = 'Aucun dossier local';
    localFolderList.append(empty);
    return;
  }
  for (const folder of localFolders) {
    const row = document.createElement('div');
    row.className = 'local-folder-row';
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `nav-item${viewingLocal && selectedFolder === `local:${folder.id}` ? ' active' : ''}`;
    const name = document.createElement('span');
    name.textContent = `▣ ${folder.name}`;
    const count = document.createElement('span');
    count.className = 'local-count';
    count.textContent = String(folder.messageCount || 0);
    item.append(name, count);
    item.addEventListener('click', () => selectLocalFolder(folder));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'local-delete';
    remove.textContent = '×';
    remove.title = `Supprimer ${folder.name}`;
    remove.addEventListener('click', () => deleteLocalFolder(folder));
    row.append(item, remove);
    localFolderList.append(row);
  }
}

function renderMessages(filter = '') {
  const query = filter.trim().toLocaleLowerCase('fr');
  const visible = query
    ? messages.filter((message) => `${message.sender} ${message.subject} ${message.preview}`.toLocaleLowerCase('fr').includes(query))
    : messages;
  messageList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'list-empty';
    empty.textContent = query
      ? 'Aucun résultat.'
      : viewingLocal ? 'Ce dossier local est vide.' : 'Aucun message enregistré. Cliquez sur Actualiser.';
    messageList.append(empty);
    return;
  }

  for (const message of visible) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `message-row${message.isRead ? '' : ' unread'}`;
    row.dataset.id = message.id;

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.textContent = message.sender || '(Expéditeur inconnu)';
    const date = document.createElement('span');
    date.className = 'message-date';
    date.textContent = formatDate(message.receivedAt);
    meta.append(sender, date);

    const subject = document.createElement('div');
    subject.className = 'message-subject';
    subject.textContent = message.subject || '(Sans objet)';
    const preview = document.createElement('div');
    preview.className = 'message-preview';
    preview.textContent = message.preview || '';
    row.append(meta, subject, preview);
    row.addEventListener('click', () => openMessage(message.id, row));
    messageList.append(row);
  }
}

function resetMessageContent(text = 'Sélectionnez un message pour le lire.') {
  messageContent.replaceChildren();
  const placeholder = document.createElement('div');
  placeholder.className = 'message-placeholder';
  placeholder.textContent = text;
  messageContent.append(placeholder);
}

function specialFolder(...uses) {
  const expected = uses.map((value) => value.toLocaleLowerCase('en'));
  return folders.find((folder) => expected.includes(String(folder.specialUse || '').toLocaleLowerCase('en')));
}

async function moveDisplayedMessage(message, destination, label, needsConfirmation = false) {
  if (!destination) return;
  if (needsConfirmation && !window.confirm(`Placer « ${message.subject || '(Sans objet)'} » dans la corbeille ?`)) return;
  statusLine.textContent = `${label} en cours…`;
  try {
    await window.gestionMail.moveMessage(message.id, destination);
    messages = messages.filter((item) => item.id !== message.id);
    renderMessages(searchInput.value);
    resetMessageContent('Le message a été déplacé.');
    statusLine.textContent = `Message ${label.toLocaleLowerCase('fr')}.`;
  } catch (error) {
    statusLine.textContent = `Échec : ${readableError(error)}`;
  }
}

async function selectAccount(accountId) {
  selectedAccountId = accountId;
  selectedFolder = 'INBOX';
  viewingLocal = false;
  renderAccounts();
  welcome.hidden = true;
  mailView.hidden = false;
  syncButton.disabled = false;
  composeButton.disabled = false;
  searchInput.disabled = false;
  const account = accounts.find((item) => item.id === accountId);
  statusLine.textContent = `Lecture des dossiers de ${account?.email || ''}…`;
  let foldersLoaded = true;
  try {
    folders = await window.gestionMail.listFolders(accountId);
  } catch (error) {
    foldersLoaded = false;
    folders = [{ path: 'INBOX', name: 'Boîte de réception' }];
    statusLine.textContent = `Dossiers indisponibles : ${readableError(error)}`;
  }
  if (!folders.some((folder) => folder.path === selectedFolder && folder.selectable !== false) && folders.length) {
    selectedFolder = folders.find((folder) => folder.selectable !== false)?.path || 'INBOX';
  }
  renderFolders();
  await selectFolder(selectedFolder, foldersLoaded);
}

function configureAutoSync() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  autoSyncTimer = null;
  const minutes = Number(autoSyncSelect.value);
  localStorage.setItem('gestionmail.autoSyncMinutes', String(minutes));
  if (minutes > 0) {
    autoSyncTimer = setInterval(() => synchroniseCurrentFolder(true), minutes * 60 * 1000);
  }
}

async function synchroniseCurrentFolder(automatic = false) {
  if (!selectedAccountId || viewingLocal || syncInProgress) return;
  syncInProgress = true;
  const syncingAccountId = selectedAccountId;
  const syncingFolder = selectedFolder;
  syncButton.disabled = true;
  syncButton.textContent = 'Synchronisation…';
  if (!automatic) statusLine.textContent = 'Connexion au serveur entrant…';
  const previousIds = new Set(messages.map((message) => message.id));
  try {
    const result = await window.gestionMail.syncMessages(syncingAccountId, syncingFolder);
    if (selectedAccountId !== syncingAccountId || selectedFolder !== syncingFolder) return;
    messages = result.messages;
    renderMessages(searchInput.value);
    const newMessages = messages.filter((message) => !previousIds.has(message.id));
    if (automatic && newMessages.length) {
      const first = newMessages[0];
      const body = newMessages.length === 1
        ? `${first.sender || 'Expéditeur inconnu'} — ${first.subject || '(Sans objet)'}`
        : `${newMessages.length} nouveaux messages dans ${syncingFolder}`;
      await window.gestionMail.showNotification('Nouveau message', body);
    }
    statusLine.textContent = `${result.imported} message${result.imported > 1 ? 's' : ''} vérifié${result.imported > 1 ? 's' : ''} — ${result.total} sur le serveur${automatic ? ' — actualisation automatique' : ''}`;
  } catch (error) {
    statusLine.textContent = `Échec${automatic ? ' de l’actualisation automatique' : ''} : ${readableError(error)}`;
  } finally {
    syncInProgress = false;
    syncButton.disabled = !selectedAccountId || viewingLocal;
    syncButton.textContent = '↻ Actualiser';
  }
}

async function selectFolder(folderPath, updateStatus = true) {
  viewingLocal = false;
  selectedFolder = folderPath;
  renderFolders();
  renderLocalFolders();
  syncButton.disabled = false;
  messages = await window.gestionMail.listMessages(selectedAccountId, selectedFolder);
  renderMessages(searchInput.value);
  resetMessageContent();
  const folder = folders.find((item) => item.path === selectedFolder);
  document.querySelector('.toolbar h1').textContent = folder?.name || selectedFolder;
  if (updateStatus) {
    const account = accounts.find((item) => item.id === selectedAccountId);
    statusLine.textContent = `${account?.email || ''} — ${selectedFolder} — ${messages.length} message${messages.length > 1 ? 's' : ''} en local`;
  }
}

async function loadLocalFolders() {
  localFolders = await window.gestionMail.listLocalFolders();
  renderLocalFolders();
}

async function selectLocalFolder(folder) {
  viewingLocal = true;
  selectedFolder = `local:${folder.id}`;
  renderFolders();
  renderLocalFolders();
  welcome.hidden = true;
  mailView.hidden = false;
  syncButton.disabled = true;
  searchInput.disabled = false;
  messages = await window.gestionMail.listMessages('__local__', selectedFolder);
  renderMessages(searchInput.value);
  resetMessageContent();
  document.querySelector('.toolbar h1').textContent = folder.name;
  statusLine.textContent = `Dossier local — ${messages.length} message${messages.length > 1 ? 's' : ''}`;
}

async function createLocalFolder() {
  const name = window.prompt('Nom du nouveau dossier local :');
  if (name === null) return null;
  try {
    const folder = await window.gestionMail.createLocalFolder(name);
    await loadLocalFolders();
    return folder;
  } catch (error) {
    statusLine.textContent = `Échec : ${readableError(error)}`;
    return null;
  }
}

async function deleteLocalFolder(folder) {
  const confirmed = window.confirm(
    `Supprimer le dossier local « ${folder.name} » et toutes les copies qu’il contient ?\n\nLes messages présents sur les serveurs ne seront pas touchés.`
  );
  if (!confirmed) return;
  try {
    await window.gestionMail.deleteLocalFolder(folder.id);
    if (viewingLocal && selectedFolder === `local:${folder.id}`) {
      viewingLocal = false;
      messages = [];
      renderMessages();
      resetMessageContent();
      mailView.hidden = true;
      welcome.hidden = false;
    }
    await loadLocalFolders();
    statusLine.textContent = 'Dossier local supprimé. Les messages du serveur sont inchangés.';
  } catch (error) {
    statusLine.textContent = `Échec : ${readableError(error)}`;
  }
}

async function openCopyLocalDialog(message) {
  if (!localFolders.length) {
    const created = await createLocalFolder();
    if (!created) return;
  }
  messageToCopy = message;
  copyLocalTarget.replaceChildren();
  for (const folder of localFolders) {
    const option = document.createElement('option');
    option.value = String(folder.id);
    option.textContent = folder.name;
    copyLocalTarget.append(option);
  }
  copyLocalError.textContent = '';
  copyLocalDialog.showModal();
}

async function deleteDisplayedLocalMessage(message) {
  if (!window.confirm(`Supprimer définitivement la copie locale de « ${message.subject || '(Sans objet)'} » ?`)) return;
  try {
    await window.gestionMail.deleteLocalMessage(message.id);
    messages = messages.filter((item) => item.id !== message.id);
    renderMessages(searchInput.value);
    resetMessageContent('La copie locale a été supprimée.');
    await loadLocalFolders();
    statusLine.textContent = 'Copie locale supprimée. Le message du serveur est inchangé.';
  } catch (error) {
    statusLine.textContent = `Échec : ${readableError(error)}`;
  }
}

async function openMessage(messageId, row) {
  try {
    const message = await window.gestionMail.getMessage(messageId);
    document.querySelectorAll('.message-row').forEach((item) => item.classList.remove('active'));
    row.classList.add('active');
    row.classList.remove('unread');
    messageContent.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = message.subject || '(Sans objet)';
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    const reply = document.createElement('button');
    reply.type = 'button';
    reply.className = 'secondary';
    reply.textContent = '↩ Répondre';
    reply.disabled = !selectedAccountId;
    reply.addEventListener('click', () => openComposer({
      to: extractEmail(message.sender),
      subject: prefixedSubject('Re', message.subject),
      body: `\n\n--- Message d’origine ---\nDe : ${message.sender || ''}\nDate : ${message.receivedAt ? new Date(message.receivedAt).toLocaleString('fr-FR') : ''}\nObjet : ${message.subject || ''}\n\n${message.textBody || ''}`
    }));
    const forward = document.createElement('button');
    forward.type = 'button';
    forward.className = 'secondary';
    forward.textContent = '→ Transférer';
    forward.disabled = !selectedAccountId;
    forward.addEventListener('click', () => openComposer({
      subject: prefixedSubject('Tr', message.subject),
      body: `\n\n--- Message transféré ---\nDe : ${message.sender || ''}\nÀ : ${message.recipients || ''}\nDate : ${message.receivedAt ? new Date(message.receivedAt).toLocaleString('fr-FR') : ''}\nObjet : ${message.subject || ''}\n\n${message.textBody || ''}`
    }));
    const markUnread = document.createElement('button');
    markUnread.type = 'button';
    markUnread.className = 'secondary';
    markUnread.textContent = '● Marquer non lu';
    markUnread.addEventListener('click', async () => {
      try {
        await window.gestionMail.setMessageRead(message.id, false);
        const localMessage = messages.find((item) => item.id === message.id);
        if (localMessage) localMessage.isRead = 0;
        renderMessages(searchInput.value);
        statusLine.textContent = 'Message marqué comme non lu.';
      } catch (error) {
        statusLine.textContent = `Échec : ${readableError(error)}`;
      }
    });
    actions.append(reply, forward, markUnread);

    const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
    if (viewingLocal) {
      const removeLocal = document.createElement('button');
      removeLocal.type = 'button';
      removeLocal.className = 'secondary danger-action';
      removeLocal.textContent = '⌫ Supprimer la copie locale';
      removeLocal.addEventListener('click', () => deleteDisplayedLocalMessage(message));
      actions.append(removeLocal);
    } else {
      const copyLocal = document.createElement('button');
      copyLocal.type = 'button';
      copyLocal.className = 'secondary';
      copyLocal.textContent = '↓ Conserver en local';
      copyLocal.addEventListener('click', () => openCopyLocalDialog(message));
      actions.append(copyLocal);
    }
    if (!viewingLocal && selectedAccount?.protocol === 'imap') {
      const archiveFolder = specialFolder('\\Archive', '\\All');
      const trashFolder = specialFolder('\\Trash');
      const archive = document.createElement('button');
      archive.type = 'button';
      archive.className = 'secondary';
      archive.textContent = '▣ Archiver';
      archive.disabled = !archiveFolder || archiveFolder.path === selectedFolder;
      archive.title = archiveFolder ? `Déplacer vers ${archiveFolder.name}` : 'Aucun dossier d’archives détecté';
      archive.addEventListener('click', () => moveDisplayedMessage(message, archiveFolder?.path, 'Archivé'));
      const trash = document.createElement('button');
      trash.type = 'button';
      trash.className = 'secondary danger-action';
      trash.textContent = '⌫ Corbeille';
      trash.disabled = !trashFolder || trashFolder.path === selectedFolder;
      trash.title = trashFolder ? `Déplacer vers ${trashFolder.name}` : 'Aucun dossier de corbeille détecté';
      trash.addEventListener('click', () => moveDisplayedMessage(message, trashFolder?.path, 'Déplacé dans la corbeille', true));
      actions.append(archive, trash);
    }
    const headers = document.createElement('div');
    headers.className = 'message-headers';
    const sender = document.createElement('div');
    sender.textContent = `De : ${message.sender || ''}`;
    const recipients = document.createElement('div');
    recipients.textContent = `À : ${message.recipients || ''}`;
    const date = document.createElement('div');
    date.textContent = message.receivedAt ? new Date(message.receivedAt).toLocaleString('fr-FR') : '';
    headers.append(sender, recipients, date);
    const body = document.createElement('div');
    body.className = 'message-body';
    if (message.htmlBody) {
      body.classList.add('message-html');
      body.innerHTML = message.htmlBody;
    } else {
      body.textContent = message.textBody || 'Ce message ne contient pas de contenu affichable.';
    }
    messageContent.append(title, actions, headers, body);
    if (message.attachments?.length) {
      const attachments = document.createElement('div');
      attachments.className = 'received-attachments';
      for (const attachment of message.attachments) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'attachment-button';
        button.textContent = `📎 ${attachment.filename} (${formatSize(attachment.size)})`;
        button.addEventListener('click', async () => {
          try {
            const result = await window.gestionMail.saveAttachment(message.id, attachment.attachmentIndex);
            if (result.saved) statusLine.textContent = `Pièce jointe enregistrée : ${result.path}`;
          } catch (error) {
            statusLine.textContent = `Échec : ${readableError(error)}`;
          }
        });
        attachments.append(button);
      }
      messageContent.append(attachments);
    }
    if (!message.isRead) {
      window.gestionMail.setMessageRead(message.id, true).then(() => {
        const localMessage = messages.find((item) => item.id === message.id);
        if (localMessage) localMessage.isRead = 1;
        row.classList.remove('unread');
      }).catch((error) => {
        statusLine.textContent = `Message lu localement — serveur non mis à jour : ${readableError(error)}`;
      });
    }
  } catch (error) {
    statusLine.textContent = readableError(error);
  }
}

async function loadAccounts(selectNewest = false) {
  accounts = await window.gestionMail.listAccounts();
  if (selectNewest && accounts.length) selectedAccountId = accounts.at(-1).id;
  renderAccounts();
  if (selectedAccountId) await selectAccount(selectedAccountId);
  else statusLine.textContent = 'Aucun compte configuré';
}

document.querySelector('#add-account').addEventListener('click', () => openAccountDialog());
document.querySelector('#empty-add-account').addEventListener('click', () => openAccountDialog());
document.querySelector('#add-local-folder').addEventListener('click', createLocalFolder);
document.querySelector('#close-dialog').addEventListener('click', () => accountDialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => accountDialog.close());
accountForm.elements.protocol.addEventListener('change', () => {
  accountForm.elements.incomingPort.value = accountForm.elements.protocol.value === 'pop3' ? '995' : '993';
});

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountError.textContent = 'Connexion aux serveurs en cours…';
  saveAccountButton.disabled = true;
  const account = accountPayload();
  try {
    await window.gestionMail.testAccount(account);
    const saved = await window.gestionMail.saveAccount(account);
    selectedAccountId = saved.id;
    accountForm.reset();
    accountForm.elements.incomingPort.value = '993';
    accountForm.elements.outgoingPort.value = '465';
    accountDialog.close();
    await loadAccounts();
    statusLine.textContent = 'Compte vérifié et enregistré. Vous pouvez actualiser les messages.';
  } catch (error) {
    accountError.textContent = readableError(error);
  } finally {
    saveAccountButton.disabled = false;
  }
});

deleteAccountButton.addEventListener('click', async () => {
  const accountId = accountForm.elements.id.value;
  const account = accounts.find((item) => item.id === accountId);
  if (!account) return;
  const confirmed = window.confirm(
    `Supprimer ${account.email} de GestionMail ?\n\nLes copies locales seront supprimées, mais aucun message ne sera supprimé du serveur.`
  );
  if (!confirmed) return;
  deleteAccountButton.disabled = true;
  accountError.textContent = 'Suppression locale en cours…';
  try {
    await window.gestionMail.deleteAccount(accountId);
    if (selectedAccountId === accountId) selectedAccountId = null;
    accountDialog.close();
    accounts = await window.gestionMail.listAccounts();
    folders = [];
    messages = [];
    renderAccounts();
    renderFolders();
    renderMessages();
    mailView.hidden = true;
    welcome.hidden = false;
    syncButton.disabled = true;
    composeButton.disabled = true;
    searchInput.disabled = true;
    statusLine.textContent = accounts.length ? 'Sélectionnez un compte.' : 'Aucun compte configuré';
  } catch (error) {
    accountError.textContent = readableError(error);
  } finally {
    deleteAccountButton.disabled = false;
  }
});

syncButton.addEventListener('click', () => synchroniseCurrentFolder(false));
autoSyncSelect.value = localStorage.getItem('gestionmail.autoSyncMinutes') || '0';
autoSyncSelect.addEventListener('change', configureAutoSync);
configureAutoSync();

composeButton.addEventListener('click', () => openComposer());
document.querySelector('#close-compose').addEventListener('click', () => composeDialog.close());
document.querySelector('#cancel-compose').addEventListener('click', () => {
  composeForm.reset();
  composeAttachments = [];
  renderComposeAttachments();
  composeDialog.close();
});
document.querySelector('#choose-attachments').addEventListener('click', async () => {
  try {
    const chosen = await window.gestionMail.chooseAttachments();
    for (const attachment of chosen) {
      if (!composeAttachments.some((item) => item.path === attachment.path)) composeAttachments.push(attachment);
    }
    renderComposeAttachments();
  } catch (error) {
    composeError.textContent = readableError(error);
  }
});

document.querySelector('#close-copy-local').addEventListener('click', () => copyLocalDialog.close());
document.querySelector('#cancel-copy-local').addEventListener('click', () => copyLocalDialog.close());
copyLocalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!messageToCopy) return;
  copyLocalError.textContent = 'Copie en cours…';
  try {
    const targetId = Number(copyLocalTarget.value);
    await window.gestionMail.copyMessageToLocal(messageToCopy.id, targetId);
    await loadLocalFolders();
    copyLocalDialog.close();
    statusLine.textContent = 'Le message et ses pièces jointes sont conservés dans le dossier local.';
    messageToCopy = null;
  } catch (error) {
    copyLocalError.textContent = readableError(error);
  }
});

composeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedAccountId) return;
  sendButton.disabled = true;
  composeError.textContent = 'Envoi en cours…';
  try {
    const message = Object.fromEntries(new FormData(composeForm).entries());
    message.attachments = composeAttachments;
    await window.gestionMail.sendMessage(selectedAccountId, message);
    composeForm.reset();
    composeAttachments = [];
    renderComposeAttachments();
    composeDialog.close();
    statusLine.textContent = 'Message envoyé.';
  } catch (error) {
    composeError.textContent = readableError(error);
  } finally {
    sendButton.disabled = false;
  }
});

searchInput.addEventListener('input', () => renderMessages(searchInput.value));

Promise.all([loadLocalFolders(), loadAccounts()]).catch((error) => {
  statusLine.textContent = `Erreur : ${readableError(error)}`;
});
