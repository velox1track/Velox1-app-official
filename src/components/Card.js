import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

/**
 * Card Component
 * 
 * Features:
 * - Glassmorphism effect (opacity-based alternative to backdrop-filter)
 * - Theme-based shadows and borders
 * - Configurable padding and styling
 * - Responsive design with proper text handling
 * - Minimum height to prevent layout shifts
 * - Improved padding for better text fitting
 * - Touch interaction support for navigation
 * 
 * Usage:
 * <Card>Content goes here</Card>
 * <Card style={{ padding: 16 }}>Custom padding</Card>
 * <Card variant="elevated">Elevated card</Card>
 * <Card minHeight={150}>Custom height card</Card>
 * <Card onTouchEnd={() => {}}>Touchable card</Card>
 */
export const Card = ({ 
  children, 
  style, 
  variant = 'default',
  minHeight,
  onTouchEnd,
  ...props 
}) => {
  const cardContent = (
    <View 
      style={[
        styles.card, 
        styles[variant], 
        minHeight && { minHeight: scale(minHeight) },
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );

  // If onTouchEnd is provided, wrap in Pressable
  if (onTouchEnd) {
    return (
      <Pressable
        onPress={onTouchEnd}
        style={({ pressed }) => [
          pressed && styles.cardPressed
        ]}
        accessibilityRole="button"
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: styleTokens.components.card.backgroundColor,
    borderColor: styleTokens.components.card.borderColor,
    borderWidth: styleTokens.components.card.borderWidth,
    borderRadius: styleTokens.components.card.borderRadius,
    padding: scale(20), // Improved padding for better text fitting
    minHeight: scale(100), // Increased minimum height for better content display
    ...styleTokens.shadows.md,
  },
  default: {
    // Default card styling
  },
  elevated: {
    ...styleTokens.shadows.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  subtle: {
    ...styleTokens.shadows.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primary: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderColor: styleTokens.colors.primary,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
