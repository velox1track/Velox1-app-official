const listEvents = (events) => events.map((e) => e.eventName).join(', ');

const TITLES = {
  delete: { blocked: "Can't Delete Athlete", confirm: 'Delete Athlete' },
  remove: { blocked: "Can't Remove Athlete", confirm: 'Remove From Team' },
  move: { blocked: "Can't Move Athlete", confirm: 'Move Athlete' },
};

const BLOCKED_VERBS = {
  delete: 'deleted',
  remove: 'removed from their team',
  move: 'moved to another team',
};

/**
 * Decide how to handle deleting, removing, or moving an athlete given where
 * they stand (from getAthleteParticipation). Athletes in scored events are
 * blocked so recorded results keep their athletes.
 *
 * action: 'delete' | 'remove' | 'move'
 * Returns { blocked, needsConfirm, title, message }.
 */
export const describeTeamChangeImpact = ({ action, athleteName, participation, toTeamName }) => {
  const { team = null, scoredEvents = [], unscoredEvents = [] } = participation || {};
  const titles = TITLES[action];

  if (scoredEvents.length > 0) {
    const hasHave = scoredEvents.length === 1 ? 'has' : 'have';
    return {
      blocked: true,
      needsConfirm: true,
      title: titles.blocked,
      message:
        `${athleteName} ran in ${listEvents(scoredEvents)}, which already ${hasHave} recorded results, ` +
        `so they can't be ${BLOCKED_VERBS[action]}. To change this, reset results in the Scoreboard first.`,
    };
  }

  const lines = [];
  if (action === 'delete') {
    lines.push(`Are you sure you want to delete ${athleteName}?`);
    if (team) lines.push(`They'll also be removed from ${team.name}.`);
  } else if (action === 'remove') {
    lines.push(`Remove ${athleteName} from ${team ? team.name : 'their team'}? They'll stay in your athlete list.`);
  } else {
    lines.push(`Move ${athleteName} to ${toTeamName}?`);
  }
  if (unscoredEvents.length > 0) {
    lines.push(`${team ? team.name : 'Their team'} will need a new runner for: ${listEvents(unscoredEvents)}.`);
  }

  return {
    blocked: false,
    needsConfirm: action === 'delete' || unscoredEvents.length > 0,
    title: titles.confirm,
    message: lines.join('\n\n'),
  };
};

/**
 * Clearing the whole roster follows the same rule as deleting one athlete:
 * blocked if anyone ran in a scored event. `participation` comes from
 * getRosterParticipation. Returns { blocked, title, message }.
 */
export const describeClearAthletesImpact = (participation) => {
  const { teamsWithAthletes = 0, scoredEvents = [], unscoredEvents = [] } = participation || {};

  if (scoredEvents.length > 0) {
    const hasHave = scoredEvents.length === 1 ? 'has' : 'have';
    return {
      blocked: true,
      title: "Can't Clear Athletes",
      message:
        `Athletes ran in ${listEvents(scoredEvents)}, which already ${hasHave} recorded results, ` +
        `so the athlete list can't be cleared. To change this, reset results in the Scoreboard first.`,
    };
  }

  const lines = ['Are you sure you want to delete all athletes? This action cannot be undone.'];
  if (teamsWithAthletes > 0) {
    lines.push('They will also be removed from every team. The teams themselves will stay.');
  }
  if (unscoredEvents.length > 0) {
    lines.push(`These events will need new runners: ${listEvents(unscoredEvents)}.`);
  }
  return { blocked: false, title: 'Clear All Athletes', message: lines.join('\n\n') };
};

/**
 * After a delete/remove/move that left a team without a runner, build the
 * "Assign now / Later" prompt. Returns null when nothing needs replacing.
 * "Assign now" targets the earliest affected event.
 */
export const buildReplacementPrompt = ({ action, athleteName, participation, toTeamName }) => {
  const { team = null, unscoredEvents = [] } = participation || {};
  if (!team || unscoredEvents.length === 0) return null;

  const done = {
    delete: `${athleteName} was deleted.`,
    remove: `${athleteName} was removed from ${team.name}.`,
    move: `${athleteName} was moved to ${toTeamName}.`,
  }[action];
  const target = [...unscoredEvents].sort((a, b) => a.eventIndex - b.eventIndex)[0];

  return {
    title: 'Replacement Needed',
    message: `${done}\n\n${team.name} needs a new runner for: ${listEvents(unscoredEvents)}.`,
    teamId: team.id,
    eventIndex: target.eventIndex,
    eventName: target.eventName,
  };
};
