import React from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Text } from 'react-native';
import { MobileH2, MobileBody, MobileCaption } from './Typography';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

const RequirementRow = ({ label, needed, available }) => {
  const isShort = available < needed;
  return (
    <View style={styles.requirementRow}>
      <MobileBody style={styles.requirementLabel}>{label}</MobileBody>
      <MobileBody style={[styles.requirementValue, isShort && styles.requirementValueShort]}>
        {available} / {needed} enabled
      </MobileBody>
    </View>
  );
};

const SequenceValidationModal = ({
  visible,
  title = 'Cannot Generate Sequence',
  summary,
  onClose,
  onGoToSettings,
}) => {
  if (!summary) return null;

  const {
    totalEvents,
    requiredIndividual,
    requiredRelays,
    availableIndividual,
    availableRelay,
  } = summary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <MobileH2 style={styles.title}>{title}</MobileH2>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <MobileBody style={styles.message}>
              Your sequence is set to {totalEvents} event{totalEvents !== 1 ? 's' : ''} with{' '}
              {requiredRelays} relay{requiredRelays !== 1 ? 's' : ''}. That requires enough enabled
              events in the right categories.
            </MobileBody>

            <View style={styles.requirementsBox}>
              <RequirementRow
                label="Individual events"
                needed={requiredIndividual}
                available={availableIndividual}
              />
              <RequirementRow
                label="Relay events"
                needed={requiredRelays}
                available={availableRelay}
              />
            </View>

            <MobileCaption style={styles.tip}>
              Individual events come from Short Sprints, Middle Distances, Long Distances, and
              Technical Events. Relay events only count when Number of Relays is greater than 0.
              Enable more events in Settings → Event Configuration, then try again.
            </MobileCaption>
          </ScrollView>

          <View style={styles.buttons}>
            {onGoToSettings ? (
              <Pressable style={styles.buttonSecondary} onPress={onGoToSettings}>
                <Text style={styles.buttonSecondaryText}>Go to Settings</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.buttonPrimary, !onGoToSettings && styles.buttonPrimaryFull]}
              onPress={onClose}
            >
              <Text style={styles.buttonPrimaryText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  content: {
    backgroundColor: 'rgba(30, 40, 50, 0.98)',
    borderRadius: scale(12),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(400),
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    ...styleTokens.shadows.lg,
  },
  title: {
    color: styleTokens.colors.white,
    marginBottom: scale(16),
    textAlign: 'center',
    fontWeight: '700',
  },
  scroll: {
    maxHeight: scale(320),
  },
  scrollContent: {
    paddingBottom: scale(8),
  },
  message: {
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: scale(16),
    lineHeight: scale(22),
    textAlign: 'center',
  },
  requirementsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: scale(8),
    padding: scale(14),
    marginBottom: scale(16),
    gap: scale(10),
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: scale(12),
  },
  requirementLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
  },
  requirementValue: {
    color: styleTokens.colors.primary,
    fontWeight: '700',
  },
  requirementValueShort: {
    color: '#FFC107',
  },
  tip: {
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: scale(18),
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(16),
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    fontSize: scale(14),
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(8),
    backgroundColor: styleTokens.colors.primary,
    alignItems: 'center',
  },
  buttonPrimaryFull: {
    flex: 1,
  },
  buttonPrimaryText: {
    color: styleTokens.colors.background,
    fontWeight: '700',
    fontSize: scale(14),
  },
});

export default SequenceValidationModal;
