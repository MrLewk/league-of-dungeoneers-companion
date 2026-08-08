# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

## [1.11.0] — 2026-08-07

### Added
- Creation Points are now interactive: a live "X CP left" badge above the Stats grid, with +/− buttons under each stat that spend or refund from the 15-point pool and enforce the 10-per-stat cap — matching the Specialisation rule exactly instead of being a passive counter you had to track yourself
- Improvement Points spending now has a matching − (refund) button next to each stat/skill, undoing a purchase and restoring both the point and the exact IP cost that was paid for it

### Fixed
- Number inputs starting at 0 couldn't be retyped on mobile without manually selecting and deleting the 0 first — tapping into any number field now auto-selects its content, so the next digit typed just overwrites it, across the whole app

## [1.10.1] — 2026-08-07

### Fixed
- Mana was computed as flat WIS instead of WIS x 1.5 rounded down (the actual Magic chapter formula) — fixed in both places it's set (Roll Starting Stats, and picking a caster profession)
- Sanity for brand-new heroes defaulted to 10 instead of the QRS's fixed starting value of 8 (existing saved heroes are untouched — this only affects heroes created from now on)
- Elf and Dwarf species notes didn't mention their actual Traits (Perfect Hearing, Night Vision, Hate Goblins) at all; Halfling's note didn't mention Lucky. All four now documented correctly

