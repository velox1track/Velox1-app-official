import React from 'react';
import { View, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { MobileH2, MobileCaption } from './Typography';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

const EventCard = ({ event, index, isRevealed, isNext, isAssigned, onPress }) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isClickable = isRevealed && onPress;
  
  const CardWrapper = isClickable ? Pressable : View;
  
  return (
    <CardWrapper 
      style={[
        styles.card,
        isRevealed ? styles.revealed : styles.hidden,
        isNext ? styles.nextEvent : null,
        isAssigned ? styles.assigned : null,
        isClickable ? styles.clickable : null,
        isLandscape && styles.cardLandscape
      ]}
      onPress={isClickable ? () => onPress(index, event) : undefined}
      android_ripple={isClickable ? { color: 'rgba(255,255,255,0.1)' } : undefined}
    >
      <MobileCaption style={styles.index}>#{index + 1}</MobileCaption>
      <MobileH2 style={[
        styles.eventName,
        isRevealed ? styles.revealedText : styles.hiddenText
      ]}>
        {isRevealed ? event : '???'}
      </MobileH2>
      {isNext && !isRevealed && (
        <MobileCaption style={styles.nextIndicator}>Next Event</MobileCaption>
      )}
      {isRevealed && isAssigned && (
        <MobileCaption style={styles.assignedIndicator}>✓ Assigned</MobileCaption>
      )}
      {isRevealed && !isAssigned && (
        <MobileCaption style={styles.unassignedIndicator}>Tap to Assign</MobileCaption>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: scale(16),
    marginVertical: scale(8),
    marginHorizontal: scale(16),
    borderRadius: styleTokens.components.card.borderRadius,
    borderWidth: scale(2),
    minHeight: scale(80),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: styleTokens.colors.shadow,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  hidden: {
    backgroundColor: styleTokens.colors.primaryDark,
    borderColor: styleTokens.colors.border,
  },
  revealed: {
    backgroundColor: styleTokens.colors.success,
    borderColor: styleTokens.colors.success,
  },
  assigned: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
  },
  clickable: {
    // Add subtle visual feedback for clickable state
    opacity: 1,
  },
  nextEvent: {
    borderColor: '#64E2D3',
    borderWidth: scale(3),
  },
  index: {
    color: styleTokens.colors.white,
    marginBottom: scale(4),
  },
  eventName: {
    textAlign: 'center',
  },
  hiddenText: {
    color: styleTokens.colors.textSecondary,
  },
  revealedText: {
    color: styleTokens.colors.white,
  },
  nextIndicator: {
    color: '#64E2D3',
    marginTop: scale(4),
  },
  assignedIndicator: {
    color: styleTokens.colors.white,
    marginTop: scale(4),
    fontWeight: 'bold',
  },
  unassignedIndicator: {
    color: styleTokens.colors.white,
    marginTop: scale(4),
    opacity: 0.8,
  },
  cardLandscape: {
    flex: 1,
    minWidth: scale(200),
    marginHorizontal: scale(8),
  },
});

export default EventCard; 