const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { app, safeStorage } = require('electron');
const { getSettings } = require('./settings-store');

function defaultLocalDirectory(email) {
  const safeEmail = String(email || 'Compte local').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').trim() || 'Compte local';
  return path.join(getSettings().dataDirectory, 'Dossiers locaux', safeEmail);
}

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
  const { encryptedPassword, encryptedRefreshToken, encryptedAccessToken, ...safeAccount } = account;
  return { ...safeAccount, localDirectory: safeAccount.localDirectory || defaultLocalDirectory(safeAccount.email) };
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

async function decryptSecret(value, label) {
  if (!value || !(await safeStorage.isAsyncEncryptionAvailable())) throw new Error(`${label} n’est pas accessible.`);
  const decrypted = await safeStorage.decryptStringAsync(Buffer.from(value, 'base64'));
  return decrypted.result;
}

async function encryptSecret(value) {
  if (!String(value || '').length) return '';
  return (await safeStorage.encryptStringAsync(String(value))).toString('base64');
}

async function refreshOAuthTokens(account) {
  const refreshToken = await decryptSecret(account.encryptedRefreshToken, 'Le jeton OAuth2');
  const provider = account.oauthProvider === 'microsoft' ? 'microsoft' : 'google';
  const tenant = String(account.oauthTenant || 'common').trim() || 'common';
  const tokenUrl = provider === 'google'
    ? 'https://oauth2.googleapis.com/token'
    : `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({ client_id: account.oauthClientId, grant_type: 'refresh_token', refresh_token: refreshToken });
  if (provider === 'microsoft') body.set('scope', 'offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send');
  const response = await fetch(tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const tokens = await response.json();
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || 'Impossible de renouveler la connexion OAuth2.');
  const accounts = readAccounts();
  const stored = accounts.find((item) => item.id === account.id);
  if (stored) {
    stored.encryptedAccessToken = await encryptSecret(tokens.access_token);
    if (tokens.refresh_token) stored.encryptedRefreshToken = await encryptSecret(tokens.refresh_token);
    stored.oauthExpiresAt = Date.now() + Number(tokens.expires_in || 3600) * 1000;
    fs.writeFileSync(getStorePath(), JSON.stringify(accounts, null, 2), { encoding: 'utf8', mode: 0o600 });
  }
  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token || refreshToken, expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000 };
}

async function getAccountWithPassword(id) {
  const account = readAccounts().find((item) => item.id === id);
  if (!account) throw new Error('Compte introuvable.');
  if (account.authType === 'oauth2') {
    let accessToken = '';
    if (account.encryptedAccessToken && Number(account.oauthExpiresAt || 0) > Date.now() + 60000) accessToken = await decryptSecret(account.encryptedAccessToken, 'Le jeton OAuth2');
    else accessToken = (await refreshOAuthTokens(account)).accessToken;
    return { ...publicAccount(account), accessToken };
  }
  return { ...publicAccount(account), password: await decryptPassword(account) };
}

function validateAccount(candidate, { requirePassword = true } = {}) {
  const required = ['name', 'email', 'incomingHost', 'outgoingHost', 'username'];
  const authType = candidate.authType === 'oauth2' ? 'oauth2' : 'password';
  if (requirePassword && authType === 'password') required.push('password');
  if (authType === 'oauth2') required.push('oauthClientId');
  for (const field of required) {
    if (!String(candidate[field] ?? '').trim()) {
      throw new Error(`Le champ ${field} est obligatoire.`);
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(candidate.email)) {
    throw new Error('L’adresse e-mail est invalide.');
  }
  if (candidate.localDirectory && !path.isAbsolute(String(candidate.localDirectory))) {
    throw new Error('Le dossier local Windows doit utiliser un chemin complet.');
  }
  if (candidate.localDirectory) {
    const resolvedDirectory = path.resolve(String(candidate.localDirectory));
    if (resolvedDirectory === path.parse(resolvedDirectory).root) throw new Error('Choisissez un dossier dédié, pas la racine complète d’un disque.');
  }

  for (const field of ['incomingPort', 'outgoingPort']) {
    const port = Number(candidate[field]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Le port ${field} est invalide.`);
    }
  }
  if (authType === 'oauth2' && candidate.protocol === 'pop3') throw new Error('OAuth2 est actuellement disponible avec IMAP et SMTP.');
}

async function saveAccount(candidate) {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Le chiffrement sécurisé de Windows n’est pas disponible.');
  }

  const accounts = readAccounts();
  const existing = candidate.id ? accounts.find((item) => item.id === candidate.id) : null;
  const authType = candidate.authType === 'oauth2' ? 'oauth2' : 'password';
  validateAccount(candidate, { requirePassword: !existing });
  const id = candidate.id || randomUUID();
  const encryptedPassword = authType === 'password' && String(candidate.password || '').length
    ? (await safeStorage.encryptStringAsync(candidate.password)).toString('base64')
    : existing?.encryptedPassword || '';
  const encryptedRefreshToken = authType === 'oauth2' && String(candidate.refreshToken || '').length
    ? await encryptSecret(candidate.refreshToken)
    : existing?.encryptedRefreshToken || '';
  const encryptedAccessToken = authType === 'oauth2' && String(candidate.accessToken || '').length
    ? await encryptSecret(candidate.accessToken)
    : existing?.encryptedAccessToken || '';
  if (authType === 'oauth2' && !encryptedRefreshToken) throw new Error('Connectez d’abord le compte avec OAuth2.');
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
    localDirectory: path.resolve(String(candidate.localDirectory || existing?.localDirectory || defaultLocalDirectory(candidate.email))),
    authType,
    oauthProvider: authType === 'oauth2' && candidate.oauthProvider === 'microsoft' ? 'microsoft' : authType === 'oauth2' ? 'google' : '',
    oauthClientId: authType === 'oauth2' ? String(candidate.oauthClientId || '').trim() : '',
    oauthTenant: authType === 'oauth2' ? String(candidate.oauthTenant || 'common').trim() : '',
    oauthExpiresAt: authType === 'oauth2' ? Number(candidate.expiresAt || existing?.oauthExpiresAt || 0) : 0,
    encryptedPassword,
    encryptedRefreshToken,
    encryptedAccessToken,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingIndex = accounts.findIndex((item) => item.id === id);
  if (existingIndex >= 0) accounts[existingIndex] = account;
  else accounts.push(account);

  const storePath = getStorePath();
  fs.mkdirSync(account.localDirectory, { recursive: true });
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

