import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Dimensions,
  useWindowDimensions,
  TouchableOpacity,
  Animated,
  Pressable,
  Modal
} from 'react-native';
import eventBus, { emitForDivision } from '../lib/eventBus';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { ButtonPrimary, ButtonSecondary, Input } from '../components';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import { getDefaultEventPool, getSequenceValidationSummary } from '../lib/randomizer';
import { buildScoringPlaces, reconcileScoringWithTeamCount } from '../lib/scoring';
import { useDivision } from '../context/DivisionContext';
import SequenceValidationModal from '../components/SequenceValidationModal';
import { describeClearAthletesImpact, describeTeamResetBlocked } from '../lib/athleteImpact';
import {
  getActiveDivisionData,
  getAthletes,
  getEligibilitySettings,
  getEventPool,
  getEventResults,
  getInfractionsSettings,
  getPlannedTeams,
  getRosterParticipation,
  getRouletteSettings,
  getScoringSettings,
  getTeams,
  saveEligibilitySettings as saveEligibilitySettingsToStorage,
  saveEventPool as saveEventPoolToStorage,
  saveInfractionsSettings as saveInfractionsSettingsToStorage,
  savePlannedTeams as savePlannedTeamsToStorage,
  saveRouletteSettings as saveRouletteSettingsToStorage,
  saveScoringSettings as saveScoringSettingsToStorage,
  resetDivision,
  RESET_SCOPES,
} from '../lib/storage';

