import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

/**
 * Primary Button Component
 * 
 * Features:
 * - Pressed state with scale animation
 * - Disabled state with opacity
 * - Minimum touch target (48px)
 * - Theme-based styling
 * - Responsive font scaling
 * - Prevents text wrapping and clipping
 * 
 * Usage:
 * <ButtonPrimary title="Submit" onPress={handleSubmit} />
 * <ButtonPrimary title="Disabled" onPress={handlePress} disabled />
 */
export const ButtonPrimary = ({ 
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
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(16), // Scaled padding
    paddingHorizontal: scale(32), // Scaled padding
    borderRadius: scale(4), // Scaled border radius
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(48), // Accessibility: minimum touch target
    minWidth: scale(120), // Minimum width to prevent squishing
    ...styleTokens.shadows.sm,
  },
  buttonPressed: {
    backgroundColor: styleTokens.colors.primaryDark,
    transform: [{ scale: 0.98 }],
    ...styleTokens.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: styleTokens.colors.textMuted,
  },
  buttonText: {
    color: styleTokens.colors.white, // Use white text for better contrast on seafoam background
    fontSize: scale(16), // Scaled font size
    fontWeight: styleTokens.components.button.primary.fontWeight,
    textTransform: 'uppercase',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    textAlign: 'center',
    flexShrink: 1,
  },
});
