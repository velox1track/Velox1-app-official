import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AthleteForm from '../components/AthleteForm';
import CSVImporter from '../components/CSVImporter';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { ButtonPrimary, ButtonSecondary } from '../components';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

const TeamBuilderScreen = () => {
  const [athletes, setAthletes] = useState([]);
  const [showCSVImporter, setShowCSVImporter] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [athleteToEdit, setAthleteToEdit] = useState(null);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editTier, setEditTier] = useState('Med');
  const [editBestEvents, setEditBestEvents] = useState('');

  // Load saved athletes on component mount
  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      const savedAthletes = await AsyncStorage.getItem('athletes');
      if (savedAthletes) {
        setAthletes(JSON.parse(savedAthletes));
      }
    } catch (error) {
      console.log('Error loading athletes:', error);
    }
  };

  const saveAthletes = async (newAthletes) => {
    try {
      await AsyncStorage.setItem('athletes', JSON.stringify(newAthletes));
    } catch (error) {
      console.log('Error saving athletes:', error);
    }
  };

  const addAthlete = (athlete) => {
    const newAthletes = [...athletes, athlete];
    setAthletes(newAthletes);
    saveAthletes(newAthletes);
    Alert.alert('Success', `${athlete.name} added successfully!`);
  };

  const importAthletes = (importedAthletes) => {
    const newAthletes = [...athletes, ...importedAthletes];
    setAthletes(newAthletes);
    saveAthletes(newAthletes);
  };

  const deleteAthlete = (athleteId) => {
    console.log('Delete athlete clicked:', athleteId);
    setAthleteToDelete(athleteId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    console.log('Confirming delete for athlete:', athleteToDelete);
    const newAthletes = athletes.filter(a => a.id !== athleteToDelete);
    setAthletes(newAthletes);
    saveAthletes(newAthletes);
    setShowDeleteConfirm(false);
    setAthleteToDelete(null);
  };

  const handleDeleteCancel = () => {
    console.log('Delete cancelled');
    setShowDeleteConfirm(false);
    setAthleteToDelete(null);
  };

  const clearAllAthletes = () => {
    console.log('Clear all athletes clicked');
    setShowClearAllConfirm(true);
  };

  const handleClearAllConfirm = () => {
    console.log('Confirming clear all athletes');
    setAthletes([]);
    saveAthletes([]);
    setShowClearAllConfirm(false);
  };

  const handleClearAllCancel = () => {
    console.log('Clear all cancelled');
    setShowClearAllConfirm(false);
  };

  const openEditModal = (athlete) => {
    setAthleteToEdit(athlete);
    setEditName(athlete.name);
    setEditGender(athlete.gender || 'Male');
    setEditTier(athlete.tier);
    setEditBestEvents(athlete.bestEvents || '');
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter an athlete name');
      return;
    }
    const updatedAthletes = athletes.map((a) =>
      a.id === athleteToEdit.id
        ? { ...a, name: editName.trim(), gender: editGender, tier: editTier, bestEvents: editBestEvents.trim() || null }
        : a
    );
    setAthletes(updatedAthletes);
    saveAthletes(updatedAthletes);
    setShowEditModal(false);
    setAthleteToEdit(null);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setAthleteToEdit(null);
  };

  const getTierCount = (tier) => {
    return athletes.filter(athlete => athlete.tier === tier).length;
  };

  const getGenderCount = (gender) => {
    return athletes.filter(athlete => athlete.gender === gender).length;
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Form Section */}
        <Card style={styles.sectionCard} variant="primary">
          <MobileH2 style={styles.sectionTitle}>Add Athlete</MobileH2>
          <AthleteForm onAddAthlete={addAthlete} />
        </Card>

        {/* CSV Import Section */}
        <Card style={styles.sectionCard} variant="primary">
          <View style={styles.csvHeader}>
            <MobileH2 style={[styles.sectionTitle, styles.sectionTitleWrap, styles.csvTitle]}>CSV Import</MobileH2>
            <ButtonSecondary style={styles.csvToggleButton} onPress={() => setShowCSVImporter(!showCSVImporter)}>
              {showCSVImporter ? 'Hide' : 'Show'}
            </ButtonSecondary>
          </View>
          {showCSVImporter && (
            <View style={styles.csvBody}>
              <MobileCaption style={styles.csvHelp}>Import athletes from a CSV file</MobileCaption>
              <CSVImporter onImportAthletes={importAthletes} />
            </View>
          )}
        </Card>

        {/* Athletes List */}
        <Card style={styles.athletesSection}>
          <View style={styles.sectionHeader}>
            <MobileH2 style={[styles.sectionTitle, styles.sectionTitleWrap]}>Athletes ({athletes.length})</MobileH2>
            {athletes.length > 0 && (
              <ButtonSecondary onPress={clearAllAthletes}>
                Clear All
              </ButtonSecondary>
            )}
          </View>

          {/* Tier Summary */}
          {athletes.length > 0 && (
            <View style={styles.tierSummary}>
              <View style={styles.tierItem}>
                <View style={[styles.tierBadge, styles.tierHigh]}>
                  <MobileCaption style={styles.tierText}>High</MobileCaption>
                </View>
                <MobileBody>{getTierCount('High')}</MobileBody>
              </View>
              <View style={styles.tierItem}>
                <View style={[styles.tierBadge, styles.tierMed]}>
                  <MobileCaption style={styles.tierText}>Med</MobileCaption>
                </View>
                <MobileBody>{getTierCount('Med')}</MobileBody>
              </View>
              <View style={styles.tierItem}>
                <View style={[styles.tierBadge, styles.tierLow]}>
                  <MobileCaption style={styles.tierText}>Low</MobileCaption>
                </View>
                <MobileBody>{getTierCount('Low')}</MobileBody>
              </View>
            </View>
          )}

          {/* Gender Summary */}
          {athletes.length > 0 && (
            <View style={styles.genderSummary}>
              <View style={styles.genderSummaryItem}>
                <Text style={styles.genderMale}>M</Text>
                <MobileBody style={styles.genderSummaryText}>Male: {getGenderCount('Male')}</MobileBody>
              </View>
              <View style={styles.genderSummaryItem}>
                <Text style={styles.genderFemale}>F</Text>
                <MobileBody style={styles.genderSummaryText}>Female: {getGenderCount('Female')}</MobileBody>
              </View>
            </View>
          )}

          {/* Athletes List */}
          {athletes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MobileH1 style={styles.emptyTitle}>No athletes added yet</MobileH1>
              <MobileBody style={styles.emptySubtext}>
                Use the form above or CSV import to add athletes
              </MobileBody>
            </View>
          ) : (
            <View style={styles.athletesList}>
              {athletes.map((athlete) => (
                <View key={athlete.id} style={styles.athleteCard}>
                  <View style={styles.athleteInfo}>
                    <MobileH2 style={styles.athleteName} numberOfLines={2}>{athlete.name}</MobileH2>
                    <View style={styles.badgeContainer}>
                      {athlete.gender && (
                        <Text style={athlete.gender === 'Male' ? styles.genderMale : styles.genderFemale}>
                          {athlete.gender === 'Male' ? 'M' : 'F'}
                        </Text>
                      )}
                      <View style={[styles.tierBadge, styles[`tier${athlete.tier}`]]}>
                        <MobileCaption style={styles.tierText}>{athlete.tier}</MobileCaption>
                      </View>
                    </View>
                  </View>
                  {athlete.bestEvents && (
                    <MobileCaption style={styles.bestEvents} numberOfLines={2}>{athlete.bestEvents}</MobileCaption>
                  )}
                  <View style={styles.cardActions}>
                    <Pressable style={styles.editButton} onPress={() => openEditModal(athlete)}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.deleteActionButton} onPress={() => deleteAthlete(athlete.id)}>
                      <Text style={styles.deleteActionButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Clear All Confirmation Modal */}
      {showClearAllConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Clear All Athletes</MobileH2>
            <MobileBody style={styles.modalMessage}>
              Are you sure you want to delete all athletes? This action cannot be undone.
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleClearAllCancel}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={handleClearAllConfirm}>
                <Text style={styles.modalButtonTextConfirm}>Clear All</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Edit Athlete Modal */}
      {showEditModal && athleteToEdit && (
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <MobileH2 style={styles.editModalTitle}>Edit Athlete</MobileH2>

            {/* Name */}
            <View style={styles.editFormRow}>
              <MobileBody style={styles.editLabel}>Name</MobileBody>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Athlete name"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
              />
            </View>

            {/* Gender */}
            <View style={styles.editFormRow}>
              <MobileBody style={styles.editLabel}>Gender</MobileBody>
              <View style={styles.editChipRow}>
                {['Male', 'Female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.editChip, editGender === g && styles.editChipActive]}
                    onPress={() => setEditGender(g)}
                  >
                    <MobileCaption style={[styles.editChipText, editGender === g && styles.editChipTextActive]}>
                      {g}
                    </MobileCaption>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tier */}
            <View style={styles.editFormRow}>
              <MobileBody style={styles.editLabel}>Tier</MobileBody>
              <View style={styles.editChipRow}>
                {['High', 'Med', 'Low'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.editChip, editTier === t && styles.editChipActive]}
                    onPress={() => setEditTier(t)}
                  >
                    <MobileCaption style={[styles.editChipText, editTier === t && styles.editChipTextActive]}>
                      {t}
                    </MobileCaption>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Best Events */}
            <View style={styles.editFormRow}>
              <MobileBody style={styles.editLabel}>Best Events (Optional)</MobileBody>
              <TextInput
                style={[styles.editInput, styles.editInputMultiline]}
                value={editBestEvents}
                onChangeText={setEditBestEvents}
                placeholder="e.g., 100m, 200m, 4x100"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.editModalButtonCancel} onPress={handleEditCancel}>
                <Text style={styles.editModalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.editModalButtonSave} onPress={handleEditSave}>
                <Text style={styles.editModalButtonTextSave}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Delete Athlete Confirmation Modal */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Delete Athlete</MobileH2>
            <MobileBody style={styles.modalMessage}>
              Are you sure you want to delete this athlete?
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={handleDeleteCancel}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={handleDeleteConfirm}>
                <Text style={styles.modalButtonTextConfirm}>Delete</Text>
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
    textAlign: 'left',
  },
  sectionTitleWrap: {
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  csvHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
    flexWrap: 'wrap',
    gap: scale(12),
  },
  csvTitle: {
    flex: 1,
  },
  csvToggleButton: {
    alignSelf: 'flex-end',
  },
  csvBody: {
    gap: scale(12),
  },
  csvHelp: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.8,
  },
  csvToggleContainer: {
    alignItems: 'center',
    marginVertical: scale(16),
  },
  athletesSection: {
    marginHorizontal: scale(0),
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
  clearButton: {
    backgroundColor: styleTokens.colors.danger,
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(6),
  },
  clearButtonText: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: 'bold',
  },
  tierSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    marginBottom: scale(16),
    padding: scale(16),
    backgroundColor: styleTokens.colors.surface,
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  tierItem: {
    alignItems: 'center',
    paddingHorizontal: scale(8),
  },
  genderSummary: {
    flexDirection: 'column',
    gap: scale(10),
    marginBottom: scale(20),
    padding: scale(16),
    backgroundColor: styleTokens.colors.surface,
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  genderSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  genderSummaryText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: scale(4),
    alignSelf: 'center',
  },
  tierHigh: {
    backgroundColor: 'rgba(100, 226, 211, 0.25)',
    borderWidth: 1,
    borderColor: styleTokens.colors.primary,
  },
  tierMed: {
    backgroundColor: 'rgba(100, 226, 211, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.8)',
  },
  tierLow: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.5)',
  },
  tierText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(12),
    fontWeight: '700',
  },
  tierCount: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: styleTokens.colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: scale(24),
  },
  emptyTitle: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: scale(18),
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
  },
  emptySubtext: {
    fontSize: scale(14),
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    opacity: 0.7,
  },
  athletesList: {
    gap: scale(12),
  },
  athleteCard: {
    backgroundColor: styleTokens.components.card.backgroundColor,
    padding: scale(16),
    borderRadius: scale(8),
    borderLeftWidth: scale(4),
    borderLeftColor: styleTokens.colors.primary,
    borderColor: styleTokens.components.card.borderColor,
    borderWidth: styleTokens.components.card.borderWidth,
    ...styleTokens.shadows.sm,
  },
  athleteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
    gap: scale(8),
    flexWrap: 'wrap',
  },
  athleteName: {
    color: styleTokens.colors.textPrimary,
    flex: 1,
    flexShrink: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  genderMale: {
    color: 'rgb(59, 130, 246)',
    fontWeight: '800',
    fontSize: scale(15),
    fontFamily: styleTokens.typography.fonts.robotoMono,
  },
  genderFemale: {
    color: 'rgb(236, 72, 153)',
    fontWeight: '800',
    fontSize: scale(15),
    fontFamily: styleTokens.typography.fonts.robotoMono,
  },
  bestEvents: {
    fontSize: scale(14),
    color: styleTokens.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: scale(12),
  },
  cardActions: {
    flexDirection: 'row',
    gap: scale(8),
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(8),
    borderRadius: scale(5),
    borderWidth: 1.5,
    borderColor: styleTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(36),
  },
  editButtonText: {
    color: styleTokens.colors.primary,
    fontSize: scale(13),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deleteActionButton: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(8),
    borderRadius: scale(5),
    backgroundColor: styleTokens.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(36),
  },
  deleteActionButtonText: {
    color: styleTokens.colors.white,
    fontSize: scale(13),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editFormRow: {
    marginBottom: scale(14),
  },
  editLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: scale(6),
    fontSize: scale(13),
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderRadius: scale(6),
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    fontSize: scale(15),
    color: styleTokens.colors.white,
    fontFamily: styleTokens.typography.fonts.robotoMono,
  },
  editInputMultiline: {
    minHeight: scale(64),
    textAlignVertical: 'top',
  },
  editChipRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  editChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  editChipActive: {
    backgroundColor: 'rgba(100, 226, 211, 0.8)',
    borderColor: styleTokens.colors.primary,
  },
  editChipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: scale(13),
    fontWeight: '600',
  },
  editChipTextActive: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  modalButtonTextSave: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(16),
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: styleTokens.colors.danger,
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(6),
    alignSelf: 'flex-end',
  },
  deleteButtonText: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: 'bold',
  },
  // ─── Edit Athlete Modal (dark theme) ────────────────────────────────────────
  editModalContent: {
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    padding: scale(24),
    width: '90%',
    maxWidth: scale(400),
    maxHeight: '90%',
    ...styleTokens.shadows.lg,
  },
  editModalTitle: {
    color: styleTokens.colors.white,
    marginBottom: scale(16),
    textAlign: 'center',
  },
  editModalButtonCancel: {
    flex: 1,
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  editModalButtonTextCancel: {
    color: styleTokens.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  editModalButtonSave: {
    flex: 1,
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48),
  },
  editModalButtonTextSave: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
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
});

export default TeamBuilderScreen; 