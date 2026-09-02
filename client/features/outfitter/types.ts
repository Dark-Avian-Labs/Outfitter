import type { HeroClassKey, FactionKey } from '@shared/catalog';
import type { FinalStats } from '@shared/formulas';

import type { GearView } from './GearTile';

export type GameAccount = {
  id: number;
  account_name: string;
  is_active: number;
};

export type HeroRow = {
  slug: string;
  name: string;
  class: HeroClassKey;
  faction: FactionKey;
  faction_secondary: FactionKey | null;
  rarity: string;
  star_rating: number;
  is_lord: number;
  portrait_path: string | null;
  hp: number;
  atk: number;
  def: number;
  atk_interval: number;
  rr_auto: number;
  rr_attack: number;
  rr_attacked: number;
  base_hp: number;
  base_atk: number;
  base_def: number;
  base_atk_interval: number;
};

export type OutfitResult = {
  score: number;
  pieces: Array<{
    id: number;
    slot: GearView['slot'];
    setKey: string;
    mainStat: GearView['main_stat'];
    mainValue: number;
    mainBonus: number;
  }>;
  stats: FinalStats;
};
