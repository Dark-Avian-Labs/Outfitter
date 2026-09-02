export type HeroBaseStats = {
  hp: number;
  atk: number;
  def: number;
  atkInterval: number;
  rrAuto: number;
  rrAttack: number;
  rrAttacked: number;
};

export type StatBag = {
  flatHp: number;
  flatAtk: number;
  flatDef: number;
  hpPct: number;
  atkPct: number;
  defPct: number;
  atkSpd: number;
  critRate: number;
  critDmg: number;
  healingEffect: number;
  rageRegen: number;
  rageRegenAuto: number;
  damageTaken: number;
  aoeDamage: number;
  stDamage: number;
  basicAtkDamage: number;
  damageAfterCrit: number;
  damageAfterUlt: number;
  critDmgAfterUlt: number;
  damageOnUlt: number;
  damageOnCrit: number;
  damageAura: number;
  glacier: boolean;
};

export const EMPTY_STAT_BAG: StatBag = {
  flatHp: 0,
  flatAtk: 0,
  flatDef: 0,
  hpPct: 0,
  atkPct: 0,
  defPct: 0,
  atkSpd: 0,
  critRate: 0,
  critDmg: 0,
  healingEffect: 0,
  rageRegen: 0,
  rageRegenAuto: 0,
  damageTaken: 0,
  aoeDamage: 0,
  stDamage: 0,
  basicAtkDamage: 0,
  damageAfterCrit: 0,
  damageAfterUlt: 0,
  critDmgAfterUlt: 0,
  damageOnUlt: 0,
  damageOnCrit: 0,
  damageAura: 0,
  glacier: false,
};

export function addStatBags(left: StatBag, right: Partial<StatBag>): StatBag {
  return {
    flatHp: left.flatHp + (right.flatHp ?? 0),
    flatAtk: left.flatAtk + (right.flatAtk ?? 0),
    flatDef: left.flatDef + (right.flatDef ?? 0),
    hpPct: left.hpPct + (right.hpPct ?? 0),
    atkPct: left.atkPct + (right.atkPct ?? 0),
    defPct: left.defPct + (right.defPct ?? 0),
    atkSpd: left.atkSpd + (right.atkSpd ?? 0),
    critRate: left.critRate + (right.critRate ?? 0),
    critDmg: left.critDmg + (right.critDmg ?? 0),
    healingEffect: left.healingEffect + (right.healingEffect ?? 0),
    rageRegen: left.rageRegen + (right.rageRegen ?? 0),
    rageRegenAuto: left.rageRegenAuto + (right.rageRegenAuto ?? 0),
    damageTaken: left.damageTaken + (right.damageTaken ?? 0),
    aoeDamage: left.aoeDamage + (right.aoeDamage ?? 0),
    stDamage: left.stDamage + (right.stDamage ?? 0),
    basicAtkDamage: left.basicAtkDamage + (right.basicAtkDamage ?? 0),
    damageAfterCrit: left.damageAfterCrit + (right.damageAfterCrit ?? 0),
    damageAfterUlt: left.damageAfterUlt + (right.damageAfterUlt ?? 0),
    critDmgAfterUlt: left.critDmgAfterUlt + (right.critDmgAfterUlt ?? 0),
    damageOnUlt: left.damageOnUlt + (right.damageOnUlt ?? 0),
    damageOnCrit: left.damageOnCrit + (right.damageOnCrit ?? 0),
    damageAura: left.damageAura + (right.damageAura ?? 0),
    glacier: left.glacier || Boolean(right.glacier),
  };
}

export function scaledStat(base: number, flat: number, percent: number): number {
  return (base + flat) * (1 + percent / 100);
}

export function attackIntervalRaw(baseInterval: number, totalAtkSpd: number): number {
  const bonus = Math.max(0, totalAtkSpd - 100);
  return baseInterval * (0.28 + (0.72 * 200) / (200 + bonus));
}

export function attackIntervalDisplay(baseInterval: number, totalAtkSpd: number): number {
  return Math.round(attackIntervalRaw(baseInterval, totalAtkSpd) * 10) / 10;
}

export function attacksPerSecond(baseInterval: number, totalAtkSpd: number): number {
  const interval = attackIntervalRaw(baseInterval, totalAtkSpd);
  if (interval <= 0) return 0;
  return 1 / interval;
}

export function healingMultiplier(healingEffect: number): number {
  return 1 + (1.5 * healingEffect) / (100 + healingEffect);
}

const INHERENT_ATK_SPD = 100;
const GLACIER_HP_RATIO = 0.06;

export type FinalStats = {
  hp: number;
  hpGear: number;
  atk: number;
  atkGear: number;
  def: number;
  defGear: number;
  critRate: number;
  critDmg: number;
  atkSpd: number;
  atkSpdGear: number;
  attackInterval: number;
  healingEffect: number;
  healMultiplier: number;
  rageRegen: number;
  rageRegenAuto: number;
  damageTaken: number;
  aoeDamage: number;
  stDamage: number;
  basicAtkDamage: number;
  damageAfterCrit: number;
  damageAfterUlt: number;
  critDmgAfterUlt: number;
  damageOnUlt: number;
  damageOnCrit: number;
  damageAura: number;
};

export function computeFinalStats(hero: HeroBaseStats, bag: StatBag): FinalStats {
  const hp = scaledStat(hero.hp, bag.flatHp, bag.hpPct);
  let atk = scaledStat(hero.atk, bag.flatAtk, bag.atkPct);
  if (bag.glacier) {
    atk += GLACIER_HP_RATIO * hp;
  }
  const def = scaledStat(hero.def, bag.flatDef, bag.defPct);
  const totalAtkSpd = INHERENT_ATK_SPD + bag.atkSpd;
  return {
    hp,
    hpGear: hp - hero.hp,
    atk,
    atkGear: atk - hero.atk,
    def,
    defGear: def - hero.def,
    critRate: bag.critRate,
    critDmg: bag.critDmg,
    atkSpd: totalAtkSpd,
    atkSpdGear: bag.atkSpd,
    attackInterval: attackIntervalDisplay(hero.atkInterval, totalAtkSpd),
    healingEffect: bag.healingEffect,
    healMultiplier: healingMultiplier(bag.healingEffect),
    rageRegen: bag.rageRegen,
    rageRegenAuto: hero.rrAuto + bag.rageRegenAuto,
    damageTaken: bag.damageTaken,
    aoeDamage: bag.aoeDamage,
    stDamage: bag.stDamage,
    basicAtkDamage: bag.basicAtkDamage,
    damageAfterCrit: bag.damageAfterCrit,
    damageAfterUlt: bag.damageAfterUlt,
    critDmgAfterUlt: bag.critDmgAfterUlt,
    damageOnUlt: bag.damageOnUlt,
    damageOnCrit: bag.damageOnCrit,
    damageAura: bag.damageAura,
  };
}
