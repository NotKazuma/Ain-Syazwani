# The editor — one-time setup

The site itself stays on GitHub Pages. The editor's password lives on a
Cloudflare Worker, so nobody can read it out of the website's files.

## 1. Cloudflare (free account)

1. Sign in at dash.cloudflare.com → **Workers & Pages** → **Create** → **Worker**.
   Name it `ain-admin`, deploy the starter, then **Edit code**.
2. Delete what's there, paste everything from `admin/worker.js`, **Deploy**.
   Copy the Worker's URL (e.g. `https://ain-admin.<you>.workers.dev`).
3. **Storage & Databases → KV → Create namespace**, name it `ain-content`.
4. Back in the Worker → **Settings → Bindings**:
   - KV namespace: variable name `CONTENT` → `ain-content`
   - Variable `GH_REPO` = `NotKazuma/Ain-Syazwani`
   - Variable `GH_BRANCH` = `main`
   - Variable `ALLOW_ORIGIN` = `https://notkazuma.github.io`
   - Secret `ADMIN_PASSWORD` = a long passphrase you'll remember
   - Secret `SESSION_SECRET` = any long random string (mash the keyboard)
   - Secret `GH_TOKEN` = a GitHub token (below)

## 2. GitHub token

github.com → Settings → Developer settings → **Fine-grained tokens** →
Generate new token:
- Repository access: **Only select repositories** → `Ain-Syazwani`
- Permissions: **Contents: Read and write** (nothing else)
- Expiry: 90 days (renew when it runs out)

Paste it into the Worker as the `GH_TOKEN` secret.

## 3. Use it

Open `https://notkazuma.github.io/Ain-Syazwani/admin/`, enter the Worker URL
once, then your password. Edit, press **Publish**. The site updates about a
minute later (GitHub Pages rebuild).

## Notes

- The editor page is public but useless without the password; it is marked
  noindex so search engines skip it.
- Five wrong passwords from one address locks logins for 15 minutes.
- A sign-in lasts 12 hours on that device.
- To lock everyone out immediately, change `SESSION_SECRET` in the Worker.
- Losing the GitHub token only lets someone edit this one repository; revoke
  it on GitHub and make a new one.
