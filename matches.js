(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      menu.focus();
    }
  });
  window.matchMedia('(max-width: 800px)').addEventListener('change', closeMenu);

  const matches = [...document.querySelectorAll('.match')];
  const rounds = [...document.querySelectorAll('.round')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const postedResults = window.FTAP_CONFIG?.matchResults || {};
  let activeFilter = 'all';
  const teamNames = new Map();
  document.querySelectorAll('.match-team').forEach(team => {
    teamNames.set(team.dataset.team, team.querySelector('.match-team-name').textContent);
  });

  // The API is authoritative when reachable; static results remain an offline fallback.
  function showResults(results) {
   matches.forEach(match => {
    match.querySelector('.match-report')?.remove();
    delete match.dataset.complete;
    match.querySelector('.match-status').textContent = 'Upcoming';
    for (const type of ['winner', 'mvp']) {
      const panel = match.querySelector('[data-result="' + type + '"]');
      delete panel.dataset.team;
      panel.querySelector('.result-name').textContent = type === 'winner' ? 'To be decided' : 'To be announced';
      panel.querySelector('.result-note').textContent = type === 'winner' ? 'Posted after the match.' : 'Revealed with the results.';
    }
    const result = results[match.id];
    if (!result || typeof result !== 'object') return;
    const participants = [match.dataset.home, match.dataset.away];
    if (participants.includes(result.winner)) {
      const panel = match.querySelector('[data-result="winner"]');
      panel.dataset.team = result.winner;
      panel.querySelector('.result-name').textContent = teamNames.get(result.winner);
      panel.querySelector('.result-note').textContent = 'Confirmed match winner';
      match.querySelector('.match-status').textContent = 'Completed';
      match.dataset.complete = 'true';
    }
    if (result.mvp && typeof result.mvp.name === 'string' && result.mvp.name.trim() && participants.includes(result.mvp.team)) {
      const panel = match.querySelector('[data-result="mvp"]');
      panel.dataset.team = result.mvp.team;
      panel.querySelector('.result-name').textContent = result.mvp.name.trim();
      const source = result.mvp.source === 'ftap-calculated' ? 'FTAP calculated MVP'
        : result.mvp.source === 'admin-selected' ? 'Admin-selected MVP' : '';
      panel.querySelector('.result-note').textContent = teamNames.get(result.mvp.team) + (source ? ' · ' + source : '');
    }
    if (Array.isArray(result.players) && result.players.length === 10 && window.FTAPMatchData) {
      match.querySelector('.match-details').append(window.FTAPMatchData.renderGame(result, teamNames));
    }
   });
  }

  function filterMatches(team) {
    activeFilter = team;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === team)));
    matches.forEach(match => {
      match.hidden = team !== 'all' && match.dataset.home !== team && match.dataset.away !== team;
    });
    rounds.forEach(round => {
      const visible = [...round.querySelectorAll('.match')].filter(match => !match.hidden);
      round.hidden = visible.length === 0;
      const completed = visible.filter(match => match.dataset.complete === 'true').length;
      round.querySelector('.round-match-count').textContent = `${visible.length} ${visible.length === 1 ? 'match' : 'matches'}`;
      round.querySelector('.round-progress').textContent = completed ? `${completed} / ${visible.length} completed` : 'Results pending';
    });
    const visible = matches.filter(match => !match.hidden);
    const completed = visible.filter(match => match.dataset.complete === 'true').length;
    document.querySelector('#matches-count').textContent = `${team === 'all' ? 'All teams' : teamNames.get(team)} · ${visible.length} matches · ${completed} completed`;
  }
  filters.forEach(button => button.addEventListener('click', () => {
    filterMatches(button.dataset.filter);
    rounds.filter(round => !round.hidden).forEach(round => { round.open = true; });
  }));
  document.querySelector('[data-expand-all]').addEventListener('click', () => {
    rounds.filter(round => !round.hidden).forEach(round => { round.open = true; });
    matches.filter(match => !match.hidden).forEach(match => { match.open = true; });
  });
  document.querySelector('[data-collapse-all]').addEventListener('click', () => {
    matches.forEach(match => { match.open = false; });
    rounds.forEach(round => { round.open = false; });
  });
  showResults(postedResults);
  filterMatches('all');
  document.querySelectorAll('[data-js-control]').forEach(control => { control.hidden = false; });
  const liveStatus = document.querySelector('#match-live-status');
  async function loadImportedResults() {
    if (location.protocol === 'file:') {
      liveStatus.textContent = 'Open the online site to see imported results.';
      return;
    }
    try {
      const base = window.FTAPMatchData.apiBase();
      document.querySelector('[data-admin-link]').href = new URL('admin/', base).href;
      const response = await fetch(new URL('api/results', base), { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Results unavailable');
      const body = await response.json();
      if (!body.results || typeof body.results !== 'object' || Array.isArray(body.results)) throw new Error('Invalid results');
      showResults(body.results);
      filterMatches(activeFilter);
      liveStatus.textContent = 'Published match results are up to date.';
    } catch {
      liveStatus.textContent = 'Live results are currently unavailable. Previously posted results are shown.';
      liveStatus.dataset.state = 'error';
    }
  }
  loadImportedResults();
})();
