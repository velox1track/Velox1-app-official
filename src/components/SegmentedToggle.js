import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

const CONTAINER_PADDING = scale(4);

/**
 * Sleek pill-style segmented control with an animated sliding thumb.
 * Generic 2+ option toggle — pass `options` as [{ value, label }].
 */
const SegmentedToggle = ({ options, value, onChange, style, accessibilityLabel }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const translateX = useRef(new Animated.Value(0)).current;
  const isFirstLayout = useRef(true);

  const segmentWidth = options.length > 0
    ? (containerWidth - CONTAINER_PADDING * 2) / options.length
    : 0;

  useEffect(() => {
    if (!segmentWidth) return;
    const toValue = activeIndex * segmentWidth;

    if (isFirstLayout.current) {
      translateX.setValue(toValue);
      isFirstLayout.current = false;
      return;
    }

    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      bounciness: 6,
      speed: 16,
    }).start();
  }, [activeIndex, segmentWidth]);

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: segmentWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {options.map((option, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[styles.segmentText, isActive && styles.segmentTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: scale(999),
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.3)',
    padding: CONTAINER_PADDING,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    top: CONTAINER_PADDING,
    left: CONTAINER_PADDING,
    bottom: CONTAINER_PADDING,
    borderRadius: scale(999),
    backgroundColor: styleTokens.colors.primary,
    shadowColor: styleTokens.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: scale(8),
    elevation: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    flexShrink: 1,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: scale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: styleTokens.typography.letterSpacing.normal,
    fontFamily: styleTokens.typography.fonts.robotoMono,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: styleTokens.colors.textPrimary,
  },
});

export default SegmentedToggle;
