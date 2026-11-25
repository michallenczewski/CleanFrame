/* Kafle — ekran główny z dużymi kafelkami aplikacji. ES5, pilot: strzałki, OK, Wstecz. */
(function () {
  'use strict';

  var MAX = 8, COLS = 4, STORE = 'kafle.pins.v1', DIR = 'kafle/';
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 10009: 'back', 461: 'back' };
  var DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  var BACKGROUNDS = ['night', 'valley', 'forest', 'peaks', 'summit', 'golden', 'ridge', 'cove', 'misty', 'alpine', 'bridge'];

  /* Wygląd kafelków marek: tło, wysokość znaku (px) i proporcje znaku (szer./wys.). */
  var BRANDS = {
    netflix: { name: 'Netflix', bg: '#000', h: 96, ratio: 0.55 },
    youtube: { name: 'YouTube', bg: '#fff', h: 84, ratio: 1.419 },
    disneyplus: { name: 'Disney+', bg: 'linear-gradient(160deg, #1b2b78, #0b1240)', h: 100, ratio: 1.097 },
    hbomax: { name: 'HBO Max', bg: 'linear-gradient(160deg, #1a2cff, #0a0f6b)', h: 44, ratio: 3.654 },
    primevideo: { name: 'Prime Video', bg: '#0f79af', h: 34, ratio: 4.267, wordmark: 'prime video' },
    appletv: { name: 'Apple TV', bg: '#111', h: 62, ratio: 2.042 },
    spotify: { name: 'Spotify', bg: '#121212', h: 96, ratio: 1 },
    applemusic: { name: 'Apple Music', bg: 'linear-gradient(160deg, #fa5c74, #d91f3c)', h: 84, ratio: 0.786 },
    stremio: { name: 'Stremio', bg: 'linear-gradient(160deg, #7b5bf5, #3d2a9a)', h: 84, ratio: 1 }
  };
  var DEFAULT_ORDER = ['netflix', 'youtube', 'disneyplus', 'hbomax', 'primevideo', 'appletv', 'spotify'];

  /* Podgląd w przeglądarce: udajemy kilka zainstalowanych aplikacji i wejść. */
  var PREVIEW_APPS = [
    { appId: 'org.tizen.netflix-app', name: 'Netflix', brand: 'netflix' },
    { appId: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube', brand: 'youtube' },
    { appId: 'MCmYXNxgcu.DisneyPlus', name: 'Disney+', brand: 'disneyplus' },
    { appId: 'cj37Ni3qXM.HBONow', name: 'Max', brand: 'hbomax' },
    { appId: 'org.tizen.primevideo', name: 'Prime Video', brand: 'primevideo' },
    { appId: 'com.samsung.tv.aria-video', name: 'Apple TV', brand: 'appletv' },
    { appId: 'rJeHak5zRg.Spotify', name: 'Spotify', brand: 'spotify' },
    { appId: 'org.tizen.apple.apple-music', name: 'Apple Music', brand: 'applemusic' },
    { appId: 'org.tizen.browser', name: 'Internet', brand: '' }
  ];
  var PREVIEW_INPUTS = [{ number: 1, connected: true }, { number: 2, connected: false }, { number: 3, connected: false }];

  var $ = function (id) { return document.getElementById(id); };
  var device = window.FrameDevice;
  var onTv = !!(window.tizen && window.tizen.application);
  var installed = [], inputs = [], pins = [];
  var zone = 'grid', gi = 0, ti = 0, ei = 0, editing = false, toastTimer = 0, clockTimer = 0;
  var TOP = [
    { id: 'art', label: 'Tryb sztuki', icon: 'assets/icons/art.svg' },
    { id: 'edit', label: 'Edytuj', icon: 'assets/icons/apps.svg' },
    { id: 'settings', label: 'Ustawienia', icon: 'assets/icons/settings.svg' }
  ];

  /* ---------- Dane ---------- */
  function brandOf(app) {
    if (app.brand && BRANDS[app.brand]) return app.brand;
    var n = (app.name || '').toLowerCase();
    if (/netflix/.test(n)) return 'netflix';
    if (/^youtube$/.test(n)) return 'youtube';
    if (/disney/.test(n)) return 'disneyplus';
    if (/^(hbo )?max$|hbo/.test(n)) return 'hbomax';
    if (/prime video/.test(n)) return 'primevideo';
    if (/^apple tv/.test(n)) return 'appletv';
    if (/spotify/.test(n)) return 'spotify';
    if (/apple music/.test(n)) return 'applemusic';
    return '';
  }
  function keyOf(item) { return item.kind === 'hdmi' ? 'hdmi:' + item.number : 'app:' + item.appId; }
  function findApp(appId) {
    for (var i = 0; i < installed.length; i++) if (installed[i].appId === appId) return installed[i];
    return null;
  }
  function findInput(n) {
    for (var i = 0; i < inputs.length; i++) if (inputs[i].number === n) return inputs[i];
    return null;
  }
  function resolve(key) {
    if (key.indexOf('hdmi:') === 0) {
      var n = parseInt(key.slice(5), 10), input = findInput(n);
      return input || isFinite(n) ? { kind: 'hdmi', number: n, connected: !!(input && input.connected) } : null;
    }
    var app = findApp(key.slice(4));
    return app ? { kind: 'app', appId: app.appId, name: app.name, brand: app.brand, icon: app.icon } : null;
  }
  function loadPins() {
    var saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE) || 'null'); } catch (err) { saved = null; }
    if (saved && saved.length) {
      pins = saved.map(resolve).filter(function (x) { return !!x; });
      return;
    }
    pins = [];
    DEFAULT_ORDER.forEach(function (brand) {
      for (var i = 0; i < installed.length; i++) {
        if (installed[i].brand === brand) { pins.push(resolve('app:' + installed[i].appId)); return; }
      }
    });
    var hdmi = null;
    inputs.some(function (x) { if (x.connected) { hdmi = x; return true; } return false; });
    if (!hdmi && inputs.length) hdmi = inputs[0];
    if (hdmi) pins.push({ kind: 'hdmi', number: hdmi.number, connected: hdmi.connected });
    pins = pins.slice(0, MAX);
  }
  function savePins() {
    try { window.localStorage.setItem(STORE, JSON.stringify(pins.map(keyOf))); } catch (err) { /* Brak pamięci lokalnej: kolejność wróci do domyślnej. */ }
  }

  /* ---------- Rysowanie ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function label(item) {
    if (item.kind === 'hdmi') return 'HDMI ' + item.number;
    var b = BRANDS[item.brand];
    return b ? b.name : item.name;
  }
  function faceHtml(item, scale) {
    var s = scale || 1, b = item.kind === 'app' ? BRANDS[item.brand] : null, inner, bg;
    if (item.kind === 'hdmi') {
      bg = '#2a2b2e';
      inner = '<div class="hdmi-name" style="font-size:' + Math.round(46 * s) + 'px">HDMI ' + item.number + '</div>' +
        (s > 0.5 ? '<div class="hdmi-sub">' + (item.connected ? 'Wejście' : 'Brak sygnału') + '</div>' : '');
    } else if (b) {
      bg = b.bg;
      var h = b.h * s, w = h * b.ratio;
      inner = (b.wordmark ? '<div class="wordmark" style="font-size:' + Math.round(34 * s) + 'px">' + b.wordmark + '</div>' : '') +
        '<img class="logo" src="' + DIR + item.brand + '.svg" style="width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px' + (b.wordmark ? ';margin-top:-2px' : '') + '" alt="">';
    } else {
      bg = '#2a2b2e';
      inner = item.icon ? '<img class="app-icon" src="' + esc(item.icon) + '" style="width:' + Math.round(120 * s) + 'px;height:' + Math.round(120 * s) + 'px" alt="">' :
        '<div class="hdmi-name" style="font-size:' + Math.round(40 * s) + 'px">' + esc(item.name) + '</div>';
    }
    return { bg: bg, inner: inner };
  }
  function renderGrid() {
    var html = '';
    pins.forEach(function (item, i) {
      var f = faceHtml(item, 1), on = !editing && zone === 'grid' && i === gi;
      html += '<div class="tile' + (on ? ' on' : (zone === 'grid' ? ' dim' : '')) + '"><div class="face" style="background:' + f.bg + '">' + f.inner + '</div>' +
        '<div class="label">' + esc(label(item)) + '</div></div>';
    });
    $('grid').innerHTML = html;
    $('empty').style.display = pins.length ? 'none' : 'block';
    var top = '';
    TOP.forEach(function (t, i) {
      top += '<div class="top-item' + (!editing && zone === 'top' && i === ti ? ' on' : '') + '"><img src="' + t.icon + '" alt="">' + t.label + '</div>';
    });
    $('top').innerHTML = top;
  }
  function editorItems() {
    var list = pins.slice();
    var rest = [];
    installed.forEach(function (a) { if (!pinned('app:' + a.appId)) rest.push({ kind: 'app', appId: a.appId, name: a.name, brand: a.brand, icon: a.icon }); });
    inputs.forEach(function (x) { if (!pinned('hdmi:' + x.number)) rest.push({ kind: 'hdmi', number: x.number, connected: x.connected }); });
    rest.sort(function (a, b) { return label(a).toLowerCase().localeCompare(label(b).toLowerCase()); });
    return list.concat(rest);
  }
  function pinned(key) {
    for (var i = 0; i < pins.length; i++) if (keyOf(pins[i]) === key) return i + 1;
    return 0;
  }
  function renderEditor() {
    var items = editorItems(), html = '';
    if (ei >= items.length) ei = items.length - 1;
    if (ei < 0) ei = 0;
    items.forEach(function (item, i) {
      var f = faceHtml(item, 0.34), n = pinned(keyOf(item));
      html += '<div class="row' + (i === ei ? ' on' : '') + '"><div class="mini" style="background:' + f.bg + '">' + f.inner + '</div>' +
        '<div class="name">' + esc(label(item)) + '</div>' +
        (n ? '<div class="badge">' + n + '</div>' : '<div class="state">' + (i === ei ? 'OK — dodaj' : '') + '</div>') + '</div>';
    });
    $('edRows').innerHTML = html;
    var offset = Math.max(0, Math.min(ei - 3, items.length - 7)) * 104;
    $('edRows').style.transform = 'translateY(' + (-offset) + 'px)';
    $('edSub').textContent = 'Na ekranie: ' + pins.length + ' z ' + MAX;
  }
  function render() {
    renderGrid();
    $('editor').hidden = !editing;
    $('stage').className = editing ? 'stage is-editing' : 'stage';
    if (editing) renderEditor();
  }

  function tick() {
    var d = new Date(), m = d.getMinutes();
    $('clockTime').textContent = d.getHours() + ':' + (m < 10 ? '0' : '') + m;
    $('clockDate').textContent = DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    clearTimeout(clockTimer);
    clockTimer = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
  }
  function background() {
    var d = new Date(), start = new Date(d.getFullYear(), 0, 1);
    var day = Math.floor((d - start) / 86400000);
    $('bg').style.backgroundImage = 'url(' + DIR + 'bg-' + BACKGROUNDS[day % BACKGROUNDS.length] + '.jpg)';
  }
  function toast(text) {
    var t = $('toast');
    t.textContent = text; t.className = 'toast show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 3200);
  }

  /* ---------- Akcje ---------- */
  function done(err) {
    if (!err) return;
    if (!onTv) { toast('To działa dopiero na telewizorze.'); return; }
    if (!err.cancelled) toast('Nie udało się otworzyć. Spróbuj jeszcze raz.');
  }
  function open(item) {
    if (!device) { done({}); return; }
    if (item.kind === 'hdmi') device.setSource(item.number, done);
    else device.launchApp(item.appId, done);
  }
  function topAction(id) {
    if (id === 'edit') { editing = true; ei = 0; render(); return; }
    if (!device) { done({}); return; }
    if (id === 'art') device.art(done);
    if (id === 'settings') device.settings(done);
  }
  function toggle(item) {
    var key = keyOf(item), n = pinned(key);
    if (n) { pins.splice(n - 1, 1); }
    else if (pins.length >= MAX) { toast('Mieści się ' + MAX + ' kafelków. Najpierw usuń jeden.'); return; }
    else { pins.push(item); ei = pins.length - 1; }
    savePins();
  }
  function move(item, step) {
    var n = pinned(keyOf(item)) - 1, to = n + step;
    if (n < 0 || to < 0 || to >= pins.length) return;
    var x = pins[n]; pins[n] = pins[to]; pins[to] = x;
    ei = to; savePins();
  }

  /* ---------- Pilot ---------- */
  function key(action) {
    if (editing) {
      var items = editorItems();
      if (action === 'up') ei = Math.max(0, ei - 1);
      else if (action === 'down') ei = Math.min(items.length - 1, ei + 1);
      else if (action === 'ok' && items[ei]) toggle(items[ei]);
      else if ((action === 'left' || action === 'right') && items[ei]) move(items[ei], action === 'left' ? -1 : 1);
      else if (action === 'back') { editing = false; zone = 'top'; ti = 1; gi = Math.min(gi, Math.max(0, pins.length - 1)); }
      render(); return;
    }
    if (zone === 'top') {
      if (action === 'left') ti = Math.max(0, ti - 1);
      else if (action === 'right') ti = Math.min(TOP.length - 1, ti + 1);
      else if (action === 'down' && pins.length) zone = 'grid';
      else if (action === 'ok') { topAction(TOP[ti].id); return; }
      render(); return;
    }
    var row = Math.floor(gi / COLS), rows = Math.ceil(pins.length / COLS);
    if (action === 'left' && gi > 0) gi--;
    else if (action === 'right' && gi < pins.length - 1) gi++;
    else if (action === 'up') { if (row === 0) { zone = 'top'; } else gi -= COLS; }
    else if (action === 'down' && row < rows - 1) gi = Math.min(pins.length - 1, gi + COLS);
    else if (action === 'ok' && pins[gi]) { open(pins[gi]); return; }
    render();
  }
  document.addEventListener('keydown', function (e) {
    var action = KEYS[e.keyCode];
    if (!action) return;
    e.preventDefault();
    key(action);
  });

  /* ---------- Start ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $('stage').style.transform = 'scale(' + s + ')';
  }
  function start() {
    installed.forEach(function (a) { a.brand = brandOf(a); });
    loadPins();
    if (!pins.length) zone = 'top';
    render();
  }
  function boot() {
    fit(); window.addEventListener('resize', fit);
    tick(); background();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { tick(); background(); } });
    if (!onTv || !device) { installed = PREVIEW_APPS.slice(); inputs = PREVIEW_INPUTS.slice(); start(); return; }
    var pending = 2;
    function next() { if (--pending === 0) start(); }
    device.apps(function (err, list) { installed = err ? [] : list; next(); });
    device.sources(function (err, list) { inputs = err ? [] : list; next(); });
  }
  boot();
}());
