import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Pressable,
  Text
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { ButtonPrimary, ButtonSecondary } from '../components';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import {
  loadEventAssignments,
  setAssignmentForEvent,
  getUsedAthleteIdsExcludingEvent,
  isRelayEvent,
  getRelayAthleteCount,
  getTeamAssignmentForEvent,
  preserveLanesByTeam
} from '../lib/eventAssignments';

const AssignRunnersScreen = ({ route, navigation }) => {
  const { eventIndex, eventName } = route.params;
  
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamSelections, setTeamSelections] = useState({}); // {teamId: [athleteIds]}
  const [usedAthleteIds, setUsedAthleteIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [genderFilter, setGenderFilter] = useState('mixed'); // 'mixed', 'male', 'female'

  const isRelay = isRelayEvent(eventName);
  const requiredAthletes = isRelay ? getRelayAthleteCount(eventName) : 1;

  useEffect(() => {
    console.log('AssignRunnersScreen mounted');
    console.log('showCancelConfirm:', showCancelConfirm);
    console.log('showIncompleteConfirm:', showIncompleteConfirm);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load teams
      const savedTeams = await AsyncStorage.getItem('teams');
      const teamsData = savedTeams ? JSON.parse(savedTeams) : [];
      setTeams(teamsData);
      
      // Load assignments
      const assignmentsData = await loadEventAssignments();
      setAssignments(assignmentsData);
      
      // Get used athletes excluding this event (one-and-done enforcement)
      const usedIds = getUsedAthleteIdsExcludingEvent(assignmentsData, eventIndex);
      setUsedAthleteIds(usedIds);
      
      // Load existing selections for this event
      const existingSelections = {};
      teamsData.forEach(team => {
        const teamAssignment = getTeamAssignmentForEvent(assignmentsData, eventIndex, team.id);
        if (teamAssignment) {
          existingSelections[team.id] = teamAssignment.athleteIds;
        } else {
          existingSelections[team.id] = [];
        }
      });
      
      setTeamSelections(existingSelections);
      
      // Select first team by default
      if (teamsData.length > 0) {
        setSelectedTeamId(teamsData[0].id);
      }
      
    } catch (error) {
      console.log('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableAthletes = (team) => {
    let athletes = team.athletes;
    
    // Apply gender filter
    if (genderFilter === 'male') {
      athletes = athletes.filter(a => a.gender === 'Male');
    } else if (genderFilter === 'female') {
      athletes = athletes.filter(a => a.gender === 'Female');
    }
    
    return athletes;
  };

  const handleAthleteToggle = (teamId, athleteId) => {
    // Don't allow toggling used athletes (unless they're currently selected for this event)
    const isCurrentlySelected = (teamSelections[teamId] || []).includes(athleteId);
    const isUsedElsewhere = usedAthleteIds.includes(athleteId) && !isCurrentlySelected;
    
    if (isUsedElsewhere) {
      return; // Don't allow selection of used athletes
    }
    
    setTeamSelections(prev => {
      const currentSelections = prev[teamId] || [];
      const isSelected = currentSelections.includes(athleteId);
      
      let newSelections;
      if (isSelected) {
        // Remove athlete
        newSelections = currentSelections.filter(id => id !== athleteId);
      } else {
        // Add athlete
        if (currentSelections.length >= requiredAthletes) {
          // Replace first athlete if at limit
          newSelections = [athleteId, ...currentSelections.slice(1)];
        } else {
          newSelections = [...currentSelections, athleteId];
        }
      }
      
      return { ...prev, [teamId]: newSelections };
    });
  };

  const getUsedAthletesForTeam = (team) => {
    if (!team) return 0;
    return team.athletes.filter(athlete => usedAthleteIds.includes(athlete.id)).length;
  };

  const handleTeamNotRunning = (teamId) => {
    setTeamSelections(prev => {
      const currentState = prev[teamId] || [];
      const isCurrentlyNotRunning = currentState.length === 1 && currentState[0] === 'NOT_RUNNING';
      
      if (isCurrentlyNotRunning) {
        // Undo "not running" - clear the selection so they can select athletes
        return { ...prev, [teamId]: [] };
      } else {
        // Set to "not running"
        return { ...prev, [teamId]: ['NOT_RUNNING'] };
      }
    });
  };

  const isTeamNotRunning = (teamId) => {
    const selections = teamSelections[teamId] || [];
    return selections.length === 1 && selections[0] === 'NOT_RUNNING';
  };

  const getSelectionStatus = (teamId) => {
    const selections = teamSelections[teamId] || [];
    const required = requiredAthletes;
    
    // Check if team is not running
    if (isTeamNotRunning(teamId)) {
      return { status: 'not-running', color: styleTokens.colors.textSecondary };
    }
    
    if (selections.length === 0) return { status: 'empty', color: styleTokens.colors.disabled };
    if (selections.length < required) return { status: 'partial', color: styleTokens.colors.primary };
    return { status: 'complete', color: styleTokens.colors.success };
  };

  const canSave = () => {
    // Don't allow save while loading or if no teams
    if (isLoading || teams.length === 0) {
      return false;
    }
    
    return teams.every(team => {
      const selections = teamSelections[team.id] || [];
      
      // Team is "not running" - this counts as complete
      if (isTeamNotRunning(team.id)) {
        return true;
      }
      
      // Team is running - check if they have the required number of athletes
      return selections.length === requiredAthletes;
    });
  };

  const getIncompleteTeams = () => {
    return teams.filter(team => {
      const selections = teamSelections[team.id] || [];
      
      // Skip teams that are "not running" - they're considered complete
      if (isTeamNotRunning(team.id)) {
        return false;
      }
      
      // Check if running teams have the required number of athletes
      return selections.length < requiredAthletes;
    });
  };

  const handleSave = async () => {
    console.log('handleSave called');
    const incompleteTeams = getIncompleteTeams();
    console.log('Incomplete teams:', incompleteTeams);
    
    if (incompleteTeams.length > 0) {
      console.log('Showing incomplete confirmation modal');
      setShowIncompleteConfirm(true);
      return;
    }
    
    console.log('Calling saveAssignments');
    saveAssignments();
  };

  const saveAssignments = async () => {
    console.log('saveAssignments called');
    try {
      setIsSaving(true);
      console.log('isSaving set to true');
      
      // Convert selections to assignment format, including "not running" teams
      const teamAssignments = teams.map(team => ({
        teamId: team.id,
        athleteIds: teamSelections[team.id] || []
      })).filter(ta => ta.athleteIds.length > 0); // Save teams with athletes OR "not running" marker
      
      console.log('Team assignments:', teamAssignments);

      // Preserve lane assignments when editing athletes.
      // Each team's lane number stays the same; only the athlete name is refreshed.
      const existingEventRecord = assignments.find(a => a.eventIndex === eventIndex);
      let lanesToSave = null;
      if (existingEventRecord?.laneAssignments?.length > 0) {
        lanesToSave = preserveLanesByTeam(
          existingEventRecord.laneAssignments,
          teamAssignments,
          teams,
          isRelay
        );
      }
      
      // Save assignments
      console.log('Calling setAssignmentForEvent...');
      const updatedAssignments = await setAssignmentForEvent(
        assignments, 
        eventIndex, 
        eventName, 
        isRelay, 
        teamAssignments,
        lanesToSave
      );
      
      console.log('setAssignmentForEvent completed');
      
      if (updatedAssignments === assignments) {
        console.log('Failed to save - assignments unchanged');
        alert('Error: Failed to save assignments. Please try again.');
        return;
      }
      
      // Successfully saved - signal Race Roulette to auto-open lane modal
      await AsyncStorage.setItem('pendingLaneEventIndex', String(eventIndex));

      // Use a small delay to ensure state is saved before navigation
      setTimeout(() => {
        console.log('Navigating to RaceRoulette');
        navigation.navigate('RaceRoulette');
      }, 100);
      
    } catch (error) {
      console.log('Error saving assignments:', error);
      alert('Error: Failed to save assignments. Please try again.');
    } finally {
      console.log('Setting isSaving to false');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    navigation.goBack();
  };

  const handleCancelStay = () => {
    setShowCancelConfirm(false);
  };

  const handleIncompleteSaveAnyway = () => {
    setShowIncompleteConfirm(false);
    saveAssignments();
  };

  const handleIncompleteCancel = () => {
    setShowIncompleteConfirm(false);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <MobileH2>Loading...</MobileH2>
        </View>
      </View>
    );
  }

  if (teams.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyCard}>
          <MobileH2>No Teams Found</MobileH2>
          <MobileBody>Please create teams first in the Assign Teams screen.</MobileBody>
          <ButtonPrimary onPress={() => navigation.goBack()}>Go Back</ButtonPrimary>
        </Card>
      </View>
    );
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const availableAthletes = selectedTeam ? getAvailableAthletes(selectedTeam) : [];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        
        {/* Header */}
        <Card style={styles.headerCard}>
          <MobileH1 style={styles.eventTitle}>{eventName}</MobileH1>
          <MobileBody style={styles.eventSubtitle}>
            {isRelay ? `Select ${requiredAthletes} athletes per team` : 'Select 1 athlete per team'}
          </MobileBody>
          
          {/* Gender Filter */}
          <View style={styles.genderFilterContainer}>
            <MobileCaption style={styles.genderFilterLabel}>Gender Filter:</MobileCaption>
            <View style={styles.genderFilterButtons}>
              {[
                { value: 'mixed', label: 'Mixed' },
                { value: 'male', label: 'Male Only' },
                { value: 'female', label: 'Female Only' }
              ].map(filter => (
                <Pressable
                  key={filter.value}
                  style={[
                    styles.genderFilterButton,
                    genderFilter === filter.value && styles.genderFilterButtonActive
                  ]}
                  onPress={() => setGenderFilter(filter.value)}
                >
                  <MobileCaption style={[
                    styles.genderFilterButtonText,
                    genderFilter === filter.value && styles.genderFilterButtonTextActive
                  ]}>
                    {filter.label}
                  </MobileCaption>
                </Pressable>
              ))}
            </View>
          </View>
          
          {selectedTeam && (
            <MobileCaption style={styles.usedAthletesNote}>
              {selectedTeam.name}: {getUsedAthletesForTeam(selectedTeam)} of {selectedTeam.athletes.length} athletes used in previous events
            </MobileCaption>
          )}
        </Card>

        {/* Team Selector */}
        <Card style={styles.teamSelectorCard}>
          <MobileH2 style={styles.sectionTitle}>Select Team</MobileH2>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.teamChips}>
              {teams.map(team => {
                const selectionStatus = getSelectionStatus(team.id);
                const isSelected = selectedTeamId === team.id;
                
                return (
                  <Pressable
                    key={team.id}
                    style={[
                      styles.teamChip,
                      isSelected && styles.teamChipSelected,
                      { borderColor: selectionStatus.color }
                    ]}
                    onPress={() => setSelectedTeamId(team.id)}
                  >
                    <MobileBody style={[
                      styles.teamChipText,
                      isSelected && styles.teamChipTextSelected
                    ]}>
                      {team.name}
                    </MobileBody>
                    <View style={[styles.statusDot, { backgroundColor: selectionStatus.color }]} />
                    <MobileCaption style={styles.selectionCount}>
                      {isTeamNotRunning(team.id) ? 'Not Running' : `${(teamSelections[team.id] || []).length}/${requiredAthletes}`}
                    </MobileCaption>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Card>

        {/* Athlete Selection */}
        {selectedTeam && (
          <Card style={styles.athleteSelectionCard}>
            <View style={styles.sectionHeaderWithToggle}>
              <MobileH2 style={styles.sectionTitle}>
                {selectedTeam.name} Athletes
              </MobileH2>
              <View style={styles.toggleContainer}>
                <MobileCaption style={styles.toggleLabel}>Team Not Running</MobileCaption>
                <Pressable
                  style={[
                    styles.toggle,
                    isTeamNotRunning(selectedTeamId) && styles.toggleActive
                  ]}
                  onPress={() => handleTeamNotRunning(selectedTeamId)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isTeamNotRunning(selectedTeamId) }}
                  accessibilityLabel="Toggle team not running"
                >
                  <View style={[
                    styles.toggleCircle,
                    isTeamNotRunning(selectedTeamId) && styles.toggleCircleActive
                  ]} />
                </Pressable>
              </View>
            </View>
            
            {isTeamNotRunning(selectedTeamId) ? (
              <View style={styles.notRunningDisplay}>
                <MobileBody style={styles.notRunningText}>
                  {selectedTeam.name} is not running this event
                </MobileBody>
                <MobileCaption style={styles.notRunningSubtext}>
                  This team will not participate in {eventName}
                </MobileCaption>
              </View>
            ) : availableAthletes.length === 0 ? (
              <View style={styles.emptyAthletes}>
                <MobileBody style={styles.emptyAthletesText}>
                  No available athletes for this team
                </MobileBody>
                <MobileCaption style={styles.emptyAthletesSubtext}>
                  All athletes may be used in previous events
                </MobileCaption>
              </View>
            ) : (
              <View style={styles.athleteList}>
                {availableAthletes.map(athlete => {
                  const isSelected = (teamSelections[selectedTeamId] || []).includes(athlete.id);
                  const isUsedElsewhere = usedAthleteIds.includes(athlete.id) && !isSelected;
                  
                  return (
                    <Pressable
                      key={athlete.id}
                      style={[
                        styles.athleteRow,
                        isSelected && styles.athleteRowSelected,
                        isUsedElsewhere && styles.athleteRowUsed
                      ]}
                      onPress={() => handleAthleteToggle(selectedTeamId, athlete.id)}
                      disabled={isUsedElsewhere}
                    >
                      <View style={[
                        styles.athleteCheckbox,
                        isSelected && styles.athleteCheckboxSelected
                      ]}>
                        {isSelected && <View style={styles.checkmark} />}
                      </View>
                      <View style={styles.athleteInfo}>
                        <View style={styles.athleteNameRow}>
                          <MobileBody style={[
                            styles.athleteName,
                            isUsedElsewhere && styles.athleteNameUsed
                          ]}>
                            {athlete.name}
                          </MobileBody>
                          {athlete.gender && (
                            <Text style={athlete.gender === 'Male' ? styles.genderMale : styles.genderFemale}>
                              {athlete.gender === 'Male' ? 'M' : 'F'}
                            </Text>
                          )}
                        </View>
                        <MobileCaption style={styles.athleteTier}>
                          {athlete.tier} Tier
                          {athlete.bestEvents && ` • ${athlete.bestEvents}`}
                        </MobileCaption>
                      </View>
                      {isUsedElsewhere && (
                        <View style={styles.usedBadge}>
                          <MobileCaption style={styles.usedBadgeText}>Used</MobileCaption>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <ButtonSecondary 
            onPress={handleCancel} 
            style={styles.cancelButton}
            textStyle={styles.buttonText}
          >
            Cancel
          </ButtonSecondary>
          <Pressable 
            onPress={() => {
              console.log('=== SAVE BUTTON CLICKED ===');
              console.log('canSave():', canSave());
              console.log('isSaving:', isSaving);
              console.log('teams:', teams.length);
              console.log('teamSelections:', teamSelections);
              if (!canSave() || isSaving) {
                console.log('Button check failed - would be disabled');
                // Still allow click for debugging
              }
              handleSave();
            }} 
            style={[
              styles.saveButton,
              styles.saveButtonStyle,
              (!canSave() || isSaving) && styles.saveButtonDisabled
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Cancel Assignment</MobileH2>
            <MobileBody style={styles.modalMessage}>
              Are you sure you want to cancel? Any unsaved changes will be lost.
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleCancelStay}>
                <Text style={styles.modalButtonTextCancel}>Stay</Text>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={handleCancelConfirm}>
                <Text style={styles.modalButtonTextConfirm}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Incomplete Assignments Confirmation Modal */}
      {showIncompleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Incomplete Assignments</MobileH2>
            <MobileBody style={styles.modalMessage}>
              The following teams need {requiredAthletes} {requiredAthletes === 1 ? 'athlete' : 'athletes'} assigned:{'\n\n'}
              {getIncompleteTeams().map(t => `• ${t.name}`).join('\n')}{'\n\n'}
              Continue anyway?
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleIncompleteCancel}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={handleIncompleteSaveAnyway}>
                <Text style={styles.modalButtonTextConfirm}>Save Anyway</Text>
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
    paddingBottom: scale(40),
    gap: scale(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    margin: scale(20),
    padding: scale(30),
    alignItems: 'center',
    gap: scale(16),
  },
  headerCard: {
    padding: scale(24),
    alignItems: 'center',
    gap: scale(12),
  },
  eventTitle: {
    color: styleTokens.colors.textPrimary,
    textAlign: 'center',
  },
  eventSubtitle: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
  },
  usedAthletesNote: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: scale(8),
  },
  teamSelectorCard: {
    padding: scale(24),
  },
  sectionTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(16),
  },
  sectionHeaderWithToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
    flexWrap: 'wrap',
    gap: scale(8),
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  toggleLabel: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(12),
  },
  toggle: {
    width: scale(44),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: styleTokens.colors.disabled,
    padding: scale(2),
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: styleTokens.colors.primary,
    alignItems: 'flex-end',
  },
  toggleCircle: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: styleTokens.colors.white,
  },
  toggleCircleActive: {
    backgroundColor: styleTokens.colors.white,
  },
  notRunningDisplay: {
    alignItems: 'center',
    padding: scale(30),
    gap: scale(8),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(12),
  },
  notRunningText: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  notRunningSubtext: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  teamChips: {
    flexDirection: 'row',
    gap: scale(12),
  },
  teamChip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: styleTokens.colors.border,
    backgroundColor: styleTokens.colors.backgroundLight,
    alignItems: 'center',
    minWidth: scale(100),
    gap: scale(4),
  },
  teamChipSelected: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  teamChipText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '600',
  },
  teamChipTextSelected: {
    color: styleTokens.colors.white,
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  selectionCount: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(10),
  },
  athleteSelectionCard: {
    padding: scale(24),
  },
  emptyAthletes: {
    alignItems: 'center',
    padding: scale(30),
    gap: scale(8),
  },
  emptyAthletesText: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
  },
  emptyAthletesSubtext: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  athleteList: {
    gap: scale(12),
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  athleteRowSelected: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderColor: styleTokens.colors.primary,
  },
  athleteRowUsed: {
    opacity: 0.5,
    backgroundColor: styleTokens.colors.disabled,
  },
  athleteCheckbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: styleTokens.colors.border,
    marginRight: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteCheckboxSelected: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  checkmark: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: styleTokens.colors.white,
  },
  athleteInfo: {
    flex: 1,
  },
  athleteName: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '600',
    marginBottom: scale(2),
  },
  athleteNameUsed: {
    color: styleTokens.colors.textSecondary,
  },
  athleteTier: {
    color: styleTokens.colors.textSecondary,
  },
  usedBadge: {
    backgroundColor: styleTokens.colors.primaryDark,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  usedBadgeText: {
    color: styleTokens.colors.white,
    fontSize: scale(10),
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(16),
    marginTop: scale(20),
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  saveButtonStyle: {
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    borderRadius: scale(4),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  saveButtonDisabled: {
    opacity: 0.6,
    backgroundColor: styleTokens.colors.textMuted,
  },
  saveButtonText: {
    color: styleTokens.colors.white,
    fontSize: scale(16),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: scale(1),
  },
  buttonText: {
    fontSize: scale(15), // Consistent font size for both buttons
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
  // Gender filter styles
  genderFilterContainer: {
    marginTop: scale(16),
    alignItems: 'center',
    gap: scale(8),
  },
  genderFilterLabel: {
    color: styleTokens.colors.textSecondary,
    fontWeight: '600',
  },
  genderFilterButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  genderFilterButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    backgroundColor: styleTokens.colors.surface,
    borderWidth: 1,
    borderColor: styleTokens.colors.border,
  },
  genderFilterButtonActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  genderFilterButtonText: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(12),
    fontWeight: '600',
  },
  genderFilterButtonTextActive: {
    color: styleTokens.colors.white,
  },
  // Gender badge styles
  athleteNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  genderMale: {
    color: 'rgb(59, 130, 246)',
    fontWeight: '800',
    fontSize: scale(13),
    fontFamily: 'Roboto Mono',
  },
  genderFemale: {
    color: 'rgb(236, 72, 153)',
    fontWeight: '800',
    fontSize: scale(13),
    fontFamily: 'Roboto Mono',
  },
});

export default AssignRunnersScreen;
