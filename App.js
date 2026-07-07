import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Platform, Pressable } from 'react-native';
import { loadfontsAsync } from './src/theme';

// Import web scroll fix - this runs immediately when imported
import './src/utils/webScrollFix';

// Import the original app screens
import HomeScreen from './src/screens/HomeScreen';
import RaceRouletteScreen from './src/screens/RaceRouletteScreen';
import TeamBuilderScreen from './src/screens/TeamBuilderScreen';
import AssignTeamsScreen from './src/screens/AssignTeamsScreen';
import AssignRunnersScreen from './src/screens/AssignRunnersScreen';
import ScoreboardScreen from './src/screens/ScoreboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [fontsLoaded, setfontsLoaded] = useState(false);
  const [fontError, setfontError] = useState(null);

  useEffect(() => {
    async function loadfonts() {
      try {
        await loadfontsAsync(); // Using the centralized function
        setfontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setfontError(error.message);
        setfontsLoaded(true);
      }
    }
    loadfonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#64E2D3" />
        <Text style={styles.loadingText}>Loading Velox 1...</Text>
      </View>
    );
  }

  if (fontError) {
    console.warn('Font loading failed, using system fonts:', fontError);
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#9FA7AE',
          },
          headerTintColor: '#080A0B',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontFamily: 'RobotoMono-Bold',
          },
          // On web the native back-arrow icon doesn't render in Safari.
          // Provide a simple text arrow for web only; native keeps its default.
          ...(Platform.OS === 'web' && {
            headerLeft: ({ canGoBack, onPress }) =>
              canGoBack ? (
                <Pressable
                  onPress={onPress}
                  style={styles.webBackButton}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Text style={styles.webBackArrow}>{'←'}</Text>
                </Pressable>
              ) : null,
          }),
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Velox 1 Race Roulette' }}
        />
        <Stack.Screen
          name="RaceRoulette"
          component={RaceRouletteScreen}
          options={{ title: 'Race Roulette' }}
        />
        <Stack.Screen
          name="TeamBuilder"
          component={TeamBuilderScreen}
          options={{ title: 'Team Builder' }}
        />
        <Stack.Screen
          name="AssignTeams"
          component={AssignTeamsScreen}
          options={{ title: 'Assign Teams' }}
        />
        <Stack.Screen
          name="AssignRunners"
          component={AssignRunnersScreen}
          options={{ title: 'Assign Athletes' }}
        />
        <Stack.Screen
          name="Scoreboard"
          component={ScoreboardScreen}
          options={{ title: 'Scoreboard' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9FA7AE',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#080A0B',
    fontFamily: 'System',
  },
  webBackButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  webBackArrow: {
    fontSize: 22,
    color: '#080A0B',
    fontWeight: '600',
  },
}); 