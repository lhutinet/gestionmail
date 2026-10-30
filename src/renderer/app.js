const accountDialog = document.querySelector('#account-dialog');
const accountForm = document.querySelector('#account-form');
const accountError = document.querySelector('#form-error');
const accountList = document.querySelector('#account-list');
const accountSelector = document.querySelector('#account-selector');
const folderList = document.querySelector('#folder-list');
const favoriteList = document.querySelector('#favorite-list');
const localFolderList = document.querySelector('#local-folder-list');
const localSidebar = document.querySelector('.local-sidebar');
const localSidebarToggle = document.querySelector('#toggle-local-sidebar');
const localSidebarAccount = document.querySelector('#local-sidebar-account');
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
const trashFolderButton = document.querySelector('#trash-folder-button');
const composeDialog = document.querySelector('#compose-dialog');
const composeForm = document.querySelector('#compose-form');
const composeError = document.querySelector('#compose-error');
const sendButton = document.querySelector('#send-message');
const saveDraftButton = document.querySelector('#save-draft');
const composeDraftStatus = document.querySelector('#compose-draft-status');
const searchInput = document.querySelector('#message-search');
const searchScope = document.querySelector('#search-scope');
const bulkActions = document.querySelector('#bulk-actions');
const bulkCount = document.querySelector('#bulk-count');
const bulkTarget = document.querySelector('#bulk-target');
const autoSyncSelect = document.querySelector('#auto-sync');
const selectedAttachments = document.querySelector('#selected-attachments');
const composeBodyEditor = document.querySelector('#compose-body-editor');
const composeToolbar = document.querySelector('#compose-toolbar');
const composeFormat = document.querySelector('#compose-format');
const composeFontSize = document.querySelector('#compose-font-size');
const composeFontFamily = document.querySelector('#compose-font-family');
const composeTextColor = document.querySelector('#compose-text-color');
const composeBackgroundColor = document.querySelector('#compose-background-color');
const composeLinkUrl = document.querySelector('#compose-link-url');
const composeTemplate = document.querySelector('#compose-template');
const signatureDialog = document.querySelector('#signature-dialog');
const signatureForm = document.querySelector('#signature-form');
const signatureText = document.querySelector('#signature-text');
const signatureError = document.querySelector('#signature-error');
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
const todoDialog = document.querySelector('#todo-dialog');
const todoForm = document.querySelector('#todo-form');
const todoList = document.querySelector('#todo-list');
const todoError = document.querySelector('#todo-error');
const todoCount = document.querySelector('#todo-count');
const advancedSearchDialog = document.querySelector('#advanced-search-dialog');
const advancedSearchForm = document.querySelector('#advanced-search-form');
const advancedSearchError = document.querySelector('#advanced-search-error');
const rulesDialog = document.querySelector('#rules-dialog');
const ruleForm = document.querySelector('#rule-form');
const ruleList = document.querySelector('#rule-list');
const ruleError = document.querySelector('#rule-error');
const ruleAccount = document.querySelector('#rule-account');
const ruleTargetType = document.querySelector('#rule-target-type');
const ruleTargetValue = document.querySelector('#rule-target-value');
const draftsDialog = document.querySelector('#drafts-dialog');
const draftList = document.querySelector('#draft-list');
const draftError = document.querySelector('#draft-error');
const draftCount = document.querySelector('#draft-count');
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
const selectedMessageIds = new Set();
let openedMessageId = null;
const expandedConversationKeys = new Set();
let globalSearchTimer = null;
let advancedSearchActive = false;
let pendingOAuthTokens = null;
let composeAttachments = [];
const composeRecipients = { to: [], cc: [] };
let autoSyncTimer = null;
let composeSelectionRange = null;
let lastAppliedComposeColor = null;
let lastAppliedComposeBackground = null;
let composerData = { signature: '', templates: [] };
let syncInProgress = false;
let viewingLocal = false;
let messageToCopy = null;
let localFolderResolver = null;
let localFolderParentId = null;
let folderCopyInProgress = false;
let contacts = [];
let contactGroups = [];
let todos = [];
let todoFilter = 'open';
let mailRules = [];
let ruleServerFolders = [];
let drafts = [];
let currentDraftId = null;
let draftSaveTimer = null;
let suspendDraftAutosave = false;
const selectedContactIds = new Set();
let recipientTarget = 'to';
let pendingGroupContactIds = [];
let contactGroupCreatedMessage = '';
let pendingGroupId = null;
const collapsedFolders = new Set();
const collapsedLocalFolders = new Set();
let currentSettings = {
  autoSyncMinutes: 0,
  notificationsEnabled: true,
  fontSize: 15,
  interfaceColor: '#6ee7d2',
  minimizeToTray: false,
  groupConversations: true,
  autoUpdateEnabled: true,
  dataDirectory: ''
};
const lastAccountStorageKey = 'gestionmail.lastAccountId';
const columnWidthsStorageKey = 'gestionmail.columnWidths';
const localSidebarCollapsedStorageKey = 'gestionmail.localSidebarCollapsed';
const defaultColumnWidths = { local: 190, accounts: 250, messages: 360 };
let columnWidths = { ...defaultColumnWidths };

function applyInterfaceFontSize(value) {
  const size = [13, 14, 15, 16, 17].includes(Number(value)) ? Number(value) : 15;
  document.documentElement.style.setProperty('--ui-font-size', `${size - 2}px`);
}

function applyInterfaceColor(value) {
  const color = /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : '#6ee7d2';
  const rgb = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  const toHex = (channels) => `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
  const mix = (target, amount) => toHex(rgb.map((channel, index) => channel + (target[index] - channel) * amount));
  const linear = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  const darkContrast = (luminance + .05) / (.014 + .05);
  const lightContrast = 1.05 / (luminance + .05);
  const root = document.documentElement.style;
  root.setProperty('--accent-color', color);
  root.setProperty('--accent-contrast', darkContrast >= lightContrast ? '#102033' : '#ffffff');
  root.setProperty('--accent-strong', mix([0, 0, 0], .38));
  root.setProperty('--accent-mid', mix([255, 255, 255], .38));
  root.setProperty('--accent-soft', mix([255, 255, 255], .82));
  root.setProperty('--accent-softer', mix([255, 255, 255], .9));
  root.setProperty('--accent-ring', `${color}38`);
  root.setProperty('--accent-ink', mix([16, 32, 51], .68));
}

let contextMenu = null;

function closeContextMenu() {
  contextMenu?.remove();
  contextMenu = null;
}

function showContextMenu(event, items) {
  event.preventDefault();
  event.stopPropagation();
  closeContextMenu();
  const available = items.filter((item) => item && (!item.hidden));
  if (!available.length) return;
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.setAttribute('role', 'menu');
  for (const item of available) {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.className = 'context-menu-separator';
      menu.append(separator);
      continue;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = item.danger ? 'danger' : '';
    button.textContent = item.label;
    button.disabled = Boolean(item.disabled);
    button.setAttribute('role', 'menuitem');
    button.addEventListener('pointerdown', (pointerEvent) => pointerEvent.preventDefault());
    button.addEventListener('click', async () => {
      closeContextMenu();
      try {
        await item.action?.();
      } catch (error) {
        statusLine.textContent = readableError(error);
      }
    });
    menu.append(button);
  }
  document.body.append(menu);
  const bounds = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(6, Math.min(event.clientX, window.innerWidth - bounds.width - 6))}px`;
  menu.style.top = `${Math.max(6, Math.min(event.clientY, window.innerHeight - bounds.height - 6))}px`;
  contextMenu = menu;
}

