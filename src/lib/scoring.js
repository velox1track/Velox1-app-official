export const SCORING_PRESETS_BY_TEAMS = {
  8: [10, 5, 4, 3, 2, 1, 0, -5],
  7: [10, 5, 4, 3, 2, 1, -5],
  6: [10, 5, 4, 3, 2, -5],
  5: [10, 5, 4, 3, -5],
  4: [10, 5, 4, -5],
  3: [10, 5, -5],
  2: [5, -5],
};

/**
 * Build a places array for the given team count using the preset values.
 * If no exact preset exists, extends the nearest one.
 */
export const buildScoringPlaces = (count) => {
  const preset = SCORING_PRESETS_BY_TEAMS[count] || [];
  let arr = preset.slice(0, count);
  if (arr.length < count) {
    const tail = arr.length ? arr[arr.length - 1] : -5;
    arr = arr.concat(Array(count - arr.length).fill(tail));
  }
  return arr.map((pts, i) => ({ place: i + 1, points: pts }));
};

/**
 * Given saved scoring settings and the current team count, return reconciled
 * scoring settings. If the saved places count doesn't match the team count,
 * the correct preset is applied instead.
 */
export const reconcileScoringWithTeamCount = (saved, teamCount) => {
  if (!teamCount || teamCount <= 0) return saved;
  if (!saved || !Array.isArray(saved.places) || saved.places.length === 0) {
    return { places: buildScoringPlaces(teamCount), activePresetId: `${teamCount}T` };
  }
  if (saved.places.length !== teamCount) {
    return { places: buildScoringPlaces(teamCount), activePresetId: `${teamCount}T` };
  }
  return saved;
};
