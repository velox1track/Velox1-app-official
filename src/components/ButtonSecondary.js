import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

/**
 * Secondary Button Component
 * 
 * Features:
 * - Secondary button styling (nav CTA style)
 * - Pressed state with scale animation
 * - Disabled state with opacity
 * - Minimum touch target (48px)
 * - Theme-based styling
 * - Responsive font scaling
 * - Prevents text wrapping and clipping
 * 
 * Usage:
 * <ButtonSecondary title="Cancel" onPress={handleCancel} />
 * <ButtonSecondary title="Back" onPress={handleBack} disabled />
 */
export const ButtonSecondary = ({ 
  title, 
  children,
  onPress, 
  disabled = false, 
  style, 
  textStyle,
  ...props 
}) => {
  const content = typeof title !== 'undefined' && title !== null ? title : (typeof children !== 'undefined' ? children : 'Button');
  const accessibilityText = typeof content === 'string' ? content : 'Button';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityText}
      {...props}
    >
      <Text 
        style={[styles.buttonText, textStyle]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {content}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: styleTokens.colors.primaryDark,
    paddingVertical: scale(12), // Increased padding for better touch targets
    paddingHorizontal: scale(20), // Adjusted horizontal padding
    borderRadius: scale(8), // Slightly increased border radius
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48), // Accessibility: minimum touch target
    minWidth: scale(120), // Increased minimum width
    ...styleTokens.shadows.sm,
  },
  buttonPressed: {
    backgroundColor: styleTokens.colors.primary,
    transform: [{ scale: 0.98 }],
    ...styleTokens.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: styleTokens.colors.textMuted,
  },
  buttonText: {
    color: styleTokens.colors.white,
    fontSize: scale(14), // Slightly increased font size for better readability
    fontWeight: styleTokens.components.button.secondary.fontWeight,
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: scale(18), // Added line height for better text spacing
  },
});
