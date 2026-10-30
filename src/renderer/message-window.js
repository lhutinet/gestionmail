const container = document.querySelector('#standalone-message');
const groupDialog = document.querySelector('#group-dialog');
const groupForm = document.querySelector('#group-form');
const groupName = document.querySelector('#group-name');
const groupSummary = document.querySelector('#group-summary');
const groupError = document.querySelector('#group-error');
let pendingGroupContactIds = [];

function formatSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function readableError(error) {
  return error?.message || String(error || 'Erreur inconnue');
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

function createAddressLine(labelText, value, selected, updateActions) {
  const line = document.createElement('div');
  line.className = 'message-address-line';
  const label = document.createElement('span');
  label.className = 'message-address-label';
  label.textContent = `${labelText} :`;
  const values = document.createElement('div');
  values.className = 'message-addresses';
  for (const address of extractAddresses(value)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'address-chip';
    chip.textContent = address.name !== address.email ? `${address.name} <${address.email}>` : address.email;
    chip.addEventListener('click', () => {
      const key = address.email.toLocaleLowerCase('en');
      if (selected.has(key)) {
        selected.delete(key);
        chip.classList.remove('selected');
      } else {
        selected.set(key, address);
        chip.classList.add('selected');
      }
      updateActions();
    });
    values.append(chip);
  }
  line.append(label, values);
  return line;
}

async function ensureContacts(addresses) {
  const existing = await window.gestionMail.listContacts();
  const result = [];
  for (const address of addresses) {
    let contact = existing.find((item) => item.email.toLocaleLowerCase('en') === address.email.toLocaleLowerCase('en'));
    if (!contact) {
      contact = await window.gestionMail.saveContact(address);
      existing.push(contact);
    }
    result.push(contact);
  }
  return result;
}

function closeGroupDialog() {
  pendingGroupContactIds = [];
  groupError.textContent = '';
  if (groupDialog.open) groupDialog.close();
}

function openGroupDialog(contactIds) {
  const ids = [...new Set(contactIds.map(String).filter(Boolean))];
  if (ids.length < 2) return;
  pendingGroupContactIds = ids;
  groupForm.reset();
  groupError.textContent = '';
  groupSummary.textContent = `${ids.length} contacts sélectionnés`;
  groupDialog.showModal();
  groupName.focus();
}

document.querySelector('#close-group').addEventListener('click', closeGroupDialog);
document.querySelector('#cancel-group').addEventListener('click', closeGroupDialog);
groupDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeGroupDialog();
});
groupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = groupName.value.trim();
  if (!name) {
    groupError.textContent = 'Indiquez le nom du groupe.';
    groupName.focus();
    return;
  }
  const submitButton = groupForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  groupError.textContent = 'Création en cours…';
  try {
    await window.gestionMail.saveContactGroup(name, pendingGroupContactIds);
    closeGroupDialog();
    window.alert(`Le groupe « ${name} » a été créé.`);
  } catch (error) {
    groupError.textContent = `Création impossible : ${readableError(error)}`;
  } finally {
    submitButton.disabled = false;
  }
});

