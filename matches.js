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
  const results = window.FTAP_CONFIG?.matchResults || {};
  const teamNames = new Map();
  document.querySelectorAll('.match-team').forEach(team => {
    teamNames.set(team.dataset.team, team.querySelector('.match-team-name').textContent);
  });

  // Confirmed results are opt-in; dates never turn an upcoming fixture into a win.
  matches.forEach(match => {
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
      panel.querySelector('.result-note').textContent = teamNames.get(result.mvp.team);
    }
  });

  function filterMatches(team) {
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
  filterMatches('all');
  document.querySelectorAll('[data-js-control]').forEach(control => { control.hidden = false; });
})();
