/**
 * Centralized AsyncStorage access for division-scoped competition data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultEventPool, normalizeEventPool } from './randomizer';
import {
  DEFAULT_DIVISION_NAME,
  RESET_SCOPES,
  applyResetScope,
  createDefaultDivisionData,
  createDefaultSettings,
  createDivisionDataFromConfig,
  createDivisionId,
  createDivisionMeta,
  extractDivisionConfig,
  isDuplicateDivisionName,
  normalizeDivisionName,
} from './division';

export const META_STORAGE_KEY = 'velox.divisions';

export const LEGACY_STORAGE_KEYS = [
  'athletes',
  'teams',
  'eventSequence',
  'revealedIndex',
  'eventResults',
  'eventPool',
  'eventAssignments',
  'pendingLaneEventIndex',
  'settings.teamConfig',
  'settings.roulette',
  'settings.scoring',
  'settings.infractions',
];

export const getDivisionStorageKey = (divisionId) => `velox.division.${divisionId}`;

const parseJson = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const mergeSettings = (currentSettings = {}, partialSettings = {}) => {
  const next = { ...currentSettings, ...partialSettings };
  ['teamConfig', 'roulette', 'scoring', 'infractions', 'athleteEligibility'].forEach((key) => {
    if (partialSettings[key]) {
      next[key] = { ...(currentSettings[key] || {}), ...partialSettings[key] };
    }
  });
  return next;
};

const mergeDivisionData = (current, partial) => {
  const next = deepClone(current);
  Object.keys(partial).forEach((key) => {
    if (key === 'settings' && partial.settings) {
      next.settings = mergeSettings(next.settings, partial.settings);
    } else {
      next[key] = partial[key];
    }
  });
  return next;
};

const emptyDivisionsMeta = () => ({
  activeDivisionId: null,
  divisions: [],
});

const normalizeDivisionsMeta = (meta) => {
  const safe = meta && typeof meta === 'object' ? meta : emptyDivisionsMeta();
  return {
    activeDivisionId: safe.activeDivisionId || null,
    divisions: Array.isArray(safe.divisions) ? safe.divisions : [],
  };
};

const saveDivisionsMeta = async (meta) => {
  await AsyncStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
};

const readLegacyValue = async (key) => AsyncStorage.getItem(key);

const hasLegacyData = async () => {
  const values = await AsyncStorage.multiGet(LEGACY_STORAGE_KEYS);
  return values.some(([, value]) => value != null);
};

const buildDivisionDataFromLegacy = async () => {
  const [
    athletesRaw,
    teamsRaw,
    eventSequenceRaw,
    revealedIndexRaw,
    eventResultsRaw,
    eventPoolRaw,
    eventAssignmentsRaw,
    pendingLaneEventIndexRaw,
    teamConfigRaw,
    rouletteRaw,
    scoringRaw,
    infractionsRaw,
  ] = await Promise.all(LEGACY_STORAGE_KEYS.map(readLegacyValue));

  const defaultData = createDefaultDivisionData();

  return {
    athletes: parseJson(athletesRaw, []),
    teams: parseJson(teamsRaw, []),
    eventSequence: parseJson(eventSequenceRaw, []),
    revealedIndex: revealedIndexRaw ?? '0',
    eventResults: parseJson(eventResultsRaw, []),
    eventAssignments: parseJson(eventAssignmentsRaw, []),
    pendingLaneEventIndex: pendingLaneEventIndexRaw,
    eventPool: parseJson(eventPoolRaw, defaultData.eventPool),
    settings: {
      teamConfig: parseJson(teamConfigRaw, defaultData.settings.teamConfig),
      roulette: parseJson(rouletteRaw, defaultData.settings.roulette),
      scoring: parseJson(scoringRaw, defaultData.settings.scoring),
      infractions: parseJson(infractionsRaw, defaultData.settings.infractions),
    },
  };
};

const removeLegacyKeys = async () => {
  await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
};

/** Removes flat legacy keys if any remain (safe no-op when already clean). */
const cleanupLegacyStorageIfPresent = async () => {
  if (!(await hasLegacyData())) {
    return false;
  }
  await removeLegacyKeys();
  return true;
};

