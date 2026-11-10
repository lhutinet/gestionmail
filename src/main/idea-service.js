const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

let adminSessionToken = '';
const DEFAULT_IDEAS_API_URL = 'https://idees.digitalh.fr';

function machineConfig() {
  const programData = process.env.ProgramData || process.env.PROGRAMDATA;
  if (!programData) return {};
  try {
    const filename = path.join(programData, 'Monmail', 'machine.json');
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function apiBaseUrl() {
  const value = String(machineConfig().ideasApiUrl || DEFAULT_IDEAS_API_URL).trim().replace(/\/+$/, '');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('L’adresse de la boîte à idées est invalide.');
  }
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
    throw new Error('La boîte à idées doit utiliser HTTPS.');
  }
  return url.href.replace(/\/$/, '');
}

function adminToken() {
  const programData = process.env.ProgramData || process.env.PROGRAMDATA;
  if (!programData) throw new Error('Ce poste n’est pas configuré pour administrer les idées.');
  try {
    const token = fs.readFileSync(path.join(programData, 'Monmail', 'ideas-admin-token'), 'utf8').trim();
    if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error('invalid');
    return token;
  } catch {
    throw new Error('Ce poste n’est pas autorisé à administrer les idées.');
  }
}

function localAdminToken() {
  try {
    return adminToken();
  } catch {
    return '';
  }
}

function adminAuthorizationToken(allowBootstrap = false) {
  const token = adminSessionToken || (allowBootstrap ? localAdminToken() : '');
  if (!token) throw new Error('Connectez-vous comme administrateur pour traiter les idées.');
  return token;
}

function passwordProof(password) {
  const value = String(password || '');
  if (value.length < 12) throw new Error('Le mot de passe administrateur doit contenir au moins 12 caractères.');
  if (value.length > 200) throw new Error('Le mot de passe administrateur est trop long.');
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function canAdministerIdeas() {
  return Boolean(adminSessionToken);
}

function ideasAdminState() {
  return {
    authenticated: canAdministerIdeas(),
    canConfigurePassword: Boolean(localAdminToken())
  };
}

async function request(pathname, options = {}) {
  const response = await fetch(`${apiBaseUrl()}${pathname}`, {
    ...options,
    headers: { accept: 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(10000)
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) throw new Error(body?.error || `Service d’idées indisponible (${response.status}).`);
  return body;
}

function normaliseIdea(value) {
  return {
    id: String(value?.id || ''),
    title: String(value?.title || ''),
    category: String(value?.category || 'Général'),
    description: String(value?.description || ''),
    status: ['published', 'completed'].includes(value?.status) ? value.status : 'published',
    createdAt: String(value?.createdAt || value?.created_at || '')
  };
}

async function listIdeas(owned = []) {
  const authorization = adminSessionToken;
  const result = authorization
    ? await request('/ideas', { headers: { authorization: `Bearer ${authorization}` } })
    : await request('/ideas/mine', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owned: Array.isArray(owned) ? owned.slice(0, 50) : [] })
    });
  return (Array.isArray(result?.ideas) ? result.ideas : []).map(normaliseIdea).filter((idea) => idea.id && idea.title);
}

async function createIdea(input) {
  const title = String(input?.title || '').trim();
  const category = String(input?.category || 'Général').trim() || 'Général';
  const description = String(input?.description || '').trim();
  const website = String(input?.website || '').trim();
  if (!title) throw new Error('Le titre de l’idée est obligatoire.');
  if (title.length > 240) throw new Error('Le titre de l’idée est trop long.');
  if (category.length > 80) throw new Error('La catégorie est trop longue.');
  if (description.length > 2000) throw new Error('La description est trop longue.');
  const result = await request('/ideas', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, category, description, website })
  });
  const viewToken = String(result?.viewToken || '');
  if (!/^[0-9a-f]{64}$/i.test(viewToken)) throw new Error('La preuve locale de l’idée reçue est invalide.');
  return { idea: normaliseIdea(result?.idea), viewToken, pending: Boolean(result?.pending) };
}

async function loginIdeasAdmin(password) {
  const result = await request('/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passwordProof: passwordProof(password) })
  });
  const token = String(result?.token || '');
  if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error('La session administrateur reçue est invalide.');
  adminSessionToken = token;
  return ideasAdminState();
}

async function configureIdeasAdminPassword(password) {
  const result = await request('/admin/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminAuthorizationToken(true)}` },
    body: JSON.stringify({ passwordProof: passwordProof(password) })
  });
  const token = String(result?.token || '');
  if (!/^[0-9a-f]{64}$/i.test(token)) throw new Error('La session administrateur reçue est invalide.');
  adminSessionToken = token;
  return ideasAdminState();
}

async function logoutIdeasAdmin() {
  const token = adminSessionToken;
  adminSessionToken = '';
  if (token) {
    try {
      await request('/admin/logout', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    } catch {
      // La session locale est supprimée même si le serveur est momentanément indisponible.
    }
  }
  return ideasAdminState();
}

async function updateIdea(id, status) {
  const ideaId = String(id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(ideaId)) throw new Error('Identifiant d’idée invalide.');
  if (!['published', 'completed'].includes(status)) throw new Error('Statut d’idée invalide.');
  const result = await request(`/ideas/${encodeURIComponent(ideaId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminAuthorizationToken()}` },
    body: JSON.stringify({ status })
  });
  return normaliseIdea(result?.idea);
}

async function deleteIdea(id) {
  const ideaId = String(id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(ideaId)) throw new Error('Identifiant d’idée invalide.');
  return request(`/ideas/${encodeURIComponent(ideaId)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${adminAuthorizationToken()}` }
  });
}

module.exports = {
  canAdministerIdeas,
  configureIdeasAdminPassword,
  createIdea,
  deleteIdea,
  ideasAdminState,
  listIdeas,
  loginIdeasAdmin,
  logoutIdeasAdmin,
  updateIdea
};
