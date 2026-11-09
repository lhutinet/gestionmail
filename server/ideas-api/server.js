const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } = require('node:crypto');
const { Pool } = require('pg');

const port = Number(process.env.PORT || 3001);
const host = String(process.env.HOST || '127.0.0.1');
const databaseUrl = String(process.env.DATABASE_URL || '');
const defaultStatus = process.env.DEFAULT_IDEA_STATUS === 'pending' ? 'pending' : 'published';
const publicOrigin = String(process.env.PUBLIC_ORIGIN || '').trim();
const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
const adminPasswordFile = String(process.env.ADMIN_PASSWORD_FILE || '/data/admin-password.json');

if (!databaseUrl) throw new Error('DATABASE_URL est obligatoire.');
if (!/^[0-9a-f]{64}$/i.test(adminToken)) throw new Error('ADMIN_TOKEN est obligatoire et doit contenir 64 caractères hexadécimaux.');

const pool = new Pool({ connectionString: databaseUrl, max: 5 });
const submissions = new Map();
const adminAttempts = new Map();
const adminSessions = new Map();
const adminSessionDuration = 12 * 60 * 60 * 1000;

function send(response, status, body, origin = '') {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  };
  if (publicOrigin && origin === publicOrigin) headers['access-control-allow-origin'] = publicOrigin;
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

function clientAddress(request) {
  return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || '').split(',')[0].trim();
}

function allowSubmission(request) {
  const key = clientAddress(request) || 'unknown';
  const now = Date.now();
  const recent = (submissions.get(key) || []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= 10) return false;
  recent.push(now);
  submissions.set(key, recent);
  return true;
}

function bearerToken(request) {
  return String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
}

function tokensMatch(supplied, expected) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function isAdministrator(request) {
  const supplied = bearerToken(request);
  if (tokensMatch(supplied, adminToken)) return true;
  const expiresAt = adminSessions.get(supplied) || 0;
  if (expiresAt > Date.now()) return true;
  if (supplied) adminSessions.delete(supplied);
  return false;
}

function allowAdminLogin(request) {
  const key = clientAddress(request) || 'unknown';
  const now = Date.now();
  const recent = (adminAttempts.get(key) || []).filter((timestamp) => now - timestamp < 15 * 60 * 1000);
  if (recent.length >= 5) return false;
  recent.push(now);
  adminAttempts.set(key, recent);
  return true;
}

function readAdminPassword() {
  try {
    const value = JSON.parse(fs.readFileSync(adminPasswordFile, 'utf8'));
    if (!/^[0-9a-f]{32}$/i.test(value?.salt) || !/^[0-9a-f]{64}$/i.test(value?.hash)) return null;
    return value;
  } catch {
    return null;
  }
}

function passwordMatches(proof, stored) {
  if (!/^[0-9a-f]{64}$/i.test(proof) || !stored) return false;
  const calculated = scryptSync(proof, stored.salt, 32).toString('hex');
  return tokensMatch(calculated, stored.hash);
}

function saveAdminPassword(proof) {
  if (!/^[0-9a-f]{64}$/i.test(proof)) throw new Error('Preuve de mot de passe invalide.');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(proof, salt, 32).toString('hex');
  fs.mkdirSync(path.dirname(adminPasswordFile), { recursive: true, mode: 0o700 });
  const temporary = `${adminPasswordFile}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify({ salt, hash })}\n`, { mode: 0o600 });
  fs.renameSync(temporary, adminPasswordFile);
  fs.chmodSync(adminPasswordFile, 0o600);
}

function createAdminSession() {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions) {
    if (expiresAt <= now) adminSessions.delete(token);
  }
  const token = randomBytes(32).toString('hex');
  const expiresAt = now + adminSessionDuration;
  adminSessions.set(token, expiresAt);
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

function viewerTokenHash(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

async function jsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error('Requête trop volumineuse.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new Error('Corps JSON invalide.');
  }
}

function validateIdea(input) {
  const title = String(input?.title || '').trim();
  const category = String(input?.category || 'Général').trim() || 'Général';
  const description = String(input?.description || '').trim();
  if (String(input?.website || '').trim()) return null;
  if (!title || title.length > 240) throw new Error('Le titre doit contenir entre 1 et 240 caractères.');
  if (category.length > 80) throw new Error('La catégorie ne peut pas dépasser 80 caractères.');
  if (description.length > 2000) throw new Error('La description ne peut pas dépasser 2 000 caractères.');
  return { title, category, description };
}

