(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const { element, renderGame } = window.FTAPMatchData;
  let csrf = '', state = null, draft = null;
  const names = new Map();
  function status(message, kind = '') {
    $('#admin-status').textContent = message;
    $('#admin-status').dataset.state = kind;
  }
  function signOutView() {
    csrf = ''; state = null; draft = null;
    $('#admin-workspace').hidden = true; $('#login-panel').hidden = false; $('#logout').hidden = true;
    $('#match-preview').replaceChildren(); $('#roster-fields').replaceChildren(); $('#published-results').replaceChildren();
    $('#preview-panel').hidden = true;
  }
  async function api(route, options = {}) {
    const headers = { ...options.headers };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrf;
    let response;
    try { response = await fetch('/api/admin/' + route, { credentials: 'same-origin', cache: 'no-store', ...options, headers }); }
    catch { throw new Error('Cannot reach the match service. Try again shortly.'); }
    let result;
    try { result = await response.json(); } catch { throw new Error('The match service is not available on this host. Start the FTAP server or open its admin URL.'); }
    if (response.status === 401 && route !== 'login') signOutView();
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }
  async function busy(button, action) {
    if (button.disabled) return;
    button.disabled = true;
    try { await action(); } catch (error) { status(error.message, 'error'); }
    finally { button.disabled = false; }
  }
  function option(value, label) {
    const result = element('option', '', label); result.value = value; return result;
  }
  function publishedList() {
    const target = $('#published-results');
    target.replaceChildren();
    if (!state.published.length) { target.append(element('p', 'admin-help', 'No imported results have been published yet.')); return; }
    state.published.forEach(result => {
      const fixture = state.tournament.fixtures.find(f => f.id === result.fixtureId);
      const row = element('div', 'admin-published-row');
      const copy = element('div');
      copy.append(element('p', '', result.fixtureId.toUpperCase() + ' · ' + names.get(fixture.home) + ' vs ' + names.get(fixture.away)),
        element('small', '', 'Match #' + result.matchId + ' · Winner: ' + names.get(result.winner) + ' · MVP: ' + result.mvp.name));
      const remove = element('button', '', 'Unpublish'); remove.type = 'button';
      remove.addEventListener('click', () => busy(remove, async () => {
        await api('results/' + result.fixtureId, { method: 'DELETE' });
        await loadState(); status('Result unpublished. The public fixture is pending again.', 'success');
      }));
      row.append(copy, remove); target.append(row);
    });
  }
  function rosterForm() {
    const target = $('#roster-fields'); target.replaceChildren();
    state.tournament.teams.forEach(team => {
      const fieldset = element('fieldset', 'admin-roster-team');
      fieldset.append(element('legend', '', team.name));
      const fields = element('div', 'admin-roster-fields');
      state.bindings.filter(row => row.team === team.id).forEach(player => {
        const label = element('label', '', player.name);
        const input = element('input'); input.type = 'text'; input.value = player.accountId;
        input.dataset.rosterKey = player.key; input.placeholder = 'Dota Friend ID or Steam64 ID';
        input.autocomplete = 'off'; input.maxLength = 150;
        label.append(input); fields.append(label);
      });
      fieldset.append(fields); target.append(fieldset);
    });
  }
  async function loadState() {
    state = await api('state');
    state.tournament.teams.forEach(team => names.set(team.id, team.name));
    const selected = $('#fixture-select').value;
    $('#fixture-select').replaceChildren(option('', 'Choose a fixture'));
    state.tournament.fixtures.forEach(f => $('#fixture-select').append(option(f.id,
      f.id.toUpperCase() + ' · ' + names.get(f.home) + ' vs ' + names.get(f.away))));
    $('#fixture-select').value = selected;
    publishedList(); rosterForm(); updateFixture();
    $('#login-panel').hidden = true; $('#admin-workspace').hidden = false; $('#logout').hidden = false;
  }
  function updatePreview() {
    if (!draft) return;
    const fixture = state.tournament.fixtures.find(f => f.id === $('#fixture-select').value);
    const radiantTeam = $('#radiant-select').value;
    const direTeam = fixture && radiantTeam ? (fixture.home === radiantTeam ? fixture.away : fixture.home) : '';
    const game = { ...draft.game, radiantTeam, direTeam };
    const slot = $('#mvp-select').value === '' ? draft.suggestedMvp.slot : Number($('#mvp-select').value);
    game.mvp = { slot, source: $('#mvp-select').value === '' ? 'ftap-calculated' : 'admin-selected' };
    $('#match-preview').replaceChildren(renderGame(game, names));
    $('#side-note').textContent = direTeam ? 'Dire: ' + names.get(direTeam) + '. Winner from match data: ' + names.get(game.radiantWin ? radiantTeam : direTeam) + '.' : 'Choose the fixture and its Radiant team to identify the winner.';
  }
  function updateFixture() {
    if (!state) return;
    const fixture = state.tournament.fixtures.find(f => f.id === $('#fixture-select').value);
    const previous = $('#radiant-select').value;
    $('#radiant-select').replaceChildren(option('', 'Choose the Radiant team'));
    $('#radiant-select').disabled = !fixture;
    if (fixture) {
      for (const id of [fixture.home, fixture.away]) $('#radiant-select').append(option(id, names.get(id)));
      if ([fixture.home, fixture.away].includes(previous)) $('#radiant-select').value = previous;
    }
    $('#replace-result').checked = false;
    $('#replace-label').hidden = !state.published.some(result => result.fixtureId === fixture?.id);
    updatePreview();
  }
  $('#login-form').addEventListener('submit', event => {
    event.preventDefault();
    busy(event.submitter || $('#login-form button'), async () => {
      status('Signing in…');
      const username = $('#login-form [name=username]').value, password = $('#login-form [name=password]').value;
      let result;
      try { result = await api('login', { method: 'POST', body: JSON.stringify({ username, password }) }); }
      finally { $('#login-form [name=password]').value = ''; }
      csrf = result.csrf; await loadState(); status('Signed in.', 'success');
    });
  });
  $('#logout').addEventListener('click', () => busy($('#logout'), async () => {
    await api('logout', { method: 'POST' }); signOutView(); status('Signed out.');
  }));
  $('#import-form').addEventListener('submit', event => {
    event.preventDefault();
    busy(event.submitter || $('#import-form button'), async () => {
      status('Fetching match details…');
      draft = null; $('#preview-panel').hidden = true;
      const result = await api('import', { method: 'POST', body: JSON.stringify({ matchId: $('#dota-match-id').value.trim() }) });
      draft = result;
      $('#fixture-select').value = result.inferred?.fixtureId || '';
      updateFixture();
      if (result.inferred) $('#radiant-select').value = result.inferred.radiantTeam;
      $('#mvp-select').replaceChildren(option('', 'FTAP calculated · ' + result.suggestedMvp.name));
      result.game.players.forEach(p => $('#mvp-select').append(option(String(p.slot), p.name + ' · ' + p.hero.name + ' · ' + p.side)));
      $('#mapping-note').textContent = result.inferred ? 'Fixture and sides matched from the saved roster IDs.' : 'Automatic team matching needs more roster IDs. Select this game’s fixture and Radiant team below.';
      $('#mvp-note').textContent = 'Suggested MVP: ' + result.suggestedMvp.name + '. This is an FTAP calculation, separate from Dota’s in-game award. You can select another player.';
      $('#preview-panel').hidden = false; updatePreview();
      status('Match imported. Review the teams and publish when ready.', 'success');
    });
  });
  $('#fixture-select').addEventListener('change', updateFixture);
  $('#radiant-select').addEventListener('change', updatePreview);
  $('#mvp-select').addEventListener('change', updatePreview);
  $('#publish-form').addEventListener('submit', event => {
    event.preventDefault();
    busy(event.submitter || $('#publish-form button'), async () => {
      if (!draft) throw new Error('Import a match first.');
      const selected = $('#mvp-select').value;
      const result = await api('publish', { method: 'POST', body: JSON.stringify({
        draftId: draft.draftId, fixtureId: $('#fixture-select').value, radiantTeam: $('#radiant-select').value,
        mvpSlot: selected === '' ? null : Number(selected), replace: $('#replace-result').checked
      }) });
      $('#preview-panel').hidden = true; draft = null; await loadState();
      status('Published match #' + result.result.matchId + '. The public Matches page now has the winner, MVP, scoreboard and items.', 'success');
    });
  });
  $('#request-parse').addEventListener('click', () => busy($('#request-parse'), async () => {
    if (!draft) throw new Error('Import a match first.');
    const result = await api('parse', { method: 'POST', body: JSON.stringify({ matchId: draft.game.matchId }) });
    status(result.message);
  }));
  $('#roster-form').addEventListener('submit', event => {
    event.preventDefault();
    busy(event.submitter || $('#roster-form button'), async () => {
      const players = [...document.querySelectorAll('[data-roster-key]')].map(input => ({ key: input.dataset.rosterKey, accountId: input.value.trim() }));
      await api('roster', { method: 'PUT', body: JSON.stringify({ players }) });
      await loadState(); status('Roster account IDs saved. Future imports can identify these players automatically.', 'success');
    });
  });
  if (location.protocol === 'file:') status('Open this page through the FTAP server to sign in.', 'error');
  else api('session').then(async session => { csrf = session.csrf; await loadState(); })
    .catch(error => { if (error.message !== 'Sign in to manage match results.') status(error.message, 'error'); });
})();
