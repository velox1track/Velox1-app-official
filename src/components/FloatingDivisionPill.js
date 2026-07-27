import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DivisionSwitcher from './DivisionSwitcher';
import { useDivision } from '../context/DivisionContext';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import { useResponsive } from '../utils/useResponsive';

// Exported so every screen ScrollView can add matching bottom padding,
// ensuring no list content is permanently hidden behind the pill.
export const PILL_BOTTOM_CLEARANCE = scale(88);

const FloatingDivisionPill = () => {
  const { activeDivisionName } = useDivision();
  const [visible, setVisible] = useState(false);
  const { isMobile } = useResponsive();

  // Compact footprint on mobile, fuller on tablet/desktop
  const pillOverride = isMobile
    ? {
        maxWidth: scale(150),
        paddingVertical: scale(7),
        paddingHorizontal: scale(11),
        gap: scale(5),
        bottom: scale(16),
        right: scale(14),
      }
    : {
        maxWidth: scale(220),
        paddingVertical: scale(10),
        paddingHorizontal: scale(16),
        gap: scale(7),
        bottom: scale(20),
        right: scale(20),
      };

  const pillTextFontSize = isMobile ? scale(10) : scale(13);
  const chevronFontSize = isMobile ? scale(12) : scale(15);

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.pill,
          pillOverride,
          pressed && styles.pillPressed,
        ]}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Switch division. Currently: ${activeDivisionName}`}
        accessibilityHint="Opens the division switcher panel"
      >
        <View style={styles.activeDot} />
        <Text style={[styles.pillText, { fontSize: pillTextFontSize }]} numberOfLines={1}>
          {activeDivisionName}
        </Text>
        <Text style={[styles.chevron, { fontSize: chevronFontSize, lineHeight: chevronFontSize * 1.3 }]}>▾</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Tapping the backdrop dismisses the sheet */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVisible(false)}
            accessibilityLabel="Close division switcher"
          />

          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {/* Scroll wrapper keeps the switcher usable on short screens */}
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <DivisionSwitcher />
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.doneButtonPressed,
              ]}
              onPress={() => setVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close division switcher"
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // ─── Floating pill ───────────────────────────────────────────────────────────
  pill: {
    // 'fixed' on web keeps the pill anchored to the viewport regardless of
    // scroll position. On native 'absolute' is correct since the shell fills
    // the physical screen and never scrolls itself.
    ...Platform.select({
      web: { position: 'fixed' },
      default: { position: 'absolute' },
    }),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 10, 11, 0.9)',
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.45)',
    minHeight: scale(44),
    // Teal-tinted drop shadow for depth
    shadowColor: styleTokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(14),
    elevation: 10,
    zIndex: 200,
  },
  pillPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
    borderColor: styleTokens.colors.primary,
  },

  // Glowing teal status dot
  activeDot: {
    width: scale(7),
    height: scale(7),
    borderRadius: scale(4),
    backgroundColor: styleTokens.colors.primary,
    shadowColor: styleTokens.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: scale(5),
    elevation: 3,
  },

  pillText: {
    flex: 1,
    flexShrink: 1,
    color: styleTokens.colors.white,
    fontSize: scale(13),
    fontWeight: '700',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },

  chevron: {
    color: styleTokens.colors.primary,
    fontSize: scale(15),
    fontWeight: '700',
    lineHeight: scale(18),
  },

  // ─── Modal / sheet ────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },

  sheet: {
    backgroundColor: 'rgba(12, 17, 23, 0.99)',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.35)',
    paddingTop: scale(12),
    paddingHorizontal: scale(20),
    paddingBottom: scale(28),
    // Lift shadow above screen content
    shadowColor: styleTokens.colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: scale(16),
    elevation: 12,
  },

  // Drag-handle affordance
  sheetHandle: {
    width: scale(44),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignSelf: 'center',
    marginBottom: scale(18),
  },

  // ─── Done button ─────────────────────────────────────────────────────────────
  doneButton: {
    marginTop: scale(4),
    backgroundColor: styleTokens.colors.primary,
    paddingVertical: scale(13),
    paddingHorizontal: scale(32),
    borderRadius: scale(8),
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: scale(48),
    justifyContent: 'center',
    shadowColor: styleTokens.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: scale(8),
    elevation: 4,
  },
  doneButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  doneButtonText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(14),
    fontWeight: '700',
    fontFamily: styleTokens.typography.fonts.robotoMono,
    textTransform: 'uppercase',
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
});

export default FloatingDivisionPill;
