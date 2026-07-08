import { useCallback, useEffect, useState } from 'react';
import { useDivision } from '../context/DivisionContext';
import eventBus from '../lib/eventBus';
import {
  clearTeams,
  getPlannedTeams,
  getTeams,
  savePlannedTeams,
  saveTeams,
} from '../lib/storage';

/**
 * Division-scoped teams and planned team count for the active division.
 * Reloads automatically when activeDivisionId changes.
 */
export const useDivisionTeams = () => {
  const { activeDivisionId } = useDivision();
  const [teams, setTeams] = useState([]);
  const [plannedTeams, setPlannedTeams] = useState(4);
  const [isLoading, setIsLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    if (!activeDivisionId) {
      setTeams([]);
      setPlannedTeams(4);
      setIsLoading(false);
      return { teams: [], plannedTeams: 4 };
    }

    setIsLoading(true);
    try {
      const [roster, planned] = await Promise.all([
        getTeams(activeDivisionId),
        getPlannedTeams(activeDivisionId),
      ]);
      setTeams(roster);
      setPlannedTeams(planned);
      return { teams: roster, plannedTeams: planned };
    } catch (error) {
      console.log('Error loading division teams:', error);
      setTeams([]);
      setPlannedTeams(4);
      return { teams: [], plannedTeams: 4 };
    } finally {
      setIsLoading(false);
    }
  }, [activeDivisionId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (!activeDivisionId) return;

    const unsubPlanned = eventBus.onForDivision(
      activeDivisionId,
      'plannedTeamsUpdated',
      (planned) => {
        if (typeof planned === 'number' && planned > 0) {
          setPlannedTeams(planned);
        }
      }
    );

    const unsubTeams = eventBus.onForDivision(activeDivisionId, 'teamsUpdated', () => {
      loadTeams();
    });

    return () => {
      unsubPlanned();
      unsubTeams();
    };
  }, [activeDivisionId, loadTeams]);

  const persistTeams = useCallback(async (nextTeams) => {
    if (!activeDivisionId) {
      throw new Error('No active division available.');
    }
    const saved = await saveTeams(nextTeams, activeDivisionId);
    setTeams(saved);
    return saved;
  }, [activeDivisionId]);

  const setPlannedTeamCount = useCallback(async (count) => {
    if (!activeDivisionId) {
      throw new Error('No active division available.');
    }
    const saved = await savePlannedTeams(count, activeDivisionId);
    setPlannedTeams(saved);
    return saved;
  }, [activeDivisionId]);

  const wipeTeams = useCallback(async () => {
    if (!activeDivisionId) {
      throw new Error('No active division available.');
    }
    await clearTeams(activeDivisionId);
    setTeams([]);
  }, [activeDivisionId]);

  return {
    teams,
    plannedTeams,
    isLoading,
    loadTeams,
    persistTeams,
    setPlannedTeamCount,
    wipeTeams,
  };
};
