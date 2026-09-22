/* Finale — a short film at the end of the letter.
   Timeline: intro (dolly down the path) → quote → particles form the title →
   title → credits roll → end card. Skip jumps to the end card. */
(function () {
  'use strict';

  var main = document.querySelector('[data-finale]');
  if (!main) return;
  var body = document.body;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var skipBtn = document.getElementById('skip');
  var replayBtn = document.getElementById('replay');
  var canvas = document.getElementById('finale-canvas');
  var titleEl = main.querySelector('.finale__title');
  var dedEl = main.querySelector('.finale__ded');
  var roll = main.querySelector('.credits__roll');
  var timers = [];
  var raf = 0;

  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function step(name) { main.setAttribute('data-step', name); }
  function clear() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); }

  /* ---------- Static version (reduced motion) --------------------------------- */
  if (RM) {
    main.classList.add('is-static');
    body.classList.add('is-static-page');
    if (skipBtn) skipBtn.hidden = true;
    if (dedEl) dedEl.textContent = dedEl.getAttribute('data-text');
    return;
  }

  /* ---------- Title size shared by canvas + real heading ------------------------- */
  var fontSize = 96;
  function sizeTitle() {
    var w = document.documentElement.clientWidth;
    fontSize = Math.round(Math.max(40, Math.min(w * (w < 600 ? 0.125 : 0.105), 132)));
    main.style.setProperty('--title-size', fontSize + 'px');
  }
  sizeTitle();

  /* ---------- Particles that rise from the path and spell the title ------------ */
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var parts = [], W = 0, H = 0, startT = 0, fading = 0;

  function targets() {
    var text = titleEl.textContent.trim();
    var r = titleEl.getBoundingClientRect();
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var o = off.getContext('2d');
    var family = getComputedStyle(titleEl).fontFamily;
    o.font = 'italic 500 ' + fontSize + 'px ' + family;
    o.textAlign = 'center'; o.textBaseline = 'middle';
    o.fillStyle = '#fff';
    o.fillText(text, r.left + r.width / 2, r.top + r.height / 2);
    var data = o.getImageData(0, 0, W, H).data;
    var gap = Math.max(3, Math.round(fontSize / 26));
    var pts = [];
    for (var y = 0; y < H; y += gap) {
      for (var x = 0; x < W; x += gap) {
        if (data[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
      }
    }
    // Keep it light on phones.
    var cap = W < 700 ? 900 : 1700;
    while (pts.length > cap) pts.splice(Math.floor(Math.random() * pts.length), 1);
    return pts;
  }

  function startParticles() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pts = targets();
    var ox = W * 0.52, oy = H * 0.86;           // the end of the forest path
    parts = pts.map(function (p) {
      return {
        sx: ox + (Math.random() - .5) * W * 0.5, sy: oy + Math.random() * H * 0.2,
        tx: p[0], ty: p[1],
        cx: 0, cy: 0,
        wob: Math.random() * 6.28,
        delay: Math.random() * 1400,
        dur: 2300 + Math.random() * 1600,
        r: (0.6 + Math.random() * 1.0) * Math.max(0.5, Math.min(1, fontSize / 110))
      };
    });
    startT = performance.now(); fading = 0;
    raf = requestAnimationFrame(draw);
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    var el = now - startT;
    var fadeA = fading ? Math.max(0, 1 - (now - fading) / 1800) : 1;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var t = Math.max(0, Math.min(1, (el - p.delay) / p.dur));
      var e = ease(t);
      // Rise in an arc: sideways sway that settles as the dot arrives.
      var sway = Math.sin(p.wob + el / 500) * 40 * (1 - e);
      var x = p.sx + (p.tx - p.sx) * e + sway;
      var y = p.sy + (p.ty - p.sy) * e;
      var tw = t >= 1 ? 0.75 + 0.25 * Math.sin(p.wob + now / 300) : 0.5 + 0.5 * e;
      var a = (t > 0 ? tw : 0) * fadeA;
      if (a <= 0.01) continue;
      var g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 5);
      g.addColorStop(0, 'rgba(255,240,200,' + a + ')');
      g.addColorStop(.3, 'rgba(240,205,130,' + (a * .45) + ')');
      g.addColorStop(1, 'rgba(240,205,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, p.r * 5, 0, 6.283); ctx.fill();
    }
    if (fading && now - fading > 1900) { ctx.clearRect(0, 0, W, H); return; }
    raf = requestAnimationFrame(draw);
  }

  /* ---------- Typing the dedication ------------------------------------------------ */
  function type(el) {
    var full = el.getAttribute('data-text') || '';
    var i = 0;
    el.textContent = '';
    (function next() {
      if (i > full.length) return;
      el.textContent = full.slice(0, i++);
      timers.push(setTimeout(next, 55 + Math.random() * 40));
    })();
  }

  /* ---------- Timeline ------------------------------------------------------------ */
  function play() {
    clear();
    // Cut back to the start of the shot instantly (no 18s reverse zoom).
    var layers = document.querySelectorAll('.scene__far, .scene__near');
    Array.prototype.forEach.call(layers, function (l) { l.style.transition = 'none'; });
    body.classList.remove('dolly', 'dolly-late');
    void body.offsetWidth;
    Array.prototype.forEach.call(layers, function (l) { l.style.transition = ''; });
    main.removeAttribute('data-step');
    if (dedEl) dedEl.textContent = '';
    if (roll) { roll.style.animation = 'none'; void roll.offsetWidth; roll.style.animation = ''; }
    if (skipBtn) skipBtn.hidden = false;
    ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);

    at(300, function () { step('intro'); void body.offsetWidth; body.classList.add('dolly'); });
    at(3200, function () { step('quote'); });
    at(8600, function () { step('form'); startParticles(); });
    at(13600, function () { step('title'); fading = performance.now(); body.classList.add('dolly-late'); });
    at(15200, function () { if (dedEl) type(dedEl); });
    at(20500, function () {
      var h = roll ? roll.offsetHeight : 1200;
      var secs = Math.max(22, Math.min(46, h / 55));
      main.style.setProperty('--roll', secs + 's');
      step('credits');
      at(secs * 1000 + 200, end);
    });
  }
  function end() {
    clear();
    step('end');
    body.classList.add('dolly', 'dolly-late');
    if (skipBtn) skipBtn.hidden = true;
    var first = main.querySelector('.endcard .btn');
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 600);
  }

  if (skipBtn) skipBtn.addEventListener('click', end);
  if (replayBtn) replayBtn.addEventListener('click', play);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') end(); });
  window.addEventListener('resize', function () { sizeTitle(); });

  play();
})();
