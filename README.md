# League of Dungeoneers — Companion & Ledger

A campaign companion app for the *League of Dungeoneers* board game (von Braus
Publishing): party/threat/morale tracking, a combat calculator, spell &
prayer casting, a searchable talents/perks/spells/prayers/special-rules
compendium, dice, loot rolls, and multi-campaign save/load.

## Running it locally

You'll need [Node.js](https://nodejs.org) 18 or later installed.

```bash
npm install
npm run dev
```

This starts a local dev server (Vite will print the URL, usually
`http://localhost:5173`) with hot-reload.

To build the production version:

```bash
npm run build
npm run preview   # serves the built dist/ folder locally, to sanity-check it
```

## Data & storage

This app started life as a Claude.ai artifact, which persists data through
Anthropic's own storage API. Running it standalone like this, `src/storage.js`
swaps that for the browser's `localStorage` instead — same shape, so the app
code didn't need to change. That means:

- Data is saved **per browser, per device**. Clearing site data/cookies for
  this domain will wipe your campaigns.
- There's no sync between devices — a campaign started on your phone won't
  show up on your laptop unless you export/import manually (not built yet).

## Deploying — GitHub + Vercel

### 1. Push this project to GitHub

From inside this folder:

```bash
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repository on GitHub (no README/gitignore, since you
already have them), then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

### 2. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (you can sign
   in directly with your GitHub account).
2. Click **Import** next to the repository you just pushed.
3. Vercel auto-detects this as a Vite project (Build Command
   `npm run build`, Output Directory `dist`) — you shouldn't need to change
   anything. There's also a `vercel.json` in this repo making that explicit.
4. Click **Deploy**. After a minute or two you'll get a live URL like
   `your-repo-name.vercel.app`.

From then on, every push to `main` automatically redeploys.

### Custom domain (optional)

In the Vercel project → **Settings → Domains**, add your own domain and
follow the DNS instructions it gives you.

## Project structure

```
├── index.html          # HTML entry point
├── src/
│   ├── main.jsx         # Mounts the app, wires up the storage shim
│   ├── App.jsx           # The entire app (all tabs, components, game data)
│   ├── storage.js        # localStorage-backed persistence shim
│   └── index.css         # Tailwind entry point
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── vercel.json
```

Everything lives in `App.jsx` as a single file, matching how it was
originally built as a Claude artifact — feel free to split it into
multiple files if you keep developing it further.
