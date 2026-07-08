import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MobileBody, MobileCaption, MobileH2 } from './Typography';
import { Input } from './Input';
import { useDivision } from '../context/DivisionContext';
import { getNextAvailableDivisionName, isDuplicateDivisionName } from '../lib/division';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

const DivisionSwitcher = ({ style }) => {
  const {
    activeDivisionId,
    activeDivisionName,
    divisions,
    setActiveDivision,
    createDivision,
    renameDivision,
    deleteDivision,
  } = useDivision();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedNewName = useMemo(
    () => getNextAvailableDivisionName(divisions),
    [divisions]
  );

  const canDelete = divisions.length > 1;

  const openCreateModal = () => {
    setNameInput('');
    setNameError('');
    setShowCreateModal(true);
  };

  const openRenameModal = () => {
    setNameInput(activeDivisionName);
    setNameError('');
    setShowRenameModal(true);
  };

  const handleCreate = async () => {
    const name = nameInput.trim() || suggestedNewName;
    if (isDuplicateDivisionName(divisions, name)) {
      setNameError('A division with this name already exists.');
      return;
    }
    setNameError('');
    setIsSubmitting(true);
    try {
      await createDivision(name);
      setShowCreateModal(false);
      setNameInput('');
    } catch (error) {
      setNameError(error.message || 'Failed to create division.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async () => {
    const name = nameInput.trim();
    if (!name) {
      setNameError('Division name cannot be empty.');
      return;
    }
    if (isDuplicateDivisionName(divisions, name, activeDivisionId)) {
      setNameError('A division with this name already exists.');
      return;
    }
    setNameError('');
    setIsSubmitting(true);
    try {
      await renameDivision(activeDivisionId, name);
      setShowRenameModal(false);
      setNameInput('');
    } catch (error) {
      setNameError(error.message || 'Failed to rename division.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsSubmitting(true);
    try {
      await deleteDivision(activeDivisionId);
      setShowDeleteConfirm(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete division.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitch = async (divisionId) => {
    if (divisionId === activeDivisionId) return;
    try {
      await setActiveDivision(divisionId);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to switch division.');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MobileCaption style={styles.label}>ACTIVE DIVISION</MobileCaption>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {divisions.map((division) => {
          const isActive = division.id === activeDivisionId;
          return (
            <TouchableOpacity
              key={division.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handleSwitch(division.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Switch to ${division.name}`}
            >
              <MobileCaption
                style={[styles.chipText, isActive && styles.chipTextActive]}
                numberOfLines={1}
              >
                {division.name}
              </MobileCaption>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.chip, styles.newChip]}
          onPress={openCreateModal}
          accessibilityRole="button"
          accessibilityLabel="Create new division"
        >
          <MobileCaption style={styles.newChipText}>+ New</MobileCaption>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.manageRow}>
        <Pressable
          style={({ pressed }) => [styles.manageButton, pressed && styles.manageButtonPressed]}
          onPress={openRenameModal}
          accessibilityRole="button"
          accessibilityLabel="Rename division"
        >
          <MobileCaption style={styles.manageButtonText}>Rename</MobileCaption>
        </Pressable>

        {canDelete ? (
          <Pressable
            style={({ pressed }) => [
              styles.manageButton,
              styles.manageButtonDanger,
              pressed && styles.manageButtonDangerPressed,
            ]}
            onPress={() => setShowDeleteConfirm(true)}
            accessibilityRole="button"
            accessibilityLabel="Delete division"
          >
            <MobileCaption style={styles.manageButtonDangerText}>Delete</MobileCaption>
          </Pressable>
        ) : (
          <MobileCaption style={styles.manageHint}>At least one division required</MobileCaption>
        )}
      </View>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Create Division</MobileH2>
            <MobileBody style={styles.modalMessage}>
              Config from the current division will be copied. Athletes, teams, and scores start empty.
            </MobileBody>
            <Input
              label="Division Name"
              placeholder={suggestedNewName}
              value={nameInput}
              onChangeText={(text) => {
                setNameInput(text);
                if (nameError) setNameError('');
              }}
              error={nameError}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                <MobileBody style={styles.modalButtonTextCancel}>Cancel</MobileBody>
              </Pressable>
              <Pressable
                style={styles.modalButtonConfirm}
                onPress={handleCreate}
                disabled={isSubmitting}
              >
                <MobileBody style={styles.modalButtonText}>
                  {isSubmitting ? 'Creating…' : 'Create'}
                </MobileBody>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Rename Division</MobileH2>
            <MobileBody style={styles.modalMessage}>
              Update the name for "{activeDivisionName}".
            </MobileBody>
            <Input
              label="Division Name"
              placeholder="Enter division name"
              value={nameInput}
              onChangeText={(text) => {
                setNameInput(text);
                if (nameError) setNameError('');
              }}
              error={nameError}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowRenameModal(false)}
                disabled={isSubmitting}
              >
                <MobileBody style={styles.modalButtonTextCancel}>Cancel</MobileBody>
              </Pressable>
              <Pressable
                style={styles.modalButtonConfirm}
                onPress={handleRename}
                disabled={isSubmitting}
              >
                <MobileBody style={styles.modalButtonText}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </MobileBody>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MobileH2 style={styles.modalTitle}>Delete Division</MobileH2>
            <MobileBody style={styles.modalMessage}>
              Permanently delete "{activeDivisionName}" and all of its data? This cannot be undone.
            </MobileBody>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
              >
                <MobileBody style={styles.modalButtonTextCancel}>Cancel</MobileBody>
              </Pressable>
              <Pressable
                style={[styles.modalButtonConfirm, styles.modalButtonDanger]}
                onPress={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                <MobileBody style={styles.modalButtonText}>
                  {isSubmitting ? 'Deleting…' : 'Delete'}
                </MobileBody>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: scale(16),
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...styleTokens.shadows.sm,
  },
  label: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    opacity: 0.85,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingRight: scale(4),
  },
  chip: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
    borderRadius: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    minHeight: scale(40),
    justifyContent: 'center',
    maxWidth: scale(180),
  },
  chipActive: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
    shadowColor: styleTokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  chipText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: styleTokens.colors.white,
  },
  newChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
  },
  newChipText: {
    color: styleTokens.colors.textSecondary,
    fontWeight: '700',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(10),
    flexWrap: 'wrap',
  },
  manageButton: {
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: scale(32),
    justifyContent: 'center',
  },
  manageButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  manageButtonDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  manageButtonDangerPressed: {
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
  },
  manageButtonText: {
    color: styleTokens.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  manageButtonDangerText: {
    color: '#ff6b6b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  manageHint: {
    color: styleTokens.colors.textMuted,
    fontStyle: 'italic',
  },
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
    marginBottom: scale(16),
    textAlign: 'center',
    lineHeight: scale(22),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12),
    marginTop: scale(8),
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

export default DivisionSwitcher;