const ensureActiveDivision = async (meta) => {
  if (meta.divisions.length === 0) {
    return meta;
  }
  const activeExists = meta.divisions.some((division) => division.id === meta.activeDivisionId);
  if (!activeExists) {
    meta.activeDivisionId = meta.divisions[0].id;
    await saveDivisionsMeta(meta);
  }
  return meta;
};

export const getDivisionsMeta = async () => {
  const raw = await AsyncStorage.getItem(META_STORAGE_KEY);
  const meta = normalizeDivisionsMeta(parseJson(raw, emptyDivisionsMeta()));
  return ensureActiveDivision(meta);
};

export const setActiveDivisionId = async (divisionId) => {
  const meta = await getDivisionsMeta();
  const exists = meta.divisions.some((division) => division.id === divisionId);
  if (!exists) {
    throw new Error(`Division not found: ${divisionId}`);
  }
  const nextMeta = { ...meta, activeDivisionId: divisionId };
  await saveDivisionsMeta(nextMeta);
  return nextMeta;
};

export const getActiveDivisionId = async () => {
  const meta = await getDivisionsMeta();
  return meta.activeDivisionId;
};

export const getDivisionData = async (divisionId) => {
  const raw = await AsyncStorage.getItem(getDivisionStorageKey(divisionId));
  if (!raw) {
    return createDefaultDivisionData();
  }
  const parsed = parseJson(raw, createDefaultDivisionData());
  const defaultSettings = createDefaultSettings();
  return {
    ...createDefaultDivisionData(),
    ...parsed,
    settings: mergeSettings(defaultSettings, parsed.settings || {}),
    eventPool: normalizeEventPool(parsed.eventPool),
  };
};

export const saveDivisionData = async (divisionId, data) => {
  await AsyncStorage.setItem(getDivisionStorageKey(divisionId), JSON.stringify(data));
  return data;
};

export const updateDivisionData = async (divisionId, partial) => {
  const current = await getDivisionData(divisionId);
  const merged = mergeDivisionData(current, partial);
  await saveDivisionData(divisionId, merged);
  return merged;
};

export const updateActiveDivisionData = async (partial) => {
  const divisionId = await getActiveDivisionId();
  if (!divisionId) {
    throw new Error('No active division available.');
  }
  return updateDivisionData(divisionId, partial);
};

export const getActiveDivisionData = async () => {
  const meta = await getDivisionsMeta();
  if (!meta.activeDivisionId) {
    return { meta, division: createDefaultDivisionData(), divisionId: null };
  }
  const division = await getDivisionData(meta.activeDivisionId);
  return { meta, division, divisionId: meta.activeDivisionId };
};

const resolveDivisionId = async (divisionId) => {
  const id = divisionId || (await getActiveDivisionId());
  if (!id) {
    throw new Error('No active division available.');
  }
  return id;
};

/** Read athletes for a division (defaults to active). */
export const getAthletes = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return Array.isArray(data.athletes) ? data.athletes : [];
};

/** Save athletes for a division (defaults to active). Returns saved athlete list. */
export const saveAthletes = async (athletes, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, {
    athletes: Array.isArray(athletes) ? athletes : [],
  });
  return merged.athletes || [];
};

/** Clear athletes for a division (defaults to active). */
export const clearAthletes = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const next = await resetDivision(id, RESET_SCOPES.ATHLETES);
  return next.athletes || [];
};

/** Read teams for a division (defaults to active). */
export const getTeams = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return Array.isArray(data.teams) ? data.teams : [];
};

/** Save teams for a division (defaults to active). Returns saved team list. */
export const saveTeams = async (teams, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, {
    teams: Array.isArray(teams) ? teams : [],
  });
  return merged.teams || [];
};

/** Clear teams and event assignments for a division (defaults to active). */
export const clearTeams = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const next = await resetDivision(id, RESET_SCOPES.TEAMS);
  return next.teams || [];
};

/** Read planned team count for a division (defaults to active). */
export const getPlannedTeams = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  const planned = data.settings?.teamConfig?.plannedTeams;
  return typeof planned === 'number' && planned > 0 ? planned : 4;
};

/** Save planned team count for a division (defaults to active). */
export const savePlannedTeams = async (plannedTeams, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, {
    settings: { teamConfig: { plannedTeams } },
  });
  return merged.settings?.teamConfig?.plannedTeams ?? plannedTeams;
};

/** Read event pool for a division (defaults to active). */
export const getEventPool = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return normalizeEventPool(data.eventPool);
};

