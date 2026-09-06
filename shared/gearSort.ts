import { type GearPrefix, type GearSlot } from './catalog.js';
import { INVENTORY_SET_KEYS } from './sets.js';

const SET_RANK = new Map<string, number>(INVENTORY_SET_KEYS.map((key, index) => [key, index]));

const PREFIX_RANK: Record<GearPrefix, number> = {
  variant: 0,
  ancient: 1,
  none: 2,
};

const SLOT_RANK: Record<GearSlot, number> = {
  bangle: 0,
  amulet: 1,
  ring: 2,
  armor: 3,
  weapon: 4,
};

export type InventorySortPiece = {
  prefix: GearPrefix;
  set_key: string;
  slot: GearSlot;
};

export function compareInventoryGear(left: InventorySortPiece, right: InventorySortPiece): number {
  const prefix = PREFIX_RANK[left.prefix] - PREFIX_RANK[right.prefix];
  if (prefix !== 0) return prefix;
  const unknown = INVENTORY_SET_KEYS.length;
  const set = (SET_RANK.get(left.set_key) ?? unknown) - (SET_RANK.get(right.set_key) ?? unknown);
  if (set !== 0) return set;
  return SLOT_RANK[left.slot] - SLOT_RANK[right.slot];
}
