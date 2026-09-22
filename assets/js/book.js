/* Verses for You — 3D page-turn book (no dependencies)
   Desktop: two-page spreads. Phones: one page at a time.
   Drag/swipe a page, tap its edge, use the buttons, or the arrow keys. */
(function () {
  'use strict';

  var book = document.querySelector('[data-book]');
  var source = document.querySelector('.book__faces');
  if (!book || !source) return;

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var faces = Array.prototype.slice.call(source.querySelectorAll(':scope > .face')).map(function (f, i) {
    return { id: f.id, kind: f.getAttribute('data-kind') || 'page', label: f.getAttribute('data-label') || '', num: f.getAttribute('data-num'), content: f.querySelector('.page-in'), index: i };
  });
  var ui = {
    prev: document.getElementById('book-prev'),
    next: document.getElementById('book-next'),
    toc: document.getElementById('book-toc'),
    count: document.getElementById('book-count')
  };

  var leaves = [], single = false, flipped = 0, maxFlip = 0, pw = 0, ph = 0;

  /* ---------- Build ------------------------------------------------------------ */
  function side(face, which) {
    var s = document.createElement('div');
    s.className = 'leaf__side leaf__side--' + which;
    if (!face) return s;
    if (face.kind === 'cover') s.classList.add('is-cover');
    if (face.kind === 'backcover') s.classList.add('is-backcover');
    s.appendChild(face.content);
    if (face.num) {
      var n = document.createElement('span');
      n.className = 'page-num'; n.setAttribute('aria-hidden', 'true'); n.textContent = face.num;
      s.appendChild(n);
    }
    s._face = face;
    return s;
  }

  function measure() {
    var vw = document.documentElement.clientWidth || window.innerWidth, vh = document.documentElement.clientHeight || window.innerHeight;
    single = vw < 760;
    var availW = vw - 32;
    var availH = vh - 76 - 118;
    var ratio = 0.7;
    if (single) pw = Math.min(availW, 470, Math.max(260, availH * ratio));
    else pw = Math.min(availW / 2, 500, Math.max(300, availH * ratio));
    pw = Math.round(pw); ph = Math.round(pw / ratio);
    book.style.setProperty('--pw', pw + 'px');
    book.style.setProperty('--ph', ph + 'px');
    book.classList.toggle('is-single', single);
  }

  function build(keepFace) {
    // Take every page's content back out of old leaves first.
    faces.forEach(function (f) { if (f.content.parentNode) f.content.parentNode.removeChild(f.content); });
    leaves.forEach(function (l) { l.remove(); });
    leaves = [];
    measure();
    var perLeaf = single ? 1 : 2;
    for (var i = 0; i < faces.length; i += perLeaf) {
      var leaf = document.createElement('div');
      leaf.className = 'leaf';
      leaf.appendChild(side(faces[i], 'front'));
      leaf.appendChild(side(single ? null : faces[i + 1], 'back'));
      book.appendChild(leaf);
      leaves.push(leaf);
    }
    maxFlip = single ? leaves.length - 1 : leaves.length;
    source.classList.add('is-built');
    flipped = flipsFor(keepFace || 0);
    render(true);
    fitAll();
  }

  function flipsFor(faceIndex) {
    if (single) return Math.min(faceIndex, maxFlip);
    return Math.min(Math.ceil(faceIndex / 2), maxFlip);
  }
  function primaryFace() {
    if (single) return flipped;
    if (flipped === 0) return 0;
    if (flipped === maxFlip) return faces.length - 1;
    return Math.min(flipped * 2, faces.length - 1);
  }

  /* ---------- Render state ----------------------------------------------------- */
  function setAngle(leaf, a) {
    leaf.style.setProperty('--a', a.toFixed(2));
    var t = -a / 180;
    leaf.style.setProperty('--shade', (t < .5 ? t * 2 : 1).toFixed(3));
    leaf.style.setProperty('--shade-b', (t > .5 ? (1 - t) * 2 : 1).toFixed(3));
  }
  function stack() {
    var n = leaves.length;
    leaves.forEach(function (l, i) {
      if (l._lift) { l.style.visibility = ''; return; }
      l.style.zIndex = i < flipped ? i + 1 : n - i + 1;
      // On phones a turned page swings off-screen; hide it once it lands.
      l.style.visibility = single && i < flipped ? 'hidden' : '';
    });
  }
  function render(instant) {
    if (instant) book.classList.add('no-anim');
    leaves.forEach(function (l, i) {
      setAngle(l, i < flipped ? -180 : 0);
      if (instant) l.style.transition = 'none';
    });
    stack();
    var shift = 0;
    if (!single) shift = flipped === 0 ? -pw / 2 : flipped === maxFlip ? pw / 2 : 0;
    book.style.setProperty('--shift', shift + 'px');
    if (instant) book.style.transition = 'none';
    book.classList.toggle('at-start', !single && flipped === 0);
    book.classList.toggle('at-end', !single && flipped === maxFlip);
    if (instant) {
      void book.offsetWidth;
      leaves.forEach(function (l) { l.style.transition = ''; });
      book.style.transition = '';
    }
    visibility();
    updateUI();
  }
  function visibleSides() {
    var out = [];
    if (single) { if (leaves[flipped]) out.push(leaves[flipped].children[0]); return out; }
    if (flipped > 0) out.push(leaves[flipped - 1].children[1]);
    if (flipped < leaves.length) out.push(leaves[flipped].children[0]);
    return out;
  }
  function visibility() {
    var vis = visibleSides();
    leaves.forEach(function (l) {
      Array.prototype.forEach.call(l.children, function (s) {
        var on = vis.indexOf(s) !== -1;
        s.toggleAttribute('inert', !on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
    });
  }
  function updateUI() {
    if (ui.prev) ui.prev.disabled = flipped === 0;
    if (ui.next) ui.next.disabled = flipped === maxFlip;
    var f = faces[primaryFace()];
    if (ui.count && f) ui.count.textContent = f.label;
    try {
      var h = flipped === 0 ? location.pathname + location.search : '#' + f.id;
      history.replaceState(null, '', h);
    } catch (e) {}
  }

  /* ---------- Turning ------------------------------------------------------------ */
  function lift(leaf) {
    leaf._lift = true; leaf.style.zIndex = 500;
    clearTimeout(leaf._t);
    leaf._t = setTimeout(function () { leaf._lift = false; stack(); }, RM ? 0 : 950);
  }
  function turn(dir) {
    if (dir > 0 && flipped < maxFlip) { lift(leaves[flipped]); flipped++; }
    else if (dir < 0 && flipped > 0) { flipped--; lift(leaves[flipped]); }
    else return;
    render(false);
  }
  function goTo(faceIndex) {
    var target = flipsFor(faceIndex);
    if (target === flipped) return;
    if (RM) { flipped = target; render(true); return; }
    var dir = target > flipped ? 1 : -1;
    (function step() {
      if (flipped === target) return;
      turn(dir);
      setTimeout(step, 110);
    })();
  }

  /* ---------- Drag / swipe / tap ------------------------------------------------ */
  var drag = null;
  book.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (e.target.closest('a, button, input, textarea, select')) return;
    drag = { x0: e.clientX, y0: e.clientY, t0: performance.now(), id: e.pointerId, dir: 0, leaf: null, p: 0 };
  });
  book.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.dir) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }   // vertical: let the page scroll
      drag.dir = dx < 0 ? 1 : -1;
      if (drag.dir > 0 && flipped >= maxFlip) { drag = null; return; }
      if (drag.dir < 0 && flipped <= 0) { drag = null; return; }
      drag.leaf = drag.dir > 0 ? leaves[flipped] : leaves[flipped - 1];
      drag.leaf.classList.add('is-dragging');
      drag.leaf._lift = true; drag.leaf.style.zIndex = 500;
      try { book.setPointerCapture(e.pointerId); } catch (err) {}
    }
    var p = Math.max(0, Math.min(1, Math.abs(dx) / (pw * (single ? .9 : 1.15))));
    drag.p = p;
    setAngle(drag.leaf, drag.dir > 0 ? -180 * p : -180 * (1 - p));
  });
  function endDrag(e, cancelled) {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.dir) {
      if (cancelled) return;
      // A tap: right side turns forward, left side turns back.
      var r = book.getBoundingClientRect();
      var split = single ? r.left + r.width * .3 : r.left + r.width / 2;   // spine
      turn(e.clientX >= split ? 1 : -1);
      return;
    }
    d.leaf.classList.remove('is-dragging');
    var fast = (performance.now() - d.t0) < 260 && d.p > .08;
    var commit = !cancelled && (d.p > .32 || fast);
    if (commit) {
      if (d.dir > 0) flipped++; else flipped--;
    }
    lift(d.leaf);
    render(false);
  }
  book.addEventListener('pointerup', function (e) { endDrag(e, false); });
  book.addEventListener('pointercancel', function (e) { endDrag(e, true); });

  /* ---------- Controls ------------------------------------------------------------- */
  if (ui.prev) ui.prev.addEventListener('click', function () { turn(-1); });
  if (ui.next) ui.next.addEventListener('click', function () { turn(1); });
  if (ui.toc) ui.toc.addEventListener('click', function () { goTo(indexOf('contents')); });
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); turn(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); turn(-1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(faces.length - 1); }
  });
  function indexOf(id) { for (var i = 0; i < faces.length; i++) if (faces[i].id === id) return i; return -1; }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-goto]');
    if (!a) return;
    var i = indexOf(a.getAttribute('data-goto'));
    if (i < 0) return;
    e.preventDefault();
    goTo(i);
  });

  /* ---------- Fit long poems on small pages ----------------------------------- */
  function fit(el) {
    el.classList.remove('is-scroll');
    var fs = 1;
    el.style.setProperty('--fs', fs);
    var guard = 0;
    while (el.scrollHeight > el.clientHeight + 1 && fs > .72 && guard++ < 20) {
      fs -= .03; el.style.setProperty('--fs', fs.toFixed(2));
    }
    if (el.scrollHeight > el.clientHeight + 1) el.classList.add('is-scroll');
  }
  function fitAll() { faces.forEach(function (f) { fit(f.content); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

  /* ---------- Go ------------------------------------------------------------------- */
  var start = 0;
  if (location.hash) { var hi = indexOf(location.hash.slice(1)); if (hi >= 0) start = hi; }
  build(start);
  lastW = document.documentElement.clientWidth; lastH = document.documentElement.clientHeight;
  var rt, lastW = 0, lastH = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      // Ignore the tiny height changes from mobile browser bars.
      var w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;
      if (w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w; lastH = h;
      build(primaryFace());
    }, 180);
  });
  window.addEventListener('hashchange', function () {
    var i = indexOf(location.hash.slice(1));
    if (i >= 0) goTo(i);
  });
})();
