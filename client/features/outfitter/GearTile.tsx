import {
  FACTION_DISPLAY_NAMES,
  SLOT_LABELS,
  formatStatValue,
  gaugeColor,
  gaugeRatio,
  GEAR_STAT_LABELS,
  gearEmptySlotSrc,
  gearPieceArtSrc,
  type FactionKey,
  type GearPrefix,
  type GearSlot,
  type GearStatKey,
} from '@shared/catalog';
import { SET_BY_KEY } from '@shared/sets';
import { useEffect, useState } from 'react';

export type GearView = {
  id: number;
  slot: GearSlot;
  set_key: string;
  prefix: GearPrefix;
  main_stat: GearStatKey;
  main_value: number;
  main_bonus: number;
  sub1_stat: GearStatKey | null;
  sub1_value: number | null;
  sub2_stat: GearStatKey | null;
  sub2_value: number | null;
  sub3_stat: GearStatKey | null;
  sub3_value: number | null;
  sub4_stat: GearStatKey | null;
  sub4_value: number | null;
  exclusive_hero_slug: string | null;
  exclusive_faction: string | null;
  exclusive_hero_name: string | null;
  exclusive_hero_portrait: string | null;
  equipped_hero_slug: string | null;
  equipped_hero_name: string | null;
};

function setLabel(setKey: string): string {
  return SET_BY_KEY[setKey]?.name ?? setKey;
}

export function EmptySlotTile({ slot, size = 72 }: { slot: GearSlot; size?: number }) {
  return (
    <div
      className="gear-tile gear-tile--empty"
      style={{ width: size, height: size }}
      title={SLOT_LABELS[slot]}
    >
      <img className="gear-tile__art" src={gearEmptySlotSrc(slot)} alt="" />
    </div>
  );
}

export function GearTile({ gear, size = 72 }: { gear: GearView; size?: number }) {
  const pieceSrc = gearPieceArtSrc(gear.set_key, gear.slot);
  const emptySrc = gearEmptySlotSrc(gear.slot);
  const [src, setSrc] = useState(pieceSrc);
  useEffect(() => {
    setSrc(pieceSrc);
  }, [pieceSrc]);
  const prefixClass =
    gear.prefix === 'variant'
      ? 'gear-tile--variant'
      : gear.prefix === 'ancient'
        ? 'gear-tile--ancient'
        : '';
  const overlay = gear.exclusive_hero_portrait ? (
    <img
      className="gear-tile__overlay gear-tile__overlay--tl"
      src={gear.exclusive_hero_portrait}
      alt={gear.exclusive_hero_name ?? 'Exclusive'}
    />
  ) : gear.exclusive_faction ? (
    <img
      className="gear-tile__overlay gear-tile__overlay--tl"
      src={`/hero-images/icons/factions/${gear.exclusive_faction}.svg`}
      alt={FACTION_DISPLAY_NAMES[gear.exclusive_faction as FactionKey] ?? gear.exclusive_faction}
    />
  ) : null;

  return (
    <div
      className={`gear-tile ${prefixClass}`}
      style={{ width: size, height: size }}
      title={setLabel(gear.set_key)}
    >
      <img
        className="gear-tile__art"
        src={src}
        alt=""
        onError={() => {
          if (src !== emptySrc) setSrc(emptySrc);
        }}
      />
      {overlay}
      {gear.equipped_hero_name ? (
        <span className="gear-tile__overlay gear-tile__overlay--br">{gear.equipped_hero_name}</span>
      ) : null}
    </div>
  );
}

export function StatGauge({ stat, value }: { stat: GearStatKey; value: number }) {
  const ratio = gaugeRatio(stat, value);
  return (
    <div className="stat-gauge">
      <div className="stat-gauge__label">
        <span>{GEAR_STAT_LABELS[stat]}</span>
        <span>{formatStatValue(stat, value)}</span>
      </div>
      <div className="stat-gauge__track">
        <div
          className="stat-gauge__fill"
          style={{ width: `${Math.round(ratio * 100)}%`, background: gaugeColor(ratio) }}
        />
        <span className="stat-gauge__notch" style={{ left: '25%' }} aria-hidden />
        <span className="stat-gauge__notch" style={{ left: '50%' }} aria-hidden />
        <span className="stat-gauge__notch" style={{ left: '75%' }} aria-hidden />
      </div>
    </div>
  );
}
