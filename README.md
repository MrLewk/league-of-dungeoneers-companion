# League of Dungeoneers — Companion & Ledger

An unofficial companion web app for **League of Dungeoneers** (von Braus
Publishing) — a stat tracker, combat calculator, and rules reference built to
take the bookkeeping and maths off your plate mid-session so you can focus on
playing.

Live demo: _add your Vercel URL here once deployed_

## Features

- **Party tracker** — Threat Level and Party Morale with one-tap buttons for
  every trigger in the rules, plus food and coin tracking and a running
  session log.
- **Hero sheets** — HP, Energy, Sanity, Mana, the full skill list, weapon and
  per-location armour (with durability), and chips for every Talent, Perk,
  Spell, Prayer, and Special Rule attached to that hero.
- **Combat calculator** — tick the modifiers that apply (height advantage,
  attacking from behind, shields, defensive stance, etc.) and it totals the
  effective CS/RS for you, rolls, and tells you Success / Fail / Perfect. A
  separate panel handles the damage formula (Weapon DMG + DB − NA − Armour).
- **Cast spells & say prayers** — pick a hero, pick from what they know, and
  the app deducts the Mana or Energy cost and logs it automatically.
- **Compendium** — every Talent, Perk, Prayer, Spell, and monster Special
  Rule in the game, searchable, with a one-tap "Add" to attach any of them to
  a hero.
- **Dice tray & loot roller** — d4/d6/d10/d20/d100, a hit-location roller,
  and the T1–T5 loot tables so you don't need to flip pages mid-battle.
- **Multiple campaigns** — save, load, rename, and delete separate
  campaigns, and start a fresh one any time without losing the others.

## This is a fan project

This app is unofficial and isn't affiliated with or endorsed by von Braus
Publishing. *League of Dungeoneers* and all associated game content —
rules text, spell/talent/perk/prayer/special-rule names and descriptions,
setting details, etc. — are the property of von Braus Publishing. This
repository's code (the app itself) is MIT-licensed; the game content it
references is not, and reproducing it elsewhere is subject to von Braus
Publishing's own rights. If you own the game, this tool is meant to sit
alongside your physical copy, not replace it.

## Running it locally

Requires [Node.js](https://nodejs.org) 18 or later.

```bash
git clone https://github.com/<your-username>/league-of-dungeoneers-companion.git
cd league-of-dungeoneers-companion
npm install
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`) with hot-reload.

To build a production bundle:

```bash
npm run build
npm run preview   # serve the built dist/ folder locally
```

## Deploying your own copy

The app is a static site (Vite + React), so any static host works — these
steps are for [Vercel](https://vercel.com), which requires no configuration:

1. Push this repo to your own GitHub account.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects the Vite build (`npm run build`, output `dist`) — a
   `vercel.json` in this repo makes that explicit. Click **Deploy**.
4. Every push to `main` redeploys automatically.

## Data & privacy

There's no backend or account system. Campaign data is stored entirely in
your browser's `localStorage` — nothing is sent to a server. That means:

- Data stays on the device/browser you used to create it; there's no sync
  between devices.
- Clearing your browser's site data for this domain will erase your saved
  campaigns.

## Tech stack

React + Vite, Tailwind CSS, [lucide-react](https://lucide.dev) for icons,
and [Vercel Analytics](https://vercel.com/docs/analytics) for privacy-
friendly usage stats (only active once deployed on Vercel — it's a no-op
locally and on other hosts). Everything lives in `src/App.jsx` as a single
file.

## License

The code in this repository is licensed under the [MIT License](LICENSE).
See the note above regarding the game content it references.
