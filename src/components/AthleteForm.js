import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { Input } from './Input';
import { ButtonPrimary } from './ButtonPrimary';
import { MobileBody, MobileCaption } from './Typography';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

const AthleteForm = ({ onAddAthlete }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [tier, setTier] = useState('Med');
  const [bestEvents, setBestEvents] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an athlete name');
      return;
    }

    const athlete = {
      id: Date.now().toString(), // Simple ID generation
      name: name.trim(),
      gender: gender,
      tier: tier,
      bestEvents: bestEvents.trim() || null,
    };

    onAddAthlete(athlete);
    
    // Reset form
    setName('');
    setGender('Male');
    setTier('Med');
    setBestEvents('');
  };

  const genders = ['Male', 'Female'];
  const tiers = ['High', 'Med', 'Low'];

  return (
    <View style={styles.container}>
      <View style={styles.formRow}>
        <Input
          label="Name *"
          placeholder="Enter athlete name"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.formRow}>
        <MobileBody style={styles.tierLabel}>Gender</MobileBody>
        <View style={styles.tierSelector}>
          {genders.map((genderOption) => (
            <TouchableOpacity
              key={genderOption}
              style={[
                styles.tierChip,
                gender === genderOption && styles.tierChipActive
              ]}
              onPress={() => setGender(genderOption)}
            >
              <MobileCaption
                style={[
                  styles.tierChipText,
                  gender === genderOption && styles.tierChipTextActive
                ]}
              >
                {genderOption}
              </MobileCaption>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formRow}>
        <MobileBody style={styles.tierLabel}>Tier</MobileBody>
        <View style={styles.tierSelector}>
          {tiers.map((tierOption) => (
            <TouchableOpacity
              key={tierOption}
              style={[
                styles.tierChip,
                tier === tierOption && styles.tierChipActive
              ]}
              onPress={() => setTier(tierOption)}
            >
              <MobileCaption
                style={[
                  styles.tierChipText,
                  tier === tierOption && styles.tierChipTextActive
                ]}
              >
                {tierOption}
              </MobileCaption>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formRow}>
        <Input
          label="Best Events (Optional)"
          placeholder="e.g., 100m, 200m, 4x100"
          value={bestEvents}
          onChangeText={setBestEvents}
          multiline
        />
      </View>

      <ButtonPrimary title="Add Athlete" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
  },
  formRow: {
    marginBottom: scale(16),
  },
  tierLabel: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
  },
  tierSelector: {
    flexDirection: 'row',
    gap: scale(8),
  },
  tierChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.4)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tierChipActive: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderColor: styleTokens.colors.primary,
  },
  tierChipText: {
    color: styleTokens.colors.textPrimary,
    letterSpacing: styleTokens.typography.letterSpacing.wide,
  },
  tierChipTextActive: {
    color: styleTokens.colors.textPrimary,
  },
});

export default AthleteForm; 