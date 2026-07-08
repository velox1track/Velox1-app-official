const listeners = new Map();

export const DIVISION_EVENTS = {
  CHANGED: 'division.changed',
};

export const SCOPED_EVENTS = {
  TEAMS_UPDATED: 'teamsUpdated',
  PLANNED_TEAMS_UPDATED: 'plannedTeamsUpdated',
  ROULETTE_UPDATED: 'settings.roulette.updated',
  SCORING_UPDATED: 'settings.scoring.updated',
  INFRACTIONS_UPDATED: 'settings.infractions.updated',
  EVENT_POOL_UPDATED: 'settings.eventPool.updated',
};

export const normalizeEventPayload = (payload, divisionId) => {
  if (divisionId == null) {
    return payload;
  }
  if (payload != null && typeof payload === 'object' && !Array.isArray(payload)) {
    return { ...payload, divisionId };
  }
  return { value: payload, divisionId };
};

export const getEventDivisionId = (payload) => {
  if (payload && typeof payload === 'object' && payload.divisionId != null) {
    return payload.divisionId;
  }
  return null;
};

export const getEventValue = (payload) => {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'value')) {
    return payload.value;
  }
  return payload;
};

export const matchesDivision = (payload, divisionId) => {
  const eventDivisionId = getEventDivisionId(payload);
  if (eventDivisionId == null) {
    return true;
  }
  if (divisionId == null) {
    return true;
  }
  return eventDivisionId === divisionId;
};

export function on(eventName, handler) {
  const arr = listeners.get(eventName) || [];
  arr.push(handler);
  listeners.set(eventName, arr);
  return () => off(eventName, handler);
}

export function off(eventName, handler) {
  const arr = listeners.get(eventName) || [];
  listeners.set(eventName, arr.filter((fn) => fn !== handler));
}

export function emit(eventName, payload) {
  const arr = listeners.get(eventName) || [];
  arr.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* noop */
    }
  });
}

export function emitForDivision(divisionId, eventName, payload) {
  emit(eventName, normalizeEventPayload(payload, divisionId));
}

export function onForDivision(divisionId, eventName, handler) {
  const wrapped = (payload) => {
    if (!matchesDivision(payload, divisionId)) {
      return;
    }
    handler(getEventValue(payload), payload);
  };
  return on(eventName, wrapped);
}

export function emitDivisionChanged({ divisionId, previousDivisionId }) {
  emit(DIVISION_EVENTS.CHANGED, { divisionId, previousDivisionId });
}

export default {
  on,
  off,
  emit,
  emitForDivision,
  onForDivision,
  emitDivisionChanged,
  DIVISION_EVENTS,
  SCOPED_EVENTS,
  getEventDivisionId,
  getEventValue,
  matchesDivision,
};
