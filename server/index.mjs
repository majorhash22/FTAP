import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './app.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const production = process.env.NODE_ENV === 'production';
if (process.env.ADMIN_PASSWORD_HASH && !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH)) {
  throw new Error('ADMIN_PASSWORD_HASH is invalid. Generate it with npm run setup:admin.');
}
const origin = process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:' + port;
if (production && new URL(origin).protocol !== 'https:') throw new Error('Set PUBLIC_ORIGIN to the production HTTPS URL.');
const app = createApplication({
  root, origin, database: path.resolve(root, process.env.DATABASE_PATH || '.data/ftap.sqlite'),
  username: process.env.ADMIN_USERNAME || 'admin', passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
  apiKey: process.env.OPENDOTA_API_KEY || '',
  onError: error => console.error('Server error:', error.code || error.name)
});
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const chunks = []; let length = 0;
    for await (const chunk of incoming) {
      length += chunk.length;
      if (length > 65536) {
        outgoing.writeHead(413, { 'Content-Type': 'application/json', 'Connection': 'close' });
        outgoing.end(JSON.stringify({ error: 'The submitted data is too large.' })); return;
      }
      chunks.push(chunk);
    }
    const request = new Request(new URL(incoming.url, origin), {
      method: incoming.method, headers: incoming.headers,
      ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Buffer.concat(chunks) } : {})
    });
    const response = await app.handle(request, incoming.socket.remoteAddress || 'unknown');
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(incoming.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ error: 'The server could not complete this request.' }));
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log('FTAP: ' + origin + ' · Admin: ' + origin + '/admin/');
  if (!process.env.ADMIN_PASSWORD_HASH) console.log('Admin sign-in is disabled until npm run setup:admin is completed.');
});
function shutdown() { server.close(() => { app.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