### Added
- Roll Starting Stats now auto-applies species Traits that map to a clean bonus: Night Vision (Elf, Dwarf) and Perfect Hearing (Elf) are added as Talents with their real effect, and Halfling gets its starting Luck Point set automatically. Hate Goblins (Dwarf) and Jack of All Trades (Human) still need a manual pick from the Compendium, since they require choosing an enemy/category
- Picking Warrior Priest as a profession now sets starting Energy to 2 instead of 1, matching the QRS (only if Energy is still at its default, so it won't override a manual edit)

## [1.10.0] — 2026-08-07

### Added
- Armour picker on the hero card — each location (Head, Arms, Torso, Legs, Shield) now has a "Pick from table…" dropdown listing the pieces from the Armour & Shields Appendix that actually cover that spot, auto-filling Name/Def/ENC/Durability. A reference line shows Tier, Special rules (Stackable, Clunky, Huge), Cost, Availability, and flags if the piece also covers another location (so ENC only gets counted once)
- Armour pieces are now named — they were previously just bare Def/ENC/Dur numbers with nothing identifying what they were
- Sell & Repair on the Settlement tab now include named armour alongside weapons and backpack items — selling clears the slot, repairing restores real durability on the hero sheet, same as weapons since v1.9.1

## [1.9.1] — 2026-08-07

### Fixed
- Sell & Repair let you type any price and click Sell repeatedly for infinite coins, since it wasn't tied to anything the party actually owned. Sell now requires picking a real item — a hero's equipped weapon, or a named backpack item — and removes it once sold, so it can't be sold twice
- Repair now targets a real damaged weapon and actually restores its durability on the hero sheet, instead of being a disconnected calculator. Backpack items aren't repairable yet since they only store a single durability value, not a current/max pair

## [1.9.0] — 2026-08-07

### Added
- Update-available toast — since updates have been shipping fast, the app now detects when a new version has been deployed (checked hourly while open, plus on every normal page load) and shows a floating banner with a Reload button, instead of you needing to know to manually refresh
- Reloading via that banner automatically opens the changelog afterward, so it's obvious what changed — but only right after an update, not on every ordinary refresh (uses a one-time #log URL hash that gets cleaned up immediately after)

### Changed
- PWA update mode switched from silent auto-update to prompt-based — new versions no longer swap in behind your back mid-session; you control when the reload happens

## [1.8.1] — 2026-08-07

### Fixed
- Armour row on the hero card wrapped DUR onto a second line on narrow phones — each location (Head, Arms, Torso, Legs, Shield) now gets its own sub-header line, with DEF/ENC/DUR fields in a single row underneath that fits within the card width

## [1.8.0] — 2026-08-07

### Added
- Weapon picker on the hero card — a dropdown of all 23 weapons from the Equipment Appendix (Dagger through Elven Bow) that auto-fills Name, DMG, ENC, and Durability (6/6, the QRS default) instead of typing them in by hand
- Once a weapon matching the table is set (picked or typed to match), a reference line shows its Class, Special rules, Cost, Availability, Reload (missile weapons), and the STR needed to wield it — highlighted red if the hero's current STR is under the two-handed minimum

## [1.7.0] — 2026-08-07

### Added
- Sell & Repair calculator on the Settlement tab — settlement-only per the QRS ("This may be done when you visit a settlement"). The book prints it as a lookup table (purchase price vs. lost durability), but every row is exactly price × a fixed percentage per durability step (70/60/50/40/30/20%), so it's a live formula instead: enter a price and it shows sell value or repair cost instantly, with Sell/Repair buttons that move coins in the party pot. Repair is blocked if the party can't afford it, matching the Rest at Inn fix; Sell is blocked below 10c or once an item has lost all its durability, per the rulebook

## [1.6.1] — 2026-08-07

### Added
- Combat Talents & Perks quick-reference panel on the Combat tab (Close Combat, Ranged, and Damage modes) — lists every hero's attached Combat-type Talents and Perks with their effect text, so you don't have to flip back to the hero sheet mid-fight

## [1.6.0] — 2026-08-07

### Added
- 13 Talents with an unconditional numeric bonus now auto-apply to the hero sheet when added or removed from the Compendium — Catlike (+5 DEX), Fast (+1 Movement), Resilient (+5 CON), Strong (+5 STR), Strong Build (+2 HP), God's Chosen (+1 Luck), Disciplined (+10 RES), Hunter (+10 Foraging), Lucky (+1 Luck), Night Vision (+10 Perception), Persistent (+15 Mana), Confident (+5 RES), Strong-Minded (+1 Sanity). Marked with a gold "Auto:" badge in both the Compendium browser and on the hero's attached-talents list. Every other talent (the majority — combat/conditional ones like Hate or Marksman) stays a description card, since there's no safe way to auto-apply a once-per-battle or situational rule
- Movement is now a tracked field on the hero sheet (starts at 4, per the QRS) instead of not existing at all

## [1.5.1] — 2026-08-07

### Fixed
- Rest at Inn applied the HP/Mana/Energy recovery even when the party couldn't afford the inn cost — it now checks affordability first and blocks the whole action with a clear message if the party is short on coins

## [1.5.0] — 2026-08-07

### Added
- Level Up now rolls the actual per-level table: +1d2 HP, and +1 Luck / +1 Energy on the levels that grant them (not just the flat +15 Improvement Points) — hero card also shows XP remaining to the next level
- Spend Improvement Points directly on a hero's card: tap a stat/skill to raise it, cost shown live (doubles past 70), with the +5/stat-skill and +2/HP per-level caps enforced automatically. Knight/Druid aren't in the official QRS cost table, so they stay manual with a note
- Damage Bonus (STR) and Natural Armour (CON) now show as auto-computed badges on the hero stat grid, and the Combat tab's damage calculator has one-tap buttons to fill DB from a hero's STR
- Set Starting Morale from RES button on the Party tab — PM = sum of floor(RES/10) across all heroes; the −10 RES threshold note now shows the real computed half-value once set

### Fixed
- Improvement Point note incorrectly said the cost-doubling threshold was 80 — the QRS says 70

## [1.4.2] — 2026-08-07

### Added
- Settlement events that need a follow-up roll now show a "Roll It" button that resolves it automatically: Thief (steals coins), Settlement Feast (bed check + morale), Scrolls Salesman (3 random spells), Assassination Attempt (bandit count + targeted hero), Curse (rolls the Curses Table)
- Reset button on both the Quick Dice and Loot Roller panels — clears recent rolls without switching tabs
- Rest at Inn now shows a confirmation summary (HP/Mana/Energy per hero, inn cost paid) so the button doesn't look like it did nothing

## [1.4.1] — 2026-08-07

### Fixed
- Mobile layout — the tab bar now scrolls horizontally as pill buttons instead of wrapping into a tall stack of rows
- The Settlement activity picker (hero + activity dropdowns) no longer overflows the screen width on narrow phones — it stacks vertically now, with the location note shown below instead of crammed into the dropdown text
- Added a site-wide safeguard so no element can force horizontal page scroll again

### Added
- Maps section on the Settlement tab — The Known World and the Silver City Area, tap to open full-screen with pinch-to-zoom and +/- zoom buttons

## [1.4.0] — 2026-08-07

### Added
- New Settlement tab — pick from all 11 settlements (correct quest dice/colour per the QRS), roll the 1d12 settlement-entry event with the full event table, roll available quests (1d6, or 2d20 for Silver City) plus the 1d8 side-quest check
- Per-hero Activity Point ledger — the full settlement action list (blacksmith, temple, guilds, etc.) with AP costs, logged per hero with undo and a one-tap ledger reset for a new visit
- Rest at Inn — select which heroes stay, rolls 2d6 HP recovery per hero and refills Mana/Energy, with an editable whole-party inn cost that deducts coins

### Notes
- Luck has no tracked maximum in this app, so Inn rest doesn't auto-refill it — adjust manually if your table restores Luck at the inn

## [1.3.2] — 2026-08-07

### Added
- JSON-LD structured data (schema.org `WebApplication`) in `index.html` for search engines
- `robots.txt`, `sitemap.xml`, and a canonical URL tag
- `llms.txt` with a plain-text app summary — an informal, unofficial convention some AI tools check when browsing; not a guarantee any given assistant reads it
- iOS `apple-mobile-web-app-capable` / `apple-mobile-web-app-title` meta tags, so the home-screen icon gets a short title instead of the full page `<title>`

### Notes
- This is a client-rendered SPA with no server-side rendering, so individual app content (compendium entries, etc.) isn't indexable as separate pages by search engines — the realistic SEO value here is a well-described single landing page, not per-feature indexing

## [1.3.1] — 2026-08-07

### Added
- Floating install banner — prompts visitors to install the app, with a working Install button on Android/desktop (via the `beforeinstallprompt` API) and Share → Add to Home Screen instructions on iOS, since Safari doesn't expose an install API. Dismissing it is remembered (stored per-browser) so it won't show again for that visitor

## [1.3.0] — 2026-08-07

### Added
- The app is now a full PWA — installable to your home screen/desktop with an offline-capable service worker, its own icon, and a proper app name instead of just a browser tab (via `vite-plugin-pwa`)
- Favicon added (was missing before) — same icon used across favicon, home-screen icon, and Apple touch icon

## [1.2.0] — 2026-08-07

### Added
- Heroes tab now shows one hero at a time via sub-tabs (name pills, horizontally scrollable), with Add Hero as a fixed + button beside them, instead of stacking every hero's full card in one long scroll
- Adding a hero automatically switches to its new tab

### Removed
- The per-hero collapse/expand toggle — redundant now that only one hero is shown at a time

## [1.1.0] — 2026-08-06

### Added
- Class skills now auto-calculate from profession + stats (skill = source stat + a per-profession modifier), with a Recalculate button to resync at any time without losing the Free Skill bonus
- Wizard/Druid starting Mana auto-fills from WIS, per the rulebook
- Encumbrance now shows a red "eff" value on every stat and skill when a hero is overloaded, and automatically applies the −10 penalty when autofilling the Combat calculator or Stat/Skill Check tool from a hero
- ENC is now tracked on weapons and armour, not just backpack items
- Campaign export/import — download a campaign as a JSON file for backup, import it back in (here or on another device) as a new campaign
- In-app changelog viewer, linked from the footer

### Fixed
- Hero delete now requires a two-step confirm, matching the existing campaign-delete pattern
- Buy Me a Coffee button switched from their JS widget (which calls `document.write()` and breaks in React apps) to their static link+image button

## [1.0.0] — 2026-08-05

### Added

**Party tracking**
- Threat Level tracker with one-tap buttons for every trigger in the rules, and a Threat Table quick reference
- Party Morale tracker with the full event list (deaths, treasure, rest, etc.), using QRS v2.24 values
- Food and coin tracking
- Award Experience panel — gives the same XP to every hero in one tap
- Running session log

**Hero sheets**
- Full stat block (STR/CON/DEX/WIS/RES), HP, Energy, Sanity, Mana, Luck
- Full skill list (CS, RS, Dodge, Pick Locks, Barter, Heal, Alchemy, Perception, Foraging), plus Arcane Arts (Wizard/Druid) and Battle Prayers (Warrior Priest) where relevant
- Species dropdown — 10 species (Human, Elf, Halfling, Dwarf, Gnome, Duckfolk, Frogling, Half-Ogre, Pale Goblin, Pale Orc) with starting-stat formulas and a "Roll Starting Stats & HP" button
- Racial max-stat display (Duckfolk, Half-Ogre) with over-cap warning
- Profession dropdown — 10 classes including Knight and Druid, each with a short blurb
- Background (20-entry flavour table, with a roll button)
- Free Skill picker — automatically applies/removes the +10 bonus as you change it
- Creation Points and Improvement Points (levelling) counters
- Level Up button (+1 level, +15 Improvement Points) and editable XP
- Weapon slot (name/DMG/durability) and per-location Armour (Head/Arms/Torso/Legs/Shield) with DEF and durability
- Backpack as a proper table (Item/Value/ENC/Dur) with a Size cap and an "Add Backpack Item" button
- Conditions as removable pills, added via free text
- Talents/Perks/Spells/Prayers/Special Rules shown as description cards, grouped by type/school/level, not just bare tags
- Separate Comments/notes field

**Combat calculator**
- Close Combat and Ranged to-hit calculators with tickable modifiers, hero autofill, and a d100 roll
- Damage calculator (Weapon DMG + DB − NA − Armour)
- Stat/Skill check roller with hero + skill autofill
- Cast Spell and Say Prayer panels — pick a hero, pick from what they know, and it deducts Mana/Energy automatically with clear feedback when there isn't enough

**Compendium**
- Full searchable database: 99 Talents, 43 Perks, 18 Prayers, 54 Spells, 64 monster Special Rules
- One-tap "Add" to attach any entry to a hero

**Dice & loot**
- d4/d6/d10/d20/d100 roller, hit-location roller
- Loot Roller with the T1–T5 tables

**Quest Generator**
- Rolls quests for Silver City, Village, and The Outpost starting points, matching the game's actual branching tables, with Book/page references

**Reference**
- Condensed rules reference: Action Points, Power Attack/Parry, Fear & Terror, Damage Types, Threat Table, Doors, Encounters & Traps, Initiative Tokens, Wandering Monster movement, Rest checklist, Searching

**Campaigns**
- Save, load, rename, and delete multiple campaigns from a dedicated tab
- Start a fresh campaign at any time without losing others
- Loading overlays with accurate per-action labels (loading/switching/deleting)

**Other**
- Buy Me a Coffee button and copyright footer (app © Luke Wilson, game content © von Braus Publishing, unofficial fan tool disclaimer)
- Vercel Analytics
- MIT license, public-facing README

### Fixed
- Backpack table layout now uses flexbox with fixed-scale width classes instead of arbitrary grid columns, so it renders identically in the Claude-artifact preview and the deployed build
- Free Skill bonus is now visibly highlighted on its skill card instead of being an invisible +10

### Notes
- Improvement Points (levelling) and Creation Points are tracked as counters only — the actual per-stat/skill point cost table (rulebook p54) isn't available to this app, so increases are applied manually
- Level-ups are manual (via the Level Up button), not auto-triggered by XP, since the XP-per-level thresholds aren't available to this app
- Racial max stats are only known for Duckfolk and Half-Ogre; other species don't show a cap
