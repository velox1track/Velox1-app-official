/**
 * Event Assignments utility for managing athlete-to-event assignments
 * Supports one-and-done enforcement and relay team selection
 */

import { getActiveDivisionId, getDivisionData, updateDivisionData } from './storage';

/**
 * Data structure:
 * [
 *   {
 *     eventIndex: 0,
 *     eventName: "100m",
 *     isRelay: false,
 *     assignments: [
 *       { teamId: 1, athleteIds: ["athlete1"] },
 *       { teamId: 2, athleteIds: ["athlete2"] }
 *     ]
 *   }
 * ]
 */

const resolveDivisionId = async (divisionId) => {
  if (divisionId) return divisionId;
  const activeId = await getActiveDivisionId();
  if (!activeId) {
    throw new Error('No active division available for event assignments.');
  }
  return activeId;
};

export const loadEventAssignments = async (divisionId = null) => {
  try {
    const id = await resolveDivisionId(divisionId);
    const data = await getDivisionData(id);
    return Array.isArray(data.eventAssignments) ? data.eventAssignments : [];
  } catch (error) {
    console.log('Error loading event assignments:', error);
    return [];
  }
};

export const saveEventAssignments = async (assignments, divisionId = null) => {
  try {
    const id = await resolveDivisionId(divisionId);
    await updateDivisionData(id, { eventAssignments: assignments });
    return true;
  } catch (error) {
    console.log('Error saving event assignments:', error);
    return false;
  }
};

export const getAssignmentForEvent = (assignments, eventIndex) => {
  return assignments.find(a => a.eventIndex === eventIndex);
};

export const setAssignmentForEvent = async (
  assignments,
  eventIndex,
  eventName,
  isRelay,
  teamAssignments,
  laneAssignments = null,
  divisionId = null
) => {
  const newAssignment = {
    eventIndex,
    eventName,
    isRelay,
    assignments: teamAssignments,
    timestamp: new Date().toISOString()
  };

  // Carry forward lane assignments when provided (null = no lanes)
  if (laneAssignments !== null) {
    newAssignment.laneAssignments = laneAssignments;
  }

  const filtered = assignments.filter(a => a.eventIndex !== eventIndex);
  const updated = [...filtered, newAssignment].sort((a, b) => a.eventIndex - b.eventIndex);
  
  const success = await saveEventAssignments(updated, divisionId);
  return success ? updated : assignments;
};

export const getAllUsedAthleteIds = (assignments) => {
  const usedIds = new Set();
  assignments.forEach(assignment => {
    assignment.assignments.forEach(teamAssignment => {
      teamAssignment.athleteIds.forEach(athleteId => {
        usedIds.add(athleteId);
      });
    });
  });
  return Array.from(usedIds);
};

export const getUsedAthleteIdsExcludingEvent = (assignments, excludeEventIndex) => {
  const usedIds = new Set();
  assignments
    .filter(a => a.eventIndex !== excludeEventIndex)
    .forEach(assignment => {
      assignment.assignments.forEach(teamAssignment => {
        teamAssignment.athleteIds.forEach(athleteId => {
          // Skip 'NOT_RUNNING' markers
          if (athleteId !== 'NOT_RUNNING') {
            usedIds.add(athleteId);
          }
        });
      });
    });
  return Array.from(usedIds);
};

/**
 * Like getUsedAthleteIdsExcludingEvent, but only considers assignments whose
 * isRelay flag matches the given type. Used to enforce the "1 individual event
 * + 1 relay event" eligibility rule (each bucket — individual vs relay — is
 * tracked independently, so an athlete can be used in one of each).
 */
export const getUsedAthleteIdsExcludingEventByType = (assignments, excludeEventIndex, isRelay) => {
  const usedIds = new Set();
  assignments
    .filter(a => a.eventIndex !== excludeEventIndex && !!a.isRelay === !!isRelay)
    .forEach(assignment => {
      assignment.assignments.forEach(teamAssignment => {
        teamAssignment.athleteIds.forEach(athleteId => {
          if (athleteId !== 'NOT_RUNNING') {
            usedIds.add(athleteId);
          }
        });
      });
    });
  return Array.from(usedIds);
};

