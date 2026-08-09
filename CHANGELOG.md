# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

## [1.21.0] — 2026-08-09

### Added
- Start of Turn resolver on the Party tab — rolls the Scenario die (1d10) and, on a 9-10, automatically rolls Threat (1d20) against the current level: a natural 20 lowers Threat -5, a roll above the current level raises it +1, and anything at or below rolls on the matching Threat Table (In Battle / Not in Battle, toggled with one button) and applies the result's Threat change automatically

## [1.20.1] — 2026-08-09

### Changed
- Cleaned up wording throughout the changelog to focus on what changed in the app rather than how it was researched

## [1.20.0] — 2026-08-09

### Added
- Door / Chest Opener on the Dice tab — one button rolls the lock check (1d10) and trap check (1d6) together and raises Threat +1 automatically. If locked, shows the Pick Lock penalty and HP, with buttons for Pick the Lock (2 AP, no extra Threat, jams on a fumble), Force Open (+2 Threat per attempt, enter your damage roll), and Use a Crowbar (fixed 8+DB damage, +1 Threat) — each tracking the door/chest's remaining HP until it breaks open

### Notes
- Trap resolution itself (drawing a trap card) stays manual — the app doesn't have trap card data, so a trapped result just flags it as a reminder
- The lock-pick fumble threshold isn't stated explicitly in the rulebook excerpt this is based on; a natural 00 (100 on d100) is used as the fumble trigger, matching the common convention elsewhere in the system

## [1.19.0] — 2026-08-08

