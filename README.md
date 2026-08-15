# League of Dungeoneers — Companion & Ledger

An unofficial companion web app for **League of Dungeoneers** (von Braus
Publishing) — a stat tracker, combat calculator, and rules reference built to
take the bookkeeping and maths off your plate mid-session so you can focus on
playing.

Live app: [https://league-of-dungeoneers-companion.vercel.app/](https://league-of-dungeoneers-companion.vercel.app/)

Installable as an app on your phone, tablet, or desktop straight from that
link — open it in your browser, then use "Add to Home Screen" (iOS/Android)
or the install icon in the address bar (Chrome/Edge desktop). No app store
needed.

## Features

The app is organised into tabs covering every phase of a session, front to
back — the aim is to run a full campaign without needing to open the
rulebook except for narrative flavour.

- **Party** — Threat Level and Party Morale with one-tap buttons for every
  trigger in the rules, plus food and coin tracking and a running session
  log.
- **Turn** — step-by-step turn/round structure matching the rulebook's Turn
  Sequence, with Action Point tracking and a full Encounter Roller (all
  seven faction tables — Beasts, Orcs and Goblins, Bandits and Brigands,
  Reptiles, Dark Elves, Undead, Ancient Lands) linked straight into the
  Bestiary.
- **Heroes** — full hero sheets: HP, Energy, Sanity, Mana, encumbrance, the
  full skill list, weapon and per-location armour (with durability), auto-
  calculated stats and conditions, and chips for every Talent, Perk, Spell,
  Prayer, Special Rule, and Background attached to that hero.
- **Combat** — a full combat calculator for Close Combat, Ranged, Damage
  (with Hit Location), Stat Checks, Spells, and Prayers. Tick the modifiers
  that apply (height advantage, attacking from behind, shields, defensive
  stance, etc.) and it totals the effective CS/RS, rolls, and reports
  Success / Fail / Perfect. Casting spells or saying prayers automatically
  deducts the Mana or Energy cost and logs it.
- **Bestiary** — every monster and NPC statblock, searchable, ready to
  reference straight into the Combat tab.
- **Actions** — Door/Chest Opener, Portcullis, Cobweb Covered Opening,
  Levers, and Search Tile resolvers, so exploration checks are one tap
  instead of a table lookup.
- **Alchemy** — the full potion, elixir, and ingredient system, including
  identification and brewing.
- **Dice** — a dice tray (d4/d6/d10/d20/d100) and a hit-location roller for
  anything that falls outside the automated calculators.
- **Reference** — Magic Items, Enchantments, and the full Legendary Items
  Compendium, all searchable.
- **Travel** — movement, daily events, rations/foraging, and rest handled
  automatically as the party moves between settlements.
- **Settlement** — every settlement service (Arena, Asylum, Banks,
  Blacksmith, Fortune Teller, General Store, Guilds, Horse Racing Track,
  Inner Sanctum, Temples), gated correctly by settlement (e.g. Inner
  Sanctum vs Temples in Silver City), plus the Estate system (Silver City
  only) with its own unlimited storage.
- **Guilds** — all six Guilds in one place: services, training, and guild
  business.
- **Quest** — Campaign, Random, Side Quests, and Ancient Lands quests, with
  completion tracking per quest type.
- **Compendium** — every Talent, Perk, Prayer, Spell, monster Special Rule,
  and Legendary Item in the game, searchable, with a one-tap "Add" to attach
  any of them to a hero.
- **Lore** — 45 lore entries across 6 categories, for worldbuilding and
  flavour between sessions.
- **Campaigns** — save, load, rename, delete, export, and import as many
  separate campaigns as you like, and start a fresh one any time without
  losing the others.

Every calculation the rules ask you to do by hand — combat math, damage,
encumbrance, resource costs, Threat/Morale triggers, travel events — is
automated. Manual dice prompts are kept only for the handful of things that
genuinely need physical cards or a table roll (e.g. Fine/Mundane/Wonderful
Treasure decks).

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
[vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for installability and
offline support, and [Vercel Analytics](https://vercel.com/docs/analytics)
for privacy-friendly usage stats (only active once deployed on Vercel — it's
a no-op locally and on other hosts). Everything lives in `src/App.jsx` as a
single file.

## License

The code in this repository is licensed under the [MIT License](LICENSE).
See the note above regarding the game content it references.
