/**
 * Division data model and helpers for multi-division competitions.
 */

import { getDefaultEventPool } from './randomizer';
import { buildScoringPlaces } from './scoring';

export const DEFAULT_DIVISION_NAME = 'Division 1';

export const RESET_SCOPES = {
  ATHLETES: 'athletes',
  TEAMS: 'teams',
  SEQUENCE: 'sequence',
  RESULTS: 'results',
  PROGRESS: 'progress',
  ASSIGNMENTS: 'assignments',
  EVENT_POOL: 'eventPool',
  ALL_DATA: 'allData',
};

const DEFAULT_INFRACTION_ITEMS = [
  { id: 'false_start', label: 'False Start', delta: -2, allowMultiple: true },
  { id: 'athlete_selection_clock', label: 'Athlete-Selection Clock Violation', delta: -3, allowMultiple: false },
  { id: 'lane_violation', label: 'Lane Violation', delta: -5, allowMultiple: false },
  { id: 'baton_exchange', label: 'Baton Exchange Violation', delta: -5, allowMultiple: false },
  { id: 'obstruction', label: 'Obstruction', delta: -5, allowMultiple: false },
];

const DEFAULT_PLANNED_TEAMS = 4;

/**
 * @typedef {Object} DivisionMeta
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 */

/**
 * @typedef {Object} DivisionData
 * @property {Array} athletes
 * @property {Array} teams
 * @property {string[]} eventSequence
 * @property {string} revealedIndex
 * @property {Array} eventResults
 * @property {Array} eventAssignments
 * @property {string|null} pendingLaneEventIndex
 * @property {Object} eventPool
 * @property {Object} settings
 */

export const createDivisionId = () => {
  return `div_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const normalizeDivisionName = (name) => (name || '').trim();

const divisionNamesMatch = (a, b) =>
  normalizeDivisionName(a).toLowerCase() === normalizeDivisionName(b).toLowerCase();

export const isDuplicateDivisionName = (divisions, name, excludeDivisionId = null) => {
  const normalized = normalizeDivisionName(name);
  if (!normalized) return false;
  return divisions.some(
    (division) =>
      division.id !== excludeDivisionId && divisionNamesMatch(division.name, normalized)
  );
};

export const getNextAvailableDivisionName = (divisions, prefix = 'Division') => {
  let counter = divisions.length + 1;
  while (isDuplicateDivisionName(divisions, `${prefix} ${counter}`)) {
    counter += 1;
  }
  return `${prefix} ${counter}`;
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

export const createDefaultSettings = (plannedTeams = DEFAULT_PLANNED_TEAMS) => ({
  teamConfig: { plannedTeams },
  roulette: { totalEvents: 5, numRelays: 1, relayPositions: [] },
  scoring: {
    places: buildScoringPlaces(plannedTeams),
    activePresetId: `${plannedTeams}T`,
  },
  infractions: {
    items: deepClone(DEFAULT_INFRACTION_ITEMS),
    activePresetId: 'default',
  },
  // Off by default: an athlete may only compete in one event total. When
  // enabled, an athlete may compete in one individual event AND one relay.
  athleteEligibility: {
    allowIndividualPlusRelay: false,
  },
});

/**
 * Returns a fresh division data blob with app defaults.
 */
export const createDefaultDivisionData = () => ({
  athletes: [],
  teams: [],
  eventSequence: [],
  revealedIndex: '0',
  eventResults: [],
  eventAssignments: [],
  pendingLaneEventIndex: null,
  eventPool: getDefaultEventPool(),
  settings: createDefaultSettings(),
});

/**
 * Returns only the config fields that should be cloned when creating a new division.
 */
export const extractDivisionConfig = (divisionData) => {
  const source = divisionData || createDefaultDivisionData();
  return {
    eventPool: deepClone(source.eventPool || getDefaultEventPool()),
    settings: deepClone(source.settings || createDefaultSettings()),
  };
};

/**
 * Creates runtime division data with cloned config and empty competition state.
 */
export const createDivisionDataFromConfig = (config) => ({
  athletes: [],
  teams: [],
  eventSequence: [],
  revealedIndex: '0',
  eventResults: [],
  eventAssignments: [],
  pendingLaneEventIndex: null,
  eventPool: deepClone(config?.eventPool || getDefaultEventPool()),
  settings: deepClone(config?.settings || createDefaultSettings()),
});

export const createDivisionMeta = (name) => ({
  id: createDivisionId(),
  name: name.trim() || DEFAULT_DIVISION_NAME,
  createdAt: new Date().toISOString(),
});

/**
 * Applies a scoped reset to division data in memory.
 */
/**
 * Remove matching athletes from every event assignment. Lane entries keep
 * their lane number (athlete cleared) so a replacement inherits the team's
 * lane. The Team Not Running marker is never treated as an athlete.
 */
export const stripAthletesFromAssignments = (eventAssignments, isMatch) => {
  const matchesAthlete = (id) => id != null && id !== 'NOT_RUNNING' && isMatch(id);
  return (eventAssignments || []).map((record) => {
    const next = {
      ...record,
      assignments: (record.assignments || []).map((ta) => ({
        ...ta,
        athleteIds: (ta.athleteIds || []).filter((aid) => !matchesAthlete(aid)),
      })),
    };
    if (Array.isArray(record.laneAssignments)) {
      next.laneAssignments = record.laneAssignments.map((la) =>
        matchesAthlete(la.athleteId) ? { ...la, athleteId: null, athleteName: null } : la
      );
    }
    return next;
  });
};

export const applyResetScope = (divisionData, scope) => {
  const next = deepClone(divisionData || createDefaultDivisionData());

  switch (scope) {
    case RESET_SCOPES.ATHLETES:
      next.athletes = [];
      next.teams = (next.teams || []).map((team) => ({ ...team, athletes: [] }));
      next.eventAssignments = stripAthletesFromAssignments(next.eventAssignments, () => true);
      break;
    case RESET_SCOPES.TEAMS:
      next.teams = [];
      next.eventAssignments = [];
      break;
    case RESET_SCOPES.SEQUENCE:
      next.eventSequence = [];
      next.revealedIndex = '0';
      break;
    case RESET_SCOPES.RESULTS:
      next.eventResults = [];
      break;
    case RESET_SCOPES.PROGRESS:
      next.revealedIndex = '0';
      break;
    case RESET_SCOPES.ASSIGNMENTS:
      next.eventAssignments = [];
      next.pendingLaneEventIndex = null;
      break;
    case RESET_SCOPES.EVENT_POOL:
      next.eventPool = getDefaultEventPool();
      break;
    case RESET_SCOPES.ALL_DATA:
      next.athletes = [];
      next.teams = [];
      next.eventSequence = [];
      next.revealedIndex = '0';
      next.eventResults = [];
      next.eventAssignments = [];
      next.pendingLaneEventIndex = null;
      break;
    default:
      throw new Error(`Unknown reset scope: ${scope}`);
  }

  return next;
};
