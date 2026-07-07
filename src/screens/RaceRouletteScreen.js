import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventCard from '../components/EventCard';
import { generateEventSequence, getDefaultEventPool } from '../lib/randomizer';
import { loadEventAssignments, isEventFullyAssigned, clearAllAssignments, generateLaneAssignments, rerollUnlockedLanes, getLaneAssignmentsForEvent, saveLaneAssignments } from '../lib/eventAssignments';
import eventBus from '../lib/eventBus';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { ButtonPrimary, ButtonSecondary } from '../components';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import { useResponsive } from '../utils/useResponsive';

const RaceRouletteScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const responsive = useResponsive();
  const isLandscape = width > height;
  
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

  // Load saved state on component mount
  useEffect(() => {
    loadSavedState();
  }, []);

  // Reload assignments when screen comes into focus; auto-open lane modal if triggered by athlete save
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const [assignmentsData, teamsRaw, pendingIdx] = await Promise.all([
        loadEventAssignments(),
        AsyncStorage.getItem('teams'),
        AsyncStorage.getItem('pendingLaneEventIndex'),
      ]);

      const freshTeams = teamsRaw ? JSON.parse(teamsRaw) : [];
      setAssignments(assignmentsData);
      setTeams(freshTeams);

      if (pendingIdx !== null) {
        await AsyncStorage.removeItem('pendingLaneEventIndex');
        const idx = parseInt(pendingIdx, 10);
        const eventRecord = assignmentsData.find(a => a.eventIndex === idx);
        if (eventRecord) {
          const existing = getLaneAssignmentsForEvent(assignmentsData, idx);
          const lanes = existing ?? generateLaneAssignments(eventRecord, freshTeams);
          if (lanes && lanes.length > 0) {
            setPendingLaneAssignments(lanes);
            setLaneEventIndex(idx);
            setShowLaneModal(true);
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Only handle explicit settings updates, don't auto-regenerate on mount
    const unsub = eventBus.on('settings.roulette.updated', async () => {
      try {
        const raw = await AsyncStorage.getItem('settings.roulette');
        if (raw) {
          const cfg = JSON.parse(raw);
          const total = Number(cfg.totalEvents) || 5;
          const relays = typeof cfg.numRelays === 'number' ? cfg.numRelays : 0;
          const positions = Array.isArray(cfg.relayPositions) ? cfg.relayPositions.map(p => p - 1) : [];
          const result = generateEventSequence(eventPool, total, relays, positions);
          if (result.success) {
            // Clear both event results and athlete assignments when settings change
            await AsyncStorage.removeItem('eventResults');
            await clearAllAssignments();
            
            setEventSequence(result.sequence);
            setRevealedIndex(0);
            setAssignments([]);
            await AsyncStorage.setItem('eventSequence', JSON.stringify(result.sequence));
            await AsyncStorage.setItem('revealedIndex', '0');
          }
        }
      } catch {}
    });
    return () => {
      unsub && unsub();
    };
  }, [eventPool]);

  const loadSavedState = async () => {
    try {
      const savedSequence = await AsyncStorage.getItem('eventSequence');
      const savedIndex = await AsyncStorage.getItem('revealedIndex');
      const savedEventPool = await AsyncStorage.getItem('eventPool');
      const savedTeams = await AsyncStorage.getItem('teams');
      
      if (savedSequence) {
        setEventSequence(JSON.parse(savedSequence));
      }
      if (savedIndex) {
        setRevealedIndex(parseInt(savedIndex));
      }
      if (savedEventPool) {
        setEventPool(JSON.parse(savedEventPool));
      }
      if (savedTeams) {
        setTeams(JSON.parse(savedTeams));
      }
      
      // Load assignments
      const assignmentsData = await loadEventAssignments();
      setAssignments(assignmentsData);
      
    } catch (error) {
      console.log('Error loading saved state:', error);
    }
  };

  const saveState = async (sequence, index) => {
    try {
      await AsyncStorage.setItem('eventSequence', JSON.stringify(sequence));
      await AsyncStorage.setItem('revealedIndex', index.toString());
    } catch (error) {
      console.log('Error saving state:', error);
    }
  };

  const generateSequence = async () => {
    try {
      setIsLoading(true);
      
      // Load settings from Settings screen
      const rouletteSettingsRaw = await AsyncStorage.getItem('settings.roulette');
      let total = 5, relays = 1, positions = [];
      
      if (rouletteSettingsRaw) {
        const cfg = JSON.parse(rouletteSettingsRaw);
        total = Number(cfg.totalEvents) || 5;
        relays = typeof cfg.numRelays === 'number' ? cfg.numRelays : 1;
        positions = Array.isArray(cfg.relayPositions) ? cfg.relayPositions.map(p => p - 1) : [];
        
        // Debug logging
        console.log('Settings loaded:', { total, relays, originalPositions: cfg.relayPositions, convertedPositions: positions });
      }
      
      const result = generateEventSequence(eventPool, total, relays, positions);
      
      if (result.success) {
        // Clear both event results and athlete assignments
        await AsyncStorage.removeItem('eventResults');
        await clearAllAssignments();
        
        setEventSequence(result.sequence);
        setRevealedIndex(0);
        await saveState(result.sequence, 0);
        
        // Reload assignments after clearing
        setAssignments([]);
        
        // Debug logging
        console.log('Generated sequence:', result.sequence);
        console.log('Relay positions used:', result.relayPositions);
        console.log('Relay events in sequence:', result.sequence.filter((event, index) => result.relayPositions.includes(index)));
        
        Alert.alert('Success', `New event sequence generated!\n\nRelays: ${relays}\nRelay positions: ${result.relayPositions.map(p => p + 1).join(', ')}\n\nAll previous assignments cleared.`);
      } else {
        Alert.alert('Error', result.error);
      }
      
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Generate sequence error:', error);
      Alert.alert('Error', 'Failed to generate sequence. Please check your settings.');
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
    const assignmentsData = await loadEventAssignments();
    setAssignments(assignmentsData);
  };

  const handleAssignAthletes = (eventIndex, eventName) => {
    if (teams.length === 0) {
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
    } else {
      // No athletes yet — go straight to assignment
      handleAssignAthletes(eventIndex, eventName);
    }
  };

  const resetSequence = () => {
    console.log('Reset button clicked');
    setShowResetConfirm(true);
  };

  const handleResetConfirm = async () => {
    try {
      console.log('Resetting sequence...');
      setShowResetConfirm(false);
      
      // Clear event results and athlete assignments
      await AsyncStorage.removeItem('eventResults');
      await clearAllAssignments();
      
      setEventSequence([]);
      setRevealedIndex(0);
      setAssignments([]);
      await saveState([], 0);
      
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
    const updated = await saveLaneAssignments(assignments, laneEventIndex, pendingLaneAssignments);
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
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          responsive.isLargeScreen && styles.scrollContentCentered
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* Controls removed - sequence comes from Settings */}

        {/* No Sequence Section */}
        {eventSequence.length === 0 && (
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
                Configure settings then generate a sequence to begin
              </MobileCaption>
            </View>
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
          <View style={styles.laneModalContent}>
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
          <View style={styles.modalContent}>
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
          <View style={styles.modalContent}>
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