export const getUsedAthleteIdsUpToEvent = (assignments, eventIndex) => {
  const usedIds = new Set();
  assignments
    .filter(a => a.eventIndex < eventIndex)
    .forEach(assignment => {
      assignment.assignments.forEach(teamAssignment => {
        teamAssignment.athleteIds.forEach(athleteId => {
          usedIds.add(athleteId);
        });
      });
    });
  return Array.from(usedIds);
};

export const isAthleteUsed = (assignments, athleteId, beforeEventIndex = null) => {
  const relevantAssignments = beforeEventIndex !== null 
    ? assignments.filter(a => a.eventIndex < beforeEventIndex)
    : assignments;
    
  return relevantAssignments.some(assignment =>
    assignment.assignments.some(teamAssignment =>
      teamAssignment.athleteIds.includes(athleteId)
    )
  );
};

export const getTeamAssignmentForEvent = (assignments, eventIndex, teamId) => {
  const eventAssignment = getAssignmentForEvent(assignments, eventIndex);
  if (!eventAssignment) return null;
  
  return eventAssignment.assignments.find(ta => ta.teamId === teamId);
};

export const isEventFullyAssigned = (assignments, eventIndex, teams) => {
  const eventAssignment = getAssignmentForEvent(assignments, eventIndex);
  if (!eventAssignment) return false;
  
  // An event is considered "assigned" if it has any team assignments
  // This covers cases where some teams are running (have athletes) and others are not running
  return eventAssignment.assignments.length > 0;
};

export const getAssignmentStats = (assignments, teams) => {
  const totalEvents = assignments.length;
  const fullyAssignedEvents = assignments.filter(assignment => 
    teams.every(team => {
      const teamAssignment = assignment.assignments.find(ta => ta.teamId === team.id);
      return teamAssignment && teamAssignment.athleteIds.length > 0;
    })
  ).length;
  
  const totalAthletes = teams.reduce((sum, team) => sum + team.athletes.length, 0);
  const usedAthletes = getAllUsedAthleteIds(assignments).length;
  
  return {
    totalEvents,
    fullyAssignedEvents,
    totalAthletes,
    usedAthletes,
    availableAthletes: totalAthletes - usedAthletes
  };
};

export const clearAllAssignments = async (divisionId = null) => {
  return saveEventAssignments([], divisionId);
};

export const isRelayEvent = (eventName) => {
  // Check if event is from relays category or contains relay indicators
  return eventName && (
    eventName.includes('4x') || 
    eventName.includes('-') || // Mixed relays like "100-100-200-400"
    eventName.toLowerCase().includes('relay')
  );
};

export const getRelayAthleteCount = (eventName) => {
  if (!eventName) return 4; // Default fallback
  
  // Parse different relay formats
  const name = eventName.toLowerCase();
  
  // Standard 4x relays (4x100, 4x200, etc.)
  if (name.includes('4x')) {
    return 4;
  }
  
  // Mixed relays with dashes (100-100-200-400)
  if (name.includes('-')) {
    const segments = name.split('-');
    // Count the number of distance segments
    const distanceSegments = segments.filter(segment => 
      /^\d+/.test(segment.trim()) // Starts with a number
    );
    return distanceSegments.length > 0 ? distanceSegments.length : 4;
  }
  
  // Named relays containing "relay"
  if (name.includes('relay')) {
    // Could be configurable in the future, default to 4
    return 4;
  }
  
  // Default to 4 for any unrecognized relay format
  return 4;
};

// ─── Lane Assignment Helpers ──────────────────────────────────────────────────

/**
 * Builds a random lane assignment list for an event.
 * - Relays:     one entry per running team (no athlete name)
 * - Individual: one entry per running team showing the assigned athlete
 * Returns an array sorted by lane number, each item:
 *   { lane, teamId, teamName, athleteId, athleteName, locked }
 */
