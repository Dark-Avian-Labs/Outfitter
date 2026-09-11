import { GEAR_STAT_KEYS, type GearSlot, type GearStatKey } from './catalog.js';
import { EMPTY_STAT_BAG, addStatBags, type StatBag } from './formulas.js';
import { SET_BY_KEY, type SetStatBonus } from './sets.js';

export type GearSubstat = {
  stat: GearStatKey;
  value: number;
};

export type GearPieceInput = {
  id: number;
  slot: GearSlot;
  setKey: string;
  mainStat: GearStatKey;
  mainValue: number;
  mainBonus: number;
  substats: GearSubstat[];
  equippedHeroSlug: string | null;
};

function applyGearStat(bag: StatBag, stat: GearStatKey, value: number): StatBag {
  switch (stat) {
    case 'hp':
      return addStatBags(bag, { flatHp: value });
    case 'atk':
      return addStatBags(bag, { flatAtk: value });
    case 'def':
      return addStatBags(bag, { flatDef: value });
    case 'hpBonus':
      return addStatBags(bag, { hpPct: value });
    case 'atkBonus':
      return addStatBags(bag, { atkPct: value });
    case 'defBonus':
      return addStatBags(bag, { defPct: value });
    case 'atkSpd':
      return addStatBags(bag, { atkSpd: value });
    case 'critRate':
      return addStatBags(bag, { critRate: value });
    case 'critDmg':
      return addStatBags(bag, { critDmg: value });
    case 'healingEffect':
      return addStatBags(bag, { healingEffect: value });
    case 'rageRegen':
      return addStatBags(bag, { rageRegen: value });
    default: {
      const _exhaustive: never = stat;
      return _exhaustive;
    }
  }
}

export function applySetBonus(bag: StatBag, bonus: SetStatBonus): StatBag {
  return addStatBags(bag, {
    hpPct: bonus.hpPct,
    atkPct: bonus.atkPct,
    defPct: bonus.defPct,
    atkSpd: bonus.atkSpd,
    critRate: bonus.critRate,
    critDmg: bonus.critDmg,
    healingEffect: bonus.healingEffect,
    rageRegen: bonus.rageRegen,
    rageRegenAuto: bonus.rageRegenAuto,
    damageTaken: bonus.damageTaken,
    aoeDamage: bonus.aoeDamage,
    stDamage: bonus.stDamage,
    basicAtkDamage: bonus.basicAtkDamage,
    damageAfterCrit: bonus.damageAfterCrit,
    damageAfterUlt: bonus.damageAfterUlt,
    critDmgAfterUlt: bonus.critDmgAfterUlt,
    damageOnUlt: bonus.damageOnUlt,
    damageOnCrit: bonus.damageOnCrit,
    damageAura: bonus.damageAura,
    glacier: bonus.glacier,
  });
}

export function pieceStatBag(piece: GearPieceInput): StatBag {
  let bag = EMPTY_STAT_BAG;
  bag = applyGearStat(bag, piece.mainStat, piece.mainValue + piece.mainBonus);
  for (const sub of piece.substats) {
    if (!GEAR_STAT_KEYS.includes(sub.stat)) continue;
    bag = applyGearStat(bag, sub.stat, sub.value);
  }
  return bag;
}

export type ArtifactStatInput = {
  hp_base: number;
  hp_bonus: number;
  atk_base: number;
  atk_bonus: number;
  secondary_stat: GearStatKey | null;
  secondary_value: number | null;
};

export function artifactStatBag(artifact: ArtifactStatInput): StatBag {
  let bag = addStatBags(EMPTY_STAT_BAG, {
    flatHp: artifact.hp_base + artifact.hp_bonus,
    flatAtk: artifact.atk_base + artifact.atk_bonus,
  });
  if (
    artifact.secondary_stat != null &&
    artifact.secondary_value != null &&
    GEAR_STAT_KEYS.includes(artifact.secondary_stat)
  ) {
    bag = applyGearStat(bag, artifact.secondary_stat, artifact.secondary_value);
  }
  return bag;
}

export function loadoutStatBag(
  pieces: GearPieceInput[],
  artifact?: ArtifactStatInput | null,
): StatBag {
  let bag = EMPTY_STAT_BAG;
  for (const piece of pieces) {
    bag = addStatBags(bag, pieceStatBag(piece));
  }
  const weapon = pieces.find((piece) => piece.slot === 'weapon');
  const armor = pieces.find((piece) => piece.slot === 'armor');
  if (weapon && armor && weapon.setKey === armor.setKey) {
    const set = SET_BY_KEY[weapon.setKey];
    if (set) bag = applySetBonus(bag, set.bonus);
  }
  const bangle = pieces.find((piece) => piece.slot === 'bangle');
  const amulet = pieces.find((piece) => piece.slot === 'amulet');
  const ring = pieces.find((piece) => piece.slot === 'ring');
  if (
    bangle &&
    amulet &&
    ring &&
    bangle.setKey === amulet.setKey &&
    amulet.setKey === ring.setKey
  ) {
    const set = SET_BY_KEY[bangle.setKey];
    if (set) bag = applySetBonus(bag, set.bonus);
  }
  if (artifact) bag = addStatBags(bag, artifactStatBag(artifact));
  return bag;
}
