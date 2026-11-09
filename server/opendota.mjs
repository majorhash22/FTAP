import { AppError, matchId } from './domain.mjs';

export function createOpenDota({ store, apiKey = '', fetcher = fetch, clock = Date.now }) {
  const inflight = new Map();
  async function request(endpoint, method = 'GET') {
    const url = new URL('https://api.opendota.com/api/' + endpoint);
    if (apiKey) url.searchParams.set('api_key', apiKey);
    let response;
    try {
      response = await fetcher(url, { method, signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
    } catch { throw new AppError(503, 'OpenDota is unavailable or taking too long. Please retry shortly.'); }
    if (response.status === 404) throw new AppError(404, 'Match data is not available yet. Check the ID or retry after OpenDota processes it.');
    if (response.status === 429) throw new AppError(503, 'The match provider is rate-limiting requests. Retry in a minute.');
    if (!response.ok) throw new AppError(502, 'The match provider could not complete this request. Retry later.');
    try { return await response.json(); } catch { throw new AppError(502, 'The match provider returned an invalid response.'); }
  }
  async function cached(key, endpoint, ttl) {
    const previous = store.getCache(key, clock());
    if (previous) return previous;
    if (!inflight.has(key)) inflight.set(key, request(endpoint).then(data => {
      store.cache(key, data, clock() + ttl); return data;
    }).finally(() => inflight.delete(key)));
    return inflight.get(key);
  }
  return {
    async match(id) {
      id = matchId(id);
      const [raw, heroes, items] = await Promise.all([
        cached('match:' + id, 'matches/' + id, 60000),
        cached('heroes', 'constants/heroes', 86400000).catch(() => ({})),
        cached('items', 'constants/items', 86400000).catch(() => ({}))
      ]);
      return { raw, constants: { heroes, items } };
    },
    async parse(id) {
      id = matchId(id);
      if (store.getCache('parse:' + id, clock())) throw new AppError(429, 'Detailed analysis was already requested. Wait a minute before retrying.');
      const result = await request('request/' + id, 'POST');
      if (!result || result.error || result.err || result.status === 'failed') {
        throw new AppError(422, 'Replay analysis could not be queued. The replay may be unavailable; try again later.');
      }
      store.cache('parse:' + id, true, clock() + 60000);
      store.db.prepare('DELETE FROM cache WHERE key=?').run('match:' + id);
      return { requested: true, message: 'Replay analysis requested. It may take several minutes; import the match again to refresh its data.' };
    }
  };
}
