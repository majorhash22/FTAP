import { readFileSync } from 'node:fs';
import path from 'node:path';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireValue(condition, message, status = 400) {
  if (!condition) throw new AppError(status, message);
}
export function matchId(value) {
  const id = String(value ?? '');
  requireValue(/^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id)), 'Enter a valid numeric Dota match ID.');
  return id;
}
export function accountId(value) {
  let id = String(value ?? '').trim();
  if (!id) return '';
  if (id.startsWith('https://steamcommunity.com/profiles/')) {
    id = new URL(id).pathname.split('/')[2];
  }
  requireValue(/^\d{1,20}$/.test(id), 'Use a numeric Dota Friend ID, Steam64 ID, or numeric Steam profile URL.');
  let number = BigInt(id);
  if (number >= 76561197960265728n) number -= 76561197960265728n;
  requireValue(number > 0n && number < 4294967295n, 'This Steam account ID is invalid or anonymous.');
  return String(number);
}
const text = value => String(value ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
export function loadTournament(root) {
  const fixturesHTML = readFileSync(path.join(root, 'matches/index.html'), 'utf8');
  const rosterHTML = readFileSync(path.join(root, 'index.html'), 'utf8');
  const fixtures = [...fixturesHTML.matchAll(/<details class="match" id="([^"]+)" data-home="([^"]+)" data-away="([^"]+)">/g)]
    .map(([, id, home, away]) => ({ id, home, away }));
  const teams = new Map();
  for (const [, id, name] of fixturesHTML.matchAll(/<span class="match-team" data-team="([^"]+)">[\s\S]*?<span class="match-team-name">([^<]+)<\/span>/g)) {
    teams.set(id, { id, name: text(name), players: [] });
  }
  for (const [, article] of rosterHTML.matchAll(/<article class="team-slide\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g)) {
    const name = article.match(/<h3>([^<]+)<\/h3>/)?.[1];
    const team = [...teams.values()].find(item => item.name === text(name));
    if (!team) continue;
    team.players = [...article.matchAll(/class="player-name">([^<]+)<\/h4>/g)].map(([, player]) => ({
      key: team.id + ':' + text(player).toLowerCase(), name: text(player), team: team.id
    }));
  }
  requireValue(fixtures.length === 15 && teams.size === 6 && [...teams.values()].every(team => team.players.length >= 5),
    'Tournament fixtures or roster could not be loaded.', 500);
  return { fixtures, teams: [...teams.values()] };
}
const numberOrNull = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const iconRoot = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/';
function icon(type, key) { return /^[a-z0-9_]+$/.test(key || '') ? iconRoot + type + '/' + key + '.png' : null; }
export function normalizeMatch(raw, expectedId, constants = {}, bindings = []) {
  requireValue(raw && String(raw.match_id) === String(expectedId), 'The provider returned a different match.', 502);
  requireValue(typeof raw.radiant_win === 'boolean' && numberOrNull(raw.duration) > 0,
    'This match has no completed result yet. Try again after it finishes.', 422);
  requireValue(Array.isArray(raw.players) && raw.players.length === 10, 'Only completed 5v5 Dota matches can be linked to these fixtures.', 422);
  const slots = raw.players.map(player => player.player_slot);
  requireValue(new Set(slots).size === 10 && slots.every(slot => [0, 1, 2, 3, 4, 128, 129, 130, 131, 132].includes(slot)),
    'The match does not contain five players on each side.', 422);
  const itemMap = new Map(Object.entries(constants.items || {}).map(([key, item]) => [Number(item.id), { key, ...item }]));
  const known = new Map(bindings.filter(row => row.accountId).map(row => [row.accountId, row]));
  function item(id) {
    if (!id) return null;
    const entry = itemMap.get(Number(id));
    return { id: Number(id), name: text(entry?.dname || 'Item ' + id).slice(0, 120), image: icon('items', entry?.key) };
  }
  const players = raw.players.slice().sort((a, b) => a.player_slot - b.player_slot).map(player => {
    requireValue(Number.isInteger(player.hero_id) && player.hero_id > 0 &&
      ['kills', 'deaths', 'assists'].every(key => Number.isInteger(player[key]) && player[key] >= 0),
    'The match scoreboard is incomplete. Retry the import later.', 422);
    const id = player.account_id && player.account_id !== 4294967295 ? String(player.account_id) : null;
    const mapped = known.get(id);
    const hero = constants.heroes?.[player.hero_id];
    const heroKey = hero?.name?.replace(/^npc_dota_hero_/, '');
    const stats = {};
    for (const key of ['kills', 'deaths', 'assists', 'level', 'last_hits', 'denies', 'gold_per_min', 'xp_per_min',
      'net_worth', 'hero_damage', 'tower_damage', 'hero_healing', 'obs_placed', 'sen_placed', 'stuns']) stats[key] = numberOrNull(player[key]);
    return {
      slot: player.player_slot, side: player.player_slot < 128 ? 'radiant' : 'dire', accountId: id,
      name: text(mapped?.name || player.personaname || player.name || 'Anonymous player').slice(0, 80),
      rosterTeam: mapped?.team || null,
      hero: { id: player.hero_id, name: text(hero?.localized_name || 'Hero ' + player.hero_id), image: icon('heroes', heroKey) },
      stats, items: Array.from({ length: 6 }, (_, i) => item(player['item_' + i])),
      backpack: Array.from({ length: 3 }, (_, i) => item(player['backpack_' + i])),
      neutral: item(player.item_neutral)
    };
  });
  return {
    matchId: String(expectedId), source: 'OpenDota', radiantWin: raw.radiant_win,
    duration: raw.duration, startTime: numberOrNull(raw.start_time), mode: numberOrNull(raw.game_mode),
    lobbyType: numberOrNull(raw.lobby_type), parsed: Boolean(raw.version || raw.od_data?.has_parsed),
    radiantScore: numberOrNull(raw.radiant_score) ?? players.filter(p => p.side === 'radiant').reduce((n, p) => n + p.stats.kills, 0),
    direScore: numberOrNull(raw.dire_score) ?? players.filter(p => p.side === 'dire').reduce((n, p) => n + p.stats.kills, 0),
    players
  };
}
export function inferFixture(game, tournament) {
  function sideTeam(side) {
    const counts = new Map();
    game.players.filter(p => p.side === side && p.rosterTeam).forEach(p => counts.set(p.rosterTeam, (counts.get(p.rosterTeam) || 0) + 1));
    const ranked = [...counts].sort((a, b) => b[1] - a[1]);
    return ranked[0]?.[1] >= 3 && ranked[0][1] > (ranked[1]?.[1] || 0) ? ranked[0][0] : null;
  }
  const radiant = sideTeam('radiant'), dire = sideTeam('dire');
  const fixture = radiant && dire && radiant !== dire
    ? tournament.fixtures.find(f => [f.home, f.away].includes(radiant) && [f.home, f.away].includes(dire)) : null;
  return fixture ? { fixtureId: fixture.id, radiantTeam: radiant, direTeam: dire } : null;
}
export function calculateMvp(game) {
  const candidates = game.players.filter(p => p.side === (game.radiantWin ? 'radiant' : 'dire'));
  const metrics = [
    [0.35, p => p.stats.kills + p.stats.assists],
    [0.20, p => p.stats.hero_damage],
    [0.15, p => p.stats.tower_damage],
    [0.15, p => (p.stats.hero_healing ?? 0) + 100 * ((p.stats.obs_placed ?? 0) + (p.stats.sen_placed ?? 0))],
    [0.10, p => p.stats.gold_per_min],
    [0.05, p => -p.stats.deaths]
  ];
  function rank(player, getter) {
    const value = getter(player), values = candidates.map(getter).filter(v => v !== null && Number.isFinite(v));
    if (value === null || !values.length) return 0;
    const min = Math.min(...values), max = Math.max(...values);
    return max === min ? 0.5 : (value - min) / (max - min);
  }
  const ranked = candidates.map(player => ({
    player, score: metrics.reduce((total, [weight, getter]) => total + weight * rank(player, getter), 0)
  })).sort((a, b) => b.score - a.score || a.player.slot - b.player.slot);
  return { slot: ranked[0].player.slot, name: ranked[0].player.name, source: 'ftap-calculated', score: Math.round(ranked[0].score * 1000) / 10 };
}
export function publishResult(game, body, tournament) {
  const fixture = tournament.fixtures.find(f => f.id === body.fixtureId);
  requireValue(fixture, 'Choose a valid tournament fixture.');
  requireValue([fixture.home, fixture.away].includes(body.radiantTeam), 'Choose which fixture team played Radiant.');
  const direTeam = body.radiantTeam === fixture.home ? fixture.away : fixture.home;
  const players = game.players.map(p => ({ ...p, team: p.side === 'radiant' ? body.radiantTeam : direTeam }));
  let mvp = calculateMvp(game);
  if (body.mvpSlot !== null && body.mvpSlot !== undefined && body.mvpSlot !== '') {
    const selected = players.find(p => p.slot === body.mvpSlot);
    requireValue(selected, 'Select an MVP who played in this match.');
    mvp = { slot: selected.slot, name: selected.name, source: 'admin-selected' };
  }
  mvp.team = players.find(p => p.slot === mvp.slot).team;
  return { ...game, players, fixtureId: fixture.id, radiantTeam: body.radiantTeam, direTeam,
    winner: game.radiantWin ? body.radiantTeam : direTeam, mvp, complete: true };
}
