const http = require('node:http');
const crypto = require('node:crypto');
const { shell } = require('electron');

function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function providerConfiguration(values) {
  if (values.provider === 'microsoft') {
    const tenant = String(values.tenant || 'common').trim() || 'common';
    return {
      authorizeUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
      scope: 'offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send'
    };
  }
  return {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email https://mail.google.com/'
  };
}

async function authorizeOAuth(values) {
  const clientId = String(values.clientId || '').trim();
  if (!clientId) throw new Error('L’identifiant client OAuth2 est obligatoire.');
  const provider = values.provider === 'microsoft' ? 'microsoft' : 'google';
  const configuration = providerConfiguration({ provider, tenant: values.tenant });
  const state = base64Url(crypto.randomBytes(24));
  const verifier = base64Url(crypto.randomBytes(48));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());

  let timeout;
  let server;
  const callback = new Promise((resolve, reject) => {
    server = http.createServer((request, response) => {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname !== '/oauth2/callback') { response.writeHead(404).end(); return; }
      if (url.searchParams.get('state') !== state) { response.writeHead(400).end('État OAuth2 invalide.'); reject(new Error('Réponse OAuth2 invalide.')); return; }
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      response.writeHead(error || !code ? 400 : 200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(error || !code ? '<h1>Connexion annulée</h1><p>Vous pouvez fermer cette fenêtre.</p>' : '<h1>Connexion réussie</h1><p>Vous pouvez fermer cette fenêtre et revenir dans GestionMail.</p>');
      if (error || !code) reject(new Error(url.searchParams.get('error_description') || 'Connexion OAuth2 annulée.'));
      else resolve(code);
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1');
    timeout = setTimeout(() => reject(new Error('La connexion OAuth2 a expiré.')), 5 * 60 * 1000);
  });

  await new Promise((resolve, reject) => {
    if (server.listening) resolve();
    else { server.once('listening', resolve); server.once('error', reject); }
  });
  const port = server.address().port;
  const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`;
  const authorizeUrl = new URL(configuration.authorizeUrl);
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: configuration.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    login_hint: String(values.email || '')
  }).toString();
  await shell.openExternal(authorizeUrl.href);
  try {
    const code = await callback;
    const body = new URLSearchParams({ client_id: clientId, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri });
    const response = await fetch(configuration.tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token || !tokens.refresh_token) throw new Error(tokens.error_description || 'Le fournisseur OAuth2 n’a pas retourné les jetons nécessaires.');
    return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000 };
  } finally {
    clearTimeout(timeout);
    server.close();
  }
}

module.exports = { authorizeOAuth };
