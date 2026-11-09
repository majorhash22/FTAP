import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { AppError, requireValue, matchId, accountId, loadTournament, normalizeMatch, inferFixture, calculateMvp, publishResult } from './domain.mjs';
import { openStore } from './store.mjs';
import { digest, newSession, sessionToken, verifyPassword } from './auth.mjs';
import { createOpenDota } from './opendota.mjs';

export function createApplication(config) {
  const root = path.resolve(config.root);
  const origin = new URL(config.origin).origin;
  const secure = new URL(origin).protocol === 'https:';
  const store = config.store || openStore(config.database || path.join(root, '.data/ftap.sqlite'));
  // Restarting or rotating credentials revokes existing admin sessions.
  store.db.exec('DELETE FROM sessions');
  const tournament = loadTournament(root);
  const clock = config.clock || Date.now;
  const provider = config.provider || createOpenDota({ store, apiKey: config.apiKey || '', fetcher: config.fetcher, clock });
  const attempts = new Map();
  const rootFiles = new Set(['index.html', 'styles.css', 'app.js', 'community.js', 'teams.css',
    'matches.css', 'matches.js', 'match-data.js', 'match-data.css', 'trophy.js', 'trophy.css']);
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  function json(value, status = 200, extra = {}) {
    return new Response(JSON.stringify(value), { status, headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra
    } });
  }
  function limit(key, count, period) {
    const now = clock(), row = attempts.get(key);
    if (!row || row.until <= now) {
      if (attempts.size >= 2000) for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id);
      requireValue(attempts.size < 2000, 'Too many requests. Retry later.', 429);
      attempts.set(key, { count: 1, until: now + period }); return;
    }
    requireValue(row.count < count, 'Too many attempts. Please wait before retrying.', 429);
    row.count++;
  }
  function session(request) {
    const token = sessionToken(request);
    const result = token && store.db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(digest(token), clock());
    requireValue(result, 'Sign in to manage match results.', 401);
    return result;
  }
  function sameOrigin(request) {
    requireValue(request.headers.get('origin') === origin, 'This request must come from the admin portal.', 403);
  }
  function csrf(request, current) {
    sameOrigin(request);
    requireValue(digest(request.headers.get('x-csrf-token') || '') === digest(current.csrf), 'The session token is invalid. Sign in again.', 403);
  }
  async function body(request) {
    requireValue(request.headers.get('content-type')?.split(';')[0].trim() === 'application/json', 'Send JSON data.', 415);
    const raw = await request.text();
    requireValue(Buffer.byteLength(raw) <= 65536, 'The submitted data is too large.', 413);
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new AppError(400, 'The submitted JSON is invalid.'); }
    requireValue(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Send a JSON object.');
    return parsed;
  }
  const cookie = (token, age = 43200) => 'ftap_session=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age + (secure ? '; Secure' : '');
  async function api(request, clientIp) {
    const url = new URL(request.url), route = url.pathname;
    if (request.method === 'GET' && route === '/api/health') return json({ ok: true, adminConfigured: Boolean(config.passwordHash) });
    if (request.method === 'GET' && route === '/api/results') return json({ results: store.results() }, 200, { 'Access-Control-Allow-Origin': '*' });
    if (route === '/api/admin/login' && request.method === 'POST') {
      sameOrigin(request);
      requireValue(config.passwordHash, 'Admin login is not configured. Run npm run setup:admin on the server.', 503);
      limit('login:' + clientIp, 5, 15 * 60000);
      limit('login:global', 30, 15 * 60000);
      const data = await body(request);
      requireValue(typeof data.username === 'string' && typeof data.password === 'string' && data.password.length <= 1024, 'Enter your admin credentials.');
      const valid = await verifyPassword(data.password, config.passwordHash);
      requireValue(valid && data.username === (config.username || 'admin'), 'Incorrect username or password.', 401);
      const previous = sessionToken(request);
      if (previous) store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(previous));
      const created = newSession(store, clock());
      return json({ csrf: created.csrf, username: config.username || 'admin' }, 200, { 'Set-Cookie': cookie(created.token) });
    }
    requireValue(route.startsWith('/api/admin/'), 'API route not found.', 404);
    const current = session(request);
    if (request.method === 'GET' && route === '/api/admin/session') return json({ csrf: current.csrf, username: config.username || 'admin' });
    if (!['GET', 'HEAD'].includes(request.method)) csrf(request, current);
    if (request.method === 'POST' && route === '/api/admin/logout') {
      store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(current.token_hash);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
    }
    if (request.method === 'GET' && route === '/api/admin/state') {
      const published = Object.values(store.results()).map(({ fixtureId, matchId, winner, mvp, updatedAt }) => ({ fixtureId, matchId, winner, mvp, updatedAt }));
      return json({ tournament, bindings: store.bindings(tournament), published });
    }
    if (request.method === 'PUT' && route === '/api/admin/roster') {
      const data = await body(request);
      const roster = tournament.teams.flatMap(team => team.players);
      requireValue(Array.isArray(data.players) && data.players.length === roster.length, 'Submit the complete roster account list.');
      const keys = new Set(roster.map(p => p.key));
      const seen = new Set(), ids = new Set();
      const rows = data.players.map(row => {
        requireValue(row && keys.has(row.key) && !seen.has(row.key), 'A roster entry is invalid or duplicated.');
        seen.add(row.key);
        const id = accountId(row.accountId);
        requireValue(!id || !ids.has(id), 'The same Steam account cannot belong to two roster entries.');
        if (id) ids.add(id);
        return { key: row.key, accountId: id };
      });
      store.saveBindings(rows);
      return json({ bindings: store.bindings(tournament) });
    }
    if (request.method === 'POST' && route === '/api/admin/import') {
      limit('import:' + clientIp, 30, 60000);
      const data = await body(request), id = matchId(data.matchId);
      const { raw, constants } = await provider.match(id);
      const game = normalizeMatch(raw, id, constants, store.bindings(tournament));
      const draftId = store.draft(game, clock());
      return json({ draftId, game, inferred: inferFixture(game, tournament), suggestedMvp: calculateMvp(game) });
    }
    if (request.method === 'POST' && route === '/api/admin/parse') {
      limit('parse:' + clientIp, 5, 60000);
      const data = await body(request);
      return json(await provider.parse(matchId(data.matchId)));
    }
    if (request.method === 'POST' && route === '/api/admin/publish') {
      const data = await body(request);
      requireValue(typeof data.draftId === 'string', 'Import a match before publishing.');
      const game = store.getDraft(data.draftId, clock());
      const result = publishResult(game, data, tournament);
      store.publish(result, data.replace === true, clock());
      return json({ result: { ...result, updatedAt: clock() } });
    }
    if (request.method === 'DELETE' && route.startsWith('/api/admin/results/')) {
      const fixtureId = route.slice('/api/admin/results/'.length);
      requireValue(tournament.fixtures.some(f => f.id === fixtureId), 'Unknown fixture.', 404);
      store.unpublish(fixtureId, clock());
      return json({ ok: true });
    }
    throw new AppError(404, 'API route not found.');
  }
  function allowed(relative) {
    return !relative.split(/[\\/]/).some(part => part.startsWith('.')) &&
      (rootFiles.has(relative) || /^(assets|admin|matches)[\\/]/.test(relative));
  }
  async function staticFile(request) {
    requireValue(['GET', 'HEAD'].includes(request.method), 'Method not allowed.', 405);
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url).pathname); } catch { throw new AppError(400, 'Invalid URL.'); }
    let relative = pathname.replace(/^\/+/, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    if (relative === 'matches' || relative === 'admin') return new Response(null, { status: 308, headers: { Location: origin + '/' + relative + '/' } });
    requireValue(allowed(relative), 'Not found.', 404);
    const filename = path.resolve(root, relative);
    requireValue(filename.startsWith(root + path.sep), 'Not found.', 404);
    let resolved;
    try { resolved = await realpath(filename); } catch { throw new AppError(404, 'Not found.'); }
    const realRelative = path.relative(root, resolved);
    requireValue(!realRelative.startsWith('..') && allowed(realRelative), 'Not found.', 404);
    const data = await readFile(resolved);
    return new Response(data, { headers: { 'Content-Type': types[path.extname(resolved)] || 'application/octet-stream',
      'Cache-Control': relative.startsWith('admin') ? 'no-store' : 'no-cache' } });
  }
  return {
    store, tournament,
    close: () => store.close(),
    async handle(request, clientIp = 'local') {
      let response;
      try {
        store.cleanup(clock());
        response = new URL(request.url).pathname.startsWith('/api/') ? await api(request, clientIp) : await staticFile(request);
      } catch (error) {
        if (!(error instanceof AppError)) config.onError?.(error);
        response = json({ error: error instanceof AppError ? error.message : 'The server could not complete this request.' },
          error instanceof AppError ? error.status : 500);
      }
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.cloudflare.steamstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
      if (secure) response.headers.set('Strict-Transport-Security', 'max-age=31536000');
      return response;
    }
  };
}
