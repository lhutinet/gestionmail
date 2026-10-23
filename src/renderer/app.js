const accountDialog = document.querySelector('#account-dialog');
const accountForm = document.querySelector('#account-form');
const accountError = document.querySelector('#form-error');
const accountList = document.querySelector('#account-list');
const accountSelector = document.querySelector('#account-selector');
const folderList = document.querySelector('#folder-list');
const favoriteList = document.querySelector('#favorite-list');
const localFolderList = document.querySelector('#local-folder-list');
const localSidebar = document.querySelector('.local-sidebar');
const folderCopyProgress = document.querySelector('#folder-copy-progress');
const folderCopyProgressLabel = document.querySelector('#folder-copy-progress-label');
const folderCopyProgressBar = document.querySelector('#folder-copy-progress-bar');
const folderCopyProgressDetail = document.querySelector('#folder-copy-progress-detail');
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
const composeBodyEditor = document.querySelector('#compose-body-editor');
const composeToolbar = document.querySelector('#compose-toolbar');
const composeFormat = document.querySelector('#compose-format');
const composeFontSize = document.querySelector('#compose-font-size');
const composeTextColor = document.querySelector('#compose-text-color');
const composeLinkUrl = document.querySelector('#compose-link-url');
const recipientEditors = {
  to: document.querySelector('#compose-to-editor'),
  cc: document.querySelector('#compose-cc-editor')
};
const recipientTokenContainers = {
  to: document.querySelector('#compose-to-tokens'),
  cc: document.querySelector('#compose-cc-tokens')
};
const recipientDropZones = {
  to: document.querySelector('[data-recipient-type="to"]'),
  cc: document.querySelector('[data-recipient-type="cc"]')
};
const copyLocalDialog = document.querySelector('#copy-local-dialog');
const copyLocalForm = document.querySelector('#copy-local-form');
const copyLocalTarget = document.querySelector('#copy-local-target');
const copyLocalError = document.querySelector('#copy-local-error');
const localFolderDialog = document.querySelector('#local-folder-dialog');
const localFolderForm = document.querySelector('#local-folder-form');
const localFolderName = document.querySelector('#local-folder-name');
const localFolderError = document.querySelector('#local-folder-error');
const settingsDialog = document.querySelector('#settings-dialog');
const settingsForm = document.querySelector('#settings-form');
const settingsError = document.querySelector('#settings-error');
const saveSettingsButton = document.querySelector('#save-settings');
const contactsDialog = document.querySelector('#contacts-dialog');
const contactForm = document.querySelector('#contact-form');
const contactList = document.querySelector('#contact-list');
const contactSearch = document.querySelector('#contact-search');
const contactError = document.querySelector('#contact-error');
const deleteContactButton = document.querySelector('#delete-contact');
const writeContactButton = document.querySelector('#write-contact');
const contactEmails = document.querySelector('#contact-emails');
const contactGroupList = document.querySelector('#contact-group-list');
const createContactGroupButton = document.querySelector('#create-contact-group');
const recipientPickerDialog = document.querySelector('#recipient-picker-dialog');
const recipientPickerForm = document.querySelector('#recipient-picker-form');
const recipientPickerList = document.querySelector('#recipient-picker-list');
const recipientPickerTitle = document.querySelector('#recipient-picker-title');
const recipientPickerError = document.querySelector('#recipient-picker-error');
const contactGroupDialog = document.querySelector('#contact-group-dialog');
const contactGroupForm = document.querySelector('#contact-group-form');
const contactGroupName = document.querySelector('#contact-group-name');
const contactGroupSummary = document.querySelector('#contact-group-summary');
const contactGroupError = document.querySelector('#contact-group-error');

let accounts = [];
let selectedAccountId = null;
let selectedFolder = 'INBOX';
let folders = [];
let localFolders = [];
let messages = [];
let composeAttachments = [];
const composeRecipients = { to: [], cc: [] };
let autoSyncTimer = null;
let composeSelectionRange = null;
let syncInProgress = false;
let viewingLocal = false;
let messageToCopy = null;
let localFolderResolver = null;
let localFolderParentId = null;
let folderCopyInProgress = false;
let contacts = [];
let contactGroups = [];
const selectedContactIds = new Set();
let recipientTarget = 'to';
let pendingGroupContactIds = [];
let contactGroupCreatedMessage = '';
const collapsedFolders = new Set();
const collapsedLocalFolders = new Set();
let currentSettings = {
  autoSyncMinutes: 0,
  notificationsEnabled: true,
  dataDirectory: ''
};
const lastAccountStorageKey = 'gestionmail.lastAccountId';
const columnWidthsStorageKey = 'gestionmail.columnWidths';
const defaultColumnWidths = { local: 190, accounts: 250, messages: 360 };
let columnWidths = { ...defaultColumnWidths };

try {
  const savedColumnWidths = JSON.parse(localStorage.getItem(columnWidthsStorageKey) || '{}');
  for (const name of Object.keys(defaultColumnWidths)) {
    const value = Number(savedColumnWidths[name]);
    if (Number.isFinite(value)) columnWidths[name] = value;
  }
} catch {
  columnWidths = { ...defaultColumnWidths };
}

function constrainColumnWidths() {
  const dividerWidth = 10;
  const minimumContentWidth = 480;
  columnWidths.local = Math.max(150, Math.min(columnWidths.local, 360));
  columnWidths.accounts = Math.max(190, Math.min(columnWidths.accounts, 430));
  const maximumSidebars = Math.max(340, window.innerWidth - dividerWidth - minimumContentWidth);
  if (columnWidths.local + columnWidths.accounts > maximumSidebars) {
    const overflow = columnWidths.local + columnWidths.accounts - maximumSidebars;
    const accountReduction = Math.min(overflow, columnWidths.accounts - 190);
    columnWidths.accounts -= accountReduction;
    columnWidths.local = Math.max(150, columnWidths.local - (overflow - accountReduction));
  }
  const mainWidth = Math.max(minimumContentWidth, window.innerWidth - columnWidths.local - columnWidths.accounts - dividerWidth);
  columnWidths.messages = Math.max(240, Math.min(columnWidths.messages, Math.max(240, mainWidth - 280)));
}

