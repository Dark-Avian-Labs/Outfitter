import { CLASS_DISPLAY_NAMES, outOfRangeArtifactLabels } from '@shared/catalog';
import { useMemo } from 'react';

import { ArtifactPortrait, artifactStatLines } from './tabShared';
import type { ArtifactView } from './types';
import { WorIcon, classIconSrc } from './worIcons';

export function ArtifactsTab({
  artifacts,
  onAdd,
  onEdit,
}: {
  artifacts: ArtifactView[];
  onAdd: () => void;
  onEdit: (row: ArtifactView) => void;
}) {
  const artifactsByName = useMemo(
    () =>
      artifacts
        .slice()
        .sort(
          (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id - b.id,
        ),
    [artifacts],
  );

  return (
    <>
      <div className="filter-bar">
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
          <table className="gear-table artifact-table">
            <colgroup>
              <col className="col-icon" />
              <col className="col-name" />
              <col className="col-limit" />
              <col className="col-stats" />
              <col className="col-equipped" />
            </colgroup>
            <thead>
              <tr>
                <th className="col-icon" />
                <th className="col-name">Name</th>
                <th className="col-limit">Limit</th>
                <th className="stats-col">Stats</th>
                <th className="col-equipped">Equipped</th>
              </tr>
            </thead>
            <tbody>
              {artifactsByName.map((row) => {
                const illegalLabels = outOfRangeArtifactLabels(row);
                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer${illegalLabels.length > 0 ? ' gear-row--illegal' : ''}`}
                    title={
                      illegalLabels.length > 0
                        ? `Out of range: ${illegalLabels.join(', ')}`
                        : undefined
                    }
                    onClick={() => {
                      onEdit(row);
                    }}
                  >
                    <td className="col-icon">
                      <ArtifactPortrait
                        src={row.portrait_path}
                        size={40}
                        title={row.name}
                        promotion={row.promotion}
                        rarity={row.rarity}
                        starRating={row.star_rating}
                      />
                    </td>
                    <td className="col-name" title={row.name}>
                      {row.name}
                    </td>
                    <td className="col-limit">
                      {row.exclusive_hero_portrait ? (
                        <img
                          className="gear-table__hero"
                          src={row.exclusive_hero_portrait}
                          alt=""
                          title={row.exclusive_hero_name ?? undefined}
                        />
                      ) : row.class ? (
                        <WorIcon
                          className="invert-on-light mx-auto"
                          src={classIconSrc(row.class)}
                          alt={CLASS_DISPLAY_NAMES[row.class] ?? row.class}
                          size={28}
                        />
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="stats-col">
                      <div className="artifact-stat-lines">
                        {artifactStatLines(row).map((line) => (
                          <div
                            key={line.key}
                            className={
                              line.illegal ? 'artifact-stat-lines__line is-illegal' : undefined
                            }
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="col-equipped">
                      {row.equipped_hero_portrait ? (
                        <img
                          className="gear-table__hero"
                          src={row.equipped_hero_portrait}
                          alt=""
                          title={row.equipped_hero_name ?? undefined}
                        />
                      ) : (
                        <span title={row.equipped_hero_name ?? undefined}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {artifacts.length === 0 ? (
          <p className="text-muted px-4 pb-4 text-sm">
            No artifacts yet. Add one, or Ctrl+V a screenshot in the add dialog.
          </p>
        ) : null}
      </div>
    </>
  );
}
