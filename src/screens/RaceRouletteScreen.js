import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Alert,
  useWindowDimensions,
  Image,
  Pressable,
  Text
} from 'react-native';
import EventCard from '../components/EventCard';
import { generateEventSequence, getDefaultEventPool, getSequenceValidationSummary } from '../lib/randomizer';
import { loadEventAssignments, isEventFullyAssigned, clearAllAssignments, generateLaneAssignments, rerollUnlockedLanes, getLaneAssignmentsForEvent, saveLaneAssignments } from '../lib/eventAssignments';
import { getDivisionData, getEventPool, getRouletteSettings, getTeams, setPendingLaneEventIndex, updateDivisionData } from '../lib/storage';
import { useDivision } from '../context/DivisionContext';
import eventBus from '../lib/eventBus';
import SequenceValidationModal from '../components/SequenceValidationModal';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { ButtonPrimary, ButtonSecondary, SegmentedToggle } from '../components';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import { useResponsive } from '../utils/useResponsive';

// Category labels for the Manual Sequence Builder — mirrors the categories
// configured in Settings → Event Configuration.
const MANUAL_CATEGORY_LABELS = {
  shortSprints: 'Short Sprints',
  middleDistances: 'Middle Distances',
  longDistances: 'Long Distances',
  relays: 'Relays',
  technicalEvents: 'Specialty Events',
};

const MANUAL_CATEGORY_ORDER = Object.keys(MANUAL_CATEGORY_LABELS);

const getEnabledManualCategories = (pool) => {
  return MANUAL_CATEGORY_ORDER.filter(
    (key) => Array.isArray(pool?.[key]) && pool[key].some((event) => event.enabled)
  );
};

const getEnabledManualEvents = (pool, category) => {
  if (!category || !Array.isArray(pool?.[category])) return [];
  return pool[category].filter((event) => event.enabled).map((event) => event.name);
};

