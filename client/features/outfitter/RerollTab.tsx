import { formatStatValue, GEAR_STAT_LABELS, SLOT_LABELS, type GearStatKey } from '@shared/catalog';
import { type GearRating, RANK_SCORE } from '@shared/gearRating';
import { BULLION_ICON, REROLL_TOOLS, rerollActionLabel, suggestReroll } from '@shared/gearReroll';
import { SET_BY_KEY } from '@shared/sets';
import { useMemo } from 'react';

import { GearTile, StatGauge, type GearView } from './GearTile';

export function RerollTab({
  gear,
  onOpenGear,
}: {
  gear: GearView[];
  onOpenGear: (piece: GearView) => void;
}) {
  const grouped = useMemo(() => {
    const rows = gear.flatMap((piece) =>
      suggestReroll(piece).map((suggestion) => ({ piece, suggestion })),
    );
    return REROLL_TOOLS.map((tool) => ({
      tool,
      rows: rows
        .filter((row) => row.suggestion.tool === tool.id)
        .sort((left, right) => {
          const leftKeep = left.suggestion.projected.ruleName ? 1 : 0;
          const rightKeep = right.suggestion.projected.ruleName ? 1 : 0;
          if (rightKeep !== leftKeep) return rightKeep - leftKeep;
          const projected =
            RANK_SCORE[right.suggestion.projected.rank] -
            RANK_SCORE[left.suggestion.projected.rank];
          if (projected !== 0) return projected;
          return (
            RANK_SCORE[left.suggestion.current.rank] - RANK_SCORE[right.suggestion.current.rank]
          );
        }),
    }));
  }, [gear]);

  const total = grouped.reduce((sum, group) => sum + group.rows.length, 0);

  if (gear.length === 0) {
    return <p className="text-muted text-sm">Add gear on the Gear tab first.</p>;
  }

  if (total === 0) {
    return (
      <p className="text-muted text-sm">
        Nothing in the stash would jump to SS or SSS from a recast, refine, or transmute, and
        nothing is sitting on a T1 set worth ascending.
      </p>
    );
  }

  return (
    <div className="reroll-page">
      {grouped.map(({ tool, rows }) => {
        if (rows.length === 0) return null;
        return (
          <section key={tool.id} className="reroll-section">
            <header className="reroll-tool">
              <img src={tool.icon} alt="" width={48} height={48} />
              <div>
                <h2>{tool.label}</h2>
                <p>{tool.hint}</p>
              </div>
            </header>
            <div className="table-container">
              <div className="table-scroll">
                <table className="gear-table reroll-table">
                  <colgroup>
                    <col className="col-icon" />
                    <col className="col-type" />
                    <col className="col-set" />
                    <col className="col-main" />
                    <col className="col-stats" />
                    <col className="col-rating" />
                    <col className="col-rating" />
                    <col className="col-action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="col-icon" />
                      <th className="col-type">Type</th>
                      <th className="col-set">Set</th>
                      <th className="col-main">Main</th>
                      <th className="stats-col">Stats</th>
                      <th className="col-rating">Now</th>
                      <th className="col-rating">After</th>
                      <th className="col-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ piece, suggestion }) => {
                      const setName = SET_BY_KEY[piece.set_key]?.name ?? piece.set_key;
                      const mainLabel = `${GEAR_STAT_LABELS[piece.main_stat]} ${formatStatValue(
                        piece.main_stat,
                        piece.main_value + piece.main_bonus,
                      )}`;
                      const dropsKeep =
                        suggestion.current.ruleName != null &&
                        suggestion.projected.ruleName == null;
                      const subs = [
                        { slot: 1 as const, stat: piece.sub1_stat, value: piece.sub1_value },
                        { slot: 2 as const, stat: piece.sub2_stat, value: piece.sub2_value },
                        { slot: 3 as const, stat: piece.sub3_stat, value: piece.sub3_value },
                        { slot: 4 as const, stat: piece.sub4_stat, value: piece.sub4_value },
                      ].filter(
                        (
                          entry,
                        ): entry is { slot: 1 | 2 | 3 | 4; stat: GearStatKey; value: number } =>
                          entry.stat != null && entry.value != null,
                      );
                      return (
                        <tr
                          key={`${piece.id}-${suggestion.tool}`}
                          className={`cursor-pointer${dropsKeep ? ' reroll-row--warn' : ''}`}
                          onClick={() => onOpenGear(piece)}
                        >
                          <td className="col-icon">
                            <GearTile gear={piece} size={40} />
                          </td>
                          <td className="col-type">{SLOT_LABELS[piece.slot]}</td>
                          <td className="col-set" title={setName}>
                            {setName}
                          </td>
                          <td className="col-main" title={mainLabel}>
                            {mainLabel}
                          </td>
                          <td className="stats-col">
                            <div className="flex flex-col gap-1">
                              {subs.map((entry) => (
                                <div
                                  key={`${piece.id}-${entry.slot}`}
                                  className={
                                    suggestion.subSlot === entry.slot ? 'reroll-target' : undefined
                                  }
                                >
                                  <StatGauge stat={entry.stat} value={entry.value} />
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="col-rating">
                            <RatingCell rating={suggestion.current} />
                          </td>
                          <td className="col-rating">
                            <RatingCell rating={suggestion.projected} />
                          </td>
                          <td className="col-action">
                            <div className="reroll-action">
                              <span>{rerollActionLabel(suggestion)}</span>
                              {suggestion.needsBullion ? (
                                <img
                                  src={BULLION_ICON}
                                  alt="Eternal Bullion"
                                  title="Also needs Eternal Bullion"
                                  width={28}
                                  height={28}
                                />
                              ) : null}
                            </div>
                            {dropsKeep ? (
                              <div className="reroll-warn">Drops {suggestion.current.ruleName}</div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RatingCell({ rating }: { rating: GearRating }) {
  return (
    <div className="gear-rating">
      <span className="gear-rating__rank" data-rank={rating.rank}>
        {rating.rank}
      </span>
      <span className="gear-rating__fit" title={rating.ruleName ?? undefined}>
        {rating.ruleName ?? '-'}
      </span>
    </div>
  );
}
