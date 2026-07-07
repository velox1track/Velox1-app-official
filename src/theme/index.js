import { Dimensions, PixelRatio } from 'react-native';
import * as Font from 'expo-font';
import { styleTokens } from './styleTokens';
import { scale } from '../utils/scale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const baseWidth = 375; // iPhone X base width

/**
 * Load all required fonts asynchronously
 * @returns {Promise} Font loading promise
 */
export async function loadFontsAsync() {
  return Font.loadAsync({
    'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../../assets/fonts/Inter-ExtraBold.ttf'),
    'Roboto-Regular': require('../../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Medium': require('../../assets/fonts/Roboto-Medium.ttf'),
    'Roboto-Bold': require('../../assets/fonts/Roboto-Bold.ttf'),
    'RobotoMono-Regular': require('../../assets/fonts/RobotoMono-Regular.ttf'),
    'RobotoMono-Bold': require('../../assets/fonts/RobotoMono-Bold.ttf'),
  });
}

/**
 * Responsive scaling utility for sizes (DEPRECATED - use scale from utils/scale.js)
 * @param {number} size - Base size to scale
 * @returns {number} Scaled size
 * @deprecated Use scale() from '../utils/scale' instead
 */
export const moderateScale = (size) => {
  console.warn('moderateScale is deprecated. Use scale() from utils/scale instead.');
  return scale(size);
};

/**
 * Get font family with weight mapping
 * @param {string} name - Font name (inter, roboto, robotoMono)
 * @param {string} weight - Font weight (regular, bold, extrabold)
 * @returns {string} Font family string
 */
export const getFont = (name, weight = 'regular') => {
  const fontMap = {
    inter: {
      regular: 'Inter-Regular',
      bold: 'Inter-Bold',
      extrabold: 'Inter-ExtraBold'
    },
    roboto: {
      regular: 'Roboto-Regular',
      bold: 'Roboto-Bold',
      medium: 'Roboto-Medium'
    },
    robotoMono: {
      regular: 'RobotoMono-Regular',
      bold: 'RobotoMono-Bold'
    }
  };
  
  return fontMap[name]?.[weight] || fontMap[name]?.regular || name;
};

/**
 * Get scaled typography style
 * @param {string} variant - Typography variant (h1, h2, h3, h4, body, caption)
 * @param {object} overrides - Style overrides
 * @returns {object} Typography style object
 */
export const getTypographyStyle = (variant, overrides = {}) => {
  const baseStyles = {
    h1: {
      fontFamily: getFont('inter', 'extrabold'),
      fontSize: scale(70), // H1: 70px
      fontWeight: styleTokens.typography.weights.extrabold,
      lineHeight: scale(77), // 70 * 1.1
      color: styleTokens.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: styleTokens.typography.letterSpacing.wide
    },
    h2: {
      fontFamily: getFont('inter', 'extrabold'),
      fontSize: scale(64), // H2: 64px
      fontWeight: styleTokens.typography.weights.extrabold,
      lineHeight: scale(70), // 64 * 1.1
      color: styleTokens.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: styleTokens.typography.letterSpacing.wide
    },
    h3: {
      fontFamily: getFont('inter', 'extrabold'),
      fontSize: scale(48), // H3: 48px
      fontWeight: styleTokens.typography.weights.extrabold,
      lineHeight: scale(53), // 48 * 1.1
      color: styleTokens.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: styleTokens.typography.letterSpacing.wide
    },
    h4: {
      fontFamily: getFont('inter', 'extrabold'),
      fontSize: scale(24), // H4: 24px
      fontWeight: styleTokens.typography.weights.extrabold,
      lineHeight: scale(29), // 24 * 1.2
      color: styleTokens.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: styleTokens.typography.letterSpacing.wide
    },
    body: {
      fontFamily: getFont('robotoMono', 'regular'),
      fontSize: scale(16), // Body: 16px
      fontWeight: styleTokens.typography.weights.regular,
      lineHeight: scale(24), // 16 * 1.5
      color: styleTokens.colors.textPrimary,
      textTransform: 'uppercase'
    },
    caption: {
      fontFamily: getFont('robotoMono', 'bold'),
      fontSize: scale(13), // Caption: 13px
      fontWeight: styleTokens.typography.weights.bold,
      lineHeight: scale(16), // 13 * 1.2
      color: styleTokens.colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: styleTokens.typography.letterSpacing.wide
    },
    navigation: {
      fontFamily: getFont('robotoMono', 'bold'),
      fontSize: scale(13), // Navigation: 13px
      fontWeight: styleTokens.typography.weights.bold,
      lineHeight: scale(16), // 13 * 1.2
      color: styleTokens.colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: styleTokens.typography.letterSpacing.wide
    }
  };

  return { ...baseStyles[variant], ...overrides };
};

// Export everything
export { styleTokens };
export const { colors, typography, spacing, radius, shadows, transitions, components } = styleTokens;

// Default export with font loading function
export default { loadFontsAsync, styleTokens };
