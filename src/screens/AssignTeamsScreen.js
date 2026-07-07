import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Pressable,
  Modal,
  Text
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventBus from '../lib/eventBus';
import TeamList from '../components/TeamList';
import { assignTeams, moveAthlete, getTeamColors, getColorName } from '../lib/assigner';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { ButtonPrimary, ButtonSecondary, Input } from '../components';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

const AssignTeamsScreen = () => {
  const [athletes, setAthletes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [numTeams, setNumTeams] = useState('4');
  const [showTeamSize, setShowTeamSize] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [showTeamEditor, setShowTeamEditor] = useState(false);
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState(null);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [editedTeamColor, setEditedTeamColor] = useState('');
  const [availableColors] = useState(getTeamColors());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Manual assignment mode states
  const [assignmentMode, setAssignmentMode] = useState('auto'); // 'auto' or 'manual'
  const [selectedAthletes, setSelectedAthletes] = useState([]); // IDs of selected athletes
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState(null); // Team to assign to
  const [teamsAcceptingRandom, setTeamsAcceptingRandom] = useState({}); // { teamId: boolean }

  // Load saved data on component mount
  useEffect(() => {
    loadData();
    // Subscribe to planned team count updates
    const handlePlanned = (planned) => {
      setNumTeams(String(planned));
    };
    eventBus.on('plannedTeamsUpdated', handlePlanned);
    return () => {
      eventBus.off('plannedTeamsUpdated', handlePlanned);
    };
  }, []);

  const loadData = async () => {
    try {
      const savedAthletes = await AsyncStorage.getItem('athletes');
      const savedTeams = await AsyncStorage.getItem('teams');
      const savedResults = await AsyncStorage.getItem('eventResults');
      const teamConfigRaw = await AsyncStorage.getItem('settings.teamConfig');
      
      if (savedAthletes) {
        setAthletes(JSON.parse(savedAthletes));
      }
      if (savedTeams) {
        setTeams(JSON.parse(savedTeams));
      }
      if (savedResults) {
        const arr = JSON.parse(savedResults);
        setHasResults(Array.isArray(arr) && arr.length > 0);
      }
      if (teamConfigRaw) {
        try {
          const cfg = JSON.parse(teamConfigRaw);
          if (cfg && typeof cfg.plannedTeams === 'number' && cfg.plannedTeams > 0) {
            setNumTeams(String(cfg.plannedTeams));
          }
        } catch {}
      }
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const handleNumTeamsChange = async (value) => {
    if (hasResults) {
      Alert.alert(
        'Team Count Locked',
        'Existing results detected. Changing team count is blocked to prevent scoring inconsistencies. You can hard reset results to proceed.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Hard Reset Results',
            style: 'destructive',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem('eventResults');
                setHasResults(false);
                setNumTeams(value);
                const planned = parseInt(value || '0');
                if (!isNaN(planned) && planned > 0) {
                  eventBus.emit('plannedTeamsUpdated', planned);
                  try { await AsyncStorage.setItem('settings.teamConfig', JSON.stringify({ plannedTeams: planned })); } catch {}
                }
              } catch (e) {
                Alert.alert('Error', 'Failed to reset results.');
              }
            }
          }
        ]
      );
      return;
    }
    setNumTeams(value);
    const planned = parseInt(value || '0');
    if (!isNaN(planned) && planned > 0) {
      eventBus.emit('plannedTeamsUpdated', planned);
      try { await AsyncStorage.setItem('settings.teamConfig', JSON.stringify({ plannedTeams: planned })); } catch {}
    }
  };

  const saveTeams = async (newTeams) => {
    try {
      await AsyncStorage.setItem('teams', JSON.stringify(newTeams));
      // Notify other screens (e.g., Settings) about team count changes
      eventBus.emit('teamsUpdated', Array.isArray(newTeams) ? newTeams.length : 0);
    } catch (error) {
      console.log('Error saving teams:', error);
    }
  };

  const generateTeams = () => {
    if (athletes.length === 0) {
      Alert.alert('No Athletes', 'Please add athletes first in the Team Builder screen.');
      return;
    }

    const num = parseInt(numTeams);
    if (num < 1) {
      Alert.alert('Invalid Input', 'Number of teams must be at least 1.');
      return;
    }

    if (num > athletes.length) {
      Alert.alert('Too Many Teams', `Cannot create ${num} teams with only ${athletes.length} athletes.`);
      return;
    }

    const result = assignTeams(athletes, num);
    
    if (result.success) {
      setTeams(result.teams);
      saveTeams(result.teams);
      eventBus.emit('teamsUpdated', result.teams.length);
      
      Alert.alert(
        'Teams Generated!', 
        `Created ${result.teams.length} teams with ${result.stats.totalAthletes} athletes.\n\n` +
        `High Tier: ${result.stats.highTier}\n` +
        `Medium Tier: ${result.stats.medTier}\n` +
        `Low Tier: ${result.stats.lowTier}\n\n` +
        `Average team size: ${result.stats.averageTeamSize}`
      );
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleMoveAthlete = (athleteId, fromTeamId, toTeamId) => {
    const result = moveAthlete([...teams], athleteId, fromTeamId, toTeamId);
    
    if (result.success) {
      setTeams(result.teams);
      saveTeams(result.teams);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const openTeamEditor = (team) => {
    setSelectedTeamForEdit(team);
    setEditedTeamName(team.name);
    setEditedTeamColor(team.color);
    setShowTeamEditor(true);
  };

  const saveTeamChanges = async () => {
    if (!selectedTeamForEdit || !editedTeamName.trim()) {
      Alert.alert('Error', 'Team name cannot be empty');
      return;
    }

    // Check if name is already used by another team
    const nameExists = teams.some(team => 
      team.id !== selectedTeamForEdit.id && 
      team.name.toLowerCase() === editedTeamName.trim().toLowerCase()
    );

    if (nameExists) {
      Alert.alert('Error', 'A team with this name already exists');
      return;
    }

    const updatedTeams = teams.map(team => 
      team.id === selectedTeamForEdit.id 
        ? { ...team, name: editedTeamName.trim(), color: editedTeamColor }
        : team
    );

    setTeams(updatedTeams);
    saveTeams(updatedTeams);
    setShowTeamEditor(false);
    setSelectedTeamForEdit(null);
  };

  const selectTeamColor = (color) => {
    setEditedTeamColor(color);
  };

  const getUsedColors = () => {
    return teams.map(team => team.color).filter(Boolean);
  };

  const resetTeams = () => {
    console.log('Reset teams clicked');
    setShowResetConfirm(true);
  };

  const handleResetConfirm = () => {
    console.log('Confirming reset teams');
    setTeams([]);
    saveTeams([]);
    eventBus.emit('teamsUpdated', 0);
    setShowResetConfirm(false);
  };

  const handleResetCancel = () => {
    console.log('Reset teams cancelled');
    setShowResetConfirm(false);
  };

  // Manual assignment functions
  const initializeManualTeams = () => {
    const num = parseInt(numTeams);
    if (num < 1) {
      Alert.alert('Invalid Input', 'Number of teams must be at least 1.');
      return;
    }

    // Create empty teams
    const TEAM_COLORS = getTeamColors();
    const emptyTeams = Array.from({ length: num }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      athletes: []
    }));

    setTeams(emptyTeams);
    saveTeams(emptyTeams);
    setSelectedAthletes([]);
    setSelectedTeamForAssignment(emptyTeams[0].id); // Select first team by default
    
    // Initialize all teams as accepting random athletes by default
    const acceptingRandom = {};
    emptyTeams.forEach(team => {
      acceptingRandom[team.id] = true;
    });
    setTeamsAcceptingRandom(acceptingRandom);
  };

  const toggleAthleteSelection = (athleteId) => {
    setSelectedAthletes(prev => {
      if (prev.includes(athleteId)) {
        return prev.filter(id => id !== athleteId);
      } else {
        return [...prev, athleteId];
      }
    });
  };

  const assignSelectedAthletes = () => {
    if (selectedAthletes.length === 0) {
      Alert.alert('No Athletes Selected', 'Please select at least one athlete to assign.');
      return;
    }

    if (!selectedTeamForAssignment) {
      Alert.alert('No Team Selected', 'Please select a team to assign athletes to.');
      return;
    }

    // Find the selected team
    const teamIndex = teams.findIndex(t => t.id === selectedTeamForAssignment);
    if (teamIndex === -1) return;

    // Get the athletes to assign (from unassigned pool)
    const unassignedAthletes = getUnassignedAthletes();
    const athletesToAssign = unassignedAthletes.filter(a => selectedAthletes.includes(a.id));

    // Update teams
    const updatedTeams = [...teams];
    updatedTeams[teamIndex] = {
      ...updatedTeams[teamIndex],
      athletes: [...updatedTeams[teamIndex].athletes, ...athletesToAssign]
    };

    setTeams(updatedTeams);
    saveTeams(updatedTeams);

    // Clear selection
    setSelectedAthletes([]);
  };

  const getUnassignedAthletes = () => {
    if (teams.length === 0) return athletes;
    
    const assignedIds = new Set();
    teams.forEach(team => {
      team.athletes.forEach(athlete => {
        assignedIds.add(athlete.id);
      });
    });

    return athletes.filter(a => !assignedIds.has(a.id));
  };

  const switchToManualMode = () => {
    if (teams.length > 0) {
      // Teams already exist, just switch mode and keep them
      setAssignmentMode('manual');
      
      // Initialize all teams as accepting random athletes by default
      const acceptingRandom = {};
      teams.forEach(team => {
        acceptingRandom[team.id] = true;
      });
      setTeamsAcceptingRandom(acceptingRandom);
      
      // Select first team by default
      if (teams.length > 0) {
        setSelectedTeamForAssignment(teams[0].id);
      }
    } else {
      // No teams exist, create empty ones
      setAssignmentMode('manual');
      initializeManualTeams();
    }
  };

  const switchToAutoMode = () => {
    setAssignmentMode('auto');
    setSelectedAthletes([]);
    setSelectedTeamForAssignment(null);
    setTeamsAcceptingRandom({});
  };

  const toggleTeamAcceptingRandom = (teamId) => {
    setTeamsAcceptingRandom(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const fillTeamsRandomly = () => {
    const unassignedAthletes = getUnassignedAthletes();
    
    if (unassignedAthletes.length === 0) {
      Alert.alert('No Athletes Available', 'All athletes have been assigned to teams.');
      return;
    }

    // Get teams that accept random athletes
    const openTeams = teams.filter(team => teamsAcceptingRandom[team.id]);
    
    if (openTeams.length === 0) {
      Alert.alert('No Teams Accepting Athletes', 'Please mark at least one team as accepting random athletes.');
      return;
    }

    // Calculate total athletes in open teams (existing + unassigned)
    const existingAthletesInOpenTeams = openTeams.reduce((sum, team) => sum + team.athletes.length, 0);
    const totalAthletesForOpenTeams = existingAthletesInOpenTeams + unassignedAthletes.length;
    
    // Calculate target size for each open team
    const targetSize = Math.ceil(totalAthletesForOpenTeams / openTeams.length);
    
    // Create working copies of open teams with their existing athletes
    const workingOpenTeams = openTeams.map(team => ({
      ...team,
      athletes: [...team.athletes]
    }));
    
    // Separate athletes by gender for balanced distribution
    const maleAthletes = unassignedAthletes.filter(a => a.gender === 'Male');
    const femaleAthletes = unassignedAthletes.filter(a => a.gender === 'Female');
    
    // Helper function to assign a gender group
    const assignGenderGroupToOpenTeams = (genderAthletes) => {
      // Shuffle within tiers for randomness
      const shuffleArray = (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };
      
      const highTier = shuffleArray(genderAthletes.filter(a => a.tier === 'High'));
      const medTier = shuffleArray(genderAthletes.filter(a => a.tier === 'Med'));
      const lowTier = shuffleArray(genderAthletes.filter(a => a.tier === 'Low'));
      
      const allGenderAthletes = [
        ...highTier.map(a => ({ ...a, tierValue: 3 })),
        ...medTier.map(a => ({ ...a, tierValue: 2 })),
        ...lowTier.map(a => ({ ...a, tierValue: 1 }))
      ];
      
      // Assign each athlete to the team with lowest count of this gender
      allGenderAthletes.forEach(athlete => {
        // Find open team with lowest count of this gender using workingOpenTeams
        const teamStats = workingOpenTeams.map(team => {
          const genderCount = team.athletes.filter(a => a.gender === athlete.gender).length;
          const genderTalent = team.athletes
            .filter(a => a.gender === athlete.gender)
            .reduce((sum, a) => sum + (a.tier === 'High' ? 3 : a.tier === 'Med' ? 2 : 1), 0);
          const totalCount = team.athletes.length;
          
          return {
            team,
            genderCount,
            genderTalent,
            totalCount
          };
        });
        
        // Sort by: 1) total count (fill to target first), 2) gender talent (balance within gender)
        teamStats.sort((a, b) => {
          // Primary: total team size (lowest first, to reach target evenly)
          if (a.totalCount !== b.totalCount) {
            return a.totalCount - b.totalCount;
          }
          // Secondary: gender talent score (balance this gender)
          if (a.genderTalent !== b.genderTalent) {
            return a.genderTalent - b.genderTalent;
          }
          // Tertiary: gender count
          return a.genderCount - b.genderCount;
        });
        
        // Assign to team with lowest stats
        const selectedTeam = teamStats[0].team;
        selectedTeam.athletes.push(athlete);
      });
    };
    
    // Assign males and females separately
    assignGenderGroupToOpenTeams(maleAthletes);
    assignGenderGroupToOpenTeams(femaleAthletes);
    
    // Merge updated open teams back into all teams
    const updatedTeams = teams.map(team => {
      if (!teamsAcceptingRandom[team.id]) {
        return team; // Closed team, keep as is
      }
      
      // Find the updated open team
      const updatedOpenTeam = workingOpenTeams.find(t => t.id === team.id);
      return updatedOpenTeam || team;
    });

    setTeams(updatedTeams);
    saveTeams(updatedTeams);
    
    Alert.alert(
      'Athletes Assigned!',
      `Successfully assigned ${unassignedAthletes.length} athletes to ${openTeams.length} open teams.`
    );
  };

  const getTeamSize = () => {
    if (athletes.length === 0 || teams.length === 0) return 0;
    return Math.ceil(athletes.length / teams.length);
  };

  const plannedTeamsCount = parseInt(numTeams || '0');
  const isPlannedTeamsValid = !isNaN(plannedTeamsCount) && plannedTeamsCount > 0;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Controls Section */}
        <Card style={styles.sectionCard} variant="primary">
          <MobileH2 style={styles.sectionTitle}>Team Assignment</MobileH2>

          {/* Mode Toggle */}
          <View style={styles.modeToggleContainer}>
            <Pressable
              style={[styles.modeToggleButton, assignmentMode === 'auto' && styles.modeToggleButtonActive]}
              onPress={switchToAutoMode}
            >
              <MobileBody style={[styles.modeToggleText, assignmentMode === 'auto' && styles.modeToggleTextActive]}>
                Auto Generate
              </MobileBody>
            </Pressable>
            <Pressable
              style={[styles.modeToggleButton, assignmentMode === 'manual' && styles.modeToggleButtonActive]}
              onPress={switchToManualMode}
            >
              <MobileBody style={[styles.modeToggleText, assignmentMode === 'manual' && styles.modeToggleTextActive]}>
                Manual Assignment
              </MobileBody>
            </Pressable>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroupHalf}>
              <MobileBody style={styles.teamSizeLabel}>
                {teams.length > 0 ? 'Active Teams' : 'Number of Teams'}
              </MobileBody>
              {teams.length > 0 ? (
                <View style={[styles.atStepper, styles.atStepperDisabled]}>
                  <View style={[styles.atStepperBtn, styles.atStepperBtnDisabled]}>
                    <MobileBody style={[styles.atStepperBtnText, styles.atStepperBtnTextDisabled]}>−</MobileBody>
                  </View>
                  <MobileBody style={[styles.atStepperValue, styles.atStepperValueLocked]}>{teams.length}</MobileBody>
                  <View style={[styles.atStepperBtn, styles.atStepperBtnDisabled]}>
                    <MobileBody style={[styles.atStepperBtnText, styles.atStepperBtnTextDisabled]}>+</MobileBody>
                  </View>
                </View>
              ) : (
                <View style={styles.atStepper}>
                  <Pressable
                    style={styles.atStepperBtn}
                    onPress={() => handleNumTeamsChange(String(Math.max(2, parseInt(numTeams || '2') - 1)))}
                    accessibilityLabel="Decrease team count"
                  >
                    <MobileBody style={styles.atStepperBtnText}>−</MobileBody>
                  </Pressable>
                  <MobileBody style={styles.atStepperValue}>{numTeams || '0'}</MobileBody>
                  <Pressable
                    style={styles.atStepperBtn}
                    onPress={() => handleNumTeamsChange(String(Math.min(32, parseInt(numTeams || '0') + 1)))}
                    accessibilityLabel="Increase team count"
                  >
                    <MobileBody style={styles.atStepperBtnText}>+</MobileBody>
                  </Pressable>
                </View>
              )}
              {teams.length > 0 && (
                <MobileCaption style={styles.atStepperHint}>Reset teams to change</MobileCaption>
              )}
            </View>
            <View style={[styles.inputGroupHalf, styles.teamSizeGroup]}>
              <MobileBody style={styles.teamSizeLabel}>Team Size</MobileBody>
              <MobileCaption style={styles.teamSizeValue}>~{getTeamSize()} athletes</MobileCaption>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MobileCaption style={styles.infoText}>Available Athletes: {athletes.length}</MobileCaption>
            <MobileCaption style={styles.infoText}>Current Teams: {teams.length}</MobileCaption>
          </View>

          {assignmentMode === 'auto' ? (
            <>
              <ButtonPrimary 
                onPress={generateTeams}
                disabled={athletes.length === 0 || !isPlannedTeamsValid}
                style={styles.generateButton}
              >
                Generate Teams
              </ButtonPrimary>
              {!isPlannedTeamsValid && (
                <MobileCaption style={styles.plannedHint}>Set number of teams above using + / −</MobileCaption>
              )}
            </>
          ) : (
            <>
              {teams.length === 0 && (
                <ButtonPrimary 
                  onPress={initializeManualTeams}
                  disabled={!isPlannedTeamsValid}
                  style={styles.generateButton}
                >
                  Create Empty Teams
                </ButtonPrimary>
              )}
            </>
          )}

          {teams.length > 0 && (
            <View style={styles.postGenButtons}>
              <ButtonSecondary 
                onPress={() => setIsEditMode(!isEditMode)}
                style={styles.resetButton}
              >
                {isEditMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
              </ButtonSecondary>
              <ButtonSecondary 
                onPress={resetTeams}
                style={styles.resetButton}
              >
                Reset Teams
              </ButtonSecondary>
            </View>
          )}
        </Card>

        {/* Manual Assignment Interface */}
        {assignmentMode === 'manual' && teams.length > 0 && getUnassignedAthletes().length > 0 && (
          <Card style={styles.manualAssignmentCard}>
            <MobileH2 style={styles.sectionTitle}>Assign Athletes to Teams</MobileH2>
            
            {/* Team Selector */}
            <View style={styles.teamSelectorSection}>
              <MobileBody style={styles.teamSelectorLabel}>Select Team:</MobileBody>
              <View style={styles.teamSelectorButtons}>
                {teams.map(team => (
                  <View key={team.id} style={styles.teamSelectorRow}>
                    <Pressable
                      style={[
                        styles.teamSelectorButton,
                        selectedTeamForAssignment === team.id && styles.teamSelectorButtonActive,
                        { borderLeftColor: team.color }
                      ]}
                      onPress={() => setSelectedTeamForAssignment(team.id)}
                    >
                      <View style={styles.teamSelectorInfo}>
                        <MobileBody style={[
                          styles.teamSelectorButtonText,
                          selectedTeamForAssignment === team.id && styles.teamSelectorButtonTextActive
                        ]}>
                          {team.name}
                        </MobileBody>
                        <MobileCaption style={styles.teamSelectorCount}>
                          ({team.athletes.length})
                        </MobileCaption>
                      </View>
                      <Pressable
                        style={[
                          styles.randomToggle,
                          teamsAcceptingRandom[team.id] && styles.randomToggleActive
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleTeamAcceptingRandom(team.id);
                        }}
                      >
                        <MobileCaption style={[
                          styles.randomToggleText,
                          teamsAcceptingRandom[team.id] && styles.randomToggleTextActive
                        ]}>
                          {teamsAcceptingRandom[team.id] ? 'Open' : 'Closed'}
                        </MobileCaption>
                      </Pressable>
                    </Pressable>
                  </View>
                ))}
              </View>
              <MobileCaption style={styles.randomToggleHint}>
                Toggle "Open/Closed" to allow random assignment to teams
              </MobileCaption>
            </View>

            {/* Athlete Selection */}
            <View style={styles.athleteSelectionSection}>
              <MobileBody style={styles.athleteSelectionLabel}>
                Select Athletes ({selectedAthletes.length} selected):
              </MobileBody>
              <ScrollView style={styles.athleteSelectionList}>
                {getUnassignedAthletes().map(athlete => (
                  <Pressable
                    key={athlete.id}
                    style={[
                      styles.athleteSelectionItem,
                      selectedAthletes.includes(athlete.id) && styles.athleteSelectionItemActive
                    ]}
                    onPress={() => toggleAthleteSelection(athlete.id)}
                  >
                    <View style={styles.athleteSelectionCheckbox}>
                      {selectedAthletes.includes(athlete.id) && (
                        <Text style={styles.athleteSelectionCheckmark}>✓</Text>
                      )}
                    </View>
                    <View style={styles.athleteSelectionInfo}>
                      <MobileBody style={styles.athleteSelectionName}>{athlete.name}</MobileBody>
                      <View style={styles.athleteSelectionBadges}>
                        {athlete.gender && (
                          <Text style={athlete.gender === 'Male' ? styles.genderMale : styles.genderFemale}>
                            {athlete.gender === 'Male' ? 'M' : 'F'}
                          </Text>
                        )}
                        <View style={styles.athleteSelectionTierBadge}>
                          <MobileCaption style={styles.athleteSelectionTierText}>{athlete.tier}</MobileCaption>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Assign Button */}
            <ButtonPrimary
              onPress={assignSelectedAthletes}
              disabled={selectedAthletes.length === 0}
              style={styles.assignButton}
            >
              Assign to {teams.find(t => t.id === selectedTeamForAssignment)?.name || 'Team'}
            </ButtonPrimary>

            {/* Fill Teams Randomly Button */}
            <ButtonSecondary
              onPress={fillTeamsRandomly}
              disabled={getUnassignedAthletes().length === 0}
              style={styles.fillRandomButton}
            >
              Fill Teams Randomly
            </ButtonSecondary>
          </Card>
        )}

        {/* Fill Teams Randomly (when no unassigned athletes but in manual mode) */}
        {assignmentMode === 'manual' && teams.length > 0 && getUnassignedAthletes().length === 0 && (
          <Card style={styles.manualAssignmentCard}>
            <MobileH2 style={styles.sectionTitle}>All Athletes Assigned</MobileH2>
            <MobileBody style={styles.allAssignedText}>
              All athletes have been assigned to teams. You can use Edit Mode to move athletes between teams if needed.
            </MobileBody>
          </Card>
        )}

        {/* Teams Display */}
        {teams.length > 0 && (
          <Card style={styles.teamsSection}>
            <MobileH2 style={styles.sectionTitle}>Team Assignments</MobileH2>
            <TeamList 
              teams={teams} 
              onMoveAthlete={handleMoveAthlete} 
              onColorChange={openTeamEditor}
              editable={isEditMode} 
            />
          </Card>
        )}

        {/* Instructions */}
        {teams.length === 0 && (
          <Card style={styles.instructionsSection}>
            <MobileH2 style={styles.sectionTitle}>How Team Assignment Works</MobileH2>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>1</MobileCaption>
              <MobileBody style={styles.instructionText}>
                Add athletes in the Team Builder screen with their tier (High/Med/Low)
              </MobileBody>
            </View>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>2</MobileCaption>
              <MobileBody style={styles.instructionText}>
                Choose the number of teams you want to create
              </MobileBody>
            </View>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>3</MobileCaption>
              <MobileBody style={styles.instructionText}>
                Click "Generate Teams" to automatically assign athletes using tier-balanced distribution
              </MobileBody>
            </View>
            <View style={styles.instructionItem}>
              <MobileCaption style={styles.instructionNumber}>4</MobileCaption>
              <MobileBody style={styles.instructionText}>
                Athletes are distributed in round-robin fashion: High → Med → Low
              </MobileBody>
            </View>
          </Card>
        )}

        {/* Athlete Summary */}
        {athletes.length > 0 && (
          <Card style={styles.summarySection}>
            <MobileH2 style={styles.sectionTitle}>Athlete Summary</MobileH2>
            <View style={styles.tierBreakdown}>
              <View style={styles.tierRow}>
                <View style={[styles.tierBadge, styles.tierHigh]}>
                  <MobileCaption style={styles.tierText}>High</MobileCaption>
                </View>
                <MobileBody style={styles.tierCount}>
                  {athletes.filter(a => a.tier === 'High').length} athletes
                </MobileBody>
              </View>
              <View style={styles.tierRow}>
                <View style={[styles.tierBadge, styles.tierMed]}>
                  <MobileCaption style={styles.tierText}>Med</MobileCaption>
                </View>
                <MobileBody style={styles.tierCount}>
                  {athletes.filter(a => a.tier === 'Med').length} athletes
                </MobileBody>
              </View>
              <View style={styles.tierRow}>
                <View style={[styles.tierBadge, styles.tierLow]}>
                  <MobileCaption style={styles.tierText}>Low</MobileCaption>
                </View>
                <MobileBody style={styles.tierCount}>
                  {athletes.filter(a => a.tier === 'Low').length} athletes
                </MobileBody>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal
        visible={showTeamEditor}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTeamEditor(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>
              Edit Team
            </MobileH2>
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Team Name Section */}
              <View style={styles.editSection}>
                <MobileBody style={styles.sectionLabel}>Team Name</MobileBody>
                <Input
                  value={editedTeamName}
                  onChangeText={setEditedTeamName}
                  placeholder="Enter team name"
                  style={styles.teamNameInput}
                />
              </View>

              {/* Team Color Section */}
              <View style={styles.editSection}>
                <MobileBody style={styles.sectionLabel}>Team Color</MobileBody>
                <View style={styles.colorList}>
                  {availableColors.map((color, index) => {
                    const usedColors = getUsedColors();
                    const isUsed = usedColors.includes(color) && selectedTeamForEdit?.color !== color;
                    const isSelected = editedTeamColor === color;
                    const colorName = getColorName(color);
                    
                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.colorListItem,
                          isSelected && styles.colorListItemSelected,
                          isUsed && styles.colorListItemDisabled
                        ]}
                        onPress={() => !isUsed && selectTeamColor(color)}
                        disabled={isUsed}
                      >
                        <View style={styles.colorListItemContent}>
                          <View style={[styles.colorPreview, { backgroundColor: color }]} />
                          <MobileBody style={[
                            styles.colorName,
                            isSelected && styles.colorNameSelected,
                            isUsed && styles.colorNameDisabled
                          ]}>
                            {colorName}
                          </MobileBody>
                          {isSelected && (
                            <MobileBody style={styles.selectedIndicator}>✓</MobileBody>
                          )}
                          {isUsed && (
                            <MobileCaption style={styles.usedIndicator}>In Use</MobileCaption>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <View style={styles.modalButton}>
                <ButtonSecondary 
                  style={styles.modalButtonStyle} 
                  textStyle={styles.modalButtonText}
                  onPress={() => setShowTeamEditor(false)}
                >
                  Cancel
                </ButtonSecondary>
              </View>
              <View style={styles.modalButton}>
                <ButtonPrimary 
                  style={styles.modalButtonStyle}
                  textStyle={styles.modalButtonText}
                  onPress={saveTeamChanges}
                >
                  Save
                </ButtonPrimary>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Teams Confirmation Modal */}
      {showResetConfirm && (
        <View style={styles.resetModalOverlay}>
          <View style={styles.resetModalContent}>
            <MobileH2 style={styles.resetModalTitle}>Reset Teams</MobileH2>
            <MobileBody style={styles.resetModalMessage}>
              Are you sure you want to reset all teams? This action cannot be undone.
            </MobileBody>
            <View style={styles.resetModalButtons}>
              <Pressable style={styles.resetModalButtonCancel} onPress={handleResetCancel}>
                <Text style={styles.resetModalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.resetModalButtonConfirm} onPress={handleResetConfirm}>
                <Text style={styles.resetModalButtonTextConfirm}>Reset</Text>
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
  sectionTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(16),
    textAlign: 'center',
  },
  generateButton: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: scale(300),
    minWidth: scale(250),
    marginTop: scale(8),
    marginBottom: scale(12),
  },
  inputRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(16),
    flexWrap: 'wrap',
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupHalf: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: scale(160),
  },
  teamSizeGroup: {
    minWidth: scale(140),
  },
  teamSizeLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
    flexWrap: 'wrap',
    fontWeight: '600',
  },
  teamSizeValue: {
    color: styleTokens.colors.textPrimary,
    flexShrink: 1,
  },
  teamSizeText: {
    fontSize: 16,
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: scale(12),
    backgroundColor: styleTokens.colors.surface,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: styleTokens.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(16),
    flexWrap: 'wrap',
    gap: scale(8),
  },
  infoText: {
    color: styleTokens.colors.textSecondary,
  },
  postGenButtons: {
    width: '100%',
    alignItems: 'center',
    gap: scale(12),
    marginTop: scale(4),
  },
  resetButton: {
    width: '100%',
    maxWidth: scale(300),
    minWidth: scale(250),
  },
  plannedHint: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: scale(6),
  },
  atStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: styleTokens.components.card.borderColor,
    paddingHorizontal: scale(8),
    paddingVertical: scale(6),
    alignSelf: 'flex-start',
  },
  atStepperDisabled: {
    opacity: 0.45,
  },
  atStepperBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(6),
    backgroundColor: styleTokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atStepperBtnDisabled: {
    backgroundColor: styleTokens.colors.border,
  },
  atStepperBtnText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  atStepperBtnTextDisabled: {
    color: styleTokens.colors.textSecondary,
  },
  atStepperValue: {
    minWidth: scale(32),
    textAlign: 'center',
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  atStepperValueLocked: {
    color: styleTokens.colors.textSecondary,
  },
  atStepperHint: {
    color: styleTokens.colors.textSecondary,
    marginTop: scale(4),
    fontStyle: 'italic',
  },
  teamsSection: {
    padding: scale(20),
    borderRadius: scale(12),
    ...styleTokens.shadows.md,
    marginBottom: scale(16),
  },
  instructionsSection: {
    padding: scale(20),
    borderRadius: scale(12),
    ...styleTokens.shadows.sm,
    marginBottom: scale(16),
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
    color: styleTokens.colors.textSecondary,
    flex: 1,
    lineHeight: scale(20),
  },
  summarySection: {
    margin: scale(16),
    padding: scale(20),
    minHeight: scale(120),
  },
  tierBreakdown: {
    gap: scale(12),
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    backgroundColor: styleTokens.components.card.backgroundColor,
    borderRadius: scale(8),
    borderWidth: styleTokens.components.card.borderWidth,
    borderColor: styleTokens.components.card.borderColor,
  },
  tierBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    minWidth: scale(60),
    alignItems: 'center',
    marginRight: scale(16),
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
  },
  tierHigh: {},
  tierMed: {},
  tierLow: {},
  tierText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(12),
    fontWeight: '700',
  },
  tierCount: {
    fontSize: scale(16),
    fontWeight: '600',
    color: styleTokens.colors.textPrimary,
  },
  
  // Color Picker Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', // Darker backdrop like infractions modal
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16), // Consistent padding
  },
  modalContent: {
    width: '90%',
    maxWidth: scale(400),
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    padding: scale(20),
    maxHeight: '85%',
    ...styleTokens.shadows.lg,
  },
  modalTitle: {
    color: styleTokens.colors.white,
    textAlign: 'center',
    marginBottom: scale(16),
  },
  modalScrollView: {
    width: '100%',
    maxHeight: '100%',
    paddingRight: scale(8),
  },
  modalScrollContent: {
    paddingBottom: scale(8),
    paddingRight: scale(4),
  },
  editSection: {
    width: '100%',
    marginBottom: scale(16),
  },
  sectionLabel: {
    color: styleTokens.colors.white,
    fontSize: scale(16),
    fontWeight: '600',
    marginBottom: scale(8),
  },
  teamNameInput: {
    width: '100%',
    marginBottom: scale(4),
  },
  colorList: {
    width: '100%',
  },
  colorListItem: {
    width: '100%',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    marginBottom: scale(8),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorListItemSelected: {
    backgroundColor: styleTokens.colors.primaryDark,
    borderColor: styleTokens.colors.primary,
  },
  colorListItemDisabled: {
    opacity: 0.4,
    backgroundColor: styleTokens.colors.disabled,
  },
  colorListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  colorPreview: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  colorName: {
    flex: 1,
    color: styleTokens.colors.textPrimary,
    fontSize: scale(16),
    fontWeight: '500',
  },
  colorNameSelected: {
    color: styleTokens.colors.white,
    fontWeight: '600',
  },
  colorNameDisabled: {
    color: styleTokens.colors.textSecondary,
  },
  selectedIndicator: {
    color: styleTokens.colors.white,
    fontSize: scale(18),
    fontWeight: 'bold',
  },
  usedIndicator: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(12),
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: scale(8),
    marginTop: scale(8),
  },
  modalButton: {
    flex: 1,
  },
  modalButtonStyle: {
    width: '100%',
    minHeight: scale(48),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: scale(15),
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
  // Manual assignment styles
  modeToggleContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(16),
    padding: scale(4),
    backgroundColor: styleTokens.colors.surface,
    borderRadius: scale(8),
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(6),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  modeToggleButtonActive: {
    backgroundColor: styleTokens.colors.primary,
  },
  modeToggleText: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(14),
    fontWeight: '600',
  },
  modeToggleTextActive: {
    color: styleTokens.colors.white,
  },
  manualAssignmentCard: {
    padding: scale(20),
    borderRadius: scale(12),
    ...styleTokens.shadows.md,
    marginBottom: scale(16),
  },
  teamSelectorSection: {
    marginBottom: scale(20),
  },
  teamSelectorLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(12),
    fontWeight: '600',
  },
  teamSelectorButtons: {
    gap: scale(8),
  },
  teamSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(14),
    backgroundColor: styleTokens.colors.surface,
    borderRadius: scale(8),
    borderLeftWidth: scale(4),
    borderWidth: 1,
    borderColor: styleTokens.colors.border,
  },
  teamSelectorButtonActive: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderColor: styleTokens.colors.primary,
  },
  teamSelectorButtonText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(16),
    fontWeight: '500',
  },
  teamSelectorButtonTextActive: {
    color: styleTokens.colors.white,
    fontWeight: '600',
  },
  teamSelectorCount: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(14),
  },
  athleteSelectionSection: {
    marginBottom: scale(20),
  },
  athleteSelectionLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(12),
    fontWeight: '600',
  },
  athleteSelectionList: {
    maxHeight: scale(300),
  },
  athleteSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    backgroundColor: styleTokens.colors.surface,
    borderRadius: scale(8),
    marginBottom: scale(8),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  athleteSelectionItemActive: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderColor: styleTokens.colors.primary,
  },
  athleteSelectionCheckbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(4),
    borderWidth: 2,
    borderColor: styleTokens.colors.border,
    marginRight: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: styleTokens.colors.background,
  },
  athleteSelectionCheckmark: {
    color: styleTokens.colors.primary,
    fontSize: scale(18),
    fontWeight: 'bold',
  },
  athleteSelectionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  athleteSelectionName: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(16),
    flex: 1,
  },
  athleteSelectionBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  genderMale: {
    color: 'rgb(59, 130, 246)',
    fontWeight: '800',
    fontSize: scale(14),
    fontFamily: 'Roboto Mono',
  },
  genderFemale: {
    color: 'rgb(236, 72, 153)',
    fontWeight: '800',
    fontSize: scale(14),
    fontFamily: 'Roboto Mono',
  },
  athleteSelectionTierBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
  },
  athleteSelectionTierText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(12),
    fontWeight: '700',
  },
  assignButton: {
    width: '100%',
    marginTop: scale(8),
  },
  fillRandomButton: {
    width: '100%',
    marginTop: scale(12),
  },
  teamSelectorRow: {
    marginBottom: scale(8),
  },
  teamSelectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flex: 1,
  },
  randomToggle: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(6),
    backgroundColor: 'rgba(159, 167, 174, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: scale(70),
    alignItems: 'center',
  },
  randomToggleActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  randomToggleText: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(12),
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  randomToggleTextActive: {
    color: styleTokens.colors.white,
  },
  randomToggleHint: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(12),
    marginTop: scale(8),
    fontStyle: 'italic',
  },
  allAssignedText: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },
});

export default AssignTeamsScreen; 