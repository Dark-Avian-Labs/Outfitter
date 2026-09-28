import {
  GEAR_SLOTS,
  GEAR_STAT_LABELS,
  SLOT_LABELS,
  formatMainStatText,
  gearEmptySlotSrc,
  gearSetBadgeSrc,
  outOfRangeGearLabels,
} from '@shared/catalog';
import { GEAR_RANKS, KEEP_RULES, rateGear } from '@shared/gearRating';
import { compareInventoryGear } from '@shared/gearSort';
import { ALL_SETS, SET_BY_KEY, setsSortedByTier } from '@shared/sets';
import { useMemo, useState } from 'react';

import { FilterIconButton } from '../../components/ui/FilterIconButton';
import {
  cycleTriFilter,
  matchesTriFilter,
  triFilterState,
  type TriFilterMap,
} from '../../lib/triFilter';
import { FieldSelect } from './FieldSelect';
import { GearMainStat, GearTile, StatGauge, gearSubstats, type GearView } from './GearTile';

export function GearTab({
  gear,
  onAdd,
  onEdit,
}: {
  gear: GearView[];
  onAdd: () => void;
  onEdit: (piece: GearView) => void;
}) {
  const [slotFilter, setSlotFilter] = useState<TriFilterMap>({});
  const [setFilter, setSetFilter] = useState('');
  const [mainFilter, setMainFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [ruleFilter, setRuleFilter] = useState('');

  const filteredGear = useMemo(
    () =>
      gear
        .filter((piece) => {
          if (!matchesTriFilter(piece.slot, slotFilter)) return false;
          if (setFilter && piece.set_key !== setFilter) return false;
          if (mainFilter && piece.main_stat !== mainFilter) return false;
          if (subFilter) {
            const stats = [piece.sub1_stat, piece.sub2_stat, piece.sub3_stat, piece.sub4_stat];
            if (!stats.includes(subFilter as GearView['main_stat'])) return false;
          }
          if (ratingFilter || ruleFilter) {
            const rating = rateGear(piece);
            if (ratingFilter && rating.rank !== ratingFilter) return false;
            if (ruleFilter === 'none' && rating.ruleName != null) return false;
            if (ruleFilter && ruleFilter !== 'none' && rating.ruleName !== ruleFilter) return false;
          }
          return true;
        })
        .slice()
        .sort(compareInventoryGear),
    [gear, mainFilter, ratingFilter, ruleFilter, setFilter, slotFilter, subFilter],
  );

  return (
    <>
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Type:</span>
          {GEAR_SLOTS.map((slot) => (
            <FilterIconButton
              key={slot}
              state={triFilterState(slotFilter, slot)}
              label={SLOT_LABELS[slot]}
              onClick={() => setSlotFilter((previous) => cycleTriFilter(previous, slot))}
            >
              <img src={gearEmptySlotSrc(slot)} alt="" />
            </FilterIconButton>
          ))}
        </div>
        <FieldSelect
          className="min-w-[12rem]"
          label="Set"
          inline
          value={setFilter}
          options={[
            { value: '', label: 'All sets' },
            ...setsSortedByTier(ALL_SETS).map((set) => ({
              value: set.key,
              label: set.name,
              iconSrc: gearSetBadgeSrc(set.key),
            })),
          ]}
          onChange={setSetFilter}
        />
        <FieldSelect
          className="min-w-[12rem]"
          label="Main"
          inline
          value={mainFilter}
          options={[
            { value: '', label: 'Any main' },
            ...Object.entries(GEAR_STAT_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          onChange={setMainFilter}
        />
        <FieldSelect
          className="min-w-[12rem]"
          label="Sub"
          inline
          value={subFilter}
          options={[
            { value: '', label: 'Any sub' },
            ...Object.entries(GEAR_STAT_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          onChange={setSubFilter}
        />
        <FieldSelect
          className="min-w-[8rem]"
          label="Rating"
          inline
          value={ratingFilter}
          options={[
            { value: '', label: 'All' },
            ...GEAR_RANKS.map((rank) => ({ value: rank, label: rank })),
          ]}
          onChange={setRatingFilter}
        />
        <FieldSelect
          className="min-w-[16rem]"
          label="Rule"
          inline
          value={ruleFilter}
          options={[
            { value: '', label: 'All rules' },
            { value: 'none', label: 'No rule' },
            ...KEEP_RULES.map((rule) => ({ value: rule.name, label: rule.name })),
          ]}
          onChange={setRuleFilter}
        />
        <div className="stats-bar-actions ml-auto">
          <button
            type="button"
            className="stats-bar-toggle"
            onClick={() => {
              onAdd();
            }}
          >
            + Add
          </button>
        </div>
      </div>
      <div className="table-container">
        <div className="table-scroll">
          <table className="gear-table">
            <colgroup>
              <col className="col-icon" />
              <col className="col-type" />
              <col className="col-set" />
              <col className="col-main" />
              <col className="col-stats" />
              <col className="col-rating" />
              <col className="col-equipped" />
            </colgroup>
            <thead>
              <tr>
                <th className="col-icon" />
                <th className="col-type">Type</th>
                <th className="col-set">Set</th>
                <th className="col-main">Main</th>
                <th className="stats-col">Stats</th>
                <th className="col-rating">Rating</th>
                <th className="col-equipped">Equipped</th>
              </tr>
            </thead>
            <tbody>
              {filteredGear.map((piece) => {
                const setName = SET_BY_KEY[piece.set_key]?.name ?? piece.set_key;
                const mainLabel = formatMainStatText(
                  piece.main_stat,
                  piece.main_value,
                  piece.main_bonus,
                );
                const illegalLabels = outOfRangeGearLabels(piece);
                const rating = rateGear(piece);
                return (
                  <tr
                    key={piece.id}
                    className={`cursor-pointer${illegalLabels.length > 0 ? ' gear-row--illegal' : ''}`}
                    title={
                      illegalLabels.length > 0
                        ? `Out of range: ${illegalLabels.join(', ')}`
                        : undefined
                    }
                    onClick={() => {
                      onEdit(piece);
                    }}
                  >
                    <td className="col-icon">
                      <GearTile gear={piece} size={40} />
                    </td>
                    <td className="col-type">{SLOT_LABELS[piece.slot]}</td>
                    <td className="col-set" title={setName}>
                      {setName}
                    </td>
                    <td className="col-main" title={mainLabel}>
                      <GearMainStat
                        stat={piece.main_stat}
                        value={piece.main_value}
                        bonus={piece.main_bonus}
                      />
                    </td>
                    <td className="stats-col">
                      <div className="flex flex-col gap-1">
                        {gearSubstats(piece).map((entry, index) => (
                          <StatGauge
                            key={`${piece.id}-${index}`}
                            stat={entry.stat}
                            value={entry.value}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="col-rating">
                      <div className="gear-rating">
                        <span className="gear-rating__rank" data-rank={rating.rank}>
                          {rating.rank}
                        </span>
                        <span className="gear-rating__fit" title={rating.ruleName ?? undefined}>
                          {rating.ruleName ?? '-'}
                        </span>
                      </div>
                    </td>
                    <td className="col-equipped">
                      {piece.equipped_hero_portrait ? (
                        <img
                          className="gear-table__hero"
                          src={piece.equipped_hero_portrait}
                          alt=""
                          title={piece.equipped_hero_name ?? undefined}
                        />
                      ) : (
                        <span title={piece.equipped_hero_name ?? undefined}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
