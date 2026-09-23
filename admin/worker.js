/**
 * Ain site — admin API (Cloudflare Worker)
 *
 * Deploy this Worker, then open /admin on the site and point it at the
 * Worker's URL. Everything the editor saves lands in KV and is published to
 * GitHub as content.json, which the site reads.
 *
 * Bindings it expects:
 *   KV namespace  : CONTENT
 *   Secret        : ADMIN_PASSWORD   (your login password)
 *   Secret        : SESSION_SECRET   (any long random string)
 *   Secret        : GH_TOKEN         (GitHub token with Contents: write on the repo)
 *   Variable      : GH_REPO          e.g. NotKazuma/Ain-Syazwani
 *   Variable      : GH_BRANCH        e.g. main
 *   Variable      : ALLOW_ORIGIN     e.g. https://notkazuma.github.io
 */

const SESSION_HOURS = 12;
const MAX_TRIES = 5;            // failed logins allowed…
const WINDOW_MIN = 15;          // …per this many minutes, per IP
const MAX_BYTES = 512 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || ''),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // Browsers only send Origin on cross-site calls; block anything we don't know.
    if (origin && !allowed.includes(origin)) return json({ error: 'origin not allowed' }, 403);

    const path = url.pathname.replace(/\/+$/, '') || '/';
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
      if (path === '/health') return json({ ok: true });

      /* ---------------- login ---------------- */
      if (path === '/login' && request.method === 'POST') {
        const tries = Number(await env.CONTENT.get('tries:' + ip)) || 0;
        if (tries >= MAX_TRIES) return json({ error: 'Too many attempts. Try again later.' }, 429);

        const body = await readJson(request);
        const password = String(body && body.password || '');
        const ok = password.length > 0 && timingSafeEqual(password, String(env.ADMIN_PASSWORD || ''));
        if (!ok) {
          await env.CONTENT.put('tries:' + ip, String(tries + 1), { expirationTtl: WINDOW_MIN * 60 });
          await new Promise(r => setTimeout(r, 400 + Math.random() * 400));   // slow down guessing
          return json({ error: 'Wrong password.' }, 401);
        }
        await env.CONTENT.delete('tries:' + ip);
        const exp = Date.now() + SESSION_HOURS * 3600e3;
        return json({ token: await sign({ exp }, env.SESSION_SECRET), exp });
      }

      /* ---------------- content ---------------- */
      if (path === '/content') {
        if (!(await authed(request, env))) return json({ error: 'Not signed in.' }, 401);

        if (request.method === 'GET') {
          const saved = await env.CONTENT.get('content');
          if (saved) return json(JSON.parse(saved));
          const live = await fetch(rawUrl(env), { cf: { cacheTtl: 0 } });
          if (!live.ok) return json({ error: 'No content yet.' }, 404);
          return json(await live.json());
        }

        if (request.method === 'PUT') {
          const body = await readJson(request, MAX_BYTES);
          const bad = validate(body);
          if (bad) return json({ error: bad }, 400);

          body.version = (Number(body.version) || 0) + 1;
          body.updatedAt = new Date().toISOString();
          const text = JSON.stringify(body, null, 1);
          if (text.length > MAX_BYTES) return json({ error: 'Content too large.' }, 413);

          await env.CONTENT.put('content', text);
          const published = await publish(text, env);
          return json({ ok: true, published: published.ok, commit: published.sha, error: published.error, version: body.version });
        }
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: 'Server error: ' + (err && err.message) }, 500);
    }
  },
};

/* ---------------- helpers ---------------- */
const enc = new TextEncoder();

async function readJson(request, limit = 64 * 1024) {
  const text = await request.text();
  if (text.length > limit) throw new Error('payload too large');
  return JSON.parse(text || '{}');
}

function timingSafeEqual(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}
function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sign(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return body + '.' + await hmac(body, secret);
}
async function authed(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  if (!timingSafeEqual(sig, await hmac(body, env.SESSION_SECRET))) return false;
  try {
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp > Date.now();
  } catch (e) { return false; }
}

function validate(c) {
  if (!c || typeof c !== 'object') return 'Content must be an object.';
  if (c.fields && typeof c.fields !== 'object') return 'fields must be an object.';
  const listOk = (list, name) => {
    if (!Array.isArray(list)) return name + ' must be a list.';
    for (const poem of list) {
      if (!poem || typeof poem.title !== 'string') return 'Every poem needs a title.';
      if (!Array.isArray(poem.stanzas)) return 'Every poem needs stanzas.';
      for (const st of poem.stanzas) {
        if (!Array.isArray(st) || st.some(l => typeof l !== 'string')) return 'Poem lines must be text.';
      }
    }
    return null;
  };
  if (c.poems && listOk(c.poems, 'poems')) return listOk(c.poems, 'poems');
  if (c.apologyPoems && listOk(c.apologyPoems, 'apologyPoems')) return listOk(c.apologyPoems, 'apologyPoems');
  if (c.quotes) {
    for (const k of Object.keys(c.quotes)) {
      if (!Array.isArray(c.quotes[k]) || c.quotes[k].some(q => typeof q !== 'string')) return 'Quotes must be text.';
    }
  }
  return null;
}

function rawUrl(env) {
  return `https://raw.githubusercontent.com/${env.GH_REPO}/${env.GH_BRANCH || 'main'}/content.json`;
}

async function publish(text, env) {
  if (!env.GH_TOKEN) return { ok: false, error: 'No GitHub token set — saved here only.' };
  const api = `https://api.github.com/repos/${env.GH_REPO}/contents/content.json`;
  const head = {
    'Authorization': 'Bearer ' + env.GH_TOKEN,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ain-admin-worker',
    'Content-Type': 'application/json',
  };
  const branch = env.GH_BRANCH || 'main';
  let sha;
  const cur = await fetch(`${api}?ref=${branch}`, { headers: head });
  if (cur.ok) sha = (await cur.json()).sha;

  const res = await fetch(api, {
    method: 'PUT',
    headers: head,
    body: JSON.stringify({
      message: 'content: update from the admin editor',
      content: b64(text),
      branch,
      sha,
      committer: { name: 'NotKazuma', email: 'aimanskspp@gmail.com' },
      author: { name: 'NotKazuma', email: 'aimanskspp@gmail.com' },
    }),
  });
  if (!res.ok) return { ok: false, error: 'GitHub said: ' + (await res.text()).slice(0, 200) };
  return { ok: true, sha: (await res.json()).commit.sha.slice(0, 7) };
}

function b64(str) {
  const bytes = enc.encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