### Added
- Banking added to Resolve an Activity — each hero can hold a separate balance in all three Silver City banks (Chamberlings Reserve, Smartfall Bank, The Vault), with Deposit/Withdraw buttons and a "Roll It" that runs the 1d20 profit/loss check for the selected bank (each bank has its own slice of the roll range, including a "Robbed!" result that wipes that bank's balance)

### Notes
- This completes the settlement feature set (settlement services, activities, and events). Remaining roadmap: Start of Turn/Threat Table, the Door/Chest opener, Sanity automation, the Alchemy potion-maker, and Backgrounds mechanical effects

## [1.18.1] — 2026-08-08

### Fixed
- Buy a Dog and Buy a Familiar showed up as normal settlement activities with no indication they need the separate Companions' Expansion — both now note that right in the Activities picker, since this app has no mechanical effect for them without it

## [1.18.0] — 2026-08-08

### Added
- Temporary Effects tracker — Temple boons and Curses now actually apply to the hero (not just a log message), show up in a red "Temporary Effects (until next dungeon exit)" box on the hero's card, and clear with a single tap per effect or all at once with "Left dungeon — clear all"
- Curse! (the settlement event) now genuinely applies the rolled curse to every hero, matching the book ("apply the curse to all heroes"), instead of leaving it as a manual note
- Fortune Teller's roll-1 result ("treat one enemy hit as a miss next quest") is now logged as a reminder in Temporary Effects too, even though there's no stat to reverse

### Changed
- Refactored the Talents auto-apply system (v1.6.0) and the new Temple/Curse effects to share one applyEffectDelta() function, so both work identically and reverse cleanly

## [1.17.1] — 2026-08-08

### Added
- Arena Fighting now resolves the full result, not just win/lose: winning pays out entry fee x a level/bracket multiplier plus XP (50/100/150 for Group/Semi/Final) straight to the hero, a Final win rolls for a bonus treasure, and losing costs HP (2/4/6 by bracket) and 2 Sanity
- The entry fee is only charged on the Group round, matching the rule that it covers all three brackets — rolling Semi or Final afterward for the same attempt assumes it's already paid, while still using the same fee amount as the payout base for that bracket's multiplier

## [1.17.0] — 2026-08-08

### Added
- Resolve an Activity panel on the Settlement tab — rolls and applies 7 settlement activities that previously had no mechanic behind them: Pray at Temple (all 6 gods' boons, auto-filtered to whichever temples the current settlement actually has), Fortune Teller, Gambling (Luck reduces the roll without spending it, per the rule), Horse Racing (DEX test, level-based payout multiplier, catastrophe-strikes failure), Arena Fighting (CS check with HP/STR/bracket modifiers), Tending to Those Memories (free Sanity + optional paid top-up), and Treat Mental Conditions (cures a listed condition)

### Notes
- Arena Fighting resolves win/lose, but there's no prize-money data for it, so payout amounts are still up to you
- Temple/Curse/Feast-style boons that last "until the next dungeon exit" are applied immediately with a reminder in the result — there's no duration-tracking system yet, so remove them manually when the dungeon ends

## [1.16.0] — 2026-08-08

### Added
- Side Quest table (1d6) wired in — the Settlement Event "Side Quest" now has a Roll It button that names the actual quest instead of just saying "roll on the Side Quest Table", and the Roll Available Quests side-quest check names it too when it triggers. Full quest details still live in your own Quest Book — this just automates picking which one

## [1.15.1] — 2026-08-08

### Added
- Detailed Silver City street map added to the Maps section on the Settlement tab — shows named locations (Jarl's Palace, The Market, the guild halls, the Arena, the Temple Grounds, etc.), zoomable like the other two maps

## [1.15.0] — 2026-08-08

### Added
- Real per-settlement data from "The Settlements of the Southern Part of the Kingdom" (p134-137): actual Inn cost for all 11 settlements (15c-65c, not a flat guess), which auto-fills when you pick a settlement instead of needing to type it in
- Each settlement now shows its available Services and which gods' Temples are present, plus settlement-specific notes (Durburim/Birnheim's +2 Durability on locally-made gear, the Outpost's 100c/hero Ancient Lands toll)
- The Activities picker now only shows what the current settlement actually offers — no more seeing "Learn a Spell" at a village with no Wizards' Guild. Guild-based activities (Charge/Identify Magic Item, Learn a Spell, Guild Business, Skill Training) only exist in Silver City, since it's the only settlement with Guilds at all

## [1.14.1] — 2026-08-08

### Fixed
- Inn cost now defaults to 25c (whole party) instead of 0 — still editable per settlement if your table charges differently

### Notes
- Only affects brand-new campaigns — existing saved campaigns keep whatever inn cost they already had (0, most likely), since the app can't tell the difference between "never touched this" and "deliberately set to 0." Update it manually on the Settlement tab if you want the correct default there too

## [1.14.0] — 2026-08-08

### Changed
- Luck is now a proper cur/max stat (like HP, Mana, Energy, Sanity) instead of a bare number. Existing saves migrate automatically — old Luck value becomes both cur and max. Shows as a StatBar alongside the other stats, with the Talents/Level Up bonuses that grant Luck (Lucky, God's Chosen, Halfling's starting Luck, the level-up table) correctly raising the max and refilling the current value
- Rest at Inn now actually restores Luck to max, per the Rest and Recuperation rule ("Mana, Luck and energy are automatically restored") — previously left un-refilled because Luck had no max to restore to
- Rest at Inn no longer just blocks if the party can't afford it — it now applies the rulebook's actual fallback: sleeping in the stable for free, which gives 1d6 HP (instead of 2d6) and only half (rounded down) of the Mana/Luck/Energy deficit

## [1.13.0] — 2026-08-07

### Added
- Backpack now has an "Add from table…" dropdown covering ~35 items from the Equipment Appendix (potions, tools, consumables, jewellery, light sources, misc gear) — picking one adds it with name/value/ENC/durability already filled in. "Add Custom Item" is still there for anything homebrew or not in the book

### Changed
- Replaced the Backpack Size item-count field with a real Backpack Upgrade picker (Small/Medium/Large). Turns out the QRS doesn't cap backpacks by item count at all — capacity is purely STR-based ENC, and Medium/Large backpacks are what actually raise that threshold (+10/+25 ENC, at a cost of -5/-10 DEX while worn, both applied automatically). The old counter wasn't modelling the real rule, so it's gone rather than kept as a parallel system

## [1.12.1] — 2026-08-07

### Fixed
- No way to remove a weapon or armour piece once picked from the table, short of manually clearing every field — both now have a one-tap Clear button that resets the slot back to blank
- Item name was squeezed into a cramped row alongside DEF/ENC/DUR and got clipped on mobile — name is now its own full-width line above the stats, so it's always fully visible

## [1.12.0] — 2026-08-07

### Added
- Levelling up is now automatic — awarding XP (either via "Award XP" on the Party tab, or editing a hero's XP directly) checks it against the XP Levelling table and, if it crosses a threshold, applies the level increase, rolls the HP/Luck/Energy gains, and adds the +15 Improvement Points to that hero's pool, all on its own. A big XP award that crosses two thresholds at once correctly levels up twice
- A gold toast pops up ("[Hero] leveled up! Now level X — ...") no matter which tab triggered it, since Award XP lives on the Party tab but the level-up itself is about a specific hero
- A small gold badge with the Improvement Point count now sits on each hero's button in the Heroes tab whenever they have unspent points, plus a matching dot on the Heroes nav tab itself so it's visible without switching tabs

### Notes
- The manual Level Up button is still there as an override (forces a level regardless of XP, e.g. for house rules) — it's not gated behind the XP threshold, since the automatic path now handles the normal case

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