const SettingsScreen = ({ navigation }) => {
  const { activeDivisionId, activeDivisionName } = useDivision();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const [dataStats, setDataStats] = useState({
    athletes: 0,
    teams: 0,
    eventSequence: 0,
    eventResults: 0
  });
  const [teamCount, setTeamCount] = useState(0);

  // Event configuration state
  const [selectedCategory, setSelectedCategory] = useState('shortSprints');
  const [eventPool, setEventPool] = useState(getDefaultEventPool());
  const [showEventConfig, setShowEventConfig] = useState(false);

  // Confirmation modals
  const [showResetDefaultsConfirm, setShowResetDefaultsConfirm] = useState(false);
  const [showClearAllDataConfirm, setShowClearAllDataConfirm] = useState(false);
  const [showClearSpecificConfirm, setShowClearSpecificConfirm] = useState(false);
  const [clearSpecificType, setClearSpecificType] = useState(null);
  const [showExportDataInfo, setShowExportDataInfo] = useState(false);
  const [exportDataInfo, setExportDataInfo] = useState(null);
  const [showResetProgressConfirm, setShowResetProgressConfirm] = useState(false);
  const [showResetTeamsConfirm, setShowResetTeamsConfirm] = useState(false);
  const [resetTeamsBlocked, setResetTeamsBlocked] = useState(null);

  // Race Roulette sequence settings
  const [rouletteSettings, setRouletteSettings] = useState({ totalEvents: 5, numRelays: 1, relayPositions: [] });
  const [isSavingRoulette, setIsSavingRoulette] = useState(false);
  const [athleteEligibilitySettings, setAthleteEligibilitySettings] = useState({ allowIndividualPlusRelay: false });

  // Scoring settings (places -> points)
  const [scoringSettings, setScoringSettings] = useState({ places: [
    { place: 1, points: 10 }, { place: 2, points: 5 }, { place: 3, points: 4 }, { place: 4, points: 3 },
    { place: 5, points: 2 }, { place: 6, points: 1 }, { place: 7, points: 0 }, { place: 8, points: -5 }
  ], activePresetId: 'default' });
  const [isSavingScoring, setIsSavingScoring] = useState(false);

  // Infractions settings
  const [infractionsSettings, setInfractionsSettings] = useState({ items: [
    { id: 'false_start', label: 'False Start', delta: -2, allowMultiple: true },
    { id: 'athlete_selection_clock', label: 'Athlete-Selection Clock Violation', delta: -3, allowMultiple: false },
    { id: 'lane_violation', label: 'Lane Violation', delta: -5, allowMultiple: false },
    { id: 'baton_exchange', label: 'Baton Exchange Violation', delta: -5, allowMultiple: false },
    { id: 'obstruction', label: 'Obstruction', delta: -5, allowMultiple: false },
  ], activePresetId: 'default' });
  const [isSavingInfractions, setIsSavingInfractions] = useState(false);
  const [plannedTeams, setPlannedTeams] = useState(4);
  const [inlineNotice, setInlineNotice] = useState('');
  const [infractionsNotice, setInfractionsNotice] = useState('');
  const [editingInfractionId, setEditingInfractionId] = useState(null);
  const [openInfractionMenuId, setOpenInfractionMenuId] = useState(null);
  const [sequenceValidationSummary, setSequenceValidationSummary] = useState(null);
  const [showSequenceValidationModal, setShowSequenceValidationModal] = useState(false);

  // Animated values for smooth toggle transitions
  const toggleAnimations = useRef({});

  // Initialize animations for each event
  const initializeToggleAnimation = (category, eventName) => {
    const key = `${category}-${eventName}`;
    if (!toggleAnimations.current[key]) {
      toggleAnimations.current[key] = new Animated.Value(0);
    }
  };

  // Get animation value for an event
  const getToggleAnimation = (category, eventName) => {
    const key = `${category}-${eventName}`;
    if (!toggleAnimations.current[key]) {
      initializeToggleAnimation(category, eventName);
    }
    return toggleAnimations.current[key];
  };

  // Event categories
  const eventCategories = {
    shortSprints: 'Short\nSprints',
    middleDistances: 'Middle\nDistances', 
    longDistances: 'Long\nDistances',
    relays: 'Relay\nRaces',
    technicalEvents: 'Technical\nEvents'
  };

  // Load division-scoped settings whenever the active division changes
  useEffect(() => {
    if (!activeDivisionId) return;
    loadDivisionSettings();
  }, [activeDivisionId]);

  useEffect(() => {
    if (!activeDivisionId) return;

    const handleTeamsUpdated = async (count) => {
      setTeamCount(count);
      const desired = Math.max(2, Number(count) || 0);
      if (desired === 0) return;
      const newSettings = { places: buildScoringPlaces(desired), activePresetId: `${desired}T` };
      setScoringSettings(newSettings);
      setInlineNotice(`Team count changed to ${count}. Scoring updated to ${desired}-team preset.`);
      try {
        await saveScoringSettingsToStorage(newSettings);
        emitForDivision(activeDivisionId, 'settings.scoring.updated');
      } catch {}
    };

    const handlePlannedTeams = async (planned) => {
      setPlannedTeams(planned);
      if (teamCount > 0) return;
      const desired = Math.max(2, Number(planned) || 0);
      if (desired === 0) return;
      const newSettings = { places: buildScoringPlaces(desired), activePresetId: `${desired}T` };
      setScoringSettings(newSettings);
      setInlineNotice(`Planned team count changed to ${planned}. Scoring updated to ${desired}-team preset.`);
      try {
        await savePlannedTeamsToStorage(planned);
        await saveScoringSettingsToStorage(newSettings);
        emitForDivision(activeDivisionId, 'settings.scoring.updated');
      } catch {}
    };

    const unsubTeams = eventBus.onForDivision(activeDivisionId, 'teamsUpdated', handleTeamsUpdated);
    const unsubPlanned = eventBus.onForDivision(activeDivisionId, 'plannedTeamsUpdated', handlePlannedTeams);

    return () => {
      unsubTeams();
      unsubPlanned();
    };
  }, [activeDivisionId, teamCount]);

  // Initialize toggle animations when event pool changes
  useEffect(() => {
    Object.keys(eventPool).forEach(category => {
      eventPool[category].forEach(event => {
        initializeToggleAnimation(category, event.name);
        const animation = getToggleAnimation(category, event.name);
        // Set initial position based on current enabled state
        animation.setValue(event.enabled ? 1 : 0);
      });
    });
  }, [eventPool]);

  // Reload when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (activeDivisionId) {
        loadDivisionSettings();
      }
    });

    return unsubscribe;
  }, [navigation, activeDivisionId]);

  const loadDivisionSettings = async () => {
    try {
      const [
        { division },
        athletes,
        teams,
        planned,
        eventPoolData,
        roulette,
        scoringBase,
        infractions,
        eligibility,
      ] = await Promise.all([
        getActiveDivisionData(),
        getAthletes(),
        getTeams(),
        getPlannedTeams(),
        getEventPool(),
        getRouletteSettings(),
        getScoringSettings(),
        getInfractionsSettings(),
        getEligibilitySettings(),
      ]);
      const eventSequence = Array.isArray(division.eventSequence) ? division.eventSequence : [];
      const eventResults = Array.isArray(division.eventResults) ? division.eventResults : [];

      setDataStats({
        athletes: athletes.length,
        teams: teams.length,
        eventSequence: eventSequence.length,
        eventResults: eventResults.length,
      });
      setTeamCount(teams.length);
      setPlannedTeams(planned);
      setEventPool(eventPoolData);
      setRouletteSettings(roulette);

      const effectiveCount = teams.length > 0 ? teams.length : planned;
      const reconciled = reconcileScoringWithTeamCount(scoringBase, effectiveCount);
      if (reconciled) {
        setScoringSettings(reconciled);
      }

      setInfractionsSettings({
        items: infractions.items,
        activePresetId: infractions.activePresetId || 'custom',
      });

      setAthleteEligibilitySettings(eligibility);
    } catch (error) {
      console.log('Error loading division settings:', error);
    }
  };

  const savePlannedTeams = async (plannedTeamsValue) => {
    await savePlannedTeamsToStorage(plannedTeamsValue);
  };

  const saveEventPool = async (newEventPool) => {
    try {
      await saveEventPoolToStorage(newEventPool);
      setEventPool(newEventPool);
      emitForDivision(activeDivisionId, 'settings.eventPool.updated');
    } catch (error) {
      console.log('Error saving event pool:', error);
    }
  };

  const toggleAllowIndividualPlusRelay = async () => {
    const next = { allowIndividualPlusRelay: !athleteEligibilitySettings.allowIndividualPlusRelay };
    setAthleteEligibilitySettings(next);
    try {
      const saved = await saveEligibilitySettingsToStorage(next);
      setAthleteEligibilitySettings(saved);
      emitForDivision(activeDivisionId, 'settings.athleteEligibility.updated');
    } catch (error) {
      console.log('Error saving athlete eligibility settings:', error);
      // Revert on failure so the toggle reflects what's actually persisted.
      setAthleteEligibilitySettings((prev) => ({ allowIndividualPlusRelay: !prev.allowIndividualPlusRelay }));
    }
  };

  const toggleEvent = (category, eventName) => {
    const newEventPool = { ...eventPool };
    const eventIndex = newEventPool[category].findIndex(event => event.name === eventName);
    
    if (eventIndex !== -1) {
      const newEnabled = !newEventPool[category][eventIndex].enabled;
      newEventPool[category][eventIndex] = { 
        ...newEventPool[category][eventIndex], 
        enabled: newEnabled 
      };
      
      // Animate the toggle
      const animation = getToggleAnimation(category, eventName);
      Animated.timing(animation, {
        toValue: newEnabled ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      saveEventPool(newEventPool);
    }
  };

  const resetToDefaults = () => {
    console.log('Reset to defaults button pressed');
    setShowResetDefaultsConfirm(true);
  };

  const handleResetDefaultsConfirm = () => {
    console.log('Resetting event pool to defaults');
    const defaultPool = getDefaultEventPool();
    saveEventPool(defaultPool);
    
    // Reset all animations to their default state
    Object.keys(defaultPool).forEach(category => {
      defaultPool[category].forEach(event => {
        const animation = getToggleAnimation(category, event.name);
        Animated.timing(animation, {
          toValue: event.enabled ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
    });
    
    setShowResetDefaultsConfirm(false);
    console.log('Event pool reset to defaults successfully');
  };

  const handleResetDefaultsCancel = () => {
    console.log('Reset to defaults cancelled');
    setShowResetDefaultsConfirm(false);
  };

  const refreshToLatestDefaults = () => {
    Alert.alert(
      'Refresh Event Pool',
      'This will update the event pool to include any new events that have been added to the defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Refresh to Latest', 
          onPress: () => {
            const latestPool = getDefaultEventPool();
            saveEventPool(latestPool);
            
            // Initialize animations for new events
            Object.keys(latestPool).forEach(category => {
              latestPool[category].forEach(event => {
                initializeToggleAnimation(category, event.name);
                const animation = getToggleAnimation(category, event.name);
                animation.setValue(event.enabled ? 1 : 0);
              });
            });
            
            Alert.alert('Success', 'Event pool refreshed to latest defaults.');
          }
        }
      ]
    );
  };

  const saveRouletteSettings = async () => {
    const { totalEvents, numRelays, relayPositions } = rouletteSettings;
    if (totalEvents < 1) {
      Alert.alert('Invalid', 'Total events must be at least 1.');
      return;
    }
    if (numRelays < 0 || numRelays > totalEvents) {
      Alert.alert('Invalid', 'Number of relays must be between 0 and total events.');
      return;
    }
    const filtered = relayPositions.filter(p => p >= 1 && p <= totalEvents).slice(0, totalEvents);
    const summary = getSequenceValidationSummary(eventPool, totalEvents, numRelays);
    if (!summary.success) {
      setSequenceValidationSummary(summary);
      setShowSequenceValidationModal(true);
      return;
    }

    setIsSavingRoulette(true);
    try {
      const saved = await saveRouletteSettingsToStorage({
        totalEvents,
        numRelays,
        relayPositions: filtered,
      });
      setRouletteSettings(saved);
      emitForDivision(activeDivisionId, 'settings.roulette.updated');
      Alert.alert('Saved', 'Race Roulette sequence settings updated.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setIsSavingRoulette(false);
    }
  };

  const saveScoringSettings = async () => {
    setIsSavingScoring(true);
    try {
      await saveScoringSettingsToStorage(scoringSettings);
      emitForDivision(activeDivisionId, 'settings.scoring.updated');
      Alert.alert('Saved', 'Points scoring settings updated.');
    } catch {
      Alert.alert('Error', 'Failed to save scoring settings.');
    } finally {
      setIsSavingScoring(false);
    }
  };

  const resetScoringToDefault = () => {
    const effectiveCount = teamCount > 0 ? teamCount : (plannedTeams || 8);
    setScoringSettings({
      places: buildScoringPlaces(effectiveCount),
      activePresetId: `${effectiveCount}T`,
    });
  };

  // Helpers: Stepper component and Scoring presets
  const Stepper = ({ value, onChange, min = -999, max = 999, step = 1 }) => (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperBtn} onPress={() => onChange(Math.max(min, (value || 0) - step))} accessibilityLabel="Decrement">
        <MobileBody style={styles.stepperBtnText}>−</MobileBody>
      </Pressable>
      <MobileBody style={styles.stepperValue}>{String(value ?? 0)}</MobileBody>
      <Pressable style={styles.stepperBtn} onPress={() => onChange(Math.min(max, (value || 0) + step))} accessibilityLabel="Increment">
        <MobileBody style={styles.stepperBtnText}>+</MobileBody>
      </Pressable>
    </View>
  );

  const saveInfractionsSettings = async () => {
    setIsSavingInfractions(true);
    try {
      await saveInfractionsSettingsToStorage(infractionsSettings);
      emitForDivision(activeDivisionId, 'settings.infractions.updated');
      Alert.alert('Saved', 'Infractions settings updated.');
    } catch {
      Alert.alert('Error', 'Failed to save infractions settings.');
    } finally {
      setIsSavingInfractions(false);
    }
  };

  const addInfraction = () => {
    setInfractionsSettings(prev => ({
      ...prev,
      activePresetId: 'custom',
      items: [
        ...prev.items,
        { id: `custom_${Date.now()}`, label: '', delta: 0, allowMultiple: false }
      ]
    }));
  };

  const removeInfraction = (id) => {
    setInfractionsSettings(prev => ({
      ...prev,
      activePresetId: 'custom',
      items: prev.items.filter(it => it.id !== id)
    }));
  };

  const resetInfractionsToDefault = () => {
    setInfractionsSettings({
      activePresetId: 'default',
      items: [
        { id: 'false_start', label: 'False Start', delta: -2, allowMultiple: true },
        { id: 'athlete_selection_clock', label: 'Athlete-Selection Clock Violation', delta: -3, allowMultiple: false },
        { id: 'lane_violation', label: 'Lane Violation', delta: -5, allowMultiple: false },
        { id: 'baton_exchange', label: 'Baton Exchange Violation', delta: -5, allowMultiple: false },
        { id: 'obstruction', label: 'Obstruction', delta: -5, allowMultiple: false },
      ]
    });
    setInfractionsNotice('Infractions reset to default.');
  };

  const getEventPoolStats = () => {
    const stats = {
      total: 0,
      byCategory: {}
    };

    Object.keys(eventPool).forEach(category => {
      const enabledCount = eventPool[category].filter(event => event.enabled).length;
      const totalCount = eventPool[category].length;
      
      stats.byCategory[category] = {
        enabled: enabledCount,
        total: totalCount
      };
      stats.total += enabledCount;
    });

    return stats;
  };

  const stats = getEventPoolStats();

  const clearAllData = () => {
    console.log('Clear all data button pressed');
    setShowClearAllDataConfirm(true);
  };

  const handleClearAllDataConfirm = async () => {
    console.log('Clearing all data for active division');
    try {
      await resetDivision(activeDivisionId, RESET_SCOPES.ALL_DATA);
      await loadDivisionSettings();
      setShowClearAllDataConfirm(false);
      console.log('Division data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      setShowClearAllDataConfirm(false);
    }
  };

  const handleClearAllDataCancel = () => {
    console.log('Clear all data cancelled');
    setShowClearAllDataConfirm(false);
  };

  const clearSpecificData = async (dataType, key) => {
    console.log(`Clear specific data button pressed: ${dataType}`);
    // Athletes and teams are protected once results exist; other data types
    // use the generic confirm.
    let impact = null;
    if (dataType === 'athletes') {
      let participation = null;
      try {
        participation = await getRosterParticipation(activeDivisionId);
      } catch (error) {
        console.log('Error checking roster participation:', error);
      }
      impact = describeClearAthletesImpact(participation);
    } else if (dataType === 'teams' && (await resultsExist())) {
      impact = describeTeamResetBlocked('clear');
    }
    setClearSpecificType({ dataType, key, impact });
    setShowClearSpecificConfirm(true);
  };

  const CLEAR_SCOPE_BY_TYPE = {
    athletes: RESET_SCOPES.ATHLETES,
    teams: RESET_SCOPES.TEAMS,
    eventSequence: RESET_SCOPES.SEQUENCE,
    eventResults: RESET_SCOPES.RESULTS,
  };

  const handleClearSpecificConfirm = async () => {
    if (!clearSpecificType) return;

    const { dataType, impact } = clearSpecificType;
    if (impact?.blocked) {
      handleClearSpecificCancel();
      return;
    }
    const scope = CLEAR_SCOPE_BY_TYPE[dataType];
    console.log(`Clearing ${dataType} data for active division`);

    try {
      if (scope) {
        await resetDivision(activeDivisionId, scope);
        await loadDivisionSettings();
      }

      setShowClearSpecificConfirm(false);
      setClearSpecificType(null);
      console.log(`${dataType} cleared successfully`);
    } catch (error) {
      console.error(`Error clearing ${dataType}:`, error);
      setShowClearSpecificConfirm(false);
      setClearSpecificType(null);
    }
  };

  const handleClearSpecificCancel = () => {
    console.log('Clear specific data cancelled');
    setShowClearSpecificConfirm(false);
    setClearSpecificType(null);
  };

  const resultsExist = async () => {
    try {
      const results = await getEventResults(activeDivisionId);
      return Array.isArray(results) && results.length > 0;
    } catch (error) {
      console.log('Error checking results:', error);
      return false;
    }
  };

  const openResetTeamsConfirm = async () => {
    setResetTeamsBlocked((await resultsExist()) ? describeTeamResetBlocked('reset') : null);
    setShowResetTeamsConfirm(true);
  };

  const handleResetTeamsConfirm = async () => {
    if (resetTeamsBlocked) {
      setShowResetTeamsConfirm(false);
      return;
    }
    try {
      await resetDivision(activeDivisionId, RESET_SCOPES.TEAMS);
      setTeamCount(0);
      setDataStats(prev => ({ ...prev, teams: 0 }));
      emitForDivision(activeDivisionId, 'teamsUpdated', 0);
      await loadDivisionSettings();
    } catch (error) {
      console.error('Error resetting teams:', error);
    } finally {
      setShowResetTeamsConfirm(false);
    }
  };

  const handleResetTeamsCancel = () => {
    setShowResetTeamsConfirm(false);
  };

  const exportData = async () => {
    console.log('Export data button pressed');
    try {
      const { division } = await getActiveDivisionData();

      const data = {
        divisionId: activeDivisionId,
        divisionName: activeDivisionName,
        athletes: division.athletes || [],
        teams: division.teams || [],
        eventSequence: division.eventSequence || [],
        eventResults: division.eventResults || [],
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
      };

      setExportDataInfo(data);
      setShowExportDataInfo(true);
      console.log('Export data prepared');
    } catch (error) {
      console.error('Error preparing data export:', error);
    }
  };

  const handleExportDataClose = () => {
    setShowExportDataInfo(false);
    setExportDataInfo(null);
  };

  const resetEventProgress = async () => {
    console.log('Reset event progress button pressed');
    setShowResetProgressConfirm(true);
  };

  const handleResetProgressConfirm = async () => {
    console.log('Resetting event progress');
    try {
      await resetDivision(activeDivisionId, RESET_SCOPES.PROGRESS);
      await loadDivisionSettings();
      setShowResetProgressConfirm(false);
      console.log('Event progress reset successfully');
    } catch (error) {
      console.error('Error resetting event progress:', error);
      setShowResetProgressConfirm(false);
    }
  };

  const handleResetProgressCancel = () => {
    console.log('Reset event progress cancelled');
    setShowResetProgressConfirm(false);
  };

  const getCategoryAbbreviation = (category) => {
    switch (category) {
      case 'shortSprints':
        return 'SS';
      case 'middleDistances':
        return 'MD';
      case 'longDistances':
        return 'LD';
      case 'relays':
        return 'R';
      case 'technicalEvents':
        return 'TE';
      default:
        return category.charAt(0);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* Event Configuration Section */}
        <Card style={[
          styles.section,
          isLandscape && styles.sectionLandscape
        ]}>
          <MobileH2 style={[
            styles.sectionTitle,
            isLandscape && styles.sectionTitleLandscape
          ]}>Event Configuration</MobileH2>
          <View style={styles.eventConfigContainer}>
            <View style={[
              styles.totalEnabledContainer,
              isLandscape && styles.totalEnabledContainerLandscape
            ]}>
              <MobileH1 style={[
                styles.totalEnabledNumber,
                isLandscape && styles.totalEnabledNumberLandscape
              ]}>{stats.total}</MobileH1>
              <MobileBody style={[
                styles.totalEnabledLabel,
                isLandscape && styles.totalEnabledLabelLandscape
              ]}>Total Enabled Events</MobileBody>
            </View>

            <View style={isLandscape ? styles.categorySelectorLandscape : styles.categorySelector}>
              <MobileBody style={styles.categoryLabel}>Select Event Category:</MobileBody>
              <View style={styles.categoryButtons}>
                <View style={[
                  styles.categoryRow,
                  styles.firstRow,
                  isLandscape && styles.categoryRowLandscape,
                  isLandscape && styles.firstRowLandscape
                ]}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      isLandscape && styles.categoryButtonLandscape,
                      selectedCategory === 'shortSprints' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setSelectedCategory('shortSprints')}
                  >
                    <MobileBody style={[
                      styles.categoryButtonText,
                      selectedCategory === 'shortSprints' && styles.categoryButtonTextSelected
                    ]}>
                      {eventCategories.shortSprints}
                    </MobileBody>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      isLandscape && styles.categoryButtonLandscape,
                      selectedCategory === 'middleDistances' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setSelectedCategory('middleDistances')}
                  >
                    <MobileBody style={[
                      styles.categoryButtonText,
                      selectedCategory === 'middleDistances' && styles.categoryButtonTextSelected
                    ]}>
                      {eventCategories.middleDistances}
                    </MobileBody>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      isLandscape && styles.categoryButtonLandscape,
                      selectedCategory === 'longDistances' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setSelectedCategory('longDistances')}
                  >
                    <MobileBody style={[
                      styles.categoryButtonText,
                      selectedCategory === 'longDistances' && styles.categoryButtonTextSelected
                    ]}>
                      {eventCategories.longDistances}
                    </MobileBody>
                  </TouchableOpacity>
                </View>
                
                <View style={[
                  styles.categoryRow,
                  styles.secondRow,
                  isLandscape && styles.categoryRowLandscape,
                  isLandscape && styles.secondRowLandscape
                ]}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      isLandscape && styles.categoryButtonLandscape,
                      selectedCategory === 'relays' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setSelectedCategory('relays')}
                  >
                    <MobileBody style={[
                      styles.categoryButtonText,
                      selectedCategory === 'relays' && styles.categoryButtonTextSelected
                    ]}>
                      {eventCategories.relays}
                    </MobileBody>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      isLandscape && styles.categoryButtonLandscape,
                      selectedCategory === 'technicalEvents' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setSelectedCategory('technicalEvents')}
                  >
                    <MobileBody style={[
                      styles.categoryButtonText,
                      selectedCategory === 'technicalEvents' && styles.categoryButtonTextSelected
                    ]}>
                      {eventCategories.technicalEvents}
                    </MobileBody>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.eventListContainer}>
              <MobileH2 style={styles.eventListTitle}>
                {eventCategories[selectedCategory]} Events
              </MobileH2>
              {eventPool[selectedCategory]?.map((event, index) => (
                <View key={index} style={[
                  styles.eventItem,
                  !event.enabled && styles.eventItemDisabled
                ]}>
                  <TouchableOpacity
                    style={[
                      styles.eventToggle,
                      event.enabled && styles.toggleEnabled
                    ]}
                    onPress={() => toggleEvent(selectedCategory, event.name)}
                  >
                    <Animated.View 
                      style={[
                        styles.toggleCircle,
                        {
                          left: getToggleAnimation(selectedCategory, event.name).interpolate({
                            inputRange: [0, 1],
                            outputRange: [scale(2), scale(18)]
                          })
                        }
                      ]} 
                    />
                  </TouchableOpacity>
                  <MobileBody style={[
                    styles.eventName,
                    !event.enabled && styles.eventNameDisabled
                  ]}>{event.name}</MobileBody>
                </View>
              ))}
            </View>

            <View style={styles.breakdownContainer}>
              <MobileBody style={styles.breakdownLabel}>Breakdown by Category:</MobileBody>
              <View style={styles.breakdownTable}>
                {Object.keys(stats.byCategory).map(category => (
                  <View key={category} style={styles.breakdownRow}>
                    <MobileCaption style={styles.breakdownCategory}>
                      {getCategoryAbbreviation(category)}
                    </MobileCaption>
                    <MobileCaption style={styles.breakdownCount}>
                      {stats.byCategory[category].enabled}/{stats.byCategory[category].total}
                    </MobileCaption>
                  </View>
                ))}
              </View>
            </View>

            <View style={[
              styles.buttonGroup,
              isLandscape && styles.buttonGroupLandscape
            ]}>
              <ButtonSecondary 
                title="Reset to Default"
                onPress={resetToDefaults}
                style={styles.resetDefaultsButton}
                textStyle={styles.buttonTextSmall}
              />
              <ButtonSecondary 
                title="Refresh to Latest Events"
                onPress={refreshToLatestDefaults}
                style={styles.refreshDefaultsButton}
                textStyle={styles.buttonTextSmall}
              />
            </View>
          </View>
        </Card>

        {/* Team Configuration — always visible, locked when teams exist */}
        <Card style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeaderRow}>
            <MobileH2 style={[styles.sectionTitle, isLandscape && styles.sectionTitleLandscape]}>Team Configuration</MobileH2>
            {teamCount > 0 && (
              <View style={styles.lockedBadge}>
                <MobileCaption style={styles.lockedBadgeText}>Locked</MobileCaption>
              </View>
            )}
          </View>

          <View style={styles.rrRow}>
            <View style={styles.rrColFixed}>
              <MobileBody style={styles.rrLabel}>
                {teamCount > 0 ? 'Active Teams' : 'Planned Team Count'}
              </MobileBody>
              <View style={[styles.stepper, teamCount > 0 && styles.stepperDisabled]}>
                <Pressable
                  style={[styles.stepperBtn, teamCount > 0 && styles.stepperBtnDisabled]}
                  onPress={async () => {
                    if (teamCount > 0) return;
                    const v = Math.max(2, (plannedTeams || 0) - 1);
                    setPlannedTeams(v);
                    emitForDivision(activeDivisionId, 'plannedTeamsUpdated', v);
                    try { await savePlannedTeams(v); } catch {}
                  }}
                  disabled={teamCount > 0}
                >
                  <MobileBody style={[styles.stepperBtnText, teamCount > 0 && styles.stepperBtnTextDisabled]}>−</MobileBody>
                </Pressable>
                <MobileBody style={[styles.stepperValue, teamCount > 0 && styles.stepperValueLocked]}>
                  {String(teamCount > 0 ? teamCount : plannedTeams)}
                </MobileBody>
                <Pressable
                  style={[styles.stepperBtn, teamCount > 0 && styles.stepperBtnDisabled]}
                  onPress={async () => {
                    if (teamCount > 0) return;
                    const v = Math.min(32, (plannedTeams || 0) + 1);
                    setPlannedTeams(v);
                    emitForDivision(activeDivisionId, 'plannedTeamsUpdated', v);
                    try { await savePlannedTeams(v); } catch {}
                  }}
                  disabled={teamCount > 0}
                >
                  <MobileBody style={[styles.stepperBtnText, teamCount > 0 && styles.stepperBtnTextDisabled]}>+</MobileBody>
                </Pressable>
              </View>

              {teamCount > 0 ? (
                <MobileCaption style={styles.syncHelp}>
                  Teams are active. Reset to change configuration.
                </MobileCaption>
              ) : (
                <MobileCaption style={styles.syncHelp}>
                  Used for scoring sync until teams are generated.
                </MobileCaption>
              )}
            </View>
          </View>

          {teamCount > 0 && (
            <View style={styles.resetTeamsRow}>
              <ButtonSecondary
                onPress={openResetTeamsConfirm}
                style={styles.resetTeamsButton}
              >
                Reset Teams
              </ButtonSecondary>
            </View>
          )}
        </Card>

        {/* Athlete Eligibility (Roster Rules) */}
        <Card style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <MobileH2 style={[styles.sectionTitle, isLandscape && styles.sectionTitleLandscape]}>Roster Rules</MobileH2>

          <View style={styles.eligibilityRow}>
            <View style={styles.eligibilityTextCol}>
              <MobileBody style={styles.eligibilityLabel}>Allow Individual + Relay</MobileBody>
              <MobileCaption style={styles.eligibilityHelp}>
                {athleteEligibilitySettings.allowIndividualPlusRelay
                  ? 'On: each athlete may compete in one individual event AND one relay.'
                  : 'Off: each athlete may compete in one event total (current default).'}
              </MobileCaption>
            </View>
            <Pressable
              style={[
                styles.eligibilityToggle,
                athleteEligibilitySettings.allowIndividualPlusRelay && styles.eligibilityToggleActive
              ]}
              onPress={toggleAllowIndividualPlusRelay}
              accessibilityRole="switch"
              accessibilityState={{ checked: athleteEligibilitySettings.allowIndividualPlusRelay }}
              accessibilityLabel="Allow individual plus relay eligibility"
            >
              <View style={[
                styles.eligibilityToggleCircle,
                athleteEligibilitySettings.allowIndividualPlusRelay && styles.eligibilityToggleCircleActive
              ]} />
            </Pressable>
          </View>
        </Card>

        {/* Race Roulette Sequence Settings */}
        <Card style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <MobileH2 style={[styles.sectionTitle, isLandscape && styles.sectionTitleLandscape]}>Race Roulette Sequence</MobileH2>
          <View style={styles.rrRow}>
            <View style={styles.rrColFixed}>
              <MobileBody style={styles.rrLabel}>Total Events</MobileBody>
              <Stepper
                value={rouletteSettings.totalEvents}
                min={1}
                step={1}
                onChange={(val) => setRouletteSettings(prev => ({
                  ...prev,
                  totalEvents: val,
                  relayPositions: prev.relayPositions.filter(p => p <= val)
                }))}
              />
            </View>
            <View style={styles.rrColFixed}>
              <MobileBody style={styles.rrLabel}>Number of Relays</MobileBody>
              <Stepper
                value={rouletteSettings.numRelays}
                min={0}
                step={1}
                onChange={(val) => setRouletteSettings(prev => ({
                  ...prev,
                  numRelays: Math.min(val, prev.totalEvents),
                  relayPositions: prev.relayPositions.slice(0, Math.max(val, 0))
                }))}
              />
            </View>
          </View>
          <View style={styles.rrPositionsBlock}>
            <MobileBody style={styles.rrLabel}>Relay Positions</MobileBody>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.rrChipsRow}>
                {Array.from({ length: rouletteSettings.totalEvents || 0 }, (_, i) => i + 1).map(n => {
                  const selected = rouletteSettings.relayPositions.includes(n);
                  const disabled = rouletteSettings.numRelays === 0;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.rrChip, selected && styles.rrChipActive, disabled && styles.rrChipDisabled]}
                      onPress={() => {
                        if (disabled) return;
                        setRouletteSettings(prev => {
                          const next = new Set(prev.relayPositions);
                          if (next.has(n)) next.delete(n); else next.add(n);
                          // Limit to numRelays selections if > 0
                          const arr = Array.from(next).sort((a,b)=>a-b).slice(0, Math.max(prev.numRelays, 0));
                          return { ...prev, relayPositions: arr };
                        });
                      }}
                      disabled={disabled}
                    >
                      <MobileCaption style={[styles.rrChipText, selected && styles.rrChipTextActive]}>{n}</MobileCaption>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <MobileCaption style={styles.rrHelp}>
              {rouletteSettings.numRelays === 0 ? 'No relays selected' : `Select up to ${rouletteSettings.numRelays} position(s)`}
            </MobileCaption>
          </View>
          <View style={styles.formButtons}>
            <ButtonSecondary onPress={saveRouletteSettings} disabled={isSavingRoulette}>
              {isSavingRoulette ? 'Saving…' : 'Save Sequence'}
            </ButtonSecondary>
          </View>
        </Card>

        {/* Inline notice for scoring sync changes */}
        {inlineNotice ? (
          <View style={styles.noticeBanner}>
            <MobileCaption style={styles.noticeText}>{inlineNotice}</MobileCaption>
          </View>
        ) : null}

        {/* Points Scoring Settings */}
        <Card style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <MobileH2 style={[styles.sectionTitle, isLandscape && styles.sectionTitleLandscape]}>Points Scoring</MobileH2>
          <MobileCaption style={styles.scoringTeamInfo}>
            Showing {scoringSettings.places.length} place{scoringSettings.places.length !== 1 ? 's' : ''} — mirrors your {teamCount > 0 ? 'active' : 'planned'} team count ({teamCount > 0 ? teamCount : (plannedTeams || '—')} teams). Change in Team Configuration above.
          </MobileCaption>
          <View style={styles.scoringList}>
            {scoringSettings.places.map((row, idx) => (
              <View key={`p-${row.place}-${idx}`} style={styles.scoringRow}>
                <MobileBody style={styles.scoringPlaceLabel}>{row.place}</MobileBody>
                <Stepper
                  value={row.points}
                  step={1}
                  onChange={(val) => {
                    setScoringSettings(prev => ({
                      ...prev,
                      activePresetId: 'custom',
                      places: prev.places.map(p => p.place === row.place ? { ...p, points: val } : p)
                    }));
                  }}
                />
              </View>
            ))}
          </View>
          <View style={styles.formButtons}>
            <ButtonSecondary onPress={resetScoringToDefault}>Reset to Default</ButtonSecondary>
            <ButtonPrimary onPress={saveScoringSettings} disabled={isSavingScoring}>
              {isSavingScoring ? 'Saving…' : 'Save Scoring'}
            </ButtonPrimary>
          </View>
        </Card>

        {/* Infractions Settings */}
        <Card style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <MobileH2 style={[styles.sectionTitle, isLandscape && styles.sectionTitleLandscape]}>Infractions</MobileH2>
          <MobileCaption style={styles.sectionCaption}>Assign point deductions for rule violations. Negative values are supported.</MobileCaption>
          <View style={[styles.headerActionsRow, isLandscape && styles.headerActionsRowLandscape]}>
            <ButtonSecondary onPress={addInfraction}>Add Infraction</ButtonSecondary>
          </View>
          {infractionsNotice ? (
            <View style={styles.noticeBanner}><MobileCaption style={styles.noticeText}>{infractionsNotice}</MobileCaption></View>
          ) : null}
          {infractionsSettings.items.length === 0 && (
            <View style={styles.emptyState}>
              <MobileBody style={styles.emptyTitle}>No infractions yet</MobileBody>
              <MobileCaption style={styles.emptyText}>Add an infraction or load the default set.</MobileCaption>
              <View style={styles.formButtons}>
                <ButtonSecondary onPress={resetInfractionsToDefault}>Load Default Set</ButtonSecondary>
                <ButtonPrimary onPress={addInfraction}>Add Infraction</ButtonPrimary>
              </View>
            </View>
          )}
          <View style={[styles.infractionsList, isLandscape && styles.infractionsListLandscape]}>
            {infractionsSettings.items.map((item, idx) => (
              <View key={item.id} style={[styles.infractionRow, isLandscape && styles.infractionRowLandscape]}>
                {editingInfractionId === item.id ? (
                  <View style={styles.infractionLabelReadOnly}>
                    <Input
                      label="Label"
                      value={item.label}
                      onChangeText={(v) => setInfractionsSettings(prev => ({
                        ...prev,
                        items: prev.items.map((it,i) => i===idx ? { ...it, label: v } : it)
                      }))}
                    />
                  </View>
                ) : (
                  <View style={styles.infractionLabelReadOnly}>
                    <MobileBody style={styles.infractionLabelValue}>{item.label || '—'}</MobileBody>
                  </View>
                )}
                <View style={styles.infractionPointsCol}>
                  <MobileBody style={styles.rrLabel}>Points</MobileBody>
                  <Stepper
                    value={item.delta}
                    step={1}
                    onChange={(val) => setInfractionsSettings(prev => ({
                      ...prev,
                      items: prev.items.map((it,i) => i===idx ? { ...it, delta: val } : it)
                    }))}
                  />
                </View>
                {/* Allow Multiple removed: infractions are per-occurrence applied in Scoreboard */}
                <View style={
                  editingInfractionId === item.id || openInfractionMenuId === item.id
                    ? styles.infractionActionsCol
                    : styles.infractionActionsColCollapsed
                }>
                  {editingInfractionId === item.id ? (
                    <View style={styles.infractionEditActions}>
                      <ButtonSecondary onPress={() => setEditingInfractionId(null)} style={styles.infractionBtnSm}>Done</ButtonSecondary>
                      <ButtonSecondary onPress={() => { removeInfraction(item.id); setEditingInfractionId(null); }} style={styles.infractionBtnSm}>Delete</ButtonSecondary>
                    </View>
                  ) : openInfractionMenuId === item.id ? (
                    <View style={styles.infractionEditActions}>
                      <ButtonSecondary onPress={() => { setEditingInfractionId(item.id); setOpenInfractionMenuId(null); }} style={styles.infractionBtnSm}>Edit</ButtonSecondary>
                      <ButtonSecondary onPress={() => { removeInfraction(item.id); setOpenInfractionMenuId(null); }} style={styles.infractionBtnSm}>Delete</ButtonSecondary>
                      <Pressable
                        onPress={() => setOpenInfractionMenuId(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Close actions"
                        style={styles.closeBtn}
                      >
                        <MobileBody style={styles.closeBtnText}>✕</MobileBody>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setOpenInfractionMenuId(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open actions for ${item.label || 'infraction'}`}
                      style={styles.moreBtn}
                    >
                      <MobileBody style={styles.moreBtnText}>⋯</MobileBody>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
          <View style={styles.formButtons}>
            <ButtonSecondary onPress={resetInfractionsToDefault}>Reset to Default</ButtonSecondary>
            <ButtonPrimary onPress={saveInfractionsSettings} disabled={isSavingInfractions}>
              {isSavingInfractions ? 'Saving…' : 'Save Infractions'}
            </ButtonPrimary>
          </View>
        </Card>

        {/* Data Statistics Section */}
        <Card style={[
          styles.section,
          isLandscape && styles.sectionLandscape
        ]}>
          <MobileH2 style={[
            styles.sectionTitle,
            isLandscape && styles.sectionTitleLandscape
          ]}>Data Statistics</MobileH2>
          <View style={[
            styles.statsGrid,
            isLandscape && styles.statsGridLandscape
          ]}>
            <View style={styles.statItem}>
              <MobileH1 style={styles.statNumber}>{dataStats.athletes}</MobileH1>
              <MobileCaption style={styles.statLabel}>Athletes</MobileCaption>
            </View>
            <View style={styles.statItem}>
              <MobileH1 style={styles.statNumber}>{dataStats.teams}</MobileH1>
              <MobileCaption style={styles.statLabel}>Teams</MobileCaption>
            </View>
            <View style={styles.statItem}>
              <MobileH1 style={styles.statNumber}>{dataStats.eventSequence}</MobileH1>
              <MobileCaption style={styles.statLabel}>Events</MobileCaption>
            </View>
            <View style={styles.statItem}>
              <MobileH1 style={styles.statNumber}>{dataStats.eventResults}</MobileH1>
              <MobileCaption style={styles.statLabel}>Results</MobileCaption>
            </View>
          </View>
        </Card>

        {/* Data Management Section */}
        <Card style={[
          styles.section,
          isLandscape && styles.sectionLandscape
        ]}>
          <MobileH2 style={[
            styles.sectionTitle,
            isLandscape && styles.sectionTitleLandscape
          ]}>Data Management</MobileH2>
          
          <View style={[
            styles.buttonGroup,
            isLandscape && styles.buttonGroupLandscape
          ]}>
            <ButtonSecondary 
              title="Export All Data to File"
              onPress={exportData}
              style={styles.managementButton}
            />
            <ButtonSecondary 
              title="Reset Event Progress (Keep Sequence)"
              onPress={resetEventProgress}
              style={styles.managementButton}
            />
          </View>

          <View style={[
            styles.clearButtonsContainer,
            isLandscape && styles.clearButtonsContainerLandscape
          ]}>
            <ButtonSecondary 
              title="Clear All Athletes"
              onPress={() => clearSpecificData('athletes', 'athletes')}
              style={styles.clearButton}
            />
            <ButtonSecondary 
              title="Clear All Teams"
              onPress={() => clearSpecificData('teams', 'teams')}
              style={styles.clearButton}
            />
            <ButtonSecondary 
              title="Clear Event Sequence"
              onPress={() => clearSpecificData('eventSequence', 'eventSequence')}
              style={styles.clearButton}
            />
            <ButtonSecondary 
              title="Clear Event Results"
              onPress={() => clearSpecificData('eventResults', 'eventResults')}
              style={styles.clearButton}
            />
          </View>

          <View style={styles.dangerZone}>
            <MobileH2 style={styles.dangerZoneTitle}>⚠️ Danger Zone</MobileH2>
            <MobileBody style={styles.dangerZoneText}>
              These actions will permanently delete data and cannot be undone.
            </MobileBody>
            <ButtonSecondary 
              title="Clear All Data (Permanent)"
              onPress={clearAllData}
              style={styles.dangerButton}
            />
          </View>
        </Card>

        {/* App Info Section */}
        <Card style={[
          styles.section,
          isLandscape && styles.sectionLandscape
        ]}>
          <MobileH2 style={[
            styles.sectionTitle,
            isLandscape && styles.sectionTitleLandscape
          ]}>App Information</MobileH2>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <MobileBody style={styles.infoLabel}>App Name</MobileBody>
              <MobileBody style={styles.infoValue}>Velox 1 Race Roulette</MobileBody>
            </View>
            <View style={styles.infoRow}>
              <MobileBody style={styles.infoLabel}>Version</MobileBody>
              <MobileBody style={styles.infoValue}>1.0.0</MobileBody>
            </View>
            <View style={styles.infoRow}>
              <MobileBody style={styles.infoLabel}>Description</MobileBody>
              <MobileBody style={styles.infoValue}>Track Competition Organizer</MobileBody>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Reset to Defaults Confirmation Modal */}
      <Modal
        visible={showResetDefaultsConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={handleResetDefaultsCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Reset Event Pool</MobileH2>
            <MobileBody style={styles.modalMessage}>
              This will reset all events to their default enabled/disabled state. Continue?
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleResetDefaultsCancel}>
                <MobileBody style={styles.modalButtonTextCancel}>Cancel</MobileBody>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={handleResetDefaultsConfirm}>
                <MobileBody style={styles.modalButtonText}>Reset to Defaults</MobileBody>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear All Data Confirmation Modal */}
      <Modal
        visible={showClearAllDataConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClearAllDataCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Clear All Data</MobileH2>
            <MobileBody style={styles.modalMessage}>
              This will permanently delete all athletes, teams, event sequences, and results. This action cannot be undone.
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleClearAllDataCancel}>
                <MobileBody style={styles.modalButtonTextCancel}>Cancel</MobileBody>
              </Pressable>
              <Pressable style={[styles.modalButtonConfirm, styles.modalButtonDanger]} onPress={handleClearAllDataConfirm}>
                <MobileBody style={styles.modalButtonText}>Clear All Data</MobileBody>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Teams Confirmation Modal */}
      <Modal
        visible={showResetTeamsConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={handleResetTeamsCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>
              {resetTeamsBlocked ? resetTeamsBlocked.title : 'Reset Teams'}
            </MobileH2>
            <MobileBody style={styles.modalMessage}>
              {resetTeamsBlocked
                ? resetTeamsBlocked.message
                : 'This will delete all teams and athlete assignments. Your athletes list will not be affected. This action cannot be undone.'}
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleResetTeamsCancel}>
                <MobileBody style={styles.modalButtonTextCancel}>{resetTeamsBlocked ? 'OK' : 'Cancel'}</MobileBody>
              </Pressable>
              {!resetTeamsBlocked && (
                <Pressable style={[styles.modalButtonConfirm, styles.modalButtonDanger]} onPress={handleResetTeamsConfirm}>
                  <MobileBody style={styles.modalButtonText}>Reset Teams</MobileBody>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear Specific Data Confirmation Modal */}
      <Modal
        visible={showClearSpecificConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClearSpecificCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>
              {clearSpecificType?.impact
                ? clearSpecificType.impact.title
                : `Clear ${clearSpecificType ? ({
                    athletes: 'Athletes',
                    teams: 'Teams',
                    eventSequence: 'Event Sequence',
                    eventResults: 'Event Results'
                  })[clearSpecificType.dataType] : ''}`}
            </MobileH2>
            <MobileBody style={styles.modalMessage}>
              {clearSpecificType?.impact
                ? clearSpecificType.impact.message
                : `This will permanently delete all ${clearSpecificType ? ({
                    athletes: 'athletes',
                    teams: 'teams',
                    eventSequence: 'event sequence data',
                    eventResults: 'event results'
                  })[clearSpecificType.dataType] : ''}. This action cannot be undone.`}
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleClearSpecificCancel}>
                <MobileBody style={styles.modalButtonTextCancel}>
                  {clearSpecificType?.impact?.blocked ? 'OK' : 'Cancel'}
                </MobileBody>
              </Pressable>
              {!clearSpecificType?.impact?.blocked && (
                <Pressable style={[styles.modalButtonConfirm, styles.modalButtonDanger]} onPress={handleClearSpecificConfirm}>
                  <MobileBody style={styles.modalButtonText}>Clear Data</MobileBody>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Data Info Modal */}
      <Modal
        visible={showExportDataInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={handleExportDataClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Export Data</MobileH2>
            <MobileBody style={styles.modalMessage}>
              Data export prepared:{'\n\n'}
              Athletes: {exportDataInfo?.athletes.length || 0}{'\n'}
              Teams: {exportDataInfo?.teams.length || 0}{'\n'}
              Events: {exportDataInfo?.eventSequence.length || 0}{'\n'}
              Results: {exportDataInfo?.eventResults.length || 0}{'\n\n'}
              Export functionality would save this data to a file or cloud storage.
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButtonConfirm, { flex: 1 }]} onPress={handleExportDataClose}>
                <MobileBody style={styles.modalButtonText}>OK</MobileBody>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Event Progress Confirmation Modal */}
      <Modal
        visible={showResetProgressConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={handleResetProgressCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Reset Event Progress</MobileH2>
            <MobileBody style={styles.modalMessage}>
              This will reset the event sequence progress (revealed events) but keep the sequence itself.
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleResetProgressCancel}>
                <MobileBody style={styles.modalButtonTextCancel}>Cancel</MobileBody>
              </Pressable>
              <Pressable style={[styles.modalButtonConfirm, styles.modalButtonDanger]} onPress={handleResetProgressConfirm}>
                <MobileBody style={styles.modalButtonText}>Reset Progress</MobileBody>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SequenceValidationModal
        visible={showSequenceValidationModal}
        title="Cannot Save Sequence"
        summary={sequenceValidationSummary}
        onClose={() => setShowSequenceValidationModal(false)}
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
  scrollContentLandscape: {
    paddingHorizontal: scale(32),
    paddingTop: scale(20),
    paddingBottom: scale(88),
  },
  section: {
    marginBottom: scale(24),
    padding: scale(20),
    minHeight: scale(120),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: scale(12),
    shadowColor: styleTokens.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionLandscape: {
    padding: scale(24),
    minHeight: scale(100),
  },
  sectionTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(20),
    textAlign: 'center',
    fontWeight: '700',
    fontSize: scale(18),
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionTitleLandscape: {
    fontSize: scale(20),
    marginBottom: scale(16),
  },
  infoContainer: {
    gap: scale(8),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  infoLabel: {
    color: styleTokens.colors.textSecondary,
    fontWeight: '600',
    fontSize: scale(16),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  infoValue: {
    color: styleTokens.colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: scale(16),
    fontSize: scale(16),
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: scale(16),
    paddingHorizontal: scale(8),
  },
  statsGridLandscape: {
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: scale(80),
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: styleTokens.colors.primary,
    marginBottom: scale(8),
    fontSize: scale(32),
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  statLabel: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    fontSize: scale(14),
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  buttonGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: scale(12),
    marginBottom: scale(24),
    gap: scale(16),
    width: '100%',
  },
  buttonGroupLandscape: {
    alignItems: 'center',
    gap: scale(16),
    width: '100%',
  },
  managementButton: {
    width: '100%',
    maxWidth: scale(300),
    minWidth: scale(250),
  },
  clearButtonsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: scale(16),
    marginBottom: scale(24),
    width: '100%',
  },
  clearButtonsContainerLandscape: {
    alignItems: 'center',
    gap: scale(16),
    width: '100%',
  },
  clearButton: {
    width: '100%',
    maxWidth: scale(300),
    minWidth: scale(250),
  },
  dangerZone: {
    backgroundColor: 'rgba(253, 246, 227, 0.15)',
    padding: scale(20),
    borderRadius: scale(12),
    marginTop: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  dangerZoneTitle: {
    color: '#ff6b6b',
    marginBottom: scale(12),
    textAlign: 'center',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dangerZoneText: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(16),
    textAlign: 'center',
    fontSize: scale(15),
    lineHeight: scale(22),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  dangerButton: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff5252',
    alignSelf: 'center',
    width: '100%',
    maxWidth: scale(300),
    minWidth: scale(250),
  },
  // New styles for Event Configuration
  rrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
    gap: scale(16),
  },
  rrCol: {
    width: '48%',
    minWidth: scale(140),
  },
  rrColFixed: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: scale(160),
  },
  rrPositionsBlock: {
    marginTop: scale(4),
    marginBottom: scale(8),
  },
  rrLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
  },
  rrChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  rrChip: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    marginRight: scale(8),
  },
  rrChipActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  rrChipDisabled: {
    opacity: 0.5,
  },
  rrChipText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  rrChipTextActive: {
    color: styleTokens.colors.white,
  },
  rrHelp: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.8,
    marginTop: scale(6),
  },
  scoringList: {
    gap: scale(8),
  },
  scoringTeamInfo: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(12),
    fontStyle: 'italic',
  },
  noticeBanner: {
    backgroundColor: 'rgba(100, 226, 211, 0.12)',
    borderColor: 'rgba(100, 226, 211, 0.4)',
    borderWidth: 1,
    borderRadius: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    marginBottom: scale(12),
  },
  noticeText: {
    color: styleTokens.colors.textSecondary,
  },
  syncHelp: {
    color: styleTokens.colors.textSecondary,
    marginTop: scale(8),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(4),
  },
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  eligibilityTextCol: {
    flex: 1,
    gap: scale(4),
  },
  eligibilityLabel: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '600',
  },
  eligibilityHelp: {
    color: styleTokens.colors.textSecondary,
  },
  eligibilityToggle: {
    width: scale(44),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: styleTokens.colors.disabled,
    padding: scale(2),
    justifyContent: 'center',
  },
  eligibilityToggleActive: {
    backgroundColor: styleTokens.colors.primary,
    alignItems: 'flex-end',
  },
  eligibilityToggleCircle: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: styleTokens.colors.white,
  },
  eligibilityToggleCircleActive: {
    backgroundColor: styleTokens.colors.white,
  },
  lockedBadge: {
    backgroundColor: 'rgba(159, 167, 174, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
  },
  lockedBadgeText: {
    color: styleTokens.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stepperDisabled: {
    opacity: 0.45,
  },
  stepperBtnDisabled: {
    backgroundColor: 'rgba(159, 167, 174, 0.15)',
  },
  stepperBtnTextDisabled: {
    color: styleTokens.colors.disabled,
  },
  stepperValueLocked: {
    color: styleTokens.colors.textSecondary,
  },
  resetTeamsRow: {
    marginTop: scale(16),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'flex-start',
  },
  resetTeamsButton: {
    minWidth: scale(160),
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: styleTokens.components.card.borderColor,
    paddingHorizontal: scale(8),
    paddingVertical: scale(6),
  },
  stepperBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(6),
    backgroundColor: styleTokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  stepperValue: {
    minWidth: scale(32),
    textAlign: 'center',
    color: styleTokens.colors.textPrimary,
  },
  infractionPointsCol: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '40%',
    minWidth: scale(140),
    alignSelf: 'flex-start',
  },
  infractionToggleCol: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: scale(140),
    alignItems: 'flex-start',
    gap: scale(6),
  },
  infractionActionsCol: {
    minWidth: scale(220),
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  // Slim variant used when only the "⋯" trigger is showing, so it sits inline
  // after the Points column instead of forcing a wrap onto its own row. The
  // wider infractionActionsCol above is still used once Edit/Delete/✕ are
  // revealed, which lets that wider content wrap below as before.
  infractionActionsColCollapsed: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: scale(36),
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    alignSelf: 'flex-start',
  },
  infractionDeleteBtn: {
    minWidth: scale(120),
  },
  moreBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  moreBtnText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
    lineHeight: scale(16),
  },
  closeBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeBtnText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
    fontSize: scale(14),
  },
  moreMenu: {
    position: 'absolute',
    top: scale(36),
    right: 0,
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: scale(8),
    paddingVertical: scale(6),
    minWidth: scale(140),
    ...styleTokens.shadows.lg,
    zIndex: 5,
  },
  moreMenuItem: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
  },
  moreMenuText: {
    color: styleTokens.colors.textPrimary,
  },
  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: scale(12),
  },
  headerActionsRowLandscape: {
    marginBottom: scale(10),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(12),
    gap: scale(8),
  },
  emptyTitle: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  emptyText: {
    color: styleTokens.colors.textSecondary,
  },
  sectionCaption: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: scale(-8),
    marginBottom: scale(8),
  },
  scoringRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  scoringPlaceLabel: {
    width: scale(56),
    textAlign: 'left',
    color: styleTokens.colors.textPrimary,
    marginTop: scale(12),
  },
  infractionsList: {
    gap: scale(8),
  },
  infractionsListLandscape: {
    gap: scale(10),
  },
  infractionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: scale(16),
    gap: scale(12),
  },
  infractionRowLandscape: {
    alignItems: 'flex-start',
    marginBottom: scale(16),
    gap: scale(12),
  },
  infractionLabelReadOnly: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '40%',
    minWidth: scale(110),
    gap: scale(6),
    alignSelf: 'flex-start',
  },
  infractionLabelValue: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '600',
  },
  infractionEditActions: {
    flexDirection: 'row',
    gap: scale(8),
    flexWrap: 'wrap',
  },
  infractionBtnSm: {
    minWidth: scale(100),
  },
  eventConfigContainer: {
    marginTop: scale(20),
    padding: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(12),
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    width: '100%',
  },
  categorySelector: {
    alignItems: 'center',
    marginBottom: scale(24),
    width: '100%',
  },
  categorySelectorLandscape: {
    alignItems: 'center',
    marginBottom: scale(20),
    width: '100%',
  },
  categoryLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(16),
    fontSize: scale(16),
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  categoryButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '100%',
    gap: scale(6),
    width: '100%',
  },
  categoryButton: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(6),
    borderRadius: scale(6),
    minWidth: scale(80),
    maxWidth: scale(100),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(40),
  },
  categoryButtonLandscape: {
    paddingVertical: scale(6),
    paddingHorizontal: scale(6),
    borderRadius: scale(5),
    minWidth: scale(70),
    maxWidth: scale(90),
    minHeight: scale(35),
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(4),
    width: '100%',
  },
  categoryRowLandscape: {
    gap: scale(3),
  },
  firstRow: {
    justifyContent: 'center',
    gap: scale(4),
  },
  firstRowLandscape: {
    gap: scale(3),
  },
  secondRow: {
    justifyContent: 'center',
    gap: scale(8),
  },
  secondRowLandscape: {
    gap: scale(6),
  },
  categoryButtonSelected: {
    backgroundColor: styleTokens.colors.primary,
    shadowColor: styleTokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryButtonText: {
    color: styleTokens.colors.textSecondary,
    fontWeight: '600',
    fontSize: scale(8),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    flexWrap: 'wrap',
    lineHeight: scale(10),
  },
  categoryButtonTextSelected: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  eventListContainer: {
    marginBottom: scale(24),
  },
  eventListTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(12),
    textAlign: 'center',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: scale(8),
  },
  eventItemDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.6,
    borderWidth: 1,
  },
  eventToggle: {
    width: scale(36),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(159, 167, 174, 0.3)',
  },
  toggleCircle: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
    left: scale(2),
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleEnabled: {
    backgroundColor: styleTokens.colors.white,
    left: scale(18),
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleEnabled: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  eventName: {
    flex: 1,
    color: styleTokens.colors.textPrimary,
    fontSize: scale(16),
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  eventNameDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  totalEnabledContainer: {
    alignItems: 'center',
    marginBottom: scale(20),
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
  },
  totalEnabledContainerLandscape: {
    alignItems: 'center',
    marginBottom: scale(16),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
  },
  totalEnabledNumber: {
    color: styleTokens.colors.primary,
    marginBottom: scale(4),
    fontSize: scale(36),
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  totalEnabledNumberLandscape: {
    color: styleTokens.colors.primary,
    marginBottom: scale(3),
    fontSize: scale(32),
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  totalEnabledLabel: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(14),
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  totalEnabledLabelLandscape: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(13),
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  breakdownContainer: {
    marginTop: scale(16),
    padding: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(12),
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    width: '100%',
  },
  breakdownLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(12),
    fontSize: scale(16),
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  breakdownTable: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  breakdownCategory: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(14),
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  breakdownCount: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  resetDefaultsButton: {
    width: '100%',
    maxWidth: scale(300),
    minWidth: scale(250),
    marginBottom: scale(16),
  },
  refreshDefaultsButton: {
    width: '100%',
    maxWidth: scale(300),
    minWidth: scale(250),
  },
  buttonTextSmall: {
    fontSize: scale(12),
    lineHeight: scale(16),
  },
  formButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    marginTop: scale(12),
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderRadius: scale(12),
    padding: scale(24),
    width: '100%',
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
    lineHeight: scale(22),
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
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  modalButtonDanger: {
    backgroundColor: '#ff6b6b',
  },
  modalButtonText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  modalButtonTextCancel: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
});

export default SettingsScreen; 