export type SetSide = 'left' | 'right';

export type SetStatBonus = {
  hpPct?: number;
  atkPct?: number;
  defPct?: number;
  atkSpd?: number;
  critRate?: number;
  critDmg?: number;
  healingEffect?: number;
  rageRegen?: number;
  rageRegenAuto?: number;
  damageTaken?: number;
  aoeDamage?: number;
  stDamage?: number;
  basicAtkDamage?: number;
  damageAfterCrit?: number;
  damageAfterUlt?: number;
  critDmgAfterUlt?: number;
  damageOnUlt?: number;
  damageOnCrit?: number;
  damageAura?: number;
  glacier?: boolean;
};

export type GearSetDef = {
  key: string;
  name: string;
  side: SetSide;
  tier: 1 | 2 | 3;
  bonus: SetStatBonus;
};

export const LEFT_SETS: readonly GearSetDef[] = [
  { key: 'salvation', name: 'Salvation', side: 'left', tier: 1, bonus: { healingEffect: 25 } },
  { key: 'life_force', name: 'Life Force', side: 'left', tier: 1, bonus: { hpPct: 25 } },
  { key: 'calamity', name: 'Calamity', side: 'left', tier: 1, bonus: { atkPct: 25 } },
  { key: 'whirlwind', name: 'Whirlwind', side: 'left', tier: 1, bonus: { atkSpd: 75 } },
  {
    key: 'annihilating_might',
    name: 'Annihilating Might',
    side: 'left',
    tier: 1,
    bonus: { critDmg: 35 },
  },
  { key: 'warlord', name: 'Warlord', side: 'left', tier: 2, bonus: { atkPct: 25, atkSpd: 30 } },
  {
    key: 'immortal_warrior',
    name: 'Immortal Warrior',
    side: 'left',
    tier: 2,
    bonus: { hpPct: 25, defPct: 10 },
  },
  {
    key: 'wicked_vengeance',
    name: 'Wicked Vengeance',
    side: 'left',
    tier: 3,
    bonus: { critDmg: 40, atkPct: 10 },
  },
  {
    key: 'lights_grace',
    name: "Light's Grace",
    side: 'left',
    tier: 3,
    bonus: { healingEffect: 30, rageRegen: 10 },
  },
  {
    key: 'astral_guardian',
    name: 'Astral Guardian',
    side: 'left',
    tier: 3,
    bonus: { hpPct: 30, defPct: 15 },
  },
  { key: 'drakefire', name: 'Drakefire', side: 'left', tier: 3, bonus: { atkPct: 30 } },
  { key: 'goldmane', name: 'Goldmane', side: 'left', tier: 3, bonus: { hpPct: 30 } },
];

export const RIGHT_SETS: readonly GearSetDef[] = [
  { key: 'guardian', name: 'Guardian', side: 'right', tier: 1, bonus: { damageTaken: -15 } },
  { key: 'fatality', name: 'Fatality', side: 'right', tier: 1, bonus: { atkPct: 3 } },
  { key: 'curse', name: 'Curse', side: 'right', tier: 1, bonus: {} },
  { key: 'fracture', name: 'Fracture', side: 'right', tier: 1, bonus: { critDmg: 45 } },
  { key: 'mana_spring', name: 'Mana Spring', side: 'right', tier: 1, bonus: { rageRegenAuto: 3 } },
  { key: 'hawk_eye', name: 'Hawk Eye', side: 'right', tier: 1, bonus: {} },
  { key: 'the_glacier', name: 'The Glacier', side: 'right', tier: 1, bonus: { glacier: true } },
  {
    key: 'night_terror',
    name: 'Night Terror',
    side: 'right',
    tier: 1,
    bonus: { damageAfterCrit: 25 },
  },
  { key: 'the_styx', name: 'The Styx', side: 'right', tier: 1, bonus: { aoeDamage: 18 } },
  { key: 'the_doom', name: 'The Doom', side: 'right', tier: 1, bonus: { stDamage: 18 } },
  { key: 'the_wisdom', name: 'The Wisdom', side: 'right', tier: 1, bonus: { damageAfterUlt: 35 } },
  { key: 'the_insight', name: 'The Insight', side: 'right', tier: 1, bonus: { critRate: 15 } },
  {
    key: 'asclepius',
    name: 'Asclepius',
    side: 'right',
    tier: 1,
    bonus: { hpPct: 10, healingEffect: 20 },
  },
  { key: 'ageless_wrath', name: 'Ageless Wrath', side: 'right', tier: 2, bonus: { critDmg: 30 } },
  {
    key: 'invigoration',
    name: 'Invigoration',
    side: 'right',
    tier: 2,
    bonus: { healingEffect: 25, atkPct: 10 },
  },
  {
    key: 'soulbound_arcana',
    name: 'Soulbound Arcana',
    side: 'right',
    tier: 2,
    bonus: { damageOnUlt: 10 },
  },
  {
    key: 'infernal_roar',
    name: 'Infernal Roar',
    side: 'right',
    tier: 2,
    bonus: { basicAtkDamage: 10 },
  },
  { key: 'undying_savage', name: 'Undying Savage', side: 'right', tier: 2, bonus: {} },
  { key: 'morale', name: 'Morale', side: 'right', tier: 3, bonus: { damageAura: 4 } },
  { key: 'unshaken_will', name: 'Unshaken Will', side: 'right', tier: 3, bonus: { hpPct: 20 } },
  {
    key: 'hells_lament',
    name: "Hell's Lament",
    side: 'right',
    tier: 3,
    bonus: { damageAfterUlt: 35, critDmgAfterUlt: 50 },
  },
  {
    key: 'tempered_will',
    name: 'Tempered Will',
    side: 'right',
    tier: 3,
    bonus: { damageTaken: -15 },
  },
  { key: 'cataclysm', name: 'Cataclysm', side: 'right', tier: 3, bonus: { damageOnCrit: 10 } },
  {
    key: 'wings_of_grace',
    name: 'Wings of Grace',
    side: 'right',
    tier: 3,
    bonus: { healingEffect: 30, atkPct: 12 },
  },
  { key: 'greyfang', name: 'Greyfang', side: 'right', tier: 3, bonus: { basicAtkDamage: 35 } },
];

export const ALL_SETS: readonly GearSetDef[] = [...LEFT_SETS, ...RIGHT_SETS];

export const SET_BY_KEY: Record<string, GearSetDef> = Object.fromEntries(
  ALL_SETS.map((set) => [set.key, set]),
);

export function setsForSlot(slot: 'weapon' | 'armor' | 'bangle' | 'amulet' | 'ring'): GearSetDef[] {
  const side = slot === 'weapon' || slot === 'armor' ? 'left' : 'right';
  return ALL_SETS.filter((set) => set.side === side);
}