document.addEventListener('pointerdown', (event) => {
  if (contextMenu && !contextMenu.contains(event.target)) closeContextMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeContextMenu();
  if (event.key !== 'Delete' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (document.querySelector('dialog[open]') || target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  const ids = selectedMessageIds.size ? [...selectedMessageIds] : (openedMessageId ? [openedMessageId] : []);
  if (!ids.length) return;
  event.preventDefault();
  moveMessagesToTrash(ids).catch((error) => {
    statusLine.textContent = `Suppression impossible : ${readableError(error)}`;
  });
});
window.addEventListener('blur', closeContextMenu);
window.addEventListener('resize', closeContextMenu);
document.addEventListener('scroll', closeContextMenu, true);
document.addEventListener('contextmenu', (event) => {
  if (event.defaultPrevented) return;
  const editable = event.target.closest('input, textarea, [contenteditable="true"]');
  const selection = window.getSelection();
  if (!editable && selection?.isCollapsed !== false) return;
  const items = [];
  if (editable) {
    items.push(
      { label: 'Annuler', action: () => window.gestionMail.editorCommand('undo') },
      { label: 'Rétablir', action: () => window.gestionMail.editorCommand('redo') },
      { separator: true },
      { label: 'Couper', action: () => window.gestionMail.editorCommand('cut') },
      { label: 'Copier', action: () => window.gestionMail.editorCommand('copy') },
      { label: 'Coller', action: () => window.gestionMail.editorCommand('paste') },
      { separator: true },
      { label: 'Tout sélectionner', action: () => window.gestionMail.editorCommand('selectAll') }
    );
  } else {
    items.push({ label: 'Copier', action: () => window.gestionMail.editorCommand('copy') });
  }
  showContextMenu(event, items);
});

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

function setLocalSidebarCollapsed(collapsed, save = false) {
  document.body.classList.toggle('local-sidebar-collapsed', collapsed);
  localSidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  localSidebarToggle.title = collapsed ? 'Afficher le stockage local' : 'Réduire le stockage local';
  localSidebarToggle.querySelector('span').textContent = collapsed ? '›' : '‹';
  if (save) localStorage.setItem(localSidebarCollapsedStorageKey, String(collapsed));
}

setLocalSidebarCollapsed(localStorage.getItem(localSidebarCollapsedStorageKey) === 'true');
localSidebarToggle.addEventListener('click', () => {
  setLocalSidebarCollapsed(!document.body.classList.contains('local-sidebar-collapsed'), true);
});

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

window.gestionMail.onLocalFoldersRefreshed(async (result) => {
  if (result?.accountId && result.accountId !== selectedAccountId) return;
  localFolders = Array.isArray(result?.folders) ? result.folders : localFolders;
  renderLocalFolders();
  if (viewingLocal && result?.imported) {
    messages = await window.gestionMail.listMessages('__local__', selectedFolder);
    renderMessages(searchInput.value);
    statusLine.textContent = `${result.imported} nouveau${result.imported > 1 ? 'x' : ''} fichier${result.imported > 1 ? 's' : ''} .eml indexé${result.imported > 1 ? 's' : ''} en arrière-plan.`;
  }
});

function lastFolderStorageKey(accountId) {
  return `gestionmail.lastFolder.${accountId}`;
}

function folderCacheStorageKey(accountId) {
  return `gestionmail.folders.${accountId}`;
}

function updateTodoCount() {
  todoCount.textContent = String(todos.filter((todo) => !todo.done).length);
}

function renderTodos() {
  const visible = todos.filter((todo) => todoFilter === 'all' || (todoFilter === 'done' ? todo.done : !todo.done));
  todoList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'contact-empty';
    empty.textContent = todoFilter === 'open' ? 'Aucune tâche ouverte.' : 'Aucune tâche dans cette vue.';
    todoList.append(empty);
  }
  for (const todo of visible) {
    const row = document.createElement('div');
    row.className = `todo-row${todo.done ? ' done' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.done;
    checkbox.addEventListener('change', async () => {
      try {
        const saved = await window.gestionMail.saveTodo(selectedAccountId, { ...todo, done: checkbox.checked });
        todos = todos.map((item) => item.id === saved.id ? saved : item);
        updateTodoCount();
        renderTodos();
      } catch (error) {
        todoError.textContent = readableError(error);
      }
    });
    const content = document.createElement('div');
    const title = document.createElement('span');
    title.className = 'todo-title';
    title.textContent = todo.title;
    const meta = document.createElement('span');
    meta.className = 'todo-meta';
    meta.textContent = todo.category;
    content.append(title, meta);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'todo-delete';
    remove.textContent = '×';
    remove.title = 'Supprimer la tâche';
    remove.addEventListener('click', async () => {
      try {
        await window.gestionMail.deleteTodo(selectedAccountId, todo.id);
        todos = todos.filter((item) => item.id !== todo.id);
        updateTodoCount();
        renderTodos();
      } catch (error) {
        todoError.textContent = readableError(error);
      }
    });
    row.append(checkbox, content, remove);
    todoList.append(row);
  }
}

async function loadTodos() {
  todos = await window.gestionMail.listTodos(selectedAccountId);
  updateTodoCount();
  if (todoDialog.open) renderTodos();
}

async function loadDrafts() {
  drafts = await window.gestionMail.listDrafts();
  draftCount.textContent = String(drafts.length);
  if (draftsDialog.open) renderDrafts();
}

function renderDrafts() {
  draftList.replaceChildren();
  if (!drafts.length) {
    const empty = document.createElement('div');
    empty.className = 'contact-empty';
    empty.textContent = 'Aucun brouillon.';
    draftList.append(empty);
    return;
  }
  for (const draft of drafts) {
    const row = document.createElement('div');
    row.className = 'draft-row';
    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'draft-main';
    const title = document.createElement('strong');
    title.textContent = draft.subject || '(Sans objet)';
    const detail = document.createElement('span');
    detail.textContent = `${draft.recipientsTo || 'Aucun destinataire'} — ${new Date(draft.updatedAt).toLocaleString('fr-FR')}`;
    main.append(title, detail);
    main.addEventListener('click', async () => {
      try {
        const complete = await window.gestionMail.getDraft(draft.id);
        if (complete.accountId && complete.accountId !== selectedAccountId) await selectAccount(complete.accountId);
        draftsDialog.close();
        openComposer({
          draftId: complete.id,
          to: complete.recipientsTo,
          cc: complete.recipientsCc,
          subject: complete.subject,
          body: complete.textBody,
          htmlBody: complete.htmlBody,
          attachments: complete.attachments
        });
      } catch (error) {
        draftError.textContent = readableError(error);
      }
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'todo-delete';
    remove.textContent = '×';
    remove.title = 'Supprimer le brouillon';
    remove.addEventListener('click', async () => {
      try {
        await window.gestionMail.deleteDraft(draft.id);
        await loadDrafts();
      } catch (error) {
        draftError.textContent = readableError(error);
      }
    });
    row.append(main, remove);
    draftList.append(row);
  }
}

function draftPayload() {
  return {
    id: currentDraftId,
    accountId: selectedAccountId,
    to: composeRecipients.to.join(', '),
    cc: composeRecipients.cc.join(', '),
    subject: composeForm.elements.subject.value,
    body: composeBodyEditor.innerText.replace(/\u00a0/g, ' ').trimEnd(),
    htmlBody: composeBodyEditor.innerHTML.trim(),
    attachments: composeAttachments
  };
}

async function saveCurrentDraft() {
  if (suspendDraftAutosave || !composeDialog.open || !selectedAccountId) return null;
  const draft = draftPayload();
  const isAutomaticSignatureOnly = Boolean(composerData.signature) && draft.htmlBody === signatureHtml();
  const hasContent = draft.to || draft.cc || draft.subject.trim() || (!isAutomaticSignatureOnly && draft.body.trim()) || draft.attachments.length;
  if (!hasContent && !currentDraftId) return null;
  const saved = await window.gestionMail.saveDraft(draft);
  currentDraftId = saved.id;
  await loadDrafts();
  return saved;
}

function queueDraftSave() {
  if (suspendDraftAutosave || !composeDialog.open) return;
  composeDraftStatus.textContent = '';
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    saveCurrentDraft().catch((error) => {
      composeError.textContent = `Brouillon non enregistré : ${readableError(error)}`;
    });
  }, 800);
}

function resetRuleForm() {
  ruleForm.reset();
  ruleForm.elements.id.value = '';
  ruleForm.elements.enabled.checked = true;
  ruleAccount.value = selectedAccountId || accounts[0]?.id || '';
  ruleError.textContent = '';
  renderRuleTargets();
}

function renderRuleTargets() {
  ruleTargetValue.replaceChildren();
  const candidates = ruleTargetType.value === 'local'
    ? localFolders.map((folder) => ({ value: String(folder.id), label: folder.name }))
    : ruleServerFolders.filter((folder) => folder.selectable !== false).map((folder) => ({ value: folder.path, label: folder.name || folder.path }));
  for (const candidate of candidates) {
    const option = document.createElement('option');
    option.value = candidate.value;
    option.textContent = candidate.label;
    ruleTargetValue.append(option);
  }
  if (!candidates.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Aucun dossier disponible';
    ruleTargetValue.append(option);
  }
}

async function selectRule(rule) {
  for (const [name, value] of Object.entries(rule)) {
    if (ruleForm.elements[name] && name !== 'enabled') ruleForm.elements[name].value = value;
  }
  ruleForm.elements.enabled.checked = rule.enabled;
  if (rule.accountId !== selectedAccountId) ruleServerFolders = await window.gestionMail.listFolders(rule.accountId);
  else ruleServerFolders = folders;
  ruleTargetType.value = rule.targetType;
  renderRuleTargets();
  ruleTargetValue.value = rule.targetValue;
}

function renderRules() {
  ruleList.replaceChildren();
  if (!mailRules.length) {
    const empty = document.createElement('div');
    empty.className = 'contact-empty';
    empty.textContent = 'Aucune règle de tri.';
    ruleList.append(empty);
    return;
  }
  for (const rule of mailRules) {
    const row = document.createElement('div');
    row.className = `rule-row${rule.enabled ? '' : ' disabled'}`;
    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'rule-main';
    const title = document.createElement('strong');
    title.textContent = rule.name;
    const detail = document.createElement('small');
    detail.textContent = `${rule.matchField} ${rule.matchType} « ${rule.matchValue} » → ${rule.targetValue}`;
    main.append(title, detail);
    main.addEventListener('click', () => selectRule(rule).catch((error) => {
      ruleError.textContent = readableError(error);
    }));
    const kind = document.createElement('span');
    kind.className = 'rule-target-kind';
    kind.textContent = rule.targetType === 'local' ? 'Local' : 'Serveur';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'todo-delete';
    remove.textContent = '×';
    remove.title = 'Supprimer la règle';
    remove.addEventListener('click', async () => {
      try {
        await window.gestionMail.deleteMailRule(rule.id);
        mailRules = mailRules.filter((item) => item.id !== rule.id);
        renderRules();
      } catch (error) {
        ruleError.textContent = readableError(error);
      }
    });
    row.append(main, kind, remove);
    ruleList.append(row);
  }
}

async function openRulesDialog() {
  await Promise.all([loadLocalFolders(), loadContacts()]);
  mailRules = await window.gestionMail.listMailRules();
  ruleAccount.replaceChildren();
  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = `${account.name} — ${account.email}`;
    ruleAccount.append(option);
  }
  resetRuleForm();
  ruleServerFolders = ruleAccount.value === selectedAccountId ? folders : await window.gestionMail.listFolders(ruleAccount.value);
  renderRuleTargets();
  renderRules();
  settingsDialog.close();
  rulesDialog.showModal();
}

function readableError(error) {
  const value = String(error?.message || error || 'Erreur inconnue');
  return value.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function accountPayload() {
  const data = new FormData(accountForm);
  const account = Object.fromEntries(data.entries());
  account.protocol = accountForm.elements.protocol.value;
  account.incomingSecure = data.has('incomingSecure');
  account.outgoingSecure = data.has('outgoingSecure');
  if (account.authType === 'oauth2' && pendingOAuthTokens) Object.assign(account, pendingOAuthTokens);
  return account;
}

function updateAccountAuthFields() {
  const oauth = accountForm.elements.authType.value === 'oauth2';
  document.querySelector('#oauth-fields').hidden = !oauth;
  document.querySelector('#password-field').hidden = oauth;
  accountForm.elements.password.required = !oauth && !accountForm.elements.id.value;
  accountForm.elements.oauthClientId.required = oauth;
  accountForm.elements.protocol.disabled = oauth;
  if (oauth) accountForm.elements.protocol.value = 'imap';
  document.querySelector('#oauth-tenant-field').hidden = !oauth || accountForm.elements.oauthProvider.value !== 'microsoft';
}

function applyOAuthProviderDefaults(force = false) {
  const provider = accountForm.elements.oauthProvider.value;
  const values = provider === 'microsoft'
    ? { incomingHost: 'outlook.office365.com', incomingPort: '993', outgoingHost: 'smtp.office365.com', outgoingPort: '587', outgoingSecure: false }
    : { incomingHost: 'imap.gmail.com', incomingPort: '993', outgoingHost: 'smtp.gmail.com', outgoingPort: '465', outgoingSecure: true };
  for (const field of ['incomingHost', 'incomingPort', 'outgoingHost', 'outgoingPort']) {
    if (force || !accountForm.elements[field].value) accountForm.elements[field].value = values[field];
  }
  accountForm.elements.incomingSecure.checked = true;
  accountForm.elements.outgoingSecure.checked = values.outgoingSecure;
  updateAccountAuthFields();
}

function openAccountDialog(account = null) {
  accountForm.reset();
  accountForm.elements.incomingPort.value = '993';
  accountForm.elements.outgoingPort.value = '465';
  pendingOAuthTokens = null;
  accountForm.elements.password.required = !account;
  deleteAccountButton.hidden = !account;
  document.querySelector('#account-dialog-title').textContent = account ? 'Modifier le compte' : 'Ajouter un compte';
  document.querySelector('#password-help').textContent = account
    ? 'Laissez vide pour conserver le mot de passe actuel.'
    : 'Il sera chiffré avec la protection de votre session Windows.';
  if (account) {
    for (const field of ['id', 'name', 'email', 'localDirectory', 'protocol', 'authType', 'oauthProvider', 'oauthClientId', 'oauthTenant', 'incomingHost', 'incomingPort', 'outgoingHost', 'outgoingPort', 'username']) {
      accountForm.elements[field].value = account[field] ?? '';
    }
    accountForm.elements.incomingSecure.checked = Boolean(account.incomingSecure);
    accountForm.elements.outgoingSecure.checked = Boolean(account.outgoingSecure);
  }
  if (!accountForm.elements.authType.value) accountForm.elements.authType.value = 'password';
  if (!accountForm.elements.oauthProvider.value) accountForm.elements.oauthProvider.value = 'google';
  updateAccountAuthFields();
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
      queueDraftSave();
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
  createContactGroupButton.textContent = selectedContactIds.size ? `♟＋${selectedContactIds.size}` : '♟＋';
  createContactGroupButton.title = selectedContactIds.size
    ? `Créer un groupe avec ${selectedContactIds.size} contacts`
    : 'Créer un groupe';
  createContactGroupButton.setAttribute('aria-label', createContactGroupButton.title);
}

function closeContactGroupDialog() {
  pendingGroupContactIds = [];
  contactGroupCreatedMessage = '';
  pendingGroupId = null;
  contactGroupError.textContent = '';
  if (contactGroupDialog.open) contactGroupDialog.close();
}

function openContactGroupDialog(contactIds, createdMessage = '', groupId = null, groupName = '') {
  const ids = [...new Set(contactIds.map(String).filter(Boolean))];
  if (ids.length < 2) {
    contactError.textContent = 'Sélectionnez au moins deux contacts.';
    return;
  }
  pendingGroupContactIds = ids;
  contactGroupCreatedMessage = createdMessage;
  pendingGroupId = groupId;
  contactGroupForm.reset();
  contactGroupName.value = groupName;
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
    row.addEventListener('contextmenu', (event) => showContextMenu(event, [
      { label: 'Écrire un message', disabled: !selectedAccountId, action: () => {
        contactsDialog.close();
        openComposer({ to: contact.email });
      } },
      { label: 'Modifier le contact', action: () => selectContact(contact, row) },
      {
        label: selectedContactIds.has(contact.id) ? 'Retirer de la sélection de groupe' : 'Sélectionner pour un groupe',
        action: () => {
          if (selectedContactIds.has(contact.id)) selectedContactIds.delete(contact.id);
          else selectedContactIds.add(contact.id);
          renderContacts(contactSearch.value, contactForm.elements.id.value);
        }
      },
      { separator: true },
      { label: 'Supprimer le contact…', danger: true, action: async () => {
        if (!window.confirm(`Supprimer le contact « ${contact.name} » ?`)) return;
        await window.gestionMail.deleteContact(contact.id);
        selectedContactIds.delete(contact.id);
        await loadContacts();
        renderContacts(contactSearch.value);
        resetContactForm();
      } }
    ]));
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
    select.addEventListener('contextmenu', (event) => showContextMenu(event, [
      { label: 'Écrire au groupe', disabled: !selectedAccountId || !group.members.length, action: () => {
        contactsDialog.close();
        openComposer({ to: group.members.map((member) => member.email).join(', ') });
      } },
      { label: 'Sélectionner les membres', action: () => {
        selectedContactIds.clear();
        for (const member of group.members) selectedContactIds.add(member.id);
        renderContacts(contactSearch.value, contactForm.elements.id.value);
      } },
      { label: 'Modifier le groupe…', action: () => openContactGroupDialog(group.members.map((member) => member.id), '', group.id, group.name) },
      { separator: true },
      { label: 'Supprimer le groupe…', danger: true, action: async () => {
        if (!window.confirm(`Supprimer le groupe « ${group.name} » ? Les contacts seront conservés.`)) return;
        await window.gestionMail.deleteContactGroup(group.id);
        await loadContacts();
      } }
    ]));
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'contact-group-edit';
    edit.textContent = '✎';
    edit.title = `Modifier le groupe ${group.name}`;
    edit.addEventListener('click', () => {
      selectedContactIds.clear();
      for (const member of group.members) selectedContactIds.add(member.id);
      renderContacts(contactSearch.value, contactForm.elements.id.value);
      openContactGroupDialog(group.members.map((member) => member.id), '', group.id, group.name);
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
    row.append(select, edit, remove);
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
  queueDraftSave();
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

function applyComposeTextColor(color) {
  if (!composeSelectionRange || !composeBodyEditor.contains(composeSelectionRange.commonAncestorContainer)) {
    composeBodyEditor.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    rememberComposeSelection();
    return;
  }
  const range = composeSelectionRange.cloneRange();
  if (range.collapsed) {
    restoreComposeSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    rememberComposeSelection();
    return;
  }
  const span = document.createElement('span');
  span.style.color = color;
  span.append(range.extractContents());
  range.insertNode(span);
  const coloredRange = document.createRange();
  coloredRange.selectNodeContents(span);
  composeSelectionRange = coloredRange.cloneRange();
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(coloredRange);
  composeBodyEditor.focus();
  queueDraftSave();
}

function applyComposeBackgroundColor(color) {
  if (!composeSelectionRange || !composeBodyEditor.contains(composeSelectionRange.commonAncestorContainer)) {
    runComposeCommand('hiliteColor', color);
    return;
  }
  const range = composeSelectionRange.cloneRange();
  if (range.collapsed) {
    runComposeCommand('hiliteColor', color);
    return;
  }
  const span = document.createElement('span');
  span.style.backgroundColor = color;
  span.append(range.extractContents());
  range.insertNode(span);
  const highlightedRange = document.createRange();
  highlightedRange.selectNodeContents(span);
  composeSelectionRange = highlightedRange.cloneRange();
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(highlightedRange);
  composeBodyEditor.focus();
  queueDraftSave();
}

function resetComposeBody(value = '', htmlValue = '') {
  composeBodyEditor.innerHTML = htmlValue || (value ? plainTextToHtml(value) : '');
  composeSelectionRange = null;
  composeLinkUrl.value = '';
  composeFormat.value = 'p';
  composeFontSize.value = '3';
  composeFontFamily.value = '';
  composeTextColor.value = '#263243';
  composeBackgroundColor.value = '#fff2a8';
}

function renderComposeTemplates() {
  composeTemplate.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Modèles…';
  composeTemplate.append(placeholder);
  for (const template of composerData.templates) {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    composeTemplate.append(option);
  }
}

function insertComposeHtml(html) {
  restoreComposeSelection();
  document.execCommand('insertHTML', false, html);
  rememberComposeSelection();
  queueDraftSave();
}

function signatureHtml() {
  return composerData.signature ? `<div class="gestionmail-signature"><br>${composerData.signature}</div>` : '';
}

composeBodyEditor.addEventListener('keyup', rememberComposeSelection);
composeBodyEditor.addEventListener('mouseup', rememberComposeSelection);
composeBodyEditor.addEventListener('input', rememberComposeSelection);
composeToolbar.addEventListener('pointerdown', rememberComposeSelection, true);
composeToolbar.addEventListener('mousedown', (event) => {
  if (event.target.closest('button')) event.preventDefault();
});
composeToolbar.querySelectorAll('button[data-command]').forEach((button) => {
  button.addEventListener('click', () => runComposeCommand(button.dataset.command));
});
composeFormat.addEventListener('change', () => runComposeCommand('formatBlock', composeFormat.value));
composeFontSize.addEventListener('change', () => runComposeCommand('fontSize', composeFontSize.value));
composeFontFamily.addEventListener('change', () => {
  if (composeFontFamily.value) runComposeCommand('fontName', composeFontFamily.value);
});
composeTextColor.addEventListener('pointerdown', () => {
  lastAppliedComposeColor = null;
});
function handleComposeTextColor() {
  if (lastAppliedComposeColor === composeTextColor.value) return;
  lastAppliedComposeColor = composeTextColor.value;
  applyComposeTextColor(composeTextColor.value);
}
composeTextColor.addEventListener('input', handleComposeTextColor);
composeTextColor.addEventListener('change', handleComposeTextColor);
composeBackgroundColor.addEventListener('pointerdown', () => { lastAppliedComposeBackground = null; });
function handleComposeBackgroundColor() {
  if (lastAppliedComposeBackground === composeBackgroundColor.value) return;
  lastAppliedComposeBackground = composeBackgroundColor.value;
  applyComposeBackgroundColor(composeBackgroundColor.value);
}
composeBackgroundColor.addEventListener('input', handleComposeBackgroundColor);
composeBackgroundColor.addEventListener('change', handleComposeBackgroundColor);
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

document.querySelector('#compose-inline-image').addEventListener('click', async () => {
  try {
    const image = await window.gestionMail.chooseInlineImage();
    if (!image) return;
    insertComposeHtml(`<img src="${image.dataUrl}" alt="${escapeHtml(image.name)}">`);
    composeError.textContent = '';
  } catch (error) {
    composeError.textContent = readableError(error);
  }
});
composeTemplate.addEventListener('change', () => {
  const template = composerData.templates.find((item) => item.id === composeTemplate.value);
  if (!template) return;
  composeForm.elements.subject.value = template.subject || '';
  resetComposeBody('', template.htmlBody || '');
  composeTemplate.value = template.id;
  queueDraftSave();
});
document.querySelector('#compose-save-template').addEventListener('click', async () => {
  const name = window.prompt('Nom du modèle :', composeForm.elements.subject.value.trim() || 'Nouveau modèle');
  if (!name?.trim()) return;
  try {
    const saved = await window.gestionMail.saveTemplate({
      name: name.trim(), subject: composeForm.elements.subject.value, htmlBody: composeBodyEditor.innerHTML
    });
    composerData.templates = [...composerData.templates.filter((item) => item.id !== saved.id), saved];
    renderComposeTemplates();
    composeTemplate.value = saved.id;
    composeError.textContent = `Modèle « ${saved.name} » enregistré.`;
  } catch (error) {
    composeError.textContent = readableError(error);
  }
});
document.querySelector('#compose-delete-template').addEventListener('click', async () => {
  const template = composerData.templates.find((item) => item.id === composeTemplate.value);
  if (!template || !window.confirm(`Supprimer le modèle « ${template.name} » ?`)) return;
  try {
    await window.gestionMail.deleteTemplate(template.id);
    composerData.templates = composerData.templates.filter((item) => item.id !== template.id);
    renderComposeTemplates();
    composeError.textContent = 'Modèle supprimé.';
  } catch (error) {
    composeError.textContent = readableError(error);
  }
});
document.querySelector('#compose-insert-signature').addEventListener('click', () => {
  if (!composerData.signature) {
    signatureText.value = '';
    signatureError.textContent = 'Créez d’abord la signature de ce compte.';
    signatureDialog.showModal();
    return;
  }
  insertComposeHtml(signatureHtml());
});
document.querySelector('#compose-edit-signature').addEventListener('click', () => {
  const temporary = document.createElement('div');
  temporary.innerHTML = composerData.signature || '';
  signatureText.value = temporary.innerText;
  signatureError.textContent = '';
  signatureDialog.showModal();
});
document.querySelector('#compose-spellcheck').addEventListener('click', (event) => {
  const enabled = composeBodyEditor.spellcheck !== false;
  composeBodyEditor.spellcheck = !enabled;
  event.currentTarget.classList.toggle('active', !enabled);
  event.currentTarget.textContent = `ABC${!enabled ? '✓' : '×'}`;
  event.currentTarget.title = `Vérification orthographique ${!enabled ? 'activée' : 'désactivée'}`;
  composeBodyEditor.focus();
});
document.querySelector('#close-signature').addEventListener('click', () => signatureDialog.close());
document.querySelector('#cancel-signature').addEventListener('click', () => signatureDialog.close());
signatureForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  signatureError.textContent = 'Enregistrement…';
  try {
    const result = await window.gestionMail.saveSignature(selectedAccountId, plainTextToHtml(signatureText.value.trim()));
    composerData.signature = result.signature;
    signatureDialog.close();
    composeError.textContent = 'Signature enregistrée pour ce compte.';
  } catch (error) {
    signatureError.textContent = readableError(error);
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

async function openComposer(prefill = {}) {
  suspendDraftAutosave = true;
  const account = accounts.find((item) => item.id === selectedAccountId);
  document.querySelector('#compose-from').textContent = account ? `Depuis ${account.email}` : '';
  try {
    composerData = await window.gestionMail.getComposerData(selectedAccountId);
  } catch {
    composerData = { signature: '', templates: [] };
  }
  renderComposeTemplates();
  resetComposeRecipients(prefill);
  composeForm.elements.subject.value = prefill.subject || '';
  resetComposeBody(prefill.body || '', prefill.htmlBody || '');
  if (!prefill.body && !prefill.htmlBody && !prefill.draftId && composerData.signature) {
    composeBodyEditor.innerHTML = signatureHtml();
  }
  composeAttachments = Array.isArray(prefill.attachments) ? [...prefill.attachments] : [];
  currentDraftId = prefill.draftId || null;
  renderComposeAttachments();
  composeError.textContent = '';
  composeDraftStatus.textContent = currentDraftId ? 'Brouillon ouvert' : '';
  composeDialog.showModal();
  suspendDraftAutosave = false;
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
    item.addEventListener('contextmenu', (event) => showContextMenu(event, [
      { label: 'Ouvrir ce compte', action: () => {
        settingsDialog.close();
        return selectAccount(account.id);
      } },
      { label: 'Nouveau message avec ce compte', action: async () => {
        settingsDialog.close();
        if (selectedAccountId !== account.id) await selectAccount(account.id);
        await openComposer();
      } },
      { label: 'Modifier le compte…', action: () => {
        settingsDialog.close();
        openAccountDialog(account);
      } }
    ]));
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

function saveFavoriteOrder(paths) {
  localStorage.setItem(favoriteStorageKey(), JSON.stringify(paths));
}

function reorderFavorite(sourcePath, targetPath = null, afterTarget = false) {
  const favorites = favoritePaths();
  if (!favorites.includes(sourcePath)) return;
  const reordered = favorites.filter((path) => path !== sourcePath);
  if (targetPath && reordered.includes(targetPath)) {
    const targetIndex = reordered.indexOf(targetPath);
    reordered.splice(targetIndex + (afterTarget ? 1 : 0), 0, sourcePath);
  } else {
    reordered.push(sourcePath);
  }
  saveFavoriteOrder(reordered);
  renderFavorites();
  statusLine.textContent = 'Ordre des favoris enregistré.';
}

function clearFavoriteDropIndicators() {
  favoriteList.classList.remove('favorite-list-drop-end');
  for (const item of favoriteList.querySelectorAll('.favorite-drag-before, .favorite-drag-after')) {
    item.classList.remove('favorite-drag-before', 'favorite-drag-after');
  }
}

function enableFavoriteReorder(element, folder) {
  element.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('application/x-monmail-favorite', folder.path);
    element.classList.add('favorite-dragging');
  });
  element.addEventListener('dragend', () => {
    element.classList.remove('favorite-dragging');
    clearFavoriteDropIndicators();
  });
  element.addEventListener('dragover', (event) => {
    if (!Array.from(event.dataTransfer.types).includes('application/x-monmail-favorite')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clearFavoriteDropIndicators();
    const afterTarget = event.clientY >= element.getBoundingClientRect().top + element.offsetHeight / 2;
    element.classList.add(afterTarget ? 'favorite-drag-after' : 'favorite-drag-before');
    event.dataTransfer.dropEffect = 'move';
  });
  element.addEventListener('dragleave', (event) => {
    if (!element.contains(event.relatedTarget)) element.classList.remove('favorite-drag-before', 'favorite-drag-after');
  });
  element.addEventListener('drop', (event) => {
    const sourcePath = event.dataTransfer.getData('application/x-monmail-favorite');
    if (!sourcePath) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const afterTarget = element.classList.contains('favorite-drag-after');
    clearFavoriteDropIndicators();
    if (sourcePath !== folder.path) reorderFavorite(sourcePath, folder.path, afterTarget);
  });
}

function enableFolderDrag(element, folder) {
  element.draggable = true;
  element.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-gestionmail-folder', JSON.stringify({
      accountId: selectedAccountId,
      path: folder.path,
      name: folder.name || folder.path
    }));
  });
}

function draggedMessageIds(event) {
  const encoded = event.dataTransfer.getData('application/x-monmail-message-ids');
  if (encoded) {
    try {
      const ids = JSON.parse(encoded);
      if (Array.isArray(ids)) return ids.map(String).filter(Boolean);
    } catch {
      return [];
    }
  }
  const singleId = event.dataTransfer.getData('application/x-gestionmail-message');
  return singleId ? [singleId] : [];
}

async function moveDraggedMessagesToServer(messageIds, folder) {
  if (!activeAccountUsesImap()) throw new Error('Le déplacement par glisser-déposer nécessite un compte IMAP.');
  const uniqueIds = [...new Set(messageIds)];
  const selected = uniqueIds.map((id) => messages.find((message) => message.id === id)).filter(Boolean);
  if (!selected.length) throw new Error('Aucun message à déplacer.');
  if (selected.some((message) => message.accountId === '__local__')) {
    throw new Error('Une copie locale ne peut pas être déplacée vers le serveur.');
  }
  if (selected.some((message) => message.accountId !== selectedAccountId)) {
    throw new Error('Les messages doivent appartenir au compte actuellement ouvert.');
  }
  const movable = selected.filter((message) => message.folder !== folder.path);
  if (!movable.length) {
    statusLine.textContent = `Les messages se trouvent déjà dans « ${folder.name || folder.path} ».`;
    return;
  }
  statusLine.textContent = `Déplacement de ${movable.length} message${movable.length > 1 ? 's' : ''} vers « ${folder.name || folder.path} »…`;
  let moved = 0;
  try {
    for (const message of movable) {
      await window.gestionMail.moveMessage(message.id, folder.path);
      moved += 1;
      selectedMessageIds.delete(message.id);
    }
  } finally {
    if (moved) {
      const movedIds = new Set(movable.slice(0, moved).map((message) => message.id));
      messages = messages.filter((message) => !movedIds.has(message.id));
      updateBulkActions();
      renderMessages(searchInput.value);
      resetMessageContent(`${moved} message${moved > 1 ? 's ont' : ' a'} été déplacé${moved > 1 ? 's' : ''}.`);
    }
  }
  statusLine.textContent = `${moved} message${moved > 1 ? 's déplacés' : ' déplacé'} vers « ${folder.name || folder.path} » sur le serveur.`;
}

function enableServerFolderDrop(element, folder) {
  element.addEventListener('dragover', (event) => {
    const types = Array.from(event.dataTransfer.types);
    if (types.includes('application/x-monmail-favorite')) return;
    const hasMessages = types.includes('application/x-monmail-message-ids');
    const hasRemoteFolder = types.includes('application/x-gestionmail-folder');
    if (!activeAccountUsesImap() || (!hasMessages && !hasRemoteFolder)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    element.classList.add('server-folder-drag-over');
  });
  element.addEventListener('dragleave', (event) => {
    if (!element.contains(event.relatedTarget)) element.classList.remove('server-folder-drag-over');
  });
  element.addEventListener('drop', async (event) => {
    if (event.dataTransfer.getData('application/x-monmail-favorite')) return;
    const ids = draggedMessageIds(event);
    const encodedFolder = event.dataTransfer.getData('application/x-gestionmail-folder');
    if (!ids.length && !encodedFolder) return;
    event.preventDefault();
    event.stopPropagation();
    element.classList.remove('server-folder-drag-over');
    try {
      if (ids.length) await moveDraggedMessagesToServer(ids, folder);
      else await moveServerFolderByDrop(JSON.parse(encodedFolder), folder);
    } catch (error) {
      statusLine.textContent = `Déplacement impossible : ${readableError(error)}`;
    }
  });
}

function activeAccountUsesImap() {
  return accounts.find((account) => account.id === selectedAccountId)?.protocol !== 'pop3';
}

function serverFolderDelimiter(folder = null) {
  return folder?.delimiter || folders.find((item) => item.delimiter)?.delimiter || '/';
}

async function reloadServerFolders() {
  folders = await window.gestionMail.listFolders(selectedAccountId);
  renderFolders();
  renderBulkTargets();
}

async function createServerFolder(parentFolder = null) {
  if (!activeAccountUsesImap()) throw new Error('La création de dossiers nécessite un compte IMAP.');
  const delimiter = serverFolderDelimiter(parentFolder);
  const name = window.prompt(parentFolder
    ? `Nom du nouveau dossier dans « ${parentFolder.name || parentFolder.path} » :`
    : 'Nom du nouveau dossier à la racine :');
  if (name === null) return;
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Le nom du dossier est obligatoire.');
  if (cleanName.includes(delimiter)) throw new Error(`Le nom ne peut pas contenir « ${delimiter} ».`);
  const folderPath = parentFolder ? `${parentFolder.path}${delimiter}${cleanName}` : cleanName;
  statusLine.textContent = `Création de « ${folderPath} » sur le serveur…`;
  await window.gestionMail.createRemoteFolder(selectedAccountId, folderPath);
  await reloadServerFolders();
  statusLine.textContent = `Dossier serveur « ${folderPath} » créé.`;
}

async function renameServerFolder(folder) {
  if (!activeAccountUsesImap()) throw new Error('Le renommage de dossiers nécessite un compte IMAP.');
  if (folder.path.toUpperCase() === 'INBOX' || folder.specialUse) throw new Error('Ce dossier système ne peut pas être renommé.');
  const delimiter = serverFolderDelimiter(folder);
  const currentName = folder.name || folder.path.split(delimiter).at(-1);
  const name = window.prompt(`Nouveau nom du dossier « ${currentName} » :`, currentName);
  if (name === null) return;
  const cleanName = name.trim();
  if (!cleanName || cleanName === currentName) return;
  if (cleanName.includes(delimiter)) throw new Error(`Le nom ne peut pas contenir « ${delimiter} ».`);
  const separatorIndex = folder.path.lastIndexOf(delimiter);
  const parentPath = separatorIndex >= 0 ? folder.path.slice(0, separatorIndex + delimiter.length) : '';
  const newPath = `${parentPath}${cleanName}`;
  statusLine.textContent = `Renommage de « ${folder.path} » sur le serveur…`;
  await window.gestionMail.renameRemoteFolder(selectedAccountId, folder.path, newPath, delimiter);
  await applyServerFolderPathChange(folder, newPath, delimiter);
  statusLine.textContent = `Dossier serveur renommé en « ${cleanName} ».`;
}

async function applyServerFolderPathChange(folder, newPath, delimiter) {
  const prefix = `${folder.path}${delimiter}`;
  const favorites = favoritePaths().map((path) => {
    if (path === folder.path) return newPath;
    if (path.startsWith(prefix)) return `${newPath}${path.slice(folder.path.length)}`;
    return path;
  });
  localStorage.setItem(favoriteStorageKey(), JSON.stringify(favorites));
  const selectedWasRenamed = selectedFolder === folder.path || selectedFolder.startsWith(prefix);
  if (selectedWasRenamed) {
    selectedFolder = `${newPath}${selectedFolder.slice(folder.path.length)}`;
    localStorage.setItem(lastFolderStorageKey(selectedAccountId), selectedFolder);
  }
  await reloadServerFolders();
  if (selectedWasRenamed) await selectFolder(selectedFolder, false);
}

async function moveServerFolderByDrop(sourceData, targetFolder = null) {
  if (!activeAccountUsesImap()) throw new Error('Le déplacement de dossiers nécessite un compte IMAP.');
  if (sourceData.accountId !== selectedAccountId) throw new Error('Le dossier appartient à un autre compte.');
  const sourceFolder = folders.find((folder) => folder.path === sourceData.path);
  if (!sourceFolder) throw new Error('Dossier source introuvable.');
  if (sourceFolder.path.toUpperCase() === 'INBOX' || sourceFolder.specialUse) {
    throw new Error('Un dossier système ne peut pas être déplacé.');
  }
  const delimiter = serverFolderDelimiter(sourceFolder);
  const sourcePrefix = `${sourceFolder.path}${delimiter}`;
  if (targetFolder && (targetFolder.path === sourceFolder.path || targetFolder.path.startsWith(sourcePrefix))) {
    throw new Error('Un dossier ne peut pas être déplacé dans lui-même ou dans un de ses sous-dossiers.');
  }
  const leafName = sourceFolder.path.split(delimiter).filter(Boolean).at(-1);
  const newPath = targetFolder ? `${targetFolder.path}${delimiter}${leafName}` : leafName;
  if (newPath === sourceFolder.path) return;
  const destinationLabel = targetFolder ? `« ${targetFolder.name || targetFolder.path} »` : 'la racine';
  statusLine.textContent = `Déplacement de « ${sourceFolder.name || sourceFolder.path} » dans ${destinationLabel}…`;
  await window.gestionMail.renameRemoteFolder(selectedAccountId, sourceFolder.path, newPath, delimiter);
  await applyServerFolderPathChange(sourceFolder, newPath, delimiter);
  statusLine.textContent = `Dossier déplacé dans ${destinationLabel} sur le serveur.`;
}

async function deleteServerFolder(folder) {
  if (!activeAccountUsesImap()) throw new Error('La suppression de dossiers nécessite un compte IMAP.');
  if (folder.path.toUpperCase() === 'INBOX' || folder.specialUse) throw new Error('Ce dossier système ne peut pas être supprimé.');
  if (!window.confirm(`Supprimer « ${folder.name || folder.path} » de la boîte mail d’origine ?\n\nSes messages et ses éventuels sous-dossiers seront supprimés du serveur. Cette action peut être définitive.`)) return;
  const delimiter = serverFolderDelimiter(folder);
  statusLine.textContent = `Suppression de « ${folder.path} » sur le serveur…`;
  await window.gestionMail.deleteRemoteFolder(selectedAccountId, folder.path, delimiter);
  const prefix = `${folder.path}${delimiter}`;
  const favorites = favoritePaths().filter((path) => path !== folder.path && !path.startsWith(prefix));
  localStorage.setItem(favoriteStorageKey(), JSON.stringify(favorites));
  const wasSelected = selectedFolder === folder.path || selectedFolder.startsWith(prefix);
  if (wasSelected) {
    selectedFolder = 'INBOX';
    localStorage.setItem(lastFolderStorageKey(selectedAccountId), 'INBOX');
  }
  await reloadServerFolders();
  if (wasSelected) await selectFolder('INBOX', false);
  statusLine.textContent = `Dossier serveur « ${folder.name || folder.path} » supprimé.`;
}

function showServerFolderContextMenu(event, folder) {
  const isFavorite = favoritePaths().includes(folder.path);
  const protectedFolder = folder.path.toUpperCase() === 'INBOX' || Boolean(folder.specialUse);
  const imapEnabled = activeAccountUsesImap();
  showContextMenu(event, [
    { label: 'Ouvrir le dossier', action: () => selectFolder(folder.path) },
    {
      label: 'Actualiser ce dossier',
      action: async () => {
        if (viewingLocal || selectedFolder !== folder.path) await selectFolder(folder.path);
        await synchroniseCurrentFolder(false);
      }
    },
    { label: isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris', action: () => toggleFavorite(folder.path) },
    { separator: true },
    { label: 'Créer un sous-dossier…', disabled: !imapEnabled, action: () => createServerFolder(folder) },
    { label: 'Créer un dossier à la racine…', disabled: !imapEnabled, action: () => createServerFolder() },
    { label: 'Renommer sur le serveur…', disabled: !imapEnabled || protectedFolder, action: () => renameServerFolder(folder) },
    { label: 'Supprimer du serveur…', disabled: !imapEnabled || protectedFolder, danger: true, action: () => deleteServerFolder(folder) },
    { separator: true },
    { label: 'Copier le dossier complet en local…', action: () => copyRemoteFolderTree({ accountId: selectedAccountId, path: folder.path, name: folder.name || folder.path }) }
  ]);
}

folderList.addEventListener('contextmenu', (event) => {
  if (event.target !== folderList) return;
  showContextMenu(event, [
    { label: 'Créer un dossier sur le serveur…', disabled: !activeAccountUsesImap(), action: () => createServerFolder() }
  ]);
});
folderList.addEventListener('dragover', (event) => {
  if (event.target !== folderList || !activeAccountUsesImap()) return;
  if (Array.from(event.dataTransfer.types).includes('application/x-monmail-favorite')) return;
  if (!Array.from(event.dataTransfer.types).includes('application/x-gestionmail-folder')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  folderList.classList.add('server-folder-root-drag-over');
});
folderList.addEventListener('dragleave', (event) => {
  if (event.target === folderList) folderList.classList.remove('server-folder-root-drag-over');
});
folderList.addEventListener('drop', async (event) => {
  if (event.target !== folderList) return;
  if (event.dataTransfer.getData('application/x-monmail-favorite')) return;
  const encodedFolder = event.dataTransfer.getData('application/x-gestionmail-folder');
  if (!encodedFolder) return;
  event.preventDefault();
  folderList.classList.remove('server-folder-root-drag-over');
  try {
    await moveServerFolderByDrop(JSON.parse(encodedFolder), null);
  } catch (error) {
    statusLine.textContent = `Déplacement impossible : ${readableError(error)}`;
  }
});

function renderFavorites() {
  favoriteList.replaceChildren();
  const selected = favoritePaths()
    .map((path) => folders.find((folder) => folder.path === path && folder.selectable !== false))
    .filter(Boolean);
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
    item.addEventListener('contextmenu', (event) => showServerFolderContextMenu(event, folder));
    enableFolderDrag(item, folder);
    enableFavoriteReorder(item, folder);
    enableServerFolderDrop(item, folder);
    favoriteList.append(item);
  }
}

favoriteList.addEventListener('dragover', (event) => {
  if (event.target !== favoriteList || !Array.from(event.dataTransfer.types).includes('application/x-monmail-favorite')) return;
  event.preventDefault();
  clearFavoriteDropIndicators();
  favoriteList.classList.add('favorite-list-drop-end');
  event.dataTransfer.dropEffect = 'move';
});

favoriteList.addEventListener('dragleave', (event) => {
  if (!favoriteList.contains(event.relatedTarget)) clearFavoriteDropIndicators();
});

favoriteList.addEventListener('drop', (event) => {
  if (event.target !== favoriteList) return;
  const sourcePath = event.dataTransfer.getData('application/x-monmail-favorite');
  if (!sourcePath) return;
  event.preventDefault();
  clearFavoriteDropIndicators();
  reorderFavorite(sourcePath);
});

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
      item.addEventListener('contextmenu', (event) => showServerFolderContextMenu(event, node));
      enableFolderDrag(item, node);
      enableServerFolderDrop(row, node);
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
  const trashFolder = folders.find((folder) => /trash/i.test(folder.specialUse || '') || /corbeille|trash/i.test(folder.name || ''));
  trashFolderButton.disabled = !selectedAccountId || !trashFolder;
  trashFolderButton.title = trashFolder ? `Ouvrir ${trashFolder.name || 'la corbeille'}` : 'Aucun dossier Corbeille détecté';
  trashFolderButton.setAttribute('aria-label', trashFolderButton.title);
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

const localFolderColorChoices = [
  ['', 'Par défaut', '⚪'], ['blue', 'Bleu', '🔵'], ['green', 'Vert', '🟢'],
  ['yellow', 'Jaune', '🟡'], ['orange', 'Orange', '🟠'], ['red', 'Rouge', '🔴'],
  ['purple', 'Violet', '🟣'], ['gray', 'Gris', '⚫']
];

async function changeLocalFolderColor(folder, color) {
  await window.gestionMail.setLocalFolderColor(folder.id, color);
  folder.color = color;
  const stored = localFolders.find((item) => item.id === folder.id);
  if (stored) stored.color = color;
  renderLocalFolders();
  statusLine.textContent = color
    ? `Couleur du dossier « ${folder.name} » modifiée uniquement dans Monmail.`
    : `Couleur du dossier « ${folder.name} » réinitialisée.`;
}

function appendLocalFolderNodes(container, nodes, depth = 0) {
  for (const folder of nodes) {
    const row = document.createElement('div');
    row.className = 'local-folder-row';
    row.dataset.color = folder.color || 'default';
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
    name.className = 'local-folder-name';
    const icon = document.createElement('span');
    icon.className = 'local-folder-icon';
    const nameText = document.createElement('span');
    nameText.textContent = folder.name;
    name.append(icon, nameText);
    const count = document.createElement('span');
    count.className = 'local-count';
    const totalMessageCount = (node) => Number(node.messageCount || 0) + node.children.reduce((total, child) => total + totalMessageCount(child), 0);
    const recursiveCount = totalMessageCount(folder);
    count.textContent = String(recursiveCount);
    count.title = folder.children.length ? `${recursiveCount} messages dans ce dossier et ses sous-dossiers` : `${recursiveCount} messages`;
    item.append(name, count);
    item.addEventListener('click', () => selectLocalFolder(folder));
    item.addEventListener('dblclick', async () => {
      try {
        await window.gestionMail.openLocalFolder(folder.id);
      } catch (error) {
        statusLine.textContent = `Impossible d’ouvrir le dossier Windows : ${readableError(error)}`;
      }
    });
    item.addEventListener('contextmenu', (event) => showContextMenu(event, [
      { label: 'Ouvrir dans Monmail', action: () => selectLocalFolder(folder) },
      { label: 'Ouvrir dans l’Explorateur Windows', action: () => window.gestionMail.openLocalFolder(folder.id) },
      { separator: true },
      { label: 'Renommer…', action: async () => {
        const name = window.prompt('Nouveau nom du dossier :', folder.name);
        if (!name || name.trim() === folder.name) return;
        await window.gestionMail.renameLocalFolder(folder.id, name.trim());
        await loadLocalFolders();
        statusLine.textContent = `Dossier renommé « ${name.trim()} ».`;
      } },
      { label: 'Dupliquer le dossier et son contenu', action: async () => {
        statusLine.textContent = `Duplication de « ${folder.name} »…`;
        const result = await window.gestionMail.duplicateLocalFolder(folder.id);
        await loadLocalFolders();
        statusLine.textContent = `${result.folderCount} dossier${result.folderCount > 1 ? 's' : ''} dupliqué${result.folderCount > 1 ? 's' : ''}.`;
      } },
      { label: 'Créer un sous-dossier…', action: () => createLocalFolder(folder.id) },
      {
        label: 'Déplacer à la racine',
        disabled: folder.parentId === null,
        action: async () => {
          await window.gestionMail.moveLocalFolder(folder.id, null);
          await loadLocalFolders();
        }
      },
      { separator: true },
      ...localFolders.filter((target) => target.id !== folder.id).slice(0, 20).map((target) => ({
        label: `Déplacer dans « ${target.name} »`,
        action: async () => {
          await window.gestionMail.moveLocalFolder(folder.id, target.id);
          await loadLocalFolders();
        }
      })),
      { separator: true },
      { label: 'Couleur du dossier', disabled: true },
      ...localFolderColorChoices.map(([color, label, marker]) => ({
        label: `${folder.color === color ? '✓ ' : ''}${marker} ${label}`,
        action: () => changeLocalFolderColor(folder, color)
      })),
      { separator: true },
      { label: 'Supprimer le dossier et son contenu…', danger: true, action: () => deleteLocalFolder(folder) }
    ]));
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
  const account = accounts.find((item) => item.id === selectedAccountId);
  localSidebarAccount.textContent = account?.email || 'Aucun compte';
  localSidebarAccount.title = account?.email || '';
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

async function copyRemoteFolderTree(source) {
  if (folderCopyInProgress) {
    statusLine.textContent = 'Une copie de dossier est déjà en cours.';
    return;
  }
  folderCopyInProgress = true;
  showFolderCopyProgress({ label: source.name || source.path, detail: 'Analyse de l’arborescence' });
  try {
    statusLine.textContent = `Téléchargement complet de « ${source.name || source.path} » puis copie locale…`;
    const result = await window.gestionMail.copyRemoteFolderToLocal(
      source.accountId || selectedAccountId,
      source.path,
      source.name || source.path
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
  try {
    const source = JSON.parse(encodedFolder);
    await copyRemoteFolderTree(source);
  } catch (error) {
    statusLine.textContent = `Échec de la copie du dossier : ${readableError(error)}`;
  }
});

document.querySelector('#cancel-folder-copy').addEventListener('click', async () => {
  try {
    await window.gestionMail.cancelFolderCopy();
    folderCopyProgressDetail.textContent = 'Annulation demandée…';
  } catch (error) {
    statusLine.textContent = `Annulation impossible : ${readableError(error)}`;
  }
});

function selectedMessages() {
  return messages.filter((message) => selectedMessageIds.has(message.id));
}

async function moveMessagesToTrash(messageIds, { confirmPermanent = true } = {}) {
  const ids = [...new Set(messageIds.map(String))];
  const targets = ids.map((id) => messages.find((message) => message.id === id)).filter(Boolean);
  if (!targets.length) throw new Error('Aucun message à supprimer.');
  const localMessages = targets.filter((message) => message.accountId === '__local__');
  const remoteMessages = targets.filter((message) => message.accountId !== '__local__');
  if (remoteMessages.some((message) => message.accountId !== selectedAccountId)) {
    throw new Error('Les messages doivent appartenir au compte actuellement ouvert.');
  }
  const trashFolder = folders.find((folder) => /trash/i.test(folder.specialUse || '') || /corbeille|trash/i.test(folder.name || ''));
  if (remoteMessages.length && !trashFolder) throw new Error('Aucun dossier Corbeille détecté pour ce compte.');
  const alreadyInTrash = remoteMessages.filter((message) => message.folder === trashFolder?.path);
  const toTrash = remoteMessages.filter((message) => message.folder !== trashFolder?.path);
  if (localMessages.length && !window.confirm(`Supprimer définitivement ${localMessages.length} copie${localMessages.length > 1 ? 's' : ''} locale${localMessages.length > 1 ? 's' : ''} ?`)) return;
  if (alreadyInTrash.length && confirmPermanent && !window.confirm(`Supprimer définitivement ${alreadyInTrash.length} message${alreadyInTrash.length > 1 ? 's' : ''} déjà présent${alreadyInTrash.length > 1 ? 's' : ''} dans la corbeille ?`)) return;
  statusLine.textContent = 'Déplacement vers la corbeille…';
  let processed = 0;
  try {
    for (const message of localMessages) {
      await window.gestionMail.deleteLocalMessage(message.id);
      processed += 1;
    }
    for (const message of toTrash) {
      await window.gestionMail.moveMessage(message.id, trashFolder.path);
      processed += 1;
    }
    for (const message of alreadyInTrash) {
      if (!confirmPermanent) continue;
      await window.gestionMail.deleteRemoteMessage(message.id);
      processed += 1;
    }
  } finally {
    for (const id of ids) selectedMessageIds.delete(id);
    if (ids.includes(openedMessageId)) openedMessageId = null;
    await refreshCurrentMessageList();
    updateBulkActions();
    if (processed) resetMessageContent(processed > 1 ? `${processed} messages ont été traités.` : 'Le message a été déplacé ou supprimé.');
  }
  const ignored = alreadyInTrash.length && !confirmPermanent ? alreadyInTrash.length : 0;
  statusLine.textContent = `${processed} message${processed > 1 ? 's traités' : ' traité'}${ignored ? ` — ${ignored} déjà dans la corbeille` : ''}.`;
}

function renderBulkTargets() {
  bulkTarget.replaceChildren();
  const serverGroup = document.createElement('optgroup');
  serverGroup.label = 'Déplacer sur le serveur';
  for (const folder of folders.filter((item) => item.selectable !== false && item.path !== selectedFolder)) {
    const option = document.createElement('option');
    option.value = `server:${folder.path}`;
    option.textContent = folder.name || folder.path;
    serverGroup.append(option);
  }
  const localGroup = document.createElement('optgroup');
  localGroup.label = 'Copier dans les dossiers locaux';
  for (const folder of localFolders) {
    const option = document.createElement('option');
    option.value = `local:${folder.id}`;
    option.textContent = folder.name;
    localGroup.append(option);
  }
  if (serverGroup.children.length) bulkTarget.append(serverGroup);
  if (localGroup.children.length) bulkTarget.append(localGroup);
}

function updateBulkActions() {
  const count = selectedMessageIds.size;
  bulkActions.hidden = count === 0;
  bulkCount.textContent = `${count} sélectionné${count > 1 ? 's' : ''}`;
  renderBulkTargets();
}

function clearMessageSelection() {
  selectedMessageIds.clear();
  updateBulkActions();
  renderMessages(searchInput.value);
}

async function refreshCurrentMessageList() {
  if (searchScope.value === 'global' && searchInput.value.trim()) messages = await window.gestionMail.searchMessages(searchInput.value.trim());
  else if (viewingLocal) messages = await window.gestionMail.listMessages('__local__', selectedFolder);
  else messages = await window.gestionMail.listMessages(selectedAccountId, selectedFolder);
  renderMessages(searchInput.value);
}

function renderMessages(filter = '') {
  const query = filter.trim().toLocaleLowerCase('fr');
  let visible = query
    ? messages.filter((message) => `${message.sender} ${message.subject} ${message.preview}`.toLocaleLowerCase('fr').includes(query))
    : messages;
  if (currentSettings.groupConversations !== false) {
    const conversations = new Map();
    for (const message of visible) {
      const key = message.conversationKey || String(message.subject || '(sans objet)').replace(/^\s*((re|réf|ref|fw|fwd|tr)\s*:\s*)+/i, '').trim().toLocaleLowerCase('fr');
      const existing = conversations.get(key);
      if (existing) existing.push(message);
      else conversations.set(key, [message]);
    }
    visible = [...conversations.entries()].flatMap(([key, conversation]) => {
      if (conversation.length === 1) return conversation;
      if (expandedConversationKeys.has(key)) return conversation.map((message, index) => ({ ...message, conversationKey: key, conversationGroupCount: index === 0 ? conversation.length : 0, conversationExpanded: true, conversationCount: index === 0 ? conversation.length : 0 }));
      return [{ ...conversation[0], conversationKey: key, conversationGroupCount: conversation.length, conversationCount: conversation.length }];
    });
  }
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
    const wrapper = document.createElement('div');
    wrapper.className = `message-select-row${selectedMessageIds.has(message.id) ? ' selected' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedMessageIds.has(message.id);
    checkbox.setAttribute('aria-label', `Sélectionner ${message.subject || '(Sans objet)'}`);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedMessageIds.add(message.id);
      else selectedMessageIds.delete(message.id);
      wrapper.classList.toggle('selected', checkbox.checked);
      updateBulkActions();
    });
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `message-row${message.isRead ? '' : ' unread'}`;
    row.dataset.id = message.id;
    row.draggable = true;
    row.addEventListener('dragstart', (event) => {
      const draggedIds = selectedMessageIds.has(message.id)
        ? [...selectedMessageIds]
        : [message.id];
      event.dataTransfer.effectAllowed = viewingLocal ? 'copy' : 'copyMove';
      event.dataTransfer.setData('application/x-gestionmail-message', message.id);
      event.dataTransfer.setData('application/x-monmail-message-ids', JSON.stringify(draggedIds));
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
    subject.textContent = `${message.subject || '(Sans objet)'}${message.conversationCount > 1 ? `  ·  ${message.conversationCount} messages` : ''}${message.attachmentCount ? '  📎' : ''}`;
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
    row.addEventListener('contextmenu', (event) => showMessageContextMenu(event, message, row));
    const controls = document.createElement('div');
    controls.className = 'message-select-controls';
    controls.append(checkbox);
    if (message.conversationGroupCount > 1) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'conversation-toggle';
      toggle.textContent = message.conversationExpanded ? '▾' : '▸';
      toggle.title = message.conversationExpanded ? 'Replier la conversation' : `Afficher les ${message.conversationGroupCount} messages`;
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        if (expandedConversationKeys.has(message.conversationKey)) expandedConversationKeys.delete(message.conversationKey);
        else expandedConversationKeys.add(message.conversationKey);
        renderMessages(filter);
      });
      controls.append(toggle);
    }
    wrapper.append(controls, row);
    messageList.append(wrapper);
  }
}

