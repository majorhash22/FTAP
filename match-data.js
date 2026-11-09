/* Shared, text-safe match rendering for the public page and admin import preview. */
(() => {
  'use strict';
  const scriptBase = new URL('.', document.currentScript.src);
  function apiBase() {
    const configured = String(window.FTAP_CONFIG?.matchApiBaseUrl || '').trim();
    const base = configured ? new URL(configured.replace(/\/?$/, '/'), scriptBase) : scriptBase;
    if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Open the website through the FTAP server to load imported results.');
    return base;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const format = value => Number.isFinite(value) ? new Intl.NumberFormat().format(Math.round(value)) : '—';
  function duration(seconds) {
    return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }
  function image(url, alt, width, height) {
    const img = element('img');
    img.src = url; img.alt = alt; img.width = width; img.height = height;
    img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('error', () => { img.hidden = true; });
    return img;
  }
  function inventory(items, title) {
    const group = element('span', 'match-inventory');
    group.setAttribute('role', 'group'); group.setAttribute('aria-label', title);
    items.forEach(item => {
      const slot = element('span', 'match-item');
      slot.title = item ? item.name : 'Empty slot';
      if (item?.image) slot.append(image(item.image, item.name, 32, 24));
      else if (item) slot.append(element('span', 'item-fallback', item.name));
      else slot.setAttribute('aria-label', 'Empty slot');
      group.append(slot);
    });
    return group;
  }
  function renderGame(game, teamNames = new Map()) {
    const report = element('section', 'match-report');
    report.setAttribute('aria-label', 'Dota match ' + game.matchId + ' scoreboard');
    const heading = element('div', 'match-report-heading');
    const link = element('a', 'match-source-link', 'Dota match #' + game.matchId);
    link.href = 'https://www.opendota.com/matches/' + encodeURIComponent(game.matchId);
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    const started = Number.isFinite(game.startTime)
      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(game.startTime * 1000)) : 'Date unavailable';
    heading.append(link, element('p', '', duration(game.duration) + ' · ' + started));
    report.append(heading);
    const summary = element('div', 'match-scoreline');
    const radiant = teamNames.get(game.radiantTeam) || 'Radiant';
    const dire = teamNames.get(game.direTeam) || 'Dire';
    summary.append(element('span', '', radiant + ' · ' + format(game.radiantScore)),
      element('span', '', dire + ' · ' + format(game.direScore)));
    report.append(summary);
    if (!game.parsed) report.append(element('p', 'match-analysis-note', 'Detailed replay analysis is pending. Available match statistics are shown below.'));
    for (const [side, label] of [['radiant', radiant], ['dire', dire]]) {
      const group = element('section', 'match-scoreboard-team');
      const won = game.radiantWin === (side === 'radiant');
      group.append(element('h4', '', label + (won ? ' · Winner' : '') + ' / ' + (side === 'radiant' ? 'Radiant' : 'Dire')));
      const scroll = element('div', 'match-scoreboard-scroll');
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', label + ' player statistics; scroll horizontally for items');
      const table = element('table', 'match-scoreboard');
      const caption = element('caption', 'visually-hidden', label + ' final player statistics and items');
      const head = element('thead'), headRow = element('tr');
      for (const title of ['Player / Hero', 'K / D / A', 'Level', 'GPM', 'XPM', 'Net worth', 'LH / DN', 'Hero damage', 'Tower damage', 'Healing', 'Items / Backpack / Neutral']) {
        const cell = element('th', '', title); cell.scope = 'col'; headRow.append(cell);
      }
      head.append(headRow);
      const body = element('tbody');
      game.players.filter(player => player.side === side).forEach(player => {
        const row = element('tr', player.slot === game.mvp?.slot ? 'is-match-mvp' : '');
        const identity = element('th', 'match-player-identity'); identity.scope = 'row';
        const identityInner = element('span', 'match-player-label');
        if (player.hero.image) identityInner.append(image(player.hero.image, '', 48, 27));
        const copy = element('span');
        copy.append(element('strong', '', player.name), element('small', '', player.hero.name));
        if (player.slot === game.mvp?.slot) copy.append(element('small', 'match-mvp-tag', 'MVP'));
        identityInner.append(copy); identity.append(identityInner); row.append(identity);
        const stats = player.stats;
        for (const value of [
          [stats.kills, stats.deaths, stats.assists].map(format).join(' / '), format(stats.level),
          format(stats.gold_per_min), format(stats.xp_per_min), format(stats.net_worth),
          format(stats.last_hits) + ' / ' + format(stats.denies), format(stats.hero_damage),
          format(stats.tower_damage), format(stats.hero_healing)
        ]) row.append(element('td', '', value));
        const items = element('td', 'match-player-items');
        items.append(inventory(player.items, 'Final inventory'), inventory(player.backpack, 'Backpack'), inventory([player.neutral], 'Neutral item'));
        row.append(items); body.append(row);
      });
      table.append(caption, head, body); scroll.append(table); group.append(scroll); report.append(group);
    }
    report.append(element('p', 'match-data-attribution',
      'Match data: OpenDota. ' + (game.mvp?.source === 'admin-selected'
        ? 'MVP selected by the tournament admin.'
        : 'FTAP calculated MVP uses match statistics and is separate from Dota’s in-game award.') +
      ' Missing statistics are shown as —.'));
    return report;
  }
  window.FTAPMatchData = { apiBase, renderGame, element, format, duration };
})();
