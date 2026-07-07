import { useWindowDimensions } from 'react-native';

/**
 * Responsive utility hook for Velox 1 app
 * Provides responsive scaling based on screen size
 * 
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet (iPad): 768px - 1024px
 * - Desktop: > 1024px
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLargeScreen = width >= 768; // iPad and above
  
  /**
   * Get responsive scale factor
   * Mobile: 1.0 (base)
   * Tablet: 0.75 (scale down)
   * Desktop: 0.65 (scale down more)
   */
  const getScaleFactor = () => {
    if (isDesktop) return 0.65;
    if (isTablet) return 0.75;
    return 1.0;
  };
  
  /**
   * Scale a value responsively
   * @param {number} baseValue - Base value for mobile
   * @returns {number} Scaled value
   */
  const scaleValue = (baseValue) => {
    return Math.round(baseValue * getScaleFactor());
  };
  
  /**
   * Get responsive font size
   * @param {number} mobileSize - Font size for mobile
   * @returns {number} Responsive font size
   */
  const getFontSize = (mobileSize) => {
    return scaleValue(mobileSize);
  };
  
  /**
   * Get responsive padding
   * @param {number} mobilePadding - Padding for mobile
   * @returns {number} Responsive padding
   */
  const getPadding = (mobilePadding) => {
    return scaleValue(mobilePadding);
  };
  
  /**
   * Get max content width for centering on large screens
   * Mobile: 100%
   * Tablet: 600px
   * Desktop: 800px
   */
  const getMaxContentWidth = () => {
    if (isDesktop) return 800;
    if (isTablet) return 600;
    return width; // Full width on mobile
  };
  
  /**
   * Get responsive button max width
   * Prevents buttons from stretching across entire screen on iPad/Desktop
   */
  const getButtonMaxWidth = () => {
    if (isLargeScreen) return 400;
    return width - 48; // Full width minus padding on mobile
  };
  
  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    scaleFactor: getScaleFactor(),
    scaleValue,
    getFontSize,
    getPadding,
    maxContentWidth: getMaxContentWidth(),
    buttonMaxWidth: getButtonMaxWidth(),
  };
};

export default useResponsive;
