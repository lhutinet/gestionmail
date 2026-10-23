const net = require('node:net');
const tls = require('node:tls');

class Pop3Client {
  constructor({ host, port, secure, timeout = 15000 }) {
    this.options = { host, port, secure, timeout };
    this.socket = null;
    this.buffer = '';
    this.lines = [];
    this.waiters = [];
  }

  async connect() {
    const { host, port, secure, timeout } = this.options;
    this.socket = secure
      ? tls.connect({ host, port, servername: host, rejectUnauthorized: true })
      : net.createConnection({ host, port });
    // latin1 conserve chaque octet du message jusqu’à sa conversion en Buffer.
    this.socket.setEncoding('latin1');
    this.socket.setTimeout(timeout, () => this.socket.destroy(new Error('Délai de connexion POP3 dépassé.')));
    this.socket.on('data', (chunk) => this.consume(chunk));
    this.socket.on('error', (error) => this.rejectAll(error));
    this.socket.on('close', () => this.rejectAll(new Error('La connexion POP3 a été fermée.')));
    await new Promise((resolve, reject) => {
      this.socket.once(secure ? 'secureConnect' : 'connect', resolve);
      this.socket.once('error', reject);
    });
    const greeting = await this.readLine();
    if (!greeting.startsWith('+OK')) throw new Error(`Serveur POP3 : ${greeting}`);
  }

  consume(chunk) {
    this.buffer += chunk;
    let index;
    while ((index = this.buffer.indexOf('\r\n')) >= 0) {
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 2);
      const waiter = this.waiters.shift();
      if (waiter) waiter.resolve(line);
      else this.lines.push(line);
    }
  }

  rejectAll(error) {
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
  }

  readLine() {
    if (this.lines.length) return Promise.resolve(this.lines.shift());
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  async command(command, multiline = false) {
    if (!this.socket || this.socket.destroyed) throw new Error('Connexion POP3 indisponible.');
    this.socket.write(`${command}\r\n`);
    const response = await this.readLine();
    if (!response.startsWith('+OK')) throw new Error(response.replace(/^-ERR\s*/i, '') || 'Commande POP3 refusée.');
    if (!multiline) return response;

    const result = [];
    while (true) {
      const line = await this.readLine();
      if (line === '.') break;
      result.push(line.startsWith('..') ? line.slice(1) : line);
    }
    return result;
  }

  async login(username, password) {
    await this.command(`USER ${username}`);
    await this.command(`PASS ${password}`);
  }

  async close() {
    if (!this.socket || this.socket.destroyed) return;
    try { await this.command('QUIT'); } catch { /* fermeture sans réponse */ }
    this.socket.end();
  }
}

module.exports = { Pop3Client };

