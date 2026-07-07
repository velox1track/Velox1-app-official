import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Input } from './Input';
import { ButtonPrimary, ButtonSecondary } from './index';
import { MobileBody, MobileCaption } from './Typography';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';
import Papa from 'papaparse';

const CSVImporter = ({ onImportAthletes }) => {
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const parseCSV = () => {
    if (!csvText.trim()) {
      Alert.alert('Error', 'Please enter CSV data');
      return;
    }

    try {
      const result = Papa.parse(csvText.trim(), {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        Alert.alert('CSV Parse Error', 'There was an error parsing the CSV data');
        return;
      }

      // Validate required columns
      const firstRow = result.data[0];
      if (!firstRow.name || !firstRow.tier) {
        Alert.alert('Invalid CSV Format', 'CSV must have "name" and "tier" columns');
        return;
      }

      // Transform data to athlete objects
      const athletes = result.data.map((row, index) => ({
        id: Date.now().toString() + index, // Generate unique ID
        name: row.name.trim(),
        tier: row.tier.trim(),
        bestEvents: row.bestEvents ? row.bestEvents.trim() : null,
      }));

      setPreviewData(athletes);
    } catch (error) {
      Alert.alert('Error', 'Failed to parse CSV data');
    }
  };

  const importAthletes = () => {
    if (previewData) {
      onImportAthletes(previewData);
      setCsvText('');
      setPreviewData(null);
      Alert.alert('Success', `Imported ${previewData.length} athletes`);
    }
  };

  const clearData = () => {
    setCsvText('');
    setPreviewData(null);
  };

  return (
    <View style={styles.container}>
      <MobileBody style={styles.title}>Import Athletes from CSV</MobileBody>
      
      <View style={styles.inputGroup}>
        <MobileBody style={styles.label}>CSV Data</MobileBody>
        <MobileCaption style={styles.helpText}>
          Format: name,tier,bestEvents (bestEvents is optional)
        </MobileCaption>
        <Input
          placeholder="Paste CSV data here..."
          value={csvText}
          onChangeText={setCsvText}
          multiline
          inputStyle={styles.textArea}
        />
      </View>

      <View style={styles.buttonRow}>
        <ButtonPrimary title="Parse CSV" onPress={parseCSV} style={styles.flex} />
        <ButtonSecondary title="Clear" onPress={clearData} style={styles.flex} />
      </View>

      {previewData && (
        <View style={styles.previewContainer}>
          <MobileBody style={styles.previewTitle}>Preview ({previewData.length} athletes)</MobileBody>
          
          <ScrollView style={styles.previewList}>
            {previewData.map((athlete, index) => (
              <View key={athlete.id} style={styles.previewItem}>
                <MobileBody style={styles.previewName} numberOfLines={2}>{athlete.name}</MobileBody>
                <View style={[styles.tierBadge, styles[`tier${athlete.tier}`]]}>
                  <MobileCaption style={styles.tierText}>{athlete.tier}</MobileCaption>
                </View>
                {athlete.bestEvents && (
                  <MobileCaption style={styles.previewEvents} numberOfLines={2}>{athlete.bestEvents}</MobileCaption>
                )}
              </View>
            ))}
          </ScrollView>

          <ButtonPrimary title={`Import ${previewData.length} Athletes`} onPress={importAthletes} />
        </View>
      )}

      <View style={styles.exampleContainer}>
        <MobileBody style={styles.exampleTitle}>Example CSV Format:</MobileBody>
        <MobileCaption style={styles.exampleText}>
          name,tier,bestEvents{'\n'}
          John Smith,High,100m,200m{'\n'}
          Jane Doe,Med,400m{'\n'}
          Bob Wilson,Low,800m,1 Mile
        </MobileCaption>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
  },
  title: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(16),
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: scale(16),
  },
  label: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(8),
  },
  helpText: {
    color: styleTokens.colors.textSecondary,
    marginBottom: scale(8),
    opacity: 0.8,
  },
  textArea: {
    minHeight: scale(140),
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(16),
  },
  flex: {
    flex: 1,
  },
  previewContainer: {
    marginTop: scale(16),
    padding: scale(16),
    backgroundColor: styleTokens.components.card.backgroundColor,
    borderRadius: scale(8),
    borderColor: styleTokens.components.card.borderColor,
    borderWidth: styleTokens.components.card.borderWidth,
  },
  previewTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(12),
    textAlign: 'left',
  },
  previewList: {
    maxHeight: scale(200),
    marginBottom: scale(16),
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(8),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(6),
    marginBottom: scale(6),
  },
  previewName: {
    color: styleTokens.colors.textPrimary,
    flex: 1,
  },
  tierBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    minWidth: scale(50),
    alignItems: 'center',
    marginHorizontal: scale(8),
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
  },
  tierHigh: {},
  tierMed: {},
  tierLow: {},
  tierText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
  previewEvents: {
    color: styleTokens.colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
  exampleContainer: {
    marginTop: scale(20),
    padding: scale(16),
    backgroundColor: styleTokens.components.card.backgroundColor,
    borderRadius: scale(8),
    borderColor: styleTokens.components.card.borderColor,
    borderWidth: styleTokens.components.card.borderWidth,
  },
  exampleTitle: {
    color: styleTokens.colors.textPrimary,
    marginBottom: scale(8),
  },
  exampleText: {
    color: styleTokens.colors.textSecondary,
    fontFamily: 'Roboto Mono',
  },
});

export default CSVImporter; 