async function loadMessage() {
  const messageId = new URLSearchParams(window.location.search).get('id');
  if (!messageId) throw new Error('Identifiant du message manquant.');
  const message = await window.gestionMail.getMessage(messageId);
  document.title = message.subject || '(Sans objet)';
  container.replaceChildren();

  const title = document.createElement('h1');
  title.textContent = message.subject || '(Sans objet)';
  const selectedAddresses = new Map();
  const contactActions = document.createElement('div');
  contactActions.className = 'standalone-contact-actions';
  const addContacts = document.createElement('button');
  addContacts.type = 'button';
  addContacts.className = 'icon-action';
  addContacts.hidden = true;
  const createGroup = document.createElement('button');
  createGroup.type = 'button';
  createGroup.className = 'icon-action';
  createGroup.hidden = true;
  const updateActions = () => {
    const count = selectedAddresses.size;
    addContacts.hidden = count === 0;
    addContacts.textContent = `♙＋${count}`;
    addContacts.title = `Ajouter ${count} adresse${count > 1 ? 's' : ''} aux contacts`;
    addContacts.setAttribute('aria-label', addContacts.title);
    createGroup.hidden = count < 2;
    createGroup.textContent = `♟＋${count}`;
    createGroup.title = `Créer un groupe avec ${count} adresse${count > 1 ? 's' : ''}`;
    createGroup.setAttribute('aria-label', createGroup.title);
  };
  addContacts.addEventListener('click', async () => {
    try {
      await ensureContacts([...selectedAddresses.values()]);
      window.alert('Les adresses sélectionnées ont été ajoutées aux contacts.');
    } catch (error) {
      window.alert(`Ajout impossible : ${readableError(error)}`);
    }
  });
  createGroup.addEventListener('click', async () => {
    try {
      createGroup.disabled = true;
      const contacts = await ensureContacts([...selectedAddresses.values()]);
      openGroupDialog(contacts.map((contact) => contact.id));
    } catch (error) {
      window.alert(`Création impossible : ${readableError(error)}`);
    } finally {
      createGroup.disabled = false;
    }
  });
  contactActions.append(addContacts, createGroup);
  const headers = document.createElement('div');
  headers.className = 'message-headers';
  const sender = createAddressLine('De', message.sender, selectedAddresses, updateActions);
  const recipients = createAddressLine('À', message.recipients, selectedAddresses, updateActions);
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
  container.append(title, contactActions, headers);
  const remoteImages = body.querySelectorAll('img[data-remote-src]');
  if (remoteImages.length) {
    const notice = document.createElement('div');
    notice.className = 'remote-images-notice';
    const warning = document.createElement('span');
    warning.textContent = `${remoteImages.length} image${remoteImages.length > 1 ? 's' : ''} Internet bloquée${remoteImages.length > 1 ? 's' : ''} pour protéger votre vie privée.`;
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'remote-images-button';
    show.textContent = 'Afficher les images distantes';
    show.addEventListener('click', () => {
      for (const image of remoteImages) {
        image.src = image.dataset.remoteSrc;
        image.removeAttribute('data-remote-src');
      }
      notice.remove();
    });
    notice.append(warning, show);
    container.append(notice);
  }
  container.append(body);

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
          await window.gestionMail.openAttachment(message.id, attachment.attachmentIndex);
        } catch (error) {
          window.alert(`Impossible d’ouvrir la pièce jointe : ${readableError(error)}`);
        }
      });
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'attachment-save-button';
      save.textContent = '⇩';
      save.title = 'Enregistrer la pièce jointe dans un dossier';
      save.addEventListener('click', async () => {
        try {
          await window.gestionMail.saveAttachment(message.id, attachment.attachmentIndex);
        } catch (error) {
          window.alert(`Impossible d’enregistrer la pièce jointe : ${readableError(error)}`);
        }
      });
      item.append(button, save);
      attachments.append(item);
    }
    container.append(attachments);
  }
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
  const root = document.documentElement.style;
  root.setProperty('--accent-color', color);
  root.setProperty('--accent-contrast', (luminance + .05) / .064 >= 1.05 / (luminance + .05) ? '#102033' : '#ffffff');
  root.setProperty('--accent-strong', mix([0, 0, 0], .38));
  root.setProperty('--accent-mid', mix([255, 255, 255], .38));
  root.setProperty('--accent-soft', mix([255, 255, 255], .82));
  root.setProperty('--accent-ring', `${color}38`);
  root.setProperty('--accent-ink', mix([16, 32, 51], .68));
}

function applyWindowSettings(settings) {
  const fontSize = [13, 14, 15, 16, 17].includes(Number(settings.fontSize)) ? Number(settings.fontSize) : 15;
  document.documentElement.style.setProperty('--ui-font-size', `${fontSize - 2}px`);
  applyInterfaceColor(settings.interfaceColor);
}

window.gestionMail.onSettingsChanged(applyWindowSettings);

async function initialiseMessageWindow() {
  const settings = await window.gestionMail.getSettings();
  applyWindowSettings(settings);
  await loadMessage();
}

initialiseMessageWindow().catch((error) => {
  container.replaceChildren();
  const failure = document.createElement('div');
  failure.className = 'error';
  failure.textContent = `Impossible d’ouvrir ce message : ${readableError(error)}`;
  container.append(failure);
});