function resetMessageContent(text = 'Sélectionnez un message pour le lire.') {
  openedMessageId = null;
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

function chooseServerDestination(message, actionLabel) {
  const available = folders.filter((folder) => folder.selectable !== false && folder.path !== message.folder);
  if (!available.length) throw new Error('Aucun autre dossier serveur disponible.');
  const choices = available.map((folder, index) => `${index + 1}. ${folder.name || folder.path}`).join('\n');
  const answer = window.prompt(`${actionLabel} : indiquez le numéro du dossier.\n\n${choices}`);
  if (answer === null) return null;
  const index = Number(answer) - 1;
  if (!Number.isInteger(index) || !available[index]) throw new Error('Numéro de dossier invalide.');
  return available[index];
}

async function copyDisplayedRemoteMessage(message) {
  const destination = chooseServerDestination(message, 'Copier le message sur le serveur');
  if (!destination) return;
  statusLine.textContent = `Copie vers « ${destination.name || destination.path} » en cours…`;
  await window.gestionMail.copyRemoteMessage(message.id, destination.path);
  statusLine.textContent = `Message copié sur le serveur dans « ${destination.name || destination.path} ».`;
}

async function moveDisplayedRemoteMessage(message) {
  const destination = chooseServerDestination(message, 'Déplacer le message sur le serveur');
  if (!destination) return;
  await moveDisplayedMessage(message, destination.path, `Déplacé vers « ${destination.name || destination.path} »`);
}

async function deleteDisplayedRemoteMessage(message) {
  if (!window.confirm(`Supprimer définitivement « ${message.subject || '(Sans objet)'} » de la boîte mail d’origine ?\n\nLe message sera supprimé du serveur et disparaîtra également des autres appareils.`)) return;
  statusLine.textContent = 'Suppression définitive sur le serveur…';
  await window.gestionMail.deleteRemoteMessage(message.id);
  messages = messages.filter((item) => item.id !== message.id);
  selectedMessageIds.delete(message.id);
  updateBulkActions();
  renderMessages(searchInput.value);
  resetMessageContent('Le message a été supprimé de la boîte mail d’origine.');
  statusLine.textContent = 'Message supprimé définitivement du serveur.';
}

function showMessageContextMenu(event, message, row) {
  const isLocalMessage = message.accountId === '__local__';
  const messageAccount = accounts.find((account) => account.id === message.accountId);
  const canEditServer = !isLocalMessage && messageAccount?.protocol !== 'pop3';
  const archiveFolder = folders.find((folder) => /archive/i.test(folder.specialUse || '') || /archive/i.test(folder.name || ''));
  const trashFolder = folders.find((folder) => /trash/i.test(folder.specialUse || '') || /corbeille|trash/i.test(folder.name || ''));
  showContextMenu(event, [
    { label: 'Ouvrir le message', action: () => openMessage(message.id, row) },
    { label: 'Ouvrir dans une nouvelle fenêtre', action: () => window.gestionMail.openMessageWindow(message.id) },
    { label: message.isRead ? 'Marquer comme non lu' : 'Marquer comme lu', action: async () => {
      await window.gestionMail.setMessageRead(message.id, !message.isRead);
      message.isRead = message.isRead ? 0 : 1;
      renderMessages(searchInput.value);
    } },
    {
      label: selectedMessageIds.has(message.id) ? 'Retirer de la sélection' : 'Ajouter à la sélection',
      action: () => {
        if (selectedMessageIds.has(message.id)) selectedMessageIds.delete(message.id);
        else selectedMessageIds.add(message.id);
        updateBulkActions();
        renderMessages(searchInput.value);
      }
    },
    { separator: true },
    { label: 'Conserver une copie en local…', hidden: isLocalMessage, action: () => openCopyLocalDialog(message) },
    { label: 'Copier vers un dossier du serveur…', hidden: isLocalMessage, disabled: !canEditServer, action: () => copyDisplayedRemoteMessage(message) },
    { label: 'Déplacer vers un dossier du serveur…', hidden: isLocalMessage, disabled: !canEditServer, action: () => moveDisplayedRemoteMessage(message) },
    { label: 'Archiver', hidden: isLocalMessage, disabled: !archiveFolder || archiveFolder.path === selectedFolder, action: () => moveDisplayedMessage(message, archiveFolder?.path, 'Archivé') },
    { label: 'Placer dans la corbeille…', hidden: isLocalMessage, disabled: !trashFolder || trashFolder.path === selectedFolder, danger: true, action: () => moveDisplayedMessage(message, trashFolder?.path, 'Déplacé dans la corbeille', true) },
    { label: 'Supprimer définitivement du serveur…', hidden: isLocalMessage, disabled: !canEditServer, danger: true, action: () => deleteDisplayedRemoteMessage(message) },
    {
      label: 'Ouvrir son dossier Windows',
      hidden: !isLocalMessage,
      action: () => window.gestionMail.openLocalFolder(Number(String(message.folder).replace('local:', '')))
    },
    {
      label: 'Supprimer la copie locale…',
      hidden: !isLocalMessage,
      danger: true,
      action: async () => {
        if (!window.confirm(`Supprimer définitivement « ${message.subject || '(Sans objet)'} » de ce dossier local ?`)) return;
        await window.gestionMail.deleteLocalMessage(message.id);
        messages = messages.filter((item) => item.id !== message.id);
        selectedMessageIds.delete(message.id);
        updateBulkActions();
        renderMessages(searchInput.value);
        resetMessageContent('La copie locale a été supprimée.');
      }
    }
  ]);
}

async function selectAccount(accountId) {
  selectedAccountId = accountId;
  selectedFolder = localStorage.getItem(lastFolderStorageKey(accountId)) || 'INBOX';
  viewingLocal = false;
  localStorage.setItem(lastAccountStorageKey, accountId);
  renderAccounts();
  await loadTodos();
  welcome.hidden = true;
  mailView.hidden = false;
  syncButton.disabled = false;
  composeButton.disabled = false;
  searchInput.disabled = false;
  const account = accounts.find((item) => item.id === accountId);
  try {
    const cached = JSON.parse(localStorage.getItem(folderCacheStorageKey(accountId)) || '[]');
    folders = Array.isArray(cached) && cached.length ? cached : [{ path: 'INBOX', name: 'Boîte de réception', selectable: true }];
  } catch { folders = [{ path: 'INBOX', name: 'Boîte de réception', selectable: true }]; }
  if (!folders.some((folder) => folder.path === selectedFolder && folder.selectable !== false) && folders.length) {
    selectedFolder = folders.find((folder) => folder.selectable !== false)?.path || 'INBOX';
  }
  renderFolders();
  await loadLocalFolders();
  await selectFolder(selectedFolder, false);
  statusLine.textContent = `Messages locaux affichés — actualisation différée des dossiers de ${account?.email || ''}…`;
  setTimeout(async () => {
    try {
      const remoteFolders = await window.gestionMail.listFolders(accountId);
      localStorage.setItem(folderCacheStorageKey(accountId), JSON.stringify(remoteFolders));
      if (selectedAccountId !== accountId || viewingLocal) return;
      folders = remoteFolders;
      if (!folders.some((folder) => folder.path === selectedFolder && folder.selectable !== false)) selectedFolder = folders.find((folder) => folder.selectable !== false)?.path || 'INBOX';
      renderFolders();
      statusLine.textContent = `${messages.length} message${messages.length > 1 ? 's' : ''} localement — dossiers serveur actualisés.`;
    } catch (error) {
      if (selectedAccountId === accountId && !viewingLocal) statusLine.textContent = `Messages locaux disponibles — connexion aux dossiers différée : ${readableError(error)}`;
    }
  }, 50);
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
    const [settings, appVersion] = await Promise.all([
      window.gestionMail.getSettings(),
      window.gestionMail.getAppVersion()
    ]);
    currentSettings = settings;
    document.querySelector('#app-version').textContent = `Monmail — version ${appVersion}`;
    renderAccounts();
    settingsForm.elements.autoSyncMinutes.value = String(currentSettings.autoSyncMinutes);
    settingsForm.elements.fontSize.value = String(currentSettings.fontSize);
    settingsForm.elements.interfaceColor.value = currentSettings.interfaceColor || '#6ee7d2';
    settingsForm.elements.notificationsEnabled.checked = Boolean(currentSettings.notificationsEnabled);
    settingsForm.elements.minimizeToTray.checked = Boolean(currentSettings.minimizeToTray);
    settingsForm.elements.groupConversations.checked = currentSettings.groupConversations !== false;
    settingsForm.elements.autoUpdateEnabled.checked = currentSettings.autoUpdateEnabled !== false;
    const metrics = await window.gestionMail.getStartupPerformance();
    document.querySelector('#startup-performance').textContent = metrics.windowReadyMs === null
      ? 'Mesure du démarrage en cours…'
      : `Démarrage de la fenêtre : ${metrics.windowReadyMs} ms — dernière analyse locale : ${metrics.localScanMs ?? 'en attente'} ms (${metrics.localScanFiles || 0} nouveau(x) fichier(s)).`;
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
  syncButton.textContent = '◌';
  syncButton.title = 'Synchronisation en cours…';
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
    statusLine.textContent = `${result.imported} message${result.imported > 1 ? 's' : ''} vérifié${result.imported > 1 ? 's' : ''} — ${result.total} sur le serveur${result.removed ? ` — ${result.removed} ancien${result.removed > 1 ? 's' : ''} retiré${result.removed > 1 ? 's' : ''} du cache` : ''}${result.sorted ? ` — ${result.sorted} trié${result.sorted > 1 ? 's' : ''} automatiquement` : ''}${automatic ? ' — actualisation automatique' : ''}`;
  } catch (error) {
    statusLine.textContent = `Échec${automatic ? ' de l’actualisation automatique' : ''} : ${readableError(error)}`;
  } finally {
    syncInProgress = false;
    syncButton.disabled = !selectedAccountId || viewingLocal;
    syncButton.textContent = '↻';
    syncButton.title = 'Actualiser';
  }
}

