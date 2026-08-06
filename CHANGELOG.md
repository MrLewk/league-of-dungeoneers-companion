# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

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
