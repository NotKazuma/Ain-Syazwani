/* Content loader — puts whatever is saved in content.json over the pages.
   The words baked into the HTML stay as the fallback, so the site still reads
   fine if this file (or the network) is missing. Runs before book.js. */
(function () {
  'use strict';

  var body = document.body;
  var root = body.getAttribute('data-root') || '';
  window.AinCMSPending = true;

  function boot() {
    window.AinCMSPending = false;
    try { if (window.AinBook && window.AinBook.boot) window.AinBook.boot(); } catch (e) {}
    try { if (window.AinReveal) window.AinReveal(); } catch (e) {}
    document.dispatchEvent(new CustomEvent('ain:content'));
  }

  var done = false;
  function finish(data) {
    if (done) return; done = true;
    if (data) { try { apply(data); } catch (e) { } }
    boot();
  }
  setTimeout(function () { finish(null); }, 4000);   // never leave the book unbuilt

  fetch(root + 'content.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(finish)
    .catch(function () { finish(null); });

  /* ---------- helpers ---------------------------------------------------- */
  function lines(el, text) {                    // plain text, newlines become <br>
    el.textContent = '';
    String(text).split('\n').forEach(function (ln, i) {
      if (i) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(ln));
    });
  }
  function paragraphs(el, text) {               // blank line = new paragraph
    el.textContent = '';
    String(text).split(/\n{2,}/).forEach(function (chunk) {
      var p = document.createElement('p');
      lines(p, chunk.trim());
      el.appendChild(p);
    });
  }
  function stanzaEl(st) {
    var p = document.createElement('p');
    p.className = 'stanza';
    st.forEach(function (line, i) {
      var s = document.createElement('span');
      s.className = 'ln';
      s.style.setProperty('--d', (i * 0.12) + 's');
      s.textContent = line;
      p.appendChild(s);
    });
    return p;
  }
  function fillPoem(box, stanzas) {
    box.textContent = '';
    (stanzas || []).forEach(function (st) { box.appendChild(stanzaEl(st)); });
  }
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  function roman(n) { return ROMAN[n] || String(n + 1); }

  /* ---------- apply ------------------------------------------------------- */
  function apply(data) {
    var f = data.fields || {};
    var poems = data.poems || [];
    var quotes = data.quotes || {};

    // 1. simple text fields
    Object.keys(f).forEach(function (key) {
      var val = f[key];
      if (typeof val !== 'string') return;
      document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (el) {
        if (el.getAttribute('data-cms-kind') === 'html') paragraphs(el, val);
        else {
          lines(el, val);
          if (el.hasAttribute('data-text')) el.setAttribute('data-text', val);
        }
      });
    });

    // 2. the poem inside the letter
    var lp = document.querySelector('[data-cms-poem="letter.poem"]');
    if (lp && f['letter.poem.stanzas']) fillPoem(lp, f['letter.poem.stanzas']);

    // 3. a standalone poem page
    var pp = document.querySelector('[data-cms-poem^="poem-"]');
    if (pp) {
      var id = pp.getAttribute('data-cms-poem');
      var idx = -1;
      poems.forEach(function (p, i) { if (p.id === id) idx = i; });
      if (idx > -1) {
        var poem = poems[idx];
        var t = pp.querySelector('.title'); if (t) t.textContent = poem.title;
        var num = pp.querySelector('.poem-num'); if (num) num.textContent = roman(idx);
        var box = pp.querySelector('.poem'); if (box) fillPoem(box, poem.stanzas);
        var count = pp.querySelector('.poem-index');
        if (count) count.childNodes[0].nodeValue = (idx + 1) + ' / ' + poems.length + ' ';
        document.title = (idx + 1) + '. ' + poem.title + ' — For Ain';
      }
    }

    // 4. quote lists
    Object.keys(quotes).forEach(function (name) {
      var list = document.querySelector('[data-cms-quotes="' + name + '"]');
      if (!list) return;
      var finale = list.classList.contains('quotes--grid') && name === 'heart';
      list.textContent = '';
      quotes[name].forEach(function (text, i, arr) {
        var li = document.createElement('li');
        li.setAttribute('data-reveal', '');
        var bq = document.createElement('blockquote');
        bq.className = 'quote';
        if (finale && i === arr.length - 1) { li.className = 'is-finale'; bq.className += ' quote--finale'; }
        bq.textContent = text;
        li.appendChild(bq);
        list.appendChild(li);
      });
    });

    // 5. the apology poems
    var ap = document.querySelector('[data-cms-apology]');
    if (ap && data.apologyPoems) {
      var blocks = ap.querySelectorAll('.poem-block');
      var anchor = blocks.length ? blocks[blocks.length - 1].nextSibling : null;
      blocks.forEach(function (b) { b.remove(); });
      data.apologyPoems.forEach(function (poem, i) {
        var sec = document.createElement('section');
        sec.className = 'poem-block';
        var n = document.createElement('span'); n.className = 'poem-num'; n.textContent = roman(i);
        var h = document.createElement('h2'); h.className = 'subtitle'; h.textContent = poem.title;
        var box = document.createElement('div'); box.className = 'poem';
        fillPoem(box, poem.stanzas);
        sec.appendChild(n); sec.appendChild(h); sec.appendChild(box);
        ap.insertBefore(sec, anchor);
      });
    }

    // 6. the book: rebuild the poem pages and the contents list
    var faces = document.querySelector('[data-cms-book]');
    if (faces && poems.length) {
      var old = faces.querySelectorAll('[id^="poem-"]');
      var after = old.length ? old[old.length - 1].nextSibling : null;
      old.forEach(function (n) { n.remove(); });
      poems.forEach(function (poem, i) {
        var sec = document.createElement('section');
        sec.className = 'face';
        sec.id = poem.id || ('poem-' + (i + 1));
        sec.setAttribute('data-kind', 'page');
        sec.setAttribute('data-label', roman(i) + '. ' + poem.title);
        sec.setAttribute('data-num', String(i + 1));
        var inner = document.createElement('div');
        inner.className = 'page-in';
        var n = document.createElement('span'); n.className = 'face-num'; n.textContent = roman(i);
        var h = document.createElement('h2'); h.className = 'face-title'; h.textContent = poem.title;
        var box = document.createElement('div'); box.className = 'poem-body';
        fillPoem(box, poem.stanzas);
        inner.appendChild(n); inner.appendChild(h); inner.appendChild(box);
        if (poem.page) {                       // only the original poems have their own page
          var a = document.createElement('a');
          a.className = 'own-page'; a.href = poem.page; a.textContent = 'Open on its own page';
          inner.appendChild(a);
        }
        sec.appendChild(inner);
        faces.insertBefore(sec, after);
      });
      var toc = faces.querySelector('.book-toc');
      if (toc) {
        toc.textContent = '';
        poems.forEach(function (poem, i) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + (poem.id || ('poem-' + (i + 1)));
          a.setAttribute('data-goto', poem.id || ('poem-' + (i + 1)));
          var num = document.createElement('span'); num.className = 'num'; num.textContent = roman(i) + '.';
          var nm = document.createElement('span'); nm.className = 'name'; nm.textContent = poem.title;
          a.appendChild(num); a.appendChild(nm);
          li.appendChild(a);
          toc.appendChild(li);
        });
      }
      var others = faces.querySelector('#others');
      if (others) others.setAttribute('data-num', String(poems.length + 1));
    }
  }
})();
