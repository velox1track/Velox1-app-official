import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { getTypographyStyle, scale } from '../theme'; // scale is re-exported from theme
import { scaleFont } from '../utils/scale'; // Direct import for scaleFont

/**
 * Typography Components
 * 
 * Features:
 * - Responsive font scaling based on screen width
 * - Prevents mid-word wrapping and clipping
 * - Optimized line heights for readability
 * 
 * Usage examples:
 * <H1>Hero Title</H1>
 * <H2>Page Title</H2>
 * <H3>Section Title</H3>
 * <H4>Card Title</H4>
 * <Body>Body text content</Body>
 * <Caption>Small caption text</Caption>
 * <Navigation>Nav item text</Navigation>
 */

// Mobile-appropriate typography variants
export const H1 = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.h1, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

export const H2 = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.h2, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

export const H3 = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.h3, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props }
  >
    {children}
  </Text>
);

export const H4 = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.h4, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

export const Body = ({ children, style, numberOfLines, ...props }) => (
  <Text
    style={[styles.body, style]}
    numberOfLines={numberOfLines}
    {...props}
  >
    {children}
  </Text>
);

export const Caption = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.caption, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

export const Navigation = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.navigation, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

// Mobile-appropriate typography variants with smaller sizes
export const MobileH1 = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.mobileH1, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

export const MobileH2 = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.mobileH2, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

export const MobileH3 = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.mobileH3, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

export const MobileBody = ({ children, style, numberOfLines, ...props }) => (
  <Text
    style={[styles.mobileBody, style]}
    numberOfLines={numberOfLines}
    {...props}
  >
    {children}
  </Text>
);

export const MobileCaption = ({ children, style, numberOfLines = 1, ...props }) => (
  <Text
    style={[styles.mobileCaption, style]}
    numberOfLines={numberOfLines}
    ellipsizeMode="tail"
    {...props}
  >
    {children}
  </Text>
);

const styles = StyleSheet.create({
  // Original design system sizes (for larger displays)
  h1: {
    ...getTypographyStyle('h1'),
    ...scaleFont(70, 1.1), // H1: 70px with 1.1 line height
    flexShrink: 1,
  },
  h2: {
    ...getTypographyStyle('h2'),
    ...scaleFont(48, 1.2), // H2: 48px with 1.2 line height
    flexShrink: 1,
  },
  h3: {
    ...getTypographyStyle('h3'),
    ...scaleFont(32, 1.3), // H3: 32px with 1.3 line height
    flexShrink: 1,
  },
  h4: {
    ...getTypographyStyle('h4'),
    ...scaleFont(24, 1.4), // H4: 24px with 1.4 line height
    flexShrink: 1,
  },
  caption: {
    ...getTypographyStyle('caption'),
    ...scaleFont(14, 1.2), // Caption: 14px with 1.2 line height
    flexShrink: 1,
  },
  navigation: {
    ...getTypographyStyle('navigation'),
    ...scaleFont(16, 1.3), // Navigation: 16px with 1.3 line height
    flexShrink: 1,
  },
  body: {
    ...getTypographyStyle('body'),
    ...scaleFont(16, 1.5), // Body: 16px with 1.5 line height
    flexShrink: 1,
    flexWrap: 'wrap',
  },

  // Mobile-appropriate sizes (for mobile screens)
  mobileH1: {
    ...getTypographyStyle('h1'),
    ...scaleFont(32, 1.1), // Mobile H1: 32px (much smaller)
    flexShrink: 1,
  },
  mobileH2: {
    ...getTypographyStyle('h2'),
    ...scaleFont(24, 1.2), // Mobile H2: 24px
    flexShrink: 1,
  },
  mobileH3: {
    ...getTypographyStyle('h3'),
    ...scaleFont(20, 1.3), // Mobile H3: 20px
    flexShrink: 1,
  },
  mobileBody: {
    ...getTypographyStyle('body'),
    ...scaleFont(16, 1.4), // Mobile Body: 16px
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  mobileCaption: {
    ...getTypographyStyle('caption'),
    ...scaleFont(12, 1.2), // Mobile Caption: 12px
    flexShrink: 1,
  },
});