async function selectFolder(folderPath, updateStatus = true) {
  selectedMessageIds.clear();
  updateBulkActions();
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
  const accountId = selectedAccountId;
  if (!accountId) {
    localFolders = [];
    renderLocalFolders();
    return;
  }
  const foldersForAccount = await window.gestionMail.listLocalFolders(accountId);
  if (selectedAccountId !== accountId) return;
  localFolders = foldersForAccount;
  renderLocalFolders();
}

async function selectLocalFolder(folder) {
  selectedMessageIds.clear();
  updateBulkActions();
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
  if (!selectedAccountId) {
    statusLine.textContent = 'Sélectionnez un compte avant de créer un dossier local.';
    return Promise.resolve(null);
  }
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
    await window.gestionMail.deleteLocalFolderTree(folder.id);
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
    openedMessageId = messageId;
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
    reply.className = 'secondary icon-action';
    reply.textContent = '↩';
    reply.title = 'Répondre';
    reply.setAttribute('aria-label', 'Répondre');
    reply.disabled = !selectedAccountId;
    reply.addEventListener('click', () => openComposer({
      to: extractEmail(message.sender),
      subject: prefixedSubject('Re', message.subject),
      body: `\n\n--- Message d’origine ---\nDe : ${message.sender || ''}\nDate : ${message.receivedAt ? new Date(message.receivedAt).toLocaleString('fr-FR') : ''}\nObjet : ${message.subject || ''}\n\n${message.textBody || ''}`
    }));
    const forward = document.createElement('button');
    forward.type = 'button';
    forward.className = 'secondary icon-action';
    forward.textContent = '→';
    forward.title = 'Transférer';
    forward.setAttribute('aria-label', 'Transférer');
    forward.disabled = !selectedAccountId;
    forward.addEventListener('click', () => openComposer({
      subject: prefixedSubject('Tr', message.subject),
      body: `\n\n--- Message transféré ---\nDe : ${message.sender || ''}\nÀ : ${message.recipients || ''}\nDate : ${message.receivedAt ? new Date(message.receivedAt).toLocaleString('fr-FR') : ''}\nObjet : ${message.subject || ''}\n\n${message.textBody || ''}`
    }));
    const markUnread = document.createElement('button');
    markUnread.type = 'button';
    markUnread.className = 'secondary icon-action';
    markUnread.textContent = '●';
    markUnread.title = 'Marquer comme non lu';
    markUnread.setAttribute('aria-label', 'Marquer comme non lu');
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
    addSelectedContacts.className = 'secondary icon-action';
    addSelectedContacts.hidden = true;
    const createGroupFromMessage = document.createElement('button');
    createGroupFromMessage.type = 'button';
    createGroupFromMessage.className = 'secondary icon-action';
    createGroupFromMessage.hidden = true;
    const updateAddressActions = () => {
      const count = selectedHeaderAddresses.size;
      addSelectedContacts.hidden = count === 0;
      addSelectedContacts.textContent = `♙＋${count}`;
      addSelectedContacts.title = `Ajouter ${count} adresse${count > 1 ? 's' : ''} aux contacts`;
      addSelectedContacts.setAttribute('aria-label', addSelectedContacts.title);
      createGroupFromMessage.hidden = count < 2;
      createGroupFromMessage.textContent = `♟＋${count}`;
      createGroupFromMessage.title = `Créer un groupe avec ${count} adresse${count > 1 ? 's' : ''}`;
      createGroupFromMessage.setAttribute('aria-label', createGroupFromMessage.title);
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
      removeLocal.className = 'secondary danger-action icon-action';
      removeLocal.textContent = '⌫';
      removeLocal.title = 'Supprimer la copie locale';
      removeLocal.setAttribute('aria-label', 'Supprimer la copie locale');
      removeLocal.addEventListener('click', () => deleteDisplayedLocalMessage(message));
      actions.append(removeLocal);
    } else {
      const copyLocal = document.createElement('button');
      copyLocal.type = 'button';
      copyLocal.className = 'secondary icon-action';
      copyLocal.textContent = '↓';
      copyLocal.title = 'Conserver en local';
      copyLocal.setAttribute('aria-label', 'Conserver en local');
      copyLocal.addEventListener('click', () => openCopyLocalDialog(message));
      actions.append(copyLocal);
    }
    if (!viewingLocal && selectedAccount?.protocol === 'imap') {
      const archiveFolder = specialFolder('\\Archive', '\\All');
      const trashFolder = specialFolder('\\Trash');
      const archive = document.createElement('button');
      archive.type = 'button';
      archive.className = 'secondary icon-action';
      archive.textContent = '▣';
      archive.disabled = !archiveFolder || archiveFolder.path === selectedFolder;
      archive.title = archiveFolder ? `Déplacer vers ${archiveFolder.name}` : 'Aucun dossier d’archives détecté';
      archive.setAttribute('aria-label', archive.title);
      archive.addEventListener('click', () => moveDisplayedMessage(message, archiveFolder?.path, 'Archivé'));
      const trash = document.createElement('button');
      trash.type = 'button';
      trash.className = 'secondary danger-action icon-action';
      trash.textContent = '⌫';
      trash.disabled = !trashFolder || trashFolder.path === selectedFolder;
      trash.title = trashFolder ? `Déplacer vers ${trashFolder.name}` : 'Aucun dossier de corbeille détecté';
      trash.setAttribute('aria-label', trash.title);
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
        const item = document.createElement('div');
        item.className = 'attachment-item';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'attachment-button';
        button.textContent = `📎 ${attachment.filename} (${formatSize(attachment.size)})`;
        button.title = 'Ouvrir avec l’application Windows par défaut';
        button.addEventListener('click', async () => {
          try {
            statusLine.textContent = `Ouverture de ${attachment.filename}…`;
            await window.gestionMail.openAttachment(message.id, attachment.attachmentIndex);
            statusLine.textContent = `Pièce jointe ouverte : ${attachment.filename}`;
          } catch (error) {
            statusLine.textContent = `Échec : ${readableError(error)}`;
          }
        });
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'attachment-save-button';
        save.textContent = '⇩';
        save.title = 'Enregistrer la pièce jointe dans Téléchargements';
        save.addEventListener('click', async () => {
          try {
            const result = await window.gestionMail.saveAttachment(message.id, attachment.attachmentIndex);
            if (result.saved) statusLine.textContent = `Pièce jointe enregistrée : ${result.path}`;
          } catch (error) {
            statusLine.textContent = `Échec : ${readableError(error)}`;
          }
        });
        item.append(button, save);
        attachments.append(item);
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
  else {
    await loadTodos();
    statusLine.textContent = 'Aucun compte configuré';
  }
}

document.querySelector('#add-account').addEventListener('click', () => {
  settingsDialog.close();
  openAccountDialog();
});
document.querySelector('#empty-add-account').addEventListener('click', () => openAccountDialog());
document.querySelector('#choose-account-local-directory').addEventListener('click', async () => {
  try {
    const directory = await window.gestionMail.chooseAccountLocalDirectory(accountForm.elements.localDirectory.value);
    if (directory) accountForm.elements.localDirectory.value = directory;
  } catch (error) {
    accountError.textContent = readableError(error);
  }
});
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
accountForm.elements.authType.addEventListener('change', updateAccountAuthFields);
accountForm.elements.oauthProvider.addEventListener('change', () => applyOAuthProviderDefaults(true));
document.querySelector('#connect-oauth').addEventListener('click', async () => {
  const status = document.querySelector('#oauth-status');
  status.textContent = 'Ouverture du navigateur et attente de l’autorisation…';
  try {
    pendingOAuthTokens = await window.gestionMail.authorizeOAuth({
      provider: accountForm.elements.oauthProvider.value,
      clientId: accountForm.elements.oauthClientId.value,
      tenant: accountForm.elements.oauthTenant.value,
      email: accountForm.elements.email.value
    });
    status.textContent = 'Compte OAuth2 connecté. Vous pouvez tester et enregistrer.';
  } catch (error) {
    pendingOAuthTokens = null;
    status.textContent = readableError(error);
  }
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
    pendingOAuthTokens = null;
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
    `Supprimer ${account.email} de Monmail ?\n\nLes copies locales seront supprimées, mais aucun message ne sera supprimé du serveur.`
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
composeForm.addEventListener('input', queueDraftSave);
saveDraftButton.addEventListener('click', async () => {
  clearTimeout(draftSaveTimer);
  saveDraftButton.disabled = true;
  composeDraftStatus.textContent = 'Enregistrement…';
  composeError.textContent = '';
  try {
    const saved = await saveCurrentDraft();
    composeDraftStatus.textContent = saved ? 'Brouillon enregistré' : 'Ajoutez du contenu au message';
  } catch (error) {
    composeDraftStatus.textContent = '';
    composeError.textContent = `Impossible d’enregistrer le brouillon : ${readableError(error)}`;
  } finally {
    saveDraftButton.disabled = false;
  }
});
document.querySelector('#close-compose').addEventListener('click', async () => {
  clearTimeout(draftSaveTimer);
  try {
    await saveCurrentDraft();
    composeDialog.close();
    if (currentDraftId) statusLine.textContent = 'Brouillon enregistré.';
  } catch (error) {
    composeError.textContent = `Impossible d’enregistrer le brouillon : ${readableError(error)}`;
  }
});
document.querySelector('#cancel-compose').addEventListener('click', async () => {
  clearTimeout(draftSaveTimer);
  if (currentDraftId) await window.gestionMail.deleteDraft(currentDraftId).catch(() => undefined);
  currentDraftId = null;
  composeForm.reset();
  resetComposeRecipients();
  resetComposeBody();
  composeAttachments = [];
  renderComposeAttachments();
  composeDraftStatus.textContent = '';
  composeDialog.close();
  await loadDrafts().catch(() => undefined);
});
document.querySelector('#choose-attachments').addEventListener('click', async () => {
  try {
    const chosen = await window.gestionMail.chooseAttachments();
    for (const attachment of chosen) {
      if (!composeAttachments.some((item) => item.path === attachment.path)) composeAttachments.push(attachment);
    }
    renderComposeAttachments();
    queueDraftSave();
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
    const folder = await window.gestionMail.createLocalFolder(selectedAccountId, localFolderName.value, parentId);
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
document.querySelector('#drafts-button').addEventListener('click', async () => {
  try {
    await loadDrafts();
    draftError.textContent = '';
    draftsDialog.showModal();
    renderDrafts();
  } catch (error) {
    statusLine.textContent = `Impossible d’ouvrir les brouillons : ${readableError(error)}`;
  }
});
trashFolderButton.addEventListener('click', async () => {
  const trashFolder = folders.find((folder) => /trash/i.test(folder.specialUse || '') || /corbeille|trash/i.test(folder.name || ''));
  if (!trashFolder) {
    statusLine.textContent = 'Aucun dossier Corbeille détecté pour ce compte.';
    return;
  }
  await selectFolder(trashFolder.path);
});
trashFolderButton.addEventListener('dragover', (event) => {
  const types = Array.from(event.dataTransfer.types);
  if (trashFolderButton.disabled || (!types.includes('application/x-monmail-message-ids') && !types.includes('application/x-gestionmail-message'))) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'move';
  trashFolderButton.classList.add('mail-drag-over');
});
trashFolderButton.addEventListener('dragleave', () => trashFolderButton.classList.remove('mail-drag-over'));
trashFolderButton.addEventListener('drop', async (event) => {
  const ids = draggedMessageIds(event);
  if (!ids.length) return;
  event.preventDefault();
  event.stopPropagation();
  trashFolderButton.classList.remove('mail-drag-over');
  try {
    await moveMessagesToTrash(ids, { confirmPermanent: false });
  } catch (error) {
    statusLine.textContent = `Déplacement vers la corbeille impossible : ${readableError(error)}`;
  }
});
document.querySelector('#close-drafts').addEventListener('click', () => draftsDialog.close());
document.querySelector('#open-rules').addEventListener('click', () => openRulesDialog().catch((error) => {
  settingsError.textContent = readableError(error);
}));
document.querySelector('#close-rules').addEventListener('click', () => rulesDialog.close());
document.querySelector('#reset-rule').addEventListener('click', resetRuleForm);
ruleTargetType.addEventListener('change', renderRuleTargets);
ruleAccount.addEventListener('change', async () => {
  try {
    ruleServerFolders = ruleAccount.value === selectedAccountId ? folders : await window.gestionMail.listFolders(ruleAccount.value);
    renderRuleTargets();
  } catch (error) {
    ruleError.textContent = readableError(error);
  }
});
ruleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  ruleError.textContent = 'Enregistrement…';
  try {
    const values = Object.fromEntries(new FormData(ruleForm).entries());
    values.enabled = ruleForm.elements.enabled.checked;
    const saved = await window.gestionMail.saveMailRule(values);
    const index = mailRules.findIndex((rule) => rule.id === saved.id);
    if (index >= 0) mailRules[index] = saved;
    else mailRules.push(saved);
    resetRuleForm();
    renderRules();
    ruleError.textContent = 'Règle enregistrée. Elle sera appliquée à la prochaine relève.';
  } catch (error) {
    ruleError.textContent = readableError(error);
  }
});
document.querySelector('#todo-button').addEventListener('click', async () => {
  try {
    await loadTodos();
    todoError.textContent = '';
    todoDialog.showModal();
    renderTodos();
  } catch (error) {
    statusLine.textContent = `Impossible d’ouvrir la TODO : ${readableError(error)}`;
  }
});
document.querySelector('#close-todo').addEventListener('click', () => todoDialog.close());
document.querySelectorAll('[data-todo-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    todoFilter = button.dataset.todoFilter;
    document.querySelectorAll('[data-todo-filter]').forEach((item) => item.classList.toggle('active', item === button));
    renderTodos();
  });
});
todoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  todoError.textContent = '';
  try {
    const saved = await window.gestionMail.saveTodo(selectedAccountId, Object.fromEntries(new FormData(todoForm).entries()));
    todos.unshift(saved);
    todoForm.reset();
    todoForm.elements.category.value = 'Général';
    updateTodoCount();
    renderTodos();
    todoForm.elements.title.focus();
  } catch (error) {
    todoError.textContent = readableError(error);
  }
});
document.querySelector('#contacts-button').addEventListener('click', openContactsDialog);
document.querySelector('#close-contacts').addEventListener('click', () => contactsDialog.close());
document.querySelector('#new-contact').addEventListener('click', resetContactForm);
document.querySelector('#import-contacts').addEventListener('click', async () => {
  contactError.textContent = 'Import en cours…';
  try {
    const result = await window.gestionMail.importContacts();
    if (!result.imported) { contactError.textContent = ''; return; }
    await loadContacts();
    renderContacts(contactSearch.value);
    contactError.textContent = `${result.count} contact(s) importé(s) ou actualisé(s).`;
  } catch (error) {
    contactError.textContent = readableError(error);
  }
});
document.querySelector('#export-contacts').addEventListener('click', async () => {
  contactError.textContent = 'Export en cours…';
  try {
    const format = document.querySelector('#contact-export-format').value;
    const result = await window.gestionMail.exportContacts(format);
    contactError.textContent = result.exported ? `${result.count} contact(s) exporté(s).` : '';
  } catch (error) {
    contactError.textContent = readableError(error);
  }
});
document.querySelector('#merge-contacts').addEventListener('click', async () => {
  if (!window.confirm('Fusionner les contacts ayant la même adresse e-mail ? Les groupes seront conservés.')) return;
  contactError.textContent = 'Fusion en cours…';
  try {
    const result = await window.gestionMail.mergeDuplicateContacts();
    await loadContacts();
    renderContacts(contactSearch.value);
    contactError.textContent = result.merged ? `${result.merged} doublon(s) fusionné(s).` : 'Aucun doublon trouvé.';
  } catch (error) {
    contactError.textContent = readableError(error);
  }
});
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
  contactGroupError.textContent = pendingGroupId ? 'Modification en cours…' : 'Création en cours…';
  try {
    const memberCount = pendingGroupContactIds.length;
    const createdMessage = contactGroupCreatedMessage;
    const editedGroupId = pendingGroupId;
    await window.gestionMail.saveContactGroup(name, pendingGroupContactIds, editedGroupId);
    selectedContactIds.clear();
    await loadContacts();
    renderContacts(contactSearch.value, contactForm.elements.id.value);
    closeContactGroupDialog();
    const message = createdMessage || `Groupe « ${name} » ${editedGroupId ? 'modifié' : 'créé'} avec ${memberCount} contacts.`;
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
settingsForm.elements.interfaceColor.addEventListener('input', (event) => applyInterfaceColor(event.target.value));
settingsDialog.addEventListener('close', () => applyInterfaceColor(currentSettings.interfaceColor));
settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsError.textContent = 'Enregistrement des paramètres…';
  saveSettingsButton.disabled = true;
  try {
    const values = {
      autoSyncMinutes: Number(settingsForm.elements.autoSyncMinutes.value),
      fontSize: Number(settingsForm.elements.fontSize.value),
      interfaceColor: settingsForm.elements.interfaceColor.value,
      notificationsEnabled: settingsForm.elements.notificationsEnabled.checked,
      minimizeToTray: settingsForm.elements.minimizeToTray.checked,
      groupConversations: settingsForm.elements.groupConversations.checked,
      autoUpdateEnabled: settingsForm.elements.autoUpdateEnabled.checked
    };
    const result = await window.gestionMail.saveSettings(values);
    currentSettings = result.settings;
    applyInterfaceFontSize(currentSettings.fontSize);
    applyInterfaceColor(currentSettings.interfaceColor);
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

document.querySelector('#create-backup').addEventListener('click', async () => {
  settingsError.textContent = 'Création de la sauvegarde complète…';
  try {
    const result = await window.gestionMail.createBackup();
    settingsError.textContent = result.created ? `Sauvegarde créée : ${result.path}` : '';
  } catch (error) {
    settingsError.textContent = readableError(error);
  }
});

document.querySelector('#restore-backup').addEventListener('click', async () => {
  if (!window.confirm('Restaurer une sauvegarde complète ? Monmail redémarrera et conservera une copie des données actuelles.')) return;
  settingsError.textContent = 'Sélection de la sauvegarde à restaurer…';
  try {
    const result = await window.gestionMail.restoreBackup();
    settingsError.textContent = result.scheduled ? 'Restauration programmée, redémarrage…' : '';
  } catch (error) {
    settingsError.textContent = readableError(error);
  }
});

function showUpdateStatus(status) {
  document.querySelector('#update-status').textContent = status.message || '';
  document.querySelector('#download-update').hidden = status.state !== 'available';
  document.querySelector('#install-update').hidden = status.state !== 'downloaded';
}
window.gestionMail.onUpdateStatus(showUpdateStatus);
document.querySelector('#check-updates').addEventListener('click', async () => {
  try { showUpdateStatus(await window.gestionMail.checkForUpdates()); }
  catch (error) { showUpdateStatus({ state: 'error', message: readableError(error) }); }
});
document.querySelector('#download-update').addEventListener('click', async () => {
  try { showUpdateStatus({ state: 'downloading', message: 'Téléchargement de la mise à jour…' }); await window.gestionMail.downloadUpdate(); }
  catch (error) { showUpdateStatus({ state: 'error', message: readableError(error) }); }
});
document.querySelector('#install-update').addEventListener('click', async () => {
  if (!window.confirm('Installer la mise à jour téléchargée et redémarrer Monmail ?')) return;
  try { await window.gestionMail.installUpdate(); }
  catch (error) { showUpdateStatus({ state: 'error', message: readableError(error) }); }
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
  if (!composeForm.elements.subject.value.trim() && !window.confirm('Ce message n’a pas d’objet. Voulez-vous vraiment l’envoyer sans objet ?')) {
    composeError.textContent = 'Envoi annulé : vous pouvez ajouter un objet.';
    composeForm.elements.subject.focus();
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
    if (currentDraftId) await window.gestionMail.deleteDraft(currentDraftId);
    currentDraftId = null;
    composeForm.reset();
    resetComposeRecipients();
    resetComposeBody();
    composeAttachments = [];
    renderComposeAttachments();
    composeDraftStatus.textContent = '';
    await Promise.all([loadDrafts(), loadLocalFolders()]);
    composeDialog.close();
    statusLine.textContent = 'Message envoyé et copie conservée dans « Envoyés ».';
  } catch (error) {
    composeError.textContent = readableError(error);
  } finally {
    sendButton.disabled = false;
  }
});

async function setSelectedMessagesRead(isRead) {
  const selected = selectedMessages();
  for (const message of selected) await window.gestionMail.setMessageRead(message.id, isRead);
  selectedMessageIds.clear();
  await refreshCurrentMessageList();
  updateBulkActions();
}

document.querySelector('#bulk-read').addEventListener('click', () => setSelectedMessagesRead(true).catch((error) => {
  statusLine.textContent = readableError(error);
}));
document.querySelector('#bulk-unread').addEventListener('click', () => setSelectedMessagesRead(false).catch((error) => {
  statusLine.textContent = readableError(error);
}));
document.querySelector('#bulk-clear').addEventListener('click', clearMessageSelection);
document.querySelector('#bulk-apply-target').addEventListener('click', async () => {
  const selected = selectedMessages();
  if (!selected.length || !bulkTarget.value) return;
  const separatorIndex = bulkTarget.value.indexOf(':');
  const targetType = bulkTarget.value.slice(0, separatorIndex);
  const targetValue = bulkTarget.value.slice(separatorIndex + 1);
  try {
    if (targetType === 'local') {
      for (const message of selected) await window.gestionMail.copyMessageToLocal(message.id, Number(targetValue));
      statusLine.textContent = `${selected.length} message${selected.length > 1 ? 's' : ''} copié${selected.length > 1 ? 's' : ''} localement.`;
      await loadLocalFolders();
    } else {
      if (selected.some((message) => message.accountId === '__local__' || message.accountId !== selectedAccountId)) {
        throw new Error('Le déplacement serveur nécessite des messages du compte actuellement ouvert.');
      }
      for (const message of selected) await window.gestionMail.moveMessage(message.id, targetValue);
      statusLine.textContent = `${selected.length} message${selected.length > 1 ? 's' : ''} déplacé${selected.length > 1 ? 's' : ''}.`;
    }
    selectedMessageIds.clear();
    await refreshCurrentMessageList();
    updateBulkActions();
  } catch (error) {
    statusLine.textContent = `Action multiple impossible : ${readableError(error)}`;
  }
});
document.querySelector('#bulk-archive').addEventListener('click', async () => {
  const archive = folders.find((folder) => /archive/i.test(folder.specialUse || '') || /archive/i.test(folder.name || ''));
  if (!archive) {
    statusLine.textContent = 'Aucun dossier d’archives détecté pour ce compte.';
    return;
  }
  bulkTarget.value = `server:${archive.path}`;
  document.querySelector('#bulk-apply-target').click();
});
document.querySelector('#bulk-trash').addEventListener('click', async () => {
  const selected = selectedMessages();
  if (!selected.length) return;
  try {
    await moveMessagesToTrash(selected.map((message) => message.id));
  } catch (error) {
    statusLine.textContent = `Suppression impossible : ${readableError(error)}`;
  }
});

async function runMessageSearch() {
  clearTimeout(globalSearchTimer);
  advancedSearchActive = false;
  const query = searchInput.value.trim();
  if (searchScope.value === 'folder') {
    renderMessages(query);
    return;
  }
  selectedMessageIds.clear();
  updateBulkActions();
  if (!query) {
    await refreshCurrentMessageList();
    return;
  }
  statusLine.textContent = 'Recherche dans tous les messages…';
  messages = await window.gestionMail.searchMessages(query);
  renderMessages('');
  statusLine.textContent = `${messages.length} résultat${messages.length > 1 ? 's' : ''} dans tous les comptes et dossiers locaux.`;
}

document.querySelector('#advanced-search-button').addEventListener('click', () => {
  advancedSearchError.textContent = '';
  advancedSearchDialog.showModal();
});
document.querySelector('#close-advanced-search').addEventListener('click', () => advancedSearchDialog.close());
document.querySelector('#cancel-advanced-search').addEventListener('click', () => advancedSearchDialog.close());
document.querySelector('#reset-advanced-search').addEventListener('click', () => advancedSearchForm.reset());
advancedSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  advancedSearchError.textContent = 'Recherche en cours…';
  try {
    const values = Object.fromEntries(new FormData(advancedSearchForm).entries());
    values.hasAttachments = values.hasAttachments === 'yes' ? true : values.hasAttachments === 'no' ? false : '';
    messages = await window.gestionMail.searchMessages(values);
    advancedSearchActive = true;
    searchScope.value = 'global';
    searchInput.value = values.query || '';
    selectedMessageIds.clear();
    updateBulkActions();
    renderMessages('');
    advancedSearchDialog.close();
    statusLine.textContent = `${messages.length} résultat${messages.length > 1 ? 's' : ''} pour la recherche avancée.`;
  } catch (error) {
    advancedSearchError.textContent = readableError(error);
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(globalSearchTimer);
  globalSearchTimer = setTimeout(() => runMessageSearch().catch((error) => {
    statusLine.textContent = `Recherche impossible : ${readableError(error)}`;
  }), 250);
});
searchScope.addEventListener('change', () => runMessageSearch().catch((error) => {
  statusLine.textContent = `Recherche impossible : ${readableError(error)}`;
}));

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
  applyInterfaceFontSize(currentSettings.fontSize);
  applyInterfaceColor(currentSettings.interfaceColor);
  autoSyncSelect.value = String(currentSettings.autoSyncMinutes);
  configureAutoSync();
  await Promise.all([loadContacts(), loadDrafts(), loadAccounts()]);
}

initialiseApplication().catch((error) => {
  statusLine.textContent = `Erreur : ${readableError(error)}`;
});