function applyColumnWidths() {
  constrainColumnWidths();
  const root = document.documentElement;
  root.style.setProperty('--local-sidebar-width', `${Math.round(columnWidths.local)}px`);
  root.style.setProperty('--account-sidebar-width', `${Math.round(columnWidths.accounts)}px`);
  root.style.setProperty('--message-list-width', `${Math.round(columnWidths.messages)}px`);
  for (const separator of document.querySelectorAll('[data-column-resize]')) {
    separator.setAttribute('aria-valuenow', String(Math.round(columnWidths[separator.dataset.columnResize])));
  }
}

function saveColumnWidths() {
  localStorage.setItem(columnWidthsStorageKey, JSON.stringify(columnWidths));
}

function changeColumnWidth(name, value, save = false) {
  columnWidths[name] = Number(value);
  applyColumnWidths();
  if (save) saveColumnWidths();
}

for (const separator of document.querySelectorAll('[data-column-resize]')) {
  const name = separator.dataset.columnResize;
  separator.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnWidths[name];
    separator.setPointerCapture(event.pointerId);
    separator.classList.add('resizing');
    document.body.classList.add('resizing-columns');
    const onMove = (moveEvent) => changeColumnWidth(name, startWidth + moveEvent.clientX - startX);
    const onEnd = () => {
      separator.removeEventListener('pointermove', onMove);
      separator.removeEventListener('pointerup', onEnd);
      separator.removeEventListener('pointercancel', onEnd);
      separator.classList.remove('resizing');
      document.body.classList.remove('resizing-columns');
      saveColumnWidths();
    };
    separator.addEventListener('pointermove', onMove);
    separator.addEventListener('pointerup', onEnd);
    separator.addEventListener('pointercancel', onEnd);
  });
  separator.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    changeColumnWidth(name, columnWidths[name] + direction * (event.shiftKey ? 30 : 10), true);
  });
  separator.addEventListener('dblclick', () => changeColumnWidth(name, defaultColumnWidths[name], true));
}

applyColumnWidths();
window.addEventListener('resize', () => {
  applyColumnWidths();
  saveColumnWidths();
});

function showFolderCopyProgress(progress = {}) {
  folderCopyProgress.hidden = false;
  folderCopyProgressLabel.textContent = progress.label || 'Copie en cours…';
  folderCopyProgressDetail.textContent = progress.detail || 'Préparation des dossiers';
  const total = Number(progress.total || 0);
  const current = Number(progress.current || 0);
  if (total > 0) {
    folderCopyProgressBar.max = total;
    folderCopyProgressBar.value = Math.min(current, total);
  } else {
    folderCopyProgressBar.removeAttribute('value');
    folderCopyProgressBar.removeAttribute('max');
  }
}

function hideFolderCopyProgress() {
  folderCopyProgress.hidden = true;
  folderCopyProgressBar.removeAttribute('value');
  folderCopyProgressBar.removeAttribute('max');
}

window.gestionMail.onFolderCopyProgress((progress) => {
  showFolderCopyProgress(progress);
  if (progress.detail) statusLine.textContent = progress.detail;
});

function lastFolderStorageKey(accountId) {
  return `gestionmail.lastFolder.${accountId}`;
}

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

function extractAddresses(value) {
  const addresses = [];
  const seen = new Set();
  const pattern = /(?:"([^"]*)"|([^,<"]+?))?\s*<\s*([^<>\s,]+@[^<>\s,]+)\s*>|([\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[A-Za-z]{2,})/g;
  for (const match of String(value || '').matchAll(pattern)) {
    const email = String(match[3] || match[4] || '').trim();
    const key = email.toLocaleLowerCase('en');
    if (!email || seen.has(key)) continue;
    seen.add(key);
    const rawName = String(match[1] || match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    addresses.push({ name: rawName || email.split('@')[0], email });
  }
  return addresses;
}

function createAddressLine(label, value, selectedAddresses, onSelectionChange) {
  const line = document.createElement('div');
  line.className = 'message-address-line';
  const caption = document.createElement('span');
  caption.className = 'message-address-label';
  caption.textContent = `${label} :`;
  const values = document.createElement('div');
  values.className = 'message-addresses';
  const addresses = extractAddresses(value);
  if (!addresses.length) {
    values.textContent = String(value || '');
  } else {
    for (const address of addresses) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'address-chip';
      chip.textContent = address.name && address.name !== address.email
        ? `${address.name} <${address.email}>`
        : address.email;
      chip.title = 'Sélectionner cette adresse';
      chip.addEventListener('click', () => {
        const key = address.email.toLocaleLowerCase('en');
        if (selectedAddresses.has(key)) {
          selectedAddresses.delete(key);
          chip.classList.remove('selected');
        } else {
          selectedAddresses.set(key, address);
          chip.classList.add('selected');
        }
        onSelectionChange();
      });
      values.append(chip);
    }
  }
  line.append(caption, values);
  return line;
}

async function ensureAddressesInContacts(addresses) {
  await loadContacts();
  const savedContacts = [];
  for (const address of addresses) {
    let contact = contacts.find((item) => item.email.toLocaleLowerCase('en') === address.email.toLocaleLowerCase('en'));
    if (!contact) {
      contact = await window.gestionMail.saveContact({ name: address.name, email: address.email });
      contacts.push(contact);
    }
    savedContacts.push(contact);
  }
  await loadContacts();
  return savedContacts;
}

function prefixedSubject(prefix, subject) {
  const value = String(subject || '(Sans objet)');
  return new RegExp(`^${prefix}:`, 'i').test(value) ? value : `${prefix}: ${value}`;
}

function renderContactOptions() {
  contactEmails.replaceChildren();
  for (const contact of contacts) {
    const option = document.createElement('option');
    option.value = contact.email;
    option.label = contact.name;
    contactEmails.append(option);
  }
}

function resetContactForm() {
  contactForm.reset();
  contactForm.elements.id.value = '';
  contactError.textContent = '';
  deleteContactButton.hidden = true;
  writeContactButton.disabled = true;
  document.querySelectorAll('.contact-row').forEach((row) => row.classList.remove('active'));
  contactForm.elements.name.focus();
}

function updateGroupCreationState() {
  createContactGroupButton.disabled = selectedContactIds.size < 2;
  createContactGroupButton.textContent = selectedContactIds.size
    ? `Créer un groupe (${selectedContactIds.size})`
    : 'Créer un groupe';
}

function closeContactGroupDialog() {
  pendingGroupContactIds = [];
  contactGroupCreatedMessage = '';
  contactGroupError.textContent = '';
  if (contactGroupDialog.open) contactGroupDialog.close();
}

