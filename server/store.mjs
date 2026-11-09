import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from './domain.mjs';

export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec([
    'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL);',
    'CREATE TABLE IF NOT EXISTS bindings (roster_key TEXT PRIMARY KEY, account_id TEXT NOT NULL UNIQUE);',
    'CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, match_id TEXT NOT NULL, payload TEXT NOT NULL, created INTEGER NOT NULL);',
    'CREATE TABLE IF NOT EXISTS results (fixture_id TEXT PRIMARY KEY, match_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, updated INTEGER NOT NULL);',
    'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL);',
    'CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, action TEXT NOT NULL, fixture_id TEXT, match_id TEXT, created INTEGER NOT NULL);'
  ].join('\n'));
  return {
    db, close: () => db.close(),
    cleanup(now) {
      db.prepare('DELETE FROM sessions WHERE expires <= ?').run(now);
      db.prepare('DELETE FROM drafts WHERE created < ?').run(now - 86400000);
      db.prepare('DELETE FROM cache WHERE expires <= ?').run(now);
    },
    bindings(tournament) {
      const saved = new Map(db.prepare('SELECT * FROM bindings').all().map(row => [row.roster_key, row.account_id]));
      return tournament.teams.flatMap(team => team.players).map(p => ({ ...p, accountId: saved.get(p.key) || '' }));
    },
    saveBindings(rows) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec('DELETE FROM bindings');
        const statement = db.prepare('INSERT INTO bindings (roster_key, account_id) VALUES (?, ?)');
        rows.filter(row => row.accountId).forEach(row => statement.run(row.key, row.accountId));
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    draft(game, now) {
      const id = randomUUID();
      db.prepare('INSERT INTO drafts VALUES (?, ?, ?, ?)').run(id, game.matchId, JSON.stringify(game), now);
      return id;
    },
    getDraft(id, now) {
      const row = db.prepare('SELECT * FROM drafts WHERE id=? AND created>?').get(id, now - 86400000);
      if (!row) throw new AppError(404, 'This import preview expired. Import the match again.');
      return JSON.parse(row.payload);
    },
    results() {
      return Object.fromEntries(db.prepare('SELECT * FROM results ORDER BY fixture_id').all()
        .map(row => [row.fixture_id, { ...JSON.parse(row.payload), updatedAt: row.updated }]));
    },
    publish(result, replace, now) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const duplicate = db.prepare('SELECT fixture_id FROM results WHERE match_id=?').get(result.matchId);
        if (duplicate && duplicate.fixture_id !== result.fixtureId) throw new AppError(409, 'This Dota match is already linked to another fixture.');
        const existing = db.prepare('SELECT * FROM results WHERE fixture_id=?').get(result.fixtureId);
        if (existing && !replace) throw new AppError(409, 'This fixture already has a result. Select Replace to update it.');
        db.prepare('INSERT INTO results VALUES (?, ?, ?, ?) ON CONFLICT(fixture_id) DO UPDATE SET match_id=excluded.match_id,payload=excluded.payload,updated=excluded.updated')
          .run(result.fixtureId, result.matchId, JSON.stringify(result), now);
        db.prepare('INSERT INTO audit (action,fixture_id,match_id,created) VALUES (?,?,?,?)')
          .run(existing ? 'replace' : 'publish', result.fixtureId, result.matchId, now);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    unpublish(fixtureId, now) {
      const existing = db.prepare('SELECT match_id FROM results WHERE fixture_id=?').get(fixtureId);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM results WHERE fixture_id=?').run(fixtureId);
        if (existing) db.prepare('INSERT INTO audit (action,fixture_id,match_id,created) VALUES (?,?,?,?)').run('unpublish', fixtureId, existing.match_id, now);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    getCache(key, now) {
      const row = db.prepare('SELECT payload FROM cache WHERE key=? AND expires>?').get(key, now);
      return row ? JSON.parse(row.payload) : null;
    },
    cache(key, value, expires) {
      db.prepare('INSERT INTO cache VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,expires=excluded.expires')
        .run(key, JSON.stringify(value), expires);
    }
  };
}
