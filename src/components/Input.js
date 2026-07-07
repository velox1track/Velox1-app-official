import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

/**
 * Input Component
 * 
 * Features:
 * - Theme-based styling
 * - Focus and error states
 * - Optional label
 * - Placeholder styling
 * - Accessible design
 * - Responsive font scaling
 * - Proper text wrapping and sizing
 * 
 * Usage:
 * <Input placeholder="Enter text" />
 * <Input label="Email" placeholder="Enter email" />
 * <Input label="Password" error="Invalid password" />
 */
export const Input = ({ 
  label,
  placeholder, 
  value, 
  onChangeText, 
  error,
  style, 
  inputStyle,
  allowNegative = false,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          inputStyle
        ]}
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => {
          if (props.keyboardType === 'numeric') {
            // Allow digits, optional leading '-' if allowNegative
            const pattern = allowNegative ? /^-?\d*$/ : /^\d*$/;
            if (!pattern.test(text)) return;
          }
          onChangeText && onChangeText(text);
        }}
        placeholderTextColor={styleTokens.colors.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityRole="text"
        accessibilityLabel={label || placeholder}
        {...props}
      />
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: scale(16), // Scaled spacing
  },
  label: {
    fontFamily: styleTokens.typography.fonts.robotoMono,
    fontSize: scale(14), // Scaled font size
    fontWeight: styleTokens.typography.weights.bold,
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(8), // Scaled spacing
    textTransform: 'uppercase',
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    flexShrink: 1,
  },
  input: {
    backgroundColor: styleTokens.components.input.backgroundColor,
    borderColor: styleTokens.components.input.borderColor,
    borderWidth: 1,
    borderRadius: scale(4), // Scaled border radius
    paddingVertical: scale(18), // Scaled padding
    paddingHorizontal: scale(24), // Scaled padding
    fontSize: scale(16), // Scaled font size
    color: styleTokens.components.input.color,
    fontFamily: styleTokens.components.input.fontFamily,
    minHeight: scale(48), // Accessibility: minimum touch target
    ...styleTokens.shadows.sm,
  },
  inputFocused: {
    borderColor: styleTokens.colors.primary,
    borderWidth: 2,
    ...styleTokens.shadows.md,
  },
  inputError: {
    borderColor: styleTokens.colors.danger,
    borderWidth: 2,
  },
  errorText: {
    fontFamily: styleTokens.typography.fonts.robotoMono,
    fontSize: scale(12), // Scaled font size
    fontWeight: styleTokens.typography.weights.bold,
    color: styleTokens.colors.danger,
    marginTop: scale(8), // Scaled spacing
    textTransform: 'uppercase',
    flexShrink: 1,
  },
});
