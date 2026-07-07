import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

/**
 * Header Component
 * 
 * Features:
 * - Responsive design for portrait and landscape
 * - Customizable title, back button, and action button
 * - Theme-based styling with proper touch targets
 * - Adaptive padding based on orientation
 * - Proper text handling with ellipsis
 * 
 * Usage:
 * <Header title="Screen Title" />
 * <Header title="Screen Title" onBack={() => {}} />
 * <Header title="Screen Title" actionTitle="Save" onAction={() => {}} />
 */
export const Header = ({ 
  title, 
  onBack, 
  actionTitle, 
  onAction, 
  style, 
  ...props 
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  
  // Responsive padding based on orientation
  const getResponsivePadding = () => {
    if (isLandscape) {
      return {
        vertical: scale(16),    // Reduced vertical padding in landscape
        horizontal: scale(32)   // Reduced horizontal padding in landscape
      };
    }
    return {
      vertical: scale(24),      // Standard vertical padding in portrait
      horizontal: scale(48)     // Standard horizontal padding in portrait
    };
  };

  const padding = getResponsivePadding();

  return (
    <View 
      style={[
        styles.header, 
        { 
          paddingVertical: padding.vertical,
          paddingHorizontal: padding.horizontal
        },
        style
      ]} 
      {...props}
    >
      <View style={styles.leftSection}>
        {onBack && (
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed
            ]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityState={{ pressed: false }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.centerSection}>
        <Text 
          style={styles.headerTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {actionTitle && onAction && (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed
            ]}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionTitle}
            accessibilityState={{ pressed: false }}
          >
            <Text 
              style={styles.actionButtonText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {actionTitle}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'rgba(159, 167, 174, 0.95)',
    // paddingVertical and paddingHorizontal are now dynamic
    borderBottomWidth: 1,
    borderBottomColor: styleTokens.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: scale(64), // Accessibility: minimum touch target
    ...styleTokens.shadows.sm,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: styleTokens.typography.fonts.robotoMono,
    fontSize: scale(20), // Scaled font size
    fontWeight: styleTokens.typography.weights.bold,
    color: styleTokens.colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    flexShrink: 1, // Added
  },
  backButton: {
    padding: scale(8), // Scaled padding
    borderRadius: scale(4), // Scaled border radius
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: scale(44), // Minimum touch target
    minHeight: scale(44), // Minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ scale: 0.95 }],
  },
  backButtonText: {
    fontSize: scale(24), // Scaled font size
    color: styleTokens.colors.textPrimary,
    fontWeight: styleTokens.typography.weights.bold,
  },
  actionButton: {
    paddingVertical: scale(8), // Scaled padding
    paddingHorizontal: scale(16), // Scaled padding
    borderRadius: scale(4), // Scaled border radius
    backgroundColor: styleTokens.colors.primary,
    minWidth: scale(44), // Minimum touch target
    minHeight: scale(44), // Minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    backgroundColor: styleTokens.colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  actionButtonText: {
    fontFamily: styleTokens.typography.fonts.robotoMono,
    fontSize: scale(14), // Scaled font size
    fontWeight: styleTokens.typography.weights.bold,
    color: styleTokens.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    textAlign: 'center',
    flexShrink: 1, // Added
  },
});
