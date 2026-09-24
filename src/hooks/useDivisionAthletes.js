import { useCallback, useEffect, useState } from 'react';
import { useDivision } from '../context/DivisionContext';
import { clearAthletes, getAthletes, saveAthletes, updateAthlete } from '../lib/storage';

/**
 * Division-scoped athlete roster for the active division.
 * Reloads automatically when activeDivisionId changes.
 */
export const useDivisionAthletes = () => {
  const { activeDivisionId } = useDivision();
  const [athletes, setAthletes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAthletes = useCallback(async () => {
    if (!activeDivisionId) {
      setAthletes([]);
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    try {
      const roster = await getAthletes(activeDivisionId);
      setAthletes(roster);
      return roster;
    } catch (error) {
      console.log('Error loading division athletes:', error);
      setAthletes([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [activeDivisionId]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  const persistAthletes = useCallback(async (nextAthletes) => {
    if (!activeDivisionId) {
      throw new Error('No active division available.');
    }
    const saved = await saveAthletes(nextAthletes, activeDivisionId);
    setAthletes(saved);
    return saved;
  }, [activeDivisionId]);

  const editAthlete = useCallback(async (updatedAthlete) => {
    if (!activeDivisionId) {
      throw new Error('No active division available.');
    }
    const saved = await updateAthlete(updatedAthlete, activeDivisionId);
    setAthletes(saved);
    return saved;
  }, [activeDivisionId]);

  const wipeAthletes = useCallback(async () => {
    if (!activeDivisionId) {
      throw new Error('No active division available.');
    }
    await clearAthletes(activeDivisionId);
    setAthletes([]);
  }, [activeDivisionId]);

  return {
    athletes,
    isLoading,
    loadAthletes,
    persistAthletes,
    editAthlete,
    wipeAthletes,
  };
};
