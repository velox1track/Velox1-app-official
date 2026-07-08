/**
 * Randomizer utility for generating event sequences
 * Ensures no event repeats and places relays at specified positions
 */

const deepClone = (value) => JSON.parse(JSON.stringify(value));

/** Ensures every event category exists with a valid events array. */
export const normalizeEventPool = (pool) => {
  const defaults = getDefaultEventPool();
  if (!pool || typeof pool !== 'object') {
    return deepClone(defaults);
  }

  const normalized = {};
  Object.keys(defaults).forEach((category) => {
    normalized[category] = Array.isArray(pool[category])
      ? pool[category].map((event) => ({ ...event }))
      : defaults[category].map((event) => ({ ...event }));
  });
  return normalized;
};

/** Count enabled individual vs relay events for validation messaging. */
export const getEnabledEventCounts = (eventPool) => {
  const pool = normalizeEventPool(eventPool);
  let relayEvents = 0;
  let nonRelayEvents = 0;

  Object.keys(pool).forEach((category) => {
    pool[category].forEach((event) => {
      if (!event.enabled) return;
      if (category === 'relays') {
        relayEvents += 1;
      } else {
        nonRelayEvents += 1;
      }
    });
  });

  return { relayEvents, nonRelayEvents };
};

/** Structured summary for sequence validation UI (e.g. failure modal). */
export const getSequenceValidationSummary = (eventPool, totalEvents, numRelays) => {
  const { relayEvents, nonRelayEvents } = getEnabledEventCounts(eventPool);
  const total = Number(totalEvents) || 0;
  const relays = Number(numRelays) || 0;
  const requiredIndividual = Math.max(0, total - relays);
  const validation = generateEventSequence(eventPool, total, relays, []);

  return {
    success: validation.success,
    error: validation.error,
    totalEvents: total,
    requiredIndividual,
    requiredRelays: relays,
    availableIndividual: nonRelayEvents,
    availableRelay: relayEvents,
  };
};

export const generateEventSequence = (eventPool, totalEvents, numRelays, relayPositions = []) => {
  const pool = normalizeEventPool(eventPool);
  const total = Number(totalEvents);
  const relays = Number(numRelays);

  if (!Number.isFinite(total) || total < 1) {
    return {
      success: false,
      error: 'Total events must be at least 1. Save your Race Roulette sequence settings in Settings first.',
    };
  }

  if (!Number.isFinite(relays) || relays < 0 || relays > total) {
    return {
      success: false,
      error: `Number of relays must be between 0 and ${total}. Save your Race Roulette sequence settings in Settings first.`,
    };
  }

  // Extract enabled events from the categorized pool and separate relays
  const relayEvents = [];
  const nonRelayEvents = [];
  
  Object.keys(pool).forEach((category) => {
    pool[category].forEach((event) => {
      if (event.enabled) {
        if (category === 'relays') {
          relayEvents.push(event.name);
        } else {
          nonRelayEvents.push(event.name);
        }
      }
    });
  });

  const requiredNonRelays = total - relays;
  
  // Validation
  if (nonRelayEvents.length < requiredNonRelays) {
    return {
      success: false,
      error: `Not enough individual events enabled. You need ${requiredNonRelays} non-relay event(s) for a ${total}-event sequence with ${relays} relay(s), but only ${nonRelayEvents.length} are enabled in sprints/distances/technical categories. Enable more in Settings → Event Configuration, then try again.`,
    };
  }
  
  if (relayEvents.length < relays) {
    return {
      success: false,
      error: `Not enough relay events enabled. You need ${relays} relay(s) for this sequence, but only ${relayEvents.length} are enabled in the Relay Races category. Enable more relays in Settings → Event Configuration, or lower "Number of Relays" and tap Save Sequence.`,
    };
  }
  
  // Validate relay positions
  let relayPositionsToUse = [...relayPositions];
  
  // Remove invalid positions and duplicates
  relayPositionsToUse = relayPositionsToUse
    .filter(pos => pos >= 0 && pos < total)
    .filter((pos, index, arr) => arr.indexOf(pos) === index);
  
  // If we don't have enough valid positions, generate random ones for the remaining
  while (relayPositionsToUse.length < relays) {
    let pos;
    do {
      pos = Math.floor(Math.random() * total);
    } while (relayPositionsToUse.includes(pos));
    relayPositionsToUse.push(pos);
  }
  
  // Only use exactly numRelays positions
  relayPositionsToUse = relayPositionsToUse.slice(0, relays);
  relayPositionsToUse.sort((a, b) => a - b);
  
  // Create sequence array
  const sequence = new Array(total);
  
  // Shuffle events
  const shuffledRelays = [...relayEvents].sort(() => Math.random() - 0.5);
  const shuffledNonRelays = [...nonRelayEvents].sort(() => Math.random() - 0.5);
  
  // Fill sequence
  let relayIndex = 0;
  let nonRelayIndex = 0;
  
  for (let i = 0; i < total; i++) {
    if (relayPositionsToUse.includes(i)) {
      sequence[i] = shuffledRelays[relayIndex++];
    } else {
      sequence[i] = shuffledNonRelays[nonRelayIndex++];
    }
  }
  
  return {
    success: true,
    sequence: sequence,
    relayPositions: relayPositionsToUse
  };
};

export const getDefaultEventPool = () => {
  return {
    shortSprints: [
      { name: "50m", enabled: true },
      { name: "60m", enabled: false },
      { name: "100m", enabled: true },
      { name: "150m", enabled: false },
      { name: "200m", enabled: true },
      { name: "300m", enabled: true }
    ],
    middleDistances: [
      { name: "400m", enabled: true },
      { name: "500m", enabled: true },
      { name: "600m", enabled: true },
      { name: "700m", enabled: false },
      { name: "800m", enabled: true },
      { name: "1km", enabled: false }
    ],
    longDistances: [
      { name: "1.2km", enabled: true },
      { name: "1 Mile", enabled: true },
      { name: "2km", enabled: true },
      { name: "2.4km", enabled: true },
      { name: "2.8km", enabled: false },
      { name: "2 Mile", enabled: false }
    ],
    relays: [
      { name: "4x100", enabled: true },
      { name: "4x200", enabled: true },
      { name: "4x400", enabled: true },
      { name: "4x800", enabled: false },
      { name: "100-100-200-400", enabled: true },
      { name: "200-200-400-800", enabled: true },
      { name: "1200-400-800-1600", enabled: false }
    ],
    technicalEvents: [
      { name: "60mH", enabled: false },
      { name: "110mH", enabled: false },
      { name: "400mH", enabled: false },
      { name: "Long Jump", enabled: false },
      { name: "Triple Jump", enabled: false },
      { name: "High Jump", enabled: false },
      { name: "Pole Vault", enabled: false },
      { name: "Shot Put", enabled: false },
      { name: "Discus", enabled: false }
    ]
  };
}; 