import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Minus, Trash2, Flame, Heart, Zap, Brain, Sparkles, Dice5,
  Swords, Shield, BookOpen, Users, Skull,
  RotateCcw, Coins, Wheat, ScrollText, Pencil, Check, X, FolderOpen, Loader2, Map, Download, Upload,
  Landmark, Bed, ClipboardList, Timer, Flashlight, FlaskConical, Library
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
// Rolls a flat number or a "NdM" dice string (e.g. "1d3", "1d8") — used for Monster Parts
// quantities and similar variable amounts.
function rollDiceString(spec) {
  if (typeof spec === "number") return spec;
  const m = String(spec).match(/(\d+)d(\d+)/);
  if (!m) return Number(spec) || 0;
  const [, count, sides] = m;
  let total = 0;
  for (let i = 0; i < Number(count); i++) total += rollDie(Number(sides));
  return total;
}
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
  bleedingOutRolled: false, // has the one-time 1d4 permanent loss for this knockout been rolled?
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
  legendaryItems: [],
  conditions: [],
  backpackUpgrade: "",
  tempEffects: [],
  mentalConditions: [], // [{id, name, detail, effect}] — see MENTAL_CONDITIONS_TABLE
  alchemyComponents: [], // [{id, name, type: "Ingredient"|"Part", qty, exquisiteQty}]
  alchemyRecipes: [], // [{id, potionName, strength, components: [name,...]}] — custom, on top of COMMON_RECIPES
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
  { name: "Duckfolk", hp: { base: 6, count: 1, size: 6 }, stats: { STR: 25, CON: 25, DEX: 30, WIS: 30, RES: 40 }, max: { STR: 55, CON: 60, DEX: 70, WIS: 70, RES: 80 }, note: "Short arms — cannot use Longbows or Elvin bows.", expansion: "The False Prophet" },
  { name: "Frogling", hp: { base: 4, count: 1, size: 6 }, stats: { STR: 20, CON: 35, DEX: 40, WIS: 30, RES: 25 }, note: "Cannot use Longbows or Elvin bows (height)." },
  { name: "Half-Ogre", hp: { base: 10, count: 2, size: 6 }, stats: { STR: 50, CON: 40, DEX: 25, WIS: 15, RES: 40 }, max: { STR: 80, CON: 60, DEX: 60, WIS: 60, RES: 60 }, note: "+2 Sanity. May only take the Warrior, Barbarian, or Rogue profession.", expansion: "The False Prophet" },
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
    reward: { type: "item", name: "Armour of the Father", note: "Now in the Compendium's Legendary Items list — attach it there once claimed." },
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
  { name: "Knight", desc: "Heavy melee tank with a squire — never uses ranged weapons or steals.", expansion: "The False Prophet", note: "No Improvement Point cost data yet — spending IP won't work correctly until starting stats are added." },
  { name: "Druid", desc: "Nature caster — invocations and beastforms, fragile but shapeshifts into combat forms.", expansion: "The False Prophet", note: "No Improvement Point cost data yet — spending IP won't work correctly until starting stats are added." },
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
  dungeonLuck: 0, // party-held Luck Points from Black Lever result 8 — lost on leaving the dungeon
  travelMode: "walking", // "walking" | "mounted"
  allCamels: false,
  mpSpent: 0,
  travelLog: [], // [{label, cost}] — hexes entered so far today
  hungry: false,
  hungerConDeltas: {}, // heroId -> amount subtracted from CON, restored when the party eats again
  estate: {
    owned: false, rooms: [], items: [], pendingRoom: null, shrineGod: null,
    heroTraining: {}, // heroId -> "Archery Range" | "Training Grounds", cleared each dungeon cycle
    alchemistLabUsed: false, gardenUsed: false, // reset each dungeon cycle
  },
  transport: { horses: 0, camels: 0, mules: 0, wagons: 0, saddlebags: 0 }, // bought at Alberta's Magnificent Animals, Whiteport
  storage: { mule: [], wagon: [], saddlebags: [] }, // ENC-capped item lists per transport type
  grievingMother: "none", // "none" | "triggered" | "succeeded" | "failed"
  pendingGhostlyEvent: null, // forces the next Ghostly Events roll straight to a specific entry (e.g. 8, after failing the Grieving Mother)
  magicWorkshop: { enchantUsed: false, scrollAttempts: 0 }, // reset each dungeon cycle — "only one object OR two scroll attempts between quests"
  guilds: {
    training: {}, // `${heroId}:${skillKey}` -> true, one Skill Training session per skill between dungeons, reset each cycle
    bountyHunt: { rolled: [], claimed: [] }, // Fighters' Guild — 5 rolled kinds this cycle, and which have been claimed
    crusade: null, // Inner Sanctum — { against, killed } rolled this cycle
    taxidermistAttempts: {}, // Rangers' Guild — settlementName -> true, one sale attempt per settlement per cycle
  },
  quests: {
    completed: {}, // questKey ("campaign:First Blood", "random:The Lava River", "side:Mushrooms") -> true
    randomActive: null, // currently-rolled Random Quest name, or null
    sideActive: null, // currently-rolled Side Quest name, or null
  },
});

// Fills in any fields missing from a party saved before this update.
function normalizeParty(p) {
  const merged = { ...defaultParty(), ...(p || {}) };
  merged.estate = { ...defaultParty().estate, ...(p?.estate || {}) };
  merged.guilds = { ...defaultParty().guilds, ...(p?.guilds || {}) };
  merged.estate.heroTraining = { ...(p?.estate?.heroTraining || {}) };
  merged.transport = { ...defaultParty().transport, ...(p?.transport || {}) };
  merged.storage = { ...defaultParty().storage, ...(p?.storage || {}) };
  merged.magicWorkshop = { ...defaultParty().magicWorkshop, ...(p?.magicWorkshop || {}) };
  merged.quests = { ...defaultParty().quests, ...(p?.quests || {}) };
  merged.quests.completed = { ...(p?.quests?.completed || {}) };
  return merged;
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
// Campaign quests (Quest Book I) — known named quests. "Quests into the Ancient Lands"
// has 5 quests but their names aren't confirmed from the rulebook yet, so it's left off
// this list rather than guessed at.
const STANDALONE_QUESTS = [
  { name: "First Blood", note: "Introductory quest, p221 — played before choosing a campaign" },
];

const CAMPAIGNS = [
  {
    name: "The Dead Rising",
    quests: [
      "Quest 1: Spring Cleaning",
      "Quest 2: The Dead Rising",
      "Quest 3: Highwaymen",
      "Quest 4: The Burning Village",
      "Quest 5: The Apprentice",
      "Quest 6A: Sacrifice",
      "Quest 6B: The Master",
    ],
  },
  {
    name: "Lair of the Spider Queen",
    quests: [
      "Level 1: The Entrance",
      "Level 2: The Basement",
      "Level 3: The Tomb of the Spider Queen",
    ],
  },
];

// Quests into the Ancient Lands — 5 quests, each with 2 possible objective rooms
// depending on whether the party has access to the Ancient Lands tiles. Which room
// applies is decided at the table, so it isn't tracked here.
const ANCIENT_LANDS_QUESTS = [
  "The Pyramid of Xanthu",
  "Tomb of the Hierophant",
  "Temple of Despair",
  "Hall of Amenhotep",
  "Crypt of Khaba",
];

// Quest Book II — from its own table of contents. Only titles are confirmed so far,
// no page numbers or mechanics, since only the ToC has been reviewed.
const BOOK2_MAIN_QUESTS = [
  "Cult of the Hydra",
  "Witches",
  "Halls of the Goblin King",
  "The Northern Tombs",
  "The Lost Prayer",
  "The Ghost of a King",
  "A Kingdom Gone",
  "The Toad",
  "Corsairs",
  "Giant Slayer",
  "And Out Come The Wolves...",
];

const BOOK2_BACKER_QUESTS = [
  "A Hell of a Night ...",
  "The Grey Lady",
  "Runes to Ruin",
  "At the Bat",
  "Black Acanthus",
  "Not Even in Death Do We Part",
  "A Beast For Every Occasion",
  "Tower of the Troll King",
  "Life in Death",
  "Saving the Nordman",
  "Rescue Operation",
  "By Rose and Anchor",
];

// Quest Book II — Mini Quests chapter. Short standalone encounters, no roll table to
// pick one — worked through one by one or chosen freely.
const BOOK2_MINI_QUESTS = [
  { name: "Spiders in the Forest" },
  { name: "The Kidnapped Kid" },
  { name: "Old Forgotten Tomb" },
  { name: "The Old Lady" },
  { name: "Old Temple" },
  { name: "Old Ruin" },
  { name: "Clear Out the Bandits" },
  { name: "The Moonstone" },
  { name: "Kill the Beast" },
  { name: "Save the Farm", note: "Requires the Companions Expansion" },
  { name: "The Curse" },
  { name: "Escort" },
];

// Random Quests pool (p241) — roll 1d6, reroll on a 6.
const RANDOM_QUESTS_TABLE = [
  { roll: 1, name: "The Lava River" },
  { roll: 2, name: "The Bandits' Hideout" },
  { roll: 3, name: "The Fountain Room" },
  { roll: 4, name: "The Great Crypt" },
  { roll: 5, name: "The Chamber of Reverence" },
];

function rollRandomQuest() {
  let r = rollDie(6);
  let rerolled = false;
  while (r === 6) { r = rollDie(6); rerolled = true; }
  const entry = RANDOM_QUESTS_TABLE.find((e) => e.roll === r);
  return { ...entry, rerolled };
}

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

// Table of Relics (p194) — permanent Warrior-Priest-only magic items, one per god, distinct
// from the Temple boons above. Only 2 may be worn at once unless the Reliquary talent is
// known. Effect uses the same shape as TALENT_EFFECTS/LEGENDARY_ITEM_EFFECTS where possible;
// Metheia's is reference-only since it modifies future heal rolls rather than a flat stat.
const RELIC_EFFECTS = {
  Charus: { energy: 1, label: "+1 Energy Point" },
  Metheia: { label: "+1d3 to any healing done by the Priest (reference only — apply the roll manually when healing)" },
  Iphy: { stat: "RES", amount: 5, label: "+5 Resolve" },
  Rhidnir: { luck: 1, label: "+1 Luck" },
  Ohlnir: { skill: "cs", amount: 5, label: "+5 CS" },
  Ramos: { stat: "STR", amount: 5, label: "+5 STR" },
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
// Room costs and effects confirmed from rulebook p159. "Only one thing may be bought
// in between every quest, and it cannot be used until after leaving the next dungeon."
const MANOR_ROOMS = [
  { name: "Alchemist Lab", cost: 500, effect: "An Alchemist making a recipe here may choose what kind of potion it yields. Only one recipe may be made between each dungeon visit." },
  { name: "Archery Range", cost: 500, effect: "Any hero staying at the manor may increase their RS by +1d2, once between each visit to a dungeon. A hero may train at the Archery Range OR the Training Grounds, not both." },
  { name: "Training Grounds", cost: 500, effect: "Any hero may increase CS or Dodge (choice) by +1d2, once between each visit to a dungeon. A hero may train at the Archery Range OR the Training Grounds, not both." },
  { name: "Wizard's Study", cost: 500, effect: "A wizard may store any number of Familiars here for free (Companions' Expansion). Any Enchantment or Magic Scribble cast here gets a +20 modifier." },
  { name: "Shrine", cost: 350, effect: "Dedicated to one god of the hero's choice (only one shrine, due to rivalry between gods). Any hero may pray at the shrine between quests for the standard boon, for free, succeeding on 1-4 on 1d6." },
  { name: "Smithy", cost: 350, effect: "All heroes may automatically repair 1d3 Durability Points on all weapons and armour." },
  { name: "Crops, Hen House, and Pigsty", cost: 200, effect: "If a hero spends at least a full day tending to these, the party receives 1d8 + the number of spent days in free rations." },
  { name: "Garden", cost: 200, effect: "An Alchemist may gather 1d6+2 random ingredients from the garden, once between each quest." },
  { name: "Kennel", cost: 75, requiresExpansion: "The Companions' Expansion", effect: "Leave any owned dogs behind between quests instead of bringing them." },
];

// Ghostly Events Table (p160-161). Trigger: roll 1d10 the night before departure — on 7-10,
// roll again on this table (also 1d10).
const GHOSTLY_EVENTS = [
  { roll: 1, name: "The Family Heirlooms", text: "The heroes may roll twice on the Wonderful Treasure deck. However, the lack of sleep deprives each hero of 1 Point of Energy." },
  { roll: 2, name: "Guardian Spirits", text: "+1 Luck for all heroes during the coming quest." },
  { roll: 3, name: "The Hidden Treasure", text: "Add a Side Quest Card to the first half of the pile when setting up the Dungeon Cards. When drawn, remove it and immediately draw the next card. On that card, add 1 extra door leading to the R10 tile — a normal door in all aspects, can be locked/trapped, but no encounters inside." },
  { roll: 4, name: "Spiritual Guides", text: "All heroes get +5 CS / +5 RS during the coming quest." },
  { roll: 5, name: "Protector", text: "Any wizard in the party will only miscast on 97-00 during the coming quest. If there's no wizard, ignore this and head out without any ghostly events." },
  { roll: 6, name: "The Grieving Mother", text: "See the Grieving Mother Side Quest. If already succeeded, treat this as #2 instead. If tried and failed, may try again." },
  { roll: 7, name: "Angered Ghost", text: "Any rations from the Crops, Hen House, and Pigsty are lost." },
  { roll: 8, name: "Restless Night", text: "All heroes start the next quest with -2 Energy (minimum 0). Regained as usual after the quest has started." },
  { roll: 9, name: "Lost Item", text: "Randomise which hero is affected, then randomise between all weapons, all pieces of armour, and all rations (a single item/category). It's left back at the estate and can't be used until after the next dungeon." },
  { roll: 10, name: "The Curse", text: "Every hero suffers an individual curse from the Curse Table, which can't be lifted until they're back in the city." },
];

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

// Profession armour Tier caps and weapon Class caps, from each profession's "Limitations"
// text (Creating Your Character). Professions not listed here (Warrior, Warrior Priest)
// showed no Limitations section — treated as unrestricted.
const PROFESSION_ARMOUR_TIER_LIMIT = {
  Rogue: 3,
  Alchemist: 3,
  Thief: 3,
  Barbarian: 3,
  Wizard: 2,
  Ranger: 3,
};
const PROFESSION_WEAPON_CLASS_LIMIT = {
  Thief: 2,
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
  // Nightstalker Armour (p146, The Dark Guild). Tier 2 (leather) for restrictions/other rules.
  // High Quality gives DUR 8 instead of 6. Dark as the Night: -5 CS/RS to hit the wearer
  // (-10 if all 4 pieces — Cap, Vest/Jacket, Pants, Bracers — are worn); not cumulative per-piece.
  { name: "Nightstalker Cap", tier: 2, def: 4, enc: 1, covers: ["head"], special: "High Quality (DUR 8)", cost: 230, avail: 3, dur: 8 },
  { name: "Nightstalker Vest", tier: 2, def: 4, enc: 3, covers: ["torso"], special: "Dark as the Night (-5 to be hit, -10 if all 4 Nightstalker pieces worn), High Quality (DUR 8)", cost: 650, avail: 3, dur: 8 },
  { name: "Nightstalker Jacket", tier: 2, def: 4, enc: 4, covers: ["arms", "torso"], special: "Dark as the Night (-5 to be hit, -10 if all 4 Nightstalker pieces worn), High Quality (DUR 8)", cost: 1000, avail: 3, dur: 8 },
  { name: "Nightstalker Pants", tier: 2, def: 4, enc: 3, covers: ["legs"], special: "Dark as the Night (-5 to be hit, -10 if all 4 Nightstalker pieces worn), High Quality (DUR 8)", cost: 900, avail: 3, dur: 8 },
  { name: "Nightstalker Bracers", tier: 2, def: 4, enc: 3, covers: ["arms"], special: "High Quality (DUR 8)", cost: 150, avail: 3, dur: 8 },
];
const NIGHTSTALKER_ARMOUR_NAMES = ["Nightstalker Cap", "Nightstalker Vest", "Nightstalker Jacket", "Nightstalker Pants", "Nightstalker Bracers"];

// ---------- Guilds (p146-157) ----------
// All six guilds only exist in Silver City. Fighters', Rangers', Alchemists', and The Dark
// Guild are gated by the settlement's "Guilds" service tag; Wizards' Guild the same; The
// Inner Sanctum is gated separately by its own "Inner Sanctum" service tag.

// Fighters' Guild — Bounty Hunt (p149). Roll 1d00 (1-100, "00"=100) five times per
// settlement visit to build the hunt list. 250c per unique kind claimed once killed.
const BOUNTY_HUNT_TABLE = [
  { min: 1, max: 3, name: "Bandit" }, { min: 4, max: 5, name: "Bandit Leader" }, { min: 6, max: 6, name: "Banshee" },
  { min: 7, max: 7, name: "Beastman" }, { min: 8, max: 8, name: "Beastman Guard" }, { min: 9, max: 9, name: "Berserker" },
  { min: 10, max: 10, name: "Bloated Demon" }, { min: 11, max: 11, name: "Blood Demon" }, { min: 12, max: 12, name: "Cave Bear" },
  { min: 13, max: 13, name: "Cave Goblin" }, { min: 14, max: 14, name: "Centaur" }, { min: 15, max: 15, name: "Cockatrice" },
  { min: 16, max: 16, name: "Common Troll" }, { min: 17, max: 17, name: "Dark Elf" }, { min: 18, max: 18, name: "Dark Elf Assassin" },
  { min: 19, max: 19, name: "Dark Elf Captain" }, { min: 20, max: 20, name: "Dark Elf Sniper" }, { min: 21, max: 21, name: "Dark Elf Warlock" },
  { min: 22, max: 22, name: "Dire Wolf" }, { min: 23, max: 23, name: "Drider" }, { min: 24, max: 24, name: "Earth Elemental" },
  { min: 25, max: 25, name: "Ettin" }, { min: 26, max: 26, name: "Fallen Knight" }, { min: 27, max: 27, name: "Fire Elemental" },
  { min: 28, max: 28, name: "Frogling" }, { min: 29, max: 29, name: "Gargoyle" }, { min: 30, max: 30, name: "Gecko" },
  { min: 31, max: 31, name: "Gecko Assassin" }, { min: 32, max: 32, name: "Ghost" }, { min: 33, max: 33, name: "Ghoul" },
  { min: 34, max: 34, name: "Giant" }, { min: 35, max: 35, name: "Bat Swarm" }, { min: 36, max: 36, name: "Giant Centipede" },
  { min: 37, max: 37, name: "Giant Leach" }, { min: 38, max: 38, name: "Giant Pox Rat" }, { min: 39, max: 39, name: "Giant Rat" },
  { min: 40, max: 40, name: "Giant Scorpion" }, { min: 41, max: 41, name: "Giant Snake" }, { min: 42, max: 42, name: "Giant Spider" },
  { min: 43, max: 43, name: "Giant Toad" }, { min: 44, max: 44, name: "Giant Wolf" }, { min: 45, max: 45, name: "Gigantic Snake" },
  { min: 46, max: 46, name: "Gigantic Spider" }, { min: 47, max: 47, name: "Gnoll" }, { min: 48, max: 48, name: "Gnoll Sergeant" },
  { min: 49, max: 49, name: "Gnoll Shaman" }, { min: 50, max: 50, name: "Goblin" }, { min: 51, max: 51, name: "Goblin Shaman" },
  { min: 52, max: 52, name: "Greater Demon" }, { min: 53, max: 53, name: "Griffon" }, { min: 54, max: 54, name: "Harpy" },
  { min: 55, max: 55, name: "Hydra" }, { min: 56, max: 56, name: "Lesser Plague Demon" }, { min: 57, max: 57, name: "Lurker" },
  { min: 58, max: 58, name: "Medusa" }, { min: 59, max: 59, name: "Mimic" }, { min: 60, max: 60, name: "Minotaur" },
  { min: 61, max: 61, name: "Minotaur Skeleton" }, { min: 62, max: 62, name: "Mummy" }, { min: 63, max: 63, name: "Mummy Priest" },
  { min: 64, max: 64, name: "Mummy Queen" }, { min: 65, max: 65, name: "Naga" }, { min: 66, max: 66, name: "Necromancer" },
  { min: 67, max: 67, name: "Ogre" }, { min: 68, max: 68, name: "Ogre Berserker" }, { min: 69, max: 69, name: "Ogre Chieftain" },
  { min: 70, max: 70, name: "Orc" }, { min: 71, max: 71, name: "Orc Brute" }, { min: 72, max: 72, name: "Orc Chieftain" },
  { min: 73, max: 73, name: "Orc Shaman" }, { min: 74, max: 74, name: "Plague Demon" }, { min: 75, max: 75, name: "Raptor" },
  { min: 76, max: 76, name: "River Troll" }, { min: 77, max: 77, name: "Salamander" }, { min: 78, max: 78, name: "Satyr" },
  { min: 79, max: 79, name: "Saurian" }, { min: 80, max: 80, name: "Saurian Elite" }, { min: 81, max: 81, name: "Saurian Priest" },
  { min: 82, max: 82, name: "Saurian Warchief" }, { min: 83, max: 83, name: "Shambler" }, { min: 84, max: 84, name: "Skeleton" },
  { min: 85, max: 85, name: "Slime" }, { min: 86, max: 86, name: "Sphinx" }, { min: 87, max: 87, name: "Stone Golem" },
  { min: 88, max: 88, name: "Stone Troll" }, { min: 89, max: 89, name: "Tomb Guardian" }, { min: 90, max: 90, name: "Vampire" },
  { min: 91, max: 91, name: "Vampire Fledgling" }, { min: 92, max: 92, name: "Warlock" }, { min: 93, max: 93, name: "Water Elemental" },
  { min: 94, max: 94, name: "Werewolf" }, { min: 95, max: 95, name: "Wight" }, { min: 96, max: 96, name: "Wind Elemental" },
  { min: 97, max: 97, name: "Wraiths" }, { min: 98, max: 98, name: "Wyvern" }, { min: 99, max: 99, name: "Zombie" },
  { min: 100, max: 100, name: "Zombie Ogre" },
];
function rollBountyHunt() {
  const roll = rollDie(100); // rollDie(100) already returns 1-100, doubling as "00"=100
  const entry = BOUNTY_HUNT_TABLE.find((e) => roll >= e.min && roll <= e.max);
  return { roll, name: entry ? entry.name : "Bandit" };
}

// Fighters' Guild — Buying Special Equipment (p150). All sold only at the Fighters' Guild.
const FIGHTERS_GUILD_EQUIPMENT = [
  { name: "Gauntlets", enc: 1, dur: null, special: "Increases arm armour +1. Only one set worn at a time.", cost: 50, avail: 5 },
  { name: "Gorget", enc: 1, dur: null, special: "Increases head armour +1. Only one set worn at a time.", cost: 50, avail: 4 },
  { name: "Pain Killer", enc: 0, dur: 1, special: "Snort it (1 AP): remove any wound status marker and regain lost AP, lasting the whole battle. Wound status returns after the battle if still applicable.", cost: 50, avail: 3 },
  { name: "Poleyns (metal knee pads)", enc: 1, dur: null, special: "Increases leg armour +1. Only one set worn at a time.", cost: 15, avail: 5 },
  { name: "Shield Padding", enc: 1, dur: null, special: "Increases a shield's Durability by +1 (Durability 7; 9 for a magic shield).", cost: 50, avail: 4 },
  { name: "Shoulder Pads", enc: 1, dur: null, special: "Increases torso armour +1. Only one set worn at a time.", cost: 50, avail: 5 },
  { name: "Slayer Weapon Treatment", enc: null, dur: null, special: "+1 DMG on an edged weapon at full Durability, cumulative with other modifiers, lasts until the weapon breaks.", cost: 100, avail: 6 },
];

// Rangers' Guild — Buying Special Equipment (p155)
const RANGERS_GUILD_EQUIPMENT = [
  { name: "Aim Attachment", enc: 0, dur: null, special: "Added to a shortbow, bow, or crossbow. Aim Action gives +15 instead of +10.", cost: 200, avail: 3 },
  { name: "Barbed Arrows (5)", enc: 1, dur: null, special: "+1 DMG.", cost: 25, avail: 4 },
  { name: "Barbed Bolts (5)", enc: 1, dur: null, special: "+1 DMG.", cost: 25, avail: 4 },
  { name: "Compass", enc: 0, dur: 1, special: "Reroll one Travel Event per travel. Must be carried in a Quick Slot.", cost: 300, avail: 3 },
  { name: "Elven Skinning Knife", enc: 1, dur: null, special: "+10 Foraging only while skinning. Can be kept in the backpack.", cost: 250, avail: 3 },
  { name: "Skinning Knife", enc: 1, dur: null, special: "Lets a Ranger skin animals. Can be kept in the backpack.", cost: 100, avail: 5 },
  { name: "Taxidermist tools", enc: 3, dur: null, special: "+10 Foraging only while rolling for a Trophy.", cost: 150, avail: 3 },
  { name: "Wild game traps", enc: 3, dur: null, special: "+10 Foraging when catching animals. Can be kept in the backpack.", cost: 150, avail: 5 },
];

// Rangers' Guild — Taxidermist sell table (p154): roll 1d20, add result to the creature's
// XP to get the sale price. 0 or negative means no buyer in that settlement this attempt.
const TAXIDERMIST_SELL_TABLE = [
  { min: 1, max: 1, village: -500, silverCity: -300 },
  { min: 2, max: 3, village: -400, silverCity: -200 },
  { min: 4, max: 5, village: -300, silverCity: -100 },
  { min: 6, max: 8, village: -150, silverCity: -50 },
  { min: 9, max: 14, village: 0, silverCity: 0 },
  { min: 15, max: 17, village: 50, silverCity: 100 },
  { min: 18, max: 19, village: 100, silverCity: 200 },
  { min: 20, max: 20, village: 200, silverCity: 300 },
];

// Wizards' Guild — Buying Wizard's Staffs (p151). Staffs double as close-combat weapons
// (same stats as a normal staff, DUR 8) and have 3 charges unless noted; recharging costs
// half the purchase price.
const WIZARDS_GUILD_STAFFS = [
  { name: "Arcane Staff", effect: "+5 modifier to Arcane Arts. When leaving a dungeon, roll 1d10 — on 9-10 the magic has dissipated and it's a normal staff until recharged.", cost: 400, avail: 4 },
  { name: "Fire Staff", effect: "Contains the Magic Flare spell.", cost: 400, avail: 3 },
  { name: "Major Mana Staff", effect: "Stores 30 points of Mana between quests. Storing takes no time, done while resting at the inn.", cost: 800, avail: 2 },
  { name: "Mana Staff", effect: "Stores 20 points of Mana between quests. Storing takes no time, done while resting at the inn.", cost: 500, avail: 3 },
  { name: "Minor Mana Staff", effect: "Stores 10 points of Mana between quests. Storing takes no time, done while resting at the inn.", cost: 300, avail: 4 },
  { name: "Staff of Illumination", effect: "Works like a lantern. On a miscast the flame goes out (not for any other reason) — spend 1 Action to rekindle it.", cost: 300, avail: 4 },
  { name: "Staff of Slow", effect: "Contains the spell: Slow.", cost: 400, avail: 3 },
  { name: "Staff of the Bolt", effect: "Contains the spell: Magic Bolt.", cost: 500, avail: 3 },
  { name: "Staff of the Heart", effect: "+3 HP while carried. Between quests, roll 1d10 — on a 10 the magic has dissipated and it's a normal staff until recharged.", cost: 350, avail: 4 },
];

// The Inner Sanctum — Buying Special Equipment (p156), only available to Warrior Priests
const INNER_SANCTUM_EQUIPMENT = [
  { name: "Religious Relic (Necklace)", enc: 0, dur: 1, special: "See the Treasures chapter (Legendary Items) for variants.", cost: 500, avail: 4 },
  { name: "Religious Relic (Ring)", enc: 0, dur: 1, special: "See the Treasures chapter (Legendary Items) for variants.", cost: 500, avail: 4 },
  { name: "Incense", enc: 0, dur: 1, special: "+5 Prayer skill. Enough for 1 skirmish or 1 dungeon. May be lit in a Quick Slot during skirmish setup or before entering a dungeon.", cost: 40, avail: 4 },
];

// The Inner Sanctum — Crusades (p157)
const CRUSADE_TABLE = ["Undead", "Bandits", "Orcs and Goblins", "Beasts", "Dark Elves", "Reptiles"];

// Alchemists' Guild — Purchasing Ingredients & Parts (p152). A part or ingredient costs
// 15c once the Availability Roll succeeds. Reuses MONSTER_PARTS_TABLE / INGREDIENTS_TABLE
// names already used by Gather & Harvest.
const ALCHEMY_PART_AVAILABILITY = {
  "Amphibian skin": 4, "Bat wings": 5, "Beast heart": 3, "Bonemeal": 5, "Brain tissue": 4,
  "Chitin": 3, "Cyclops eye": 2, "Dragon blood": 1, "Ectoplasm": 3, "Elf hair": 4,
  "Feathers": 5, "Fur": 5, "Ghoul blood": 4, "Goblin Eye": 5, "Human blood": 5,
  "Medusas eye": 2, "Mummy dust": 3, "Nails": 4, "Ogre teeth": 3, "Rat tail": 5,
  "Scales": 4, "Shapeshifter blood": 3, "Slime": 4, "Spider fang": 4, "Spirit wood": 3,
  "Spores": 3, "Tongue": 4, "Troll blood": 3, "Vampire blood": 2, "Zombie skin": 4,
};
const ALCHEMY_INGREDIENT_AVAILABILITY = {
  "Lunarberry": 5, "Arching Pokeroot": 4, "Ashen Ginger": 5, "Barbed Wormwood": 1, "Bitterweed": 4,
  "Blue Coneflower": 5, "Bright Gallberry": 3, "Dragon Stalk": 4, "Ember Bark": 5, "Giant Raspberry": 5,
  "Monk's Laurel": 1, "Mountain Barberry": 3, "Nightshade": 5, "Salty Wyrmwood": 2, "Snakeberry": 3,
  "Spicy Windroot": 5, "Sweet Ivy": 3, "Toxic Hogweed": 3, "Weeping Clover": 4, "Wintercress": 4,
};

// Alchemists' Guild — potion catalogue merged from the Weak/Standard/Supreme tables used
// elsewhere for random potion rolls, so the guild shop can sell a *named* potion at a
// chosen strength. Weak potions are always in stock (no roll needed); Standard is
// Availability 5; Supreme is Availability 4.
function buildPotionCatalog() {
  const byName = {};
  WEAK_SUPREME_POTIONS_TABLE.forEach((e) => {
    byName[e.potion] = { ...(byName[e.potion] || {}), weak: e.weak, supreme: e.supreme };
  });
  Object.values(STANDARD_POTIONS_SUBTABLES).forEach((sub) => {
    sub.forEach((e) => {
      if (!e.potion) return;
      byName[e.potion] = { ...(byName[e.potion] || {}), standard: e.cost };
    });
  });
  return Object.entries(byName)
    .map(([name, costs]) => ({ name, ...costs }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
// NOTE: ALCHEMISTS_GUILD_POTIONS itself is built further down (after
// WEAK_SUPREME_POTIONS_TABLE / STANDARD_POTIONS_SUBTABLES are declared) to avoid a
// temporal-dead-zone crash — see the assignment just below those two tables.

// The Dark Guild — Skill Training list (p146): CS, RS, Pick Locks, Perception.
const DARK_GUILD_SKILLS = ["cs", "rs", "pickLocks", "perception"];

// ---------- Alchemy (p71-79) ----------

// Monster Parts Table (p73) — used by Harvest Parts. qty is a flat number or a dice
// string ("1d3", "1d8"...). If a monster isn't listed, it provides nothing harvestable.
const MONSTER_PARTS_TABLE = {
  "Bandit": { part: "Human blood", qty: 1 }, "Bandit Leader": { part: "Human blood", qty: 1 },
  "Banshee": { part: "Ectoplasm", qty: 1 }, "Bat swarm": { part: "Bat wings", qty: "1d3" },
  "Beastman": { part: "Beast heart", qty: 1 }, "Beastman Chieftain": { part: "Beast heart", qty: 1 },
  "Beastman Guard": { part: "Beast heart", qty: 1 }, "Berserker": { part: "Human blood", qty: 1 },
  "Cave Bear": { part: "Fur", qty: 2 }, "Cave Goblin": { part: "Goblin Eye", qty: "1d2" },
  "Centaur": { part: "Beast heart", qty: 1 }, "Cockatrice": { part: "Feathers", qty: 2 },
  "Common Troll": { part: "Troll blood", qty: 1 }, "Dark Elf": { part: "Elf hair", qty: 1 },
  "Dark Elf Assassin": { part: "Elf hair", qty: 1 }, "Dark Elf Captain": { part: "Elf hair", qty: 1 },
  "Dark Elf Sniper": { part: "Elf hair", qty: 1 }, "Dark Elf Warlock": { part: "Brain tissue", qty: 1 },
  "Dire Wolf": { part: "Fur", qty: 1 }, "Dragon": { part: "Dragon blood", qty: "1d8" },
  "Drider": { part: "Beast heart", qty: 1 }, "Ettin": { part: "Nails", qty: "1d4" },
  "Fallen Knight": { part: "Human blood", qty: 1 }, "Frogling": { part: "Amphibian skin", qty: 1 },
  "Gecko": { part: "Scales", qty: 1 }, "Gecko Assassin": { part: "Scales", qty: 1 },
  "Ghost": { part: "Ectoplasm", qty: 1 }, "Ghoul": { part: "Ghoul blood", qty: 1 },
  "Giant": { part: "Nails", qty: "1d4" }, "Giant Centipede": { part: "Chitin", qty: 1 },
  "Giant Leech": { part: "Slime", qty: 1 }, "Giant Pox rat": { part: "Rat tail", qty: 1 },
  "Giant Rat": { part: "Rat tail", qty: 1 }, "Giant Scorpion": { part: "Chitin", qty: "1d3" },
  "Giant Snake": { part: "Tongue", qty: 1 }, "Giant Spider": { part: "Spider fang", qty: 1 },
  "Giant Toad": { part: "Amphibian skin", qty: "1d3" }, "Giant Wolf": { part: "Fur", qty: 1 },
  "Gigantic Snake": { part: "Tongue", qty: "1d3" }, "Gigantic Spider": { part: "Spider fang", qty: "1d3" },
  "Gnoll": { part: "Beast heart", qty: 1 }, "Gnoll Sergeant": { part: "Beast heart", qty: 1 },
  "Gnoll Shaman": { part: "Brain tissue", qty: "1d2" }, "Goblin": { part: "Goblin Eye", qty: "1d2" },
  "Goblin Shaman": { part: "Brain tissue", qty: 1 }, "Griffon": { part: "Feathers", qty: "1d4" },
  "Harpy": { part: "Feathers", qty: 1 }, "Hydra": { part: "Scales", qty: "1d8" },
  "Medusa": { part: "Medusas eye", qty: "1d2" }, "Mimic": { part: "Tongue", qty: 1 },
  "Minotaur": { part: "Beast heart", qty: 2 }, "Minotaur Skeleton": { part: "Bonemeal", qty: 2 },
  "Mummy": { part: "Mummy dust", qty: 1 }, "Mummy Priest": { part: "Mummy dust", qty: 1 },
  "Mummy Queen": { part: "Mummy dust", qty: 1 }, "Naga": { part: "Scales", qty: 1 },
  "Necromancer": { part: "Brain tissue", qty: 1 }, "Ogre": { part: "Ogre teeth", qty: 1 },
  "Ogre Berserker": { part: "Ogre teeth", qty: 1 }, "Ogre Chieftain": { part: "Ogre teeth", qty: 1 },
  "Orc": { part: "Orc blood", qty: 1 }, "Orc Brute": { part: "Orc blood", qty: 1 },
  "Orc Chieftain": { part: "Orc blood", qty: 1 }, "Orc Shaman": { part: "Brain tissue", qty: 1 },
  "Psyker": { part: "Brain tissue", qty: 2 }, "Raptor": { part: "Scales", qty: 1 },
  "River Troll": { part: "Troll blood", qty: 1 }, "Salamander": { part: "Scales", qty: 1 },
  "Satyr": { part: "Beast heart", qty: 1 }, "Saurian": { part: "Scales", qty: 1 },
  "Saurian Elite": { part: "Scales", qty: 1 }, "Saurian Priest": { part: "Brain tissue", qty: 1 },
  "Saurian Warchief": { part: "Scales", qty: 1 }, "Shambler": { part: "Shambler leaves", qty: "1d3" },
  "Skeleton": { part: "Bonemeal", qty: 1 }, "Slime": { part: "Slime", qty: 1 },
  "Sphinx": { part: "Feathers", qty: "1d4" }, "Stone Troll": { part: "Troll blood", qty: 1 },
  "Tomb Guardian": { part: "Bonemeal", qty: 2 }, "Vampire": { part: "Vampire blood", qty: "1d4" },
  "Vampire Fledgling": { part: "Vampire blood", qty: 1 }, "Warlock": { part: "Brain tissue", qty: 1 },
  "Werewolf": { part: "Fur", qty: 1 }, "Wight": { part: "Bonemeal", qty: 1 },
  "Wraiths": { part: "Ectoplasm", qty: 1 }, "Wyvern": { part: "Scales", qty: "1d4" },
  "Zombie": { part: "Zombie skin", qty: "1d4" }, "Zombie Ogre": { part: "Zombie skin", qty: 1 },
};
const ALCHEMY_PART_NAMES = [...new Set(Object.values(MONSTER_PARTS_TABLE).map((p) => p.part))].sort();

// Ingredients Table (p71) — for Gather Ingredients. Roll 1d100 against the column
// matching the habitat being searched.
const HABITATS = ["Roadside", "Plains", "Woods", "Water", "Highland", "Site"];
const INGREDIENTS_TABLE = [
  { name: "Arching Pokeroot", Roadside: [1, 5], Plains: null, Woods: [1, 5], Water: null, Highland: [1, 10], Site: [1, 5] },
  { name: "Ashen Ginger", Roadside: null, Plains: [1, 5], Woods: [6, 16], Water: [1, 5], Highland: [11, 20], Site: null },
  { name: "Barbed Wormwood", Roadside: [6, 10], Plains: [6, 10], Woods: [17, 21], Water: [6, 10], Highland: [21, 25], Site: [6, 16] },
  { name: "Bitterweed", Roadside: [11, 15], Plains: [11, 20], Woods: [22, 26], Water: null, Highland: null, Site: [17, 21] },
  { name: "Blue Coneflower", Roadside: [16, 26], Plains: [21, 25], Woods: [27, 31], Water: null, Highland: [26, 30], Site: null },
  { name: "Bright Gallberry", Roadside: null, Plains: [26, 30], Woods: null, Water: null, Highland: [31, 40], Site: [22, 27] },
  { name: "Dragon Stalk", Roadside: [27, 37], Plains: [31, 35], Woods: [32, 36], Water: null, Highland: [41, 45], Site: [28, 33] },
  { name: "Ember bark", Roadside: null, Plains: [36, 40], Woods: [37, 47], Water: null, Highland: [46, 50], Site: [34, 39] },
  { name: "Salty Wyrmwood", Roadside: null, Plains: null, Woods: [48, 52], Water: [11, 20], Highland: [51, 56], Site: [40, 45] },
  { name: "Spicy Windroot", Roadside: [38, 43], Plains: [41, 50], Woods: [53, 63], Water: null, Highland: [57, 67], Site: null },
  { name: "Giant Raspberry", Roadside: [44, 54], Plains: [51, 60], Woods: [64, 68], Water: [21, 25], Highland: [68, 72], Site: null },
  { name: "Lunarberry", Roadside: [55, 60], Plains: [61, 70], Woods: [69, 73], Water: [26, 30], Highland: null, Site: [46, 51] },
  { name: "Monk's Laurel", Roadside: null, Plains: [71, 75], Woods: [74, 84], Water: [31, 45], Highland: null, Site: [52, 57] },
  { name: "Mountain Barberry", Roadside: [61, 65], Plains: null, Woods: null, Water: [46, 50], Highland: [73, 83], Site: null },
  { name: "Nightshade", Roadside: [66, 70], Plains: null, Woods: null, Water: [51, 56], Highland: null, Site: [58, 74] },
  { name: "Snakeberry", Roadside: null, Plains: [76, 80], Woods: [85, 90], Water: [57, 70], Highland: null, Site: [75, 85] },
  { name: "Sweet Ivy", Roadside: [71, 80], Plains: [81, 90], Woods: [91, 95], Water: null, Highland: [84, 89], Site: null },
  { name: "Toxic Hogweed", Roadside: [81, 85], Plains: null, Woods: null, Water: [71, 85], Highland: null, Site: [86, 100] },
  { name: "Wintercress", Roadside: [86, 90], Plains: null, Woods: [96, 100], Water: [86, 95], Highland: [90, 100], Site: null },
  { name: "Weeping Clover", Roadside: [91, 100], Plains: [91, 100], Woods: null, Water: [96, 100], Highland: null, Site: null },
];
const ALCHEMY_INGREDIENT_NAMES = INGREDIENTS_TABLE.map((r) => r.name);
function ingredientsTableLookup(habitat, roll) {
  return INGREDIENTS_TABLE.find((row) => row[habitat] && roll >= row[habitat][0] && roll <= row[habitat][1]);
}
// Pure version of AlchemyTab's addComponent, for use anywhere a hero's alchemyComponents list needs updating
// without needing the whole AlchemyTab component (e.g. the Estate Garden room).
function addAlchemyComponent(hero, name, type, qty, exquisite) {
  const existing = (hero.alchemyComponents || []).find((c) => c.name === name);
  if (existing) {
    return hero.alchemyComponents.map((c) =>
      c.name === name ? { ...c, qty: c.qty + (exquisite ? 0 : qty), exquisiteQty: c.exquisiteQty + (exquisite ? qty : 0) } : c
    );
  }
  return [...(hero.alchemyComponents || []), { id: uid(), name, type, qty: exquisite ? 0 : qty, exquisiteQty: exquisite ? qty : 0 }];
}
// Lists a hero's weapon + worn armour as {key, label, piece} for the Enchant/Charge resolvers.
function heroEquippedItems(hero) {
  const items = [];
  if (hero.weapon?.name) items.push({ key: "weapon", label: `${hero.weapon.name} (weapon)`, piece: hero.weapon });
  ["head", "arms", "torso", "legs"].forEach((slot) => {
    if (hero.armour?.[slot]?.name) items.push({ key: `armour:${slot}`, label: `${hero.armour[slot].name} (${slot})`, piece: hero.armour[slot] });
  });
  return items;
}
function applyItemPatch(hero, key, patch) {
  if (key === "weapon") return { ...hero, weapon: { ...hero.weapon, ...patch } };
  if (key.startsWith("armour:")) {
    const slot = key.split(":")[1];
    return { ...hero, armour: { ...hero.armour, [slot]: { ...hero.armour[slot], ...patch } } };
  }
  const id = key.split(":")[1];
  return { ...hero, backpack: hero.backpack.map((it) => (it.id === id ? { ...it, ...patch } : it)) };
}
// Weapon + worn armour + backpack items, for pickers where any owned item is a valid target (e.g. Identify).
function heroAllItems(hero) {
  const items = heroEquippedItems(hero);
  (hero.backpack || []).forEach((it) => {
    if (it.name) items.push({ key: `backpack:${it.id}`, label: `${it.name} (backpack)`, piece: it });
  });
  return items;
}

// Common Recipes (p76) — widely known among alchemists; available to any hero with the
// Alchemy skill without needing to be learned first.
const COMMON_RECIPES = [
  { id: "potion-of-health", potionName: "Potion of Health", strength: "Standard", components: ["Human blood", "Rat tail", "Ashen Ginger"] },
  { id: "firebomb", potionName: "Firebomb", strength: "Standard", components: ["Beast heart", "Rat tail", "Lunarberry"] },
  { id: "potion-of-experience", potionName: "Potion of Experience", strength: "Standard", components: ["Dragon blood", "Sweet Ivy", "Nightshade"] },
  { id: "cure-disease", potionName: "Cure Disease", strength: "Standard", components: ["Zombie skin", "Bat wings", "Monk's Laurel"] },
  { id: "cure-poison", potionName: "Cure Poison", strength: "Standard", components: ["Spider fang", "Snakeberry", "Bitterweed"] },
  { id: "potion-of-restoration", potionName: "Potion of Restoration", strength: "Standard", components: ["Vampire blood", "Troll blood", "Ember bark"] },
];

// Potion effects glossary (p77-79) — shown as reference when naming a custom recipe.
const POTION_EFFECTS = {
  "Acidic Bomb": "(Tr) Thrown. AoE acid damage: Weak 1d6 / Standard 1d10 / Supreme 1d12 to the hit square, half to surrounding squares.",
  "Alchemical Dust": "Not a potion — a powder. Used before rolling to search a room/corridor: reroll and take the best result. One use.",
  "Bottle of Experience": "+300 XP on drinking. Once per hero between dungeons.",
  "Bottle of the Void": "Not consumed. Opening it absorbs magic — any spell cast during the battle suffers -20 on top of the CL modifier.",
  "Elixir of Speed": "+1 Movement for the rest of the dungeon or until the end of a skirmish. No effect on the overland map.",
  "Elixir of the Archer": "Coats a Ranged Weapon: +1 DMG until the next time you leave a dungeon. One weapon.",
  "Firebomb": "(Tr) Thrown. AoE fire damage: Weak 1d6 / Standard 1d10 / Supreme 1d12 to the hit square, half to surrounding squares.",
  "Liquid Fire": "Poured on a close-combat weapon: sets it alight, causing Fire Damage for the rest of the battle.",
  "Poison": "Applied to a weapon; lasts until the end of the battle even unused. Can poison 5 projectiles instead (no extra AP). Enemies hit lose 1 HP/turn for the rest of the battle.",
  "Potion of Constitution": "+10 / +15 / +20 CON (Weak/Standard/Supreme), temporary. Lasts to end of current battle, or end of next battle if not in one.",
  "Potion of Courage": "+10 / +15 / +20 RES (Weak/Standard/Supreme), temporary, same duration as Potion of Constitution.",
  "Potion of Cure Disease": "Cures a disease: 75% (Weak) or 100% (Standard/Supreme) chance. Supreme also heals 1d3 HP.",
  "Potion of Cure Poison (Antidote)": "Cures poison: 75% (Weak) or 100% (Standard/Supreme) chance. Supreme also heals 1d3 HP.",
  "Potion of Disorientation": "(Tr) Thrown. Hit square: RES test or forfeit next turn. Adjacent squares: RES test at +20. Doesn't work on undead.",
  "Potion of Dexterity": "+5 / +10 / +15 DEX (and DEX-based skills), temporary, same duration as Potion of Constitution.",
  "Potion of Dragon's Breath": "Breathe fire once: range 2 squares, 1d8 to one adjacent square, or 1d4 to two connected squares.",
  "Potion of Dragon Skin": "Ignore all damage for 3 turns except spells/poison. Armour can still take damage, but the hero takes no HP loss.",
  "Potion of Energy": "+1 / +2 / +3 Energy (Weak/Standard/Supreme) until the end of the dungeon or skirmish.",
  "Potion of Fire Protection": "Fire damage reduced by 1d10 (re-rolled each hit). Lasts to end of current battle, or end of next if not in one.",
  "Potion of Health": "Heals 1d4 / 1d6 / 1d10 HP (Weak/Standard/Supreme).",
  "Potion of Mana": "Restores 1d20 / 2d20 / 3d20 Mana (Weak/Standard/Supreme).",
  "Vial of Invisibility": "Invisible for one battle — including to yourself, so you can't fight. Removed from the table until the battle ends.",
  "Potion of Rage": "Grants the Frenzy Perk's effect without spending Energy, for one battle.",
  "Potion of Restoration": "Fully heals and removes any disease or poison.",
  "Potion of Strength": "+10 / +15 / +20 STR (Weak/Standard/Supreme), temporary, same duration as Potion of Constitution.",
  "Potion of Wisdom": "+10 / +15 / +20 WIS (and WIS-based skills), temporary, same duration as Potion of Constitution.",
  "Vial of Corrosion": "Opens 1 lock automatically. 1 action adjacent to the door. Single quality only.",
  "Potion of Smoke": "(Tr) Thrown. Obscures LOS in the hit square + 8 surrounding for 4 turns. Fighting inside: -20 CS. Shooting through: impossible.",
  "Weapon Oil": "Coats an edged weapon: +1 DMG until the next time you leave a dungeon. One weapon.",
};
const ALCHEMY_STRENGTH_RULES = {
  Weak: { count: 2, label: "1 Part + 1 Ingredient" },
  Standard: { count: 3, label: "1 Part + 2 Ingredients, or 2 Parts + 1 Ingredient" },
  Supreme: { count: 4, label: "4 components, a mix of both types" },
};

// Potions Table (p195) — what a successful mix produces without a recipe. Weak/Supreme
// share a single 1d12 table (cost read as Weak/Supreme). Standard uses its own 1d3-then-
// 1d10 table: rolling 1 or 2 both draw from the same "1,2" column (1 = its plain-numbered
// top ten, 2 = the bold-numbered ten beneath it); rolling 3 draws from the separate right
// column, which has its own "Roll again" result on a 10.
const WEAK_SUPREME_POTIONS_TABLE = [
  { roll: 1, potion: "Firebomb", weak: 60, supreme: 180 },
  { roll: 2, potion: "Potion of Constitution", weak: 75, supreme: 200 },
  { roll: 3, potion: "Potion of Courage", weak: 75, supreme: 200 },
  { roll: 4, potion: "Potion of Dexterity", weak: 75, supreme: 200 },
  { roll: 5, potion: "Potion of Energy", weak: 75, supreme: 200 },
  { roll: 6, potion: "Potion of Health", weak: 75, supreme: 200 },
  { roll: 7, potion: "Potion of Mana", weak: 75, supreme: 200 },
  { roll: 8, potion: "Potion of Strength", weak: 75, supreme: 200 },
  { roll: 9, potion: "Potion of Wisdom", weak: 75, supreme: 200 },
  { roll: 10, potion: "Acidic Bomb", weak: 60, supreme: 180 },
  { roll: 11, potion: "Potion of Cure Disease", weak: 75, supreme: 200 },
  { roll: 12, potion: "Potion of Cure Poison", weak: 75, supreme: 200 },
];
const STANDARD_POTIONS_SUBTABLES = {
  1: [
    { roll: 1, potion: "Bottle of Experience", cost: 350 },
    { roll: 2, potion: "Potion of Constitution", cost: 100 },
    { roll: 3, potion: "Potion of Courage", cost: 100 },
    { roll: 4, potion: "Potion of Dexterity", cost: 100 },
    { roll: 5, potion: "Potion of Energy", cost: 100 },
    { roll: 6, potion: "Potion of Health", cost: 100 },
    { roll: 7, potion: "Potion of Mana", cost: 100 },
    { roll: 8, potion: "Potion of Strength", cost: 100 },
    { roll: 9, potion: "Potion of Wisdom", cost: 100 },
    { roll: 10, potion: "Acidic Bomb", cost: 90 },
  ],
  2: [
    { roll: 1, potion: "Potion of Disorientation", cost: 90 },
    { roll: 2, potion: "Firebomb", cost: 90 },
    { roll: 3, potion: "Vial of Invisibility", cost: 100 },
    { roll: 4, potion: "Vial of Corrosion", cost: 60 },
    { roll: 5, potion: "Potion of Cure Disease", cost: 100 },
    { roll: 6, potion: "Potion of Cure Poison", cost: 100 },
    { roll: 7, potion: "Poison", cost: 80 },
    { roll: 8, potion: "Liquid Fire", cost: 80 },
    { roll: 9, potion: "Bottle of the Void", cost: 80 },
    { roll: 10, potion: "Weapons Oil", cost: 80 },
  ],
  3: [
    { roll: 1, potion: "Elixir of Speed", cost: 80 },
    { roll: 2, potion: "Alchemical Dust", cost: 60 },
    { roll: 3, potion: "Elixir of the Archer", cost: 80 },
    { roll: 4, potion: "Potion of Rage", cost: 100 },
    { roll: 5, potion: "Potion of Fire Protection", cost: 80 },
    { roll: 6, potion: "Potion of Dragon Skin", cost: 150 },
    { roll: 7, potion: "Potion of Restoration", cost: 200 },
    { roll: 8, potion: "Potion of Dragon's Breath", cost: 100 },
    { roll: 9, potion: "Potion of Smoke", cost: 100 },
    { roll: 10, potion: null, cost: null }, // "Roll again"
  ],
};
const ALCHEMISTS_GUILD_POTIONS = buildPotionCatalog();
// Rolls a random potion for the given strength, re-rolling on Standard's "Roll again".
function rollRandomPotion(strength) {
  if (strength === "Weak" || strength === "Supreme") {
    const roll = rollDie(12);
    const entry = WEAK_SUPREME_POTIONS_TABLE.find((e) => e.roll === roll);
    return { potionName: entry.potion, cost: strength === "Weak" ? entry.weak : entry.supreme, rolls: [roll] };
  }
  const rolls = [];
  let entry = null;
  while (!entry || entry.potion === null) {
    const d3 = rollDie(3);
    const d10 = rollDie(10);
    rolls.push(d3, d10);
    entry = STANDARD_POTIONS_SUBTABLES[d3].find((e) => e.roll === d10);
  }
  return { potionName: entry.potion, cost: entry.cost, rolls };
}

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
  { label: "Power attack (no dodge/parry next turn, enemy +10 CS vs you)", value: 20 },
  { label: "Attacking from behind", value: 20 },
  { label: "Charge (started ≥2 squares away)", value: 10 },
  { label: "Height advantage", value: 10 },
  { label: "Enemy weapon has the Fast Rule", value: -5 },
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

const THROW_POTION_MODS = [
  { label: "Target is Large or X-Large (easier to hit)", value: 10 },
  { label: "Lobbing over an obstacle or model (not adjacent to it)", value: -10 },
  { label: "Throwing through a doorway opening (not standing in one of the 2 squares in front of it)", value: -10 },
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

// Powerstones — rolled when the Enchant Item spell succeeds (p69).
const POWERSTONES = [
  { roll: 1, name: "+2 Damage", appliesTo: "weapon", effect: "Improves any weapon's damage by 2." },
  { roll: 2, name: "+3 Damage", appliesTo: "weapon", effect: "Improves any weapon's damage by 3." },
  { roll: 3, name: "Poisonous", appliesTo: "weapon", effect: "Permanent poisonous ability — a monster wounded by this weapon loses 1 HP every turn until end of battle." },
  { roll: 4, name: "Fire Damage", appliesTo: "weapon", effect: "The weapon causes Fire Damage (see the Combat chapter's Fire Damage rules)." },
  { roll: 5, name: "+10 To Hit", appliesTo: "weapon", effect: "Perfectly balanced — increases chances to hit." },
  { roll: 6, name: "+5 Strength", appliesTo: "ring/amulet", effect: "Enhances the bearer's STR by 5." },
  { roll: 7, name: "+5 Constitution", appliesTo: "ring/amulet", effect: "Enhances the bearer's CON by 5." },
  { roll: 8, name: "+5 Wisdom", appliesTo: "ring/amulet", effect: "Enhances the bearer's WIS by 5." },
  { roll: 9, name: "+5 Resolve", appliesTo: "ring/amulet", effect: "Enhances the bearer's RES by 5." },
  { roll: 10, name: "+5 Dexterity", appliesTo: "ring/amulet", effect: "Enhances the bearer's DEX by 5." },
  { roll: 11, name: "Fast Reload", appliesTo: "weapon", effect: "Reduces reload time by 1 Action — the hero may fire twice in the first action (only once in the second)." },
  { roll: 12, name: "+2 DEF", appliesTo: "armour/shield", effect: "Enhances a piece of armour or a shield's DEF by 2." },
  { roll: 13, name: "+1 Energy Point per quest", appliesTo: "ring/amulet", effect: "The hero starts each quest with 1 more Energy Point than normal." },
  { roll: 14, name: "+1 Luck Point", appliesTo: "ring/amulet", effect: "The bearer has 1 more Luck Point than usual." },
  { roll: 15, name: "+10 chance to detect traps", appliesTo: "ring/amulet", effect: "Bonus applied whenever the hero checks for trap detection." },
  { roll: 16, name: "+5 chance to surprise enemies when opening doors", appliesTo: "ring/amulet", effect: "Subtract 5 from enemies' DEX for that check." },
  { roll: 17, name: "Re-roll failed Fear/Terror Test", appliesTo: "ring/amulet", effect: "The hero may re-roll a failed Fear or Terror Test." },
  { roll: 18, name: "+2 Hit Points", appliesTo: "ring/amulet", effect: "Raises the hero's starting wounds (HP) before a quest by 2." },
  { roll: 19, name: "+2 Party Morale", appliesTo: "ring/amulet", effect: "If a hero carries this object, Party Morale starts 2 points higher." },
  { roll: 20, name: "+2 Sanity Points", appliesTo: "ring/amulet", effect: "The bearer has 2 more Sanity Points than normal." },
];

const DAMAGE_TYPES = [
  { type: "Fire", effect: "Ignores NA & Armour. After resolving, roll 1d6: 1–3 extinguished, 4–6 continues next turn at half damage (round down, min 1), then extinguished." },
  { type: "Frost", effect: "50% chance of stun (lose 1 AP next turn)." },
  { type: "Acid", effect: "Ignores NA. After resolving, roll 1d6: 1–3 negated, 4–6 continues next turn at half damage (round down, min 1), then negated." },
  { type: "Poison", effect: "On a hit that deals damage, CON test: fail = poisoned. Another CON test at the start of the next turn, and again 1d10 turns after that; each failure costs 1 HP. Cure Poison potion or Chapel of Metheia cures it; a natural 01–05 on any of these CON tests also cures it outright. During a rest, roll all remaining ticks at once — reaching 0 HP during a rest kills the hero. Can't be poisoned again until cured." },
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

// Opening a Portcullis (p101) — STR Test while adjacent, 1 AP, may be retried any
// number of times. +10 STR for 1 hero helping from the other adjacent slot, plus +10
// STR per hero (up to 2) chiming in from the far side if the party is separated. A
// failure raises Threat +1 (the noise of dropping it).

// Cobweb Covered Openings (p101) — attacked with a weapon or torch instead of opened.
// Takes 2 AP and automatically succeeds, but raises Threat +1 and rolls 1d10: on a
// 9-10, 1d2 Giant Spiders appear (rolled/placed individually) on the tile being left
// or entered.

// Levers (p90-91) — shuffle a deck of 1 black card + 1d4+1 red cards. Pulling a lever
// costs 1 AP (never with known enemies on the table); draw the top card and roll on
// the matching table below. A clue from a Treasure card lets you discard 1 drawn red
// card without rolling, once per clue, only in the dungeon where it was found.
const BLACK_LEVERS_TABLE = [
  { roll: 1, text: "The party closes the dungeon entrance behind them, hindering Wandering Monsters from entering on the start tile. Whenever a Wandering Monster would be placed there, Threat is still raised as usual but no monster is placed. No effect if the Wandering Monster's spawn point has already been changed." },
  { roll: 2, text: "A hidden passageway opens. Place the Treasure Chamber tile adjacent to the current tile (move it here temporarily if already placed elsewhere) — its 3 chests may be searched. Once the heroes leave, the door closes and the tile is removed or returned to its previous spot." },
  { roll: 3, text: "A small compartment opens revealing precious items. The hero may take 1 Wonderful Treasure with no extra AP cost.", auto: "wonderfulTreasure" },
  { roll: 4, text: "The first locked door the heroes encounter outside the current tile is treated as unlocked." },
  { roll: 5, text: "The first trap triggered outside this tile may be ignored." },
  { roll: 6, text: "If there are any unopened doors in the room, one opens slightly. The heroes must still spend 1 AP to open it fully, but there's no need to raise Threat, roll for traps, or check whether it's locked." },
  { roll: 7, text: "A hidden compartment reveals 1d3 potions, picked up in the same action as activating the lever.", auto: "potions" },
  { roll: 8, text: "The party receives a Point of Luck, held collectively and usable by any hero. If not used before the party leaves the dungeon, it is lost.", auto: "dungeonLuck" },
];

const RED_LEVERS_TABLE = [
  { roll: [1, 11], text: "A rumble can be heard far off in the dungeon. Then everything goes quiet again. Nothing happens." },
  { roll: [12, 12], text: "One of the doors in the room closes and locks (as if rolling a 10) — the party must still roll for a trap as usual. If there are no unopened doors, randomise one door in the room to close and lock instead (no trap roll)." },
  { roll: [13, 13], text: "The sound of grinding cogs can be heard, but apart from that, everything seems normal.", auto: "threat2" },
  { roll: [14, 14], text: "Add 2 random Exploration Cards on top of every Exploration Card pile without looking at them." },
  { roll: [15, 15], text: "An eerie scream echoes through the dungeon, sending a chill down the heroes' spines.", auto: "moralePartySanity" },
  { roll: [16, 16], text: "With a loud bang, a portcullis falls down in front of all doors on this tile. Each must be lifted to reach the door (see the Portcullis tool above)." },
  { roll: [17, 17], text: "A Wandering Monster is released. Place it on a random tile at least 1 tile away from the heroes (or behind a random unopened door if none exists). It won't move until released, but roll its move as usual — on a 1, remove it. Once released, roll on the Encounter Table +20 and add the highest-XP enemy from that entry." },
  { roll: [18, 18], text: "Every door is now trapped on a 1d6 of 5-6 instead of the normal 6 only." },
  { roll: [19, 19], text: "The floor gives way under a random hero (not the one pulling the lever). DEX Test or fall into a pit: 1d10 damage (no armour, but NA applies), lower Sanity by 2. Getting up takes 1 AP and either a rope or a DEX Test.", auto: "pitTrap" },
  { roll: [20, 20], text: "An iron cage traps the hero who pulled the lever. Enemies appear at every door in the room (roll the Encounter Table once per unlocked, untrapped door) — set up initiative and fight. The caged hero can do nothing until the fight ends, then the cage retracts.", auto: "cageAmbush" },
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
// Furniture Search Table (Appendix V, p191-192). Roll 1d10 per furniture type searched.
const FURNITURE_TABLE = {
  "Alchemist Table": [{ roll: [1, 3], text: "1d3 Potions." }, { roll: [4, 7], text: "1d10 Ingredients." }, { roll: [8, 10], text: "Nothing of any value." }],
  "Altar": [{ roll: [1, 3], text: "1d3 Potions." }, { roll: [4, 7], text: "1d6x10 c." }, { roll: [8, 10], text: "Nothing of any value." }],
  "Archery Target": [{ roll: [1, 4], text: "1d10 arrows or bolts (you choose)." }, { roll: [5, 10], text: "Nothing." }],
  "Armour Rack": [{ roll: [1, 4], text: "1d3 random armour parts, with 1d4 lost Durability Points." }, { roll: [5, 10], text: "Nothing." }],
  "Backpack": [{ roll: [1, 5], text: "1 Mundane Treasure." }, { roll: [6, 7], text: "1d100 c." }, { roll: [8, 10], text: "Nothing." }],
  "Barrels": [{ roll: [1, 2], text: "1 Mundane Treasure." }, { roll: [3, 10], text: "Nothing." }],
  "Bed": [{ roll: [1, 2], text: "1 Mundane Treasure." }, { roll: [3, 4], text: "1d100 c." }, { roll: [5, 10], text: "Nothing." }],
  "Bedroll with pack": [{ roll: [1, 3], text: "1 Mundane Treasure." }, { roll: [4, 5], text: "1d100 c." }, { roll: [6, 10], text: "Nothing." }],
  "Bookshelf": [{ roll: [1, 2], text: "1 Fine Treasure." }, { roll: [3, 5], text: "A Scroll. Randomize what spell it contains using the Spell Tables." }, { roll: [6, 10], text: "Nothing." }],
  "Bookstand": [{ roll: [1, 5], text: "A Grimoire with 1 random spell." }, { roll: [6, 10], text: "Nothing." }],
  "Boxes": [{ roll: [1, 4], text: "1 Mundane Treasure." }, { roll: [5, 10], text: "Nothing." }],
  "Campfire": [{ roll: [1, 4], text: "1d3 Rations." }, { roll: [5, 10], text: "Nothing." }],
  "Chest": [{ roll: [1, 1], text: "1 Wonderful Treasure." }, { roll: [2, 4], text: "2 Fine Treasures." }, { roll: [5, 8], text: "1 Fine Treasure." }, { roll: [9, 10], text: "Nothing." }],
  "Coffin": [{ roll: [1, 2], text: "1 Fine treasure." }, { roll: [3, 8], text: "Nothing." }, { roll: [9, 10], text: "You awaken 1 zombie. Randomly place it next to the coffin." }],
  "Crate": [{ roll: [1, 1], text: "Gemstones worth 1d100 c." }, { roll: [2, 3], text: "1 Mundane Treasure." }, { roll: [4, 4], text: "1 Pickaxe." }, { roll: [5, 10], text: "Nothing." }],
  "Dead Adventurer": [{ roll: [1, 3], text: "Fine Treasure." }, { roll: [4, 7], text: "Mundane Treasure." }, { roll: [8, 9], text: "Nothing." }, { roll: [10, 10], text: "It's a Zombie, armed with a longsword and armour 1." }],
  "Dining Table": [{ roll: [1, 4], text: "1 ration." }, { roll: [5, 10], text: "Nothing." }],
  "Drawer": [{ roll: [1, 2], text: "1 Fine Treasure." }, { roll: [3, 8], text: "A small bag of coins, 2d20 c." }, { roll: [9, 10], text: "Nothing." }],
  "Fountain": [{ roll: [1, 2], text: "Someone has seen fit to leave 1 Fine Treasure by the fountain." }, { roll: [3, 8], text: "There are 1d20 worth of coins sprinkled across the bottom of the fountain." }, { roll: [9, 10], text: "Nothing." }],
  "Fountain (drink)": [{ roll: [1, 2], text: "You feel invigorated. Heal 1d4+1 Hit Points and 1 Energy Point." }, { roll: [3, 8], text: "Nothing happens." }, { roll: [9, 10], text: "Make an Alchemical roll (once for the whole party) before drinking. If you fail, you have become diseased." }],
  "Grate (over a hole)": [{ roll: [1, 4], text: "1d6 lockpicks." }, { roll: [5, 10], text: "Nothing." }],
  "Hearth": [{ roll: [1, 2], text: "1d4 Rations." }, { roll: [3, 10], text: "Nothing." }],
  "Mine Cart": [{ roll: [1, 1], text: "Gemstones worth 2d100 c." }, { roll: [2, 3], text: "1d4 random Nuggets (all of the same kind)." }, { roll: [4, 4], text: "A Pickaxe." }, { roll: [5, 10], text: "Nothing." }],
  "Objective Chest": [{ roll: [1, 3], text: "1 Fine treasure, 2 Wonderful Treasures." }, { roll: [4, 7], text: "2 Fine treasure, 1 Wonderful Treasure." }, { roll: [8, 10], text: "3 Fine Treasures." }],
  "Pottery": [{ roll: [1, 2], text: "1 Mundane Treasure." }, { roll: [3, 4], text: "1d20 coins." }, { roll: [5, 5], text: "1 Ration." }, { roll: [6, 10], text: "Nothing." }],
  "Rubble": [{ roll: [1, 2], text: "2d20 c." }, { roll: [3, 10], text: "Nothing." }],
  "Sacks": [{ roll: [1, 3], text: "1 ration." }, { roll: [4, 10], text: "Nothing." }],
  "Sarcophagus": [{ roll: [1, 2], text: "1 wonderful treasure." }, { roll: [3, 5], text: "2 fine treasures." }, { roll: [6, 8], text: "Nothing." }, { roll: [9, 10], text: "You awakened 1 Mummy! Randomly place it next to the sarcophagus." }],
  "Statue": [{ roll: [1, 1], text: "Roll 1d6: 1-2 you have found a Wonderful Treasure, 3-6 a Fine Treasure." }, { roll: [2, 3], text: "There are 1d20 worth of coins left as offerings." }, { roll: [4, 9], text: "Nothing." }, { roll: [10, 10], text: "You awakened a Gargoyle! Place the Gargoyle on the statue." }],
  "Study Table": [{ roll: [1, 4], text: "1 Mundane Treasure." }, { roll: [5, 10], text: "Nothing." }],
  "Throne": [{ roll: [1, 2], text: "1 Fine Treasure." }, { roll: [3, 10], text: "Nothing." }],
  "Torture Tools": [{ roll: [1, 2], text: "1d3 human blood for Alchemical use." }, { roll: [3, 10], text: "Nothing." }],
  "Treasure Pile": [{ roll: [1, 2], text: "1d4*100 c, 1 Wonderful Treasure." }, { roll: [3, 5], text: "1d3*100 c, 2 Fine Treasures." }, { roll: [6, 10], text: "1d2*100 c, 1 Fine Treasure." }],
  "Water Basin": [{ roll: [1, 2], text: "You feel invigorated. Heal 1d6+1 Hit Points and all Energy Points." }, { roll: [3, 8], text: "Nothing happens." }, { roll: [9, 10], text: "Make an Alchemical roll (once for the whole party). If you fail, you have become diseased." }],
  "Weapons Rack": [{ roll: [1, 4], text: "Random weapon with 1d4 lost Durability Points." }, { roll: [5, 10], text: "Nothing." }],
  "Well": [{ roll: [1, 1], text: "At the bottom of the well is a small chest tied to a rope. You may roll on the Chest Table." }, { roll: [2, 2], text: "A Mundane Treasure is lying by the well." }, { roll: [3, 9], text: "Nothing." }, { roll: [10, 10], text: "You awake an angry Water Spirit residing in the well. Place a Water Elemental next to the well." }],
};
const FURNITURE_NAMES = Object.keys(FURNITURE_TABLE);
function furnitureSearchResult(furniture, roll) {
  const table = FURNITURE_TABLE[furniture];
  if (!table) return null;
  const clamped = Math.min(10, Math.max(1, roll));
  return table.find((r) => clamped >= r.roll[0] && clamped <= r.roll[1]);
}
// Finds "NdM" or "NdM*X" dice patterns in a result's text and appends the rolled value —
// used so furniture/treasure results show a computed number, not just the dice notation.
function annotateDiceInText(text) {
  return text.replace(/(\d+)d(\d+)(\*(\d+))?/g, (match, count, sides, _mult, multiplier) => {
    let total = 0;
    for (let i = 0; i < Number(count); i++) total += rollDie(Number(sides));
    if (multiplier) return `${match} (rolled ${total} × ${multiplier} = ${total * Number(multiplier)})`;
    return `${match} (rolled ${total})`;
  });
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
  { name: "Fast", type: "Passive", effect: "Adds 1 extra initiative token to the bag. May activate twice in a turn but only gets 1 AP on its second activation." },
  { name: "Fear Elves", type: "Passive", effect: "Suffers the standard fear modifier vs Elves on a failed RES test." },
  { name: "Ferocious Charge", type: "Passive", effect: "Charge attack causes an extra 1d4 DMG." },
  { name: "Fire Breath", type: "Active", effect: "1d10 fire damage to target (dodgeable, no RS needed); adjacent squares take 1d6 fire dmg. Creature is immune." },
  { name: "Fire/Frost Damage", type: "Passive", effect: "This creature causes fire or frost damage." },
  { name: "Floater", type: "Passive", effect: "Avoids pits/traps, moves over them as solid ground." },
  { name: "Flyer", type: "Passive", effect: "Flies, moves through models/ZOC freely, ignores pits and traps. Flyer (O) can only fly outdoors in skirmish battles." },
  { name: "Frenzy", type: "Passive", effect: "Gains an extra strike whenever it causes damage." },
  { name: "Ghostly Howl", type: "Active", effect: "Ranged Ghostly Touch that hits all heroes at once, no roll needed, can't be dodged/parried." },
  { name: "Ghostly Touch", type: "Passive", effect: "Attacks reach the soul, can't be parried (can be dodged). Armour/NA useless; RES test to avoid 1d8 DMG + 1 Sanity loss." },
  { name: "Groundbreaker", type: "Active", effect: "Hits the ground — all heroes in adjacent squares suffer 1d10 damage and become stunned (−1 AP)." },
  { name: "Gust", type: "Passive", effect: "All creatures in its room/corridor suffer -15 RS." },
  { name: "Hard as Rock", type: "Passive", effect: "Immune to ranged weapons. Bladed weapons do half damage (RDD) unless magic or mithril." },
  { name: "Hate", type: "Passive", effect: "+5 CS, without the usual dodge penalty." },
  { name: "Inspiring", type: "Passive", effect: "Enemies may add 2 initiative tokens (3 if this creature is injured)." },
  { name: "Jump", type: "Active", effect: "Jumps up to 3 squares to closest target, can leap over models. Can be dodged not parried; pushes target back 1 square on hit." },
  { name: "Just Bones", type: "Passive", effect: "Arrows/bolts/sling stones -2 DMG penalty; crushing weapons +2 DMG bonus." },
  { name: "Kick", type: "Passive", effect: "Free attack (no AP) each turn against a hero in any of the 3 squares behind it." },
  { name: "Large / X-Large", type: "Passive", effect: "Rolls damage twice, takes the best. Takes 4 squares (Large) or 2×3 (X-Large). Can't pass single-file squares except bridges." },
  { name: "Leech", type: "Passive", effect: "Sticks to target, who can't move/attack anything else. Drains 1d4 HP/turn; roll for disease each turn attached. Other heroes attacking it deal half damage (avoid hitting companion)." },
  { name: "Lightning Fast", type: "Passive", effect: "Adds 1 extra initiative token to the bag. May activate twice during a turn, giving it a total of 4 AP." },
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
  { name: "Pyrophobia", type: "Passive", effect: "Must pass a RES test to attack a hero carrying a torch, or the attack fails and the action is spent. Creatures with Bellow instead use a failed test to Bellow. Once passed, no further tests are needed against that hero. Bat swarms skip the test but only do half damage (RDD) against torch-carriers." },
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
];

// Monster Behaviour (Bestiary p16-19) — interactive "what does the enemy do" walker.
// Monster Table (Bestiary p14-15) — full stat blocks for all 100 monsters.
const MONSTER_TABLE_FIELDS = ["n", "name", "cs", "rs", "hp", "dmg", "na", "m", "dex", "res", "toHit", "type", "behaviour", "special", "xp", "loot"];
const MONSTER_TABLE_RAW = [
[1, "Bandit", 50, 35, 12, "0", 0, 4, 30, 45, -5, "Bandit", "Humanoid", "", 90, "T1"],
[2, "Bandit Leader", 60, 40, 16, "1", 1, 4, 35, 50, -10, "Bandit", "Humanoid", "", 130, "T2"],
[3, "Banshee", 40, 0, 18, "0", 0, 6, 45, 60, -10, "Undead", "Humanoid", "Ethereal, Ghostly Howl, Ghostly touch, Terror 5", 650, "Part"],
[4, "Bat swarm", "*", 0, 10, "1d4", 0, 6, 55, 20, -10, "Beast", "Beast", "Always acts first on the first turn of battle, Auto hit, Flyer, Pyrophobia", 10, "Part"],
[5, "Beastman", 50, 20, 15, "0", 0, 5, 35, 35, -5, "Beast", "Humanoid", "", 100, "T1"],
[6, "Beastman Chieftain", 65, 0, 20, "1", 1, 5, 35, 50, -10, "Beast", "Humanoid", "", 150, "T2"],
[7, "Beastman Guard", 55, 20, 18, "1", 1, 5, 35, 45, -10, "Beast", "Humanoid", "", 110, "T2"],
[8, "Berserker", 50, 35, 14, "0", 0, 4, 35, 45, -10, "Bandit", "Beast", "Frenzy", 110, "T1"],
[9, "Bloated Demon", 50, 25, 32, "1d12+2", 2, 3, 25, 80, 0, "Magic", "Beast", "Demon, Disease ridden, Fear 3, Floater, Large", 650, "T4"],
[10, "Blood Demon", 60, 0, 12, "2", 2, 4, 50, 50, -5, "Magic", "Beast", "Demon, Frenzy", 200, "Part"],
[11, "Cave Bear", 50, 0, 20, "1d10+2", 1, 4, 30, 30, -5, "Beast", "Beast", "Ferocious charge, Pyrophobia", 130, "Part"],
[12, "Cave Goblin", 45, 30, 7, "0", 0, 4, 25, 40, -5, "Orcs & Gob", "Beast", "Hate Dwarves, Pyrophobia", 60, "T1"],
[13, "Centaur", 50, 50, 20, "1", 1, 7, 30, 60, -5, "Beast", "Beast", "Kick", 150, "T2"],
[14, "Cockatrice", 45, 0, 35, "1d8", 0, 4, 45, 40, -10, "Reptile", "Beast", "Large, Petrify", 325, "Part"],
[15, "Common Troll", 60, 0, 40, "3", 2, 6, 20, 50, -5, "Beast", "Beast", "Bellow, Fear 5, Large, Pyrophobia, Regenerate, Simple weapons, Stupid", 500, "T2"],
[16, "Dark Elf", 55, 45, 11, "0", 0, 5, 50, 45, -10, "Dark Elf", "Humanoid", "", 125, "T2"],
[17, "Dark Elf Assassin", 65, 50, 11, "0", 0, 5, 65, 50, -15, "Dark Elf", "Humanoid", "Sneaky", 135, "T2"],
[18, "Dark Elf Captain", 65, 55, 13, "0", 0, 5, 50, 55, -10, "Dark Elf", "Humanoid", "", 150, "T3"],
[19, "Dark Elf Sniper", 50, 65, 11, "0", 0, 5, 50, 50, -10, "Dark Elf", "Humanoid", "", 135, "T2"],
[20, "Dark Elf Warlock", 50, 60, 11, "0", 0, 5, 50, 55, -5, "Dark Elf", "Magic U", "Magic User", 165, "T4"],
[21, "Dire Wolf", 50, 0, 12, "1d10+1", 1, 8, 15, 30, 0, "Undead", "Beast", "Fear 3, Ferocious charge", 80, "Part"],
[22, "Dragon", 75, 0, 200, "1d10+5", 5, 6, 30, 80, -15, "Beast", "Beast", "Fire breath, Multiple attacks 2, Sweeping strike, Terror 10, X-Large", 4500, "Part"],
[23, "Drider", 65, 45, 28, "0", 2, 6, 50, 65, -5, "Dark Elf", "Humanoid", "Fear 5, Large, Wall crawler", 600, "T3"],
[24, "Earth Elemental", 50, 0, 20, "1d10+2", 2, 4, 40, 50, -5, "Magic", "Beast", "Magic being", 200, "-"],
[25, "Ettin", 55, 0, 40, "3", 3, 6, 20, 50, -5, "Beast", "Beast", "Free Bellow, Large, Simple weapons, Stupid, Sweeping strike", 550, "T2"],
[26, "Fallen Knight", 60, 0, 18, "1", 1, 4, 40, 50, -15, "Bandit", "Humanoid", "", 240, "T3"],
[27, "Fire Elemental", 55, 0, 15, "1d10", 0, 4, 50, 50, -5, "Magic", "Beast", "Extra damage from Water, Fire damage, Magic being", 250, "-"],
[28, "Frogling", 45, 40, 8, "0", 0, 5, 45, 35, -10, "Reptile", "Humanoid", "Poisonous spit, Silent", 90, "T1"],
[29, "Gargoyle", 50, 0, 25, "1d12", 4, 4, 20, 55, -5, "Magic", "Beast", "", 400, "Part"],
[30, "Gecko", 45, 45, 10, "0", 0, 5, 45, 40, -10, "Reptile", "Humanoid", "", 95, "T2"],
[31, "Gecko Assassin", 40, 45, 10, "0", 0, 5, 55, 40, -10, "Reptile", "Humanoid", "Camouflage, Sneaky", 100, "T1"],
[32, "Ghost", 35, 0, 15, "Spec", 0, 6, 40, 50, -5, "Undead", "Humanoid", "Cause fear 5, Ethereal, Ghostly touch", 550, "Part"],
[33, "Ghoul", 40, 0, 11, "1d10", 1, 4, 35, 40, -10, "Undead", "Humanoid", "Fear 3, Poisonous", 90, "T1"],
[34, "Giant", 55, 25, 150, "5", 3, 6, 20, 55, 0, "Bandit", "Beast", "Large, Simple weapons, Sweeping strike, Terror 8", 900, "T3"],
[35, "Giant Centipede", 45, 0, 22, "1d10", 4, 6, 55, 45, -5, "Beast", "Beast", "Fear 5", 300, "Part"],
[36, "Giant Leech", 40, 0, 12, "Special", 0, 3, 20, 30, 0, "Beast", "Beast", "Disease, Leech, Slow", 90, "Part"],
[37, "Giant Pox rat", 45, 0, 8, "1d6", 0, 6, 35, 30, 0, "Beast", "Beast", "Disease, Pyrophobia, Scurry", 50, "Part"],
[38, "Giant Rat", 45, 0, 6, "1d6", 0, 6, 40, 30, -5, "Beast", "Beast", "Perfect hearing, Pyrophobia, Scurry", 40, "Part"],
[39, "Giant Scorpion", 55, 0, 30, "1d12", 4, 5, 40, 40, 0, "Beast", "Beast", "Fear 4, Poisonous, Wall crawler", 220, "Part"],
[40, "Giant Snake", 50, 0, 15, "1d8", 0, 6, 60, 45, -20, "Beast", "Beast", "Fear 3, Poisonous", 120, "Part"],
[41, "Giant Spider", 50, 0, 25, "1d10", 1, 6, 60, 45, -5, "Beast", "Beast", "Fear 5, Poisonous, Wall crawler, Web", 170, "Part"],
[42, "Giant Toad", 50, 55, 35, "1d10", 1, 4, 30, 40, 0, "Reptile", "Beast", "Large, Swallow, Tongue attack", 400, "Part"],
[43, "Giant Wolf", 45, 0, 12, "1d10", 0, 9, 35, 45, -5, "Beast", "Beast", "Perfect hearing, Pyrophobia", 80, "Part"],
[44, "Gigantic Snake", 50, 0, 50, "1d10+3", 3, 6, 60, 60, -10, "Beast", "Beast", "Fear 10, Large, Poisonous, Sweeping strike", 800, "Part"],
[45, "Gigantic Spider", 50, 0, 60, "1d10+3", 3, 6, 45, 60, -5, "Beast", "Beast", "Large, Poisonous, Terror 10", 900, "Part"],
[46, "Gnoll", 50, 35, 10, "0", 1, 4, 35, 40, -10, "Beast", "Humanoid", "", 80, "T1"],
[47, "Gnoll Sergeant", 55, 30, 13, "1", 1, 4, 40, 50, -10, "Beast", "Humanoid", "", 100, "T2"],
[48, "Gnoll Shaman", 40, 50, 11, "0", 1, 4, 30, 55, -5, "Beast", "Magic U", "Magic User", 150, "T4"],
[49, "Goblin", 45, 30, 8, "0", 0, 4, 25, 40, -5, "Orcs & Gob", "Humanoid", "Fear elves", 70, "T1"],
[50, "Goblin Shaman", 40, 40, 8, "0", 0, 4, 25, 50, -5, "Orcs & Gob", "Humanoid", "Magic User", 130, "T2"],
[51, "Greater Demon", 60, 35, 70, "3", 3, 4, 30, 65, -5, "Magic", "Beast", "Demon, Large, Terror 10", 1200, "T5"],
[52, "Griffon", 60, 0, 48, "1d10+2", 2, 6, 50, 65, -10, "Beast", "Beast", "Fear 5, Flyer (O), Large", 1500, "Part"],
[53, "Harpy", 50, 25, 12, "1d10+1", 1, 6, 30, 50, -15, "Beast", "Beast", "Flyer (O), Pyrophobia", 130, "Part"],
[54, "Hydra", 50, 0, 100, "1d10+1", 3, 6, 30, 55, -5, "Beast", "Beast", "Fear 10, Multiple attacks Hydra, X-Large", 3000, "Part"],
[55, "Lesser Plague Demon", 45, 0, 5, "1d8", 0, 4, 40, 40, -10, "Magic", "Beast", "Demon, Disease, Flyer", 50, "Part"],
[56, "Lurker", 60, 70, 30, "1d10+1", 2, 6, 30, 60, -10, "Magic", "Magic U", "Demon, Floater, Magic User", 1200, "Part"],
[57, "Medusa", 50, 50, 20, "0", 0, 4, 40, 65, -10, "Dark Elf", "Humanoid", "Petrify", 350, "T3"],
[58, "Mimic", 50, 0, 10, "1d10", 2, 2, 15, 30, -5, "Beast", "Beast", "Leech", 110, "Part"],
[59, "Minotaur", 55, 0, 36, "3", 2, 6, 40, 55, -10, "Beast", "Beast", "Bellow, Ferocious charge, Fear 3, Large", 450, "T3"],
[60, "Minotaur Skeleton", 50, 0, 20, "2", 4, 4, 35, 30, -5, "Undead", "L Undead", "Fear 3, Gives bonemeal as part besides T2, Just bones, Large", 350, "T2"],
[61, "Mummy", 55, 0, 25, "1d10+1", 3, 4, 25, 80, -5, "Undead", "H Undead", "Extra damage from Fire, Fear 5", 300, "T3"],
[62, "Mummy Priest", 45, 65, 30, "1", 3, 4, 25, 80, 0, "Undead", "Magic U", "Extra damage from fire, Fear 5, Magic User", 600, "T5"],
[63, "Mummy Queen", 65, 60, 35, "2", 3, 4, 35, 85, -10, "Undead", "Magic U", "Extra damage from fire, Fear 5, Magic User", 800, "T5"],
[64, "Naga", 50, 0, 25, "0", 1, 4, 35, 65, -5, "Reptile", "Humanoid", "Multiple attacks 3", 650, "T3"],
[65, "Necromancer", 40, 55, 12, "1", 1, 4, 30, 60, -5, "Undead", "Magic U", "Magic User", 180, "T4"],
[66, "Ogre", 50, 20, 34, "1", 2, 6, 25, 45, -10, "Bandit", "Humanoid", "Large, Sweeping strike", 400, "T2"],
[67, "Ogre Berserker", 50, 15, 34, "1", 2, 6, 25, 45, -5, "Bandit", "Beast", "Frenzy, Large, Sweeping strike", 500, "T2"],
[68, "Ogre Chieftain", 60, 20, 42, "2", 2, 6, 25, 55, -10, "Bandit", "Humanoid", "Large, Sweeping strike", 600, "T3"],
[69, "Orc", 45, 35, 12, "0", 1, 4, 25, 40, -5, "Orcs & Gob", "Humanoid", "", 95, "T1"],
[70, "Orc Brute", 45, 35, 16, "1", 1, 4, 25, 40, -5, "Orcs & Gob", "Humanoid", "", 110, "T2"],
[71, "Orc Chieftain", 50, 30, 18, "1", 1, 4, 25, 50, -10, "Orcs & Gob", "Humanoid", "Frenzy", 130, "T3"],
[72, "Orc Shaman", 40, 45, 12, "0", 0, 4, 25, 55, -5, "Orcs & Gob", "Magic U", "Magic User", 180, "T4"],
[73, "Plague Demon", 55, 0, 12, "1", 3, 4, 40, 50, -5, "Magic", "Humanoid", "Demon, Disease ridden", 200, "Part"],
[74, "Psyker", 50, 70, 16, "0", 0, 4, 35, 65, -5, "Magic", "Magic U", "Magic User, Psychic", 250, "T4"],
[75, "Raptor", 50, 0, 14, "1d10+1", 0, 6, 40, 45, -5, "Reptile", "Beast", "Ferocious charge, Pyrophobia, Rend", 130, "Part"],
[76, "River Troll", 55, 15, 40, "3", 2, 6, 20, 50, -5, "Beast", "Beast", "Bellow, Fear 5, Large, Regeneration, Simple weapons, Stench, Stupid", 550, "T2"],
[77, "Salamander", 45, 50, 30, "1d10+2", 2, 4, 30, 40, 0, "Reptile", "Beast", "Fire Breath, Large, Slow, Stupid", 430, "Part"],
[78, "Satyr", 40, 35, 10, "0", 0, 5, 40, 40, -10, "Beast", "Humanoid", "Perfect hearing", 80, "T1"],
[79, "Saurian", 50, 0, 15, "0", 1, 4, 35, 40, -5, "Reptile", "Beast", "", 110, "T2"],
[80, "Saurian Elite", 55, 0, 18, "1", 1, 4, 40, 45, -10, "Reptile", "Beast", "", 140, "T2"],
[81, "Saurian Priest", 45, 50, 15, "0", 1, 4, 35, 60, -5, "Reptile", "Magic U", "Magic User", 200, "T4"],
[82, "Saurian Warchief", 60, 0, 20, "1", 1, 4, 45, 50, -10, "Reptile", "Beast", "", 160, "T3"],
[83, "Shambler", 55, 55, 30, "1d12", 2, 4, 25, 55, 0, "Beast", "Beast", "Entangle, Large", 450, "Part"],
[84, "Skeleton", 40, 20, 10, "0", 0, 4, 25, 30, -5, "Undead", "L Undead", "Fear 2, Gives bonemeal as part, Just bones", 80, "T1"],
[85, "Slime", 40, 0, 12, "1d10", 0, 4, 25, 25, -5, "Beast", "Beast", "Corrosive", 120, "Part"],
[86, "Sphinx", 65, 0, 38, "1d10+2", 2, 6, 50, 60, -5, "Beast", "Beast", "Flyer (O), Large, Riddle master", 1000, "Part"],
[87, "Stone Golem", 45, 0, 30, "1d10+3", 4, 4, 25, 30, 0, "Magic", "Beast", "Hard as rock, Fear 3, Groundbreaker, Large", 450, "Part"],
[88, "Stone Troll", 50, 15, 42, "3", 3, 6, 20, 50, -5, "Beast", "Beast", "Bellow, Fear 5, Large, Regenerate, Simple weapons, Stupid", 550, "T2"],
[89, "Tomb Guardian", 60, 0, 40, "2", 2, 4, 25, 50, 0, "Undead", "H Undead", "Fear 7, Large", 550, "T3"],
[90, "Vampire", 75, 45, 30, "3", 3, 6, 70, 70, -15, "Undead", "Humanoid", "Fear 10, Extra DMG from silver, Lightning Fast, Master of the Dead", 2000, "T5"],
[91, "Vampire Fledgling", 65, 40, 30, "2", 2, 6, 65, 70, -15, "Undead", "Humanoid", "Extra DMG from silver, Fast, Fear 10, Seduction", 1500, "T5"],
[92, "Warlock", 40, 55, 12, "0", 0, 4, 30, 60, -5, "Bandit", "Magic U", "Magic User", 180, "T4"],
[93, "Water Elemental", 55, 0, 15, "1d10+1", 1, 4, 40, 50, -5, "Magic", "Beast", "Extra damage from Fire, Magic being", 150, "-"],
[94, "Werewolf", 55, 0, 25, "1d10+1", 1, 9, 35, 45, -10, "Beast", "Beast", "Ferocious charge, Regeneration", 280, "Part"],
[95, "Wight", 50, 35, 15, "1", 1, 4, 30, 45, -10, "Undead", "H Undead", "Cursed weapons, Fear 5, Just bones", 180, "T2"],
[96, "Wind Elemental", 65, 0, 12, "1d10", 1, 6, 40, 50, 15, "Magic", "Beast", "Gust, Magic being", 150, "-"],
[97, "Wraiths", 50, 0, 20, "1", 2, 6, 30, 65, -10, "Undead", "H Undead", "Cursed weapons, Ethereal, Fear 5", 500, "Part"],
[98, "Wyvern", 60, 0, 75, "1d10+3", 2, 4, 30, 50, -5, "Beast", "Beast", "Terror 8, X-Large", 1800, "Part"],
[99, "Zombie", 40, 0, 12, "1d8+1", 0, 4, 10, 25, 0, "Undead", "L Undead", "Fear 2, Slow", 80, "T1"],
[100, "Zombie Ogre", 50, 0, 40, "2", 2, 4, 15, 25, 0, "Undead", "L Undead", "Fear 7, Large, Simple weapons, Slow", 650, "T1"],
];
const MONSTER_TABLE = MONSTER_TABLE_RAW.map((row) => Object.fromEntries(MONSTER_TABLE_FIELDS.map((f, i) => [f, row[i]])));

// Encounter Tables (Bestiary p21-40) — 1d20 + X (X = 10 per hero level above 1),
// find the matching row, roll each entry's Number formula. Ancient Lands is its own
// location-based table (mixes Undead/Reptile-flavoured creatures per the rulebook).

const ENCOUNTER_TABLE_BEASTS = [
  { range: [1, 2], entries: [{ name: "Giant Rats", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [3, 4], entries: [{ name: "Bat Swarms", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [5, 6], entries: [{ name: "Giant Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [7, 8], entries: [{ name: "Giant Leeches", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [9, 10], entries: [{ name: "Satyrs", number: "1d3", weapons: "Javelins, Shields", armour: "0", special: "" }] },
  { range: [11, 12], entries: [{ name: "Giant Snakes", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [13, 14], entries: [{ name: "Beastmen", number: "1d6", weapons: "Battleaxes, Shields", armour: "1", special: "" }] },
  { range: [15, 16], entries: [{ name: "Gnolls", number: "1d6", weapons: "Longswords, Shields", armour: "1", special: "" }, { name: "Gnolls", number: "1d2", weapons: "Shortbows, Daggers", armour: "1", special: "" }] },
  { range: [17, 18], entries: [{ name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Beastmen", number: "2", weapons: "Battle-axes", armour: "0", special: "" }] },
  { range: [19, 20], entries: [{ name: "Satyrs", number: "1d6", weapons: "Javelins, Shields", armour: "0", special: "" }, { name: "Beastmen Guard", number: "1d4", weapons: "Battle-axes, Shields", armour: "2", special: "" }] },
  { range: [21, 21], entries: [{ name: "Cave Bear", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [22, 22], entries: [{ name: "Gnolls", number: "1d6", weapons: "Longswords, Shields", armour: "1", special: "" }, { name: "Gnolls", number: "1d4", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [23, 24], entries: [{ name: "Gnolls", number: "1d4", weapons: "Battleaxes, Shields", armour: "1", special: "" }, { name: "Gnoll Shaman", number: "1", weapons: "Staff", armour: "0", special: "Spells: 1 Close Combat spell, 1 Ranged or 1 Support" }] },
  { range: [25, 26], entries: [{ name: "Harpies", number: "1d2", weapons: "", armour: "0", special: "" }, { name: "Slime", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [27, 28], entries: [{ name: "Giant Spiders", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [29, 30], entries: [{ name: "Giant Leeches", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Satyrs", number: "1d4", weapons: "Javelins, Shields", armour: "0", special: "" }] },
  { range: [31, 32], entries: [{ name: "Beastmen", number: "1d4", weapons: "Battleaxes, Shields", armour: "3", special: "" }, { name: "Satyrs", number: "1d4", weapons: "Javelins, Shields", armour: "1", special: "" }] },
  { range: [33, 34], entries: [{ name: "Satyrs", number: "1d6", weapons: "Javelins, Shields", armour: "1", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [35, 36], entries: [{ name: "Gnolls", number: "1d6", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Gnolls", number: "1d4", weapons: "Crossbows, Daggers", armour: "2", special: "" }] },
  { range: [37, 38], entries: [{ name: "Giant Centipede", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [39, 40], entries: [{ name: "Minotaur", number: "1", weapons: "Greataxe", armour: "3", special: "" }] },
  { range: [41, 42], entries: [{ name: "Lesser Plague Demons", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [43, 44], entries: [{ name: "River Troll", number: "1", weapons: "Warhammer", armour: "2", special: "" }] },
  { range: [45, 46], entries: [{ name: "Satyrs", number: "1d4", weapons: "Javelins, Shields", armour: "1", special: "" }, { name: "Beastmen", number: "1d6", weapons: "Flails", armour: "3", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [47, 48], entries: [{ name: "Slime", number: "2", weapons: "", armour: "0", special: "" }, { name: "Minotaur", number: "1", weapons: "Battleaxe", armour: "2", special: "" }] },
  { range: [49, 50], entries: [{ name: "Ettin", number: "1", weapons: "Warhammer", armour: "2", special: "" }] },
  { range: [51, 52], entries: [{ name: "Werewolves", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [53, 54], entries: [{ name: "Stone Troll", number: "1", weapons: "Warhammer", armour: "2", special: "" }, { name: "Giant Centipede", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [55, 56], entries: [{ name: "Gargoyles", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [57, 57], entries: [{ name: "Beastmen", number: "1d6+2", weapons: "Battle-axes, Shields", armour: "3", special: "" }, { name: "Gnolls", number: "1d4", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [58, 58], entries: [{ name: "Griffon", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [59, 60], entries: [{ name: "Satyrs", number: "1d6", weapons: "Javelins, Shields", armour: "1", special: "" }, { name: "Beastmen", number: "1d6", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Gnoll Shaman", number: "1", weapons: "Staff", armour: "0", special: "Spells: 1 Close Combat, 1 Ranged and 1 Support" }] },
  { range: [61, 62], entries: [{ name: "Beastmen", number: "1d6", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Minotaur", number: "1", weapons: "Battleaxe, Shield", armour: "2", special: "" }] },
  { range: [63, 64], entries: [{ name: "Blood Demons", number: "1d3", weapons: "Cursed Longswords", armour: "0", special: "" }] },
  { range: [65, 66], entries: [{ name: "Beastmen", number: "1d6", weapons: "Morning Stars, Shields", armour: "1", special: "" }, { name: "Common Troll", number: "1", weapons: "Warhammer", armour: "1", special: "" }] },
  { range: [67, 68], entries: [{ name: "Ettin", number: "1", weapons: "Warhammer", armour: "1", special: "" }, { name: "Gnolls", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [69, 70], entries: [{ name: "Minotaurs", number: "3", weapons: "Greataxes", armour: "2", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [71, 72], entries: [{ name: "Giant Spiders", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [73, 74], entries: [{ name: "Plague Demons", number: "1d6", weapons: "Cursed Longswords", armour: "0", special: "" }] },
  { range: [75, 76], entries: [{ name: "Common Trolls", number: "2", weapons: "Warhammers", armour: "0", special: "" }] },
  { range: [77, 78], entries: [{ name: "Minotaur", number: "1", weapons: "Greataxe", armour: "2", special: "" }, { name: "Gnolls", number: "1d6", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Gnoll Sergeant", number: "1", weapons: "Greatsword", armour: "2", special: "" }] },
  { range: [79, 80], entries: [{ name: "Gnolls", number: "1d6", weapons: "Battleaxes, Shields", armour: "1", special: "" }, { name: "Gnoll Shaman", number: "1", weapons: "Staff", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged and 1 Support" }, { name: "Gnoll Sergeant", number: "1", weapons: "Greataxe", armour: "2", special: "" }] },
  { range: [81, 82], entries: [{ name: "Blood Demons", number: "1d6", weapons: "Cursed Longswords", armour: "0", special: "" }] },
  { range: [83, 84], entries: [{ name: "Bloated Demon", number: "1", weapons: "", armour: "0", special: "" }, { name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [85, 86], entries: [{ name: "Bloated Demon", number: "1", weapons: "", armour: "0", special: "" }, { name: "Minotaurs", number: "3", weapons: "Greataxes", armour: "2", special: "" }] },
  { range: [87, 87], entries: [{ name: "Lurker", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [88, 88], entries: [{ name: "Common Troll", number: "1", weapons: "Warhammer", armour: "1", special: "" }, { name: "Lurker", number: "1", weapons: "", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged and 2 Support" }] },
  { range: [89, 90], entries: [{ name: "Gigantic Spider", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [91, 92], entries: [{ name: "Wyvern", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [93, 94], entries: [{ name: "Minotaur", number: "1", weapons: "Greataxe", armour: "2", special: "" }, { name: "Beastmen", number: "1d6+2", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [95, 96], entries: [{ name: "Gigantic Spider", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [97, 98], entries: [{ name: "Blood Demons", number: "1d6+2", weapons: "Cursed Longswords", armour: "0", special: "" }, { name: "Lesser Plague Demons", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [99, 100], entries: [{ name: "Greater Demon", number: "1", weapons: "Greataxe", armour: "3", special: "" }] },
  { range: [101, 102], entries: [{ name: "Minotaurs", number: "2", weapons: "Greataxes", armour: "3", special: "" }] },
  { range: [103, 104], entries: [{ name: "Greater Demon", number: "1", weapons: "Cursed Greataxe", armour: "3", special: "" }, { name: "Wyvern", number: "1", weapons: "", armour: "2", special: "" }] },
  { range: [105, 106], entries: [{ name: "Gigantic Spiders", number: "2", weapons: "", armour: "1", special: "" }] },
  { range: [107, 108], entries: [{ name: "Griffons", number: "1d3", weapons: "", armour: "1", special: "" }, { name: "Hydra", number: "1", weapons: "", armour: "3", special: "" }] },
  { range: [109, 110], entries: [{ name: "Wyverns", number: "2", weapons: "", armour: "3", special: "" }] },
];

const ENCOUNTER_TABLE_ORCS_GOBLINS = [
  { range: [1, 2], entries: [{ name: "Giant Rats", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [3, 4], entries: [{ name: "Bat Swarms", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [5, 6], entries: [{ name: "Giant Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [7, 8], entries: [{ name: "Goblins", number: "1d6", weapons: "Daggers", armour: "0", special: "" }] },
  { range: [9, 10], entries: [{ name: "Goblins", number: "1d6", weapons: "Shortswords", armour: "0", special: "" }] },
  { range: [11, 12], entries: [{ name: "Giant Snakes", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [13, 14], entries: [{ name: "Orcs", number: "1d3", weapons: "Longswords, Shields", armour: "1", special: "" }] },
  { range: [15, 16], entries: [{ name: "Cave Goblins", number: "1d6", weapons: "Shortswords, Shields", armour: "0", special: "" }, { name: "Cave Goblins", number: "1d4", weapons: "Shortbows, Daggers", armour: "0", special: "" }] },
  { range: [17, 18], entries: [{ name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Cave Goblins", number: "2", weapons: "Nets and Shortswords", armour: "0", special: "" }] },
  { range: [19, 20], entries: [{ name: "Orc Chieftain", number: "1", weapons: "Battleaxe, Shield", armour: "3", special: "" }, { name: "Orcs", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [21, 22], entries: [{ name: "Goblins", number: "1d6", weapons: "Javelins, Shields", armour: "1", special: "" }, { name: "Orcs", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Goblin Shaman", number: "1", weapons: "Shortsword", armour: "0", special: "Spells: 1 Close Combat, 1 Ranged" }] },
  { range: [23, 24], entries: [{ name: "Giant Wolves", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [25, 26], entries: [{ name: "Pox Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [27, 28], entries: [{ name: "Giant Spiders", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [29, 30], entries: [{ name: "Ogre", number: "1", weapons: "Longsword", armour: "1", special: "" }] },
  { range: [31, 32], entries: [{ name: "Orc Brutes", number: "1d4", weapons: "Battleaxes, Shields", armour: "3", special: "" }] },
  { range: [33, 34], entries: [{ name: "Orcs", number: "1d6", weapons: "Battleaxes, Shields", armour: "1", special: "" }, { name: "Cave Goblins", number: "2", weapons: "Nets, Shortswords", armour: "1", special: "" }, { name: "Orc Chieftain", number: "1", weapons: "Morning Star, Shield", armour: "3", special: "" }] },
  { range: [35, 36], entries: [{ name: "Orcs", number: "1d6", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }, { name: "Orc Shaman", number: "1", weapons: "Staff", armour: "1", special: "Spells: 1 Close Combat, 1 Ranged, 1 Support" }] },
  { range: [37, 38], entries: [{ name: "Cave Goblins", number: "2", weapons: "Nets, Shortswords", armour: "1", special: "" }, { name: "Ogre", number: "1", weapons: "Longsword, Shield", armour: "2", special: "" }] },
  { range: [39, 40], entries: [{ name: "Giant Spiders", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [41, 42], entries: [{ name: "Ogres", number: "2", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [43, 44], entries: [{ name: "Common Troll", number: "1", weapons: "Warhammer", armour: "1", special: "" }] },
  { range: [45, 46], entries: [{ name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Orc Chieftain", number: "1", weapons: "Morning Star, Shield", armour: "2", special: "" }, { name: "Orc Chieftain", number: "1", weapons: "Greataxe", armour: "2", special: "" }] },
  { range: [47, 48], entries: [{ name: "Ettin", number: "1", weapons: "Warhammer", armour: "0", special: "" }] },
  { range: [49, 50], entries: [{ name: "Ogre Berserker", number: "1", weapons: "Longsword", armour: "0", special: "" }] },
  { range: [51, 52], entries: [{ name: "Orcs", number: "1d6", weapons: "Halberds", armour: "1", special: "" }, { name: "Cave Goblins", number: "1d4", weapons: "Shortbows, Daggers", armour: "1", special: "" }] },
  { range: [53, 54], entries: [{ name: "Stone Troll", number: "1", weapons: "Warhammer", armour: "2", special: "" }] },
  { range: [55, 56], entries: [{ name: "Cave Goblins", number: "2", weapons: "Nets, Shortswords", armour: "1", special: "" }, { name: "Ogres", number: "2", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [57, 58], entries: [{ name: "Orc Brutes", number: "1d4", weapons: "Longswords", armour: "1", special: "" }, { name: "Giant Centipede", number: "1", weapons: "", armour: "0", special: "" }, { name: "Orc Shaman", number: "1", weapons: "Staff", armour: "0", special: "Spells: 2 Close Combat, 1 Ranged, 1 Support" }] },
  { range: [59, 60], entries: [{ name: "Cave Goblins", number: "1d2", weapons: "Nets, Shortswords", armour: "0", special: "" }, { name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Ogre Chieftain", number: "1", weapons: "Longsword, Shield", armour: "3", special: "" }] },
  { range: [61, 62], entries: [{ name: "Ogres", number: "1d3", weapons: "Flails", armour: "2", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [63, 64], entries: [{ name: "Orcs", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [65, 66], entries: [{ name: "Orc Brutes", number: "1d6", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Goblins", number: "1d4", weapons: "Shortbows, Daggers", armour: "2", special: "" }] },
  { range: [67, 68], entries: [{ name: "River Troll", number: "1", weapons: "Warhammer", armour: "0", special: "" }, { name: "Goblins", number: "1d4", weapons: "Shortbows, Daggers", armour: "0", special: "" }] },
  { range: [69, 70], entries: [{ name: "Ogre Berserkers", number: "2", weapons: "Greatswords", armour: "0", special: "" }] },
  { range: [71, 72], entries: [{ name: "Giant Spiders", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [73, 74], entries: [{ name: "Orc Brutes", number: "1d4", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Orc Shaman", number: "1", weapons: "Dagger", armour: "0", special: "Spells: 3 Close Combat, 1 Ranged, 1 Support" }] },
  { range: [75, 76], entries: [{ name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Ettins", number: "2", weapons: "Warhammers", armour: "0", special: "" }] },
  { range: [77, 78], entries: [{ name: "Ogres", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [79, 80], entries: [{ name: "Orcs", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Goblin Shamans", number: "2", weapons: "Staffs", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged, 1 Support" }] },
  { range: [81, 82], entries: [{ name: "Orc Chieftains", number: "3", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Cave Goblins", number: "4", weapons: "Shortbow, Dagger", armour: "0", special: "" }] },
  { range: [83, 84], entries: [{ name: "Ogre Berserkers", number: "1d4", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [85, 86], entries: [{ name: "Centaurs", number: "4", weapons: "Javelins, Shields", armour: "2", special: "" }] },
  { range: [87, 88], entries: [{ name: "Common Troll", number: "1", weapons: "Warhammer", armour: "1", special: "" }, { name: "Orc Shaman", number: "1", weapons: "Staff", armour: "1", special: "Spells: 2 Close Combat, 2 Ranged, 2 Support" }] },
  { range: [89, 90], entries: [{ name: "Ogre Chieftains", number: "2", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [91, 92], entries: [{ name: "Ogre Berserkers", number: "1d4", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [93, 94], entries: [{ name: "Giant Spiders", number: "4", weapons: "", armour: "0", special: "" }, { name: "Lurker", number: "1", weapons: "", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 2 Support" }] },
  { range: [95, 96], entries: [{ name: "Gigantic Spiders", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [97, 98], entries: [{ name: "Orc Brutes", number: "1d6", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Goblins", number: "1d4", weapons: "Shortbow, Shortsword", armour: "2", special: "" }, { name: "Cave Goblins", number: "2", weapons: "Nets, Shortswords", armour: "0", special: "" }] },
  { range: [99, 100], entries: [{ name: "Orc Chieftain", number: "1", weapons: "Longsword, Shield", armour: "4", special: "" }, { name: "Wyvern", number: "1", weapons: "", armour: "2", special: "" }] },
  { range: [101, 102], entries: [{ name: "River Trolls", number: "3", weapons: "", armour: "2", special: "" }] },
  { range: [103, 104], entries: [{ name: "Orc Chieftains", number: "2", weapons: "Longswords, Shields", armour: "4", special: "" }, { name: "Griffons", number: "3", weapons: "", armour: "0", special: "" }] },
  { range: [105, 106], entries: [{ name: "Wyverns", number: "1d2", weapons: "", armour: "3", special: "" }] },
  { range: [107, 108], entries: [{ name: "Orc Shamans", number: "2", weapons: "Staff", armour: "1", special: "Spells: 2 Close Combat, 2 Ranged, 2 Support" }, { name: "Common Trolls", number: "1d3+1", weapons: "Warhammers", armour: "2", special: "" }] },
  { range: [109, 110], entries: [{ name: "Giants", number: "1d3", weapons: "Warhammers", armour: "3", special: "" }] },
];

const ENCOUNTER_TABLE_BANDITS_BRIGANDS = [
  { range: [1, 2], entries: [{ name: "Giant Rats", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [3, 4], entries: [{ name: "Bat Swarms", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [5, 6], entries: [{ name: "Giant Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [7, 8], entries: [{ name: "Bat Swarms", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [9, 10], entries: [{ name: "Bandits", number: "1d3", weapons: "Shortswords", armour: "0", special: "" }] },
  { range: [11, 12], entries: [{ name: "Giant Snakes", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [13, 14], entries: [{ name: "Bandits", number: "1d3", weapons: "Shortswords", armour: "1", special: "" }, { name: "Bandits", number: "1d2", weapons: "Shortbows, Daggers", armour: "1", special: "" }] },
  { range: [15, 16], entries: [{ name: "Bandits", number: "1d3", weapons: "Longswords", armour: "2", special: "" }, { name: "Bandits", number: "1d2", weapons: "Shortbows, Shortswords", armour: "1", special: "" }] },
  { range: [17, 18], entries: [{ name: "Bandits", number: "1d3", weapons: "Battleaxes", armour: "1", special: "" }, { name: "Giant Wolves", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [19, 20], entries: [{ name: "Berserkers", number: "2", weapons: "Greataxes", armour: "0", special: "" }] },
  { range: [21, 22], entries: [{ name: "Bandits", number: "1d3+1", weapons: "Morning Stars", armour: "2", special: "" }, { name: "Bandits", number: "1d3", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [23, 24], entries: [{ name: "Giant Wolves", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [25, 26], entries: [{ name: "Pox Rats", number: "1d6", weapons: "", armour: "0", special: "" }, { name: "Slime", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [27, 28], entries: [{ name: "Bandits", number: "1d4+1", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Bandit Leader", number: "1", weapons: "Greataxe", armour: "3", special: "" }] },
  { range: [29, 30], entries: [{ name: "Ogre", number: "1", weapons: "Longsword", armour: "1", special: "" }] },
  { range: [31, 32], entries: [{ name: "Bandits", number: "2", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Warlock", number: "1", weapons: "Staff", armour: "0", special: "Spells: 1 Close Combat, 2 Ranged + Summon Demon" }] },
  { range: [33, 34], entries: [{ name: "Bandits", number: "1d4", weapons: "Battle-axes, Shields", armour: "2", special: "" }, { name: "Bandits", number: "1d4", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [35, 36], entries: [{ name: "Bandits", number: "1d4+1", weapons: "Broadswords, Shields", armour: "2", special: "" }, { name: "Bandit Leader", number: "1", weapons: "Battleaxe, Shield", armour: "3", special: "" }] },
  { range: [37, 38], entries: [{ name: "Berserkers", number: "1d4", weapons: "Flails", armour: "0", special: "" }, { name: "Fallen Knight", number: "1", weapons: "Longsword, Shield", armour: "4", special: "" }, { name: "Fallen Knight", number: "1", weapons: "Battleaxe, Shield", armour: "4", special: "" }] },
  { range: [39, 40], entries: [{ name: "Ogres", number: "2", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [41, 42], entries: [{ name: "Bandits", number: "1d4+1", weapons: "Greatswords", armour: "2", special: "" }, { name: "Bandits", number: "1d4+1", weapons: "Crossbows, Daggers", armour: "1", special: "" }] },
  { range: [43, 44], entries: [{ name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Bandit Leader", number: "1", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Bandit Leader", number: "1", weapons: "Greataxe", armour: "2", special: "" }] },
  { range: [45, 46], entries: [{ name: "Bandits", number: "1d6", weapons: "Battleaxes, Shields", armour: "0", special: "" }, { name: "Warlock", number: "1", weapons: "Shortsword", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged, 1 Support + Summon Demon" }] },
  { range: [47, 48], entries: [{ name: "Ogre Berserker", number: "1", weapons: "Flail", armour: "1", special: "" }] },
  { range: [49, 50], entries: [{ name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [51, 52], entries: [{ name: "Fallen Knights", number: "1d3", weapons: "Longsword, Shield", armour: "4", special: "" }] },
  { range: [53, 54], entries: [{ name: "Berserkers", number: "1d6", weapons: "Battleaxes", armour: "1", special: "" }] },
  { range: [55, 56], entries: [{ name: "Berserkers", number: "1d4+1", weapons: "Longswords", armour: "1", special: "" }, { name: "Warlock", number: "1", weapons: "Broadsword", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support + Summon Demon" }] },
  { range: [57, 58], entries: [{ name: "Ogre Chieftain", number: "1", weapons: "Longsword, Shield", armour: "2", special: "" }, { name: "Bandits", number: "2", weapons: "Longbows, Daggers", armour: "1", special: "" }, { name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [59, 60], entries: [{ name: "Ogres", number: "1d3", weapons: "Halberds", armour: "2", special: "" }] },
  { range: [61, 62], entries: [{ name: "Giant Centipedes", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [63, 64], entries: [{ name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }, { name: "Bandits", number: "1d4", weapons: "Crossbows, Daggers", armour: "3", special: "" }] },
  { range: [65, 66], entries: [{ name: "Berserkers", number: "1d4+1", weapons: "Battleaxes", armour: "2", special: "" }, { name: "Bandit Leader", number: "1", weapons: "Battleaxe, Shield", armour: "3", special: "" }] },
  { range: [67, 68], entries: [{ name: "Ogre Berserkers", number: "2", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [69, 70], entries: [{ name: "Giant Spiders", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [71, 72], entries: [{ name: "Fallen Knights", number: "1d4", weapons: "Cursed Longswords, Shields", armour: "4", special: "" }, { name: "Warlock", number: "1", weapons: "Dagger", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support + Summon Demon" }] },
  { range: [73, 74], entries: [{ name: "Fallen Knight", number: "1d6", weapons: "Longswords, Shields", armour: "4", special: "" }, { name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [75, 76], entries: [{ name: "Ogres", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [77, 78], entries: [{ name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }, { name: "Warlocks", number: "2", weapons: "Staffs", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged, 1 Support + Summon Greater Demon" }] },
  { range: [79, 80], entries: [{ name: "Bandit Leaders", number: "3", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Bandits", number: "4", weapons: "Crossbows, Daggers", armour: "2", special: "" }] },
  { range: [81, 82], entries: [{ name: "Ogre Berserkers", number: "1d4", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [83, 84], entries: [{ name: "Centaurs", number: "4", weapons: "Javelins, Shields", armour: "3", special: "" }] },
  { range: [85, 86], entries: [{ name: "Common Troll", number: "1", weapons: "Warhammer", armour: "1", special: "" }, { name: "Warlock", number: "1", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support + Summon Greater Demon" }] },
  { range: [87, 88], entries: [{ name: "Ogres Chieftains", number: "3", weapons: "Longswords, Shields", armour: "3", special: "" }] },
  { range: [89, 90], entries: [{ name: "Ogre Berserkers", number: "1d4", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [91, 92], entries: [{ name: "Centaurs", number: "2", weapons: "Longbows, Shortswords", armour: "1", special: "" }, { name: "Ogres", number: "2", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [93, 94], entries: [{ name: "Ogre Berserkers", number: "3", weapons: "Greataxes", armour: "3", special: "" }] },
  { range: [95, 96], entries: [{ name: "Fallen Knights", number: "1d6", weapons: "Cursed Longswords, Shields", armour: "4", special: "" }, { name: "Bandits", number: "1d4", weapons: "Longbows, Shortsword", armour: "2", special: "" }] },
  { range: [97, 98], entries: [{ name: "Ogre Chieftain", number: "1", weapons: "Battleaxe, Shield", armour: "3", special: "" }, { name: "Gigantic Spider", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [99, 100], entries: [{ name: "Wyvern", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [101, 102], entries: [{ name: "Gigantic Spiders", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [103, 104], entries: [{ name: "Giant", number: "1", weapons: "Warhammer", armour: "2", special: "" }, { name: "Fallen Knights", number: "1d6", weapons: "Cursed Longswords, Shields", armour: "4", special: "" }] },
  { range: [105, 106], entries: [{ name: "Stone Golem", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [107, 108], entries: [{ name: "Wyvern", number: "1", weapons: "", armour: "0", special: "" }, { name: "Ogres Chieftain", number: "2", weapons: "Longswords, Shields", armour: "3", special: "" }] },
  { range: [109, 110], entries: [{ name: "Giants", number: "2", weapons: "Warhammers", armour: "3", special: "" }] },
];

const ENCOUNTER_TABLE_REPTILES = [
  { range: [1, 2], entries: [{ name: "Giant Rats", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [3, 4], entries: [{ name: "Bat Swarms", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [5, 6], entries: [{ name: "Giant Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [7, 8], entries: [{ name: "Slime", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [9, 10], entries: [{ name: "Giant Snakes", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [11, 12], entries: [{ name: "Geckos", number: "1d2", weapons: "Shortswords", armour: "0", special: "" }] },
  { range: [13, 14], entries: [{ name: "Geckos", number: "1d3", weapons: "Shortswords", armour: "0", special: "" }, { name: "Geckos", number: "1d2", weapons: "Shortswords, Shields", armour: "0", special: "" }] },
  { range: [15, 16], entries: [{ name: "Gecko Assassins", number: "1d4", weapons: "Shortbows, Daggers", armour: "0", special: "" }, { name: "Froglings", number: "1d6", weapons: "Shortswords, Shields", armour: "0", special: "" }] },
  { range: [17, 18], entries: [{ name: "Saurians", number: "1d4", weapons: "Battleaxes, Shields", armour: "1", special: "" }] },
  { range: [19, 20], entries: [{ name: "Saurians", number: "1d4", weapons: "Morning Stars, Shields", armour: "1", special: "" }, { name: "Gecko Assassins", number: "1d4", weapons: "Shortbows, Daggers", armour: "0", special: "" }] },
  { range: [21, 22], entries: [{ name: "Geckos", number: "1d6", weapons: "Javelins, Shields", armour: "0", special: "" }, { name: "Saurians", number: "1d6", weapons: "Longswords, Shields", armour: "1", special: "" }] },
  { range: [23, 24], entries: [{ name: "Froglings", number: "1d4", weapons: "Battle-axes, Shields", armour: "0", special: "" }, { name: "Saurian Priest", number: "1", weapons: "Staff", armour: "0", special: "Spells: 1 Close Combat, 1 Ranged" }] },
  { range: [25, 26], entries: [{ name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }, { name: "Saurians", number: "1d4+1", weapons: "Javelins, Shields", armour: "1", special: "" }] },
  { range: [27, 28], entries: [{ name: "Giant Toad", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [29, 30], entries: [{ name: "Giant Centipede", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [31, 32], entries: [{ name: "Saurian Elites", number: "1d4", weapons: "Battle-axes, Shields", armour: "3", special: "" }] },
  { range: [33, 34], entries: [{ name: "Saurians", number: "1d6", weapons: "Battlehammers, Shields", armour: "1", special: "" }, { name: "Geckos", number: "2", weapons: "Nets, Shortswords", armour: "1", special: "" }, { name: "Saurian", number: "1", weapons: "Battleaxes, Shields", armour: "3", special: "" }] },
  { range: [35, 36], entries: [{ name: "Saurians", number: "1d6", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Raptor", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [37, 38], entries: [{ name: "Raptors", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [39, 40], entries: [{ name: "Giant Spiders", number: "1d3+1", weapons: "", armour: "0", special: "" }] },
  { range: [41, 42], entries: [{ name: "Nagas", number: "2", weapons: "Shortswords", armour: "2", special: "" }] },
  { range: [43, 44], entries: [{ name: "Saurians", number: "1d4", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Giant Toad", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [45, 46], entries: [{ name: "Saurian Elites", number: "1d4", weapons: "Battlehammers, Shields", armour: "3", special: "" }, { name: "Giant Toads", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [47, 48], entries: [{ name: "Nagas", number: "1d2", weapons: "Longswords", armour: "2", special: "" }] },
  { range: [49, 50], entries: [{ name: "Saurian Elites", number: "1d4", weapons: "Flails", armour: "3", special: "" }, { name: "Saurian Priest", number: "1", weapons: "Staff", armour: "1", special: "Spells: 1 Close Combat, 1 Ranged, 1 Support" }] },
  { range: [51, 52], entries: [{ name: "Saurian Elites", number: "1d6", weapons: "Battleaxes, Shields", armour: "3", special: "" }, { name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [53, 54], entries: [{ name: "Naga", number: "1", weapons: "Shortswords", armour: "2", special: "" }, { name: "Slime", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [55, 56], entries: [{ name: "Geckos", number: "2", weapons: "Nets, Shortswords", armour: "1", special: "" }, { name: "Nagas", number: "2", weapons: "Shortswords", armour: "2", special: "" }] },
  { range: [57, 58], entries: [{ name: "Saurian Elites", number: "1d4+1", weapons: "Longswords", armour: "1", special: "" }, { name: "Saurian Priest", number: "1", weapons: "Staff", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged, 1 Support" }] },
  { range: [59, 60], entries: [{ name: "Geckos", number: "1d2", weapons: "Nets, Shortswords", armour: "0", special: "" }, { name: "Raptors", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Naga", number: "1", weapons: "Battlehammers", armour: "3", special: "" }] },
  { range: [61, 62], entries: [{ name: "Giant Snakes", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [63, 64], entries: [{ name: "Saurians", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [65, 66], entries: [{ name: "Saurian Elites", number: "1d6", weapons: "Morning Stars, Shields", armour: "3", special: "" }, { name: "Geckos", number: "1d4", weapons: "Shortbows, Daggers", armour: "2", special: "" }] },
  { range: [67, 68], entries: [{ name: "Naga", number: "1", weapons: "Battlehammers", armour: "0", special: "" }, { name: "Gecko Assassins", number: "1d4", weapons: "Shortbows, Daggers", armour: "0", special: "" }, { name: "Froglings", number: "1d4", weapons: "Nets, Shortswords", armour: "0", special: "" }] },
  { range: [69, 70], entries: [{ name: "Giant Toads", number: "2", weapons: "", armour: "0", special: "" }, { name: "Slime", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [71, 72], entries: [{ name: "Giant Snakes", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [73, 74], entries: [{ name: "Saurian Elites", number: "1d4", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Saurian Priest", number: "1", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support" }, { name: "Salamander", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [75, 76], entries: [{ name: "Giant Toads", number: "1d2", weapons: "", armour: "0", special: "" }, { name: "Salamanders", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [77, 78], entries: [{ name: "Nagas", number: "1d4", weapons: "Shortswords", armour: "2", special: "" }] },
  { range: [79, 80], entries: [{ name: "Saurians", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Saurian Priest", number: "1", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 2 Support" }] },
  { range: [81, 82], entries: [{ name: "Saurian War Chiefs", number: "3", weapons: "Morning Stars, Shields", armour: "2", special: "" }, { name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [83, 84], entries: [{ name: "Gigantic Snake", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [85, 86], entries: [{ name: "Cockatrice", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [87, 88], entries: [{ name: "Naga", number: "1", weapons: "Daggers", armour: "1", special: "" }, { name: "Saurian Priest", number: "1", weapons: "Staff", armour: "1", special: "Spells: 4 Close Combat, 2 Ranged, 2 Support" }, { name: "Gecko Assassins", number: "2", weapons: "Shortbows, Daggers", armour: "1", special: "" }] },
  { range: [89, 90], entries: [{ name: "Saurian War Chief", number: "1", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Cockatrice", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [91, 92], entries: [{ name: "Nagas", number: "1d4", weapons: "Broadswords", armour: "2", special: "" }, { name: "Giant Toads", number: "2", weapons: "", armour: "0", special: "" }, { name: "Cockatrice", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [93, 94], entries: [{ name: "Naga", number: "1", weapons: "Longswords", armour: "3", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }, { name: "Saurian Elites", number: "1d6", weapons: "Halberds, Shields", armour: "2", special: "" }] },
  { range: [95, 96], entries: [{ name: "Gigantic Snake", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [97, 98], entries: [{ name: "Saurian Elites", number: "1d6", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Geckos", number: "1d4", weapons: "Shortbows, Shortswords", armour: "2", special: "" }, { name: "Froglings", number: "2", weapons: "Nets, Shortswords", armour: "0", special: "" }] },
  { range: [99, 100], entries: [{ name: "Hydra", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [101, 102], entries: [{ name: "Wyvern", number: "1", weapons: "", armour: "3", special: "" }] },
  { range: [103, 104], entries: [{ name: "Saurian Priest", number: "2", weapons: "Staff", armour: "1", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support" }, { name: "Stone Trolls", number: "3", weapons: "Warhammers", armour: "4", special: "" }] },
  { range: [105, 106], entries: [{ name: "Stone Golem", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [107, 108], entries: [{ name: "Saurian Priest", number: "2", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support" }, { name: "Hydra", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [109, 110], entries: [{ name: "Dragon", number: "1", weapons: "", armour: "1", special: "Reroll if in a corridor." }] },
];

const ENCOUNTER_TABLE_DARK_ELVES = [
  { range: [1, 2], entries: [{ name: "Giant Rats", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [3, 4], entries: [{ name: "Bat Swarms", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [5, 6], entries: [{ name: "Giant Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [7, 8], entries: [{ name: "Bat Swarms", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [9, 10], entries: [{ name: "Dark Elves", number: "1d3", weapons: "Shortswords", armour: "0", special: "" }] },
  { range: [11, 12], entries: [{ name: "Giant Snakes", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [13, 14], entries: [{ name: "Dark Elves", number: "1d3", weapons: "Shortswords", armour: "1", special: "" }, { name: "Dark Elves", number: "1d2", weapons: "Shortbows, Daggers", armour: "1", special: "" }] },
  { range: [15, 16], entries: [{ name: "Dark Elves", number: "1d3", weapons: "Longswords", armour: "2", special: "" }, { name: "Dark Elf Assassins", number: "1d2", weapons: "Poisoned Shortswords", armour: "1", special: "Has the Poisonous special rule" }] },
  { range: [17, 18], entries: [{ name: "Dark Elves", number: "1d3", weapons: "Battleaxes", armour: "1", special: "" }, { name: "Giant Wolves", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [19, 20], entries: [{ name: "Dark Elf Captain", number: "1", weapons: "Greataxe", armour: "1", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [21, 22], entries: [{ name: "Dark Elves", number: "1d3+1", weapons: "Morning Stars", armour: "2", special: "" }, { name: "Dark Elf Snipers", number: "1d3", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [23, 24], entries: [{ name: "Giant Centipedes", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [25, 26], entries: [{ name: "Pox Rats", number: "1d6", weapons: "", armour: "0", special: "" }, { name: "Harpies", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [27, 28], entries: [{ name: "Giant Spiders", number: "1d4+1", weapons: "", armour: "0", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [29, 30], entries: [{ name: "Dryder", number: "1", weapons: "Longsword", armour: "1", special: "" }] },
  { range: [31, 32], entries: [{ name: "Dark Elves", number: "2", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Dark Elf Warlock", number: "1", weapons: "Staff", armour: "0", special: "Spells: 1 Close Combat, 1 Ranged" }] },
  { range: [33, 34], entries: [{ name: "Dark Elves", number: "1d4", weapons: "Battleaxes, Shields", armour: "2", special: "" }, { name: "Dark Elf Snipers", number: "1d4", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [35, 36], entries: [{ name: "Dark Elves", number: "1d4+1", weapons: "Broadswords, Shields", armour: "2", special: "" }, { name: "Dark Elf Captain", number: "1", weapons: "Battleaxe, Shield", armour: "3", special: "" }] },
  { range: [37, 38], entries: [{ name: "Blood Demons", number: "1d4", weapons: "Flails", armour: "0", special: "" }, { name: "Harpies", number: "2", weapons: "", armour: "0", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [39, 40], entries: [{ name: "Dryders", number: "2", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [41, 42], entries: [{ name: "Dark Elves", number: "1d4+1", weapons: "Greatswords", armour: "2", special: "" }, { name: "Dark Elf Assassins", number: "1d4+1", weapons: "Crossbows, Poisoned Daggers", armour: "1", special: "Has the Poisonous special rule" }] },
  { range: [43, 44], entries: [{ name: "Giant Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Dark Elf Captains", number: "1", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [45, 46], entries: [{ name: "Dark Elves", number: "1d6", weapons: "Battleaxes, Shields", armour: "0", special: "" }, { name: "Dark Elf Warlock", number: "1", weapons: "Shortsword", armour: "0", special: "Spells: 2 Close Combat, 1 Ranged, 1 Support" }] },
  { range: [47, 48], entries: [{ name: "Slime", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [49, 50], entries: [{ name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [51, 52], entries: [{ name: "Gargoyles", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [53, 54], entries: [{ name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [55, 56], entries: [{ name: "Plague Demons", number: "1d4", weapons: "Longswords", armour: "1", special: "" }, { name: "Psyker", number: "1", weapons: "Broadsword", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged, 1 Support" }] },
  { range: [57, 58], entries: [{ name: "Dryder", number: "1", weapons: "Longsword, Shield", armour: "2", special: "" }, { name: "Dark Elf Assassins", number: "2", weapons: "Poisoned Daggers", armour: "1", special: "Has the Poisonous special rule" }, { name: "Giant Spiders", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [59, 60], entries: [{ name: "Dryders", number: "1d3", weapons: "Halberds", armour: "2", special: "" }] },
  { range: [61, 62], entries: [{ name: "Giant Centipedes", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [63, 64], entries: [{ name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }, { name: "Dark Elf Assassins", number: "1d4", weapons: "Shortbows, Daggers", armour: "3", special: "" }] },
  { range: [65, 66], entries: [{ name: "Dark Elf Captain", number: "1", weapons: "Battleaxe, Shield", armour: "3", special: "" }] },
  { range: [67, 68], entries: [{ name: "Blood Demons", number: "2", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [69, 70], entries: [{ name: "Giant Spiders", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [71, 72], entries: [{ name: "Blood Demons", number: "1d4", weapons: "Cursed Longswords, Shields", armour: "4", special: "" }, { name: "Dark Elf Warlock", number: "1", weapons: "Dagger", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support" }] },
  { range: [73, 74], entries: [{ name: "Dark Elves", number: "1d6", weapons: "Longswords, Shields", armour: "4", special: "" }, { name: "Giant Spiders", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [75, 76], entries: [{ name: "Dryders", number: "2", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [77, 78], entries: [{ name: "Shamblers", number: "2", weapons: "", armour: "0", special: "" }, { name: "Psyker", number: "2", weapons: "Staffs", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support" }] },
  { range: [79, 80], entries: [{ name: "Dark Elf Captains", number: "2", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Dark Elf Snipers", number: "4", weapons: "Crossbows, Daggers", armour: "2", special: "" }] },
  { range: [81, 82], entries: [{ name: "Dryders", number: "2", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [83, 84], entries: [{ name: "Medusa", number: "1", weapons: "Broadsword, Shield", armour: "0", special: "" }] },
  { range: [85, 86], entries: [{ name: "Common Troll", number: "1", weapons: "Warhammer", armour: "1", special: "" }, { name: "Psyker", number: "1", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 2 Support" }] },
  { range: [87, 88], entries: [{ name: "Cockatrice", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [89, 90], entries: [{ name: "Common Trolls", number: "2", weapons: "Warhammers", armour: "2", special: "" }, { name: "Dark Elves", number: "1d6", weapons: "Battlehammers, Shields", armour: "1", special: "" }] },
  { range: [91, 92], entries: [{ name: "Medusa", number: "1", weapons: "Longsword, Shield", armour: "2", special: "" }] },
  { range: [93, 94], entries: [{ name: "Dryders", number: "3", weapons: "Greataxes", armour: "3", special: "" }] },
  { range: [95, 96], entries: [{ name: "Blood Demons", number: "1d6", weapons: "Cursed Longswords, Shields", armour: "4", special: "" }, { name: "Dark Elf Assassins", number: "1d4", weapons: "Poisoned Shortswords", armour: "2", special: "" }] },
  { range: [97, 98], entries: [{ name: "Dryder", number: "1", weapons: "Battleaxe, Shield", armour: "3", special: "" }, { name: "Gigantic Spider", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [99, 100], entries: [{ name: "Hydra", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [101, 102], entries: [{ name: "Gigantic Spiders", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [103, 104], entries: [{ name: "Dark Elf Warlock", number: "2", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 2 Support" }, { name: "Greater Demons", number: "2", weapons: "Cursed Longswords, Shields", armour: "3", special: "" }] },
  { range: [105, 106], entries: [{ name: "Dryders", number: "1d3+1", weapons: "Battleaxes, Shields", armour: "3", special: "" }] },
  { range: [107, 108], entries: [{ name: "Psykers", number: "2", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 2 Support" }, { name: "Stone Golem", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [109, 110], entries: [{ name: "Hydras", number: "1d2", weapons: "", armour: "3", special: "" }] },
];

const ENCOUNTER_TABLE_UNDEAD = [
  { range: [1, 2], entries: [{ name: "Giant Rats", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [3, 4], entries: [{ name: "Bat Swarms", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [5, 6], entries: [{ name: "Giant Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [7, 8], entries: [{ name: "Bat Swarms", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [9, 10], entries: [{ name: "Zombies", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [11, 12], entries: [{ name: "Giant Snakes", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [13, 14], entries: [{ name: "Zombies", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [15, 16], entries: [{ name: "Skeletons", number: "1d4", weapons: "Longswords, Shields", armour: "1", special: "" }] },
  { range: [17, 18], entries: [{ name: "Skeletons", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Skeletons", number: "2", weapons: "Shortbows, Daggers", armour: "0", special: "" }] },
  { range: [19, 20], entries: [{ name: "Wights", number: "1d3", weapons: "Cursed Longswords", armour: "2", special: "" }] },
  { range: [21, 22], entries: [{ name: "Zombies", number: "1d6", weapons: "Longswords", armour: "1", special: "" }] },
  { range: [23, 24], entries: [{ name: "Ghouls", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [25, 26], entries: [{ name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [27, 28], entries: [{ name: "Skeletons", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Necromancer", number: "1", weapons: "Staff", armour: "0", special: "Spells: 1 Close Combat, 1 Ranged + Raise Dead" }] },
  { range: [29, 30], entries: [{ name: "Zombies", number: "1d4", weapons: "Broadswords, Shields", armour: "2", special: "" }] },
  { range: [31, 32], entries: [{ name: "Wights", number: "1d4+1", weapons: "Cursed Longswords", armour: "3", special: "" }] },
  { range: [33, 34], entries: [{ name: "Skeletons", number: "1d6", weapons: "Longswords, Shields", armour: "1", special: "" }, { name: "Dire Wolves", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [35, 36], entries: [{ name: "Giant Spiders", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [37, 38], entries: [{ name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [39, 40], entries: [{ name: "Mummy", number: "1", weapons: "", armour: "1", special: "" }] },
  { range: [41, 42], entries: [{ name: "Ghouls", number: "1d6+1", weapons: "", armour: "0", special: "" }] },
  { range: [43, 44], entries: [{ name: "Wights", number: "1d6", weapons: "Cursed Longswords", armour: "3", special: "" }, { name: "Skeletons", number: "1d4", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [45, 46], entries: [{ name: "Dire Wolves", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [47, 48], entries: [{ name: "Dire Wolves", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Necromancer", number: "1", weapons: "Staff", armour: "0", special: "Spells: 1 Close Combat, 2 Ranged + Raise Dead" }] },
  { range: [49, 50], entries: [{ name: "Zombie Ogre", number: "1", weapons: "Warhammer", armour: "0", special: "" }] },
  { range: [51, 52], entries: [{ name: "Mummies", number: "2", weapons: "", armour: "1", special: "" }] },
  { range: [53, 54], entries: [{ name: "Mummy", number: "1", weapons: "", armour: "1", special: "" }, { name: "Zombies", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [55, 56], entries: [{ name: "Skeletons", number: "1d6", weapons: "Morning Stars, Shields", armour: "1", special: "" }, { name: "Skeletons", number: "1d6", weapons: "Longbows, Daggers", armour: "0", special: "" }] },
  { range: [57, 58], entries: [{ name: "Wights", number: "1d6+1", weapons: "Cursed Halberds", armour: "3", special: "" }] },
  { range: [59, 60], entries: [{ name: "Giant Spiders", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [61, 62], entries: [{ name: "Zombie Ogre", number: "1", weapons: "Warhammer", armour: "1", special: "" }] },
  { range: [63, 64], entries: [{ name: "Zombies", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Necromancer", number: "1", weapons: "Staff", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged + Raise Dead" }] },
  { range: [65, 66], entries: [{ name: "Minotaur Skeletons", number: "1d3", weapons: "Greataxes", armour: "0", special: "" }] },
  { range: [67, 68], entries: [{ name: "Ghouls", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [69, 70], entries: [{ name: "Zombie Ogres", number: "2", weapons: "Warhammers", armour: "0", special: "" }, { name: "Necromancer", number: "1", weapons: "Staff", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged, 1 Support + Raise Dead" }] },
  { range: [71, 72], entries: [{ name: "Zombie Ogre", number: "1", weapons: "Warhammer", armour: "1", special: "" }] },
  { range: [73, 74], entries: [{ name: "Wights", number: "1d4+1", weapons: "Cursed Halberds", armour: "3", special: "" }] },
  { range: [75, 76], entries: [{ name: "Wights", number: "1d4+1", weapons: "Flails", armour: "3", special: "" }, { name: "Skeletons", number: "4", weapons: "Longbows, Daggers", armour: "2", special: "" }] },
  { range: [77, 78], entries: [{ name: "Minotaur Skeletons", number: "1d4", weapons: "Greataxes", armour: "1", special: "" }] },
  { range: [79, 80], entries: [{ name: "Vampire Fledgling", number: "1", weapons: "Longsword", armour: "3", special: "" }, { name: "Zombies", number: "1d6+1", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [81, 82], entries: [{ name: "Ghost", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [83, 84], entries: [{ name: "Zombies", number: "1d10", weapons: "Battleaxes, Shields", armour: "2", special: "" }] },
  { range: [85, 86], entries: [{ name: "Zombies", number: "2d6", weapons: "", armour: "2", special: "" }] },
  { range: [87, 88], entries: [{ name: "Vampire Fledgling", number: "1", weapons: "Battleaxe", armour: "2", special: "" }, { name: "Ghouls", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [89, 90], entries: [{ name: "Wraiths", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [91, 92], entries: [{ name: "Wights", number: "1d6", weapons: "Cursed Halberds", armour: "3", special: "" }] },
  { range: [93, 94], entries: [{ name: "Ghosts", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [95, 96], entries: [{ name: "Banshee", number: "1", weapons: "", armour: "0", special: "" }, { name: "Zombies", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [97, 98], entries: [{ name: "Wraiths", number: "1d3", weapons: "", armour: "0", special: "" }, { name: "Necromancer", number: "1", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support + Raise Dead" }] },
  { range: [99, 100], entries: [{ name: "Wights", number: "1d6", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Wraiths", number: "1d3", weapons: "", armour: "0", special: "" }, { name: "Vampire", number: "1", weapons: "Longsword", armour: "2", special: "" }] },
  { range: [101, 102], entries: [{ name: "Vampires Fledgling", number: "3", weapons: "Battleaxes", armour: "2", special: "" }] },
  { range: [103, 104], entries: [{ name: "Mummys", number: "1d4+4", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Mummy Priest", number: "1", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support + Raise Dead" }] },
  { range: [105, 106], entries: [{ name: "Banshees", number: "1d3+1", weapons: "", armour: "0", special: "" }] },
  { range: [107, 108], entries: [{ name: "Necromancer", number: "1", weapons: "Staff", armour: "2", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support + Raise Dead" }, { name: "Vampires", number: "2", weapons: "Longswords", armour: "3", special: "" }] },
  { range: [109, 110], entries: [{ name: "Vampires", number: "3", weapons: "Longswords", armour: "3", special: "" }] },
];

const ENCOUNTER_TABLE_ANCIENT_LANDS = [
  { range: [1, 2], entries: [{ name: "Giant Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [3, 4], entries: [{ name: "Bat Swarms", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [5, 6], entries: [{ name: "Giant Pox Rats", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [7, 8], entries: [{ name: "Slime", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [9, 10], entries: [{ name: "Skeletons", number: "1d6", weapons: "Battleaxes, Shields", armour: "1", special: "" }] },
  { range: [11, 12], entries: [{ name: "Giant Leeches", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [13, 14], entries: [{ name: "Wights", number: "1d6", weapons: "Cursed Longswords, Shields", armour: "0", special: "" }] },
  { range: [15, 16], entries: [{ name: "Skeletons", number: "1d4", weapons: "Longswords, Shields", armour: "1", special: "" }, { name: "Mummy", number: "1", weapons: "Halberd", armour: "1", special: "" }] },
  { range: [17, 18], entries: [{ name: "Skeletons", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Tomb Guardian", number: "1", weapons: "Greataxes", armour: "2", special: "" }] },
  { range: [19, 20], entries: [{ name: "Giant Scorpion", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [21, 22], entries: [{ name: "Mummies", number: "1d4", weapons: "Broadswords", armour: "0", special: "" }] },
  { range: [23, 24], entries: [{ name: "Gargoyles", number: "1d4", weapons: "", armour: "0", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [25, 26], entries: [{ name: "Giant Spiders", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [27, 28], entries: [{ name: "Wights", number: "1d4", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Necromancer", number: "1", weapons: "Staff", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged + Raise Dead" }] },
  { range: [29, 30], entries: [{ name: "Tomb Guardian", number: "2", weapons: "Greataxes", armour: "1", special: "" }] },
  { range: [31, 32], entries: [{ name: "Giant Scorpions", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [33, 34], entries: [{ name: "Skeletons", number: "1d6", weapons: "Longswords, Shields", armour: "1", special: "" }, { name: "Gargoyles", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [35, 36], entries: [{ name: "Giant Spiders", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [37, 38], entries: [{ name: "Sphinx", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [39, 40], entries: [{ name: "Mummies", number: "1d4", weapons: "Longswords, Shields", armour: "1", special: "" }] },
  { range: [41, 42], entries: [{ name: "Giant Snakes", number: "1d6", weapons: "", armour: "0", special: "" }, { name: "Slime", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [43, 44], entries: [{ name: "Wights", number: "1d6", weapons: "Cursed Longswords", armour: "3", special: "" }, { name: "Skeletons", number: "1d4", weapons: "Longbows, Daggers", armour: "1", special: "" }] },
  { range: [45, 46], entries: [{ name: "Giant Centipede", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [47, 48], entries: [{ name: "Wights", number: "1d6", weapons: "Cursed Halberds", armour: "2", special: "" }, { name: "Necromancer", number: "1", weapons: "Staff", armour: "0", special: "Spells: 2 Close Combat, 2 Ranged + Raise Dead" }] },
  { range: [49, 50], entries: [{ name: "Zombie Troll", number: "1", weapons: "Warhammer", armour: "0", special: "" }] },
  { range: [51, 52], entries: [{ name: "Mummies", number: "1d4+1", weapons: "Battlehammers", armour: "1", special: "" }, { name: "Shambler", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [53, 54], entries: [{ name: "Tomb Guardian", number: "1d2", weapons: "Halberds", armour: "2", special: "" }, { name: "Wights", number: "1d6", weapons: "Cursed Battleaxes", armour: "2", special: "" }] },
  { range: [55, 56], entries: [{ name: "Sphinx", number: "1d2", weapons: "", armour: "0", special: "" }, { name: "Gargoyles", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [57, 58], entries: [{ name: "Banshee", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [59, 60], entries: [{ name: "Giant Spiders", number: "1d6", weapons: "", armour: "0", special: "" }] },
  { range: [61, 62], entries: [{ name: "Zombie Troll", number: "1", weapons: "Warhammer", armour: "1", special: "" }] },
  { range: [63, 64], entries: [{ name: "Mummies", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Mummy Priest", number: "1", weapons: "Staff", armour: "0", special: "Spells: 3 Close Combat, 2 Ranged, 1 Support + Raise Dead" }] },
  { range: [65, 66], entries: [{ name: "Mummies", number: "1d6", weapons: "Longswords, Shields", armour: "2", special: "" }, { name: "Slime", number: "1d2", weapons: "", armour: "0", special: "" }] },
  { range: [67, 68], entries: [{ name: "Giant Scorpions", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [69, 70], entries: [{ name: "Tomb Guardians", number: "2", weapons: "Warhammers", armour: "1", special: "" }, { name: "Giant Scorpion", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [71, 72], entries: [{ name: "Tomb Guardians", number: "1d3", weapons: "Warhammers", armour: "1", special: "" }] },
  { range: [73, 74], entries: [{ name: "Wights", number: "1d4+1", weapons: "Cursed Halberds", armour: "3", special: "" }] },
  { range: [75, 76], entries: [{ name: "Wights", number: "1d4+1", weapons: "Battleaxes, Shields", armour: "3", special: "" }, { name: "Mummies", number: "4", weapons: "Greatswords", armour: "2", special: "" }] },
  { range: [77, 77], entries: [{ name: "Mummies", number: "4", weapons: "", armour: "1", special: "" }] },
  { range: [78, 78], entries: [{ name: "Gargoyles", number: "4", weapons: "", armour: "0", special: "" }] },
  { range: [79, 80], entries: [{ name: "Mummy Queen", number: "1", weapons: "Longsword", armour: "3", special: "Spells: 3 Close Combat, 2 Ranged, 2 Support + Raise Dead" }, { name: "Mummies", number: "1d6+1", weapons: "Longswords, Shields", armour: "2", special: "" }] },
  { range: [81, 82], entries: [{ name: "Ghost", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [83, 84], entries: [{ name: "Gigantic Spider", number: "1", weapons: "", armour: "0", special: "" }] },
  { range: [85, 86], entries: [{ name: "Tomb Guardians", number: "1d3", weapons: "Greataxes", armour: "2", special: "" }] },
  { range: [87, 88], entries: [{ name: "Mummy Queen", number: "1", weapons: "Longsword", armour: "2", special: "Spells: 5 Close Combat, 2 Ranged, 2 Support + Raise Dead" }, { name: "Tomb Guardians", number: "1d3", weapons: "Halberds", armour: "2", special: "" }] },
  { range: [89, 90], entries: [{ name: "Wraiths", number: "1d3", weapons: "", armour: "0", special: "" }] },
  { range: [91, 92], entries: [{ name: "Wights", number: "1d6", weapons: "Cursed Halberds", armour: "3", special: "" }] },
  { range: [93, 94], entries: [{ name: "Ghosts", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [95, 96], entries: [{ name: "Banshee", number: "1", weapons: "", armour: "0", special: "" }, { name: "Giant Scorpions", number: "1d4", weapons: "", armour: "0", special: "" }] },
  { range: [97, 98], entries: [{ name: "Wraiths", number: "1d3", weapons: "", armour: "0", special: "" }, { name: "Sphinx", number: "2", weapons: "", armour: "0", special: "" }] },
  { range: [99, 100], entries: [{ name: "Wights", number: "1d6", weapons: "Longswords, Shields", armour: "3", special: "" }, { name: "Wraiths", number: "1d3", weapons: "", armour: "0", special: "" }, { name: "Mummy Queen", number: "1", weapons: "Longsword", armour: "2", special: "Spells: 3 Close Combat, 3 Ranged, 2 Support + Raise Dead" }] },
  { range: [101, 102], entries: [{ name: "Vampire Fledgling", number: "2", weapons: "Longswords", armour: "3", special: "" }] },
  { range: [103, 104], entries: [{ name: "Mummy Priest", number: "2", weapons: "", armour: "0", special: "Spells: 3 Close Combat, 3 Ranged, 2 Support + Raise Dead" }, { name: "Minotaur Skeletons", number: "1d4+1", weapons: "Greataxes, Shields", armour: "2", special: "" }] },
  { range: [105, 106], entries: [{ name: "Banshees", number: "1d3+1", weapons: "", armour: "0", special: "" }] },
  { range: [107, 108], entries: [{ name: "Mummy Queen", number: "2", weapons: "Longswords", armour: "2", special: "Spells: 3 Close Combat, 3 Ranged, 2 Support + Raise Dead" }, { name: "Tomb Guardians", number: "1d3+1", weapons: "Halberds", armour: "3", special: "" }] },
  { range: [109, 110], entries: [{ name: "Vampires", number: "2", weapons: "Longswords", armour: "3", special: "" }, { name: "Necromancers", number: "2", weapons: "Daggers", armour: "1", special: "Spells: 3 Close Combat, 3 Ranged, 2 Support + Raise Dead" }] },
];


const ENCOUNTER_TABLES = {
  "Beasts": ENCOUNTER_TABLE_BEASTS,
  "Orcs and Goblins": ENCOUNTER_TABLE_ORCS_GOBLINS,
  "Bandits and Brigands": ENCOUNTER_TABLE_BANDITS_BRIGANDS,
  "Reptiles": ENCOUNTER_TABLE_REPTILES,
  "Dark Elves": ENCOUNTER_TABLE_DARK_ELVES,
  "Undead": ENCOUNTER_TABLE_UNDEAD,
  "Ancient Lands": ENCOUNTER_TABLE_ANCIENT_LANDS,
};

function findEncounterRow(table, roll) {
  return table.find((row) => roll >= row.range[0] && roll <= row.range[1]);
}

// Parses "1d6", "1d4+1", "2d6", or a flat number/string into a rolled total.
function rollEncounterNumber(spec) {
  if (typeof spec === "number") return spec;
  const m = String(spec).match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!m) return Number(spec) || 0;
  const [, count, sides, bonus] = m;
  let total = 0;
  for (let i = 0; i < Number(count); i++) total += rollDie(Number(sides));
  return total + (bonus ? Number(bonus) : 0);
}

// Maps an Encounter Table creature name (often plural, or an unlisted variant like
// "Beastmen Guard") to its Monster Table stat-block name, for the inline stat lookup.
const ENCOUNTER_NAME_ALIASES = {
  "Beastmen Guard": "Beastman Guard",
  "Beastmen": "Beastman",
  "Dark Elves": "Dark Elf",
  "Dark Elf Snipers": "Dark Elf Sniper",
  "Dark Elf Captains": "Dark Elf Captain",
  "Dark Elf Assassins": "Dark Elf Assassin",
  "Dire Wolves": "Dire Wolf",
  "Dryder": "Drider",
  "Dryders": "Drider",
  "Giant Leeches": "Giant Leech",
  "Giant Wolves": "Giant Wolf",
  "Ogres Chieftain": "Ogre Chieftain",
  "Ogres Chieftains": "Ogre Chieftain",
  "Ogre Chieftains": "Ogre Chieftain",
  "Orc Chieftains": "Orc Chieftain",
  "Pox Rats": "Giant Pox rat",
  "Saurian War Chief": "Saurian Warchief",
  "Saurian War Chiefs": "Saurian Warchief",
  "Vampires Fledgling": "Vampire Fledgling",
  "Vampire Fledgling": "Vampire Fledgling",
  "Wraiths": "Wraith",
  "Zombie Troll": "Zombie Troll",
  "Zombies": "Zombie",
  "Mummys": "Mummy",
  "Necromancers": "Necromancer",
};

function findMonsterStatsForEncounter(name) {
  const trimmed = name.trim();
  const direct = MONSTER_TABLE.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
  if (direct) return direct;
  const alias = ENCOUNTER_NAME_ALIASES[trimmed];
  if (alias) {
    const aliased = MONSTER_TABLE.find((m) => m.name.toLowerCase() === alias.toLowerCase());
    if (aliased) return aliased;
  }
  // Fallback: strip a trailing "s" (simple plural) and retry.
  if (trimmed.endsWith("s") && !trimmed.endsWith("ss")) {
    const singular = trimmed.slice(0, -1);
    const found = MONSTER_TABLE.find((m) => m.name.toLowerCase() === singular.toLowerCase());
    if (found) return found;
  }
  return null;
}


// Monster Behaviour (Bestiary p16-19) — interactive "what does the enemy do" walker.
const BEHAVIOUR_CATEGORIES = ["Humanoid (Close Combat)", "Humanoid (Missile Weapon)", "Beast", "Higher Undead", "Lower Undead", "Magic User"];



function rollD10Table(table) {
  const r = rollDie(10);
  const entry = table.find((e) => r >= e.min && r <= e.max);
  return { r, ...entry };
}

// Step tables (d10) used when adjacent to a hero, per category.
const ADJACENT_TABLES = {
  "Humanoid (Close Combat)": [
    { min: 1, max: 2, action: "Parry Stance (if it has 2 AP left, make a Standard Attack first)" },
    { min: 3, max: 5, action: "Standard Attack" },
    { min: 6, max: 6, action: "Power Attack (Parry Stance if wounded; Standard Attack if not enough AP)" },
    { min: 7, max: 10, action: "Use Skill/Special Talent (Standard Attack if N/A)" },
  ],
  "Humanoid (Missile Weapon)": [
    { min: 1, max: 3, action: "Parry Stance (if it has 2 AP left, make a Standard Attack first)" },
    { min: 4, max: 10, action: "Standard Attack" },
  ],
  Beast: [
    { min: 1, max: 4, action: "Power Attack (Standard Attack if not enough AP)" },
    { min: 5, max: 6, action: "Standard Attack" },
    { min: 7, max: 10, action: "Use Skill/Special Talent (Standard Attack if N/A)" },
  ],
  "Higher Undead": [
    { min: 1, max: 5, action: "Standard Attack" },
    { min: 6, max: 7, action: "Power Attack (Standard Attack if not enough AP)" },
    { min: 8, max: 10, action: "Use Skill/Special Talent (Standard Attack if N/A)" },
  ],
  "Lower Undead": [
    { min: 1, max: 6, action: "Standard Attack" },
    { min: 7, max: 10, action: "Power Attack" },
  ],
};

// Not-adjacent-but-within-M table, Humanoid (Close Combat) only (p16).
const HUMANOID_CC_WITHIN_M_TABLE = [
  { min: 1, max: 2, action: "Parry Stance (forfeits 2nd action)" },
  { min: 3, max: 6, action: "Move into CC — priority: a hero not yet attacked this turn (within M), then a position to attack from behind, then height advantage, then closest hero" },
  { min: 7, max: 10, action: "Charge Attack the closest hero (move adjacent if unable to charge)" },
];

const MAGIC_USER_ADJACENT_TABLE = [
  { min: 1, max: 3, action: "Move M away but stay in LOS (avoid traps not placed by heroes if possible)" },
  { min: 4, max: 6, action: "Cast a close combat spell" },
  { min: 7, max: 10, action: "Make a standard attack" },
];
const MAGIC_USER_NO_LOS_TABLE = [
  { min: 1, max: 6, action: "Move up to M spaces to get LOS to the closest hero without ending up adjacent" },
  { min: 7, max: 10, action: "Cast support magic" },
];
const MAGIC_USER_LOS_TABLE = [
  { min: 1, max: 3, action: "Ranged Magic against the closest hero" },
  { min: 4, max: 5, action: "Ranged Magic against the hero with the least remaining HP (random if tied)" },
  { min: 6, max: 7, action: "Ranged Magic against the opposing Magic User (re-roll if there is none)" },
  { min: 8, max: 10, action: "Cast support magic (use ranged magic if no spell suits; Parry Stance if no target or suitable magic)" },
];

// Legendary Items (p201-211). Unique, unsellable, never run out of magic or break, but
// must be identified before use (Identify a Magic Item). Type = which slot it uses.
const LEGENDARY_ITEMS = [
  { name: "Horn of Alfheim", type: "Item", effect: "Sound it (needs a ready slot, takes a full turn, costs 2 Energy) to give all heroes +3 DMG (magical and physical) until the end of the battle." },
  { name: "Bow of Divine Twilight", type: "Weapon (Shortbow)", effect: "+5 chance of Bloodlust (cumulative with Talents/Perks). If Bloodlust triggers, that shot also deals +5 DMG on top of Bloodlust's own bonus." },
  { name: "Legendary Elixir", type: "Potion", effect: "Randomise a basic stat and increase it by +10, permanently. The party may find more than one." },
  { name: "Dagger of Vrunior", type: "Weapon (Dagger)", effect: "All attacks with this dagger are treated as being made from behind." },
  { name: "The Summoner's Staff", type: "Weapon (Staff)", effect: "Any Conjuring Spell cast while wielding this staff gets +20 Arcane Arts. Any elemental or demon summoned with it gets 1 extra initiative token." },
  { name: "The Headsman's Axe", type: "Weapon (Greataxe)", effect: "+2 Damage for every consecutive hit that deals damage. Any miss or hit dealing no damage resets the bonus to 0; it also resets after each battle. Otherwise a standard Greataxe." },
  { name: "Sword of Lightning", type: "Weapon (Longsword)", effect: "Any hit rolled with an odd number causes lightning to also strike the target for +1d6 wounds, no armour save. Half that roll (RDD) passes to the character closest to the target (not the wielder) — randomise if tied. Otherwise a standard Longsword." },
  { name: "Ohlnir's Hammer", type: "Weapon (Battlehammer)", effect: "Stuns the enemy on every hit, no test needed. Not cumulative — an enemy can never lose more than 1 Action per turn from this. Otherwise a standard Battlehammer." },
  { name: "The Breastplate of Rannulf", type: "Armour (Torso)", effect: "DEF 8, ENC 7. Denies the Double Damage roll made by Large Creatures." },
  { name: "The Golden Khopesh", type: "Weapon", effect: "DMG 1d12+1, Class 4, ENC 10. Ignores all armour and Natural Armour saves. All Higher Undead will always attempt to attack the wielder, forgoing normal targeting priority." },
  { name: "Vial of Never Ending", type: "Alchemy Tool", effect: "Any healing potion mixed in this vial (must be mixed in it originally, not poured from another bottle) restores the drinker to full health. Reusable, and the party may find this several times. Destroyed if hit during battle." },
  { name: "Ring of the Hierophant", type: "Ring", effect: "Any Undead attacking the wearer does so at -15 CS." },
  { name: "Amulet of Haamile", type: "Necklace", effect: "+15 Wisdom." },
  { name: "Boots of Stability", type: "Boots", effect: "The wearer can never fall down, and ignores any destabilising effects." },
  { name: "Stone of Valheir", type: "Item", effect: "Stores up to 3 Focus bonuses (10-30 each), letting a wizard cast a spell with the bonus without spending Focus Actions. Storing a bonus takes a full turn and a successful Arcane Arts roll, or can be filled between quests with no roll needed. Each time a bonus is drawn from the stone, pass a RES Test or lose 1 Sanity Point." },
  { name: "Gauntlets of Hraefnir", type: "Item (no armour slot)", effect: "+15 Strength. Doesn't take up an armour slot — just note it in the inventory." },
  { name: "Belt of Copperbane", type: "Item", effect: "+20 Constitution, but all Goblins fighting the wearer gain the Hate Special Rule." },
  { name: "Ring of Regeneration", type: "Ring", effect: "Grants the Regeneration Special Rule, but with 1d3 HP instead of the normal 1d6 HP." },
  { name: "Crown of Resolve", type: "Item (head)", effect: "+15 RES, but prevents the use of a helmet or cap." },
  { name: "Boots of Energy", type: "Boots", effect: "+2 Points of Energy." },
  { name: "Ring of Awareness", type: "Ring", effect: "+1 initiative token on the first round of battle (cumulative up to +3 if the party finds more than one), and +15 Perception when detecting traps." },
  { name: "Cloak of Elsewhyr", type: "Item", effect: "+15 Dodge." },
  { name: "Priestly Dice", type: "Item", effect: "+2 points of extra Luck." },
  { name: "The Vampire's Brooch", type: "Necklace", effect: "Every time the owner wounds an enemy, restores 1d6 Hit Points to the owner (up to the amount of damage dealt). However, on a roll of 6 it instead drains 1d6 Hit Points from the closest hero." },
  { name: "The Helmet of Golgorosh the Ram", type: "Armour (Head)", effect: "DEF 6, ENC 5, treated as a metal helmet. Hits to the head no longer cause -1 Sanity even if the helmet fails to absorb all damage. However, if hit in the head, the wearer must pass a RES Test or spend their next Action Point stunned, passively enjoying the fairy voices. Shoving while wearing the helmet gets +15." },
  { name: "The Goblin Scimitar", type: "Weapon (Broadsword)", effect: "The wielder gains the Frenzy Perk. Otherwise has the same stats as a Broadsword." },
  { name: "The Halfling Backpack", type: "Item", effect: "All objects carried in this bag have their ENC halved (RDD)." },
  { name: "Trap-sensing Ring", type: "Ring", effect: "+10 Perception for every member of the party when rolling to detect traps (not just the wearer)." },
  { name: "Necklace of Flight", type: "Necklace", effect: "Lets the wearer walk across water, chasms, and pits (and stay on such a square), and makes them immune to pit traps. Cannot be used to cross lava." },
  { name: "Armour of the Father", type: "Armour (Torso)", effect: "The hero chooses whether this is a Padded Vest, Leather Vest, Chainmail Shirt, or Breastplate depending on their profession. Same stats as that armour type, but with a +1 DEF modifier and +15 RES." },
  { name: "Necklace of Deflection", type: "Necklace", effect: "Whenever hit by a projectile from ranged weapons or traps (arrows, darts, sling stones), roll 1d6: 1-3 the projectile misses completely, 4 hits an arm, 5 hits a leg, 6 hits the head." },
];
// Flat, unconditional, permanent bonuses for Legendary Items — applied the same way as
// TALENT_EFFECTS. Items needing live combat judgement (Sword of Lightning, Golden Khopesh's
// targeting override, Vampire's Brooch's per-hit roll, etc.) are reference-only — no entry here.
const LEGENDARY_ITEM_EFFECTS = {
  "Amulet of Haamile": { stat: "WIS", amount: 15, label: "+15 WIS" },
  "Gauntlets of Hraefnir": { stat: "STR", amount: 15, label: "+15 STR" },
  "Belt of Copperbane": { stat: "CON", amount: 20, label: "+20 CON" },
  "Crown of Resolve": { stat: "RES", amount: 15, label: "+15 RES" },
  "Cloak of Elsewhyr": { skill: "dodge", amount: 15, label: "+15 Dodge" },
  "Priestly Dice": { luck: 2, label: "+2 Luck" },
  "Boots of Energy": { energy: 2, label: "+2 Energy" },
  "Ring of Awareness": { skill: "perception", amount: 15, label: "+15 Perception (traps)" },
  "Trap-sensing Ring": { skill: "perception", amount: 10, label: "+10 Perception (traps)" },
  "Armour of the Father": { stat: "RES", amount: 15, label: "+15 RES" },
};
function legendaryItemEffectPatch(hero, itemName, sign) {
  return applyEffectDelta(hero, LEGENDARY_ITEM_EFFECTS[itemName], sign);
}

// Lore tab content — paraphrased from the rulebook's flavor text (not reproduced verbatim,
// out of respect for von Braus Publishing's copyright on the original prose). Mechanics for
// Legendary Items stay in LEGENDARY_ITEMS/LEGENDARY_ITEM_EFFECTS above; these entries are the
// story side only, with a link back to the Compendium for anything with mechanics.
const LORE_ENTRIES = [
  // World
  { title: "Magic in the Kingdom", category: "World", text: "Elves and Dwarfs practiced magic long before the first human settlements existed. Humans and Halflings learned the arcane arts from Elven wizards in turn, and the best human wizards are now on par with their elven teachers, though magic remains rarer among Halflings and Dwarfs — who tend to prefer imbuing it into weapons, armour, and crafted items instead. Today, the most skilled human wizards serve as royal counsellors alongside the High Priests, but among common folk, magic is still met with suspicion, and trading in magic items is generally frowned upon." },
  { title: "The Silver City", category: "World", text: "The third largest city in the Kingdom, and the one closest to the southern border. Its original name has long been forgotten — it's simply been \"the Silver City\" for as long as anyone remembers, after the silver mines that once surrounded it. Most of those mines closed years ago, and without that income the once-beautiful city has been slowly decaying; its old miners' quarters are turning into shantytowns, crime is on the rise, and the ruling Jarl answers with increasingly harsh punishment — it's not unusual to see condemned criminals hanging from the palace walls." },
  { title: "The Ancient Lands", category: "World", text: "South of the Kingdom lies a mix of desert and lush green wilderness, littered with the tombs and ruins of a civilization far older than anything else known. Little is understood about who lived there, though the treasures recovered suggest it was once prosperous, and effigies found among the ruins hint that its people worshipped gods not unlike the Kingdom's own Dark Gods. The land is largely empty now save for animals — and a handful of human tribes of unknown origin, whose territory no expedition has ever managed to approach and return from safely." },
  { title: "The Frontiers", category: "World", text: "North of the Kingdom lies the harsh Milwood Tundra — named for the halfling botanist who vanished there while cataloguing its plant life — beyond which lies the Frozen Sea; a handful of Dwarven keeps still hold out there against Orcs and Frost Giants. To the east rise the Old Mountains, long since tunnelled and mined by the Dwarfs, who have little interest in the unmapped \"flatlands\" said to lie beyond them. Meanwhile, the first ships built for exploring the western ocean have only just begun their maiden voyages along the coast — none have yet ventured far, and none who sailed further out have returned." },

  // Races
  { title: "Elves", category: "Races", text: "Elves live a secluded life on the outskirts of the Kingdom. Though their forests technically fall within its borders, Elves answer to their own Queen rather than the High King, and largely stay out of human politics. Relations between the two peoples have always been good, however, and in times of real strife, Elves and Humans support one another." },
  { title: "Halflings", category: "Races", text: "Halflings have lived alongside Humans for as long as anyone can remember, sharing full citizenship and holding official positions throughout the Kingdom. What they lack in stature, they typically make up for in sheer determination — one halfling general is even remembered from the Undead Wars — though these days Halflings are more commonly found in theoretical or sneaky professions than on the front line." },
  { title: "Dwarfs", category: "Races", text: "Dwarven civilization existed for centuries before Human tribes had even settled into anything resembling a kingdom. Most of Dwarven society is built into vast complexes carved from the eastern mountains, though some settlements sit above ground too. Dwarven stone- and metalworking is unrivalled — their smiths are the only ones who know how to work Mithril — and relations with Humans have always been strong, with several joint military campaigns fought together against Orcs and Beastmen over the years." },

  // Factions
  { title: "The Brotherhood of Ohlnir", category: "Factions", text: "Formed from war veterans and the Warrior Priests of Ohlnir after the Undead War, the Brotherhood spent years hunting down the remaining enclaves of Undead. Their political influence grew so strong that High Kings who ignored their counsel learned to regret it — but as the horrors of the war faded into little more than bedtime stories, the Brotherhood's numbers and influence dwindled. With the current High King's renewed ambitions in the south, many expect their power to rise once more." },
  { title: "The League of Dungeoneers", category: "Factions", text: "Installed by Royal Decree not long after the first adventurers returned from the Ancient Lands laden with gold, the League let the Crown claim its share of the profits while also certifying and improving the odds of survival for those willing to cross into the desert. At its height it kept its own headquarters in the Silver City, and membership carried real privileges — but the Undead War saw the League shut down entirely, its members cast out. It has only recently been re-established, and is far from its former glory; the benefits once enjoyed by its members have yet to return." },

  // History
  { title: "The Kingdom — Lorainia", category: "History", text: "For millennia, the tribes of Men fought amongst themselves for power, until Rannulf Mournoak rose up, declared himself High King, and — unlike anyone before him — actually managed to keep the throne, uniting the tribes into a single, expanding Kingdom. Explorers who ventured further south than anyone had gone before found the ruins of an ancient, long-vanished civilization full of riches; the veterans of those expeditions became known as Dungeoneers. Eventually the ruins' former inhabitants rose again as Undead and struck back, nearly overrunning a third of the Kingdom before the darkness vanished as suddenly as it came. Rituals and witch-hunting orders were established to keep the dead from returning, and no real effort was made to reclaim the southern lands — until the current High King, Logan III, declared that expeditions south should begin again." },
  { title: "Life in the Kingdom", category: "History", text: "The Undead War didn't just cost the Kingdom lives — it cut off the flow of southern gold and coincided with a run of worsening harvests and increasingly brutal winters. Poverty spread as the economy strained, and Orc, Goblin, and beast attacks on villages grew bolder and more frequent. With hunger and cold pressing in, crime has risen sharply across the Kingdom, and many quietly see the High King's decision to reopen the south as more a sign of desperation than ambition." },

  // Deities
  { title: "Kredelia, the Goddess of Travellers", category: "Deities", text: "Protector of those on the road, Kredelia is traditionally offered a small gift before setting out on any long journey, in the hope of warding off bandits and other misfortune. Travellers she favours are said to receive a boon that makes their journey a little easier." },
  { title: "The Dark Gods", category: "Deities", text: "Several gods are collectively — and only ever — referred to as \"the Dark Gods,\" out of superstition and fear of what invoking their true names might bring. Worshipping them is forbidden throughout the Kingdom, though secret followers persist regardless. The most widely followed among them is Kheros, the God of Death, to whom necromancers turn for power." },
  { title: "Metheia, the God of Life", category: "Deities", text: "As God of Life, Metheia commands more devotion than almost any other deity in the Kingdom — most citizens offer her a short prayer each morning, simply in thanks for waking to see another day. Every major city keeps a chapel in her honour, and her priests are typically the ones tending the sick and wounded in the temple wards nearby." },
  { title: "Ohlnir, the God of Strength", category: "Deities", text: "God of war and one of the five most-worshipped deities. His followers admire physical prowess and hold that many of the world's problems could — and should — be solved with might and weapons. It's why Barbarians so often wear his sign, alongside soldiers and Warrior Priests." },
  { title: "Rhidnir, the Trickster God", category: "Deities", text: "A fickle deity who delights in interference and the most unexpected of outcomes. Said to be the father of both Gnolls and Beastmen. Few travellers dare pass a shrine of his without tossing a coin as an offering, and he's the natural patron of those who walk society's narrower paths — thieves and highwaymen among them." },

  // Bestiary — faction overviews and exotic monster descriptions.
  { title: "Bandits and Brigands", category: "Bestiary", text: "Lowlife opportunists preying on the weak for money and fortune — mostly human, sometimes with a barely-tamed animal or even an Ogre recruited into the ranks. Most lack formal training and are simple enough to dispatch, but the Fallen Knights among them are another matter: former protectors of the Kingdom who succumbed to the Dark Gods, still carrying some of the best armour the Royal Smith can provide." },
  { title: "Orcs and Goblins", category: "Bestiary", text: "Orcs and Goblins have coexisted with humans since before the Kingdom's founding, living in tribes much like ancient human ones and quarrelling with each other just as often. Orcs are muscular and larger than a man; Goblins are roughly Halfling-sized. The rise of the Kingdom diminished their threat through disunity — until recent reports of an Orc Warlord unifying the tribes, posing a far greater danger." },
  { title: "Dark Elves", category: "Bestiary", text: "Elves are generally kind and good-hearted, but a minority stray from those virtues and become Dark Elves — whether outcasts or by their own choice. They band together with creatures of similarly sinister disposition, taking refuge in far-off places and raiding villages and farms. Medusas, Harpies, Demons, and Giant Spiders are all drawn to their company." },
  { title: "The Undead", category: "Bestiary", text: "The dead not staying dead is a constant threat, worsening the further south one travels in the Kingdom. Some revere the Undead as a path to eternal life and turn to Necromantic magic; the most skilled of these occasionally linger on after death as a Lich, commanding their own host of Undead forever." },
  { title: "Beasts", category: "Bestiary", text: "Neither animal nor human, Beasts range from the dog-like Gnolls to Satyrs and the ferocious Beastmen, living in tribal societies even less civilised than Orcs and Goblins. Minotaurs and Demons walk among them, and Trolls are drawn to the violence that follows. They generally avoid human settlements, but grow more active — and more willing to raid — near the southern border." },
  { title: "Reptiles", category: "Bestiary", text: "Giant reptiles walking upright are the stuff of nightmares to some, and very real in this land — though thankfully rare, mostly confined to marshlands along the western coast. The primary reptile is the Saurian, a lizard slightly larger and clearly as intelligent as a man, armed with weapons akin to human ones, supported by the smaller, faster Geckos, Froglings, and fire-breathing Salamanders." },
  { title: "The Ancient Lands", category: "Bestiary", text: "The Undead are the only creatures known to walk the Ancient Lands, where old ruins hide powerful specimens and the desert itself is filled with dangers like monstrous scorpions and giant centipedes. Only the most prepared and experienced adventurers should consider crossing the border." },
  { title: "Bloated Demon", category: "Bestiary", text: "A shapeless spawn of the Void that hovers just above the ground, searching for meat to devour. They vary in shape and size, but all share the distinct smell of rot — somewhere on the swollen, balloon-shaped body is a maw filled with razor-sharp teeth." },
  { title: "Blood Demon", category: "Bestiary", text: "Uncannily smart demons, named for their unquenchable desire for blood, that work themselves into a mad frenzy at the prospect of finally satiating their thirst." },
  { title: "Lesser Plague Demon", category: "Bestiary", text: "Resembling an overgrown mosquito armed with both pincers and stingers, these demons have more than one way to inflict harm — and their putrefaction makes it likely any wound they cause becomes infected with poison." },
  { title: "Lurker", category: "Bestiary", text: "A demon resembling a huge floating eye surrounded by tentacles, each crowned with another eye. Though it could easily snap a man in two with its jaws, it primarily strikes with magic — once it fixes its eyes on a target, that person seldom lives to tell the tale." },
  { title: "Psyker", category: "Bestiary", text: "A demon with a squid-like face and innate magic skill, along with a psychic ability to enter the minds of all who oppose it, filling them with hopelessness and doubt." },
  { title: "Mimic", category: "Bestiary", text: "The exact nature of Mimics is unknown, since these chameleon-like creatures disguise themselves as everyday objects — closets, chests — and lunge in a surprise attack when an unsuspecting adventurer comes too close." },
  { title: "Drider", category: "Bestiary", text: "A horror with the upper body of a human and the lower body of a large spider. Unsurprisingly, they share a special bond with spiders — and, like spiders, an affinity for the Dark Elves, who welcome their considerable fighting power." },
  { title: "Naga", category: "Bestiary", text: "With several arms, a human-like torso, and the lower body of a giant snake, Nagas seem far too chaotic to be natural — most assume they must be demons. They live alongside reptiles such as Saurians and Geckos, though their true origin remains a mystery. Their flurry of extra-armed blows is too much for even the most experienced soldier to parry." },
  { title: "Shambler", category: "Bestiary", text: "At first glance little more than a tangle of vines, roughly Ogre-sized once undisguised and vaguely humanoid in shape. Many adventurers have passed innocuous-looking plants only to find themselves entangled and slowly choked to death — Shamblers thrive in dark, damp dungeons, preferring to ensnare their prey before squeezing it to death." },
  { title: "Slime", category: "Bestiary", text: "Whether a Slime is conscious is debatable, but it does seem to retain some basic instincts. They come in many colours, though most are brown or dark green and discoloured by dirt and debris; what they're actually made from remains unclear, but the substance is highly corrosive to most metals." },
  { title: "Tomb Guardian", category: "Bestiary", text: "Found only in the Ancient Lands, likely the creation of the old masters of that place. Standing almost twice the size of a human with a crocodile-like appearance, their mere presence is often enough to scare off intruders — notoriously hard to kill, since they lack vital organs to strike." },
  { title: "Plague Demon", category: "Bestiary", text: "The embodiment of a walking disease. Their foul smell can be sensed from far away, and simply standing near one can be enough to contract any of the numerous infections they carry." },

  // Legendary Items — paraphrased flavor text only; mechanics live in the Compendium.
  { title: "Horn of Alfheim", category: "Legendary Items", text: "Said to have been forged by the Old Gods themselves and given to Men to help drive back the hordes of Orcs and Goblins that once harried the early tribes.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Bow of Divine Twilight", category: "Legendary Items", text: "A shortbow said to hold a literal strand of Death's own cloak, forged into the wood by Elven mages — tapping, however faintly, into the fabric of life itself.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Legendary Elixir", category: "Legendary Items", text: "Only two alchemists in history are said to have perfected the craft needed to brew a potion whose effects last a lifetime: Akh-Zum, and Cebarin the Mad, whose obsession with expanding his own mind eventually consumed his sanity — he spent his final years muttering in an unknown tongue before dying an elderly hermit.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Dagger of Vrunior", category: "Legendary Items", text: "Belonged to the assassin Vrunior, who topped the Kingdom's Most Wanted list for years without ever failing a contract before finally being tracked down and brought to justice. His dagger went missing — until now.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Summoner's Staff", category: "Legendary Items", text: "A gnarled black staff, unnaturally heavy and cold to the touch, said by some to have been first wielded by the High Mage Ibeus Aldor during the Undead Wars, and by others to have belonged to a tribal shaman generations earlier. No one has ever claimed to have made it.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Headsman's Axe", category: "Legendary Items", text: "Heirloom of the Cragward family, who served as the Kingdom's royal executioners for generations, handing the axe from parent to child along with the family trade. After centuries of grim use, the axe itself seems to have changed — as if tainted by the blood of everyone it's claimed.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Sword of Lightning", category: "Legendary Items", text: "Forged in a freak accident: the wizard Olius Hellbrand was struck by lightning at the exact moment he completed the blade's enchantment, and died instantly — but the lightning itself seems to have stayed trapped in the steel ever since. Many have tried to recreate the effect; none have succeeded.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Ohlnir's Hammer", category: "Legendary Items", text: "Said to have been handed down by the god Ohlnir himself, though scholars find it hard to believe he'd have gifted his first known wielder — the brutish orc chieftain Braugh Skullcracker, who used it to devastating effect until his reign abruptly ended and the hammer vanished from the histories.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Breastplate of Rannulf", category: "Legendary Items", text: "Worn by Rannulf Mournoak, the first High King, as he united the tribes of Men into the Kingdom. Forged from meteoric iron mined deep in the Dwarven mountains, it's said to have once turned aside a minotaur's axe blow that should have killed him outright. Rannulf wore it every day of his life and was ultimately buried in it — how it later left his tomb remains a mystery.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Golden Khopesh", category: "Legendary Items", text: "Wielded by a nameless mummified prince during the darkest days of the Undead War, cutting through armour and warriors alike until he was finally killed — not by skill, but by sheer chance, crushed under a stone hurled from a human trebuchet. The blade passed to a human artillery captain, later found dead in his bed, withered and wild-eyed; the khopesh itself was never recovered.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Vial of Never Ending", category: "Legendary Items", text: "Crafted by the renowned alchemist Akh-Zum, famed for his life-restoring elixirs — any healing potion mixed directly in this vial is strengthened enough to restore the drinker to full health.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Ring of the Hierophant", category: "Legendary Items", text: "Made by the now-extinct Hierophant Order, formed after the Undead War specifically to hunt down the Undead that lingered on afterward. It gives off a faint light, invisible to human eyes but deeply unpleasant to anything Undead.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Amulet of Haamile", category: "Legendary Items", text: "Made by Haamile, steward of the great magical college of Martslock and the greatest sorcerer of his age, who crafted the amulet in his final years to preserve his once-brilliant mind as it began to fade. It was kept safe at the college for centuries after his death before eventually being forgotten and lost.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Boots of Stability", category: "Legendary Items", text: "Once worn by the notoriously drunk Lord Fouquet, who — however deep into his cups — never once stumbled or fell at the many parties he caused scenes at. The boots disappeared after his death; their maker was never identified.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Stone of Valheir", category: "Legendary Items", text: "One of three mesmerizing, colour-shifting stones discovered by the Dwarven King Valheir over a thousand years ago. Legend says he spent his remaining years simply staring into them and eventually went mad — the stones themselves were then lost for ages, until now.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Gauntlets of Hraefnir", category: "Legendary Items", text: "Once worn by Hraefnir the Fierce, an undefeated gladiator-turned-berserker who spent his freedom roaming the Kingdom's frontiers in search of tougher opponents. He finally met his match against the ogre Gorag Halfhand — the gauntlets he wore into that final battle passed into legend, and to many Berserkers, Hraefnir himself is now spoken of as a half-god.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Belt of Copperbane", category: "Legendary Items", text: "Belonged to Thane Copperbane, a dwarf famed for shrugging off wound after wound the goblins threw at him. He died when a mining tunnel collapsed on him — dwarves insist it must have been a goblin scheme rather than a natural cave-in, though no proof has ever surfaced.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Ring of Regeneration", category: "Legendary Items", text: "Crafted from the femur of a troll by the necromancer Semias Blackwood in a bid to extend his own unnaturally long life. Necromancers are hunted and shunned throughout the Kingdom, and rumours of Semias's existence persisted for over a century before he was finally run to ground in the eastern mountains — leaving the ring behind him, its role in his long survival never confirmed.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Crown of Resolve", category: "Legendary Items", text: "Worn by generations of Dwarf Thanes ruling the once-great mining city of Morndihr — until, soon after the Kingdom's founding, the city was overrun by goblins and trolls, with not a single Dwarf escaping the tragedy. What other treasures still lie in Morndihr's ruins remains unknown, since almost no one who has entered has lived to tell of it.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Boots of Energy", category: "Legendary Items", text: "Worn by Phineas Belmont, a message-runner during the Undead War famed for carrying an urgent warning almost the length of the eastern border to the Silver City without pause — a feat he modestly credited entirely to having a good pair of boots.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Ring of Awareness", category: "Legendary Items", text: "A plain golden ring set with a dull purple stone that begins to pulse with light as danger draws near. Long popular among nobles and warlords wary of assassins, no one has ever managed to reproduce its craft, and its original maker remains unknown.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Cloak of Elsewhyr", category: "Legendary Items", text: "Woven personally by the Elven Queen Elsewhyr before the Kingdom's founding, for the scouts guarding her forest's borders. That one has survived intact — and ended up outside Elven hands entirely — is considered remarkable; its shifting, almost hypnotic motion makes its wearer maddeningly hard to hit.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Priestly Dice", category: "Legendary Items", text: "A pair of golden dice said to have been given to Men by the demi-god Rick at the Kingdom's founding, said to bring tremendous luck to whoever carries them.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Vampire's Brooch", category: "Legendary Items", text: "Belonged to Esmeralda Rosepike, the most infamous vampire in human history, who thrived among the capital's nobility for years, hosting decadent parties — until the young men courting her began vanishing at an alarming rate and her true nature was uncovered. She was finally cornered by royal guards and killed, though not before a hundred of them died first.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Helmet of Golgorosh the Ram", category: "Legendary Items", text: "Belonged to Golgorosh, a tribal warrior so fearsome in battle he'd lose all sense and charge headfirst into enemies, knocking them senseless with brutal headbutts. Worried the constant blows would eventually break his mind, his tribe's shaman crafted this ram-horned helmet and enchanted it to soothe him — though the singing fairy voices it conjures are known to calm anyone wearing it, not just Golgorosh.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Goblin Scimitar", category: "Legendary Items", text: "Once belonged to the Goblin King Teezmeald, wielded in his last stand against the elf princess Aelynthi Bihorn. Considering it beneath her to touch goblin-forged steel, she left the blade where he fell — and whoever, or whatever, later claimed it still craves blood to this day.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "The Halfling Backpack", category: "Legendary Items", text: "Belonged to Elyas Dustmouse, an unlikely but famous dungeoneer standing barely four feet tall, who called in favours from the Wizards' Guild to have a special, weightless bag made for hauling loot home. Dustmouse vanished on his final expedition along with the backpack, and no one has ever managed to replicate its craft.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Trap-sensing Ring", category: "Legendary Items", text: "Designed to look like a nest of twisting snakes, this ring squeezes the wearer's finger whenever a trap is near. Found in the Ancient Lands by the dungeoneer Alad Bostan and cleared as safe by the High Wizards of the Golden College, it was returned to him — only for Alad to disappear on his very next expedition, taking the ring with him once more.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Necklace of Flight", category: "Legendary Items", text: "Once belonged to the elven princess Aelynthi Bihorn, later gifted to the dwarf Thane Lorheas Oarcloak to aid his war against the goblin tribes. It vanished along with him when he was lost to the goblin hordes.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Armour of the Father", category: "Legendary Items", text: "Worn in the Royal Army by the wearing hero's own father, who never rose above the rank of Centurion despite the armour's fine craftsmanship. Battle-worn but lovingly fitted, it's passed down to serve its next wearer just as well as it once served him.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
  { title: "Necklace of Deflection", category: "Legendary Items", text: "An object of unknown origin that wraps its wearer in a faint, invisible field — not strong enough to stop a blow outright, but just enough to nudge an incoming arrow, dart, or sling stone off its original mark.", relatedTab: "compendium", relatedCat: "legendary", relatedLabel: "Compendium: Legendary Items" },
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

function CompendiumTab({ heroes, updateHero, addLog, initialCat }) {
  const [cat, setCat] = useState(initialCat || "talents");
  const [heroPick, setHeroPick] = useState("");
  const cats = [
    ["talents", "Talents", TALENTS, true, false, "talents"],
    ["perks", "Perks", PERKS, false, true, "perks"],
    ["prayers", "Prayers", PRAYERS, true, false, "prayers"],
    ["spells", "Spells", SPELLS, true, true, "spells"],
    ["rules", "Special Rules", SPECIAL_RULES, false, true, "specialRules"],
    ["legendary", "Legendary Items", LEGENDARY_ITEMS, false, true, "legendaryItems"],
  ];
  const [, , items, showLevel, showType, field] = cats.find((c) => c[0] === cat);
  const pickedHero = heroes.find((h) => h.id === heroPick);
  const isLearnedElsewhere = cat === "spells" || cat === "prayers";

  const addToHero = (name) => {
    if (!pickedHero || !field || isLearnedElsewhere) return;
    const list = pickedHero[field] || [];
    if (list.includes(name)) return;
    const effectPatch = field === "talents" ? talentEffectPatch(pickedHero, name, 1) : field === "legendaryItems" ? legendaryItemEffectPatch(pickedHero, name, 1) : {};
    updateHero({ ...pickedHero, [field]: [...list, name], ...effectPatch });
    const eff = field === "talents" ? TALENT_EFFECTS[name] : field === "legendaryItems" ? LEGENDARY_ITEM_EFFECTS[name] : null;
    if (eff && addLog) addLog(`${pickedHero.name}: gained ${field === "talents" ? "Talent" : "Legendary Item"} "${name}" (${eff.label}, applied automatically).`);
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

      {cat === "legendary" && (
        <Panel className="mb-4">
          <p className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
            Legendary Items are unique (unless otherwise noted, only found once) and can never be sold. Unlike ordinary magic items, they never run out of magic and can't be damaged — but they must be identified (see the Wizards' Guild or a Scryer on the Settlements tab) before use. Attaching one below auto-applies its bonus if it's a flat stat increase; effects that need live combat judgement stay as reference text only.
          </p>
        </Panel>
      )}
      {isLearnedElsewhere ? (
        <Panel className="mb-4">
          <p className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
            {cat === "spells" ? "Spells" : "Prayers"} are learned (and cost-checked, and added to a hero's sheet automatically) from the {cat === "spells" ? "Wizards' Guild" : "Inner Sanctum"} box on the Settlements tab, when viewing Silver City. This tab is reference-only for {cat}.
          </p>
        </Panel>
      ) : heroes.length > 0 && (
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
        </Panel>
      )}

      <Panel>
        <CompendiumList
          items={items}
          showLevel={showLevel}
          showType={showType}
          onAdd={pickedHero && !isLearnedElsewhere ? addToHero : null}
          addedNames={pickedHero ? pickedHero[field] : []}
        />
      </Panel>
    </div>
  );
}

// ---------- Lore ----------
const LORE_CATEGORY_COLORS = {
  World: palette.forestDark,
  Races: "#5B6FA8",
  Factions: palette.gold,
  History: palette.crimson,
  Deities: "#6B4FA0",
  "Legendary Items": palette.ember,
};

function LoreEntryCard({ entry, open, onToggle, goToTab }) {
  const badgeColor = LORE_CATEGORY_COLORS[entry.category] || palette.inkSoft;
  const badgeTextColor = entry.category === "Factions" ? palette.charcoal : palette.parchment;
  return (
    <div className="rounded-lg mb-2 overflow-hidden" style={{ background: palette.panel, border: `1px solid ${palette.line}` }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-bold text-sm" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{entry.title}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full self-start"
            style={{ background: badgeColor, color: badgeTextColor, fontFamily: "JetBrains Mono, monospace" }}
          >
            {entry.category}
          </span>
        </div>
        <span style={{ color: palette.inkSoft, flexShrink: 0, marginLeft: 8 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="px-3 pb-3" style={{ borderTop: `1px solid ${palette.line}66` }}>
          <p className="text-sm mt-2.5 leading-relaxed" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>{entry.text}</p>
          {entry.relatedTab && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                onClick={() => goToTab(entry.relatedTab, { cat: entry.relatedCat })}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(122,31,43,0.08)", color: palette.crimson, border: `1px solid ${palette.crimson}40`, fontFamily: "JetBrains Mono, monospace" }}
              >
                → {entry.relatedLabel}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs px-3 pb-2.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          {entry.text.length > 90 ? entry.text.slice(0, 90) + "…" : entry.text}
        </p>
      )}
    </div>
  );
}

function BestiaryTab() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [openMonster, setOpenMonster] = useState(null);
  const [section, setSection] = useState("monsters"); // monsters | rules

  const types = Array.from(new Set(MONSTER_TABLE.map((m) => m.type))).sort();
  const q = query.trim().toLowerCase();
  const filteredMonsters = MONSTER_TABLE.filter((m) => {
    const matchesType = typeFilter === "all" || m.type === typeFilter;
    const matchesQuery = !q || m.name.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });
  const filteredRules = SPECIAL_RULES.filter((r) => !q || r.name.toLowerCase().includes(q) || r.effect.toLowerCase().includes(q));

  const StatCell = ({ label, val }) => (
    <div className="text-center">
      <div className="text-[9px] uppercase" style={{ color: palette.goldSoft, fontFamily: "Cinzel, serif" }}>{label}</div>
      <div className="text-sm font-bold" style={{ color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{val}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon={Skull}>Bestiary</SectionTitle>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSection("monsters")}
            className="flex-1 text-xs px-2 py-1.5 rounded font-bold"
            style={{ background: section === "monsters" ? palette.crimson : "#00000010", color: section === "monsters" ? palette.parchment : palette.ink, fontFamily: "Cinzel, serif" }}
          >
            Monsters ({MONSTER_TABLE.length})
          </button>
          <button
            onClick={() => setSection("rules")}
            className="flex-1 text-xs px-2 py-1.5 rounded font-bold"
            style={{ background: section === "rules" ? palette.crimson : "#00000010", color: section === "rules" ? palette.parchment : palette.ink, fontFamily: "Cinzel, serif" }}
          >
            Special Rules ({SPECIAL_RULES.length})
          </button>
        </div>
        <input
          type="text"
          placeholder={section === "monsters" ? "Search monsters..." : "Search special rules..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded px-3 py-2 mb-2"
          style={{ border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
        />
        {section === "monsters" && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter("all")}
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: typeFilter === "all" ? palette.forestDark : "#00000010", color: typeFilter === "all" ? palette.parchment : palette.ink }}
            >
              All
            </button>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: typeFilter === t ? palette.forestDark : "#00000010", color: typeFilter === t ? palette.parchment : palette.ink }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </Panel>

      {section === "monsters" && (
        <Panel>
          <div className="space-y-1">
            {filteredMonsters.map((m) => (
              <div key={m.n} className="rounded" style={{ background: "#00000006" }}>
                <button
                  onClick={() => setOpenMonster(openMonster === m.n ? null : m.n)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-sm font-bold" style={{ color: palette.ink, fontFamily: "Cinzel, serif" }}>{m.name}</span>
                  <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>{m.type} · HP {m.hp} · XP {m.xp}</span>
                </button>
                {openMonster === m.n && (
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-4 gap-2 mb-2 p-2 rounded" style={{ background: palette.charcoal }}>
                      <StatCell label="CS" val={m.cs} /><StatCell label="RS" val={m.rs} /><StatCell label="DMG" val={m.dmg} /><StatCell label="RES" val={m.res} />
                      <StatCell label="To Hit" val={m.toHit} /><StatCell label="NA" val={m.na} /><StatCell label="M" val={m.m} /><StatCell label="DEX" val={m.dex} />
                    </div>
                    <p className="text-xs mb-1" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                      <b>Behaviour:</b> {m.behaviour} · <b>HP:</b> {m.hp} · <b>XP:</b> {m.xp} · <b>Loot:</b> {m.loot}
                    </p>
                    {m.special && (
                      <p className="text-xs" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>
                        <b>Special:</b> {m.special}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {section === "rules" && (
        <Panel>
          <div className="space-y-2">
            {filteredRules.map((r) => (
              <div key={r.name} className="text-xs p-2 rounded" style={{ background: "#00000006" }}>
                <span className="font-bold" style={{ color: palette.crimson, fontFamily: "Cinzel, serif" }}>{r.name}</span>
                <span className="ml-1" style={{ color: palette.inkSoft }}>({r.type})</span>
                <p style={{ color: palette.ink, fontFamily: "Crimson Pro, serif", marginTop: 2 }}>{r.effect}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function LoreTab({ goToTab }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [openTitle, setOpenTitle] = useState(null);

  const categories = ["World", "Races", "Factions", "History", "Deities", "Bestiary", "Legendary Items"];
  const counts = { all: LORE_ENTRIES.length };
  categories.forEach((c) => { counts[c] = LORE_ENTRIES.filter((e) => e.category === c).length; });

  const q = query.trim().toLowerCase();
  const filtered = LORE_ENTRIES.filter((e) => {
    const matchesCat = cat === "all" || e.category === cat;
    const matchesQuery = !q || e.title.toLowerCase().includes(q) || e.text.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div>
      <Panel className="mb-4">
        <h2 style={{ fontFamily: "Cinzel, serif", color: palette.crimson }} className="text-lg font-bold mb-0.5">Lore</h2>
        <p className="text-xs italic mb-3" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          The world of Lorainia, as recorded in the rulebook.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lore…"
          className="w-full text-sm rounded px-3 py-2 mb-1"
          style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
        />
        <p className="text-xs mb-3" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}{q ? ` matching "${query.trim()}"` : ""}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCat("all")}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: cat === "all" ? palette.crimson : "#00000010", color: cat === "all" ? palette.parchment : palette.ink, fontFamily: "Crimson Pro, serif" }}
          >
            All <span style={{ opacity: 0.75, fontFamily: "JetBrains Mono, monospace" }}>{counts.all}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ background: cat === c ? palette.crimson : "#00000010", color: cat === c ? palette.parchment : palette.ink, fontFamily: "Crimson Pro, serif" }}
            >
              {c} <span style={{ opacity: 0.75, fontFamily: "JetBrains Mono, monospace" }}>{counts[c]}</span>
            </button>
          ))}
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <Panel>
          <p className="text-xs italic text-center" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            No lore entries match your search.
          </p>
        </Panel>
      ) : (
        filtered.map((entry) => (
          <LoreEntryCard
            key={`${entry.category}-${entry.title}`}
            entry={entry}
            open={openTitle === `${entry.category}-${entry.title}`}
            onToggle={() => setOpenTitle(openTitle === `${entry.category}-${entry.title}` ? null : `${entry.category}-${entry.title}`)}
            goToTab={goToTab}
          />
        ))
      )}
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
    version: "1.43.0",
    date: "2026-08-15",
    sections: {
      "Changed": [
        "Nav reordered to group tabs by when you'd actually reach for them: live-play tabs (Party, Turn, Heroes, Combat, Bestiary, Actions, Alchemy, Dice, Reference) come first, downtime/between-quest tabs (Travel, Settlement, Guilds, Quest, Compendium, Lore, Campaigns) come second — Bestiary and Reference moved up since they're needed mid-fight, not just as an afterthought",
        "Nav is now two independently-scrollable rows instead of one long row — the live-play group and the downtime group are each visible at a glance, so you're not swiping through all 16 tabs to get from Combat to Travel",
      ],
    },
  },
  {
    version: "1.42.0",
    date: "2026-08-15",
    sections: {
      "Added": [
        "Scrolls Salesman settlement event now actually lets you buy — pick a hero and tap Buy (100c) on one of the 3 random spell offers to add a real Scroll to their backpack, instead of just listing what's on offer",
        "Loot Roller's T4 \\\"1 random scroll\\\" result now rolls an actual spell and lets you add the Scroll straight to a chosen hero's backpack",
      ],
      "Fixed": [
        "DiceTray was the one tab in the app still wired to the raw two-argument updateHero instead of the single-object adapter every other tab uses — harmless until this session's new Loot Roller code needed it, since it would have silently failed to add scrolls to a hero's backpack",
      ],
    },
  },
  {
    version: "1.41.0",
    date: "2026-08-15",
    sections: {
      "Added": [
        "Read a Magic Scroll (Combat tab, next to Spells) — any hero can attempt a scroll straight from their own inventory. Uses WIS instead of Arcane Arts, Casting Value is reduced by 10 (min 0), and Focus is never allowed. The scroll is automatically removed from the hero's backpack on a successful cast, a dispelled cast, or a miscast — it survives a plain failure or a missed touch roll",
      ],
    },
  },
  {
    version: "1.40.0",
    date: "2026-08-15",
    sections: {
      "Added": [
        "Close Combat To-Hit calculator now has checkable Charge (+10) and Power attack (+20) modifiers, matching the QRS To-Hit table — previously only documented in prose, not available as a toggle",
        "Close Combat/Ranged To-Hit results now surface next-step guidance: a hit shows a \\\"Go to Damage\\\" shortcut with a reminder of the damage formula, a natural 01-05 flags Bloodlust (roll DMG twice, take the higher — or automatic max on a Power Attack), and a 00 result notes the weapon-damage/drop-weapon rule",
      ],
      "Changed": [
        "Nav order: Heroes moved up to right after Turn, and Combat moved to right after Heroes, so in-session tabs sit together instead of split up by out-of-dungeon tabs",
        "Dice tab's plain \\\"Hit Location (d6)\\\" button removed in favour of the fully automated version on Combat → Damage (hero-linked, auto-applies Sanity/Durability effects) — a note now points there instead",
      ],
      "Fixed": [
        "Party tab's Threat note referenced \\\"Start of Turn above\\\", which moved to the Turn tab in the last version — now points to the right place",
      ],
    },
  },
  {
    version: "1.39.0",
    date: "2026-08-15",
    sections: {
      "Added": [
        "Encounter Roller in the Turn tab — pick a faction (Beasts, Orcs and Goblins, Bandits and Brigands, Reptiles, Dark Elves, Undead, Ancient Lands), and it rolls the real 1d20 + level bonus against the full table, rolls the resulting creature count, and links each result to its Monster Table stats where the name matches",
      ],
      "Changed": [
        "Turn tab reordered to match the rulebook's actual Turn Sequence: Start of Turn, Initiative Bag, Round, Action Points, Encounter Roller, Roll Enemy Action, Light Sources, Trade Gear, Short Rest",
      ],
      "Fixed": [
        "Bestiary monster stat blocks (CS/RS/DMG/NA/M/DEX/RES/To Hit) were unreadable — dark text on a dark background",
        "Lore tab's Bestiary filter could get stuck showing the wrong \\\"The Ancient Lands\\\" entry (there are two lore entries with that title, one under World and one under Bestiary) — each now opens its own correct text",
      ],
    },
  },
  {
    version: "1.38.0",
    date: "2026-08-14",
    sections: {
      "Added": [
        "Bestiary: full 100-entry Monster Table with complete stat blocks (CS/RS/DMG/NA/M/DEX/RES/To Hit/Type/Behaviour/Special Rules/XP/Loot), searchable and filterable by faction in a new Bestiary tab",
        "Special Rules glossary browsable in the same tab, alongside the existing rule set already used for hero equipment effects",
        "\"Roll Enemy Action\" panel in the Turn tab — walks through the Monster Behaviour AI logic for all 6 creature categories and rolls the real d10 tables for a result",
        "Lore tab: new \"Bestiary\" category covering faction overviews and Exotic Monster entries, plus two new Deities (Ohlnir, Rhidnir)",
      ],
      "Fixed": [
        "Merged newly-sourced Special Rules into the existing glossary rather than duplicating it, and added the 4 genuinely missing entries (Fast, Groundbreaker, Lightning Fast, Pyrophobia)",
      ],
    },
  },
  {
    version: "1.37.0",
    date: "2026-08-14",
    sections: {
      "Added": [
        "Powerstones: successfully casting Enchant Item now auto-rolls the real 1d20 table and stores the result on the item — shown on the weapon's Dissipate button and logged. Full table also added to the Reference tab",
        "Quest tab: Campaign Quests restructured to match the rulebook's actual structure — First Blood as a standalone introductory quest, The Dead Rising campaign (7 quests: Spring Cleaning, The Dead Rising, Highwaymen, The Burning Village, The Apprentice, 6A Sacrifice, 6B The Master), and Lair of the Spider Queen (3 levels: The Entrance, The Basement, The Tomb of the Spider Queen) — each with its own progress counter",
        "Quest Book II section: Main Quests (11) and Backer Quests (12) checklists from its table of contents, plus a separate Mini Quests checklist (12 short standalone encounters)",
        "\"Check off as you complete\" notes added across all quest checklists",
      ],
    },
  },
  {
    version: "1.36.1",
    date: "2026-08-14",
    sections: {
      "Added": [
        "Quests into the Ancient Lands: all 5 quests now listed on the Quest tab checklist (The Pyramid of Xanthu, Tomb of the Hierophant, Temple of Despair, Hall of Amenhotep, Crypt of Khaba)",
      ],
    },
  },
  {
    version: "1.36.0",
    date: "2026-08-14",
    sections: {
      "Added": [
        "Bleeding Out: a hero at 0 HP now shows a dedicated panel — rolls the mandatory 1d4 permanent stat or HP loss, then offers Revive (set HP from a heal roll) or Hero Dies (permanently removes them from the party)",
        "Throwing Potions: new Combat tab mode with its own RS test, bonuses/penalties for Large enemies, throwing over obstacles, and throwing through doorways",
        "Hit Location roll (Combat tab, Damage calculator): 1d6 against Head/Arms/Torso/Legs when a hero is struck — Head applies −1 Sanity automatically, Torso rolls against the hero's actual Quick Slot items for durability damage",
        "Reference tab: Who Can Fight, Zone of Control, and End of Battle",
        "Quest tab overhaul: Campaign Quests checklist (First Blood, The Dead Rising, Lair of the Spider Queen), a Random Quests roller with its own checklist, and a Side Quests roller with its own checklist — completions log to the party log and persist with the campaign. Also includes a short rules box covering how to read quests, Wandering Monster triggers, and Ancient Lands travel requirements",
        "Nav bar can now be scrolled by clicking and dragging on desktop, not just on touch devices",
      ],
      "Fixed": [
        "The Close Combat modifier \"Enemy has a rapier\" was named after one example weapon rather than the actual rule — renamed to \"Enemy weapon has the Fast Rule\"",
        "Poison's damage-type reference text described a rolling duration; corrected to the rulebook's actual two-checkpoint timing (next turn, then again 1d10 turns later)",
        "Fire and Acid follow-up damage now note the minimum-1 floor when it continues into the next turn",
      ],
    },
  },
  {
    version: "1.35.0",
    date: "2026-08-14",
    sections: {
      "Added": [
        "Lore tab: 45 world-building snippets pulled from the rulebook, covering the World, Races, Factions, History, Deities, and every one of the 31 Legendary Items — search and category filters, tap a card to expand it",
        "Legendary Item lore entries link straight through to their Compendium entry for the mechanics",
      ],
    },
  },
  {
    version: "1.34.3",
    date: "2026-08-14",
    sections: {
      "Fixed": [
        "The level-up points badge was still being clipped along the top edge of the hero tab button after the previous fix",
      ],
    },
  },
  {
    version: "1.34.2",
    date: "2026-08-14",
    sections: {
      "Fixed": [
        "The level-up points badge on a hero's tab button was getting clipped instead of sitting proud of the corner",
      ],
    },
  },
  {
    version: "1.34.1",
    date: "2026-08-14",
    sections: {
      "Fixed": [
        "Search Furniture now has a confirmed AP cost (1 AP out of combat, 2 AP with enemies in LOS) and a hero picker to spend it from, instead of being treated as a free action",
      ],
    },
  },
  {
    version: "1.34.0",
    date: "2026-08-14",
    sections: {
      "Added": [
        "Guilds tab: a new tab covering all six guilds (Fighters', Rangers', Wizards', Alchemists', The Dark Guild, The Inner Sanctum), picked by settlement, each as its own expandable card",
        "Skill Training at every guild — +3 to the relevant skills for 300c, one session per skill between dungeons, tracked automatically",
        "Buying Special Equipment at every guild now rolls the Availability check for you (1d6 at or under the listed Availability = in stock), deducts the cost, and drops the item straight into the chosen hero's backpack — covers the Fighters' Guild (Gauntlets, Gorget, Pain Killer, Poleyns, Shield Padding, Shoulder Pads, Slayer Weapon Treatment), Rangers' Guild (Aim Attachment, Barbed Arrows/Bolts, Compass, Skinning Knives, Taxidermist tools, Wild game traps), Wizards' Guild staffs, Dark Guild's Nightstalker Armour, and the Inner Sanctum's Religious Relics and Incense",
        "Nightstalker Armour (Dark Guild) added to the hero armour picker with its Dark as the Night and High Quality (DUR 8) rules",
        "Fighters' Guild Bounty Hunt: rolls 5 targets from the full enemy table, tracks which have been claimed for 250c each",
        "Rangers' Guild Taxidermist: sells a Trophy for 1d20 + the settlement's buyer modifier, one attempt per settlement per cycle",
        "Alchemists' Guild: buy a Part or Ingredient for 15c (Availability Roll first), or buy a named potion at Weak/Standard/Supreme strength",
        "Inner Sanctum Crusades: rolls the target enemy type, tracks trophies turned in for 25c each",
        "Inner Sanctum Blessing: bless a piece of armour (+1 Durability, 25c) or a weapon (+2 DMG vs Undead/Demons, 75c)",
        "Settlements tab now shows a single tappable \"Guilds available here\" card pointing to the new tab, instead of listing guild content inline",
      ],
      "Changed": [
        "Wizards' Guild (Learn a Spell, Charge a Magic Item, Identify a Magic Item) and the Inner Sanctum (Learn a Prayer) moved from the Settlements tab into the new Guilds tab, alongside the other four guilds",
        "\"Between Quests\" on the Settlements tab now also resets Guild Skill Training, Bounty Hunt, Crusade, and Taxidermist once-per-cycle limits",
      ],
    },
  },
  {
    version: "1.33.0",
    date: "2026-08-13",
    sections: {
      "Added": [
        "Legendary Items: new Compendium category with all 31 items (p201-211) — unique, unsellable, never run out of magic or break, must be identified before use. 11 items with flat, unconditional bonuses (Amulet of Haamile, Gauntlets of Hraefnir, Belt of Copperbane, Crown of Resolve, Cloak of Elsewhyr, Priestly Dice, Boots of Energy, Ring of Awareness, Trap-sensing Ring, Armour of the Father) auto-apply when attached to a hero, same mechanism as Talents, reversible on removal. The rest stay as full reference text since their effects need live combat judgement (Sword of Lightning's chain lightning, Golden Khopesh's Undead-targeting override, Vampire's Brooch's per-hit roll, etc.)",
        "Profession equipment limits: armour Tier caps (Rogue/Alchemist/Thief/Barbarian/Ranger at Tier 3, Wizard at Tier 2) and Thief's Class 2 weapon cap now show as warnings directly on the Hero tab's weapon/armour editor, matching the existing STR-requirement warning style",
        "Apply Starting Equipment: new panel on the Hero tab, shown once a profession is picked. Auto-equips each profession's confirmed starting gear (weapon, armour, backpack items, backpack upgrade), with pickers for \"of choice\" items (weapon choice for Barbarian/Warrior/Warrior Priest, Rogue's Shortsword-or-Rapier, and a God + Ring/Amulet picker for the Warrior Priest's starting Religious Relic)",
        "Table of Relics (p194): the Warrior Priest's starting relic now applies its real effect — Charus +1 Energy, Iphy +5 RES, Rhidnir +1 Luck, Ohlnir +5 CS, Ramos +5 STR, Metheia +1d3 healing (reference-only, since it modifies a future roll rather than a flat stat) — plus a note on the 2-relic cap (3 with the Reliquary talent)",
      ],
    },
  },
  {
    version: "1.32.2",
    date: "2026-08-13",
    sections: {
      "Fixed": [
        "Wizards' Guild box header read \"Wizards' Guild — Learn a Spell\", crowding out the fact that Charge and Identify live there too — now just \"Wizards' Guild\", with \"Learn a Spell\" as its own subheading matching the other two",
      ],
    },
  },
  {
    version: "1.32.1",
    date: "2026-08-13",
    sections: {
      "Fixed": [
        "Identify a Magic Item required typing the item's name manually — it's now a dropdown of everything the hero actually owns (weapon, worn armour, and every backpack item), matching how Enchant Objects and Charge a Magic Item already work",
      ],
      "Added": [
        "Search Furniture (Actions tab, next to Search a Tile): full 35-type table from Appendix V (p191-192) — pick the furniture, roll 1d10, get the correct result with any dice in it (coins, rations, etc.) auto-rolled and totalled. AP cost and skill check for this action aren't confirmed from the rulebook yet, so none is applied — treat it as a free action until that page turns up",
      ],
    },
  },
  {
    version: "1.32.0",
    date: "2026-08-13",
    sections: {
      "Added": [
        "Mithril: a \"Make Mithril\" toggle on a hero's weapon and each armour piece, applying the confirmed rulebook bonus (+1 DMG/-2 ENC for weapons, +1 DEF/-1 ENC for armour and shields), fully reversible",
        "Magic Workshop (Settlements tab, any settlement with an Inn): Enchant Objects (pick a hero who knows Enchant Item, a full-durability unenchanted item, roll Arcane Arts vs Casting Value 25 — success enchants the item to 8/8 Durability, failure destroys it) and Create a Scroll (pick a hero who knows Magic Scribbles, a known spell to inscribe, roll vs CV 20 — success adds a real Scroll item to the backpack, failure destroys the parchment), both correctly limited to one enchant OR two scroll attempts between quests",
        "Charge a Magic Item and Identify a Magic Item added to the Wizards' Guild box — Charge deterministically restores a dissipated (but not broken) magic item's Durability max back to 8, Identify rolls Arcane Arts against any named item",
        "A \"Dissipate\" button appears on enchanted weapons/armour in the Hero tab, for when 00 is rolled in combat — drops the item's Durability max back to 6 and clears its enchantment (recharge later at the Wizards' Guild)",
      ],
      "Changed": [
        "The \"Returned From Dungeon\" reset (Estate room uses) moved out of the Silver-City-only Estate panel into a new \"Between Quests\" panel visible on the Settlements tab everywhere, since Magic Workshop's once-per-cycle limits needed the same reset and shouldn't require owning an estate",
      ],
    },
  },
  {
    version: "1.31.4",
    date: "2026-08-13",
    sections: {
      "Added": [
        "A short supportive note above the Buy Me a Coffee button in the footer: \"Enjoying the app? A coffee keeps development going ☕\"",
      ],
    },
  },
  {
    version: "1.31.3",
    date: "2026-08-13",
    sections: {
      "Fixed": [
        "Once used, Garden gathering and Archery Range/Training Grounds training locked permanently — there was no way to reset them for a new dungeon cycle. A \"Returned From Dungeon\" button now always shows in the estate panel, which activates any commissioned room and resets Garden/Training Grounds/Archery Range/Alchemist Lab usage for the next visit",
      ],
    },
  },
  {
    version: "1.31.2",
    date: "2026-08-13",
    sections: {
      "Fixed": [
        "Manor training (Archery Range / Training Grounds) gave no feedback when clicked — the result was being calculated but never displayed",
        "Commissioning a Manor room now shows a clear \"Pending\" badge and disables further commissions until it's activated, instead of looking like nothing happened",
        "Alberta's Magnificent Animals purchases (Horse, Camel, Saddlebags, Mule, Wagon) gave no feedback on success or when the party couldn't afford it — the message was being set but rendered in the wrong panel",
      ],
      "Added": [
        "Estate Storage and the Travel tab's Mule/Wagon/Saddlebags storage now have an \"Add from table…\" catalog picker (Weapons, Armour & Shields, Alchemy, Consumables, Jewellery, Light, Misc, Tools), matching the picker already on a hero's backpack, alongside the existing manual item entry",
      ],
    },
  },
  {
    version: "1.31.1",
    date: "2026-08-12",
    sections: {
      "Removed": [
        "Sacred Grove removed from Furnishing the Manor — confirmed as Druid-specific content (where Druids level up), tied to The False Prophet expansion, which isn't in scope for this app",
      ],
    },
  },
  {
    version: "1.31.0",
    date: "2026-08-12",
    sections: {
      "Added": [
        "Buying an Estate (Settlements tab, Silver City only): 4000c one-time purchase, waives the inn fee automatically whenever the party stays overnight in Silver City",
        "Furnishing the Manor: all 9 confirmed rooms from p159 (Alchemist Lab, Archery Range, Training Grounds, Wizard's Study, Shrine, Smithy, Crops/Hen House/Pigsty, Garden, Kennel), correctly limited to one commission between quests that isn't usable until after the next dungeon trip. Archery Range/Training Grounds, Shrine, Smithy, Crops, and Garden each get a working resolver (per-hero +1d2 training, free Pray with 1-4 on 1d6, party-wide +1d3 Durability repair, 1d8+days rations, 1d6+2 ingredient gather straight into the Alchemist's components) — Alchemist Lab/Wizard's Study/Kennel show their effect text but hook into other tabs or the Companions' Expansion instead of a dedicated resolver. A 10th room, \"Sacred Grove\", is included but flagged unconfirmed pending rulebook verification",
        "Estate Storage: an unlimited item list at the estate, same editable ENC/Value/Durability fields as a hero's backpack",
        "Ghostly Events: the full 1d10 trigger roll (7-10 on the night before departure) plus the 10-entry Ghostly Events Table, 8 of 10 entries fully mechanized (Luck/CS/RS/Energy buffs and penalties, wizard miscast range, and — reusing the same Curse Table as the Fortune Teller — a full multi-hero Curse resolution). Family Heirlooms and Hidden Treasure correctly surface as physical card-draw/dungeon-setup prompts rather than fabricated rolls",
        "Side Quest: The Grieving Mother — full state tracker (triggered/succeeded/failed) with the quest's read-aloud text, a reward flow that adds the actual magical Longsword (+2 DMG) to a chosen hero's backpack, and automatic queuing of the forced Ghostly Event #8 on failure",
        "Alberta's Magnificent Animals (Settlements tab, Whiteport only): purchase Horses, Camels, Saddlebags, Mules, and Wagons at their real costs, tracked as party-owned counts",
        "Storage panel on the Travel tab: Mule (100 ENC), Wagon (500 ENC), and Saddlebags (10 ENC each) capacity, scaled by how many are owned, using the same item-list component as Estate Storage",
      ],
    },
  },
  {
    version: "1.30.2",
    date: "2026-08-12",
    sections: {
      "Added": [
        "New \"Travel\" tab covering overland movement between settlements/dungeons (rulebook \"Travelling and Skirmishes\" chapter): a Movement calculator (Walking/Wagon/Mule = 3 MP vs all Horses/Camels = 6 MP, tap to log Road/Off-road/Desert hexes with running MP totals and undo), a Daily Event Roll (1d12, correct trigger range and event card type per terrain), Rations & Foraging (1 ration/day feeds the whole party, 2/day in the Ancient Lands where Foraging isn't possible; Foraging is a single roll for the whole party with +10 in trees/-10 on a road, auto-applies the hunger penalty — every hero's CON halved and Party Morale -4, non-cumulative, lifted automatically next time the party eats — on a failed roll), and a Daily Rest resolver (+1d6 HP and Energy regen per hero, full Energy with a Bed Roll)",
        "Skirmishes note added to the Travel tab pointing at the Combat tab for resolution, with a reference table for which of the four outdoor tile types to use",
      ],
    },
  },
  {
    version: "1.30.1",
    date: "2026-08-12",
    sections: {
      "Added": [
        "Header now shows a small badge stating which rulebook and QRS versions the app is built against (Core Rulebook v2.4 · QRS v2.24)",
      ],
    },
  },
  {
    version: "1.30.0",
    date: "2026-08-11",
    sections: {
      "Added": [
        "New \"Actions\" tab, split out from Dice, covering hazard/obstacle mechanics: Door / Chest Opener, Portcullis, Cobweb Covered Opening, Levers, and Search a Tile (Dice now holds just the Quick Dice roller and Loot Roller)",
        "Portcullis tool — pick a hero, optionally add a helper in the other adjacent slot and up to 2 heroes chiming in from the far side (each +10 STR), then attempt to lift (1 AP, retriable, +1 Threat on a failed attempt)",
        "Cobweb Covered Opening tool — 2 AP, automatically succeeds, raises Threat +1, and rolls 1d10 for Giant Spiders on a 9-10",
        "Levers tool — prepares a deck of 1 black + 1d4+1 red cards, draws and rolls on the correct table when a lever is pulled (1 AP, blocked while known enemies are on the table), tracks remaining deck size, and lets clues discard a red card without rolling. Numeric outcomes (Threat, Party Morale/Sanity, a party-held dungeon Luck Point, pit-trap damage) auto-apply; spatial outcomes (portcullis drop, Wandering Monster, Treasure Chamber, iron cage ambush) are shown in full for manual resolution at the table",
      ],
    },
  },
  {
    version: "1.29.9",
    date: "2026-08-11",
    sections: {
      "Added": [
        "New \"Wizards' Guild\" and \"Inner Sanctum\" boxes appear on the Settlements tab when viewing Silver City, for actually learning a spell or prayer — pick a hero, pick from spells/prayers at or below their level, cost auto-calculates at 200c + 100c per level above 1 (spells have a \"Found via Grimoire\" free option), and confirming deducts the coins and adds it straight to the hero's sheet",
      ],
      "Changed": [
        "Spells and Prayers can no longer be attached to a hero from the Compendium tab — that was a free, uncosted shortcut with no level or location check. Compendium is now reference-only for these two categories; learning happens through the new Wizards' Guild / Inner Sanctum boxes instead. Talents, Perks, and Special Rules are unaffected. Anything already attached via the old Compendium button stays on the hero sheet untouched",
        "\"Learn a Spell\" and \"Learn a Prayer\" removed from the general Activities/Resolve-an-Activity lists, since they now have their own dedicated boxes",
      ],
    },
  },
  {
    version: "1.29.8",
    date: "2026-08-11",
    sections: {
      "Fixed": [
        "Learn a Prayer was available in any settlement with a Temple — the book specifies this is only done in the Inner Sanctum in Silver City, so it's now gated to that specific service instead of the general Temples category",
      ],
    },
  },
  {
    version: "1.29.7",
    date: "2026-08-10",
    sections: {
      "Fixed": [
        "Award Experience (Party tab) gave no confirmation when clicked unless a hero happened to level up from it — a normal award now always shows a toast confirming the XP was given, alongside any level-up toasts",
      ],
      "Changed": [
        "Every button now has a hover highlight and a visible press-darken effect on desktop (mouse clicks), independent of the touch-only press animation already used on most buttons",
        "On larger screens (1024px+ and 1536px+), the whole app now scales up — text, icons, spacing, and borders all grow together — for easier reading at desktop viewing distances, while the mobile-first layout itself is unchanged",
      ],
    },
  },
  {
    version: "1.29.6",
    date: "2026-08-10",
    sections: {
      "Changed": [
        "Hero card: the XP-to-next-level note now sits inline next to the XP field (e.g. \"4500 / 5000 (500 to go)\") instead of a small caption underneath",
        "The Level Up button is now clearly labelled as a manual override (\"⚙ Override: Level Up\"), styled as a secondary action, with an updated tooltip explaining that levelling up already happens automatically once XP crosses the threshold",
      ],
    },
  },
  {
    version: "1.29.5",
    date: "2026-08-09",
    sections: {
      "Changed": [
        "Cast a Spell's hero picker now only lists heroes who actually know a spell or have a magic profession (Wizard, Druid) — non-casters no longer clutter the dropdown",
      ],
    },
  },
  {
    version: "1.29.4",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "The Increased Power note (\"add +N to this spell's DMG/Healing\") was showing up on a failed cast, even though nothing actually happened for it to boost — now only appears when the spell's effect actually executes",
        "Touch spells (which can be Restoration or Destruction school too, like Healing Hand) were never showing the Increased Power note at all, on success or failure, because that field was missing from both of Touch's own result paths",
      ],
    },
  },
  {
    version: "1.29.3",
    date: "2026-08-09",
    sections: {
      "Fixed": [
        "Corrected Spell Casting against the actual rules text (the flowchart alone had led me slightly astray in a few places): Touch Spells now correctly need BOTH a CS+20 touch roll and the standard Arcane Arts roll, not just the touch roll — a missed touch costs half Mana and skips the Arcane Arts roll entirely",
        "Dispel is now only offered for Ranged spells — the book is explicit that Touch and Close Combat spells can't be dispelled at all",
        "The dispel target is now the enemy's RS/2 (rounded down), not their raw RS — matches 'Ranged Skills/2 (RDD) for enemy casters'",
        "A dispelled cast now costs the full intended Mana instead of half — 'a hero whose spell is cancelled must still expend the intended mana'",
        "Miscast now costs half Mana for every spell type, including Incantations — 'the Mana is used as though the spell had failed', with no special exception",
        "Perfect Cast's Mana refund (a natural 01-05) is no longer clamped to the hero's max Mana, since the book explicitly allows it to temporarily exceed the cap",
      ],
      "Added": [
        "The actual Miscast Table (1d10) and its Demon sub-table (1d4, for a roll of 9) are now in the app — a miscast rolls on it automatically and shows the real result instead of just pointing at page 63",
        "Increased Power is now properly gated to Restoration/Destruction school spells only, capped at the lower of 5 or the caster's level, and adds its +2 Mana per level to the cast's cost",
        "Two new restrictions: an adjacent enemy blocks everything except Touch Spells, and Incantations can only be cast while in a settlement",
      ],
    },
  },
  {
    version: "1.29.2",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Cast a Spell now runs the full Hero Spell Casting flowchart instead of just deducting Mana — spell type (Ranged/Touch/Incantation) is read straight off the spell's own data, the right skill check formula applies for each (AA-CV for Ranged/Incantation, CS+20 for Touch), Focus AP adds +10 to Arcane Arts, an enemy caster in range can attempt to dispel a successful cast, and a roll above the Miscast Threshold flags a miscast",
        "The Miscast Threshold (base 95, -5 if injured, -5 per AP of Focus, -1 per point of increased power) is calculated automatically and shown live as you set those options",
        "Mana handling follows the book's actual outcomes: full cost on a normal success, a full refund on a lucky 01-05 roll, half cost (rounded down) lost on a failed or dispelled cast, and no Mana lost at all on an incantation-specific miscast or plain failure",
      ],
      "Notes": [
        "\"Caster injured\" and \"increased power\" don't have a documented definition/cost anywhere available, so both are self-reported toggles rather than auto-calculated",
        "A miscast currently just flags itself and points at the Miscast Table (p63) — the table's actual results aren't in the app yet, so nothing auto-applies from it",
        "This is a best-faith reading of a dense, hand-drawn flowchart with a lot of crossing branches — worth a sanity check against the book if a specific outcome looks off in play",
      ],
    },
  },
  {
    version: "1.29.1",
    date: "2026-08-09",
    sections: {
      "Added": [
        "Random (no-recipe) potion mixing — Mix a Potion now has a 'No Recipe (Random)' mode alongside the existing recipe-based one. No +10 bonus, but a success rolls the real Potions Table for that strength (a single 1d12 table for Weak/Supreme, and Standard's own 1d3-then-1d10 table across three sub-lists) instead of guaranteeing a specific result",
        "A successful random mix gets written down as a new recipe automatically, exactly like the book's flowchart describes — so the next time you find the same components, you can just use the recipe instead of rolling blind again",
      ],
    },
  },
  {
    version: "1.29.0",
    date: "2026-08-09",
    sections: {
      "Added": [
        "New Alchemy tab with three sections: Recipe Book (the 6 Common Recipes every alchemist knows automatically, plus each hero's own learned recipes — 'Mix This' jumps straight to mixing), Mix a Potion (shows exactly what's missing from your inventory, applies the recipe/exquisite roll bonuses automatically, and rolls it), and Gather & Harvest (the overland-travel ingredient search by habitat, and post-battle part harvesting from up to 3 enemies)",
        "Full Monster Parts table (80+ enemies) and the habitat-based Ingredients table power Harvest Parts and Gather Ingredients respectively — both correctly apply the Exquisite bonus when the Alchemy roll itself lands 01-10, not the follow-up table rolls",
        "Learning a custom recipe needs no roll — just name it, pick a strength, and fill the component slots (validated for the right count, uniqueness, and at least one Ingredient + one Part)",
        "Mixing a potion applies the full rule set: +10 for following a known recipe, +10 more if any component used is Exquisite (flat, regardless of how many), and a failed mix loses the components but keeps the Bottle",
        "The False Prophet Expansion (Knight, Druid, Duckfolk, Half-Ogre) is now grouped under its own header in the Species/Profession pickers and Reference tab, separate from the core game's options",
      ],
      "Notes": [
        "Knight and Druid are selectable but still have no Improvement Point cost data, so IP spending won't work correctly for them until their starting stats are added",
        "Random (no-recipe) mixing isn't built yet — every mix currently goes through a known recipe",
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
      <p className="text-xs text-center" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
        Enjoying the app? A coffee keeps development going ☕
      </p>
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

// Reusable ENC-tracked item list — used for Estate storage (no cap) and Mule/Wagon/Saddlebags (capped).
function StorageBox({ items, onChange, cap }) {
  const totalEnc = items.reduce((s, i) => s + (Number(i.enc) || 0), 0);
  const addItem = () => onChange([...items, { id: uid(), name: "", value: "", enc: "", dur: "" }]);
  const updateItem = (id, patch) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) => onChange(items.filter((it) => it.id !== id));
  const addFromCatalog = (name) => {
    const wpn = WEAPONS.find((x) => x.name === name);
    if (wpn) { onChange([...items, { id: uid(), name: wpn.name, value: wpn.cost, enc: wpn.enc, dur: "6/6" }]); return; }
    const arm = ARMOUR_AND_SHIELDS.find((x) => x.name === name);
    if (arm) { onChange([...items, { id: uid(), name: arm.name, value: arm.cost, enc: arm.enc, dur: "6/6" }]); return; }
    const gen = GENERAL_EQUIPMENT.find((x) => x.name === name);
    if (gen) onChange([...items, { id: uid(), name: gen.name, value: gen.cost, enc: gen.enc, dur: gen.dur }]);
  };

  return (
    <div>
      <select
        value=""
        onChange={(e) => e.target.value && addFromCatalog(e.target.value)}
        className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
        style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}
      >
        <option value="">Add from table…</option>
        <optgroup label="Weapons">
          {WEAPONS.map((w) => <option key={w.name} value={w.name}>{w.name} — {w.cost}c</option>)}
        </optgroup>
        <optgroup label="Armour & Shields">
          {ARMOUR_AND_SHIELDS.map((a) => <option key={a.name} value={a.name}>{a.name} — {a.cost}c</option>)}
        </optgroup>
        {["Alchemy", "Consumables", "Jewellery", "Light", "Misc", "Tools"].map((cat) => (
          <optgroup key={cat} label={cat}>
            {GENERAL_EQUIPMENT.filter((i) => i.category === cat).map((i) => <option key={i.name} value={i.name}>{i.name} — {i.cost}c</option>)}
          </optgroup>
        ))}
      </select>
      {cap != null && (
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs font-semibold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>
            {totalEnc} / {cap} ENC
          </span>
          {totalEnc > cap && <span className="text-[10px] font-semibold" style={{ color: palette.crimson }}>Overloaded</span>}
        </div>
      )}
      <div className="space-y-1.5 mb-2">
        {items.map((item) => (
          <div key={item.id} className="rounded px-2 py-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <input
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder="Item name"
                className="flex-1 min-w-0 text-sm font-bold rounded px-2 py-1"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Cinzel, serif", color: palette.ink }}
              />
              <button onClick={() => removeItem(item.id)} className="w-6 h-6 shrink-0 flex items-center justify-center" style={{ color: palette.crimson }}>
                <Trash2 size={13} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                Val
                <input value={item.value} onChange={(e) => updateItem(item.id, { value: e.target.value })} className="w-12 rounded px-1 py-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
              </label>
              <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                ENC
                <input value={item.enc} onChange={(e) => updateItem(item.id, { enc: e.target.value })} className="w-10 rounded px-1 py-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
              </label>
              <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                Dur
                <input value={item.dur} onChange={(e) => updateItem(item.id, { dur: e.target.value })} className="w-12 rounded px-1 py-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
              </label>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addItem}
        className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded font-semibold"
        style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
      >
        <Plus size={13} /> Add Item
      </button>
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
    alchemyComponents: h.alchemyComponents || [],
    alchemyRecipes: h.alchemyRecipes || [],
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

// Starting Equipment per profession (Creating Your Character, p31-38). weaponOptions is
// either a fixed list to choose from, or "any" for a free pick from the full Weapons table.
// manualNote covers anything not automatable here (needs the Alchemy tab, a relic table
// I don't have data for, etc).
const STARTING_EQUIPMENT = {
  Alchemist: {
    weaponOptions: ["Shortsword"],
    armour: null,
    backpackItems: [{ name: "Alchemist Tool", enc: 5, value: 200 }, { name: "Alchemist Belt", enc: 0, value: 300 }],
    manualNote: "Also gets: 3 potions of choice (Standard strength), a bag with 3 random ingredients + 3 freely chosen parts, and 1 freely chosen recipe for a Weak Potion — add these via the Alchemy tab.",
  },
  Barbarian: { weaponOptions: "any", armour: null, backpackItems: [], manualNote: "" },
  Ranger: {
    weaponOptions: ["Longbow"],
    armour: null,
    backpackItems: [{ name: "Arrows x10", enc: 2 }],
    manualNote: "",
  },
  Rogue: {
    weaponOptions: ["Shortsword", "Rapier"],
    armour: "Padded Jacket",
    backpackItems: [{ name: "Lock Picks x10", enc: 2 }],
    backpackUpgrade: "Medium",
    manualNote: "",
  },
  Thief: {
    weaponOptions: ["Dagger"],
    armour: null,
    backpackItems: [{ name: "Rope", enc: 2, value: 50 }, { name: "Lock Picks x10", enc: 2 }],
    manualNote: "",
  },
  Warrior: { weaponOptions: "any", armour: "Leather Jacket", backpackItems: [], manualNote: "" },
  "Warrior Priest": {
    weaponOptions: "any",
    armour: null,
    backpackItems: [],
    relicChoice: true,
    manualNote: "",
  },
  Wizard: { weaponOptions: ["Staff"], armour: null, backpackItems: [], manualNote: "" },
};

function HeroCard({ hero, update, remove, addLog, pushToast, party, setParty }) {
  const [sanityEvent, setSanityEvent] = useState(SANITY_EVENTS[0].label);
  const [pendingCondition, setPendingCondition] = useState(null);
  const [hateEnemyInput, setHateEnemyInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch) => update({ ...hero, ...patch });
  const [startWeaponChoice, setStartWeaponChoice] = useState("");
  const [startRelicGod, setStartRelicGod] = useState("");
  const [startRelicType, setStartRelicType] = useState("Ring");
  const [startEquipResult, setStartEquipResult] = useState(null);
  const startingCfg = STARTING_EQUIPMENT[hero.profession];
  const applyStartingEquipment = () => {
    if (!startingCfg) return;
    const weaponName = startingCfg.weaponOptions === "any" ? startWeaponChoice : (Array.isArray(startingCfg.weaponOptions) && startingCfg.weaponOptions.length === 1 ? startingCfg.weaponOptions[0] : startWeaponChoice);
    if ((startingCfg.weaponOptions === "any" || (Array.isArray(startingCfg.weaponOptions) && startingCfg.weaponOptions.length > 1)) && !weaponName) {
      setStartEquipResult({ ok: false, line: "Choose a weapon first." });
      return;
    }
    if (startingCfg.relicChoice && !startRelicGod) {
      setStartEquipResult({ ok: false, line: "Choose a god for the Religious Relic first." });
      return;
    }
    let patch = {};
    const lines = [];
    if (weaponName) {
      const w = WEAPONS.find((x) => x.name === weaponName);
      if (w) {
        patch.weapon = { name: w.name, dmg: w.dmg, enc: w.enc, dur: { cur: 6, max: 6 } };
        lines.push(w.name);
      }
    }
    if (startingCfg.armour) {
      const a = ARMOUR_AND_SHIELDS.find((x) => x.name === startingCfg.armour);
      if (a) {
        patch.armour = { ...hero.armour, [a.covers[0]]: { name: a.name, def: a.def, enc: a.enc, dur: { cur: 6, max: 6 } } };
        lines.push(a.name);
      }
    }
    const newBackpackItems = (startingCfg.backpackItems || []).map((it) => ({ id: uid(), name: it.name, value: it.value ?? "", enc: it.enc ?? "", dur: "" }));
    if (startingCfg.relicChoice) {
      const relicEffect = RELIC_EFFECTS[startRelicGod];
      newBackpackItems.push({ id: uid(), name: `Religious Relic of ${startRelicGod} (${startRelicType})`, value: "", enc: 0, dur: "" });
      if (relicEffect) {
        const relicPatch = applyEffectDelta(hero, relicEffect, 1);
        patch = { ...patch, ...relicPatch };
      }
      lines.push(`Religious Relic of ${startRelicGod} (${startRelicType}) — ${relicEffect ? relicEffect.label : ""}`);
    }
    patch.backpack = [...hero.backpack, ...newBackpackItems];
    lines.push(...newBackpackItems.filter((it) => !it.name.startsWith("Religious Relic")).map((it) => it.name));
    if (startingCfg.backpackUpgrade) {
      patch.backpackUpgrade = startingCfg.backpackUpgrade;
      lines.push(`${startingCfg.backpackUpgrade} Backpack`);
    }
    update({ ...hero, ...patch });
    const line = `Starting equipment applied: ${lines.join(", ")}.${startingCfg.manualNote ? ` ${startingCfg.manualNote}` : ""}`;
    setStartEquipResult({ ok: true, line });
    addLog(`${hero.name}: ${line}`);
  };


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
  const toggleWeaponMithril = () => {
    if (hero.weapon.mithril) {
      setWeapon({ mithril: false, dmg: hero.weapon.mithrilOrigDmg || hero.weapon.dmg, enc: hero.weapon.enc + 2, mithrilOrigDmg: "" });
    } else {
      setWeapon({ mithril: true, mithrilOrigDmg: hero.weapon.dmg, dmg: `${hero.weapon.dmg}+1`, enc: Math.max(0, hero.weapon.enc - 2) });
    }
  };
  const toggleArmourMithril = (loc) => {
    const piece = hero.armour[loc];
    if (piece.mithril) {
      setArmourPiece(loc, { mithril: false, def: piece.def - 1, enc: piece.enc + 1 });
    } else {
      setArmourPiece(loc, { mithril: true, def: piece.def + 1, enc: Math.max(0, piece.enc - 1) });
    }
  };
  const dissipateWeaponMagic = () => {
    setWeapon({ enchanted: false, dur: { cur: Math.min(hero.weapon.dur.cur, 6), max: 6 } });
  };
  const dissipateArmourMagic = (loc) => {
    const piece = hero.armour[loc];
    setArmourPiece(loc, { enchanted: false, dur: { cur: Math.min(piece.dur.cur, 6), max: 6 } });
  };
  const pickArmour = (loc, name) => {
    const a = ARMOUR_AND_SHIELDS.find((x) => x.name === name);
    if (!a) return;
    const maxDur = a.dur || 6;
    setArmourPiece(loc, { name: a.name, def: a.def, enc: a.enc, dur: { cur: maxDur, max: maxDur } });
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
  const weaponClassLimit = PROFESSION_WEAPON_CLASS_LIMIT[hero.profession];
  const weaponClassTooHeavy = weaponRef && weaponClassLimit ? weaponRef.class > weaponClassLimit : false;
  const armourTierLimit = PROFESSION_ARMOUR_TIER_LIMIT[hero.profession];

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
              <optgroup label="Core">
                {SPECIES_DATA.filter((s) => !s.expansion).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </optgroup>
              <optgroup label="The False Prophet Expansion">
                {SPECIES_DATA.filter((s) => s.expansion).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </optgroup>
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
              <optgroup label="Core">
                {PROFESSIONS.filter((p) => !p.expansion).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </optgroup>
              <optgroup label="The False Prophet Expansion">
                {PROFESSIONS.filter((p) => p.expansion).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </optgroup>
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
            <div className="flex items-center gap-1 text-xs flex-wrap" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
              XP
              <input
                type="number"
                value={hero.xp}
                onChange={(e) => setXP(Number(e.target.value) || 0)}
                className="w-14 rounded px-1"
                style={{ background: "#fff", border: `1px solid ${palette.line}` }}
              />
              {nextLevelEntry && (
                <span className="text-[10px]" style={{ fontFamily: "Crimson Pro, serif" }}>
                  {xpToNext > 0 ? `/ ${nextLevelEntry.xp} (${xpToNext} to go)` : `— level ${nextLevelEntry.level} ready`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={levelUp}
            className="text-[10px] px-2 py-0.5 rounded mt-1"
            style={{ background: "transparent", color: palette.inkSoft, border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            title="Manual override — forces a level regardless of XP (house rules, corrections). Grants +15 Improvement Points and the automatic HP/Luck/Energy gains for the new level. Levelling up normally happens automatically when XP crosses the threshold above."
          >
            ⚙ Override: Level Up
          </button>
          {hero.profession && (
            <p className="text-xs mt-1" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
              {PROFESSIONS.find((p) => p.name === hero.profession)?.desc}
            </p>
          )}
          {startingCfg && (
            <div className="mt-2 rounded p-2" style={{ background: "#00000008" }}>
              <p className="text-xs font-semibold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Starting Equipment</p>
              {(startingCfg.weaponOptions === "any" || (Array.isArray(startingCfg.weaponOptions) && startingCfg.weaponOptions.length > 1)) && (
                <select
                  value={startWeaponChoice}
                  onChange={(e) => setStartWeaponChoice(e.target.value)}
                  className="w-full text-xs rounded px-2 py-1 mb-1.5"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  <option value="">Choose starting weapon…</option>
                  {startingCfg.weaponOptions === "any"
                    ? WEAPONS.map((w) => <option key={w.name} value={w.name}>{w.name}</option>)
                    : startingCfg.weaponOptions.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              )}
              {startingCfg.relicChoice && (
                <>
                  <p className="text-[10px] mb-1" style={{ color: palette.inkSoft }}>
                    Only 2 relics may be worn at once unless the Reliquary talent is known. Counts as a magic item.
                  </p>
                  <div className="flex gap-1.5 mb-1.5">
                    <select
                      value={startRelicGod}
                      onChange={(e) => setStartRelicGod(e.target.value)}
                      className="flex-1 text-xs rounded px-2 py-1"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                    >
                      <option value="">Choose a god…</option>
                      {Object.keys(RELIC_EFFECTS).map((g) => <option key={g} value={g}>{g} ({RELIC_EFFECTS[g].label})</option>)}
                    </select>
                    <select
                      value={startRelicType}
                      onChange={(e) => setStartRelicType(e.target.value)}
                      className="text-xs rounded px-2 py-1"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                    >
                      <option value="Ring">Ring</option>
                      <option value="Amulet">Amulet</option>
                    </select>
                  </div>
                </>
              )}
              <button onClick={applyStartingEquipment} className="w-full text-xs px-2 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
                Apply Starting Equipment
              </button>
              {startEquipResult && (
                <p className="text-[10px] mt-1.5" style={{ color: startEquipResult.ok ? palette.forestDark : palette.crimson, fontWeight: 600 }}>
                  {startEquipResult.line}
                </p>
              )}
            </div>
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

          {hero.hp.cur <= 0 && (
            <div className="mt-1 mb-3 p-3 rounded" style={{ background: palette.crimsonDark, border: `1px solid ${palette.crimson}` }}>
              <p className="text-sm font-bold mb-1" style={{ color: palette.parchment, fontFamily: "Cinzel, serif" }}>
                {hero.name} is Bleeding Out
              </p>
              {!hero.bleedingOutRolled ? (
                <>
                  <p className="text-xs mb-2" style={{ color: "#F0D8D8", fontFamily: "Crimson Pro, serif" }}>
                    Reaching 0 HP always costs a permanent stat or HP reduction (1d4, randomised).
                  </p>
                  <button
                    onClick={() => {
                      const pool = [...STAT_KEYS, "hp"];
                      const stat = pool[rollDie(pool.length) - 1];
                      const amount = rollDie(4);
                      let patch = { bleedingOutRolled: true };
                      if (stat === "hp") {
                        patch.hp = { cur: hero.hp.cur, max: Math.max(1, hero.hp.max - amount) };
                      } else {
                        patch.stats = { ...hero.stats, [stat]: Math.max(0, hero.stats[stat] - amount) };
                      }
                      update({ ...hero, ...patch });
                      addLog && addLog(`${hero.name} reaches 0 HP and permanently loses ${amount} ${stat === "hp" ? "max HP" : stat}.`);
                    }}
                    className="px-3 py-1.5 rounded text-xs font-bold"
                    style={{ background: palette.crimson, color: palette.parchment, fontFamily: "Cinzel, serif" }}
                  >
                    Roll Permanent Loss (1d4)
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs mb-2" style={{ color: "#F0D8D8", fontFamily: "Crimson Pro, serif" }}>
                    To recover mid-battle: a Healing Spell, or a Healing Potion in a ready slot (own or an adjacent companion's). After battle, a standing companion may bandage them instead.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const v = prompt("HP to set on revival (from the heal roll):", "1");
                        const hp = Math.max(1, Math.min(hero.hp.max, Number(v) || 1));
                        update({ ...hero, bleedingOutRolled: false, hp: { ...hero.hp, cur: hp } });
                        addLog && addLog(`${hero.name} is revived with ${hp} HP.`);
                      }}
                      className="px-3 py-1.5 rounded text-xs font-bold"
                      style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
                    >
                      Revive
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`${hero.name} dies and is permanently removed from the party. This can't be undone. Continue?`)) return;
                        addLog && addLog(`${hero.name} could not be saved and has died. A new level 1 hero may be added at the next settlement.`);
                        remove();
                      }}
                      className="px-3 py-1.5 rounded text-xs font-bold"
                      style={{ background: palette.charcoal, color: palette.parchment, fontFamily: "Cinzel, serif", border: `1px solid ${palette.crimson}` }}
                    >
                      Hero Dies
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

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
              {hero.weapon.name && (
                <button
                  onClick={toggleWeaponMithril}
                  className="text-[10px] px-2 py-1 rounded font-semibold"
                  style={{ background: hero.weapon.mithril ? palette.crimsonDark : "#00000010", color: hero.weapon.mithril ? palette.parchment : palette.inkSoft }}
                  title="Only Dwarfs (or the Mithril Smith talent) know how to work Mithril. +1 DMG, -2 ENC."
                >
                  {hero.weapon.mithril ? "★ Mithril" : "Make Mithril"}
                </button>
              )}
              {hero.weapon.enchanted && (
                <button
                  onClick={dissipateWeaponMagic}
                  className="text-[10px] px-2 py-1 rounded font-semibold"
                  style={{ background: "#00000010", color: palette.crimson }}
                  title={hero.weapon.powerstone ? `Powerstone: ${hero.weapon.powerstone}. Tap if you rolled 00 attacking with this weapon — the magic dissipates permanently (unless recharged at the Wizards' Guild) and Durability max drops to 6.` : "Tap if you rolled 00 attacking with this weapon — the magic dissipates permanently (unless recharged at the Wizards' Guild) and Durability max drops to 6."}
                >
                  ✨ Dissipate{hero.weapon.powerstone ? ` (${hero.weapon.powerstone})` : ""}
                </button>
              )}
            </div>
            {weaponRef && (
              <div className="text-[10px] mt-1 rounded px-2 py-1" style={{ background: "#00000008", color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                Class {weaponRef.class}{weaponRef.special ? ` · ${weaponRef.special}` : ""} · {weaponRef.cost}c (avail {weaponRef.avail}){weaponRef.reload ? ` · Reload ${weaponRef.reload}` : ""}
                {strReq && (
                  <span style={{ color: strTooWeak ? palette.crimson : palette.inkSoft, fontWeight: strTooWeak ? 700 : 400 }}>
                    {" · "}Requires STR {strReq.oneH ? `${strReq.oneH} (1H) / ` : ""}{strReq.twoH} (2H){strTooWeak ? " — under this hero's STR" : ""}
                  </span>
                )}
                {weaponClassLimit && (
                  <span style={{ color: weaponClassTooHeavy ? palette.crimson : palette.inkSoft, fontWeight: weaponClassTooHeavy ? 700 : 400 }}>
                    {" · "}{hero.profession} limit: Class {weaponClassLimit}{weaponClassTooHeavy ? " — this weapon is too heavy" : ""}
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
                      {piece.name && (
                        <button
                          onClick={() => toggleArmourMithril(loc)}
                          className="text-[10px] px-2 py-1 rounded font-semibold"
                          style={{ background: piece.mithril ? palette.crimsonDark : "#00000010", color: piece.mithril ? palette.parchment : palette.inkSoft }}
                          title="Only Dwarfs (or the Mithril Smith talent) know how to work Mithril. +1 DEF, -1 ENC."
                        >
                          {piece.mithril ? "★ Mithril" : "Make Mithril"}
                        </button>
                      )}
                      {piece.enchanted && (
                        <button
                          onClick={() => dissipateArmourMagic(loc)}
                          className="text-[10px] px-2 py-1 rounded font-semibold"
                          style={{ background: "#00000010", color: palette.crimson }}
                          title="Tap if you rolled 00 with this piece — the magic dissipates permanently (unless recharged at the Wizards' Guild) and Durability max drops to 6."
                        >
                          ✨ Dissipate
                        </button>
                      )}
                    </div>
                    {ref && (
                      <div className="text-[10px] mt-0.5 rounded px-1.5 py-0.5" style={{ background: "#00000008", color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                        Tier {ref.tier || "—"}{ref.special ? ` · ${ref.special}` : ""} · {ref.cost}c (avail {ref.avail}){ref.covers.length > 1 ? ` · Also covers: ${ref.covers.filter((c) => c !== loc).join(", ")}` : ""}
                        {armourTierLimit && ref.tier > armourTierLimit && (
                          <span style={{ color: palette.crimson, fontWeight: 700 }}>
                            {" · "}{hero.profession} limit: Tier {armourTierLimit} — too heavy
                          </span>
                        )}
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

          {(hero.talents.length > 0 || hero.perks.length > 0 || hero.spells.length > 0 || hero.prayers.length > 0 || hero.specialRules.length > 0 || (hero.legendaryItems || []).length > 0) && (
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
              <AttachedItemList
                label="Legendary Items"
                names={hero.legendaryItems || []}
                dataset={LEGENDARY_ITEMS}
                color={palette.gold}
                groupKey={(i) => i.type}
                effects={LEGENDARY_ITEM_EFFECTS}
                onRemove={(t) => {
                  const reversePatch = legendaryItemEffectPatch(hero, t, -1);
                  set({ legendaryItems: (hero.legendaryItems || []).filter((x) => x !== t), ...reversePatch });
                  if (LEGENDARY_ITEM_EFFECTS[t]) addLog && addLog(`${hero.name}: removed Legendary Item "${t}" (${LEGENDARY_ITEM_EFFECTS[t].label} reversed).`);
                }}
              />
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

function SettlementTab({ party, setParty, heroes, updateHero, addLog, goToGuilds }) {
  const [eventResult, setEventResult] = useState(null);
  const [eventResolution, setEventResolution] = useState(null);
  const [scrollOffers, setScrollOffers] = useState(null);
  const [scrollBuyHero, setScrollBuyHero] = useState("");
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
  const logSettlementAP = (heroId, name, ap) => {
    if (!heroId) return;
    setParty((prev) => {
      const cur = prev.settlementAP?.[heroId] || { spent: 0, log: [] };
      return {
        ...prev,
        settlementAP: {
          ...(prev.settlementAP || {}),
          [heroId]: { spent: cur.spent + ap, log: [...cur.log, { name, ap }] },
        },
      };
    });
  };
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
  const [estateMsg, setEstateMsg] = useState(null);
  const [returnResult, setReturnResult] = useState(null);
  const [trainHero, setTrainHero] = useState("");
  const [trainResult, setTrainResult] = useState(null);
  const [smithyResult, setSmithyResult] = useState(null);
  const [cropsDays, setCropsDays] = useState(1);
  const [cropsResult, setCropsResult] = useState(null);
  const [gardenHero, setGardenHero] = useState("");
  const [gardenHabitat, setGardenHabitat] = useState("Plains");
  const [gardenResult, setGardenResult] = useState(null);
  const [shrinePrayHero, setShrinePrayHero] = useState("");
  const [shrineResult, setShrineResult] = useState(null);
  const [trainChoice, setTrainChoice] = useState("CS");
  const [ghostlyResult, setGhostlyResult] = useState(null);
  const [gmRewardHero, setGmRewardHero] = useState("");
  const [enchantHero, setEnchantHero] = useState("");
  const [enchantTarget, setEnchantTarget] = useState("");
  const [enchantResult, setEnchantResult] = useState(null);
  const [scrollHero, setScrollHero] = useState("");
  const [scrollSpell, setScrollSpell] = useState("");
  const [scrollResult, setScrollResult] = useState(null);
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

  const buyScroll = (spellName) => {
    if (!scrollBuyHero) return;
    const hero = heroes.find((h) => h.id === scrollBuyHero);
    if (!hero) return;
    if (party.coins < 100) { addLog(`Can't afford a Scroll of ${spellName}: 100c needed, party only has ${party.coins}c.`); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - 100 }));
    updateHero({ ...hero, backpack: [...hero.backpack, { id: uid(), name: `Scroll of ${spellName}`, value: "", enc: 1, dur: "1" }] });
    setScrollOffers((prev) => prev.map((o) => (o.spell === spellName ? { ...o, bought: true } : o)));
    addLog(`${hero.name} buys a Scroll of ${spellName} for 100c.`);
  };

  const rollEvent = () => {
    if (!settlement) return;
    setEventResolution(null);
    setScrollOffers(null);
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
      setScrollOffers(shuffled.map((s) => ({ spell: s.name, lvl: s.lvl, school: s.school, bought: false })));
      setEventResolution([`Offers: ${shuffled.map((s) => s.name).join(", ")} (100c each). Pick a hero below to buy one.`]);
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
    const freeStay = isSilverCity && party.estate?.owned;
    const canAfford = freeStay || party.innCostPerNight <= party.coins;
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
    if (freeStay) {
      summary.push(`Stayed at the Estate — no fee (the party owns the Key to the House).`);
      addLog(`Party stays at the Estate for free — no inn fee owed.`);
    } else if (canAfford && party.innCostPerNight > 0) {
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

  // ---------- Estate: Furnishing the Manor resolvers ----------
  const buyRoom = (room) => {
    if (party.estate.pendingRoom) { setEstateMsg({ ok: false, line: "Only one thing may be commissioned between quests — activate the pending room first (once you've returned from your next dungeon trip)." }); return; }
    if (party.coins < room.cost) { setEstateMsg({ ok: false, line: `Can't afford ${room.name}: ${room.cost}c needed, party only has ${party.coins}c.` }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - room.cost, estate: { ...prev.estate, pendingRoom: { name: room.name, cost: room.cost } } }));
    setEstateMsg({ ok: true, line: `${room.name} commissioned for ${room.cost}c. It'll be ready once you've left your next dungeon.` });
    addLog(`The party commissions a ${room.name} at the estate for ${room.cost}c.`);
  };
  const returnFromDungeon = () => {
    const pending = party.estate.pendingRoom;
    setParty((prev) => ({
      ...prev,
      estate: {
        ...prev.estate,
        rooms: pending ? [...prev.estate.rooms, pending.name] : prev.estate.rooms,
        pendingRoom: null,
        heroTraining: {},
        alchemistLabUsed: false,
        gardenUsed: false,
      },
      magicWorkshop: { enchantUsed: false, scrollAttempts: 0 },
      guilds: { training: {}, bountyHunt: { rolled: [], claimed: [] }, crusade: null, taxidermistAttempts: {} },
    }));
    const lines = [];
    if (pending) lines.push(`${pending.name} is now ready to use.`);
    lines.push("Archery Range/Training Grounds, Alchemist Lab, Garden, Enchant Objects, Create a Scroll, Guild Skill Training, Bounty Hunt, Crusade, and Taxidermist uses are reset for this new visit.");
    setEstateMsg({ ok: true, line: lines.join(" ") });
    setReturnResult(lines.join(" "));
    addLog(`Returned from a dungeon trip — room and downtime uses reset.${pending ? ` The ${pending.name} is now furnished and ready.` : ""}`);
  };

  const trainAtManor = (which) => {
    const hero = heroes.find((h) => h.id === trainHero);
    if (!hero) { setTrainResult({ ok: false, line: "Pick a hero first." }); return; }
    if ((party.estate.heroTraining || {})[hero.id]) { setTrainResult({ ok: false, line: `${hero.name} already trained between this visit and the next dungeon.` }); return; }
    const roll = rollDie(2);
    let patch, line;
    if (which === "Archery Range") {
      patch = addTempEffect(hero, `Manor training: Archery Range (+${roll} RS)`, { skill: "rs", amount: roll });
      line = `${hero.name} trains at the Archery Range: +${roll} RS.`;
    } else {
      // Training Grounds — choice of CS or Dodge
      patch = addTempEffect(hero, `Manor training: Training Grounds (+${roll} ${trainChoice})`, { skill: trainChoice === "Dodge" ? "dodge" : "cs", amount: roll });
      line = `${hero.name} trains at the Training Grounds: +${roll} ${trainChoice}.`;
    }
    updateHero({ ...hero, ...patch });
    setParty((prev) => ({ ...prev, estate: { ...prev.estate, heroTraining: { ...prev.estate.heroTraining, [hero.id]: which } } }));
    setTrainResult({ ok: true, line: `${line} (see Temporary Effects on ${hero.name}'s card).` });
    addLog(line);
  };

  const repairAtSmithy = () => {
    const roll = rollDie(3);
    heroes.forEach((h) => {
      const weapon = h.weapon?.dur ? { ...h.weapon, dur: { ...h.weapon.dur, cur: Math.min(h.weapon.dur.max, h.weapon.dur.cur + roll) } } : h.weapon;
      const armour = { ...h.armour };
      ["head", "arms", "torso", "legs"].forEach((slot) => {
        if (armour[slot]?.dur) armour[slot] = { ...armour[slot], dur: { ...armour[slot].dur, cur: Math.min(armour[slot].dur.max, armour[slot].dur.cur + roll) } };
      });
      updateHero({ ...h, weapon, armour });
    });
    const line = `Rolled ${roll} — every hero's weapon and armour repaired +${roll} Durability at the Smithy.`;
    setSmithyResult({ line });
    addLog(`Smithy: ${line}`);
  };

  const tendCrops = () => {
    const days = Math.max(1, Number(cropsDays) || 1);
    const roll = rollDie(8);
    const gained = roll + days;
    setParty((prev) => ({ ...prev, food: (prev.food || 0) + gained }));
    const line = `Rolled ${roll} + ${days} day(s) tending = ${gained} free rations.`;
    setCropsResult({ line });
    addLog(`Crops, Hen House, and Pigsty: ${line}`);
  };

  const gatherFromGarden = () => {
    if (party.estate.gardenUsed) { setGardenResult({ ok: false, line: "Already gathered from the garden between this visit and the next dungeon." }); return; }
    const hero = heroes.find((h) => h.id === gardenHero);
    if (!hero) { setGardenResult({ ok: false, line: "Pick the Alchemist first." }); return; }
    const qty = rollDie(6) + 2;
    let current = hero;
    const found = [];
    for (let i = 0; i < qty; i++) {
      const tableRoll = rollPercent();
      const entry = ingredientsTableLookup(gardenHabitat, tableRoll);
      if (entry) {
        found.push(entry.name);
        current = { ...current, alchemyComponents: addAlchemyComponent(current, entry.name, "Ingredient", 1, false) };
      }
    }
    updateHero(current);
    setParty((prev) => ({ ...prev, estate: { ...prev.estate, gardenUsed: true } }));
    const line = `${hero.name} gathers ${qty} ingredients from the garden: ${found.join(", ") || "nothing usable came up"}.`;
    setGardenResult({ ok: true, line });
    addLog(`Garden: ${line}`);
  };

  const prayAtShrine = () => {
    if (!party.estate.shrineGod) { setShrineResult({ ok: false, line: "Choose which god the shrine is dedicated to first." }); return; }
    const hero = heroes.find((h) => h.id === shrinePrayHero);
    if (!hero) { setShrineResult({ ok: false, line: "Pick a hero first." }); return; }
    const roll = rollDie(6);
    if (roll > 4) {
      setShrineResult({ ok: true, line: `Rolled ${roll} — ${party.estate.shrineGod} doesn't answer this time. (Free — no offering needed.)` });
      addLog(`${hero.name} prays at the estate shrine of ${party.estate.shrineGod}: no answer (rolled ${roll}).`);
      return;
    }
    const boon = TEMPLE_BOONS[party.estate.shrineGod];
    let effect, line = boon.label;
    if (boon.kind === "stat") effect = { stat: boon.stat, amount: boon.amount };
    else if (boon.kind === "hp") effect = { hp: boon.amount };
    else if (boon.kind === "luck") effect = { luck: boon.amount };
    else if (boon.kind === "energy") effect = { energy: boon.amount };
    else if (boon.kind === "choice") { effect = { skill: "cs", amount: boon.amount }; line = `+5 CS (Ohlnir's boon; use the Temple resolver for the RS option)`; }
    updateHero({ ...hero, ...addTempEffect(hero, `Estate Shrine (${party.estate.shrineGod}): ${line}`, effect) });
    setShrineResult({ ok: true, line: `Rolled ${roll} — ${party.estate.shrineGod} answers! ${line} applied — see Temporary Effects on ${hero.name}'s card.` });
    addLog(`${hero.name} prays at the estate shrine of ${party.estate.shrineGod}: success (${roll}). ${line}.`);
  };

  // ---------- Ghostly Events ----------
  const applyGhostlyEntry = (rollValue, prefix) => {
    let effectiveRoll = rollValue;
    let redirectNote = "";
    if (effectiveRoll === 6 && party.grievingMother === "succeeded") {
      effectiveRoll = 2;
      redirectNote = " (already succeeded the Grieving Mother — treated as #2 instead)";
    }
    const entry = GHOSTLY_EVENTS.find((e) => e.roll === effectiveRoll);
    const lines = [`${prefix}${rollValue} — #${effectiveRoll} ${entry.name}${redirectNote}.`, entry.text];

    if (effectiveRoll === 1) {
      heroes.forEach((h) => updateHero({ ...h, energy: { ...h.energy, cur: Math.max(0, h.energy.cur - 1) } }));
      lines.push("Draw 2 cards from the Wonderful Treasure deck. Every hero's Energy -1 (applied).");
    } else if (effectiveRoll === 2) {
      heroes.forEach((h) => updateHero({ ...h, ...addTempEffect(h, "Ghostly Event: Guardian Spirits (+1 Luck)", { luck: 1 }) }));
      lines.push("+1 Luck applied to every hero (see Temporary Effects).");
    } else if (effectiveRoll === 3) {
      lines.push("Remember to add the Side Quest Card and the extra R10 door when building the dungeon this trip.");
    } else if (effectiveRoll === 4) {
      heroes.forEach((h) => {
        const withCs = { ...h, ...addTempEffect(h, "Ghostly Event: Spiritual Guides (+5 CS)", { skill: "cs", amount: 5 }) };
        updateHero({ ...withCs, ...addTempEffect(withCs, "Ghostly Event: Spiritual Guides (+5 RS)", { skill: "rs", amount: 5 }) });
      });
      lines.push("+5 CS / +5 RS applied to every hero (see Temporary Effects).");
    } else if (effectiveRoll === 5) {
      const wizard = heroes.find((h) => h.profession === "Wizard");
      if (wizard) {
        updateHero({ ...wizard, ...addTempEffect(wizard, "Ghostly Event: Protector (miscasts only on 97-00)", null) });
        lines.push(`${wizard.name} only miscasts on 97-00 this quest (reminder added to Temporary Effects).`);
      } else {
        lines.push("No wizard in the party — no effect.");
      }
    } else if (effectiveRoll === 6) {
      setParty((prev) => ({ ...prev, grievingMother: "triggered" }));
      lines.push("The Grieving Mother side quest is now active — see the tracker below.");
    } else if (effectiveRoll === 7) {
      lines.push("If you're tracking Crops/Hen House/Pigsty rations separately from the rest, remove them now — this app pools all rations together, so apply manually.");
    } else if (effectiveRoll === 8) {
      heroes.forEach((h) => updateHero({ ...h, energy: { ...h.energy, cur: Math.max(0, h.energy.cur - 2) } }));
      lines.push("Every hero's Energy -2 (min 0), applied.");
    } else if (effectiveRoll === 9) {
      const victim = heroes[Math.floor(Math.random() * heroes.length)];
      if (!victim) { lines.push("No heroes to affect."); }
      else {
        const category = ["Weapon", "Armour", "Rations"][Math.floor(Math.random() * 3)];
        let itemLine = category;
        if (category === "Weapon" && victim.weapon?.name) itemLine = `Weapon: ${victim.weapon.name}`;
        else if (category === "Armour") {
          const worn = ["head", "arms", "torso", "legs"].map((slot) => victim.armour?.[slot]?.name).filter(Boolean);
          if (worn.length) itemLine = `Armour: ${worn[Math.floor(Math.random() * worn.length)]}`;
        } else if (category === "Rations") itemLine = "1 Ration";
        lines.push(`${victim.name} loses access to their ${itemLine} until after the next dungeon (remove it manually — this app doesn't track locked items yet).`);
      }
    } else if (effectiveRoll === 10) {
      heroes.forEach((h) => {
        const curseRoll = rollDie(10);
        const curse = CURSES_TABLE.find((c) => c.roll === curseRoll);
        let effect = curse.effect;
        let detail = curse.text;
        if (effect === "randomSkill") {
          const key = Object.keys(SKILL_LABELS)[Math.floor(Math.random() * Object.keys(SKILL_LABELS).length)];
          effect = { skill: key, amount: -5 };
          detail = `${SKILL_LABELS[key]} -5`;
        }
        updateHero({ ...h, ...addTempEffect(h, `Ghostly Event: The Curse (${detail})`, effect) });
        lines.push(`${h.name}: curse roll ${curseRoll} → ${detail} (applied — lasts until back in the city).`);
      });
    }

    setGhostlyResult({ lines });
    addLog(`Ghostly Events: ${lines.join(" ")}`);
  };

  const rollGhostlyEvents = () => {
    if (party.pendingGhostlyEvent) {
      const forced = party.pendingGhostlyEvent;
      setParty((prev) => ({ ...prev, pendingGhostlyEvent: null }));
      applyGhostlyEntry(forced, "Forced by a failed Grieving Mother attempt — automatically rolling #");
      return;
    }
    const triggerRoll = rollDie(10);
    if (triggerRoll < 7) {
      const line = `Rolled ${triggerRoll} on the trigger roll — no contact tonight.`;
      setGhostlyResult({ lines: [line] });
      addLog(`Ghostly Events: ${line}`);
      return;
    }
    const tableRoll = rollDie(10);
    applyGhostlyEntry(tableRoll, `Trigger roll ${triggerRoll} (contact!). Table roll `);
  };

  // ---------- The Grieving Mother ----------
  const markGrievingMotherFailed = () => {
    setParty((prev) => ({ ...prev, grievingMother: "failed", pendingGhostlyEvent: 8 }));
    addLog("The Grieving Mother side quest ends in failure — Ghostly Event #8 (Restless Night) will automatically trigger before the next quest.");
  };
  const markGrievingMotherSucceeded = () => {
    const hero = heroes.find((h) => h.id === gmRewardHero);
    if (!hero) return;
    updateHero({ ...hero, backpack: [...hero.backpack, { id: uid(), name: "Longsword (magical, +2 DMG)", value: "", enc: 10, dur: "6/6" }] });
    setParty((prev) => ({ ...prev, grievingMother: "succeeded" }));
    addLog(`${hero.name} buries the remains at the estate. The next morning, a magical Longsword (+2 DMG) is found on the dining table. The old lady is never seen again.`);
  };

  // ---------- Enchantments & Magic Items ----------
  const confirmEnchant = () => {
    const hero = heroes.find((h) => h.id === enchantHero);
    if (!hero) { setEnchantResult({ ok: false, line: "Pick a hero first." }); return; }
    if (!(hero.spells || []).includes("Enchant Item")) { setEnchantResult({ ok: false, line: `${hero.name} doesn't know the Enchant Item spell.` }); return; }
    if (party.magicWorkshop.enchantUsed) { setEnchantResult({ ok: false, line: "Already enchanted an object between this visit and the next dungeon." }); return; }
    const eligible = heroEquippedItems(hero).filter((i) => i.piece.dur && i.piece.dur.cur === i.piece.dur.max && !i.piece.enchanted);
    const item = eligible.find((i) => i.key === enchantTarget);
    if (!item) { setEnchantResult({ ok: false, line: "Pick a full-durability, unenchanted item." }); return; }
    const aa = Number(hero.skills.arcaneArts) || 0;
    const target = aa - 25;
    const roll = rollPercent();
    const success = roll <= target;
    setParty((prev) => ({ ...prev, magicWorkshop: { ...prev.magicWorkshop, enchantUsed: true } }));
    if (success) {
      const stoneRoll = rollDie(20);
      const stone = POWERSTONES.find((p) => p.roll === stoneRoll);
      updateHero(applyItemPatch(hero, item.key, { enchanted: true, wasEverEnchanted: true, dur: { cur: 8, max: 8 }, powerstone: stone.name }));
      const line = `Rolled ${roll} vs target ${target} — Success! ${item.piece.name} is now enchanted (Durability 8/8). Powerstone roll ${stoneRoll}: ${stone.name} (${stone.effect})`;
      setEnchantResult({ ok: true, line });
      addLog(`${hero.name} enchants ${item.piece.name} with ${stone.name}. ${stone.effect}`);
    } else {
      const blank = item.key === "weapon" ? { name: "", dmg: "", enc: 0, dur: { cur: 0, max: 0 }, mithril: false, enchanted: false } : { name: "", def: 0, enc: 0, dur: { cur: 0, max: 0 }, mithril: false, enchanted: false };
      updateHero(applyItemPatch(hero, item.key, blank));
      const line = `Rolled ${roll} vs target ${target} — Failed. The object is destroyed (the Powerstone can be reused).`;
      setEnchantResult({ ok: false, line });
      addLog(`${hero.name} attempts to enchant ${item.piece.name} — fails, item destroyed.`);
    }
  };

  const confirmScroll = () => {
    const hero = heroes.find((h) => h.id === scrollHero);
    if (!hero) { setScrollResult({ ok: false, line: "Pick a hero first." }); return; }
    if (!(hero.spells || []).includes("Magic Scribbles")) { setScrollResult({ ok: false, line: `${hero.name} doesn't know Magic Scribbles.` }); return; }
    if ((party.magicWorkshop.scrollAttempts || 0) >= 2) { setScrollResult({ ok: false, line: "Already made 2 scroll attempts between this visit and the next dungeon." }); return; }
    if (!scrollSpell) { setScrollResult({ ok: false, line: "Pick which spell to inscribe." }); return; }
    const aa = Number(hero.skills.arcaneArts) || 0;
    const target = aa - 20;
    const roll = rollPercent();
    const success = roll <= target;
    setParty((prev) => ({ ...prev, magicWorkshop: { ...prev.magicWorkshop, scrollAttempts: (prev.magicWorkshop.scrollAttempts || 0) + 1 } }));
    if (success) {
      updateHero({ ...hero, backpack: [...hero.backpack, { id: uid(), name: `Scroll of ${scrollSpell}`, value: "", enc: 1, dur: "1" }] });
      const line = `Rolled ${roll} vs target ${target} — Success! A Scroll of ${scrollSpell} is added to ${hero.name}'s backpack.`;
      setScrollResult({ ok: true, line });
      addLog(`${hero.name}: ${line}`);
    } else {
      const line = `Rolled ${roll} vs target ${target} — Failed. The parchment is destroyed.`;
      setScrollResult({ ok: false, line });
      addLog(`${hero.name}: ${line}`);
    }
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
                    {scrollOffers && (
                      <div className="mt-2 space-y-1.5">
                        <label className="text-xs block" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                          Buying hero
                          <select
                            value={scrollBuyHero}
                            onChange={(e) => setScrollBuyHero(e.target.value)}
                            className="w-full text-xs rounded px-2 py-1 mt-0.5"
                            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                          >
                            <option value="">Choose a hero…</option>
                            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                        </label>
                        {scrollOffers.map((o) => (
                          <div key={o.spell} className="flex items-center justify-between text-xs rounded px-2 py-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                            <span style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>{o.spell} (Lvl {o.lvl}, {o.school})</span>
                            <button
                              onClick={() => buyScroll(o.spell)}
                              disabled={o.bought || !scrollBuyHero}
                              className="text-[10px] px-2 py-1 rounded font-semibold"
                              style={{ background: o.bought ? "#00000015" : palette.crimsonDark, color: o.bought ? palette.inkSoft : palette.parchment, opacity: !scrollBuyHero && !o.bought ? 0.5 : 1 }}
                            >
                              {o.bought ? "Bought" : "Buy — 100c"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
        <SectionTitle icon={ClipboardList}>Between Quests</SectionTitle>
        <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          Tap after each dungeon trip to reset once-per-cycle downtime activities (Estate rooms, Enchant Objects, Create a Scroll).
        </p>
        <button onClick={returnFromDungeon} className="w-full text-xs px-2 py-2 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
          Returned From Dungeon
        </button>
        {returnResult && (
          <p className="text-[10px] mt-1.5 font-semibold" style={{ color: palette.forestDark, fontFamily: "Crimson Pro, serif" }}>
            {returnResult}
          </p>
        )}
      </Panel>

      {settlement && settlement.services.includes("Inn") && (
        <Panel className="mb-4">
          <SectionTitle icon={Sparkles}>Magic Workshop</SectionTitle>
          <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Enchant Objects and Create a Scroll — done at the Inn, can't be done while travelling. Only one object enchanted OR two scroll attempts allowed between quests.
          </p>

          <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Enchant Objects</p>
          {party.magicWorkshop.enchantUsed ? (
            <p className="text-[10px] mb-3" style={{ color: palette.inkSoft }}>Already used this cycle — reset via "Between Quests" above.</p>
          ) : (
            <>
              <select value={enchantHero} onChange={(e) => { setEnchantHero(e.target.value); setEnchantTarget(""); setEnchantResult(null); }} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                <option value="">Choose a hero who knows Enchant Item…</option>
                {heroes.filter((h) => (h.spells || []).includes("Enchant Item")).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {enchantHero && (() => {
                const hero = heroes.find((h) => h.id === enchantHero);
                const eligible = heroEquippedItems(hero).filter((i) => i.piece.dur && i.piece.dur.cur === i.piece.dur.max && !i.piece.enchanted);
                return (
                  <>
                    <select value={enchantTarget} onChange={(e) => setEnchantTarget(e.target.value)} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                      <option value="">Choose a full-durability item…</option>
                      {eligible.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
                    </select>
                    {eligible.length === 0 && <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>No eligible items — must be at full Durability and not already enchanted.</p>}
                    <button onClick={confirmEnchant} disabled={!enchantTarget} className="w-full text-[10px] px-2 py-1.5 rounded font-semibold mb-1.5" style={{ background: enchantTarget ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: enchantTarget ? 1 : 0.5 }}>
                      Attempt Enchantment
                    </button>
                  </>
                );
              })()}
              {enchantResult && <p className="text-[10px] mb-3 font-semibold" style={{ color: enchantResult.ok ? palette.forestDark : palette.crimson }}>{enchantResult.line}</p>}
            </>
          )}

          <div className="h-px my-3" style={{ background: palette.line }} />
          <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Create a Scroll</p>
          {(party.magicWorkshop.scrollAttempts || 0) >= 2 ? (
            <p className="text-[10px]" style={{ color: palette.inkSoft }}>2/2 attempts used this cycle — reset via "Between Quests" above.</p>
          ) : (
            <>
              <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>{party.magicWorkshop.scrollAttempts || 0}/2 attempts used this cycle.</p>
              <select value={scrollHero} onChange={(e) => { setScrollHero(e.target.value); setScrollSpell(""); setScrollResult(null); }} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                <option value="">Choose a hero who knows Magic Scribbles…</option>
                {heroes.filter((h) => (h.spells || []).includes("Magic Scribbles")).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {scrollHero && (() => {
                const hero = heroes.find((h) => h.id === scrollHero);
                return (
                  <select value={scrollSpell} onChange={(e) => setScrollSpell(e.target.value)} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                    <option value="">Choose a spell to inscribe…</option>
                    {(hero.spells || []).filter((s) => s !== "Magic Scribbles").map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                );
              })()}
              <button onClick={confirmScroll} disabled={!scrollSpell} className="w-full text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: scrollSpell ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: scrollSpell ? 1 : 0.5 }}>
                Attempt Scroll (1 day)
              </button>
              {scrollResult && <p className="text-[10px] mt-1.5 font-semibold" style={{ color: scrollResult.ok ? palette.forestDark : palette.crimson }}>{scrollResult.line}</p>}
            </>
          )}
        </Panel>
      )}

      {settlement && (settlement.services.includes("Guilds") || settlement.services.includes("Inner Sanctum")) && (
        <button
          onClick={goToGuilds}
          className="w-full flex items-center justify-between mb-4 rounded-lg p-3.5 text-left"
          style={{ background: palette.panel, border: `1px solid ${palette.goldSoft}` }}
        >
          <div className="flex items-center gap-2.5">
            <div className="rounded flex items-center justify-center" style={{ width: 32, height: 32, background: palette.crimson, color: palette.parchment }}>
              <Shield size={16} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Guilds available here</p>
              <p className="text-[10px]" style={{ color: palette.inkSoft }}>Training, shopping, bounty hunts &amp; more — Fighters', Rangers', Wizards', Alchemists', The Dark Guild, The Inner Sanctum</p>
            </div>
          </div>
          <span style={{ color: palette.gold, fontSize: 18 }}>›</span>
        </button>
      )}

      {isSilverCity && (
        <Panel className="mb-4">
          <SectionTitle icon={Landmark}>{party.estate?.owned ? "Your Estate" : "Buying an Estate"}</SectionTitle>

          {!party.estate?.owned ? (
            <>
              <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                A one-time purchase of the Key to the House. Once owned, the party can stay at the estate instead of paying the inn, and store unlimited excess equipment there.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>4000c</span>
                <button
                  onClick={() => {
                    if (party.coins < 4000) { setEstateMsg({ ok: false, line: `Can't afford it: 4000c needed, party only has ${party.coins}c.` }); return; }
                    setParty((prev) => ({ ...prev, coins: prev.coins - 4000, estate: { owned: true, rooms: [], items: [] } }));
                    setEstateMsg({ ok: true, line: "The party now owns the Key to the House." });
                    addLog("The party buys an Estate in Silver City for 4000c.");
                  }}
                  className="text-xs px-3 py-1.5 rounded font-semibold"
                  style={{ background: palette.crimsonDark, color: palette.parchment }}
                >
                  Buy the Estate
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink, fontStyle: "italic" }}>
                No inn fee while staying here. (The rulebook also allows unlimited equipment storage at the estate — this app doesn't have per-location inventory tracking yet, so treat items as available whenever convenient.)
              </p>
              <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Furnishing the Manor</p>
              <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                Only one thing may be commissioned between quests, and it isn't usable until after leaving the next dungeon. Use the "Between Quests" panel above to mark a dungeon trip complete.
              </p>

              {party.estate.pendingRoom && (
                <div className="text-xs rounded px-2 py-2 mb-2" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                  <span style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                    <b>{party.estate.pendingRoom.name}</b> commissioned — ready after your next dungeon trip.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {MANOR_ROOMS.map((room) => {
                  const owned = (party.estate.rooms || []).includes(room.name);
                  const isPending = party.estate.pendingRoom?.name === room.name;
                  return (
                    <div key={room.name} className="text-xs rounded px-2 py-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>{room.name}</span>
                          {room.requiresExpansion && <span className="block text-[10px]" style={{ color: palette.crimson }}>Requires {room.requiresExpansion}</span>}
                          {room.unconfirmed && <span className="block text-[10px]" style={{ color: palette.crimson }}>Unconfirmed — see note below</span>}
                          {!owned && !isPending && <span className="block text-[10px] italic" style={{ color: palette.inkSoft }}>{room.cost}c</span>}
                        </div>
                        {owned ? (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ml-2" style={{ background: "#00000010", color: palette.forestDark }}>Built</span>
                        ) : isPending ? (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ml-2" style={{ background: "#00000010", color: palette.crimson }}>Pending</span>
                        ) : (
                          <button onClick={() => buyRoom(room)} disabled={!!party.estate.pendingRoom} className="text-[10px] px-2 py-1 rounded font-semibold shrink-0 ml-2" style={{ background: party.estate.pendingRoom ? "#00000020" : palette.crimsonDark, color: palette.parchment, opacity: party.estate.pendingRoom ? 0.5 : 1 }}>
                            Commission
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] mt-1 italic" style={{ color: palette.inkSoft }}>{room.effect}</p>

                      {owned && (room.name === "Archery Range" || room.name === "Training Grounds") && (
                        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${palette.line}` }}>
                          <select value={trainHero} onChange={(e) => { setTrainHero(e.target.value); setTrainResult(null); }} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                            <option value="">Choose a hero to train…</option>
                            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                          {room.name === "Training Grounds" && (
                            <div className="flex gap-1.5 mb-1.5">
                              {["CS", "Dodge"].map((c) => (
                                <button key={c} onClick={() => setTrainChoice(c)} className="flex-1 text-[10px] px-2 py-1 rounded font-semibold" style={{ background: trainChoice === c ? palette.crimsonDark : "#00000010", color: trainChoice === c ? palette.parchment : palette.ink }}>{c}</button>
                              ))}
                            </div>
                          )}
                          <button onClick={() => trainAtManor(room.name)} disabled={!trainHero} className="w-full text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: trainHero ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: trainHero ? 1 : 0.5 }}>
                            Train (+1d2)
                          </button>
                          {trainResult && <p className="text-[10px] mt-1.5 font-semibold" style={{ color: trainResult.ok ? palette.forestDark : palette.crimson }}>{trainResult.line}</p>}
                        </div>
                      )}

                      {owned && room.name === "Shrine" && (
                        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${palette.line}` }}>
                          {!party.estate.shrineGod ? (
                            <select onChange={(e) => e.target.value && setParty((prev) => ({ ...prev, estate: { ...prev.estate, shrineGod: e.target.value } }))} className="w-full text-xs rounded px-2 py-1" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                              <option value="">Dedicate the shrine to…</option>
                              {Object.keys(TEMPLE_BOONS).map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          ) : (
                            <>
                              <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>Dedicated to {party.estate.shrineGod}</p>
                              <select value={shrinePrayHero} onChange={(e) => { setShrinePrayHero(e.target.value); setShrineResult(null); }} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                                <option value="">Choose a hero to pray…</option>
                                {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                              </select>
                              <button onClick={prayAtShrine} disabled={!shrinePrayHero} className="w-full text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: shrinePrayHero ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: shrinePrayHero ? 1 : 0.5 }}>
                                Pray (free, 1-4 on 1d6)
                              </button>
                            </>
                          )}
                          {shrineResult && <p className="text-[10px] mt-1.5 font-semibold" style={{ color: shrineResult.ok ? palette.forestDark : palette.crimson }}>{shrineResult.line}</p>}
                        </div>
                      )}

                      {owned && room.name === "Smithy" && (
                        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${palette.line}` }}>
                          <button onClick={repairAtSmithy} className="w-full text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
                            Repair Whole Party (+1d3 Durability)
                          </button>
                          {smithyResult && <p className="text-[10px] mt-1.5 font-semibold" style={{ color: palette.forestDark }}>{smithyResult.line}</p>}
                        </div>
                      )}

                      {owned && room.name === "Crops, Hen House, and Pigsty" && (
                        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${palette.line}` }}>
                          <label className="flex items-center gap-2 text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>
                            Days spent tending:
                            <input type="number" min="1" value={cropsDays} onChange={(e) => setCropsDays(e.target.value)} className="w-12 rounded px-1 py-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }} />
                          </label>
                          <button onClick={tendCrops} className="w-full text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
                            Tend (1d8 + days rations)
                          </button>
                          {cropsResult && <p className="text-[10px] mt-1.5 font-semibold" style={{ color: palette.forestDark }}>{cropsResult.line}</p>}
                        </div>
                      )}

                      {owned && room.name === "Garden" && (
                        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${palette.line}` }}>
                          <select value={gardenHero} onChange={(e) => { setGardenHero(e.target.value); setGardenResult(null); }} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                            <option value="">Choose the Alchemist…</option>
                            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                          <select value={gardenHabitat} onChange={(e) => setGardenHabitat(e.target.value)} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                            {["Roadside", "Plains", "Woods", "Water", "Highland", "Site"].map((h) => <option key={h} value={h}>{h} table</option>)}
                          </select>
                          <button onClick={gatherFromGarden} disabled={!gardenHero || party.estate.gardenUsed} className="w-full text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: gardenHero && !party.estate.gardenUsed ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: gardenHero && !party.estate.gardenUsed ? 1 : 0.5 }}>
                            {party.estate.gardenUsed ? "Already gathered this cycle" : "Gather (1d6+2 ingredients)"}
                          </button>
                          {gardenResult && <p className="text-[10px] mt-1.5 font-semibold" style={{ color: gardenResult.ok ? palette.forestDark : palette.crimson }}>{gardenResult.line}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="h-px my-3" style={{ background: palette.line }} />
              <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Estate Storage (unlimited)</p>
              <StorageBox items={party.estate.items || []} onChange={(items) => setParty((prev) => ({ ...prev, estate: { ...prev.estate, items } }))} />

              <div className="h-px my-3" style={{ background: palette.line }} />
              <p className="text-xs font-semibold mb-1" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Ghostly Events</p>
              <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                Rolled the night before departure, between every quest.
              </p>
              <button onClick={rollGhostlyEvents} className="w-full text-xs px-2 py-2 rounded font-semibold mb-2" style={{ background: palette.crimsonDark, color: palette.parchment }}>
                {party.pendingGhostlyEvent ? `Roll Forced Event #${party.pendingGhostlyEvent}` : "Roll for Ghostly Contact"}
              </button>
              {ghostlyResult && (
                <div className="rounded p-2 text-xs space-y-1" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                  {ghostlyResult.lines.map((l, i) => <p key={i} className={i === 0 ? "font-semibold" : ""}>{l}</p>)}
                </div>
              )}

              {party.grievingMother !== "none" && (
                <>
                  <div className="h-px my-3" style={{ background: palette.line }} />
                  <p className="text-xs font-semibold mb-1" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Side Quest: The Grieving Mother</p>
                  {party.grievingMother === "triggered" && (
                    <>
                      <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>
                        Active — add a Side Quest Card to the pile this dungeon. When drawn, put it aside and pull the next card instead; that card leads to the hidden Objective Room. Two Giant Spiders guard the remains inside (ENC 8 to carry out). Once beaten, Wandering Monsters from that point on are 1d2 Giant Spiders from that opening.
                      </p>
                      <select value={gmRewardHero} onChange={(e) => setGmRewardHero(e.target.value)} className="w-full text-xs rounded px-2 py-1 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
                        <option value="">Who's carrying the Longsword reward?</option>
                        {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={markGrievingMotherSucceeded} disabled={!gmRewardHero} className="flex-1 text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: gmRewardHero ? palette.forestDark : "#00000020", color: palette.parchment, opacity: gmRewardHero ? 1 : 0.5 }}>
                          Brought Back the Remains
                        </button>
                        <button onClick={markGrievingMotherFailed} className="flex-1 text-[10px] px-2 py-1.5 rounded font-semibold" style={{ background: palette.crimson, color: palette.parchment }}>
                          Ended in Failure
                        </button>
                      </div>
                    </>
                  )}
                  {party.grievingMother === "succeeded" && <p className="text-[10px]" style={{ color: palette.forestDark }}>Succeeded — the old lady is at rest, and a magical Longsword (+2 DMG) was left behind.</p>}
                  {party.grievingMother === "failed" && <p className="text-[10px]" style={{ color: palette.crimson }}>Failed — a forced Ghostly Event #8 (Restless Night) will trigger automatically on the next roll. Rolling #6 again will let the party retry.</p>}
                </>
              )}
            </>
          )}

          {estateMsg && (
            <div className="mt-3 rounded p-2 text-xs" style={{ background: "#fff", border: `1px solid ${estateMsg.ok ? palette.line : palette.crimson}`, fontFamily: "Crimson Pro, serif", color: estateMsg.ok ? palette.forestDark : palette.crimson, fontWeight: 600 }}>
              {estateMsg.line}
            </div>
          )}
        </Panel>
      )}

      {settlement && settlement.services.includes("Alberta's Magnificent Animals") && (
        <Panel className="mb-4">
          <SectionTitle icon={Wheat}>Alberta's Magnificent Animals</SectionTitle>
          <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Mounts and carrying capacity for the Travel tab. Owning all-horses or all-camels gives the party 6 Movement Points/day instead of 3; a Mule or Wagon replaces walking's carry limit.
          </p>
          <div className="space-y-1.5">
            {[
              ["horses", "Horse", 1000],
              ["camels", "Camel", 1250],
              ["saddlebags", "Saddlebags (10 ENC each)", 250],
              ["mules", "Mule (100 ENC)", 800],
              ["wagons", "Wagon (500 ENC)", 1500],
            ].map(([key, label, cost]) => (
              <div key={key} className="flex justify-between items-center text-xs rounded px-2 py-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                <div>
                  <span className="font-semibold" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>{label}</span>
                  <span className="block text-[10px]" style={{ color: palette.inkSoft }}>{cost}c · Owned: {party.transport[key] || 0}</span>
                </div>
                <button
                  onClick={() => {
                    if (party.coins < cost) { setEstateMsg({ ok: false, line: `Can't afford a ${label}: ${cost}c needed, party only has ${party.coins}c.` }); return; }
                    setParty((prev) => ({ ...prev, coins: prev.coins - cost, transport: { ...prev.transport, [key]: (prev.transport[key] || 0) + 1 } }));
                    setEstateMsg({ ok: true, line: `Bought a ${label} for ${cost}c.` });
                    addLog(`The party buys a ${label} for ${cost}c.`);
                  }}
                  className="text-[10px] px-2 py-1 rounded font-semibold"
                  style={{ background: palette.crimsonDark, color: palette.parchment }}
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
          {estateMsg && (
            <div className="mt-3 rounded p-2 text-xs" style={{ background: "#fff", border: `1px solid ${estateMsg.ok ? palette.line : palette.crimson}`, fontFamily: "Crimson Pro, serif", color: estateMsg.ok ? palette.forestDark : palette.crimson, fontWeight: 600 }}>
              {estateMsg.line}
            </div>
          )}
        </Panel>
      )}

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

// Spell type from its `special` codes — T = Touch, I = Incantation, otherwise Ranged
// (Magic Missile-style: needs LOS, no separate to-hit roll, no obstacle modifiers).
// ---------- Guilds Tab (p146-157) ----------

function GuildRow({ label, sub, right, onClick, disabled }) {
  return (
    <div className="rounded p-2 mb-1.5 flex items-center justify-between" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
      <div className="pr-2">
        <p className="text-xs font-semibold" style={{ color: palette.ink }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>{sub}</p>}
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="text-[10px] px-2.5 py-1.5 rounded font-semibold flex-shrink-0"
        style={{ background: disabled ? "#00000020" : palette.forestDark, color: palette.parchment, opacity: disabled ? 0.5 : 1 }}
      >
        {right}
      </button>
    </div>
  );
}

function GuildResultBox({ result }) {
  if (!result) return null;
  return (
    <div className="rounded p-2 mt-1 text-[11px] font-semibold" style={{ background: "#fff", border: `1px solid ${result.ok ? palette.forest : palette.crimson}`, color: result.ok ? palette.forestDark : palette.crimson }}>
      {result.line}
    </div>
  );
}

// Shared Skill Training box — 300c, +3 modifier, once per skill between dungeons.
function SkillTrainingBox({ guildKey, skillKeys, heroes, party, setParty, updateHero, addLog }) {
  const [hero, setHero] = useState(heroes[0]?.id || "");
  const [skill, setSkill] = useState(skillKeys[0]);
  const [result, setResult] = useState(null);
  const trainKey = `${hero}:${skill}`;
  const alreadyTrained = !!(party.guilds.training || {})[trainKey];

  const train = () => {
    const h = heroes.find((x) => x.id === hero);
    if (!h) { setResult({ ok: false, line: "Pick a hero first." }); return; }
    if (alreadyTrained) { setResult({ ok: false, line: `${h.name} already trained ${SKILL_LABELS[skill]} this cycle — reset via "Between Quests" on the Settlements tab.` }); return; }
    if (party.coins < 300) { setResult({ ok: false, line: `Can't afford it: 300c needed, party only has ${party.coins}c.` }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - 300, guilds: { ...prev.guilds, training: { ...prev.guilds.training, [trainKey]: true } } }));
    const cur = Number(h.skills[skill]) || 0;
    updateHero({ ...h, skills: { ...h.skills, [skill]: cur + 3 } });
    const line = `${h.name} trains ${SKILL_LABELS[skill]}: ${cur} → ${cur + 3} for 300c (1 day).`;
    setResult({ ok: true, line });
    addLog(`${h.name} trains ${SKILL_LABELS[skill]} at the ${guildKey} (${line})`);
  };

  return (
    <div className="subsection mb-4">
      <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Skill Training</p>
      <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>+3 to a skill for 300c. Only one training session per skill can be taken between dungeons.</p>
      <select value={hero} onChange={(e) => { setHero(e.target.value); setResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
        <option value="">Choose a hero…</option>
        {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      <select value={skill} onChange={(e) => { setSkill(e.target.value); setResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
        {skillKeys.map((k) => <option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
      </select>
      <button onClick={train} disabled={!hero || alreadyTrained} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: (!hero || alreadyTrained) ? "#00000020" : palette.crimsonDark, color: palette.parchment, opacity: (!hero || alreadyTrained) ? 0.5 : 1 }}>
        {alreadyTrained ? "Already trained this cycle" : "Train (300c, 1 day)"}
      </button>
      <GuildResultBox result={result} />
    </div>
  );
}

// Shared shop list — rolls 1d6 vs Availability, deducts coins, adds the item to the
// chosen hero's backpack on success. Used by every guild's "Buying Special Equipment".
function GuildShopList({ title, desc, items, heroes, party, setParty, updateHero, addLog, sourceLabel }) {
  const [hero, setHero] = useState(heroes[0]?.id || "");
  const [result, setResult] = useState(null);

  const buy = (item) => {
    const h = heroes.find((x) => x.id === hero);
    if (!h) { setResult({ ok: false, line: "Pick a hero first." }); return; }
    const roll = rollDie(6);
    if (roll > item.avail) {
      const line = `Rolled ${roll} vs Availability ${item.avail} — ${item.name} isn't in stock this visit.`;
      setResult({ ok: false, line });
      addLog(`${h.name} checks for ${item.name} at the ${sourceLabel} — ${line}`);
      return;
    }
    if (party.coins < item.cost) {
      const line = `Rolled ${roll} vs Availability ${item.avail} — in stock, but the party can't afford ${item.cost}c (has ${party.coins}c).`;
      setResult({ ok: false, line });
      return;
    }
    setParty((prev) => ({ ...prev, coins: prev.coins - item.cost }));
    updateHero({
      ...h,
      backpack: [...h.backpack, { id: uid(), name: item.name, value: item.cost, enc: item.enc ?? "", dur: item.dur ? `${item.dur}/${item.dur}` : "", slot: "backpack" }],
    });
    const line = `Rolled ${roll} vs Availability ${item.avail} — in stock! Bought ${item.name} for ${item.cost}c (party now has ${party.coins - item.cost}c).`;
    setResult({ ok: true, line });
    addLog(`${h.name} buys ${item.name} at the ${sourceLabel} for ${item.cost}c.`);
  };

  return (
    <div className="subsection mb-4">
      <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{title}</p>
      {desc && <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>{desc}</p>}
      <select value={hero} onChange={(e) => { setHero(e.target.value); setResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-2" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
        <option value="">Choose a hero…</option>
        {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      {items.map((item) => (
        <GuildRow
          key={item.name}
          label={item.name}
          sub={`Avail ${item.avail} · ${item.cost}c${item.special ? ` · ${item.special}` : ""}`}
          right="Roll & Buy"
          disabled={!hero}
          onClick={() => buy(item)}
        />
      ))}
      <GuildResultBox result={result} />
    </div>
  );
}

function GuildsTab({ party, setParty, heroes, updateHero, addLog }) {
  const guildSettlements = SETTLEMENTS.filter((s) => s.services.includes("Guilds") || s.services.includes("Inner Sanctum"));
  const [settlementName, setSettlementName] = useState(
    guildSettlements.some((s) => s.name === party.settlementName) ? party.settlementName : (guildSettlements[0]?.name || "")
  );
  const settlement = SETTLEMENTS.find((s) => s.name === settlementName);
  const hasGuilds = settlement?.services.includes("Guilds");
  const hasInnerSanctum = settlement?.services.includes("Inner Sanctum");
  const [openGuild, setOpenGuild] = useState(null);
  const toggle = (key) => setOpenGuild(openGuild === key ? null : key);

  // ---------- Moved from Settlements tab: Wizards' Guild (Learn a Spell, Charge, Identify)
  // and Inner Sanctum (Learn a Prayer) — same logic, now living here for consistency. ----------
  const logSettlementAP = (heroId, name, ap) => {
    if (!heroId) return;
    setParty((prev) => {
      const cur = prev.settlementAP?.[heroId] || { spent: 0, log: [] };
      return { ...prev, settlementAP: { ...(prev.settlementAP || {}), [heroId]: { spent: cur.spent + ap, log: [...cur.log, { name, ap }] } } };
    });
  };
  const learnCost = (lvl) => 200 + 100 * (lvl - 1);

  const [learnSpellHero, setLearnSpellHero] = useState("");
  const [learnSpellName, setLearnSpellName] = useState("");
  const [learnSpellGrimoire, setLearnSpellGrimoire] = useState(false);
  const [learnSpellResult, setLearnSpellResult] = useState(null);
  const confirmLearnSpell = () => {
    const hero = heroes.find((h) => h.id === learnSpellHero);
    const spell = SPELLS.find((s) => s.name === learnSpellName);
    if (!hero || !spell) { setLearnSpellResult({ ok: false, line: "Pick a hero and a spell first." }); return; }
    if ((hero.spells || []).includes(spell.name)) { setLearnSpellResult({ ok: false, line: `${hero.name} already knows ${spell.name}.` }); return; }
    const cost = learnSpellGrimoire ? 0 : learnCost(spell.lvl);
    if (cost > 0 && party.coins < cost) { setLearnSpellResult({ ok: false, line: `Can't afford it: ${cost}c needed, party only has ${party.coins}c.` }); return; }
    if (cost > 0) setParty((prev) => ({ ...prev, coins: prev.coins - cost }));
    updateHero({ ...hero, spells: [...(hero.spells || []), spell.name] });
    logSettlementAP(hero.id, "Learn a Spell", 3);
    const line = `${hero.name} learns ${spell.name} (Level ${spell.lvl}) at the Wizards' Guild${cost > 0 ? ` for ${cost}c` : " for free (found via Grimoire)"}. Takes 3 days.`;
    setLearnSpellResult({ ok: true, line });
    addLog(line);
    setLearnSpellName("");
    setLearnSpellGrimoire(false);
  };

  const [chargeHero, setChargeHero] = useState("");
  const [chargeTarget, setChargeTarget] = useState("");
  const [chargeResult, setChargeResult] = useState(null);
  const confirmCharge = () => {
    const hero = heroes.find((h) => h.id === chargeHero);
    if (!hero) { setChargeResult({ ok: false, line: "Pick a hero first." }); return; }
    const eligible = heroEquippedItems(hero).filter((i) => i.piece.wasEverEnchanted && !i.piece.enchanted && i.piece.dur && i.piece.dur.cur > 0);
    const item = eligible.find((i) => i.key === chargeTarget);
    if (!item) { setChargeResult({ ok: false, line: "Pick a dissipated (but not broken) magic item to recharge." }); return; }
    updateHero(applyItemPatch(hero, item.key, { enchanted: true, dur: { ...item.piece.dur, max: 8 } }));
    const line = `${item.piece.name} recharged at the Wizards' Guild — magic restored, Durability max back to 8.`;
    setChargeResult({ ok: true, line });
    addLog(`${hero.name}: ${line}`);
  };

  const [identifyHero, setIdentifyHero] = useState("");
  const [identifyTarget, setIdentifyTarget] = useState("");
  const [identifyResult, setIdentifyResult] = useState(null);
  const confirmIdentify = () => {
    const hero = heroes.find((h) => h.id === identifyHero);
    if (!hero) { setIdentifyResult({ ok: false, line: "Pick a hero first." }); return; }
    const item = heroAllItems(hero).find((i) => i.key === identifyTarget);
    if (!item) { setIdentifyResult({ ok: false, line: "Pick an item to identify." }); return; }
    const aa = Number(hero.skills.arcaneArts) || 0;
    const roll = rollPercent();
    const success = roll <= aa;
    const line = success ? `Rolled ${roll} vs Arcane Arts ${aa} — Success! ${item.piece.name} is identified.` : `Rolled ${roll} vs Arcane Arts ${aa} — Failed. Only one attempt per party/object — try again in a different settlement.`;
    setIdentifyResult({ ok: success, line });
    addLog(`${hero.name} attempts to identify ${item.piece.name}: ${line}`);
  };

  const [learnPrayerHero, setLearnPrayerHero] = useState("");
  const [learnPrayerName, setLearnPrayerName] = useState("");
  const [learnPrayerResult, setLearnPrayerResult] = useState(null);
  const confirmLearnPrayer = () => {
    const hero = heroes.find((h) => h.id === learnPrayerHero);
    const prayer = PRAYERS.find((p) => p.name === learnPrayerName);
    if (!hero || !prayer) { setLearnPrayerResult({ ok: false, line: "Pick a hero and a prayer first." }); return; }
    if ((hero.prayers || []).includes(prayer.name)) { setLearnPrayerResult({ ok: false, line: `${hero.name} already knows ${prayer.name}.` }); return; }
    const cost = learnCost(prayer.lvl);
    if (party.coins < cost) { setLearnPrayerResult({ ok: false, line: `Can't afford it: ${cost}c needed, party only has ${party.coins}c.` }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - cost }));
    updateHero({ ...hero, prayers: [...(hero.prayers || []), prayer.name] });
    logSettlementAP(hero.id, "Learn a Prayer", 1);
    const line = `${hero.name} learns ${prayer.name} (Level ${prayer.lvl}) at the Inner Sanctum for ${cost}c. Takes 1 day.`;
    setLearnPrayerResult({ ok: true, line });
    addLog(line);
    setLearnPrayerName("");
  };

  // ---------- Fighters' Guild: Bounty Hunt ----------
  const [bountyResult, setBountyResult] = useState(null);
  const bounty = party.guilds.bountyHunt || { rolled: [], claimed: [] };
  const rollBounties = () => {
    const rolled = Array.from({ length: 5 }, () => rollBountyHunt());
    setParty((prev) => ({ ...prev, guilds: { ...prev.guilds, bountyHunt: { rolled, claimed: [] } } }));
    addLog(`Rolled 5 Bounty Hunt targets at the Fighters' Guild: ${rolled.map((r) => r.name).join(", ")}.`);
    setBountyResult(null);
  };
  const claimBounty = (name) => {
    if (party.guilds.bountyHunt.claimed.includes(name)) return;
    setParty((prev) => ({
      ...prev,
      coins: prev.coins + 250,
      guilds: { ...prev.guilds, bountyHunt: { ...prev.guilds.bountyHunt, claimed: [...prev.guilds.bountyHunt.claimed, name] } },
    }));
    addLog(`Claimed the Bounty Hunt reward for ${name} — +250c.`);
    setBountyResult({ ok: true, line: `Claimed 250c for ${name} (party now has ${party.coins + 250}c).` });
  };

  // ---------- Rangers' Guild: Taxidermist trophy sale ----------
  const [taxHero, setTaxHero] = useState(heroes[0]?.id || "");
  const [taxXP, setTaxXP] = useState("");
  const [taxResult, setTaxResult] = useState(null);
  const taxAttempted = !!(party.guilds.taxidermistAttempts || {})[settlementName];
  const sellTrophy = () => {
    const h = heroes.find((x) => x.id === taxHero);
    if (!h) { setTaxResult({ ok: false, line: "Pick a Ranger first." }); return; }
    if (taxAttempted) { setTaxResult({ ok: false, line: "Already attempted a sale in this settlement this cycle." }); return; }
    const xp = Number(taxXP) || 0;
    const roll = rollDie(20);
    const row = TAXIDERMIST_SELL_TABLE.find((r) => roll >= r.min && roll <= r.max);
    const isSilverCity = settlementName === "Silver City";
    const mod = isSilverCity ? row.silverCity : row.village;
    const value = xp + mod;
    setParty((prev) => ({
      ...prev,
      coins: value > 0 ? prev.coins + value : prev.coins,
      guilds: { ...prev.guilds, taxidermistAttempts: { ...prev.guilds.taxidermistAttempts, [settlementName]: true } },
    }));
    if (value > 0) {
      const line = `Rolled ${roll} (${mod >= 0 ? "+" : ""}${mod} in ${settlementName}) — sold for ${value}c (party now has ${party.coins + value}c).`;
      setTaxResult({ ok: true, line });
      addLog(`${h.name} sells a Trophy at the Taxidermist: ${line}`);
    } else {
      const line = `Rolled ${roll} (${mod >= 0 ? "+" : ""}${mod} in ${settlementName}) — no buyer here this visit.`;
      setTaxResult({ ok: false, line });
      addLog(`${h.name} finds no buyer for a Trophy at the Taxidermist (rolled ${roll}).`);
    }
  };

  // ---------- Inner Sanctum: Crusades ----------
  const crusade = party.guilds.crusade;
  const rollCrusade = () => {
    const against = CRUSADE_TABLE[rollDie(6) - 1];
    setParty((prev) => ({ ...prev, guilds: { ...prev.guilds, crusade: { against, killed: 0 } } }));
    addLog(`The High Priests declare a Crusade against ${against}.`);
  };
  const recordCrusadeKill = () => {
    if (!crusade) return;
    setParty((prev) => ({ ...prev, coins: prev.coins + 25, guilds: { ...prev.guilds, crusade: { ...prev.guilds.crusade, killed: prev.guilds.crusade.killed + 1 } } }));
    addLog(`A Crusade trophy against ${crusade.against} is turned in — +25c. (Paid immediately for simplicity; the book pays out next Sanctum visit.)`);
  };

  // ---------- Inner Sanctum: Blessing armour/weapons ----------
  const [blessHero, setBlessHero] = useState(heroes[0]?.id || "");
  const [blessResult, setBlessResult] = useState(null);
  const blessArmour = (loc) => {
    const h = heroes.find((x) => x.id === blessHero);
    if (!h) return;
    const piece = h.armour[loc];
    if (!piece?.name) { setBlessResult({ ok: false, line: "That armour slot is empty." }); return; }
    if (party.coins < 25) { setBlessResult({ ok: false, line: "Can't afford the 25c fee." }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - 25 }));
    updateHero({ ...h, armour: { ...h.armour, [loc]: { ...piece, dur: { cur: piece.dur.cur + 1, max: piece.dur.max + 1 }, blessed: true } } });
    const line = `${piece.name} blessed for 25c — +1 Durability, lasts until the heroes leave the next dungeon.`;
    setBlessResult({ ok: true, line });
    addLog(`${h.name}'s ${piece.name} is blessed by the High Priests: ${line}`);
  };
  const blessWeapon = () => {
    const h = heroes.find((x) => x.id === blessHero);
    if (!h || !h.weapon?.name) { setBlessResult({ ok: false, line: "That hero has no weapon equipped." }); return; }
    if (party.coins < 75) { setBlessResult({ ok: false, line: "Can't afford the 75c fee." }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - 75 }));
    updateHero({ ...h, weapon: { ...h.weapon, blessed: true } });
    const line = `${h.weapon.name} blessed for 75c — +2 DMG vs Undead/Demons, lasts until the heroes leave the next dungeon.`;
    setBlessResult({ ok: true, line });
    addLog(`${h.name}'s ${h.weapon.name} is blessed by the High Priests: ${line}`);
  };

  // ---------- Alchemists' Guild: parts, ingredients, potions ----------
  const [partHero, setPartHero] = useState(heroes[0]?.id || "");
  const [partName, setPartName] = useState(ALCHEMY_PART_NAMES[0] || "");
  const [partResult, setPartResult] = useState(null);
  const buyPart = () => {
    const h = heroes.find((x) => x.id === partHero);
    if (!h) { setPartResult({ ok: false, line: "Pick a hero first." }); return; }
    const avail = ALCHEMY_PART_AVAILABILITY[partName] || 0;
    const roll = rollDie(6);
    if (roll > avail) { setPartResult({ ok: false, line: `Rolled ${roll} vs Availability ${avail} — not in stock this visit.` }); return; }
    if (party.coins < 15) { setPartResult({ ok: false, line: "Can't afford the 15c fee." }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - 15 }));
    updateHero({ ...h, alchemyComponents: addAlchemyComponent(h, partName, "Part", 1, false) });
    const line = `Rolled ${roll} vs Availability ${avail} — bought 1 ${partName} for 15c.`;
    setPartResult({ ok: true, line });
    addLog(`${h.name} buys a ${partName} at the Alchemists' Guild: ${line}`);
  };
  const [ingHero, setIngHero] = useState(heroes[0]?.id || "");
  const [ingName, setIngName] = useState(ALCHEMY_INGREDIENT_NAMES[0] || "");
  const [ingResult, setIngResult] = useState(null);
  const buyIngredient = () => {
    const h = heroes.find((x) => x.id === ingHero);
    if (!h) { setIngResult({ ok: false, line: "Pick a hero first." }); return; }
    const avail = ALCHEMY_INGREDIENT_AVAILABILITY[ingName] || 0;
    const roll = rollDie(6);
    if (roll > avail) { setIngResult({ ok: false, line: `Rolled ${roll} vs Availability ${avail} — not in stock this visit.` }); return; }
    if (party.coins < 15) { setIngResult({ ok: false, line: "Can't afford the 15c fee." }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - 15 }));
    updateHero({ ...h, alchemyComponents: addAlchemyComponent(h, ingName, "Ingredient", 1, false) });
    const line = `Rolled ${roll} vs Availability ${avail} — bought 1 ${ingName} for 15c.`;
    setIngResult({ ok: true, line });
    addLog(`${h.name} buys ${ingName} at the Alchemists' Guild: ${line}`);
  };
  const [potHero, setPotHero] = useState(heroes[0]?.id || "");
  const [potName, setPotName] = useState(ALCHEMISTS_GUILD_POTIONS[0]?.name || "");
  const [potStrength, setPotStrength] = useState("Standard");
  const [potResult, setPotResult] = useState(null);
  const potEntry = ALCHEMISTS_GUILD_POTIONS.find((p) => p.name === potName);
  const potStrengthOptions = potEntry ? ["Weak", "Standard", "Supreme"].filter((s) => potEntry[s.toLowerCase()] != null) : [];
  const buyPotion = () => {
    const h = heroes.find((x) => x.id === potHero);
    if (!h || !potEntry) { setPotResult({ ok: false, line: "Pick a hero and a potion first." }); return; }
    const cost = potEntry[potStrength.toLowerCase()];
    if (cost == null) { setPotResult({ ok: false, line: `No ${potStrength} version of ${potName} exists.` }); return; }
    const avail = potStrength === "Weak" ? null : potStrength === "Standard" ? 5 : 4;
    let roll = null;
    if (avail != null) {
      roll = rollDie(6);
      if (roll > avail) { setPotResult({ ok: false, line: `Rolled ${roll} vs Availability ${avail} — not in stock this visit.` }); return; }
    }
    if (party.coins < cost) { setPotResult({ ok: false, line: `Can't afford it: ${cost}c needed, party only has ${party.coins}c.` }); return; }
    setParty((prev) => ({ ...prev, coins: prev.coins - cost }));
    updateHero({ ...h, backpack: [...h.backpack, { id: uid(), name: `${potName} (${potStrength})`, value: cost, enc: 1, dur: "1/1", slot: "backpack" }] });
    const line = `${roll != null ? `Rolled ${roll} vs Availability ${avail} — ` : "Weak potions are always in stock — "}bought ${potName} (${potStrength}) for ${cost}c.`;
    setPotResult({ ok: true, line });
    addLog(`${h.name} buys a ${potName} (${potStrength}) at the Alchemists' Guild for ${cost}c.`);
  };

  // ---------- Dark Guild: Nightstalker armour shop items (from ARMOUR_AND_SHIELDS) ----------
  const nightstalkerItems = NIGHTSTALKER_ARMOUR_NAMES.map((name) => {
    const a = ARMOUR_AND_SHIELDS.find((x) => x.name === name);
    return { name: a.name, cost: a.cost, avail: a.avail, enc: a.enc, dur: a.dur, special: `DEF ${a.def}, covers ${a.covers.join("/")}` };
  });

  const guildDefs = [
    { key: "fighters", name: "Fighters' Guild", show: hasGuilds },
    { key: "rangers", name: "Rangers' Guild", show: hasGuilds },
    { key: "wizards", name: "Wizards' Guild", show: hasGuilds },
    { key: "alchemists", name: "Alchemists' Guild", show: hasGuilds },
    { key: "dark", name: "The Dark Guild", show: hasGuilds },
    { key: "sanctum", name: "The Inner Sanctum", show: hasInnerSanctum },
  ].filter((g) => g.show);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4" style={{ scrollSnapType: "x proximity" }}>
        {guildSettlements.map((s) => (
          <button
            key={s.name}
            onClick={() => { setSettlementName(s.name); setOpenGuild(null); }}
            className="flex-shrink-0 text-[10px] px-3 py-1.5 rounded-full font-semibold"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              background: settlementName === s.name ? palette.crimson : palette.panel,
              color: settlementName === s.name ? palette.parchment : palette.inkSoft,
              border: `1px solid ${settlementName === s.name ? palette.crimson : palette.line}`,
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {guildDefs.length === 0 && (
        <Panel><p className="text-xs italic text-center" style={{ color: palette.inkSoft }}>No guilds in {settlementName}.</p></Panel>
      )}

      {guildDefs.map((g) => (
        <Panel key={g.key} className="mb-2.5" style={{ padding: 0, overflow: "hidden" }}>
          <button onClick={() => toggle(g.key)} className="w-full flex items-center justify-between px-4 py-3">
            <span className="text-xs font-bold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{g.name}</span>
            <span style={{ color: palette.gold, transform: openGuild === g.key ? "rotate(90deg)" : "none", display: "inline-block" }}>›</span>
          </button>

          {openGuild === g.key && (
            <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid ${palette.line}` }}>

              {g.key === "fighters" && (
                <>
                  <SkillTrainingBox guildKey="Fighters' Guild" skillKeys={["cs", "heal", "dodge"]} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} />
                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Bounty Hunt</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>Roll 5 targets to hunt until your next visit. 250c each, claimed once killed &amp; brought back — one reward per kind.</p>
                    {bounty.rolled.length === 0 ? (
                      <button onClick={rollBounties} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>Roll 5 Bounties</button>
                    ) : (
                      <>
                        {bounty.rolled.map((r, i) => (
                          <GuildRow
                            key={i}
                            label={r.name}
                            sub={bounty.claimed.includes(r.name) ? "claimed" : "not yet claimed"}
                            right={bounty.claimed.includes(r.name) ? "Claimed" : "Claim 250c"}
                            disabled={bounty.claimed.includes(r.name)}
                            onClick={() => claimBounty(r.name)}
                          />
                        ))}
                        <button onClick={rollBounties} className="w-full text-[10px] px-2 py-1 rounded font-semibold mt-1" style={{ background: "#00000010", color: palette.inkSoft }}>Reroll list (new visit)</button>
                      </>
                    )}
                    <GuildResultBox result={bountyResult} />
                  </div>
                  <GuildShopList title="Buying Special Equipment" desc="Sold only at the Fighters' Guild." items={FIGHTERS_GUILD_EQUIPMENT} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} sourceLabel="Fighters' Guild" />
                </>
              )}

              {g.key === "rangers" && (
                <>
                  <SkillTrainingBox guildKey="Rangers' Guild" skillKeys={["cs", "rs", "dodge", "heal", "foraging"]} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} />
                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Taxidermist — Sell a Trophy</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>Enter the Trophy creature's XP, roll 1d20, and add the {settlementName === "Silver City" ? "Silver City" : "Village"} modifier. One attempt per settlement per cycle.</p>
                    <select value={taxHero} onChange={(e) => { setTaxHero(e.target.value); setTaxResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <option value="">Choose a hero…</option>
                      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    <input type="number" value={taxXP} onChange={(e) => setTaxXP(e.target.value)} placeholder="Creature's XP" className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }} />
                    <button onClick={sellTrophy} disabled={!taxHero || taxAttempted} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: (!taxHero || taxAttempted) ? "#00000020" : palette.crimsonDark, color: palette.parchment, opacity: (!taxHero || taxAttempted) ? 0.5 : 1 }}>
                      {taxAttempted ? "Already attempted this cycle" : "Roll & Sell"}
                    </button>
                    <GuildResultBox result={taxResult} />
                  </div>
                  <GuildShopList title="Buying Special Equipment" desc="Sold only in the Rangers' Guild." items={RANGERS_GUILD_EQUIPMENT} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} sourceLabel="Rangers' Guild" />
                </>
              )}

              {g.key === "wizards" && (
                <>
                  <SkillTrainingBox guildKey="Wizards' Guild" skillKeys={["arcaneArts", "perception", "heal"]} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} />

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Learn a Spell</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>
                      200c + 100c per spell level above 1. Only available to Wizards and Druids. Takes 3 days.
                    </p>
                    <select
                      value={learnSpellHero}
                      onChange={(e) => { setLearnSpellHero(e.target.value); setLearnSpellName(""); setLearnSpellResult(null); }}
                      className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                      style={{ background: "#fff", border: `1px solid ${palette.line}` }}
                    >
                      <option value="">Choose a hero…</option>
                      {heroes.filter((h) => CASTER_SKILL[h.profession]).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    {learnSpellHero && (() => {
                      const hero = heroes.find((h) => h.id === learnSpellHero);
                      const available = SPELLS.filter((s) => s.lvl <= hero.level && !(hero.spells || []).includes(s.name));
                      return (
                        <>
                          <select
                            value={learnSpellName}
                            onChange={(e) => setLearnSpellName(e.target.value)}
                            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                            style={{ background: "#fff", border: `1px solid ${palette.line}` }}
                          >
                            <option value="">Choose a spell (Level ≤ {hero.level})…</option>
                            {available.map((s) => <option key={s.name} value={s.name}>{s.name} (Level {s.lvl})</option>)}
                          </select>
                          {available.length === 0 && (
                            <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>No learnable spells left at {hero.name}'s level, or all known already.</p>
                          )}
                          {learnSpellName && (
                            <>
                              <label className="flex items-center gap-2 text-[11px] mb-1.5" style={{ color: palette.ink }}>
                                <input type="checkbox" checked={learnSpellGrimoire} onChange={(e) => setLearnSpellGrimoire(e.target.checked)} />
                                Found via Grimoire (free)
                              </label>
                              <p className="text-[11px] mb-1.5 font-semibold" style={{ color: palette.ink }}>
                                Cost: {learnSpellGrimoire ? "Free" : `${learnCost(SPELLS.find((s) => s.name === learnSpellName).lvl)}c`}
                              </p>
                            </>
                          )}
                          <button
                            onClick={confirmLearnSpell}
                            disabled={!learnSpellName}
                            className="w-full text-[11px] px-2 py-1.5 rounded font-semibold"
                            style={{ background: learnSpellName ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: learnSpellName ? 1 : 0.5 }}
                          >
                            Learn Spell
                          </button>
                        </>
                      );
                    })()}
                    <GuildResultBox result={learnSpellResult} />
                  </div>

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Charge a Magic Item</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>
                      Recharges a magic item whose power has dissipated (00 rolled in combat), as long as it isn't broken. No roll needed.
                    </p>
                    <select value={chargeHero} onChange={(e) => { setChargeHero(e.target.value); setChargeTarget(""); setChargeResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <option value="">Choose a hero…</option>
                      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    {chargeHero && (() => {
                      const hero = heroes.find((h) => h.id === chargeHero);
                      const eligible = heroEquippedItems(hero).filter((i) => i.piece.wasEverEnchanted && !i.piece.enchanted && i.piece.dur && i.piece.dur.cur > 0);
                      return (
                        <>
                          <select value={chargeTarget} onChange={(e) => setChargeTarget(e.target.value)} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                            <option value="">Choose a dissipated item…</option>
                            {eligible.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
                          </select>
                          {eligible.length === 0 && <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>No dissipated items to recharge (item must have been enchanted before, currently isn't, and isn't broken).</p>}
                          <button onClick={confirmCharge} disabled={!chargeTarget} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: chargeTarget ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: chargeTarget ? 1 : 0.5 }}>
                            Recharge
                          </button>
                        </>
                      );
                    })()}
                    <GuildResultBox result={chargeResult} />
                  </div>

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Identify a Magic Item</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>Also available at a Scryer. Only one attempt per party/object.</p>
                    <select value={identifyHero} onChange={(e) => { setIdentifyHero(e.target.value); setIdentifyTarget(""); setIdentifyResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <option value="">Choose a hero…</option>
                      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    {identifyHero && (() => {
                      const hero = heroes.find((h) => h.id === identifyHero);
                      const items = heroAllItems(hero);
                      return (
                        <>
                          <select value={identifyTarget} onChange={(e) => setIdentifyTarget(e.target.value)} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                            <option value="">Choose an item…</option>
                            {items.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
                          </select>
                          {items.length === 0 && <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>{hero.name} isn't carrying anything yet.</p>}
                        </>
                      );
                    })()}
                    <button onClick={confirmIdentify} disabled={!identifyHero || !identifyTarget} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: identifyHero && identifyTarget ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: identifyHero && identifyTarget ? 1 : 0.5 }}>
                      Attempt to Identify
                    </button>
                    <GuildResultBox result={identifyResult} />
                  </div>

                  <GuildShopList title="Buying Wizard's Staffs" desc="Staffs double as close-combat weapons (same stats as a normal staff, DUR 8) and hold 3 charges unless noted. Recharging costs half the purchase price — do that from the Hero tab once it's in a backpack." items={WIZARDS_GUILD_STAFFS.map((s) => ({ name: s.name, cost: s.cost, avail: s.avail, special: s.effect }))} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} sourceLabel="Wizards' Guild" />
                </>
              )}

              {g.key === "alchemists" && (
                <>
                  <SkillTrainingBox guildKey="Alchemists' Guild" skillKeys={["alchemy", "heal", "perception"]} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} />

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Buy a Part</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>15c once the Availability Roll succeeds. Some human-body parts aren't sold at all (not listed here).</p>
                    <select value={partHero} onChange={(e) => { setPartHero(e.target.value); setPartResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <option value="">Choose a hero…</option>
                      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    <select value={partName} onChange={(e) => { setPartName(e.target.value); setPartResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      {ALCHEMY_PART_NAMES.filter((n) => ALCHEMY_PART_AVAILABILITY[n] != null).map((n) => <option key={n} value={n}>{n} (Avail {ALCHEMY_PART_AVAILABILITY[n]})</option>)}
                    </select>
                    <button onClick={buyPart} disabled={!partHero} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: !partHero ? "#00000020" : palette.crimsonDark, color: palette.parchment, opacity: !partHero ? 0.5 : 1 }}>Roll &amp; Buy (15c)</button>
                    <GuildResultBox result={partResult} />
                  </div>

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Buy an Ingredient</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>15c once the Availability Roll succeeds.</p>
                    <select value={ingHero} onChange={(e) => { setIngHero(e.target.value); setIngResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <option value="">Choose a hero…</option>
                      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    <select value={ingName} onChange={(e) => { setIngName(e.target.value); setIngResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      {ALCHEMY_INGREDIENT_NAMES.filter((n) => ALCHEMY_INGREDIENT_AVAILABILITY[n] != null).map((n) => <option key={n} value={n}>{n} (Avail {ALCHEMY_INGREDIENT_AVAILABILITY[n]})</option>)}
                    </select>
                    <button onClick={buyIngredient} disabled={!ingHero} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: !ingHero ? "#00000020" : palette.crimsonDark, color: palette.parchment, opacity: !ingHero ? 0.5 : 1 }}>Roll &amp; Buy (15c)</button>
                    <GuildResultBox result={ingResult} />
                  </div>

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Buy a Potion</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>Weak is always in stock (no roll needed). Standard needs Availability 5, Supreme needs Availability 4.</p>
                    <select value={potHero} onChange={(e) => { setPotHero(e.target.value); setPotResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <option value="">Choose a hero…</option>
                      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    <select value={potName} onChange={(e) => { setPotName(e.target.value); setPotResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      {ALCHEMISTS_GUILD_POTIONS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                    {potStrengthOptions.length > 0 && (
                      <select value={potStrength} onChange={(e) => { setPotStrength(e.target.value); setPotResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                        {potStrengthOptions.map((s) => <option key={s} value={s}>{s} ({potEntry[s.toLowerCase()]}c)</option>)}
                      </select>
                    )}
                    <button onClick={buyPotion} disabled={!potHero || potStrengthOptions.length === 0} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: (!potHero || potStrengthOptions.length === 0) ? "#00000020" : palette.crimsonDark, color: palette.parchment, opacity: (!potHero || potStrengthOptions.length === 0) ? 0.5 : 1 }}>Roll &amp; Buy</button>
                    <GuildResultBox result={potResult} />
                  </div>
                </>
              )}

              {g.key === "dark" && (
                <>
                  <SkillTrainingBox guildKey="The Dark Guild" skillKeys={DARK_GUILD_SKILLS} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} />
                  <GuildShopList
                    title="Nightstalker Armour"
                    desc="Considered Tier 2 (leather) armour. High Quality gives DUR 8. Dark as the Night gives -5 to be hit (-10 if all 4 pieces are worn) — check the Hero tab's armour picker to equip once it's bought."
                    items={nightstalkerItems}
                    heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog}
                    sourceLabel="Dark Guild"
                  />
                </>
              )}

              {g.key === "sanctum" && (
                <>
                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Learn a Prayer</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>
                      200c + 100c per prayer level above 1. Only available to Warrior Priests. Takes 1 day.
                    </p>
                    <select
                      value={learnPrayerHero}
                      onChange={(e) => { setLearnPrayerHero(e.target.value); setLearnPrayerName(""); setLearnPrayerResult(null); }}
                      className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                      style={{ background: "#fff", border: `1px solid ${palette.line}` }}
                    >
                      <option value="">Choose a hero…</option>
                      {heroes.filter((h) => PRAYER_SKILL[h.profession]).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    {learnPrayerHero && (() => {
                      const hero = heroes.find((h) => h.id === learnPrayerHero);
                      const available = PRAYERS.filter((p) => p.lvl <= hero.level && !(hero.prayers || []).includes(p.name));
                      return (
                        <>
                          <select
                            value={learnPrayerName}
                            onChange={(e) => setLearnPrayerName(e.target.value)}
                            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                            style={{ background: "#fff", border: `1px solid ${palette.line}` }}
                          >
                            <option value="">Choose a prayer (Level ≤ {hero.level})…</option>
                            {available.map((p) => <option key={p.name} value={p.name}>{p.name} (Level {p.lvl})</option>)}
                          </select>
                          {available.length === 0 && (
                            <p className="text-[10px] mb-1.5" style={{ color: palette.inkSoft }}>No learnable prayers left at {hero.name}'s level, or all known already.</p>
                          )}
                          {learnPrayerName && (
                            <p className="text-[11px] mb-1.5 font-semibold" style={{ color: palette.ink }}>
                              Cost: {learnCost(PRAYERS.find((p) => p.name === learnPrayerName).lvl)}c
                            </p>
                          )}
                          <button
                            onClick={confirmLearnPrayer}
                            disabled={!learnPrayerName}
                            className="w-full text-[11px] px-2 py-1.5 rounded font-semibold"
                            style={{ background: learnPrayerName ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: learnPrayerName ? 1 : 0.5 }}
                          >
                            Learn Prayer
                          </button>
                        </>
                      );
                    })()}
                    <GuildResultBox result={learnPrayerResult} />
                  </div>

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Crusades</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>25c per trophy from the Crusade's target, no matter who lands the kill. Lasts until the heroes leave the next dungeon.</p>
                    {!crusade ? (
                      <button onClick={rollCrusade} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>Roll a Crusade</button>
                    ) : (
                      <>
                        <p className="text-xs font-semibold mb-2" style={{ color: palette.ink }}>Crusade against {crusade.against} — {crusade.killed} trophy{crusade.killed === 1 ? "" : "s"} turned in</p>
                        <button onClick={recordCrusadeKill} className="w-full text-[11px] px-2 py-1.5 rounded font-semibold" style={{ background: palette.forestDark, color: palette.parchment }}>Turn in a trophy (+25c)</button>
                        <button onClick={rollCrusade} className="w-full text-[10px] px-2 py-1 rounded font-semibold mt-1" style={{ background: "#00000010", color: palette.inkSoft }}>Reroll (new visit)</button>
                      </>
                    )}
                  </div>

                  <div className="subsection mb-4">
                    <p className="text-[11px] font-bold mb-1.5" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Blessing Armour &amp; Weapons</p>
                    <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft }}>Armour: +1 Durability for 25c/piece. Weapons: +2 DMG vs Undead/Demons for 75c. Both last until the heroes leave the next dungeon.</p>
                    <select value={blessHero} onChange={(e) => { setBlessHero(e.target.value); setBlessResult(null); }} className="w-full text-xs rounded px-2 py-1.5 mb-1.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                      <option value="">Choose a hero…</option>
                      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    {blessHero && (() => {
                      const h = heroes.find((x) => x.id === blessHero);
                      if (!h) return null;
                      return (
                        <>
                          {["head", "arms", "torso", "legs", "shield"].map((loc) => h.armour[loc]?.name && (
                            <GuildRow key={loc} label={`${loc[0].toUpperCase()}${loc.slice(1)}: ${h.armour[loc].name}`} sub={h.armour[loc].blessed ? "already blessed" : undefined} right="Bless (25c)" disabled={h.armour[loc].blessed} onClick={() => blessArmour(loc)} />
                          ))}
                          {h.weapon?.name && (
                            <GuildRow label={`Weapon: ${h.weapon.name}`} sub={h.weapon.blessed ? "already blessed" : undefined} right="Bless (75c)" disabled={h.weapon.blessed} onClick={blessWeapon} />
                          )}
                        </>
                      );
                    })()}
                    <GuildResultBox result={blessResult} />
                  </div>

                  <GuildShopList title="Buying Special Equipment" desc="Usually only available to Warrior Priests." items={INNER_SANCTUM_EQUIPMENT} heroes={heroes} party={party} setParty={setParty} updateHero={updateHero} addLog={addLog} sourceLabel="Inner Sanctum" />
                </>
              )}

            </div>
          )}
        </Panel>
      ))}
    </div>
  );
}

function spellTypeOf(spell) {
  const codes = (spell.special || "").split(",").map((s) => s.trim());
  if (codes.includes("T")) return "Touch";
  if (codes.includes("I")) return "Incantation";
  return "Ranged";
}
// Miscast Threshold (p62): base 95, -5 if wounded, -5 per AP of Focus, -1 per point of
// increased power. A roll of 95+ (or 90+ if wounded) miscasts.
function miscastThreshold({ wounded, focusAP, increasedPower }) {
  return 95 - (wounded ? 5 : 0) - focusAP * 5 - increasedPower;
}
// Miscast Table (p62, 1d10) and its Demon sub-table (p62, 1d4, for result 9).
const MISCAST_TABLE = [
  { roll: 1, text: "Through luck or skill, the wizard shapes the spell at the last second. Any DMG or Healing effect is maximised. Any other spell is cast without spending any Mana." },
  { roll: 2, text: "The wizard consumes Mana as if the spell had succeeded." },
  { roll: 3, text: "The wizard loses control of the spell. It takes a tremendous effort to stop it becoming a disaster — loses 3x the Mana cost for the spell." },
  { roll: 4, text: "The wizard's mind is wracked by images of the void. Loses 1d3 Sanity." },
  { roll: 5, text: "The wizard becomes unconscious and falls to the floor. Must make a CON test at the start of their next activation to wake up." },
  { roll: 6, text: "Confused, the wizard forgets the spell halfway through casting. Mana is consumed as a failed spell, and the wizard can't use that spell again until they've rested in a tavern." },
  { roll: 7, text: "A searing pain shoots through the wizard's mind. Loses 1d6 HP, ignoring armour and Natural Armour." },
  { roll: 8, text: "Visions of the Void are portrayed in the minds of all friendly characters within 3 squares. All of them lose 1d8 Sanity, and the wizard additionally loses 1d3 Sanity." },
  { roll: 9, text: "The wizard opens a portal to the Void and demons pour through. Roll on the Demon table." },
  { roll: 10, text: "A magic blast is unleashed from the wizard, causing 1d10 DMG to any character within 3 squares, ignoring armour and Natural Armour." },
];
const MISCAST_DEMON_TABLE = [
  { roll: 1, text: "1d3 Lesser Plague Demons." },
  { roll: 2, text: "1d3 Plague Demons — randomise weapon (draw a weapon card), Armour 0." },
  { roll: 3, text: "1d3 Blood Demons — randomise weapon (draw a weapon card), Armour 1." },
  { roll: 4, text: "1 Bloated Demon — 2 Support spells, 2 Ranged spells, and 2 Close Combat spells." },
];
// Full Hero Spell Casting resolution (p62-63 + the Combat chapter flowchart), corrected
// against the actual rules text: Touch spells need BOTH a CS+20 touch roll (parry/dodge-
// able, not modelled here) AND the standard Arcane Arts roll; dispel is only available to
// non-Touch, non-Close-Combat spells, targets the enemy's RS/2 (RDD), and a dispelled cast
// still costs the FULL intended Mana (only a plain failure costs half); miscast uses the
// same half-Mana-as-failure rule for every spell type, including Incantations.
function resolveSpellCast(hero, spell, opts) {
  const { focusAP, wounded, increasedPower, hasLOS, enemyAdjacent, inSettlement, canDispel, enemyRS } = opts;
  const type = spellTypeOf(spell);
  const powerAllowed = spell.school === "Restoration" || spell.school === "Destruction";
  const effectivePower = powerAllowed ? increasedPower : 0;
  const cost = (spell.mana || 0) + effectivePower * 2;

  if (type !== "Touch" && enemyAdjacent) {
    return { blocked: true, type, msg: "An enemy is adjacent — only Touch Spells may be cast." };
  }
  if (type === "Incantation" && !inSettlement) {
    return { blocked: true, type, msg: "Incantations can only be cast while in a settlement." };
  }
  if (type === "Ranged" && !hasLOS) {
    return { blocked: true, type, msg: "No line of sight to the target — can't cast. Choose a different action." };
  }

  const threshold = miscastThreshold({ wounded, focusAP, increasedPower: effectivePower });
  const aa = (Number(hero.skills.arcaneArts) || 0) + focusAP * 10;
  const aaTarget = aa - (spell.cv || 0);

  // Touch spells: CS+20 touch roll first (parry/dodge not modelled) — failing it costs
  // half Mana and skips the Arcane Arts roll entirely.
  if (type === "Touch") {
    const touchTarget = (Number(hero.skills.cs) || 0) + 20;
    const touchRoll = rollPercent();
    if (touchRoll > touchTarget) {
      return { type, touchTarget, touchRoll, touched: false, effectExecuted: false, manaDelta: -Math.floor(cost / 2), manaNote: "Failed to touch the target — half Mana lost.", cost, effectivePower };
    }
    const roll = rollPercent();
    const success = roll <= aaTarget;
    let manaDelta, manaNote, miscast = false, miscastRoll = null;
    if (success) {
      if (roll <= 5) { manaDelta = cost; manaNote = "Lucky roll (01-05) — Perfect Cast! Mana refunded, and any DMG/Healing is maximised."; }
      else manaDelta = -cost;
    } else {
      manaDelta = -Math.floor(cost / 2);
      manaNote = "Half Mana cost lost.";
      if (roll >= threshold) { miscast = true; miscastRoll = rollDie(10); }
    }
    return { type, touchTarget, touchRoll, touched: true, aaTarget, roll, success, effectExecuted: success, threshold, miscast, miscastRoll, manaDelta, manaNote, cost, effectivePower };
  }

  // Ranged / Incantation: single Arcane Arts roll (AA - CV).
  const roll = rollPercent();
  const success = roll <= aaTarget;
  let effectExecuted = false, dispelled = false, dispelRoll = null, dispelTarget = null;
  if (success && type === "Ranged" && canDispel) {
    dispelTarget = Math.floor((Number(enemyRS) || 0) / 2);
    dispelRoll = rollPercent();
    if (dispelRoll <= dispelTarget) dispelled = true;
    else effectExecuted = true;
  } else if (success) {
    effectExecuted = true;
  }

  let miscast = false, miscastRoll = null, incantationFailed = false;
  if (!success && roll >= threshold) { miscast = true; miscastRoll = rollDie(10); }
  else if (type === "Incantation" && !success) incantationFailed = true;

  let manaDelta, manaNote;
  if (effectExecuted) {
    if (roll <= 5) { manaDelta = cost; manaNote = "Lucky roll (01-05) — Perfect Cast! Mana refunded, and any DMG/Healing is maximised."; }
    else manaDelta = -cost;
  } else if (dispelled) {
    manaDelta = -cost;
    manaNote = "Dispelled — the full intended Mana is still spent.";
  } else {
    manaDelta = -Math.floor(cost / 2);
    manaNote = miscast ? "Miscast — Mana is used as though the spell had failed (half cost)." : "Half Mana cost lost.";
  }

  return { type, threshold, aa, checkTarget: aaTarget, roll, success, effectExecuted, dispelled, dispelRoll, dispelTarget, miscast, miscastRoll, incantationFailed, manaDelta, manaNote, cost, powerAllowed, effectivePower };
}

// Magic Scrolls (p63) — any hero may read a scroll using WIS instead of Arcane Arts, CV is
// reduced by 10 (min 0), and Focus is never allowed. The scroll itself is destroyed on a
// successful cast, a dispelled cast, or a miscast — a plain failure (or a missed touch) and
// the scroll survives to try again. Otherwise follows the same Touch/Ranged/Incantation
// flowchart and 95+ Miscast Threshold as normal casting.
function resolveScrollCast(hero, spell, opts) {
  const { wounded, hasLOS, enemyAdjacent, inSettlement, canDispel, enemyRS } = opts;
  const type = spellTypeOf(spell);
  const effectiveCV = Math.max(0, (spell.cv || 0) - 10);

  if (type !== "Touch" && enemyAdjacent) {
    return { blocked: true, type, msg: "An enemy is adjacent — only Touch Spells may be cast." };
  }
  if (type === "Incantation" && !inSettlement) {
    return { blocked: true, type, msg: "Incantations can only be cast while in a settlement." };
  }
  if (type === "Ranged" && !hasLOS) {
    return { blocked: true, type, msg: "No line of sight to the target — can't cast. Choose a different action." };
  }

  const threshold = miscastThreshold({ wounded, focusAP: 0, increasedPower: 0 });
  const wis = Number(hero.stats.WIS) || 0;
  const checkTarget = wis - effectiveCV;

  if (type === "Touch") {
    const touchTarget = (Number(hero.skills.cs) || 0) + 20;
    const touchRoll = rollPercent();
    if (touchRoll > touchTarget) {
      return { type, effectiveCV, touchTarget, touchRoll, touched: false, effectExecuted: false, scrollDestroyed: false };
    }
    const roll = rollPercent();
    const success = roll <= checkTarget;
    let miscast = false, miscastRoll = null;
    if (!success && roll >= threshold) { miscast = true; miscastRoll = rollDie(10); }
    return { type, effectiveCV, touchTarget, touchRoll, touched: true, wis, checkTarget, roll, success, effectExecuted: success, threshold, miscast, miscastRoll, scrollDestroyed: success || miscast };
  }

  const roll = rollPercent();
  const success = roll <= checkTarget;
  let effectExecuted = false, dispelled = false, dispelRoll = null, dispelTarget = null;
  if (success && type === "Ranged" && canDispel) {
    dispelTarget = Math.floor((Number(enemyRS) || 0) / 2);
    dispelRoll = rollPercent();
    if (dispelRoll <= dispelTarget) dispelled = true;
    else effectExecuted = true;
  } else if (success) {
    effectExecuted = true;
  }

  let miscast = false, miscastRoll = null, incantationFailed = false;
  if (!success && roll >= threshold) { miscast = true; miscastRoll = rollDie(10); }
  else if (type === "Incantation" && !success) incantationFailed = true;

  return { type, effectiveCV, threshold, wis, checkTarget, roll, success, effectExecuted, dispelled, dispelRoll, dispelTarget, miscast, miscastRoll, incantationFailed, scrollDestroyed: effectExecuted || dispelled || miscast };
}

function validateRecipeComponents(strength, components) {
  const rule = ALCHEMY_STRENGTH_RULES[strength];
  if (!rule) return "Pick a strength.";
  if (components.some((c) => !c)) return `Fill all ${rule.count} component slots.`;
  if (components.length !== rule.count) return `Needs exactly ${rule.count} components.`;
  if (new Set(components).size !== components.length) return "Every component must be unique.";
  const hasIngredient = components.some((c) => ALCHEMY_INGREDIENT_NAMES.includes(c));
  const hasPart = components.some((c) => ALCHEMY_PART_NAMES.includes(c));
  if (!hasIngredient) return "Must include at least one Ingredient.";
  if (!hasPart) return "Must include at least one Part.";
  return null;
}

function AlchemyTab({ heroes, updateHero, addLog }) {
  const [subTab, setSubTab] = useState("recipes");
  const [activeHeroId, setActiveHeroId] = useState("");
  const activeHero = heroes.find((h) => h.id === activeHeroId) || heroes[0];

  const addComponent = (hero, name, type, qty, exquisite) => {
    const next = addAlchemyComponent(hero, name, type, qty, exquisite);
    updateHero({ ...hero, alchemyComponents: next });
    return next;
  };
  const consumeComponents = (hero, names, exquisiteFlags) => {
    let next = hero.alchemyComponents;
    names.forEach((name) => {
      const useEx = exquisiteFlags[name];
      next = next.map((c) => {
        if (c.name !== name) return c;
        if (useEx && c.exquisiteQty > 0) return { ...c, exquisiteQty: c.exquisiteQty - 1 };
        return { ...c, qty: Math.max(0, c.qty - 1) };
      }).filter((c) => c.qty > 0 || c.exquisiteQty > 0);
    });
    return next;
  };

  // ---------- Recipe Book ----------
  const [newPotionName, setNewPotionName] = useState("");
  const [newStrength, setNewStrength] = useState("Standard");
  const [newComponents, setNewComponents] = useState(["", "", "", ""]);
  const [recipeFeedback, setRecipeFeedback] = useState(null);

  const learnRecipe = () => {
    if (!activeHero) return;
    const count = ALCHEMY_STRENGTH_RULES[newStrength].count;
    const components = newComponents.slice(0, count);
    const error = validateRecipeComponents(newStrength, components);
    if (error) { setRecipeFeedback({ text: error, tone: "bad" }); return; }
    if (!newPotionName.trim()) { setRecipeFeedback({ text: "Name the potion.", tone: "bad" }); return; }
    const recipe = { id: uid(), potionName: newPotionName.trim(), strength: newStrength, components };
    updateHero({ ...activeHero, alchemyRecipes: [...activeHero.alchemyRecipes, recipe] });
    setRecipeFeedback({ text: `${activeHero.name} learns the recipe for ${recipe.potionName}.`, tone: "good" });
    addLog(`${activeHero.name} writes down a new recipe: ${recipe.potionName} (${newStrength}) — ${components.join(" + ")}.`);
    setNewPotionName(""); setNewComponents(["", "", "", ""]);
  };
  const forgetRecipe = (id) => {
    if (!activeHero) return;
    const r = activeHero.alchemyRecipes.find((x) => x.id === id);
    updateHero({ ...activeHero, alchemyRecipes: activeHero.alchemyRecipes.filter((x) => x.id !== id) });
    addLog(`${activeHero.name} forgets the recipe for ${r?.potionName}.`);
  };

  // ---------- Mix a Potion ----------
  const allRecipesFor = (hero) => [...COMMON_RECIPES, ...(hero?.alchemyRecipes || [])];
  const [mixMode, setMixMode] = useState("recipe"); // "recipe" | "freeform"
  const [mixRecipeId, setMixRecipeId] = useState("");
  const [exquisiteFlags, setExquisiteFlags] = useState({});
  const [mixResult, setMixResult] = useState(null);
  const mixRecipe = allRecipesFor(activeHero).find((r) => r.id === mixRecipeId) || allRecipesFor(activeHero)[0];
  const [freeformStrength, setFreeformStrength] = useState("Standard");
  const [freeformComponents, setFreeformComponents] = useState(["", "", "", ""]);

  const componentAvailability = (hero, name) => {
    const c = hero?.alchemyComponents.find((x) => x.name === name);
    return { qty: c?.qty || 0, exquisiteQty: c?.exquisiteQty || 0 };
  };

  const mixPotion = () => {
    if (!activeHero || !mixRecipe) return;
    const hasBottle = activeHero.backpack.some((it) => it.name === "Empty Bottle");
    if (!hasBottle) { setMixResult({ ok: false, lines: [`${activeHero.name} has no Empty Bottle.`] }); return; }
    for (const name of mixRecipe.components) {
      const avail = componentAvailability(activeHero, name);
      const useEx = exquisiteFlags[name];
      const has = useEx ? avail.exquisiteQty > 0 : avail.qty + avail.exquisiteQty > 0;
      if (!has) { setMixResult({ ok: false, lines: [`Missing ${useEx ? "an exquisite " : ""}${name}.`] }); return; }
    }
    const anyExquisite = mixRecipe.components.some((n) => exquisiteFlags[n]);
    const target = (Number(activeHero.skills.alchemy) || 0) + 10 + (anyExquisite ? 10 : 0);
    const roll = rollPercent();
    const success = roll <= target;
    const nextComponents = consumeComponents(activeHero, mixRecipe.components, exquisiteFlags);
    if (success) {
      const nextBackpack = [
        ...activeHero.backpack.filter((it) => it.id !== activeHero.backpack.find((b) => b.name === "Empty Bottle").id),
        { id: uid(), name: mixRecipe.potionName, value: "", enc: 0, dur: "", slot: "backpack" },
      ];
      updateHero({ ...activeHero, alchemyComponents: nextComponents, backpack: nextBackpack });
      const line = `Rolled ${roll} vs ${target} — success! ${mixRecipe.potionName} mixed.`;
      setMixResult({ ok: true, lines: [line] });
      addLog(`${activeHero.name} mixes a potion: ${line}`);
    } else {
      updateHero({ ...activeHero, alchemyComponents: nextComponents });
      const line = `Rolled ${roll} vs ${target} — failed. Components lost, but the bottle survives.`;
      setMixResult({ ok: false, lines: [line] });
      addLog(`${activeHero.name} fails to mix a potion: ${line}`);
    }
    setExquisiteFlags({});
  };

  const mixFreeform = () => {
    if (!activeHero) return;
    const components = freeformComponents.slice(0, ALCHEMY_STRENGTH_RULES[freeformStrength].count);
    const error = validateRecipeComponents(freeformStrength, components);
    if (error) { setMixResult({ ok: false, lines: [error] }); return; }
    const hasBottle = activeHero.backpack.some((it) => it.name === "Empty Bottle");
    if (!hasBottle) { setMixResult({ ok: false, lines: [`${activeHero.name} has no Empty Bottle.`] }); return; }
    for (const name of components) {
      const avail = componentAvailability(activeHero, name);
      const useEx = exquisiteFlags[name];
      const has = useEx ? avail.exquisiteQty > 0 : avail.qty + avail.exquisiteQty > 0;
      if (!has) { setMixResult({ ok: false, lines: [`Missing ${useEx ? "an exquisite " : ""}${name}.`] }); return; }
    }
    const anyExquisite = components.some((n) => exquisiteFlags[n]);
    const target = (Number(activeHero.skills.alchemy) || 0) + (anyExquisite ? 10 : 0); // no known-recipe bonus
    const roll = rollPercent();
    const success = roll <= target;
    const nextComponents = consumeComponents(activeHero, components, exquisiteFlags);
    if (success) {
      const result = rollRandomPotion(freeformStrength);
      const nextBackpack = [
        ...activeHero.backpack.filter((it) => it.id !== activeHero.backpack.find((b) => b.name === "Empty Bottle").id),
        { id: uid(), name: result.potionName, value: "", enc: 0, dur: "", slot: "backpack" },
      ];
      // A successful no-recipe mix gets written down as a new recipe automatically (per the book's flowchart).
      const newRecipe = { id: uid(), potionName: result.potionName, strength: freeformStrength, components };
      updateHero({ ...activeHero, alchemyComponents: nextComponents, backpack: nextBackpack, alchemyRecipes: [...activeHero.alchemyRecipes, newRecipe] });
      const line = `Rolled ${roll} vs ${target} — success! Potions Table result: ${result.potionName}. Recipe written down for next time.`;
      setMixResult({ ok: true, lines: [line] });
      addLog(`${activeHero.name} mixes a potion (no recipe): ${line}`);
    } else {
      updateHero({ ...activeHero, alchemyComponents: nextComponents });
      const line = `Rolled ${roll} vs ${target} — failed. Components lost, but the bottle survives.`;
      setMixResult({ ok: false, lines: [line] });
      addLog(`${activeHero.name} fails to mix a potion (no recipe): ${line}`);
    }
    setExquisiteFlags({});
  };

  // ---------- Gather & Harvest ----------
  const [habitat, setHabitat] = useState("Roadside");
  const [gatherResult, setGatherResult] = useState(null);
  const gatherIngredients = () => {
    if (!activeHero) return;
    const roll = rollPercent();
    const target = Number(activeHero.skills.alchemy) || 0;
    if (roll > target) {
      setGatherResult({ ok: false, lines: [`Rolled ${roll} vs ${target} — nothing found.`] });
      addLog(`${activeHero.name} searches for ingredients (${habitat}): rolled ${roll} vs ${target} — nothing found.`);
      return;
    }
    const exquisite = roll <= 10;
    let hero = activeHero;
    const found = [];
    for (let i = 0; i < 2; i++) {
      const tableRoll = rollPercent();
      const entry = ingredientsTableLookup(habitat, tableRoll);
      if (entry) {
        found.push(entry.name);
        const next = addComponent(hero, entry.name, "Ingredient", 1, exquisite);
        hero = { ...hero, alchemyComponents: next };
      }
    }
    const line = `Rolled ${roll} vs ${target} — found ${found.join(" and ") || "nothing usable"}${exquisite ? " (Exquisite!)" : ""}.`;
    setGatherResult({ ok: true, lines: [line] });
    addLog(`${activeHero.name} gathers ingredients (${habitat}): ${line}`);
  };

  const [harvestSlots, setHarvestSlots] = useState(["", "", ""]);
  const [harvestResult, setHarvestResult] = useState(null);
  const monsterNames = Object.keys(MONSTER_PARTS_TABLE).sort();
  const harvestParts = () => {
    if (!activeHero) return;
    const targets = harvestSlots.filter(Boolean);
    if (targets.length === 0) { setHarvestResult({ ok: false, lines: ["Pick at least one fallen enemy."] }); return; }
    const roll = rollPercent();
    const target = Number(activeHero.skills.alchemy) || 0;
    if (roll > target) {
      setHarvestResult({ ok: false, lines: [`Rolled ${roll} vs ${target} — nothing harvested.`] });
      addLog(`${activeHero.name} harvests parts: rolled ${roll} vs ${target} — nothing harvested.`);
      return;
    }
    const exquisite = roll <= 10;
    let hero = activeHero;
    const lines = [`Rolled ${roll} vs ${target} — success!${exquisite ? " (Exquisite!)" : ""}`];
    targets.forEach((monster) => {
      const entry = MONSTER_PARTS_TABLE[monster];
      if (!entry) { lines.push(`${monster}: nothing usable.`); return; }
      const qty = rollDiceString(entry.qty);
      const next = addComponent(hero, entry.part, "Part", qty, exquisite);
      hero = { ...hero, alchemyComponents: next };
      lines.push(`${monster}: +${qty} ${entry.part}.`);
    });
    setHarvestResult({ ok: true, lines });
    addLog(`${activeHero.name} harvests parts: ${lines.join(" ")}`);
  };

  const heroPicker = (
    <select
      value={activeHero?.id || ""}
      onChange={(e) => setActiveHeroId(e.target.value)}
      className="w-full text-xs rounded px-2 py-1.5 mb-2"
      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
    >
      {heroes.map((h) => <option key={h.id} value={h.id}>{h.name} (Alchemy {h.skills.alchemy ?? 0})</option>)}
    </select>
  );

  if (heroes.length === 0) {
    return <Panel><p className="text-sm text-center py-4" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>No heroes yet.</p></Panel>;
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {[["recipes", "Recipe Book"], ["mix", "Mix a Potion"], ["gather", "Gather & Harvest"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className="flex-1 text-xs px-2 py-2 rounded font-bold active:scale-95 transition-transform"
            style={{ background: subTab === key ? palette.crimsonDark : "#00000010", color: subTab === key ? palette.parchment : palette.ink, fontFamily: "Cinzel, serif" }}
          >
            {label}
          </button>
        ))}
      </div>

      {heroPicker}

      {subTab === "recipes" && (
        <div>
          <Panel className="mb-4">
            <SectionTitle icon={ScrollText}>Common Recipes</SectionTitle>
            <p className="text-xs mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              Widely known among alchemists — any hero with the Alchemy skill can mix these without learning them first.
            </p>
            <div className="space-y-1.5">
              {COMMON_RECIPES.map((r) => (
                <div key={r.id} className="rounded p-2" style={{ background: "#00000008" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{r.potionName} <span style={{ color: palette.inkSoft, fontWeight: 400 }}>({r.strength})</span></span>
                    <button
                      onClick={() => { setMixRecipeId(r.id); setSubTab("mix"); }}
                      className="text-[10px] px-2 py-1 rounded font-semibold active:scale-95 transition-transform"
                      style={{ background: palette.gold, color: palette.charcoal }}
                    >
                      Mix This
                    </button>
                  </div>
                  <p className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>{r.components.join(" + ")}</p>
                  {POTION_EFFECTS[r.potionName] && <p className="text-[10px] mt-0.5" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>{POTION_EFFECTS[r.potionName]}</p>}
                </div>
              ))}
            </div>
          </Panel>

          {activeHero && (
            <Panel className="mb-4">
              <SectionTitle icon={ScrollText}>{activeHero.name}'s Recipes</SectionTitle>
              {activeHero.alchemyRecipes.length === 0 ? (
                <p className="text-xs italic mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>No custom recipes learned yet.</p>
              ) : (
                <div className="space-y-1.5 mb-2">
                  {activeHero.alchemyRecipes.map((r) => (
                    <div key={r.id} className="rounded p-2" style={{ background: "#00000008" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>{r.potionName} <span style={{ color: palette.inkSoft, fontWeight: 400 }}>({r.strength})</span></span>
                        <div className="flex gap-1">
                          <button onClick={() => { setMixRecipeId(r.id); setSubTab("mix"); }} className="text-[10px] px-2 py-1 rounded font-semibold" style={{ background: palette.gold, color: palette.charcoal }}>Mix This</button>
                          <button onClick={() => forgetRecipe(r.id)} className="text-[10px] px-1.5 py-1 rounded" style={{ color: palette.crimson }}><X size={11} /></button>
                        </div>
                      </div>
                      <p className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>{r.components.join(" + ")}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          <Panel>
            <SectionTitle icon={Plus}>Learn a New Recipe</SectionTitle>
            <p className="text-xs mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>No roll needed — just write it down. Pick the strength first to set how many components you need.</p>
            <input
              value={newPotionName}
              onChange={(e) => setNewPotionName(e.target.value)}
              placeholder="Potion name"
              list="potion-names"
              className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            />
            <datalist id="potion-names">
              {Object.keys(POTION_EFFECTS).map((n) => <option key={n} value={n} />)}
            </datalist>
            {POTION_EFFECTS[newPotionName] && <p className="text-[10px] mb-1.5 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>{POTION_EFFECTS[newPotionName]}</p>}
            <select
              value={newStrength}
              onChange={(e) => { setNewStrength(e.target.value); setNewComponents(["", "", "", ""]); }}
              className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              {Object.entries(ALCHEMY_STRENGTH_RULES).map(([k, v]) => <option key={k} value={k}>{k} — {v.label}</option>)}
            </select>
            {Array.from({ length: ALCHEMY_STRENGTH_RULES[newStrength].count }).map((_, i) => (
              <select
                key={i}
                value={newComponents[i]}
                onChange={(e) => setNewComponents((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))}
                className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                <option value="">Component {i + 1}…</option>
                <optgroup label="Ingredients">
                  {ALCHEMY_INGREDIENT_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </optgroup>
                <optgroup label="Parts">
                  {ALCHEMY_PART_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </optgroup>
              </select>
            ))}
            <button onClick={learnRecipe} className="w-full text-xs px-2 py-2 rounded font-bold active:scale-95 transition-transform" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
              Learn Recipe
            </button>
            {recipeFeedback && (
              <p className="text-xs mt-1.5 font-semibold" style={{ color: recipeFeedback.tone === "good" ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>{recipeFeedback.text}</p>
            )}
          </Panel>
        </div>
      )}

      {subTab === "mix" && (
        <Panel>
          <SectionTitle icon={Sparkles}>Mix a Potion</SectionTitle>
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => { setMixMode("recipe"); setMixResult(null); }}
              className="flex-1 text-xs px-2 py-1.5 rounded font-semibold active:scale-95 transition-transform"
              style={{ background: mixMode === "recipe" ? palette.crimsonDark : "#00000010", color: mixMode === "recipe" ? palette.parchment : palette.ink }}
            >
              Known Recipe
            </button>
            <button
              onClick={() => { setMixMode("freeform"); setMixResult(null); }}
              className="flex-1 text-xs px-2 py-1.5 rounded font-semibold active:scale-95 transition-transform"
              style={{ background: mixMode === "freeform" ? palette.crimsonDark : "#00000010", color: mixMode === "freeform" ? palette.parchment : palette.ink }}
            >
              No Recipe (Random)
            </button>
          </div>

          {mixMode === "recipe" && (
            allRecipesFor(activeHero).length === 0 ? (
              <p className="text-xs italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>No recipes available.</p>
            ) : (
              <>
                <select
                  value={mixRecipe?.id || ""}
                  onChange={(e) => setMixRecipeId(e.target.value)}
                  className="w-full text-xs rounded px-2 py-1.5 mb-2"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  {allRecipesFor(activeHero).map((r) => <option key={r.id} value={r.id}>{r.potionName} ({r.strength})</option>)}
                </select>
                {mixRecipe && (
                  <>
                    <div className="rounded p-2 mb-2" style={{ background: "#00000008" }}>
                      {mixRecipe.components.map((name) => {
                        const avail = componentAvailability(activeHero, name);
                        const has = avail.qty + avail.exquisiteQty > 0;
                        return (
                          <div key={name} className="flex items-center justify-between text-xs py-1" style={{ fontFamily: "Crimson Pro, serif" }}>
                            <span style={{ color: has ? palette.ink : palette.crimson }}>{name} ({avail.qty} + {avail.exquisiteQty} exquisite)</span>
                            {avail.exquisiteQty > 0 && (
                              <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft }}>
                                <input type="checkbox" checked={!!exquisiteFlags[name]} onChange={(e) => setExquisiteFlags((prev) => ({ ...prev, [name]: e.target.checked }))} />
                                use exquisite
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                      Roll target: Alchemy {activeHero?.skills.alchemy ?? 0} + 10 (recipe){mixRecipe.components.some((n) => exquisiteFlags[n]) ? " + 10 (exquisite)" : ""} = <b style={{ color: palette.ink }}>{(Number(activeHero?.skills.alchemy) || 0) + 10 + (mixRecipe.components.some((n) => exquisiteFlags[n]) ? 10 : 0)}</b>
                    </p>
                    <button onClick={mixPotion} className="w-full text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
                      Mix It
                    </button>
                  </>
                )}
              </>
            )
          )}

          {mixMode === "freeform" && (
            <>
              <p className="text-xs mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                No +10 recipe bonus. A success rolls on the Potions Table for a random result — and gets written down as a new recipe automatically for next time.
              </p>
              <select
                value={freeformStrength}
                onChange={(e) => { setFreeformStrength(e.target.value); setFreeformComponents(["", "", "", ""]); setExquisiteFlags({}); }}
                className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                {Object.entries(ALCHEMY_STRENGTH_RULES).map(([k, v]) => <option key={k} value={k}>{k} — {v.label}</option>)}
              </select>
              {Array.from({ length: ALCHEMY_STRENGTH_RULES[freeformStrength].count }).map((_, i) => {
                const name = freeformComponents[i];
                const avail = name ? componentAvailability(activeHero, name) : null;
                return (
                  <div key={i} className="flex items-center gap-1.5 mb-1.5">
                    <select
                      value={name}
                      onChange={(e) => setFreeformComponents((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))}
                      className="flex-1 text-xs rounded px-2 py-1.5"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                    >
                      <option value="">Component {i + 1}…</option>
                      <optgroup label="Ingredients">
                        {ALCHEMY_INGREDIENT_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </optgroup>
                      <optgroup label="Parts">
                        {ALCHEMY_PART_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </optgroup>
                    </select>
                    {avail && (
                      <span className="text-[10px] shrink-0" style={{ color: avail.qty + avail.exquisiteQty > 0 ? palette.inkSoft : palette.crimson }}>
                        {avail.qty}+{avail.exquisiteQty}ex
                      </span>
                    )}
                    {avail && avail.exquisiteQty > 0 && (
                      <input type="checkbox" checked={!!exquisiteFlags[name]} onChange={(e) => setExquisiteFlags((prev) => ({ ...prev, [name]: e.target.checked }))} title="Use exquisite" />
                    )}
                  </div>
                );
              })}
              <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
                Roll target: Alchemy {activeHero?.skills.alchemy ?? 0}{freeformComponents.some((n) => n && exquisiteFlags[n]) ? " + 10 (exquisite)" : ""} = <b style={{ color: palette.ink }}>{(Number(activeHero?.skills.alchemy) || 0) + (freeformComponents.some((n) => n && exquisiteFlags[n]) ? 10 : 0)}</b>
              </p>
              <button onClick={mixFreeform} className="w-full text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
                Mix It
              </button>
            </>
          )}

          {mixResult && (
            <div className="rounded p-2 mt-2" style={{ background: "#fff", border: `1px solid ${mixResult.ok ? palette.forest : palette.crimson}` }}>
              {mixResult.lines.map((l, i) => <p key={i} className="text-xs font-semibold" style={{ color: mixResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>{l}</p>)}
            </div>
          )}
        </Panel>
      )}

      {subTab === "gather" && (
        <div>
          <Panel className="mb-4">
            <SectionTitle icon={Wheat}>Gather Ingredients</SectionTitle>
            <p className="text-xs mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>Once per day during overland travel, using the party's best alchemist.</p>
            <select value={habitat} onChange={(e) => setHabitat(e.target.value)} className="w-full text-xs rounded px-2 py-1.5 mb-2" style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}>
              {HABITATS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <button onClick={gatherIngredients} className="w-full text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
              Gather ({activeHero?.skills.alchemy ?? 0})
            </button>
            {gatherResult && (
              <div className="rounded p-2 mt-2" style={{ background: "#fff", border: `1px solid ${gatherResult.ok ? palette.forest : palette.crimson}` }}>
                {gatherResult.lines.map((l, i) => <p key={i} className="text-xs font-semibold" style={{ color: gatherResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>{l}</p>)}
              </div>
            )}
          </Panel>

          <Panel className="mb-4">
            <SectionTitle icon={Skull}>Harvest Parts</SectionTitle>
            <p className="text-xs mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>Up to 3 dead enemies in LOS, 1 Alchemy roll for all of them.</p>
            {[0, 1, 2].map((i) => (
              <select
                key={i}
                value={harvestSlots[i]}
                onChange={(e) => setHarvestSlots((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))}
                className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                <option value="">Enemy {i + 1}…</option>
                {monsterNames.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            ))}
            <button onClick={harvestParts} className="w-full text-sm px-3 py-2 rounded font-bold active:scale-95 transition-transform" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
              Harvest ({activeHero?.skills.alchemy ?? 0})
            </button>
            {harvestResult && (
              <div className="rounded p-2 mt-2" style={{ background: "#fff", border: `1px solid ${harvestResult.ok ? palette.forest : palette.crimson}` }}>
                {harvestResult.lines.map((l, i) => <p key={i} className="text-xs font-semibold" style={{ color: harvestResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>{l}</p>)}
              </div>
            )}
          </Panel>

          {activeHero && (
            <Panel>
              <SectionTitle icon={Coins}>{activeHero.name}'s Components</SectionTitle>
              {activeHero.alchemyComponents.length === 0 ? (
                <p className="text-xs italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>None yet.</p>
              ) : (
                <div className="space-y-1">
                  {activeHero.alchemyComponents.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs rounded px-2 py-1" style={{ background: "#00000008", fontFamily: "Crimson Pro, serif" }}>
                      <span style={{ color: palette.ink }}>{c.name} <span style={{ color: palette.inkSoft }}>({c.type})</span></span>
                      <span style={{ color: palette.inkSoft }}>{c.qty} + {c.exquisiteQty} exquisite</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}


// Encounter Roller (Bestiary p21-40) — 1d20 + X (X = 10 per hero level above 1) against
// the faction table for the current quest, auto-rolling the Number formula for each
// result and linking to Monster Table stats where the name resolves.
function EncounterRoller({ heroes, addLog }) {
  const factionNames = Object.keys(ENCOUNTER_TABLES);
  const [faction, setFaction] = useState(factionNames[0]);
  const [result, setResult] = useState(null);

  const highestLevel = heroes.length ? Math.max(...heroes.map((h) => h.level || 1)) : 1;
  const levelBonus = (highestLevel - 1) * 10;

  const roll = () => {
    const d20 = rollDie(20);
    const total = d20 + levelBonus;
    const table = ENCOUNTER_TABLES[faction];
    const row = findEncounterRow(table, Math.min(total, 110));
    if (!row) {
      setResult({ d20, total, row: null });
      return;
    }
    const rolled = row.entries.map((e) => ({
      ...e,
      count: rollEncounterNumber(e.number),
      stats: findMonsterStatsForEncounter(e.name),
    }));
    setResult({ d20, total, row, rolled });
    const summary = rolled.map((e) => `${e.count}x ${e.name}`).join(", ");
    addLog(`Encounter roll (${faction}): 1d20 (${d20}) + ${levelBonus} = ${total} — ${summary}.`);
  };

  return (
    <Panel className="mb-4">
      <SectionTitle icon={Skull}>Encounter Roller</SectionTitle>
      <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
        Faction (set by the quest you're running):
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {factionNames.map((f) => (
          <button
            key={f}
            onClick={() => { setFaction(f); setResult(null); }}
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: faction === f ? palette.crimson : "#00000010", color: faction === f ? palette.parchment : palette.ink }}
          >
            {f}
          </button>
        ))}
      </div>
      <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
        1d20 + {levelBonus} (highest hero level {highestLevel})
      </p>
      <button
        onClick={roll}
        className="w-full flex items-center justify-center gap-2 py-2 rounded font-bold text-sm mb-2"
        style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
      >
        <Dice5 size={14} /> Roll Encounter
      </button>
      {result && (
        <div className="text-sm rounded p-3 space-y-2" style={{ background: palette.charcoal, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}>
          <div className="text-xs font-bold" style={{ color: palette.goldSoft, fontFamily: "JetBrains Mono, monospace" }}>
            d20 {result.d20} + {levelBonus} = {result.total}
          </div>
          {!result.row && (
            <p className="text-xs italic">
              Not yet transcribed into the app — that part of the {faction} table wasn't in the source photos.{" "}
              <button onClick={roll} className="underline" style={{ color: palette.goldSoft }}>Reroll</button>
            </p>
          )}
          {result.rolled && result.rolled.map((e, i) => (
            <div key={i} className="rounded p-2" style={{ background: "#00000025" }}>
              <div className="font-bold text-sm">{e.count}x {e.name}</div>
              {e.weapons && <div className="text-xs" style={{ color: palette.parchment, opacity: 0.75 }}>Weapons: {e.weapons}</div>}
              <div className="text-xs" style={{ color: palette.parchment, opacity: 0.75 }}>Armour: {e.armour || 0}</div>
              {e.special && <div className="text-xs" style={{ color: palette.parchment, opacity: 0.75 }}>Special: {e.special}</div>}
              {e.stats && (
                <div className="text-xs mt-1 pt-1" style={{ color: palette.goldSoft, borderTop: "1px solid #ffffff20", fontFamily: "JetBrains Mono, monospace" }}>
                  CS {e.stats.cs} · RS {e.stats.rs} · HP {e.stats.hp} · DMG {e.stats.dmg} · NA {Number(e.stats.na) + Number(e.armour || 0)} · Type {e.stats.type}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}


function BehaviourWalker() {
  const [category, setCategory] = useState(BEHAVIOUR_CATEGORIES[0]);
  const [situation, setSituation] = useState(null);
  const [result, setResult] = useState(null);

  const situationOptions = () => {
    if (category === "Magic User") return ["Adjacent to a hero", "No LOS to any hero", "LOS to a hero, not adjacent"];
    if (category === "Humanoid (Close Combat)" || category === "Beast" || category === "Higher Undead" || category === "Lower Undead")
      return ["Adjacent to a hero", "Within M spaces, not adjacent", "More than M spaces away"];
    if (category === "Humanoid (Missile Weapon)") return ["Adjacent to a hero (CC weapon)", "Within 2 squares, ranged weapon", "Needs to reposition/reload", "Ready to act — roll"];
    return [];
  };

  const resolve = () => {
    if (category === "Magic User") {
      if (situation === "Adjacent to a hero") { setResult(rollD10Table(MAGIC_USER_ADJACENT_TABLE)); return; }
      if (situation === "No LOS to any hero") { setResult(rollD10Table(MAGIC_USER_NO_LOS_TABLE)); return; }
      setResult(rollD10Table(MAGIC_USER_LOS_TABLE));
      return;
    }
    if (category === "Humanoid (Missile Weapon)") {
      if (situation === "Adjacent to a hero (CC weapon)") { setResult(rollD10Table(ADJACENT_TABLES[category])); return; }
      if (situation === "Within 2 squares, ranged weapon") { setResult({ r: null, action: "Move up to M squares away but remain in LOS, and reload at the same time. If unable to move away, switch to a close combat weapon." }); return; }
      if (situation === "Needs to reposition/reload") { setResult({ r: null, action: "Move up to M spaces to a position with better odds to hit (including climbing objects), reloading at the same time. Skip this if it already repositioned this turn — then just reload." }); return; }
      const missileFinalTable = [
        { min: 1, max: 2, action: "Aim (no need to define target yet)" },
        { min: 3, max: 7, action: "Shoot — target priority: a Wizard/Warrior Priest mid-spell or prayer first; otherwise roll 1d10: 1-4 closest hero, 5-7 hero with a ranged weapon, 8-10 magic user (randomise between ties)" },
        { min: 8, max: 10, action: "Use Skill/Special Talent (Shoot if N/A)" },
      ];
      setResult(rollD10Table(missileFinalTable));
      return;
    }
    if (situation === "Adjacent to a hero") { setResult(rollD10Table(ADJACENT_TABLES[category])); return; }
    if (situation === "Within M spaces, not adjacent") {
      if (category === "Humanoid (Close Combat)") { setResult(rollD10Table(HUMANOID_CC_WITHIN_M_TABLE)); return; }
      if (category === "Lower Undead") { setResult({ r: null, action: "Move adjacent to the closest hero, taking the shortest route. Will not avoid traps or pits, and cannot climb out of pits." }); return; }
      setResult({ r: null, action: "Perform a Charge Attack against the closest hero." });
      return;
    }
    // More than M spaces away
    if (category === "Lower Undead") { setResult({ r: null, action: "Move towards the closest hero. Will not avoid traps or pits, and cannot climb out of pits." }); return; }
    setResult({ r: null, action: "Move towards the closest hero, avoiding traps not placed by heroes if possible (may climb objects if needed)." });
  };

  return (
    <Panel className="mb-4">
      <SectionTitle icon={Skull}>Roll Enemy Action</SectionTitle>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {BEHAVIOUR_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => { setCategory(c); setSituation(null); setResult(null); }}
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: category === c ? palette.crimson : "#00000010", color: category === c ? palette.parchment : palette.ink }}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>What's the situation?</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {situationOptions().map((s) => (
          <button
            key={s}
            onClick={() => { setSituation(s); setResult(null); }}
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: situation === s ? palette.forestDark : "#00000010", color: situation === s ? palette.parchment : palette.ink }}
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={resolve}
        disabled={!situation}
        className="w-full flex items-center justify-center gap-2 py-2 rounded font-bold text-sm mb-2"
        style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif", opacity: situation ? 1 : 0.5 }}
      >
        <Dice5 size={14} /> Resolve
      </button>
      {result && (
        <div className="text-sm rounded p-3" style={{ background: palette.charcoal, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}>
          {result.r != null && <div className="text-xs mb-1 font-bold" style={{ color: palette.goldSoft, fontFamily: "JetBrains Mono, monospace" }}>Rolled {result.r}</div>}
          {result.action}
        </div>
      )}
      <p className="text-xs mt-3 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
        Reminder: an enemy always ends its turn with as few heroes behind it as possible. If the rules ever leave the outcome unclear, move it in whichever way favours the enemy most, and randomise between equal options.
      </p>
    </Panel>
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

      <EncounterRoller heroes={heroes} addLog={addLog} />

      <BehaviourWalker />

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
    let anyLeveledUp = false;
    heroes.forEach((h) => {
      const withXP = { ...h, xp: h.xp + Number(xpAmount) };
      const { hero: leveled, events } = applyAutoLevelUps(withXP);
      updateHero(h.id, leveled);
      if (events.length > 0) {
        anyLeveledUp = true;
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
    // Always confirm the award itself — level-up toasts are a bonus, not a
    // substitute, so a click with no level-ups still gives visible feedback.
    if (!anyLeveledUp) {
      pushToast && pushToast(
        `+${xpAmount} XP awarded`,
        `Given to all ${heroes.length} hero${heroes.length === 1 ? "" : "es"}.`
      );
    }
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
          Use "Start of Turn" on the Turn tab to roll the Scenario die and Threat automatically each turn, or the buttons above for one-off Threat changes.
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

  const [throwBase, setThrowBase] = useState(30);
  const [throwChecked, setThrowChecked] = useState({});
  const [throwResult, setThrowResult] = useState(null);
  const [throwHeroPick, setThrowHeroPick] = useState("");
  const throwSumChecked = THROW_POTION_MODS.reduce((s, m) => (throwChecked[m.label] ? s + m.value : s), 0);
  const throwEffective = clamp(throwBase + throwSumChecked, 0, 100);
  const applyThrowHeroSkill = (heroId) => {
    setThrowHeroPick(heroId);
    const h = heroes.find((x) => x.id === heroId);
    if (!h) return;
    const penalty = encumbranceOver(h) ? -10 : 0;
    setThrowBase(h.skills.rs + penalty);
  };
  const rollThrow = () => {
    const r = rollPercent();
    let outcome, note;
    if (r <= 5) { outcome = "PERFECT"; note = "Hits the intended target — and rolls low enough it's an especially clean throw."; }
    else if (r <= throwEffective) { outcome = "HIT"; note = "The potion lands on the intended square."; }
    else { outcome = "MISS"; note = "Scatters to a random square adjacent to the target (or, if not adjacent to the target and the throw was through a doorway, one of the 2 squares in front of the door instead)."; }
    setThrowResult({ r, outcome, note });
  };

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
    setResult({ r, outcome, isBloodlust: r <= 5, isDoubleZero: r === 100 });
  };

  // Damage calc
  const [weaponDmg, setWeaponDmg] = useState(0);
  const [db, setDb] = useState(0);
  const [na, setNa] = useState(0);
  const [armour, setArmour] = useState(0);
  const dmgTotal = Math.max(0, Number(weaponDmg || 0) + Number(db || 0) - Number(na || 0) - Number(armour || 0));

  const [hitLocHero, setHitLocHero] = useState("");
  const [hitLocResult, setHitLocResult] = useState(null);
  const HIT_LOCATIONS = [
    { min: 1, max: 1, loc: "Head", note: "Costs 1 Sanity." },
    { min: 2, max: 2, loc: "Arms", note: "No automatic effect tracked here." },
    { min: 3, max: 5, loc: "Torso", note: "Check gear — roll 1d10 against Quick Slots." },
    { min: 6, max: 6, loc: "Legs", note: "No automatic effect tracked here." },
  ];
  const rollHitLocation = () => {
    const r = rollDie(6);
    const entry = HIT_LOCATIONS.find((e) => r >= e.min && r <= e.max);
    setHitLocResult({ roll: r, loc: entry.loc, note: entry.note });
  };

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
  const [focusAP, setFocusAP] = useState(0);
  const [wounded, setWounded] = useState(false);
  const [increasedPower, setIncreasedPower] = useState(0);
  const [hasLOS, setHasLOS] = useState(true);
  const [enemyAdjacent, setEnemyAdjacent] = useState(false);
  const [inSettlement, setInSettlement] = useState(false);
  const [canDispel, setCanDispel] = useState(false);
  const [enemyRS, setEnemyRS] = useState(0);
  const castHero = heroes.find((h) => h.id === castHeroPick);
  const chosenSpell = SPELLS.find((s) => s.name === castSpellPick);
  const chosenSpellType = chosenSpell ? spellTypeOf(chosenSpell) : null;
  const powerAllowedFor = chosenSpell && (chosenSpell.school === "Restoration" || chosenSpell.school === "Destruction");
  const maxPower = castHero ? Math.min(5, castHero.level || 1) : 5;

  // Read a Magic Scroll
  const [scrollHeroPick, setScrollHeroPick] = useState("");
  const [scrollItemPick, setScrollItemPick] = useState("");
  const [scrollResult, setScrollResult] = useState(null);
  const [scrollWounded, setScrollWounded] = useState(false);
  const [scrollHasLOS, setScrollHasLOS] = useState(true);
  const [scrollEnemyAdjacent, setScrollEnemyAdjacent] = useState(false);
  const [scrollInSettlement, setScrollInSettlement] = useState(false);
  const [scrollCanDispel, setScrollCanDispel] = useState(false);
  const [scrollEnemyRS, setScrollEnemyRS] = useState(0);
  const scrollHero = heroes.find((h) => h.id === scrollHeroPick);
  const heroScrolls = scrollHero ? scrollHero.backpack.filter((it) => it.name.startsWith("Scroll of ")) : [];
  const chosenScrollItem = heroScrolls.find((it) => it.id === scrollItemPick);
  const chosenScrollSpell = chosenScrollItem ? SPELLS.find((s) => s.name === chosenScrollItem.name.replace(/^Scroll of /, "")) : null;
  const chosenScrollType = chosenScrollSpell ? spellTypeOf(chosenScrollSpell) : null;
  const readScroll = () => {
    if (!scrollHero || !chosenScrollSpell || !chosenScrollItem) return;
    const r = resolveScrollCast(scrollHero, chosenScrollSpell, {
      wounded: scrollWounded, hasLOS: scrollHasLOS, enemyAdjacent: scrollEnemyAdjacent,
      inSettlement: scrollInSettlement, canDispel: scrollCanDispel, enemyRS: scrollEnemyRS,
    });
    if (r.blocked) { setScrollResult({ ok: false, lines: [r.msg], destroyed: false }); return; }

    const lines = [];
    if (r.type === "Touch") {
      lines.push(`Touch roll: ${r.touchRoll} vs ${r.touchTarget} (CS+20) — ${r.touched ? "touched!" : "missed."}`);
      if (r.touched) lines.push(`WIS roll: ${r.roll} vs ${r.checkTarget} (WIS ${r.wis} − CV ${r.effectiveCV}) — ${r.success ? "success! " + chosenScrollSpell.name + " takes effect." : "failed."}`);
    } else {
      lines.push(`Rolled ${r.roll} vs ${r.checkTarget} (WIS ${r.wis} − CV ${r.effectiveCV}).`);
      if (r.type === "Incantation") {
        if (r.effectExecuted) lines.push(`Success! ${chosenScrollSpell.name} takes effect.`);
        else if (r.incantationFailed) lines.push(`Incantation failed.`);
      } else {
        if (r.effectExecuted) lines.push(`Success! ${chosenScrollSpell.name} takes effect.`);
        else if (r.dispelled) lines.push(`Cast succeeded, but the enemy dispelled it (rolled ${r.dispelRoll} vs their RS/2 = ${r.dispelTarget}).`);
        else lines.push(`Cast failed.`);
      }
    }
    if (r.miscast) {
      const entry = MISCAST_TABLE.find((m) => m.roll === r.miscastRoll);
      lines.push(`MISCAST! Rolled ${r.miscastRoll} on the Miscast Table: ${entry.text}`);
      if (r.miscastRoll === 9) lines.push(`(Roll 1d4 on the Demon table to see what materialises.)`);
    }
    lines.push(r.scrollDestroyed ? "The scroll crumbles to ash." : "The scroll survives — it can be read again.");

    if (r.scrollDestroyed) {
      updateHero({ ...scrollHero, backpack: scrollHero.backpack.filter((it) => it.id !== chosenScrollItem.id) });
      setScrollItemPick("");
    }
    setScrollResult({ ok: r.effectExecuted, lines, destroyed: r.scrollDestroyed });
    addLog && addLog(`${scrollHero.name} reads a Scroll of ${chosenScrollSpell.name}: ${lines.join(" ")}`);
  };
  const castSpell = () => {
    if (!castHero || !chosenSpell) return;
    const r = resolveSpellCast(castHero, chosenSpell, { focusAP, wounded, increasedPower, hasLOS, enemyAdjacent, inSettlement, canDispel, enemyRS });
    if (r.blocked) { setCastResult({ ok: false, lines: [r.msg] }); return; }
    const cur = Math.max(0, castHero.mana.cur + r.manaDelta); // Perfect Cast may briefly exceed max — don't clamp the top.
    updateHero({ ...castHero, mana: { ...castHero.mana, cur } });

    const lines = [];
    if (r.type === "Touch") {
      lines.push(`Touch roll: ${r.touchRoll} vs ${r.touchTarget} (CS+20) — ${r.touched ? "touched!" : "missed."}`);
      if (r.touched) lines.push(`Arcane Arts roll: ${r.roll} vs ${r.aaTarget} — ${r.success ? "success! " + chosenSpell.name + " takes effect." : "failed."}`);
    } else {
      lines.push(`Rolled ${r.roll} vs ${r.checkTarget} (AA-CV).`);
      if (r.type === "Incantation") {
        if (r.effectExecuted) lines.push(`Success! ${chosenSpell.name} takes effect.`);
        else if (r.incantationFailed) lines.push(`Incantation failed.`);
      } else {
        if (r.effectExecuted) lines.push(`Success! ${chosenSpell.name} takes effect.`);
        else if (r.dispelled) lines.push(`Cast succeeded, but the enemy dispelled it (rolled ${r.dispelRoll} vs their RS/2 = ${r.dispelTarget}).`);
        else lines.push(`Cast failed.`);
      }
    }
    if (r.miscast) {
      const entry = MISCAST_TABLE.find((m) => m.roll === r.miscastRoll);
      lines.push(`MISCAST! Rolled ${r.miscastRoll} on the Miscast Table: ${entry.text}`);
      if (r.miscastRoll === 9) lines.push(`(Roll 1d4 on the Demon table to see what materialises.)`);
    }
    if (r.manaNote) lines.push(r.manaNote);
    if (powerAllowedFor && r.effectivePower > 0 && r.effectExecuted) {
      const bonusLabel = chosenSpell.school === "Restoration" ? "Healing" : "DMG";
      lines.push(`Increased Power +${r.effectivePower}: add +${r.effectivePower} to this spell's own ${bonusLabel} when you roll it (not a separate effect).`);
    }
    lines.push(`Mana: ${castHero.mana.cur} → ${cur}/${castHero.mana.max}.`);

    setCastResult({ ok: r.effectExecuted, lines });
    addLog && addLog(`${castHero.name} casts ${chosenSpell.name}: ${lines.join(" ")}`);
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
        {[["cc", "Close Combat", Swords], ["ranged", "Ranged", Dice5], ["throw", "Throw Potion", FlaskConical], ["damage", "Damage", Shield], ["check", "Stat/Skill Check", Brain], ["spells", "Spells", Sparkles], ["scroll", "Read Scroll", ScrollText], ["prayers", "Prayers", Heart]].map(([key, label, Icon]) => (
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
          {result && result.outcome !== "FAILURE" && (
            <div className="mt-2 rounded p-2.5" style={{ background: "#00000008" }}>
              <p className="text-xs" style={{ color: palette.ink, fontFamily: "Crimson Pro, serif" }}>
                <b>Hit.</b> Next, work out Damage: weapon DMG + Damage Bonus − enemy Natural Armour − Armour. Roll Hit Location there too if it applies to this attack.
                {result.isBloodlust && " Bloodlust! Roll DMG twice and take the higher — or, if this was a Power Attack, DMG is automatic max instead."}
              </p>
              <button
                onClick={() => { setMode("damage"); setResult(null); }}
                className="mt-2 text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5"
                style={{ background: palette.crimson, color: palette.parchment, fontFamily: "Crimson Pro, serif" }}
              >
                <Shield size={12} /> Go to Damage
              </button>
            </div>
          )}
          {result && result.isDoubleZero && (
            <p className="text-xs mt-2 italic" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>
              Rolled 00 — if the attacker is a hero, their weapon takes damage; if the attacker is an enemy, it drops its weapon (or falls over if unarmed).
            </p>
          )}
        </Panel>
      )}

      {mode === "throw" && (
        <Panel className="mb-4">
          <SectionTitle icon={FlaskConical}>Throwing Potions</SectionTitle>
          <p className="text-xs mb-3 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            For potions marked (Tr) — a successful RS test hits the target square; you can throw over friends, foes and obstacles to hit something further away.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {heroes.map((h) => (
              <button
                key={h.id}
                onClick={() => applyThrowHeroSkill(h.id)}
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: throwHeroPick === h.id ? palette.crimson : "#00000010", color: throwHeroPick === h.id ? palette.parchment : palette.ink }}
              >
                {h.name} (RS {h.skills.rs}{encumbranceOver(h) ? ", −10 enc" : ""})
              </button>
            ))}
          </div>
          <label className="block text-xs mb-1 uppercase" style={{ color: palette.inkSoft, fontFamily: "Cinzel, serif" }}>Thrower's RS</label>
          <input
            type="number"
            value={throwBase}
            onChange={(e) => setThrowBase(Number(e.target.value) || 0)}
            className="w-full rounded px-2 py-1.5 mb-3 font-bold"
            style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
          />
          <div className="space-y-1.5 mb-3">
            {THROW_POTION_MODS.map((m) => (
              <label key={m.label} className="flex items-center gap-2 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                <input type="checkbox" checked={!!throwChecked[m.label]} onChange={(e) => setThrowChecked({ ...throwChecked, [m.label]: e.target.checked })} />
                {m.label} ({m.value > 0 ? "+" : ""}{m.value})
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between mb-3 p-2 rounded" style={{ background: "#00000008" }}>
            <span className="text-xs uppercase" style={{ color: palette.goldSoft, fontFamily: "Cinzel, serif" }}>Effective RS</span>
            <span className="text-xl font-bold" style={{ color: palette.crimson, fontFamily: "JetBrains Mono, monospace" }}>{throwEffective}</span>
          </div>
          <button
            onClick={rollThrow}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold"
            style={{ background: palette.crimson, color: palette.parchment, fontFamily: "Cinzel, serif" }}
          >
            <Dice5 size={16} /> Roll d100
          </button>
          {throwResult && (
            <div
              className="mt-3 text-center rounded p-2 font-bold"
              style={{ background: throwResult.outcome === "MISS" ? palette.crimsonDark : throwResult.outcome === "PERFECT" ? palette.gold : palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
            >
              <div>Rolled {throwResult.r} — {throwResult.outcome}</div>
              <div className="text-xs font-normal mt-1" style={{ fontFamily: "Crimson Pro, serif" }}>{throwResult.note}</div>
            </div>
          )}
          <p className="text-xs mt-3" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            AoE potions: full damage to the hit square; a Large/X-Large enemy covering extra squares takes +1 DMG per additional square it covers. Other enemies in the remaining squares take normal damage.
          </p>
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

          {heroes && heroes.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${palette.line}` }}>
              <SectionTitle icon={Skull}>Hit Location (when a hero is struck)</SectionTitle>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {heroes.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setHitLocHero(h.id)}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: hitLocHero === h.id ? palette.crimson : "#00000010", color: hitLocHero === h.id ? palette.parchment : palette.ink }}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
              <button
                onClick={rollHitLocation}
                disabled={!hitLocHero}
                className="w-full flex items-center justify-center gap-2 py-2 rounded font-bold text-sm mb-2"
                style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif", opacity: hitLocHero ? 1 : 0.5 }}
              >
                <Dice5 size={14} /> Roll 1d6 Hit Location
              </button>
              {hitLocResult && (
                <div className="text-xs rounded p-2" style={{ background: "#00000008", color: palette.ink, fontFamily: "Crimson Pro, serif" }}>
                  <b>{hitLocResult.loc}</b> ({hitLocResult.roll}) — {hitLocResult.note}
                  {hitLocResult.loc === "Head" && (
                    <button
                      onClick={() => {
                        const h = heroes.find((x) => x.id === hitLocHero);
                        if (!h) return;
                        updateHero({ ...h, sanity: { ...h.sanity, cur: Math.max(0, h.sanity.cur - 1) } });
                        addLog && addLog(`${h.name} is struck in the head: −1 Sanity.`);
                        setHitLocResult(null);
                      }}
                      className="block mt-2 px-2 py-1 rounded text-xs font-bold"
                      style={{ background: palette.crimson, color: palette.parchment }}
                    >
                      Apply −1 Sanity
                    </button>
                  )}
                  {hitLocResult.loc === "Torso" && (() => {
                    const h = heroes.find((x) => x.id === hitLocHero);
                    const quickItems = h ? h.backpack.filter((it) => it.slot === "quickslot") : [];
                    return (
                      <button
                        onClick={() => {
                          const slotRoll = rollDie(10);
                          if (slotRoll > quickItems.length) {
                            addLog && addLog(`${h.name}: torso hit, Quick Slot roll ${slotRoll} — no item in that slot, no effect.`);
                            setHitLocResult(null);
                            return;
                          }
                          const item = quickItems[slotRoll - 1];
                          const curDur = Number(String(item.dur || "").split("/")[0]) || 0;
                          const newDur = Math.max(0, curDur - 1);
                          const maxPart = String(item.dur || "").split("/")[1] || "";
                          updateHero({ ...h, backpack: h.backpack.map((it) => it.id === item.id ? { ...it, dur: maxPart ? `${newDur}/${maxPart}` : String(newDur) } : it) });
                          addLog && addLog(`${h.name}: torso hit, Quick Slot roll ${slotRoll} — ${item.name} takes 1 Durability damage.`);
                          setHitLocResult(null);
                        }}
                        className="block mt-2 px-2 py-1 rounded text-xs font-bold"
                        style={{ background: palette.crimson, color: palette.parchment }}
                      >
                        Roll 1d10 vs Quick Slots ({quickItems.length} used)
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
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
          {(() => {
            const spellcastingHeroes = heroes.filter((h) => h.spells.length > 0 || CASTER_SKILL[h.profession]);
            return spellcastingHeroes.length === 0 ? (
              <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>No spellcasters yet — a hero needs a magic profession or a known spell to show up here.</p>
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
                    {spellcastingHeroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
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
                    {chosenSpellType} ({chosenSpell.school}) · CV {chosenSpell.cv}{chosenSpell.mana != null ? ` · Mana ${chosenSpell.mana}` : ""}{chosenSpell.upkeep ? ` · Upkeep ${chosenSpell.upkeep}/turn` : ""}
                  </p>
                  <p className="text-xs mt-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>{chosenSpell.effect}</p>
                </div>
              )}
              {chosenSpell && (
                <div className="rounded p-2.5 mb-3 space-y-2" style={{ background: "#00000008" }}>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                      Focus (AP spent)
                      <select value={focusAP} onChange={(e) => setFocusAP(Number(e.target.value))} className="w-full text-xs rounded px-2 py-1 mt-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }}>
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </label>
                    {powerAllowedFor && (
                      <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                        Increased power (max {maxPower})
                        <input type="number" min="0" max={maxPower} value={increasedPower} onChange={(e) => setIncreasedPower(Math.max(0, Math.min(maxPower, Number(e.target.value))))} className="w-full text-xs rounded px-2 py-1 mt-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }} />
                      </label>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                    <input type="checkbox" checked={wounded} onChange={(e) => setWounded(e.target.checked)} /> Caster is wounded (-5 Miscast Threshold)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                    <input type="checkbox" checked={enemyAdjacent} onChange={(e) => setEnemyAdjacent(e.target.checked)} /> An enemy is adjacent (blocks everything but Touch Spells)
                  </label>
                  {chosenSpellType === "Incantation" && (
                    <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                      <input type="checkbox" checked={inSettlement} onChange={(e) => setInSettlement(e.target.checked)} /> Currently in a settlement (required for Incantations)
                    </label>
                  )}
                  {chosenSpellType === "Ranged" && (
                    <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                      <input type="checkbox" checked={hasLOS} onChange={(e) => setHasLOS(e.target.checked)} /> Has line of sight to the target
                    </label>
                  )}
                  {chosenSpellType === "Ranged" && (
                    <>
                      <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                        <input type="checkbox" checked={canDispel} onChange={(e) => setCanDispel(e.target.checked)} /> An enemy caster may try to dispel this
                      </label>
                      {canDispel && (
                        <label className="text-xs block" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                          Enemy's RS (dispel target is RS/2)
                          <input type="number" min="0" value={enemyRS} onChange={(e) => setEnemyRS(Math.max(0, Number(e.target.value)))} className="w-full text-xs rounded px-2 py-1 mt-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }} />
                        </label>
                      )}
                    </>
                  )}
                  {chosenSpellType === "Touch" && (
                    <p className="text-[10px] italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>Touch Spells can't be dispelled.</p>
                  )}
                  <p className="text-[10px]" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
                    Miscast Threshold: {miscastThreshold({ wounded, focusAP, increasedPower: powerAllowedFor ? increasedPower : 0 })} · AA: {(Number(castHero?.skills.arcaneArts) || 0) + focusAP * 10}
                  </p>
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
                <div className="text-xs mt-3 text-center rounded p-2 font-bold space-y-0.5" style={{ background: castResult.ok ? palette.forestDark : palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
                  {castResult.lines.map((l, i) => <p key={i}>{l}</p>)}
                </div>
              )}
              </>
            );
          })()}
        </Panel>
      )}

      {mode === "scroll" && (
        <Panel className="mb-4">
          <SectionTitle icon={ScrollText}>Read a Magic Scroll</SectionTitle>
          <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
            Any hero can read a scroll — the check uses WIS instead of Arcane Arts, and the spell's Casting Value is reduced by 10 (min 0). No Focus is allowed.
          </p>
          {heroes.length === 0 ? (
            <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>Add a hero first.</p>
          ) : (
            <>
              <label className="text-xs block mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                Hero
                <select
                  value={scrollHeroPick}
                  onChange={(e) => { setScrollHeroPick(e.target.value); setScrollItemPick(""); setScrollResult(null); }}
                  className="w-full text-sm rounded px-2 py-1.5 mt-1"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  <option value="">Choose a hero…</option>
                  {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              {scrollHero && (
                <p className="text-xs mb-2" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.ink }}>WIS: {scrollHero.stats.WIS}</p>
              )}
              {scrollHero && (
                heroScrolls.length === 0 ? (
                  <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
                    {scrollHero.name} isn't carrying any scrolls. Make one at the Magic Workshop, or trade one over from another hero first.
                  </p>
                ) : (
                  <label className="text-xs block mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                    Scroll
                    <select
                      value={scrollItemPick}
                      onChange={(e) => { setScrollItemPick(e.target.value); setScrollResult(null); }}
                      className="w-full text-sm rounded px-2 py-1.5 mt-1"
                      style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                    >
                      <option value="">Choose a scroll…</option>
                      {heroScrolls.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                  </label>
                )
              )}
              {chosenScrollSpell && (
                <div className="rounded p-2.5 mb-3" style={{ background: "#00000008" }}>
                  <p className="text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
                    {chosenScrollType} ({chosenScrollSpell.school}) · CV {chosenScrollSpell.cv} → {Math.max(0, chosenScrollSpell.cv - 10)} from scroll
                  </p>
                  <p className="text-xs mt-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>{chosenScrollSpell.effect}</p>
                </div>
              )}
              {chosenScrollSpell && (
                <div className="rounded p-2.5 mb-3 space-y-2" style={{ background: "#00000008" }}>
                  <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                    <input type="checkbox" checked={scrollWounded} onChange={(e) => setScrollWounded(e.target.checked)} /> Hero is wounded (-5 Miscast Threshold)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                    <input type="checkbox" checked={scrollEnemyAdjacent} onChange={(e) => setScrollEnemyAdjacent(e.target.checked)} /> An enemy is adjacent (blocks everything but Touch Spells)
                  </label>
                  {chosenScrollType === "Incantation" && (
                    <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                      <input type="checkbox" checked={scrollInSettlement} onChange={(e) => setScrollInSettlement(e.target.checked)} /> Currently in a settlement (required for Incantations)
                    </label>
                  )}
                  {chosenScrollType === "Ranged" && (
                    <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                      <input type="checkbox" checked={scrollHasLOS} onChange={(e) => setScrollHasLOS(e.target.checked)} /> Has line of sight to the target
                    </label>
                  )}
                  {chosenScrollType === "Ranged" && (
                    <>
                      <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                        <input type="checkbox" checked={scrollCanDispel} onChange={(e) => setScrollCanDispel(e.target.checked)} /> An enemy caster may try to dispel this
                      </label>
                      {scrollCanDispel && (
                        <label className="text-xs block" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
                          Enemy's RS (dispel target is RS/2)
                          <input type="number" min="0" value={scrollEnemyRS} onChange={(e) => setScrollEnemyRS(Math.max(0, Number(e.target.value)))} className="w-full text-xs rounded px-2 py-1 mt-0.5" style={{ background: "#fff", border: `1px solid ${palette.line}` }} />
                        </label>
                      )}
                    </>
                  )}
                  {chosenScrollType === "Touch" && (
                    <p className="text-[10px] italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>Touch Spells can't be dispelled.</p>
                  )}
                  <p className="text-[10px]" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.inkSoft }}>
                    Miscast Threshold: {miscastThreshold({ wounded: scrollWounded, focusAP: 0, increasedPower: 0 })} · WIS: {scrollHero?.stats.WIS}
                  </p>
                </div>
              )}
              <button
                onClick={readScroll}
                disabled={!scrollHero || !chosenScrollSpell}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-bold text-sm"
                style={{ background: palette.ember, color: palette.parchment, opacity: (!scrollHero || !chosenScrollSpell) ? 0.5 : 1 }}
              >
                <ScrollText size={16} /> Read Scroll
              </button>
              {scrollResult && (
                <div className="text-xs mt-3 text-center rounded p-2 font-bold space-y-0.5" style={{ background: scrollResult.ok ? palette.forestDark : palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}>
                  {scrollResult.lines.map((l, i) => <p key={i}>{l}</p>)}
                </div>
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
  const [lootScrollHero, setLootScrollHero] = useState("");
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
    const randomScroll = result === "1 random scroll" ? SPELLS[Math.floor(Math.random() * SPELLS.length)].name : null;
    setLootRolls((prev) => [{ tableKey, r, result, randomScroll, added: false, id: uid() }, ...prev].slice(0, 8));
  };
  const addLootScroll = (entryId) => {
    const hero = heroes.find((h) => h.id === lootScrollHero);
    const entry = lootRolls.find((l) => l.id === entryId);
    if (!hero || !entry || !entry.randomScroll) return;
    updateHero({ ...hero, backpack: [...hero.backpack, { id: uid(), name: `Scroll of ${entry.randomScroll}`, value: "", enc: 1, dur: "1" }] });
    setLootRolls((prev) => prev.map((l) => (l.id === entryId ? { ...l, added: true } : l)));
    addLog && addLog(`${hero.name} finds a Scroll of ${entry.randomScroll}.`);
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
        </div>
        <p className="text-xs mb-3 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          Need Hit Location? That's on Combat → Damage, where it's tied to a hero and auto-applies the result.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {rolls.map((r) => (
            <div key={r.id} className="text-center rounded p-2" style={{ background: "#00000010" }}>
              <div className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>{r.label}</div>
              <div className="text-xl font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: palette.ink }}>
                {r.r}
              </div>
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
          {lootRolls.some((l) => l.randomScroll && !l.added) && (
            <label className="text-xs block mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Hero to receive a found scroll
              <select
                value={lootScrollHero}
                onChange={(e) => setLootScrollHero(e.target.value)}
                className="w-full text-xs rounded px-2 py-1 mt-0.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                <option value="">Choose a hero…</option>
                {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
          )}
          {lootRolls.map((l) => (
            <div key={l.id} className="rounded p-2" style={{ background: "#00000010" }}>
              <div className="flex items-center gap-2 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                <span className="font-bold px-1.5 py-0.5 rounded" style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "JetBrains Mono, monospace" }}>{l.tableKey}: {l.r}</span>
                {l.result}
              </div>
              {l.randomScroll && (
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>Rolled: Scroll of {l.randomScroll}</span>
                  <button
                    onClick={() => addLootScroll(l.id)}
                    disabled={l.added || !lootScrollHero}
                    className="text-[10px] px-2 py-1 rounded font-semibold"
                    style={{ background: l.added ? "#00000015" : palette.crimsonDark, color: l.added ? palette.inkSoft : palette.parchment, opacity: !lootScrollHero && !l.added ? 0.5 : 1 }}
                  >
                    {l.added ? "Added" : "Add to Backpack"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

    </div>
  );
}


function ActionsTray({ party, setParty, heroes, updateHero, addLog }) {
  const [doorResult, setDoorResult] = useState(null);
  const [doorHero, setDoorHero] = useState("");
  const [doorDamageInput, setDoorDamageInput] = useState(0);
  const [doorFeedback, setDoorFeedback] = useState(null);
  const activeDoorHero = heroes.find((h) => h.id === doorHero) || heroes[0];

  const [searchHeroId, setSearchHeroId] = useState("");
  const [searchersCount, setSearchersCount] = useState(1);
  const [inCorridor, setInCorridor] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [furnitureType, setFurnitureType] = useState("");
  const [furnitureResult, setFurnitureResult] = useState(null);
  const [furnitureHeroId, setFurnitureHeroId] = useState("");
  const [furnitureInCombat, setFurnitureInCombat] = useState(false);
  const [furnitureFeedback, setFurnitureFeedback] = useState(null);
  const activeFurnitureHero = heroes.find((h) => h.id === furnitureHeroId) || heroes[0];
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

  const searchFurniture = () => {
    if (!furnitureType || !activeFurnitureHero) return;
    if (!trySpendAP(activeFurnitureHero, furnitureInCombat ? 2 : 1, setFurnitureFeedback)) return;
    const roll = rollDie(10);
    const entry = furnitureSearchResult(furnitureType, roll);
    const annotated = annotateDiceInText(entry.text);
    setFurnitureResult({ roll, text: annotated });
    setFurnitureFeedback(null);
    addLog(`${activeFurnitureHero.name} searches the ${furnitureType} (${furnitureInCombat ? 2 : 1} AP): rolled ${roll} — ${annotated}`);
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

  // ---- Portcullis ----
  const [portcHeroId, setPortcHeroId] = useState("");
  const [portcHelperSameSide, setPortcHelperSameSide] = useState(false);
  const [portcHelpersFarSide, setPortcHelpersFarSide] = useState(0);
  const [portcFeedback, setPortcFeedback] = useState(null);
  const activePortcHero = heroes.find((h) => h.id === portcHeroId) || heroes[0];

  const liftPortcullis = () => {
    if (!activePortcHero) return;
    if (!trySpendAP(activePortcHero, 1, setPortcFeedback)) return;
    const bonus = (portcHelperSameSide ? 10 : 0) + Math.min(2, Math.max(0, Number(portcHelpersFarSide) || 0)) * 10;
    const target = (Number(activePortcHero.stats.STR) || 0) + bonus;
    const roll = rollPercent();
    if (roll <= target) {
      setPortcFeedback({ text: `${activePortcHero.name} lifts the portcullis! (Rolled ${roll} vs STR ${target}.)`, tone: "good" });
      addLog(`${activePortcHero.name} lifts a portcullis: rolled ${roll} vs STR ${target}${bonus ? ` (base + ${bonus} helpers)` : ""} — success!`);
    } else {
      setParty((prev) => ({ ...prev, threat: prev.threat + 1 }));
      setPortcFeedback({ text: `${activePortcHero.name} fails to lift it (rolled ${roll} vs STR ${target}) — the drop raises Threat +1. May retry.`, tone: "warn" });
      addLog(`${activePortcHero.name} fails to lift a portcullis: rolled ${roll} vs STR ${target}${bonus ? ` (base + ${bonus} helpers)` : ""}. Threat +1.`);
    }
  };

  // ---- Cobweb Covered Opening ----
  const [cobwebHeroId, setCobwebHeroId] = useState("");
  const [cobwebResult, setCobwebResult] = useState(null);
  const activeCobwebHero = heroes.find((h) => h.id === cobwebHeroId) || heroes[0];

  const clearCobweb = () => {
    if (!activeCobwebHero) return;
    if (!trySpendAP(activeCobwebHero, 2, setCobwebResult)) return;
    setParty((prev) => ({ ...prev, threat: prev.threat + 1 }));
    const roll = rollDie(10);
    const spiders = roll >= 9 ? rollDie(2) : 0;
    setCobwebResult({ text: `${activeCobwebHero.name} cuts through the cobweb opening (2 AP). Threat +1.${spiders ? ` Rolled ${roll} on 1d10 — ${spiders} Giant Spider${spiders > 1 ? "s" : ""} appear! Place each individually on the tile being left or entered.` : ` Rolled ${roll} on 1d10 — no spiders.`}`, tone: spiders ? "bad" : "good" });
    addLog(`${activeCobwebHero.name} clears a cobweb opening (2 AP). Threat +1. Rolled ${roll} (d10)${spiders ? ` — ${spiders} Giant Spider(s) appear!` : " — no spiders."}`);
  };

  // ---- Levers ----
  const [leverDeck, setLeverDeck] = useState(null); // { black: 1, red: N, drawn: [] }
  const [leverClues, setLeverClues] = useState(0);
  const [leverEnemiesPresent, setLeverEnemiesPresent] = useState(false);
  const [leverHeroId, setLeverHeroId] = useState("");
  const [leverDraw, setLeverDraw] = useState(null);
  const [leverFeedback, setLeverFeedback] = useState(null);
  const activeLeverHero = heroes.find((h) => h.id === leverHeroId) || heroes[0];

  const prepareLeverDeck = () => {
    const red = rollDie(4) + 1;
    setLeverDeck({ black: 1, red, total: 1 + red });
    setLeverClues(0);
    setLeverDraw(null);
    setLeverFeedback({ text: `New lever deck shuffled: 1 black card + ${red} red cards (${1 + red} total).`, tone: "good" });
    addLog(`Prepared a lever deck: 1 black + ${red} red cards.`);
  };

  const discardRedWithClue = () => {
    if (!leverDeck || leverDeck.red <= 0 || leverClues <= 0) return;
    setLeverDeck((prev) => ({ ...prev, red: prev.red - 1, total: prev.total - 1 }));
    setLeverClues((prev) => prev - 1);
    addLog("Discarded a red lever card using a clue, without rolling.");
  };

  const applyLeverAuto = (entry, roll) => {
    if (!entry.auto) return;
    switch (entry.auto) {
      case "dungeonLuck":
        setParty((prev) => ({ ...prev, dungeonLuck: (prev.dungeonLuck || 0) + 1 }));
        addLog("Party gains 1 dungeon Luck Point (lost if unused when leaving the dungeon).");
        break;
      case "threat2":
        setParty((prev) => ({ ...prev, threat: prev.threat + 2 }));
        addLog("Threat +2 from the lever.");
        break;
      case "moralePartySanity":
        setParty((prev) => ({ ...prev, morale: Math.max(0, prev.morale - 4) }));
        heroes.forEach((h) => updateHero(h.id, { ...h, sanity: { ...h.sanity, cur: Math.max(0, h.sanity.cur - 1) } }));
        addLog("Party Morale -4, and every hero's Sanity -1, from the lever.");
        break;
      case "potions": {
        const n = rollDie(3);
        addLog(`The lever reveals ${n} potion(s) — add them to the party's items.`);
        break;
      }
      case "wonderfulTreasure":
        addLog("The lever grants 1 free Wonderful Treasure — roll on the Loot Roller (Wonderful table).");
        break;
      case "pitTrap": {
        const eligible = heroes.filter((h) => h.id !== activeLeverHero?.id);
        const victim = eligible.length ? eligible[Math.floor(Math.random() * eligible.length)] : null;
        if (victim) {
          const dexTarget = Number(victim.stats.DEX) || 0;
          const dexRoll = rollPercent();
          if (dexRoll <= dexTarget) {
            addLog(`${victim.name} passes a DEX Test (${dexRoll} vs ${dexTarget}) and avoids the pit trap.`);
          } else {
            const dmg = rollDie(10);
            const na = naturalArmour(Number(victim.stats.CON) || 0);
            const finalDmg = Math.max(0, dmg - na);
            updateHero(victim.id, {
              ...victim,
              hp: { ...victim.hp, cur: Math.max(0, victim.hp.cur - finalDmg) },
              sanity: { ...victim.sanity, cur: Math.max(0, victim.sanity.cur - 2) },
            });
            addLog(`${victim.name} fails a DEX Test (${dexRoll} vs ${dexTarget}) and falls into a pit trap: ${dmg} damage - ${na} NA = ${finalDmg} taken. Sanity -2. Place a pit token; getting up costs 1 AP plus a rope or a DEX Test.`);
          }
        } else {
          addLog("Pit trap triggered, but there's no other hero available to fall in.");
        }
        break;
      }
      default:
        break;
    }
  };

  const pullLever = () => {
    if (!leverDeck || leverDeck.total <= 0) return;
    if (leverEnemiesPresent) { setLeverFeedback({ text: "Can't activate a lever with known enemies on the table.", tone: "bad" }); return; }
    if (!trySpendAP(activeLeverHero, 1, setLeverFeedback)) return;
    // Draw proportional to remaining black/red count.
    const drawBlack = Math.random() < leverDeck.black / leverDeck.total;
    setLeverDeck((prev) => ({ ...prev, black: prev.black - (drawBlack ? 1 : 0), red: prev.red - (drawBlack ? 0 : 1), total: prev.total - 1 }));
    if (drawBlack) {
      const roll = rollDie(8);
      const entry = BLACK_LEVERS_TABLE.find((e) => e.roll === roll);
      setLeverDraw({ color: "black", roll, entry });
      applyLeverAuto(entry, roll);
      addLog(`${activeLeverHero ? activeLeverHero.name + " pulls" : "Pulled"} a lever — BLACK card, rolled ${roll} (1d8): ${entry.text}`);
    } else {
      const roll = rollDie(20);
      const entry = RED_LEVERS_TABLE.find((e) => roll >= e.roll[0] && roll <= e.roll[1]);
      setLeverDraw({ color: "red", roll, entry });
      applyLeverAuto(entry, roll);
      addLog(`${activeLeverHero ? activeLeverHero.name + " pulls" : "Pulled"} a lever — RED card, rolled ${roll} (1d20): ${entry.text}`);
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
        <SectionTitle icon={Landmark}>Portcullis</SectionTitle>
        <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          1 AP, model adjacent, STR Test — may be retried freely. A failed attempt raises Threat +1.
        </p>
        {heroes.length > 0 && (
          <select
            value={activePortcHero?.id || ""}
            onChange={(e) => setPortcHeroId(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name} (STR {h.stats.STR}, {h.ap ?? 2} AP)</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-xs mb-1.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <input type="checkbox" checked={portcHelperSameSide} onChange={(e) => setPortcHelperSameSide(e.target.checked)} />
          +1 hero in the other adjacent slot (+10 STR)
        </label>
        <div className="flex items-center gap-2 text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <span>Heroes chiming in from the far side (+10 STR each, max 2):</span>
          <Stepper value={portcHelpersFarSide} max={2} min={0} onChange={setPortcHelpersFarSide} />
        </div>
        <button
          onClick={liftPortcullis}
          className="w-full mb-2 px-3 py-2 rounded font-bold text-sm active:scale-95 transition-transform"
          style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
        >
          Attempt to Lift (1 AP, STR {activePortcHero ? (Number(activePortcHero.stats.STR) || 0) + (portcHelperSameSide ? 10 : 0) + Math.min(2, Math.max(0, Number(portcHelpersFarSide) || 0)) * 10 : "—"})
        </button>
        {portcFeedback && (
          <div
            className="rounded p-2 text-xs font-semibold"
            style={{
              background: "#fff",
              border: `1px solid ${portcFeedback.tone === "good" ? palette.forest : portcFeedback.tone === "bad" ? palette.crimson : palette.gold}`,
              color: portcFeedback.tone === "good" ? palette.forestDark : portcFeedback.tone === "bad" ? palette.crimson : palette.charcoal,
              fontFamily: "Crimson Pro, serif",
            }}
          >
            {portcFeedback.text}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={Flashlight}>Cobweb Covered Opening</SectionTitle>
        <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          2 AP, attacked with a weapon or torch — automatically succeeds. Raises Threat +1 and checks for Giant Spiders on a 1d10 of 9-10.
        </p>
        {heroes.length > 0 && (
          <select
            value={activeCobwebHero?.id || ""}
            onChange={(e) => setCobwebHeroId(e.target.value)}
            className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
            style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
          >
            {heroes.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.ap ?? 2} AP)</option>)}
          </select>
        )}
        <button
          onClick={clearCobweb}
          className="w-full mb-2 px-3 py-2 rounded font-bold text-sm active:scale-95 transition-transform"
          style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
        >
          Cut Through Cobweb (2 AP)
        </button>
        {cobwebResult && (
          <div
            className="rounded p-2 text-xs font-semibold"
            style={{
              background: "#fff",
              border: `1px solid ${cobwebResult.tone === "good" ? palette.forest : palette.crimson}`,
              color: cobwebResult.tone === "good" ? palette.forestDark : palette.crimson,
              fontFamily: "Crimson Pro, serif",
            }}
          >
            {cobwebResult.text}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={Zap}>Levers</SectionTitle>
        <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          Shuffle 1 black + 1d4+1 red cards. Pulling a lever costs 1 AP and can't be done with known enemies on the table.
        </p>

        {!leverDeck ? (
          <button
            onClick={prepareLeverDeck}
            className="w-full mb-2 px-3 py-2 rounded font-bold text-sm active:scale-95 transition-transform"
            style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
          >
            Prepare Lever Deck
          </button>
        ) : (
          <>
            <div className="rounded p-2 mb-2 text-xs" style={{ background: "#00000010", fontFamily: "JetBrains Mono, monospace", color: palette.ink }}>
              Deck remaining: {leverDeck.total} card{leverDeck.total !== 1 ? "s" : ""} ({leverDeck.black} black, {leverDeck.red} red)
            </div>

            <div className="flex items-center gap-2 text-xs mb-1.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
              <span>Clues on hand:</span>
              <Stepper value={leverClues} max={99} min={0} onChange={setLeverClues} />
              {leverClues > 0 && leverDeck.red > 0 && (
                <button
                  onClick={discardRedWithClue}
                  className="text-xs px-2 py-1 rounded font-semibold"
                  style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
                >
                  Discard a Red Card
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs mb-1.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
              <input type="checkbox" checked={leverEnemiesPresent} onChange={(e) => setLeverEnemiesPresent(e.target.checked)} />
              Known enemies on the table (blocks activation)
            </label>

            {heroes.length > 0 && (
              <select
                value={activeLeverHero?.id || ""}
                onChange={(e) => setLeverHeroId(e.target.value)}
                className="w-full text-xs rounded px-2 py-1.5 mb-1.5"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              >
                {heroes.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.ap ?? 2} AP)</option>)}
              </select>
            )}

            <button
              onClick={pullLever}
              disabled={leverDeck.total <= 0}
              className="w-full mb-2 px-3 py-2 rounded font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
            >
              {leverDeck.total > 0 ? "Pull a Lever (1 AP)" : "Deck Empty"}
            </button>

            {leverFeedback && (
              <div
                className="rounded p-2 mb-2 text-xs font-semibold"
                style={{
                  background: "#fff",
                  border: `1px solid ${palette.crimson}`,
                  color: palette.crimson,
                  fontFamily: "Crimson Pro, serif",
                }}
              >
                {leverFeedback.text}
              </div>
            )}

            {leverDraw && (
              <div className="rounded p-3" style={{ background: leverDraw.color === "black" ? "#00000015" : "#7a1f1f15" }}>
                <p className="text-sm font-bold mb-1" style={{ color: leverDraw.color === "black" ? palette.charcoal : palette.crimson, fontFamily: "Cinzel, serif" }}>
                  {leverDraw.color === "black" ? "Black" : "Red"} Lever — rolled {leverDraw.roll} ({leverDraw.color === "black" ? "1d8" : "1d20"})
                </p>
                <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                  {leverDraw.entry.text}
                </p>
              </div>
            )}

            <button
              onClick={() => setLeverDeck(null)}
              className="w-full mt-2 text-xs px-2 py-1.5 rounded font-semibold active:scale-95 transition-transform"
              style={{ background: "#00000015", color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}
            >
              Discard Deck / Start Over
            </button>
          </>
        )}

        {party.dungeonLuck > 0 && (
          <div className="rounded p-2 mt-3 text-xs font-semibold flex items-center justify-between" style={{ background: "#fff", border: `1px solid ${palette.gold}`, color: palette.charcoal, fontFamily: "Crimson Pro, serif" }}>
            <span>Dungeon Luck Points (party pool, lost on leaving): {party.dungeonLuck}</span>
            <button
              onClick={() => setParty((prev) => ({ ...prev, dungeonLuck: Math.max(0, prev.dungeonLuck - 1) }))}
              className="text-xs px-2 py-1 rounded font-semibold"
              style={{ background: palette.gold, color: palette.charcoal, fontFamily: "Cinzel, serif" }}
            >
              Spend 1
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

      <Panel>
        <SectionTitle icon={ClipboardList}>Search Furniture</SectionTitle>
        <p className="text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft, fontStyle: "italic" }}>
          1 AP out of combat, 2 AP if there are enemies in LOS. No search roll needed, just roll 1d10 on the Furniture Table (Appendix V). Can only be done once per piece of furniture, and only while no enemy is adjacent to it.
        </p>
        <select
          value={furnitureHeroId}
          onChange={(e) => setFurnitureHeroId(e.target.value)}
          className="w-full text-xs rounded px-2 py-1.5 mb-2"
          style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
        >
          <option value="">Choose a hero…</option>
          {heroes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <input type="checkbox" checked={furnitureInCombat} onChange={(e) => setFurnitureInCombat(e.target.checked)} />
          Enemies in LOS (2 AP instead of 1)
        </label>
        <select
          value={furnitureType}
          onChange={(e) => { setFurnitureType(e.target.value); setFurnitureResult(null); }}
          className="w-full text-xs rounded px-2 py-1.5 mb-2"
          style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
        >
          <option value="">Choose furniture…</option>
          {FURNITURE_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <button
          onClick={searchFurniture}
          disabled={!furnitureType || !activeFurnitureHero}
          className="w-full mb-2 px-3 py-2 rounded font-bold text-sm active:scale-95 transition-transform"
          style={{ background: (furnitureType && activeFurnitureHero) ? palette.crimsonDark : "#00000020", color: palette.parchment, fontFamily: "Cinzel, serif", opacity: (furnitureType && activeFurnitureHero) ? 1 : 0.5 }}
        >
          Search ({furnitureInCombat ? 2 : 1} AP)
        </button>
        {furnitureFeedback && (
          <p className="text-xs mb-2 font-semibold" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>{furnitureFeedback.text}</p>
        )}
        {furnitureResult && (
          <div className="rounded p-3" style={{ background: "#00000010" }}>
            <p className="text-xs mb-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>Roll: <b>{furnitureResult.roll}</b></p>
            <p className="text-sm font-bold" style={{ color: palette.forestDark, fontFamily: "Cinzel, serif" }}>{furnitureResult.text}</p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function QuestChecklistRow({ label, sub, checked, onToggle }) {
  return (
    <label className="flex items-start gap-2 py-1.5 text-sm" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
      <input type="checkbox" checked={!!checked} onChange={onToggle} className="mt-0.5" />
      <span className={checked ? "line-through opacity-60" : ""}>
        {label}
        {sub && <span className="block text-xs" style={{ color: palette.inkSoft }}>{sub}</span>}
      </span>
    </label>
  );
}

function QuestRollerPanel({ party, setParty, addLog }) {
  const [result, setResult] = useState(null);
  const quests = party.quests || { completed: {}, randomActive: null, sideActive: null };

  const roll = (origin) => {
    let r;
    if (origin === "silverCity") r = rollSilverCityQuest();
    else if (origin === "outpost") r = rollOutpostQuest();
    else r = rollVillageQuest();
    setResult({ origin, ...r });
  };

  const originLabel = { silverCity: "Silver City", outpost: "The Outpost", village: "Village" };

  const toggleCompleted = (key, label) => {
    const isDone = !!quests.completed[key];
    const nextCompleted = { ...quests.completed, [key]: !isDone };
    setParty({ ...party, quests: { ...quests, completed: nextCompleted } });
    if (!isDone) addLog && addLog(`Quest complete: ${label}.`);
  };

  const rollRandom = () => {
    const r = rollRandomQuest();
    setParty({ ...party, quests: { ...quests, randomActive: r.name } });
    addLog && addLog(`Random Quest rolled: ${r.name}${r.rerolled ? " (after a reroll)" : ""}.`);
  };

  const rollSide = () => {
    const r = rollDie(6);
    const name = SIDE_QUESTS[r - 1];
    setParty({ ...party, quests: { ...quests, sideActive: name } });
    addLog && addLog(`Side Quest rolled: ${name}.`);
  };

  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon={BookOpen}>Reading the Quests</SectionTitle>
        <div className="text-xs space-y-1.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          <p>Each quest in the book is divided by border lines into stages — don't read past the first line until you begin, or the second until you reach the Quest Room, to avoid spoilers. Anything found in the "aftermath" can be looted off-table freely, with no traps or locks.</p>
          <p><b>Wandering Monsters:</b> when a quest says one appears at Threat Level "XX", it triggers every time the Threat Level is <i>increased</i> to XX — not when it's decreased back down to XX after having gone higher.</p>
          <p><b>Ancient Lands access:</b> travelling there via the Outpost requires League of Dungeoneers membership (earned by completing the first campaign). Each hex costs 2 Movement Points and 2 rations/day per hero; a camel reduces travel time. A Travel Event roll of 10–12 triggers a Desert Event Card.</p>
        </div>
      </Panel>

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

      <Panel>
        <SectionTitle icon={ScrollText}>Introductory Quest</SectionTitle>
        <p className="text-xs mb-2 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          Check off as you complete each one.
        </p>
        {STANDALONE_QUESTS.map((q) => (
          <QuestChecklistRow
            key={q.name}
            label={q.name}
            sub={q.note}
            checked={quests.completed[`standalone:${q.name}`]}
            onToggle={() => toggleCompleted(`standalone:${q.name}`, q.name)}
          />
        ))}
      </Panel>

      {CAMPAIGNS.map((campaign) => {
        const doneCount = campaign.quests.filter((q) => quests.completed[`campaign:${campaign.name}:${q}`]).length;
        return (
          <Panel key={campaign.name}>
            <SectionTitle icon={ScrollText}>{campaign.name} <span className="text-xs font-normal" style={{ color: palette.inkSoft }}>({doneCount}/{campaign.quests.length})</span></SectionTitle>
            <p className="text-xs mb-2 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Check off as you complete each one, in order.
            </p>
            {campaign.quests.map((q) => (
              <QuestChecklistRow
                key={q}
                label={q}
                checked={quests.completed[`campaign:${campaign.name}:${q}`]}
                onToggle={() => toggleCompleted(`campaign:${campaign.name}:${q}`, `${campaign.name} — ${q}`)}
              />
            ))}
          </Panel>
        );
      })}

      <Panel>
        <SectionTitle icon={ScrollText}>Quests into the Ancient Lands</SectionTitle>
        <p className="text-xs mb-2 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          Check off as you complete each one. Each has 2 possible objective rooms depending on Ancient Lands tile access — check the right one at the table. Requires League of Dungeoneers membership (complete the first campaign) to reach via the Outpost.
        </p>
        {ANCIENT_LANDS_QUESTS.map((name) => (
          <QuestChecklistRow
            key={name}
            label={name}
            checked={quests.completed[`ancient:${name}`]}
            onToggle={() => toggleCompleted(`ancient:${name}`, name)}
          />
        ))}
      </Panel>

      <Panel>
        <SectionTitle icon={Dice5}>Random Quests</SectionTitle>
        <p className="text-xs mb-2 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          Roll 1d6 to pick an objective room (reroll on a 6). These can be replayed — layout shifts and difficulty scales with hero level. Check off as you complete each one.
        </p>
        <button
          onClick={rollRandom}
          className="w-full flex items-center justify-center gap-2 py-2 rounded font-bold text-sm mb-2"
          style={{ background: palette.crimsonDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
        >
          <Dice5 size={14} /> Roll a Random Quest
        </button>
        {quests.randomActive && (
          <div className="rounded p-2 mb-2" style={{ background: "#00000008" }}>
            <span className="text-sm font-bold" style={{ color: palette.crimson, fontFamily: "Cinzel, serif" }}>Active: {quests.randomActive}</span>
          </div>
        )}
        {RANDOM_QUESTS_TABLE.map((q) => (
          <QuestChecklistRow
            key={q.name}
            label={q.name}
            checked={quests.completed[`random:${q.name}`]}
            onToggle={() => toggleCompleted(`random:${q.name}`, q.name)}
          />
        ))}
      </Panel>

      <Panel>
        <SectionTitle icon={Dice5}>Side Quests</SectionTitle>
        <p className="text-xs mb-2 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          A little extra spice added to any other quest — accepted during the city stay, doesn't add to the Day Count. Roll 1d6, or work through them one by one. Check off as you complete each one.
        </p>
        <button
          onClick={rollSide}
          className="w-full flex items-center justify-center gap-2 py-2 rounded font-bold text-sm mb-2"
          style={{ background: palette.forestDark, color: palette.parchment, fontFamily: "Cinzel, serif" }}
        >
          <Dice5 size={14} /> Roll a Side Quest
        </button>
        {quests.sideActive && (
          <div className="rounded p-2 mb-2" style={{ background: "#00000008" }}>
            <span className="text-sm font-bold" style={{ color: palette.forestDark, fontFamily: "Cinzel, serif" }}>Active: {quests.sideActive}</span>
          </div>
        )}
        {SIDE_QUESTS.map((name) => (
          <QuestChecklistRow
            key={name}
            label={name}
            checked={quests.completed[`side:${name}`]}
            onToggle={() => toggleCompleted(`side:${name}`, name)}
          />
        ))}
      </Panel>

      <Panel>
        <SectionTitle icon={BookOpen}>Quest Book II</SectionTitle>
        <p className="text-xs mb-2 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          Only titles are confirmed so far (from its table of contents) — page numbers and mechanics for the main and Backer quests aren't in yet.
        </p>
        <p className="text-xs mb-1 font-bold uppercase" style={{ color: palette.goldSoft, fontFamily: "Cinzel, serif" }}>Main Quests</p>
        {BOOK2_MAIN_QUESTS.map((name) => (
          <QuestChecklistRow
            key={name}
            label={name}
            checked={quests.completed[`book2main:${name}`]}
            onToggle={() => toggleCompleted(`book2main:${name}`, name)}
          />
        ))}
        <p className="text-xs mt-3 mb-1 font-bold uppercase" style={{ color: palette.goldSoft, fontFamily: "Cinzel, serif" }}>Backer Quests</p>
        {BOOK2_BACKER_QUESTS.map((name) => (
          <QuestChecklistRow
            key={name}
            label={name}
            checked={quests.completed[`book2backer:${name}`]}
            onToggle={() => toggleCompleted(`book2backer:${name}`, name)}
          />
        ))}
      </Panel>

      <Panel>
        <SectionTitle icon={ScrollText}>Quest Book II: Mini Quests</SectionTitle>
        <p className="text-xs mb-2 italic" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          Short standalone encounters — no roll table to pick one, work through them one by one or choose freely. Check off as you complete each one.
        </p>
        {BOOK2_MINI_QUESTS.map((q) => (
          <QuestChecklistRow
            key={q.name}
            label={q.name}
            sub={q.note}
            checked={quests.completed[`book2mini:${q.name}`]}
            onToggle={() => toggleCompleted(`book2mini:${q.name}`, q.name)}
          />
        ))}
      </Panel>
    </div>
  );
}

// ---------- Reference ----------
function Reference() {
  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon={Users}>Species & Classes</SectionTitle>
        <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          <b>Species:</b> {SPECIES_DATA.filter((s) => !s.expansion).map((s) => s.name).join(" · ")}
        </p>
        <div className="text-xs space-y-1 mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          {PROFESSIONS.filter((p) => !p.expansion).map((p) => (
            <p key={p.name}><b>{p.name}:</b> {p.desc}</p>
          ))}
        </div>
        <p className="text-xs mb-2 font-bold" style={{ fontFamily: "Cinzel, serif", color: palette.crimson }}>The False Prophet Expansion</p>
        <p className="text-xs mb-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
          <b>Species:</b> {SPECIES_DATA.filter((s) => s.expansion).map((s) => s.name).join(" · ")}
        </p>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          {PROFESSIONS.filter((p) => p.expansion).map((p) => (
            <p key={p.name}><b>{p.name}:</b> {p.desc}{p.note ? <span style={{ color: palette.crimson }}> ({p.note})</span> : null}</p>
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
        <SectionTitle icon={Swords}>Who Can Fight? / Zone of Control</SectionTitle>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <p><b>Who can fight:</b> Adjacent models may strike each other. A weapon with the Reach rule can strike an enemy 1 square away, even through a friendly (not enemy) model. Missile weapons have a max reach of 10 squares in a dungeon, unlimited outdoors. Long Range weapons can't normally be fired if an enemy is adjacent to the firer.</p>
          <p><b>Zone of Control (ZOC):</b> a model's ZOC is any square directly to its side, diagonally in front, and in front of it. Moving from one ZOC square to another costs 2 Movement Points per square.</p>
          <p><b>End of Battle:</b> once all enemies are dead, continue the turn with whatever actions your heroes have remaining.</p>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Sparkles}>Powerstones (1d20)</SectionTitle>
        <p className="text-xs mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          Rolled automatically when the Enchant Item spell succeeds — result is stored on the item.
        </p>
        <div className="text-xs space-y-1" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          {POWERSTONES.map((p) => (
            <p key={p.roll}><b>{p.roll}.</b> {p.name} <span style={{ color: palette.inkSoft }}>({p.appliesTo})</span> — {p.effect}</p>
          ))}
        </div>
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

// ---------- Travel & Skirmishes ----------
function TravelTab({ party, setParty, heroes, addLog, updateHero }) {
  const [eventTerrain, setEventTerrain] = useState("offroad");
  const [eventResult, setEventResult] = useState(null);
  const [restSummary, setRestSummary] = useState(null);
  const [ancientLands, setAncientLands] = useState(false);
  const [forageHero, setForageHero] = useState("");
  const [forageTerrain, setForageTerrain] = useState("neither");
  const [forageResult, setForageResult] = useState(null);

  const rationCost = ancientLands ? 2 : 1;

  const feedParty = () => {
    if (party.hungry) {
      heroes.forEach((h) => {
        const delta = (party.hungerConDeltas || {})[h.id];
        if (delta) updateHero(h.id, { ...h, stats: { ...h.stats, CON: h.stats.CON + delta } });
      });
    }
    setParty((prev) => ({ ...prev, hungry: false, hungerConDeltas: {} }));
  };

  const useRations = () => {
    if ((party.food || 0) < rationCost) {
      setForageResult({ ok: false, line: `Not enough rations: need ${rationCost}, party only has ${party.food || 0}.` });
      return;
    }
    setParty((prev) => ({ ...prev, food: prev.food - rationCost }));
    feedParty();
    const line = `Party eats — ${rationCost} ration${rationCost > 1 ? "s" : ""} used.${party.hungry ? " Hunger penalty lifted." : ""}`;
    setForageResult({ ok: true, line });
    addLog(`Rations: ${line}`);
  };

  const rollForage = () => {
    const hero = heroes.find((h) => h.id === forageHero);
    if (!hero) { setForageResult({ ok: false, line: "Pick a hero to forage first." }); return; }
    const mod = forageTerrain === "trees" ? 10 : forageTerrain === "road" ? -10 : 0;
    const target = (Number(hero.skills.foraging) || 0) + mod;
    const roll = rollDie(100);
    const success = roll <= target;
    if (success) {
      feedParty();
      const line = `${hero.name} forages — rolled ${roll} vs target ${target} (Foraging ${hero.skills.foraging}${mod !== 0 ? `, ${mod > 0 ? "+" : ""}${mod} terrain` : ""}) — Success! Party fed for the day, no ration used.`;
      setForageResult({ ok: true, line });
      addLog(`Foraging: ${line}`);
    } else {
      const wasAlreadyHungry = party.hungry;
      const deltas = {};
      heroes.forEach((h) => {
        const delta = Math.floor((Number(h.stats.CON) || 0) / 2);
        deltas[h.id] = delta;
        if (!wasAlreadyHungry) updateHero(h.id, { ...h, stats: { ...h.stats, CON: h.stats.CON - delta } });
      });
      setParty((prev) => ({
        ...prev,
        hungry: true,
        hungerConDeltas: wasAlreadyHungry ? prev.hungerConDeltas : deltas,
        morale: wasAlreadyHungry ? prev.morale : prev.morale - 4,
      }));
      const line = `${hero.name} forages — rolled ${roll} vs target ${target} (Foraging ${hero.skills.foraging}${mod !== 0 ? `, ${mod > 0 ? "+" : ""}${mod} terrain` : ""}) — Failed. Party goes hungry${wasAlreadyHungry ? " (already hungry, no further penalty — not cumulative)" : ": every hero's CON halved, Party Morale -4, until they eat again"}.`;
      setForageResult({ ok: false, line });
      addLog(`Foraging: ${line}`);
    }
  };

  const mpPool = party.travelMode === "mounted" ? 6 : 3;
  const mpSpent = party.mpSpent || 0;
  const travelLog = party.travelLog || [];

  const hexCost = (type) => {
    if (type === "Road") return 1;
    if (type === "Off-road") return 1.5;
    if (type === "Desert") return party.travelMode === "mounted" && party.allCamels ? 1.5 : 2;
    return 0;
  };

  const enterHex = (type) => {
    const cost = hexCost(type);
    setParty((prev) => ({
      ...prev,
      mpSpent: (prev.mpSpent || 0) + cost,
      travelLog: [...(prev.travelLog || []), { label: type, cost }],
    }));
  };

  const undoLastHex = () => {
    setParty((prev) => {
      const log = prev.travelLog || [];
      if (log.length === 0) return prev;
      const last = log[log.length - 1];
      return { ...prev, mpSpent: Math.max(0, (prev.mpSpent || 0) - last.cost), travelLog: log.slice(0, -1) };
    });
  };

  const newDay = () => {
    setParty((prev) => ({ ...prev, mpSpent: 0, travelLog: [] }));
    setEventResult(null);
    setRestSummary(null);
  };

  const rollEvent = () => {
    const roll = rollDie(12);
    let triggered, cardType;
    if (eventTerrain === "offroad") {
      triggered = roll >= 11;
      cardType = "Wilderness Event Card";
    } else if (eventTerrain === "road") {
      triggered = roll >= 10;
      cardType = "Road Event Card";
    } else {
      triggered = roll >= 10;
      cardType = "Desert Event Card";
    }
    const line = triggered ? `Rolled ${roll} — Event! Draw a ${cardType}.` : `Rolled ${roll} — no event.`;
    setEventResult({ triggered, line });
    addLog(`Daily Event Roll: ${line}`);
  };

  const dailyRest = () => {
    const lines = [];
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
      updateHero(h.id, { ...h, hp: { ...h.hp, cur: newHp }, energy: { ...h.energy, cur: newEnergyCur } });
      lines.push(`${h.name}: +${hpRoll} HP (${newHp}/${h.hp.max}). ${energyLine}`);
    });
    setRestSummary(lines);
    addLog(`Daily Rest: ${lines.join(" ")}`);
  };

  return (
    <div className="space-y-4">
      <Panel>
        <SectionTitle icon={Map}>Movement</SectionTitle>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setParty((prev) => ({ ...prev, travelMode: "walking" }))}
            className="flex-1 text-xs px-2 py-2 rounded font-semibold"
            style={{ background: party.travelMode !== "mounted" ? palette.crimsonDark : "#00000010", color: party.travelMode !== "mounted" ? palette.parchment : palette.ink }}
          >
            Walking / Wagon / Mule (3 MP)
          </button>
          <button
            onClick={() => setParty((prev) => ({ ...prev, travelMode: "mounted" }))}
            className="flex-1 text-xs px-2 py-2 rounded font-semibold"
            style={{ background: party.travelMode === "mounted" ? palette.crimsonDark : "#00000010", color: party.travelMode === "mounted" ? palette.parchment : palette.ink }}
          >
            All Horses/Camels (6 MP)
          </button>
        </div>
        {party.travelMode === "mounted" && (
          <label className="flex items-center gap-2 text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
            <input type="checkbox" checked={!!party.allCamels} onChange={(e) => setParty((prev) => ({ ...prev, allCamels: e.target.checked }))} />
            All party riding camels (Desert hexes cost 1.5 MP instead of 2)
          </label>
        )}

        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-semibold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>
            {mpSpent} / {mpPool} MP spent today
          </span>
          {mpSpent > mpPool && <span className="text-xs font-semibold" style={{ color: palette.crimson }}>Over pool by {mpSpent - mpPool}</span>}
        </div>

        <div className="flex gap-2 mb-2">
          <button onClick={() => enterHex("Road")} className="flex-1 text-xs px-2 py-2 rounded font-semibold" style={{ background: "#00000010", color: palette.ink }}>Road (1)</button>
          <button onClick={() => enterHex("Off-road")} className="flex-1 text-xs px-2 py-2 rounded font-semibold" style={{ background: "#00000010", color: palette.ink }}>Off-road (1.5)</button>
          <button onClick={() => enterHex("Desert")} className="flex-1 text-xs px-2 py-2 rounded font-semibold" style={{ background: "#00000010", color: palette.ink }}>Desert ({hexCost("Desert")})</button>
        </div>

        {travelLog.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {travelLog.map((t, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#00000010", color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                {t.label} +{t.cost}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={undoLastHex} disabled={travelLog.length === 0} className="flex-1 text-xs px-2 py-2 rounded font-semibold" style={{ background: "#00000010", color: palette.ink, opacity: travelLog.length === 0 ? 0.5 : 1 }}>
            Undo Last Hex
          </button>
          <button onClick={newDay} className="flex-1 text-xs px-2 py-2 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
            New Day (reset)
          </button>
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Wheat}>Storage</SectionTitle>
        <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          Carrying capacity beyond what heroes carry themselves. Bought at Alberta's Magnificent Animals in Whiteport.
        </p>
        {(party.transport?.mules || 0) === 0 && (party.transport?.wagons || 0) === 0 && (party.transport?.saddlebags || 0) === 0 ? (
          <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
            The party doesn't own a Mule, Wagon, or Saddlebags yet — buy one from the Settlements tab while in Whiteport.
          </p>
        ) : (
          <>
            {(party.transport?.mules || 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>
                  Mule{party.transport.mules > 1 ? `s (${party.transport.mules})` : ""}
                </p>
                <StorageBox
                  items={party.storage?.mule || []}
                  onChange={(items) => setParty((prev) => ({ ...prev, storage: { ...prev.storage, mule: items } }))}
                  cap={100 * party.transport.mules}
                />
              </div>
            )}
            {(party.transport?.wagons || 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>
                  Wagon{party.transport.wagons > 1 ? `s (${party.transport.wagons})` : ""}
                </p>
                <StorageBox
                  items={party.storage?.wagon || []}
                  onChange={(items) => setParty((prev) => ({ ...prev, storage: { ...prev.storage, wagon: items } }))}
                  cap={500 * party.transport.wagons}
                />
              </div>
            )}
            {(party.transport?.saddlebags || 0) > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>
                  Saddlebags ({party.transport.saddlebags})
                </p>
                <StorageBox
                  items={party.storage?.saddlebags || []}
                  onChange={(items) => setParty((prev) => ({ ...prev, storage: { ...prev.storage, saddlebags: items } }))}
                  cap={10 * party.transport.saddlebags}
                />
              </div>
            )}
          </>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={Wheat}>Rations &amp; Foraging</SectionTitle>
        <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          1 ration feeds the whole party for the day (2 in the Ancient Lands, where Foraging isn't possible). Foraging is one roll for the whole party, once per day.
        </p>
        <label className="flex items-center gap-2 text-xs mb-3" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <input type="checkbox" checked={ancientLands} onChange={(e) => { setAncientLands(e.target.checked); setForageResult(null); }} />
          Travelling in the Ancient Lands
        </label>

        {party.hungry && (
          <div className="rounded p-2 text-xs mb-2 font-semibold" style={{ background: "#fff", border: `1px solid ${palette.crimson}`, color: palette.crimson, fontFamily: "Crimson Pro, serif" }}>
            Party is hungry — every hero's CON is halved and Party Morale took -4, until they eat again.
          </div>
        )}

        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-semibold" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Rations: {party.food || 0}</span>
          <button onClick={useRations} className="text-xs px-3 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
            Use {rationCost} Ration{rationCost > 1 ? "s" : ""}
          </button>
        </div>

        {!ancientLands && (
          <>
            <div className="h-px my-3" style={{ background: palette.line }} />
            <p className="text-xs font-semibold mb-2" style={{ fontFamily: "Cinzel, serif", color: palette.ink }}>Forage Instead</p>
            <select
              value={forageHero}
              onChange={(e) => { setForageHero(e.target.value); setForageResult(null); }}
              className="w-full text-sm rounded px-2 py-1.5 mb-2"
              style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
            >
              <option value="">Choose the forager…</option>
              {heroes.map((h) => <option key={h.id} value={h.id}>{h.name} (Foraging {h.skills.foraging})</option>)}
            </select>
            <div className="flex gap-2 mb-2">
              {[["neither", "No modifier"], ["trees", "In trees (+10)"], ["road", "On road (-10)"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setForageTerrain(k)}
                  className="flex-1 text-[10px] px-1 py-2 rounded font-semibold"
                  style={{ background: forageTerrain === k ? palette.crimsonDark : "#00000010", color: forageTerrain === k ? palette.parchment : palette.ink }}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={rollForage}
              disabled={!forageHero}
              className="w-full text-xs px-2 py-2 rounded font-semibold"
              style={{ background: forageHero ? palette.crimsonDark : "#00000020", color: palette.parchment, opacity: forageHero ? 1 : 0.5 }}
            >
              Roll Foraging
            </button>
          </>
        )}

        {forageResult && (
          <div className="mt-2 rounded p-2 text-xs" style={{ background: "#fff", border: `1px solid ${forageResult.ok ? palette.line : palette.crimson}`, fontFamily: "Crimson Pro, serif", color: forageResult.ok ? palette.forestDark : palette.crimson, fontWeight: 600 }}>
            {forageResult.line}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={Dice5}>Daily Event Roll</SectionTitle>
        <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          Rolled once per day, before moving. Off-road triggers on 11-12. Road or Desert triggers on 10-12.
        </p>
        <div className="flex gap-2 mb-2">
          {["offroad", "road", "desert"].map((t) => (
            <button
              key={t}
              onClick={() => { setEventTerrain(t); setEventResult(null); }}
              className="flex-1 text-xs px-2 py-2 rounded font-semibold capitalize"
              style={{ background: eventTerrain === t ? palette.crimsonDark : "#00000010", color: eventTerrain === t ? palette.parchment : palette.ink }}
            >
              {t === "offroad" ? "Off-road" : t === "road" ? "Road" : "Desert"}
            </button>
          ))}
        </div>
        <button onClick={rollEvent} className="w-full text-xs px-2 py-2 rounded font-semibold mb-2" style={{ background: palette.crimsonDark, color: palette.parchment }}>
          Roll 1d12
        </button>
        {eventResult && (
          <div className="rounded p-2 text-xs" style={{ background: "#fff", border: `1px solid ${eventResult.triggered ? palette.crimson : palette.line}`, fontFamily: "Crimson Pro, serif", fontWeight: 600, color: eventResult.triggered ? palette.crimson : palette.forestDark }}>
            {eventResult.line}
          </div>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={Bed}>Daily Rest</SectionTitle>
        <p className="text-[10px] mb-2 italic" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
          Once per day: +1d6 HP per hero, and 1d6 per missing Energy point (regained on 1-3), or full Energy with a Bed Roll.
        </p>
        <button onClick={dailyRest} disabled={heroes.length === 0} className="w-full text-xs px-2 py-2 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment, opacity: heroes.length === 0 ? 0.5 : 1 }}>
          Rest for the Day
        </button>
        {restSummary && (
          <ul className="mt-2 text-xs list-disc pl-4 space-y-0.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
            {restSummary.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        )}
      </Panel>

      <Panel>
        <SectionTitle icon={Swords}>Skirmishes</SectionTitle>
        <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          Event Cards or mini-quests sometimes trigger a skirmish — use the Combat tab as normal to run it. The outdoor tile matches how the skirmish was triggered:
        </p>
        <ul className="text-xs list-disc pl-4 mt-2 space-y-0.5" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          <li><b>Roads</b> tile — triggered by a Road Event</li>
          <li><b>Wilderness</b> tile — triggered by a Wilderness Event</li>
          <li><b>Village / Camp / Standing Stones / Quest Site Entrance / City Street</b> — used when the quest or event specifically calls for it</li>
        </ul>
      </Panel>

      <Panel>
        <SectionTitle icon={Landmark}>Staying at Inns</SectionTitle>
        <p className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
          Ending movement in a settlement or the City Hex requires paying to stay at the inn overnight — see the Settlements tab. If only staying the night, just the inn fee is owed.
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
        <div className="flex-1 flex gap-1.5 overflow-x-auto pt-1.5 -mt-1.5" style={{ scrollbarWidth: "thin" }}>
          {heroes.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedId(h.id)}
              className="relative shrink-0 px-3 py-2 rounded-lg text-sm font-bold"
              style={{
                background: selectedId === h.id ? palette.crimson : "#00000010",
                color: selectedId === h.id ? palette.parchment : palette.ink,
                fontFamily: "Cinzel, serif",
                maxWidth: 140,
              }}
            >
              <span
                className="block whitespace-nowrap overflow-hidden"
                style={{ textOverflow: "ellipsis" }}
              >
                {h.name || "New Hero"}
              </span>
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
  const navRef = useRef(null);
  const dragState = useRef({ dragging: false, moved: false, startX: 0, scrollLeft: 0 });
  const onNavPointerDown = (e) => {
    const el = navRef.current;
    if (!el) return;
    dragState.current = { dragging: true, moved: false, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  };
  const onNavPointerMove = (e) => {
    const el = navRef.current;
    if (!el || !dragState.current.dragging) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 4) dragState.current.moved = true;
    el.scrollLeft = dragState.current.scrollLeft - walk;
  };
  const endNavDrag = () => { dragState.current.dragging = false; };
  const onNavClickCapture = (e) => {
    if (dragState.current.moved) { e.preventDefault(); e.stopPropagation(); }
    dragState.current.moved = false;
  };
  const navRef2 = useRef(null);
  const dragState2 = useRef({ dragging: false, moved: false, startX: 0, scrollLeft: 0 });
  const onNav2PointerDown = (e) => {
    const el = navRef2.current;
    if (!el) return;
    dragState2.current = { dragging: true, moved: false, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  };
  const onNav2PointerMove = (e) => {
    const el = navRef2.current;
    if (!el || !dragState2.current.dragging) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState2.current.startX;
    if (Math.abs(walk) > 4) dragState2.current.moved = true;
    el.scrollLeft = dragState2.current.scrollLeft - walk;
  };
  const endNav2Drag = () => { dragState2.current.dragging = false; };
  const onNav2ClickCapture = (e) => {
    if (dragState2.current.moved) { e.preventDefault(); e.stopPropagation(); }
    dragState2.current.moved = false;
  };
  const [compendiumInitialCat, setCompendiumInitialCat] = useState("talents");
  const goToTab = (targetTab, opts) => {
    if (targetTab === "compendium" && opts?.cat) setCompendiumInitialCat(opts.cat);
    setTab(targetTab);
  };
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
    ["heroes", "Heroes", Users],
    ["combat", "Combat", Swords],
    ["bestiary", "Bestiary", Skull],
    ["actions", "Actions", ClipboardList],
    ["alchemy", "Alchemy", FlaskConical],
    ["dice", "Dice", Dice5],
    ["reference", "Reference", BookOpen],
  ];
  const tabs2 = [
    ["travel", "Travel", Map],
    ["settlement", "Settlement", Landmark],
    ["guilds", "Guilds", Shield],
    ["quest", "Quest", Map],
    ["compendium", "Compendium", ScrollText],
    ["lore", "Lore", Library],
    ["campaigns", "Campaigns", FolderOpen],
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
            <span
              className="inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(212,175,110,0.15)", color: palette.goldSoft, border: `1px solid ${palette.goldSoft}`, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.03em" }}
              title="This app is built against Core Rulebook v2.4 and QRS v2.24"
            >
              Rulebook v2.4 · QRS v2.24
            </span>
          </div>
          <span
            className="flex items-center gap-1 text-xs shrink-0"
            style={{ color: "#B8A78A", fontFamily: "JetBrains Mono, monospace", fontVariant: "small-caps", letterSpacing: "0.02em", whiteSpace: "nowrap" }}
          >
            {saveState === "saving" && "saving…"}
            {saveState === "saved" && (<><span>saved</span> <Check size={12} /></>)}
            {saveState === "error" && "save failed"}
          </span>
        </div>
      </header>

      <nav
        ref={navRef}
        className="max-w-2xl mx-auto flex gap-2 px-4 pt-3 pb-1.5 overflow-x-auto scroll-hide"
        style={{ scrollSnapType: "x proximity", cursor: "grab" }}
        onMouseDown={onNavPointerDown}
        onMouseMove={onNavPointerMove}
        onMouseUp={endNavDrag}
        onMouseLeave={endNavDrag}
        onClickCapture={onNavClickCapture}
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
      <nav
        ref={navRef2}
        className="max-w-2xl mx-auto flex gap-2 px-4 pt-1.5 pb-2 overflow-x-auto scroll-hide"
        style={{ scrollSnapType: "x proximity", cursor: "grab" }}
        onMouseDown={onNav2PointerDown}
        onMouseMove={onNav2PointerMove}
        onMouseUp={endNav2Drag}
        onMouseLeave={endNav2Drag}
        onClickCapture={onNav2ClickCapture}
      >
        {tabs2.map(([key, label, Icon]) => (
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
          </button>
        ))}
      </nav>

      <main className="max-w-2xl mx-auto px-4 pb-16 pt-2">
        {tab === "party" && <PartyPanel party={party} setParty={setParty} log={log} addLog={addLog} heroes={heroes} updateHero={updateHero} pushToast={pushToast} />}
        {tab === "turn" && <TurnTab party={party} setParty={setParty} heroes={heroes} updateHero={updateHero} addLog={addLog} />}
        {tab === "travel" && (
          <TravelTab party={party} setParty={setParty} heroes={heroes} updateHero={updateHero} addLog={addLog} />
        )}
        {tab === "settlement" && (
          <SettlementTab party={party} setParty={setParty} heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} goToGuilds={() => setTab("guilds")} />
        )}
        {tab === "guilds" && (
          <GuildsTab party={party} setParty={setParty} heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />
        )}
        {tab === "heroes" && (
          <HeroesTab heroes={heroes} updateHero={updateHero} removeHero={removeHero} addHero={addHero} addLog={addLog} pushToast={pushToast} party={party} setParty={setParty} />
        )}
        {tab === "combat" && <CombatCalc heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />}
        {tab === "alchemy" && <AlchemyTab heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />}
        {tab === "actions" && <ActionsTray party={party} setParty={setParty} heroes={heroes} updateHero={updateHero} addLog={addLog} />}
        {tab === "dice" && <DiceTray party={party} setParty={setParty} heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />}
        {tab === "quest" && <QuestRollerPanel party={party} setParty={setParty} addLog={addLog} />}
        {tab === "compendium" && <CompendiumTab heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} initialCat={compendiumInitialCat} />}
        {tab === "lore" && <LoreTab goToTab={goToTab} />}
        {tab === "bestiary" && <BestiaryTab />}
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
