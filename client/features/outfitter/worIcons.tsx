import { type ReactNode } from 'react';

function assetStemMap(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [assetPath, src] of Object.entries(modules)) {
    const file = assetPath.split('/').pop();
    if (!file) continue;
    out[file.replace(/\.[^.]+$/, '')] = src;
  }
  return out;
}

export const STAR_ICONS = assetStemMap(
  import.meta.glob('../../assets/wor/ranks/*.png', {
    eager: true,
    import: 'default',
  }) as Record<string, string>,
);

const CLASS_ICONS = assetStemMap(
  import.meta.glob('../../assets/wor/classes/*.svg', {
    eager: true,
    import: 'default',
  }) as Record<string, string>,
);

const FACTION_ICONS = assetStemMap(
  import.meta.glob('../../assets/wor/factions/*.svg', {
    eager: true,
    import: 'default',
  }) as Record<string, string>,
);

export function starIconSrc(starRating: number, isLord = false): string | undefined {
  return STAR_ICONS[isLord ? 'star6' : `star${starRating}`];
}

export function renderStars(count?: number, iconKey?: string): ReactNode {
  if (!count || count <= 0) return null;
  const iconSrc = STAR_ICONS[iconKey ?? `star${count}`];
  if (!iconSrc) return `${count}★`;
  return (
    <span className="stars-row">
      {Array.from({ length: count }).map((_, index) => (
        <img key={`${count}-${index}`} src={iconSrc} alt="" title={`${count} stars`} />
      ))}
    </span>
  );
}

export function classIconSrc(classKey: string): string | undefined {
  return CLASS_ICONS[classKey];
}

export function factionIconSrc(faction: string): string | undefined {
  return FACTION_ICONS[faction];
}

export function WorIcon({
  src,
  alt,
  className,
  size = 24,
}: {
  src: string | undefined;
  alt: string;
  className?: string;
  size?: number;
}) {
  if (!src) {
    return (
      <span
        className={className}
        title={alt}
        aria-label={alt}
        style={{ display: 'block', width: size, height: size }}
      />
    );
  }
  return <img className={className} src={src} alt={alt} title={alt} width={size} height={size} />;
}
