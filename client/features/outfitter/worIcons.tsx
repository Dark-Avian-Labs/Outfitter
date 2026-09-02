import { useEffect, useState, type ReactNode } from 'react';

const STAR_MODULES = import.meta.glob('../../assets/wor/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const STAR_ICONS: Record<string, string> = {};
for (const [assetPath, src] of Object.entries(STAR_MODULES)) {
  const file = assetPath.split('/').pop();
  if (!file) continue;
  STAR_ICONS[file.replace('.png', '')] = src;
}

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

export function classIconUrls(classKey: string): { primary: string; fallback: string } {
  return {
    primary: `/hero-images/icons/classes/${classKey}.svg`,
    fallback: `/hero-images/icons/classes/${classKey}.png`,
  };
}

export function factionIconUrls(faction: string): { primary: string; fallback: string } {
  return {
    primary: `/hero-images/icons/factions/${faction}.svg`,
    fallback: `/hero-images/icons/factions/${faction}.png`,
  };
}

export function WorIconWithFallback({
  primarySrc,
  fallbackSrc,
  alt,
  className,
  size = 24,
}: {
  primarySrc: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  const [src, setSrc] = useState(primarySrc);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(primarySrc);
    setFailed(false);
  }, [primarySrc]);
  if (failed) {
    return (
      <span
        className={className}
        title={alt}
        aria-label={alt}
        style={{ display: 'block', width: size, height: size }}
      />
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      onError={() => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
