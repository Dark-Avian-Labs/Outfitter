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
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  equipped_hero_portrait: string | null;
};

type TooltipPos = {
  left: number;
  top: number;
  below: boolean;
  centered: boolean;
};

const TOOLTIP_PAD = 8;
const TOOLTIP_GAP = 8;
const WINDOW_REPOSITION_LISTENERS: AddEventListenerOptions = { capture: true, passive: true };

function setLabel(setKey: string): string {
  return SET_BY_KEY[setKey]?.name ?? setKey;
}

export function gearSubstats(gear: GearView): Array<{ stat: GearStatKey; value: number }> {
  return [
    gear.sub1_stat && gear.sub1_value != null
      ? { stat: gear.sub1_stat, value: gear.sub1_value }
      : null,
    gear.sub2_stat && gear.sub2_value != null
      ? { stat: gear.sub2_stat, value: gear.sub2_value }
      : null,
    gear.sub3_stat && gear.sub3_value != null
      ? { stat: gear.sub3_stat, value: gear.sub3_value }
      : null,
    gear.sub4_stat && gear.sub4_value != null
      ? { stat: gear.sub4_stat, value: gear.sub4_value }
      : null,
  ].filter((entry): entry is { stat: GearStatKey; value: number } => entry != null);
}

function clampTooltipLeft(centerX: number, width: number): number {
  const maxLeft = window.innerWidth - width - TOOLTIP_PAD;
  return Math.min(Math.max(centerX - width / 2, TOOLTIP_PAD), Math.max(TOOLTIP_PAD, maxLeft));
}

function sameTooltipPos(left: TooltipPos | null, right: TooltipPos): boolean {
  return (
    left != null &&
    left.left === right.left &&
    left.top === right.top &&
    left.below === right.below &&
    left.centered === right.centered
  );
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

function GearTileFace({
  gear,
  size,
  showEquipped,
}: {
  gear: GearView;
  size: number;
  showEquipped: boolean;
}) {
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
  const fxStem =
    gear.prefix === 'variant' ? 'variant-fx' : gear.prefix === 'ancient' ? 'ancient-fx' : null;
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
  const equipped =
    showEquipped && size >= 64 && gear.equipped_hero_portrait ? (
      <img
        className="gear-tile__overlay gear-tile__overlay--br"
        src={gear.equipped_hero_portrait}
        alt={gear.equipped_hero_name ?? 'Equipped'}
        title={gear.equipped_hero_name ?? undefined}
      />
    ) : null;

  return (
    <div className={`gear-tile ${prefixClass}`} style={{ width: size, height: size }}>
      <div className="gear-tile__clip">
        <img
          className="gear-tile__art"
          src={src}
          alt=""
          onError={() => {
            if (src !== emptySrc) setSrc(emptySrc);
          }}
        />
        {fxStem ? (
          <img className="gear-tile__fx" src={`/gear/${fxStem}.gif`} alt="" aria-hidden />
        ) : null}
      </div>
      {overlay}
      {equipped}
    </div>
  );
}

function GearHoverCard({ gear, children }: { gear: GearView; children: ReactNode }) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<TooltipPos | null>(null);
  const open = hovered || pinned;
  const mainLabel = `${GEAR_STAT_LABELS[gear.main_stat]} ${formatStatValue(
    gear.main_stat,
    gear.main_value + gear.main_bonus,
  )}`;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const anchorCenterX = rect.left + rect.width / 2;
    const tooltip = tooltipRef.current?.getBoundingClientRect();
    if (tooltip && tooltip.width > 0) {
      const below = rect.top < tooltip.height + TOOLTIP_PAD + TOOLTIP_GAP;
      const next: TooltipPos = {
        left: clampTooltipLeft(anchorCenterX, tooltip.width),
        top: below ? rect.bottom + TOOLTIP_GAP : rect.top - TOOLTIP_GAP,
        below,
        centered: false,
      };
      setPos((prev) => (sameTooltipPos(prev, next) ? prev : next));
      return;
    }
    const next: TooltipPos = {
      left: anchorCenterX,
      top: rect.top - TOOLTIP_GAP,
      below: false,
      centered: true,
    };
    setPos((prev) => (sameTooltipPos(prev, next) ? prev : next));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
  }, [open, pos, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, WINDOW_REPOSITION_LISTENERS);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, WINDOW_REPOSITION_LISTENERS);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!pinned) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      setPinned(false);
      setHovered(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setPinned(false);
      setHovered(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [pinned]);

  return (
    <div
      ref={triggerRef}
      className="inline-block cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!pinned) setHovered(false);
      }}
      onClick={(event) => {
        event.stopPropagation();
        setPinned((current) => !current);
      }}
    >
      {children}
      {open && pos
        ? createPortal(
            <div
              ref={tooltipRef}
              className={`gear-hover-card glass-surface${pinned ? '' : ' pointer-events-none'}`}
              role="tooltip"
              style={{
                left: pos.left,
                top: pos.top,
                maxWidth: `calc(100vw - ${TOOLTIP_PAD * 2}px)`,
                transform: pos.centered
                  ? 'translate(-50%, -100%)'
                  : pos.below
                    ? undefined
                    : 'translateY(-100%)',
              }}
            >
              <div className="gear-hover-card__icon">
                <GearTileFace gear={gear} size={72} showEquipped />
              </div>
              <div className="gear-hover-card__stats">
                <div className="gear-hover-card__main">{mainLabel}</div>
                {gearSubstats(gear).map((entry, index) => (
                  <StatGauge key={`${gear.id}-${index}`} stat={entry.stat} value={entry.value} />
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function GearTile({
  gear,
  size = 72,
  showEquipped = true,
  hover = true,
}: {
  gear: GearView;
  size?: number;
  showEquipped?: boolean;
  hover?: boolean;
}) {
  const mainLabel = `${GEAR_STAT_LABELS[gear.main_stat]} ${formatStatValue(
    gear.main_stat,
    gear.main_value + gear.main_bonus,
  )}`;
  const face = (
    <div aria-label={`${setLabel(gear.set_key)}. ${mainLabel}`}>
      <GearTileFace gear={gear} size={size} showEquipped={showEquipped} />
    </div>
  );
  if (!hover) return face;
  return <GearHoverCard gear={gear}>{face}</GearHoverCard>;
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
          style={{ width: `${ratio * 100}%`, background: gaugeColor(ratio) }}
        />
        {[20, 40, 60, 80].map((pct) => (
          <span key={pct} className="stat-gauge__notch" style={{ left: `${pct}%` }} aria-hidden />
        ))}
      </div>
    </div>
  );
}