async function route(request, response) {
  const origin = String(request.headers.origin || '');
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/health') {
    await pool.query('SELECT 1');
    send(response, 200, { ok: true }, origin);
    return;
  }
  if (request.method === 'GET' && url.pathname === '/ideas') {
    if (!isAdministrator(request)) {
      send(response, 401, { error: 'Administration non autorisée.' }, origin);
      return;
    }
    const result = await pool.query(
      `SELECT id, title, category, description, status, created_at AS "createdAt"
       FROM ideas
       WHERE status IN ('published', 'completed')
       ORDER BY created_at DESC
       LIMIT 200`
    );
    send(response, 200, { ideas: result.rows }, origin);
    return;
  }
  if (request.method === 'POST' && url.pathname === '/ideas/mine') {
    const input = await jsonBody(request);
    const owned = Array.isArray(input?.owned) ? input.owned.slice(0, 50) : [];
    const pairs = owned
      .map((item) => ({ id: String(item?.id || ''), token: String(item?.viewToken || '') }))
      .filter((item) => /^[0-9a-f-]{36}$/i.test(item.id) && /^[0-9a-f]{64}$/i.test(item.token))
      .map((item) => `${item.id}:${viewerTokenHash(item.token)}`);
    if (!pairs.length) {
      send(response, 200, { ideas: [] }, origin);
      return;
    }
    const result = await pool.query(
      `SELECT id, title, category, description, status, created_at AS "createdAt"
       FROM ideas
       WHERE (id::text || ':' || viewer_token_hash) = ANY($1::text[])
         AND status IN ('pending', 'published', 'completed')
       ORDER BY created_at DESC`,
      [pairs]
    );
    send(response, 200, { ideas: result.rows }, origin);
    return;
  }
  if (request.method === 'POST' && url.pathname === '/admin/login') {
    if (!allowAdminLogin(request)) {
      send(response, 429, { error: 'Trop de tentatives de connexion. Réessayez plus tard.' }, origin);
      return;
    }
    const input = await jsonBody(request);
    if (!passwordMatches(String(input?.passwordProof || ''), readAdminPassword())) {
      send(response, 401, { error: 'Mot de passe administrateur incorrect.' }, origin);
      return;
    }
    send(response, 200, createAdminSession(), origin);
    return;
  }
  if (request.method === 'POST' && url.pathname === '/admin/logout') {
    adminSessions.delete(bearerToken(request));
    send(response, 200, { disconnected: true }, origin);
    return;
  }
  if (request.method === 'POST' && url.pathname === '/admin/password') {
    if (!isAdministrator(request)) {
      send(response, 401, { error: 'Administration non autorisée.' }, origin);
      return;
    }
    const input = await jsonBody(request);
    saveAdminPassword(String(input?.passwordProof || ''));
    adminSessions.clear();
    send(response, 200, createAdminSession(), origin);
    return;
  }
  if (request.method === 'POST' && url.pathname === '/ideas') {
    if (!allowSubmission(request)) {
      send(response, 429, { error: 'Trop de propositions. Réessayez plus tard.' }, origin);
      return;
    }
    const idea = validateIdea(await jsonBody(request));
    if (!idea) {
      send(response, 202, { accepted: true, pending: true }, origin);
      return;
    }
    const id = randomUUID();
    const viewToken = randomBytes(32).toString('hex');
    const result = await pool.query(
      `INSERT INTO ideas (id, title, category, description, status, viewer_token_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, category, description, status, created_at AS "createdAt"`,
      [id, idea.title, idea.category, idea.description, defaultStatus, viewerTokenHash(viewToken)]
    );
    send(response, 201, { idea: result.rows[0], viewToken, pending: defaultStatus === 'pending' }, origin);
    return;
  }
  const ideaMatch = url.pathname.match(/^\/ideas\/([0-9a-f-]{36})$/i);
  if (ideaMatch && ['PATCH', 'DELETE'].includes(request.method)) {
    if (!isAdministrator(request)) {
      send(response, 401, { error: 'Administration non autorisée.' }, origin);
      return;
    }
    const id = ideaMatch[1];
    if (request.method === 'PATCH') {
      const input = await jsonBody(request);
      if (!['published', 'completed'].includes(input.status)) {
        send(response, 400, { error: 'Statut invalide.' }, origin);
        return;
      }
      const result = await pool.query(
        `UPDATE ideas SET status = $2, updated_at = now()
         WHERE id = $1
         RETURNING id, title, category, description, status, created_at AS "createdAt"`,
        [id, input.status]
      );
      if (!result.rowCount) {
        send(response, 404, { error: 'Idée introuvable.' }, origin);
        return;
      }
      send(response, 200, { idea: result.rows[0] }, origin);
      return;
    }
    const result = await pool.query('DELETE FROM ideas WHERE id = $1', [id]);
    if (!result.rowCount) {
      send(response, 404, { error: 'Idée introuvable.' }, origin);
      return;
    }
    send(response, 200, { deleted: true }, origin);
    return;
  }
  send(response, 404, { error: 'Route introuvable.' }, origin);
}

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    console.error(error);
    const clientError = /obligatoire|caractères|invalide|JSON|volumineuse/i.test(String(error.message));
    send(response, clientError ? 400 : 500, { error: clientError ? error.message : 'Erreur interne du serveur.' });
  });
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
server.listen(port, host, () => console.log(`API idées Monmail active sur http://${host}:${port}`));
