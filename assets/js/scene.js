/* A Letter for Ain — the living forest
   Parallax (mouse / phone tilt), time-of-day, stars, fireflies and falling leaves.
   html[data-time] is set by the inline script in <head> before first paint. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var scene = document.querySelector('.scene');
  if (!scene) return;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var time = doc.getAttribute('data-time') || 'dusk';
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var visible = !document.hidden;
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) kick(); });

  /* ---------- Parallax ------------------------------------------------------- */
  var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  var parallaxOn = !RM;
  if (parallaxOn) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    }, { passive: true });

    var gyroBase = null;
    function onTilt(e) {
      if (e.gamma == null || e.beta == null) return;
      if (!gyroBase) gyroBase = { g: e.gamma, b: e.beta };
      target.x = Math.max(-1, Math.min(1, (e.gamma - gyroBase.g) / 20));
      target.y = Math.max(-1, Math.min(1, (e.beta - gyroBase.b) / 20));
      kick();
    }
    function enableTilt() {
      var D = window.DeviceOrientationEvent;
      if (!D) return;
      if (typeof D.requestPermission === 'function') {
        // iOS asks once, and only from a tap
        D.requestPermission().then(function (s) { if (s === 'granted') window.addEventListener('deviceorientation', onTilt); }).catch(function () {});
      } else window.addEventListener('deviceorientation', onTilt);
    }
    if (window.matchMedia('(pointer: coarse)').matches) {
      if (typeof (window.DeviceOrientationEvent || {}).requestPermission === 'function') {
        window.addEventListener('pointerup', function once() { window.removeEventListener('pointerup', once); enableTilt(); });
      } else enableTilt();
    }
  }

  /* ---------- Stars (night only) -------------------------------------------- */
  var starsC = scene.querySelector('.scene__stars');
  var stars = [], sctx = null, shooting = null;
  function sizeStars() {
    if (!starsC || time !== 'night') return;
    var w = starsC.clientWidth, h = starsC.clientHeight;
    starsC.width = w * dpr; starsC.height = h * dpr;
    sctx = starsC.getContext('2d');
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var n = Math.round((w * h) / 4500);
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h * 0.7, r: Math.random() * 1.3 + 0.45, t: Math.random() * 6.28, s: 0.01 + Math.random() * 0.03 });
    }
  }
  function drawStars() {
    if (!sctx) return;
    var w = starsC.clientWidth, h = starsC.clientHeight;
    sctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!RM) s.t += s.s;
      sctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(s.t));
      sctx.fillStyle = '#fffbea';
      sctx.beginPath(); sctx.arc(s.x, s.y, s.r, 0, 6.283); sctx.fill();
    }
    if (!RM) {
      if (!shooting && Math.random() < 0.0025) shooting = { x: Math.random() * w * 0.6 + w * 0.2, y: Math.random() * h * 0.25, vx: 7 + Math.random() * 4, vy: 3 + Math.random() * 2, life: 0 };
      if (shooting) {
        var sh = shooting;
        sh.life++; sh.x += sh.vx; sh.y += sh.vy;
        var g = sctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 12, sh.y - sh.vy * 12);
        g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        sctx.globalAlpha = Math.max(0, 1 - sh.life / 45);
        sctx.strokeStyle = g; sctx.lineWidth = 1.4;
        sctx.beginPath(); sctx.moveTo(sh.x, sh.y); sctx.lineTo(sh.x - sh.vx * 12, sh.y - sh.vy * 12); sctx.stroke();
        if (sh.life > 45) shooting = null;
      }
    }
    sctx.globalAlpha = 1;
  }

  /* ---------- Fireflies + falling leaves ------------------------------------ */
  var pc = document.getElementById('particles');
  var pctx = pc && pc.getContext ? pc.getContext('2d') : null;
  var W = 0, H = 0, flies = [], leaves = [];
  var MIX = {
    dawn:  { flies: 6,  leaves: 9,  colors: ['#9fb872', '#c9b36a', '#d99a7c'] },
    day:   { flies: 0,  leaves: 14, colors: ['#7fa35a', '#a8c070', '#c7b25a'] },
    dusk:  { flies: 26, leaves: 12, colors: ['#c98a3c', '#b8612e', '#d9b25a', '#8c3b24'] },
    night: { flies: 46, leaves: 3,  colors: ['#4c5d46', '#5d6a50'] }
  }[time] || { flies: 20, leaves: 8, colors: ['#9fb872'] };
  var RAIN = document.body.getAttribute('data-mood') === 'rain';
  if (RAIN) MIX = { flies: time === 'night' ? 10 : 4, leaves: 2, colors: ['#4c5d46', '#6b6f55'] };
  var drops = [];
  function drop(anywhere) {
    return { x: Math.random() * (W + 200) - 100, y: anywhere ? Math.random() * H : -40 - Math.random() * 200,
      len: 10 + Math.random() * 18, v: 9 + Math.random() * 7, z: 0.4 + Math.random() * 0.7 };
  }

  function sizeParticles() {
    if (!pctx) return;
    W = pc.clientWidth; H = pc.clientHeight;
    pc.width = W * dpr; pc.height = H * dpr;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var area = (W * H) / (1366 * 860);
    var small = Math.max(0.45, Math.min(1, area));
    flies = []; leaves = [];
    for (var i = 0; i < Math.round(MIX.flies * small); i++) flies.push(fly(true));
    for (var j = 0; j < Math.round(MIX.leaves * small); j++) leaves.push(leaf(true));
    drops = [];
    if (RAIN) for (var k = 0; k < Math.round(160 * small); k++) drops.push(drop(true));
  }
  function fly(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, r: 1 + Math.random() * 1.8,
      vx: (Math.random() - .5) * .25, vy: -(.08 + Math.random() * .25), t: Math.random() * 6.28, s: .008 + Math.random() * .02,
      z: 0.4 + Math.random() * 0.8 };
  }
  function leaf(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : -30, size: 7 + Math.random() * 9,
      vy: .35 + Math.random() * .6, sway: 0.6 + Math.random() * 1.2, t: Math.random() * 6.28,
      rot: Math.random() * 6.28, vr: (Math.random() - .5) * .03, flip: Math.random() * 6.28,
      c: MIX.colors[Math.floor(Math.random() * MIX.colors.length)], z: 0.5 + Math.random() * 0.9 };
  }
  function drawLeaf(l) {
    var sx = Math.cos(l.flip);             // 3D-ish tumble: squash across the leaf
    pctx.save();
    pctx.translate(l.x + cur.x * -30 * l.z, l.y);
    pctx.rotate(l.rot);
    pctx.scale(Math.max(0.15, Math.abs(sx)), 1);
    pctx.globalAlpha = 0.75;
    pctx.fillStyle = l.c;
    var s = l.size;
    pctx.beginPath();
    pctx.moveTo(0, -s);
    pctx.quadraticCurveTo(s * 0.7, -s * 0.2, 0, s);
    pctx.quadraticCurveTo(-s * 0.7, -s * 0.2, 0, -s);
    pctx.fill();
    pctx.strokeStyle = 'rgba(0,0,0,.25)'; pctx.lineWidth = 0.8;
    pctx.beginPath(); pctx.moveTo(0, -s * 0.9); pctx.lineTo(0, s * 0.95); pctx.stroke();
    pctx.restore();
  }
  function drawParticles() {
    if (!pctx) return;
    pctx.clearRect(0, 0, W, H);
    pctx.globalCompositeOperation = 'source-over';
    if (drops.length) {
      pctx.lineCap = 'round';
      for (var d = 0; d < drops.length; d++) {
        var r = drops[d];
        r.y += r.v * r.z; r.x -= r.v * r.z * 0.18;
        if (r.y > H + 30) drops[d] = r = drop(false);
        pctx.strokeStyle = 'rgba(200,215,230,' + (0.10 + r.z * 0.22) + ')';
        pctx.lineWidth = r.z * 1.2;
        pctx.beginPath(); pctx.moveTo(r.x, r.y); pctx.lineTo(r.x + r.len * 0.18, r.y - r.len); pctx.stroke();
      }
    }
    for (var j = 0; j < leaves.length; j++) {
      var l = leaves[j];
      l.t += 0.012; l.y += l.vy * l.z; l.x += Math.sin(l.t) * l.sway * l.z * 0.6; l.rot += l.vr; l.flip += 0.03;
      if (l.y > H + 30) leaves[j] = l = leaf(false);
      drawLeaf(l);
    }
    pctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      f.t += f.s;
      f.x += f.vx + Math.sin(f.t * 1.3) * .22;
      f.y += f.vy + Math.cos(f.t) * .12;
      if (f.y < -12 || f.x < -12 || f.x > W + 12) flies[i] = f = fly(false);
      var a = .25 + .75 * Math.pow(Math.max(0, Math.sin(f.t * 2)), 3);
      var x = f.x + cur.x * -22 * f.z, y = f.y + cur.y * -10 * f.z;
      var g = pctx.createRadialGradient(x, y, 0, x, y, f.r * 7);
      g.addColorStop(0, 'rgba(255,236,170,' + (a * .95) + ')');
      g.addColorStop(.25, 'rgba(231,207,120,' + (a * .35) + ')');
      g.addColorStop(1, 'rgba(231,207,120,0)');
      pctx.fillStyle = g;
      pctx.beginPath(); pctx.arc(x, y, f.r * 7, 0, 6.283); pctx.fill();
    }
  }

  /* ---------- Loop -------------------------------------------------------------- */
  var raf = 0, frame = 0;
  function loop() {
    raf = 0;
    if (!visible) return;
    frame++;
    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;
    scene.style.setProperty('--px', cur.x.toFixed(4));
    scene.style.setProperty('--py', cur.y.toFixed(4));
    if (!RM) drawParticles();
    if (time === 'night' && (frame % 3 === 0 || RM)) drawStars();
    if (!RM) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(loop); }

  function resize() { sizeStars(); sizeParticles(); if (RM) drawStars(); }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize();
  kick();

  // Let other scripts (the finale) reach the scene state.
  window.AinScene = { time: time, parallax: cur };
})();