/** Save event pool for a division (defaults to active). */
export const saveEventPool = async (eventPool, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const normalized = normalizeEventPool(eventPool);
  const merged = await updateDivisionData(id, { eventPool: normalized });
  return normalizeEventPool(merged.eventPool);
};

/** Reset event pool to defaults for a division (defaults to active). */
export const clearEventPool = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const next = await resetDivision(id, RESET_SCOPES.EVENT_POOL);
  return next.eventPool || getDefaultEventPool();
};

const normalizeRouletteSettings = (roulette = {}) => ({
  totalEvents: Number(roulette.totalEvents) || 5,
  numRelays: typeof roulette.numRelays === 'number' ? roulette.numRelays : 1,
  relayPositions: Array.isArray(roulette.relayPositions) ? roulette.relayPositions : [],
});

/** Read Race Roulette sequence settings for a division (defaults to active). */
export const getRouletteSettings = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return normalizeRouletteSettings(data.settings?.roulette);
};

/** Save Race Roulette sequence settings for a division (defaults to active). */
export const saveRouletteSettings = async (roulette, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, { settings: { roulette } });
  return normalizeRouletteSettings(merged.settings?.roulette || roulette);
};

const normalizeEligibilitySettings = (eligibility = {}) => ({
  allowIndividualPlusRelay: !!eligibility.allowIndividualPlusRelay,
});

/** Read athlete eligibility settings for a division (defaults to active). */
export const getEligibilitySettings = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return normalizeEligibilitySettings(data.settings?.athleteEligibility);
};

/** Save athlete eligibility settings for a division (defaults to active). */
export const saveEligibilitySettings = async (athleteEligibility, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, { settings: { athleteEligibility } });
  return normalizeEligibilitySettings(merged.settings?.athleteEligibility || athleteEligibility);
};

/** Read scoring settings for a division (defaults to active). */
export const getScoringSettings = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  if (data.settings?.scoring && Array.isArray(data.settings.scoring.places)) {
    return data.settings.scoring;
  }
  return createDefaultSettings().scoring;
};

/** Save scoring settings for a division (defaults to active). */
export const saveScoringSettings = async (scoring, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, { settings: { scoring } });
  return merged.settings?.scoring || scoring;
};

/** Read infractions settings for a division (defaults to active). */
export const getInfractionsSettings = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  if (data.settings?.infractions && Array.isArray(data.settings.infractions.items)) {
    return data.settings.infractions;
  }
  return createDefaultSettings().infractions;
};

/** Save infractions settings for a division (defaults to active). */
export const saveInfractionsSettings = async (infractions, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, { settings: { infractions } });
  return merged.settings?.infractions || infractions;
};

/** Read event sequence for a division (defaults to active). */
export const getEventSequence = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return Array.isArray(data.eventSequence) ? data.eventSequence : [];
};

/** Read reveal progress for a division (defaults to active). */
export const getRevealedIndex = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return parseInt(data.revealedIndex || '0', 10);
};

/** Read submitted event results for a division (defaults to active). */
export const getEventResults = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const data = await getDivisionData(id);
  return Array.isArray(data.eventResults) ? data.eventResults : [];
};

/** Save submitted event results for a division (defaults to active). */
export const saveEventResults = async (eventResults, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const merged = await updateDivisionData(id, {
    eventResults: Array.isArray(eventResults) ? eventResults : [],
  });
  return merged.eventResults || [];
};

/** Clear submitted event results for a division (defaults to active). */
export const clearEventResults = async (divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const next = await resetDivision(id, RESET_SCOPES.RESULTS);
  return next.eventResults || [];
};

/** Set or clear the pending lane-assignment event index for a division. */
export const setPendingLaneEventIndex = async (eventIndex, divisionId = null) => {
  const id = await resolveDivisionId(divisionId);
  const value =
    eventIndex == null || eventIndex === '' ? null : String(eventIndex);
  const merged = await updateDivisionData(id, { pendingLaneEventIndex: value });
  return merged.pendingLaneEventIndex ?? null;
};

