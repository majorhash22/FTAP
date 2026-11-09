import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, realpathSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createApplication } from '../server/app.mjs';
import { openStore } from '../server/store.mjs';
import { hashPassword, verifyPassword, newSession } from '../server/auth.mjs';
import { accountId, matchId, normalizeMatch, calculateMvp, inferFixture } from '../server/domain.mjs';
import { createOpenDota } from '../server/opendota.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://127.0.0.1:3000';
const password = 'test-only-not-a-production-password';
const passwordHash = await hashPassword(password);
function sample(id = '123456789', radiantWin = true) {
  return {
    match_id: Number(id), radiant_win: radiantWin, duration: 2400, start_time: 1700000000, version: 21,
    radiant_score: 30, dire_score: 20,
    players: Array.from({ length: 10 }, (_, i) => ({
      player_slot: i < 5 ? i : 128 + i - 5, account_id: i + 100, hero_id: i + 1,
      personaname: 'Player ' + i, kills: i + 1, deaths: 5, assists: i + 2,
      level: 25, gold_per_min: 400 + i, xp_per_min: 500, last_hits: 200, denies: 3,
      net_worth: 16000, hero_damage: 20000 + i, tower_damage: i * 100, hero_healing: 0,
      item_0: 1, item_1: 2, backpack_0: 3, item_neutral: 4
    }))
  };
}
const constants = {
  heroes: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, { name: 'npc_dota_hero_test_' + i, localized_name: 'Hero ' + i }])),
  items: { blink: { id: 1, dname: 'Blink Dagger' }, boots: { id: 2, dname: 'Boots' },
    branches: { id: 3, dname: 'Iron Branch' }, neutral: { id: 4, dname: 'Neutral item' } }
};
function fixture(t, options = {}) {
  const store = options.store || openStore(':memory:');
  let now = 1700000000000;
  const app = createApplication({ root, origin, passwordHash, username: 'admin', store, clock: () => now,
    provider: { match: async id => ({ raw: sample(id, options.radiantWin ?? true), constants }),
      parse: async () => ({ requested: true, message: 'Requested' }) }, ...options });
  t.after(() => app.close());
  let cookie = '', csrf = '';
  async function call(route, method = 'GET', data, extra = {}) {
    const headers = { ...(cookie ? { Cookie: cookie } : {}), ...extra };
    if (!['GET', 'HEAD'].includes(method)) {
      headers.Origin ??= origin; headers['X-CSRF-Token'] ??= csrf;
      if (data !== undefined) headers['Content-Type'] ??= 'application/json';
    }
    const response = await app.handle(new Request(origin + route, { method, headers,
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}) }));
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let body = null;
    if (response.headers.get('content-type')?.includes('application/json')) body = await response.json();
    return { response, body };
  }
  async function login() {
    const result = await call('/api/admin/login', 'POST', { username: 'admin', password });
    assert.equal(result.response.status, 200); csrf = result.body.csrf; return result;
  }
  return { app, store, call, login, setTime: value => { now = value; }, getCookie: () => cookie };
}
test('passwords use salted hashes and constant-time verification', async () => {
  assert.notEqual(await hashPassword(password), passwordHash);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword('wrong', passwordHash), false);
  assert.equal(await verifyPassword(password, 'malformed'), false);
});
test('validates match IDs and normalizes Steam account formats', () => {
  assert.equal(matchId('123456789'), '123456789');
  for (const value of ['../secret', 'https://example.com', '0', '1e10', '9007199254740992']) assert.throws(() => matchId(value));
  assert.equal(accountId('1234'), '1234');
  assert.equal(accountId('76561197960266962'), '1234');
  assert.equal(accountId('https://steamcommunity.com/profiles/76561197960266962/'), '1234');
  assert.equal(accountId(''), '');
  for (const value of ['abc', '4294967295', '0', 'https://evil.example/1234']) assert.throws(() => accountId(value));
});
test('normalizes real inventory slots, missing statistics and anonymous players', () => {
  const raw = sample();
  raw.players[0].account_id = 4294967295;
  delete raw.players[0].net_worth;
  const game = normalizeMatch(raw, String(raw.match_id), constants);
  assert.equal(game.players.length, 10);
  assert.equal(game.players[0].accountId, null);
  assert.equal(game.players[0].stats.net_worth, null);
  assert.equal(game.players[0].items.length, 6);
  assert.equal(game.players[0].items[0].name, 'Blink Dagger');
  assert.equal(game.players[0].items[5], null);
  assert.equal(game.players[0].backpack[0].id, 3);
  assert.equal(game.players[0].neutral.id, 4);
  assert.match(game.players[0].items[0].image, /^https:\/\/cdn\.cloudflare\.steamstatic\.com\//);
});
test('rejects incomplete matches, wrong match IDs, duplicate slots and non-5v5 lobbies', () => {
  for (const edit of [
    raw => { raw.match_id = 999; },
    raw => { raw.radiant_win = null; },
    raw => { raw.duration = 0; },
    raw => { raw.players.pop(); },
    raw => { raw.players[0].player_slot = 1; },
    raw => { delete raw.players[0].kills; }
  ]) {
    const raw = sample(); edit(raw);
    assert.throws(() => normalizeMatch(raw, '123456789', constants));
  }
});
test('computed MVP is deterministic, comes from the winning side and handles missing advanced data', () => {
  const raw = sample('123456789', false);
  raw.players.forEach(p => { delete p.hero_damage; delete p.tower_damage; delete p.gold_per_min; });
  const game = normalizeMatch(raw, '123456789', constants);
  const mvp = calculateMvp(game);
  assert.equal(mvp.source, 'ftap-calculated');
  assert.ok(mvp.slot >= 128);
  assert.ok(Number.isFinite(mvp.score));
  assert.deepEqual(calculateMvp(game), mvp);
});
test('requires authentication and fails closed when login is not configured', async t => {
  const app = fixture(t, { passwordHash: '' });
  assert.equal((await app.call('/api/admin/state')).response.status, 401);
  assert.equal((await app.call('/api/admin/import', 'POST', { matchId: '123456789' })).response.status, 401);
  assert.equal((await app.call('/api/admin/login', 'POST', { username: 'admin', password })).response.status, 503);
  assert.deepEqual((await app.call('/api/results')).body.results, {});
});
test('sign-in sets an HttpOnly same-site cookie, exposes CSRF only to the session and logs out', async t => {
  const app = fixture(t);
  const login = await app.login();
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(login.response.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await app.call('/api/admin/session')).body.csrf, login.body.csrf);
  const logout = await app.call('/api/admin/logout', 'POST');
  assert.match(logout.response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await app.call('/api/admin/session')).response.status, 401);
});
test('rejects cross-origin logins and missing or forged CSRF tokens', async t => {
  const app = fixture(t);
  assert.equal((await app.call('/api/admin/login', 'POST', { username: 'admin', password }, { Origin: 'https://evil.example' })).response.status, 403);
  await app.login();
  assert.equal((await app.call('/api/admin/import', 'POST', { matchId: '123456789' }, { 'X-CSRF-Token': '' })).response.status, 403);
  assert.equal((await app.call('/api/admin/import', 'POST', { matchId: '123456789' }, { Origin: 'https://evil.example' })).response.status, 403);
  assert.equal((await app.call('/api/admin/state')).response.status, 200);
});
test('throttles failed sign-ins and allows a new attempt after the lockout window', async t => {
  const app = fixture(t);
  for (let i = 0; i < 5; i++) assert.equal((await app.call('/api/admin/login', 'POST', { username: 'admin', password: 'incorrect' })).response.status, 401);
  assert.equal((await app.call('/api/admin/login', 'POST', { username: 'admin', password })).response.status, 429);
  app.setTime(1700000000000 + 16 * 60000);
  await app.login();
});
test('expired sessions cannot read or publish results', async t => {
  const app = fixture(t);
  await app.login(); app.setTime(1700000000000 + 13 * 3600000);
  assert.equal((await app.call('/api/admin/state')).response.status, 401);
});
test('imports a preview without publishing and uses the API winner rather than client-supplied stats', async t => {
  const app = fixture(t, { radiantWin: false });
  await app.login();
  const imported = await app.call('/api/admin/import', 'POST', { matchId: '123456789' });
  assert.equal(imported.response.status, 200);
  assert.equal(imported.body.inferred, null);
  assert.deepEqual((await app.call('/api/results')).body.results, {});
  const published = await app.call('/api/admin/publish', 'POST', {
    draftId: imported.body.draftId, fixtureId: 'r1-m1', radiantTeam: 'wraith', winner: 'wraith', radiantWin: true
  });
  assert.equal(published.response.status, 200);
  assert.equal(published.body.result.winner, 'scourge');
  assert.equal(published.body.result.mvp.team, 'scourge');
  const publicResult = (await app.call('/api/results')).body.results['r1-m1'];
  assert.equal(publicResult.players.length, 10);
  assert.equal(publicResult.players[0].items[0].name, 'Blink Dagger');
  assert.equal(publicResult.winner, 'scourge');
});
test('rejects a fixture/side mismatch and an MVP who did not play; accepts an explicit admin MVP', async t => {
  const app = fixture(t);
  await app.login();
  const imported = (await app.call('/api/admin/import', 'POST', { matchId: '123456789' })).body;
  const base = { draftId: imported.draftId, fixtureId: 'r1-m1', radiantTeam: 'wraith' };
  assert.equal((await app.call('/api/admin/publish', 'POST', { ...base, radiantTeam: 'apex' })).response.status, 400);
  assert.equal((await app.call('/api/admin/publish', 'POST', { ...base, mvpSlot: 999 })).response.status, 400);
  const published = await app.call('/api/admin/publish', 'POST', { ...base, mvpSlot: 0 });
  assert.equal(published.body.result.mvp.source, 'admin-selected');
  assert.equal(published.body.result.mvp.slot, 0);
});
test('rejects duplicate match IDs across fixtures, makes replacement explicit, and unpublishes', async t => {
  const app = fixture(t);
  await app.login();
  const first = (await app.call('/api/admin/import', 'POST', { matchId: '123456789' })).body;
  const base = { draftId: first.draftId, fixtureId: 'r1-m1', radiantTeam: 'wraith' };
  assert.equal((await app.call('/api/admin/publish', 'POST', base)).response.status, 200);
  assert.equal((await app.call('/api/admin/publish', 'POST', { ...base, fixtureId: 'r2-m1' })).response.status, 409);
  const next = (await app.call('/api/admin/import', 'POST', { matchId: '123456790' })).body;
  assert.equal((await app.call('/api/admin/publish', 'POST', { ...base, draftId: next.draftId })).response.status, 409);
  assert.equal((await app.call('/api/admin/publish', 'POST', { ...base, draftId: next.draftId, replace: true })).response.status, 200);
  assert.equal((await app.call('/api/results')).body.results['r1-m1'].matchId, '123456790');
  await app.call('/api/admin/results/r1-m1', 'DELETE');
  assert.deepEqual((await app.call('/api/results')).body.results, {});
  assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM audit').get().n, 3);
});
test('saves account mappings, rejects duplicate accounts, and infers the correct fixture and roster names', async t => {
  const app = fixture(t);
  await app.login();
  const state = (await app.call('/api/admin/state')).body;
  const wraith = state.bindings.filter(p => p.team === 'wraith').slice(0, 5);
  const scourge = state.bindings.filter(p => p.team === 'scourge').slice(0, 5);
  const selected = [...wraith, ...scourge];
  const players = state.bindings.map(p => ({ key: p.key, accountId: selected.findIndex(row => row.key === p.key) >= 0 ? String(100 + selected.findIndex(row => row.key === p.key)) : '' }));
  const duplicate = players.map(p => ({ ...p }));
  duplicate.find(p => p.accountId === '101').accountId = '100';
  assert.equal((await app.call('/api/admin/roster', 'PUT', { players: duplicate })).response.status, 400);
  assert.equal((await app.call('/api/admin/roster', 'PUT', { players })).response.status, 200);
  const imported = (await app.call('/api/admin/import', 'POST', { matchId: '123456789' })).body;
  assert.deepEqual(imported.inferred, { fixtureId: 'r1-m1', radiantTeam: 'wraith', direTeam: 'scourge' });
  assert.equal(imported.game.players[0].name, wraith[0].name);
  const game = { ...imported.game, players: imported.game.players.map((p, i) => ({ ...p, rosterTeam: i < 2 ? 'wraith' : null })) };
  assert.equal(inferFixture(game, state.tournament), null);
});
test('blocks server code, environment files, database paths, traversal, and unknown write routes', async t => {
  const app = fixture(t);
  for (const route of ['/server/app.mjs', '/.env', '/.env.example', '/.git/config', '/.data/ftap.sqlite', '/assets/%2e%2e/server/app.mjs', '/tools/setup-admin.mjs']) {
    assert.equal((await app.call(route)).response.status, 404, route);
  }
  assert.equal((await app.call('/admin/')).response.status, 200);
  assert.equal((await app.call('/matches/')).response.status, 200);
  assert.equal((await app.call('/admin')).response.status, 308);
  assert.equal((await app.call('/matches.js')).response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await app.call('/api/results')).response.headers.get('access-control-allow-origin'), '*');
});
test('persists published results across database reopening and revokes sessions on restart', async t => {
  const folder = realpathSync(mkdtempSync(path.join(tmpdir(), 'ftap-api-test-')));
  const database = path.join(folder, 'test.sqlite');
  const first = createApplication({ root, origin, database, passwordHash });
  const game = normalizeMatch(sample(), '123456789', constants);
  first.store.publish({ ...game, fixtureId: 'r1-m1', winner: 'wraith' }, false, Date.now());
  newSession(first.store, Date.now());
  assert.equal(first.store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
  first.close();
  const second = createApplication({ root, origin, database, passwordHash });
  try {
    assert.equal(second.store.results()['r1-m1'].matchId, '123456789');
    assert.equal(second.store.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  } finally {
    second.close();
    assert.ok(folder.startsWith(path.resolve(tmpdir()) + path.sep + 'ftap-api-test-'));
    rmSync(folder, { recursive: true, force: true });
  }
});
test('OpenDota requests are cached, metadata failures degrade gracefully, and rate-limit errors do not reveal keys', async t => {
  const store = openStore(':memory:'); t.after(() => store.close());
  let calls = 0;
  const api = createOpenDota({ store, apiKey: 'test-key-not-a-secret', fetcher: async url => {
    calls++;
    assert.equal(url.searchParams.get('api_key'), 'test-key-not-a-secret');
    if (url.pathname.includes('constants/')) return new Response('{}', { status: 503 });
    return Response.json(sample());
  } });
  const first = await api.match('123456789');
  assert.equal(first.raw.match_id, 123456789);
  assert.deepEqual(first.constants, { heroes: {}, items: {} });
  await api.match('123456789');
  assert.equal(calls, 5, 'the second import reuses match data but retries unavailable constants');
  const limited = createOpenDota({ store, apiKey: 'test-key-not-a-secret', fetcher: async () => new Response('', { status: 429 }) });
  await assert.rejects(limited.match('123456791'), error => error.status === 503 && !error.message.includes('test-key'));
});
test('rendered player names and items remain text, with ten players and all inventory slots', () => {
  const nodes = [];
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this._text = ''; nodes.push(this); }
    append(...items) { this.children.push(...items); }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener() {}
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  }
  const context = { document: { currentScript: { src: origin + '/match-data.js' }, createElement: tag => new Element(tag) },
    window: {}, URL, Intl, Date };
  vm.runInNewContext(readFileSync(path.join(root, 'match-data.js'), 'utf8'), context);
  const raw = sample(); raw.players[0].personaname = '<img src=x onerror=alert(1)>';
  const game = normalizeMatch(raw, '123456789', constants);
  const report = context.window.FTAPMatchData.renderGame(game);
  assert.ok(report.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(nodes.filter(node => node.tag === 'script').length, 0);
  assert.equal(nodes.filter(node => node.tag === 'tbody').flatMap(node => node.children).length, 10);
  assert.equal(nodes.filter(node => node.className === 'match-item').length, 100);
  assert.ok(report.textContent.includes('FTAP calculated MVP'));
});

test('HTTPS sessions receive Secure cookies and admin responses never allow cross-origin credentials', async t => {
  const secureOrigin = 'https://ftap.example';
  const app = createApplication({ root, origin: secureOrigin, passwordHash, store: openStore(':memory:') });
  t.after(() => app.close());
  const response = await app.handle(new Request(secureOrigin + '/api/admin/login', {
    method: 'POST', headers: { Origin: secureOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password })
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /; Secure/);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('expired import previews cannot be published after signing in again', async t => {
  const app = fixture(t);
  await app.login();
  const draft = (await app.call('/api/admin/import', 'POST', { matchId: '123456789' })).body;
  app.setTime(1700000000000 + 2 * 86400000);
  await app.login();
  assert.equal((await app.call('/api/admin/publish', 'POST', {
    draftId: draft.draftId, fixtureId: 'r1-m1', radiantTeam: 'wraith'
  })).response.status, 404);
  assert.deepEqual((await app.call('/api/results')).body.results, {});
});
test('replay analysis queues once per cooldown and reports rejected jobs honestly', async t => {
  const store = openStore(':memory:'); t.after(() => store.close());
  let calls = 0;
  const api = createOpenDota({ store, fetcher: async (url, options) => {
    calls++; assert.equal(options.method, 'POST');
    assert.equal(url.pathname, '/api/request/123456789');
    return Response.json({ job: { jobId: 123 } });
  } });
  assert.equal((await api.parse('123456789')).requested, true);
  await assert.rejects(api.parse('123456789'), error => error.status === 429);
  assert.equal(calls, 1);
  const rejected = createOpenDota({ store, fetcher: async () => Response.json({ error: 'Replay unavailable' }) });
  await assert.rejects(rejected.parse('123456790'), error => error.status === 422);
});
