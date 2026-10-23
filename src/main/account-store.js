const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app, safeStorage } = require('electron');

function getStorePath() {
  return path.join(app.getPath('userData'), 'accounts.json');
}

function readAccounts() {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) return [];

  try {
    const content = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function publicAccount(account) {
  const { encryptedPassword, ...safeAccount } = account;
  return safeAccount;
}

function listAccounts() {
  return readAccounts().map(publicAccount);
}

async function decryptPassword(account) {
  if (!account?.encryptedPassword || !(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Le mot de passe de ce compte n’est pas accessible.');
  }
  const decrypted = await safeStorage.decryptStringAsync(Buffer.from(account.encryptedPassword, 'base64'));
  return decrypted.result;
}

async function getAccountWithPassword(id) {
  const account = readAccounts().find((item) => item.id === id);
  if (!account) throw new Error('Compte introuvable.');
  return { ...publicAccount(account), password: await decryptPassword(account) };
}

function validateAccount(candidate, { requirePassword = true } = {}) {
  const required = ['name', 'email', 'incomingHost', 'outgoingHost', 'username'];
  if (requirePassword) required.push('password');
  for (const field of required) {
    if (!String(candidate[field] ?? '').trim()) {
      throw new Error(`Le champ ${field} est obligatoire.`);
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(candidate.email)) {
    throw new Error('L’adresse e-mail est invalide.');
  }

  for (const field of ['incomingPort', 'outgoingPort']) {
    const port = Number(candidate[field]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Le port ${field} est invalide.`);
    }
  }
}

async function saveAccount(candidate) {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Le chiffrement sécurisé de Windows n’est pas disponible.');
  }

  const accounts = readAccounts();
  const existing = candidate.id ? accounts.find((item) => item.id === candidate.id) : null;
  validateAccount(candidate, { requirePassword: !existing });
  const id = candidate.id || randomUUID();
  const encryptedPassword = String(candidate.password || '').length
    ? (await safeStorage.encryptStringAsync(candidate.password)).toString('base64')
    : existing.encryptedPassword;
  const account = {
    id,
    name: candidate.name.trim(),
    email: candidate.email.trim(),
    protocol: candidate.protocol === 'pop3' ? 'pop3' : 'imap',
    incomingHost: candidate.incomingHost.trim(),
    incomingPort: Number(candidate.incomingPort),
    incomingSecure: Boolean(candidate.incomingSecure),
    outgoingHost: candidate.outgoingHost.trim(),
    outgoingPort: Number(candidate.outgoingPort),
    outgoingSecure: Boolean(candidate.outgoingSecure),
    username: candidate.username.trim(),
    encryptedPassword,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingIndex = accounts.findIndex((item) => item.id === id);
  if (existingIndex >= 0) accounts[existingIndex] = account;
  else accounts.push(account);

  const storePath = getStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(accounts, null, 2), { encoding: 'utf8', mode: 0o600 });
  return publicAccount(account);
}

function deleteAccount(id) {
  const accounts = readAccounts();
  const remaining = accounts.filter((item) => item.id !== id);
  if (remaining.length === accounts.length) throw new Error('Compte introuvable.');
  fs.writeFileSync(getStorePath(), JSON.stringify(remaining, null, 2), { encoding: 'utf8', mode: 0o600 });
  return { deleted: true };
}

module.exports = { deleteAccount, getAccountWithPassword, listAccounts, saveAccount, validateAccount };

