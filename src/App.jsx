import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Minus, Trash2, Flame, Heart, Zap, Brain, Sparkles, Dice5,
  Swords, Shield, BookOpen, Users, Skull,
  RotateCcw, Coins, Wheat, ScrollText, Pencil, Check, X, FolderOpen, Loader2, Map, Download, Upload,
  Landmark, Bed, ClipboardList, Timer, Flashlight
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

// ---------- Palette / tokens (inline, no Tailwind arbitrary values) ----------
const palette = {
  parchment: "#EAE0C6",
  parchmentDark: "#DCCBA0",
  panel: "#F3EAD3",
  ink: "#2A211B",
  inkSoft: "#6B5A45",
  crimson: "#7A1F2B",
  crimsonDark: "#4E1119",
  gold: "#A97A2A",
  goldSoft: "#C9A24B",
  forest: "#3E5240",
  forestDark: "#28352A",
  charcoal: "#1C1712",
  ember: "#C4531E",
  line: "#B8A66E",
};

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
`;

// ---------- Helpers ----------
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;
const rollPercent = () => Math.floor(Math.random() * 100) + 1; // 1-100, 100 = "00"
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const uid = () => Math.random().toString(36).slice(2, 10);

const defaultHero = () => ({
  id: uid(),
  name: "New Hero",
  species: "",
  profession: "",
  level: 1,
  xp: 0,
  stats: { STR: 5, CON: 5, DEX: 5, WIS: 5, RES: 5 },
  luck: { cur: 0, max: 0 },
  background: "",
  backgroundCounter: 0,
  backgroundClaimed: false, // one-time reward already claimed
  improvementPoints: 0,
  ipSpentThisLevel: {},
  creationPoints: 15,
  creationPointsSpent: { STR: 0, CON: 0, DEX: 0, WIS: 0, RES: 0 },
  freeSkill: "",
  hp: { cur: 10, max: 10 },
  energy: { cur: 1, max: 1 },
  sanity: { cur: 8, max: 8 },
  mana: { cur: 0, max: 0 },
  movement: 4,
  skills: {
    cs: 30, rs: 30, dodge: 20, pickLocks: 20, barter: 20,
    heal: 20, alchemy: 20, perception: 20, foraging: 20,
    arcaneArts: 0, battlePrayers: 0,
  },
  weapon: { name: "", dmg: "", enc: 0, dur: { cur: 6, max: 6 } },
  armour: {
    head: { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    arms: { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    torso: { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    legs: { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    shield: { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 } },
  },
  talents: [],
  perks: [],
  spells: [],
  prayers: [],
  specialRules: [],
  conditions: [],
  backpackUpgrade: "",
  tempEffects: [],
  mentalConditions: [], // [{id, name, detail, effect}] — see MENTAL_CONDITIONS_TABLE
  bankBalances: { chamberlings: 0, smartfall: 0, vault: 0 },
  ap: 2,
  backpack: [],
  notes: "",
});

// Starting stats per species — base + dice roll, from the official character-creation
// tool (base game + Frogling/Pale expansions). Basic stats and HP are rolled the same
// way: base + dice. Note text is condensed from that tool's per-species creation rules.
const SPECIES_DATA = [
  { name: "Human", hp: { base: 7, count: 1, size: 6 }, stats: { STR: 30, CON: 30, DEX: 30, WIS: 30, RES: 30 }, note: "Jack of All Trades: roll a random Talent from a chosen category at creation (pick manually from the Compendium)." },
  { name: "Elf", hp: { base: 6, count: 1, size: 6 }, stats: { STR: 25, CON: 20, DEX: 40, WIS: 35, RES: 30 }, note: "Traits: Perfect Hearing, Night Vision — both applied automatically when you roll starting stats." },
  { name: "Halfling", hp: { base: 5, count: 1, size: 6 }, stats: { STR: 20, CON: 20, DEX: 40, WIS: 30, RES: 40 }, note: "Cannot use Longbows or Elvin bows (height). May buy Cooking Gear for 50c at the start of the game. Trait: Lucky — starts with 1 Luck Point, set automatically when you roll starting stats." },
  { name: "Dwarf", hp: { base: 8, count: 1, size: 6 }, stats: { STR: 40, CON: 30, DEX: 25, WIS: 25, RES: 30 }, note: "Cannot use Longbows or Elvin bows (height). Traits: Hate Goblins, Night Vision — Night Vision is applied automatically when you roll starting stats; Hate Goblins needs a chosen enemy, so add the Hate Talent manually from the Compendium." },
  { name: "Gnome", hp: { base: 4, count: 1, size: 6 }, stats: { STR: 20, CON: 20, DEX: 30, WIS: 40, RES: 40 }, note: "Cannot use Longbows or Elvin bows (height). Artificer: once specialised, pays half cost for blacksmithing/crafting services." },
  { name: "Duckfolk", hp: { base: 6, count: 1, size: 6 }, stats: { STR: 25, CON: 25, DEX: 30, WIS: 30, RES: 40 }, max: { STR: 55, CON: 60, DEX: 70, WIS: 70, RES: 80 }, note: "Short arms — cannot use Longbows or Elvin bows." },
  { name: "Frogling", hp: { base: 4, count: 1, size: 6 }, stats: { STR: 20, CON: 35, DEX: 40, WIS: 30, RES: 25 }, note: "Cannot use Longbows or Elvin bows (height)." },
  { name: "Half-Ogre", hp: { base: 10, count: 2, size: 6 }, stats: { STR: 50, CON: 40, DEX: 25, WIS: 15, RES: 40 }, max: { STR: 80, CON: 60, DEX: 60, WIS: 60, RES: 60 }, note: "+2 Sanity. May only take the Warrior, Barbarian, or Rogue profession." },
  { name: "Pale Goblin", hp: { base: 5, count: 1, size: 6 }, stats: { STR: 25, CON: 20, DEX: 40, WIS: 30, RES: 35 }, note: "Cannot use Longbows or Elvin bows (height)." },
  { name: "Pale Orc", hp: { base: 8, count: 1, size: 6 }, stats: { STR: 40, CON: 35, DEX: 25, WIS: 20, RES: 30 }, note: "Cannot use Longbows or Elvin bows (height)." },
];
const SPECIES = SPECIES_DATA.map((s) => s.name);

// Backgrounds (p40-46, roll 1d20) — full mechanical text. Two entries share the name
// "Revenge" (#7 and #16) but are entirely different backgrounds with different quests —
// distinguished here by `id`, shown in the UI with their roll number.
// `reward` shapes:
//   { type: "xp", amount }              — one-time claim
//   { type: "xpPerKills", amount, per, counterLabel }  — repeatable, tracked by a counter
//   { type: "item", name, note }        — one-time claim, adds a backpack item
//   { type: "branch", options: [{label, xp, note, effect}] } — pick one outcome (Lost Brother)
// `startEffect` (applyEffectDelta shape) applies automatically when the background is
// selected, and reverses if changed away from. `partyMoraleEffect` / `sanityMaxBonus` are
// handled specially since they're not per-hero stat deltas.
const BACKGROUNDS_DATA = [
  {
    id: "wanderlust", roll: 1, name: "Wanderlust",
    text: "Personal Quest: Visit all settlements on the map (11 total). Once done, gain 1500 XP.",
    reward: { type: "xp", amount: 1500 },
  },
  {
    id: "the-well", roll: 2, name: "The Well",
    text: "Personal Trait and Quest: Starts with Claustrophobia (see Psychology chapter) — not curable at the Asylum. Instead, fight and survive 5 battles in a corridor to cure it. Reward: cured, plus the Tunnel Fighter Talent.",
    startsWithCondition: "Claustrophobia",
    reward: { type: "cure", note: "Cures the starting Claustrophobia and grants the Tunnel Fighter Talent.", grantsTalent: "Tunnel Fighter" },
    counterLabel: "Corridor battles survived", counterTarget: 5,
  },
  {
    id: "fables", roll: 3, name: "Fables",
    text: "Personal Quest: Visit 3 Quest Sites in the Ancient Lands. Once you leave the third site, gain 1500 XP.",
    reward: { type: "xp", amount: 1500 },
  },
  {
    id: "the-heirloom", roll: 4, name: "The Heirloom",
    text: "Personal Quest: Find your Great Aunt's sword. At the start of each quest, roll 1d10 — on a 1, that dungeon holds it (place a secondary Quest Card; the room after always has enemies, roll twice on the encounter table; the highest-XP enemy carries it). Reward: a silver shortsword, +1 DMG and +2 Durability. Cannot be sold.",
    reward: { type: "item", name: "Great Aunt's Silver Shortsword", note: "+1 DMG, +2 Durability. Cannot be sold." },
  },
  {
    id: "arachnophobia", roll: 5, name: "Arachnophobia",
    text: "Personal Trait and Quest: Starts with Arachnophobia (see Psychology chapter) — not curable at the Asylum. Instead, fight and survive 3 battles with spiders to cure it. Reward: cured, plus a permanent +10 CS whenever attacking a spider.",
    startsWithCondition: "Arachnophobia",
    reward: { type: "cure", note: "Cures the starting Arachnophobia and grants permanent +10 CS vs spiders." },
    counterLabel: "Spider battles survived", counterTarget: 3,
  },
  {
    id: "the-lost-brother", roll: 6, name: "The Lost Brother",
    text: "Personal Quest: Find your lost brother. Track dungeons entered; at the start of each quest roll 1d10 — on a 1, he's in that dungeon. Once found, roll 1d100 + dungeons entered. 60+: he's dead — choose to leave or bury him (either way -3 Sanity, +250 XP; burying grants +10 RES permanently but you can't carry loot until he's laid to rest). Below 60: he's alive and travels with you — if he makes it to a settlement, +1500 XP (if he dies en route, treat as the 60+ result).",
    reward: { type: "branch", options: [
      { label: "Found dead — left him", xp: 250, note: "-3 Sanity", effect: { sanity: -3 } },
      { label: "Found dead — buried him", xp: 250, note: "-3 Sanity, +10 RES permanently", effect: { sanity: -3, stat: "RES", amount: 10 } },
      { label: "Found alive — reached a settlement", xp: 1500, note: null },
    ] },
  },
  {
    id: "revenge-bandits", roll: 7, name: "Revenge",
    text: "Talent: Hate all enemies from the Bandits and Brigands faction. Personal Quest: for every 5 enemies from that faction killed with the killing blow, gain an additional 250 XP.",
    reward: { type: "xpPerKills", amount: 250, per: 5, counterLabel: "Bandits/Brigands killed" },
  },
  {
    id: "bad-tempered", roll: 8, name: "Bad Tempered",
    text: "Personal Trait: Permanent -2 Party Morale. However, always expecting the worst has its benefits — permanent +2 max Sanity.",
    partyMoraleEffect: -2, sanityMaxBonus: 2,
  },
  {
    id: "poverty", roll: 9, name: "Poverty",
    text: "Personal Trait and Quest: May never make a purchase, or lend money, that would leave you with less than 10c. Must accumulate 1000c for your family — deliver it at your (randomised, non-Silver-City) home settlement for 1 Movement Point. Reward: 2000 XP.",
    reward: { type: "xp", amount: 2000, note: "Claim once you've saved 1000c and delivered it home." },
  },
  {
    id: "proving-your-worth", roll: 10, name: "Proving Your Worth",
    text: "Personal Quest: Kill (or have your party kill) an enemy worth 450+ XP, then return to your father's (randomised, non-Silver-City) home settlement for 1 Movement Point to claim the Armour of the Father (see Legendary Items).",
    reward: { type: "item", name: "Armour of the Father", note: "See the Legendary Items chapter for its stats." },
  },
  {
    id: "the-fraud", roll: 11, name: "The Fraud",
    text: "Not applicable for Wizards — reroll if you are one. Personal Trait: starts -10 CS, RS, and Dodge (no formal training), and -10 RES (temporary). Personal Quest: once CS, RS, and Dodge are each improved by +10 from their starting value, RES is restored (and increased a further +10), plus 1500 XP.",
    startEffect: { stat: "RES", amount: -10 },
    startsWithNote: "-10 CS, -10 RS, -10 Dodge at creation (apply directly to those skills when picking this background — not automated here since they're skills, not a single stat).",
    reward: { type: "xp", amount: 1500, note: "Claim once CS/RS/Dodge are each +10 above their starting values — also manually apply +20 RES total (removes the -10 penalty and adds +10) and reverse the starting -10 RES applied here." },
  },
  {
    id: "the-noble", roll: 12, name: "The Noble",
    text: "Effect: Starts with 400c instead of the normal 150c starting coin (this app's default). However, if the party ever drops below 150c, RES is reduced by -10 until back to 150c or more. The below-150c check isn't monitored live — you'll need to watch for it and apply/remove the -10 RES yourself.",
    startingCoinsBonus: 250,
  },
  {
    id: "sworn-enemy", roll: 13, name: "Sworn Enemy",
    text: "Personal Quest: Whenever you end up in battle with bandits, roll 1d10 — on a 10, add a Bandit Leader to the encounter (Hate vs. the whole party, plus Frenzy). Once it's killed, gain 500 XP.",
    reward: { type: "xp", amount: 500, note: "Claim once the Bandit Leader is killed." },
  },
  {
    id: "the-family-keep", roll: 14, name: "The Family Keep",
    text: "Randomise one quest location (white numbers) for your ancestral Keep's ruins. Personal Quest: fully clear that dungeon (every tile placed, all enemies killed — use the generic Dungeon Generator if going there specifically for this). Reward: 1500 XP.",
    reward: { type: "xp", amount: 1500 },
  },
  {
    id: "troll-slayer", roll: 15, name: "Troll Slayer",
    text: "Personal Quest: Land the killing blow on a troll (of any kind). Reward: +1000 XP.",
    reward: { type: "xp", amount: 1000 },
  },
  {
    id: "revenge-minotaur", roll: 16, name: "Revenge",
    text: "Talent: Hate Minotaurs. Personal Quest: every time you fight a Minotaur, roll 1d6 — on a 1, you recognise the scar from your village's attacker. If you defeat that beast, gain an additional 1000 XP.",
    reward: { type: "xp", amount: 1000 },
  },
  {
    id: "a-new-home", roll: 17, name: "A New Home",
    text: "Personal Quest: Acquire the Bergmeister Estate. Reward: 1500 XP.",
    reward: { type: "xp", amount: 1500 },
  },
  {
    id: "the-apprentice", roll: 18, name: "The Apprentice",
    text: "Personal Trait: Whenever using an armour repair kit or a whetstone, automatically regain 3 Points of Durability on your gear (situational — apply by hand when it comes up).",
  },
  {
    id: "weak", roll: 19, name: "Weak",
    text: "Personal Trait: Whenever rolling for contracting a disease, suffer a -10 modifier to CON. However, once you're cured of your 3rd disease, your immune system kicks into overdrive — instead gain +10 CON when rolling for disease, and cure yourself on a natural CON roll of 01-10 instead of 01-05. Situational — apply by hand when it comes up.",
    counterLabel: "Diseases cured", counterTarget: 3,
  },
  {
    id: "afraid-of-heights", roll: 20, name: "Afraid of Heights",
    text: "Personal Trait: Whenever taking a Fear Test (not Terror), gain +10 RES. However, whenever on a bridge, RES is halved (round down) and CS/RS suffer -20. Situational — apply by hand when it comes up.",
  },
];
const BACKGROUNDS = BACKGROUNDS_DATA.map((b) => b.name);
// Looks up by id (current storage format) first, falling back to matching by name for
// old saves — ambiguous only for the two "Revenge" entries, which falls back to #7.
function getBackgroundData(hero) {
  if (!hero || !hero.background) return null;
  return BACKGROUNDS_DATA.find((b) => b.id === hero.background) || BACKGROUNDS_DATA.find((b) => b.name === hero.background) || null;
}
// Max Sanity is 8, plus any background bonus (e.g. Bad Tempered's +2), minus the hero's
// current mental condition count — used consistently everywhere Sanity max is recomputed.
function sanityMaxFor(hero) {
  const bonus = getBackgroundData(hero)?.sanityMaxBonus || 0;
  return Math.max(0, 8 + bonus - (hero.mentalConditions?.length || 0));
}

const PROFESSIONS = [
  { name: "Warrior", desc: "Balanced melee fighter with solid defence and attack." },
  { name: "Barbarian", desc: "High damage in close combat, often lower defence." },
  { name: "Alchemist", desc: "Potions and alchemical weapons — utility and ranged damage." },
  { name: "Ranger", desc: "Ranged attacks and tracking, good at avoiding traps." },
  { name: "Rogue", desc: "Versatile — moderate combat, some stealth/trap utility." },
  { name: "Thief", desc: "Lockpicking and perception specialist, weaker in direct combat." },
  { name: "Warrior Priest", desc: "Melee combat combined with healing and battle prayers." },
  { name: "Wizard", desc: "Magic attacks and spells — fragile but powerful at range." },
  { name: "Knight", desc: "Heavy melee tank with a squire — never uses ranged weapons or steals." },
  { name: "Druid", desc: "Nature caster — invocations and beastforms, fragile but shapeshifts into combat forms." },
];

// Which extra (RES/WIS-caster) skills a profession's sheet includes, per the official character sheets
const CASTER_SKILL = { "Wizard": "arcaneArts", "Druid": "arcaneArts" };
const PRAYER_SKILL = { "Warrior Priest": "battlePrayers" };

const SKILL_LABELS = {
  cs: "CS (DEX)", rs: "RS (DEX)", dodge: "Dodge (DEX)", pickLocks: "Pick Locks (DEX)",
  barter: "Barter (WIS)", heal: "Heal (WIS)", alchemy: "Alchemy (WIS)",
  perception: "Perception (WIS)", foraging: "Foraging (CON)",
  arcaneArts: "Arcane Arts (WIS)", battlePrayers: "Battle Prayers (RES)",
};

// Which base stat each skill derives from. Battle Prayers is set to RES here to match
// the official character sheet's explicit "(RES)" column — the source app this data
// came from had it keyed to WIS instead, which looks like a bug on their end.
const SKILL_SOURCE_STAT = {
  cs: "DEX", rs: "DEX", dodge: "DEX", pickLocks: "DEX",
  barter: "WIS", heal: "WIS", alchemy: "WIS", perception: "WIS",
  foraging: "CON", arcaneArts: "WIS", battlePrayers: "RES",
};

// Per-profession skill modifiers (skill value = source stat + this modifier), from the
// character-creation tool. Skills a profession doesn't list (e.g. Knight has no RS —
// they never use ranged weapons) are left alone rather than zeroed out.
const PROFESSION_SKILLS = {
  Warrior: { cs: 10, rs: 5, dodge: 0, pickLocks: -20, barter: -15, heal: -10, alchemy: -25, perception: -10, foraging: -15 },
  Barbarian: { cs: 15, rs: -10, dodge: 5, pickLocks: -20, barter: -15, heal: -10, alchemy: -25, perception: -5, foraging: -15 },
  Alchemist: { cs: -5, rs: -5, dodge: -10, pickLocks: -20, barter: 0, heal: 5, alchemy: 10, perception: -10, foraging: -20 },
  Ranger: { cs: -5, rs: 15, dodge: -5, pickLocks: -25, barter: -20, heal: -10, alchemy: -20, perception: 0, foraging: 15 },
  Rogue: { cs: 0, rs: 0, dodge: 0, pickLocks: 0, barter: 5, heal: -10, alchemy: -25, perception: 0, foraging: 0 },
  Thief: { cs: -5, rs: 5, dodge: 5, pickLocks: 10, barter: 0, heal: -20, alchemy: -30, perception: 10, foraging: -20 },
  "Warrior Priest": { cs: 5, rs: -5, dodge: -5, pickLocks: -20, barter: -10, heal: 5, alchemy: -15, perception: -10, foraging: -20, battlePrayers: 15 },
  Wizard: { cs: -5, rs: -10, dodge: -10, pickLocks: -20, barter: 5, heal: -5, alchemy: -20, perception: -10, foraging: -20, arcaneArts: 10 },
  Knight: { cs: 10, dodge: 0, pickLocks: -25, barter: 5, heal: -15, alchemy: -20, perception: -10, foraging: -25 },
  Druid: { cs: -5, rs: 0, dodge: -10, pickLocks: -20, barter: 0, heal: 5, alchemy: 0, perception: -5, foraging: 0, arcaneArts: 5 },
};

const STAT_KEYS = ["STR", "CON", "DEX", "WIS", "RES"];

// Damage Bonus (from STR) and Natural Armour (from CON) — Character Creation chapter.
// Take the highest threshold met; 0 below the first threshold.
function damageBonus(str) {
  const s = Number(str) || 0;
  if (s >= 70) return 3;
  if (s >= 60) return 2;
  if (s >= 50) return 1;
  return 0;
}
function naturalArmour(con) {
  const c = Number(con) || 0;
  if (c >= 70) return 5;
  if (c >= 65) return 4;
  if (c >= 60) return 3;
  if (c >= 55) return 2;
  if (c >= 50) return 1;
  return 0;
}

// Levelling table — XP requirement (from a settlement, to level up) plus the automatic
// Hit Point/Luck/Energy gains for reaching that level, from the Levelling Up chapter.
const XP_LEVELLING = [
  { level: 1, xp: 0, hpDie: false, luck: false, energy: false },
  { level: 2, xp: 2000, hpDie: true, luck: true, energy: true },
  { level: 3, xp: 5000, hpDie: true, luck: false, energy: false },
  { level: 4, xp: 10000, hpDie: true, luck: false, energy: true },
  { level: 5, xp: 25000, hpDie: true, luck: true, energy: false },
  { level: 6, xp: 50000, hpDie: true, luck: false, energy: false },
  { level: 7, xp: 75000, hpDie: true, luck: false, energy: true },
  { level: 8, xp: 110000, hpDie: true, luck: true, energy: false },
  { level: 9, xp: 160000, hpDie: true, luck: false, energy: true },
  { level: 10, xp: 220000, hpDie: true, luck: false, energy: false },
];

// Auto-applies every level-up a hero's current XP qualifies for (loops, so a big XP
// award that crosses two thresholds at once levels up twice), rolling the same
// HP/Luck/Energy gains and +15 Improvement Points as the manual Level Up button.
// Returns the updated hero plus a list of what happened, for a toast/log message.
function applyAutoLevelUps(hero) {
  let cur = hero;
  const events = [];
  while (true) {
    const nextLevel = cur.level + 1;
    const entry = XP_LEVELLING.find((l) => l.level === nextLevel);
    if (!entry || cur.xp < entry.xp) break;
    const patch = { level: nextLevel, improvementPoints: cur.improvementPoints + 15, ipSpentThisLevel: {} };
    const notes = ["+15 Improvement Points"];
    if (entry.hpDie) {
      const roll = rollDie(2);
      patch.hp = { ...cur.hp, cur: cur.hp.cur + roll, max: cur.hp.max + roll };
      notes.push(`+${roll} HP`);
    }
    if (entry.luck) {
      patch.luck = { cur: cur.luck.cur + 1, max: cur.luck.max + 1 };
      notes.push("+1 Luck");
    }
    if (entry.energy) {
      patch.energy = { ...cur.energy, cur: cur.energy.cur + 1, max: cur.energy.max + 1 };
      notes.push("+1 Energy");
    }
    cur = { ...cur, ...patch };
    events.push({ level: nextLevel, notes });
  }
  return { hero: cur, events };
}

// Improvement Point cost table (p54) — cost to raise a stat/skill by +1, per profession.
// Knight and Druid aren't in the official QRS table (they're extra professions this app
// added beyond the base 8), so they're left out — IP spending for them stays manual.
const IMPROVEMENT_COSTS = {
  Barbarian: { STR: 2, DEX: 2, CON: 2, WIS: 5, RES: 3, cs: 1, rs: 3, dodge: 3, pickLocks: 5, perception: 4, heal: 4, foraging: 4, barter: 5, alchemy: 5, hp: 5 },
  Warrior: { STR: 2, DEX: 2, CON: 2, WIS: 5, RES: 3, cs: 1, rs: 2, dodge: 3, pickLocks: 5, perception: 4, heal: 4, foraging: 4, barter: 4, alchemy: 5, hp: 5 },
  Ranger: { STR: 3, DEX: 2, CON: 1, WIS: 4, RES: 3, cs: 3, rs: 1, dodge: 3, pickLocks: 5, perception: 2, heal: 2, foraging: 1, barter: 3, alchemy: 4, hp: 10 },
  "Warrior Priest": { STR: 3, DEX: 3, CON: 3, WIS: 3, RES: 2, cs: 2, rs: 2, dodge: 3, pickLocks: 5, perception: 4, heal: 2, battlePrayers: 1, foraging: 4, barter: 3, alchemy: 4, hp: 10 },
  Wizard: { STR: 5, DEX: 4, CON: 4, WIS: 2, RES: 3, cs: 5, rs: 4, dodge: 3, pickLocks: 4, perception: 2, heal: 2, arcaneArts: 1, foraging: 5, barter: 1, alchemy: 3, hp: 10 },
  Thief: { STR: 5, DEX: 2, CON: 4, WIS: 3, RES: 3, cs: 5, rs: 2, dodge: 1, pickLocks: 1, perception: 1, heal: 4, foraging: 1, barter: 2, alchemy: 4, hp: 10 },
  Rogue: { STR: 3, DEX: 2, CON: 3, WIS: 4, RES: 3, cs: 3, rs: 3, dodge: 3, pickLocks: 3, perception: 3, heal: 3, foraging: 3, barter: 3, alchemy: 4, hp: 10 },
  Alchemist: { STR: 5, DEX: 4, CON: 4, WIS: 2, RES: 3, cs: 3, rs: 3, dodge: 4, pickLocks: 4, perception: 2, heal: 3, arcaneArts: 1, foraging: 4, barter: 3, alchemy: 1, hp: 10 },
};
const IP_STAT_SKILL_CAP_PER_LEVEL = 5; // no stat/skill may rise more than +5 per level
const IP_HP_CAP_PER_LEVEL = 2; // HP may only rise +2 per level via IP spend (separate from the automatic level-up roll)
const IP_DOUBLE_COST_THRESHOLD = 70; // cost doubles once the stat/skill has passed 70

function ipCostFor(hero, key) {
  const table = IMPROVEMENT_COSTS[hero.profession];
  if (!table || table[key] == null) return null;
  const base = table[key];
  if (key === "hp") return base;
  const current = STAT_KEYS.includes(key) ? Number(hero.stats[key]) || 0 : Number(hero.skills[key]) || 0;
  return current >= IP_DOUBLE_COST_THRESHOLD ? base * 2 : base;
}


// Recomputes a hero's skills from their profession's modifiers + current stats,
// re-applying the Free Skill +10 on top so it's never lost on recalculation.
// Skills the profession doesn't define are left untouched.
function computeProfessionSkills(hero) {
  const mods = PROFESSION_SKILLS[hero.profession];
  if (!mods) return hero.skills;
  const next = { ...hero.skills };
  Object.entries(mods).forEach(([skillKey, modifier]) => {
    const statKey = SKILL_SOURCE_STAT[skillKey];
    const statVal = Number(hero.stats[statKey]) || 0;
    let val = statVal + modifier;
    if (hero.freeSkill === skillKey) val += 10;
    next[skillKey] = val;
  });
  return next;
}

// Backpack upgrades (Miscellaneous Equipment) — the starting "small" backpack the QRS
// gives every hero adds no bonus capacity at all; Medium/Large are what "increase the
// carrying capacity" (their own wording), each with a DEX trade-off while worn.
const BACKPACK_UPGRADES = {
  "": { label: "Small (starting, no bonus)", enc: 0, dexPenalty: 0, cost: 0 },
  Medium: { label: "Medium Backpack", enc: 10, dexPenalty: -5, cost: 350 },
  Large: { label: "Large Backpack", enc: 25, dexPenalty: -10, cost: 600 },
};
function backpackEncBonus(hero) {
  return BACKPACK_UPGRADES[hero.backpackUpgrade || ""]?.enc || 0;
}

// Encumbrance penalty per the rulebook: total ENC (weapon + armour + backpack) over
// STR gives -10 to all skills and stats. A backpack upgrade raises the STR-based
// threshold by its own ENC bonus.
function encumbranceOver(hero) {
  const totalEnc =
    (Number(hero.weapon.enc) || 0) +
    Object.values(hero.armour).reduce((s, p) => s + (Number(p.enc) || 0), 0) +
    hero.backpack.reduce((s, i) => s + (Number(i.enc) || 0), 0);
  return totalEnc > (Number(hero.stats.STR) || 0) + backpackEncBonus(hero);
}

// Quick Slots — base 3, per the Actions/Equipment chapters. Combat Harness and Extended
// Battle Belt each set a higher fixed total (not a stacking +N) if owned anywhere in the
// hero's backpack or quick slots.
function quickSlotCapacity(hero) {
  const names = (hero.backpack || []).map((it) => it.name);
  if (names.includes("Combat Harness")) return 5;
  if (names.includes("Extended Battle Belt")) return 4;
  return 3;
}

const defaultParty = () => ({
  threat: 2, threatFloor: 2, morale: 0, food: 4, coins: 150,
  settlementName: "",
  settlementAP: {}, // heroId -> { spent: number, log: [{label, cost}] }
  innCostPerNight: 25,
  startingMorale: 0,
  round: 1,
  lightSources: [], // [{id, name, remaining}] — turns left before it goes out
});

// Fills in any fields missing from a party saved before this update.
function normalizeParty(p) {
  return { ...defaultParty(), ...(p || {}) };
}

const SANITY_EVENTS = [
  { label: "Failed a terror test", delta: -2 },
  { label: "Sprang a trap", delta: -2 },
  { label: "Wound to the head", delta: -1 },
  { label: "Failed a fear test", delta: -1 },
  { label: "Battle with a demon", delta: -1 },
  { label: "Reduced to 0 HP", delta: -1 },
  { label: "Contracted a disease", delta: -1 },
  { label: "Got poisoned", delta: -1 },
  { label: "Miscast a spell", delta: "-1d3" },
  { label: "Rest between quests", delta: "1d3", positive: true },
  { label: "Drinking & carousing (costs 1d3×100 coins)", delta: "1d6", positive: true },
];

// Mental Conditions (p55) — rolled once a hero's Sanity hits 0. Re-roll on a duplicate.
// Once diagnosed, max Sanity becomes 8 minus the hero's current condition count (not a
// flat 8), and it stays that way until the condition is cured (Treat Mental Conditions).
// `effect` (where present) uses the same shape as TALENT_EFFECTS/tempEffects and is
// applied via applyEffectDelta on diagnosis, reversed on cure. Conditions with only a
// situational/behavioural effect (Hate, Arachnophobia, Jumpy, Irrational Fear,
// Claustrophobia's corridor-only penalty, Lingering Trauma) have no `effect` — they're
// tracked and shown as a reminder instead, since there's nothing safe to automate.
const MENTAL_CONDITIONS_TABLE = [
  { roll: [1, 1], name: "Hate", text: "Gains the Hate Talent against the type of enemy last fought (it must appear in the Bestiary's Monster List).", needsDetail: "enemy" },
  { roll: [2, 3], name: "Acute Stress", text: "RES −10 for the rest of the quest. The hero screams during every battle, alerting everyone — Threat +1 per battle for the rest of the quest.", effect: { stat: "RES", amount: -10 } },
  { roll: [4, 4], name: "Lingering Trauma", text: "Dormant until triggered by a specific situation next dungeon (roll below). Once triggered: all Resolve Tests and CS at −10 until the dungeon is left.", needsDetail: "trauma" },
  { roll: [5, 5], name: "Fear of the Dark", text: "All Resolve Tests at −10.", effect: { stat: "RES", amount: -10 } },
  { roll: [6, 6], name: "Arachnophobia", text: "Treats all encounters as causing Terror." },
  { roll: [7, 7], name: "Jumpy", text: "A Scenario roll of 10 spooks the hero — the scream raises Threat by 2." },
  { roll: [8, 8], name: "Irrational Fear", text: "Irrationally afraid of a random monster faction — all monsters of that faction now cause Fear.", needsDetail: "faction" },
  { roll: [9, 9], name: "Claustrophobia", text: "All skills and stats at −10 while in corridors." },
  { roll: [10, 10], name: "Depression", text: "Energy pool reduced by 2.", effect: { energy: -2 } },
];
function rollMentalCondition() {
  const r = rollDie(10);
  return MENTAL_CONDITIONS_TABLE.find((c) => r >= c.roll[0] && r <= c.roll[1]);
}
const LINGERING_TRAUMA_TABLE = [
  { roll: 1, text: "A trap is sprung by the party." },
  { roll: 2, text: "A portcullis falls down." },
  { roll: 3, text: "A companion is reduced to 0 Hit Points." },
  { roll: 4, text: "A miscast in the party." },
  { roll: 5, text: "Party takes a short break." },
  { roll: 6, text: "The party opens a chest." },
];
const IRRATIONAL_FEAR_FACTIONS = ["Orcs and Goblins", "Beasts", "Undead", "Reptiles", "Dark Elves"];

// Values per QRS v2.24 (a couple differ slightly from the core rulebook — QRS is the current reference)
const MORALE_EVENTS = [
  { label: "A hero died", delta: -5 },
  { label: "A hero reached 0 HP", delta: -4 },
  { label: "Battle with demons", delta: -2 },
  { label: "A hero failed a terror test", delta: -2 },
  { label: "A party member is hungry (per member)", delta: -2 },
  { label: "A hero is poisoned or diseased", delta: -1 },
  { label: "A hero sprang a trap", delta: -1 },
  { label: "A character failed a fear test", delta: -1 },
  { label: "A miscast", delta: -1 },
  { label: "Portcullis fell, blocked path", delta: -1 },
  { label: "Found a fine treasure", delta: 1 },
  { label: "Took a short rest", delta: 2 },
  { label: "Slew a large monster", delta: 2 },
  { label: "Intoxicated party with Dwarven ale", delta: 3 },
  { label: "Found a wonderful treasure", delta: 3 },
];

const THREAT_UPS = [
  { label: "Party won a battle", delta: 1 },
  { label: "Opened a door / chest, or cleared a cobweb", delta: 1 },
  { label: "Threat roll exceeded current level", delta: 1 },
  { label: "Forced open a door/chest (crowbar)", delta: 1 },
  { label: "Forced open a door/chest (no crowbar)", delta: 2 },
];

// Settlements — quest dice/colour and event-roll threshold from the Settlements chapter
// intro, plus per-settlement Inn cost, available services, and Temples from "The
// Settlements of the Southern Part of the Kingdom" (p134-137). `services` uses the same
// category names as SETTLEMENT_ACTIVITIES' `locations`, so the Activities picker can
// filter to what's actually offered wherever the party currently is.
const SETTLEMENTS = [
  {
    name: "Birnheim", questDice: "", colour: "", eventOn: [11, 12], innCost: 65,
    services: ["Blacksmith", "General Store", "Temples"], temples: "All",
    notes: "Armours purchased here are Dwarven-made: +2 Durability (cumulative with other modifiers).",
  },
  {
    name: "Caelkirk", questDice: "1d4", colour: "Red", eventOn: [10, 12], innCost: 35,
    services: ["Blacksmith", "General Store", "Kennel"], temples: null,
  },
  {
    name: "Coalfell", questDice: "1d6", colour: "Green", eventOn: [11, 12], innCost: 35,
    services: ["Blacksmith", "General Store", "Temples"], temples: "Ohlnir",
  },
  {
    name: "Durburim", questDice: "", colour: "", eventOn: [11, 12], innCost: 65,
    services: ["Blacksmith", "General Store", "Temples"], temples: "All",
    notes: "Weapons purchased here are Dwarven-made: +2 Durability (cumulative with other modifiers).",
  },
  {
    name: "Freyfell", questDice: "1d6", colour: "Pink", eventOn: [10, 12], innCost: 25,
    services: ["Arena", "Blacksmith", "General Store", "Kennel", "Sick Ward"], temples: null,
  },
  {
    name: "Irondale", questDice: "1d6", colour: "Turqoise", eventOn: [11, 12], innCost: 15,
    services: ["Blacksmith", "General Store", "Temples"], temples: "Rhidnir, Iphy, Metheia",
  },
  {
    name: "Rochdale", questDice: "1d6", colour: "Purple", eventOn: [11, 12], innCost: 20,
    services: ["General Store", "Herbalist", "Sick Ward", "Magic Brewery"], temples: null,
  },
  {
    name: "Silver City", questDice: "2d20", colour: "White", eventOn: [8, 12], innCost: 25,
    services: ["Arena", "Asylum", "Banks", "Blacksmith", "Fortune Teller", "General Store", "Guilds", "Horse Racing Track", "Inner Sanctum", "Temples"],
    temples: "All", notes: "The only place in the southern kingdom where the Guilds have settled.",
  },
  {
    name: "The Outpost", questDice: "1d12", colour: "Yellow", eventOn: [9, 12], innCost: 25,
    services: ["Blacksmith", "General Store"], temples: null,
    notes: "Toll: 100c/hero plus League membership required before heading to an Ancient Lands (yellow) quest site.",
  },
  {
    name: "Whiteport", questDice: "1d6", colour: "Black", eventOn: [9, 12], innCost: 15,
    services: ["Alberta's Magnificent Animals", "General Store", "Inn", "Temples"], temples: "Rhidnir, Iphy, Ohlnir, Metheia",
    notes: "Gambling opportunities at the inn.",
  },
  {
    name: "Windfair", questDice: "1d6", colour: "Blue", eventOn: [11, 12], innCost: 35,
    services: ["Blacksmith", "General Store", "Scryer", "Temples"], temples: "Ohlnir, Charus",
  },
];

// Settlement Events (1d12) — full table from the Settlements chapter.
// `resolve` marks events with a spelled-out follow-up roll the app can auto-apply.
// Side Quests (1d6) — just the names; roll tells you which one, look up the details
// in the Quest Book.
const SIDE_QUESTS = ["The Missing Brother", "Slay the Beast", "The Mapmaker", "Go Fetch!", "Manhunt", "Mushrooms"];

// Pray at Temple (p144-145) — 50c, 1d6 roll, 1-3 succeeds. Effects last "until you leave
// the next dungeon" (temporary) except Charus's, which is worded as a standing bonus
// that just can't be topped up by resting.
const TEMPLE_BOONS = {
  Charus: { kind: "energy", amount: 1, label: "+1 Energy Point (not regained by resting)" },
  Iphy: { kind: "stat", stat: "RES", amount: 5, label: "+5 Resolve" },
  Metheia: { kind: "hp", amount: 1, label: "+1 HP (until next dungeon exit)" },
  Ohlnir: { kind: "choice", options: ["CS", "RS"], amount: 5, label: "+5 CS or RS (your choice)" },
  Rhidnir: { kind: "luck", amount: 1, label: "+1 Luck" },
  Ramos: { kind: "stat", stat: "STR", amount: 5, label: "+5 STR" },
};

// Fortune Teller (p143) — 50c, 1d6.
const FORTUNE_TELLER_TABLE = [
  { roll: 1, text: "Foresees an upcoming battle in such detail that the hero may treat one successful enemy attack as a miss during the next quest." },
  { roll: 2, text: "Talk of gambling fortune: -2 on a gambling dice roll during this stay in the city." },
  { roll: 3, text: "Nothing of any importance." },
  { roll: 4, text: "Nothing of any importance." },
  { roll: 5, text: "Nothing of any importance." },
  { roll: 6, text: "Cursed! The hero will suffer a curse during the next quest (roll on the Curses Table)." },
];

// Gambling (p143) — bet 50-500c, -1 to the roll per Luck Point (without spending them);
// a natural 10 can't be modified.
const GAMBLING_TABLE = [
  { max: 1, mult: 2, extra: 0, label: "Grand slam! Win 2x your bet." },
  { max: 3, mult: 1.5, extra: 0, label: "Win! 1.5x your bet (rounded down)." },
  { max: 9, mult: 0, extra: 0, label: "Lose all bets." },
  { max: 10, mult: 0, extra: 100, label: "Accused of cheating — lose your bet, an extra 100c, and take a beating." },
];

// Horse Racing (p143-144) — 50c entry (counts toward the bet), bet up to 300c total,
// DEX Test to place.
const HORSE_RACE_MULTIPLIERS = {
  1: { first: 3, second: 2.5 }, 2: { first: 2.9, second: 2.4 }, 3: { first: 2.8, second: 2.3 },
  4: { first: 2.7, second: 2.2 }, 5: { first: 2.6, second: 2.1 }, 6: { first: 2.5, second: 2.0 },
  7: { first: 2.4, second: 1.9 }, 8: { first: 2.3, second: 1.8 }, 9: { first: 2.2, second: 1.7 }, 10: { first: 2.1, second: 1.6 },
};
const HORSE_EXTRA_PRIZE = {
  first: [{ max: 2, prize: "Wonderful Treasure" }, { max: 4, prize: "Fine Treasure" }, { max: 10, prize: null }],
  second: [{ max: 1, prize: "Wonderful Treasure" }, { max: 3, prize: "Fine Treasure" }, { max: 10, prize: null }],
};

// Arena Fighting (p139) — modifiers on a CS roll, entry 50-200c. Win/lose consequences
// (payout, XP, HP/Sanity loss) are on p139's "Betting, Odds, and Winning" page.
const ARENA_HP_MOD = (hp) => (hp < 10 ? -5 : hp <= 15 ? 0 : 5);
const ARENA_STR_MOD = (str) => (str < 40 ? -5 : str <= 50 ? 0 : 5);
const ARENA_LEVEL_MOD = { Group: -10, Semi: -15, Final: -20 };
// Betting/Odds/Winning (p139) — entry fee x this multiplier (RDD) on a win, by hero
// level and bracket. Lower-level heroes get better odds, matching Horse Racing's
// underdog-favouring design.
const ARENA_WIN_MULTIPLIER = {
  1: { Group: 2.0, Semi: 2.2, Final: 2.4 }, 2: { Group: 1.9, Semi: 2.1, Final: 2.3 },
  3: { Group: 1.8, Semi: 2.0, Final: 2.2 }, 4: { Group: 1.7, Semi: 1.9, Final: 2.1 },
  5: { Group: 1.6, Semi: 1.8, Final: 2.0 }, 6: { Group: 1.5, Semi: 1.7, Final: 1.9 },
  7: { Group: 1.4, Semi: 1.6, Final: 1.8 }, 8: { Group: 1.3, Semi: 1.5, Final: 1.7 },
  9: { Group: 1.2, Semi: 1.4, Final: 1.6 }, 10: { Group: 1.1, Semi: 1.3, Final: 1.5 },
};
const ARENA_WIN_XP = { Group: 50, Semi: 100, Final: 150 }; // goes to the hero, not the party
const ARENA_LOSE_HP = { Group: 2, Semi: 4, Final: 6 };
const ARENA_FINAL_EXTRA_AWARD = [{ max: 1, prize: "Wonderful Treasure" }, { max: 4, prize: "Fine Treasure" }, { max: 10, prize: null }];

// Banking (p145, Silver City only) — three banks, each covering a different slice of a
// shared 1d20 roll (rolled once per Silver City visit per bank the hero has money in).
const BANKS = ["Chamberlings Reserve", "Smartfall Bank", "The Vault"];
const BANK_KEY_MAP = { "Chamberlings Reserve": "chamberlings", "Smartfall Bank": "smartfall", "The Vault": "vault" };
const BANK_TABLE = [
  { chamberlings: null, smartfall: null, vault: [1, 2], pct: 30 },
  { chamberlings: [1, 4], smartfall: null, vault: [3, 4], pct: 20 },
  { chamberlings: [5, 7], smartfall: [1, 2], vault: [5, 5], pct: 15 },
  { chamberlings: [8, 10], smartfall: [3, 4], vault: [6, 6], pct: 10 },
  { chamberlings: [11, 11], smartfall: [5, 9], vault: [7, 7], pct: 5 },
  { chamberlings: [12, 12], smartfall: [10, 14], vault: [8, 10], pct: 0 },
  { chamberlings: [13, 14], smartfall: [15, 16], vault: [11, 14], pct: -5 },
  { chamberlings: [15, 17], smartfall: [17, 17], vault: [15, 16], pct: -10 },
  { chamberlings: [18, 19], smartfall: null, vault: [17, 17], pct: -20 },
  { chamberlings: null, smartfall: null, vault: [18, 18], pct: -30 },
  { chamberlings: [20, 20], smartfall: [18, 20], vault: [19, 20], pct: "robbed" },
];
// Looks up the profit/loss %% (or "robbed") for a 1d20 roll against one bank's column.
function bankRollResult(bankKey, roll) {
  const row = BANK_TABLE.find((r) => {
    const range = r[bankKey];
    return range && roll >= range[0] && roll <= range[1];
  });
  return row ? row.pct : 0;
}

const SETTLEMENT_EVENTS = [
  { roll: 1, title: "Stray Dog", text: "A stray dog follows the party through the streets. After a small treat from a hero, you now own it. Randomise the kind of dog (Companions' Compendium), or if you already have one, treat as 'Nothing special happens'." },
  { roll: 2, title: "Scrolls Salesman", text: "A man approaches selling magic scrolls. Randomise three available spells. Each scroll costs 100c.", resolve: "scrolls" },
  { roll: 3, title: "Potion Salesman", text: "A man in purple robes sells premium potions. Use the Potions Table with an availability of 4 for every potion regardless of class, and -20c as a price modifier." },
  { roll: 4, title: "Trinket Salesman", text: "An old man sells magic trinkets, 100c each, max 1 per hero. Roll 1d12 per trinket: 1-5 magic, 5-11 useless (cannot be sold), 12 cursed (roll on Curses Table). Decide ring or necklace." },
  { roll: 5, title: "Sale!", text: "A settlement-wide sale — all stores sell items at a 20% discount." },
  { roll: 6, title: "Fresh Stocks", text: "All stores just restocked. All availabilities are modified by +2 (a result of 6 is automatically in stock)." },
  { roll: 7, title: "Settlement Feast", text: "A celebration boosts Party Morale by +2 (temporarily, can exceed max) if you stay the night. On 1d12 of 9-12, no beds are available and the party must continue travel without business (quest reward may still be claimed).", resolve: "feast" },
  { roll: 8, title: "Side Quest", text: "A citizen urgently requests help. Roll on the Side Quest Table and decide whether to add it to the current quest.", resolve: "sidequest" },
  { roll: 9, title: "Shortage of Goods", text: "No trade caravans for weeks. All availabilities modified by -2 (0 = automatically out of stock). Prices up +10%." },
  { roll: 10, title: "Thief", text: "A pickpocket gets too close. 1d100 coins are stolen from the party.", resolve: "thief" },
  { roll: 11, title: "Assassination Attempt", text: "Someone holds a grudge. Randomise one hero attacked by 1d4 bandits (randomise weapons; ranged bandits also carry daggers). Fight on the city tile; heroes are nursed to 1 HP instead of dying. Bandits may be searched afterward.", resolve: "assassination" },
  { roll: 12, title: "Curse!", text: "An old woman curses the party. Roll on the Curses Table once and apply to all heroes until they exit the next dungeon.", resolve: "curse" },
];

// Curses Table (1d10) — Appendix III, referenced by several settlement/magic-item events.
const CURSES_TABLE = [
  { roll: 1, text: "-2 Hit Points", effect: { hp: -2 } },
  { roll: 2, text: "-5 Wisdom", effect: { stat: "WIS", amount: -5 } },
  { roll: 3, text: "-5 Constitution", effect: { stat: "CON", amount: -5 } },
  { roll: 4, text: "-5 Strength", effect: { stat: "STR", amount: -5 } },
  { roll: 5, text: "-5 Dexterity", effect: { stat: "DEX", amount: -5 } },
  { roll: 6, text: "-3 Hit Points", effect: { hp: -3 } },
  { roll: 7, text: "-10 Resolve", effect: { stat: "RES", amount: -10 } },
  { roll: 8, text: "-5 on a Random Skill", effect: "randomSkill" },
  { roll: 9, text: "-1 Luck", effect: { luck: -1 } },
  { roll: 10, text: "-1 Energy", effect: { energy: -1 } },
];

// Available Quests roll (1d6) — quest count by settlement type, per the Settlements chapter.
const QUEST_AVAILABILITY = [
  { roll: [1, 1], settlement: "2 quests", silverCity: "3 quests" },
  { roll: [2, 4], settlement: "1 quest", silverCity: "2 quests" },
  { roll: [5, 5], settlement: "-", silverCity: "1 quest" },
  { roll: [6, 6], settlement: "-", silverCity: "-" },
];

// Settlement activities — Activity Point cost per the Settlements chapter. AP cost of
// 0 with "requires stay at inn" still takes the whole day, it just doesn't cost the point.
// `locations` uses the standardized category names from SETTLEMENTS.services, so the
// Settlement tab can filter this list down to what's actually offered at the current
// settlement. "Any" means it doesn't depend on a specific shop/building.
const SETTLEMENT_ACTIVITIES = [
  { name: "Arena Fighting", where: "Arena", ap: 1, locations: ["Arena"], resolverName: "Arena Fighting" },
  { name: "Banking", where: "Banks", ap: 1, locations: ["Banks"], resolverName: "Banking" },
  { name: "Buy a Dog", where: "Kennel", ap: 1, locations: ["Kennel"], note: "requires the Companions' Expansion — no mechanical effect in this app without it" },
  { name: "Buy a Familiar", where: "Alberta's Magnificent Animals", ap: 1, locations: ["Alberta's Magnificent Animals"], note: "requires the Companions' Expansion — no mechanical effect in this app without it" },
  { name: "Buy or Sell Armour", where: "Blacksmith", ap: 1, locations: ["Blacksmith"] },
  { name: "Buy or Sell Equipment", where: "General Store, The Magic Brewery", ap: 1, locations: ["General Store", "Magic Brewery"] },
  { name: "Buy Ingredients", where: "Herbalist, Alchemists' Guild", ap: 1, locations: ["Herbalist", "Guilds"] },
  { name: "Buy or Sell Weapons", where: "Blacksmith", ap: 1, locations: ["Blacksmith"] },
  { name: "Charge a Magic Item", where: "Wizards' Guild", ap: 1, locations: ["Guilds"] },
  { name: "Collect Quest Reward", where: "Start Settlement of Quest", ap: 0, locations: ["Any"] },
  { name: "Create a Scroll", where: "Inn", ap: 1, note: "per scroll, max 2", locations: ["Inn"] },
  { name: "Cure Disease", where: "Sick Wards or Temple of Metheia", ap: 1, locations: ["Sick Ward", "Temples"] },
  { name: "Cure Poison", where: "Sick Wards", ap: 1, locations: ["Sick Ward"] },
  { name: "Enchant Objects", where: "Inn", ap: 1, note: "max once", locations: ["Inn"] },
  { name: "Gamble", where: "Inn", ap: 0, note: "requires stay at inn", locations: ["Inn"], resolverName: "Gambling" },
  { name: "Guild Business", where: "Guilds", ap: 1, locations: ["Guilds"] },
  { name: "Horse Racing", where: "Horse tracks", ap: 1, locations: ["Horse Racing Track"], resolverName: "Horse Racing" },
  { name: "Identify a Magic Item", where: "Scryer or Wizards' Guild", ap: 1, locations: ["Scryer", "Guilds"] },
  { name: "Identify a Potion", where: "Alchemist Guild, The Magic Brewery, General Store", ap: 1, locations: ["Guilds", "Magic Brewery", "General Store"] },
  { name: "Learn a Prayer", where: "Temple Grounds", ap: 1, locations: ["Temples"] },
  { name: "Learn a Spell", where: "Wizards' Guild", ap: 3, locations: ["Guilds"] },
  { name: "Level Up", where: "Any Settlement", ap: 0, locations: ["Any"] },
  { name: "Pray", where: "Temple", ap: 1, locations: ["Temples"], resolverName: "Pray" },
  { name: "Read your Fortune", where: "Fortune Teller", ap: 1, locations: ["Fortune Teller"], resolverName: "Fortune Teller" },
  { name: "Repair Equipment", where: "Blacksmith", ap: 1, locations: ["Blacksmith"] },
  { name: "Rest and Recuperation", where: "Inn", ap: 0, note: "requires stay at inn", locations: ["Inn"] },
  { name: "Skill Training", where: "Guilds", ap: 1, locations: ["Guilds"] },
  { name: "Tend to those Memories", where: "Inn", ap: 0, note: "requires stay at inn", locations: ["Inn"], resolverName: "Tending to Those Memories" },
  { name: "Treat Mental Conditions", where: "The Asylum", ap: 5, locations: ["Asylum"], resolverName: "Treat Mental Conditions" },
];

// Sell & Repair pricing (Equipment chapter) — only doable in a settlement (Blacksmith,
// per the Available Actions table). The book prints this as a lookup table keyed on
// purchase price (increments of 10) vs. lost durability, but every row is exactly
// price × a fixed multiplier per durability step, so a formula reproduces it exactly
// for any price rather than needing 10c increments: 0 lost=70%, 1=60%, 2=50%, 3=40%,
// 4=30%, 5+ lost (and the repair-per-point cost) =20%.
const SELL_REPAIR_MULTIPLIERS = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2];
function sellValue(price, lostDurability) {
  const mult = SELL_REPAIR_MULTIPLIERS[Math.min(Math.max(lostDurability, 0), 5)];
  return Math.round(price * mult);
}
function repairCostPerPoint(price) {
  return Math.round(price * 0.2);
}

// Weapons table (Equipment Appendix) — Damage, ENC, Class, Special rules, Cost,
// Availability, and Reload (missile weapons only). All weapons have Durability 6
// unless otherwise noted in the book — none of these are noted otherwise.
const WEAPONS = [
  { name: "Dagger", dmg: "1d6", enc: 5, class: 1, special: "Dual Wield +1", cost: 10, avail: 4, reload: null },
  { name: "Rapier", dmg: "1d6+1", enc: 5, class: 1, special: "Fast, Dual Wield +2", cost: 130, avail: 3, reload: null },
  { name: "Javelin", dmg: "1d10", enc: 10, class: 2, special: "Reach, BFO, AP(1)", cost: 100, avail: 4, reload: null },
  { name: "Shortsword", dmg: "1d6+2", enc: 7, class: 2, special: "Dual Wield +2", cost: 70, avail: 4, reload: null },
  { name: "Staff", dmg: "1d8", enc: 5, class: 2, special: "Defensive", cost: 5, avail: 5, reload: null },
  { name: "Battle Hammer", dmg: "1d10", enc: 10, class: 3, special: "Stun, BFO", cost: 100, avail: 4, reload: null },
  { name: "Broadsword", dmg: "1d8+2", enc: 8, class: 3, special: "", cost: 90, avail: 5, reload: null },
  { name: "Battleaxe", dmg: "1d10+1", enc: 10, class: 4, special: "BFO, AP(1)", cost: 100, avail: 4, reload: null },
  { name: "Longsword", dmg: "1d12", enc: 10, class: 4, special: "", cost: 100, avail: 4, reload: null },
  { name: "Morning Star", dmg: "1d8+4", enc: 10, class: 4, special: "Unwieldy, BFO, Stun", cost: 150, avail: 2, reload: null },
  { name: "Flail", dmg: "1d10+4", enc: 20, class: 5, special: "Unwieldy, BFO, Stun", cost: 150, avail: 2, reload: null },
  { name: "Greataxe", dmg: "1d12+2", enc: 20, class: 5, special: "Slow, BFO, AP(2)", cost: 200, avail: 3, reload: null },
  { name: "Greatsword", dmg: "2d6", enc: 20, class: 5, special: "Slow", cost: 200, avail: 3, reload: null },
  { name: "Halberd", dmg: "1d12", enc: 20, class: 5, special: "Reach, AP(1)", cost: 150, avail: 4, reload: null },
  { name: "Warhammer", dmg: "2d6", enc: 20, class: 5, special: "Slow, BFO, Stun", cost: 200, avail: 3, reload: null },
  { name: "Arbalest", dmg: "3d6", enc: 20, class: 6, special: "Requires STR 55, AP(2)", cost: 400, avail: 2, reload: 3 },
  { name: "Crossbow", dmg: "1d10+3", enc: 15, class: 6, special: "AP(1)", cost: 250, avail: 3, reload: 2 },
  { name: "Crossbow Pistol", dmg: "1d8+1", enc: 5, class: 2, special: "Secondary Weapon", cost: 350, avail: 2, reload: 2 },
  { name: "Elven Bow", dmg: "1d10+2", enc: 7, class: 4, special: "AP(1)", cost: 700, avail: 2, reload: 1 },
  { name: "Longbow", dmg: "1d10", enc: 10, class: 4, special: "AP(1)", cost: 100, avail: 4, reload: 1 },
  { name: "Shortbow", dmg: "1d8", enc: 5, class: 6, special: "", cost: 100, avail: 4, reload: 1 },
  { name: "Sling", dmg: "1d6", enc: 1, class: 6, special: "Unlimited Ammo", cost: 40, avail: 4, reload: null },
  { name: "Net", dmg: "-", enc: 2, class: 2, special: "Ensnare, Dual Wield +0", cost: 100, avail: 3, reload: null },
];

// 2H/1H STR requirement per weapon class, from Creating Your Character. Class 5 can
// never be used one-handed; Class 6 (missile weapons) always needs two hands regardless
// of STR — the "2H STR req" for class 6 isn't really a strength gate, just book-keeping.
const WEAPON_CLASS_STR_REQ = {
  1: { twoH: 20, oneH: 20 },
  2: { twoH: 25, oneH: 30 },
  3: { twoH: 30, oneH: 40 },
  4: { twoH: 40, oneH: 50 },
  5: { twoH: 55, oneH: null },
  6: { twoH: 20, oneH: null },
};

// Armour & Shields table (Equipment Appendix) — Def, ENC, which hero.armour location(s)
// it covers, Special rules, Cost, Availability. All default to Durability 6/6 like
// weapons ("all armour and shields have a Durability of 6, unless otherwise noted" —
// none of these are noted otherwise). Pieces that cover more than one location (e.g. a
// Padded Coat covering arms/torso/legs) are the same physical item worn once — if you
// pick one for more than one slot, only count its ENC on one of them.
const ARMOUR_AND_SHIELDS = [
  { name: "Padded Cap", tier: 1, def: 2, enc: 1, covers: ["head"], special: "", cost: 30, avail: 4 },
  { name: "Padded Vest", tier: 1, def: 2, enc: 3, covers: ["torso"], special: "", cost: 60, avail: 4 },
  { name: "Padded Jacket", tier: 1, def: 2, enc: 5, covers: ["arms", "torso"], special: "Stackable", cost: 120, avail: 4 },
  { name: "Padded Pants", tier: 1, def: 2, enc: 4, covers: ["legs"], special: "Stackable", cost: 100, avail: 4 },
  { name: "Padded Coat", tier: 1, def: 2, enc: 6, covers: ["arms", "torso", "legs"], special: "", cost: 200, avail: 3 },
  { name: "Cloak", tier: 1, def: 1, enc: 1, covers: ["torso"], special: "Stackable (back only)", cost: 50, avail: 4 },
  { name: "Leather Cap", tier: 2, def: 3, enc: 1, covers: ["head"], special: "", cost: 50, avail: 4 },
  { name: "Leather Vest", tier: 2, def: 3, enc: 3, covers: ["torso"], special: "", cost: 80, avail: 4 },
  { name: "Leather Jacket", tier: 2, def: 3, enc: 4, covers: ["arms", "torso"], special: "", cost: 140, avail: 4 },
  { name: "Leather Leggings", tier: 2, def: 3, enc: 3, covers: ["legs"], special: "", cost: 120, avail: 4 },
  { name: "Leather Bracers", tier: 2, def: 3, enc: 3, covers: ["arms"], special: "Stackable", cost: 120, avail: 3 },
  { name: "Mail Coif", tier: 3, def: 4, enc: 4, covers: ["head"], special: "Stackable", cost: 200, avail: 3 },
  { name: "Mail Shirt", tier: 3, def: 4, enc: 6, covers: ["torso"], special: "Stackable", cost: 600, avail: 3 },
  { name: "Sleeved Mail Shirt", tier: 3, def: 4, enc: 7, covers: ["arms", "torso"], special: "Stackable", cost: 950, avail: 3 },
  { name: "Mail Coat", tier: 3, def: 4, enc: 8, covers: ["torso", "legs"], special: "Stackable", cost: 750, avail: 3 },
  { name: "Sleeved Mail Coat", tier: 3, def: 4, enc: 10, covers: ["arms", "torso", "legs"], special: "Stackable", cost: 1300, avail: 3 },
  { name: "Mail Leggings", tier: 3, def: 4, enc: 5, covers: ["legs"], special: "Stackable", cost: 200, avail: 2 },
  { name: "Helmet", tier: 4, def: 5, enc: 5, covers: ["head"], special: "Clunky, Stackable", cost: 300, avail: 3 },
  { name: "Breastplate", tier: 4, def: 5, enc: 7, covers: ["torso"], special: "Clunky, Stackable", cost: 700, avail: 3 },
  { name: "Plate Bracers", tier: 4, def: 5, enc: 4, covers: ["arms"], special: "Stackable", cost: 600, avail: 3 },
  { name: "Plate Leggings", tier: 4, def: 5, enc: 6, covers: ["legs"], special: "Clunky, Stackable", cost: 700, avail: 3 },
  { name: "Buckler", tier: 0, def: 4, enc: 4, covers: ["shield"], special: "Class 1", cost: 20, avail: 4 },
  { name: "Heater Shield", tier: 0, def: 6, enc: 10, covers: ["shield"], special: "Class 3", cost: 100, avail: 3 },
  { name: "Tower Shield", tier: 0, def: 8, enc: 15, covers: ["shield"], special: "Class 5, Huge", cost: 200, avail: 2 },
];

// General Equipment (Equipment Appendix) — everything that isn't a weapon or armour:
// alchemy supplies, consumables, jewellery, light sources, tools, and misc gear. Powers
// the backpack "Add from table" picker. ENC uses the item's own carry weight (the number
// before any "/X" quick-slot-stacking notation in the book; "-" becomes 0).
const GENERAL_EQUIPMENT = [
  // Alchemy
  { name: "Alchemist Belt", category: "Alchemy", enc: 0, dur: 6, cost: 300, avail: 3, special: "Stores 6 potions/vials in ready slots" },
  { name: "Alchemist Tool", category: "Alchemy", enc: 5, dur: 6, cost: 200, avail: 3, special: "Needed to harvest parts/ingredients" },
  { name: "Empty Bottle", category: "Alchemy", enc: 0, dur: 1, cost: 10, avail: 5, special: "Needed to mix potions" },
  { name: "Healing Potion", category: "Alchemy", enc: 1, dur: 1, cost: 75, avail: 4, special: "1d4 (weak) / 1d6 (standard, 100c) healing" },
  { name: "Potion of Cure Disease", category: "Alchemy", enc: 1, dur: 1, cost: 125, avail: 3, special: "Removes all effects of disease" },
  { name: "Potion of Cure Disease (Weak)", category: "Alchemy", enc: 1, dur: 1, cost: 90, avail: 3, special: "75% chance to remove disease" },
  { name: "Potion of Cure Poison", category: "Alchemy", enc: 1, dur: 1, cost: 125, avail: 3, special: "Removes all effects of poison" },
  { name: "Potion of Cure Poison (Weak)", category: "Alchemy", enc: 1, dur: 1, cost: 90, avail: 3, special: "75% chance to remove poison" },
  // Consumables
  { name: "Beef Jerky", category: "Consumables", enc: 0, dur: 1, cost: 10, avail: 5, special: "1 AP, heals 1 HP" },
  { name: "Dwarven Ale", category: "Consumables", enc: 2, dur: 1, cost: 100, avail: 2, special: "-10 all tests, +20 RES, rest of quest" },
  { name: "Ration", category: "Consumables", enc: 1, dur: 1, cost: 5, avail: 5, special: "Sustains the party for a day/rest" },
  { name: "Tobacco", category: "Consumables", enc: 0, dur: 0, cost: 50, avail: 4, special: "+10 RES; risk of addiction" },
  // Jewellery
  { name: "Necklace", category: "Jewellery", enc: 0, dur: 0, cost: 150, avail: 4, special: "Can be enchanted" },
  { name: "Religious Relic (Necklace)", category: "Jewellery", enc: 0, dur: 0, cost: 500, avail: 2, special: "Warrior Priest only" },
  { name: "Religious Relic (Ring)", category: "Jewellery", enc: 0, dur: 0, cost: 500, avail: 2, special: "Warrior Priest only" },
  { name: "Ring", category: "Jewellery", enc: 0, dur: 0, cost: 150, avail: 4, special: "Can be enchanted" },
  // Light sources
  { name: "Headlamp", category: "Light", enc: 1, dur: 1, cost: 150, avail: 3, special: "Hands-free lantern" },
  { name: "Lamp Oil", category: "Light", enc: 0, dur: 1, cost: 15, avail: 5, special: "Refills a lantern once" },
  { name: "Lantern (filled)", category: "Light", enc: 1, dur: 1, cost: 100, avail: 4, special: "+5 Fear/Terror, +10 Perception" },
  { name: "Torch", category: "Light", enc: 1, dur: 1, cost: 15, avail: 5, special: "+5 Fear/Terror, +5 Perception, can be swung" },
  // Miscellaneous
  { name: "Bandage (old rags)", category: "Misc", enc: 1, dur: 1, cost: 15, avail: 5, special: "Heals 1d4 HP, 3 uses" },
  { name: "Bandage (linen)", category: "Misc", enc: 1, dur: 1, cost: 25, avail: 4, special: "Heals 1d8 HP" },
  { name: "Bandage (herbal wrap)", category: "Misc", enc: 1, dur: 1, cost: 50, avail: 4, special: "+15 Heal, heals 1d10 HP" },
  { name: "Bed Roll", category: "Misc", enc: 5, dur: 0, cost: 200, avail: 3, special: "Auto-regains all Energy on a short rest" },
  { name: "Combat Harness", category: "Misc", enc: 0, dur: 6, cost: 500, avail: 2, special: "Quick Slots 3 -> 5" },
  { name: "Extended Battle Belt", category: "Misc", enc: 0, dur: 6, cost: 300, avail: 3, special: "Quick Slots 3 -> 4" },
  { name: "Holy Water", category: "Misc", enc: 0, dur: 1, cost: 25, avail: 3, special: "1d3 dmg to undead; dip 5 arrows" },
  { name: "Iron Wedges", category: "Misc", enc: 4, dur: 6, cost: 50, avail: 4, special: "Blocks a door; enough for 2" },
  { name: "Parchment", category: "Misc", enc: 0, dur: 0, cost: 50, avail: 4, special: "Needed to make magic scrolls" },
  { name: "Partial Map", category: "Misc", enc: 0, dur: 0, cost: 75, avail: 4, special: "Look at 2 Exploration Cards" },
  // Tools
  { name: "Armour Repair Kit", category: "Tools", enc: 5, dur: 0, cost: 200, avail: 4, special: "Repairs 1d3 durability per armour piece" },
  { name: "Cooking Gear", category: "Tools", enc: 3, dur: 0, cost: 100, avail: 4, special: "Cooked rations heal +3 HP" },
  { name: "Crowbar", category: "Tools", enc: 10, dur: 6, cost: 55, avail: 3, special: "Breaks doors: 8+DB dmg, Threat +1" },
  { name: "Dwarven Pickaxe", category: "Tools", enc: 8, dur: 6, cost: 225, avail: 2, special: "Lighter, stronger pickaxe" },
  { name: "Fishing Gear", category: "Tools", enc: 3, dur: 0, cost: 40, avail: 5, special: "+5 Foraging" },
  { name: "Lockpicks (5)", category: "Tools", enc: 0, dur: 1, cost: 30, avail: 3, special: "Needed for Pick Locks; 1 destroyed per fail" },
  { name: "Pickaxe", category: "Tools", enc: 10, dur: 0, cost: 175, avail: 3, special: "Removes rubble" },
  { name: "Rope (old)", category: "Tools", enc: 2, dur: 1, cost: 20, avail: 5, special: "1-in-6 chance to break" },
  { name: "Rope", category: "Tools", enc: 2, dur: 1, cost: 50, avail: 4, special: "" },
  { name: "Trap Disarming Kit", category: "Tools", enc: 5, dur: 6, cost: 200, avail: 3, special: "+10 disarming traps" },
  { name: "Whetstone", category: "Tools", enc: 1, dur: 0, cost: 100, avail: 4, special: "Repairs 1d3 CC weapon durability, 3 uses" },
];

const CC_ATTACK_MODS = [
  { label: "Enemy lying down (also loses its to-hit)", value: 30 },
  { label: "Attacking from behind", value: 20 },
  { label: "Height advantage", value: 10 },
  { label: "Enemy has a rapier", value: -5 },
  { label: "Enemy weapon has slow rule", value: 5 },
  { label: "Enemy weapon has BFO rule", value: 5 },
  { label: "Enemy has a staff", value: -5 },
  { label: "Enemy has a shield (no power attack last turn)", value: -5 },
  { label: "Enemy has taken a parry stance", value: -10 },
];

const RANGED_ATTACK_MODS = [
  { label: "Attacking from the back", value: 20 },
  { label: "Height advantage", value: 10 },
  { label: "Large-sized monster", value: 10 },
  { label: "Shooter has aimed at the target", value: 10 },
  { label: "Enemy has a shield (no power attack last turn)", value: -5 },
  { label: "Enemy has taken a parry stance", value: -10 },
];

const AP_ACTIONS = {
  "0 AP": ["Change facing", "Praying"],
  "1 AP": [
    "Move up full M (2nd move that turn is half M, RDD)", "Open a door", "Standard attack", "Defensive stance (dodge/parry)", "Change gear",
    "Shove", "Aim (ranged only, +10 to hit)", "Load/reload ranged weapon", "Stand up", "Pick up dropped weapon",
    "Exchange gear between 2 heroes (1 AP each, both in LOS)", "Cast a quick spell",
    "Apply bandage to another (adjacent)", "Break down a door (+2 threat/attempt, no enemies adjacent)",
  ],
  "2 AP": ["Pick a lock (no enemies adjacent)", "Power attack (+20 CS, no dodge/parry next turn, enemy +10 CS vs you)", "Charge attack (start ≥2 squares away)", "Cast a standard spell", "Search furniture/corpse", "Search a room/corridor (perception)"],
};

const DOOR_TABLE = [
  { roll: "1–6", result: "Open", extra: "—" },
  { roll: "7", result: "Locked", extra: "Pick lock: 0%, Wounds 10" },
  { roll: "8", result: "Locked", extra: "Pick lock: −10%, Wounds 15" },
  { roll: "9", result: "Locked", extra: "Pick lock: −15%, Wounds 20" },
  { roll: "0", result: "Locked", extra: "Pick lock: −20%, Wounds 25" },
];

// Threat Table — rolled on when a Threat roll (1d20) lands at or below the current
// Threat Level. Two versions depending on whether the party is currently in combat.
function findThreatEntry(table, roll) {
  return table.find((e) => (Array.isArray(e.roll) ? roll >= e.roll[0] && roll <= e.roll[1] : e.roll === roll));
}
const THREAT_TABLE_NOT_IN_BATTLE = [
  { roll: [1, 12], title: "Wandering Monster", text: "A wandering monster has appeared.", decrease: -5 },
  { roll: [13, 15], title: "Extra Exploration Card", text: "Add one extra Exploration Card on top of each pile on the table.", decrease: -5 },
  { roll: [16, 17], title: "Rising Danger", text: "The risk of encounters goes up by 10 in all rooms and corridors for the rest of the quest. Cumulative, max 70%.", decrease: -6 },
  { roll: [18, 19], title: "Trap Sprung", text: "A hero has sprung a trap! Randomise which hero — the square they occupy is also the disarm location.", decrease: -7 },
  { roll: [20, 20], title: "Rising Tension", text: "Add +1 to all Scenario die rolls for the remainder of the dungeon. Only happens once.", decrease: -10 },
];
const THREAT_TABLE_IN_COMBAT = [
  { roll: 1, title: "A Disturbance in the Void", text: "Spell Casters may do nothing during the coming turn, not even dodge or parry.", decrease: -2 },
  { roll: 2, title: "Greenish Tint", text: "The enemy gains the Poisonous Special Rule.", decrease: -2 },
  { roll: 3, title: "Forged Under Pressure", text: "One enemy gains +15 CS until dead.", decrease: -3 },
  { roll: [4, 5], title: "Healing", text: "One wounded enemy (highest XP level, or random) heals 1d10 HP.", decrease: -3 },
  { roll: 6, title: "Frenzy", text: "One enemy gains the Frenzy Special Rule until dead.", decrease: -3 },
  { roll: 7, title: "Disarmed!", text: "A random hero drops their weapon — a DEX Test retrieves it (1 action); on a fail they have no weapon, and each further try costs 1 AP.", decrease: -3 },
  { roll: 8, title: "Fearsome!", text: "One enemy gains the Fear Special Rule — no level cap, though Talents that ignore fear still work.", decrease: -4 },
  { roll: 9, title: "Reinforcements", text: "Roll on the Encounter Table and place the result just outside a random door (open or not); it acts last this turn. If the door was previously unopened, it's now unlocked and untrapped.", decrease: -4 },
  { roll: 10, title: "Onwards!", text: "All enemies gain +10 CS until end of battle.", decrease: -6 },
];

const DAMAGE_TYPES = [
  { type: "Fire", effect: "Ignores NA & Armour. 50% chance of auto-damage next turn (roll again, half — round down)." },
  { type: "Frost", effect: "50% chance of stun (lose 1 AP next turn)." },
  { type: "Acid", effect: "Ignores NA. 50% chance of auto-damage next turn (roll again, half — round down)." },
  { type: "Poison", effect: "CON test: fail = CON test each turn for 1d10 turns or lose 1 HP until cured. A 01–05 removes the poison." },
  { type: "Disease", effect: "CON test: fail = STR & CON halved (round down) after the battle, Energy = 0 until cured. Roll CON each rest — cured on 01–05." },
];

const INITIATIVE_TOKENS = [
  "1 hero token per hero/companion, 1 enemy token per enemy",
  "+1 enemy token per named monster",
  "+1 enemy token per large monster",
  "+1 hero token if a hero has Perfect Hearing",
  "+1 hero token for Swift Leader talent",
  "+1 enemy token for Sneaky",
  "+2 enemy tokens if the door was bashed down",
  "+3 enemy tokens if the party was ambushed",
  "Heroes on overwatch do not add a token to the bag",
];

const REST_STEPS = [
  "Arrange heroes on the tile as you see fit",
  "Bar the door (optional)",
  "Lower Threat Level by 5, then make a threat roll and apply the result",
  "Deduct 1 ration of food from the party",
  "Re-arrange gear on each hero if needed, or exchange gear between heroes",
  "Move Wandering Monsters 3 times",
  "Increase Party Morale +2",
  "Increase HP by 1d6 for each character",
  "Roll 1d6 per lost Energy point, regained on 1–3 (a bedroll regains all Energy automatically)",
  "Wizards regain all Mana",
  "Brew potions if you wish",
  "Roll for Ambush",
];

// Opening a Door or Chest (p98) — roll 1d10 (lock check) + 1d6 (trap check) together,
// simultaneously raising Threat +1. On the d10: 1-6 open, 7-10 locked with an increasing
// Pick Lock penalty and door/chest HP for forcing it. "0" on the d10 reads as 10.
const DOOR_LOCK_TABLE = [
  { roll: [1, 6], locked: false, pickMod: 0, hp: 0 },
  { roll: [7, 7], locked: true, pickMod: 0, hp: 10 },
  { roll: [8, 8], locked: true, pickMod: -10, hp: 15 },
  { roll: [9, 9], locked: true, pickMod: -15, hp: 20 },
  { roll: [10, 10], locked: true, pickMod: -20, hp: 25 },
];

// Searching a Tile — 2 AP, Perception test (+10 if 2 heroes search together, +5 more per
// hero beyond that). On a success, roll 1d100 on this table; add +10 to the roll if the
// tile is a corridor.
const SEARCH_TILE_TABLE = [
  { roll: [1, 15], text: "Secret door leading to a small Treasure Chamber. Place a new tile adjacent (re-roll if that spot's in use) and add a door as usual. Once the heroes leave the treasure chamber, the door closes up and the tile can be removed." },
  { roll: [16, 25], text: "A Fine Treasure." },
  { roll: [26, 40], text: "A Mundane Treasure." },
  { roll: [41, 45], text: "A set of levers are intricately hidden in the wall. They may be operated." },
  { roll: [46, 50], text: "4d20 coins." },
  { roll: [51, 90], text: "Nothing." },
  { roll: [91, 100], text: "You've sprung a trap! Draw a trap card." },
];
function searchTileResult(roll) {
  const clamped = Math.min(100, roll);
  return SEARCH_TILE_TABLE.find((r) => clamped >= r.roll[0] && clamped <= r.roll[1]);
}

const LOOT_TABLES = {
  T1: [
    { roll: "1", result: "Weapon used by the enemy (1d4 DUR loss)" },
    { roll: "2", result: "20 c" },
    { roll: "3", result: "10 c" },
    { roll: "4", result: "1 bandage (old rag)" },
    { roll: "5–10", result: "Nothing but scrap" },
  ],
  T2: [
    { roll: "1", result: "A fine treasure" },
    { roll: "2", result: "Mundane treasure" },
    { roll: "3", result: "50 c" },
    { roll: "4", result: "40 c" },
    { roll: "5", result: "20 c" },
    { roll: "6–10", result: "Nothing but scrap" },
  ],
  T3: [
    { roll: "1–2", result: "A fine treasure" },
    { roll: "3–4", result: "100 c" },
    { roll: "5", result: "A mundane treasure" },
    { roll: "6", result: "80 c" },
    { roll: "7", result: "60 c" },
    { roll: "8–10", result: "Nothing but scrap" },
  ],
  T4: [
    { roll: "1", result: "A grimoire with a random spell" },
    { roll: "2–3", result: "1 random scroll" },
    { roll: "4", result: "1d2 potions" },
    { roll: "5", result: "150 c" },
    { roll: "6", result: "100 c" },
    { roll: "7–10", result: "Nothing but scrap" },
  ],
  T5: [
    { roll: "1–2", result: "1 wonderful treasure, 2 fine treasures" },
    { roll: "3–4", result: "2 fine treasures, 1 grimoire with 1 spell" },
    { roll: "5–7", result: "3 fine treasures" },
    { roll: "8–10", result: "500 c" },
  ],
};

// ---------- Quest generator (Generating a Quest reference) ----------
const QUEST_SILVER_CITY = [
  { roll: 1, name: "Preventing a Disaster", book: "I", page: 245 },
  { roll: 2, name: "The Pleasure House", book: "I", page: 249 },
  { roll: 3, name: "Cleansing the Water", book: "I", page: 251 },
  { roll: 4, name: "Closing the Portal", book: "I", page: 255 },
  { roll: 5, name: "Stopping the Necromancer", book: "I", page: 259 },
  { roll: 6, name: "A Hell of a Night", book: "II", page: 65 },
  { roll: 7, name: "A Beast for Every Occasion", book: "II", page: 81 },
  { roll: 8, name: "Tomb Raiders", book: "I", page: 260 },
  { roll: 9, name: "Black Acanthus", book: "II", page: 72 },
  { roll: 10, name: "Not Even in Death Do We Part", book: "II", page: 77 },
];

const QUEST_OUTPOST = [
  { roll: 1, name: "The Pyramid of Xanthu", book: "I", page: 262 },
  { roll: 2, name: "Tomb of the Hierophant", book: "I", page: 264 },
  { roll: 3, name: "Temple of Despair", book: "I", page: 266 },
  { roll: 4, name: "Halls of Amenhotep", book: "I", page: 268 },
  { roll: 5, name: "Crypt of Khaba", book: "I", page: 269 },
];

const QUEST_VILLAGE_A = [
  { roll: 1, name: "Stop the Heretics!", book: "I", page: 242 },
  { roll: 2, name: "The Master Alchemist", book: "I", page: 244 },
  { roll: 3, name: "Rescuing the Prisoners", book: "I", page: 247 },
  { roll: 4, name: "Baptising", book: "I", page: 252 },
  { roll: 5, name: "Returning the Relic", book: "I", page: 253 },
  { roll: 6, name: "Slaying the Fiend", book: "I", page: 254 },
  { roll: 7, name: "Runes to Ruin", book: "II", page: 68 },
  { roll: 8, name: "At the Bat", book: "II", page: 70 },
  { roll: 9, name: "Saving the Nordman", book: "II", page: 88 },
  { roll: 10, name: "Life in Death", book: "II", page: 86 },
  { roll: 11, name: "Retrieving the Family Heirloom", book: "I", page: 257 },
  { roll: 12, name: "Tower of the Troll King (Windfair)", book: "II", page: 84 },
];

const QUEST_VILLAGE_B = [
  { roll: 1, name: "The Lost Prayer", book: "II", page: 55 },
  { roll: 2, name: "A Kingdom Gone", book: "II", page: 58 },
  { roll: 3, name: "The Toad", book: "II", page: 59 },
  { roll: 4, name: "Corsairs (Whiteport)", book: "II", page: 60 },
  { roll: 5, name: "Giant Slayer", book: "II", page: 62 },
  { roll: 6, name: "Rescue Operation", book: "II", page: 90 },
  { roll: 7, name: "By Rose and Anchor", book: "II", page: 91 },
  { roll: 8, name: "And Out Come The Wolves…", book: "II", page: 64 },
  { roll: 9, name: "The Grey Lady", book: "II", page: 67 },
  { roll: 10, name: "The Ghost of a King", book: "II", page: 57 },
  { roll: 11, name: "The Medallion", book: "III", page: 21 },
  { roll: 12, name: "It's just an egg!", book: "III", page: 24 },
];

const QUEST_VILLAGE_C = [
  { roll: 1, name: "A Small Expedition", book: "III", page: 26 },
  { roll: 2, name: "Reclaiming a Mine", book: "III", page: 27 },
  { roll: 3, name: "Samplers", book: "III", page: 28 },
  { roll: 4, name: "The Abomination", book: "III", page: 30 },
  { roll: 5, name: "The Ghoul Hive", book: "III", page: 31 },
  { roll: 6, name: "The Medusa's Lair", book: "III", page: 33 },
  { roll: 7, name: "The Miller (Not in Silver City)", book: "III", page: 35 },
  { roll: 8, name: "Troll Slayer", book: "III", page: 38 },
  { roll: 9, name: "The Fallen Knight", book: "III", page: 40 },
  { roll: 10, name: "Sceptre of the Serpent", book: "III", page: 42 },
  { roll: 11, name: "The Shroom Queen", book: "III", page: 44 },
  { roll: 12, name: "To Kill a Goddess", book: "III", page: 46 },
];

function rollVillageQuest() {
  const col = rollDie(6);
  const table = col <= 2 ? QUEST_VILLAGE_A : col <= 4 ? QUEST_VILLAGE_B : QUEST_VILLAGE_C;
  const tableLabel = col <= 2 ? "1–2 (A)" : col <= 4 ? "3–4 (B)" : "5–6 (C)";
  const row = rollDie(12);
  const entry = table.find((e) => e.roll === row);
  return { steps: [`Column: ${col} → table ${tableLabel}`, `Quest: ${row}`], entry };
}

function rollSilverCityQuest() {
  const d6 = rollDie(6);
  if (d6 <= 3) {
    const v = rollVillageQuest();
    return { steps: [`Where: ${d6} → Village table`, ...v.steps], entry: v.entry };
  }
  const d10 = rollDie(10);
  const entry = QUEST_SILVER_CITY.find((e) => e.roll === d10);
  return { steps: [`Where: ${d6} → Silver City table`, `Quest: ${d10}`], entry };
}

function rollOutpostQuest() {
  let d6 = rollDie(6);
  let rerolled = false;
  while (d6 === 6) {
    d6 = rollDie(6);
    rerolled = true;
  }
  const entry = QUEST_OUTPOST.find((e) => e.roll === d6);
  return { steps: [`Quest: ${d6}${rerolled ? " (after reroll)" : ""}`], entry };
}

// ---------- Compendium data (from official reference pages) ----------
const PRAYERS = [
  { name: "Bringer of Light", lvl: 1, effect: "The light of the gods shines through the priest, causing the undead to waver. Any undead attacking the priest suffers -10 CS." },
  { name: "The Power of Iphy", lvl: 1, effect: "Strengthens resolve — party gets +10 RES on any fear or terror test during the battle. Failed tests may be retaken with this bonus." },
  { name: "Charus, Walk with Us", lvl: 1, effect: "As long as Charus listens, all heroes regain an Energy point on any skill roll of 01-10 instead of the normal 01-05. Only affects Energy." },
  { name: "Metheia's Ward", lvl: 1, effect: "The priest regains 1 lost HP at the start of their activation, for the rest of the battle." },
  { name: "Power of the Gods", lvl: 1, effect: "Diverts divine power to a wizard — as long as active, any hero wizard gains +10 Arcane Arts." },
  { name: "Methia's Balm", lvl: 1, effect: "Heals an adjacent hero (or the priest) for 1d6+1 HP. Prayer ends once resolved." },
  { name: "Litany of Metheia", lvl: 2, effect: "Every hero that passes a RES test at the start of their activation regains 1 HP." },
  { name: "Power of Faith", lvl: 2, effect: "Party gains immunity to fear and treats terror as fear. Scared heroes regain courage if this prayer succeeds." },
  { name: "Smite the Heretics!", lvl: 2, effect: "At the start of each turn, enemies within 4 squares of the priest must pass a RES test or lose 1 HP." },
  { name: "Verse of the Sane", lvl: 2, effect: "The hero targeted regains 1d3 Sanity Points. Once per hero per quest." },
  { name: "Shield of the Gods", lvl: 2, effect: "As long as active, one hero in LOS of the priest gets +2 Natural Armour." },
  { name: "Strengths of Ohlnir", lvl: 3, effect: "All party members gain +1 DMG with close combat weapons." },
  { name: "Warriors of Ramos", lvl: 3, effect: "All party members fight with +10 CS." },
  { name: "Stay Thy Hand!", lvl: 3, effect: "Enemies within 4 squares of the priest must pass a RES test at the start of every turn or lose 1 AP. Not cumulative with other action-loss effects." },
  { name: "Be Gone!", lvl: 3, effect: "Ethereal creatures within 4 squares must pass a RES test at the start of their turn or lose 1d3 HP." },
  { name: "Providence of Metheia", lvl: 3, effect: "While active, all heroes get +10 CON when resisting disease or poison." },
  { name: "We Shalt Not Falter", lvl: 4, effect: "Party gains +5 HP, temporarily above current max. Reverts to normal max after the battle." },
  { name: "God's Champion", lvl: 4, effect: "Priest's CS +20, +2 DMG modifier, but loses an extra Energy point after the battle. If not enough Energy, CON is halved (RDD) until the next short rest or leaving the dungeon." },
];

const SPELLS = [
  { name: "Fake Death", lvl: 1, cv: 7, mana: 8, upkeep: 0, special: "", school: "Necromancy", effect: "Causes the caster to fall to the ground, appearing dead to all around. Enemies will not target the caster for the rest of the battle. The caster may do nothing until the end of the battle." },
  { name: "Flare", lvl: 1, cv: 8, mana: 10, upkeep: 0, special: "Q, MM", school: "Destruction", effect: "A bright flare shoots from the caster’s hand, hissing through the air to strike the target with a large bang. DMG is 1D8." },
  { name: "Gust of Wind", lvl: 1, cv: 12, mana: 8, upkeep: 1, special: "", school: "Alteration", effect: "Suddenly a powerful wind blows through the dungeon, making arrows fly astray. All Missile Weapons now have a -15 modifier to hit if the arrows pass the room the Wizard is in. The wind lasts for Caster level turns. Upkeep is 1 point of Mana." },
  { name: "Hand of Death", lvl: 1, cv: 7, mana: 8, upkeep: 0, special: "Q, T", school: "Necromancy", effect: "This is a close combat spell, where the caster touches the enemy and causes them harm through magical energy. The target loses 1d10 Hit Points, which ignores armour." },
  { name: "Healing Hand", lvl: 1, cv: 6, mana: 12, upkeep: 0, special: "Q, T", school: "Restoration", effect: "The caster lays their hand on a comrade and heals 1d8+2 Hit Points. This can be used on the caster as well." },
  { name: "Light Healing", lvl: 1, cv: 5, mana: 10, upkeep: 0, special: "Q", school: "Restoration", effect: "The caster can heal one hero (including the caster) within 4 squares and in LOS (intervening models do not matter). It heals 1d6 Hit Points." },
  { name: "Protective Shield", lvl: 1, cv: 10, mana: 10, upkeep: 1, special: "", school: "Mysticism", effect: "The caster summons a translucent sphere of blue light around themself or the target (which must be in LOS), protecting it from physical harm. The shield absorbs 1 Point of Damage per Caster level to a maximum of 3. You can cast the spell twice (but not more) on each target, adding together the effect of the spell. The spell lasts the entire battle but costs 1 point of Mana in upkeep per turn." },
  { name: "Slip", lvl: 1, cv: 10, mana: 10, upkeep: 0, special: "", school: "Hex", effect: "Causes the target to slip and fall. The target remains prone until its next activation when it will spend its first action standing up." },
  { name: "Blur", lvl: 2, cv: 15, mana: 10, upkeep: 1, special: "", school: "Illusion", effect: "May target self or hero in LOS. Target becomes blurry and any attacks against the target are at -15. The effect lasts for 1d4 turns." },
  { name: "Fist of Iron", lvl: 2, cv: 8, mana: 14, upkeep: 0, special: "", school: "Destruction", effect: "The target is struck from above by a powerful blow, causing 2d6+Caster Level points of DMG. Armour and NA protects as normal. Target must be in LOS." },
  { name: "Magic Scribbles", lvl: 2, cv: 20, mana: null, upkeep: 0, special: "I", school: "Enchantment", effect: "This spell is used to create scrolls. As long as the wizard knows the spell they wants to use as the basis for the scroll, and has a good quality parchment, this is quite easy although time consuming." },
  { name: "Open Lock", lvl: 2, cv: 0, mana: 8, upkeep: 0, special: "T", school: "Alteration", effect: "This spell can be used to magically open locked doors or chests. The caster must stand close enough to touch the lock, and the locks hit points are used as the CV of the spell." },
  { name: "Seal Door", lvl: 2, cv: 13, mana: 12, upkeep: 0, special: "", school: "Alteration", effect: "The Spell Caster can magically seal a door. Any monster outside trying to pass through will take 1d3 turns to do so. Doors that have been broken down cannot be sealed. This can be cast on any door, even if there are monsters present. It can only be cast once per door. It can also be used during a rest in a dungeon. See page 98 for rules on this." },
  { name: "Silence", lvl: 2, cv: 10, mana: 12, upkeep: 0, special: "", school: "Hex", effect: "The spell can be cast on an enemy Magic Caster. If the spell is successfully cast, the target must make a RES test when casting a spell. A failure means that the target cannot cast magic that turn, but may otherwise act as normal. Making this test does not cost an AP. If successful, the target may cast the spell as planned and the spell ceases to have any effect." },
  { name: "Strengthen Body", lvl: 2, cv: 10, mana: 8, upkeep: 2, special: "", school: "Mysticism", effect: "Caster may strengthen a hero in LOS by +10 in either STR or CON. The spell lasts for 1d6 turns." },
  { name: "Summon Lesser Demon", lvl: 2, cv: 15, mana: 10, upkeep: 4, special: "", school: "Conjuration", effect: "The caster reaches into the Void and summons a Lesser Plague Demon. Place the demon in a random free square in the room. The demon may act as part of the hero’s next turn. Add one hero initiative token to the bag. It fights for the caster, but also tries to break free on every turn. At the start of each turn, the caster must use 4 Mana as upkeep, and then pass a Resolve Test. If the caster fails, the demon breaks free and escapes back to its own dimension." },
  { name: "Confuse", lvl: 3, cv: 15, mana: 18, upkeep: 0, special: "", school: "Illusion", effect: "If successfully cast at a target in LOS, the target must pass RES or be unable to use that action. If the target fails, it may try again for Action Point number 2. Once it succeeds, the effect of the spell is gone." },
  { name: "Control Undead", lvl: 3, cv: 20, mana: 12, upkeep: 0, special: "", school: "Necromancy", effect: "The caster may try to take control of a lower undead in LOS. If the caster succeeds with the RES+Caster Level test, the wizard may control the Undead until next turn. It still retains its monster activation token and when activated, the wizard may decide its actions. Make another Resolve test every time you activate the creature after the first time. As long as the test succeeds, the caster may control the Undead creature." },
  { name: "Corruption", lvl: 3, cv: 18, mana: 16, upkeep: 1, special: "MM", school: "Necromancy", effect: "A storm of flies soars from the gaping mouth of the caster, surrounding the target. The cloud of flies makes it harder for the enemy to fight by reducing its CS by 10. The spell lasts for 1d3 turns." },
  { name: "Enchant Item", lvl: 3, cv: 25, mana: null, upkeep: 0, special: "I", school: "Enchantment", effect: "This spell can only be cast between quests and requires a powerstone. The power of the stone is then fused with an object such as a weapon, an armour or a piece of jewellery. See chapter on Crafting." },
  { name: "Healing", lvl: 3, cv: 15, mana: 12, upkeep: 0, special: "", school: "Restoration", effect: "The caster may heal a hero (including the caster) within 4 squares and in LOS. The target regains 1d/+2 Hit Points." },
  { name: "Ice Pikes", lvl: 3, cv: 10, mana: 12, upkeep: 0, special: "", school: "Destruction", effect: "A series of razor-sharp Ice spikes shoot from the floor, striking the target from below. It causes 2d6+2 Frost DMG. Target must be in LOS." },
  { name: "Lightning Bolt", lvl: 3, cv: 16, mana: 18, upkeep: 0, special: "MM", school: "Destruction", effect: "A crackling bolt leaps from the hand of the wizard, striking a victim within LOS, dealing 1d10 DMG, ignoring armour. The bolt then jumps to the nearest model (random if equal) and deals 1d8 DMG, ignoring armour. Finally, it makes its last jump, dealing 1d6 DMG, ignoring armour. It always jumps to the nearest model, and never strikes the same model twice. It never jumps more than 3 squares." },
  { name: "Magic Armour", lvl: 3, cv: 15, mana: 15, upkeep: 2, special: "", school: "Mysticism", effect: "The caster may bolster the armour of any target within LOS by +2 for all parts of the body. The spell lasts for Caster Level+2 turns." },
  { name: "Magic Bolt", lvl: 3, cv: 10, mana: 14, upkeep: 0, special: "Q, MM", school: "Destruction", effect: "A bolt of pure energy lashes from the caster to a target within LOS. Target loses 1D10 Hit Points, ignoring any armour." },
  { name: "Slow", lvl: 3, cv: 14, mana: 12, upkeep: 2, special: "", school: "Hex", effect: "A target within LOS of the caster must pass a Resolve test or lose one Action Point. Test again at the start of each enemy turn. The effect lasts until the enemy test succeeds." },
  { name: "Summon Water Elemental", lvl: 3, cv: 18, mana: 15, upkeep: 5, special: "", school: "Conjuration", effect: "The caster summons one of the four Elementals to aid them in the battle. The Elemental fights for Caster Level number of turns. Immediately add one hero initiative token to the bag." },
  { name: "Summon Wind Elemental", lvl: 3, cv: 20, mana: 18, upkeep: 5, special: "", school: "Conjuration", effect: "The caster summons one of the four Elementals to aid them in the battle. The Elemental fights for Caster Level number of turns. Immediately add one hero initiative token to the bag." },
  { name: "Vampiric Touch", lvl: 3, cv: 15, mana: 14, upkeep: 0, special: "T", school: "Necromancy", effect: "Caster causes 1d6+2 DMG with no armour or NA, and the caster may heal by the same amount of HP up to their maximum Hit Points." },
  { name: "Banish Undead", lvl: 4, cv: 20, mana: 20, upkeep: 0, special: "", school: "Necromancy", effect: "This spell only hurts Undead with the Ethereal Rule. A successful spell damages the Undead creature with 2d6." },
  { name: "Bolstered Mind", lvl: 4, cv: 12, mana: 15, upkeep: 0, special: "Q", school: "Mysticism", effect: "The caster infuses all members of the party with magical courage. Each hero gains +10 Resolve and may try to re-roll any failed fear test once. Lasts until end of turn." },
  { name: "Frost Beam", lvl: 4, cv: 16, mana: 15, upkeep: 0, special: "MM", school: "Destruction", effect: "A beam of frost shoots from the hands of the caster towards the target, which must be in LOS. The target takes 2d8+2 Frost DMG." },
  { name: "Hold Creature", lvl: 4, cv: 20, mana: 20, upkeep: 6, special: "Q", school: "Hex", effect: "The wizard holds an enemy in LOS in its place, making it impossible to move or fight. The enemy makes a RES Test at the start of their turn, and if successful, it breaks free and acts as normal. The activation token should be added to the bag as usual, and the enemy tries to act in the normal order of activation." },
  { name: "Ice Tomb", lvl: 4, cv: 20, mana: 25, upkeep: 0, special: "", school: "Destruction", effect: "Caster may trap a target in LOS in ice, forcing it to break free before being able to do anything else. The caster may roll Caster Level d10 to determine how strong the tomb is, and the target does its maximum damage (incl weapon) once per turn until the tomb breaks. It may act with both its actions on the turn the tomb breaks. For every turn, the target takes 1d4 points of Frost DMG." },
  { name: "Transpose", lvl: 4, cv: 15, mana: 25, upkeep: 0, special: "", school: "Alteration", effect: "The caster may shift the place of two heroes that are in LOS. If the spell fails, both heroes suffer 2 Sanity Points for the ordeal. The caster may not transpose themself." },
  { name: "Second Sight", lvl: 4, cv: 15, mana: 25, upkeep: 0, special: "", school: "Divination", effect: "Caster can tell what is on the other side of a door. Place the tile and roll for Encounter before opening a door. The heroes gain 2 initiative tokens if there is an encounter on the other side of the door." },
  { name: "Summon Demon", lvl: 4, cv: 25, mana: 15, upkeep: 0, special: "", school: "Conjuration", effect: "The caster lures a demon from its dimension over to this world. It will randomly be either a Blood Demon or a Plague Demon. The demon is placed in a random place on the same tile as the wizard and fights for the caster. Once summoned, immediately add a hero activation token to the bag and activate the demon just like a hero. However, at the start of the wizard's activation following the summoning, the caster must pass a Resolve Test. If the caster fails, the demon breaks free and escapes back to its own dimension. When it breaks free, it will make a Resolve Test of its own and if it succeeds, it takes part of the caster's mind with it. Deduct 1d3 Sanity Points from the caster. Once in our plane, the demon relishes the fighting, so no upkeep is needed." },
  { name: "Summon Earth Elemental", lvl: 4, cv: 20, mana: 15, upkeep: 5, special: "", school: "Conjuration", effect: "The caster summons one of the four Elementals to aid them in the battle. The Elemental fights for ML number of turns. Immediately add one hero initiative token to the bag." },
  { name: "Summon Fire Elemental", lvl: 4, cv: 25, mana: 15, upkeep: 5, special: "", school: "Conjuration", effect: "The caster summons one of the four Elementals to aid them in the battle. The Elemental fights for Caster level number of turns. Immediately add one hero initiative token to the bag." },
  { name: "Summon Souls", lvl: 4, cv: 12, mana: 15, upkeep: 0, special: "", school: "Necromancy", effect: "This spell conjures a host of restless spirits to torment your enemies. Each enemy on the tile takes 1d4 points of DMG with no armour and NA. Undead enemies are immune." },
  { name: "Weakness", lvl: 4, cv: 18, mana: 18, upkeep: 0, special: "T", school: "Hex", effect: "The caster can choose to lower the Strength or Constitution of a chosen target if the target fails a Resolve Test. If the target fails, it loses its NA armour or DMG bonus for 1d4 turns, depending on what the wizard chooses." },
  { name: "Cause Animosity", lvl: 5, cv: 18, mana: 18, upkeep: 0, special: "", school: "Illusion", effect: "May target any enemy in sight. Target must pass RES or attack the closest enemy during its next activation. Once that activation is over, the effect is gone." },
  { name: "Fire Rain", lvl: 5, cv: 23, mana: 25, upkeep: 0, special: "", school: "Destruction", effect: "A hail of sparks rains down over the target and any adjacent squares. The target takes 1d8+Caster Level Fire DMG and the adjacent squares take 1d4+Caster Level points of Fire DMG." },
  { name: "Fire Wall", lvl: 5, cv: 20, mana: 20, upkeep: 4, special: "", school: "Destruction", effect: "This spell creates a Fire Wall, up to 3 squares long. It may only be placed in a straight line and not in a square that contains an enemy. All except lower Undead and Fire Elementals will avoid or try to walk around. Spell lasts for 1d4+1 turns. Any Lower Undead walking through takes 1d6 Fire DMG. Fire Elementals are immune." },
  { name: "Levitate", lvl: 5, cv: 15, mana: 20, upkeep: 0, special: "", school: "Alteration", effect: "May target self or hero in LOS. Target may levitate for the entire turn. That means the character moves above the ground, not touching any traps or similar. It may be used to leave a pit and to traverse a pit. You cannot levitate through a square that contains a model or lava." },
  { name: "Mirrored Self", lvl: 5, cv: 20, mana: 15, upkeep: 2, special: "Q", school: "Illusion", effect: "The caster makes a copy of themselves, which may be placed anywhere within 4 squares of the caster. Enemies treat this mirrored image as a target just like any other hero, even though it cannot take DMG. The mirrored self cannot move or attack. It lasts for 1d4 turns." },
  { name: "Speed", lvl: 5, cv: 15, mana: 15, upkeep: 0, special: "", school: "Mysticism", effect: "May target self or any friendly character in LOS. Character gains +1M. The spell lasts until a Scenario die roll of 9-10." },
  { name: "Time Freeze", lvl: 5, cv: 20, mana: 30, upkeep: 0, special: "", school: "Divination", effect: "All heroes that have acted may immediately put activation tokens back in the bag. They may act again as if it is a new turn. This spell may only be cast once during a battle." },
  { name: "Fireball", lvl: 6, cv: 32, mana: 30, upkeep: 0, special: "MM", school: "Destruction", effect: "The caster shoots a fireball at a square or an enemy. The target square suffers 3d6+2 Fire Damage. Adjacent squares suffer 2d6 Fire Damage." },
  { name: "Into The Void", lvl: 6, cv: 30, mana: 40, upkeep: 0, special: "", school: "Mysticism", effect: "The caster conjures a large opening in the ground, swallowing any who happens to be standing there. The wizard must have LOS to at least 1 of the squares. The hole covers 4 squares and any model with their entire base inside that range must make a DEX Test or perish. That also means an X-Large creature is not affected by this spell. The party gets the XP for any creatures that perishes. Any furniture or traps in these squares also disappears. The hole then immediately closes up." },
  { name: "Life Force", lvl: 6, cv: 20, mana: 30, upkeep: 0, special: "", school: "Restoration", effect: "This spell restores all of a hero's Hit Points." },
  { name: "Raise Dead", lvl: 6, cv: 25, mana: 15, upkeep: 5, special: "", school: "Necromancy", effect: "The caster may try to raise a defeated Lower Undead or dead human in LOS. Add one hero activation token to the bag immediately. Any Zombie or Skeleton raised retains its stats and equipment. Any raised human gains the stats of a zombie and retains its weapon, but armour is 0." },
  { name: "Summon Greater Demon", lvl: 6, cv: 30, mana: 25, upkeep: 0, special: "", school: "Conjuration", effect: "The caster draws a demon from its dimension to do their bidding. The demon is placed in a random square on the same tile as the wizard and fights for the caster for 1d3 + Caster Level turns. Once in our plane, the demon relishes fighting, so no upkeep is needed. However, making a pact with a Greater Demon comes at a price, no matter how skilled a wizard may be. Deduct 1d6 Sanity Points from the caster." },
  { name: "Teleportation", lvl: 6, cv: 14, mana: 20, upkeep: 0, special: "", school: "Alteration", effect: "The wizard may teleport themselves or one of their companions within LOS up to 4 squares. This is risky business though, and a failed spell costs the target one Sanity Point as they are partly in the void before coming back." },
];


const SPECIAL_RULES = [
  { name: "Acts First", type: "Passive", effect: "Always acts first during the first turn, regardless of tokens." },
  { name: "Afraid of Fire", type: "Passive", effect: "Only causes half DMG (RDD) when fighting a character with a torch." },
  { name: "Bellow", type: "Active", effect: "Any hero within 4 squares is stunned (loses 1 action next turn) unless they pass a RES test." },
  { name: "Camouflage", type: "Active", effect: "Removed from the table when triggered; reappears next turn randomly in a tile with or adjacent to heroes." },
  { name: "Cause Fear X", type: "Passive", effect: "Imparts Fear to heroes of level X and lower. RES test on placement; failure gives -10 CS/RS to attacks against it, -10 Arcane Arts." },
  { name: "Cause Terror X", type: "Passive", effect: "Inflicts Terror on heroes level X and lower (Fear if higher level). RES-20 test; failure = same as fear plus stunned 1 AP." },
  { name: "Corrosive", type: "Passive", effect: "Armour struck loses 1 DUR automatically (even if damage < DEF). Metal weapons striking it lose 1 DUR on an odd damage roll." },
  { name: "Cursed Weapon", type: "Passive", effect: "A wound from this weapon also removes 1 Sanity point." },
  { name: "Demon", type: "Passive", effect: "Magic damage of 10+ forces a RES test; failure sends it back to its realm (killed, not lootable)." },
  { name: "Disciplined", type: "Passive", effect: "May add 1 extra initiative token to the bag." },
  { name: "Disease-Ridden", type: "Passive", effect: "A hero standing adjacent must pass a CON+X test each turn to resist disease." },
  { name: "Entangle", type: "Active", effect: "Captures a hero (dodge/parry to avoid). Trapped hero takes 1 HP dmg turn 1, +1 HP each turn after. Break free: 1 AP + STR test (-10/turn); adjacent ally may help at 2 AP, STR+10." },
  { name: "Ethereal", type: "Passive", effect: "Immune to normal weapons — needs magic, holy water. Moves through heroes freely; cannot be shoved." },
  { name: "Extra Damage from Fire/Water/Silver", type: "Passive", effect: "Takes 1d6 extra HP from any wound caused by fire or water." },
  { name: "Fear Elves", type: "Passive", effect: "Suffers the standard fear modifier vs Elves on a failed RES test." },
  { name: "Ferocious Charge", type: "Passive", effect: "Charge attack causes an extra 1d4 DMG." },
  { name: "Fire Breath", type: "Active", effect: "1d10 fire damage to target (dodgeable, no RS needed); adjacent squares take 1d6 fire dmg. Creature is immune." },
  { name: "Fire/Frost Damage", type: "Passive", effect: "This creature causes fire or frost damage." },
  { name: "Floater", type: "Passive", effect: "Avoids pits/traps, moves over them as solid ground." },
  { name: "Flyer", type: "Passive", effect: "Flies, moves through models/ZOC freely, ignores pits and traps. Flyer (O) can only fly outdoors in skirmish battles." },
  { name: "Frenzy", type: "Passive", effect: "Gains an extra strike whenever it causes damage." },
  { name: "Ghostly Howl", type: "Active", effect: "Ranged Ghostly Touch that hits all heroes at once, no roll needed, can't be dodged/parried." },
  { name: "Ghostly Touch", type: "Passive", effect: "Attacks reach the soul, can't be parried (can be dodged). Armour/NA useless; RES test to avoid 1d8 DMG + 1 Sanity loss." },
  { name: "Gust", type: "Passive", effect: "All creatures in its room/corridor suffer -15 RS." },
  { name: "Hard as Rock", type: "Passive", effect: "Immune to ranged weapons. Bladed weapons do half damage (RDD) unless magic or mithril." },
  { name: "Hate", type: "Passive", effect: "+5 CS, without the usual dodge penalty." },
  { name: "Inspiring", type: "Passive", effect: "Enemies may add 2 initiative tokens (3 if this creature is injured)." },
  { name: "Jump", type: "Active", effect: "Jumps up to 3 squares to closest target, can leap over models. Can be dodged not parried; pushes target back 1 square on hit." },
  { name: "Just Bones", type: "Passive", effect: "Arrows/bolts/sling stones -2 DMG penalty; crushing weapons +2 DMG bonus." },
  { name: "Kick", type: "Passive", effect: "Free attack (no AP) each turn against a hero in any of the 3 squares behind it." },
  { name: "Large / X-Large", type: "Passive", effect: "Rolls damage twice, takes the best. Takes 4 squares (Large) or 2×3 (X-Large). Can't pass single-file squares except bridges." },
  { name: "Leech", type: "Passive", effect: "Sticks to target, who can't move/attack anything else. Drains 1d4 HP/turn; roll for disease each turn attached. Other heroes attacking it deal half damage (avoid hitting companion)." },
  { name: "Magic Being", type: "Passive", effect: "Creation of pure magic — leaves nothing to loot when destroyed." },
  { name: "Magic User", type: "Passive", effect: "Can cast spells listed on the Encounter Table; uses RS to determine success." },
  { name: "Master of the Dead", type: "Active", effect: "One undead regains full health (even from 0); otherwise a Vampire regains 1d6 HP; otherwise makes a standard attack." },
  { name: "Multiple Attacks Hydra", type: "Passive", effect: "5 heads, each can attack a separate target within 4 squares of the body." },
  { name: "Multiple Attacks X", type: "Passive", effect: "Strikes X times on a standard attack (roll to hit/DMG separately); still only 1 AP." },
  { name: "Pack Member", type: "Passive", effect: "If more than half of its faction on the table are killed or flee, it flees on a failed RES test." },
  { name: "Packleader", type: "Passive", effect: "While alive, all creatures from the same faction gain +30 RES." },
  { name: "Perfect Hearing", type: "Passive", effect: "Adds 1 monster initiative token during the first turn of battle." },
  { name: "Petrify", type: "Active", effect: "1 random adjacent hero must pass a RES test or be petrified for 1d6 turns (untargeted while other heroes live; can't act)." },
  { name: "Poisonous", type: "Passive", effect: "A wounded hero must pass a CON test or suffer poison." },
  { name: "Poisonous Spit", type: "Active", effect: "Ranged version of Poisonous using RS; adjacent or 1 square away. Parry with shield/dodge as normal." },
  { name: "Psychic", type: "Passive", effect: "All heroes' RES -20 as soon as placed on the table; ends when it dies. Not cumulative with a second Psychic creature." },
  { name: "Regeneration", type: "Passive", effect: "Regenerates 1d6 HP at the start of every turn." },
  { name: "Rend", type: "Passive", effect: "If it seizes a target in its jaws and the hero fails a STR test, roll another 1d6 DMG." },
  { name: "Riddle Master", type: "Passive", effect: "Answer 1 riddle (WIS test) to remove it from the table without a fight, 150 XP. Failure angers it into battle." },
  { name: "Scurry", type: "Passive", effect: "Ignores ZOC cost moving through a hero's square (pays 1 point); heroes still pay extra moving through its ZOC." },
  { name: "Seduction", type: "Active", effect: "Adjacent hero fails a RES test = incapacitated. Break free with a RES test at start of their turn. Seducer ignores seduced targets while another is available." },
  { name: "Silent", type: "Passive", effect: "Very hard to hear — Perfect Hearing does not help calculate surprise against it." },
  { name: "Simple Weapons", type: "Passive", effect: "Crude weapons (logs, stones) treated as warhammers." },
  { name: "Slow", type: "Passive", effect: "Only 1 move per turn, though it still has 2 AP (second is forfeit if unusable)." },
  { name: "Sneaky", type: "Passive", effect: "May add 1 extra monster initiative token to the bag while on the table." },
  { name: "Spore Bombs", type: "Passive", effect: "Ranged area attack, 1d6 DMG to target (ignores Armour/NA), 1d4 to adjacent non-fungoid characters; all hit must pass a CON test or be stunned." },
  { name: "Spores", type: "Passive", effect: "Any hero within 2 squares must pass a RES test for every action, or the action is forfeit." },
  { name: "Stench", type: "Passive", effect: "All close combat attacks against it suffer -10 CS." },
  { name: "Stone Thrower", type: "Passive", effect: "If no hero is in melee with it, always throws a rock (1 AP, RS to hit) at a random party member in LOS: 1d12 + its DB damage." },
  { name: "Stupid", type: "Passive", effect: "Roll 1d6 at the start of its turn — on a 1, does nothing but look around in confusion." },
  { name: "Summoner", type: "Passive", effect: "Each turn not adjacent to a hero, on 1-2 (1d8) rolls the Encounter Table and summons more of itself into a random adjacent room." },
  { name: "Swallow", type: "Active", effect: "Swallows prey whole (dodge to avoid, can't be parried). Hero gets 2 escape attempts (full STR, then half STR) before being swallowed and removed." },
  { name: "Sweeping Strike", type: "Active", effect: "Pushes all heroes in ZOC back 1 square for half damage (RDD) + a DEX test; dodge only, not parry. Failure = fall prone." },
  { name: "Tongue Attack", type: "Active", effect: "Ranged attack 1 hex away; success pulls the target to the square next to the creature, swapping with any model there." },
  { name: "Wall Crawler", type: "Passive", effect: "Can move on walls to bypass heroes, ignoring ZOC (can't end turn there)." },
  { name: "Web", type: "Active", effect: "Casts webs as a special attack — works just like the net weapon." },
];

const TALENTS = [
  { name: "Assassin", type: "Sneaky", effect: "Automatically hits any target from behind with a class 1 or 2 weapon." },
  { name: "Axeman", type: "Combat", effect: "Bloodlust triggers on 1-10 (instead of 1-5) with all axes." },
  { name: "Backstabber", type: "Sneaky", effect: "Ignores enemy armour and NA when attacking from behind." },
  { name: "Bard", type: "Common", effect: "+10 WIS modifier when using instruments." },
  { name: "Blood Magic", type: "Magic", effect: "Wizard spends HP to create Mana — every 2 HP spent grants 5 Mana. Free during the wizard's turn." },
  { name: "Braveheart", type: "Mental", effect: "+10 bonus on Fear and Terror tests." },
  { name: "Bruiser", type: "Combat", effect: "Bloodlust triggers on 1-10 with hammers, flails, staffs, and morning stars." },
  { name: "Cartographer", type: "Common", effect: "Pass a WIS test before entering a dungeon: exploration deck uses 2 fewer cards (1 corridor, 1 room). Max 2 cards removed regardless of heroes with this talent." },
  { name: "Catlike", type: "Physical", effect: "+5 DEX." },
  { name: "Charming", type: "Common", effect: "This hero negotiates all rewards, +5% Reward Bonus on all quests." },
  { name: "Chivalrous", type: "Profession", effect: "Rescue quests trigger a +30 RES bonus from taking the quest until reward or failure." },
  { name: "Confident", type: "Mental", effect: "+5 bonus to RES." },
  { name: "Conjurer", type: "Magic", effect: "+5 Arcane Arts casting Conjuration spells; Mana cost reduced by 5." },
  { name: "Cutpurse", type: "Sneaky", effect: "Once per settlement visit, roll 1d6 to steal a purse: 1-2 gains 1d100 coins, 6 = caught and chased out until the party leaves." },
  { name: "Death Lament", type: "Combat", effect: "Each time reduced to 0 HP, roll 1d6: 1-3 regains 1 HP." },
  { name: "Devoted", type: "Faith", effect: "Extra Energy point usable only for praying." },
  { name: "Disarm", type: "Combat", effect: "Special attack using target's DEX as a negative modifier; success = no damage but enemy drops weapon (DEX test to retrieve)." },
  { name: "Disciplined", type: "Common", effect: "+10 RES; rest of party +5 RES while this hero isn't knocked out. Not cumulative across heroes." },
  { name: "Divinator", type: "Magic", effect: "+5 Arcane Arts casting Divination spells; Mana cost reduced by 5." },
  { name: "Dual Wield", type: "Combat", effect: "Requires DEX 60. Adds +X DMG to hits with an offhand Dual Wield weapon; parrying with two weapons gets +5." },
  { name: "Evaluate", type: "Sneaky", effect: "A successful Barter roll gives +15% instead of +10%." },
  { name: "Expert Mixer", type: "Alchemist", effect: "Throwable damage potions get +1 DMG on every target." },
  { name: "Fast", type: "Physical", effect: "Permanent +1 to Movement." },
  { name: "Fast Reflexes", type: "Magic", effect: "+15 Combat Skill bonus when casting Touch spells." },
  { name: "Fast Reload", type: "Combat", effect: "Bow/sling can reload and shoot in one action per turn. Crossbow reload 1 action, fire next; Arbalest reload 2 actions, fire next." },
  { name: "Fearless", type: "Mental", effect: "Immune to fear (treats terror as fear). Requires Braveheart." },
  { name: "Focused", type: "Magic", effect: "+15 Arcane Arts when focusing." },
  { name: "Gatherer", type: "Alchemist", effect: "+10 Alchemy when searching for ingredients in the wild." },
  { name: "God's Chosen", type: "Faith", effect: "+1 Luck." },
  { name: "Harvester", type: "Alchemist", effect: "+10 Alchemy when harvesting parts." },
  { name: "Hate", type: "Mental", effect: "+5 CS attacking a chosen hated enemy, but -5 parry/dodge when struck by them. Can be taken multiple times for different enemies." },
  { name: "Hunter", type: "Common", effect: "+10 to Foraging." },
  { name: "Keen Eye", type: "Alchemist", effect: "May reroll the ingredient-gathering result; second stands." },
  { name: "Leatherworker", type: "Common", effect: "May craft hide armour using the crafting rules." },
  { name: "Lethal Shot", type: "Combat", effect: "+2 DMG with all ranged weapons." },
  { name: "Lockpicker", type: "Sneaky", effect: "May reroll a failed lockpick attempt." },
  { name: "Lucky", type: "Common", effect: "+1 Luck Point." },
  { name: "Magic Resistance", type: "Racial", effect: "On negative magic, may take a RES test to ignore the effect entirely." },
  { name: "Marksman", type: "Combat", effect: "Bloodlust triggers on 1-10 with all ranged weapons." },
  { name: "Master Cook", type: "Common", effect: "Party gains +2 extra HP when resting with rations. Not cumulative across heroes." },
  { name: "Master Healer", type: "Alchemist", effect: "Brewed healing potions heal +2 HP more than normal." },
  { name: "Mechanical Genius", type: "Sneaky", effect: "+10 when disarming traps." },
  { name: "Messiah", type: "Faith", effect: "All heroes on the priest's tile gain +5 RES." },
  { name: "Mighty Blow", type: "Combat", effect: "+1 bonus on Damage Rolls with melee weapons." },
  { name: "Miner", type: "Common", effect: "May re-roll the STR test when extracting valuables." },
  { name: "Mithril Smith", type: "Common", effect: "Learned in a dwarven settlement (level up, pay 400c) — may forge mithril using the crafting rules." },
  { name: "Mounted Combat", type: "Common", effect: "Allows fighting while mounted on a steed." },
  { name: "Mystic", type: "Magic", effect: "+5 Arcane Arts casting Mysticism spells; Mana cost reduced by 5." },
  { name: "Natural Killer", type: "Racial", effect: "+1d6 Damage attacking from behind." },
  { name: "Natural Leader", type: "Common", effect: "+2 to Party Morale permanently. Not cumulative across heroes." },
  { name: "Natural Swimmers", type: "Racial", effect: "Ignores negative effects of water, moves through it at normal speed." },
  { name: "Necromancer", type: "Magic", effect: "+5 Arcane Arts casting Necromantic spells; Mana cost reduced by 5. Exclusive with Restorer." },
  { name: "Night Vision", type: "Physical", effect: "+10 Perception; not affected by darkness. Only for a newly-created character with this in their species." },
  { name: "Nimble", type: "Sneaky", effect: "May dodge twice per battle instead of once." },
  { name: "Observant", type: "Physical", effect: "Rangers only. -10 to ambush risk during a rest; party starts battles standing even if quest says otherwise; negates surprise/ambush tokens." },
  { name: "Parry Master", type: "Combat", effect: "In Parry Stance, may parry twice with a weapon in one turn." },
  { name: "Pathfinder", type: "Common", effect: "+1 HP for all heroes when resting." },
  { name: "Perfect Hearing", type: "Physical", effect: "+1 hero initiative token on the first round after opening a door and encountering enemies (not if the door was broken down)." },
  { name: "Perfect Shot", type: "Combat", effect: "If a ranged Damage Roll is odd, ignores armour (not NA)." },
  { name: "Perfect Toss", type: "Alchemist", effect: "+10 RS lobbing a potion over the heads of others." },
  { name: "Persistent", type: "Magic", effect: "Permanent +15 Mana." },
  { name: "Pious", type: "Common", effect: "May use relics even without being a Warrior Priest (cannot be taken by one)." },
  { name: "Poisoner", type: "Alchemist", effect: "Poisons created inflict +2 extra HP per turn." },
  { name: "Powerful Missiles", type: "Magic", effect: "Magic Missile spells do +1 Damage." },
  { name: "Powerful Potions", type: "Alchemist", effect: "All basic stat (not M) enhancing potions grant an additional +5." },
  { name: "Prospector", type: "Common", effect: "+20 WIS identifying nodes; if identified by this hero, party may reroll the number of valuables found." },
  { name: "Pure", type: "Faith", effect: "Demons attacking the priest do so at -10 CS." },
  { name: "Quick Fingers", type: "Sneaky", effect: "Picking a lock takes 1 AP instead of 2." },
  { name: "Reliquary", type: "Faith", effect: "May channel 3 relics instead of the standard 2." },
  { name: "Resilient", type: "Physical", effect: "+5 to Constitution." },
  { name: "Resistance to Disease", type: "Physical", effect: "+25 on CON tests to resist disease." },
  { name: "Resistance to Poison", type: "Physical", effect: "+25 on CON tests to resist poison." },
  { name: "Restorer", type: "Magic", effect: "Healing spells heal +2 HP extra. Exclusive with Necromancer." },
  { name: "Ringbearer", type: "Common", effect: "May use two magic rings simultaneously instead of one." },
  { name: "Riposte Master", type: "Combat", effect: "Successful weapon parry causes 2 DMG to the enemy, ignoring Armour and NA. Only with class 3 weapons or lower." },
  { name: "Sense for Gold", type: "Sneaky", effect: "-1 on Furniture Table treasure rolls." },
  { name: "Shadow Walker", type: "Sneaky", effect: "Moving, ignores movement restrictions from enemy ZOC." },
  { name: "Sharp-eyed", type: "Sneaky", effect: "+10 bonus on Perception Tests." },
  { name: "Smith", type: "Common", effect: "May craft weapons and armour using the crafting rules." },
  { name: "Sniper", type: "Combat", effect: "Aim action gives +15 instead of +10." },
  { name: "Streetwise", type: "Sneaky", effect: "Rogue only. Every availability roll modified by -1." },
  { name: "Strong", type: "Physical", effect: "+5 to Strength." },
  { name: "Strong Build", type: "Physical", effect: "+2 to Hit Points." },
  { name: "Strong-Minded", type: "Mental", effect: "+1 Sanity Point." },
  { name: "Stupid", type: "Racial", effect: "Half-ogre: roll 1d6 each battle turn; on a 6, inactive for the turn (ignored if frenzied)." },
  { name: "Summoner", type: "Magic", effect: "Creatures summoned stay 2 turns longer than the wizard's CL normally allows." },
  { name: "Survivalist", type: "Common", effect: "Forage 1 ration from any Beast-category monster after a skirmish, on a successful Forage roll." },
  { name: "Sustainer", type: "Magic", effect: "Upkeep for the wizard's spells reduced by 1." },
  { name: "Swift Leader", type: "Common", effect: "Party may always add one initiative token to the bag. Not cumulative across heroes." },
  { name: "Swordsman", type: "Combat", effect: "Bloodlust triggers on 1-10 with all swords." },
  { name: "Tank", type: "Physical", effect: "Ignores the Clunky special rule from heavy armour." },
  { name: "Thrifty", type: "Magic", effect: "Requires 2 less Mana on every spell cast." },
  { name: "Tight Grip", type: "Combat", effect: "+10 STR when calculating usable weapon class." },
  { name: "Tough Mind", type: "Profession", effect: "+2 Sanity Points (raises max Sanity by 2)." },
  { name: "Trapfinder", type: "Sneaky", effect: "+10 PER bonus detecting traps. Cumulative with Sharp-eyed." },
  { name: "Tunnel Fighter", type: "Combat", effect: "+10 CS fighting in a corridor." },
  { name: "Unconventional", type: "Combat", effect: "May use armour one class higher than their profession permits." },
  { name: "Veteran", type: "Common", effect: "May use equipment from a Quick Slot without spending an AP (once per turn)." },
  { name: "Wise", type: "Mental", effect: "May re-roll a failed WIS test." },
];

// Talents with an unconditional, always-on numeric bonus — these auto-apply to the hero
// sheet when added/removed via the Compendium. Every other talent (the majority — things
// like Hate, Fast Reload, Marksman) is situational/conditional and stays a description
// card, since there's no safe generic way to "apply" a combat-only or once-per-battle rule.
const TALENT_EFFECTS = {
  "Catlike": { stat: "DEX", amount: 5, label: "+5 DEX" },
  "Fast": { movement: 1, label: "+1 Movement" },
  "Resilient": { stat: "CON", amount: 5, label: "+5 CON" },
  "Strong": { stat: "STR", amount: 5, label: "+5 STR" },
  "Strong Build": { hp: 2, label: "+2 HP" },
  "God's Chosen": { luck: 1, label: "+1 Luck" },
  "Disciplined": { stat: "RES", amount: 10, label: "+10 RES" },
  "Hunter": { skill: "foraging", amount: 10, label: "+10 Foraging" },
  "Lucky": { luck: 1, label: "+1 Luck" },
  "Night Vision": { skill: "perception", amount: 10, label: "+10 Perception" },
  "Persistent": { mana: 15, label: "+15 Mana" },
  "Confident": { stat: "RES", amount: 5, label: "+5 RES" },
  "Strong-Minded": { sanity: 1, label: "+1 Sanity" },
};

// Adjusts a cur/max pair by `amount` in the given direction. Growing (+1) raises both;
// shrinking (-1) lowers max and clamps cur down to fit, without assuming cur was at max.
function adjustCurMax(cm, amount, sign) {
  if (sign > 0) return { cur: cm.cur + amount, max: cm.max + amount };
  const max = Math.max(0, cm.max - amount);
  return { cur: Math.min(cm.cur, max), max };
}

// Applies (sign=1) or reverses (sign=-1) a generic {stat|skill|hp|mana|sanity|luck|energy
// |movement, amount} effect descriptor to a hero, returning just the patch. Shared by the
// Talents auto-apply feature and the Temporary Effects tracker (Temple boons, Curses).
function applyEffectDelta(hero, eff, sign) {
  if (!eff) return {};
  const patch = {};
  if (eff.stat) patch.stats = { ...hero.stats, [eff.stat]: Math.max(0, (Number(hero.stats[eff.stat]) || 0) + sign * eff.amount) };
  if (eff.skill) patch.skills = { ...hero.skills, [eff.skill]: Math.max(0, (Number(hero.skills[eff.skill]) || 0) + sign * eff.amount) };
  if (eff.hp) patch.hp = adjustCurMax(hero.hp, eff.hp, sign);
  if (eff.mana) patch.mana = adjustCurMax(hero.mana, eff.mana, sign);
  if (eff.sanity) patch.sanity = adjustCurMax(hero.sanity, eff.sanity, sign);
  if (eff.luck) patch.luck = adjustCurMax(hero.luck, eff.luck, sign);
  if (eff.energy) patch.energy = adjustCurMax(hero.energy, eff.energy, sign);
  if (eff.movement) patch.movement = Math.max(0, (hero.movement ?? 4) + sign * eff.movement);
  return patch;
}

// Builds the hero patch for applying (sign=1) or reversing (sign=-1) a talent's effect.
function talentEffectPatch(hero, talentName, sign) {
  return applyEffectDelta(hero, TALENT_EFFECTS[talentName], sign);
}

// Temporary Effects — Temple boons and Curses that last "until the hero next leaves a
// dungeon" (per the Settlements chapter). Tracked on hero.tempEffects so they can be
// seen and cleared in one tap instead of relying on memory. `effect` uses the same shape
// as TALENT_EFFECTS; entries with effect:null are reminder-only (no number to reverse).
function addTempEffect(hero, label, effect) {
  const patch = applyEffectDelta(hero, effect, 1);
  return { ...patch, tempEffects: [...(hero.tempEffects || []), { id: uid(), label, effect }] };
}
function removeTempEffect(hero, effectId) {
  const entry = (hero.tempEffects || []).find((e) => e.id === effectId);
  if (!entry) return {};
  const patch = entry.effect ? applyEffectDelta(hero, entry.effect, -1) : {};
  return { ...patch, tempEffects: hero.tempEffects.filter((e) => e.id !== effectId) };
}
function clearAllTempEffects(hero) {
  let patch = {};
  let cur = hero;
  (hero.tempEffects || []).forEach((entry) => {
    if (entry.effect) {
      const p = applyEffectDelta(cur, entry.effect, -1);
      patch = { ...patch, ...p };
      cur = { ...cur, ...p };
    }
  });
  patch.tempEffects = [];
  return patch;
}

const PERKS = [
  { name: "Battle Fury", type: "Combat", effect: "May perform 2 Power Attacks in one turn as if they only cost 1 AP each." },
  { name: "Call to Action", type: "Leader", effect: "When activating this hero, once 2 AP spent, take a hero token from the bag and activate another hero within LOS." },
  { name: "Careful Touch", type: "Alchemist", effect: "Chance of an Exquisite ingredient/part increased to 20. Declare before harvesting or gathering." },
  { name: "Challenge", type: "Profession", effect: "A knight may issue a challenge to an enemy within 4 squares — +10 CS attacking it, and it will always try to attack the knight back." },
  { name: "Clever Fingers", type: "Sneaky", effect: "+25 bonus to a single pick lock or disarm trap attempt. Use before rolling." },
  { name: "Connoisseur", type: "Alchemist", effect: "+10 bonus to identify a potion brewed by someone else. Energy spent at the same time as the attempt." },
  { name: "Deadly Strike", type: "Combat", effect: "+25 CS to your next attack." },
  { name: "Dispel Master", type: "Arcane", effect: "+20 Arcane Arts when rolling to dispel." },
  { name: "Encouragement", type: "Leader", effect: "+10 on an upcoming Fear or Terror Test. Usable outside normal acting order." },
  { name: "Energy to Mana", type: "Arcane", effect: "Each Energy Point spent grants the wizard 20 Mana." },
  { name: "Fate Forger", type: "Faith", effect: "Spend an Energy Point to force a reroll of the Scenario die, as soon as it's rolled." },
  { name: "Frenzy", type: "Combat", effect: "Barbarians only. Each damaging standard attack grants one more free standard attack, for 2 turns (max 8 attacks total). While frenzied, can only move or attack — no parry, dodge, or potions." },
  { name: "God's Favourite", type: "Faith", effect: "Decrease the Threat Level by 1d6." },
  { name: "Healer", type: "Faith", effect: "+3 HP when applying a bandage. Used with the Healing Skill." },
  { name: "Heroic Force of Will", type: "Common", effect: "+10 to any Skill or Stat for a single check of any kind." },
  { name: "Hide in the Shadows", type: "Sneaky", effect: "No enemy targets this hero if more than 2 squares away when it starts its turn (unless it's adjacent to another enemy)." },
  { name: "Hunter's Eye", type: "Combat", effect: "Shoot two arrows with one Ranged Attack (bow/sling only), same target, roll each separately." },
  { name: "Ignore Wounds", type: "Common", effect: "Gains Natural Armour 2, lasting one battle." },
  { name: "In Tune with the Magic", type: "Arcane", effect: "May Focus before identifying a Magic Item, but risks a miscast (95-00 on 1 Focus action, +5 risk per extra action)." },
  { name: "Inner Power", type: "Arcane", effect: "Magic Missiles do an extra 1d6 Damage. Declared before casting." },
  { name: "Keep Calm and Carry On!", type: "Leader", effect: "Increase Party Morale by +2 (cannot exceed starting morale)." },
  { name: "Living on Nothing", type: "Sneaky", effect: "Spending an Energy Point counts as consuming a ration. Can't regain that Energy in the same rest." },
  { name: "Loot Goblin", type: "Sneaky", effect: "May reroll a gold amount once; decide after the first roll." },
  { name: "Lucky Git", type: "Sneaky", effect: "Reduce the Threat Level by 2." },
  { name: "My Will Be Done", type: "Faith", effect: "+10 RES, lasting until the end of the next battle." },
  { name: "Perfect Aim", type: "Combat", effect: "+25 RS on your next Ranged Attack." },
  { name: "Perfect Healer", type: "Alchemist", effect: "Your next mixed Healing Potion heals +3 HP. Used when the potion is mixed." },
  { name: "Pitcher", type: "Alchemist", effect: "+10 RS on your next potion throw. One potion, declared before throwing." },
  { name: "Powerful Blow", type: "Combat", effect: "+1d6 extra damage. Declared before the attack." },
  { name: "Precise Mixing", type: "Alchemist", effect: "May reroll the potion-creation result; second stands. Energy spent after the first roll." },
  { name: "Quick Dodge", type: "Sneaky", effect: "May dodge even if the normal dodge has already been used." },
  { name: "Quick Focus", type: "Arcane", effect: "+10 Arcane Arts without spending an action on focus (used with casting, lasts that spell). Miscast risk still +5." },
  { name: "Rally", type: "Leader", effect: "A hero that failed a Fear or Terror Test may immediately retake it. Usable outside normal order." },
  { name: "Shapeshifter", type: "Profession", effect: "Druid-exclusive; detailed in the Druid chapter." },
  { name: "Shield Bash", type: "Combat", effect: "Push an enemy of the same size or smaller 1 square with CS. Target must pass a DEX Test or fall prone. Requires a Heater or Tower shield; Flyers immune." },
  { name: "Shield Wall", type: "Combat", effect: "May parry twice in one turn while in Parry Stance. Usable when attacked." },
  { name: "Sixth Sense", type: "Common", effect: "+20 to a dodge result when attacked, or +20 to a Perception Test avoiding a triggered trap." },
  { name: "Sprint", type: "Common", effect: "Spend 1 Energy to move up to 6 squares on the first move; second move still at half." },
  { name: "Strike to Injure", type: "Sneaky", effect: "Ignores the enemy's armour for all attacks this turn. Declared before attacking." },
  { name: "Stunning Strike", type: "Combat", effect: "Standard Attack at -10 CS; on success, target performs no actions next turn. Melee only, no effect on Large/X-Large." },
  { name: "Surgeon", type: "Alchemist", effect: "Doubles parts harvested from up to 3 enemies. Only works on one enemy per Energy Point spent." },
  { name: "Taste for Blood", type: "Common", effect: "Bloodlust triggers on a To-Hit roll of 01-10 instead of 01-05, for the entire battle. Used before the Damage Roll." },
  { name: "Taunt", type: "Common", effect: "Forces an enemy not locked in melee to attack this hero, ignoring normal targeting. Chosen before rolling." },
];

// Returns a hero's attached Talents/Perks of type "Combat", for the Combat tab's quick
// reference panel — so players don't have to flip back to the hero sheet mid-fight.
function combatTalentsAndPerks(hero) {
  const items = [];
  (hero.talents || []).forEach((name) => {
    const t = TALENTS.find((x) => x.name === name);
    if (t && t.type === "Combat") items.push({ source: "Talent", name: t.name, effect: t.effect });
  });
  (hero.perks || []).forEach((name) => {
    const p = PERKS.find((x) => x.name === name);
    if (p && p.type === "Combat") items.push({ source: "Perk", name: p.name, effect: p.effect });
  });
  return items;
}

// ---------- Compendium (searchable Talents/Perks/Prayers/Spells/Special Rules) ----------
function CompendiumList({ items, showLevel, showType, onAdd, addedNames }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q) || i.effect.toLowerCase().includes(q)) : items;
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="w-full text-sm rounded px-3 py-2 mb-3"
        style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
      />
      <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
      <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
        {filtered.map((item) => {
          const already = addedNames && addedNames.includes(item.name);
          return (
            <div key={item.name} className="rounded p-2.5" style={{ background: "#00000008" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{item.name}</span>
                  {showLevel && item.lvl != null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: palette.gold, color: palette.charcoal, fontFamily: "JetBrains Mono, monospace" }}>Lvl {item.lvl}</span>
                  )}
                  {showType && item.type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{item.type}</span>
                  )}
                  {item.school && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#5B6FA8", color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{item.school}</span>
                  )}
                  {TALENT_EFFECTS[item.name] && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: palette.gold, color: palette.charcoal, fontFamily: "JetBrains Mono, monospace" }}>
                      Auto: {TALENT_EFFECTS[item.name].label}
                    </span>
                  )}
                </div>
                {onAdd && (
                  <button
                    onClick={() => onAdd(item.name)}
                    disabled={already}
                    className="shrink-0 text-xs px-2 py-1 rounded font-semibold"
                    style={{ background: already ? "#00000020" : palette.crimson, color: already ? palette.inkSoft : palette.parchment }}
                  >
                    {already ? "Added" : "+ Add"}
                  </button>
                )}
              </div>
              {(item.cv != null || item.mana != null) && (
                <div className="text-xs mt-0.5" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                  {item.cv != null ? `CV ${item.cv}` : ""}{item.mana != null ? ` · Mana ${item.mana}` : ""}{item.upkeep ? ` · Upkeep ${item.upkeep}/turn` : ""}{item.special ? ` · ${item.special}` : ""}
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>{item.effect}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompendiumTab({ heroes, updateHero, addLog }) {
  const [cat, setCat] = useState("talents");
  const [heroPick, setHeroPick] = useState("");
  const cats = [
    ["talents", "Talents", TALENTS, true, false, "talents"],
    ["perks", "Perks", PERKS, false, true, "perks"],
    ["prayers", "Prayers", PRAYERS, true, false, "prayers"],
    ["spells", "Spells", SPELLS, true, true, "spells"],
    ["rules", "Special Rules", SPECIAL_RULES, false, true, "specialRules"],
  ];
  const [, , items, showLevel, showType, field] = cats.find((c) => c[0] === cat);
  const pickedHero = heroes.find((h) => h.id === heroPick);

  const addToHero = (name) => {
    if (!pickedHero || !field) return;
    const list = pickedHero[field] || [];
    if (list.includes(name)) return;
    const effectPatch = field === "talents" ? talentEffectPatch(pickedHero, name, 1) : {};
    updateHero({ ...pickedHero, [field]: [...list, name], ...effectPatch });
    const eff = field === "talents" ? TALENT_EFFECTS[name] : null;
    if (eff && addLog) addLog(`${pickedHero.name}: gained Talent "${name}" (${eff.label}, applied automatically).`);
  };

  return (
    <div>
      <Panel className="mb-4">
        <div className="flex flex-wrap gap-1.5">
          {cats.map(([key, l]) => (
            <button
              key={key}
              onClick={() => setCat(key)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ background: cat === key ? palette.crimson : "#00000010", color: cat === key ? palette.parchment : palette.ink, fontFamily: "Crimson Pro, serif" }}
            >
              {l}
            </button>
          ))}
        </div>
      </Panel>

      {heroes.length > 0 && (
        <Panel className="mb-4">
          <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
            Attach to hero
            <select
              value={heroPick}
              onChange={(e) => setHeroPick(e.target.value)}
              className="w-full text-sm rounded px-2 py-1.5 mt-1"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              <option value="">Choose a hero…</option>
              {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
          {(cat === "spells" || cat === "prayers") && (
            <p className="text-xs mt-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
              Added {cat} can be cast from the Combat tab once attached here.
            </p>
          )}
        </Panel>
      )}

      <Panel>
        <CompendiumList
          items={items}
          showLevel={showLevel}
          showType={showType}
          onAdd={pickedHero ? addToHero : null}
          addedNames={pickedHero ? pickedHero[field] : []}
        />
      </Panel>
    </div>
  );
}

// ---------- Footer ----------
function BuyMeACoffeeButton() {
  // BMC's JS widget (button.prod.min.js) calls document.write() internally, which
  // browsers block for scripts injected after the page has loaded — exactly what
  // happens in a React app. Their static button avoids that entirely: it's just a
  // link + image, same destination, no script.
  return (
    <a href="https://www.buymeacoffee.com/mrlewk" target="_blank" rel="noopener noreferrer">
      <img
        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
        alt="Buy Me A Coffee"
        style={{ height: 48, width: "auto" }}
      />
    </a>
  );
}

// ---------- Changelog ----------
const CHANGELOG_DATA = [
  {
    version: "1.28.2",
    date: "2026-08-09",
    sections: {
      "Changed": [
        "Cleaned up wording on the last two changelog entries, which had drifted back into describing the research process ('source photo', 'last time') instead of just the app change",
      ],
    },
  },
  {
    version: "1.28.1",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "Revenge (Minotaur, #16)'s reward XP is now confirmed at 1000 XP — a known typo in the v1.2 rulebook update had cut this line off; an earlier printing had it intact",
      ],
    },
  },
  {
    version: "1.28.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "All 20 Backgrounds now have their real Personal Quest/Trait text, XP rewards, and mechanical effects, replacing the flavour-only name list — this covers a huge range of mechanics: one-time XP quests (Wanderlust, Fables, A New Home...), starting conditions that can only be cured by a specific in-fiction feat (The Well's Claustrophobia, Arachnophobia), a branching multi-outcome quest (The Lost Brother), repeatable kill-counters (both Revenge backgrounds, Sworn Enemy), item rewards (The Heirloom's sword, Proving Your Worth's armour), and permanent stat/party effects that apply automatically when picked (Bad Tempered's Morale/Sanity trade-off, The Fraud's starting penalties, The Noble's starting coins)",
        "Each hero's card shows their background's full text plus whatever action fits it — a one-tap XP claim, an item claim, a counter with a claim threshold, or a branch picker for The Lost Brother. Complex multi-session quests are self-reported (you confirm when the in-fiction condition is met) rather than simulated, since several need dungeon-start dice rolls the app has no hooks for yet",
        "Max Sanity now factors in a background's bonus (Bad Tempered's +2) alongside the existing mental-condition penalty, consistently everywhere Sanity max gets recalculated",
      ],
      "Notes": [
        "Revenge (Minotaur, #16)'s reward XP wasn't known yet — defaulted to 250 to match the other Revenge background, worth confirming against the book",
      ],
    },
  },
  {
    version: "1.27.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "A successful roll in Resolve an Activity now automatically logs the matching Activity Points to the Activities panel above — no more separate manual 'Log Activity' click needed for Pray, Fortune Teller, Gambling, Horse Racing, Arena Fighting, Tending to Those Memories, Treat Mental Conditions, or Banking. Only logs on an actual attempt (affordability/precondition checks still block first, same as before) — a bad roll still logs the time spent, since the activity happened either way, just the outcome was unlucky",
      ],
    },
  },
  {
    version: "1.26.2",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "The Settlement tab had two separate mechanisms with no link between them — Activities (a log of AP/time spent) and Resolve an Activity (where dice actually get rolled and effects applied) — with no indication that picking, say, Treat Mental Conditions or Pray in the Activities list wouldn't actually do anything mechanical. Picking an activity that has a real dice-roll counterpart now shows a button that jumps straight to it in Resolve an Activity, pre-selected. The two lists also used different names for the same thing (Gamble/Gambling, Read your Fortune/Fortune Teller, Tend to those Memories/Tending to Those Memories) which made it harder to notice the connection even if you were looking for it",
      ],
    },
  },
  {
    version: "1.26.1",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "Diagnosing a mental condition was only capping current Sanity down if needed, instead of actually resetting it — the book says Sanity 'will go back up to 8 minus the number of current conditions,' so it now genuinely resets to that new value rather than staying at 0",
      ],
      "Added": [
        "Every diagnosed mental condition on a hero's card now shows its full rule text as a reminder, not just conditions with an extra rolled detail (which enemy, which faction, which trigger) — so it's clear what each one actually does at a glance",
        "Clarified that Settlement Activity Points (used for things like Treat Mental Conditions, 5 of them) are a completely separate pool from a hero's combat Action Points on the Turn tab — they share the 'AP' abbreviation in the book, which reads as a bug but is actually two unrelated resources",
      ],
    },
  },
  {
    version: "1.26.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Mental Conditions — when a hero's Sanity hits 0, a 'Roll a Mental Condition' button appears on their card. Rolls the real 1d10 table (Hate, Acute Stress, Lingering Trauma, Fear of the Dark, Arachnophobia, Jumpy, Irrational Fear, Claustrophobia, Depression), re-rolling on a duplicate diagnosis. Conditions with a clean stat/energy effect (Fear of the Dark and Acute Stress: -10 RES, Depression: -2 Energy) apply automatically; the rest are tracked with a reminder of their effect since they're situational rather than a number to change",
        "Diagnosing Hate asks which enemy the hero last fought; Lingering Trauma and Irrational Fear roll their own sub-tables automatically (the trigger situation, and the feared monster faction)",
        "Max Sanity now correctly follows the rule '8 minus current condition count' instead of a flat 8 — gets tighter with each diagnosis, and loosens back up as conditions are cured",
        "Treat Mental Conditions (Settlement tab) now actually treats a specific diagnosed condition — picks which one if a hero has more than one, and on a success (1-5 on 1d6, 1000c) reverses its effect and recalculates max Sanity, instead of operating on the generic conditions list it was using as a placeholder before this table was available",
        "Added the missing 'Miscasting a spell: -1d3 Sanity' trigger to the Sanity event picker",
      ],
    },
  },
  {
    version: "1.25.2",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "Door / Chest Opener's 'not enough AP' message was invisible on the very first attempt — it only rendered inside the results box, which itself only appears after a door has actually been opened. Now shows in its own spot above the button whenever no door has been rolled yet, so the message is never silently swallowed",
      ],
    },
  },
  {
    version: "1.25.1",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "AP wasn't actually being deducted for Door/Chest Opener or Search a Tile actions — both let you keep clicking indefinitely. The Dice tab receives updateHero(id, next) as a two-argument function, but the shared AP-spending helper was calling it with just one merged object, so the hero id never matched and the update silently did nothing. Fixed the one call site — everything AP-related on the Dice tab now actually spends it",
      ],
    },
  },
  {
    version: "1.25.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Search a Tile on the Dice tab — 2 AP, rolls a Perception test (with the group bonus: +10 for 2 heroes searching together, +5 more per hero beyond that) and, on success, rolls the full 1d100 outcome table (secret door to a treasure chamber, fine/mundane treasure, hidden levers, coins, a sprung trap, or nothing), with a toggle to add the +10 corridor modifier",
      ],
    },
  },
  {
    version: "1.24.4",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "Tapping the Q/B badge on a backpack item silently did nothing when the hero didn't have the 2 AP for it, or when Quick Slots were already full — there was no restriction by item type, the feedback just wasn't visible anywhere except the History log. Both cases now show a clear message right where you tapped",
        "Backpack item name was a cramped inline text field competing with Value/ENC/Dur for space — it's now its own full-width line above the stats, matching how the equipped Weapon/Armour sections already work",
      ],
    },
  },
  {
    version: "1.24.3",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Equip button on backpack items — any item matching a real Weapon or Armour table entry gets a small sword icon that equips it directly, preserving its actual current durability instead of resetting to full. Whatever was previously equipped there swaps back into the backpack automatically, so nothing gets lost either direction",
      ],
    },
  },
  {
    version: "1.24.2",
    date: "2026-08-09",
    sections: {
      "Added": [
        "The backpack's 'Add from table…' dropdown now includes Weapons and Armour & Shields as spares — previously it only covered general equipment (potions, tools, consumables, etc.), so the only way to carry a second weapon or a backup shield was typing it in manually. Picking one adds it to the backpack with its price/ENC filled in, without equipping it — the Weapon/Armour pickers above are still what actually equips something",
      ],
    },
  },
  {
    version: "1.24.1",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "Clearing an equipped weapon or armour piece deleted it entirely instead of keeping the item — it now moves into the backpack (with its price looked up automatically if it matches a table entry) so unequipping something doesn't lose it",
      ],
    },
  },
  {
    version: "1.24.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Short Rest on the Turn tab — one button resolves every numeric step: -1 food ration, Threat -5 followed by a threat roll (same Threat Table logic as Start of Turn), Party Morale +2, +1d6 HP per hero, Energy regen (1d6 per missing point, recovered on 1-3 — or fully restored automatically if the hero's carrying a Bed Roll), and full Mana for any caster",
      ],
      "Notes": [
        "Board-state steps from the checklist (arranging heroes, barring the door, moving Wandering Monsters, brewing potions, and the Ambush roll — no data found yet for that one) still need doing by hand; the full checklist stays in Reference",
      ],
    },
  },
  {
    version: "1.23.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Quick Slots on the hero card's Backpack — each item gets a tappable Q/B badge to move it between the backpack and a quick slot (2 AP, blocked if the hero's out of AP or the quick slots are full). Capacity is base 3, raised to 4 or 5 by an owned Extended Battle Belt or Combat Harness",
        "Trade Gear on the Turn tab — move an item from one hero's backpack to another's for 1 AP each (both heroes need the AP or the trade doesn't happen at all)",
      ],
    },
  },
  {
    version: "1.22.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "New Turn tab — Round counter with a 'Next Round' button that resets every hero's AP to 2 (per the QRS: 'All models have 2 AP') and counts down tracked light sources, removing any that go out",
        "Action Points tracker, 2 per hero, with quick -1 AP buttons and a per-hero reset — this is the first place in the app that tracks combat AP at all, separate from Settlement Activity Points",
        "Light Sources tracker — add a torch/lantern with however many turns it has left, and it counts down automatically each round",
        "Initiative Bag — builds the actual hero/enemy token bag (with all the modifiers: named/large monsters, Perfect Hearing, Swift Leader, Sneaky, a bashed door, an ambush) and draws tokens one at a time to build turn order, instead of just listing the rules as reference text",
        "Door / Chest Opener (Dice tab) now actually spends AP from the acting hero — 1 AP to open/force/pry, 2 AP to pick a lock — and blocks the action with a clear message if they're out",
      ],
      "Changed": [
        "The Start of Turn resolver moved from the Party tab to the new Turn tab, since it's step 1 of the Turn Sequence rather than persistent party state",
      ],
    },
  },
  {
    version: "1.21.1",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "Door / Chest Opener buttons (Pick the Lock, Force Open, Use a Crowbar) gave no visible confirmation when tapped — added a colour-coded feedback line after every action, plus a press animation on all the buttons so a tap now visibly registers",
      ],
    },
  },
  {
    version: "1.21.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Start of Turn resolver on the Party tab — rolls the Scenario die (1d10) and, on a 9-10, automatically rolls Threat (1d20) against the current level: a natural 20 lowers Threat -5, a roll above the current level raises it +1, and anything at or below rolls on the matching Threat Table (In Battle / Not in Battle, toggled with one button) and applies the result's Threat change automatically",
      ],
    },
  },
  {
    version: "1.20.1",
    date: "2026-08-09",
    sections: {
      "Changed": [
        "Cleaned up wording throughout the changelog to focus on what changed in the app rather than how it was researched",
      ],
    },
  },
  {
    version: "1.20.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Door / Chest Opener on the Dice tab — one button rolls the lock check (1d10) and trap check (1d6) together and raises Threat +1 automatically. If locked, shows the Pick Lock penalty and HP, with buttons for Pick the Lock (2 AP, no extra Threat, jams on a fumble), Force Open (+2 Threat per attempt, enter your damage roll), and Use a Crowbar (fixed 8+DB damage, +1 Threat) — each tracking the door/chest's remaining HP until it breaks open",
      ],
      "Notes": [
        "Trap resolution itself (drawing a trap card) stays manual — the app doesn't have trap card data, so a trapped result just flags it as a reminder",
        "The lock-pick fumble threshold isn't stated explicitly in the rulebook excerpt this is based on; a natural 00 (100 on d100) is used as the fumble trigger, matching the common convention elsewhere in the system",
      ],
    },
  },
  {
    version: "1.19.0",
    date: "2026-08-08",
    sections: {
      "Added": [
        "Banking added to Resolve an Activity — each hero can hold a separate balance in all three Silver City banks (Chamberlings Reserve, Smartfall Bank, The Vault), with Deposit/Withdraw buttons and a 'Roll It' that runs the 1d20 profit/loss check for the selected bank (each bank has its own slice of the roll range, including a 'Robbed!' result that wipes that bank's balance)",
      ],
      "Notes": [
        "This completes the settlement feature set (settlement services, activities, and events). Remaining roadmap: Start of Turn/Threat Table, the Door/Chest opener, Sanity automation, the Alchemy potion-maker, and Backgrounds mechanical effects",
      ],
    },
  },
  {
    version: "1.18.1",
    date: "2026-08-08",
    sections: {
      "Fixed": [
        "Buy a Dog and Buy a Familiar showed up as normal settlement activities with no indication they need the separate Companions' Expansion — both now note that right in the Activities picker, since this app has no mechanical effect for them without it",
      ],
    },
  },
  {
    version: "1.18.0",
    date: "2026-08-08",
    sections: {
      "Added": [
        "Temporary Effects tracker — Temple boons and Curses now actually apply to the hero (not just a log message), show up in a red 'Temporary Effects (until next dungeon exit)' box on the hero's card, and clear with a single tap per effect or all at once with 'Left dungeon — clear all'",
        "Curse! (the settlement event) now genuinely applies the rolled curse to every hero, matching the book ('apply the curse to all heroes'), instead of leaving it as a manual note",
        "Fortune Teller's roll-1 result ('treat one enemy hit as a miss next quest') is now logged as a reminder in Temporary Effects too, even though there's no stat to reverse",
      ],
      "Changed": [
        "Refactored the Talents auto-apply system (v1.6.0) and the new Temple/Curse effects to share one applyEffectDelta() function, so both work identically and reverse cleanly",
      ],
    },
  },
  {
    version: "1.17.1",
    date: "2026-08-08",
    sections: {
      "Added": [
        "Arena Fighting now resolves the full result, not just win/lose: winning pays out entry fee x a level/bracket multiplier plus XP (50/100/150 for Group/Semi/Final) straight to the hero, a Final win rolls for a bonus treasure, and losing costs HP (2/4/6 by bracket) and 2 Sanity",
        "The entry fee is only charged on the Group round, matching the book ('you pay once to attend all three levels') — rolling Semi or Final afterward for the same attempt assumes it's already paid, while still using the same fee amount as the payout base for that bracket's multiplier",
      ],
    },
  },
  {
    version: "1.17.0",
    date: "2026-08-08",
    sections: {
      "Added": [
        "Resolve an Activity panel on the Settlement tab — rolls and applies 7 settlement activities that previously had no mechanic behind them: Pray at Temple (all 6 gods' boons, auto-filtered to whichever temples the current settlement actually has), Fortune Teller, Gambling (Luck reduces the roll without spending it, per the rule), Horse Racing (DEX test, level-based payout multiplier, catastrophe-strikes failure), Arena Fighting (CS check with HP/STR/bracket modifiers), Tending to Those Memories (free Sanity + optional paid top-up), and Treat Mental Conditions (cures a listed condition)",
      ],
      "Notes": [
        "Arena Fighting resolves win/lose, but there's no prize-money data for it, so payout amounts are still up to you",
        "Temple/Curse/Feast-style boons that last 'until the next dungeon exit' are applied immediately with a reminder in the result — there's no duration-tracking system yet, so remove them manually when the dungeon ends",
      ],
    },
  },
  {
    version: "1.16.0",
    date: "2026-08-08",
    sections: {
      "Added": [
        "Side Quest table (1d6) wired in — the Settlement Event 'Side Quest' now has a Roll It button that names the actual quest instead of just saying 'roll on the Side Quest Table', and the Roll Available Quests side-quest check names it too when it triggers. Full quest details still live in your own Quest Book — this just automates picking which one",
      ],
    },
  },
  {
    version: "1.15.1",
    date: "2026-08-08",
    sections: {
      "Added": [
        "Detailed Silver City street map added to the Maps section on the Settlement tab — shows named locations (Jarl's Palace, The Market, the guild halls, the Arena, the Temple Grounds, etc.), zoomable like the other two maps",
      ],
    },
  },
  {
    version: "1.15.0",
    date: "2026-08-08",
    sections: {
      "Added": [
        "Real per-settlement data from 'The Settlements of the Southern Part of the Kingdom' (p134-137): actual Inn cost for all 11 settlements (15c-65c, not a flat guess), which auto-fills when you pick a settlement instead of needing to type it in",
        "Each settlement now shows its available Services and which gods' Temples are present, plus settlement-specific notes (Durburim/Birnheim's +2 Durability on locally-made gear, the Outpost's 100c/hero Ancient Lands toll)",
        "The Activities picker now only shows what the current settlement actually offers — no more seeing 'Learn a Spell' at a village with no Wizards' Guild. Guild-based activities (Charge/Identify Magic Item, Learn a Spell, Guild Business, Skill Training) only exist in Silver City, since it's the only settlement with Guilds at all",
      ],
    },
  },
  {
    version: "1.14.1",
    date: "2026-08-08",
    sections: {
      "Fixed": [
        "Inn cost now defaults to 25c (whole party) instead of 0 — still editable per settlement if your table charges differently",
      ],
      "Notes": [
        "Only affects brand-new campaigns — existing saved campaigns keep whatever inn cost they already had (0, most likely), since the app can't tell the difference between 'never touched this' and 'deliberately set to 0'. Update it manually on the Settlement tab if you want the correct default there too",
      ],
    },
  },
  {
    version: "1.14.0",
    date: "2026-08-08",
    sections: {
      "Changed": [
        "Luck is now a proper cur/max stat (like HP, Mana, Energy, Sanity) instead of a bare number. Existing saves migrate automatically — old Luck value becomes both cur and max. Shows as a StatBar alongside the other stats, with the Talents/Level Up bonuses that grant Luck (Lucky, God's Chosen, Halfling's starting Luck, the level-up table) correctly raising the max and refilling the current value",
        "Rest at Inn now actually restores Luck to max, per the Rest and Recuperation rule ('Mana, Luck and energy are automatically restored') — previously left un-refilled because Luck had no max to restore to",
        "Rest at Inn no longer just blocks if the party can't afford it — it now applies the rulebook's actual fallback: sleeping in the stable for free, which gives 1d6 HP (instead of 2d6) and only half (rounded down) of the Mana/Luck/Energy deficit",
      ],
    },
  },
  {
    version: "1.13.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Backpack now has an 'Add from table…' dropdown covering ~35 items from the Equipment Appendix (potions, tools, consumables, jewellery, light sources, misc gear) — picking one adds it with name/value/ENC/durability already filled in. 'Add Custom Item' is still there for anything homebrew or not in the book",
      ],
      "Changed": [
        "Replaced the Backpack Size item-count field with a real Backpack Upgrade picker (Small/Medium/Large). Turns out the QRS doesn't cap backpacks by item count at all — capacity is purely STR-based ENC, and Medium/Large backpacks are what actually raise that threshold (+10/+25 ENC, at a cost of -5/-10 DEX while worn, both applied automatically). The old counter wasn't modelling the real rule, so it's gone rather than kept as a parallel system",
      ],
    },
  },
  {
    version: "1.12.1",
    date: "2026-08-07",
    sections: {
      "Fixed": [
        "No way to remove a weapon or armour piece once picked from the table, short of manually clearing every field — both now have a one-tap Clear button that resets the slot back to blank",
        "Item name was squeezed into a cramped row alongside DEF/ENC/DUR and got clipped on mobile — name is now its own full-width line above the stats, so it's always fully visible",
      ],
    },
  },
  {
    version: "1.12.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Levelling up is now automatic — awarding XP (either via 'Award XP' on the Party tab, or editing a hero's XP directly) checks it against the XP Levelling table and, if it crosses a threshold, applies the level increase, rolls the HP/Luck/Energy gains, and adds the +15 Improvement Points to that hero's pool, all on its own. A big XP award that crosses two thresholds at once correctly levels up twice",
        "A gold toast pops up ('[Hero] leveled up! Now level X — ...') no matter which tab triggered it, since Award XP lives on the Party tab but the level-up itself is about a specific hero",
        "A small gold badge with the Improvement Point count now sits on each hero's button in the Heroes tab whenever they have unspent points, plus a matching dot on the Heroes nav tab itself so it's visible without switching tabs",
      ],
      "Notes": [
        "The manual Level Up button is still there as an override (forces a level regardless of XP, e.g. for house rules) — it's not gated behind the XP threshold, since the automatic path now handles the normal case",
      ],
    },
  },
  {
    version: "1.11.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Creation Points are now interactive: a live 'X CP left' badge above the Stats grid, with +/− buttons under each stat that spend or refund from the 15-point pool and enforce the 10-per-stat cap — matching the Specialisation rule exactly instead of being a passive counter you had to track yourself",
        "Improvement Points spending now has a matching − (refund) button next to each stat/skill, undoing a purchase and restoring both the point and the exact IP cost that was paid for it",
      ],
      "Fixed": [
        "Number inputs starting at 0 couldn't be retyped on mobile without manually selecting and deleting the 0 first — tapping into any number field now auto-selects its content, so the next digit typed just overwrites it, across the whole app",
      ],
    },
  },
  {
    version: "1.10.1",
    date: "2026-08-07",
    sections: {
      "Fixed": [
        "Mana was computed as flat WIS instead of WIS x 1.5 rounded down (the actual Magic chapter formula) — fixed in both places it's set (Roll Starting Stats, and picking a caster profession)",
        "Sanity for brand-new heroes defaulted to 10 instead of the QRS's fixed starting value of 8 (existing saved heroes are untouched — this only affects heroes created from now on)",
        "Elf and Dwarf species notes didn't mention their actual Traits (Perfect Hearing, Night Vision, Hate Goblins) at all; Halfling's note didn't mention Lucky. All four now documented correctly",
      ],
      "Added": [
        "Roll Starting Stats now auto-applies species Traits that map to a clean bonus: Night Vision (Elf, Dwarf) and Perfect Hearing (Elf) are added as Talents with their real effect, and Halfling gets its starting Luck Point set automatically. Hate Goblins (Dwarf) and Jack of All Trades (Human) still need a manual pick from the Compendium, since they require choosing an enemy/category",
        "Picking Warrior Priest as a profession now sets starting Energy to 2 instead of 1, matching the QRS (only if Energy is still at its default, so it won't override a manual edit)",
      ],
    },
  },
  {
    version: "1.10.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Armour picker on the hero card — each location (Head, Arms, Torso, Legs, Shield) now has a 'Pick from table…' dropdown listing the pieces from the Armour & Shields Appendix that actually cover that spot, auto-filling Name/Def/ENC/Durability. A reference line shows Tier, Special rules (Stackable, Clunky, Huge), Cost, Availability, and flags if the piece also covers another location (so ENC only gets counted once)",
        "Armour pieces are now named — they were previously just bare Def/ENC/Dur numbers with nothing identifying what they were",
        "Sell & Repair on the Settlement tab now include named armour alongside weapons and backpack items — selling clears the slot, repairing restores real durability on the hero sheet, same as weapons since v1.9.1",
      ],
    },
  },
  {
    version: "1.9.1",
    date: "2026-08-07",
    sections: {
      "Fixed": [
        "Sell & Repair let you type any price and click Sell repeatedly for infinite coins, since it wasn't tied to anything the party actually owned. Sell now requires picking a real item — a hero's equipped weapon, or a named backpack item — and removes it once sold, so it can't be sold twice",
        "Repair now targets a real damaged weapon and actually restores its durability on the hero sheet, instead of being a disconnected calculator. Backpack items aren't repairable yet since they only store a single durability value, not a current/max pair",
      ],
    },
  },
  {
    version: "1.9.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Update-available toast — since updates have been shipping fast, the app now detects when a new version has been deployed (checked hourly while open, plus on every normal page load) and shows a floating banner with a Reload button, instead of you needing to know to manually refresh",
        "Reloading via that banner automatically opens the changelog afterward, so it's obvious what changed — but only right after an update, not on every ordinary refresh (uses a one-time #log URL hash that gets cleaned up immediately after)",
      ],
      "Changed": [
        "PWA update mode switched from silent auto-update to prompt-based — new versions no longer swap in behind your back mid-session; you control when the reload happens",
      ],
    },
  },
  {
    version: "1.8.1",
    date: "2026-08-07",
    sections: {
      "Fixed": [
        "Armour row on the hero card wrapped DUR onto a second line on narrow phones — each location (Head, Arms, Torso, Legs, Shield) now gets its own sub-header line, with DEF/ENC/DUR fields in a single row underneath that fits within the card width",
      ],
    },
  },
  {
    version: "1.8.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Weapon picker on the hero card — a dropdown of all 23 weapons from the Equipment Appendix (Dagger through Elven Bow) that auto-fills Name, DMG, ENC, and Durability (6/6, the QRS default) instead of typing them in by hand",
        "Once a weapon matching the table is set (picked or typed to match), a reference line shows its Class, Special rules, Cost, Availability, Reload (missile weapons), and the STR needed to wield it — highlighted red if the hero's current STR is under the two-handed minimum",
      ],
    },
  },
  {
    version: "1.7.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Sell & Repair calculator on the Settlement tab — you were right that it's settlement-only per the QRS (\"This may be done when you visit a settlement\"). The book prints it as a lookup table (purchase price vs. lost durability), but every row is exactly price × a fixed percentage per durability step (70/60/50/40/30/20%), so it's a live formula instead: enter a price and it shows sell value or repair cost instantly, with Sell/Repair buttons that move coins in the party pot. Repair is blocked if the party can't afford it, matching the Rest at Inn fix; Sell is blocked below 10c or once an item has lost all its durability, per the rulebook",
      ],
    },
  },
  {
    version: "1.6.1",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Combat Talents & Perks quick-reference panel on the Combat tab (Close Combat, Ranged, and Damage modes) — lists every hero's attached Combat-type Talents and Perks with their effect text, so you don't have to flip back to the hero sheet mid-fight",
      ],
    },
  },
  {
    version: "1.6.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "13 Talents with an unconditional numeric bonus now auto-apply to the hero sheet when added or removed from the Compendium — Catlike (+5 DEX), Fast (+1 Movement), Resilient (+5 CON), Strong (+5 STR), Strong Build (+2 HP), God's Chosen (+1 Luck), Disciplined (+10 RES), Hunter (+10 Foraging), Lucky (+1 Luck), Night Vision (+10 Perception), Persistent (+15 Mana), Confident (+5 RES), Strong-Minded (+1 Sanity). Marked with a gold 'Auto:' badge in both the Compendium browser and on the hero's attached-talents list. Every other talent (the majority — combat/conditional ones like Hate or Marksman) stays a description card, since there's no safe way to auto-apply a once-per-battle or situational rule",
        "Movement is now a tracked field on the hero sheet (starts at 4, per the QRS) instead of not existing at all",
      ],
    },
  },
  {
    version: "1.5.1",
    date: "2026-08-07",
    sections: {
      "Fixed": [
        "Rest at Inn applied the HP/Mana/Energy recovery even when the party couldn't afford the inn cost — it now checks affordability first and blocks the whole action with a clear message if the party is short on coins",
      ],
    },
  },
  {
    version: "1.5.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Level Up now rolls the actual per-level table: +1d2 HP, and +1 Luck / +1 Energy on the levels that grant them (not just the flat +15 Improvement Points) — hero card also shows XP remaining to the next level",
        "Spend Improvement Points directly on a hero's card: tap a stat/skill to raise it, cost shown live (doubles past 70), with the +5/stat-skill and +2/HP per-level caps enforced automatically. Knight/Druid aren't in the official QRS cost table, so they stay manual with a note",
        "Damage Bonus (STR) and Natural Armour (CON) now show as auto-computed badges on the hero stat grid, and the Combat tab's damage calculator has one-tap buttons to fill DB from a hero's STR",
        "Set Starting Morale from RES button on the Party tab — PM = sum of floor(RES/10) across all heroes; the −10 RES threshold note now shows the real computed half-value once set",
      ],
      "Fixed": [
        "Improvement Point note incorrectly said the cost-doubling threshold was 80 — the QRS says 70",
      ],
    },
  },
  {
    version: "1.4.2",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Settlement events that need a follow-up roll now show a 'Roll It' button that resolves it automatically: Thief (steals coins), Settlement Feast (bed check + morale), Scrolls Salesman (3 random spells), Assassination Attempt (bandit count + targeted hero), Curse (rolls the Curses Table)",
        "Reset button on both the Quick Dice and Loot Roller panels — clears recent rolls without switching tabs",
        "Rest at Inn now shows a confirmation summary (HP/Mana/Energy per hero, inn cost paid) so the button doesn't look like it did nothing",
      ],
    },
  },
  {
    version: "1.4.1",
    date: "2026-08-07",
    sections: {
      "Fixed": [
        "Mobile layout — the tab bar now scrolls horizontally as pill buttons instead of wrapping into a tall stack of rows",
        "The Settlement activity picker (hero + activity dropdowns) no longer overflows the screen width on narrow phones — it stacks vertically now, with the location note shown below instead of crammed into the dropdown text",
        "Added a site-wide safeguard so no element can force horizontal page scroll again",
      ],
      "Added": [
        "Maps section on the Settlement tab — The Known World and the Silver City Area, tap to open full-screen with pinch-to-zoom and +/- zoom buttons",
      ],
    },
  },
  {
    version: "1.4.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "New Settlement tab — pick from all 11 settlements (correct quest dice/colour per the QRS), roll the 1d12 settlement-entry event with the full event table, roll available quests (1d6, or 2d20 for Silver City) plus the 1d8 side-quest check",
        "Per-hero Activity Point ledger — the full settlement action list (blacksmith, temple, guilds, etc.) with AP costs, logged per hero with undo and a one-tap ledger reset for a new visit",
        "Rest at Inn — select which heroes stay, rolls 2d6 HP recovery per hero and refills Mana/Energy, with an editable whole-party inn cost that deducts coins",
      ],
      "Notes": [
        "Luck has no tracked maximum in this app, so Inn rest doesn't auto-refill it — adjust manually if your table restores Luck at the inn",
      ],
    },
  },
  {
    version: "1.3.2",
    date: "2026-08-07",
    sections: {
      "Added": [
        "JSON-LD structured data (schema.org WebApplication) for search engines",
        "robots.txt, sitemap.xml, and a canonical URL tag",
        "llms.txt with a plain-text app summary for AI assistants that check for it (an informal, unofficial convention — not a guarantee any given AI reads it)",
        "iOS home-screen app title and web-app-capable meta tags",
      ],
    },
  },
  {
    version: "1.3.1",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Floating install banner — prompts visitors to install the app (with a working Install button on Android/desktop; Share → Add to Home Screen instructions on iOS, since Safari has no install API). Dismissing it is remembered so it won't nag again",
      ],
    },
  },
  {
    version: "1.3.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "The app is now a full PWA — installable to your home screen/desktop with an offline-capable service worker, its own icon, and a proper app name instead of just a browser tab",
        "Favicon added (was missing before) — same icon used across favicon, home-screen icon, and Apple touch icon",
      ],
    },
  },
  {
    version: "1.2.0",
    date: "2026-08-07",
    sections: {
      "Added": [
        "Heroes tab now shows one hero at a time via sub-tabs (name pills, horizontally scrollable), with Add Hero as a fixed + button beside them, instead of stacking every hero's full card in one long scroll",
        "Adding a hero automatically switches to its new tab",
      ],
      "Removed": [
        "The per-hero collapse/expand toggle — redundant now that only one hero is shown at a time",
      ],
    },
  },
  {
    version: "1.1.0",
    date: "2026-08-06",
    sections: {
      "Added": [
        "Class skills now auto-calculate from profession + stats, with a Recalculate button to resync any time",
        "Wizard/Druid starting Mana auto-fills from WIS",
        "Encumbrance shows a red \"eff\" value on every stat/skill when overloaded, and auto-applies the −10 penalty when autofilling the Combat and Stat/Skill Check tools",
        "ENC now tracked on weapons and armour, not just backpack items",
        "Campaign export/import (download a campaign as a file, import it back in) for backup and cross-device restore",
        "In-app changelog viewer",
      ],
      "Fixed": [
        "Hero delete now requires a two-step confirm, matching campaign delete",
        "Buy Me a Coffee button switched to a static link — the old JS widget broke in React apps",
      ],
    },
  },
  {
    version: "1.0.0",
    date: "2026-08-05",
    sections: {
      "Added": [
        "Party tracker: Threat Level, Party Morale, food/coins, Award Experience, session log",
        "Full hero sheets: stats, skills, species (10) with starting-stat rolls, profession (10) including Knight & Druid, Background, Free Skill, Luck, Creation/Improvement Points, Level Up, weapon & armour with durability, Backpack table, Conditions, and Talents/Perks/Spells/Prayers/Special Rules shown as description cards grouped by type",
        "Combat calculator: Close Combat & Ranged to-hit, Damage, Stat/Skill Check, Cast Spell, and Say Prayer",
        "Compendium: 99 Talents, 43 Perks, 18 Prayers, 54 Spells, 64 Special Rules, all searchable",
        "Dice tray, Loot Roller, and a dedicated Quest Generator",
        "Condensed rules Reference tab",
        "Multiple campaigns: save, load, rename, delete, start fresh",
        "Buy Me a Coffee button, copyright footer, MIT license, public README",
      ],
    },
  },
];

function ChangelogModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "#00000088" }} onClick={onClose}>
      <div
        className="w-full sm:max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: palette.parchment, border: `1px solid ${palette.line}`, maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: "Cinzel, serif", color: palette.crimson }} className="text-lg font-bold">Changelog</h2>
          <button onClick={onClose} className="p-1 rounded" style={{ color: palette.inkSoft }}><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {CHANGELOG_DATA.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span style={{ fontFamily: "Cinzel, serif", color: palette.ink }} className="font-bold">v{entry.version}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }} className="text-xs">{entry.date}</span>
              </div>
              {Object.entries(entry.sections).map(([section, items]) => (
                <div key={section} className="mb-2">
                  <div className="text-xs font-bold uppercase mb-0.5" style={{ color: palette.forestDark, fontFamily: "Cinzel, serif" }}>{section}</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {items.map((item) => (
                      <li key={item} className="text-xs" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Install banner (PWA) ----------
const INSTALL_DISMISS_KEY = "lod-install-banner-dismissed";

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
    setIsStandalone(!!standalone);

    const ua = window.navigator.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !window.MSStream);

    (async () => {
      try {
        const res = await window.storage.get(INSTALL_DISMISS_KEY, false);
        setVisible(!(res && res.value === "true"));
      } catch (e) {
        setVisible(true);
      } finally {
        setReady(true);
      }
    })();

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = async () => {
    setVisible(false);
    try {
      await window.storage.set(INSTALL_DISMISS_KEY, "true", false);
    } catch (e) {}
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch (e) {}
    setInstalling(false);
    setDeferredPrompt(null);
    dismiss();
  };

  if (!ready || !visible || isStandalone) return null;
  if (!isIOS && !deferredPrompt) return null; // Android/desktop: wait for the browser's own install signal

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3">
      <div
        className="max-w-md mx-auto rounded-xl p-3 flex items-center gap-3"
        style={{ background: palette.charcoal, border: `1px solid ${palette.gold}`, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
      >
        <div className="shrink-0 rounded-lg p-2" style={{ background: palette.crimsonDark }}>
          <Download size={18} color={palette.parchment} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: palette.parchment, fontFamily: "Cinzel, serif" }}>
            Install LoD Companion
          </p>
          <p className="text-xs" style={{ color: "#B8A78A", fontFamily: "Crimson Pro, serif" }}>
            {isIOS
              ? "Tap the Share icon, then \"Add to Home Screen\"."
              : "Add it to your home screen for quick, full-screen access."}
          </p>
        </div>
        {!isIOS && (
          <button
            onClick={install}
            disabled={installing}
            className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold"
            style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif", opacity: installing ? 0.6 : 1 }}
          >
            {installing ? "…" : "Install"}
          </button>
        )}
        <button onClick={dismiss} className="shrink-0 p-1 rounded" style={{ color: "#B8A78A" }} title="Don't show again">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Long-lived open tabs otherwise only notice a new deploy on their next
      // full navigation — poll hourly so the toast can show up on its own.
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  const reload = () => {
    // Marks this reload as update-triggered, so the Footer knows to pop the
    // changelog open once — see Footer's hash check.
    window.location.hash = "log";
    updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 px-3 pt-3">
      <div
        className="max-w-md mx-auto rounded-xl p-3 flex items-center gap-3"
        style={{ background: palette.charcoal, border: `1px solid ${palette.gold}`, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
      >
        <div className="shrink-0 rounded-lg p-2" style={{ background: palette.forestDark }}>
          <RotateCcw size={18} color={palette.parchment} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: palette.parchment, fontFamily: "Cinzel, serif" }}>
            Update available
          </p>
          <p className="text-xs" style={{ color: "#B8A78A", fontFamily: "Crimson Pro, serif" }}>
            A new version of the companion is ready.
          </p>
        </div>
        <button
          onClick={reload}
          className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold"
          style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
        >
          Reload
        </button>
        <button onClick={() => setNeedRefresh(false)} className="shrink-0 p-1 rounded" style={{ color: "#B8A78A" }} title="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Stack of auto-dismissing toasts, used for level-up notifications so they're visible
// no matter which tab triggered the XP gain (Award XP on the Party tab, or editing a
// hero's XP directly on the Heroes tab).
function LevelUpToastStack({ toasts, dismissToast }) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismissToast(t.id), 4500));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 left-0 right-0 z-50 px-3 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="max-w-md w-full rounded-xl p-3 flex items-center gap-3 pointer-events-auto"
          style={{ background: palette.charcoal, border: `1px solid ${palette.gold}`, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
        >
          <div className="shrink-0 rounded-lg p-2" style={{ background: palette.gold }}>
            <Sparkles size={18} color={palette.charcoal} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: palette.parchment, fontFamily: "Cinzel, serif" }}>
              {t.title}
            </p>
            <p className="text-xs" style={{ color: "#B8A78A", fontFamily: "Crimson Pro, serif" }}>
              {t.body}
            </p>
          </div>
          <button onClick={() => dismissToast(t.id)} className="shrink-0 p-1 rounded" style={{ color: "#B8A78A" }}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Footer() {
  const [showChangelog, setShowChangelog] = useState(false);

  // If we just reloaded after an app update (see UpdateToast), pop the changelog
  // open once so the person can see what changed — then clean the hash so a
  // later manual refresh doesn't reopen it by mistake.
  useEffect(() => {
    if (window.location.hash === "#log") {
      setShowChangelog(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <footer className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center gap-2">
      <BuyMeACoffeeButton />
      <p className="text-xs text-center" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
        © 2026 Luke Wilson. Designed by Luke Wilson.
      </p>
      <button
        onClick={() => setShowChangelog(true)}
        className="text-xs underline"
        style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}
      >
        Changelog
      </button>
      <p className="text-[11px] text-center max-w-md" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic", opacity: 0.8 }}>
        League of Dungeoneers and all associated game content © 2026 von Braus Publishing. All rights reserved.
        This is an unofficial fan-made companion tool, not affiliated with or endorsed by von Braus Publishing.
      </p>
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </footer>
  );
}

function LoadingOverlay({ label = "Loading…" }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-3 z-50"
      style={{ background: palette.charcoal + "E6" }}
    >
      <Loader2 size={32} color={palette.goldSoft} className="animate-spin" />
      <span style={{ fontFamily: "Cinzel, serif", color: palette.parchment, letterSpacing: "0.04em" }} className="text-sm uppercase">
        {label}
      </span>
    </div>
  );
}

// ---------- Small UI atoms ----------
function Panel({ children, style, className = "" }) {
  return (
    <div
      className={`rounded-lg p-4 ${className}`}
      style={{
        background: palette.panel,
        border: `1px solid ${palette.line}`,
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={18} color={palette.crimson} />}
      <h3
        style={{ fontFamily: "Cinzel, serif", color: palette.crimson, letterSpacing: "0.03em" }}
        className="text-sm uppercase font-bold"
      >
        {children}
      </h3>
    </div>
  );
}

function Stepper({ value, max, onChange, min = 0 }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(clamp(value - 1, min, max ?? 9999))}
        className="rounded p-1"
        style={{ background: palette.crimson, color: palette.parchment }}
      >
        <Minus size={14} />
      </button>
      <span
        style={{ fontFamily: "JetBrains Mono, monospace", minWidth: 32, textAlign: "center", color: palette.ink }}
        className="font-semibold"
      >
        {value}
      </span>
      <button
        onClick={() => onChange(clamp(value + 1, min, max ?? 9999))}
        className="rounded p-1"
        style={{ background: palette.forest, color: palette.parchment }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function StatBar({ label, icon: Icon, cur, max, color, onChange, onMaxChange }) {
  const pct = max > 0 ? clamp((cur / max) * 100, 0, 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={13} color={color} />}
          <span style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }} className="text-xs uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Stepper value={cur} max={max} onChange={onChange} min={0} />
          <span style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }} className="text-xs">/</span>
          <input
            type="number"
            value={max}
            onChange={(e) => onMaxChange(Number(e.target.value) || 0)}
            className="w-12 text-xs rounded px-1"
            style={{ fontFamily: "JetBrains Mono, monospace", border: `1px solid ${palette.line}`, background: "#fff" }}
          />
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#00000018" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// Fills in any fields missing from heroes saved before this update (new skills, weapon, armour)
function normalizeHero(h) {
  const base = defaultHero();
  const mergeDur = (a, b) => ({ ...base.weapon.dur, ...(a || {}), ...(b || {}) });
  const armourPiece = (key) => ({
    ...base.armour[key],
    ...((h.armour && h.armour[key]) || {}),
    dur: { ...base.armour[key].dur, ...((h.armour && h.armour[key] && h.armour[key].dur) || {}) },
  });
  return {
    ...base,
    ...h,
    stats: { ...base.stats, ...(h.stats || {}) },
    hp: { ...base.hp, ...(h.hp || {}) },
    energy: { ...base.energy, ...(h.energy || {}) },
    sanity: { ...base.sanity, ...(h.sanity || {}) },
    mana: { ...base.mana, ...(h.mana || {}) },
    // Luck used to be a bare number; migrate old saves to {cur,max} (old value becomes both).
    luck: typeof h.luck === "number" ? { cur: h.luck, max: h.luck } : { ...base.luck, ...(h.luck || {}) },
    skills: { ...base.skills, ...(h.skills || {}) },
    ipSpentThisLevel: h.ipSpentThisLevel || {},
    creationPointsSpent: { ...base.creationPointsSpent, ...(h.creationPointsSpent || {}) },
    weapon: { ...base.weapon, ...(h.weapon || {}), dur: mergeDur(h.weapon && h.weapon.dur) },
    talents: h.talents || base.talents,
    perks: h.perks || base.perks,
    spells: h.spells || base.spells,
    prayers: h.prayers || base.prayers,
    specialRules: h.specialRules || base.specialRules,
    conditions: h.conditions || base.conditions,
    backpack: (h.backpack || base.backpack).map((it) => ({ slot: "backpack", ...it })),
    backpackUpgrade: h.backpackUpgrade || "",
    tempEffects: h.tempEffects || [],
    mentalConditions: h.mentalConditions || [],
    backgroundCounter: h.backgroundCounter || 0,
    backgroundClaimed: h.backgroundClaimed || false,
    bankBalances: { ...base.bankBalances, ...(h.bankBalances || {}) },
    ap: h.ap != null ? h.ap : 2,
    armour: {
      head: armourPiece("head"),
      arms: armourPiece("arms"),
      torso: armourPiece("torso"),
      legs: armourPiece("legs"),
      shield: armourPiece("shield"),
    },
  };
}

// ---------- Hero Card ----------
// Shows a hero's attached talents/perks/spells/prayers/special-rules as small
// cards with name + description, instead of bare pills, with a remove button.
function AttachedItemList({ label, names, dataset, color, onRemove, groupKey, effects }) {
  if (!names || names.length === 0) return null;
  const resolved = names.map((name) => ({ name, item: dataset.find((d) => d.name === name) }));
  const groups = {};
  resolved.forEach((entry) => {
    const g = groupKey && entry.item ? (groupKey(entry.item) || "Other") : "";
    if (!groups[g]) groups[g] = [];
    groups[g].push(entry);
  });
  const groupNames = Object.keys(groups).sort();

  const renderCard = ({ name, item }) => (
    <div key={name} className="rounded p-1.5 flex items-start justify-between gap-2" style={{ background: "#00000008", borderLeft: `3px solid ${color}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{name}</span>
          {item && item.lvl != null && (
            <span className="text-xs px-1.5 rounded-full font-bold" style={{ background: palette.gold, color: palette.charcoal, fontFamily: "JetBrains Mono, monospace" }}>Lvl {item.lvl}</span>
          )}
          {item && item.school && (
            <span className="text-xs px-1.5 rounded-full" style={{ background: "#5B6FA8", color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{item.school}</span>
          )}
          {effects && effects[name] && (
            <span className="text-xs px-1.5 rounded-full font-bold" style={{ background: palette.gold, color: palette.charcoal, fontFamily: "JetBrains Mono, monospace" }}>
              Auto: {effects[name].label}
            </span>
          )}
        </div>
        {item && item.cv != null && (
          <p className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
            CV {item.cv}{item.mana != null ? ` · Mana ${item.mana}` : ""}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>{item ? item.effect : "(details not found)"}</p>
      </div>
      <button onClick={() => onRemove(name)} className="shrink-0" style={{ color: palette.crimson }}><X size={13} /></button>
    </div>
  );

  return (
    <div className="mb-2">
      <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1">{label}</div>
      {groupNames.map((g) => (
        <div key={g} className="mb-1.5">
          {g && (
            <div className="text-xs font-bold uppercase mb-0.5 px-1.5 py-0.5 rounded inline-block" style={{ background: color, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
              {g}
            </div>
          )}
          <div className="space-y-1">
            {groups[g].map(renderCard)}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroCard({ hero, update, remove, addLog, pushToast, party, setParty }) {
  const [sanityEvent, setSanityEvent] = useState(SANITY_EVENTS[0].label);
  const [pendingCondition, setPendingCondition] = useState(null);
  const [hateEnemyInput, setHateEnemyInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch) => update({ ...hero, ...patch });
  const setStat = (k, v) => update({ ...hero, stats: { ...hero.stats, [k]: v } });
  const CREATION_POINT_CAP_PER_STAT = 10;
  const spendCreationPoint = (k, sign) => {
    const spent = hero.creationPointsSpent?.[k] || 0;
    if (sign > 0) {
      if (hero.creationPoints <= 0 || spent >= CREATION_POINT_CAP_PER_STAT) return;
      update({
        ...hero,
        stats: { ...hero.stats, [k]: (Number(hero.stats[k]) || 0) + 1 },
        creationPoints: hero.creationPoints - 1,
        creationPointsSpent: { ...hero.creationPointsSpent, [k]: spent + 1 },
      });
    } else {
      if (spent <= 0) return;
      update({
        ...hero,
        stats: { ...hero.stats, [k]: Math.max(0, (Number(hero.stats[k]) || 0) - 1) },
        creationPoints: hero.creationPoints + 1,
        creationPointsSpent: { ...hero.creationPointsSpent, [k]: spent - 1 },
      });
    }
  };
  const setSkill = (k, v) => update({ ...hero, skills: { ...hero.skills, [k]: v } });
  const setWeapon = (patch) => update({ ...hero, weapon: { ...hero.weapon, ...patch } });
  const pickWeapon = (name) => {
    const w = WEAPONS.find((x) => x.name === name);
    if (!w) return;
    update({ ...hero, weapon: { name: w.name, dmg: w.dmg, enc: w.enc, dur: { cur: 6, max: 6 } } });
  };
  const setArmourPiece = (loc, patch) => update({ ...hero, armour: { ...hero.armour, [loc]: { ...hero.armour[loc], ...patch } } });
  const pickArmour = (loc, name) => {
    const a = ARMOUR_AND_SHIELDS.find((x) => x.name === name);
    if (!a) return;
    setArmourPiece(loc, { name: a.name, def: a.def, enc: a.enc, dur: { cur: 6, max: 6 } });
  };

  // Clearing an equipped weapon/armour piece doesn't destroy it — the hero still has the
  // physical item, so it moves into the backpack instead of just vanishing.
  const clearWeapon = () => {
    if (!hero.weapon.name) return;
    const ref = WEAPONS.find((w) => w.name === hero.weapon.name);
    const item = {
      id: uid(),
      name: hero.weapon.name,
      value: ref ? ref.cost : "",
      enc: hero.weapon.enc,
      dur: `${hero.weapon.dur.cur}/${hero.weapon.dur.max}`,
      slot: "backpack",
    };
    update({ ...hero, weapon: { name: "", dmg: "", enc: 0, dur: { cur: 6, max: 6 } }, backpack: [...hero.backpack, item] });
    addLog && addLog(`${hero.name} unequips ${item.name} — moved to the backpack.`);
  };
  const clearArmourPiece = (loc) => {
    const piece = hero.armour[loc];
    if (!piece.name) return;
    const ref = ARMOUR_AND_SHIELDS.find((a) => a.name === piece.name);
    const item = {
      id: uid(),
      name: piece.name,
      value: ref ? ref.cost : "",
      enc: piece.enc,
      dur: `${piece.dur.cur}/${piece.dur.max}`,
      slot: "backpack",
    };
    update({ ...hero, armour: { ...hero.armour, [loc]: { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 } } }, backpack: [...hero.backpack, item] });
    addLog && addLog(`${hero.name} unequips ${item.name} — moved to the backpack.`);
  };

  const extraSkillKey = CASTER_SKILL[hero.profession] || PRAYER_SKILL[hero.profession] || null;
  const visibleSkills = [
    "cs", "rs", "dodge", "pickLocks", "barter", "heal", "alchemy", "perception", "foraging",
    ...(extraSkillKey ? [extraSkillKey] : []),
  ];

  const applySanity = () => {
    const ev = SANITY_EVENTS.find((e) => e.label === sanityEvent);
    if (!ev) return;
    let d = ev.delta;
    if (typeof d === "string") {
      const neg = d.startsWith("-");
      const m = d.match(/(\d+)d(\d+)/);
      const rolled = m ? rollDie(Number(m[2])) : 0;
      d = neg ? -rolled : rolled;
    }
    const cur = clamp(hero.sanity.cur + d, 0, hero.sanity.max);
    set({ sanity: { ...hero.sanity, cur } });
  };

  // Mental Conditions — rolled once Sanity hits 0. Re-rolls on a duplicate. Confirming a
  // condition applies its stat/energy effect (if any) immediately, records the diagnosis,
  // and drops max Sanity to 8 minus the hero's current condition count.
  const confirmMentalCondition = (entry, detail) => {
    const newConditions = [...hero.mentalConditions, { id: uid(), name: entry.name, detail, effect: entry.effect || null }];
    const patch = entry.effect ? applyEffectDelta(hero, entry.effect, 1) : {};
    const newMax = sanityMaxFor({ ...hero, mentalConditions: newConditions });
    update({
      ...hero,
      ...patch,
      mentalConditions: newConditions,
      sanity: { cur: newMax, max: newMax },
    });
    addLog && addLog(`${hero.name} develops a mental condition: ${entry.name}.${detail ? ` (${detail})` : ""} Sanity resets to ${newMax}/${newMax}.`);
    setPendingCondition(null);
    setHateEnemyInput("");
  };
  const rollMentalConditionForHero = () => {
    const have = hero.mentalConditions.map((c) => c.name);
    if (have.length >= MENTAL_CONDITIONS_TABLE.length) {
      addLog && addLog(`${hero.name} already has every mental condition — nothing new to roll.`);
      return;
    }
    let entry;
    do { entry = rollMentalCondition(); } while (have.includes(entry.name));
    if (entry.needsDetail === "enemy") {
      setPendingCondition(entry);
      return;
    }
    let detail = "";
    if (entry.needsDetail === "trauma") {
      detail = `Triggers on: ${LINGERING_TRAUMA_TABLE[rollDie(6) - 1].text}`;
    } else if (entry.needsDetail === "faction") {
      detail = `Faction: ${IRRATIONAL_FEAR_FACTIONS[Math.floor(Math.random() * IRRATIONAL_FEAR_FACTIONS.length)]}`;
    }
    confirmMentalCondition(entry, detail);
  };
  const confirmHate = () => {
    if (!pendingCondition) return;
    confirmMentalCondition(pendingCondition, hateEnemyInput.trim() || "an unspecified enemy");
  };
  const cureMentalCondition = (id) => {
    const cond = hero.mentalConditions.find((c) => c.id === id);
    if (!cond) return;
    const remaining = hero.mentalConditions.filter((c) => c.id !== id);
    const patch = cond.effect ? applyEffectDelta(hero, cond.effect, -1) : {};
    const newMax = sanityMaxFor({ ...hero, mentalConditions: remaining });
    update({
      ...hero,
      ...patch,
      mentalConditions: remaining,
      sanity: { cur: Math.min(hero.sanity.cur, newMax), max: newMax },
    });
    addLog && addLog(`${hero.name}'s "${cond.name}" is cured. Max Sanity is now ${newMax}.`);
  };

  const speciesData = SPECIES_DATA.find((s) => s.name === hero.species);

  const rollStartingStats = () => {
    if (!speciesData) return;
    const hpRoll = speciesData.hp.base + Array.from({ length: speciesData.hp.count }, () => rollDie(speciesData.hp.size)).reduce((a, b) => a + b, 0);
    const newStats = {};
    Object.entries(speciesData.stats).forEach(([k, base]) => {
      newStats[k] = base + rollDie(10);
    });
    let nextSkills = hero.profession ? computeProfessionSkills({ ...hero, stats: newStats }) : hero.skills;
    const isCaster = !!CASTER_SKILL[hero.profession];
    // Mana = WIS x 1.5, rounded down — Magic chapter.
    const manaMax = isCaster ? Math.floor(newStats.WIS * 1.5) : hero.mana.max;
    const manaPatch = isCaster ? { mana: { cur: manaMax, max: manaMax } } : {};

    // Species starting Traits that map to an unconditional Talent bonus — applied once
    // (won't stack on reroll). Hate Goblins (Dwarf) and Jack of All Trades (Human) need
    // a chosen enemy/category respectively, so those stay manual via the Compendium.
    const speciesTraitTalents = { Elf: ["Night Vision", "Perfect Hearing"], Dwarf: ["Night Vision"] }[speciesData.name] || [];
    let talents = hero.talents;
    let workingHero = { ...hero, stats: newStats, skills: nextSkills };
    speciesTraitTalents.forEach((tName) => {
      if (!talents.includes(tName)) {
        workingHero = { ...workingHero, ...talentEffectPatch(workingHero, tName, 1) };
        talents = [...talents, tName];
      }
    });
    nextSkills = workingHero.skills;

    // Lucky (Halfling) — starts with 1 Luck Point; non-halflings start at 0.
    const luckPatch = speciesData.name === "Halfling" ? { luck: { cur: Math.max(hero.luck.cur, 1), max: Math.max(hero.luck.max, 1) } } : {};

    update({ ...hero, stats: newStats, skills: nextSkills, hp: { cur: hpRoll, max: hpRoll }, creationPoints: 15, creationPointsSpent: { STR: 0, CON: 0, DEX: 0, WIS: 0, RES: 0 }, talents, ...luckPatch, ...manaPatch });
  };

  const recalcSkills = () => set({ skills: computeProfessionSkills(hero) });

  // Selecting a background reverses whatever the previous one applied (hero-level stat
  // effect, party morale, starting coins, Sanity bonus) and applies the new one — mirrors
  // the same reversible-effect pattern used for Talents and Mental Conditions.
  const setBackground = (newId) => {
    const oldData = getBackgroundData(hero);
    const newData = BACKGROUNDS_DATA.find((b) => b.id === newId) || null;
    let patch = { background: newId, backgroundCounter: 0, backgroundClaimed: false };
    if (oldData?.startEffect) patch = { ...patch, ...applyEffectDelta(hero, oldData.startEffect, -1) };
    const heroAfterReversal = { ...hero, ...patch };
    if (newData?.startEffect) patch = { ...patch, ...applyEffectDelta(heroAfterReversal, newData.startEffect, 1) };
    const oldSanityMax = sanityMaxFor({ ...hero, background: oldData?.id });
    const newSanityMax = sanityMaxFor({ ...hero, background: newData?.id });
    if (oldSanityMax !== newSanityMax) {
      const diff = newSanityMax - oldSanityMax;
      patch.sanity = { cur: Math.max(0, hero.sanity.cur + diff), max: Math.max(0, hero.sanity.max + diff) };
    }
    update({ ...hero, ...patch });
    if (setParty) {
      setParty((prev) => {
        let coins = prev.coins;
        let morale = prev.morale;
        if (oldData?.partyMoraleEffect) morale -= oldData.partyMoraleEffect;
        if (oldData?.startingCoinsBonus) coins = Math.max(0, coins - oldData.startingCoinsBonus);
        if (newData?.partyMoraleEffect) morale += newData.partyMoraleEffect;
        if (newData?.startingCoinsBonus) coins += newData.startingCoinsBonus;
        return { ...prev, coins, morale };
      });
    }
    addLog && addLog(`${hero.name}'s background set to ${newData ? newData.name : "none"}.`);
  };
  const rollBackground = () => {
    const pick = BACKGROUNDS_DATA[rollDie(BACKGROUNDS_DATA.length) - 1];
    setBackground(pick.id);
  };
  const backgroundData = getBackgroundData(hero);
  const claimBackgroundReward = (xpAmount, note) => {
    update({ ...hero, xp: hero.xp + xpAmount, backgroundClaimed: true });
    addLog && addLog(`${hero.name} completes their Personal Quest: +${xpAmount} XP.${note ? ` ${note}` : ""}`);
  };
  const claimBackgroundBranch = (option) => {
    const patch = option.effect ? applyEffectDelta(hero, option.effect, 1) : {};
    update({ ...hero, ...patch, xp: hero.xp + option.xp, backgroundClaimed: true });
    addLog && addLog(`${hero.name} completes their Personal Quest (${option.label}): +${option.xp} XP.${option.note ? ` ${option.note}` : ""}`);
  };
  const claimBackgroundItem = (item) => {
    update({
      ...hero,
      backgroundClaimed: true,
      backpack: [...hero.backpack, { id: uid(), name: item.name, value: "", enc: 0, dur: "", slot: "backpack" }],
    });
    addLog && addLog(`${hero.name} claims their Personal Quest reward: ${item.name}. ${item.note || ""}`);
  };
  const claimBackgroundCure = () => {
    const grantsTalent = backgroundData?.reward?.grantsTalent;
    const patch = grantsTalent ? talentEffectPatch({ ...hero, talents: [...hero.talents, grantsTalent] }, grantsTalent, 1) : {};
    update({ ...hero, ...patch, talents: grantsTalent ? [...hero.talents, grantsTalent] : hero.talents, backgroundClaimed: true });
    addLog && addLog(`${hero.name} overcomes their Personal Trait.${grantsTalent ? ` Gains the ${grantsTalent} Talent.` : ""}`);
  };
  const claimBackgroundRepeatable = () => {
    const r = backgroundData?.reward;
    if (!r) return;
    const nextCounter = hero.backgroundCounter + 1;
    if (nextCounter % r.per === 0) {
      update({ ...hero, xp: hero.xp + r.amount, backgroundCounter: nextCounter });
      addLog && addLog(`${hero.name}: ${r.counterLabel} now ${nextCounter} — +${r.amount} XP.`);
    } else {
      update({ ...hero, backgroundCounter: nextCounter });
      addLog && addLog(`${hero.name}: ${r.counterLabel} now ${nextCounter} (${r.per - (nextCounter % r.per)} more for +${r.amount} XP).`);
    }
  };

  const setFreeSkill = (newKey) => {
    const skills = { ...hero.skills };
    if (hero.freeSkill && skills[hero.freeSkill] !== undefined) skills[hero.freeSkill] = skills[hero.freeSkill] - 10;
    if (newKey && skills[newKey] !== undefined) skills[newKey] = skills[newKey] + 10;
    update({ ...hero, freeSkill: newKey, skills });
  };

  const levelUp = () => {
    const nextLevel = hero.level + 1;
    const entry = XP_LEVELLING.find((l) => l.level === nextLevel);
    const patch = { level: nextLevel, improvementPoints: hero.improvementPoints + 15, ipSpentThisLevel: {} };
    const notes = ["+15 Improvement Points"];
    if (entry) {
      if (entry.hpDie) {
        const roll = rollDie(2);
        patch.hp = { ...hero.hp, cur: hero.hp.cur + roll, max: hero.hp.max + roll };
        notes.push(`+${roll} HP (max now ${patch.hp.max})`);
      }
      if (entry.luck) {
        patch.luck = { cur: hero.luck.cur + 1, max: hero.luck.max + 1 };
        notes.push("+1 Luck");
      }
      if (entry.energy) {
        patch.energy = { ...hero.energy, cur: hero.energy.cur + 1, max: hero.energy.max + 1 };
        notes.push("+1 Energy");
      }
    }
    update({ ...hero, ...patch });
    addLog && addLog(`${hero.name} leveled up to ${nextLevel}: ${notes.join(", ")}`);
  };

  const nextLevelEntry = XP_LEVELLING.find((l) => l.level === hero.level + 1);
  const xpToNext = nextLevelEntry ? Math.max(0, nextLevelEntry.xp - hero.xp) : null;

  const setXP = (newXP) => {
    const { hero: leveled, events } = applyAutoLevelUps({ ...hero, xp: newXP });
    update(leveled);
    if (events.length > 0) {
      const finalLevel = events[events.length - 1].level;
      const allNotes = events.flatMap((e) => e.notes).join(", ");
      pushToast && pushToast(
        `${hero.name} leveled up!`,
        events.length > 1 ? `Now level ${finalLevel} (+${events.length} levels) — ${allNotes}` : `Now level ${finalLevel} — ${allNotes}`
      );
      addLog && addLog(`${hero.name} leveled up to ${finalLevel}: ${allNotes}`);
    }
  };

  const spendIP = (key) => {
    const cost = ipCostFor(hero, key);
    if (cost == null || hero.improvementPoints < cost) return;
    const cap = key === "hp" ? IP_HP_CAP_PER_LEVEL : IP_STAT_SKILL_CAP_PER_LEVEL;
    const spentSoFar = hero.ipSpentThisLevel?.[key] || 0;
    if (spentSoFar >= cap) return;
    const patch = {
      improvementPoints: hero.improvementPoints - cost,
      ipSpentThisLevel: { ...hero.ipSpentThisLevel, [key]: spentSoFar + 1 },
    };
    let label;
    if (key === "hp") {
      patch.hp = { ...hero.hp, cur: hero.hp.cur + 1, max: hero.hp.max + 1 };
      label = "Hit Points";
    } else if (STAT_KEYS.includes(key)) {
      patch.stats = { ...hero.stats, [key]: (Number(hero.stats[key]) || 0) + 1 };
      label = key;
    } else {
      patch.skills = { ...hero.skills, [key]: (Number(hero.skills[key]) || 0) + 1 };
      label = SKILL_LABELS[key] || key;
    }
    update({ ...hero, ...patch });
    addLog && addLog(`${hero.name}: spent ${cost} IP on ${label} (+1)`);
  };

  const refundIP = (key) => {
    const spentSoFar = hero.ipSpentThisLevel?.[key] || 0;
    if (spentSoFar <= 0) return;
    // Refund the cost that was actually paid to reach the current value — simulate the
    // stat/skill one point lower and price from there, mirroring the pre-increment
    // check spendIP does (so undoing a purchase that just crossed the 70 threshold
    // refunds the pre-threshold price, not the doubled one).
    const patch = { ipSpentThisLevel: { ...hero.ipSpentThisLevel, [key]: spentSoFar - 1 } };
    let label, costHero;
    if (key === "hp") {
      patch.hp = { ...hero.hp, cur: Math.max(0, hero.hp.cur - 1), max: Math.max(0, hero.hp.max - 1) };
      label = "Hit Points";
      costHero = hero;
    } else if (STAT_KEYS.includes(key)) {
      const lowered = Math.max(0, (Number(hero.stats[key]) || 0) - 1);
      patch.stats = { ...hero.stats, [key]: lowered };
      costHero = { ...hero, stats: patch.stats };
      label = key;
    } else {
      const lowered = Math.max(0, (Number(hero.skills[key]) || 0) - 1);
      patch.skills = { ...hero.skills, [key]: lowered };
      costHero = { ...hero, skills: patch.skills };
      label = SKILL_LABELS[key] || key;
    }
    const refund = ipCostFor(costHero, key) ?? 0;
    patch.improvementPoints = hero.improvementPoints + refund;
    update({ ...hero, ...patch });
    addLog && addLog(`${hero.name}: refunded ${refund} IP from ${label} (−1)`);
  };

  const addBackpackItem = () => {
    set({ backpack: [...hero.backpack, { id: uid(), name: "", value: "", enc: "", dur: "" }] });
  };
  const updateBackpackItem = (id, patch) => set({ backpack: hero.backpack.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const removeBackpackItem = (id) => set({ backpack: hero.backpack.filter((it) => it.id !== id) });
  const quickSlotUsed = hero.backpack.filter((it) => it.slot === "quickslot").length;
  const quickSlotMax = quickSlotCapacity(hero);
  const [backpackFeedback, setBackpackFeedback] = useState(null);
  const moveSlot = (item) => {
    const movingToQuick = item.slot !== "quickslot";
    if (movingToQuick && quickSlotUsed >= quickSlotMax) {
      const msg = `No room in Quick Slots (${quickSlotUsed}/${quickSlotMax}) for ${item.name}. Move something else out first, or clear it.`;
      setBackpackFeedback({ text: msg, tone: "bad" });
      addLog && addLog(`${hero.name}: ${msg}`);
      return;
    }
    const ap = hero.ap ?? 2;
    if (ap < 2) {
      const msg = `${hero.name} doesn't have enough AP to rearrange gear (needs 2, has ${ap}). Check the Turn tab.`;
      setBackpackFeedback({ text: msg, tone: "bad" });
      addLog && addLog(`${hero.name}: not enough AP to rearrange gear (needs 2, has ${ap}).`);
      return;
    }
    update({
      ...hero,
      ap: ap - 2,
      backpack: hero.backpack.map((it) => (it.id === item.id ? { ...it, slot: movingToQuick ? "quickslot" : "backpack" } : it)),
    });
    setBackpackFeedback({ text: `${item.name} moved to ${movingToQuick ? "a Quick Slot" : "the Backpack"}.`, tone: "good" });
    addLog && addLog(`${hero.name} moves ${item.name} to ${movingToQuick ? "a Quick Slot" : "the backpack"} (2 AP).`);
  };

  // Equips a backpack item that matches a real Weapon or Armour table entry, preserving
  // its actual durability (parsed from the "cur/max" string) instead of resetting to
  // full — and swaps whatever was previously equipped there back into the backpack.
  const equipFromBackpack = (item) => {
    const parseDur = (str) => {
      const [c, m] = String(str || "6/6").split("/").map((n) => Number(n));
      return { cur: isNaN(c) ? 6 : c, max: isNaN(m) ? 6 : m };
    };
    const wpn = WEAPONS.find((w) => w.name === item.name);
    if (wpn) {
      let backpack = hero.backpack.filter((it) => it.id !== item.id);
      if (hero.weapon.name) {
        const oldRef = WEAPONS.find((w) => w.name === hero.weapon.name);
        backpack = [...backpack, { id: uid(), name: hero.weapon.name, value: oldRef ? oldRef.cost : "", enc: hero.weapon.enc, dur: `${hero.weapon.dur.cur}/${hero.weapon.dur.max}`, slot: "backpack" }];
      }
      update({ ...hero, weapon: { name: wpn.name, dmg: wpn.dmg, enc: wpn.enc, dur: parseDur(item.dur) }, backpack });
      setBackpackFeedback({ text: `${wpn.name} equipped.${hero.weapon.name ? ` ${hero.weapon.name} moved to the backpack.` : ""}`, tone: "good" });
      addLog && addLog(`${hero.name} equips ${wpn.name} from the backpack.${hero.weapon.name ? ` ${hero.weapon.name} moved to the backpack.` : ""}`);
      return;
    }
    const arm = ARMOUR_AND_SHIELDS.find((a) => a.name === item.name);
    if (arm) {
      const loc = arm.covers[0];
      let backpack = hero.backpack.filter((it) => it.id !== item.id);
      const oldPiece = hero.armour[loc];
      if (oldPiece.name) {
        const oldRef = ARMOUR_AND_SHIELDS.find((a) => a.name === oldPiece.name);
        backpack = [...backpack, { id: uid(), name: oldPiece.name, value: oldRef ? oldRef.cost : "", enc: oldPiece.enc, dur: `${oldPiece.dur.cur}/${oldPiece.dur.max}`, slot: "backpack" }];
      }
      update({ ...hero, armour: { ...hero.armour, [loc]: { name: arm.name, def: arm.def, enc: arm.enc, dur: parseDur(item.dur) } }, backpack });
      setBackpackFeedback({ text: `${arm.name} equipped (${loc}).${arm.covers.length > 1 ? ` Also covers ${arm.covers.filter((c) => c !== loc).join(", ")} — check those slots too.` : ""}${oldPiece.name ? ` ${oldPiece.name} moved to the backpack.` : ""}`, tone: "good" });
      addLog && addLog(`${hero.name} equips ${arm.name} (${loc}) from the backpack.${arm.covers.length > 1 ? ` Also covers ${arm.covers.filter((c) => c !== loc).join(", ")} — check those slots too.` : ""}${oldPiece.name ? ` ${oldPiece.name} moved to the backpack.` : ""}`);
    }
  };
  const isEquippable = (item) => WEAPONS.some((w) => w.name === item.name) || ARMOUR_AND_SHIELDS.some((a) => a.name === item.name);

  const [conditionInput, setConditionInput] = useState("");
  const addCondition = () => {
    const v = conditionInput.trim();
    if (!v || hero.conditions.includes(v)) return;
    set({ conditions: [...hero.conditions, v] });
    setConditionInput("");
  };
  const removeCondition = (c) => set({ conditions: hero.conditions.filter((x) => x !== c) });

  const totalEnc =
    (Number(hero.weapon.enc) || 0) +
    Object.values(hero.armour).reduce((sum, piece) => sum + (Number(piece.enc) || 0), 0) +
    hero.backpack.reduce((sum, item) => sum + (Number(item.enc) || 0), 0);
  const carryCapacity = (Number(hero.stats.STR) || 0) + backpackEncBonus(hero);
  const isEncumbered = totalEnc > carryCapacity;
  const weaponRef = WEAPONS.find((w) => w.name === hero.weapon.name);
  const strReq = weaponRef ? WEAPON_CLASS_STR_REQ[weaponRef.class] : null;
  // twoH is always the lower/easier bar (wielding one-handed needs more STR, where possible
  // at all) — so that's the real "can this hero use it" threshold.
  const strTooWeak = strReq ? (Number(hero.stats.STR) || 0) < strReq.twoH : false;

  const pickBackpackUpgrade = (newUpgrade) => {
    const oldPenalty = BACKPACK_UPGRADES[hero.backpackUpgrade || ""]?.dexPenalty || 0;
    const newPenalty = BACKPACK_UPGRADES[newUpgrade || ""]?.dexPenalty || 0;
    const newDex = Math.max(0, (Number(hero.stats.DEX) || 0) - oldPenalty + newPenalty);
    update({ ...hero, backpackUpgrade: newUpgrade, stats: { ...hero.stats, DEX: newDex } });
  };

  const addFromEquipmentTable = (name) => {
    const genItem = GENERAL_EQUIPMENT.find((x) => x.name === name);
    if (genItem) {
      update({ ...hero, backpack: [...hero.backpack, { id: uid(), name: genItem.name, value: genItem.cost, enc: genItem.enc, dur: genItem.dur, slot: "backpack" }] });
      return;
    }
    const wpn = WEAPONS.find((x) => x.name === name);
    if (wpn) {
      update({ ...hero, backpack: [...hero.backpack, { id: uid(), name: wpn.name, value: wpn.cost, enc: wpn.enc, dur: "6/6", slot: "backpack" }] });
      return;
    }
    const arm = ARMOUR_AND_SHIELDS.find((x) => x.name === name);
    if (arm) {
      update({ ...hero, backpack: [...hero.backpack, { id: uid(), name: arm.name, value: arm.cost, enc: arm.enc, dur: "6/6", slot: "backpack" }] });
    }
  };

  return (
    <Panel className="mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <input
            value={hero.name}
            onChange={(e) => set({ name: e.target.value })}
            className="w-full bg-transparent border-none text-lg font-bold outline-none"
            style={{ fontFamily: "Cinzel, serif", color: palette.ink }}
          />
          <div className="flex gap-2 mt-1 flex-wrap">
            <select
              value={hero.species}
              onChange={(e) => set({ species: e.target.value })}
              className="text-xs rounded px-2 py-1 flex-1 min-w-[90px]"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif", color: hero.species ? palette.ink : palette.inkSoft }}
            >
              <option value="">Species…</option>
              {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={hero.profession}
              onChange={(e) => {
                const profession = e.target.value;
                const nextSkills = computeProfessionSkills({ ...hero, profession });
                const isCaster = !!CASTER_SKILL[profession];
                // Mana = WIS x 1.5, rounded down — Magic chapter.
                const manaMax = isCaster ? Math.floor((Number(hero.stats.WIS) || 0) * 1.5) : hero.mana.max;
                const manaPatch = isCaster ? { mana: { cur: manaMax, max: manaMax } } : {};
                // Warrior Priest starts with 2 Energy instead of the usual 1 — only bump
                // it if it's still at the default, so it doesn't clobber a manual edit.
                const energyPatch = profession === "Warrior Priest" && hero.energy.max <= 1 ? { energy: { cur: 2, max: 2 } } : {};
                update({ ...hero, profession, skills: nextSkills, ...manaPatch, ...energyPatch });
              }}
              className="text-xs rounded px-2 py-1 flex-1 min-w-[110px]"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif", color: hero.profession ? palette.ink : palette.inkSoft }}
            >
              <option value="">Profession…</option>
              {PROFESSIONS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <div className="flex items-center gap-1 text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
              Lvl
              <input
                type="number"
                value={hero.level}
                onChange={(e) => set({ level: Number(e.target.value) || 1 })}
                className="w-10 rounded px-1"
                style={{ background: "#fff", border: `1px solid ${palette.line}` }}
              />
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
              XP
              <input
                type="number"
                value={hero.xp}
                onChange={(e) => setXP(Number(e.target.value) || 0)}
                className="w-14 rounded px-1"
                style={{ background: "#fff", border: `1px solid ${palette.line}` }}
              />
            </div>
            <button
              onClick={levelUp}
              className="text-xs px-2 py-1 rounded font-semibold"
              style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Crimson Pro, serif" }}
              title="Level +1, +15 Improvement Points, and the automatic HP/Luck/Energy gains for the new level"
            >
              Level Up
            </button>
          </div>
          {nextLevelEntry && (
            <p className="text-[10px] mt-1" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              {xpToNext > 0 ? `${xpToNext} XP to level ${nextLevelEntry.level}` : `XP requirement for level ${nextLevelEntry.level} met`}
            </p>
          )}
          {hero.profession && (
            <p className="text-xs mt-1" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
              {PROFESSIONS.find((p) => p.name === hero.profession)?.desc}
            </p>
          )}
          {speciesData && speciesData.note && (
            <p className="text-xs mt-1" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
              {speciesData.note}
            </p>
          )}
          {speciesData && (
            <button
              onClick={rollStartingStats}
              className="text-xs mt-1.5 px-2 py-1 rounded font-semibold flex items-center gap-1"
              style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}
            >
              <Dice5 size={12} /> Roll Starting Stats & HP ({speciesData.name})
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {confirmDelete ? (
            <>
              <button
                onClick={remove}
                className="px-2 py-1 rounded text-xs font-bold"
                style={{ background: palette.crimsonDark, color: palette.parchment }}
              >
                Delete?
              </button>
              <button onClick={() => setConfirmDelete(false)} className="p-1 rounded" style={{ color: palette.inkSoft }}>
                <X size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 rounded" style={{ color: palette.crimson }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
          <StatBar label="HP" icon={Heart} cur={hero.hp.cur} max={hero.hp.max} color={palette.crimson}
            onChange={(v) => set({ hp: { ...hero.hp, cur: v } })} onMaxChange={(v) => set({ hp: { ...hero.hp, max: v } })} />
          <StatBar label="Energy" icon={Zap} cur={hero.energy.cur} max={hero.energy.max} color={palette.gold}
            onChange={(v) => set({ energy: { ...hero.energy, cur: v } })} onMaxChange={(v) => set({ energy: { ...hero.energy, max: v } })} />
          <StatBar label="Sanity" icon={Brain} cur={hero.sanity.cur} max={hero.sanity.max} color={palette.forest}
            onChange={(v) => set({ sanity: { ...hero.sanity, cur: v } })} onMaxChange={(v) => set({ sanity: { ...hero.sanity, max: v } })} />
          <StatBar label="Mana" icon={Sparkles} cur={hero.mana.cur} max={hero.mana.max} color="#5B6FA8"
            onChange={(v) => set({ mana: { ...hero.mana, cur: v } })} onMaxChange={(v) => set({ mana: { ...hero.mana, max: v } })} />
          <StatBar label="Luck" icon={Dice5} cur={hero.luck.cur} max={hero.luck.max} color={palette.gold}
            onChange={(v) => set({ luck: { ...hero.luck, cur: v } })} onMaxChange={(v) => set({ luck: { ...hero.luck, max: v } })} />

          {/* Temporary Effects — Temple boons and Curses that last "until next dungeon exit" */}
          {hero.tempEffects && hero.tempEffects.length > 0 && (
            <div className="rounded p-2 mb-3" style={{ background: "#7A1F2B11", border: `1px solid ${palette.crimson}` }}>
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.crimson }} className="uppercase font-bold">
                  Temporary Effects (until next dungeon exit)
                </span>
                <button
                  onClick={() => set(clearAllTempEffects(hero))}
                  className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: palette.crimsonDark, color: palette.parchment }}
                  title="Left the dungeon — clear all"
                >
                  <RotateCcw size={10} /> Left dungeon — clear all
                </button>
              </div>
              <div className="space-y-1">
                {hero.tempEffects.map((eff) => (
                  <div key={eff.id} className="flex items-center justify-between text-xs rounded px-2 py-1" style={{ background: "#fff", fontFamily: "Crimson Pro, serif" }}>
                    <span style={{ color: palette.ink }}>{eff.label}</span>
                    <button onClick={() => set(removeTempEffect(hero, eff.id))} style={{ color: palette.crimson }} title="Clear this effect">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mental Conditions — diagnosed once Sanity hits 0, persist until cured */}
          {hero.mentalConditions && hero.mentalConditions.length > 0 && (
            <div className="rounded p-2 mb-3" style={{ background: "#3B2F5E11", border: `1px solid #6B4FA0` }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: "#6B4FA0" }} className="uppercase font-bold">
                Mental Conditions (max Sanity {hero.sanity.max} — cure to raise it)
              </span>
              <div className="space-y-1 mt-1">
                {hero.mentalConditions.map((c) => {
                  const ruleText = MENTAL_CONDITIONS_TABLE.find((m) => m.name === c.name)?.text;
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-2 text-xs rounded px-2 py-1.5" style={{ background: "#fff", fontFamily: "Crimson Pro, serif" }}>
                      <div className="flex-1 min-w-0">
                        <div>
                          <span className="font-bold" style={{ color: palette.ink }}>{c.name}</span>
                          {c.detail && <span style={{ color: palette.inkSoft }}> — {c.detail}</span>}
                        </div>
                        {ruleText && <p className="text-[10px] mt-0.5" style={{ color: palette.inkSoft }}>{ruleText}</p>}
                      </div>
                      <button onClick={() => cureMentalCondition(c.id)} className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "#00000015", color: palette.inkSoft }} title="Manual override — the proper way to cure a condition is Treat Mental Conditions at the Asylum (Settlement tab), 1000c, 1-5 on 1d6">
                        Clear
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {hero.sanity.cur <= 0 && !pendingCondition && (
            <button
              onClick={rollMentalConditionForHero}
              className="w-full mb-3 text-xs px-2 py-2 rounded font-bold active:scale-95 transition-transform"
              style={{ background: "#6B4FA0", color: "#fff", fontFamily: "Cinzel, serif" }}
            >
              Sanity at 0 — Roll a Mental Condition
            </button>
          )}
          {pendingCondition && (
            <div className="rounded p-2 mb-3" style={{ background: "#3B2F5E11", border: `1px solid #6B4FA0` }}>
              <p className="text-xs mb-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                Rolled <b>Hate</b> — which enemy did {hero.name} last fight?
              </p>
              <input
                value={hateEnemyInput}
                onChange={(e) => setHateEnemyInput(e.target.value)}
                placeholder="Enemy type (must be in the Bestiary)"
                className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              />
              <button onClick={confirmHate} className="w-full text-xs px-2 py-1.5 rounded font-semibold" style={{ background: "#6B4FA0", color: "#fff", fontFamily: "Cinzel, serif" }}>
                Confirm
              </button>
            </div>
          )}

          {/* Sanity quick event */}
          <div className="flex gap-2 items-center mt-2 mb-3">
            <select
              value={sanityEvent}
              onChange={(e) => setSanityEvent(e.target.value)}
              className="text-xs rounded px-2 py-1 flex-1"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              {SANITY_EVENTS.map((e) => (
                <option key={e.label} value={e.label}>{e.label} ({typeof e.delta === "string" ? "+" + e.delta : e.delta})</option>
              ))}
            </select>
            <button onClick={applySanity} className="text-xs px-2 py-1 rounded font-semibold" style={{ background: palette.forestDark, color: palette.parchment }}>
              Apply
            </button>
          </div>

          {/* Conditions */}
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1">Conditions</div>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {hero.conditions.map((c) => (
              <span key={c} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}>
                {c}
                <button onClick={() => removeCondition(c)} style={{ lineHeight: 0 }}><X size={11} /></button>
              </span>
            ))}
            {hero.conditions.length === 0 && (
              <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>None</span>
            )}
          </div>
          <div className="flex gap-1.5 mb-3">
            <input
              value={conditionInput}
              onChange={(e) => setConditionInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCondition()}
              placeholder="e.g. Poisoned, Diseased, Bleeding Out…"
              className="flex-1 text-xs rounded px-2 py-1"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            />
            <button onClick={addCondition} className="px-2 rounded text-xs font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
              Add
            </button>
          </div>

          {/* Basic stats */}
          <div className="flex items-center justify-between mb-1">
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase">Stats</div>
            <div
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                background: hero.creationPoints > 0 ? palette.gold : "#00000010",
                color: hero.creationPoints > 0 ? palette.charcoal : palette.inkSoft,
              }}
              title="Creation Points remaining (15 to spend at creation, max 10 into any one stat)"
            >
              {hero.creationPoints} CP left
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {Object.entries(hero.stats).map(([k, v]) => {
              const max = speciesData && speciesData.max ? speciesData.max[k] : null;
              const overMax = max != null && v > max;
              const spent = hero.creationPointsSpent?.[k] || 0;
              return (
                <div key={k} className="text-center rounded p-1.5" style={{ background: "#00000008" }}>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }}>{k}</div>
                  <input
                    type="number"
                    value={v}
                    onChange={(e) => setStat(k, Number(e.target.value) || 0)}
                    className="w-full text-center bg-transparent font-bold outline-none"
                    style={{ fontFamily: "JetBrains Mono, monospace", color: overMax ? palette.crimson : palette.ink }}
                  />
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <button
                      onClick={() => spendCreationPoint(k, -1)}
                      disabled={spent <= 0}
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                      style={{ background: spent > 0 ? palette.crimsonDark : "#00000010", color: spent > 0 ? palette.parchment : palette.inkSoft }}
                      title="Refund a Creation Point spent on this stat"
                    >
                      −
                    </button>
                    <span className="text-[9px] w-4" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>{spent}</span>
                    <button
                      onClick={() => spendCreationPoint(k, 1)}
                      disabled={hero.creationPoints <= 0 || spent >= CREATION_POINT_CAP_PER_STAT}
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        background: hero.creationPoints > 0 && spent < CREATION_POINT_CAP_PER_STAT ? palette.forestDark : "#00000010",
                        color: hero.creationPoints > 0 && spent < CREATION_POINT_CAP_PER_STAT ? palette.parchment : palette.inkSoft,
                      }}
                      title={spent >= CREATION_POINT_CAP_PER_STAT ? "Max 10 Creation Points into any one stat" : "Spend a Creation Point on this stat"}
                    >
                      +
                    </button>
                  </div>
                  {max != null && (
                    <div className="text-[9px]" style={{ fontFamily: "JetBrains Mono, monospace", color: overMax ? palette.crimson : palette.inkSoft }}>
                      max {max}
                    </div>
                  )}
                  {isEncumbered && (
                    <div className="text-[10px] font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.crimson }}>
                      eff {v - 10}
                    </div>
                  )}
                  {k === "STR" && damageBonus(v) > 0 && (
                    <div className="text-[9px] font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.crimson }}>
                      DB +{damageBonus(v)}
                    </div>
                  )}
                  {k === "CON" && naturalArmour(v) > 0 && (
                    <div className="text-[9px] font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.forestDark }}>
                      NA +{naturalArmour(v)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Background, Improvement Points, Free Skill, Luck */}
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <label className="text-xs col-span-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Background
              <div className="flex gap-1.5 mt-0.5">
                <select
                  value={hero.background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="flex-1 text-xs rounded px-2 py-1"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  <option value="">None…</option>
                  {BACKGROUNDS_DATA.map((b) => <option key={b.id} value={b.id}>{b.roll}. {b.name}</option>)}
                </select>
                <button onClick={rollBackground} className="px-2 rounded" style={{ background: palette.gold, color: palette.charcoal }}>
                  <Dice5 size={13} />
                </button>
              </div>
            </label>
          </div>

          {backgroundData && (
            <div className="rounded p-2 mb-3" style={{ background: "#5B3A1E11", border: `1px solid #8B6239` }}>
              <p className="text-[10px] mb-1.5" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>{backgroundData.text}</p>

              {backgroundData.reward?.type === "xp" && !hero.backgroundClaimed && (
                <button
                  onClick={() => claimBackgroundReward(backgroundData.reward.amount, backgroundData.reward.note)}
                  className="w-full text-xs px-2 py-1.5 rounded font-semibold"
                  style={{ background: "#8B6239", color: "#fff", fontFamily: "Cinzel, serif" }}
                >
                  Quest Complete — Claim +{backgroundData.reward.amount} XP
                </button>
              )}
              {backgroundData.reward?.type === "item" && !hero.backgroundClaimed && (
                <button
                  onClick={() => claimBackgroundItem(backgroundData.reward)}
                  className="w-full text-xs px-2 py-1.5 rounded font-semibold"
                  style={{ background: "#8B6239", color: "#fff", fontFamily: "Cinzel, serif" }}
                >
                  Quest Complete — Claim {backgroundData.reward.name}
                </button>
              )}
              {backgroundData.reward?.type === "cure" && !hero.backgroundClaimed && (
                <button
                  onClick={claimBackgroundCure}
                  className="w-full text-xs px-2 py-1.5 rounded font-semibold"
                  style={{ background: "#8B6239", color: "#fff", fontFamily: "Cinzel, serif" }}
                >
                  {backgroundData.counterLabel ? `Overcome It (${hero.backgroundCounter}/${backgroundData.counterTarget})` : "Overcome It"}
                </button>
              )}
              {backgroundData.reward?.type === "branch" && !hero.backgroundClaimed && (
                <div className="space-y-1">
                  {backgroundData.reward.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => claimBackgroundBranch(opt)}
                      className="w-full text-xs px-2 py-1.5 rounded font-semibold text-left"
                      style={{ background: "#8B6239", color: "#fff", fontFamily: "Crimson Pro, serif" }}
                    >
                      {opt.label} — +{opt.xp} XP{opt.note ? ` (${opt.note})` : ""}
                    </button>
                  ))}
                </div>
              )}
              {backgroundData.reward?.type === "xpPerKills" && (
                <button
                  onClick={claimBackgroundRepeatable}
                  className="w-full text-xs px-2 py-1.5 rounded font-semibold"
                  style={{ background: "#8B6239", color: "#fff", fontFamily: "Cinzel, serif" }}
                >
                  +1 {backgroundData.reward.counterLabel} ({hero.backgroundCounter % backgroundData.reward.per}/{backgroundData.reward.per} toward +{backgroundData.reward.amount} XP)
                </button>
              )}
              {backgroundData.counterLabel && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>{backgroundData.counterLabel}:</span>
                  <button onClick={() => set({ backgroundCounter: Math.max(0, hero.backgroundCounter - 1) })} className="w-5 h-5 rounded-full text-xs font-bold" style={{ background: "#00000015", color: palette.inkSoft }}>−</button>
                  <span className="text-xs font-bold" style={{ color: palette.ink }}>{hero.backgroundCounter}{backgroundData.counterTarget ? `/${backgroundData.counterTarget}` : ""}</span>
                  <button onClick={() => set({ backgroundCounter: hero.backgroundCounter + 1 })} className="w-5 h-5 rounded-full text-xs font-bold" style={{ background: "#00000015", color: palette.inkSoft }}>+</button>
                </div>
              )}
              {hero.backgroundClaimed && (
                <p className="text-[10px] mt-1.5 font-semibold" style={{ color: "#8B6239", fontFamily: "Crimson Pro, serif" }}>Personal Quest claimed.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 mb-3">

            <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Free Skill (+10)
              <select
                value={hero.freeSkill}
                onChange={(e) => setFreeSkill(e.target.value)}
                className="w-full text-xs rounded px-2 py-1 mt-0.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                <option value="">None…</option>
                {visibleSkills.map((k) => <option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
              </select>
            </label>

            <div className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Creation Points (manual override)
              <div className="mt-0.5">
                <Stepper value={hero.creationPoints} onChange={(v) => set({ creationPoints: v })} min={0} max={15} />
              </div>
            </div>

            <div className="text-xs col-span-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Improvement Points (from levelling)
              <div className="mt-0.5">
                <Stepper value={hero.improvementPoints} onChange={(v) => set({ improvementPoints: v })} min={0} max={999} />
              </div>
            </div>
          </div>

          {IMPROVEMENT_COSTS[hero.profession] ? (
            <div className="rounded p-2 mb-3" style={{ background: "#00000008" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase">Spend Improvement Points</span>
                <span className="text-xs font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.ink }}>{hero.improvementPoints} IP</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {Object.keys(IMPROVEMENT_COSTS[hero.profession]).map((key) => {
                  const cost = ipCostFor(hero, key);
                  const cap = key === "hp" ? IP_HP_CAP_PER_LEVEL : IP_STAT_SKILL_CAP_PER_LEVEL;
                  const spent = hero.ipSpentThisLevel?.[key] || 0;
                  const atCap = spent >= cap;
                  const canAfford = hero.improvementPoints >= cost;
                  const disabled = atCap || !canAfford;
                  const label = key === "hp" ? "Hit Points" : (STAT_KEYS.includes(key) ? key : (SKILL_LABELS[key] || key));
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-1 rounded"
                      style={{ background: disabled && spent === 0 ? "#00000010" : "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                    >
                      <button
                        onClick={() => refundIP(key)}
                        disabled={spent <= 0}
                        className="w-4 h-4 shrink-0 rounded flex items-center justify-center font-bold"
                        style={{ background: spent > 0 ? palette.crimsonDark : "#00000010", color: spent > 0 ? palette.parchment : palette.inkSoft }}
                        title="Refund one point spent on this"
                      >
                        −
                      </button>
                      <button
                        onClick={() => spendIP(key)}
                        disabled={disabled}
                        className="flex-1 min-w-0 flex items-center justify-between gap-1"
                        style={{ color: palette.ink, opacity: disabled ? 0.5 : 1 }}
                        title={atCap ? `Already at the +${cap}/level cap` : !canAfford ? "Not enough IP" : `Spend ${cost} IP for +1`}
                      >
                        <span className="truncate">{label}</span>
                        <span className="shrink-0" style={{ fontFamily: "JetBrains Mono, monospace" }}>{cost}{spent > 0 ? ` (${spent}/${cap})` : ""}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : hero.profession && (
            <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              No official Improvement Point cost table for {hero.profession} (it's not one of the QRS's 8 base professions) — spend the IP counter above manually.
            </p>
          )}

          <p className="text-[10px] mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
            Creation Points: the +/− buttons under each stat (above) spend/refund from the 15-point pool, capped at 10 into any single stat. Improvement Points: +15 each level-up (Level Up also rolls the automatic HP/Luck/Energy gains for the new level) — the buttons below apply the actual increase and enforce the +5/stat-skill and +2/HP per-level caps; cost doubles once a stat/skill has passed 70.
          </p>

          <div className="rounded p-2 mb-3 flex items-center justify-between" style={{ background: "#00000008" }}>
            <div>
              <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }}>MOVEMENT</div>
              <p className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>Starts at 4. The Fast Talent adds +1 automatically.</p>
            </div>
            <Stepper value={hero.movement ?? 4} onChange={(v) => set({ movement: v })} min={0} max={99} />
          </div>

          {/* Skills */}
          <div className="flex items-center justify-between mb-1">
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase">Skills</div>
            {hero.profession && (
              <button
                onClick={recalcSkills}
                className="text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1"
                style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}
                title="Recompute all skills from profession + current stats (keeps your Free Skill bonus)"
              >
                <RotateCcw size={11} /> Recalculate
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {visibleSkills.map((k) => {
              const isFree = hero.freeSkill === k;
              return (
                <div key={k} className="text-center rounded p-1.5 relative" style={{ background: isFree ? "#00000015" : "#00000008", border: isFree ? `1.5px solid ${palette.gold}` : "1.5px solid transparent" }}>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: 9, color: palette.inkSoft }}>
                    {SKILL_LABELS[k]}{isFree && <span style={{ color: palette.gold, fontWeight: "bold" }}> (+10)</span>}
                  </div>
                  <input
                    type="number"
                    value={hero.skills[k]}
                    onChange={(e) => setSkill(k, Number(e.target.value) || 0)}
                    className="w-full text-center bg-transparent font-bold outline-none"
                    style={{ fontFamily: "JetBrains Mono, monospace", color: palette.ink }}
                  />
                  {isEncumbered && (
                    <div className="text-[10px] font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.crimson }}>
                      eff {hero.skills[k] - 10}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Weapon */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase">Weapon</div>
              {hero.weapon.name && (
                <button
                  onClick={clearWeapon}
                  className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                  style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>
            <select
              value=""
              onChange={(e) => e.target.value && pickWeapon(e.target.value)}
              className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}
            >
              <option value="">Pick from table…</option>
              {WEAPONS.map((w) => (
                <option key={w.name} value={w.name}>{w.name} ({w.dmg}, Class {w.class})</option>
              ))}
            </select>
            <input
              value={hero.weapon.name}
              onChange={(e) => setWeapon({ name: e.target.value })}
              placeholder="Name (or pick from table above)"
              className="w-full text-sm font-bold rounded px-2 py-1.5 mb-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Cinzel, serif", color: palette.ink }}
            />
            <div className="flex gap-1.5 flex-wrap">
              <label className="flex items-center gap-1 text-xs" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                DMG
                <input value={hero.weapon.dmg} onChange={(e) => setWeapon({ dmg: e.target.value })}
                  className="w-14 rounded px-1 py-0.5" style={{ border: `1px solid ${palette.line}` }} />
              </label>
              <label className="flex items-center gap-1 text-xs" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                ENC
                <input type="number" value={hero.weapon.enc} onChange={(e) => setWeapon({ enc: Number(e.target.value) || 0 })}
                  className="w-9 rounded px-1 py-0.5" style={{ border: `1px solid ${palette.line}` }} />
              </label>
              <label className="flex items-center gap-1 text-xs" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                DUR
                <input type="number" value={hero.weapon.dur.cur} onChange={(e) => setWeapon({ dur: { ...hero.weapon.dur, cur: Number(e.target.value) || 0 } })}
                  className="w-9 rounded px-1 py-0.5" style={{ border: `1px solid ${palette.line}` }} />
                /
                <input type="number" value={hero.weapon.dur.max} onChange={(e) => setWeapon({ dur: { ...hero.weapon.dur, max: Number(e.target.value) || 0 } })}
                  className="w-9 rounded px-1 py-0.5" style={{ border: `1px solid ${palette.line}` }} />
              </label>
            </div>
            {weaponRef && (
              <div className="text-[10px] mt-1 rounded px-2 py-1" style={{ background: "#00000008", color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                Class {weaponRef.class}{weaponRef.special ? ` · ${weaponRef.special}` : ""} · {weaponRef.cost}c (avail {weaponRef.avail}){weaponRef.reload ? ` · Reload ${weaponRef.reload}` : ""}
                {strReq && (
                  <span style={{ color: strTooWeak ? palette.crimson : palette.inkSoft, fontWeight: strTooWeak ? 700 : 400 }}>
                    {" · "}Requires STR {strReq.oneH ? `${strReq.oneH} (1H) / ` : ""}{strReq.twoH} (2H){strTooWeak ? " — under this hero's STR" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Armour */}
          <div className="mb-2">
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1">Armour</div>
            <p className="text-[10px] mb-1.5 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              A piece covering more than one location (shown in its reference line) is worn once — only count its ENC on one slot.
            </p>
            <div className="space-y-2">
              {[["head", "Head"], ["arms", "Arms"], ["torso", "Torso"], ["legs", "Legs"], ["shield", "Shield"]].map(([loc, label]) => {
                const piece = hero.armour[loc];
                const ref = ARMOUR_AND_SHIELDS.find((a) => a.name === piece.name);
                const options = ARMOUR_AND_SHIELDS.filter((a) => a.covers.includes(loc));
                return (
                  <div key={loc}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="text-xs font-semibold" style={{ fontFamily: "Cinzel, serif", color: palette.inkSoft }}>{label}</div>
                      {piece.name && (
                        <button
                          onClick={() => clearArmourPiece(loc)}
                          className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                          style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}
                        >
                          <X size={11} /> Clear
                        </button>
                      )}
                    </div>
                    <select
                      value=""
                      onChange={(e) => e.target.value && pickArmour(loc, e.target.value)}
                      className="w-full text-xs rounded px-2 py-1 mb-1"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}
                    >
                      <option value="">Pick from table…</option>
                      {options.map((a) => (
                        <option key={a.name} value={a.name}>{a.name} (Def {a.def}, {a.cost}c)</option>
                      ))}
                    </select>
                    <input
                      value={piece.name}
                      onChange={(e) => setArmourPiece(loc, { name: e.target.value })}
                      placeholder="Name (or pick from table above)"
                      className="w-full text-sm font-bold rounded px-2 py-1 mb-1"
                      style={{ border: `1px solid ${palette.line}`, fontFamily: "Cinzel, serif", color: palette.ink, background: "#fff" }}
                    />
                    <div className="flex items-center gap-1.5 text-xs flex-wrap" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                      <label className="flex items-center gap-1" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                        DEF
                        <input type="number" value={piece.def} onChange={(e) => setArmourPiece(loc, { def: Number(e.target.value) || 0 })}
                          className="w-9 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}` }} />
                      </label>
                      <label className="flex items-center gap-1" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                        ENC
                        <input type="number" value={piece.enc} onChange={(e) => setArmourPiece(loc, { enc: Number(e.target.value) || 0 })}
                          className="w-9 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}` }} />
                      </label>
                      <label className="flex items-center gap-1" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                        DUR
                        <input type="number" value={piece.dur.cur} onChange={(e) => setArmourPiece(loc, { dur: { ...piece.dur, cur: Number(e.target.value) || 0 } })}
                          className="w-8 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}` }} />
                        /
                        <input type="number" value={piece.dur.max} onChange={(e) => setArmourPiece(loc, { dur: { ...piece.dur, max: Number(e.target.value) || 0 } })}
                          className="w-8 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}` }} />
                      </label>
                    </div>
                    {ref && (
                      <div className="text-[10px] mt-0.5 rounded px-1.5 py-0.5" style={{ background: "#00000008", color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                        Tier {ref.tier || "—"}{ref.special ? ` · ${ref.special}` : ""} · {ref.cost}c (avail {ref.avail}){ref.covers.length > 1 ? ` · Also covers: ${ref.covers.filter((c) => c !== loc).join(", ")}` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Encumbrance */}
          <div className="rounded p-2 mb-3" style={{ background: isEncumbered ? "#7A1F2B22" : "#00000008" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase">Encumbrance</span>
              <span className="text-sm font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: isEncumbered ? palette.crimson : palette.ink }}>
                {totalEnc} / {carryCapacity} <span style={{ color: palette.inkSoft, fontWeight: "normal" }}>(max {carryCapacity + 15})</span>
              </span>
            </div>
            {backpackEncBonus(hero) > 0 && (
              <p className="text-[10px] mt-0.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                Includes +{backpackEncBonus(hero)} from the {hero.backpackUpgrade} Backpack.
              </p>
            )}
            {isEncumbered && (
              <p className="text-xs mt-1" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif", fontWeight: "bold" }}>
                Overloaded — all skills and stats are at −10 (shown as "eff" above) until ENC drops to {carryCapacity} or below.
              </p>
            )}
          </div>

          {/* Backpack */}
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1">Backpack</div>
          <div className="flex gap-1.5 mb-2">
            {Object.entries(BACKPACK_UPGRADES).map(([key, up]) => (
              <button
                key={key}
                onClick={() => pickBackpackUpgrade(key)}
                className="flex-1 text-[10px] px-1.5 py-1.5 rounded text-center"
                style={{
                  background: (hero.backpackUpgrade || "") === key ? palette.forestDark : "#00000008",
                  color: (hero.backpackUpgrade || "") === key ? palette.parchment : palette.inkSoft,
                  fontFamily: "Crimson Pro, serif",
                  border: `1px solid ${(hero.backpackUpgrade || "") === key ? palette.forestDark : palette.line}`,
                }}
                title={key ? `+${up.enc} ENC capacity, ${up.dexPenalty} DEX, ${up.cost}c` : "No bonus capacity — the free starting backpack"}
              >
                <div className="font-bold">{key || "Small"}</div>
                {key && <div>+{up.enc} ENC, {up.dexPenalty} DEX</div>}
              </button>
            ))}
          </div>
          {GENERAL_EQUIPMENT.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && addFromEquipmentTable(e.target.value)}
              className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}
            >
              <option value="">Add from table…</option>
              <optgroup label="Weapons (spare, not equipped)">
                {WEAPONS.map((w) => (
                  <option key={w.name} value={w.name}>{w.name} — {w.cost}c</option>
                ))}
              </optgroup>
              <optgroup label="Armour & Shields (spare, not equipped)">
                {ARMOUR_AND_SHIELDS.map((a) => (
                  <option key={a.name} value={a.name}>{a.name} — {a.cost}c</option>
                ))}
              </optgroup>
              {["Alchemy", "Consumables", "Jewellery", "Light", "Misc", "Tools"].map((cat) => (
                <optgroup key={cat} label={cat}>
                  {GENERAL_EQUIPMENT.filter((i) => i.category === cat).map((i) => (
                    <option key={i.name} value={i.name}>{i.name} — {i.cost}c</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          <p className="text-[10px] mb-1.5 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Adds a spare — tap the sword icon on a weapon/armour row below to actually equip it (swaps whatever's currently worn back into the backpack).
          </p>
          <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            <span className="font-semibold" style={{ color: palette.ink }}>Quick Slots: {quickSlotUsed}/{quickSlotMax}</span> — tap Q/B on an item to move it (2 AP). {quickSlotMax > 3 ? "Capacity raised by an owned Combat Harness/Extended Battle Belt." : "Base 3; a Combat Harness or Extended Battle Belt raises this."}
          </p>
          {backpackFeedback && (
            <p className="text-[10px] mb-1.5 font-semibold" style={{ color: backpackFeedback.tone === "good" ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>
              {backpackFeedback.text}
            </p>
          )}
          <div className="rounded overflow-hidden mb-1.5" style={{ border: `1px solid ${palette.line}` }}>
            {hero.backpack.length === 0 && (
              <p className="text-xs px-2 py-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>Empty.</p>
            )}
            {hero.backpack.map((item, idx) => (
              <div key={item.id} className="p-1.5" style={{ background: idx % 2 ? "#00000006" : "transparent", borderTop: idx > 0 ? `1px solid ${palette.line}55` : "none" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <button
                    onClick={() => moveSlot(item)}
                    className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: item.slot === "quickslot" ? palette.gold : "#00000010", color: item.slot === "quickslot" ? palette.charcoal : palette.inkSoft }}
                    title={item.slot === "quickslot" ? "In a Quick Slot — tap to move to Backpack (2 AP)" : "In the Backpack — tap to move to a Quick Slot (2 AP)"}
                  >
                    {item.slot === "quickslot" ? "Q" : "B"}
                  </button>
                  <input
                    value={item.name}
                    onChange={(e) => updateBackpackItem(item.id, { name: e.target.value })}
                    placeholder="Item name"
                    className="flex-1 min-w-0 text-sm font-bold rounded px-2 py-1"
                    style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Cinzel, serif", color: palette.ink }}
                  />
                  {isEquippable(item) && (
                    <button onClick={() => equipFromBackpack(item)} className="w-6 h-6 shrink-0 flex items-center justify-center" style={{ color: palette.forestDark }} title={`Equip ${item.name}`}>
                      <Swords size={14} />
                    </button>
                  )}
                  <button onClick={() => removeBackpackItem(item.id)} className="w-6 h-6 shrink-0 flex items-center justify-center" style={{ color: palette.crimson }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pl-[30px]">
                  <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                    Val
                    <input
                      value={item.value}
                      onChange={(e) => updateBackpackItem(item.id, { value: e.target.value })}
                      className="w-12 rounded px-1 py-0.5"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                    ENC
                    <input
                      value={item.enc}
                      onChange={(e) => updateBackpackItem(item.id, { enc: e.target.value })}
                      className="w-10 rounded px-1 py-0.5"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                    Dur
                    <input
                      value={item.dur}
                      onChange={(e) => updateBackpackItem(item.id, { dur: e.target.value })}
                      className="w-12 rounded px-1 py-0.5"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addBackpackItem}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded font-semibold mb-3"
            style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
          >
            <Plus size={13} /> Add Custom Item
          </button>

          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1">Comments</div>
          <textarea
            value={hero.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Quick notes…"
            className="w-full text-xs rounded px-2 py-1 mt-1"
            rows={2}
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          />

          {(hero.talents.length > 0 || hero.perks.length > 0 || hero.spells.length > 0 || hero.prayers.length > 0 || hero.specialRules.length > 0) && (
            <div className="mt-2">
              <AttachedItemList
                label="Talents"
                names={hero.talents}
                dataset={TALENTS}
                color={palette.forestDark}
                groupKey={(i) => i.type}
                effects={TALENT_EFFECTS}
                onRemove={(t) => {
                  const reversePatch = talentEffectPatch(hero, t, -1);
                  set({ talents: hero.talents.filter((x) => x !== t), ...reversePatch });
                  if (TALENT_EFFECTS[t]) addLog && addLog(`${hero.name}: removed Talent "${t}" (${TALENT_EFFECTS[t].label} reversed).`);
                }}
              />
              <AttachedItemList label="Perks" names={hero.perks} dataset={PERKS} color={palette.gold} groupKey={(i) => i.type} onRemove={(t) => set({ perks: hero.perks.filter((x) => x !== t) })} />
              <AttachedItemList label="Spells" names={hero.spells} dataset={SPELLS} color="#5B6FA8" groupKey={(i) => i.school} onRemove={(t) => set({ spells: hero.spells.filter((x) => x !== t) })} />
              <AttachedItemList label="Prayers" names={hero.prayers} dataset={PRAYERS} color={palette.crimson} groupKey={(i) => `Level ${i.lvl}`} onRemove={(t) => set({ prayers: hero.prayers.filter((x) => x !== t) })} />
              <AttachedItemList label="Special Rules" names={hero.specialRules} dataset={SPECIAL_RULES} color={palette.ember} groupKey={(i) => i.type} onRemove={(t) => set({ specialRules: hero.specialRules.filter((x) => x !== t) })} />
            </div>
          )}
        </div>
    </Panel>
  );
}

// ---------- Party Panel (Threat / Morale / Food / Coins) ----------
const MAPS = [
  { key: "known-world", title: "The Known World", src: "/maps/known-world.jpg" },
  { key: "silver-city-area", title: "Silver City Area", src: "/maps/silver-city-area.jpg" },
  { key: "silver-city-detailed", title: "Silver City (Detailed)", src: "/maps/silver-city-detailed.jpg" },
];

// Full-screen map viewer. Native pinch-zoom works here (the app's viewport meta doesn't
// disable it), and the +/- buttons give a reliable fallback: they resize the image inside
// a scrollable container, so panning is just native touch/drag scrolling.
function MapViewer({ map, onClose }) {
  const [zoom, setZoom] = useState(100);
  if (!map) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A0806" }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: palette.charcoal, borderBottom: `2px solid ${palette.gold}` }}>
        <span style={{ fontFamily: "Cinzel, serif", color: palette.goldSoft }} className="text-sm font-bold">
          {map.title}
        </span>
        <button onClick={onClose} className="p-1 rounded" style={{ color: palette.parchment }}>
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <img
          src={map.src}
          alt={map.title}
          style={{ width: `${zoom}%`, maxWidth: "none", display: "block" }}
        />
      </div>
      <div className="flex items-center justify-center gap-3 px-4 py-3 shrink-0" style={{ background: palette.charcoal, borderTop: `1px solid ${palette.gold}` }}>
        <button
          onClick={() => setZoom((z) => Math.max(50, z - 50))}
          className="px-3 py-2 rounded font-bold text-sm"
          style={{ background: palette.panel, color: palette.ink }}
        >
          <Minus size={16} />
        </button>
        <span className="text-xs w-12 text-center" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.parchment }}>
          {zoom}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(400, z + 50))}
          className="px-3 py-2 rounded font-bold text-sm"
          style={{ background: palette.panel, color: palette.ink }}
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => setZoom(100)}
          className="px-3 py-2 rounded text-xs font-semibold ml-2"
          style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function SettlementTab({ party, setParty, heroes, updateHero, addLog }) {
  const [eventResult, setEventResult] = useState(null);
  const [eventResolution, setEventResolution] = useState(null);
  const [questResult, setQuestResult] = useState(null);
  const [activityHero, setActivityHero] = useState(heroes[0]?.id || "");
  const [activityChoice, setActivityChoice] = useState(SETTLEMENT_ACTIVITIES[0].name);
  const [openMap, setOpenMap] = useState(null);
  const [restResult, setRestResult] = useState(null);
  const [sellKey, setSellKey] = useState("");
  const [sellPrice, setSellPrice] = useState(0);
  const [sellLostDur, setSellLostDur] = useState(0);
  const [sellMaxDur, setSellMaxDur] = useState(6);
  const [sellResult, setSellResult] = useState(null);
  const [repairKey, setRepairKey] = useState("");
  const [repairPrice, setRepairPrice] = useState(0);
  const [repairPoints, setRepairPoints] = useState(1);
  const [repairResult, setRepairResult] = useState(null);
  const [resolverActivity, setResolverActivity] = useState("Pray");
  const resolvePanelRef = useRef(null);
  const jumpToResolver = (name) => {
    setResolverActivity(name);
    setResolverResult(null);
    resolvePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const settlementActivityFor = (resolverName) => SETTLEMENT_ACTIVITIES.find((a) => a.resolverName === resolverName);
  const logResolverAP = () => {
    const match = settlementActivityFor(resolverActivity);
    if (!match || !resolvedHero) return;
    setParty((prev) => {
      const cur = prev.settlementAP?.[resolvedHero.id] || { spent: 0, log: [] };
      return {
        ...prev,
        settlementAP: {
          ...(prev.settlementAP || {}),
          [resolvedHero.id]: { spent: cur.spent + match.ap, log: [...cur.log, { name: match.name, ap: match.ap }] },
        },
      };
    });
  };
  const [resolverHero, setResolverHero] = useState("");
  const [resolverTemple, setResolverTemple] = useState("");
  const [resolverOhlnirChoice, setResolverOhlnirChoice] = useState("CS");
  const [resolverBet, setResolverBet] = useState(50);
  const [resolverArenaLevel, setResolverArenaLevel] = useState("Group");
  const [resolverDrinkAle, setResolverDrinkAle] = useState(false);
  const [resolverBank, setResolverBank] = useState("");
  const [resolverConditionId, setResolverConditionId] = useState("");
  const [resolverBankAmount, setResolverBankAmount] = useState(100);
  const [resolverResult, setResolverResult] = useState(null);
  // Tracks opted-OUT heroes rather than opted-in, so heroes added later still default to selected.
  const [restExcluded, setRestExcluded] = useState(() => new Set());

  const settlement = SETTLEMENTS.find((s) => s.name === party.settlementName);
  const isSilverCity = party.settlementName === "Silver City";
  const currentActivityHero = heroes.some((h) => h.id === activityHero) ? activityHero : (heroes[0]?.id || "");
  // Every settlement has an Inn (each just lists its own price) even though it's not in
  // the "Available Services" bullet list, so Inn-based activities are always on offer.
  const availableActivities = SETTLEMENT_ACTIVITIES.filter(
    (a) => !settlement || a.locations.some((loc) => loc === "Any" || loc === "Inn" || settlement.services.includes(loc))
  );
  const selectedActivity = availableActivities.find((a) => a.name === activityChoice) || availableActivities[0];

  const setSettlementName = (name) => {
    const s = SETTLEMENTS.find((x) => x.name === name);
    setParty({ ...party, settlementName: name, innCostPerNight: s ? s.innCost : party.innCostPerNight });
    setEventResult(null);
    setQuestResult(null);
    if (s) setActivityChoice(SETTLEMENT_ACTIVITIES.find((a) => a.locations.some((loc) => loc === "Any" || loc === "Inn" || s.services.includes(loc)))?.name || SETTLEMENT_ACTIVITIES[0].name);
  };

  const rollEvent = () => {
    if (!settlement) return;
    setEventResolution(null);
    const roll = rollDie(12);
    const [lo, hi] = settlement.eventOn;
    const triggered = roll >= lo && roll <= hi;
    if (triggered) {
      const roll2 = rollDie(12);
      const event = SETTLEMENT_EVENTS[roll2 - 1];
      setEventResult({ roll, triggered, roll2, event });
      addLog(`${settlement.name}: entry roll ${roll} (needs ${lo}-${hi}) → Event! (${roll2}) ${event.title} — ${event.text}`);
    } else {
      setEventResult({ roll, triggered, roll2: null, event: null });
      addLog(`${settlement.name}: entry roll ${roll} (needs ${lo}-${hi}) → quiet, no event.`);
    }
  };

  const resolveEvent = () => {
    const event = eventResult?.event;
    if (!event || !event.resolve) return;
    if (event.resolve === "thief") {
      const amt = rollPercent();
      const newCoins = Math.max(0, party.coins - amt);
      setParty((prev) => ({ ...prev, coins: Math.max(0, prev.coins - amt) }));
      const line = `Rolled ${amt} → ${amt}c stolen. Coins now ${newCoins}.`;
      setEventResolution([line]);
      addLog(`Thief: ${line}`);
    } else if (event.resolve === "feast") {
      const roll = rollDie(12);
      if (roll <= 8) {
        setParty((prev) => ({ ...prev, morale: prev.morale + 2 }));
        const line = `Beds available (rolled ${roll}) → Party Morale +2.`;
        setEventResolution([line]);
        addLog(`Settlement Feast: ${line}`);
      } else {
        const line = `No beds available (rolled ${roll}) → business skipped this stop, no morale bonus.`;
        setEventResolution([line]);
        addLog(`Settlement Feast: ${line}`);
      }
    } else if (event.resolve === "scrolls") {
      const shuffled = [...SPELLS].sort(() => Math.random() - 0.5).slice(0, 3);
      const lines = shuffled.map((s) => `${s.name} (Lvl ${s.lvl}, ${s.school}) — 100c`);
      setEventResolution(lines);
      addLog(`Scrolls Salesman offers: ${shuffled.map((s) => s.name).join(", ")} (100c each).`);
    } else if (event.resolve === "assassination") {
      if (heroes.length === 0) return;
      const banditCount = rollDie(4);
      const target = heroes[Math.floor(Math.random() * heroes.length)];
      const line = `${banditCount} bandit${banditCount === 1 ? "" : "s"} ambush ${target.name}. Fight it out on the city tile — heroes are nursed to 1 HP instead of dying, not killed.`;
      setEventResolution([line]);
      addLog(`Assassination Attempt: ${line}`);
    } else if (event.resolve === "curse") {
      const roll = rollDie(10);
      const curse = CURSES_TABLE.find((c) => c.roll === roll);
      let effect = curse.effect;
      let detail = curse.text;
      if (effect === "randomSkill") {
        const key = Object.keys(SKILL_LABELS)[Math.floor(Math.random() * Object.keys(SKILL_LABELS).length)];
        effect = { skill: key, amount: -5 };
        detail = `${SKILL_LABELS[key]} -5`;
      }
      heroes.forEach((h) => {
        updateHero({ ...h, ...addTempEffect(h, `Curse: ${detail}`, effect) });
      });
      const line = `Rolled ${roll} → ${detail}. Applied to all ${heroes.length} hero${heroes.length === 1 ? "" : "es"} — see Temporary Effects on each hero's card to clear it after the next dungeon.`;
      setEventResolution([line]);
      addLog(`Curse!: rolled ${roll} → ${detail} (applied to all heroes until next dungeon exit).`);
    } else if (event.resolve === "sidequest") {
      const roll = rollDie(6);
      const quest = SIDE_QUESTS[roll - 1];
      const line = `Rolled ${roll} → "${quest}". Check the Quest Book for details, then decide whether to add it to the current quest.`;
      setEventResolution([line]);
      addLog(`Side Quest: rolled ${roll} → "${quest}".`);
    }
  };

  const rollQuests = () => {
    if (!settlement) return;
    const roll = rollDie(6);
    const row = QUEST_AVAILABILITY.find((r) => roll >= r.roll[0] && roll <= r.roll[1]);
    const text = isSilverCity ? row.silverCity : row.settlement;
    let side = null;
    let sideQuestName = null;
    if (text !== "-") {
      const roll8 = rollDie(8);
      side = roll8 <= 2;
      if (side) sideQuestName = SIDE_QUESTS[rollDie(6) - 1];
      setQuestResult({ roll, text, roll8, side, sideQuestName });
      addLog(`${settlement.name}: quests roll ${roll} → ${text}. Side-quest check (${roll8}) → ${side ? `side quest available: "${sideQuestName}"` : "no side quest"}.`);
    } else {
      setQuestResult({ roll, text, roll8: null, side: null, sideQuestName: null });
      addLog(`${settlement.name}: quests roll ${roll} → no quests available here.`);
    }
  };

  const heroAP = (heroId) => party.settlementAP?.[heroId] || { spent: 0, log: [] };

  const addActivity = () => {
    if (!currentActivityHero) return;
    const activity = availableActivities.find((a) => a.name === activityChoice);
    const hero = heroes.find((h) => h.id === currentActivityHero);
    if (!activity || !hero) return;
    const cur = heroAP(currentActivityHero);
    const nextAP = {
      ...(party.settlementAP || {}),
      [currentActivityHero]: { spent: cur.spent + activity.ap, log: [...cur.log, { name: activity.name, ap: activity.ap }] },
    };
    setParty({ ...party, settlementAP: nextAP });
    addLog(`${hero.name}: ${activity.name} (${activity.ap} AP)${activity.note ? ` — ${activity.note}` : ""}`);
  };

  const undoLastActivity = (heroId) => {
    const cur = heroAP(heroId);
    if (cur.log.length === 0) return;
    const removed = cur.log[cur.log.length - 1];
    const nextAP = {
      ...(party.settlementAP || {}),
      [heroId]: { spent: cur.spent - removed.ap, log: cur.log.slice(0, -1) },
    };
    setParty({ ...party, settlementAP: nextAP });
  };

  const clearVisit = () => {
    setParty({ ...party, settlementAP: {} });
    setEventResult(null);
    setQuestResult(null);
    addLog(`${party.settlementName || "Settlement"}: AP ledger cleared for a fresh visit.`);
  };

  const toggleRestHero = (id) => {
    setRestExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const restAtInn = () => {
    const selected = heroes.filter((h) => !restExcluded.has(h.id));
    if (selected.length === 0) return;
    const canAfford = party.innCostPerNight <= party.coins;
    const summary = [];
    selected.forEach((hero) => {
      let newHp, newMana, newEnergy, newLuck;
      if (canAfford) {
        const roll = rollDie(6) + rollDie(6);
        newHp = Math.min(hero.hp.max, hero.hp.cur + roll);
        newMana = hero.mana.max;
        newEnergy = hero.energy.max;
        newLuck = hero.luck.max;
        summary.push(`${hero.name}: +${roll} HP (${newHp}/${hero.hp.max}), Mana/Luck/Energy refilled`);
        addLog(`${hero.name} rests at the inn: +${roll} HP (${newHp}/${hero.hp.max}), Mana/Luck/Energy refilled.`);
      } else {
        // Can't afford it — free fallback per the rulebook: sleep in the stable instead.
        // 1d6 HP (not 2d6), and only half (rounded down) of the Mana/Luck/Energy deficit.
        const roll = rollDie(6);
        newHp = Math.min(hero.hp.max, hero.hp.cur + roll);
        newMana = hero.mana.cur + Math.floor((hero.mana.max - hero.mana.cur) / 2);
        newEnergy = hero.energy.cur + Math.floor((hero.energy.max - hero.energy.cur) / 2);
        newLuck = hero.luck.cur + Math.floor((hero.luck.max - hero.luck.cur) / 2);
        summary.push(`${hero.name}: slept in the stable (couldn't afford the inn) — +${roll} HP (${newHp}/${hero.hp.max}), half Mana/Luck/Energy regained`);
        addLog(`${hero.name} couldn't afford the inn, slept in the stable: +${roll} HP, half Mana/Luck/Energy regained.`);
      }
      updateHero(hero.id, {
        ...hero,
        hp: { ...hero.hp, cur: newHp },
        mana: { ...hero.mana, cur: newMana },
        energy: { ...hero.energy, cur: newEnergy },
        luck: { ...hero.luck, cur: newLuck },
      });
    });
    if (canAfford && party.innCostPerNight > 0) {
      setParty((prev) => ({ ...prev, coins: prev.coins - prev.innCostPerNight }));
      summary.push(`Paid ${party.innCostPerNight}c for the inn.`);
      addLog(`Paid ${party.innCostPerNight}c for the inn (whole party).`);
    } else if (!canAfford) {
      summary.push(`Couldn't afford the ${party.innCostPerNight}c inn cost — the party must leave the settlement in the morning.`);
      addLog(`Party couldn't afford the ${party.innCostPerNight}c inn cost — must leave the settlement in the morning.`);
    }
    setRestResult({ ok: true, lines: summary });
  };

  // Real, currently-owned items the party can sell/repair — sourced from each hero's
  // equipped weapon, named armour pieces, and named backpack items. Selling requires
  // picking one of these (rather than a free-standing price field) and removes it from
  // the hero afterward, so it can't be sold twice.
  const sellableItems = [];
  heroes.forEach((h) => {
    if (h.weapon && h.weapon.name) {
      const ref = WEAPONS.find((w) => w.name === h.weapon.name);
      sellableItems.push({
        key: `${h.id}:weapon`,
        label: `${h.name} — Weapon: ${h.weapon.name}`,
        heroId: h.id,
        kind: "weapon",
        defaultPrice: ref ? ref.cost : 0,
        defaultLost: Math.max(0, (h.weapon.dur.max || 0) - (h.weapon.dur.cur || 0)),
        defaultMax: h.weapon.dur.max || 6,
      });
    }
    ["head", "arms", "torso", "legs", "shield"].forEach((loc) => {
      const piece = h.armour[loc];
      if (piece && piece.name) {
        const ref = ARMOUR_AND_SHIELDS.find((a) => a.name === piece.name);
        sellableItems.push({
          key: `${h.id}:armour:${loc}`,
          label: `${h.name} — ${loc[0].toUpperCase()}${loc.slice(1)}: ${piece.name}`,
          heroId: h.id,
          kind: "armour",
          loc,
          defaultPrice: ref ? ref.cost : 0,
          defaultLost: Math.max(0, (piece.dur.max || 0) - (piece.dur.cur || 0)),
          defaultMax: piece.dur.max || 6,
        });
      }
    });
    (h.backpack || []).forEach((item) => {
      if (item.name) {
        sellableItems.push({
          key: `${h.id}:backpack:${item.id}`,
          label: `${h.name} — ${item.name}`,
          heroId: h.id,
          kind: "backpack",
          itemId: item.id,
          defaultPrice: Number(item.value) || 0,
          defaultLost: 0,
          defaultMax: 6,
        });
      }
    });
  });
  const selectedSellItem = sellableItems.find((i) => i.key === sellKey) || null;

  const pickSellItem = (key) => {
    setSellKey(key);
    setSellResult(null);
    const item = sellableItems.find((i) => i.key === key);
    if (item) {
      setSellPrice(item.defaultPrice);
      setSellLostDur(item.defaultLost);
      setSellMaxDur(item.defaultMax);
    }
  };

  const doSell = () => {
    const item = selectedSellItem;
    if (!item) {
      setSellResult({ ok: false, line: "Pick an item the party actually has first." });
      return;
    }
    if (sellPrice < 10) {
      setSellResult({ ok: false, line: "Items worth less than 10c cannot be sold." });
      return;
    }
    if (sellLostDur >= sellMaxDur) {
      setSellResult({ ok: false, line: "Can't sell an item that has lost all its durability." });
      return;
    }
    const value = sellValue(sellPrice, sellLostDur);
    const hero = heroes.find((h) => h.id === item.heroId);
    if (!hero) return;
    if (item.kind === "weapon") {
      updateHero({ ...hero, weapon: { name: "", dmg: "", enc: 0, dur: { cur: 6, max: 6 } } });
    } else if (item.kind === "armour") {
      updateHero({ ...hero, armour: { ...hero.armour, [item.loc]: { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 } } } });
    } else {
      updateHero({ ...hero, backpack: hero.backpack.filter((it) => it.id !== item.itemId) });
    }
    setParty((prev) => ({ ...prev, coins: prev.coins + value }));
    setSellResult({ ok: true, line: `Sold ${item.label.split(" — ")[1]} for ${value}c (party now has ${party.coins + value}c).` });
    addLog(`Sold ${item.label} for ${value}c (${sellPrice}c base, ${sellLostDur} durability lost).`);
    setSellKey("");
  };

  // Equipped weapons and worn armour both have real cur/max durability to repair —
  // backpack items store a single free-text durability field, so there's nothing
  // structured to restore there yet.
  const repairableItems = [];
  heroes.forEach((h) => {
    if (h.weapon && h.weapon.name && h.weapon.dur.cur < h.weapon.dur.max) {
      const ref = WEAPONS.find((w) => w.name === h.weapon.name);
      repairableItems.push({
        key: `${h.id}:weapon`,
        label: `${h.name} — Weapon: ${h.weapon.name} (${h.weapon.dur.cur}/${h.weapon.dur.max})`,
        heroId: h.id,
        kind: "weapon",
        defaultPrice: ref ? ref.cost : 0,
        maxPoints: h.weapon.dur.max - h.weapon.dur.cur,
      });
    }
    ["head", "arms", "torso", "legs", "shield"].forEach((loc) => {
      const piece = h.armour[loc];
      if (piece && piece.name && piece.dur.cur < piece.dur.max) {
        const ref = ARMOUR_AND_SHIELDS.find((a) => a.name === piece.name);
        repairableItems.push({
          key: `${h.id}:armour:${loc}`,
          label: `${h.name} — ${loc[0].toUpperCase()}${loc.slice(1)}: ${piece.name} (${piece.dur.cur}/${piece.dur.max})`,
          heroId: h.id,
          kind: "armour",
          loc,
          defaultPrice: ref ? ref.cost : 0,
          maxPoints: piece.dur.max - piece.dur.cur,
        });
      }
    });
  });
  const selectedRepairItem = repairableItems.find((i) => i.key === repairKey) || null;

  const pickRepairItem = (key) => {
    setRepairKey(key);
    setRepairResult(null);
    const item = repairableItems.find((i) => i.key === key);
    if (item) {
      setRepairPrice(item.defaultPrice);
      setRepairPoints(Math.min(1, item.maxPoints) || 1);
    }
  };

  const doRepair = () => {
    const item = selectedRepairItem;
    if (!item) {
      setRepairResult({ ok: false, line: "Pick a damaged weapon or armour piece the party actually has first." });
      return;
    }
    const points = Math.min(repairPoints, item.maxPoints);
    const perPoint = repairCostPerPoint(repairPrice);
    const total = perPoint * points;
    if (total > party.coins) {
      setRepairResult({ ok: false, line: `Can't afford it: repairing ${points} point${points === 1 ? "" : "s"} costs ${total}c, party only has ${party.coins}c.` });
      return;
    }
    const hero = heroes.find((h) => h.id === item.heroId);
    if (!hero) return;
    let itemName, newCur, maxDur;
    if (item.kind === "weapon") {
      newCur = Math.min(hero.weapon.dur.max, hero.weapon.dur.cur + points);
      maxDur = hero.weapon.dur.max;
      itemName = hero.weapon.name;
      updateHero({ ...hero, weapon: { ...hero.weapon, dur: { ...hero.weapon.dur, cur: newCur } } });
    } else {
      const piece = hero.armour[item.loc];
      newCur = Math.min(piece.dur.max, piece.dur.cur + points);
      maxDur = piece.dur.max;
      itemName = piece.name;
      updateHero({ ...hero, armour: { ...hero.armour, [item.loc]: { ...piece, dur: { ...piece.dur, cur: newCur } } } });
    }
    setParty((prev) => ({ ...prev, coins: prev.coins - total }));
    setRepairResult({ ok: true, line: `Repaired ${points} point${points === 1 ? "" : "s"} on ${itemName} for ${total}c (now ${newCur}/${maxDur}). Party now has ${party.coins - total}c.` });
    addLog(`Repaired ${points} durability point${points === 1 ? "" : "s"} on ${hero.name}'s ${itemName} for ${total}c.`);
    setRepairKey("");
  };

  const resolvedHero = heroes.find((h) => h.id === resolverHero) || heroes[0];
  const templeOptions = !settlement || !settlement.temples || settlement.temples === "All"
    ? Object.keys(TEMPLE_BOONS)
    : settlement.temples.split(", ");

  const resolveActivity = () => {
    if (!resolvedHero) return;
    let succeeded = false;
    if (resolverActivity === "Pray") {
      if (!resolverTemple) { setResolverResult({ ok: false, lines: ["Pick a temple first."] }); return; }
      if (party.coins < 50) { setResolverResult({ ok: false, lines: ["Can't afford the 50c offering."] }); return; }
      setParty((prev) => ({ ...prev, coins: prev.coins - 50 }));
      const roll = rollDie(6);
      if (roll > 3) {
        setResolverResult({ ok: true, lines: [`Rolled ${roll} — ${resolverTemple} doesn't answer this time. (Paid 50c.)`] });
        succeeded = true;
        addLog(`${resolvedHero.name} prays at the Temple of ${resolverTemple}: no answer (rolled ${roll}).`);
        logResolverAP();
        return;
      }
      const boon = TEMPLE_BOONS[resolverTemple];
      let effect;
      let line = boon.label;
      if (boon.kind === "stat") {
        effect = { stat: boon.stat, amount: boon.amount };
      } else if (boon.kind === "hp") {
        effect = { hp: boon.amount };
      } else if (boon.kind === "luck") {
        effect = { luck: boon.amount };
      } else if (boon.kind === "energy") {
        effect = { energy: boon.amount };
      } else if (boon.kind === "choice") {
        const skillKey = resolverOhlnirChoice === "CS" ? "cs" : "rs";
        effect = { skill: skillKey, amount: boon.amount };
        line = `+5 ${resolverOhlnirChoice}`;
      }
      updateHero({ ...resolvedHero, ...addTempEffect(resolvedHero, `${resolverTemple}: ${line}`, effect) });
      setResolverResult({ ok: true, lines: [`Rolled ${roll} — ${resolverTemple} answers! ${line} applied — see Temporary Effects on ${resolvedHero.name}'s card to clear it after the next dungeon. (Paid 50c.)`] });
      succeeded = true;
      addLog(`${resolvedHero.name} prays at the Temple of ${resolverTemple}: success (${roll}). ${line}.`);
    } else if (resolverActivity === "Fortune Teller") {
      if (party.coins < 50) { setResolverResult({ ok: false, lines: ["Can't afford the 50c fee."] }); return; }
      setParty((prev) => ({ ...prev, coins: prev.coins - 50 }));
      const roll = rollDie(6);
      const entry = FORTUNE_TELLER_TABLE.find((e) => e.roll === roll);
      let line = `Rolled ${roll} — ${entry.text}`;
      if (roll === 1) {
        updateHero({ ...resolvedHero, ...addTempEffect(resolvedHero, "Fortune: treat one enemy hit as a miss (next quest)", null) });
        line += ` — added as a reminder to ${resolvedHero.name}'s Temporary Effects.`;
      } else if (roll === 6) {
        const curseRoll = rollDie(10);
        const curse = CURSES_TABLE.find((c) => c.roll === curseRoll);
        let effect = curse.effect;
        let detail = curse.text;
        if (effect === "randomSkill") {
          const key = Object.keys(SKILL_LABELS)[Math.floor(Math.random() * Object.keys(SKILL_LABELS).length)];
          effect = { skill: key, amount: -5 };
          detail = `${SKILL_LABELS[key]} -5`;
        }
        updateHero({ ...resolvedHero, ...addTempEffect(resolvedHero, `Curse: ${detail}`, effect) });
        line += ` Curse roll: ${curseRoll} → ${detail} — applied, see Temporary Effects on ${resolvedHero.name}'s card to clear it after the next dungeon.`;
      }
      setResolverResult({ ok: true, lines: [line] });
      succeeded = true;
      addLog(`${resolvedHero.name} visits the Fortune Teller: ${line}`);
    } else if (resolverActivity === "Gambling") {
      const bet = Math.max(50, Math.min(500, resolverBet));
      if (party.coins < bet) { setResolverResult({ ok: false, lines: [`Can't afford a ${bet}c bet.`] }); return; }
      const raw = rollDie(10);
      const luckBonus = resolvedHero.luck.cur;
      const modified = raw === 10 ? 10 : Math.max(1, raw - luckBonus);
      const row = GAMBLING_TABLE.find((r) => modified <= r.max);
      const winnings = Math.floor(bet * row.mult);
      const net = winnings - bet - row.extra;
      setParty((prev) => ({ ...prev, coins: prev.coins + net }));
      const line = `Bet ${bet}c. Rolled ${raw}${luckBonus > 0 && raw !== 10 ? ` (-${luckBonus} Luck → ${modified})` : ""} — ${row.label} Net ${net >= 0 ? "+" : ""}${net}c.`;
      setResolverResult({ ok: true, lines: [line] });
      succeeded = true;
      addLog(`${resolvedHero.name} gambles: ${line}`);
    } else if (resolverActivity === "Horse Racing") {
      const bet = Math.max(50, Math.min(300, resolverBet));
      if (party.coins < bet) { setResolverResult({ ok: false, lines: [`Can't afford ${bet}c (includes the 50c entry).`] }); return; }
      const dex = Number(resolvedHero.stats.DEX) || 0;
      const roll = rollDie(100);
      setParty((prev) => ({ ...prev, coins: prev.coins - bet }));
      if (roll >= 95) {
        const hpLoss = rollDie(6);
        updateHero({ ...resolvedHero, hp: { ...resolvedHero.hp, cur: Math.max(0, resolvedHero.hp.cur - hpLoss) }, sanity: { ...resolvedHero.sanity, cur: Math.max(0, resolvedHero.sanity.cur - 1) } });
        const line = `Rolled ${roll} — Catastrophe strikes! Lost the horse (remove it manually), -${hpLoss} HP, -1 Sanity. Bet (${bet}c) lost.`;
        setResolverResult({ ok: true, lines: [line] });
        succeeded = true;
        addLog(`${resolvedHero.name} races a horse: ${line}`);
        logResolverAP();
        return;
      }
      const place = roll <= Math.floor(dex / 2) ? "first" : roll <= dex - 10 ? "second" : null;
      if (!place) {
        const line = `Rolled ${roll} (DEX ${dex}) — you lose. Bet (${bet}c) lost.`;
        setResolverResult({ ok: true, lines: [line] });
        succeeded = true;
        addLog(`${resolvedHero.name} races a horse: ${line}`);
        logResolverAP();
        return;
      }
      const level = Math.min(10, Math.max(1, resolvedHero.level));
      const mult = HORSE_RACE_MULTIPLIERS[level][place];
      const winnings = Math.floor(bet * mult);
      const extraRoll = rollDie(10);
      const extraRow = HORSE_EXTRA_PRIZE[place].find((r) => extraRoll <= r.max);
      setParty((prev) => ({ ...prev, coins: prev.coins + winnings }));
      const lines = [`Rolled ${roll} (DEX ${dex}) — ${place === "first" ? "1st place!" : "2nd place!"} Won ${winnings}c (x${mult}).`];
      if (extraRow.prize) lines.push(`Extra prize roll (${extraRoll}): 1 ${extraRow.prize}!`);
      setResolverResult({ ok: true, lines });
      succeeded = true;
      addLog(`${resolvedHero.name} races a horse: ${lines.join(" ")}`);
    } else if (resolverActivity === "Arena Fighting") {
      const fee = Math.max(50, Math.min(200, resolverBet));
      // The entry fee covers all three brackets ("you pay once to attend all three
      // levels") — only charge it on the Group round; Semi/Final assume it's already
      // paid, but still use the same fee as the payout base for that bracket's multiplier.
      const payingNow = resolverArenaLevel === "Group";
      if (payingNow && party.coins < fee) { setResolverResult({ ok: false, lines: [`Can't afford the ${fee}c entry.`] }); return; }
      const cs = Number(resolvedHero.skills.cs) || 0;
      const hpMod = ARENA_HP_MOD(resolvedHero.hp.max);
      const strMod = ARENA_STR_MOD(Number(resolvedHero.stats.STR) || 0);
      const levelMod = ARENA_LEVEL_MOD[resolverArenaLevel];
      const target = cs + hpMod + strMod + levelMod;
      const roll = rollDie(100);
      const win = roll <= target;
      if (payingNow) setParty((prev) => ({ ...prev, coins: prev.coins - fee }));
      const lines = [`${resolverArenaLevel} bracket — target ${target} (CS ${cs}, HP mod ${hpMod >= 0 ? "+" : ""}${hpMod}, STR mod ${strMod >= 0 ? "+" : ""}${strMod}, level mod ${levelMod}). Rolled ${roll} — ${win ? "Win!" : "Lose."}`];
      if (payingNow) lines.push(`Paid ${fee}c entry (covers all three brackets).`);
      const heroLevel = Math.min(10, Math.max(1, resolvedHero.level));
      if (win) {
        const mult = ARENA_WIN_MULTIPLIER[heroLevel][resolverArenaLevel];
        const winnings = Math.floor(fee * mult);
        const xpGain = ARENA_WIN_XP[resolverArenaLevel];
        setParty((prev) => ({ ...prev, coins: prev.coins + winnings }));
        updateHero({ ...resolvedHero, xp: resolvedHero.xp + xpGain });
        lines.push(`Won ${winnings}c (x${mult} entry fee) and ${xpGain} XP.`);
        if (resolverArenaLevel === "Final") {
          const extraRoll = rollDie(10);
          const extraRow = ARENA_FINAL_EXTRA_AWARD.find((r) => extraRoll <= r.max);
          if (extraRow.prize) lines.push(`Extra award roll (${extraRoll}): 1 ${extraRow.prize}!`);
        }
      } else {
        const hpLoss = ARENA_LOSE_HP[resolverArenaLevel];
        updateHero({ ...resolvedHero, hp: { ...resolvedHero.hp, cur: Math.max(0, resolvedHero.hp.cur - hpLoss) }, sanity: { ...resolvedHero.sanity, cur: Math.max(0, resolvedHero.sanity.cur - 2) } });
        lines.push(`Lost: -${hpLoss} HP, -2 Sanity.`);
      }
      setResolverResult({ ok: true, lines });
      succeeded = true;
      addLog(`${resolvedHero.name} fights in the ${resolverArenaLevel} arena bracket: rolled ${roll} vs target ${target} — ${lines.slice(1).join(" ")}`);
    } else if (resolverActivity === "Tending to Those Memories") {
      const roll = rollDie(3);
      let newSanity = Math.min(resolvedHero.sanity.max, resolvedHero.sanity.cur + roll);
      const lines = [`+${roll} Sanity from a night at the inn (now ${newSanity}/${resolvedHero.sanity.max}).`];
      let coinsSpent = 0;
      if (resolverDrinkAle) {
        const cost = rollDie(3) * 100;
        if (party.coins < cost) {
          lines.push(`Wanted to drink the rest away too, but can't afford it (needed ${cost}c).`);
        } else {
          const roll2 = rollDie(6);
          newSanity = Math.min(resolvedHero.sanity.max, newSanity + roll2);
          coinsSpent = cost;
          lines.push(`Drank the memories away: +${roll2} more Sanity (now ${newSanity}/${resolvedHero.sanity.max}) for ${cost}c.`);
        }
      }
      updateHero({ ...resolvedHero, sanity: { ...resolvedHero.sanity, cur: newSanity } });
      if (coinsSpent > 0) setParty((prev) => ({ ...prev, coins: prev.coins - coinsSpent }));
      setResolverResult({ ok: true, lines });
      succeeded = true;
      addLog(`${resolvedHero.name} tends to those memories: ${lines.join(" ")}`);
    } else if (resolverActivity === "Treat Mental Conditions") {
      if (party.coins < 1000) { setResolverResult({ ok: false, lines: ["Can't afford the 1000c treatment."] }); return; }
      const targetCond = (resolvedHero.mentalConditions || []).find((c) => c.id === resolverConditionId) || (resolvedHero.mentalConditions || [])[0];
      if (!targetCond) {
        setResolverResult({ ok: false, lines: [`${resolvedHero.name} has no mental conditions to treat.`] });
        return;
      }
      const roll = rollDie(6);
      setParty((prev) => ({ ...prev, coins: prev.coins - 1000 }));
      if (roll <= 5) {
        const remaining = resolvedHero.mentalConditions.filter((c) => c.id !== targetCond.id);
        const patch = targetCond.effect ? applyEffectDelta(resolvedHero, targetCond.effect, -1) : {};
        const newMax = sanityMaxFor({ ...resolvedHero, mentalConditions: remaining });
        updateHero({
          ...resolvedHero,
          ...patch,
          mentalConditions: remaining,
          sanity: { cur: Math.min(resolvedHero.sanity.cur, newMax), max: newMax },
        });
        const line = `Rolled ${roll} — treatment succeeds! "${targetCond.name}" cured. Max Sanity is now ${newMax}. Takes 5 days. (Paid 1000c.)`;
        setResolverResult({ ok: true, lines: [line] });
        succeeded = true;
        addLog(`${resolvedHero.name} is treated at the Asylum: cured "${targetCond.name}" (rolled ${roll}). Max Sanity now ${newMax}.`);
      } else {
        const line = `Rolled ${roll} — the treatment fails this time. Takes 5 days. (Paid 1000c.)`;
        setResolverResult({ ok: true, lines: [line] });
        succeeded = true;
        addLog(`${resolvedHero.name} is treated at the Asylum: failed (rolled ${roll}).`);
      }
    } else if (resolverActivity === "Banking") {
      if (!resolverBank) { setResolverResult({ ok: false, lines: ["Pick a bank first."] }); return; }
      const bankKey = BANK_KEY_MAP[resolverBank];
      const balances = resolvedHero.bankBalances || { chamberlings: 0, smartfall: 0, vault: 0 };
      const current = balances[bankKey] || 0;
      const roll = rollDie(20);
      const pct = bankRollResult(bankKey, roll);
      let newBalance, line;
      if (pct === "robbed") {
        newBalance = 0;
        line = `Rolled ${roll} — Robbed! All ${resolverBank} deposits are gone (was ${current}c).`;
      } else {
        const change = Math.floor(current * (pct / 100));
        newBalance = Math.max(0, current + change);
        line = `Rolled ${roll} — ${pct >= 0 ? "+" : ""}${pct}% (${change >= 0 ? "+" : ""}${change}c). ${resolverBank} balance: ${current}c → ${newBalance}c.`;
      }
      updateHero({ ...resolvedHero, bankBalances: { ...balances, [bankKey]: newBalance } });
      setResolverResult({ ok: true, lines: [line] });
      succeeded = true;
      addLog(`${resolvedHero.name} checks ${resolverBank}: ${line}`);
    }
    if (succeeded) logResolverAP();
  };

  const depositToBank = () => {
    if (!resolverBank || !resolvedHero) return;
    const bankKey = BANK_KEY_MAP[resolverBank];
    const amount = Math.max(0, resolverBankAmount);
    if (amount <= 0) return;
    if (party.coins < amount) { setResolverResult({ ok: false, lines: [`The party doesn't have ${amount}c to deposit.`] }); return; }
    const balances = resolvedHero.bankBalances || { chamberlings: 0, smartfall: 0, vault: 0 };
    updateHero({ ...resolvedHero, bankBalances: { ...balances, [bankKey]: (balances[bankKey] || 0) + amount } });
    setParty((prev) => ({ ...prev, coins: prev.coins - amount }));
    const line = `Deposited ${amount}c into ${resolvedHero.name}'s ${resolverBank} account.`;
    setResolverResult({ ok: true, lines: [line] });
    addLog(line);
  };

  const withdrawFromBank = () => {
    if (!resolverBank || !resolvedHero) return;
    const bankKey = BANK_KEY_MAP[resolverBank];
    const amount = Math.max(0, resolverBankAmount);
    if (amount <= 0) return;
    const balances = resolvedHero.bankBalances || { chamberlings: 0, smartfall: 0, vault: 0 };
    const current = balances[bankKey] || 0;
    if (current < amount) { setResolverResult({ ok: false, lines: [`Only ${current}c available in ${resolvedHero.name}'s ${resolverBank} account.`] }); return; }
    updateHero({ ...resolvedHero, bankBalances: { ...balances, [bankKey]: current - amount } });
    setParty((prev) => ({ ...prev, coins: prev.coins + amount }));
    const line = `Withdrew ${amount}c from ${resolvedHero.name}'s ${resolverBank} account.`;
    setResolverResult({ ok: true, lines: [line] });
    addLog(line);
  };

  return (
    <div>
      <Panel className="mb-4">
        <SectionTitle icon={Landmark}>Settlement</SectionTitle>
        <select
          value={party.settlementName}
          onChange={(e) => setSettlementName(e.target.value)}
          className="w-full text-sm rounded px-2 py-2 mb-2"
          style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
        >
          <option value="">— Choose a settlement —</option>
          {SETTLEMENTS.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
        {settlement && (
          <>
            <p className="text-xs mb-1.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              Quest dice: {settlement.questDice || "— (no quests here)"} {settlement.colour && `(${settlement.colour})`} · Event on {settlement.eventOn[0]}
              {settlement.eventOn[0] !== settlement.eventOn[1] ? `-${settlement.eventOn[1]}` : ""} (1d12) · Inn: {settlement.innCost}c/night
            </p>
            <p className="text-xs mb-1.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              <span className="font-semibold" style={{ color: palette.ink }}>Services:</span> {settlement.services.join(", ")}
              {settlement.temples && <> · <span className="font-semibold" style={{ color: palette.ink }}>Temples:</span> {settlement.temples}</>}
            </p>
            {settlement.notes && (
              <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                {settlement.notes}
              </p>
            )}
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <button
            onClick={rollEvent}
            disabled={!settlement}
            className="flex-1 text-xs px-2 py-2 rounded font-semibold"
            style={{ background: settlement ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: settlement ? 1 : 0.5 }}
          >
            Enter Settlement (roll event)
          </button>
          <button
            onClick={rollQuests}
            disabled={!settlement || !settlement.questDice}
            className="flex-1 text-xs px-2 py-2 rounded font-semibold"
            style={{ background: settlement && settlement.questDice ? palette.forestDark : "#00000020", color: palette.parchment, opacity: settlement && settlement.questDice ? 1 : 0.5 }}
          >
            Roll Available Quests
          </button>
        </div>

        {eventResult && (
          <div className="rounded p-2 mb-2 text-xs" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
            <span className="font-bold" style={{ color: palette.ink }}>Entry roll: {eventResult.roll}</span>{" "}
            {eventResult.triggered ? (
              <>
                <span style={{ color: palette.crimson }}>→ Event ({eventResult.roll2}): {eventResult.event.title}</span>
                <p className="mt-1" style={{ color: palette.inkSoft }}>{eventResult.event.text}</p>
                {eventResult.event.resolve && !eventResolution && (
                  <button
                    onClick={resolveEvent}
                    className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-2 rounded font-semibold"
                    style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
                  >
                    <Dice5 size={14} /> Roll It
                  </button>
                )}
                {eventResolution && (
                  <div className="mt-2 rounded p-2" style={{ background: palette.parchment, border: `1px solid ${palette.gold}` }}>
                    {eventResolution.map((line, i) => (
                      <p key={i} className="text-xs" style={{ color: palette.forestDark, fontWeight: 600 }}>• {line}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <span style={{ color: palette.inkSoft }}>→ Nothing happens.</span>
            )}
          </div>
        )}

        {questResult && (
          <div className="rounded p-2 text-xs" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
            <span className="font-bold" style={{ color: palette.ink }}>Quests roll: {questResult.roll} → {questResult.text}</span>
            {questResult.roll8 != null && (
              <p className="mt-1" style={{ color: palette.inkSoft }}>
                Side-quest check ({questResult.roll8}): {questResult.side ? <>side quest available — <b style={{ color: palette.ink }}>"{questResult.sideQuestName}"</b></> : "no side quest."}
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Map}>Maps</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {MAPS.map((m) => (
            <button
              key={m.key}
              onClick={() => setOpenMap(m)}
              className="rounded-lg overflow-hidden text-left"
              style={{ border: `1px solid ${palette.line}`, background: "#fff" }}
            >
              <img src={m.src} alt={m.title} className="w-full h-24 object-cover" />
              <span className="block text-xs px-2 py-1.5 font-semibold" style={{ fontFamily: "Cinzel, serif", color: palette.crimson }}>
                {m.title}
              </span>
            </button>
          ))}
        </div>
      </Panel>

      {openMap && <MapViewer map={openMap} onClose={() => setOpenMap(null)} />}

      <Panel className="mb-4">
        <SectionTitle icon={ClipboardList}>Activities (Activity Points)</SectionTitle>
        <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          These Activity Points track time spent during a settlement stay — a separate pool from a hero's combat Action Points on the Turn tab, despite the shared "AP" abbreviation in the book.
        </p>
        <select
          value={currentActivityHero}
          onChange={(e) => setActivityHero(e.target.value)}
          className="w-full text-xs rounded px-2 py-2 mb-2"
          style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
        >
          {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select
          value={activityChoice}
          onChange={(e) => setActivityChoice(e.target.value)}
          className="w-full text-xs rounded px-2 py-2 mb-1"
          style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
        >
          {availableActivities.map((a) => (
            <option key={a.name} value={a.name}>{a.name} — {a.ap} AP</option>
          ))}
        </select>
        {settlement && availableActivities.length < SETTLEMENT_ACTIVITIES.length && (
          <p className="text-[10px] mb-1.5 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Showing only what {settlement.name} actually offers ({availableActivities.length}/{SETTLEMENT_ACTIVITIES.length}).
          </p>
        )}
        {selectedActivity && (
          <p className="text-xs mb-2 truncate" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            {selectedActivity.where}{selectedActivity.note ? ` · ${selectedActivity.note}` : ""}
          </p>
        )}
        {selectedActivity?.resolverName && (
          <button
            onClick={() => jumpToResolver(selectedActivity.resolverName)}
            className="w-full text-xs px-2 py-2 rounded font-semibold mb-2 active:scale-95 transition-transform"
            style={{ background: "#00000010", color: palette.ink, fontFamily: "Crimson Pro, serif", border: `1px dashed ${palette.line}` }}
          >
            Logging this doesn't roll anything — jump to Resolve an Activity below to actually do it ↓
          </button>
        )}
        <button
          onClick={addActivity}
          className="w-full flex items-center justify-center gap-1 text-xs px-2 py-2 rounded font-semibold mb-2"
          style={{ background: palette.crimson, color: palette.parchment }}
        >
          <Plus size={14} /> Log Activity
        </button>

        {heroes.map((h) => {
          const ap = heroAP(h.id);
          return (
            <div key={h.id} className="rounded p-2 mb-2" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{h.name}</span>
                <span className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: ap.spent > 1 ? palette.crimson : palette.inkSoft }}>
                  {ap.spent} AP spent
                </span>
              </div>
              {ap.log.length === 0 ? (
                <p className="text-xs italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>No activities logged yet.</p>
              ) : (
                <ul className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                  {ap.log.map((entry, i) => (
                    <li key={i}>• {entry.name} ({entry.ap} AP)</li>
                  ))}
                </ul>
              )}
              {ap.log.length > 0 && (
                <button onClick={() => undoLastActivity(h.id)} className="text-xs mt-1" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>
                  Undo last
                </button>
              )}
            </div>
          );
        })}
        <button onClick={clearVisit} className="text-xs px-2 py-1 rounded font-semibold flex items-center gap-1" style={{ background: palette.inkSoft, color: palette.parchment }}>
          <RotateCcw size={11} /> Clear AP ledger (new visit)
        </button>
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Coins}>Sell & Repair</SectionTitle>
        <p className="text-xs mb-3" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Blacksmith only, settlements only. Sell value = purchase price × 70% at full durability, dropping 10% per point lost (min 20% at 5+ lost). Repair costs the same 20%-of-price rate per point. Both work on items the party actually has — selling removes the item, so it can't be sold twice.
        </p>

        <div className="rounded p-2 mb-3" style={{ background: "#00000008" }}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1.5">Sell an Item</div>
          <select
            value={sellKey}
            onChange={(e) => pickSellItem(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-2"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            <option value="">{sellableItems.length === 0 ? "No weapons, armour, or named backpack items to sell" : "Pick an item the party has…"}</option>
            {sellableItems.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
          </select>
          {selectedSellItem && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                  Price
                  <input type="number" value={sellPrice} onChange={(e) => setSellPrice(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5 font-bold" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                </label>
                <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                  Lost Dur.
                  <input type="number" value={sellLostDur} onChange={(e) => setSellLostDur(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5 font-bold" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                </label>
                <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                  Max Dur.
                  <input type="number" value={sellMaxDur} onChange={(e) => setSellMaxDur(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5 font-bold" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                  Sells for <b style={{ color: palette.ink }}>{sellValue(sellPrice, sellLostDur)}c</b>
                </span>
                <button onClick={doSell} className="text-xs px-3 py-1.5 rounded font-semibold" style={{ background: palette.forestDark, color: palette.parchment }}>
                  Sell
                </button>
              </div>
            </>
          )}
          {sellResult && (
            <p className="text-xs mt-1.5 font-semibold" style={{ color: sellResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>
              {sellResult.line}
            </p>
          )}
        </div>

        <div className="rounded p-2" style={{ background: "#00000008" }}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1.5">Repair an Item</div>
          <p className="text-[10px] mb-1.5 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Weapons and worn armour only — backpack items don't track current/max durability separately, so there's nothing structured to restore there yet.
          </p>
          <select
            value={repairKey}
            onChange={(e) => pickRepairItem(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-2"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            <option value="">{repairableItems.length === 0 ? "No damaged weapons or armour to repair" : "Pick a damaged item…"}</option>
            {repairableItems.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
          </select>
          {selectedRepairItem && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                  Price
                  <input type="number" value={repairPrice} onChange={(e) => setRepairPrice(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5 font-bold" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                </label>
                <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                  Points (max {selectedRepairItem.maxPoints})
                  <input type="number" value={repairPoints} onChange={(e) => setRepairPoints(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5 font-bold" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                  Costs <b style={{ color: palette.ink }}>{repairCostPerPoint(repairPrice) * Math.min(repairPoints, selectedRepairItem.maxPoints)}c</b> ({repairCostPerPoint(repairPrice)}c/point)
                </span>
                <button onClick={doRepair} className="text-xs px-3 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
                  Repair
                </button>
              </div>
            </>
          )}
          {repairResult && (
            <p className="text-xs mt-1.5 font-semibold" style={{ color: repairResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>
              {repairResult.line}
            </p>
          )}
        </div>
      </Panel>

      <div ref={resolvePanelRef}>
      <Panel className="mb-4">
        <SectionTitle icon={Sparkles}>Resolve an Activity</SectionTitle>
        <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Pray, Fortune Teller, Gambling, Horse Racing, Arena Fighting, Tending to Those Memories, Treat Mental Conditions, Banking. This is where the dice actually get rolled and effects applied — a successful roll here also logs the matching Activity Points automatically, so there's no need to log it again above.
        </p>
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <select
            value={resolverActivity}
            onChange={(e) => { setResolverActivity(e.target.value); setResolverResult(null); }}
            className="text-xs rounded px-2 py-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {["Pray", "Fortune Teller", "Gambling", "Horse Racing", "Arena Fighting", "Tending to Those Memories", "Treat Mental Conditions", "Banking"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={resolvedHero?.id || ""}
            onChange={(e) => setResolverHero(e.target.value)}
            className="text-xs rounded px-2 py-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>

        {resolverActivity === "Pray" && (
          <div className="flex gap-1.5 mb-1.5">
            <select
              value={resolverTemple}
              onChange={(e) => setResolverTemple(e.target.value)}
              className="flex-1 text-xs rounded px-2 py-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              <option value="">Pick a temple…</option>
              {templeOptions.map((g) => <option key={g} value={g}>{g} ({TEMPLE_BOONS[g].label})</option>)}
            </select>
            {resolverTemple === "Ohlnir" && (
              <select
                value={resolverOhlnirChoice}
                onChange={(e) => setResolverOhlnirChoice(e.target.value)}
                className="text-xs rounded px-2 py-1.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                <option value="CS">CS</option>
                <option value="RS">RS</option>
              </select>
            )}
          </div>
        )}

        {(resolverActivity === "Gambling" || resolverActivity === "Horse Racing" || resolverActivity === "Arena Fighting") && (
          <div className="flex gap-1.5 mb-1.5 items-center">
            <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              {resolverActivity === "Arena Fighting" ? "Entry fee (50-200c)" : resolverActivity === "Horse Racing" ? "Bet incl. entry (50-300c)" : "Bet (50-500c)"}
            </span>
            <input
              type="number"
              value={resolverBet}
              onChange={(e) => setResolverBet(Number(e.target.value) || 0)}
              className="w-20 text-xs rounded px-2 py-1"
              style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
            />
          </div>
        )}

        {resolverActivity === "Arena Fighting" && (
          <select
            value={resolverArenaLevel}
            onChange={(e) => setResolverArenaLevel(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            <option value="Group">Group fight</option>
            <option value="Semi">Semi-final</option>
            <option value="Final">Final</option>
          </select>
        )}

        {resolverActivity === "Tending to Those Memories" && (
          <label className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            <input type="checkbox" checked={resolverDrinkAle} onChange={(e) => setResolverDrinkAle(e.target.checked)} />
            Also drink to forget (+1d6 more Sanity for 1d3×100c)
          </label>
        )}

        {resolverActivity === "Treat Mental Conditions" && resolvedHero && (
          (resolvedHero.mentalConditions || []).length > 0 ? (
            <select
              value={resolverConditionId || resolvedHero.mentalConditions[0].id}
              onChange={(e) => setResolverConditionId(e.target.value)}
              className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              {resolvedHero.mentalConditions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.detail ? ` — ${c.detail}` : ""}</option>
              ))}
            </select>
          ) : (
            <p className="text-[10px] mb-1.5 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              {resolvedHero.name} has no mental conditions to treat.
            </p>
          )
        )}

        {resolverActivity === "Banking" && resolvedHero && (
          <div className="mb-1.5">
            <select
              value={resolverBank}
              onChange={(e) => setResolverBank(e.target.value)}
              className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              <option value="">Pick a bank…</option>
              {BANKS.map((b) => <option key={b} value={b}>{b} ({resolvedHero.bankBalances?.[BANK_KEY_MAP[b]] || 0}c)</option>)}
            </select>
            <div className="grid grid-cols-3 gap-1 mb-1.5 text-[10px] text-center" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
              {BANKS.map((b) => (
                <div key={b} className="rounded p-1" style={{ background: "#00000008" }}>
                  <div className="truncate">{b}</div>
                  <div className="font-bold" style={{ color: palette.ink }}>{resolvedHero.bankBalances?.[BANK_KEY_MAP[b]] || 0}c</div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mb-1.5">
              <input
                type="number"
                value={resolverBankAmount}
                onChange={(e) => setResolverBankAmount(Number(e.target.value) || 0)}
                className="flex-1 text-xs rounded px-2 py-1.5"
                style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
              />
              <button onClick={depositToBank} className="text-xs px-3 py-1.5 rounded font-semibold" style={{ background: palette.forestDark, color: palette.parchment }}>
                Deposit
              </button>
              <button onClick={withdrawFromBank} className="text-xs px-3 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
                Withdraw
              </button>
            </div>
            <p className="text-[10px] mb-1.5 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              "Roll It" below rolls the 1d20 profit/loss check for the selected bank (once per Silver City visit, per the book).
            </p>
          </div>
        )}

        <button
          onClick={resolveActivity}
          className="w-full flex items-center justify-center gap-1 text-xs px-2 py-2 rounded font-semibold"
          style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
        >
          <Dice5 size={14} /> Roll It
        </button>

        {resolverResult && (
          <div className="rounded p-2 mt-2" style={{ background: "#fff", border: `1px solid ${resolverResult.ok ? palette.forest : palette.crimson}` }}>
            {resolverResult.lines.map((line, i) => (
              <p key={i} className="text-xs" style={{ color: resolverResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif", fontWeight: 600 }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </Panel>
      </div>

      <Panel className="mb-4">
        <SectionTitle icon={Bed}>Rest at Inn</SectionTitle>
        <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Each resting hero regains 2d6 HP and refills Mana, Luck, and Energy. If the party can't afford the inn cost, they sleep in the stable instead: 1d6 HP and only half (rounded down) of the Mana/Luck/Energy deficit, for free.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {heroes.map((h) => (
            <button
              key={h.id}
              onClick={() => toggleRestHero(h.id)}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: !restExcluded.has(h.id) ? palette.forestDark : "#00000010",
                color: !restExcluded.has(h.id) ? palette.parchment : palette.ink,
                fontFamily: "Crimson Pro, serif",
              }}
            >
              {h.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>Inn cost (whole party):</span>
          <input
            type="number"
            value={party.innCostPerNight}
            onChange={(e) => setParty({ ...party, innCostPerNight: Number(e.target.value) || 0 })}
            className="w-16 text-xs rounded px-1"
            style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
          />
          <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>c</span>
        </div>
        <button onClick={restAtInn} className="text-xs px-3 py-2 rounded font-semibold w-full" style={{ background: palette.crimson, color: palette.parchment }}>
          Rest Selected Heroes
        </button>
        {restResult && (
          <div
            className="rounded p-2 mt-2 text-xs"
            style={{ background: "#fff", border: `1px solid ${restResult.ok ? palette.forest : palette.crimson}`, fontFamily: "Crimson Pro, serif" }}
          >
            <div className="flex items-center gap-1 mb-1 font-bold" style={{ color: restResult.ok ? palette.forestDark : palette.crimson }}>
              {restResult.ok ? <Check size={14} /> : <X size={14} />} {restResult.ok ? "Rested" : "Can't Rest"}
            </div>
            <ul style={{ color: palette.inkSoft }}>
              {restResult.lines.map((line, i) => <li key={i}>• {line}</li>)}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}

function TurnTab({ party, setParty, heroes, updateHero, addLog }) {
  // Start of Turn resolver (moved here from the Party tab — it's step 1 of the Turn
  // Sequence, not persistent party state).
  const [inBattle, setInBattle] = useState(false);
  const [turnResult, setTurnResult] = useState(null);

  const rollStartOfTurn = () => {
    const lines = [];
    const scenarioRoll = rollDie(10);
    lines.push(`Scenario die: ${scenarioRoll}`);
    if (scenarioRoll < 9) {
      lines.push("No Threat roll this turn.");
      setTurnResult({ lines });
      addLog(`Start of turn — Scenario die ${scenarioRoll}: no Threat roll.`);
      return;
    }
    const threatRoll = rollDie(20);
    lines.push(`Threat roll: ${threatRoll} (current Threat ${party.threat})`);
    let newThreat = party.threat;
    if (threatRoll === 20) {
      newThreat = clamp(party.threat - 5, party.threatFloor, 999);
      lines.push(`Natural 20 — Threat −5 (now ${newThreat}).`);
    } else if (threatRoll > party.threat) {
      newThreat = clamp(party.threat + 1, party.threatFloor, 999);
      lines.push(`Above current Threat — Threat +1 (now ${newThreat}).`);
    } else if (inBattle) {
      const tableRoll = rollDie(10);
      const entry = findThreatEntry(THREAT_TABLE_IN_COMBAT, tableRoll);
      newThreat = clamp(party.threat + entry.decrease, party.threatFloor, 999);
      lines.push(`At/below Threat — In-Combat table (${tableRoll}): ${entry.title}. ${entry.text}`);
      lines.push(`Threat ${entry.decrease} (now ${newThreat}).`);
    } else {
      const tableRoll = rollDie(20);
      const entry = findThreatEntry(THREAT_TABLE_NOT_IN_BATTLE, tableRoll);
      newThreat = clamp(party.threat + entry.decrease, party.threatFloor, 999);
      lines.push(`At/below Threat — Not-in-Battle table (${tableRoll}): ${entry.title}. ${entry.text}`);
      lines.push(`Threat ${entry.decrease} (now ${newThreat}).`);
    }
    setParty((prev) => ({ ...prev, threat: newThreat }));
    setTurnResult({ lines });
    addLog(`Start of turn: ${lines.join(" ")}`);
  };

  // Round / AP tracker — the QRS confirms every model (hero or enemy) gets a flat 2 AP.
  const spendAP = (heroId, amount) => {
    const hero = heroes.find((h) => h.id === heroId);
    if (!hero) return;
    const nextAP = Math.max(0, (hero.ap ?? 2) - amount);
    updateHero(hero.id, { ...hero, ap: nextAP });
  };
  const setAP = (heroId, value) => {
    const hero = heroes.find((h) => h.id === heroId);
    if (!hero) return;
    updateHero(hero.id, { ...hero, ap: Math.max(0, value) });
  };

  const nextRound = () => {
    heroes.forEach((h) => updateHero(h.id, { ...h, ap: 2 }));
    const wentOut = [];
    const surviving = [];
    (party.lightSources || []).forEach((l) => {
      const remaining = l.remaining - 1;
      if (remaining <= 0) wentOut.push(l.name);
      else surviving.push({ ...l, remaining });
    });
    const nextRoundNum = party.round + 1;
    setParty((prev) => ({ ...prev, round: nextRoundNum, lightSources: surviving }));
    addLog(`Round ${nextRoundNum} begins — AP reset for all heroes.${wentOut.length ? ` Light source(s) went out: ${wentOut.join(", ")}.` : ""}`);
  };

  // Trading Gear — 1 AP per hero involved, LOS required (per the book). Moves a single
  // backpack/quick-slot item from one hero to another; both sides need the AP or the
  // trade doesn't happen at all (all-or-nothing, not a partial spend).
  const [tradeFrom, setTradeFrom] = useState("");
  const [tradeItem, setTradeItem] = useState("");
  const [tradeTo, setTradeTo] = useState("");
  const [tradeFeedback, setTradeFeedback] = useState(null);
  const tradeFromHero = heroes.find((h) => h.id === tradeFrom) || heroes[0];
  const tradeToHero = heroes.find((h) => h.id === tradeTo) || heroes[1] || heroes[0];
  const tradeableItem = tradeFromHero?.backpack.find((it) => it.id === tradeItem);

  const doTrade = () => {
    if (!tradeFromHero || !tradeToHero || !tradeableItem) {
      setTradeFeedback({ text: "Pick a source hero, an item, and a destination hero.", tone: "bad" });
      return;
    }
    if (tradeFromHero.id === tradeToHero.id) {
      setTradeFeedback({ text: "Source and destination must be different heroes.", tone: "bad" });
      return;
    }
    const fromAP = tradeFromHero.ap ?? 2;
    const toAP = tradeToHero.ap ?? 2;
    if (fromAP < 1 || toAP < 1) {
      setTradeFeedback({ text: `Both heroes need 1 AP each (${tradeFromHero.name}: ${fromAP}, ${tradeToHero.name}: ${toAP}).`, tone: "bad" });
      return;
    }
    updateHero(tradeFromHero.id, { ...tradeFromHero, ap: fromAP - 1, backpack: tradeFromHero.backpack.filter((it) => it.id !== tradeableItem.id) });
    updateHero(tradeToHero.id, { ...tradeToHero, ap: toAP - 1, backpack: [...tradeToHero.backpack, { ...tradeableItem, slot: "backpack" }] });
    setTradeFeedback({ text: `${tradeableItem.name} moved from ${tradeFromHero.name} to ${tradeToHero.name}.`, tone: "good" });
    addLog(`${tradeFromHero.name} trades ${tradeableItem.name} to ${tradeToHero.name} (1 AP each, LOS required).`);
    setTradeItem("");
  };

  // In-Dungeon Short Rest — automates every numeric step from REST_STEPS (Reference tab).
  // Board-state steps (arranging heroes, moving Wandering Monsters, barring the door,
  // brewing potions, rolling for Ambush — no data for that roll) stay manual reminders.
  const [restSummary, setRestSummary] = useState(null);
  const takeShortRest = () => {
    const lines = [];
    const newFood = Math.max(0, party.food - 1);
    lines.push(`Food: −1 ration (now ${newFood}).${newFood === 0 ? " Party is out of food!" : ""}`);

    const lowered = clamp(party.threat - 5, party.threatFloor, 999);
    const threatRoll = rollDie(20);
    let newThreat = lowered;
    if (threatRoll === 20) {
      newThreat = clamp(lowered - 5, party.threatFloor, 999);
      lines.push(`Threat −5 (now ${lowered}), then a natural 20 on the follow-up roll — Threat −5 again (now ${newThreat}).`);
    } else if (threatRoll > lowered) {
      newThreat = clamp(lowered + 1, party.threatFloor, 999);
      lines.push(`Threat −5 (now ${lowered}), then rolled ${threatRoll} (above ${lowered}) — Threat +1 (now ${newThreat}).`);
    } else {
      const tableRoll = rollDie(20);
      const entry = findThreatEntry(THREAT_TABLE_NOT_IN_BATTLE, tableRoll);
      newThreat = clamp(lowered + entry.decrease, party.threatFloor, 999);
      lines.push(`Threat −5 (now ${lowered}), then rolled ${threatRoll} (at/below ${lowered}) — ${entry.title}: ${entry.text} Threat ${entry.decrease} (now ${newThreat}).`);
    }

    const newMorale = party.morale + 2;
    lines.push(`Party Morale +2 (now ${newMorale}).`);

    heroes.forEach((h) => {
      const hpRoll = rollDie(6);
      const newHp = Math.min(h.hp.max, h.hp.cur + hpRoll);
      const hasBedroll = (h.backpack || []).some((it) => it.name === "Bed Roll");
      let newEnergyCur = h.energy.cur;
      let energyLine;
      if (hasBedroll) {
        newEnergyCur = h.energy.max;
        energyLine = "Energy fully regained (Bed Roll).";
      } else {
        const missing = h.energy.max - h.energy.cur;
        let regained = 0;
        for (let i = 0; i < missing; i++) if (rollDie(6) <= 3) regained++;
        newEnergyCur = Math.min(h.energy.max, h.energy.cur + regained);
        energyLine = missing > 0 ? `+${regained}/${missing} Energy.` : "Energy already full.";
      }
      const isCaster = h.mana.max > 0;
      updateHero(h.id, {
        ...h,
        hp: { ...h.hp, cur: newHp },
        energy: { ...h.energy, cur: newEnergyCur },
        mana: isCaster ? { ...h.mana, cur: h.mana.max } : h.mana,
      });
      lines.push(`${h.name}: +${hpRoll} HP (${newHp}/${h.hp.max}). ${energyLine}${isCaster ? " Mana fully regained." : ""}`);
    });

    setParty((prev) => ({ ...prev, food: newFood, threat: newThreat, morale: newMorale }));
    setRestSummary(lines);
    addLog(`Short Rest: ${lines.join(" ")}`);
  };

  const resetRound = () => {
    heroes.forEach((h) => updateHero(h.id, { ...h, ap: 2 }));
    setParty((prev) => ({ ...prev, round: 1 }));
    setTurnResult(null);
    addLog("Round counter reset to 1 — AP reset for all heroes.");
  };

  // Light sources
  const [lightName, setLightName] = useState("Torch");
  const [lightDuration, setLightDuration] = useState(6);
  const addLightSource = () => {
    setParty((prev) => ({ ...prev, lightSources: [...(prev.lightSources || []), { id: uid(), name: lightName || "Light", remaining: Math.max(1, Number(lightDuration) || 1) }] }));
    addLog(`Added a light source: ${lightName || "Light"} (${Math.max(1, Number(lightDuration) || 1)} turns).`);
  };
  const removeLightSource = (id) => {
    setParty((prev) => ({ ...prev, lightSources: (prev.lightSources || []).filter((l) => l.id !== id) }));
  };

  // Initiative Bag
  const [enemyCount, setEnemyCount] = useState(1);
  const [namedMonsterCount, setNamedMonsterCount] = useState(0);
  const [largeMonsterCount, setLargeMonsterCount] = useState(0);
  const [perfectHearing, setPerfectHearing] = useState(false);
  const [swiftLeader, setSwiftLeader] = useState(false);
  const [sneaky, setSneaky] = useState(false);
  const [doorBashed, setDoorBashed] = useState(false);
  const [ambushed, setAmbushed] = useState(false);
  const [bag, setBag] = useState(null);
  const [drawOrder, setDrawOrder] = useState([]);

  const heroTokenCount = heroes.length + (perfectHearing ? 1 : 0) + (swiftLeader ? 1 : 0);
  const enemyTokenCount =
    Math.max(0, Number(enemyCount) || 0) +
    Math.max(0, Number(namedMonsterCount) || 0) +
    Math.max(0, Number(largeMonsterCount) || 0) +
    (sneaky ? 1 : 0) + (doorBashed ? 2 : 0) + (ambushed ? 3 : 0);

  const buildBag = () => {
    const tokens = [...Array(heroTokenCount).fill("hero"), ...Array(enemyTokenCount).fill("enemy")];
    setBag(tokens);
    setDrawOrder([]);
    addLog(`Initiative bag built: ${heroTokenCount} hero token${heroTokenCount === 1 ? "" : "s"}, ${enemyTokenCount} enemy token${enemyTokenCount === 1 ? "" : "s"}.`);
  };

  const drawToken = () => {
    if (!bag || bag.length === 0) return;
    const idx = Math.floor(Math.random() * bag.length);
    const drawn = bag[idx];
    setBag([...bag.slice(0, idx), ...bag.slice(idx + 1)]);
    setDrawOrder((prev) => [...prev, drawn]);
  };

  return (
    <div>
      <Panel className="mb-4">
        <SectionTitle icon={Timer}>Round</SectionTitle>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-full flex items-center justify-center font-bold text-2xl"
            style={{ width: 64, height: 64, background: palette.forestDark, color: palette.parchment, fontFamily: "JetBrains Mono, monospace", border: `3px solid ${palette.ink}` }}
          >
            {party.round}
          </div>
          <div className="flex-1 flex gap-2">
            <button
              onClick={nextRound}
              className="flex-1 text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform"
              style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
            >
              Next Round
            </button>
            <button
              onClick={resetRound}
              className="px-3 py-2 rounded text-xs font-semibold active:scale-95 transition-transform"
              style={{ background: "#00000015", color: palette.inkSoft }}
              title="Reset round to 1 and AP for all heroes"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          "Next Round" resets every hero's AP to 2, and counts down any tracked light sources — removing any that go out.
        </p>
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Zap}>Action Points (2 per hero)</SectionTitle>
        <div className="space-y-1.5">
          {heroes.map((h) => {
            const ap = h.ap ?? 2;
            return (
              <div key={h.id} className="flex items-center gap-2 rounded p-2" style={{ background: ap <= 0 ? "#7A1F2B15" : "#00000008" }}>
                <span className="flex-1 text-xs font-semibold truncate" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{h.name}</span>
                <div className="flex gap-0.5">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{ width: 14, height: 14, background: ap > i ? palette.gold : "#00000020", border: `1px solid ${palette.line}` }}
                    />
                  ))}
                </div>
                <button onClick={() => spendAP(h.id, 1)} disabled={ap <= 0} className="text-[10px] px-2 py-1 rounded font-semibold active:scale-95 transition-transform" style={{ background: ap > 0 ? palette.crimsonDark : "#00000015", color: ap > 0 ? palette.parchment : palette.inkSoft }}>
                  −1 AP
                </button>
                <button onClick={() => setAP(h.id, 2)} className="text-[10px] px-2 py-1 rounded font-semibold active:scale-95 transition-transform" style={{ background: "#00000015", color: palette.inkSoft }}>
                  Reset
                </button>
              </div>
            );
          })}
          {heroes.length === 0 && <p className="text-xs italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>No heroes yet.</p>}
        </div>
      </Panel>

      {heroes.length >= 2 && (
        <Panel className="mb-4">
          <SectionTitle icon={Users}>Trade Gear</SectionTitle>
          <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
            1 AP per hero involved, LOS required. Moves an item from one hero's backpack/quick slots to another's.
          </p>
          <select
            value={tradeFromHero?.id || ""}
            onChange={(e) => { setTradeFrom(e.target.value); setTradeItem(""); }}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {heroes.map((h) => <option key={h.id} value={h.id}>From: {h.name} ({h.ap ?? 2} AP)</option>)}
          </select>
          <select
            value={tradeItem}
            onChange={(e) => setTradeItem(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            <option value="">Pick an item…</option>
            {tradeFromHero?.backpack.map((it) => (
              <option key={it.id} value={it.id}>{it.name || "(unnamed item)"} {it.slot === "quickslot" ? "(Quick Slot)" : ""}</option>
            ))}
          </select>
          <select
            value={tradeToHero?.id || ""}
            onChange={(e) => setTradeTo(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {heroes.map((h) => <option key={h.id} value={h.id}>To: {h.name} ({h.ap ?? 2} AP)</option>)}
          </select>
          <button
            onClick={doTrade}
            className="w-full text-xs px-2 py-2 rounded font-semibold active:scale-95 transition-transform"
            style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
          >
            Trade (1 AP each)
          </button>
          {tradeFeedback && (
            <p className="text-xs mt-1.5 font-semibold" style={{ color: tradeFeedback.tone === "good" ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>
              {tradeFeedback.text}
            </p>
          )}
        </Panel>
      )}

      <Panel className="mb-4">
        <SectionTitle icon={Dice5}>Start of Turn</SectionTitle>
        <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Rolls the Scenario die (1d10); on a 9-10 it rolls Threat (1d20) and, if triggered, the matching Threat Table — applying the result to Threat automatically.
        </p>
        <button
          onClick={() => setInBattle((v) => !v)}
          className="w-full mb-2 text-xs px-2 py-2 rounded font-semibold active:scale-95 transition-transform"
          style={{ background: inBattle ? palette.crimsonDark : "#00000010", color: inBattle ? palette.parchment : palette.ink, fontFamily: "Cinzel, serif" }}
        >
          {inBattle ? "In Battle — rolls the In-Combat table" : "Not in Battle — rolls the Wandering/Exploration table"}
        </button>
        <button
          onClick={rollStartOfTurn}
          className="w-full mb-2 text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform"
          style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
        >
          Roll It
        </button>
        {turnResult && (
          <div className="rounded p-2" style={{ background: "#00000010" }}>
            {turnResult.lines.map((line, i) => (
              <p key={i} className="text-xs" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>{line}</p>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Bed}>Short Rest</SectionTitle>
        <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Automates the numeric steps: −1 food, Threat −5 then a follow-up roll, Party Morale +2, +1d6 HP per hero, Energy regen (or full with a Bed Roll), full Mana for casters. Arranging heroes, barring the door, moving Wandering Monsters, brewing potions, and the Ambush roll still need doing by hand — see the full checklist in Reference.
        </p>
        <button
          onClick={takeShortRest}
          className="w-full mb-2 text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform"
          style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
        >
          Take a Short Rest
        </button>
        {restSummary && (
          <div className="rounded p-2" style={{ background: "#00000010" }}>
            {restSummary.map((line, i) => (
              <p key={i} className="text-xs" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>{line}</p>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Flashlight}>Light Sources</SectionTitle>
        <div className="flex gap-1.5 mb-2">
          <input
            value={lightName}
            onChange={(e) => setLightName(e.target.value)}
            placeholder="Name"
            className="flex-1 min-w-0 text-xs rounded px-2 py-1.5"
            style={{ border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          />
          <input
            type="number"
            value={lightDuration}
            onChange={(e) => setLightDuration(Number(e.target.value) || 1)}
            className="w-16 text-xs rounded px-2 py-1.5"
            style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
            title="Turns remaining"
          />
          <button onClick={addLightSource} className="px-3 py-1.5 rounded font-semibold active:scale-95 transition-transform" style={{ background: palette.forestDark, color: palette.parchment }}>
            <Plus size={14} />
          </button>
        </div>
        {(party.lightSources || []).length === 0 ? (
          <p className="text-xs italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>None tracked. Add a torch/lantern with however many turns it has left, per your table/card.</p>
        ) : (
          <div className="space-y-1">
            {party.lightSources.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-xs rounded p-2" style={{ background: l.remaining <= 1 ? "#7A1F2B15" : "#00000008", fontFamily: "Crimson Pro, serif" }}>
                <span style={{ color: palette.ink }}>{l.name} — {l.remaining} turn{l.remaining === 1 ? "" : "s"} left</span>
                <button onClick={() => removeLightSource(l.id)} style={{ color: palette.crimson }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={Users}>Initiative Bag</SectionTitle>
        <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          1 hero token per hero, 1 per enemy, plus modifiers below. Build the bag, then draw one token at a time for turn order.
        </p>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <label className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Enemies
            <input type="number" value={enemyCount} onChange={(e) => setEnemyCount(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
          </label>
          <label className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Named +1 ea.
            <input type="number" value={namedMonsterCount} onChange={(e) => setNamedMonsterCount(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
          </label>
          <label className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Large +1 ea.
            <input type="number" value={largeMonsterCount} onChange={(e) => setLargeMonsterCount(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            ["Perfect Hearing (+1 hero)", perfectHearing, setPerfectHearing],
            ["Swift Leader (+1 hero)", swiftLeader, setSwiftLeader],
            ["Sneaky (+1 enemy)", sneaky, setSneaky],
            ["Door bashed (+2 enemy)", doorBashed, setDoorBashed],
            ["Ambushed (+3 enemy)", ambushed, setAmbushed],
          ].map(([label, val, setter]) => (
            <button
              key={label}
              onClick={() => setter((v) => !v)}
              className="text-[10px] px-2 py-1 rounded font-semibold active:scale-95 transition-transform"
              style={{ background: val ? palette.crimsonDark : "#00000010", color: val ? palette.parchment : palette.ink, fontFamily: "Crimson Pro, serif" }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs mb-2" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>
          <b>{heroTokenCount}</b> hero token{heroTokenCount === 1 ? "" : "s"} · <b>{enemyTokenCount}</b> enemy token{enemyTokenCount === 1 ? "" : "s"}
        </p>
        <button onClick={buildBag} className="w-full mb-2 text-xs px-2 py-2 rounded font-semibold active:scale-95 transition-transform" style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}>
          Build Bag
        </button>
        {bag && (
          <>
            <button
              onClick={drawToken}
              disabled={bag.length === 0}
              className="w-full mb-2 text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform"
              style={{ background: bag.length > 0 ? palette.crimsonDark : "#00000015", color: bag.length > 0 ? palette.parchment : palette.inkSoft, fontFamily: "Cinzel, serif" }}
            >
              {bag.length > 0 ? `Draw Token (${bag.length} left)` : "Bag Empty"}
            </button>
            {drawOrder.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {drawOrder.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full font-bold"
                    style={{ background: t === "hero" ? palette.forestDark : palette.crimsonDark, color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {i + 1}. {t === "hero" ? "Hero" : "Enemy"}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function PartyPanel({ party, setParty, log, addLog, heroes, updateHero, pushToast }) {
  const [moraleEvent, setMoraleEvent] = useState(MORALE_EVENTS[0].label);
  const [xpAmount, setXpAmount] = useState(50);

  const threatColor = (t) => {
    if (t <= 4) return palette.forest;
    if (t <= 7) return palette.gold;
    if (t <= 9) return palette.ember;
    return palette.crimson;
  };

  const bumpThreat = (delta, label) => {
    const next = clamp(party.threat + delta, party.threatFloor, 999);
    setParty({ ...party, threat: next });
    addLog(`Threat ${delta > 0 ? "+" : ""}${delta} → ${next} (${label})`);
  };

  const applyMorale = () => {
    const ev = MORALE_EVENTS.find((e) => e.label === moraleEvent);
    if (!ev) return;
    const next = clamp(party.morale + ev.delta, 0, 999);
    setParty({ ...party, morale: next });
    addLog(`Morale ${ev.delta > 0 ? "+" : ""}${ev.delta} → ${next} (${ev.label})`);
  };

  const setStartingMorale = () => {
    const pm = heroes.reduce((s, h) => s + Math.floor((Number(h.stats.RES) || 0) / 10), 0);
    setParty({ ...party, morale: pm, startingMorale: pm });
    addLog(`Starting Party Morale set to ${pm} (sum of floor(RES/10) across ${heroes.length} hero${heroes.length === 1 ? "" : "es"}).`);
  };

  const awardXP = () => {
    if (!heroes || heroes.length === 0 || !xpAmount) return;
    heroes.forEach((h) => {
      const withXP = { ...h, xp: h.xp + Number(xpAmount) };
      const { hero: leveled, events } = applyAutoLevelUps(withXP);
      updateHero(h.id, leveled);
      if (events.length > 0) {
        const finalLevel = events[events.length - 1].level;
        const allNotes = events.flatMap((e) => e.notes).join(", ");
        pushToast && pushToast(
          `${h.name} leveled up!`,
          events.length > 1 ? `Now level ${finalLevel} (+${events.length} levels) — ${allNotes}` : `Now level ${finalLevel} — ${allNotes}`
        );
        addLog(`${h.name} leveled up to ${finalLevel}: ${allNotes}`);
      }
    });
    addLog(`Awarded ${xpAmount} XP to all ${heroes.length} hero${heroes.length === 1 ? "" : "es"}`);
  };

  return (
    <div>
      <Panel className="mb-4">
        <SectionTitle icon={Flame}>Threat Level</SectionTitle>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-full flex items-center justify-center font-bold text-2xl"
            style={{
              width: 64, height: 64, background: threatColor(party.threat), color: palette.parchment,
              fontFamily: "JetBrains Mono, monospace", border: `3px solid ${palette.ink}`,
            }}
          >
            {party.threat}
          </div>
          <div className="flex-1">
            <Stepper value={party.threat} onChange={(v) => setParty({ ...party, threat: clamp(v, party.threatFloor, 999) })} min={party.threatFloor} max={999} />
            <div className="text-xs mt-1 flex items-center gap-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              Floor:
              <input
                type="number"
                value={party.threatFloor}
                onChange={(e) => setParty({ ...party, threatFloor: Number(e.target.value) || 2 })}
                className="w-12 rounded px-1"
                style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
              />
              <button
                onClick={() => { setParty({ ...party, threat: party.threatFloor }); addLog(`Threat reset to floor (${party.threatFloor})`); }}
                className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                style={{ background: palette.inkSoft, color: palette.parchment }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {THREAT_UPS.map((t) => (
            <button
              key={t.label}
              onClick={() => bumpThreat(t.delta, t.label)}
              className="text-xs px-2 py-1 rounded"
              style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}
            >
              {t.label} ({t.delta > 0 ? "+" : ""}{t.delta})
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Use "Start of Turn" above to roll the Scenario die and Threat automatically each turn, or the buttons below for one-off Threat changes.
        </p>
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Users}>Party Morale (PM)</SectionTitle>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-full flex items-center justify-center font-bold text-2xl"
            style={{ width: 64, height: 64, background: palette.forestDark, color: palette.parchment, fontFamily: "JetBrains Mono, monospace", border: `3px solid ${palette.ink}` }}
          >
            {party.morale}
          </div>
          <div className="flex-1">
            <Stepper value={party.morale} onChange={(v) => setParty({ ...party, morale: clamp(v, 0, 999) })} min={0} max={999} />
            <p className="text-xs mt-1" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              {party.startingMorale > 0
                ? `Below ${Math.floor(party.startingMorale / 2)} (half of starting PM): all heroes at −10 RES. At 0: leave the dungeon once out of combat.`
                : "Below half of starting PM: all heroes at −10 RES. At 0: leave the dungeon once out of combat."}
            </p>
          </div>
        </div>
        {heroes && heroes.length > 0 && (
          <button
            onClick={setStartingMorale}
            className="text-xs mb-3 w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded font-semibold"
            style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Crimson Pro, serif" }}
            title="PM = sum of floor(RES/10) across all heroes"
          >
            <RotateCcw size={11} /> Set Starting Morale from RES ({heroes.reduce((s, h) => s + Math.floor((Number(h.stats.RES) || 0) / 10), 0)})
          </button>
        )}
        <div className="flex gap-2 items-center">
          <select
            value={moraleEvent}
            onChange={(e) => setMoraleEvent(e.target.value)}
            className="text-xs rounded px-2 py-1 flex-1"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {MORALE_EVENTS.map((e) => (
              <option key={e.label} value={e.label}>{e.label} ({e.delta > 0 ? "+" : ""}{e.delta})</option>
            ))}
          </select>
          <button onClick={applyMorale} className="text-xs px-2 py-1 rounded font-semibold" style={{ background: palette.forestDark, color: palette.parchment }}>
            Apply
          </button>
        </div>
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Sparkles}>Award Experience</SectionTitle>
        <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          All heroes gain the same amount of XP. Level-ups happen manually, back in a settlement — use the Level Up button on each hero's card when your table agrees they've earned it.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={xpAmount}
            onChange={(e) => setXpAmount(Number(e.target.value) || 0)}
            className="w-24 rounded px-2 py-1.5 font-bold"
            style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
          />
          <button
            onClick={awardXP}
            disabled={!heroes || heroes.length === 0}
            className="flex-1 px-3 py-1.5 rounded font-bold text-sm"
            style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif", opacity: (!heroes || heroes.length === 0) ? 0.5 : 1 }}
          >
            Give to All Heroes {heroes && heroes.length ? `(${heroes.length})` : ""}
          </button>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Panel>
          <div className="flex items-center gap-2 mb-2">
            <Wheat size={16} color={palette.gold} />
            <span style={{ fontFamily: "Cinzel, serif", color: palette.ink }} className="text-sm font-bold">Food</span>
          </div>
          <Stepper value={party.food} onChange={(v) => setParty({ ...party, food: clamp(v, 0, 999) })} min={0} max={999} />
        </Panel>
        <Panel>
          <div className="flex items-center gap-2 mb-2">
            <Coins size={16} color={palette.gold} />
            <span style={{ fontFamily: "Cinzel, serif", color: palette.ink }} className="text-sm font-bold">Coins</span>
          </div>
          <input
            type="number"
            value={party.coins}
            onChange={(e) => setParty({ ...party, coins: Number(e.target.value) || 0 })}
            className="w-full rounded px-2 py-1 font-bold"
            style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
          />
        </Panel>
      </div>

      <Panel>
        <SectionTitle icon={BookOpen}>Session Log</SectionTitle>
        <div className="max-h-40 overflow-y-auto text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          {log.length === 0 && <p style={{ fontStyle: "italic" }}>Nothing logged yet.</p>}
          {log.slice().reverse().map((l, i) => (
            <div key={i} className="border-b pb-1" style={{ borderColor: palette.line + "55" }}>{l}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------- Combat Calculator ----------
function CombatCalc({ heroes, updateHero, addLog }) {
  const [mode, setMode] = useState("cc"); // cc | ranged | damage | check | spells | prayers
  const [base, setBase] = useState(30);
  const [enemyMod, setEnemyMod] = useState(0);
  const [halfHeight, setHalfHeight] = useState(0);
  const [checked, setChecked] = useState({});
  const [result, setResult] = useState(null);
  const [heroPick, setHeroPick] = useState("");

  const mods = mode === "cc" ? CC_ATTACK_MODS : RANGED_ATTACK_MODS;
  const sumChecked = mods.reduce((s, m) => (checked[m.label] ? s + m.value : s), 0);
  const halfHeightPenalty = mode === "ranged" ? -10 * Number(halfHeight || 0) : 0;
  const effective = clamp(base + sumChecked + halfHeightPenalty - Number(enemyMod || 0), 0, 100);

  const applyHeroSkill = (heroId) => {
    setHeroPick(heroId);
    const h = heroes.find((x) => x.id === heroId);
    if (!h) return;
    const penalty = encumbranceOver(h) ? -10 : 0;
    setBase((mode === "cc" ? h.skills.cs : h.skills.rs) + penalty);
  };

  const roll = () => {
    const r = rollPercent();
    let outcome;
    if (r <= 5) outcome = "PERFECT";
    else if (r <= effective) outcome = "SUCCESS";
    else outcome = "FAILURE";
    setResult({ r, outcome });
  };

  // Damage calc
  const [weaponDmg, setWeaponDmg] = useState(0);
  const [db, setDb] = useState(0);
  const [na, setNa] = useState(0);
  const [armour, setArmour] = useState(0);
  const dmgTotal = Math.max(0, Number(weaponDmg || 0) + Number(db || 0) - Number(na || 0) - Number(armour || 0));

  // Quick stat/skill check
  const [checkValue, setCheckValue] = useState(40);
  const [checkHeroPick, setCheckHeroPick] = useState("");
  const [checkSkillPick, setCheckSkillPick] = useState("cs");
  const [checkResult, setCheckResult] = useState(null);
  const applyCheckSkill = (heroId, skillKey) => {
    const h = heroes.find((x) => x.id === heroId);
    if (h && skillKey && h.skills[skillKey] !== undefined) {
      const penalty = encumbranceOver(h) ? -10 : 0;
      setCheckValue(h.skills[skillKey] + penalty);
    }
  };
  const doCheck = () => {
    const r = rollPercent();
    let outcome;
    if (r <= 5) outcome = "PERFECT (choose a bonus)";
    else if (r <= checkValue) outcome = "SUCCESS";
    else outcome = "FAILURE";
    setCheckResult({ r, outcome });
  };

  // Cast spells / say prayers
  const [castHeroPick, setCastHeroPick] = useState("");
  const [castSpellPick, setCastSpellPick] = useState("");
  const [castResult, setCastResult] = useState(null);
  const castHero = heroes.find((h) => h.id === castHeroPick);
  const chosenSpell = SPELLS.find((s) => s.name === castSpellPick);
  const castSpell = () => {
    if (!castHero || !chosenSpell) return;
    const cost = chosenSpell.mana || 0;
    if (cost > castHero.mana.cur) {
      setCastResult({ ok: false, msg: `Not enough Mana — ${chosenSpell.name} needs ${cost}, ${castHero.name} only has ${castHero.mana.cur}.` });
      return;
    }
    const cur = clamp(castHero.mana.cur - cost, 0, castHero.mana.max);
    updateHero({ ...castHero, mana: { ...castHero.mana, cur } });
    setCastResult({ ok: true, msg: `${castHero.name} cast ${chosenSpell.name} (−${cost} Mana → ${cur}/${castHero.mana.max})` });
    addLog && addLog(`${castHero.name} cast ${chosenSpell.name} (−${cost} Mana → ${cur}/${castHero.mana.max})`);
  };

  const [prayHeroPick, setPrayHeroPick] = useState("");
  const [prayPick, setPrayPick] = useState("");
  const [prayResult, setPrayResult] = useState(null);
  const prayHero = heroes.find((h) => h.id === prayHeroPick);
  const chosenPrayer = PRAYERS.find((p) => p.name === prayPick);
  const sayPrayer = () => {
    if (!prayHero || !chosenPrayer) return;
    if (prayHero.energy.cur < 1) {
      setPrayResult({ ok: false, msg: `Not enough Energy — praying costs 1, ${prayHero.name} has 0 left.` });
      return;
    }
    const cur = clamp(prayHero.energy.cur - 1, 0, prayHero.energy.max);
    updateHero({ ...prayHero, energy: { ...prayHero.energy, cur } });
    setPrayResult({ ok: true, msg: `${prayHero.name} prayed ${chosenPrayer.name} (−1 Energy → ${cur}/${prayHero.energy.max})` });
    addLog && addLog(`${prayHero.name} prayed ${chosenPrayer.name} (−1 Energy → ${cur}/${prayHero.energy.max})`);
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["cc", "Close Combat", Swords], ["ranged", "Ranged", Dice5], ["damage", "Damage", Shield], ["check", "Stat/Skill Check", Brain], ["spells", "Spells", Sparkles], ["prayers", "Prayers", Heart]].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setResult(null); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{
              background: mode === key ? palette.crimson : "#00000010",
              color: mode === key ? palette.parchment : palette.ink,
              fontFamily: "Crimson Pro, serif",
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {(mode === "cc" || mode === "ranged" || mode === "damage") && heroes.some((h) => combatTalentsAndPerks(h).length > 0) && (
        <Panel className="mb-4">
          <SectionTitle icon={Swords}>Combat Talents & Perks</SectionTitle>
          <p className="text-xs mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Quick reference — only applies to the hero listed. Perks still cost their usual Energy/AP to activate; Talents are always on.
          </p>
          {heroes.map((h) => {
            const items = combatTalentsAndPerks(h);
            if (items.length === 0) return null;
            return (
              <div key={h.id} className="mb-2 last:mb-0">
                <div className="text-xs font-bold mb-1" style={{ fontFamily: "Cinzel, serif", color: palette.crimson }}>{h.name}</div>
                <div className="space-y-1">
                  {items.map((it) => (
                    <div
                      key={it.source + it.name}
                      className="text-xs rounded p-1.5"
                      style={{ background: "#00000008", borderLeft: `3px solid ${it.source === "Talent" ? palette.forestDark : palette.gold}` }}
                    >
                      <span className="font-semibold" style={{ color: palette.ink }}>{it.name}</span>{" "}
                      <span style={{ fontSize: 9, color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>({it.source})</span>
                      <p style={{ color: palette.inkSoft }}>{it.effect}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Panel>
      )}

      {(mode === "cc" || mode === "ranged") && (
        <Panel className="mb-4">
          <SectionTitle icon={mode === "cc" ? Swords : Dice5}>
            {mode === "cc" ? "Close Combat To-Hit" : "Ranged To-Hit"}
          </SectionTitle>
          {heroes && heroes.length > 0 && (
            <select
              value={heroPick}
              onChange={(e) => applyHeroSkill(e.target.value)}
              className="w-full text-xs rounded px-2 py-1 mb-3"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              <option value="">Fill from hero…</option>
              {heroes.map((h) => {
                const raw = mode === "cc" ? h.skills.cs : h.skills.rs;
                const over = encumbranceOver(h);
                return <option key={h.id} value={h.id}>{h.name} ({over ? `${raw - 10} — encumbered` : raw})</option>;
              })}
            </select>
          )}
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs flex-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Attacker's {mode === "cc" ? "CS" : "RS"}
              <input
                type="number"
                value={base}
                onChange={(e) => setBase(Number(e.target.value) || 0)}
                className="w-full rounded px-2 py-1 mt-1 font-bold"
                style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
              />
            </label>
            <label className="text-xs flex-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Enemy {mode === "cc" ? "TO HIT (X)" : "DEFENCE (X)"}
              <input
                type="number"
                value={enemyMod}
                onChange={(e) => setEnemyMod(Number(e.target.value) || 0)}
                className="w-full rounded px-2 py-1 mt-1 font-bold"
                style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
              />
            </label>
          </div>
          {mode === "ranged" && (
            <label className="text-xs block mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Half-height obstacles/models in LOS (−10 each)
              <input
                type="number"
                value={halfHeight}
                onChange={(e) => setHalfHeight(Number(e.target.value) || 0)}
                className="w-20 rounded px-2 py-1 mt-1 ml-2 font-bold"
                style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
              />
            </label>
          )}
          <div className="space-y-1 mb-3">
            {mods.map((m) => (
              <label key={m.label} className="flex items-center gap-2 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                <input
                  type="checkbox"
                  checked={!!checked[m.label]}
                  onChange={(e) => setChecked({ ...checked, [m.label]: e.target.checked })}
                />
                {m.label} <span style={{ color: m.value >= 0 ? palette.forest : palette.crimson, fontFamily: "JetBrains Mono, monospace" }}>({m.value > 0 ? "+" : ""}{m.value})</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between rounded p-3" style={{ background: palette.charcoal }}>
            <div>
              <div className="text-xs uppercase" style={{ color: palette.goldSoft, fontFamily: "Cinzel, serif" }}>Effective {mode === "cc" ? "CS" : "RS"}</div>
              <div className="text-2xl font-bold" style={{ color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{effective}</div>
            </div>
            <button onClick={roll} className="flex items-center gap-1.5 px-4 py-2 rounded font-bold text-sm" style={{ background: palette.ember, color: palette.parchment }}>
              <Dice5 size={16} /> Roll d100
            </button>
          </div>
          {result && (
            <div
              className="mt-3 text-center rounded p-2 font-bold"
              style={{
                background: result.outcome === "FAILURE" ? palette.crimsonDark : result.outcome === "PERFECT" ? palette.gold : palette.forestDark,
                color: palette.parchment, fontFamily: "Cinzel, serif",
              }}
            >
              Rolled {result.r} — {result.outcome}
            </div>
          )}
        </Panel>
      )}

      {mode === "damage" && (
        <Panel className="mb-4">
          <SectionTitle icon={Shield}>Damage Taken</SectionTitle>
          <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
            Damage = Weapon DMG + DB − Natural Armour − Armour
          </p>
          {heroes && heroes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {heroes.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setDb(damageBonus(h.stats.STR))}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}
                  title={`Fill DB from ${h.name}'s STR (${h.stats.STR})`}
                >
                  {h.name}'s DB ({damageBonus(h.stats.STR)})
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              ["Weapon DMG rolled", weaponDmg, setWeaponDmg],
              ["Damage Bonus (DB)", db, setDb],
              ["Natural Armour (NA)", na, setNa],
              ["Armour", armour, setArmour],
            ].map(([label, val, setter]) => (
              <label key={label} className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                {label}
                <input
                  type="number"
                  value={val}
                  onChange={(e) => setter(Number(e.target.value) || 0)}
                  className="w-full rounded px-2 py-1 mt-1 font-bold"
                  style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                />
              </label>
            ))}
          </div>
          <div className="text-center rounded p-3" style={{ background: palette.charcoal }}>
            <div className="text-xs uppercase" style={{ color: palette.goldSoft, fontFamily: "Cinzel, serif" }}>HP Lost</div>
            <div className="text-3xl font-bold" style={{ color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{dmgTotal}</div>
          </div>
        </Panel>
      )}

      {mode === "check" && (
        <Panel className="mb-4">
          <SectionTitle icon={Brain}>Stat / Skill Check</SectionTitle>
          <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
            Roll ≤ the stat/skill value to succeed. 01–05 is always a Perfect roll (regain 1 Energy, or permanently raise the stat/skill by 1 — once per settlement visit).
          </p>
          {heroes && heroes.length > 0 && (
            <div className="flex gap-1.5 mb-3">
              <select
                value={checkHeroPick}
                onChange={(e) => { setCheckHeroPick(e.target.value); applyCheckSkill(e.target.value, checkSkillPick); }}
                className="flex-1 text-xs rounded px-2 py-1"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                <option value="">Hero…</option>
                {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select
                value={checkSkillPick}
                onChange={(e) => { setCheckSkillPick(e.target.value); applyCheckSkill(checkHeroPick, e.target.value); }}
                className="flex-1 text-xs rounded px-2 py-1"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                {Object.keys(SKILL_LABELS).map((k) => <option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
              </select>
            </div>
          )}
          <label className="text-xs block mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
            Stat or skill value
            <input
              type="number"
              value={checkValue}
              onChange={(e) => setCheckValue(Number(e.target.value) || 0)}
              className="w-full rounded px-2 py-1 mt-1 font-bold"
              style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
            />
          </label>
          <button onClick={doCheck} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-sm mb-3" style={{ background: palette.ember, color: palette.parchment }}>
            <Dice5 size={16} /> Roll d100
          </button>
          {checkResult && (
            <div
              className="text-center rounded p-2 font-bold"
              style={{
                background: checkResult.outcome === "FAILURE" ? palette.crimsonDark : checkResult.outcome.startsWith("PERFECT") ? palette.gold : palette.forestDark,
                color: palette.parchment, fontFamily: "Cinzel, serif",
              }}
            >
              Rolled {checkResult.r} — {checkResult.outcome}
            </div>
          )}
        </Panel>
      )}

      {mode === "spells" && (
        <Panel className="mb-4">
          <SectionTitle icon={Sparkles}>Cast a Spell</SectionTitle>
          {heroes.length === 0 ? (
            <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>Add a hero first.</p>
          ) : (
            <>
              <label className="text-xs block mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                Hero
                <select
                  value={castHeroPick}
                  onChange={(e) => { setCastHeroPick(e.target.value); setCastSpellPick(""); setCastResult(null); }}
                  className="w-full text-sm rounded px-2 py-1.5 mt-1"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  <option value="">Choose a hero…</option>
                  {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              {castHero && (
                <p className="text-xs mb-2" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.ink }}>Mana: {castHero.mana.cur}/{castHero.mana.max}</p>
              )}
              {castHero && (
                castHero.spells.length === 0 ? (
                  <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
                    No spells known yet — add some to {castHero.name} from the Compendium tab.
                  </p>
                ) : (
                  <label className="text-xs block mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                    Spell
                    <select
                      value={castSpellPick}
                      onChange={(e) => { setCastSpellPick(e.target.value); setCastResult(null); }}
                      className="w-full text-sm rounded px-2 py-1.5 mt-1"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                    >
                      <option value="">Choose a spell…</option>
                      {castHero.spells.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                )
              )}
              {chosenSpell && (
                <div className="rounded p-2.5 mb-3" style={{ background: "#00000008" }}>
                  <p className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
                    CV {chosenSpell.cv}{chosenSpell.mana != null ? ` · Mana ${chosenSpell.mana}` : ""}{chosenSpell.upkeep ? ` · Upkeep ${chosenSpell.upkeep}/turn` : ""}
                  </p>
                  <p className="text-xs mt-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>{chosenSpell.effect}</p>
                </div>
              )}
              <button
                onClick={castSpell}
                disabled={!castHero || !chosenSpell}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-sm"
                style={{ background: palette.ember, color: palette.parchment, opacity: (!castHero || !chosenSpell) ? 0.5 : 1 }}
              >
                <Sparkles size={16} /> Cast
              </button>
              {castResult && (
                <p className="text-xs mt-3 text-center rounded p-2 font-bold" style={{ background: castResult.ok ? palette.forestDark : palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>{castResult.msg}</p>
              )}
            </>
          )}
        </Panel>
      )}

      {mode === "prayers" && (
        <Panel className="mb-4">
          <SectionTitle icon={Heart}>Say a Prayer</SectionTitle>
          {heroes.length === 0 ? (
            <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>Add a hero first.</p>
          ) : (
            <>
              <label className="text-xs block mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                Hero
                <select
                  value={prayHeroPick}
                  onChange={(e) => { setPrayHeroPick(e.target.value); setPrayPick(""); setPrayResult(null); }}
                  className="w-full text-sm rounded px-2 py-1.5 mt-1"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  <option value="">Choose a hero…</option>
                  {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              {prayHero && (
                <p className="text-xs mb-2" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.ink }}>Energy: {prayHero.energy.cur}/{prayHero.energy.max}</p>
              )}
              {prayHero && (
                prayHero.prayers.length === 0 ? (
                  <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
                    No prayers known yet — add some to {prayHero.name} from the Compendium tab.
                  </p>
                ) : (
                  <label className="text-xs block mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                    Prayer
                    <select
                      value={prayPick}
                      onChange={(e) => { setPrayPick(e.target.value); setPrayResult(null); }}
                      className="w-full text-sm rounded px-2 py-1.5 mt-1"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                    >
                      <option value="">Choose a prayer…</option>
                      {prayHero.prayers.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                )
              )}
              {chosenPrayer && (
                <div className="rounded p-2.5 mb-3" style={{ background: "#00000008" }}>
                  <p className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>Level {chosenPrayer.lvl}</p>
                  <p className="text-xs mt-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>{chosenPrayer.effect}</p>
                </div>
              )}
              <button
                onClick={sayPrayer}
                disabled={!prayHero || !chosenPrayer}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-sm"
                style={{ background: palette.ember, color: palette.parchment, opacity: (!prayHero || !chosenPrayer) ? 0.5 : 1 }}
              >
                <Heart size={16} /> Pray
              </button>
              {prayResult && (
                <p className="text-xs mt-3 text-center rounded p-2 font-bold" style={{ background: prayResult.ok ? palette.forestDark : palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>{prayResult.msg}</p>
              )}
            </>
          )}
        </Panel>
      )}
    </div>
  );
}

// ---------- Dice Tray ----------
function DiceTray({ party, setParty, heroes, updateHero, addLog }) {
  const [rolls, setRolls] = useState([]);
  const doRoll = (sides, label) => {
    const r = sides === 100 ? rollPercent() : rollDie(sides);
    setRolls((prev) => [{ label, r, id: uid() }, ...prev].slice(0, 12));
  };
  const dice = [4, 6, 10, 20, 100];

  const [lootRolls, setLootRolls] = useState([]);
  const lootLookup = (tableKey, roll) => {
    const table = LOOT_TABLES[tableKey];
    for (const entry of table) {
      const parts = entry.roll.split(/[–-]/).map((s) => parseInt(s.trim(), 10));
      const min = parts[0], max = parts.length > 1 ? parts[1] : parts[0];
      if (roll >= min && roll <= max) return entry.result;
    }
    return "—";
  };
  const rollLoot = (tableKey) => {
    const r = rollDie(10);
    const result = lootLookup(tableKey, r);
    setLootRolls((prev) => [{ tableKey, r, result, id: uid() }, ...prev].slice(0, 8));
  };

  const [doorResult, setDoorResult] = useState(null);
  const [doorHero, setDoorHero] = useState("");
  const [doorDamageInput, setDoorDamageInput] = useState(0);
  const [doorFeedback, setDoorFeedback] = useState(null);
  const activeDoorHero = heroes.find((h) => h.id === doorHero) || heroes[0];

  const [searchHeroId, setSearchHeroId] = useState("");
  const [searchersCount, setSearchersCount] = useState(1);
  const [inCorridor, setInCorridor] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchFeedback, setSearchFeedback] = useState(null);
  const activeSearchHero = heroes.find((h) => h.id === searchHeroId) || heroes[0];

  const searchTile = () => {
    if (!activeSearchHero) return;
    if (!trySpendAP(activeSearchHero, 2, setSearchFeedback)) return;
    setSearchFeedback(null);
    const searchers = Math.max(1, Number(searchersCount) || 1);
    const bonus = searchers >= 2 ? 10 + Math.max(0, searchers - 2) * 5 : 0;
    const target = (Number(activeSearchHero.skills.perception) || 0) + bonus;
    const perRoll = rollPercent();
    if (perRoll > target) {
      setSearchResult({ perRoll, target, success: false });
      addLog(`${activeSearchHero.name} searches the tile: Perception ${perRoll} vs ${target} (${bonus > 0 ? `base + ${bonus} group bonus` : "no group bonus"}) — nothing found.`);
      return;
    }
    let tableRoll = rollPercent();
    if (inCorridor) tableRoll = Math.min(100, tableRoll + 10);
    const entry = searchTileResult(tableRoll);
    setSearchResult({ perRoll, target, success: true, tableRoll, entry });
    addLog(`${activeSearchHero.name} searches the tile: Perception ${perRoll} vs ${target} — success! Rolled ${tableRoll}${inCorridor ? " (+10 corridor)" : ""} on the table: ${entry.text}`);
  };

  // Every model has a flat 2 AP per the QRS. Spends from the acting hero's pool
  // (tracked on the Turn tab) and blocks the action with feedback if they're short.
  const trySpendAP = (hero, amount, onFail) => {
    if (!hero) return false;
    const ap = hero.ap ?? 2;
    if (ap < amount) {
      const msg = `${hero.name} doesn't have enough AP (needs ${amount}, has ${ap}). Check the Turn tab.`;
      (onFail || setDoorFeedback)({ text: msg, tone: "bad" });
      return false;
    }
    updateHero(hero.id, { ...hero, ap: ap - amount });
    return true;
  };

  const openDoorOrChest = () => {
    if (!trySpendAP(activeDoorHero, 1)) return;
    setParty((prev) => ({ ...prev, threat: prev.threat + 1 }));
    const openRoll = rollDie(10);
    const trapRoll = rollDie(6);
    const trapped = trapRoll === 6;
    const row = DOOR_LOCK_TABLE.find((r) => openRoll >= r.roll[0] && openRoll <= r.roll[1]);
    setDoorResult({ openRoll, trapRoll, trapped, locked: row.locked, pickMod: row.pickMod, hp: row.hp, hpRemaining: row.hp, jammed: false });
    const feedback = `${activeDoorHero ? activeDoorHero.name + ": r" : "R"}olled ${openRoll} (d10)${trapped ? " + trapped!" : ""} — ${row.locked ? `Locked (HP ${row.hp})` : "Open!"} Threat +1.`;
    setDoorFeedback({ text: feedback, tone: row.locked ? "warn" : "good" });
    addLog(`${activeDoorHero ? activeDoorHero.name + " opens" : "Opened"} a door/chest: rolled ${openRoll} (d10)${trapped ? " + TRAPPED (d6: 6) — draw a trap card" : ""} — ${row.locked ? `Locked (Pick Lock ${row.pickMod}, HP ${row.hp})` : "Open"}. Threat +1.`);
  };

  const forceOpen = () => {
    if (!doorResult || !doorResult.locked) return;
    if (!trySpendAP(activeDoorHero, 1)) return;
    setParty((prev) => ({ ...prev, threat: prev.threat + 2 }));
    const dmg = Math.max(0, doorDamageInput);
    const newHp = Math.max(0, doorResult.hpRemaining - dmg);
    const broken = newHp <= 0;
    setDoorResult((prev) => ({ ...prev, hpRemaining: newHp, locked: !broken, jammed: false }));
    const feedback = `Dealt ${dmg} damage — ${newHp}/${doorResult.hp} HP left.${broken ? " Broken open!" : ""} Threat +2.`;
    setDoorFeedback({ text: feedback, tone: broken ? "good" : "warn" });
    addLog(`Forced the door/chest: -${dmg} HP (now ${newHp}/${doorResult.hp})${broken ? " — broken open!" : ""}. Threat +2.`);
  };

  const useCrowbar = () => {
    if (!doorResult || !doorResult.locked || !activeDoorHero) return;
    if (!trySpendAP(activeDoorHero, 1)) return;
    const dmg = 8 + damageBonus(Number(activeDoorHero.stats.STR) || 0);
    setParty((prev) => ({ ...prev, threat: prev.threat + 1 }));
    const newHp = Math.max(0, doorResult.hpRemaining - dmg);
    const broken = newHp <= 0;
    setDoorResult((prev) => ({ ...prev, hpRemaining: newHp, locked: !broken, jammed: false }));
    const feedback = `${activeDoorHero.name} deals ${dmg} damage (8+DB) — ${newHp}/${doorResult.hp} HP left.${broken ? " Broken open!" : ""} Threat +1.`;
    setDoorFeedback({ text: feedback, tone: broken ? "good" : "warn" });
    addLog(`${activeDoorHero.name} uses a crowbar: -${dmg} HP (8+DB) (now ${newHp}/${doorResult.hp})${broken ? " — broken open!" : ""}. Threat +1.`);
  };

  const pickTheLock = () => {
    if (!doorResult || !doorResult.locked || !activeDoorHero) return;
    if (!trySpendAP(activeDoorHero, 2)) return;
    const skill = (Number(activeDoorHero.skills.pickLocks) || 0) + doorResult.pickMod;
    const roll = rollPercent();
    if (roll === 100) {
      setDoorResult((prev) => ({ ...prev, jammed: true }));
      setDoorFeedback({ text: `${activeDoorHero.name} fumbles (${roll}) — the lock is jammed! Must be forced open now.`, tone: "bad" });
      addLog(`${activeDoorHero.name} fumbles picking the lock (${roll}) — jammed! Must be forced open now.`);
    } else if (roll <= skill) {
      setDoorResult((prev) => ({ ...prev, locked: false, hpRemaining: 0 }));
      setDoorFeedback({ text: `${activeDoorHero.name} picks the lock! (Rolled ${roll} vs ${skill}.) Opened, no Threat increase.`, tone: "good" });
      addLog(`${activeDoorHero.name} picks the lock (${roll} vs ${skill}) — opened! (2 AP, no Threat increase.)`);
    } else {
      setDoorFeedback({ text: `${activeDoorHero.name} fails (rolled ${roll} vs ${skill}) — the pick breaks. Still locked.`, tone: "warn" });
      addLog(`${activeDoorHero.name} fails to pick the lock (${roll} vs ${skill}) — the pick breaks.`);
    }
  };

  const closeDoor = () => {
    if (activeDoorHero) trySpendAP(activeDoorHero, 1);
    addLog("Closed a door (1 AP).");
    setDoorResult(null);
    setDoorFeedback(null);
  };

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Dice5}>Quick Dice</SectionTitle>
          {rolls.length > 0 && (
            <button
              onClick={() => setRolls([])}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded font-semibold"
              style={{ background: palette.inkSoft, color: palette.parchment }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {dice.map((d) => (
            <button
              key={d}
              onClick={() => doRoll(d, `d${d}`)}
              className="px-3 py-2 rounded font-bold text-sm"
              style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
            >
              d{d}
            </button>
          ))}
          <button
            onClick={() => doRoll(6, "Hit location")}
            className="px-3 py-2 rounded font-bold text-sm"
            style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
          >
            Hit Location (d6)
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {rolls.map((r) => (
            <div key={r.id} className="text-center rounded p-2" style={{ background: "#00000010" }}>
              <div className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>{r.label}</div>
              <div className="text-xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.ink }}>
                {r.r}
              </div>
              {r.label === "Hit location" && (
                <div className="text-xs" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>
                  {r.r === 1 ? "Head" : r.r >= 3 && r.r <= 5 ? "Torso" : r.r === 6 ? "Legs" : "Arms"}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-1">
          <SectionTitle icon={Coins}>Loot Roller (1d10)</SectionTitle>
          {lootRolls.length > 0 && (
            <button
              onClick={() => setLootRolls([])}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded font-semibold"
              style={{ background: palette.inkSoft, color: palette.parchment }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>
        <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          Pick the loot table shown on the monster card (T1–T5).
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.keys(LOOT_TABLES).map((t) => (
            <button
              key={t}
              onClick={() => rollLoot(t)}
              className="px-3 py-2 rounded font-bold text-sm"
              style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {lootRolls.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-xs rounded p-2" style={{ background: "#00000010", fontFamily: "Crimson Pro, serif", color: palette.ink }}>
              <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{l.tableKey}: {l.r}</span>
              {l.result}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={ClipboardList}>Door / Chest Opener</SectionTitle>
        <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          1 AP, model must be adjacent. Rolls the lock check + trap check together and raises Threat +1, per the book.
        </p>
        {heroes.length > 0 && (
          <select
            value={activeDoorHero?.id || ""}
            onChange={(e) => setDoorHero(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.ap ?? 2} AP)</option>)}
          </select>
        )}
        <button
          onClick={openDoorOrChest}
          className="w-full mb-3 px-3 py-2 rounded font-bold text-sm active:scale-95 transition-transform"
          style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
        >
          Open a Door / Chest (1 AP)
        </button>

        {doorFeedback && !doorResult && (
          <div
            className="rounded p-2 mb-3 text-xs font-semibold"
            style={{
              background: "#fff",
              border: `1px solid ${doorFeedback.tone === "good" ? palette.forest : doorFeedback.tone === "bad" ? palette.crimson : palette.gold}`,
              color: doorFeedback.tone === "good" ? palette.forestDark : doorFeedback.tone === "bad" ? palette.crimson : palette.charcoal,
              fontFamily: "Crimson Pro, serif",
            }}
          >
            {doorFeedback.text}
          </div>
        )}

        {doorResult && (
          <div className="rounded p-3" style={{ background: "#00000010" }}>
            <p className="text-xs mb-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
              Rolled <b>{doorResult.openRoll}</b> (d10) / <b>{doorResult.trapRoll}</b> (d6)
            </p>
            {doorResult.trapped && (
              <p className="text-xs mb-2 font-bold" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>
                TRAPPED! Draw a trap card and resolve it (Perception roll to spot it first).
              </p>
            )}
            {!doorResult.locked ? (
              <p className="text-sm font-bold" style={{ color: palette.forestDark, fontFamily: "Cinzel, serif" }}>
                Open! Flip the top Exploration Card. If it's a chest, roll on the Furniture Treasure Table (Dice tab, Loot Roller).
              </p>
            ) : (
              <>
                <p className="text-sm font-bold mb-1" style={{ color: palette.crimson, fontFamily: "Cinzel, serif" }}>
                  Locked — Pick Lock {doorResult.pickMod >= 0 ? "+" : ""}{doorResult.pickMod}, HP {doorResult.hpRemaining}/{doorResult.hp}
                </p>
                {doorResult.jammed && (
                  <p className="text-xs mb-2 font-bold" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>
                    Jammed! The lock can no longer be picked — it must be forced open.
                  </p>
                )}
                <select
                  value={activeDoorHero?.id || ""}
                  onChange={(e) => setDoorHero(e.target.value)}
                  className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>

                {!doorResult.jammed && (
                  <button
                    onClick={pickTheLock}
                    className="w-full mb-1.5 text-xs px-2 py-2 rounded font-semibold active:scale-95 transition-transform"
                    style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
                    title="2 AP, no Threat increase — breaks the pick on a fail, jams on a fumble (natural 00)"
                  >
                    Pick the Lock ({activeDoorHero ? (Number(activeDoorHero.skills.pickLocks) || 0) + doorResult.pickMod : "—"})
                  </button>
                )}

                <div className="flex gap-1.5 mb-1.5">
                  <input
                    type="number"
                    value={doorDamageInput}
                    onChange={(e) => setDoorDamageInput(Number(e.target.value) || 0)}
                    placeholder="Damage"
                    className="w-20 text-xs rounded px-2 py-1.5"
                    style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                  />
                  <button
                    onClick={forceOpen}
                    className="flex-1 text-xs px-2 py-1.5 rounded font-semibold active:scale-95 transition-transform"
                    style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
                    title="1 AP, +2 Threat per attempt — enter the damage your attack rolled"
                  >
                    Force Open (+2 Threat)
                  </button>
                </div>
                <button
                  onClick={useCrowbar}
                  className="w-full text-xs px-2 py-1.5 rounded font-semibold active:scale-95 transition-transform"
                  style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
                  title="1 AP, +1 Threat — fixed 8+DB damage instead of a weapon roll"
                >
                  Use a Crowbar (8+DB, +1 Threat)
                </button>
              </>
            )}

            {doorFeedback && (
              <div
                className="rounded p-2 mt-2 text-xs font-semibold"
                style={{
                  background: "#fff",
                  border: `1px solid ${doorFeedback.tone === "good" ? palette.forest : doorFeedback.tone === "bad" ? palette.crimson : palette.gold}`,
                  color: doorFeedback.tone === "good" ? palette.forestDark : doorFeedback.tone === "bad" ? palette.crimson : palette.charcoal,
                  fontFamily: "Crimson Pro, serif",
                }}
              >
                {doorFeedback.text}
              </div>
            )}

            <button
              onClick={closeDoor}
              className="w-full mt-2 text-xs px-2 py-1.5 rounded font-semibold active:scale-95 transition-transform"
              style={{ background: "#00000015", color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}
            >
              Close / Dismiss (1 AP to close a door)
            </button>
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={ClipboardList}>Search a Tile</SectionTitle>
        <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          2 AP, Perception test. On a success, rolls 1d100 on the outcome table (+10 if the tile is a corridor).
        </p>
        {heroes.length > 0 && (
          <select
            value={activeSearchHero?.id || ""}
            onChange={(e) => setSearchHeroId(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name} (Perception {h.skills.perception ?? 0}, {h.ap ?? 2} AP)</option>)}
          </select>
        )}
        <div className="flex gap-1.5 mb-1.5">
          <label className="flex-1 flex items-center gap-1.5 text-xs rounded px-2 py-1.5" style={{ border: `1px solid ${palette.line}`, color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Heroes searching
            <input
              type="number"
              value={searchersCount}
              onChange={(e) => setSearchersCount(Number(e.target.value) || 1)}
              className="w-10 rounded px-1"
              style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
              title="2 = +10 Perception, +5 more per hero beyond that"
            />
          </label>
          <button
            onClick={() => setInCorridor((v) => !v)}
            className="px-3 py-1.5 rounded text-xs font-semibold active:scale-95 transition-transform"
            style={{ background: inCorridor ? palette.crimsonDark : "#00000010", color: inCorridor ? palette.parchment : palette.ink, fontFamily: "Cinzel, serif" }}
          >
            {inCorridor ? "Corridor (+10)" : "Room"}
          </button>
        </div>
        <button
          onClick={searchTile}
          className="w-full mb-2 px-3 py-2 rounded font-bold text-sm active:scale-95 transition-transform"
          style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
        >
          Search (2 AP)
        </button>
        {searchFeedback && (
          <p className="text-xs mb-2 font-semibold" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>{searchFeedback.text}</p>
        )}
        {searchResult && (
          <div className="rounded p-3" style={{ background: "#00000010" }}>
            <p className="text-xs mb-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
              Perception: rolled <b>{searchResult.perRoll}</b> vs <b>{searchResult.target}</b>
            </p>
            {!searchResult.success ? (
              <p className="text-sm font-bold" style={{ color: palette.inkSoft, fontFamily: "Cinzel, serif" }}>Nothing found.</p>
            ) : (
              <>
                <p className="text-xs mb-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>Table roll: <b>{searchResult.tableRoll}</b></p>
                <p className="text-sm font-bold" style={{ color: palette.forestDark, fontFamily: "Cinzel, serif" }}>{searchResult.entry.text}</p>
              </>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function QuestRollerPanel() {
  const [result, setResult] = useState(null);

  const roll = (origin) => {
    let r;
    if (origin === "silverCity") r = rollSilverCityQuest();
    else if (origin === "outpost") r = rollOutpostQuest();
    else r = rollVillageQuest();
    setResult({ origin, ...r });
  };

  const originLabel = { silverCity: "Silver City", outpost: "The Outpost", village: "Village" };

  return (
    <Panel>
      <SectionTitle icon={ScrollText}>Quest Generator</SectionTitle>
      <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
        You must be in the quest's location to start it — random-location quests may be started anywhere, including Silver City. If a village name appears in brackets, your party must be in that village; re-roll if not.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => roll("silverCity")} className="px-3 py-2 rounded font-bold text-sm" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
          In Silver City
        </button>
        <button onClick={() => roll("village")} className="px-3 py-2 rounded font-bold text-sm" style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
          In a Village
        </button>
        <button onClick={() => roll("outpost")} className="px-3 py-2 rounded font-bold text-sm" style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}>
          At The Outpost
        </button>
      </div>
      {result && (
        <div className="rounded p-3" style={{ background: palette.charcoal }}>
          <p className="text-xs mb-1" style={{ color: "#B8A78A", fontFamily: "JetBrains Mono, monospace" }}>
            {originLabel[result.origin]} · {result.steps.join(" · ")}
          </p>
          {result.entry ? (
            <>
              <p className="text-lg font-bold" style={{ color: palette.parchment, fontFamily: "Cinzel, serif" }}>{result.entry.name}</p>
              <p className="text-sm" style={{ color: palette.goldSoft, fontFamily: "JetBrains Mono, monospace" }}>Book {result.entry.book}, page {result.entry.page}</p>
            </>
          ) : (
            <p className="text-sm" style={{ color: palette.parchment }}>No matching quest found.</p>
          )}
        </div>
      )}
    </Panel>
  );
}

// ---------- Reference ----------
function Reference() {
  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon={Users}>Species & Classes</SectionTitle>
        <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          <b>Species:</b> {SPECIES.join(" · ")}
        </p>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          {PROFESSIONS.map((p) => (
            <p key={p.name}><b>{p.name}:</b> {p.desc}</p>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={BookOpen}>Turn Sequence</SectionTitle>
        <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          1. Roll the scenario die (once past the first door) — if triggered, roll 1d20 against threat level, then adjust torches/lamps · 2. Move models by initiative · 3. Check sanity changes · 4. Check party morale.
        </p>
      </Panel>

      <Panel>
        <SectionTitle icon={BookOpen}>Action Points</SectionTitle>
        {Object.entries(AP_ACTIONS).map(([cost, actions]) => (
          <div key={cost} className="mb-2">
            <div className="text-xs font-bold uppercase mb-1" style={{ color: palette.crimson, fontFamily: "Cinzel, serif" }}>{cost}</div>
            <div className="text-xs" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>{actions.join(" · ")}</div>
          </div>
        ))}
      </Panel>

      <Panel>
        <SectionTitle icon={Swords}>Power Attack, Parry & Rolls</SectionTitle>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <p><b>Power attack:</b> +20 CS. Re-roll DMG and take the best, or +2 AP if attacker is Large. Bloodlust = max DMG.</p>
          <p><b>Parry (not in defensive stance):</b> Dodge, or Shield once (−15 CS).</p>
          <p><b>Parry (in defensive stance):</b> Dodge AND either Parry with weapon, or Shield (+15 CS).</p>
          <p><b>Rolls:</b> 00 for a hero damages the weapon. 00 for an enemy makes it drop its weapon (or fall, if unarmed). A natural 01–05 on a To-Hit roll lets you roll damage twice and take the higher.</p>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Skull}>Fear & Terror</SectionTitle>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <p><b>Fear (X):</b> Test if hero level ≤ X. Failed RES test → −10 CS/RS vs that enemy, −10 Arcane Arts for spells against it.</p>
          <p><b>Terror (X):</b> Test if hero level ≤ X (treat as Fear if level &gt; X). Failed RES−20 test → Stunned, −10 CS/RS vs that enemy, −10 Arcane Arts against it.</p>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Flame}>Damage Types</SectionTitle>
        <div className="text-xs space-y-1.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          {DAMAGE_TYPES.map((d) => (
            <p key={d.type}><b>{d.type}:</b> {d.effect}</p>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Flame}>Threat Table (roll 1d20 when triggered)</SectionTitle>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <p><b>Not in battle:</b> 1–12 wandering monster (−5) · 13–15 extra exploration card (−5) · 16–17 encounter risk +10, max 70% (−6) · 18–19 a hero springs a trap (−7) · 20 +1 to all scenario die rolls, once only (−10)</p>
          <p><b>In battle:</b> 1 casters do nothing next turn (−2) · 2 enemy gains poisonous (−2) · 3 an enemy +15 CS until dead (−3) · 4–5 a wounded enemy heals 1d10 HP (−3) · 6 an enemy gains frenzy (−3) · 7 a hero drops their weapon (−3) · 8 an enemy gains fear (−4) · 9 new encounter placed outside a random door, acts last (−4) · 10 all enemies +10 CS until battle ends (−6)</p>
          <p style={{ fontStyle: "italic" }}>On a natural 20, reduce threat by 5 instead. If the roll is above the current threat, increase threat by 1 (no table roll).</p>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Skull}>Doors (roll 1d10)</SectionTitle>
        <table className="w-full text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <tbody>
            {DOOR_TABLE.map((d) => (
              <tr key={d.roll} style={{ borderBottom: `1px solid ${palette.line}55` }}>
                <td className="py-1 pr-2 font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{d.roll}</td>
                <td className="py-1 pr-2">{d.result}</td>
                <td className="py-1">{d.extra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel>
        <SectionTitle icon={Skull}>Encounters & Traps</SectionTitle>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <p>Room: 50% chance of enemies (01–50). Corridor: 30% (01–30). After 4 consecutive tiles with no encounter, the chance rises +10 until one triggers.</p>
          <p><b>Traps:</b> Draw a trap card → PER roll (eye modifier); fail = trap resolves (incl. Sanity/Morale). Success = leave it or try to disarm with a Pick Locks roll (cogs modifier, 2 AP; disarm kit +10). Failing the disarm springs the trap.</p>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Users}>Initiative Tokens</SectionTitle>
        <ul className="text-xs list-disc pl-4 space-y-0.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          {INITIATIVE_TOKENS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </Panel>

      <Panel>
        <SectionTitle icon={Flame}>Wandering Monster</SectionTitle>
        <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          Starts on the start tile. Moves once every other model has moved: 4 squares, first move always toward the heroes. After that, roll 1d6 each turn: 1 = move back toward the exit, 2–6 = shortest route toward the heroes. A closed door stops it for that turn — merely closed doors open on 2–6 (1d6); magically sealed or wedged doors need 5–6.
        </p>
      </Panel>

      <Panel>
        <SectionTitle icon={Heart}>Rest</SectionTitle>
        <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          No enemies on the tile or adjacent tiles, all heroes together.
        </p>
        <ol className="text-xs list-decimal pl-4 space-y-0.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          {REST_STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Panel>

      <Panel>
        <SectionTitle icon={BookOpen}>Searching a Tile</SectionTitle>
        <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          2 AP, make a Perception test (+10 if 2 heroes search together, +5 per additional hero beyond 2). If in a corridor, add +10 to any search-result roll.
        </p>
      </Panel>
    </div>
  );
}

// ---------- Campaigns ----------
function CampaignsTab({ campaigns, activeId, onNew, onLoad, onRename, onDelete, onExport, onImport, disabled }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const sorted = [...campaigns].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const submitNew = () => {
    const name = newName.trim() || "Unnamed Campaign";
    onNew(name);
    setNewName("");
    setCreating(false);
  };

  const confirmDelete = async (id) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const doExport = async (id) => {
    setExportingId(id);
    try {
      await onExport(id);
    } finally {
      setExportingId(null);
    }
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    setImporting(true);
    try {
      await onImport(file);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <Panel className="mb-4">
        <SectionTitle icon={FolderOpen}>Campaigns</SectionTitle>
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm"
            style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
          >
            <Plus size={16} /> Start New Campaign
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNew()}
              placeholder="Campaign name…"
              className="flex-1 rounded px-2 py-2 text-sm"
              style={{ border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            />
            <button onClick={submitNew} className="px-3 rounded" style={{ background: palette.forestDark, color: palette.parchment }}>
              <Check size={16} />
            </button>
            <button onClick={() => { setCreating(false); setNewName(""); }} className="px-3 rounded" style={{ background: palette.inkSoft, color: palette.parchment }}>
              <X size={16} />
            </button>
          </div>
        )}
        <p className="text-xs mt-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Starting a new campaign resets heroes, threat, morale and the log to a fresh start. Your other campaigns stay saved below.
        </p>
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Upload}>Backup & Restore</SectionTitle>
        <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Campaign data lives in this browser only — clearing site data or switching devices will lose it. Export a campaign to a file you can keep safe, and import it back in (here or on another device) any time.
        </p>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChosen} className="hidden" />
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={importing || disabled}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm"
          style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif", opacity: (importing || disabled) ? 0.6 : 1 }}
        >
          {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {importing ? "Importing…" : "Import Campaign from File"}
        </button>
      </Panel>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <Panel><p className="text-sm" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>No campaigns yet.</p></Panel>
        )}
        {sorted.map((c) => {
          const isActive = c.id === activeId;
          const isEditing = editingId === c.id;
          const isConfirming = confirmDeleteId === c.id;
          return (
            <Panel key={c.id} style={{ border: isActive ? `2px solid ${palette.crimson}` : `1px solid ${palette.line}` }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-1.5">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (onRename(c.id, editName.trim() || c.name), setEditingId(null))}
                        className="flex-1 rounded px-2 py-1 text-sm"
                        style={{ border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                      />
                      <button onClick={() => { onRename(c.id, editName.trim() || c.name); setEditingId(null); }} className="px-2 rounded" style={{ background: palette.forestDark, color: palette.parchment }}>
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "Cinzel, serif", color: palette.ink }} className="font-bold text-sm truncate">{c.name}</span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: palette.crimson, color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>ACTIVE</span>
                      )}
                    </div>
                  )}
                  <div className="text-xs mt-0.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                    {c.heroCount} hero{c.heroCount === 1 ? "" : "es"} · Threat {c.threat} · Morale {c.morale}
                    {c.updatedAt ? ` · ${new Date(c.updatedAt).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!isActive && (
                    <button onClick={() => onLoad(c.id)} disabled={disabled} className="px-2 py-1.5 rounded text-xs font-bold" style={{ background: palette.crimson, color: palette.parchment, fontFamily: "Cinzel, serif", opacity: disabled ? 0.5 : 1 }}>
                      Load
                    </button>
                  )}
                  <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} disabled={disabled} className="p-1.5 rounded" style={{ color: palette.inkSoft, opacity: disabled ? 0.5 : 1 }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => doExport(c.id)} disabled={exportingId === c.id || disabled} className="p-1.5 rounded" style={{ color: palette.inkSoft, opacity: (exportingId === c.id || disabled) ? 0.5 : 1 }}>
                    {exportingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                  {isConfirming ? (
                    <button
                      onClick={() => confirmDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-bold"
                      style={{ background: palette.crimsonDark, color: palette.parchment, opacity: deletingId === c.id ? 0.7 : 1 }}
                    >
                      {deletingId === c.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      {deletingId === c.id ? "Deleting…" : "Confirm?"}
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(c.id)} disabled={disabled} className="p-1.5 rounded" style={{ color: palette.crimson, opacity: disabled ? 0.5 : 1 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Heroes Tab (per-hero sub-tabs) ----------
function HeroesTab({ heroes, updateHero, removeHero, addHero, addLog, pushToast, party, setParty }) {
  const [selectedId, setSelectedId] = useState(heroes[0] ? heroes[0].id : null);

  useEffect(() => {
    if (heroes.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!heroes.find((h) => h.id === selectedId)) setSelectedId(heroes[0].id);
  }, [heroes, selectedId]);

  const handleAdd = () => {
    const newHero = defaultHero();
    addHero(newHero);
    setSelectedId(newHero.id);
  };

  const selectedHero = heroes.find((h) => h.id === selectedId);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <button
          onClick={handleAdd}
          className="shrink-0 flex items-center justify-center p-2 rounded-lg font-bold"
          style={{ background: palette.forestDark, color: palette.parchment }}
          title="Add Hero"
        >
          <Plus size={16} />
        </button>
        <div className="flex-1 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          {heroes.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedId(h.id)}
              className="relative shrink-0 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
              style={{
                background: selectedId === h.id ? palette.crimson : "#00000010",
                color: selectedId === h.id ? palette.parchment : palette.ink,
                fontFamily: "Cinzel, serif",
                maxWidth: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {h.name || "New Hero"}
              {h.improvementPoints > 0 && (
                <span
                  className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-bold"
                  style={{ width: 16, height: 16, fontSize: 9, background: palette.gold, color: palette.charcoal, fontFamily: "JetBrains Mono, monospace" }}
                  title={`${h.improvementPoints} Improvement Points to spend`}
                >
                  {h.improvementPoints > 9 ? "9+" : h.improvementPoints}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedHero ? (
        <HeroCard
          key={selectedHero.id}
          hero={selectedHero}
          update={(next) => updateHero(selectedHero.id, next)}
          remove={() => removeHero(selectedHero.id)}
          addLog={addLog}
          pushToast={pushToast}
          party={party}
          setParty={setParty}
        />
      ) : (
        <Panel>
          <p className="text-sm text-center py-4" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            No heroes yet — tap the + button to add one.
          </p>
        </Panel>
      )}
    </div>
  );
}

// ---------- Main App ----------
const IDX_KEY = "lod-campaigns-index";
const ACTIVE_KEY = "lod-active-campaign";
const campaignKey = (id) => `lod-campaign-${id}`;

export default function App() {
  const [campaignId, setCampaignId] = useState(null);
  const [campaigns, setCampaigns] = useState([]); // index summaries
  const [heroes, setHeroes] = useState([defaultHero()]);
  const [party, setParty] = useState(defaultParty());
  const [log, setLog] = useState([]);
  const [tab, setTab] = useState("party");
  const [loaded, setLoaded] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchingLabel, setSwitchingLabel] = useState("Loading campaign…");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error

  const addLog = useCallback((text) => {
    setLog((prev) => [...prev, text].slice(-60));
  }, []);

  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((title, body) => {
    setToasts((prev) => [...prev, { id: uid(), title, body }]);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Mobile fix: a number input starting at "0" won't let you type a replacement digit
  // without first selecting/clearing it — typing "5" after "0" gives "05" until the
  // extra zero is deleted separately. Auto-selecting the content on focus means the
  // next digit typed just overwrites it, everywhere in the app, without needing to
  // touch every individual input.
  useEffect(() => {
    const handler = (e) => {
      if (e.target && e.target.tagName === "INPUT" && e.target.type === "number") {
        e.target.select();
      }
    };
    document.addEventListener("focusin", handler);
    return () => document.removeEventListener("focusin", handler);
  }, []);

  const readIndex = async () => {
    try {
      const res = await window.storage.get(IDX_KEY, false);
      return res && res.value ? JSON.parse(res.value) : [];
    } catch (e) {
      return [];
    }
  };
  const writeIndex = async (list) => {
    await window.storage.set(IDX_KEY, JSON.stringify(list), false);
    setCampaigns(list);
  };

  // Bootstrap: load index + active campaign, or create a first campaign
  useEffect(() => {
    (async () => {
      try {
        let idx = await readIndex();
        let activeIdRes = null;
        try {
          const r = await window.storage.get(ACTIVE_KEY, false);
          activeIdRes = r ? r.value : null;
        } catch (e) {}

        if (idx.length === 0) {
          const id = uid();
          const data = { heroes: [defaultHero()], party: defaultParty(), log: [] };
          await window.storage.set(campaignKey(id), JSON.stringify(data), false);
          const entry = { id, name: "My First Campaign", updatedAt: Date.now(), threat: 2, morale: 0, heroCount: 1 };
          idx = [entry];
          await writeIndex(idx);
          await window.storage.set(ACTIVE_KEY, id, false);
          activeIdRes = id;
          setHeroes(data.heroes); setParty(data.party); setLog(data.log);
          setCampaignId(id);
        } else {
          setCampaigns(idx);
          const activeId = activeIdRes && idx.find((c) => c.id === activeIdRes) ? activeIdRes : idx[0].id;
          const cRes = await window.storage.get(campaignKey(activeId), false);
          const data = cRes && cRes.value ? JSON.parse(cRes.value) : { heroes: [defaultHero()], party: defaultParty(), log: [] };
          setHeroes((data.heroes || [defaultHero()]).map(normalizeHero));
          setParty(normalizeParty(data.party));
          setLog(data.log || []);
          setCampaignId(activeId);
          if (!activeIdRes) await window.storage.set(ACTIVE_KEY, activeId, false);
        }
      } catch (e) {
        // fall back to a blank in-memory campaign
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save current campaign on change (after initial load)
  useEffect(() => {
    if (!loaded || !campaignId) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await window.storage.set(campaignKey(campaignId), JSON.stringify({ heroes, party, log }), false);
        const idx = await readIndex();
        const now = Date.now();
        const next = idx.some((c) => c.id === campaignId)
          ? idx.map((c) => (c.id === campaignId ? { ...c, updatedAt: now, threat: party.threat, morale: party.morale, heroCount: heroes.length } : c))
          : [...idx, { id: campaignId, name: "Campaign", updatedAt: now, threat: party.threat, morale: party.morale, heroCount: heroes.length }];
        await writeIndex(next);
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [heroes, party, log, loaded, campaignId]);

  const addHero = (hero) => setHeroes((prev) => [...prev, hero || defaultHero()]);
  const updateHero = (id, next) => setHeroes((prev) => prev.map((h) => (h.id === id ? next : h)));
  const removeHero = (id) => setHeroes((prev) => prev.filter((h) => h.id !== id));

  // ---- Campaign management ----
  const newCampaign = async (name, importedData) => {
    setSwitchingLabel(importedData ? "Importing campaign…" : "Starting new campaign…");
    setSwitching(true);
    try {
      const id = uid();
      const data = importedData
        ? {
            heroes: (importedData.heroes || [defaultHero()]).map(normalizeHero),
            party: normalizeParty(importedData.party),
            log: importedData.log || [],
          }
        : { heroes: [defaultHero()], party: defaultParty(), log: [] };
      await window.storage.set(campaignKey(id), JSON.stringify(data), false);
      const idx = await readIndex();
      const entry = { id, name, updatedAt: Date.now(), threat: data.party.threat, morale: data.party.morale, heroCount: data.heroes.length };
      await writeIndex([...idx, entry]);
      await window.storage.set(ACTIVE_KEY, id, false);
      setCampaignId(id);
      setHeroes(data.heroes);
      setParty(data.party);
      setLog(data.log);
      setTab("party");
    } finally {
      setSwitching(false);
    }
  };

  const loadCampaign = async (id) => {
    setSwitchingLabel("Loading campaign…");
    setSwitching(true);
    try {
      const res = await window.storage.get(campaignKey(id), false);
      const data = res && res.value ? JSON.parse(res.value) : { heroes: [defaultHero()], party: defaultParty(), log: [] };
      await window.storage.set(ACTIVE_KEY, id, false);
      setCampaignId(id);
      setHeroes((data.heroes || [defaultHero()]).map(normalizeHero));
      setParty(normalizeParty(data.party));
      setLog(data.log || []);
      setTab("party");
    } catch (e) {
      // leave current state as-is on failure
    } finally {
      setSwitching(false);
    }
  };

  const renameCampaign = async (id, name) => {
    const idx = await readIndex();
    await writeIndex(idx.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const deleteCampaign = async (id) => {
    setSwitchingLabel("Deleting campaign…");
    setSwitching(true);
    try {
      const idx = await readIndex();
      const remaining = idx.filter((c) => c.id !== id);
      try { await window.storage.delete(campaignKey(id), false); } catch (e) {}
      await writeIndex(remaining);
      if (id === campaignId) {
        if (remaining.length > 0) {
          await loadCampaign(remaining[0].id);
        } else {
          await newCampaign("My Campaign");
        }
      }
    } finally {
      setSwitching(false);
    }
  };

  const exportCampaign = async (id) => {
    const idx = await readIndex();
    const entry = idx.find((c) => c.id === id);
    let data;
    if (id === campaignId) {
      data = { heroes, party, log };
    } else {
      const res = await window.storage.get(campaignKey(id), false);
      data = res && res.value ? JSON.parse(res.value) : { heroes: [], party: defaultParty(), log: [] };
    }
    const payload = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      name: entry ? entry.name : "Campaign",
      ...data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (entry ? entry.name : "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    a.href = url;
    a.download = `lod-campaign-${safeName || "export"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importCampaign = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || (!parsed.heroes && !parsed.party)) throw new Error("Not a recognised campaign file");
      const name = (parsed.name ? `${parsed.name} (imported)` : "Imported Campaign");
      await newCampaign(name, parsed);
    } catch (e) {
      window.alert("Couldn't import that file — it doesn't look like a campaign export.");
    }
  };

  const tabs = [
    ["party", "Party", Flame],
    ["turn", "Turn", Timer],
    ["settlement", "Settlement", Landmark],
    ["heroes", "Heroes", Users],
    ["combat", "Combat", Swords],
    ["dice", "Dice", Dice5],
    ["quest", "Quest", Map],
    ["compendium", "Compendium", ScrollText],
    ["campaigns", "Campaigns", FolderOpen],
    ["reference", "Reference", BookOpen],
  ];

  return (
    <div style={{ minHeight: "100vh", background: palette.parchment, fontFamily: "Crimson Pro, serif" }}>
      <style>{fontImport}</style>
      {(!loaded || switching) && <LoadingOverlay label={!loaded ? "Opening the ledger…" : switchingLabel} />}
      <UpdateToast />
      <LevelUpToastStack toasts={toasts} dismissToast={dismissToast} />
      <InstallBanner />

      <header style={{ background: palette.charcoal, borderBottom: `4px solid ${palette.crimson}` }} className="px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: "Cinzel, serif", color: palette.goldSoft, letterSpacing: "0.04em" }} className="text-xl font-bold">
              LEAGUE OF DUNGEONEERS
            </h1>
            <p style={{ color: "#B8A78A", fontFamily: "Crimson Pro, serif" }} className="text-xs italic">
              {campaigns.find((c) => c.id === campaignId)?.name || "Companion & Ledger"}
            </p>
          </div>
          <span className="text-xs" style={{ color: "#B8A78A", fontFamily: "JetBrains Mono, monospace" }}>
            {saveState === "saving" ? "saving…" : saveState === "saved" ? "saved ✓" : saveState === "error" ? "save failed" : ""}
          </span>
        </div>
      </header>

      <nav
        className="max-w-2xl mx-auto flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scroll-hide"
        style={{ scrollSnapType: "x proximity" }}
      >
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shrink-0"
            style={{
              scrollSnapAlign: "start",
              background: tab === key ? palette.crimson : palette.panel,
              color: tab === key ? palette.parchment : palette.inkSoft,
              fontFamily: "Cinzel, serif",
              border: `1px solid ${tab === key ? palette.crimson : palette.line}`,
            }}
          >
            <Icon size={14} /> {label}
            {key === "heroes" && heroes.some((h) => h.improvementPoints > 0) && (
              <span
                className="absolute -top-1 -right-1 rounded-full"
                style={{ width: 10, height: 10, background: palette.gold, border: `1.5px solid ${palette.parchment}` }}
                title="A hero has Improvement Points to spend"
              />
            )}
          </button>
        ))}
      </nav>

      <main className="max-w-2xl mx-auto px-4 pb-16 pt-2">
        {tab === "party" && <PartyPanel party={party} setParty={setParty} log={log} addLog={addLog} heroes={heroes} updateHero={updateHero} pushToast={pushToast} />}
        {tab === "turn" && <TurnTab party={party} setParty={setParty} heroes={heroes} updateHero={updateHero} addLog={addLog} />}
        {tab === "settlement" && (
          <SettlementTab party={party} setParty={setParty} heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />
        )}
        {tab === "heroes" && (
          <HeroesTab heroes={heroes} updateHero={updateHero} removeHero={removeHero} addHero={addHero} addLog={addLog} pushToast={pushToast} party={party} setParty={setParty} />
        )}
        {tab === "combat" && <CombatCalc heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />}
        {tab === "dice" && <DiceTray party={party} setParty={setParty} heroes={heroes} updateHero={updateHero} addLog={addLog} />}
        {tab === "quest" && <QuestRollerPanel />}
        {tab === "compendium" && <CompendiumTab heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />}
        {tab === "campaigns" && (
          <CampaignsTab
            campaigns={campaigns}
            activeId={campaignId}
            onNew={newCampaign}
            onLoad={loadCampaign}
            onRename={renameCampaign}
            onDelete={deleteCampaign}
            onExport={exportCampaign}
            onImport={importCampaign}
            disabled={switching}
          />
        )}
        {tab === "reference" && <Reference />}
      </main>
      <Footer />
    </div>
  );
}