export const generateLaneAssignments = (eventRecord, teams) => {
  const { isRelay, assignments: teamAssignments } = eventRecord;

  const participants = [];
  teamAssignments.forEach(ta => {
    if (!ta.athleteIds || ta.athleteIds.length === 0) return;
    if (ta.athleteIds[0] === 'NOT_RUNNING') return;

    const team = teams.find(t => String(t.id) === String(ta.teamId));
    const teamName = team ? team.name : `Team ${ta.teamId}`;

    if (isRelay) {
      participants.push({ teamId: ta.teamId, teamName, athleteId: null, athleteName: null, locked: false });
    } else {
      const athleteId = ta.athleteIds[0];
      const athlete = team ? team.athletes.find(a => String(a.id) === String(athleteId)) : null;
      participants.push({ teamId: ta.teamId, teamName, athleteId, athleteName: athlete ? athlete.name : 'Unknown', locked: false });
    }
  });

  if (participants.length === 0) return [];

  // Fisher-Yates shuffle
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((p, i) => ({ ...p, lane: i + 1 }));
};

/**
 * Re-shuffles only the unlocked lanes, leaving locked entries in place.
 * Returns a new array sorted by lane number.
 */
export const rerollUnlockedLanes = (laneAssignments) => {
  if (!laneAssignments || laneAssignments.length === 0) return laneAssignments;

  const unlockedLaneNums = laneAssignments.filter(la => !la.locked).map(la => la.lane);

  // Shuffle the unlocked lane numbers
  for (let i = unlockedLaneNums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unlockedLaneNums[i], unlockedLaneNums[j]] = [unlockedLaneNums[j], unlockedLaneNums[i]];
  }

  let unlockedIdx = 0;
  const result = laneAssignments.map(la => {
    if (la.locked) return la;
    return { ...la, lane: unlockedLaneNums[unlockedIdx++] };
  });

  return result.sort((a, b) => a.lane - b.lane);
};

/**
 * Returns the saved lane assignments for an event, or null if none exist.
 */
export const getLaneAssignmentsForEvent = (assignments, eventIndex) => {
  const event = assignments.find(a => a.eventIndex === eventIndex);
  return event && event.laneAssignments && event.laneAssignments.length > 0
    ? event.laneAssignments
    : null;
};

/**
 * Persists lane assignments onto an existing event record.
 */
export const saveLaneAssignments = async (assignments, eventIndex, laneAssignments, divisionId = null) => {
  const updated = assignments.map(a =>
    a.eventIndex === eventIndex ? { ...a, laneAssignments } : a
  );
  const success = await saveEventAssignments(updated, divisionId);
  return success ? updated : assignments;
};

/**
 * When a coach edits athletes, keeps each team's lane number the same but
 * updates the athlete name to reflect the new selection.
 *
 * - Relay events: athlete fields stay null, only lane + team preserved.
 * - Individual events: athlete name refreshed from the new team selection.
 *
 * Returns updated laneAssignments array (same length, same order).
 */
export const preserveLanesByTeam = (existingLanes, newTeamAssignments, teams, isRelay) => {
  if (!existingLanes || existingLanes.length === 0) return null;

  return existingLanes.map(la => {
    const newTA = newTeamAssignments.find(ta => String(ta.teamId) === String(la.teamId));

    if (!newTA || newTA.athleteIds.length === 0 || newTA.athleteIds[0] === 'NOT_RUNNING') {
      return la; // team no longer running — keep existing entry unchanged
    }

    if (isRelay) {
      return { ...la }; // relay: preserve lane + team, athlete stays null
    }

    // Individual: refresh athlete name while keeping lane number
    const team = teams.find(t => String(t.id) === String(la.teamId));
    const newAthleteId = newTA.athleteIds[0];
    const newAthlete = team ? team.athletes.find(a => String(a.id) === String(newAthleteId)) : null;
    return { ...la, athleteId: newAthleteId, athleteName: newAthlete ? newAthlete.name : 'Unknown' };
  });
};