export const createDivision = async (name, { cloneFromId } = {}) => {
  const meta = await getDivisionsMeta();
  const trimmedName = normalizeDivisionName(name);

  if (!trimmedName) {
    throw new Error('Division name cannot be empty.');
  }
  if (isDuplicateDivisionName(meta.divisions, trimmedName)) {
    throw new Error('A division with this name already exists.');
  }

  const sourceId = cloneFromId || meta.activeDivisionId;
  let config = extractDivisionConfig(createDefaultDivisionData());

  if (sourceId) {
    const sourceData = await getDivisionData(sourceId);
    config = extractDivisionConfig(sourceData);
  }

  const divisionMeta = {
    ...createDivisionMeta(trimmedName),
    name: trimmedName,
  };
  const divisionData = createDivisionDataFromConfig(config);

  const nextMeta = {
    activeDivisionId: divisionMeta.id,
    divisions: [...meta.divisions, divisionMeta],
  };

  await saveDivisionData(divisionMeta.id, divisionData);
  await saveDivisionsMeta(nextMeta);

  return { meta: nextMeta, division: divisionMeta, data: divisionData };
};

export const renameDivision = async (divisionId, name) => {
  const trimmed = normalizeDivisionName(name);
  if (!trimmed) {
    throw new Error('Division name cannot be empty.');
  }

  const meta = await getDivisionsMeta();
  const index = meta.divisions.findIndex((division) => division.id === divisionId);
  if (index === -1) {
    throw new Error(`Division not found: ${divisionId}`);
  }
  if (isDuplicateDivisionName(meta.divisions, trimmed, divisionId)) {
    throw new Error('A division with this name already exists.');
  }

  const nextDivisions = [...meta.divisions];
  nextDivisions[index] = { ...nextDivisions[index], name: trimmed };
  const nextMeta = { ...meta, divisions: nextDivisions };
  await saveDivisionsMeta(nextMeta);
  return nextMeta;
};

export const deleteDivision = async (divisionId) => {
  const meta = await getDivisionsMeta();
  if (meta.divisions.length <= 1) {
    throw new Error('Cannot delete the last division.');
  }

  const nextDivisions = meta.divisions.filter((division) => division.id !== divisionId);
  if (nextDivisions.length === meta.divisions.length) {
    throw new Error(`Division not found: ${divisionId}`);
  }

  let nextActiveId = meta.activeDivisionId;
  if (meta.activeDivisionId === divisionId) {
    nextActiveId = nextDivisions[0].id;
  }

  const nextMeta = {
    activeDivisionId: nextActiveId,
    divisions: nextDivisions,
  };

  await AsyncStorage.removeItem(getDivisionStorageKey(divisionId));
  await saveDivisionsMeta(nextMeta);
  return nextMeta;
};

export const resetDivision = async (divisionId, scope) => {
  const current = await getDivisionData(divisionId);
  const next = applyResetScope(current, scope);
  await saveDivisionData(divisionId, next);
  return next;
};

/**
 * One-time migration from flat legacy keys into "Division 1".
 * Safe to call multiple times; no-ops once meta storage exists.
 * Also removes stale flat keys on subsequent launches after migration.
 */
export const migrateFromLegacyStorage = async () => {
  const existingMetaRaw = await AsyncStorage.getItem(META_STORAGE_KEY);
  if (existingMetaRaw) {
    const meta = await getDivisionsMeta();
    const legacyKeysRemoved = await cleanupLegacyStorageIfPresent();
    return { migrated: false, meta, legacyKeysRemoved };
  }

  const divisionId = createDivisionId();
  const divisionMeta = {
    id: divisionId,
    name: DEFAULT_DIVISION_NAME,
    createdAt: new Date().toISOString(),
  };

  const legacyExists = await hasLegacyData();
  const divisionData = legacyExists
    ? await buildDivisionDataFromLegacy()
    : createDefaultDivisionData();

  const meta = {
    activeDivisionId: divisionId,
    divisions: [divisionMeta],
  };

  await saveDivisionData(divisionId, divisionData);
  await saveDivisionsMeta(meta);

  let legacyKeysRemoved = false;
  if (legacyExists) {
    await removeLegacyKeys();
    legacyKeysRemoved = true;
  }

  return { migrated: true, meta, divisionId, divisionData, legacyKeysRemoved };
};

/** Removes flat legacy keys when present. Safe to call anytime after migration. */
export const removeLegacyStorageKeys = async () => {
  return cleanupLegacyStorageIfPresent();
};

export { RESET_SCOPES };
