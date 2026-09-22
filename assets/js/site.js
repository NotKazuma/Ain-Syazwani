/* A Letter for Ain — site script (no dependencies)
   Loaded at the end of <body> on every page. Each feature checks that its
   elements exist, so one file serves the whole site. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var motionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var RM = motionMQ.matches;
  var root = body.getAttribute('data-root') || '';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  var local = store('localStorage');
  var session = store('sessionStorage');
  function get(s, k) { try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(s, k, v) { try { if (s) s.setItem(k, v); } catch (e) {} }

  /* ---------- Paper entrance (skipped when a view transition animates it) --- */
  var paper = $('.paper');
  var revealed = false;
  function enter(vt) {
    if (revealed) return; revealed = true;
    if (paper && !vt && !RM) paper.classList.add('enter');
  }
  window.addEventListener('pagereveal', function (e) { enter(!!e.viewTransition); });
  requestAnimationFrame(function () { enter(false); });

  /* ---------- Top bar: tuck away while reading down, return on scroll up ---- */
  var bar = $('.topbar');
  var progress = $('.progress');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (bar) bar.classList.toggle('is-tucked', y > 120 && y > lastY);
    if (progress) {
      var h = doc.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Focus mode (remembered) ---------------------------------------- */
  var focusBtn = $('#focus-toggle');
  function setFocus(on) {
    body.classList.toggle('focus-mode', on);
    if (focusBtn) focusBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    set(local, 'ain:focus', on ? '1' : '0');
  }
  if (get(local, 'ain:focus') === '1') setFocus(true);
  if (focusBtn) focusBtn.addEventListener('click', function () { setFocus(!body.classList.contains('focus-mode')); });

  /* ---------- Reveal on scroll ------------------------------------------------ */
  (function reveal() {
    $$('.poem .stanza').forEach(function (st) {
      $$('.ln', st).forEach(function (ln, i) { ln.style.setProperty('--d', (i * 0.12) + 's'); });
    });
    var items = $$('[data-reveal], .poem .stanza');
    if (!items.length) return;
    if (RM || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (el) { io.observe(el); });
    // Safety net: never leave words hidden.
    setTimeout(function () {
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    }, 1800);
  })();

  /* ---------- Bookmark: remember the last reading page ---------------------- */
  var here = body.getAttribute('data-page');
  if (here && here !== 'home') set(local, 'ain:last', JSON.stringify({ path: here, title: body.getAttribute('data-title') || '' }));
  var chip = $('#bookmark');
  if (chip) {
    try {
      var last = JSON.parse(get(local, 'ain:last') || 'null');
      if (last && last.path) {
        chip.href = root + last.path;
        var label = $('.bookmark__label', chip);
        if (label && last.title) label.textContent = last.title;
        chip.hidden = false;
      }
    } catch (e) {}
  }

  /* ---------- Home: break the seal ------------------------------------------- */
  (function home() {
    var scene = $('.home-scene');
    var seal = $('#seal');
    if (!scene || !seal) return;
    var typing = $('#dedication');
    var full = typing ? typing.getAttribute('data-text') : '';

    function type() {
      if (!typing || RM) return;
      typing.textContent = '';
      var caret = document.createElement('span');
      caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true');
      var text = document.createTextNode('');
      typing.appendChild(text); typing.appendChild(caret);
      var i = 0;
      (function step() {
        if (i <= full.length) { text.nodeValue = full.slice(0, i++); setTimeout(step, 48 + Math.random() * 40); }
        else setTimeout(function () { caret.remove(); }, 1400);
      })();
    }
    function open(instant) {
      if (scene.classList.contains('is-open')) return;
      if (instant) scene.classList.add('is-instant');
      scene.classList.add('is-open');
      set(session, 'ain:opened', '1');
      var first = $('.letter-card .btn');
      if (instant) { if (typing) typing.textContent = full; return; }
      if (typing && !RM) typing.textContent = '\u00a0';
      try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) {}
      setTimeout(type, RM ? 0 : 1700);
      setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, RM ? 0 : 2400);
    }
    seal.addEventListener('click', function () { open(false); });
    if (get(session, 'ain:opened') === '1' || RM) open(true);
  })();

  /* ---------- Toast ----------------------------------------------------------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-shown');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('is-shown'); }, 2200);
  }

  /* ---------- Poem tools: copy, share, arrow keys ---------------------------- */
  function poemText() {
    var t = $('.paper .title');
    var st = $$('.poem .stanza').map(function (s) {
      return $$('.ln', s).map(function (l) { return l.textContent.trim(); }).join('\n');
    }).join('\n\n');
    return (t ? t.textContent.trim() + '\n\n' : '') + st;
  }
  function copy(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
    } else legacyCopy(text, done);
  }
  function legacyCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed'); }
    ta.remove();
  }
  var copyBtn = $('#copy-poem');
  if (copyBtn) copyBtn.addEventListener('click', function () { copy(poemText(), function () { toast('Copied ✓'); }); });
  var shareBtn = $('#share-poem');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    if (navigator.share) navigator.share({ title: document.title, text: poemText().slice(0, 900), url: location.href }).catch(function () {});
    else copy(location.href, function () { toast('Link copied ✓'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    var link = e.key === 'ArrowRight' ? $('a[rel="next"]') : e.key === 'ArrowLeft' ? $('a[rel="prev"]') : null;
    if (link) { e.preventDefault(); link.click(); }
  });

  /* ---------- Petal burst ------------------------------------------------------ */
  function burst(x, y) {
    if (RM) return;
    var c = document.createElement('canvas');
    c.id = 'burst'; body.appendChild(c);
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = c.width = window.innerWidth * dpr, H = c.height = window.innerHeight * dpr;
    c.style.width = window.innerWidth + 'px'; c.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    var colors = ['#8f2430', '#c2414f', '#e58b8b', '#f3c1b5', '#e7cf9c', '#c9a15b'];
    var parts = [];
    for (var i = 0; i < 90; i++) {
      var a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5,
        r: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
        c: colors[i % colors.length], heart: i % 5 === 0, life: 0
      });
    }
    function heart(p) {
      var s = p.r / 8;
      ctx.beginPath();
      ctx.moveTo(0, 3 * s);
      ctx.bezierCurveTo(-8 * s, -3 * s, -4 * s, -10 * s, 0, -5 * s);
      ctx.bezierCurveTo(4 * s, -10 * s, 8 * s, -3 * s, 0, 3 * s);
      ctx.fill();
    }
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      var alive = 0;
      parts.forEach(function (p) {
        p.life++;
        p.vx *= .985; p.vy = p.vy * .985 + .18;
        p.x += p.vx + Math.sin(p.life / 9) * .6; p.y += p.vy; p.rot += p.vr;
        var o = Math.max(0, 1 - p.life / 150);
        if (o <= 0 || p.y > window.innerHeight + 20) return;
        alive++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = o; ctx.fillStyle = p.c;
        if (p.heart) { ctx.scale(1.6, 1.6); heart(p); }
        else { ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .55, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (alive) requestAnimationFrame(tick); else c.remove();
    })();
  }

  /* ---------- The Question ---------------------------------------------------- */
  (function question() {
    var arena = $('.arena');
    var yes = $('#yes-btn');
    var no = $('#no-btn');
    var out = $('#response');
    if (!arena || !yes || !no || !out) return;
    var dodges = 0;
    var MAX = 7;
    var nextHref = arena.getAttribute('data-next') || 'next-page.html';

    function say(cls, text) {
      out.innerHTML = '';
      var p = document.createElement('p');
      p.className = cls; p.textContent = text;
      out.appendChild(p);
    }

    function place() {
      var a = arena.getBoundingClientRect();
      var b = no.getBoundingClientRect();
      var y = yes.getBoundingClientRect();
      var maxX = Math.max(0, a.width - b.width), maxY = Math.max(0, a.height - b.height);
      var best = null;
      for (var i = 0; i < 30; i++) {
        var x = Math.random() * maxX, t = Math.random() * maxY;
        var ax = a.left + x, ay = a.top + t;
        var overlapsYes = ax < y.right + 12 && ax + b.width > y.left - 12 && ay < y.bottom + 12 && ay + b.height > y.top - 12;
        var far = Math.hypot(ax - b.left, ay - b.top) > Math.min(a.width, 220) * .45;
        if (!overlapsYes && far) { best = { x: x, y: t }; break; }
        if (!overlapsYes && !best) best = { x: x, y: t };
      }
      if (!best) best = { x: 0, y: maxY };
      no.style.left = best.x + 'px';
      no.style.top = best.y + 'px';
      no.style.transform = 'rotate(' + ((Math.random() - .5) * 16) + 'deg) scale(' + (1 - dodges * .05) + ')';
    }

    var lastDodge = 0;
    function dodge(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (no.classList.contains('is-gone')) return;
      var now = Date.now();
      if (now - lastDodge < 280) return;
      lastDodge = now;
      dodges++;
      if (dodges > MAX) {
        no.classList.add('is-gone');
        no.setAttribute('aria-hidden', 'true'); no.tabIndex = -1;
        setTimeout(function () { no.hidden = true; }, 350);
        say('tone-alert', 'The button vanished. Now there\'s only one choice left.');
        yes.focus({ preventScroll: true });
        return;
      }
      if (!no.classList.contains('is-running')) {
        // Freeze the arena around both buttons before letting "No" roam free.
        arena.classList.add('is-chasing');
        var a = arena.getBoundingClientRect(), b = no.getBoundingClientRect();
        var ghost = document.createElement('span');
        ghost.className = 'no-ghost'; ghost.setAttribute('aria-hidden', 'true');
        ghost.style.width = b.width + 'px'; ghost.style.height = b.height + 'px';
        arena.insertBefore(ghost, no);
        no.style.left = (b.left - a.left) + 'px'; no.style.top = (b.top - a.top) + 'px';
        no.classList.add('is-running');
        void no.offsetWidth;
      }
      place();
      say('tone-warm', 'That\'s not the right answer! 😊');
    }

    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (finePointer) no.addEventListener('pointerenter', function () { dodge(); });
    no.addEventListener('pointerdown', dodge);
    no.addEventListener('click', dodge);
    // Stop the browser's follow-up "click" after a tap, so a tap on "No"
    // can never land on "Yes" once the buttons have moved.
    no.addEventListener('touchstart', function (e) { e.preventDefault(); dodge(); }, { passive: false });

    yes.addEventListener('click', function () {
      if (Date.now() - lastDodge < 500) return;
      var r = yes.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
      try { if (navigator.vibrate) navigator.vibrate([30, 40, 60]); } catch (e) {}
      arena.hidden = true;
      say('tone-joy', '💖 You just made me the happiest person! Thank you!');
      var link = document.createElement('a');
      link.href = nextHref; link.className = 'btn btn--wax';
      link.innerHTML = 'Continue <span class="arrow arrow--r" aria-hidden="true">→</span>';
      link.setAttribute('aria-label', 'Continue');
      out.appendChild(link);
      set(session, 'ain:said-yes', '1');
      setTimeout(function () { link.focus({ preventScroll: true }); link.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' }); }, 400);
    });
  })();
})();