function openContactGroupDialog(contactIds, createdMessage = '') {
  const ids = [...new Set(contactIds.map(String).filter(Boolean))];
  if (ids.length < 2) {
    contactError.textContent = 'Sélectionnez au moins deux contacts.';
    return;
  }
  pendingGroupContactIds = ids;
  contactGroupCreatedMessage = createdMessage;
  contactGroupForm.reset();
  contactGroupError.textContent = '';
  contactGroupSummary.textContent = `${ids.length} contacts sélectionnés`;
  contactGroupDialog.showModal();
  contactGroupName.focus();
}

function selectContact(contact, row = null) {
  contactForm.elements.id.value = contact.id;
  contactForm.elements.name.value = contact.name;
  contactForm.elements.email.value = contact.email;
  contactForm.elements.phone.value = contact.phone || '';
  contactForm.elements.company.value = contact.company || '';
  contactForm.elements.notes.value = contact.notes || '';
  contactError.textContent = '';
  deleteContactButton.hidden = false;
  writeContactButton.disabled = false;
  document.querySelectorAll('.contact-row').forEach((item) => item.classList.remove('active'));
  if (row) row.classList.add('active');
}

function renderContacts(filter = '', selectedId = '') {
  const query = filter.trim().toLocaleLowerCase('fr');
  const visible = query
    ? contacts.filter((contact) => `${contact.name} ${contact.email} ${contact.phone} ${contact.company}`.toLocaleLowerCase('fr').includes(query))
    : contacts;
  contactList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'contact-empty';
    empty.textContent = query ? 'Aucun contact trouvé.' : 'Aucun contact enregistré.';
    contactList.append(empty);
    return;
  }
  for (const contact of visible) {
    const wrapper = document.createElement('div');
    wrapper.className = 'contact-select-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedContactIds.has(contact.id);
    checkbox.title = `Sélectionner ${contact.name} pour un groupe`;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedContactIds.add(contact.id);
      else selectedContactIds.delete(contact.id);
      updateGroupCreationState();
    });
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `contact-row${contact.id === selectedId ? ' active' : ''}`;
    const name = document.createElement('strong');
    name.textContent = contact.name;
    const details = document.createElement('span');
    details.textContent = contact.company ? `${contact.email} — ${contact.company}` : contact.email;
    row.append(name, details);
    row.addEventListener('click', () => selectContact(contact, row));
    row.addEventListener('dblclick', () => {
      contactsDialog.close();
      openComposer({ to: contact.email });
    });
    wrapper.append(checkbox, row);
    contactList.append(wrapper);
  }
  updateGroupCreationState();
}

