import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  createDivision as createDivisionInStorage,
  deleteDivision as deleteDivisionInStorage,
  getDivisionsMeta,
  migrateFromLegacyStorage,
  renameDivision as renameDivisionInStorage,
  setActiveDivisionId,
} from '../lib/storage';
import { emitDivisionChanged } from '../lib/eventBus';

const DivisionContext = createContext(null);

export const DivisionProvider = ({ children }) => {
  const [meta, setMeta] = useState({ activeDivisionId: null, divisions: [] });
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(null);

  const refreshDivisions = useCallback(async () => {
    const nextMeta = await getDivisionsMeta();
    setMeta(nextMeta);
    return nextMeta;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeDivisions = async () => {
      try {
        await migrateFromLegacyStorage();
        const nextMeta = await getDivisionsMeta();
        if (isMounted) {
          setMeta(nextMeta);
          setInitError(null);
        }
      } catch (error) {
        console.error('Failed to initialize divisions:', error);
        if (isMounted) {
          setInitError(error.message || 'Failed to load divisions.');
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    initializeDivisions();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeDivision = useMemo(
    () => meta.divisions.find((division) => division.id === meta.activeDivisionId) || null,
    [meta.activeDivisionId, meta.divisions]
  );

  const setActiveDivision = useCallback(async (divisionId) => {
    const previousDivisionId = meta.activeDivisionId;
    const nextMeta = await setActiveDivisionId(divisionId);
    setMeta(nextMeta);
    if (previousDivisionId !== divisionId) {
      emitDivisionChanged({ divisionId, previousDivisionId });
    }
    return nextMeta;
  }, [meta.activeDivisionId]);

  const createDivision = useCallback(async (name) => {
    const previousDivisionId = meta.activeDivisionId;
    const result = await createDivisionInStorage(name);
    setMeta(result.meta);
    emitDivisionChanged({
      divisionId: result.meta.activeDivisionId,
      previousDivisionId,
    });
    return result;
  }, [meta.activeDivisionId]);

  const renameDivision = useCallback(async (divisionId, name) => {
    const nextMeta = await renameDivisionInStorage(divisionId, name);
    setMeta(nextMeta);
    return nextMeta;
  }, []);

  const deleteDivision = useCallback(async (divisionId) => {
    const previousDivisionId = meta.activeDivisionId;
    const nextMeta = await deleteDivisionInStorage(divisionId);
    setMeta(nextMeta);
    if (nextMeta.activeDivisionId !== previousDivisionId) {
      emitDivisionChanged({
        divisionId: nextMeta.activeDivisionId,
        previousDivisionId,
      });
    }
    return nextMeta;
  }, [meta.activeDivisionId]);

  const value = useMemo(
    () => ({
      activeDivisionId: meta.activeDivisionId,
      activeDivisionName: activeDivision?.name || '',
      activeDivision,
      divisions: meta.divisions,
      isReady,
      initError,
      setActiveDivision,
      createDivision,
      renameDivision,
      deleteDivision,
      refreshDivisions,
    }),
    [
      activeDivision,
      createDivision,
      deleteDivision,
      initError,
      isReady,
      meta.activeDivisionId,
      meta.divisions,
      refreshDivisions,
      renameDivision,
      setActiveDivision,
    ]
  );

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#64E2D3" />
        <Text style={styles.loadingText}>Loading divisions...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{initError}</Text>
      </View>
    );
  }

  return (
    <DivisionContext.Provider value={value}>
      {children}
    </DivisionContext.Provider>
  );
};

export const useDivision = () => {
  const context = useContext(DivisionContext);
  if (!context) {
    throw new Error('useDivision must be used within a DivisionProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9FA7AE',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#080A0B',
    fontFamily: 'System',
  },
  errorText: {
    fontSize: 16,
    color: '#080A0B',
    textAlign: 'center',
    paddingHorizontal: 24,
    fontFamily: 'System',
  },
});
