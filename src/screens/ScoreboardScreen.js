import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Pressable,
  Modal,
  Text
} from 'react-native';
import eventBus from '../lib/eventBus';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { ButtonPrimary, ButtonSecondary } from '../components';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import { loadEventAssignments, getTeamAssignmentForEvent } from '../lib/eventAssignments';
import { reconcileScoringWithTeamCount } from '../lib/scoring';
import { useDivision } from '../context/DivisionContext';
import {
  clearEventResults,
  getEventResults,
  getEventSequence,
  getInfractionsSettings,
  getPlannedTeams,
  getRevealedIndex,
  getScoringSettings,
  getTeams,
  saveEventResults as saveEventResultsToStorage,
} from '../lib/storage';

const DEFAULT_INFRACTIONS = [
  { id: 'false_start', label: 'False Start', delta: -2, allowMultiple: true },
  { id: 'athlete_selection_clock', label: 'Athlete-Selection Clock Violation', delta: -3, allowMultiple: false },
  { id: 'lane_violation', label: 'Lane Violation', delta: -5, allowMultiple: false },
  { id: 'baton_exchange', label: 'Baton Exchange Violation', delta: -5, allowMultiple: false },
  { id: 'obstruction', label: 'Obstruction', delta: -5, allowMultiple: false },
];