function renderContactGroups() {
  contactGroupList.replaceChildren();
  if (!contactGroups.length) {
    const empty = document.createElement('div');
    empty.className = 'contact-empty compact';
    empty.textContent = 'Aucun groupe';
    contactGroupList.append(empty);
    return;
  }
  for (const group of contactGroups) {
    const row = document.createElement('div');
    row.className = 'contact-group-row';
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'contact-group-button';
    select.textContent = `👥 ${group.name} (${group.members.length})`;
    select.addEventListener('click', () => {
      selectedContactIds.clear();
      for (const member of group.members) selectedContactIds.add(member.id);
      renderContacts(contactSearch.value, contactForm.elements.id.value);
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'contact-group-delete';
    remove.textContent = '×';
    remove.title = `Supprimer le groupe ${group.name}`;
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Supprimer le groupe « ${group.name} » ? Les contacts seront conservés.`)) return;
      try {
        await window.gestionMail.deleteContactGroup(group.id);
        await loadContacts();
      } catch (error) {
        contactError.textContent = readableError(error);
      }
    });
    row.append(select, remove);
    contactGroupList.append(row);
  }
}

async function loadContacts() {
  [contacts, contactGroups] = await Promise.all([
    window.gestionMail.listContacts(),
    window.gestionMail.listContactGroups()
  ]);
  for (const contactId of [...selectedContactIds]) {
    if (!contacts.some((contact) => contact.id === contactId)) selectedContactIds.delete(contactId);
  }
  renderContactOptions();
  renderContactGroups();
  if (contactsDialog.open) renderContacts(contactSearch.value, contactForm.elements.id.value);
}

async function openContactsDialog() {
  try {
    await loadContacts();
    selectedContactIds.clear();
    contactSearch.value = '';
    renderContacts();
    resetContactForm();
    contactsDialog.showModal();
  } catch (error) {
    statusLine.textContent = `Impossible d’ouvrir les contacts : ${readableError(error)}`;
  }
}

function displayNameFromAddress(value) {
  const email = extractEmail(value);
  const name = String(value || '').replace(`<${email}>`, '').replace(/^['"]|['"]$/g, '').trim();
  return name && name !== email ? name : email.split('@')[0];
}

async function openContactFromAddress(address) {
  const email = extractEmail(address);
  if (!email || !email.includes('@')) return;
  await openContactsDialog();
  const existing = contacts.find((contact) => contact.email.toLocaleLowerCase('en') === email.toLocaleLowerCase('en'));
  if (existing) {
    selectContact(existing);
    renderContacts('', existing.id);
  } else {
    resetContactForm();
    contactForm.elements.name.value = displayNameFromAddress(address);
    contactForm.elements.email.value = email;
  }
}

function renderRecipientPicker() {
  recipientPickerList.replaceChildren();
  const groupTitle = document.createElement('div');
  groupTitle.className = 'recipient-picker-section';
  groupTitle.textContent = 'GROUPES';
  recipientPickerList.append(groupTitle);
  for (const group of contactGroups) {
    const label = document.createElement('label');
    label.className = 'recipient-picker-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = `group:${group.id}`;
    const text = document.createElement('span');
    text.textContent = `${group.name} — ${group.members.length} contact${group.members.length > 1 ? 's' : ''}`;
    label.append(checkbox, text);
    recipientPickerList.append(label);
  }
  const contactTitle = document.createElement('div');
  contactTitle.className = 'recipient-picker-section';
  contactTitle.textContent = 'CONTACTS';
  recipientPickerList.append(contactTitle);
  for (const contact of contacts) {
    const label = document.createElement('label');
    label.className = 'recipient-picker-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = `contact:${contact.id}`;
    const text = document.createElement('span');
    text.textContent = `${contact.name} — ${contact.email}`;
    label.append(checkbox, text);
    recipientPickerList.append(label);
  }
}

async function openRecipientPicker(target) {
  await loadContacts();
  recipientTarget = target;
  recipientPickerTitle.textContent = target === 'cc' ? 'Ajouter des contacts en Cc' : 'Choisir les destinataires';
  recipientPickerError.textContent = '';
  renderRecipientPicker();
  recipientPickerDialog.showModal();
}

function recipientLabel(email) {
  const contact = contacts.find((item) => item.email.toLocaleLowerCase('en') === email.toLocaleLowerCase('en'));
  return contact?.name && contact.name !== email ? `${contact.name} <${email}>` : email;
}

function syncRecipientValue(target) {
  composeForm.elements[target].value = composeRecipients[target].join(', ');
}

function removeRecipient(target, email) {
  composeRecipients[target] = composeRecipients[target].filter((item) => item !== email);
  renderRecipientTokens(target);
}

function renderRecipientTokens(target) {
  const container = recipientTokenContainers[target];
  container.replaceChildren();
  for (const email of composeRecipients[target]) {
    const token = document.createElement('span');
    token.className = 'recipient-token';
    token.draggable = true;
    token.title = 'Glisser vers À ou Cc';
    const text = document.createElement('span');
    text.className = 'recipient-token-text';
    text.textContent = recipientLabel(email);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'recipient-token-remove';
    remove.setAttribute('aria-label', `Retirer ${email}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => removeRecipient(target, email));
    token.addEventListener('dragstart', (event) => {
      token.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-gestionmail-recipient', JSON.stringify({ source: target, email }));
    });
    token.addEventListener('dragend', () => token.classList.remove('dragging'));
    token.append(text, remove);
    container.append(token);
  }
  syncRecipientValue(target);
}

function addRecipientValues(target, value) {
  const parsed = Array.isArray(value)
    ? value.flatMap((item) => extractAddresses(item))
    : extractAddresses(value);
  if (!parsed.length) return false;
  const existing = new Set(composeRecipients[target].map((email) => email.toLocaleLowerCase('en')));
  for (const address of parsed) {
    const key = address.email.toLocaleLowerCase('en');
    if (!existing.has(key)) {
      composeRecipients[target].push(address.email);
      existing.add(key);
    }
  }
  renderRecipientTokens(target);
  return true;
}

function commitRecipientEditor(target) {
  const editor = recipientEditors[target];
  const value = editor.value.trim().replace(/[,;]+$/, '').trim();
  if (!value) return true;
  if (!addRecipientValues(target, value)) {
    composeError.textContent = `Adresse incorrecte : ${value}`;
    return false;
  }
  editor.value = '';
  composeError.textContent = '';
  return true;
}

function resetComposeRecipients(prefill = {}) {
  composeRecipients.to = [];
  composeRecipients.cc = [];
  recipientEditors.to.value = '';
  recipientEditors.cc.value = '';
  if (prefill.to) addRecipientValues('to', String(prefill.to));
  else renderRecipientTokens('to');
  if (prefill.cc) addRecipientValues('cc', String(prefill.cc));
  else renderRecipientTokens('cc');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function plainTextToHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function rememberComposeSelection() {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (composeBodyEditor.contains(range.commonAncestorContainer)) composeSelectionRange = range.cloneRange();
}

function restoreComposeSelection() {
  composeBodyEditor.focus();
  if (!composeSelectionRange) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(composeSelectionRange);
}

function runComposeCommand(command, value = null) {
  restoreComposeSelection();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(command, false, value);
  rememberComposeSelection();
}

function resetComposeBody(value = '') {
  composeBodyEditor.innerHTML = value ? plainTextToHtml(value) : '';
  composeSelectionRange = null;
  composeLinkUrl.value = '';
  composeFormat.value = 'p';
  composeFontSize.value = '3';
  composeTextColor.value = '#263243';
}

composeBodyEditor.addEventListener('keyup', rememberComposeSelection);
composeBodyEditor.addEventListener('mouseup', rememberComposeSelection);
composeBodyEditor.addEventListener('input', rememberComposeSelection);
composeToolbar.addEventListener('mousedown', (event) => {
  if (event.target.closest('button')) event.preventDefault();
});
composeToolbar.querySelectorAll('button[data-command]').forEach((button) => {
  button.addEventListener('click', () => runComposeCommand(button.dataset.command));
});
composeFormat.addEventListener('change', () => runComposeCommand('formatBlock', composeFormat.value));
composeFontSize.addEventListener('change', () => runComposeCommand('fontSize', composeFontSize.value));
composeTextColor.addEventListener('change', () => runComposeCommand('foreColor', composeTextColor.value));
document.querySelector('#compose-add-link').addEventListener('click', () => {
  let value = composeLinkUrl.value.trim();
  if (!value) {
    composeError.textContent = 'Indiquez l’adresse du lien.';
    composeLinkUrl.focus();
    return;
  }
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error();
    restoreComposeSelection();
    const selection = window.getSelection();
    if (selection?.isCollapsed) document.execCommand('insertHTML', false, `<a href="${escapeHtml(url.href)}">${escapeHtml(url.href)}</a>`);
    else document.execCommand('createLink', false, url.href);
    composeLinkUrl.value = '';
    composeError.textContent = '';
    rememberComposeSelection();
  } catch {
    composeError.textContent = 'L’adresse du lien est incorrecte.';
  }
});

for (const target of ['to', 'cc']) {
  const editor = recipientEditors[target];
  const dropZone = recipientDropZones[target];
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      commitRecipientEditor(target);
    } else if (event.key === 'Tab' && editor.value.trim()) {
      commitRecipientEditor(target);
    } else if (event.key === 'Backspace' && !editor.value && composeRecipients[target].length) {
      removeRecipient(target, composeRecipients[target].at(-1));
    }
  });
  editor.addEventListener('input', () => {
    if (/[,;]\s*$/.test(editor.value)) commitRecipientEditor(target);
  });
  editor.addEventListener('blur', () => commitRecipientEditor(target));
  dropZone.addEventListener('click', (event) => {
    if (!event.target.closest('.recipient-token')) editor.focus();
  });
  dropZone.addEventListener('dragover', (event) => {
    if (!event.dataTransfer.types.includes('application/x-gestionmail-recipient')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drag-over');
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/x-gestionmail-recipient'));
      if (!data.email || !['to', 'cc'].includes(data.source) || data.source === target) return;
      composeRecipients[data.source] = composeRecipients[data.source].filter((email) => email !== data.email);
      if (!composeRecipients[target].some((email) => email.toLocaleLowerCase('en') === data.email.toLocaleLowerCase('en'))) {
        composeRecipients[target].push(data.email);
      }
      renderRecipientTokens(data.source);
      renderRecipientTokens(target);
    } catch {
      composeError.textContent = 'Impossible de déplacer ce destinataire.';
    }
  });
}

