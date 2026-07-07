import React, { useState } from 'react';
import { 
  ScrollView, 
  View, 
  StyleSheet, 
  Alert,
  SafeAreaView,
  useWindowDimensions
} from 'react-native';
import { 
  H1, 
  H2, 
  H3, 
  H4, 
  Body, 
  Caption, 
  Navigation 
} from '../components/Typography';
import { ButtonPrimary } from '../components/ButtonPrimary';
import { ButtonSecondary } from '../components/ButtonSecondary';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Header } from '../components/Header';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

/**
 * Style Demo Screen
 * 
 * This screen showcases all the design system components
 * for visual verification and testing.
 * 
 * Features:
 * - Responsive typography scaling
 * - Prevents text clipping and wrapping
 * - Scaled spacing and sizing
 * - Proper touch targets
 * - Improved card layout for better text fitting
 * - Responsive layout for portrait and landscape orientations
 */
export default function StyleDemoScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  const handlePrimaryPress = () => {
    Alert.alert('Primary Button', 'Primary button pressed!');
  };

  const handleSecondaryPress = () => {
    Alert.alert('Secondary Button', 'Secondary button pressed!');
  };

  const handleInputChange = (text) => {
    setInputValue(text);
    if (text.length > 0) {
      setInputError('');
    }
  };

  const handleInputSubmit = () => {
    if (inputValue.length === 0) {
      setInputError('This field is required');
    } else {
      Alert.alert('Input Submitted', `Value: ${inputValue}`);
    }
  };

  const handleBack = () => {
    Alert.alert('Back', 'Back button pressed');
  };

  const handleAction = () => {
    Alert.alert('Action', 'Action button pressed');
  };

  // Responsive margins based on orientation
  const getResponsiveMargins = () => {
    if (isLandscape) {
      return {
        horizontal: scale(24), // Smaller margins in landscape
        section: scale(32),    // Reduced section spacing
        card: scale(16)        // Tighter card spacing
      };
    }
    return {
      horizontal: scale(48), // Standard margins in portrait
      section: scale(48),    // Standard section spacing
      card: scale(24)        // Standard card spacing
    };
  };

  const margins = getResponsiveMargins();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Design System Demo" 
        onBack={handleBack}
        actionTitle="Save"
        onAction={handleAction}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape
        ]}
      >
        {/* Typography Section */}
        <View style={[styles.section, { marginBottom: margins.section }]}>
          <H1 style={[styles.sectionTitle, { marginHorizontal: margins.horizontal }]}>Typography</H1>
          
          <Card variant="elevated" style={[styles.demoCard, { marginHorizontal: margins.horizontal }]}>
            <H1>Hero Title (H1)</H1>
            <H2>Page Title (H2)</H2>
            <H3>Section Title (H3)</H3>
            <H4>Card Title (H4)</H4>
            <Body>Body text with Roboto Mono font and uppercase styling.</Body>
            <Caption>Caption text for small labels and secondary information.</Caption>
            <Navigation>Navigation text for menu items and links.</Navigation>
          </Card>
        </View>

        {/* Buttons Section */}
        <View style={[styles.section, { marginBottom: margins.section }]}>
          <H2 style={[styles.sectionTitle, { marginHorizontal: margins.horizontal }]}>Buttons</H2>
          
          <Card style={[styles.demoCard, { marginHorizontal: margins.horizontal }]}>
            <H4>Primary Buttons</H4>
            <View style={[
              styles.buttonRow, 
              isLandscape && styles.buttonRowLandscape
            ]}>
              <ButtonPrimary 
                title="Primary Button" 
                onPress={handlePrimaryPress}
                style={styles.buttonSpacing}
              />
              <ButtonPrimary 
                title="Disabled" 
                onPress={handlePrimaryPress}
                disabled
                style={styles.buttonSpacing}
              />
            </View>
            
            <H4 style={styles.subsectionTitle}>Secondary Buttons</H4>
            <View style={[
              styles.buttonRow, 
              isLandscape && styles.buttonRowLandscape
            ]}>
              <ButtonSecondary 
                title="Secondary" 
                onPress={handleSecondaryPress}
                style={styles.buttonSpacing}
              />
              <ButtonSecondary 
                title="Disabled" 
                onPress={handleSecondaryPress}
                disabled
                style={styles.buttonSpacing}
              />
            </View>
          </Card>
        </View>

        {/* Cards Section */}
        <View style={[styles.section, { marginBottom: margins.section }]}>
          <H2 style={[styles.sectionTitle, { marginHorizontal: margins.horizontal }]}>Cards</H2>
          
          {/* Responsive card layout */}
          <View style={[
            styles.cardsContainer,
            isLandscape && styles.cardsContainerLandscape
          ]}>
            <Card style={[styles.cardDemo, { marginHorizontal: margins.card }]}>
              <H4>Default Card</H4>
              <Body>Standard card with glassmorphism effect and improved text fitting.</Body>
            </Card>
            
            <Card variant="elevated" style={[styles.cardDemo, { marginHorizontal: margins.card }]}>
              <H4>Elevated Card</H4>
              <Body>Card with enhanced shadow and opacity for better visual hierarchy.</Body>
            </Card>
            
            <Card variant="subtle" style={[styles.cardDemo, { marginHorizontal: margins.card }]}>
              <H4>Subtle Card</H4>
              <Body>Minimal card with subtle styling and proper content spacing.</Body>
            </Card>
            
            <Card variant="primary" style={[styles.cardDemo, { marginHorizontal: margins.card }]}>
              <H4>Primary Card</H4>
              <Body>Card with primary color accents and improved readability.</Body>
            </Card>
          </View>
        </View>

        {/* Inputs Section */}
        <View style={[styles.section, { marginBottom: margins.section }]}>
          <H2 style={[styles.sectionTitle, { marginHorizontal: margins.horizontal }]}>Inputs</H2>
          
          <Card style={[styles.demoCard, { marginHorizontal: margins.horizontal }]}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              value={inputValue}
              onChangeText={handleInputChange}
              error={inputError}
              onSubmitEditing={handleInputSubmit}
            />
            
            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              style={styles.inputSpacing}
            />
            
            <Input
              placeholder="No label input"
              style={styles.inputSpacing}
            />
          </Card>
        </View>

        {/* Colors Section */}
        <View style={[styles.section, { marginBottom: margins.section }]}>
          <H2 style={[styles.sectionTitle, { marginHorizontal: margins.horizontal }]}>Color Palette</H2>
          
          <Card style={[styles.demoCard, { marginHorizontal: margins.horizontal }]}>
            <View style={[
              styles.colorGrid, 
              isLandscape && styles.colorGridLandscape
            ]}>
              <View style={[styles.colorSwatch, { backgroundColor: styleTokens.colors.primary }]}>
                <Caption style={styles.colorLabel}>Primary</Caption>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: styleTokens.colors.primaryDark }]}>
                <Caption style={styles.colorLabel}>Primary Dark</Caption>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: styleTokens.colors.background }]}>
                <Caption style={styles.colorLabel}>Background</Caption>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: styleTokens.colors.textPrimary }]}>
                <Caption style={[styles.colorLabel, { color: styleTokens.colors.white }]}>Text Primary</Caption>
              </View>
            </View>
          </Card>
        </View>

        {/* Spacing Section */}
        <View style={[styles.section, { marginBottom: margins.section }]}>
          <H2 style={[styles.sectionTitle, { marginHorizontal: margins.horizontal }]}>Spacing Scale</H2>
          
          <Card style={[styles.demoCard, { marginHorizontal: margins.horizontal }]}>
            <View style={styles.spacingDemo}>
              <View style={[styles.spacingBox, { marginBottom: scale(8) }]}>
                <Caption>XS: {styleTokens.spacing.xs}px</Caption>
              </View>
              <View style={[styles.spacingBox, { marginBottom: scale(16) }]}>
                <Caption>SM: {styleTokens.spacing.sm}px</Caption>
              </View>
              <View style={[styles.spacingBox, { marginBottom: scale(24) }]}>
                <Caption>MD: {styleTokens.spacing.md}px</Caption>
              </View>
              <View style={[styles.spacingBox, { marginBottom: scale(32) }]}>
                <Caption>LG: {styleTokens.spacing.lg}px</Caption>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: styleTokens.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(48), // Bottom padding for scroll content
  },
  scrollContentLandscape: {
    paddingBottom: scale(24), // Reduced bottom padding in landscape
  },
  section: {
    // marginBottom is now dynamic based on orientation
  },
  sectionTitle: {
    // marginHorizontal is now dynamic based on orientation
    marginBottom: scale(24), // Scaled spacing
    color: styleTokens.colors.textSecondary,
  },
  subsectionTitle: {
    marginTop: scale(32), // Scaled spacing
    marginBottom: scale(16), // Scaled spacing
  },
  demoCard: {
    // marginHorizontal is now dynamic based on orientation
    marginBottom: scale(24), // Scaled spacing
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: scale(16), // Scaled spacing
  },
  buttonRowLandscape: {
    justifyContent: 'space-between', // Better spacing in landscape
    marginHorizontal: scale(16), // Add horizontal margins in landscape
  },
  buttonSpacing: {
    flex: 1,
    marginHorizontal: scale(8), // Scaled spacing
  },
  // Cards container for responsive layout
  cardsContainer: {
    // Default vertical stacking
  },
  cardsContainerLandscape: {
    flexDirection: 'row', // Side-by-side in landscape
    flexWrap: 'wrap', // Wrap to next row if needed
    justifyContent: 'space-between',
  },
  // Updated card layout - now responsive to orientation
  cardDemo: {
    // marginHorizontal is now dynamic based on orientation
    marginBottom: scale(24), // Scaled spacing
    minHeight: scale(120), // Increased minimum height for better text fitting
    padding: scale(20), // Slightly reduced padding to give more content space
  },
  inputSpacing: {
    marginTop: scale(24), // Scaled spacing
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorGridLandscape: {
    justifyContent: 'space-around', // Better distribution in landscape
  },
  colorSwatch: {
    width: scale(80), // Scaled sizing
    height: scale(80), // Scaled sizing
    borderRadius: scale(8), // Scaled border radius
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16), // Scaled spacing
    ...styleTokens.shadows.sm,
  },
  colorLabel: {
    textAlign: 'center',
    color: styleTokens.colors.textPrimary,
  },
  spacingDemo: {
    alignItems: 'center',
  },
  spacingBox: {
    backgroundColor: styleTokens.colors.primaryLight,
    padding: scale(16), // Scaled padding
    borderRadius: scale(4), // Scaled border radius
    borderWidth: 1,
    borderColor: styleTokens.colors.primary,
  },
});
