import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Minus, Trash2, Flame, Heart, Zap, Brain, Sparkles, Dice5,
  Swords, Shield, BookOpen, Users, Skull,
  RotateCcw, Coins, Wheat, ScrollText, Pencil, Check, X, FolderOpen, Loader2, Map, Download, Upload,
  Landmark, Bed, ClipboardList
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
  luck: 0,
  background: "",
  improvementPoints: 0,
  ipSpentThisLevel: {},
  creationPoints: 15,
  freeSkill: "",
  hp: { cur: 10, max: 10 },
  energy: { cur: 1, max: 1 },
  sanity: { cur: 10, max: 10 },
  mana: { cur: 0, max: 0 },
  movement: 4,
  skills: {
    cs: 30, rs: 30, dodge: 20, pickLocks: 20, barter: 20,
    heal: 20, alchemy: 20, perception: 20, foraging: 20,
    arcaneArts: 0, battlePrayers: 0,
  },
  weapon: { name: "", dmg: "", enc: 0, dur: { cur: 6, max: 6 } },
  armour: {
    head: { def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    arms: { def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    torso: { def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    legs: { def: 0, enc: 0, dur: { cur: 0, max: 0 } },
    shield: { def: 0, enc: 0, dur: { cur: 0, max: 0 } },
  },
  talents: [],
  perks: [],
  spells: [],
  prayers: [],
  specialRules: [],
  conditions: [],
  backpackSize: 0,
  backpack: [],
  notes: "",
});

// Starting stats per species — base + dice roll, from the official character-creation
// tool (base game + Frogling/Pale expansions). Basic stats and HP are rolled the same
// way: base + dice. Note text is condensed from that tool's per-species creation rules.
const SPECIES_DATA = [
  { name: "Human", hp: { base: 7, count: 1, size: 6 }, stats: { STR: 30, CON: 30, DEX: 30, WIS: 30, RES: 30 }, note: "Jack of All Trades: roll a random Talent from a chosen category at creation." },
  { name: "Elf", hp: { base: 6, count: 1, size: 6 }, stats: { STR: 25, CON: 20, DEX: 40, WIS: 35, RES: 30 }, note: "" },
  { name: "Halfling", hp: { base: 5, count: 1, size: 6 }, stats: { STR: 20, CON: 20, DEX: 40, WIS: 30, RES: 40 }, note: "Cannot use Longbows or Elvin bows (height). May buy Cooking Gear for 50c at the start of the game." },
  { name: "Dwarf", hp: { base: 8, count: 1, size: 6 }, stats: { STR: 40, CON: 30, DEX: 25, WIS: 25, RES: 30 }, note: "Cannot use Longbows or Elvin bows (height)." },
  { name: "Gnome", hp: { base: 4, count: 1, size: 6 }, stats: { STR: 20, CON: 20, DEX: 30, WIS: 40, RES: 40 }, note: "Cannot use Longbows or Elvin bows (height). Artificer: once specialised, pays half cost for blacksmithing/crafting services." },
  { name: "Duckfolk", hp: { base: 6, count: 1, size: 6 }, stats: { STR: 25, CON: 25, DEX: 30, WIS: 30, RES: 40 }, max: { STR: 55, CON: 60, DEX: 70, WIS: 70, RES: 80 }, note: "Short arms — cannot use Longbows or Elvin bows." },
  { name: "Frogling", hp: { base: 4, count: 1, size: 6 }, stats: { STR: 20, CON: 35, DEX: 40, WIS: 30, RES: 25 }, note: "Cannot use Longbows or Elvin bows (height)." },
  { name: "Half-Ogre", hp: { base: 10, count: 2, size: 6 }, stats: { STR: 50, CON: 40, DEX: 25, WIS: 15, RES: 40 }, max: { STR: 80, CON: 60, DEX: 60, WIS: 60, RES: 60 }, note: "+2 Sanity. May only take the Warrior, Barbarian, or Rogue profession." },
  { name: "Pale Goblin", hp: { base: 5, count: 1, size: 6 }, stats: { STR: 25, CON: 20, DEX: 40, WIS: 30, RES: 35 }, note: "Cannot use Longbows or Elvin bows (height)." },
  { name: "Pale Orc", hp: { base: 8, count: 1, size: 6 }, stats: { STR: 40, CON: 35, DEX: 25, WIS: 20, RES: 30 }, note: "Cannot use Longbows or Elvin bows (height)." },
];
const SPECIES = SPECIES_DATA.map((s) => s.name);

// Background flavour table (roll 1d20) — names only; no mechanical stat effect found
// in either the rulebook excerpt or the character-creation tool.
const BACKGROUNDS = [
  "Wanderlust", "The Well", "Fables", "The Heirloom", "Arachnophobia",
  "The Lost Brother", "Revenge", "Bad Tempered", "Poverty", "Proving Your Worth",
  "The Fraud", "The Noble", "Sworn Enemy", "The Family Keep", "Troll Slayer",
  "Revenge", "A New Home", "The Apprentice", "Weak", "Afraid of Heights",
];

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

// Encumbrance penalty per the rulebook: total ENC (weapon + armour + backpack) over
// STR gives -10 to all skills and stats.
function encumbranceOver(hero) {
  const totalEnc =
    (Number(hero.weapon.enc) || 0) +
    Object.values(hero.armour).reduce((s, p) => s + (Number(p.enc) || 0), 0) +
    hero.backpack.reduce((s, i) => s + (Number(i.enc) || 0), 0);
  return totalEnc > (Number(hero.stats.STR) || 0);
}

const defaultParty = () => ({
  threat: 2, threatFloor: 2, morale: 0, food: 4, coins: 150,
  settlementName: "",
  settlementAP: {}, // heroId -> { spent: number, log: [{label, cost}] }
  innCostPerNight: 0,
  startingMorale: 0,
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
  { label: "Rest between quests", delta: "1d3", positive: true },
  { label: "Drinking & carousing (costs 1d3×100 coins)", delta: "1d6", positive: true },
];

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

// Settlements — quest dice/colour from the Settlements chapter, event-roll threshold
// (roll 1d12 on entering; a result inside this range triggers a Settlement Event).
// Birnheim and Durburim are Dwarven settlements with no quest dice listed in the book.
const SETTLEMENTS = [
  { name: "Birnheim", questDice: "", colour: "", eventOn: [11, 12] },
  { name: "Caelkirk", questDice: "1d4", colour: "Red", eventOn: [10, 12] },
  { name: "Coalfell", questDice: "1d6", colour: "Green", eventOn: [11, 12] },
  { name: "Durburim", questDice: "", colour: "", eventOn: [11, 12] },
  { name: "Freyfell", questDice: "1d6", colour: "Pink", eventOn: [10, 12] },
  { name: "Irondale", questDice: "1d6", colour: "Turqoise", eventOn: [11, 12] },
  { name: "Rochdale", questDice: "1d6", colour: "Purple", eventOn: [11, 12] },
  { name: "Silver City", questDice: "2d20", colour: "White", eventOn: [8, 12] },
  { name: "The Outpost", questDice: "1d12", colour: "Yellow", eventOn: [9, 12] },
  { name: "Whiteport", questDice: "1d6", colour: "Black", eventOn: [9, 12] },
  { name: "Windfair", questDice: "1d6", colour: "Blue", eventOn: [11, 12] },
];

// Settlement Events (1d12) — full table from the Settlements chapter.
// `resolve` marks events with a spelled-out follow-up roll the app can auto-apply.
const SETTLEMENT_EVENTS = [
  { roll: 1, title: "Stray Dog", text: "A stray dog follows the party through the streets. After a small treat from a hero, you now own it. Randomise the kind of dog (Companions' Compendium), or if you already have one, treat as 'Nothing special happens'." },
  { roll: 2, title: "Scrolls Salesman", text: "A man approaches selling magic scrolls. Randomise three available spells. Each scroll costs 100c.", resolve: "scrolls" },
  { roll: 3, title: "Potion Salesman", text: "A man in purple robes sells premium potions. Use the Potions Table with an availability of 4 for every potion regardless of class, and -20c as a price modifier." },
  { roll: 4, title: "Trinket Salesman", text: "An old man sells magic trinkets, 100c each, max 1 per hero. Roll 1d12 per trinket: 1-5 magic, 5-11 useless (cannot be sold), 12 cursed (roll on Curses Table). Decide ring or necklace." },
  { roll: 5, title: "Sale!", text: "A settlement-wide sale — all stores sell items at a 20% discount." },
  { roll: 6, title: "Fresh Stocks", text: "All stores just restocked. All availabilities are modified by +2 (a result of 6 is automatically in stock)." },
  { roll: 7, title: "Settlement Feast", text: "A celebration boosts Party Morale by +2 (temporarily, can exceed max) if you stay the night. On 1d12 of 9-12, no beds are available and the party must continue travel without business (quest reward may still be claimed).", resolve: "feast" },
  { roll: 8, title: "Side Quest", text: "A citizen urgently requests help. Roll on the Side Quest Table and decide whether to add it to the current quest." },
  { roll: 9, title: "Shortage of Goods", text: "No trade caravans for weeks. All availabilities modified by -2 (0 = automatically out of stock). Prices up +10%." },
  { roll: 10, title: "Thief", text: "A pickpocket gets too close. 1d100 coins are stolen from the party.", resolve: "thief" },
  { roll: 11, title: "Assassination Attempt", text: "Someone holds a grudge. Randomise one hero attacked by 1d4 bandits (randomise weapons; ranged bandits also carry daggers). Fight on the city tile; heroes are nursed to 1 HP instead of dying. Bandits may be searched afterward.", resolve: "assassination" },
  { roll: 12, title: "Curse!", text: "An old woman curses the party. Roll on the Curses Table once and apply to all heroes until they exit the next dungeon.", resolve: "curse" },
];

// Curses Table (1d10) — Appendix III, referenced by several settlement/magic-item events.
const CURSES_TABLE = [
  { roll: 1, text: "-2 Hit Points" },
  { roll: 2, text: "-5 Wisdom" },
  { roll: 3, text: "-5 Constitution" },
  { roll: 4, text: "-5 Strength" },
  { roll: 5, text: "-5 Dexterity" },
  { roll: 6, text: "-3 Hit Points" },
  { roll: 7, text: "-10 Resolve" },
  { roll: 8, text: "-5 on a Random Skill" },
  { roll: 9, text: "-1 Luck" },
  { roll: 10, text: "-1 Energy" },
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
const SETTLEMENT_ACTIVITIES = [
  { name: "Arena Fighting", where: "Arena", ap: 1 },
  { name: "Banking", where: "Banks", ap: 1 },
  { name: "Buy a Dog", where: "Kennel", ap: 1 },
  { name: "Buy a Familiar", where: "Alberta's Magnificent Animals", ap: 1 },
  { name: "Buy or Sell Armour", where: "Blacksmith", ap: 1 },
  { name: "Buy or Sell Equipment", where: "General Store, The Magic Brewery", ap: 1 },
  { name: "Buy Ingredients", where: "Herbalist, Alchemists' Guild", ap: 1 },
  { name: "Buy or Sell Weapons", where: "Blacksmith", ap: 1 },
  { name: "Charge a Magic Item", where: "Wizards' Guild", ap: 1 },
  { name: "Collect Quest Reward", where: "Start Settlement of Quest", ap: 0 },
  { name: "Create a Scroll", where: "Inn", ap: 1, note: "per scroll, max 2" },
  { name: "Cure Disease", where: "Sick Wards or Temple of Metheia", ap: 1 },
  { name: "Cure Poison", where: "Sick Wards", ap: 1 },
  { name: "Enchant Objects", where: "Inn", ap: 1, note: "max once" },
  { name: "Gamble", where: "Inn", ap: 0, note: "requires stay at inn" },
  { name: "Guild Business", where: "Guilds", ap: 1 },
  { name: "Horse Racing", where: "Horse tracks", ap: 1 },
  { name: "Identify a Magic Item", where: "Scryer or Wizards' Guild", ap: 1 },
  { name: "Identify a Potion", where: "Alchemist Guild, The Magic Brewery, General Store", ap: 1 },
  { name: "Learn a Prayer", where: "Temple Grounds", ap: 1 },
  { name: "Learn a Spell", where: "Wizards' Guild", ap: 3 },
  { name: "Level Up", where: "Any Settlement", ap: 0 },
  { name: "Pray", where: "Temple", ap: 1 },
  { name: "Read your Fortune", where: "Fortune Teller", ap: 1 },
  { name: "Repair Equipment", where: "Blacksmith", ap: 1 },
  { name: "Rest and Recuperation", where: "Inn", ap: 0, note: "requires stay at inn" },
  { name: "Skill Training", where: "Guilds", ap: 1 },
  { name: "Tend to those Memories", where: "Inn", ap: 0, note: "requires stay at inn" },
  { name: "Treat Mental Conditions", where: "The Asylum", ap: 5 },
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
  "+1 enemy/hero token for Perfect Hearing",
  "+1 hero token for Swift Leader talent",
  "+1 enemy token for Sneaky",
  "+2 enemy tokens if the door was bashed down",
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

// Builds the hero patch for applying (sign=1) or reversing (sign=-1) a talent's effect.
function talentEffectPatch(hero, talentName, sign) {
  const eff = TALENT_EFFECTS[talentName];
  if (!eff) return {};
  const patch = {};
  if (eff.stat) patch.stats = { ...hero.stats, [eff.stat]: Math.max(0, (Number(hero.stats[eff.stat]) || 0) + sign * eff.amount) };
  if (eff.skill) patch.skills = { ...hero.skills, [eff.skill]: Math.max(0, (Number(hero.skills[eff.skill]) || 0) + sign * eff.amount) };
  if (eff.hp) patch.hp = adjustCurMax(hero.hp, eff.hp, sign);
  if (eff.mana) patch.mana = adjustCurMax(hero.mana, eff.mana, sign);
  if (eff.sanity) patch.sanity = adjustCurMax(hero.sanity, eff.sanity, sign);
  if (eff.luck) patch.luck = Math.max(0, hero.luck + sign * eff.luck);
  if (eff.movement) patch.movement = Math.max(0, (hero.movement ?? 4) + sign * eff.movement);
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
    skills: { ...base.skills, ...(h.skills || {}) },
    ipSpentThisLevel: h.ipSpentThisLevel || {},
    weapon: { ...base.weapon, ...(h.weapon || {}), dur: mergeDur(h.weapon && h.weapon.dur) },
    talents: h.talents || base.talents,
    perks: h.perks || base.perks,
    spells: h.spells || base.spells,
    prayers: h.prayers || base.prayers,
    specialRules: h.specialRules || base.specialRules,
    conditions: h.conditions || base.conditions,
    backpack: h.backpack || base.backpack,
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

function HeroCard({ hero, update, remove, addLog }) {
  const [sanityEvent, setSanityEvent] = useState(SANITY_EVENTS[0].label);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch) => update({ ...hero, ...patch });
  const setStat = (k, v) => update({ ...hero, stats: { ...hero.stats, [k]: v } });
  const setSkill = (k, v) => update({ ...hero, skills: { ...hero.skills, [k]: v } });
  const setWeapon = (patch) => update({ ...hero, weapon: { ...hero.weapon, ...patch } });
  const pickWeapon = (name) => {
    const w = WEAPONS.find((x) => x.name === name);
    if (!w) return;
    update({ ...hero, weapon: { name: w.name, dmg: w.dmg, enc: w.enc, dur: { cur: 6, max: 6 } } });
  };
  const setArmourPiece = (loc, patch) => update({ ...hero, armour: { ...hero.armour, [loc]: { ...hero.armour[loc], ...patch } } });

  const extraSkillKey = CASTER_SKILL[hero.profession] || PRAYER_SKILL[hero.profession] || null;
  const visibleSkills = [
    "cs", "rs", "dodge", "pickLocks", "barter", "heal", "alchemy", "perception", "foraging",
    ...(extraSkillKey ? [extraSkillKey] : []),
  ];

  const applySanity = () => {
    const ev = SANITY_EVENTS.find((e) => e.label === sanityEvent);
    if (!ev) return;
    let d = ev.delta;
    if (d === "1d3") d = rollDie(3);
    if (d === "1d6") d = rollDie(6);
    const cur = clamp(hero.sanity.cur + d, 0, hero.sanity.max);
    set({ sanity: { ...hero.sanity, cur } });
  };

  const speciesData = SPECIES_DATA.find((s) => s.name === hero.species);

  const rollStartingStats = () => {
    if (!speciesData) return;
    const hpRoll = speciesData.hp.base + Array.from({ length: speciesData.hp.count }, () => rollDie(speciesData.hp.size)).reduce((a, b) => a + b, 0);
    const newStats = {};
    Object.entries(speciesData.stats).forEach(([k, base]) => {
      newStats[k] = base + rollDie(10);
    });
    const nextSkills = hero.profession ? computeProfessionSkills({ ...hero, stats: newStats }) : hero.skills;
    const isCaster = !!CASTER_SKILL[hero.profession];
    const manaPatch = isCaster ? { mana: { cur: newStats.WIS, max: newStats.WIS } } : {};
    update({ ...hero, stats: newStats, skills: nextSkills, hp: { cur: hpRoll, max: hpRoll }, creationPoints: 15, ...manaPatch });
  };

  const recalcSkills = () => set({ skills: computeProfessionSkills(hero) });

  const rollBackground = () => set({ background: BACKGROUNDS[rollDie(BACKGROUNDS.length) - 1] });

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
        patch.luck = hero.luck + 1;
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

  const addBackpackItem = () => {
    if (hero.backpackSize > 0 && hero.backpack.length >= hero.backpackSize) return;
    set({ backpack: [...hero.backpack, { id: uid(), name: "", value: "", enc: "", dur: "" }] });
  };
  const updateBackpackItem = (id, patch) => set({ backpack: hero.backpack.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const removeBackpackItem = (id) => set({ backpack: hero.backpack.filter((it) => it.id !== id) });

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
  const isEncumbered = totalEnc > (Number(hero.stats.STR) || 0);
  const weaponRef = WEAPONS.find((w) => w.name === hero.weapon.name);
  const strReq = weaponRef ? WEAPON_CLASS_STR_REQ[weaponRef.class] : null;
  // twoH is always the lower/easier bar (wielding one-handed needs more STR, where possible
  // at all) — so that's the real "can this hero use it" threshold.
  const strTooWeak = strReq ? (Number(hero.stats.STR) || 0) < strReq.twoH : false;

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
                const manaPatch = isCaster ? { mana: { cur: hero.stats.WIS, max: hero.stats.WIS } } : {};
                update({ ...hero, profession, skills: nextSkills, ...manaPatch });
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
                onChange={(e) => set({ xp: Number(e.target.value) || 0 })}
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
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1">Stats</div>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {Object.entries(hero.stats).map(([k, v]) => {
              const max = speciesData && speciesData.max ? speciesData.max[k] : null;
              const overMax = max != null && v > max;
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
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <label className="text-xs col-span-2" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Background
              <div className="flex gap-1.5 mt-0.5">
                <select
                  value={hero.background}
                  onChange={(e) => set({ background: e.target.value })}
                  className="flex-1 text-xs rounded px-2 py-1"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                >
                  <option value="">None…</option>
                  {BACKGROUNDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <button onClick={rollBackground} className="px-2 rounded" style={{ background: palette.gold, color: palette.charcoal }}>
                  <Dice5 size={13} />
                </button>
              </div>
            </label>

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
              Creation Points
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
                    <button
                      key={key}
                      onClick={() => spendIP(key)}
                      disabled={disabled}
                      className="text-[10px] px-1.5 py-1 rounded flex items-center justify-between gap-1"
                      style={{
                        background: disabled ? "#00000010" : "#fff",
                        border: `1px solid ${palette.line}`,
                        color: palette.ink,
                        fontFamily: "Crimson Pro, serif",
                        opacity: disabled ? 0.5 : 1,
                      }}
                      title={atCap ? `Already at the +${cap}/level cap` : !canAfford ? "Not enough IP" : `Spend ${cost} IP for +1`}
                    >
                      <span className="truncate">{label}</span>
                      <span className="shrink-0" style={{ fontFamily: "JetBrains Mono, monospace" }}>{cost}{spent > 0 ? ` (${spent}/${cap})` : ""}</span>
                    </button>
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
            Creation Points: 15 to spend on the rolled stats/HP above at creation, no more than 10 into any single one. Improvement Points: +15 each level-up (Level Up also rolls the automatic HP/Luck/Energy gains for the new level) — the buttons above apply the actual increase and enforce the +5/stat-skill and +2/HP per-level caps; cost doubles once a stat/skill has passed 70.
          </p>

          <div className="rounded p-2 mb-3 flex items-center justify-between" style={{ background: "#00000008" }}>
            <div>
              <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }}>LUCK</div>
              <p className="text-[10px]" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>Spend 1 to reroll a dice roll that directly affects you.</p>
            </div>
            <Stepper value={hero.luck} onChange={(v) => set({ luck: v })} min={0} max={999} />
          </div>

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
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1">Weapon</div>
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
            <div className="flex gap-1.5 flex-wrap">
              <input
                value={hero.weapon.name}
                onChange={(e) => setWeapon({ name: e.target.value })}
                placeholder="Name"
                className="flex-1 text-xs rounded px-2 py-1 min-w-0"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
              />
              <input
                value={hero.weapon.dmg}
                onChange={(e) => setWeapon({ dmg: e.target.value })}
                placeholder="DMG"
                className="w-16 text-xs rounded px-2 py-1"
                style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
              />
              <div className="flex items-center gap-1 text-xs" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                ENC
                <input type="number" value={hero.weapon.enc} onChange={(e) => setWeapon({ enc: Number(e.target.value) || 0 })}
                  className="w-9 rounded px-1" style={{ border: `1px solid ${palette.line}` }} />
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
                DUR
                <input type="number" value={hero.weapon.dur.cur} onChange={(e) => setWeapon({ dur: { ...hero.weapon.dur, cur: Number(e.target.value) || 0 } })}
                  className="w-9 rounded px-1" style={{ border: `1px solid ${palette.line}` }} />
                /
                <input type="number" value={hero.weapon.dur.max} onChange={(e) => setWeapon({ dur: { ...hero.weapon.dur, max: Number(e.target.value) || 0 } })}
                  className="w-9 rounded px-1" style={{ border: `1px solid ${palette.line}` }} />
              </div>
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
            <div className="space-y-2">
              {[["head", "Head"], ["arms", "Arms"], ["torso", "Torso"], ["legs", "Legs"], ["shield", "Shield"]].map(([loc, label]) => (
                <div key={loc}>
                  <div className="text-xs font-semibold mb-0.5" style={{ fontFamily: "Cinzel, serif", color: palette.inkSoft }}>{label}</div>
                  <div className="flex items-center gap-1 text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.ink }}>
                    <span style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>DEF</span>
                    <input type="number" value={hero.armour[loc].def} onChange={(e) => setArmourPiece(loc, { def: Number(e.target.value) || 0 })}
                      className="w-9 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                    <span style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>ENC</span>
                    <input type="number" value={hero.armour[loc].enc} onChange={(e) => setArmourPiece(loc, { enc: Number(e.target.value) || 0 })}
                      className="w-9 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                    <span style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>DUR</span>
                    <input type="number" value={hero.armour[loc].dur.cur} onChange={(e) => setArmourPiece(loc, { dur: { ...hero.armour[loc].dur, cur: Number(e.target.value) || 0 } })}
                      className="w-8 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                    <span style={{ color: palette.inkSoft }}>/</span>
                    <input type="number" value={hero.armour[loc].dur.max} onChange={(e) => setArmourPiece(loc, { dur: { ...hero.armour[loc].dur, max: Number(e.target.value) || 0 } })}
                      className="w-8 min-w-0 rounded px-1" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Encumbrance */}
          <div className="rounded p-2 mb-3" style={{ background: isEncumbered ? "#7A1F2B22" : "#00000008" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase">Encumbrance</span>
              <span className="text-sm font-bold" style={{ fontFamily: "JetBrains Mono, monospace", color: isEncumbered ? palette.crimson : palette.ink }}>
                {totalEnc} / {hero.stats.STR} <span style={{ color: palette.inkSoft, fontWeight: "normal" }}>(max {hero.stats.STR + 15})</span>
              </span>
            </div>
            {isEncumbered && (
              <p className="text-xs mt-1" style={{ color: palette.crimson, fontFamily: "Crimson Pro, serif", fontWeight: "bold" }}>
                Overloaded — all skills and stats are at −10 (shown as "eff" above) until ENC drops to {hero.stats.STR} or below.
              </p>
            )}
          </div>

          {/* Backpack */}
          <div className="flex items-center justify-between mb-1">
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase">Backpack</div>
            <label className="flex items-center gap-1 text-[10px]" style={{ color: palette.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>
              Size
              <input
                type="number"
                value={hero.backpackSize}
                onChange={(e) => set({ backpackSize: Number(e.target.value) || 0 })}
                className="w-10 rounded px-1"
                style={{ border: `1px solid ${palette.line}` }}
              />
            </label>
          </div>
          <div className="rounded overflow-hidden mb-1.5" style={{ border: `1px solid ${palette.line}` }}>
            <div className="flex gap-1 px-1.5 py-1 text-xs font-bold uppercase" style={{ background: palette.charcoal, color: palette.goldSoft, fontFamily: "Cinzel, serif" }}>
              <span className="flex-1 min-w-0">Item</span>
              <span className="w-14 shrink-0">Value</span>
              <span className="w-12 shrink-0">ENC</span>
              <span className="w-12 shrink-0">Dur</span>
              <span className="w-6 shrink-0"></span>
            </div>
            {hero.backpack.length === 0 && (
              <p className="text-xs px-2 py-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>Empty.</p>
            )}
            {hero.backpack.map((item, idx) => (
              <div key={item.id} className="flex gap-1 px-1.5 py-1 items-center" style={{ background: idx % 2 ? "#00000006" : "transparent", borderTop: `1px solid ${palette.line}55` }}>
                <input
                  value={item.name}
                  onChange={(e) => updateBackpackItem(item.id, { name: e.target.value })}
                  placeholder="Item name"
                  className="flex-1 min-w-0 text-xs rounded px-1 py-0.5"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "Crimson Pro, serif" }}
                />
                <input
                  value={item.value}
                  onChange={(e) => updateBackpackItem(item.id, { value: e.target.value })}
                  className="w-14 shrink-0 text-xs rounded px-1 py-0.5"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                />
                <input
                  value={item.enc}
                  onChange={(e) => updateBackpackItem(item.id, { enc: e.target.value })}
                  className="w-12 shrink-0 text-xs rounded px-1 py-0.5"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                />
                <input
                  value={item.dur}
                  onChange={(e) => updateBackpackItem(item.id, { dur: e.target.value })}
                  className="w-12 shrink-0 text-xs rounded px-1 py-0.5"
                  style={{ background: "#fff", border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }}
                />
                <button onClick={() => removeBackpackItem(item.id)} className="w-6 shrink-0 flex justify-center" style={{ color: palette.crimson }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addBackpackItem}
            disabled={hero.backpackSize > 0 && hero.backpack.length >= hero.backpackSize}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded font-semibold mb-3"
            style={{
              background: (hero.backpackSize > 0 && hero.backpack.length >= hero.backpackSize) ? "#00000015" : palette.forestDark,
              color: (hero.backpackSize > 0 && hero.backpack.length >= hero.backpackSize) ? palette.inkSoft : palette.parchment,
              fontFamily: "Cinzel, serif",
            }}
          >
            <Plus size={13} /> Add Backpack Item{hero.backpackSize > 0 ? ` (${hero.backpack.length}/${hero.backpackSize})` : ""}
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
  const [sellPrice, setSellPrice] = useState(100);
  const [sellLostDur, setSellLostDur] = useState(0);
  const [sellMaxDur, setSellMaxDur] = useState(6);
  const [sellResult, setSellResult] = useState(null);
  const [repairPrice, setRepairPrice] = useState(100);
  const [repairPoints, setRepairPoints] = useState(1);
  const [repairResult, setRepairResult] = useState(null);
  // Tracks opted-OUT heroes rather than opted-in, so heroes added later still default to selected.
  const [restExcluded, setRestExcluded] = useState(() => new Set());

  const settlement = SETTLEMENTS.find((s) => s.name === party.settlementName);
  const isSilverCity = party.settlementName === "Silver City";
  const currentActivityHero = heroes.some((h) => h.id === activityHero) ? activityHero : (heroes[0]?.id || "");
  const selectedActivity = SETTLEMENT_ACTIVITIES.find((a) => a.name === activityChoice);

  const setSettlementName = (name) => {
    setParty({ ...party, settlementName: name });
    setEventResult(null);
    setQuestResult(null);
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
      const line = `Rolled ${roll} → ${curse.text}. Apply to all heroes manually until they next exit a dungeon (no duration tracking in-app yet).`;
      setEventResolution([line]);
      addLog(`Curse!: rolled ${roll} → ${curse.text} (applies to all heroes until next dungeon exit).`);
    }
  };

  const rollQuests = () => {
    if (!settlement) return;
    const roll = rollDie(6);
    const row = QUEST_AVAILABILITY.find((r) => roll >= r.roll[0] && roll <= r.roll[1]);
    const text = isSilverCity ? row.silverCity : row.settlement;
    let side = null;
    if (text !== "-") {
      const roll8 = rollDie(8);
      side = roll8 <= 2;
      setQuestResult({ roll, text, roll8, side });
      addLog(`${settlement.name}: quests roll ${roll} → ${text}. Side-quest check (${roll8}) → ${side ? "side quest also available" : "no side quest"}.`);
    } else {
      setQuestResult({ roll, text, roll8: null, side: null });
      addLog(`${settlement.name}: quests roll ${roll} → no quests available here.`);
    }
  };

  const heroAP = (heroId) => party.settlementAP?.[heroId] || { spent: 0, log: [] };

  const addActivity = () => {
    if (!currentActivityHero) return;
    const activity = SETTLEMENT_ACTIVITIES.find((a) => a.name === activityChoice);
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
    if (party.innCostPerNight > party.coins) {
      setRestResult({ ok: false, lines: [`Can't afford the inn: costs ${party.innCostPerNight}c, party only has ${party.coins}c.`] });
      return;
    }
    const summary = [];
    selected.forEach((hero) => {
      const roll = rollDie(6) + rollDie(6);
      const newHp = Math.min(hero.hp.max, hero.hp.cur + roll);
      const next = {
        ...hero,
        hp: { ...hero.hp, cur: newHp },
        mana: { ...hero.mana, cur: hero.mana.max },
        energy: { ...hero.energy, cur: hero.energy.max },
      };
      updateHero(hero.id, next);
      summary.push(`${hero.name}: +${roll} HP (${newHp}/${hero.hp.max}), Mana & Energy refilled`);
      addLog(`${hero.name} rests at the inn: +${roll} HP (${newHp}/${hero.hp.max}), Mana & Energy refilled.`);
    });
    if (party.innCostPerNight > 0) {
      setParty((prev) => ({ ...prev, coins: prev.coins - prev.innCostPerNight }));
      summary.push(`Paid ${party.innCostPerNight}c for the inn.`);
      addLog(`Paid ${party.innCostPerNight}c for the inn (whole party).`);
    }
    setRestResult({ ok: true, lines: summary });
  };

  const doSell = () => {
    if (sellPrice < 10) {
      setSellResult({ ok: false, line: "Items worth less than 10c cannot be sold." });
      return;
    }
    if (sellLostDur >= sellMaxDur) {
      setSellResult({ ok: false, line: "Can't sell an item that has lost all its durability." });
      return;
    }
    const value = sellValue(sellPrice, sellLostDur);
    setParty((prev) => ({ ...prev, coins: prev.coins + value }));
    setSellResult({ ok: true, line: `Sold for ${value}c (party now has ${party.coins + value}c).` });
    addLog(`Sold an item (${sellPrice}c base, ${sellLostDur} durability lost) for ${value}c.`);
  };

  const doRepair = () => {
    const perPoint = repairCostPerPoint(repairPrice);
    const total = perPoint * repairPoints;
    if (total > party.coins) {
      setRepairResult({ ok: false, line: `Can't afford it: repairing ${repairPoints} point${repairPoints === 1 ? "" : "s"} costs ${total}c, party only has ${party.coins}c.` });
      return;
    }
    setParty((prev) => ({ ...prev, coins: prev.coins - total }));
    setRepairResult({ ok: true, line: `Repaired ${repairPoints} point${repairPoints === 1 ? "" : "s"} for ${total}c (${perPoint}c/point). Party now has ${party.coins - total}c.` });
    addLog(`Repaired ${repairPoints} durability point${repairPoints === 1 ? "" : "s"} on an item (${repairPrice}c base) for ${total}c.`);
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
          <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            Quest dice: {settlement.questDice || "— (no quests here)"} {settlement.colour && `(${settlement.colour})`} · Event on {settlement.eventOn[0]}
            {settlement.eventOn[0] !== settlement.eventOn[1] ? `-${settlement.eventOn[1]}` : ""} (1d12)
          </p>
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
                Side-quest check ({questResult.roll8}): {questResult.side ? "a side quest is also available." : "no side quest."}
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
        <SectionTitle icon={ClipboardList}>Activities (1 AP / hero / day)</SectionTitle>
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
          {SETTLEMENT_ACTIVITIES.map((a) => (
            <option key={a.name} value={a.name}>{a.name} — {a.ap} AP</option>
          ))}
        </select>
        {selectedActivity && (
          <p className="text-xs mb-2 truncate" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
            {selectedActivity.where}{selectedActivity.note ? ` · ${selectedActivity.note}` : ""}
          </p>
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
          Blacksmith only, settlements only. Sell value = purchase price × 70% at full durability, dropping 10% per point lost (min 20% at 5+ lost). Repair costs the same 20%-of-price rate per point.
        </p>

        <div className="rounded p-2 mb-3" style={{ background: "#00000008" }}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1.5">Sell an Item</div>
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
          {sellResult && (
            <p className="text-xs mt-1.5 font-semibold" style={{ color: sellResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>
              {sellResult.line}
            </p>
          )}
        </div>

        <div className="rounded p-2" style={{ background: "#00000008" }}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: palette.inkSoft }} className="uppercase mb-1.5">Repair an Item</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Price
              <input type="number" value={repairPrice} onChange={(e) => setRepairPrice(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5 font-bold" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
            </label>
            <label className="text-xs" style={{ fontFamily: "Crimson Pro, serif", color: palette.inkSoft }}>
              Points to Repair
              <input type="number" value={repairPoints} onChange={(e) => setRepairPoints(Number(e.target.value) || 0)} className="w-full rounded px-2 py-1 mt-0.5 font-bold" style={{ border: `1px solid ${palette.line}`, fontFamily: "JetBrains Mono, monospace" }} />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif" }}>
              Costs <b style={{ color: palette.ink }}>{repairCostPerPoint(repairPrice) * repairPoints}c</b> ({repairCostPerPoint(repairPrice)}c/point)
            </span>
            <button onClick={doRepair} className="text-xs px-3 py-1.5 rounded font-semibold" style={{ background: palette.crimsonDark, color: palette.parchment }}>
              Repair
            </button>
          </div>
          {repairResult && (
            <p className="text-xs mt-1.5 font-semibold" style={{ color: repairResult.ok ? palette.forestDark : palette.crimson, fontFamily: "Crimson Pro, serif" }}>
              {repairResult.line}
            </p>
          )}
        </div>
      </Panel>

      <Panel className="mb-4">
        <SectionTitle icon={Bed}>Rest at Inn</SectionTitle>
        <p className="text-xs mb-2" style={{ color: palette.inkSoft, fontFamily: "Crimson Pro, serif", fontStyle: "italic" }}>
          Each resting hero regains 2d6 HP and refills Mana and Energy. Note: Luck isn't tracked with a max here, so it isn't auto-refilled — adjust it manually if your table restores it at the inn.
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

function PartyPanel({ party, setParty, log, addLog, heroes, updateHero }) {
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
    heroes.forEach((h) => updateHero(h.id, { ...h, xp: h.xp + Number(xpAmount) }));
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
          Roll the scenario die each turn once the party is past the first door. On a 9 or 0 (or the quest's level), make a threat roll — check the Threat Table in Reference.
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
function DiceTray() {
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
function HeroesTab({ heroes, updateHero, removeHero, addHero, addLog }) {
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
              className="shrink-0 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shrink-0"
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
        {tab === "party" && <PartyPanel party={party} setParty={setParty} log={log} addLog={addLog} heroes={heroes} updateHero={updateHero} />}
        {tab === "settlement" && (
          <SettlementTab party={party} setParty={setParty} heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />
        )}
        {tab === "heroes" && (
          <HeroesTab heroes={heroes} updateHero={updateHero} removeHero={removeHero} addHero={addHero} addLog={addLog} />
        )}
        {tab === "combat" && <CombatCalc heroes={heroes} updateHero={(next) => updateHero(next.id, next)} addLog={addLog} />}
        {tab === "dice" && <DiceTray />}
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