function openComposer(prefill = {}) {
  const account = accounts.find((item) => item.id === selectedAccountId);
  document.querySelector('#compose-from').textContent = account ? `Depuis ${account.email}` : '';
  resetComposeRecipients(prefill);
  composeForm.elements.subject.value = prefill.subject || '';
  resetComposeBody(prefill.body || '');
  composeAttachments = [];
  renderComposeAttachments();
  composeError.textContent = '';
  composeDialog.showModal();
}

function renderAccounts() {
  accountSelector.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = accounts.length ? 'Choisir un compte' : 'Aucun compte';
  accountSelector.append(placeholder);
  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = `${account.name} — ${account.email}`;
    accountSelector.append(option);
  }
  accountSelector.value = selectedAccountId || '';

  accountList.replaceChildren();
  if (!accounts.length) {
    const empty = document.createElement('div');
    empty.className = 'list-empty';
    empty.textContent = 'Aucun compte configuré.';
    accountList.append(empty);
    return;
  }
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
    item.addEventListener('click', () => {
      settingsDialog.close();
      selectAccount(account.id);
    });
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-account';
    edit.title = `Modifier ${account.email}`;
    edit.setAttribute('aria-label', `Modifier ${account.email}`);
    edit.textContent = '⚙';
    edit.addEventListener('click', () => {
      settingsDialog.close();
      openAccountDialog(account);
    });
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

function enableFolderDrag(element, folder) {
  element.draggable = true;
  element.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-gestionmail-folder', JSON.stringify({
      accountId: selectedAccountId,
      path: folder.path,
      name: folder.name || folder.path
    }));
  });
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
    enableFolderDrag(item, folder);
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
    if (node.selectable !== false) {
      item.addEventListener('click', () => selectFolder(node.path));
      enableFolderDrag(item, node);
    }
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

