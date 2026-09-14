/**
 * Ain Syazwani Website — features + animations + optimization + compat
 * Visible by default, loader sweep, IO reveal same on phone/desktop
 */

(function () {
  var rmMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var RM = rmMQ.matches;
  rmMQ.addEventListener('change', function (e) { RM = e.matches; });

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  // Centralized forceReveal — replaces 18 inline copies; also the hard timeout fallback
  function forceReveal() {
    var loader = document.getElementById('loader');
    var content = document.getElementById('content');
    if (loader && getComputedStyle(loader).display !== 'none' && loader.style.display !== 'none') {
      loader.classList.add('hidden');
      setTimeout(function () { try { loader.style.display = 'none'; } catch (e) {} }, 600);
    }
    if (content && getComputedStyle(content).opacity === '0') content.style.opacity = '1';
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
    document.querySelectorAll('.reveal-stagger').forEach(function (el) { el.classList.add('is-visible'); });
  }
  window.__forceReveal = forceReveal;
  if (document.readyState === 'complete') setTimeout(forceReveal, 300);
  else window.addEventListener('load', function () { setTimeout(forceReveal, 600); });
  setTimeout(forceReveal, 2500);

  // Pause hearts when tab hidden (perf)
  document.addEventListener('visibilitychange', function () {
    document.documentElement.classList.toggle('hidden-tab', document.hidden);
    if (document.hidden) return;
  });

  onReady(function () {
    var hasGSAP = typeof gsap !== 'undefined';
    var hasST = hasGSAP && typeof ScrollTrigger !== 'undefined';
    var hasLenis = typeof Lenis !== 'undefined';
    var hasIO = 'IntersectionObserver' in window;

    // Scroll progress + detail (percent + reading time)
    var progress = document.getElementById('scroll-progress');
    var progressMeta = document.getElementById('progress-meta');
    if (!progressMeta) { progressMeta = document.createElement('span'); progressMeta.id='progress-meta'; progressMeta.setAttribute('aria-hidden','true'); document.body.appendChild(progressMeta); }
    var pageText = document.querySelector('.page');
    var words = pageText ? pageText.innerText.trim().split(/\s+/).length : 0;
    var readMin = words ? Math.max(1, Math.ceil(words/180)) : 0;
    function updateProgress() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      if (progress) progress.style.width = p + '%';
      if (progressMeta) { var pct=Math.round(p); progressMeta.textContent = readMin ? pct+"% · "+readMin+" min" : pct+"%"; }
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();

    // Bookmark — save current, show chip on index when lastPath elsewhere
    try {
      var path = location.pathname.replace(/\\/g, '/');
      var last = localStorage.getItem('lastPath');
      localStorage.setItem('lastPath', path);
      var chip = document.getElementById('bookmark-chip');
      if (chip && last && last !== path && !path.endsWith('index.html') === false) {
        // only on root index, when last was a different page
        var isIndex = /(^|\/)index\.html$/.test(path) || path.endsWith('/');
        if (isIndex && last !== '/' && last !== path) {
          chip.href = last;
          chip.querySelector('span').textContent = 'Continue where you left →';
          chip.classList.add('show');
        }
      } else if (chip) {
        var isIndex2 = /(^|\/)index\.html$/.test(path) || path === '/' || path.endsWith('/Ain Syazwani Website/') || path.endsWith('/Ain Syazwani Website/index.html');
        // broader: show on index if last exists and isn't index
        if (isIndex2 && last && last !== path && !/index\.html\/?$/.test(last) === false) {
          // keep hidden if last is index-ish
        } else if (isIndex2 && last && last !== path) {
          var isLastIndex = /(^|\/)index\.html$/.test(last) || last === '/' ;
          if (!isLastIndex) {
            chip.href = last;
            var s = chip.querySelector('span'); if (s) s.textContent = 'Continue where you left →';
            chip.classList.add('show');
          }
        }
      }
    } catch (e) {}

    // Mini-nav pill (injected, avoids 18 HTML edits)
    (function(){
      if (document.getElementById('mini-nav')) return;
      var nav=document.createElement('nav'); nav.id='mini-nav'; nav.setAttribute('aria-label','Primary');
      var path=location.pathname.replace(/\\/g,'/');
      var isHome = /(^|\/)index\.html$/.test(path) || path==='/';
      var isLetter = /love-confession\//.test(path);
      var isPoems = /poetry-book\//.test(path);
      // depth-aware hrefs
      var depth = 0;
      if (/poetry-book\/poems\//.test(path)) depth=2; else if (/love-confession\//.test(path) || /poetry-book\//.test(path)) depth=1;
      function href(p){ if(depth===2) return "../../"+p; if(depth===1) return "../"+p; return p; }
      nav.innerHTML='<a href="'+href('index.html')+'"'+(isHome&&!isLetter&&!isPoems?' class="active"':'')+'>Home</a>'
        +'<a href="'+href('love-confession/index.html')+'"'+(isLetter?' class="active"':'')+'>Letter</a>'
        +'<a href="'+href('poetry-book/index.html')+'"'+(isPoems?' class="active"':'')+'>Poems</a>'
        +'<button id="mini-focus" type="button" aria-pressed="false">Focus</button>';
      document.body.appendChild(nav);
      var lastY=window.scrollY, ticking=false;
      window.addEventListener('scroll', function(){
        if(ticking) return; ticking=true;
        requestAnimationFrame(function(){
          var y=window.scrollY;
          if(y>80 && y>lastY) nav.classList.add('mini-hidden'); else nav.classList.remove('mini-hidden');
          lastY=y; ticking=false;
        });
      }, {passive:true});
      var miniFocus=document.getElementById('mini-focus');
      if(miniFocus){
        try{ if(localStorage.getItem('focusMode')==='1'){ miniFocus.classList.add('active'); miniFocus.setAttribute('aria-pressed','true'); document.body.classList.add('focus-mode'); } }catch(e){}
        miniFocus.addEventListener('click', function(){
          var on=document.body.classList.toggle('focus-mode');
          miniFocus.classList.toggle('active', on); miniFocus.setAttribute('aria-pressed', on?'true':'false');
          miniFocus.textContent= on ? 'Exit Focus' : 'Focus';
          var mainBtn=document.getElementById('focus-toggle');
          if(mainBtn){ mainBtn.classList.toggle('active', on); mainBtn.setAttribute('aria-pressed', on?'true':'false'); mainBtn.textContent= on ? 'Exit Focus' : 'Focus'; }
          try{ localStorage.setItem('focusMode', on?'1':'0'); }catch(e){}
        });
      }
    })();

    // Focus mode toggle (main button — keep synced with mini)
    var focusBtn = document.getElementById('focus-toggle');
    if (focusBtn) {
      try {
        if (localStorage.getItem('focusMode') === '1') {
          document.body.classList.add('focus-mode');
          focusBtn.classList.add('active');
          focusBtn.setAttribute('aria-pressed', 'true');
        }
      } catch (e) {}
      focusBtn.addEventListener('click', function () {
        var on = document.body.classList.toggle('focus-mode');
        focusBtn.classList.toggle('active', on);
        focusBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        focusBtn.textContent = on ? 'Exit Focus' : 'Focus';
        var mini=document.getElementById('mini-focus');
        if(mini){ mini.classList.toggle('active', on); mini.setAttribute('aria-pressed', on?'true':'false'); mini.textContent= on ? 'Exit Focus' : 'Focus'; }
        try { localStorage.setItem('focusMode', on ? '1' : '0'); } catch (e) {}
      });
    }

    // Copy / Share on poem pages
    var toastEl = document.getElementById('toast');
    function showToast(msg) {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'toast';
        toastEl.className = 'toast';
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
    }
    function getPoemText() {
      var page = document.querySelector('.page');
      if (!page) return document.title;
      var h = page.querySelector('h1, h2');
      var ps = Array.from(page.querySelectorAll('p')).map(function (p) { return p.innerText.trim(); }).filter(Boolean).join('\n\n');
      return (h ? h.innerText.trim() + '\n\n' : '') + ps;
    }
    var copyBtn = document.getElementById('copy-poem');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var text = getPoemText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { showToast('Copied ✓'); }, function () { fallbackCopy(text); });
        } else fallbackCopy(text);
      });
    }
    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); showToast('Copied ✓'); } catch (e) { showToast('Copy failed'); }
      ta.remove();
    }
    var shareBtn = document.getElementById('share-poem');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var text = getPoemText().slice(0, 900);
        if (navigator.share) {
          navigator.share({ title: document.title, text: text, url: location.href }).catch(function () {});
        } else if (navigator.clipboard) {
          fallbackCopy(location.href);
          showToast('Link copied ✓');
        } else showToast(location.href);
      });
    }

    // Lenis — optional, try/catch, sets html.lenis to fix scroll-behavior conflict
    var lenis = null;
    if (hasLenis && !RM) {
      try {
        lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
        document.documentElement.classList.add('lenis');
        if (hasGSAP) gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0); requestAnimationFrame(function raf2(t){ lenis.raf(t); requestAnimationFrame(raf2); }); }
      } catch (e) { lenis = null; }
    }
    if (hasGSAP && hasST) { try { gsap.registerPlugin(ScrollTrigger); } catch (e) {} }
    if (lenis && hasGSAP && hasST) {
      try {
        ScrollTrigger.scrollerProxy(document.body, {
          scrollTop: function (value) {
            if (arguments.length) lenis.scrollTo(value, { immediate: true });
            return window.scrollY || document.documentElement.scrollTop;
          },
          getBoundingClientRect: function () { return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }; },
          pinType: document.body.style.transform ? 'transform' : 'fixed'
        });
        ScrollTrigger.addEventListener('refresh', function () { try { lenis.resize(); } catch (e) {} });
        ScrollTrigger.refresh();
      } catch (e) {}
    }

    // Loader — portfolio sweep (same on phone/desktop)
    var loader = document.getElementById('loader');
    var loaderBar = loader ? loader.querySelector('.loader-bar') : null;
    var content = document.getElementById('content');
    var book = document.querySelector('.book');
    var pctEl = null;
    if (loader) {
      pctEl = loader.querySelector('#loader-pct');
      if (!pctEl) {
        pctEl = document.createElement('div');
        pctEl.id = 'loader-pct';
        pctEl.textContent = '0%';
        pctEl.style.cssText = 'font-family:Courier Prime,monospace;font-size:.75rem;letter-spacing:.12em;color:#8d6e63;margin-top:4px;';
        var barWrap = loader.querySelector('.loader-bar-wrap');
        if (barWrap) barWrap.insertAdjacentElement('afterend', pctEl);
        else loader.appendChild(pctEl);
      }
    }
    if (loader) {
      if (loaderBar) requestAnimationFrame(function () { loaderBar.style.width = '100%'; });
      if (hasGSAP && !RM) {
        var counter = { v: 0 };
        gsap.to(counter, { v: 100, duration: 1.4, ease: 'power2.out', onUpdate: function () { if (pctEl) pctEl.textContent = Math.round(counter.v) + '%'; } });
        if (book) gsap.set(book, { opacity: 0, y: 28, rotationX: 0, transformPerspective: 900 });
      } else if (!RM) {
        var v = 0;
        var iv = setInterval(function () { v = Math.min(100, v + 4); if (pctEl) pctEl.textContent = v + '%'; if (v >= 100) clearInterval(iv); }, 35);
        if (book) { book.style.opacity = '0'; book.style.transform = 'translateY(18px)'; }
      } else {
        if (pctEl) pctEl.textContent = '100%';
      }
      var hideLoader = function () {
        loader.classList.add('hidden');
        if (hasGSAP && book && !RM) {
          gsap.to(book, { opacity: 1, y: 0, rotationX: 0, duration: 0.9, ease: 'back.out(1.4)', clearProps: 'transform,opacity' });
        } else if (book) {
          book.style.transition = 'opacity .7s ease, transform .7s ease';
          book.style.opacity = '1';
          book.style.transform = 'translateY(0)';
        }
        var done = function () {
          loader.style.display = 'none';
          if (content) content.style.opacity = '1';
          if (hasST) try { ScrollTrigger.refresh(); } catch (e) {}
          if (book) book.classList.add('envelope-unfold');
        };
        loader.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 800);
      };
      setTimeout(hideLoader, RM ? 400 : 1600);
    } else if (book && !RM) {
      // no loader on this page — still unfold
      setTimeout(function () { book.classList.add('envelope-unfold'); }, 120);
    }

    // Page transitions — guard ctrl/meta/shift/middle/external
    document.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        var href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript')) return;
        if (link.target === '_blank' || link.hasAttribute('download')) return;
        // allow bookmark chip / external-ish
        e.preventDefault();
        var page = document.querySelector('.page');
        if (page && !RM && hasGSAP) {
          page.classList.add('animating');
          gsap.to(page, { opacity: 0, y: -14, duration: 0.45, ease: 'power2.in', onComplete: function () { window.location = href; } });
        } else if (page && !RM) {
          page.style.transition = 'opacity .5s ease, transform .5s ease';
          page.style.opacity = '0'; page.style.transform = 'translateY(-12px)';
          setTimeout(function () { window.location = href; }, 450);
        } else window.location = href;
      });
    });

    // Reveal — IO only
    if (RM) {
      document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { el.classList.add('is-visible'); });
    } else if (hasIO) {
      try {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); } });
        }, { threshold: 0.12 });
        document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { obs.observe(el); });
      } catch (e) {
        document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { el.classList.add('is-visible'); });
      }
    } else {
      document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { el.classList.add('is-visible'); });
    }
    setTimeout(function () {
      document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.97 && r.bottom > -20 && !el.classList.contains('is-visible')) {
          el.classList.add('is-visible');
          if (hasGSAP && el.classList.contains('reveal-stagger')) gsap.set(el.children, { opacity: 1, y: 0 });
        }
      });
    }, 600);

    // Buttons float — transform only
    var btns = document.querySelectorAll('.journey-btn, .toc-link, .nav-link, .home-button');
    btns.forEach(function (btn, i) {
      if (RM || !hasGSAP) return;
      gsap.to(btn, { y: -4, duration: 2.2 + (i % 3) * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.12 });
      btn.addEventListener('mouseenter', function () { gsap.to(btn, { scale: 1.06, duration: 0.35, ease: 'bounce.out', overwrite: 'auto' }); });
      btn.addEventListener('mouseleave', function () { gsap.to(btn, { scale: 1, duration: 0.3, ease: 'power2.out' }); });
      btn.addEventListener('click', function () { gsap.fromTo(btn, { scaleX: 1.25, scaleY: 0.75 }, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1,0.4)' }); });
    });

    // Typing — opacity only (no blur filter for perf)
    var typingEl = document.getElementById('dedication-typing');
    if (typingEl && !RM) {
      var fullText = typingEl.getAttribute('data-text') || typingEl.textContent.trim();
      typingEl.textContent = '';
      var cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      typingEl.appendChild(cursor);
      if (hasGSAP) {
        var chars = fullText.split('').map(function (ch) { var s = document.createElement('span'); s.className = 'ink-char'; s.textContent = ch; s.style.opacity = '0'; typingEl.insertBefore(s, cursor); return s; });
        gsap.to(chars, { opacity: 1, duration: 0.35, stagger: 0.055, ease: 'power2.out', delay: 0.9 });
        gsap.delayedCall(0.9 + chars.length * 0.055 + 0.4, function () { cursor.style.display = 'none'; });
      } else {
        var idx = 0;
        (function type() { if (idx < fullText.length) { var span = document.createElement('span'); span.className = 'ink-char'; span.textContent = fullText[idx]; typingEl.insertBefore(span, cursor); idx++; setTimeout(type, 55); } else setTimeout(function () { cursor.style.display = 'none'; }, 1200); })();
        setTimeout(function type2() {}, 900);
      }
    }

    // Poem typewriter — word-level to preserve wrapping on Safari (char-level breaks word-wrap)
    (function(){
      var isPoem = /poetry-book\/poems\//.test(location.pathname);
      if (!isPoem || RM) return;
      var paras = document.querySelectorAll('.book .page p');
      if (!paras.length) return;
      // Safari + small screens: skip char-typewriter, keep original wrapping
      var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      var isNarrow = window.matchMedia('(max-width: 600px)').matches;
      if (isSafari && isNarrow) return;
      function typePara(p){
        if (p.dataset.typed) return;
        p.dataset.typed='1';
        // keep <br> as line breaks
        var html = p.innerHTML;
        var parts = html.split(/<br\s*\/?>/i);
        p.innerHTML='';
        var cursor=document.createElement('span'); cursor.className='typing-cursor'; cursor.style.fontSize='1em';
        var frag=document.createDocumentFragment();
        var spans=[];
        parts.forEach(function(part, idx){
          // split preserving spaces by wrapping words
          var words = part.split(/(\s+)/);
          words.forEach(function(w){
            if (!w) return;
            var s=document.createElement('span'); s.className='ink-char'; s.textContent=w; s.style.opacity='0';
            // spaces should wrap normally
            if (/^\s+$/.test(w)) { s.style.display='inline'; }
            frag.appendChild(s); spans.push(s);
          });
          if (idx < parts.length-1) frag.appendChild(document.createElement('br'));
        });
        p.appendChild(frag);
        p.appendChild(cursor);
        if (typeof gsap!=='undefined') {
          gsap.to(spans, {opacity:1, duration:0.32, stagger:0.028, ease:'power2.out'});
          gsap.delayedCall(spans.length*0.028+0.32+0.3, function(){ cursor.style.display='none'; });
        } else {
          var i=0; (function step(){ if(i<spans.length){ spans[i].style.opacity='1'; i++; setTimeout(step, 28); } else setTimeout(function(){ cursor.style.display='none'; }, 300); })();
        }
      }
      if (hasIO) {
        try {
          var po=new IntersectionObserver(function(entries){
            entries.forEach(function(ent){ if(ent.isIntersecting){ typePara(ent.target); po.unobserve(ent.target); } });
          }, {threshold:0.18});
          paras.forEach(function(p){ po.observe(p); });
          return;
        } catch(e){}
      }
      paras.forEach(typePara);
    })();

    // Spotlight + hearts parallax — single mousemove + single rAF, translate3d
    var isDesktop = window.matchMedia('(hover: hover)').matches && !RM;
    var spot = null, trail = [], tpos = [];
    var sx = 0, sy = 0, mx = 0, my = 0, pending = false;
    if (isDesktop) {
      spot = document.createElement('div'); spot.className = 'cursor-spotlight'; document.body.appendChild(spot);
      trail = Array.from({ length: 6 }, function () { var d = document.createElement('div'); d.className = 'trail-dot'; d.style.opacity = '0'; document.body.appendChild(d); return d; });
      tpos = trail.map(function () { return { x: 0, y: 0 }; });
    }
    var hearts = isDesktop ? document.querySelectorAll('.heart') : [];
    if (isDesktop) hearts.forEach(function (h) { h.style.setProperty('--px', '0px'); h.style.setProperty('--py', '0px'); h.classList.add('animating'); });

    if (isDesktop) {
      document.addEventListener('mousemove', function (e) {
        sx = e.clientX; sy = e.clientY;
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
        if (!pending) {
          pending = true;
          requestAnimationFrame(function () {
            if (spot) { spot.style.transform = 'translate3d(' + sx + 'px,' + sy + 'px,0) translate(-50%,-50%)'; }
            tpos.forEach(function (p, i) {
              var lag = 0.22 - i * 0.02;
              p.x += (sx - p.x) * lag; p.y += (sy - p.y) * lag;
              trail[i].style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0) translate(-50%,-50%) scale(' + (1 - i * 0.11) + ')';
              trail[i].style.opacity = String(0.45 - i * 0.06);
            });
            hearts.forEach(function (h, i) {
              var d = 8 + i * 4;
              h.style.setProperty('--px', (mx * d) + 'px');
              h.style.setProperty('--py', (my * d * 0.6) + 'px');
            });
            pending = false;
          });
        }
      }, { passive: true });

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          trail.forEach(function (d) { d.style.opacity = '0'; });
        }
      });
    }

    // YES burst + haptics
    document.querySelectorAll('.yes-btn, #yes-btn').forEach(function (btn) {
      btn.classList.add('pulse-warm');
      btn.addEventListener('click', function () {
        try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
        if (RM) return;
        var rect = btn.getBoundingClientRect(); var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        var emojis = ['💖', '💕', '💗', '💓', '❤️'];
        for (var i = 0; i < 12; i++) {
          var s = document.createElement('span'); s.className = 'heart-burst'; s.textContent = emojis[i % 5];
          var ang = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.6; var dist = 70 + Math.random() * 90;
          s.style.left = cx + 'px'; s.style.top = cy + 'px';
          s.style.setProperty('--tx', Math.cos(ang) * dist + 'px');
          s.style.setProperty('--ty', Math.sin(ang) * dist - 40 + 'px');
          s.style.animationDelay = (i * 42) + 'ms';
          document.body.appendChild(s);
          if (hasGSAP) {
            gsap.fromTo(s, { scale: 0.3, opacity: 1 }, { scale: 1.15, opacity: 1, duration: 0.45, ease: 'back.out(1.7)', delay: i * 0.042 });
            (function (el) { gsap.to(el, { y: -30, opacity: 0, scale: 0.9, rotation: (Math.random() - 0.5) * 18, duration: 0.6, delay: 0.45 + i * 0.042, ease: 'power2.in', onComplete: function () { el.remove(); } }); })(s);
          } else setTimeout((function (el) { return function () { el.remove(); }; })(s), 1100 + i * 42);
        }
      });
    });

    // Nature bg parallax — desktop + !RM only, subtle wash drift
    if (!RM && hasGSAP && hasST && window.matchMedia('(hover: hover)').matches) {
      try {
        gsap.to('body', {
          '--bg-y': '-28%',
          ease: 'none',
          scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.6 }
        });
      } catch (e) {}
    }

    // Home fade
    var homeBtn = document.querySelector('.home-button');
    if (homeBtn) {
      homeBtn.style.opacity = '0'; homeBtn.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(function () {
        if (RM) { homeBtn.style.opacity = '1'; homeBtn.style.transform = 'translateX(-50%) translateY(0)'; return; }
        if (hasGSAP) gsap.to(homeBtn, { opacity: 1, y: 0, xPercent: -50, duration: 0.6, ease: 'back.out(1.4)' });
        else { homeBtn.style.transition = 'all .5s cubic-bezier(.16,1,.3,1)'; homeBtn.style.opacity = '1'; homeBtn.style.transform = 'translateX(-50%) translateY(0)'; }
      }, RM ? 100 : 800);
    }
  });

  // main-content.html defines its own handleResponse — don't clobber it
  if (!window.handleResponse) window.handleResponse = function (answer) { console.log('Response:', answer); };
})();
