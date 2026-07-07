import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MobileH2, MobileBody, MobileCaption } from './Typography';
import { styleTokens } from '../theme';
import { scale } from '../utils/scale';

// Edit button component that matches toggle design
const EditColorButton = ({ onPress }) => (
  <Pressable
    style={styles.editToggle}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Edit team color"
  >
    <MobileCaption style={styles.editToggleText}>edit</MobileCaption>
  </Pressable>
);

const TeamList = ({ teams, onMoveAthlete, onColorChange, editable = false }) => {
  const [expandedTeams, setExpandedTeams] = useState({});

  const toggleTeamExpanded = (teamId) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };
  if (!teams || teams.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No teams created yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {teams.map((team) => {
        const isExpanded = !!expandedTeams[team.id];
        return (
          <View key={team.id} style={[styles.teamCard, { borderLeftColor: team.color || styleTokens.colors.primary }]}>
            <View style={styles.teamHeader}>
              <View style={styles.teamTitleRow}>
                <MobileH2 style={styles.teamName}>{team.name}</MobileH2>
                {onColorChange && (
                  <EditColorButton onPress={() => onColorChange(team)} />
                )}
              </View>
              <View style={styles.teamSubRow}>
                <View style={styles.teamInfoColumn}>
                  <MobileCaption style={styles.teamSize}>{team.athletes.length} athletes</MobileCaption>
                  {team.athletes.length > 0 && (
                    <View style={styles.genderBreakdown}>
                      <View style={styles.genderItem}>
                        <Text style={styles.genderMaleLabel}>M</Text>
                        <MobileCaption style={styles.genderCount}>
                          {team.athletes.filter(a => a.gender === 'Male').length}
                        </MobileCaption>
                      </View>
                      <View style={styles.genderItem}>
                        <Text style={styles.genderFemaleLabel}>F</Text>
                        <MobileCaption style={styles.genderCount}>
                          {team.athletes.filter(a => a.gender === 'Female').length}
                        </MobileCaption>
                      </View>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={() => toggleTeamExpanded(team.id)}
                  style={[styles.toggle, isExpanded && styles.toggleEnabled]}
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded ? 'Collapse team' : 'Expand team'}
                >
                  <View style={[styles.toggleCircle, isExpanded && styles.toggleCircleEnabled]} />
                </Pressable>
              </View>
            </View>

            {isExpanded && (
              team.athletes.length === 0 ? (
                <MobileCaption style={styles.noAthletes}>No athletes assigned</MobileCaption>
              ) : (
                <View style={styles.athletesList}>
                  {team.athletes.map((athlete) => (
                    <View key={athlete.id} style={styles.athleteItem}>
                      <View style={styles.athleteInfo}>
                        <MobileBody style={styles.athleteName}>{athlete.name}</MobileBody>
                        <View style={styles.badgeContainer}>
                          {athlete.gender && (
                            <Text style={athlete.gender === 'Male' ? styles.genderMaleLabel : styles.genderFemaleLabel}>
                              {athlete.gender === 'Male' ? 'M' : 'F'}
                            </Text>
                          )}
                          <View style={[styles.tierBadge]}>
                            <MobileCaption style={styles.tierText}>{athlete.tier}</MobileCaption>
                          </View>
                        </View>
                      </View>
                      {athlete.bestEvents && (
                        <MobileCaption style={styles.bestEvents}>{athlete.bestEvents}</MobileCaption>
                      )}
                      {editable && (
                        <View style={styles.moveRow}>
                          <MobileCaption style={styles.moveLabel}>Move to:</MobileCaption>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.destList}>
                            {teams
                              .filter((t) => t.id !== team.id)
                              .map((dest) => (
                                <Pressable
                                  key={dest.id}
                                  style={styles.destChip}
                                  onPress={() => onMoveAthlete(athlete.id, team.id, dest.id)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Move ${athlete.name} to ${dest.name}`}
                                >
                                  <MobileCaption style={styles.destChipText}>{dest.name}</MobileCaption>
                                </Pressable>
                              ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  emptyText: {
    fontSize: scale(16),
    color: styleTokens.colors.textSecondary,
    textAlign: 'center',
  },
  teamCard: {
    backgroundColor: styleTokens.components.card.backgroundColor,
    marginHorizontal: scale(0),
    marginVertical: scale(8),
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: styleTokens.components.card.borderWidth,
    borderColor: styleTokens.components.card.borderColor,
    borderLeftWidth: scale(4),
    borderLeftColor: styleTokens.colors.primary,
    ...styleTokens.shadows.sm,
  },
  teamHeader: {
    marginBottom: scale(8),
  },
  teamTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  teamSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfoColumn: {
    flex: 1,
    gap: scale(4),
  },
  genderBreakdown: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(2),
  },
  genderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  genderMaleLabel: {
    color: 'rgb(59, 130, 246)',
    fontWeight: '800',
    fontSize: scale(14),
    fontFamily: 'Roboto Mono',
  },
  genderFemaleLabel: {
    color: 'rgb(236, 72, 153)',
    fontWeight: '800',
    fontSize: scale(14),
    fontFamily: 'Roboto Mono',
  },
  genderCount: {
    color: styleTokens.colors.textSecondary,
    fontSize: scale(12),
  },  editToggle: {
    width: scale(36),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(159, 167, 174, 0.3)',
  },
  editToggleText: {
    color: styleTokens.colors.white,
    fontSize: scale(10),
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  teamName: {
    color: styleTokens.colors.textPrimary,
  },
  teamSize: {
    color: styleTokens.colors.textSecondary,
    opacity: 0.9,
  },
  toggle: {
    width: scale(36),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(159, 167, 174, 0.3)',
    paddingHorizontal: scale(2),
  },
  toggleEnabled: {
    backgroundColor: styleTokens.colors.primary,
    borderColor: styleTokens.colors.primary,
    alignItems: 'flex-end',
  },
  toggleCircle: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleEnabled: {
    backgroundColor: styleTokens.colors.white,
  },
  noAthletes: {
    textAlign: 'center',
    color: styleTokens.colors.textSecondary,
    fontStyle: 'italic',
    padding: scale(12),
  },
  athletesList: {
    gap: scale(8),
  },
  athleteItem: {
    padding: scale(12),
    backgroundColor: styleTokens.colors.backgroundLight,
    borderRadius: scale(8),
  },
  athleteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
    gap: scale(8),
    flexWrap: 'wrap',
  },
  athleteName: {
    color: styleTokens.colors.textPrimary,
    flex: 1,
    flexShrink: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  tierBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    minWidth: scale(50),
    alignItems: 'center',
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
  },
  tierHigh: {},
  tierMed: {},
  tierLow: {},
  tierText: {
    color: styleTokens.colors.textPrimary,
    fontSize: scale(12),
    fontWeight: '700',
  },
  bestEvents: {
    fontSize: scale(14),
    color: styleTokens.colors.textSecondary,
    fontStyle: 'italic',
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(8),
    gap: scale(8),
  },
  moveLabel: {
    color: styleTokens.colors.textSecondary,
  },
  destList: {
    flexGrow: 0,
  },
  destChip: {
    backgroundColor: styleTokens.colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(100, 226, 211, 0.6)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    marginRight: scale(8),
  },
  destChipText: {
    color: styleTokens.colors.textPrimary,
    fontWeight: '700',
  },
});

export default TeamList; 