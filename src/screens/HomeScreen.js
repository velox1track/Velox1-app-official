import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import { MobileH1, MobileH2, MobileBody, MobileCaption } from '../components/Typography';
import { Card } from '../components/Card';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import { useResponsive } from '../utils/useResponsive';

/**
 * Home Screen
 * 
 * Features:
 * - Uses Velox 1 design system components
 * - Mobile-appropriate typography sizing
 * - Responsive typography and spacing
 * - Glassmorphism card effects
 * - Theme-based colors and shadows
 * - Proper touch targets and accessibility
 * - Scrollable content for all screen sizes
 * - Proper text wrapping for portrait mode
 * - Futuristic design with logo and accent colors
 * - Professional and innovative visual elements
 */
const HomeScreen = ({ navigation }) => {
  const responsive = useResponsive();
  
  const navigateTo = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          responsive.isLargeScreen && styles.scrollContentCentered
        ]}
        showsVerticalScrollIndicator={true}
        alwaysBounceVertical={true}
      >
        {/* Background accent elements - moved inside ScrollView */}
        <View style={styles.backgroundAccent} />
        <View style={styles.backgroundAccent2} />
        
        {/* Content wrapper for centering on large screens */}
        <View style={[
          styles.contentWrapper,
          responsive.isLargeScreen && { maxWidth: responsive.maxContentWidth, alignSelf: 'center' }
        ]}>
          {/* Header Section with Logo */}
          <View style={styles.header}>
            {/* Logo */}
            <Image 
              source={require('../../Images/brand_logo.png')} 
              style={[
                styles.logo,
                responsive.isLargeScreen && { width: responsive.scaleValue(80), height: responsive.scaleValue(80) }
              ]}
              resizeMode="contain"
            />
            
            {/* Title with accent underline */}
            <View style={styles.titleContainer}>
              <MobileH1 style={styles.title}>Velox 1</MobileH1>
              <View style={styles.titleAccent} />
            </View>
            
            <MobileH2 style={styles.subtitle} numberOfLines={2}>
              Track Competition Organizer
            </MobileH2>
          </View>

          {/* Navigation Cards with enhanced styling */}
          <View style={styles.cardContainer}>
          <Card 
            variant="elevated" 
            style={[styles.navCard, { borderLeftWidth: scale(4), borderLeftColor: styleTokens.colors.primary }]}
            onTouchEnd={() => navigateTo('RaceRoulette')}
          >
            <View style={styles.cardHeader}>
              <MobileH2 style={styles.cardTitle}>Race Roulette</MobileH2>
            </View>
            <MobileBody style={styles.cardSubtext} numberOfLines={3}>
              Generate and reveal event sequences with randomized order
            </MobileBody>
          </Card>

          <Card 
            variant="elevated" 
            style={[styles.navCard, { borderLeftWidth: scale(4), borderLeftColor: styleTokens.colors.primaryDark }]}
            onTouchEnd={() => navigateTo('TeamBuilder')}
          >
            <View style={styles.cardHeader}>
              <MobileH2 style={styles.cardTitle}>Team Builder</MobileH2>
            </View>
            <MobileBody style={styles.cardSubtext} numberOfLines={3}>
              Add athletes, manage teams, and organize competitors
            </MobileBody>
          </Card>

          <Card 
            variant="elevated" 
            style={[styles.navCard, { borderLeftWidth: scale(4), borderLeftColor: styleTokens.colors.primary }]}
            onTouchEnd={() => navigateTo('AssignTeams')}
          >
            <View style={styles.cardHeader}>
              <MobileH2 style={styles.cardTitle}>Assign Teams</MobileH2>
            </View>
            <MobileBody style={styles.cardSubtext} numberOfLines={3}>
              Automatically assign athletes to teams and events
            </MobileBody>
          </Card>

          <Card 
            variant="elevated" 
            style={[styles.navCard, { borderLeftWidth: scale(4), borderLeftColor: styleTokens.colors.primaryDark }]}
            onTouchEnd={() => navigateTo('Scoreboard')}
          >
            <View style={styles.cardHeader}>
              <MobileH2 style={styles.cardTitle}>Scoreboard</MobileH2>
            </View>
            <MobileBody style={styles.cardSubtext} numberOfLines={3}>
              Track team scores, results, and competition standings
            </MobileBody>
          </Card>

          <Card 
            variant="subtle" 
            style={[styles.navCard, { borderLeftWidth: scale(4), borderLeftColor: styleTokens.colors.border }]}
            onTouchEnd={() => navigateTo('Settings')}
          >
            <View style={styles.cardHeader}>
              <MobileH2 style={styles.cardTitle}>Settings</MobileH2>
            </View>
            <MobileBody style={styles.cardSubtext} numberOfLines={3}>
              App configuration, data management, and preferences
            </MobileBody>
          </Card>
        </View>

          {/* Footer Section with enhanced styling */}
          <View style={styles.footer}>
            <View style={styles.footerAccent} />
            <MobileCaption style={styles.footerText} numberOfLines={2}>
              Get started by creating your first event sequence or adding athletes!
            </MobileCaption>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: styleTokens.colors.background,
    ...(Platform.OS === 'web' ? {
      height: '100vh',
    } : {}),
  },
  
  // Background accent elements
  backgroundAccent: {
    position: 'absolute',
    top: scale(100),
    right: scale(-50),
    width: scale(200),
    height: scale(200),
    backgroundColor: styleTokens.colors.primaryLight,
    borderRadius: scale(100),
    opacity: 0.1,
    pointerEvents: 'none', // Prevent blocking touch events
  },
  backgroundAccent2: {
    position: 'absolute',
    bottom: scale(200),
    left: scale(-50),
    width: scale(150),
    height: scale(150),
    backgroundColor: styleTokens.colors.primary,
    borderRadius: scale(75),
    opacity: 0.05,
    pointerEvents: 'none', // Prevent blocking touch events
  },
  
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      overflow: 'visible',
    } : {}),
  },
  scrollContent: {
    paddingBottom: scale(40),
  },
  scrollContentCentered: {
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    paddingHorizontal: scale(24),
  },
  
  // Enhanced header with logo
  header: {
    alignItems: 'center',
    paddingTop: scale(20),
    paddingBottom: scale(32),
  },
  logo: {
    width: scale(80),
    height: scale(80),
    marginBottom: scale(20),
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: scale(16),
  },
  title: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  titleAccent: {
    width: scale(60),
    height: scale(3),
    backgroundColor: styleTokens.colors.primary,
    borderRadius: scale(2),
  },
  subtitle: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  
  // Enhanced card container
  cardContainer: {
    gap: scale(16),
  },
  navCard: {
    minHeight: scale(100),
    padding: scale(20),
    marginBottom: scale(16),
    elevation: 3,
    shadowColor: styleTokens.colors.shadow,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: scale(8),
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  cardTitle: {
    color: styleTokens.colors.textPrimary,
    textAlign: 'left',
    flex: 1,
  },
  cardSubtext: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'left',
    lineHeight: scale(20),
    flexShrink: 1,
    flexWrap: 'wrap',
    paddingLeft: scale(0), // Remove left padding since we now have left border
  },
  
  // Enhanced footer
  footer: {
    alignItems: 'center',
    paddingTop: scale(24),
    paddingBottom: scale(20),
  },
  footerAccent: {
    width: scale(40),
    height: scale(2),
    backgroundColor: styleTokens.colors.primary,
    borderRadius: scale(1),
    marginBottom: scale(16),
    opacity: 0.6,
  },
  footerText: {
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
});

export default HomeScreen; 