const RaceRouletteScreen = ({ navigation }) => {
  const { activeDivisionId } = useDivision();
  const { width, height } = useWindowDimensions();
  const responsive = useResponsive();
  const isLandscape = width > height;
  
  const [sequenceMode, setSequenceMode] = useState('roulette'); // 'roulette' or 'manual'
  const [eventPool, setEventPool] = useState(getDefaultEventPool());
  const [totalEvents, setTotalEvents] = useState('5');
  const [numRelays, setNumRelays] = useState('1');
  const [relayPositions, setRelayPositions] = useState('');
  const [eventSequence, setEventSequence] = useState([]);
  const [revealedIndex, setRevealedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Lane assignment state
  const [showLaneModal, setShowLaneModal] = useState(false);
  const [laneEventIndex, setLaneEventIndex] = useState(null);
  const [pendingLaneAssignments, setPendingLaneAssignments] = useState([]);

  // Event action modal (Edit Athletes vs Manage Lanes)
  const [showEventActionModal, setShowEventActionModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sequenceValidationSummary, setSequenceValidationSummary] = useState(null);
  const [showSequenceValidationModal, setShowSequenceValidationModal] = useState(false);

  const scrollViewRef = useRef(null);
  const laneModalRef = useRef(null);
  const eventActionModalRef = useRef(null);
  const resetConfirmRef = useRef(null);

  // Manual Sequence Builder state
  const [manualDraftSequence, setManualDraftSequence] = useState([]);
  const [manualSelectedCategory, setManualSelectedCategory] = useState(null);
  const [manualSelectedEvent, setManualSelectedEvent] = useState(null);

  const enabledManualCategories = getEnabledManualCategories(eventPool);
  const manualEventsForCategory = getEnabledManualEvents(eventPool, manualSelectedCategory);

  // Keep the selected category valid as the (division-scoped) event pool changes
  useEffect(() => {
    if (enabledManualCategories.length === 0) {
      setManualSelectedCategory(null);
      return;
    }
    if (!manualSelectedCategory || !enabledManualCategories.includes(manualSelectedCategory)) {
      setManualSelectedCategory(enabledManualCategories[0]);
    }
  }, [eventPool]);

  // Keep the selected event valid as the category (or pool) changes
  useEffect(() => {
    if (manualEventsForCategory.length === 0) {
      setManualSelectedEvent(null);
      return;
    }
    if (!manualSelectedEvent || !manualEventsForCategory.includes(manualSelectedEvent)) {
      setManualSelectedEvent(manualEventsForCategory[0]);
    }
  }, [manualSelectedCategory, eventPool]);

  const isManualSelectedEventAlreadyAdded = !!manualSelectedEvent && manualDraftSequence.includes(manualSelectedEvent);

  const handleAddManualEvent = () => {
    if (!manualSelectedEvent || manualDraftSequence.includes(manualSelectedEvent)) return;
    const eventToAdd = manualSelectedEvent;
    setManualDraftSequence((prev) => [...prev, eventToAdd]);

    // Auto-advance to the next not-yet-added event in this category, matching
    // the "skip past used items" feel of athlete selection elsewhere in the app.
    const nextAvailable = manualEventsForCategory.find(
      (name) => name !== eventToAdd && !manualDraftSequence.includes(name)
    );
    if (nextAvailable) {
      setManualSelectedEvent(nextAvailable);
    }
  };

  const handleRemoveManualDraftEvent = (index) => {
    setManualDraftSequence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveManualSequence = async () => {
    if (!activeDivisionId) {
      Alert.alert('No Division Selected', 'Select a division before saving a sequence.');
      return;
    }

    if (manualDraftSequence.length === 0) {
      return;
    }

    try {
      setIsLoading(true);

      // Mirrors generateSequence's success path exactly, so a manually-built
      // sequence is stored in the identical shape/schema as a randomized one —
      // same reset of results/assignments, same revealedIndex, same clear call.
      await updateDivisionData(activeDivisionId, {
        eventResults: [],
        eventAssignments: [],
        eventSequence: manualDraftSequence,
        revealedIndex: '0',
      });
      await clearAllAssignments(activeDivisionId);

      setEventSequence(manualDraftSequence);
      setRevealedIndex(0);
      setAssignments([]);
      setManualDraftSequence([]);

      setIsLoading(false);
      Alert.alert('Success', `Manual sequence saved with ${manualDraftSequence.length} event(s)!`);
    } catch (error) {
      setIsLoading(false);
      console.error('Save manual sequence error:', error);
      Alert.alert('Error', error?.message || 'Failed to save the manual sequence. Please try again.');
    }
  };

  const loadDivisionState = useCallback(async (divisionId = null) => {
    const resolvedDivisionId = divisionId || activeDivisionId;
    if (!resolvedDivisionId) return null;

    try {
      const [division, assignmentsData, savedTeams, pool] = await Promise.all([
        getDivisionData(resolvedDivisionId),
        loadEventAssignments(resolvedDivisionId),
        getTeams(resolvedDivisionId),
        getEventPool(resolvedDivisionId),
      ]);

      setEventSequence(Array.isArray(division.eventSequence) ? division.eventSequence : []);
      setRevealedIndex(parseInt(division.revealedIndex || '0', 10));
      setEventPool(pool);
      setAssignments(assignmentsData);
      setTeams(savedTeams);

      return { division, assignmentsData, savedTeams };
    } catch (error) {
      console.log('Error loading division state:', error);
      return null;
    }
  }, [activeDivisionId]);

  const handlePendingLaneModal = useCallback(async (pendingIdx, assignmentsData, freshTeams, divisionId) => {
    if (pendingIdx == null || pendingIdx === '' || !divisionId) return;

    await setPendingLaneEventIndex(null, divisionId);

    const idx = parseInt(pendingIdx, 10);
    if (Number.isNaN(idx)) return;

    const eventRecord = assignmentsData.find(a => a.eventIndex === idx);
    if (!eventRecord) return;

    const existing = getLaneAssignmentsForEvent(assignmentsData, idx);
    const lanes = existing ?? generateLaneAssignments(eventRecord, freshTeams);
    if (lanes && lanes.length > 0) {
      setPendingLaneAssignments(lanes);
      setLaneEventIndex(idx);
      setShowLaneModal(true);

      // This modal opens while the screen is still popping back from Assign
      // Athletes, and the page doesn't reach its full scrollable height until
      // ~1s later (the modal briefly reports top≈0 before that), so a single
      // scrollIntoView finds nothing to scroll. Keep re-aligning for ~3s.
      let attempts = 0;
      const scrollToLaneModal = () => {
        attempts += 1;
        const node = laneModalRef.current;
        if (node?.scrollIntoView) {
          if (Math.abs(node.getBoundingClientRect().top) > 8) {
            node.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else if (node && attempts === 1) {
          // Native fallback
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
        if (attempts < 20) setTimeout(scrollToLaneModal, 150);
      };
      setTimeout(scrollToLaneModal, 300);
    }
  }, []);

  const resetTransientUi = useCallback(() => {
    setShowLaneModal(false);
    setShowEventActionModal(false);
    setShowResetConfirm(false);
    setPendingLaneAssignments([]);
    setLaneEventIndex(null);
    setSelectedEvent(null);
  }, []);

  // Load division state on mount and whenever the active division changes
  useEffect(() => {
    if (!activeDivisionId) return;

    resetTransientUi();
    loadDivisionState().then((loaded) => {
      if (!loaded) return;
      const pendingIdx = loaded.division.pendingLaneEventIndex;
      handlePendingLaneModal(pendingIdx, loaded.assignmentsData, loaded.savedTeams, activeDivisionId);
    });
  }, [activeDivisionId, loadDivisionState, handlePendingLaneModal, resetTransientUi]);

  // Reload when screen comes into focus (e.g. returning from Assign Athletes)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (!activeDivisionId) return;

      const loaded = await loadDivisionState();
      if (!loaded) return;

      const pendingIdx = loaded.division.pendingLaneEventIndex;
      await handlePendingLaneModal(pendingIdx, loaded.assignmentsData, loaded.savedTeams, activeDivisionId);
    });

    return unsubscribe;
  }, [navigation, activeDivisionId, loadDivisionState, handlePendingLaneModal]);

  useEffect(() => {
    if (!activeDivisionId) return;

    const unsubRoulette = eventBus.onForDivision(activeDivisionId, 'settings.roulette.updated', async () => {
      try {
        const [cfg, pool] = await Promise.all([
          getRouletteSettings(activeDivisionId),
          getEventPool(activeDivisionId),
        ]);
        setEventPool(pool);
        const total = Number(cfg.totalEvents) || 5;
        const relays = typeof cfg.numRelays === 'number' ? cfg.numRelays : 0;
        const positions = Array.isArray(cfg.relayPositions) ? cfg.relayPositions.map(p => p - 1) : [];
        const result = generateEventSequence(pool, total, relays, positions);

        if (result.success) {
          await updateDivisionData(activeDivisionId, {
            eventResults: [],
            eventAssignments: [],
            eventSequence: result.sequence,
            revealedIndex: '0',
          });
          await clearAllAssignments(activeDivisionId);

          setEventSequence(result.sequence);
          setRevealedIndex(0);
          setAssignments([]);
        }
      } catch (error) {
        console.log('Error applying roulette settings update:', error);
      }
    });

    const unsubEventPool = eventBus.onForDivision(activeDivisionId, 'settings.eventPool.updated', async () => {
      try {
        setEventPool(await getEventPool(activeDivisionId));
      } catch (error) {
        console.log('Error refreshing event pool:', error);
      }
    });

    return () => {
      unsubRoulette && unsubRoulette();
      unsubEventPool && unsubEventPool();
    };
  }, [activeDivisionId]);

  const saveState = async (sequence, index) => {
    if (!activeDivisionId) return;
    try {
      await updateDivisionData(activeDivisionId, {
        eventSequence: sequence,
        revealedIndex: String(index),
      });
    } catch (error) {
      console.log('Error saving state:', error);
    }
  };

  const generateSequence = async () => {
    if (!activeDivisionId) {
      Alert.alert('No Division Selected', 'Select a division before generating a sequence.');
      return;
    }

    try {
      setIsLoading(true);

      const [cfg, pool] = await Promise.all([
        getRouletteSettings(activeDivisionId),
        getEventPool(activeDivisionId),
      ]);

      const total = Number(cfg.totalEvents) || 5;
      const relays = typeof cfg.numRelays === 'number' ? cfg.numRelays : 1;
      const positions = Array.isArray(cfg.relayPositions) ? cfg.relayPositions.map(p => p - 1) : [];

      const summary = getSequenceValidationSummary(pool, total, relays);
      const result = generateEventSequence(pool, total, relays, positions);

      if (result.success) {
        await updateDivisionData(activeDivisionId, {
          eventResults: [],
          eventAssignments: [],
          eventSequence: result.sequence,
          revealedIndex: '0',
        });
        await clearAllAssignments(activeDivisionId);

        setEventSequence(result.sequence);
        setRevealedIndex(0);
        setAssignments([]);

        Alert.alert('Success', `New event sequence generated!\n\nRelays: ${relays}\nRelay positions: ${result.relayPositions.map(p => p + 1).join(', ')}\n\nAll previous assignments cleared.`);
      } else {
        setSequenceValidationSummary(summary);
        setShowSequenceValidationModal(true);
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Generate sequence error:', error);
      Alert.alert('Error', error?.message || 'Failed to generate sequence. Please check your settings.');
    }
  };

  const revealNextEvent = async () => {
    if (revealedIndex >= eventSequence.length) {
      Alert.alert('Complete!', 'All events have been revealed!');
      return;
    }

    const newIndex = revealedIndex + 1;
    setRevealedIndex(newIndex);
    await saveState(eventSequence, newIndex);
    
    // Reload assignments after reveal
    const assignmentsData = await loadEventAssignments(activeDivisionId);
    setAssignments(assignmentsData);
  };

  const handleAssignAthletes = async (eventIndex, eventName) => {
    if (eventIndex == null || !eventName) {
      Alert.alert('Error', 'Please select a valid event.');
      return;
    }

    if (!activeDivisionId) {
      Alert.alert('Error', 'No active division selected.');
      return;
    }

    const resolvedTeams = teams.length > 0 ? teams : await getTeams(activeDivisionId);
    if (resolvedTeams.length === 0) {
      Alert.alert(
        'No Teams Found',
        'Please create teams first in the Assign Teams screen.',
        [
          { text: 'OK' },
          { text: 'Go to Teams', onPress: () => navigation.navigate('AssignTeams') }
        ]
      );
      return;
    }

    if (resolvedTeams !== teams) {
      setTeams(resolvedTeams);
    }
    
    navigation.navigate('AssignRunners', {
      eventIndex,
      eventName
    });
  };

  const handleEventCardPress = (eventIndex, eventName) => {
    if (isEventFullyAssigned(assignments, eventIndex, teams)) {
      // Event already has athletes — let coach choose what to do next
      setSelectedEvent({ index: eventIndex, name: eventName });
      setShowEventActionModal(true);

      setTimeout(() => {
        // scrollIntoView is the most reliable cross-browser approach for web/PWA
        if (eventActionModalRef.current?.scrollIntoView) {
          eventActionModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Native fallback
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      }, 300);
    } else {
      // No athletes yet — go straight to assignment
      handleAssignAthletes(eventIndex, eventName);
    }
  };

  const resetSequence = () => {
    console.log('Reset button clicked');
    setShowResetConfirm(true);

    setTimeout(() => {
      // scrollIntoView is the most reliable cross-browser approach for web/PWA
      if (resetConfirmRef.current?.scrollIntoView) {
        resetConfirmRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Native fallback
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  const handleResetConfirm = async () => {
    if (!activeDivisionId) return;

    try {
      console.log('Resetting sequence...');
      setShowResetConfirm(false);

      await updateDivisionData(activeDivisionId, {
        eventResults: [],
        eventAssignments: [],
        eventSequence: [],
        revealedIndex: '0',
        pendingLaneEventIndex: null,
      });
      await clearAllAssignments(activeDivisionId);

      setEventSequence([]);
      setRevealedIndex(0);
      setAssignments([]);

      console.log('Reset complete');
    } catch (error) {
      console.error('Error resetting sequence:', error);
      alert('Error: Failed to reset sequence. Please try again.');
    }
  };

  const handleResetCancel = () => {
    console.log('Reset cancelled');
    setShowResetConfirm(false);
  };

  const getNextEvent = () => {
    if (revealedIndex < eventSequence.length) {
      return eventSequence[revealedIndex];
    }
    return null;
  };

  // ─── Lane Assignment Handlers ───────────────────────────────────────────────

  const handleOpenLaneModal = (eventIndex) => {
    const eventRecord = assignments.find(a => a.eventIndex === eventIndex);
    if (!eventRecord) return;

    const existing = getLaneAssignmentsForEvent(assignments, eventIndex);
    if (existing) {
      setPendingLaneAssignments(existing);
    } else {
      const generated = generateLaneAssignments(eventRecord, teams);
      if (generated.length === 0) {
        Alert.alert('No Runners', 'No athletes are assigned to this event yet.');
        return;
      }
      setPendingLaneAssignments(generated);
    }
    setLaneEventIndex(eventIndex);
    setShowLaneModal(true);

    setTimeout(() => {
      // scrollIntoView is the most reliable cross-browser approach for web/PWA
      if (laneModalRef.current?.scrollIntoView) {
        laneModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Native fallback
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  const handleRerollAll = () => {
    const eventRecord = assignments.find(a => a.eventIndex === laneEventIndex);
    if (!eventRecord) return;
    const fresh = generateLaneAssignments(eventRecord, teams);
    setPendingLaneAssignments(fresh);
  };

  const handleRerollUnlocked = () => {
    setPendingLaneAssignments(prev => rerollUnlockedLanes(prev));
  };

  const toggleLaneLock = (idx) => {
    setPendingLaneAssignments(prev =>
      prev.map((la, i) => i === idx ? { ...la, locked: !la.locked } : la)
    );
  };

  const handleSaveLanes = async () => {
    if (!activeDivisionId) return;

    const updated = await saveLaneAssignments(
      assignments,
      laneEventIndex,
      pendingLaneAssignments,
      activeDivisionId
    );
    setAssignments(updated);
    setShowLaneModal(false);
    setPendingLaneAssignments([]);
    setLaneEventIndex(null);
  };

  const handleCancelLanes = () => {
    setShowLaneModal(false);
    setPendingLaneAssignments([]);
    setLaneEventIndex(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          responsive.isLargeScreen && styles.scrollContentCentered
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* Mode Toggle */}
        {eventSequence.length === 0 && (
          <Card style={styles.modeToggleCard}>
            <SegmentedToggle
              options={[
                { value: 'roulette', label: 'Roulette Mode' },
                { value: 'manual', label: 'Manual Mode' },
              ]}
              value={sequenceMode}
              onChange={setSequenceMode}
              accessibilityLabel="Sequence creation mode"
            />
          </Card>
        )}

        {/* No Sequence Section */}
        {eventSequence.length === 0 && sequenceMode === 'roulette' && (
          <Card style={[styles.revealSection, isLandscape && styles.revealSectionLandscape]}>
            <MobileH2 style={[
              styles.sectionTitle, 
              isLandscape && styles.sectionTitleLandscape,
              width < 400 && styles.sectionTitleSmall,
              width < 350 && styles.sectionTitleTiny
            ]}>
              Race Roulette Randomizer
            </MobileH2>
            
            {/* Digital Screen showing no sequence */}
            <View style={styles.digitalScreenContainer}>
              <View style={styles.digitalScreen}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
                
                <View style={styles.screenContent}>
                  <View style={styles.screenHeader}>
                    <View style={styles.logoContainer}>
                      <Image source={require('../../Images/minimal_logo.png')} style={styles.logoImage} />
                    </View>
                    <Text style={styles.raceControlText}>RACE CONTROL</Text>
                  </View>
                  
                  <View style={styles.mainDisplay}>
                    <Text style={styles.mainTitle}>VELOX 1</Text>
                  </View>
                  
                  <View style={styles.screenFooter}>
                    <Text style={styles.versionText}>VELOX-1.0</Text>
                  </View>
                </View>
              </View>
              
              {/* Generate Button */}
              <ButtonPrimary 
                style={styles.generateButton}
                onPress={generateSequence}
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate New Sequence'}
              </ButtonPrimary>
            </View>

            <View style={styles.progressInfo}>
              <MobileCaption style={styles.progressText}>
                Configure settings, then generate a sequence to begin.
              </MobileCaption>
            </View>
          </Card>
        )}

        {/* Manual Sequence Builder Section */}
        {eventSequence.length === 0 && sequenceMode === 'manual' && (
          <Card style={[styles.revealSection, isLandscape && styles.revealSectionLandscape]}>
            <MobileH2 style={[
              styles.sectionTitle,
              isLandscape && styles.sectionTitleLandscape,
              width < 400 && styles.sectionTitleSmall,
              width < 350 && styles.sectionTitleTiny
            ]}>
              Manual Sequence Builder
            </MobileH2>

            {enabledManualCategories.length === 0 ? (
              <View style={styles.progressInfo}>
                <MobileCaption style={styles.progressText}>
                  No event categories are enabled. Enable some in Settings → Event Configuration first.
                </MobileCaption>
              </View>
            ) : (
              <>
                {/* Category Picker */}
                <View style={styles.manualBuilderSection}>
                  <MobileCaption style={styles.manualBuilderLabel}>Category</MobileCaption>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.manualChipRow}
                  >
                    {enabledManualCategories.map((catKey) => {
                      const isActive = manualSelectedCategory === catKey;
                      return (
                        <Pressable
                          key={catKey}
                          style={[styles.manualChip, isActive && styles.manualChipActive]}
                          onPress={() => setManualSelectedCategory(catKey)}
                        >
                          <Text style={[styles.manualChipText, isActive && styles.manualChipTextActive]}>
                            {MANUAL_CATEGORY_LABELS[catKey]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Event Picker */}
                <View style={styles.manualBuilderSection}>
                  <MobileCaption style={styles.manualBuilderLabel}>Event</MobileCaption>
                  {manualEventsForCategory.length === 0 ? (
                    <MobileCaption style={styles.progressText}>
                      No enabled events in this category.
                    </MobileCaption>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.manualChipRow}
                    >
                      {manualEventsForCategory.map((eventName) => {
                        const isActive = manualSelectedEvent === eventName;
                        const isAlreadyAdded = manualDraftSequence.includes(eventName);
                        return (
                          <Pressable
                            key={eventName}
                            style={[
                              styles.manualChip,
                              isActive && styles.manualChipActive,
                              isAlreadyAdded && styles.manualChipAdded,
                            ]}
                            onPress={() => setManualSelectedEvent(eventName)}
                            disabled={isAlreadyAdded}
                          >
                            <Text style={[
                              styles.manualChipText,
                              isActive && styles.manualChipTextActive,
                              isAlreadyAdded && styles.manualChipTextAdded,
                            ]}>
                              {eventName}{isAlreadyAdded ? ' ✓' : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                <ButtonPrimary
                  style={styles.manualAddButton}
                  onPress={handleAddManualEvent}
                  disabled={!manualSelectedEvent || isManualSelectedEventAlreadyAdded}
                >
                  {isManualSelectedEventAlreadyAdded ? 'Already in Sequence' : 'Add to Sequence'}
                </ButtonPrimary>

                {/* Draft List */}
                {manualDraftSequence.length > 0 && (
                  <View style={styles.manualDraftSection}>
                    <MobileCaption style={styles.manualBuilderLabel}>
                      Sequence Preview ({manualDraftSequence.length} {manualDraftSequence.length === 1 ? 'event' : 'events'})
                    </MobileCaption>

                    <View style={styles.manualDraftList}>
                      {manualDraftSequence.map((eventName, index) => (
                        <View key={`${eventName}-${index}`} style={styles.manualDraftRow}>
                          <View style={styles.manualDraftIndexBadge}>
                            <Text style={styles.manualDraftIndexText}>{index + 1}</Text>
                          </View>
                          <MobileBody style={styles.manualDraftEventName} numberOfLines={1}>
                            {eventName}
                          </MobileBody>
                          <Pressable
                            style={styles.manualDraftRemoveBtn}
                            onPress={() => handleRemoveManualDraftEvent(index)}
                            accessibilityLabel={`Remove ${eventName} from sequence`}
                          >
                            <Text style={styles.manualDraftRemoveBtnText}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>

                    <ButtonPrimary
                      style={styles.manualSaveButton}
                      onPress={handleSaveManualSequence}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Sequence'}
                    </ButtonPrimary>
                  </View>
                )}
              </>
            )}
          </Card>
        )}

        {/* Reveal Section */}
        {eventSequence.length > 0 && (
          <Card style={[styles.revealSection, isLandscape && styles.revealSectionLandscape]}>
            <MobileH2 style={[
              styles.sectionTitle, 
              isLandscape && styles.sectionTitleLandscape,
              width < 400 && styles.sectionTitleSmall,
              width < 350 && styles.sectionTitleTiny
            ]}>
              Race Roulette Randomizer
            </MobileH2>
            
            {/* Futuristic Digital Screen Simulator */}
            <View style={styles.digitalScreenContainer}>
              {/* Main Digital Screen */}
              <View style={styles.digitalScreen}>
                {/* Corner Mounting Brackets */}
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
                
                {/* Circuit Pattern Background */}
                <View style={styles.circuitPattern} />
                
                {/* Scan Line Effect */}
                <View style={styles.scanLine} />
                
                {/* Screen Content */}
                <View style={styles.screenContent}>
                  {/* Header */}
                  <View style={styles.screenHeader}>
                    <View style={styles.logoContainer}>
                      <Image source={require('../../Images/minimal_logo.png')} style={styles.logoImage} />
                    </View>
                    <Text style={styles.raceControlText}>RACE CONTROL</Text>
                  </View>
                  
                  {/* Main Display */}
                  <View style={styles.mainDisplay}>
                    <Text style={styles.mainTitle}>
                      {revealedIndex > 0 ? eventSequence[revealedIndex - 1] : 'VELOX 1'}
                    </Text>
                    
                    {revealedIndex > 0 && (
                      <Text style={styles.eventNumber}>
                        Event #{revealedIndex}
                      </Text>
                    )}
                  </View>
                  
                  {/* Footer */}
                  <View style={styles.screenFooter}>
                    <Text style={styles.versionText}>VELOX-1.0</Text>
                  </View>
                </View>
              </View>
              
              {/* Reveal Button */}
              {eventSequence.length > 0 && revealedIndex < eventSequence.length && (
                <Pressable 
                  style={styles.revealButton}
                  onPress={revealNextEvent}
                >
                  <Text style={styles.revealButtonText}>REVEAL EVENT</Text>
                </Pressable>
              )}
              
              {/* Assign Athletes Button */}
              {revealedIndex > 0 && (
                <View style={styles.assignmentSection}>
                  <MobileCaption style={styles.assignmentLabel}>
                    Current Event: {eventSequence[revealedIndex - 1]}
                  </MobileCaption>
                  <ButtonPrimary 
                    style={styles.assignButton}
                    onPress={() => handleAssignAthletes(revealedIndex - 1, eventSequence[revealedIndex - 1])}
                  >
                    {isEventFullyAssigned(assignments, revealedIndex - 1, teams) ? 'Edit Athletes' : 'Assign Athletes'}
                  </ButtonPrimary>
                  {isEventFullyAssigned(assignments, revealedIndex - 1, teams) && (
                    <Pressable
                      style={styles.lanesButton}
                      onPress={() => handleOpenLaneModal(revealedIndex - 1)}
                    >
                      <Text style={styles.lanesButtonText}>
                        {getLaneAssignmentsForEvent(assignments, revealedIndex - 1)
                          ? 'Edit Lanes'
                          : 'Generate Lanes'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            <View style={styles.progressInfo}>
              <MobileCaption style={styles.progressText}>
                {revealedIndex} of {eventSequence.length} events revealed
              </MobileCaption>
            </View>
          </Card>
        )}

        {/* Event Sequence Display */}
        {eventSequence.length > 0 && (
          <Card style={[styles.sequenceSection, isLandscape && styles.sequenceSectionLandscape]}>
            <View style={[styles.sequenceHeader, isLandscape && styles.sequenceHeaderLandscape]}>
              <MobileH2 style={[
                styles.sectionTitle, 
                isLandscape && styles.sectionTitleLandscape,
                width < 400 && styles.sectionTitleSmall,
                width < 350 && styles.sectionTitleTiny
              ]}>
                Event Sequence
              </MobileH2>
              <Pressable 
                style={styles.resetButton}
                onPress={() => {
                  console.log('Reset button pressed!');
                  resetSequence();
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
            </View>
            
            <View style={[styles.sequenceGrid, isLandscape && styles.sequenceGridLandscape]}>
              {eventSequence.map((event, index) => (
                <EventCard
                  key={index}
                  event={event}
                  index={index}
                  isRevealed={index < revealedIndex}
                  isNext={index === revealedIndex}
                  isAssigned={isEventFullyAssigned(assignments, index, teams)}
                  onPress={handleEventCardPress}
                />
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Lane Assignment Modal */}
      {showLaneModal && (
        <View style={styles.modalOverlay}>
          <View ref={laneModalRef} style={styles.laneModalContent}>
            <MobileH2 style={styles.laneModalTitle}>Lane Assignments</MobileH2>
            <MobileCaption style={styles.laneModalSubtitle}>
              {laneEventIndex !== null ? eventSequence[laneEventIndex] : ''}
            </MobileCaption>
            <MobileCaption style={styles.laneModalHint}>
              Tap toggle to lock a lane from re-rolling
            </MobileCaption>

            <ScrollView
              style={styles.laneScrollView}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {pendingLaneAssignments.map((la, idx) => (
                <View
                  key={la.teamId}
                  style={[styles.laneRow, la.locked && styles.laneRowLocked]}
                >
                  <Pressable
                    style={[styles.laneToggle, la.locked && styles.laneToggleLocked]}
                    onPress={() => toggleLaneLock(idx)}
                    accessibilityLabel={la.locked ? 'Unlock lane' : 'Lock lane'}
                  >
                    <View style={[styles.laneToggleCircle, la.locked && styles.laneToggleCircleLocked]} />
                  </Pressable>
                  <View style={styles.laneBadge}>
                    <Text style={styles.laneNumber}>{la.lane}</Text>
                  </View>
                  <MobileBody style={styles.laneParticipant} numberOfLines={2}>
                    {la.athleteName ? `${la.athleteName} (${la.teamName})` : la.teamName}
                  </MobileBody>
                </View>
              ))}
            </ScrollView>

            <View style={styles.laneRerollRow}>
              <Pressable style={styles.rerollUnlockedBtn} onPress={handleRerollUnlocked}>
                <Text style={styles.rerollUnlockedBtnText}>Re-roll Unlocked</Text>
              </Pressable>
              <Pressable style={styles.rerollAllBtn} onPress={handleRerollAll}>
                <Text style={styles.rerollAllBtnText}>Re-roll All</Text>
              </Pressable>
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.laneModalButtonCancel} onPress={handleCancelLanes}>
                <Text style={styles.laneModalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.laneModalButtonSave} onPress={handleSaveLanes}>
                <Text style={styles.laneModalButtonTextSave}>Save Lanes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Event Action Modal — choose Edit Athletes or Manage Lanes */}
      {showEventActionModal && selectedEvent && (
        <View style={styles.modalOverlay}>
          <View ref={eventActionModalRef} style={styles.modalContent}>
            <MobileCaption style={styles.eventActionEventNum}>
              Event #{selectedEvent.index + 1}
            </MobileCaption>
            <MobileH2 style={styles.modalTitle}>{selectedEvent.name}</MobileH2>

            <View style={styles.eventActionButtons}>
              <Pressable
                style={styles.eventActionBtnAthletes}
                onPress={() => {
                  setShowEventActionModal(false);
                  handleAssignAthletes(selectedEvent.index, selectedEvent.name);
                }}
              >
                <Text style={styles.eventActionBtnAthletesText}>Edit Athletes</Text>
              </Pressable>

              <Pressable
                style={styles.eventActionBtnLanes}
                onPress={() => {
                  setShowEventActionModal(false);
                  handleOpenLaneModal(selectedEvent.index);
                }}
              >
                <Text style={styles.eventActionBtnLanesText}>
                  {getLaneAssignmentsForEvent(assignments, selectedEvent.index)
                    ? 'Edit Lanes'
                    : 'Generate Lanes'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.eventActionBtnCancel}
                onPress={() => setShowEventActionModal(false)}
              >
                <Text style={styles.eventActionBtnCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <View style={styles.modalOverlay}>
          <View ref={resetConfirmRef} style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Reset Sequence</MobileH2>
            <MobileBody style={styles.modalMessage}>
              This will clear the current event sequence, all recorded scores, and all athlete assignments. You can then generate a new sequence.
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleResetCancel}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={handleResetConfirm}>
                <Text style={styles.modalButtonTextConfirm}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <SequenceValidationModal
        visible={showSequenceValidationModal}
        summary={sequenceValidationSummary}
        onClose={() => setShowSequenceValidationModal(false)}
        onGoToSettings={() => {
          setShowSequenceValidationModal(false);
          navigation.navigate('Settings');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: styleTokens.colors.background,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    overflow: 'scroll',
  },
  scrollContent: {
    padding: scale(24),
    paddingBottom: scale(88),
  },
  scrollContentCentered: {
    alignItems: 'center',
  },
  controlsSection: {
    marginBottom: scale(24),
    padding: scale(20),
    minHeight: scale(120),
    maxWidth: '100%', // Prevents section from extending beyond screen
  },
  controlsSectionLandscape: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: scale(24), // More padding for landscape
  },
  controlsContent: {
    flex: 1,
  },
  controlsContentLandscape: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  inputsContainer: {
    flexDirection: 'column',
    width: '100%',
  },
  inputsContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: scale(24),
    marginBottom: scale(16),
    width: '100%',
  },
  sectionTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(20),
    textAlign: 'center',
    fontSize: scale(18), // Even smaller for portrait to ensure fit
    lineHeight: scale(22),
    flexShrink: 1, // Allow text to shrink if needed
    flexWrap: 'wrap', // Enable text wrapping
    paddingHorizontal: scale(8), // Add horizontal padding to prevent edge clipping
  },
  sectionTitleLandscape: {
    fontSize: scale(24), // Larger size for landscape
    lineHeight: scale(28),
    paddingHorizontal: scale(12), // More padding for landscape
  },
  sectionTitleSmall: {
    fontSize: scale(16), // Smaller font size for very small screens
    lineHeight: scale(20),
    paddingHorizontal: scale(4), // Less padding for small screens
  },
  sectionTitleTiny: {
    fontSize: scale(14), // Even smaller font size for extremely narrow screens
    lineHeight: scale(18),
    paddingHorizontal: scale(2), // Less padding for tiny screens
  },
  inputGroup: {
    marginBottom: scale(16),
    flex: 1,
    minWidth: 0, // Prevents flex items from overflowing
  },
  label: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: styleTokens.colors.border,
    borderRadius: styleTokens.components.input.borderRadius,
    padding: scale(12),
    backgroundColor: styleTokens.components.input.backgroundColor,
    color: styleTokens.colors.textPrimary,
    fontSize: scale(16),
    minHeight: scale(48),
    flex: 1,
    minWidth: 0, // Prevents flex items from overflowing
  },
  helpText: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(11), // Smaller base font size for portrait
    marginTop: scale(4),
    opacity: 0.7,
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    paddingHorizontal: scale(2), // Reduced padding for portrait
    lineHeight: scale(14), // Tighter line height for portrait
  },
  helpTextLandscape: {
    fontSize: scale(14),
    paddingHorizontal: scale(8),
    lineHeight: scale(18), // More comfortable line height for landscape
  },
  helpTextSmall: {
    fontSize: scale(10), // Even smaller for very small screens
    paddingHorizontal: scale(1),
    lineHeight: scale(12),
  },
  helpTextTiny: {
    fontSize: scale(9), // Tiny font for extremely narrow screens
    paddingHorizontal: scale(0),
    lineHeight: scale(11),
  },
  generateButton: {
    marginTop: scale(16),
    alignSelf: 'center',
    minWidth: scale(200),
    maxWidth: '100%', // Prevents button from extending beyond container
  },
  modeToggleCard: {
    marginBottom: scale(24),
    padding: scale(12),
    minHeight: scale(64),
    justifyContent: 'center',
  },

  // ─── Manual Sequence Builder Styles ──────────────────────────────────────────
  manualBuilderSection: {
    marginBottom: scale(16),
    width: '100%',
  },
  manualBuilderLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    fontSize: scale(11),
  },
  manualChipRow: {
    flexDirection: 'row',
    gap: scale(10),
    paddingRight: scale(4),
  },
  manualChip: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  manualChipActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  manualChipAdded: {
    opacity: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  manualChipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: scale(13),
    fontWeight: '700',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    textTransform: 'uppercase',
  },
  manualChipTextActive: {
    color: styleTokens.colors.textPrimary,
  },
  manualChipTextAdded: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  manualAddButton: {
    marginTop: scale(4),
    marginBottom: scale(4),
  },
  manualDraftSection: {
    marginTop: scale(20),
    paddingTop: scale(20),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
  },
  manualDraftList: {
    gap: scale(8),
    marginBottom: scale(16),
  },
  manualDraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: scale(10),
  },
  manualDraftIndexBadge: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: 'rgba(100, 226, 211, 0.2)',
    borderWidth: 1,
    borderColor: styleTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualDraftIndexText: {
    color: styleTokens.colors.primary,
    fontSize: scale(12),
    fontWeight: '800',
    fontFamily: styleTokens.typography.fonts.robotoMono,
  },
  manualDraftEventName: {
    flex: 1,
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    textTransform: 'none',
  },
  manualDraftRemoveBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 100, 100, 0.15)',
  },
  manualDraftRemoveBtnText: {
    color: '#ff6464',
    fontSize: scale(13),
    fontWeight: '800',
  },
  manualSaveButton: {
    alignSelf: 'center',
    minWidth: scale(200),
  },
  revealSection: {
    marginBottom: scale(24),
    padding: scale(20),
    minHeight: scale(120),
  },
  revealSectionLandscape: {
    padding: scale(24), // More padding for landscape
    marginBottom: scale(24),
  },
  digitalScreenContainer: {
    alignItems: 'center',
    marginBottom: scale(16),
  },
  digitalScreen: {
    width: scale(320),
    height: scale(200),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#45A196',
    borderRadius: scale(20),
    borderWidth: scale(8),
    borderColor: 'rgba(100, 226, 211, 0.8)',
    shadowColor: 'rgba(100, 226, 211, 0.9)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: scale(25),
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  screenContent: {
    width: '100%',
    height: '100%',
    padding: scale(20),
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: scale(12),
    // Add subtle digital screen texture
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: scale(8),
    elevation: 4,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 226, 211, 0.3)',
    width: '100%',
    justifyContent: 'space-between',
  },
  logoContainer: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain', // Ensure the logo fits properly within the container
  },
  raceControlText: {
    color: 'rgba(100, 226, 211, 0.9)',
    fontSize: scale(8), // Match website font size
    fontWeight: 'bold',
    letterSpacing: scale(1.2),
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  mainDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  mainTitle: {
    color: '#64E2D3',
    marginBottom: scale(8),
    textAlign: 'center',
    fontSize: scale(28),
    fontWeight: 'bold',
    letterSpacing: scale(2),
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  eventNumber: {
    color: '#64E2D3',
    fontSize: scale(16),
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: scale(1),
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  screenFooter: {
    marginTop: scale(16),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 226, 211, 0.3)',
    width: '100%',
    alignItems: 'center',
  },
  versionText: {
    color: 'rgba(100, 226, 211, 0.8)',
    fontSize: scale(8), // Match website font size
    fontWeight: 'bold',
    letterSpacing: scale(0.8),
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  revealButton: {
    minWidth: scale(160),
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderWidth: scale(3),
    borderColor: '#64E2D3',
    borderRadius: scale(12),
    shadowColor: 'rgba(100, 226, 211, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: scale(6),
    elevation: 6,
    marginTop: scale(16),
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealButtonText: {
    color: '#64E2D3',
    fontSize: scale(16),
    fontWeight: 'bold',
    letterSpacing: scale(1),
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  generateButton: {
    marginTop: scale(16),
    minWidth: scale(200),
  },
  assignmentSection: {
    marginTop: scale(16),
    alignItems: 'center',
    gap: scale(8),
  },
  assignmentLabel: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
  },
  assignButton: {
    minWidth: scale(160),
  },
  progressInfo: {
    alignItems: 'center',
  },
  progressText: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: scale(6),
  },
  sequenceSection: {
    marginBottom: scale(24),
    padding: scale(20),
    minHeight: scale(120),
  },
  sequenceSectionLandscape: {
    padding: scale(24), // More padding for landscape
    marginBottom: scale(24),
  },
  sequenceGrid: {
    flexDirection: 'column',
    gap: scale(16),
  },
  sequenceGridLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: scale(16),
  },
  sequenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(20),
    flexWrap: 'wrap', // Allow wrapping in portrait mode
    gap: scale(12), // Add gap between title and button
  },
  sequenceHeaderLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(20),
    gap: scale(16), // Larger gap for landscape
  },
  resetButton: {
    minWidth: scale(80),
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  resetButtonText: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: scale(1),
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  relayPositionsGroup: {
    marginBottom: scale(16),
    width: '100%',
    alignItems: 'stretch',
    paddingHorizontal: scale(2), // Add small padding for portrait
  },
  relayPositionsGroupLandscape: {
    width: '100%',
    marginBottom: scale(16),
    alignItems: 'stretch',
    paddingHorizontal: scale(4),
  },
  cornerTL: {
    position: 'absolute',
    top: scale(8),
    left: scale(8),
    width: scale(6),
    height: scale(6),
    backgroundColor: '#444',
    borderRadius: scale(3),
    zIndex: 4,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: scale(2),
    elevation: 2,
  },
  cornerTR: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(6),
    height: scale(6),
    backgroundColor: '#444',
    borderRadius: scale(3),
    zIndex: 4,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: scale(2),
    elevation: 2,
  },
  cornerBL: {
    position: 'absolute',
    bottom: scale(8),
    left: scale(8),
    width: scale(6),
    height: scale(6),
    backgroundColor: '#444',
    borderRadius: scale(3),
    zIndex: 4,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: scale(2),
    elevation: 2,
  },
  cornerBR: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    width: scale(6),
    height: scale(6),
    backgroundColor: '#444',
    borderRadius: scale(3),
    zIndex: 4,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: scale(2),
    elevation: 2,
  },
  circuitPattern: {
    position: 'absolute',
    top: scale(16),
    left: scale(16),
    right: scale(16),
    bottom: scale(16),
    backgroundColor: 'transparent',
    borderRadius: scale(8),
    opacity: 0.3,
    zIndex: 1,
    // Create a more realistic circuit pattern
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.2)',
    borderStyle: 'dashed',
  },
  scanLine: {
    position: 'absolute',
    top: scale(16),
    left: scale(16),
    right: scale(16),
    height: scale(2),
    backgroundColor: 'rgba(100, 226, 211, 0.4)',
    zIndex: 5,
    borderRadius: scale(12),
    shadowColor: 'rgba(100, 226, 211, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: scale(4),
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderRadius: scale(12),
    padding: scale(24),
    width: '90%',
    maxWidth: scale(400),
    borderWidth: 2,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    ...styleTokens.shadows.lg,
  },
  modalTitle: {
    color: styleTokens.colors.white,
    marginBottom: scale(16),
    textAlign: 'center',
    fontWeight: '700',
  },
  modalMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: scale(24),
    textAlign: 'center',
    lineHeight: scale(20),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: styleTokens.colors.error || '#e74c3c',
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  modalButtonTextCancel: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  modalButtonTextConfirm: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },

  // ─── Lane Modal Styles ───────────────────────────────────────────────────────
  laneModalContent: {
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    padding: scale(24),
    width: '90%',
    maxWidth: scale(440),
    maxHeight: '85%',
    ...styleTokens.shadows.lg,
  },
  laneModalTitle: {
    color: styleTokens.colors.white,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  laneModalSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: scale(8),
    fontSize: scale(13),
  },
  laneModalHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginBottom: scale(14),
    fontSize: scale(11),
    fontStyle: 'italic',
  },
  laneScrollView: {
    maxHeight: scale(260),
    marginBottom: scale(12),
  },
  laneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: scale(8),
    gap: scale(10),
  },
  laneRowLocked: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderColor: styleTokens.colors.primary,
  },
  lockBtn: {
    width: scale(32),
    height: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: scale(16),
  },
  laneToggle: {
    width: scale(36),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(159, 167, 174, 0.4)',
    paddingHorizontal: scale(2),
  },
  laneToggleLocked: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
    alignItems: 'flex-end',
  },
  laneToggleCircle: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  laneToggleCircleLocked: {
    backgroundColor: styleTokens.colors.white,
  },
  laneBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(5),
    borderRadius: scale(10),
    backgroundColor: 'rgba(100, 226, 211, 0.8)',
    borderWidth: 1,
    borderColor: styleTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: scale(44),
  },
  laneNumber: {
    fontSize: scale(14),
    fontWeight: '800',
    color: styleTokens.colors.textPrimary,
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  laneParticipant: {
    flex: 1,
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    lineHeight: scale(20),
    textTransform: 'none',
  },
  laneRerollRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(14),
  },
  rerollUnlockedBtn: {
    flex: 1,
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  rerollUnlockedBtnText: {
    color: styleTokens.colors.white,
    fontSize: scale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    textAlign: 'center',
  },
  rerollAllBtn: {
    flex: 1,
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  rerollAllBtnText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  laneModalButtonCancel: {
    flex: 1,
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  laneModalButtonTextCancel: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  laneModalButtonSave: {
    flex: 1,
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  laneModalButtonTextSave: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  lanesButton: {
    minWidth: scale(160),
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: styleTokens.colors.primary,
    borderRadius: scale(8),
    paddingVertical: scale(12),
    paddingHorizontal: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lanesButtonText: {
    color: styleTokens.colors.primary,
    fontSize: scale(13),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },

  // ─── Event Action Modal Styles ────────────────────────────────────────────────
  eventActionEventNum: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: scale(4),
    fontSize: scale(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  eventActionButtons: {
    gap: scale(10),
    marginTop: scale(8),
  },
  eventActionBtnAthletes: {
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  eventActionBtnAthletesText: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  eventActionBtnLanes: {
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  eventActionBtnLanesText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  eventActionBtnCancel: {
    paddingVertical: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventActionBtnCancelText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: scale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
});

export default RaceRouletteScreen; 