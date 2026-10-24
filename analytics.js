/* Optional GA4 adapter. Game data and local deduplication IDs never leave this module. */
(function (root) {
  'use strict';
  const measurementId = 'G-645X5N7K1W';
  const page = 'https://byh10610-gif.github.io/gaia-table-ai/';
  const title = '가이아 프로젝트 · 플레이 도우미';
  const prefix = 'gaia-analytics-v1:';
  const memory = new Map();
  const allowed = new Set(['gaia_game_start', 'gaia_game_import', 'gaia_game_complete']);
  function safe(fn) { try { return fn(); } catch { return undefined; } }
  function ended(s) { return !!(s.finalScoringApplied || s.round?.phase === 'game_end'); }
  function legacyId(s) {
    // Local-only fingerprint lets the same pre-analytics JSON retain its identity.
    const text = JSON.stringify(s, (k, v) => k === 'uiAnalytics' ? undefined : v);
    let a = 2166136261, b = 5381;
    for (let i = 0; i < text.length; i++) {
      a = Math.imul(a ^ text.charCodeAt(i), 16777619);
      b = Math.imul(b, 33) ^ text.charCodeAt(i);
    }
    return 'legacy-' + (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16);
  }
  function prepare(s, fresh = false) {
    if (!s) return;
    let meta = s.uiAnalytics;
    if (fresh || !meta || typeof meta.id !== 'string' || !/^(?:game|legacy)-[a-z0-9-]{1,100}$/i.test(meta.id)) {
      meta = { id: fresh ? 'game-' + (root.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)) : legacyId(s) };
      s.uiAnalytics = meta;
    }
    const stored = safe(() => JSON.parse(root.localStorage.getItem(prefix + meta.id))) || {};
    const cached = memory.get(meta.id) || {};
    meta.started = !!(meta.started || stored.started || cached.started);
    meta.complete = !!(meta.complete || stored.complete || cached.complete || ended(s));
    remember(meta);
    return meta;
  }
  function remember(meta) {
    const flags = { started: !!meta.started, complete: !!meta.complete };
    memory.set(meta.id, flags);
    safe(() => root.localStorage.setItem(prefix + meta.id, JSON.stringify(flags)));
  }
  function send(name) {
    if (!allowed.has(name)) return;
    safe(() => root.gtag?.('event', name, {
      send_to: measurementId, page_location: page, page_title: title, page_referrer: ''
    }));
  }
  root.GaiaAnalytics = {
    prepare: s => safe(() => prepare(s)),
    fresh: s => safe(() => prepare(s, true)),
    carry: (before, after) => safe(() => {
      if (!after.uiAnalytics) after.uiAnalytics = { ...prepare(before) };
    }),
    started: s => safe(() => {
      const meta = prepare(s);
      if (!meta || meta.started || meta.complete) return;
      meta.started = true;
      remember(meta); // Claim before sending; never retry blocked analytics.
      send('gaia_game_start');
    }),
    transition: (before, after) => safe(() => {
      const previous = prepare(before);
      if (before.round?.phase !== 'final_scoring' || ended(before) || !ended(after) || !after.finalScoringApplied) return;
      // prepare(after) would mark the just-completed state consumed, so check the prior ledger first.
      if (!previous || previous.complete) return;
      const meta = after.uiAnalytics = { ...previous, complete: true };
      remember(meta);
      send('gaia_game_complete');
    }),
    imported: s => safe(() => { prepare(s); send('gaia_game_import'); })
  };
  safe(() => {
    // Never send test/local-preview visits to the production property.
    if (root.location?.hostname !== 'byh10610-gif.github.io' || !/^\/gaia-table-ai\/(?:index\.html)?$/.test(root.location?.pathname)) return;
    root.dataLayer = root.dataLayer || [];
    root.gtag = function () { root.dataLayer.push(arguments); };
    root.gtag('js', new Date());
    root.gtag('config', measurementId, {
      send_page_view: true, page_location: page, page_title: title, page_referrer: '',
      allow_google_signals: false, allow_ad_personalization_signals: false
    });
    const script = root.document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    root.document.head.append(script);
  });
})(window);