function localFolderTree() {
  const nodes = new Map(localFolders.map((folder) => [folder.id, { ...folder, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? null : nodes.get(node.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortNodes = (items) => {
    items.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
    for (const item of items) sortNodes(item.children);
  };
  sortNodes(roots);
  return roots;
}

function appendLocalFolderNodes(container, nodes, depth = 0) {
  for (const folder of nodes) {
    const row = document.createElement('div');
    row.className = 'local-folder-row';
    row.style.paddingLeft = `${depth * 14}px`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree-toggle local-tree-toggle';
    toggle.textContent = folder.children.length ? (collapsedLocalFolders.has(folder.id) ? '▶' : '▼') : '';
    toggle.disabled = !folder.children.length;
    toggle.addEventListener('click', () => {
      if (collapsedLocalFolders.has(folder.id)) collapsedLocalFolders.delete(folder.id);
      else collapsedLocalFolders.add(folder.id);
      renderLocalFolders();
    });
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `nav-item${viewingLocal && selectedFolder === `local:${folder.id}` ? ' active' : ''}`;
    const name = document.createElement('span');
    name.textContent = `📁 ${folder.name}`;
    const count = document.createElement('span');
    count.className = 'local-count';
    count.textContent = String(folder.messageCount || 0);
    item.append(name, count);
    item.addEventListener('click', () => selectLocalFolder(folder));
    item.addEventListener('dblclick', async () => {
      try {
        await window.gestionMail.openLocalFolder(folder.id);
      } catch (error) {
        statusLine.textContent = `Impossible d’ouvrir le dossier Windows : ${readableError(error)}`;
      }
    });
    item.title = `${folder.path}\nDouble-cliquez pour ouvrir dans l’Explorateur Windows`;
    item.draggable = true;
    item.addEventListener('dragstart', (event) => {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-gestionmail-local-folder', String(folder.id));
      row.classList.add('dragging');
    });
    item.addEventListener('dragend', () => row.classList.remove('dragging'));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'local-delete';
    remove.textContent = '×';
    remove.title = `Supprimer ${folder.name}`;
    remove.addEventListener('click', () => deleteLocalFolder(folder));
    row.append(toggle, item, remove);
    row.addEventListener('dragover', (event) => {
      const types = Array.from(event.dataTransfer.types);
      const hasMessage = types.includes('application/x-gestionmail-message');
      const hasLocalFolder = types.includes('application/x-gestionmail-local-folder');
      if (!hasMessage && !hasLocalFolder) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = hasLocalFolder ? 'move' : 'copy';
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', (event) => {
      if (!row.contains(event.relatedTarget)) row.classList.remove('drag-over');
    });
    row.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      row.classList.remove('drag-over');
      const draggedFolderId = Number(event.dataTransfer.getData('application/x-gestionmail-local-folder'));
      if (draggedFolderId) {
        if (draggedFolderId === folder.id) return;
        try {
          await window.gestionMail.moveLocalFolder(draggedFolderId, folder.id);
          collapsedLocalFolders.delete(folder.id);
          await loadLocalFolders();
          statusLine.textContent = `Dossier déplacé dans « ${folder.name} ».`;
        } catch (error) {
          statusLine.textContent = `Déplacement impossible : ${readableError(error)}`;
        }
        return;
      }
      const messageId = event.dataTransfer.getData('application/x-gestionmail-message');
      if (!messageId) return;
      if (viewingLocal && selectedFolder === `local:${folder.id}`) {
        statusLine.textContent = 'Ce message se trouve déjà dans ce dossier local.';
        return;
      }
      try {
        await copyMessageIntoLocalFolder(messageId, folder);
      } catch (error) {
        statusLine.textContent = `Échec de la copie locale : ${readableError(error)}`;
      }
    });
    container.append(row);
    if (folder.children.length && !collapsedLocalFolders.has(folder.id)) {
      const children = document.createElement('div');
      children.className = 'local-folder-children';
      appendLocalFolderNodes(children, folder.children, depth + 1);
      container.append(children);
    }
  }
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
  appendLocalFolderNodes(localFolderList, localFolderTree());
}

localSidebar.addEventListener('dragover', (event) => {
  const types = Array.from(event.dataTransfer.types);
  if (!types.includes('application/x-gestionmail-folder') && !types.includes('application/x-gestionmail-local-folder')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = types.includes('application/x-gestionmail-local-folder') ? 'move' : 'copy';
  localSidebar.classList.add('folder-drag-over');
});

localSidebar.addEventListener('dragleave', (event) => {
  if (!localSidebar.contains(event.relatedTarget)) localSidebar.classList.remove('folder-drag-over');
});

localSidebar.addEventListener('drop', async (event) => {
  const draggedFolderId = Number(event.dataTransfer.getData('application/x-gestionmail-local-folder'));
  if (draggedFolderId) {
    event.preventDefault();
    localSidebar.classList.remove('folder-drag-over');
    try {
      await window.gestionMail.moveLocalFolder(draggedFolderId, null);
      await loadLocalFolders();
      statusLine.textContent = 'Dossier replacé à la racine du stockage local.';
    } catch (error) {
      statusLine.textContent = `Déplacement impossible : ${readableError(error)}`;
    }
    return;
  }
  const encodedFolder = event.dataTransfer.getData('application/x-gestionmail-folder');
  if (!encodedFolder) return;
  event.preventDefault();
  localSidebar.classList.remove('folder-drag-over');
  if (folderCopyInProgress) {
    statusLine.textContent = 'Une copie de dossier est déjà en cours.';
    return;
  }
  folderCopyInProgress = true;
  showFolderCopyProgress({ label: 'Copie en cours…', detail: 'Analyse de l’arborescence' });
  try {
    const source = JSON.parse(encodedFolder);
    statusLine.textContent = `Téléchargement complet de « ${source.name} » puis copie locale…`;
    const result = await window.gestionMail.copyRemoteFolderToLocal(
      source.accountId,
      source.path,
      source.name
    );
    await loadLocalFolders();
    collapsedLocalFolders.delete(result.folder.id);
    renderLocalFolders();
    const childCount = Math.max(0, Number(result.folderCount || 1) - 1);
    statusLine.textContent = `Dossier local « ${result.folder.name} » créé — ${result.totalMessages} message${result.totalMessages > 1 ? 's' : ''} copié${result.totalMessages > 1 ? 's' : ''}${childCount ? ` dans ${childCount + 1} dossiers` : ''}.`;
  } catch (error) {
    statusLine.textContent = `Échec de la copie du dossier : ${readableError(error)}`;
  } finally {
    folderCopyInProgress = false;
    hideFolderCopyProgress();
  }
});

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
    row.draggable = true;
    row.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-gestionmail-message', message.id);
      event.dataTransfer.setData('text/plain', message.subject || '(Sans objet)');
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));

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
    row.addEventListener('dblclick', async () => {
      try {
        await window.gestionMail.openMessageWindow(message.id);
      } catch (error) {
        statusLine.textContent = `Impossible d’ouvrir le message seul : ${readableError(error)}`;
      }
    });
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
  selectedFolder = localStorage.getItem(lastFolderStorageKey(accountId)) || 'INBOX';
  viewingLocal = false;
  localStorage.setItem(lastAccountStorageKey, accountId);
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

async function openSettingsDialog() {
  try {
    currentSettings = await window.gestionMail.getSettings();
    renderAccounts();
    settingsForm.elements.autoSyncMinutes.value = String(currentSettings.autoSyncMinutes);
    settingsForm.elements.notificationsEnabled.checked = Boolean(currentSettings.notificationsEnabled);
    settingsForm.elements.dataDirectory.value = currentSettings.dataDirectory;
    settingsError.textContent = '';
    settingsDialog.showModal();
  } catch (error) {
    statusLine.textContent = `Impossible d’ouvrir les paramètres : ${readableError(error)}`;
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
    if (automatic && currentSettings.notificationsEnabled && newMessages.length) {
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
  if (selectedAccountId) {
    localStorage.setItem(lastAccountStorageKey, selectedAccountId);
    localStorage.setItem(lastFolderStorageKey(selectedAccountId), selectedFolder);
  }
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

function createLocalFolder(parentId = null) {
  if (localFolderDialog.open) return Promise.resolve(null);
  localFolderParentId = parentId === null ? null : Number(parentId);
  localFolderForm.reset();
  localFolderError.textContent = '';
  const parent = localFolders.find((folder) => folder.id === localFolderParentId);
  localFolderDialog.querySelector('.dialog-heading p').textContent = parent
    ? `Le nouveau dossier sera créé dans « ${parent.name} » et restera disponible hors connexion.`
    : 'Le nouveau dossier sera créé à la racine du stockage local.';
  localFolderDialog.showModal();
  localFolderName.focus();
  return new Promise((resolve) => {
    localFolderResolver = resolve;
  });
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

async function copyMessageIntoLocalFolder(messageId, folder) {
  await window.gestionMail.copyMessageToLocal(messageId, folder.id);
  await loadLocalFolders();
  if (viewingLocal && selectedFolder === `local:${folder.id}`) {
    messages = await window.gestionMail.listMessages('__local__', selectedFolder);
    renderMessages(searchInput.value);
  }
  statusLine.textContent = `Message copié dans le dossier local « ${folder.name} » avec ses pièces jointes.`;
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
    const selectedHeaderAddresses = new Map();
    const addSelectedContacts = document.createElement('button');
    addSelectedContacts.type = 'button';
    addSelectedContacts.className = 'secondary';
    addSelectedContacts.hidden = true;
    const createGroupFromMessage = document.createElement('button');
    createGroupFromMessage.type = 'button';
    createGroupFromMessage.className = 'secondary';
    createGroupFromMessage.hidden = true;
    const updateAddressActions = () => {
      const count = selectedHeaderAddresses.size;
      addSelectedContacts.hidden = count === 0;
      addSelectedContacts.textContent = `＋ Ajouter aux contacts (${count})`;
      createGroupFromMessage.hidden = count < 2;
      createGroupFromMessage.textContent = `Créer un groupe (${count})`;
    };
    addSelectedContacts.addEventListener('click', async () => {
      try {
        const selected = [...selectedHeaderAddresses.values()];
        addSelectedContacts.disabled = true;
        await ensureAddressesInContacts(selected);
        statusLine.textContent = `${selected.length} adresse${selected.length > 1 ? 's' : ''} ajoutée${selected.length > 1 ? 's' : ''} aux contacts.`;
      } catch (error) {
        statusLine.textContent = `Ajout impossible : ${readableError(error)}`;
      } finally {
        addSelectedContacts.disabled = false;
      }
    });
    createGroupFromMessage.addEventListener('click', async () => {
      try {
        createGroupFromMessage.disabled = true;
        const savedContacts = await ensureAddressesInContacts([...selectedHeaderAddresses.values()]);
        openContactGroupDialog(
          savedContacts.map((contact) => contact.id),
          `Groupe créé avec ${savedContacts.length} contacts.`
        );
      } catch (error) {
        statusLine.textContent = `Création du groupe impossible : ${readableError(error)}`;
      } finally {
        createGroupFromMessage.disabled = false;
      }
    });
    actions.append(addSelectedContacts, createGroupFromMessage);

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
    const sender = createAddressLine('De', message.sender, selectedHeaderAddresses, updateAddressActions);
    const recipients = createAddressLine('À', message.recipients, selectedHeaderAddresses, updateAddressActions);
    const date = document.createElement('div');
    date.className = 'message-date-line';
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
    const remoteImages = body.querySelectorAll('img[data-remote-src]');
    if (remoteImages.length) {
      const showRemoteImages = document.createElement('button');
      showRemoteImages.type = 'button';
      showRemoteImages.className = 'secondary';
      showRemoteImages.textContent = `▧ Afficher les images distantes (${remoteImages.length})`;
      showRemoteImages.title = 'Charge les images depuis Internet ; l’expéditeur peut alors détecter l’ouverture du message.';
      showRemoteImages.addEventListener('click', () => {
        for (const image of remoteImages) {
          image.src = image.dataset.remoteSrc;
          image.removeAttribute('data-remote-src');
        }
        showRemoteImages.remove();
      });
      actions.append(showRemoteImages);
    }
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
  if (selectNewest && accounts.length) {
    selectedAccountId = accounts.at(-1).id;
  } else if (!selectedAccountId || !accounts.some((account) => account.id === selectedAccountId)) {
    const savedAccountId = localStorage.getItem(lastAccountStorageKey);
    selectedAccountId = accounts.some((account) => account.id === savedAccountId)
      ? savedAccountId
      : accounts[0]?.id || null;
  }
  renderAccounts();
  if (selectedAccountId) await selectAccount(selectedAccountId);
  else statusLine.textContent = 'Aucun compte configuré';
}

document.querySelector('#add-account').addEventListener('click', () => {
  settingsDialog.close();
  openAccountDialog();
});
document.querySelector('#empty-add-account').addEventListener('click', () => openAccountDialog());
accountSelector.addEventListener('change', () => {
  if (accountSelector.value) selectAccount(accountSelector.value);
});
document.querySelector('#add-local-folder').addEventListener('click', () => {
  const parentId = viewingLocal ? Number(String(selectedFolder).replace('local:', '')) : null;
  createLocalFolder(parentId);
});
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
    localStorage.removeItem(lastFolderStorageKey(accountId));
    if (selectedAccountId === accountId) {
      selectedAccountId = null;
      localStorage.removeItem(lastAccountStorageKey);
    }
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
autoSyncSelect.addEventListener('change', async () => {
  configureAutoSync();
  try {
    const result = await window.gestionMail.saveSettings({
      ...currentSettings,
      autoSyncMinutes: Number(autoSyncSelect.value)
    });
    currentSettings = result.settings;
  } catch (error) {
    statusLine.textContent = `Réglage non enregistré : ${readableError(error)}`;
  }
});

composeButton.addEventListener('click', () => openComposer());
document.querySelector('#close-compose').addEventListener('click', () => composeDialog.close());
document.querySelector('#cancel-compose').addEventListener('click', () => {
  composeForm.reset();
  resetComposeRecipients();
  resetComposeBody();
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
    const targetFolder = localFolders.find((folder) => folder.id === targetId);
    if (!targetFolder) throw new Error('Dossier local introuvable.');
    await copyMessageIntoLocalFolder(messageToCopy.id, targetFolder);
    copyLocalDialog.close();
    messageToCopy = null;
  } catch (error) {
    copyLocalError.textContent = readableError(error);
  }
});

function cancelLocalFolderCreation() {
  const resolver = localFolderResolver;
  localFolderResolver = null;
  localFolderParentId = null;
  localFolderDialog.close();
  if (resolver) resolver(null);
}

document.querySelector('#close-local-folder').addEventListener('click', cancelLocalFolderCreation);
document.querySelector('#cancel-local-folder').addEventListener('click', cancelLocalFolderCreation);
localFolderDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  cancelLocalFolderCreation();
});
localFolderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  localFolderError.textContent = 'Création en cours…';
  try {
    const parentId = localFolderParentId;
    const folder = await window.gestionMail.createLocalFolder(localFolderName.value, parentId);
    if (parentId !== null) collapsedLocalFolders.delete(parentId);
    await loadLocalFolders();
    const resolver = localFolderResolver;
    localFolderResolver = null;
    localFolderParentId = null;
    localFolderDialog.close();
    if (resolver) resolver(folder);
    statusLine.textContent = `Dossier local « ${folder.name} » créé.`;
  } catch (error) {
    localFolderError.textContent = readableError(error);
  }
});

document.querySelector('#settings-button').addEventListener('click', openSettingsDialog);
document.querySelector('#contacts-button').addEventListener('click', openContactsDialog);
document.querySelector('#close-contacts').addEventListener('click', () => contactsDialog.close());
document.querySelector('#new-contact').addEventListener('click', resetContactForm);
createContactGroupButton.addEventListener('click', async () => {
  if (selectedContactIds.size < 2) return;
  openContactGroupDialog([...selectedContactIds]);
});
document.querySelector('#close-contact-group').addEventListener('click', closeContactGroupDialog);
document.querySelector('#cancel-contact-group').addEventListener('click', closeContactGroupDialog);
contactGroupDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeContactGroupDialog();
});
contactGroupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = contactGroupName.value.trim();
  if (!name) {
    contactGroupError.textContent = 'Indiquez le nom du groupe.';
    contactGroupName.focus();
    return;
  }
  if (pendingGroupContactIds.length < 2) {
    contactGroupError.textContent = 'Sélectionnez au moins deux contacts.';
    return;
  }
  const submitButton = contactGroupForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  contactGroupError.textContent = 'Création en cours…';
  try {
    const memberCount = pendingGroupContactIds.length;
    const createdMessage = contactGroupCreatedMessage;
    await window.gestionMail.saveContactGroup(name, pendingGroupContactIds);
    selectedContactIds.clear();
    await loadContacts();
    renderContacts(contactSearch.value, contactForm.elements.id.value);
    closeContactGroupDialog();
    const message = createdMessage || `Groupe « ${name} » créé avec ${memberCount} contacts.`;
    contactError.textContent = message;
    statusLine.textContent = message;
  } catch (error) {
    contactGroupError.textContent = readableError(error);
  } finally {
    submitButton.disabled = false;
  }
});
contactSearch.addEventListener('input', () => renderContacts(contactSearch.value, contactForm.elements.id.value));
contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  contactError.textContent = 'Enregistrement…';
  try {
    const saved = await window.gestionMail.saveContact(Object.fromEntries(new FormData(contactForm).entries()));
    await loadContacts();
    selectContact(saved);
    renderContacts(contactSearch.value, saved.id);
    contactError.textContent = 'Contact enregistré.';
  } catch (error) {
    contactError.textContent = readableError(error);
  }
});
deleteContactButton.addEventListener('click', async () => {
  const contactId = contactForm.elements.id.value;
  const contact = contacts.find((item) => item.id === contactId);
  if (!contact || !window.confirm(`Supprimer le contact « ${contact.name} » ?`)) return;
  try {
    await window.gestionMail.deleteContact(contactId);
    await loadContacts();
    renderContacts(contactSearch.value);
    resetContactForm();
  } catch (error) {
    contactError.textContent = readableError(error);
  }
});
writeContactButton.addEventListener('click', () => {
  const contact = contacts.find((item) => item.id === contactForm.elements.id.value);
  if (!contact) return;
  if (!selectedAccountId) {
    contactError.textContent = 'Ajoutez ou sélectionnez un compte de messagerie avant d’écrire.';
    return;
  }
  contactsDialog.close();
  openComposer({ to: contact.email });
});
document.querySelectorAll('.choose-recipients').forEach((button) => {
  button.addEventListener('click', () => openRecipientPicker(button.dataset.target).catch((error) => {
    composeError.textContent = readableError(error);
  }));
});
document.querySelector('#close-recipient-picker').addEventListener('click', () => recipientPickerDialog.close());
document.querySelector('#cancel-recipient-picker').addEventListener('click', () => recipientPickerDialog.close());
recipientPickerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const selected = [...recipientPickerList.querySelectorAll('input:checked')].map((input) => input.value);
  const emails = new Set();
  for (const value of selected) {
    const [type, id] = value.split(':', 2);
    if (type === 'contact') {
      const contact = contacts.find((item) => item.id === id);
      if (contact) emails.add(contact.email);
    } else if (type === 'group') {
      const group = contactGroups.find((item) => item.id === id);
      for (const member of group?.members || []) emails.add(member.email);
    }
  }
  if (!emails.size) {
    recipientPickerError.textContent = 'Sélectionnez au moins un contact ou un groupe.';
    return;
  }
  addRecipientValues(recipientTarget, [...emails]);
  recipientPickerDialog.close();
  recipientEditors[recipientTarget].focus();
});
document.querySelector('#close-settings').addEventListener('click', () => settingsDialog.close());
document.querySelector('#cancel-settings').addEventListener('click', () => settingsDialog.close());
document.querySelector('#choose-data-directory').addEventListener('click', async () => {
  try {
    const directory = await window.gestionMail.chooseDataDirectory();
    if (directory) settingsForm.elements.dataDirectory.value = directory;
  } catch (error) {
    settingsError.textContent = readableError(error);
  }
});
settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsError.textContent = 'Enregistrement des paramètres…';
  saveSettingsButton.disabled = true;
  try {
    const values = {
      autoSyncMinutes: Number(settingsForm.elements.autoSyncMinutes.value),
      notificationsEnabled: settingsForm.elements.notificationsEnabled.checked,
      dataDirectory: settingsForm.elements.dataDirectory.value
    };
    const result = await window.gestionMail.saveSettings(values);
    currentSettings = result.settings;
    autoSyncSelect.value = String(currentSettings.autoSyncMinutes);
    configureAutoSync();
    await loadLocalFolders();
    if (viewingLocal) {
      const folder = localFolders.find((item) => `local:${item.id}` === selectedFolder);
      if (folder) await selectLocalFolder(folder);
    }
    settingsDialog.close();
    statusLine.textContent = result.migration.changed
      ? `Stockage déplacé vers ${currentSettings.dataDirectory}. L’ancienne base est conservée en sauvegarde.`
      : 'Paramètres enregistrés.';
  } catch (error) {
    settingsError.textContent = readableError(error);
  } finally {
    saveSettingsButton.disabled = false;
  }
});

composeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedAccountId) return;
  if (!commitRecipientEditor('to') || !commitRecipientEditor('cc')) return;
  if (!composeRecipients.to.length) {
    composeError.textContent = 'Ajoutez au moins un destinataire dans le champ À.';
    recipientEditors.to.focus();
    return;
  }
  const bodyText = composeBodyEditor.innerText.replace(/\u00a0/g, ' ').trimEnd();
  const bodyHtml = composeBodyEditor.innerHTML.trim();
  if (!bodyText.trim()) {
    composeError.textContent = 'Écrivez le contenu du message.';
    composeBodyEditor.focus();
    return;
  }
  sendButton.disabled = true;
  composeError.textContent = 'Envoi en cours…';
  try {
    composeForm.elements.body.value = bodyText;
    composeForm.elements.htmlBody.value = bodyHtml;
    const message = Object.fromEntries(new FormData(composeForm).entries());
    message.attachments = composeAttachments;
    await window.gestionMail.sendMessage(selectedAccountId, message);
    composeForm.reset();
    resetComposeRecipients();
    resetComposeBody();
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

window.addEventListener('focus', async () => {
  try {
    await loadLocalFolders();
    if (viewingLocal) {
      const folder = localFolders.find((item) => `local:${item.id}` === selectedFolder);
      if (folder) await selectLocalFolder(folder);
    }
  } catch (error) {
    statusLine.textContent = `Actualisation des dossiers Windows impossible : ${readableError(error)}`;
  }
});

async function initialiseApplication() {
  currentSettings = await window.gestionMail.getSettings();
  autoSyncSelect.value = String(currentSettings.autoSyncMinutes);
  configureAutoSync();
  await Promise.all([loadLocalFolders(), loadContacts(), loadAccounts()]);
}

initialiseApplication().catch((error) => {
  statusLine.textContent = `Erreur : ${readableError(error)}`;
});
