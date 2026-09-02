export type FilterTriState = 'off' | 'include' | 'exclude';

export type TriFilterMap = Record<string, 'include' | 'exclude'>;

export function cycleTriFilter(map: TriFilterMap, key: string): TriFilterMap {
  if (!(key in map)) return { ...map, [key]: 'include' };
  const current = map[key];
  if (current === 'include') return { ...map, [key]: 'exclude' };
  const next = { ...map };
  delete next[key];
  return next;
}

export function triFilterState(map: TriFilterMap, key: string): FilterTriState {
  if (!(key in map)) return 'off';
  return map[key];
}

export function matchesTriFilter(
  value: string | number | null | undefined,
  map: TriFilterMap,
): boolean {
  const keys = Object.entries(map);
  if (keys.length === 0) return true;
  const token = value == null ? '' : String(value);
  const include = keys.filter(([, mode]) => mode === 'include').map(([key]) => key);
  const exclude = keys.filter(([, mode]) => mode === 'exclude').map(([key]) => key);
  if (exclude.includes(token)) return false;
  if (include.length > 0 && !include.includes(token)) return false;
  return true;
}