const ScoreboardScreen = ({ navigation }) => {
  const { activeDivisionId } = useDivision();
  const [teams, setTeams] = useState([]);
  const [eventSequence, setEventSequence] = useState([]);
  const [revealedIndex, setRevealedIndex] = useState(0);
  const [eventResults, setEventResults] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [showAllTeamScores, setShowAllTeamScores] = useState(false);
  const [infractionPresets, setInfractionPresets] = useState(DEFAULT_INFRACTIONS);
  const [assignments, setAssignments] = useState([]);
  const [scoringSettings, setScoringSettings] = useState({ places: [] }); // Load from Settings
  const [expandedEvents, setExpandedEvents] = useState(new Set()); // Track which events are expanded
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);

  const scrollViewRef = useRef(null);
  const formRef = useRef(null);
  const resetConfirmRef = useRef(null);

  const mapInfractionPresets = (infractions) => {
    if (infractions?.items?.length) {
      return infractions.items.map((it) => ({
        id: it.id,
        label: it.label,
        delta: Number(it.delta) || 0,
      }));
    }
    return DEFAULT_INFRACTIONS;
  };

  const loadScoringForDivision = useCallback(async (divisionId) => {
    const [teamsData, scoring, planned] = await Promise.all([
      getTeams(divisionId),
      getScoringSettings(divisionId),
      getPlannedTeams(divisionId),
    ]);
    const effectiveCount = teamsData.length > 0 ? teamsData.length : planned;
    return reconcileScoringWithTeamCount(scoring, effectiveCount);
  }, []);

  const resetTransientUi = useCallback(() => {
    setSelectedEvent(null);
    setShowResultForm(false);
    setShowAllTeamScores(false);
    setExpandedEvents(new Set());
    setShowResetAllConfirm(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!activeDivisionId) return;

    try {
      const [
        teamsData,
        sequence,
        revealed,
        results,
        assignmentsData,
        scoring,
        infractions,
      ] = await Promise.all([
        getTeams(activeDivisionId),
        getEventSequence(activeDivisionId),
        getRevealedIndex(activeDivisionId),
        getEventResults(activeDivisionId),
        loadEventAssignments(activeDivisionId),
        loadScoringForDivision(activeDivisionId),
        getInfractionsSettings(activeDivisionId),
      ]);

      setTeams(teamsData);
      setEventSequence(sequence);
      setRevealedIndex(revealed);
      setEventResults(results);
      setAssignments(assignmentsData);
      if (scoring) setScoringSettings(scoring);
      setInfractionPresets(mapInfractionPresets(infractions));
    } catch (error) {
      console.log('Error loading data:', error);
    }
  }, [activeDivisionId, loadScoringForDivision]);

  // Default scoring table (fallback if Settings not configured)
  const defaultScoringTable = {
    1: 10, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1, 7: 0, 8: -5
  };

  // Convert scoring settings to lookup table
  const getScoringTable = () => {
    if (!scoringSettings.places || scoringSettings.places.length === 0) {
      return defaultScoringTable;
    }
    
    const table = {};
    scoringSettings.places.forEach(({ place, points }) => {
      table[place] = points;
    });
    return table;
  };

  // Load division-scoped data on mount and when division changes
  useEffect(() => {
    if (!activeDivisionId) return;
    resetTransientUi();
    loadData();
  }, [activeDivisionId, loadData, resetTransientUi]);

  // Reload when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (activeDivisionId) {
        loadData();
      }
    });

    return unsubscribe;
  }, [navigation, activeDivisionId, loadData]);

  // Listen for scoring and infractions updates in the active division
  useEffect(() => {
    if (!activeDivisionId) return;

    const handleScoringUpdate = async () => {
      try {
        const reconciled = await loadScoringForDivision(activeDivisionId);
        if (reconciled) setScoringSettings(reconciled);
      } catch {}
    };

    const handleInfractionsUpdate = async () => {
      try {
        const infractions = await getInfractionsSettings(activeDivisionId);
        setInfractionPresets(mapInfractionPresets(infractions));
      } catch {}
    };

    const unsubScoring = eventBus.onForDivision(activeDivisionId, 'settings.scoring.updated', handleScoringUpdate);
    const unsubInfractions = eventBus.onForDivision(activeDivisionId, 'settings.infractions.updated', handleInfractionsUpdate);

    return () => {
      unsubScoring();
      unsubInfractions();
    };
  }, [activeDivisionId, loadScoringForDivision]);

  const persistEventResults = async (newResults) => {
    if (!activeDivisionId) return;
    try {
      await saveEventResultsToStorage(newResults, activeDivisionId);
    } catch (error) {
      console.log('Error saving event results:', error);
    }
  };

  const calculateTeamScores = () => {
    if (!teams.length || !eventResults.length) return [];

    const scoringTable = getScoringTable();

    return teams.map(team => {
      let totalScore = 0;
      let eventCount = 0;

      eventResults.forEach(result => {
        const placement = result.placements.find(p => p.teamId === team.id);
        if (placement) {
          totalScore += scoringTable[placement.place] || 0;
          eventCount++;
        }
        // Apply infractions penalties for this team in this event
        if (Array.isArray(result.infractions)) {
          result.infractions.forEach(entry => {
            if (entry.teamId === team.id) {
              const per = typeof entry.delta === 'number' ? entry.delta : 0;
              const count = Number(entry.count) || 0;
              totalScore += per * count; // delta expected negative
            }
          });
        }
      });

      return {
        ...team,
        totalScore,
        eventCount,
        averageScore: eventCount > 0 ? (totalScore / eventCount).toFixed(1) : 0
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  const handleEventSelection = (event, eventIndex) => {
    if (eventIndex >= revealedIndex) {
      Alert.alert('Event Not Revealed', 'This event has not been revealed yet.');
      return;
    }

    setSelectedEvent({ event, eventIndex });
    setShowResultForm(true);

    setTimeout(() => {
      // scrollIntoView is the most reliable cross-browser approach for web/PWA
      if (formRef.current?.scrollIntoView) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Native fallback
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  const toggleEventExpansion = (eventIndex) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventIndex)) {
        newSet.delete(eventIndex);
      } else {
        newSet.add(eventIndex);
      }
      return newSet;
    });
  };

  const submitEventResult = (resultData) => {
    if (!selectedEvent) return;

    console.log('submitEventResult received data:', resultData);
    console.log('Infractions in resultData:', resultData.infractions);

    const newResult = {
      eventIndex: selectedEvent.eventIndex,
      event: selectedEvent.event,
      placements: resultData.placements,
      infractions: Array.isArray(resultData.infractions) ? resultData.infractions : [],
      timestamp: new Date().toISOString()
    };

    console.log('Final result object:', newResult);

    const filtered = eventResults.filter(r => r.eventIndex !== selectedEvent.eventIndex);
    const newResults = [...filtered, newResult].sort((a,b) => a.eventIndex - b.eventIndex);
    setEventResults(newResults);
    persistEventResults(newResults);
    
    setShowResultForm(false);
    setSelectedEvent(null);
    
    Alert.alert('Success', 'Event result submitted successfully!');
  };

  const resetAllResults = () => {
    console.log('Reset all results clicked');
    setShowResetAllConfirm(true);

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

  const handleResetAllConfirm = async () => {
    console.log('Confirming reset all results');
    try {
      if (activeDivisionId) {
        await clearEventResults(activeDivisionId);
      }
      setEventResults([]);
    } catch (error) {
      console.log('Error resetting results:', error);
    }
    setShowResetAllConfirm(false);
  };

  const handleResetAllCancel = () => {
    console.log('Reset all results cancelled');
    setShowResetAllConfirm(false);
  };

  const getEventStatus = (eventIndex) => {
    if (eventIndex >= revealedIndex) {
      return 'not-revealed';
    }
    
    const hasResult = eventResults.find(r => r.eventIndex === eventIndex);
    return hasResult ? 'completed' : 'pending';
  };

  const getEventStatusColor = (status) => {
    switch (status) {
      case 'completed': return styleTokens.colors.success;
      case 'pending': return styleTokens.colors.warning;
      case 'not-revealed': return styleTokens.colors.disabled;
      default: return styleTokens.colors.disabled;
    }
  };

  const getEventStatusText = (status) => {
    switch (status) {
      case 'completed': return '✓ Completed';
      case 'pending': return '⏳ Pending';
      case 'not-revealed': return '🔒 Locked';
      default: return 'Unknown';
    }
  };

  const getOrdinal = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

  const getAssignedAthletes = (eventIndex) => {
    const assignedAthletes = [];
    teams.forEach(team => {
      const teamAssignment = getTeamAssignmentForEvent(assignments, eventIndex, team.id);
      if (teamAssignment && teamAssignment.athleteIds.length > 0) {
        const athletes = teamAssignment.athleteIds.map(athleteId => {
          const athlete = team.athletes.find(a => a.id === athleteId);
          return athlete ? { 
            ...athlete, 
            teamName: team.name,
            teamColor: team.color || '#666' // Include team color
          } : null;
        }).filter(Boolean);
        assignedAthletes.push(...athletes);
      }
    });
    return assignedAthletes;
  };

  const getAssignmentStatus = (eventIndex) => {
    const assignedCount = teams.reduce((count, team) => {
      const teamAssignment = getTeamAssignmentForEvent(assignments, eventIndex, team.id);
      return count + (teamAssignment && teamAssignment.athleteIds.length > 0 ? 1 : 0);
    }, 0);
    
    if (assignedCount === 0) return { text: 'No athletes assigned', color: styleTokens.colors.disabled };
    if (assignedCount < teams.length) return { text: `${assignedCount}/${teams.length} teams assigned`, color: styleTokens.colors.warning };
    return { text: 'All teams assigned', color: styleTokens.colors.success };
  };

  const teamScores = calculateTeamScores();

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Team Scores Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MobileH2 style={styles.sectionTitle}>Team Scores</MobileH2>
            <View style={styles.scoreToggleContainer}>
              <Pressable
                style={[styles.scoreToggle, showAllTeamScores && styles.scoreToggleEnabled]}
                onPress={() => setShowAllTeamScores(!showAllTeamScores)}
                accessibilityRole="switch"
                accessibilityState={{ checked: showAllTeamScores }}
                accessibilityLabel="Toggle show all team scores"
              >
                <View style={[styles.scoreToggleCircle, showAllTeamScores && styles.scoreToggleCircleEnabled]} />
              </Pressable>
              <MobileCaption style={styles.scoreToggleLabel}>Show all</MobileCaption>
            </View>
          </View>

          {teamScores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MobileH1>No teams or results yet</MobileH1>
              <MobileBody>
                Create teams and enter event results to see scores
              </MobileBody>
            </View>
          ) : (
            <View style={styles.scoreboard}>
              {(showAllTeamScores ? teamScores : teamScores.slice(0, 3)).map((team, index) => (
                <View key={team.id} style={styles.teamScoreRow}>
                  <View style={styles.teamInfo}>
                    <View style={[styles.rankBadge, { backgroundColor: team.color || '#666' }]}>
                      <MobileCaption style={styles.rankText}>#{index + 1}</MobileCaption>
                    </View>
                    <View style={styles.teamDetails}>
                      <MobileH2 style={styles.teamName}>{team.name}</MobileH2>
                    </View>
                  </View>
                  <View style={styles.scoreInfo}>
                    <MobileH2 style={styles.totalScore}>{team.totalScore}</MobileH2>
                  </View>
                </View>
              ))}
              {showAllTeamScores && eventResults.length > 0 && (
                <View style={styles.scoreResetRow}>
                  <ButtonSecondary onPress={resetAllResults}>Reset All</ButtonSecondary>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Event Sequence Section */}
        {eventSequence.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MobileH2 style={styles.sectionTitle}>Event Sequence</MobileH2>
              <MobileCaption style={styles.eventsSubtitle}>
                {revealedIndex} of {eventSequence.length} events revealed
              </MobileCaption>
            </View>
            
            <View style={styles.eventsList}>
              {eventSequence.slice(0, revealedIndex).map((event, index) => {
                const status = getEventStatus(index);
                const statusColor = getEventStatusColor(status);
                const statusText = getEventStatusText(status);
                const assignmentStatus = getAssignmentStatus(index);
                const assignedAthletes = getAssignedAthletes(index);
                const isExpanded = expandedEvents.has(index);
                const hasAssignments = assignedAthletes.length > 0;
                
                return (
                  <View key={index} style={styles.eventContainer}>
                    {/* Event row - now vertical layout */}
                    <View style={styles.eventRowVertical}>
                      {/* Top row: Event number and name */}
                      <View style={styles.eventHeaderRow}>
                        <MobileH2 style={styles.eventNumber}>#{index + 1}</MobileH2>
                        <Text style={styles.eventName} numberOfLines={1}>{event}</Text>
                      </View>
                      
                      {/* Assignment status */}
                      <MobileCaption style={[styles.assignmentStatus, { color: assignmentStatus.color }]}>
                        {assignmentStatus.text}
                      </MobileCaption>
                      
                      {/* Bottom row: Status, button, and athletes toggle */}
                      <View style={styles.eventActionsRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                          <MobileCaption style={styles.statusText}>{statusText}</MobileCaption>
                        </View>
                        
                        {status === 'pending' && (
                          <Pressable 
                            onPress={(e) => {
                              e.stopPropagation();
                              handleEventSelection(event, index);
                            }}
                            style={styles.eventButton}
                          >
                            <Text style={styles.eventButtonText}>ENTER</Text>
                          </Pressable>
                        )}
                        {status === 'completed' && (
                          <Pressable 
                            onPress={(e) => {
                              e.stopPropagation();
                              handleEventSelection(event, index);
                            }}
                            style={styles.eventButton}
                          >
                            <Text style={styles.eventButtonText}>EDIT</Text>
                          </Pressable>
                        )}
                        
                        {/* Athletes toggle button */}
                        {hasAssignments && (
                          <Pressable 
                            style={styles.athletesToggle} 
                            onPress={(e) => {
                              e.stopPropagation();
                              toggleEventExpansion(index);
                            }}
                          >
                            <Text style={styles.athletesToggleLabel}>Athletes</Text>
                            <Text style={styles.athletesToggleCount}>{assignedAthletes.length}</Text>
                            <Text style={[styles.athletesToggleChevron, isExpanded && styles.chevronExpanded]}>
                              ▼
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                    
                    {/* Collapsible assigned athletes */}
                    {hasAssignments && isExpanded && (
                      <View style={styles.assignedAthletes}>
                        <MobileCaption style={styles.assignedAthletesTitle}>Assigned Athletes:</MobileCaption>
                        <View style={styles.athleteChips}>
                          {assignedAthletes.map((athlete, athleteIndex) => (
                            <View 
                              key={`${athlete.id}-${athleteIndex}`} 
                              style={[
                                styles.athleteChip,
                                { backgroundColor: athlete.teamColor || '#666' }
                              ]}
                            >
                              <MobileCaption style={styles.athleteChipText}>
                                {athlete.name} ({athlete.teamName})
                              </MobileCaption>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {showResultForm && selectedEvent && (
          <View ref={formRef}>
            <EventResultForm
              eventName={typeof selectedEvent.event === 'string' ? selectedEvent.event : (selectedEvent.event?.name || 'Event')}
              teams={teams}
              eventIndex={selectedEvent.eventIndex}
              assignments={assignments}
              initialPlacements={eventResults.find(r => r.eventIndex === selectedEvent.eventIndex)?.placements}
              initialInfractions={eventResults.find(r => r.eventIndex === selectedEvent.eventIndex)?.infractions}
              infractionPresets={infractionPresets}
              onSubmit={(data) => submitEventResult(data)}
              onCancel={() => { setShowResultForm(false); setSelectedEvent(null); }}
            />
          </View>
        )}

        {/* Instructions */}
        {eventSequence.length === 0 && (
          <Card style={styles.sectionCard}>
            <MobileH2 style={styles.sectionTitle}>How Scoring Works</MobileH2>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>1</MobileCaption>
              <MobileBody style={styles.instructionText}>
                Generate an event sequence in Race Roulette
              </MobileBody>
            </View>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>2</MobileCaption>
              <MobileBody style={styles.instructionText}>
                Create teams and assign athletes in Assign Teams
              </MobileBody>
            </View>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>3</MobileCaption>
              <MobileBody style={styles.instructionText}>
                Enter results for each completed event
              </MobileBody>
            </View>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>4</MobileCaption>
              <MobileBody style={styles.instructionText}>
                View real-time team rankings and scores
              </MobileBody>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Reset All Results Confirmation Modal */}
      {showResetAllConfirm && (
        <View style={styles.resetModalOverlay}>
          <View ref={resetConfirmRef} style={styles.resetModalContent}>
            <MobileH2 style={styles.resetModalTitle}>Reset All Results</MobileH2>
            <MobileBody style={styles.resetModalMessage}>
              Are you sure you want to clear all event results? This action cannot be undone.
            </MobileBody>
            <View style={styles.resetModalButtons}>
              <Pressable style={styles.resetModalButtonCancel} onPress={handleResetAllCancel}>
                <Text style={styles.resetModalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.resetModalButtonConfirm} onPress={handleResetAllConfirm}>
                <Text style={styles.resetModalButtonTextConfirm}>Reset All</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Event Result Form Component
const EventResultForm = ({ eventName, teams, eventIndex, assignments, onSubmit, onCancel, initialPlacements, initialInfractions = [], infractionPresets = [] }) => {
  const [placements, setPlacements] = useState([]); // [{ place: number, teamId: string|null }]
  const [activePlace, setActivePlace] = useState(1); // 0 will represent DNS tab
  const [dnsTeamIds, setDnsTeamIds] = useState([]); // string[]
  const [infractions, setInfractions] = useState([]); // [{teamId, infractionId, label, delta, count}]
  const [selectedInfractionTeamId, setSelectedInfractionTeamId] = useState(null);
  const [selectedInfractionId, setSelectedInfractionId] = useState(null);
  const [selectedInfractionCount, setSelectedInfractionCount] = useState(1);
  const [infractionsModalOpen, setInfractionsModalOpen] = useState(false);
  const [infractionStep, setInfractionStep] = useState(1); // 1: team, 2: infraction, 3: count

  const shallowEqualPlacements = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].place !== b[i].place || a[i].teamId !== b[i].teamId) return false;
    }
    return true;
  };

  const shallowEqualInfractions = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      if (x.teamId !== y.teamId || x.infractionId !== y.infractionId || x.label !== y.label || Number(x.delta) !== Number(y.delta) || Number(x.count) !== Number(y.count)) return false;
    }
    return true;
  };

  useEffect(() => {
    // Initialize place-based assignments 1..N, optionally prefill from initialPlacements
    const numPlaces = teams.length;
    const base = Array.from({ length: numPlaces }, (_, i) => ({ place: i + 1, teamId: null }));
    
    if (initialPlacements && Array.isArray(initialPlacements)) {
      // Extract DNS teams (teams assigned to the last place)
      const lastPlace = teams.length;
      const dnsTeams = initialPlacements
        .filter(p => Number(p.place) === lastPlace)
        .map(p => p.teamId);
      
      // Extract regular placements (not DNS)
      const regularPlacements = initialPlacements.filter(p => Number(p.place) !== lastPlace);
      
      // Build placements array with regular placements only
      const merged = base.map(b => {
        const found = regularPlacements.find(p => Number(p.place) === b.place);
        return found ? { ...b, teamId: found.teamId } : b;
      });
      
      setPlacements(prev => (shallowEqualPlacements(prev, merged) ? prev : merged));
      
      // Restore DNS teams
      if (dnsTeams.length > 0) {
        setDnsTeamIds(prev => {
          const newDns = [...new Set([...prev, ...dnsTeams])]; // Avoid duplicates
          return prev.length === newDns.length && prev.every(id => newDns.includes(id)) ? prev : newDns;
        });
      }
    } else {
      setPlacements(prev => (shallowEqualPlacements(prev, base) ? prev : base));
    }
  }, [teams, initialPlacements]);

  useEffect(() => {
    console.log('initialInfractions useEffect triggered. initialInfractions:', initialInfractions);
    if (Array.isArray(initialInfractions) && initialInfractions.length > 0) {
      const mapped = initialInfractions.map(e => ({
        teamId: e.teamId,
        infractionId: e.infractionId || e.id || 'custom',
        label: e.label,
        delta: Number(e.delta) || 0,
        count: Number(e.count) || 1,
      }));
      console.log('Setting infractions from initialInfractions. mapped:', mapped);
      setInfractions(prev => (shallowEqualInfractions(prev, mapped) ? prev : mapped));
    } else if (Array.isArray(initialInfractions) && initialInfractions.length === 0) {
      // Only reset to empty if we haven't added any infractions yet (initial load)
      setInfractions(prev => prev.length === 0 ? [] : prev);
      console.log('initialInfractions is empty array, preserving existing infractions if any');
    } else {
      console.log('initialInfractions is not an array, preserving existing infractions');
    }
  }, [initialInfractions]);

  // Auto-populate DNS for teams marked as "not running" (only for new results, not when editing)
  useEffect(() => {
    if (!assignments || eventIndex === undefined || initialPlacements) return;
    
    const notRunningTeamIds = [];
    teams.forEach(team => {
      const teamAssignment = getTeamAssignmentForEvent(assignments, eventIndex, team.id);
      if (teamAssignment && teamAssignment.athleteIds.length === 1 && teamAssignment.athleteIds[0] === 'NOT_RUNNING') {
        notRunningTeamIds.push(team.id);
      }
    });
    
    // Only set DNS if we found "not running" teams and this is a new result (no initialPlacements)
    if (notRunningTeamIds.length > 0) {
      setDnsTeamIds(notRunningTeamIds);
    }
  }, [assignments, eventIndex, teams, initialPlacements]);

  const handleSelectTeamForPlace = (placeNumber, teamId) => {
    setPlacements(prev => prev.map(p => {
      if (p.place === placeNumber) {
        return { ...p, teamId };
      }
      // Ensure uniqueness: remove team from any other place
      if (p.teamId === teamId && p.place !== placeNumber) {
        return { ...p, teamId: null };
      }
      return p;
    }));
    // If team was marked DNS, remove DNS tag on assignment
    setDnsTeamIds(prev => prev.filter(id => id !== teamId));
  };

  

  const handleSubmit = () => {
    const firstMissing = placements.find(p => !p.teamId && !dnsTeamIds.includes(p.teamId));
    const buildAndSubmit = () => {
      // Build result: assigned places + DNS mapped to last place number
      const assigned = placements.filter(p => p.teamId).map(p => ({ teamId: p.teamId, place: p.place }));
      const assignedIds = new Set(assigned.map(a => a.teamId));
      const lastPlace = teams.length; // map DNS to last place index
      const dnsEntries = dnsTeamIds
        .filter(id => !assignedIds.has(id)) // Only DNS teams not already placed
        .map(id => ({ teamId: id, place: lastPlace }));
      const valid = [...assigned, ...dnsEntries];
      
      if (valid.length === 0) {
        Alert.alert('No Placements', 'Please assign at least one placement or cancel.');
        return;
      }
      
      // Ensure a team is not assigned twice
      const teamIds = valid.map(v => v.teamId);
      const uniqueTeamIds = new Set(teamIds);
      
      if (uniqueTeamIds.size !== teamIds.length) {
        // Debug: Find duplicate teams
        const duplicates = teamIds.filter((id, index) => teamIds.indexOf(id) !== index);
        console.log('Duplicate team assignments detected:', duplicates);
        console.log('Assigned placements:', assigned);
        console.log('DNS entries:', dnsEntries);
        Alert.alert('Error', `Each team can only be assigned one placement. Duplicate assignments found for: ${duplicates.join(', ')}`);
        return;
      }
      
      console.log('Submitting result with infractions:', infractions);
      onSubmit({ placements: valid, infractions });
    };

    // Check if all teams are assigned (either to a place or DNS)
    const placedTeamIds = new Set(placements.filter(p => p.teamId).map(p => p.teamId));
    const dnsTeamIds_set = new Set(dnsTeamIds);
    const unassignedTeams = teams.filter(team => 
      !placedTeamIds.has(team.id) && !dnsTeamIds_set.has(team.id)
    );
    
    if (unassignedTeams.length > 0) {
      // compute first missing place index for focus
      const missingPlace = placements.find(p => !p.teamId)?.place || 1;
      Alert.alert(
        'Incomplete Results',
        `${unassignedTeams.length} team(s) not assigned: ${unassignedTeams.map(t => t.name).join(', ')}. Assign missing places, mark missing as DNS, or submit anyway?`,
        [
          { text: 'Assign Missing', onPress: () => setActivePlace(missingPlace) },
          { text: 'Mark Missing as DNS', onPress: () => {
              const currentDns = new Set(dnsTeamIds);
              unassignedTeams.forEach(team => {
                currentDns.add(team.id);
              });
              setDnsTeamIds(Array.from(currentDns));
              buildAndSubmit();
            }
          },
          { text: 'Submit Anyway', style: 'destructive', onPress: buildAndSubmit }
        ]
      );
      return;
    }
    // All teams assigned: submit results
    buildAndSubmit();
  };

  const addInfractionEntry = () => {
    if (!selectedInfractionTeamId || !selectedInfractionId) return;
    const preset = infractionPresets.find(p => p.id === selectedInfractionId);
    const delta = preset ? Number(preset.delta) || 0 : 0;
    const label = preset ? preset.label : 'Infraction';
    const count = Math.max(1, Number(selectedInfractionCount) || 1);
    const newInfraction = { teamId: selectedInfractionTeamId, infractionId: selectedInfractionId, label, delta, count };
    
    console.log('Adding infraction:', newInfraction);
    setInfractions(prev => {
      const updated = [...prev, newInfraction];
      console.log('Updated infractions state:', updated);
      return updated;
    });
    setSelectedInfractionCount(1);
  };

  const removeInfractionEntry = (index) => {
    setInfractions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card style={styles.resultFormContainer}>
      <MobileH2 style={styles.formTitle}>Enter Results: {eventName}</MobileH2>

      {/* Place selector (category-style pills) */}
      <View style={styles.placeSelectorRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.placeSelectorPills}>
            {placements.map(p => (
              <Pressable
                key={p.place}
                style={[styles.placePill, activePlace === p.place && styles.placePillActive]}
                onPress={() => setActivePlace(p.place)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${p.place} place`}
              >
                <MobileCaption style={[styles.placePillText, activePlace === p.place && styles.placePillTextActive]}>
                  {`${p.place}${p.place === 1 ? 'st' : p.place === 2 ? 'nd' : p.place === 3 ? 'rd' : 'th'}`}
                </MobileCaption>
              </Pressable>
            ))}
            <Pressable
              key={'dns'}
              style={[styles.placePill, activePlace === 0 && styles.placePillActive]}
              onPress={() => setActivePlace(0)}
              accessibilityRole="button"
              accessibilityLabel="Select DNS"
            >
              <MobileCaption style={[styles.placePillText, activePlace === 0 && styles.placePillTextActive]}>DNS</MobileCaption>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {activePlace !== 0 ? (
        <>
          <View style={styles.activePlaceHeader}>
            <MobileBody style={styles.activePlaceLabel}>{`${activePlace}${activePlace === 1 ? 'st' : activePlace === 2 ? 'nd' : activePlace === 3 ? 'rd' : 'th'} Place`}</MobileBody>
          </View>
          <View style={styles.teamList}>
            {teams.map((team) => {
              const current = placements.find(pp => pp.place === activePlace);
              const isSelected = current?.teamId === team.id;
              const existing = placements.find(pp => pp.teamId === team.id);
              const assignedElsewhere = !!existing && existing.place !== activePlace;
              const isDns = dnsTeamIds.includes(team.id);
              const disabled = assignedElsewhere || isDns;

              const onPress = () => {
                if (disabled) return;
                if (assignedElsewhere) {
                  const fromPlace = existing.place;
                  const currentPlaceTeamId = current?.teamId || null;
                  if (currentPlaceTeamId && currentPlaceTeamId !== team.id) {
                    Alert.alert(
                      'Swap Teams?',
                      `Swap ${team.name} (${fromPlace}) with ${teams.find(t => t.id === currentPlaceTeamId)?.name} (${activePlace})?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Swap', onPress: () => {
                          setPlacements(prev => prev.map(p => {
                            if (p.place === activePlace) return { ...p, teamId: team.id };
                            if (p.place === fromPlace) return { ...p, teamId: currentPlaceTeamId };
                            return p;
                          }));
                          setDnsTeamIds(prev => prev.filter(id => id !== team.id));
                        }}
                      ]
                    );
                  } else {
                    Alert.alert(
                      'Move Team?',
                      `${team.name} is currently ${fromPlace}. Move to ${activePlace}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Move', onPress: () => {
                          setPlacements(prev => prev.map(p => {
                            if (p.place === activePlace) return { ...p, teamId: team.id };
                            if (p.place === fromPlace) return { ...p, teamId: null };
                            return p;
                          }));
                          setDnsTeamIds(prev => prev.filter(id => id !== team.id));
                        }}
                      ]
                    );
                  }
                } else {
                  setPlacements(prev => prev.map(p => p.place === activePlace ? { ...p, teamId: team.id } : p));
                  setDnsTeamIds(prev => prev.filter(id => id !== team.id));
                }
              };

              // Debug logging to help identify the issue
              console.log(`Team ${team.name}: assignedElsewhere=${assignedElsewhere}, isDns=${isDns}, existing=${JSON.stringify(existing)}, disabled=${disabled}`);

              return (
                <View key={team.id} style={[styles.teamRow, isSelected && styles.teamRowSelected, disabled && styles.teamRowDisabled]}>
                  <Pressable style={styles.teamRowContent} onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={`Assign ${team.name} to ${activePlace} place`}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]} />
                    <View style={[styles.teamColorDot, { backgroundColor: team.color || '#666' }]} />
                    <MobileBody style={styles.teamRowName}>{team.name}</MobileBody>
                    {assignedElsewhere && (
                      <View style={styles.assignedBadge}>
                        <MobileCaption style={styles.assignedBadgeText}>{existing.place}</MobileCaption>
                      </View>
                    )}
                    {isDns && (
                      <View style={styles.assignedBadge}>
                        <MobileCaption style={styles.assignedBadgeText}>DNS</MobileCaption>
                      </View>
                    )}
                  </Pressable>
                  {(assignedElsewhere || isDns) && (
                    <Pressable 
                      style={styles.clearButton} 
                      onPress={() => {
                        console.log(`Clearing team ${team.name}: assignedElsewhere=${assignedElsewhere}, isDns=${isDns}`);
                        if (assignedElsewhere) {
                          // Clear team from their current placement
                          setPlacements(prev => prev.map(p => 
                            p.place === existing.place ? { ...p, teamId: null } : p
                          ));
                        }
                        if (isDns) {
                          // Remove team from DNS
                          setDnsTeamIds(prev => prev.filter(id => id !== team.id));
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Clear ${team.name} from current placement`}
                    >
                      <MobileCaption style={styles.clearButtonText}>Clear</MobileCaption>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <View style={styles.activePlaceHeader}>
            <MobileBody style={styles.activePlaceLabel}>DNS (Did Not Start)</MobileBody>
          </View>
          <View style={styles.teamList}>
            {teams.map(team => {
              const isDns = dnsTeamIds.includes(team.id);
              const placed = placements.find(p => p.teamId === team.id);
              const disabled = !!placed; // cannot mark DNS if already placed
              return (
                <Pressable key={`dns-${team.id}`} style={[styles.teamRow, isDns && styles.teamRowSelected, disabled && styles.teamRowDisabled]} onPress={() => {
                  if (disabled) return;
                  setDnsTeamIds(prev => isDns ? prev.filter(id => id !== team.id) : [...prev, team.id]);
                }} accessibilityRole="checkbox" accessibilityState={{ checked: isDns, disabled }} accessibilityLabel={`Toggle DNS for ${team.name}`}>
                  <View style={[styles.checkbox, isDns && styles.checkboxChecked]} />
                  <View style={[styles.teamColorDot, { backgroundColor: team.color || '#666' }]} />
                  <MobileBody style={styles.teamRowName}>{team.name}</MobileBody>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.formButtons}>
            <ButtonSecondary onPress={() => {
              const placedIds = new Set(placements.filter(p => p.teamId).map(p => p.teamId));
              const all = teams.map(t => t.id).filter(id => !placedIds.has(id));
              setDnsTeamIds(all);
            }}>Mark Remaining as DNS</ButtonSecondary>
          </View>
        </>
      )}

      {/* Infractions entry trigger */}
      <View style={styles.infractionsSection}>
        <ButtonSecondary onPress={() => { setSelectedInfractionTeamId(null); setSelectedInfractionId(null); setSelectedInfractionCount(1); setInfractionStep(1); setInfractionsModalOpen(true); }}>Infractions</ButtonSecondary>
        {console.log('Rendering infractions section. infractions.length:', infractions.length, 'infractions:', infractions)}
        {infractions.length > 0 && (
          <View style={styles.infractionList}>
            {console.log('Rendering infraction list with', infractions.length, 'infractions')}
            {infractions.map((inf, idx) => (
              <View key={`inf-row-${idx}`} style={styles.infractionRow}>
                <MobileBody style={styles.infractionRowText}>{teams.find(t => t.id === inf.teamId)?.name || 'Team'} — {inf.label} ×{inf.count} ({inf.delta} each)</MobileBody>
                <ButtonSecondary onPress={() => removeInfractionEntry(idx)}>Undo</ButtonSecondary>
          </View>
        ))}
          </View>
        )}
      </View>

      {/* Infractions modal */}
      <Modal visible={infractionsModalOpen} animationType="slide" transparent onRequestClose={() => setInfractionsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header with step indicator and back */}
            <View style={styles.modalHeader}>
              {infractionStep > 1 ? (
                <Pressable onPress={() => {
                  if (infractionStep === 3) setInfractionStep(2);
                  else if (infractionStep === 2) setInfractionStep(1);
                }} accessibilityRole="button">
                  <MobileCaption style={styles.backText}>{'‹ Back'}</MobileCaption>
                </Pressable>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <MobileCaption style={styles.stepText}>
                {infractionStep === 1 ? 'Select Team' : infractionStep === 2 ? 'Select Infraction' : 'Select Count'}
              </MobileCaption>
              <View style={{ width: 40 }} />
            </View>

            {/* Content area */}
            <View style={styles.modalContent}>
              {infractionStep === 1 && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.infractionChipsRowWrap}>
                    {teams.map(team => (
                      <Pressable key={`inf-team-${team.id}`} style={[styles.placeChip, selectedInfractionTeamId === team.id && styles.placeChipActive]} onPress={() => { setSelectedInfractionTeamId(team.id); setSelectedInfractionId(null); setInfractionStep(2); }}>
                        <MobileCaption style={[styles.placeChipText, selectedInfractionTeamId === team.id && styles.placeChipTextActive]}>{team.name}</MobileCaption>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}

              {infractionStep === 2 && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.infractionChipsRowWrap}>
                    {infractionPresets.map(p => (
                      <Pressable key={`inf-id-${p.id}`} style={[styles.placeChip, selectedInfractionId === p.id && styles.placeChipActive]} onPress={() => { setSelectedInfractionId(p.id); setInfractionStep(3); }}>
                        <MobileCaption style={[styles.placeChipText, selectedInfractionId === p.id && styles.placeChipTextActive]}>{p.label}</MobileCaption>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}

              {infractionStep === 3 && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Compact summary of current selections */}
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryChip}>
                      <MobileCaption style={styles.summaryChipText}>Team</MobileCaption>
                      <MobileBody style={styles.summaryChipValue}>{teams.find(t => t.id === selectedInfractionTeamId)?.name || '-'}</MobileBody>
                    </View>
                    <View style={styles.summaryChip}>
                      <MobileCaption style={styles.summaryChipText}>Infraction</MobileCaption>
                      <MobileBody style={styles.summaryChipValue}>{infractionPresets.find(p => p.id === selectedInfractionId)?.label || '-'}</MobileBody>
                    </View>
                    <View style={styles.summaryChip}>
                      <MobileCaption style={styles.summaryChipText}>Per</MobileCaption>
                      <MobileBody style={styles.summaryChipValue}>{String(infractionPresets.find(p => p.id === selectedInfractionId)?.delta ?? 0)}</MobileBody>
                    </View>
                  </View>

                  {/* Count Selection Section */}
                  <View style={styles.countSelectionSection}>
                    
                    {/* Vertical Stepper with better styling */}
                    <View style={styles.stepperContainer}>
                      <Pressable style={styles.stepperBtnImproved} onPress={() => setSelectedInfractionCount(c => Math.min(99, (c || 1) + 1))}>
                        <MobileBody style={styles.stepperBtnTextImproved}>+</MobileBody>
                      </Pressable>
                      <View style={styles.countDisplay}>
                        <MobileH2 style={styles.countNumber}>{String(selectedInfractionCount)}</MobileH2>
                      </View>
                      <Pressable style={styles.stepperBtnImproved} onPress={() => setSelectedInfractionCount(c => Math.max(1, (c || 1) - 1))}>
                        <MobileBody style={styles.stepperBtnTextImproved}>−</MobileBody>
                      </Pressable>
                    </View>
                    
                    {/* Quick select chips */}
                    <View style={styles.quickSelectRow}>
                      <MobileCaption style={styles.quickSelectLabel}>Quick select:</MobileCaption>
                      <View style={styles.countChipsRow}>
                        {[1,2,3,4,5].map(n => (
                          <Pressable key={`cnt-${n}`} style={[styles.countChipImproved, selectedInfractionCount === n && styles.countChipImprovedActive]} onPress={() => setSelectedInfractionCount(n)}>
                            <MobileCaption style={[styles.countChipTextImproved, selectedInfractionCount === n && styles.countChipTextImprovedActive]}>{n}</MobileCaption>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <ButtonSecondary style={[styles.modalBtn, styles.modalButtonUniform]} onPress={() => { setInfractionsModalOpen(false); }}>
                Close
              </ButtonSecondary>
              <ButtonPrimary style={[styles.modalBtn, styles.modalButtonUniform]} onPress={() => { addInfractionEntry(); setInfractionsModalOpen(false); setSelectedInfractionTeamId(null); setSelectedInfractionId(null); setSelectedInfractionCount(1); setInfractionStep(1); }} disabled={!(selectedInfractionTeamId && selectedInfractionId && infractionStep===3)}>
                Add
              </ButtonPrimary>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.formButtons}>
        <ButtonSecondary onPress={onCancel}>
          Cancel
        </ButtonSecondary>
        <ButtonPrimary onPress={handleSubmit}>
          Submit Results
        </ButtonPrimary>
      </View>
    </Card>
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
    gap: scale(16),
  },
  sectionCard: {
    padding: scale(20),
    borderRadius: scale(12),
    shadowColor: styleTokens.colors.shadow,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: scale(8),
    elevation: 3,
    marginBottom: scale(16),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
    flexWrap: 'wrap',
    gap: scale(12),
  },
  sectionTitle: {
    color: styleTokens.colors.textPrimary,
    textAlign: 'left',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: scale(40),
  },
  emptyText: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  emptySubtext: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  scoreboard: {
    gap: scale(16),
  },
  scoreToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  scoreToggleLabel: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.9,
  },
  scoreToggle: {
    width: scale(40),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    backgroundColor: 'rgba(159, 167, 174, 0.3)',
    paddingHorizontal: scale(2),
  },
  scoreToggleEnabled: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
    alignItems: 'flex-end',
  },
  scoreToggleCircle: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  scoreToggleCircleEnabled: {
    backgroundColor: styleTokens.colors.white,
  },
  scoreToggleRow: {
    alignItems: 'center',
    marginTop: scale(8),
  },
  teamScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    backgroundColor: styleTokens.components.card.backgroundColor,
    borderRadius: styleTokens.components.card.borderRadius,
    borderWidth: styleTokens.components.card.borderWidth,
    borderColor: styleTokens.components.card.borderColor,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    backgroundColor: styleTokens.colors.primary,
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(16),
  },
  rankText: {
    color: styleTokens.colors.white,
    fontWeight: 'bold',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(4),
  },
  teamStats: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.7,
  },
  scoreInfo: {
    alignItems: 'flex-end',
  },
  totalScore: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(4),
  },
  averageScore: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.7,
  },
  eventsSubtitle: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.7,
  },
  eventsList: {
    gap: scale(16),
  },
  eventContainer: {
    backgroundColor: styleTokens.components.card.backgroundColor,
    borderRadius: styleTokens.components.card.borderRadius,
    borderWidth: styleTokens.components.card.borderWidth,
    borderColor: styleTokens.components.card.borderColor,
    overflow: 'hidden',
    marginBottom: scale(12),
  },
  eventRowVertical: {
    padding: scale(12),
    gap: scale(8),
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flexWrap: 'nowrap',
  },
  eventNumber: {
    color: styleTokens.colors.primary,
    fontSize: scale(16),
    fontWeight: 'bold',
    flexShrink: 0,
    minWidth: scale(35),
  },
  eventName: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '700',
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  assignmentStatus: {
    fontSize: scale(10),
    marginBottom: scale(2),
  },
  eventActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flexWrap: 'wrap',
  },
  athletesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: scale(5),
    backgroundColor: 'rgba(100, 226, 211, 0.15)',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    gap: scale(4),
    flexShrink: 0,
  },
  athletesToggleLabel: {
    color: styleTokens.colors.white,
    fontSize: scale(9),
    fontWeight: '600',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  athletesToggleCount: {
    color: styleTokens.colors.white,
    fontSize: scale(9),
    fontWeight: '700',
  },
  athletesToggleChevron: {
    color: styleTokens.colors.white,
    fontSize: scale(7),
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  assignedAthletes: {
    padding: scale(16),
    paddingTop: scale(8),
    borderTopWidth: 1,
    borderTopColor: styleTokens.colors.border,
    backgroundColor: styleTokens.colors.backgroundLight,
  },
  assignedAthletesTitle: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
    fontWeight: '600',
  },
  athleteChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  athleteChip: {
    backgroundColor: styleTokens.colors.primaryLight,
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: styleTokens.colors.primary,
  },
  athleteChipText: {
    color: styleTokens.colors.white,
    fontSize: scale(9),
    fontWeight: '600',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    textTransform: 'none',
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    minWidth: scale(70),
    alignItems: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  statusText: {
    color: styleTokens.colors.white,
    fontWeight: 'bold',
    fontSize: scale(9),
  },
  resultFormContainer: {
    backgroundColor: styleTokens.components.card.backgroundColor,
    padding: scale(20),
    borderRadius: scale(12),
    borderWidth: styleTokens.components.card.borderWidth,
    borderColor: styleTokens.components.card.borderColor,
    ...styleTokens.shadows.sm,
    marginBottom: scale(16),
  },
  formTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(16),
    textAlign: 'left',
  },
  placeSelectorRow: {
    marginBottom: scale(12),
  },
  placeSelectorPills: {
    flexDirection: 'row',
    gap: scale(6),
  },
  placePill: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    borderRadius: scale(10),
  },
  placePillActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  placePillText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  placePillTextActive: {
    color: styleTokens.colors.white,
  },
  formSubTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(8),
    textAlign: 'left',
  },
  infractionsSection: {
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  infractionsPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(8),
  },
  infractionPickerCol: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: scale(160),
  },
  infractionCountCol: {
    flexGrow: 1,
    flexBasis: '20%',
    minWidth: scale(120),
    alignItems: 'flex-start',
  },
  infractionAddCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minWidth: scale(100),
  },
  infractionChipsRow: {
    flexDirection: 'row',
    gap: scale(6),
    alignItems: 'center',
  },
  infractionList: {
    gap: scale(8),
  },
  infractionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(8),
  },
  infractionRowText: {
    color: styleTokens.colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(8),
  },
  summaryChip: {
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: styleTokens.components.card.borderColor,
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    minWidth: scale(100),
  },
  summaryChipText: {
    color: styleTokens.colors.textSecondary,
  },
  summaryChipValue: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  stepperBtnLg: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(8),
    backgroundColor: styleTokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: scale(8),
  },
  countSelectionSection: {
    marginTop: scale(20),
    marginBottom: scale(24),
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  countSectionLabel: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(16),
    fontWeight: '600',
    marginBottom: scale(16),
    textAlign: 'center',
  },
  stepperContainer: {
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(16),
  },
  stepperBtnImproved: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: styleTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...styleTokens.shadows.sm,
  },
  stepperBtnTextImproved: {
    color: styleTokens.colors.white,
    fontSize: scale(20),
    fontWeight: 'bold',
  },
  countDisplay: {
    backgroundColor: styleTokens.colors.white,
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    minWidth: scale(80),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: styleTokens.colors.primary,
    ...styleTokens.shadows.md,
  },
  countNumber: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(24),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickSelectRow: {
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(16),
  },
  quickSelectLabel: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(14),
    marginBottom: scale(8),
  },
  countChipImproved: {
    backgroundColor: styleTokens.colors.backgroundLight,
    borderWidth: 1,
    borderColor: styleTokens.colors.border,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(16),
    minWidth: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChipImprovedActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  countChipTextImproved: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '600',
  },
  countChipTextImprovedActive: {
    color: styleTokens.colors.white,
  },
  stepperValueLg: {
    minWidth: scale(44),
    textAlign: 'center',
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  countChipsRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginTop: scale(8),
  },
  countChip: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    borderRadius: scale(10),
  },
  countChipActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  countChipText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  countChipTextActive: {
    color: styleTokens.colors.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
  },
  modalCard: {
    width: '100%',
    maxWidth: scale(480),
    maxHeight: '88%',
    backgroundColor: '#2a2a2a',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    padding: scale(16),
    ...styleTokens.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  backText: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(14),
    fontWeight: '500',
  },
  stepText: {
    color: styleTokens.colors.textSecondary,
  },
  modalContent: {
    flexShrink: 1,
    paddingBottom: scale(8),
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(20),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  infractionChipsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  activePlaceHeader: {
    marginBottom: scale(8),
  },
  placementsList: {
    gap: scale(12),
    marginBottom: scale(16),
  },
  placementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(12),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(8),
  },
  placeLabel: {
    color: styleTokens.colors.textPrimary,
    marginRight: scale(8),
    minWidth: scale(90),
  },
  placePickerRow: {
    flexGrow: 0,
  },
  teamList: {
    gap: scale(8),
    marginBottom: scale(12),
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(8),
    gap: scale(12),
  },
  teamRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: scale(12),
  },
  clearButton: {
    backgroundColor: styleTokens.colors.danger,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    marginLeft: scale(8),
  },
  clearButtonText: {
    color: styleTokens.colors.white,
    fontSize: scale(11),
    fontWeight: '600',
  },
  teamColorDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
  },
  teamRowSelected: {
    borderWidth: 2,
    borderColor: styleTokens.colors.primary,
  },
  teamRowDisabled: {
    opacity: 0.5,
  },
  radio: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    borderWidth: 2,
    borderColor: styleTokens.colors.primary,
    marginRight: scale(12),
    backgroundColor: 'transparent',
  },
  radioSelected: {
    backgroundColor: styleTokens.colors.primary,
  },
  teamRowName: {
    color: styleTokens.colors.textPrimary,
    flex: 1,
  },
  assignedBadge: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(10),
  },
  assignedBadgeText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  checkbox: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(4),
    borderWidth: 2,
    borderColor: styleTokens.colors.primary,
    marginRight: scale(12),
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: styleTokens.colors.primary,
  },
  placeChip: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    marginLeft: scale(8),
  },
  placeChipActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  placeChipDisabled: {
    opacity: 0.5,
  },
  placeChipText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  placeChipTextActive: {
    color: styleTokens.colors.white,
  },
  placeChipTextDisabled: {
    color: styleTokens.colors.textPrimary,
  },
  formButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(12),
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    flex: 1,
    minWidth: scale(100),
    maxWidth: scale(160),
  },
  modalButtonUniform: {
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    height: scale(44),
    borderRadius: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(16),
    textAlign: 'left',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  instructionNumber: {
    backgroundColor: styleTokens.colors.primary,
    color: styleTokens.colors.white,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    textAlign: 'center',
    lineHeight: scale(24),
    fontSize: scale(14),
    fontWeight: 'bold',
    marginRight: scale(12),
    marginTop: scale(2),
  },
  instructionText: {
    flex: 1,
    fontSize: scale(14),
    color: styleTokens.colors.textSecondary,
    lineHeight: scale(20),
  },
  eventButton: {
    minWidth: scale(50),
    maxWidth: scale(60),
    paddingHorizontal: scale(6),
    paddingVertical: scale(5),
    backgroundColor: styleTokens.colors.primaryDark,
    borderRadius: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventButtonText: {
    fontSize: scale(9),
    color: styleTokens.colors.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: scale(0.3),
    fontFamily: styleTokens.typography.fonts.roboto || 'System',
  },
  scoreResetRow: {
    marginTop: scale(16),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: styleTokens.colors.border,
    alignItems: 'center',
  },
  resetModalOverlay: {
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
  resetModalContent: {
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderRadius: scale(12),
    padding: scale(24),
    width: '90%',
    maxWidth: scale(400),
    borderWidth: 2,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    ...styleTokens.shadows.lg,
  },
  resetModalTitle: {
    color: styleTokens.colors.white,
    marginBottom: scale(16),
    textAlign: 'center',
    fontWeight: '700',
  },
  resetModalMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: scale(24),
    textAlign: 'center',
    lineHeight: scale(20),
  },
  resetModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  resetModalButtonCancel: {
    flex: 1,
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  resetModalButtonConfirm: {
    flex: 1,
    backgroundColor: styleTokens.colors.error || '#e74c3c',
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  resetModalButtonTextCancel: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  resetModalButtonTextConfirm: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
});

export default ScoreboardScreen; 