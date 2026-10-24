const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const harness = fs.readFileSync('tests/table-flow.cjs', 'utf8').split('vm.createContext(ctx);')[0];
const game = ['status-icons.js', 'table-ui.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n') + '\n' +
  fs.readFileSync('index.html', 'utf8').split('<script>')[1].split('</script>')[0];
function boot(storage = {}, options = {}) {
  const h = vm.runInNewContext(harness + '\n({ctx,ids,storage})', { require, console, structuredClone, URL, Blob, setTimeout, clearTimeout });
  const ctx = h.ctx;
  ctx.window = ctx;
  ctx.localStorage = {
    getItem(k) { if (options.storageBlocked) throw Error('blocked'); return storage[k] ?? null; },
    setItem(k, v) { if (options.storageBlocked) throw Error('blocked'); storage[k] = v; }
  };
  ctx.location = { hostname: 'byh10610-gif.github.io', pathname: '/gaia-table-ai/', search: '?name=PRIVATE', hash: '#PRIVATE' };
  ctx.document.head = { append(s) { h.script = s; if (options.scriptBlocked) throw Error('blocked'); } };
  vm.createContext(ctx);
  if (!options.adapterMissing) vm.runInContext(fs.readFileSync('analytics.js', 'utf8'), ctx);
  vm.runInContext(game, ctx);
  h.storage = storage;
  h.events = () => Array.from(ctx.dataLayer || [], x => Array.from(x)).filter(x => x[0] === 'event');
  h.run = code => vm.runInContext(code, ctx);
  h.click = text => {
    function find(e) { if (e.tag === 'button' && e.textContent === text) return e; for (const c of e.children || []) { const b = find(c); if (b) return b; } }
    const button = find(h.ids.panel);
    assert(button, 'Missing UI button: ' + text);
    button.click();
    assert.equal(h.ids.error.hidden, true, h.ids.error.textContent);
  };
  h.import = async data => {
    h.ids.import.files = [{ text: async () => JSON.stringify(data) }];
    await h.ids.import.onchange();
  };
  return h;
}
(async () => {
  const h = boot();
  assert.equal(h.script.src, 'https://www.googletagmanager.com/gtag/js?id=G-645X5N7K1W');
  const config = Array.from(h.ctx.dataLayer[1]);
  assert.equal(config[0], 'config'); assert.equal(config[2].send_page_view, true);
  assert.equal(config[2].page_location, 'https://byh10610-gif.github.io/gaia-table-ai/');
  h.ids.start.click();
  assert.equal(h.events().length, 0, 'random setup is not a start');
  h.click('건물 배치 시작');
  assert.deepEqual(h.events().map(e => e[1]), ['gaia_game_start']);
  h.ids.undo.click(); h.run("view='overview';render()"); h.click('건물 배치 시작');
  h.run('render();render()');
  assert.equal(h.events().length, 1, 'undo/reconfirm/render must not repeat start');
  const resumed = boot(h.storage);
  resumed.run("view='overview';render()"); resumed.click('건물 배치 시작');
  assert.equal(resumed.events().length, 0, 'reload must retain start claim');
  const tabA = boot(); tabA.ids.start.click();
  const tabB = boot(tabA.storage); tabB.run("view='overview';render()");
  tabA.click('건물 배치 시작'); tabB.click('건물 배치 시작');
  assert.equal(tabA.events().length + tabB.events().length, 1, 'two tabs share persistent claims');
  h.run("state.round.phase='final_scoring';state.pendingEffects=[];view='play';render()");
  h.click('최종 점수 계산');
  assert.deepEqual(h.events().map(e => e[1]), ['gaia_game_start', 'gaia_game_complete']);
  const finished = structuredClone(h.ctx.gaiaTest.state);
  h.ids.undo.click(); h.click('최종 점수 계산');
  assert.equal(h.events().length, 2, 'undo/re-score must not repeat completion');
  const finishedReload = boot(h.storage);
  finishedReload.ids.undo.click(); finishedReload.click('최종 점수 계산');
  assert.equal(finishedReload.events().length, 0, 'reload + undo must retain complete claim');
  const imported = boot();
  await imported.import({ state: finished });
  assert.deepEqual(imported.events().map(e => e[1]), ['gaia_game_import']);
  imported.run('render();render()');
  await imported.import(finished);
  assert.equal(imported.events().filter(e => e[1] === 'gaia_game_import').length, 2, 'each successful import is counted');
  const legacy = structuredClone(finished); delete legacy.uiAnalytics;
  await imported.import(legacy);
  imported.run("state.finalScoringApplied=false;delete state.finalScoringResult;state.round.phase='final_scoring';render()");
  imported.click('최종 점수 계산');
  assert.equal(imported.events().filter(e => e[1] === 'gaia_game_complete').length, 0, 'finished legacy import cannot become a new completion');
  const inProgress = structuredClone(legacy); inProgress.finalScoringApplied=false; delete inProgress.finalScoringResult; inProgress.round.phase='final_scoring';
  const progressImport = boot(); await progressImport.import(inProgress); progressImport.click('최종 점수 계산');
  assert.deepEqual(progressImport.events().map(e => e[1]), ['gaia_game_import', 'gaia_game_complete']);
  await imported.import({ invalid: true });
  assert.equal(imported.events().length, 3, 'failed import must not send an event');
  const privatePayload = JSON.stringify(h.ctx.dataLayer);
  for (const value of ['PRIVATE', ...finished.players.map(p => p.name), finished.uiAnalytics.id, 'actionLog', 'uiAnalytics', 'resources']) assert(!privatePayload.includes(value), 'private data leaked: ' + value);
  for (const event of h.events()) assert.deepEqual(Object.keys(event[2]).sort(), ['page_location','page_referrer','page_title','send_to']);
  for (const options of [{ scriptBlocked: true }, { storageBlocked: true }, { adapterMissing: true }]) {
    const blocked = boot({}, options); blocked.ids.start.click(); blocked.click('건물 배치 시작');
    blocked.ctx.gtag = () => { throw Error('blocked'); };
    blocked.run("state.round.phase='final_scoring';state.pendingEffects=[];view='play';render()");
    blocked.click('최종 점수 계산');
    assert.equal(blocked.ctx.gaiaTest.state.round.phase, 'game_end');
    assert(blocked.ids.panel.children.some(x => x.className === 'finalResults'));
  }
  console.log('PASS: real start/import/scoring handlers; refresh/render/undo dedup; legacy/finished/in-progress imports; private payload allowlist; blocked storage/tag/adapter; winner screen');
})().catch(e => { console.error(e); process.exitCode = 1; });
