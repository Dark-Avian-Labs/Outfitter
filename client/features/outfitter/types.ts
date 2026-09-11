import type { ArtifactSecondaryStat, HeroClassKey, FactionKey } from '@shared/catalog';
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

export type CatalogArtifact = {
  slug: string;
  name: string;
  class: HeroClassKey | null;
  rarity: string;
  star_rating: number;
  exclusive_hero_slug: string | null;
  is_universal: number;
  portrait_path: string | null;
  exclusive_hero_name: string | null;
  exclusive_hero_portrait: string | null;
};

export type ArtifactView = {
  id: number;
  catalog_slug: string;
  name: string;
  class: HeroClassKey | null;
  rarity: string;
  star_rating: number;
  exclusive_hero_slug: string | null;
  is_universal: number;
  portrait_path: string | null;
  level: number;
  promotion: number;
  hp_base: number;
  hp_bonus: number;
  atk_base: number;
  atk_bonus: number;
  secondary_stat: ArtifactSecondaryStat | null;
  secondary_value: number | null;
  equipped_hero_slug: string | null;
  equipped_hero_name: string | null;
  equipped_hero_portrait: string | null;
  exclusive_hero_name: string | null;
  exclusive_hero_portrait: string | null;
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
