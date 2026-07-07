/**
 * Team assigner utility for balanced tier-based distribution
 * Uses round-robin assignment across High → Med → Low tiers
 */

// Team color palette - standard hex colors for track and field
const TEAM_COLORS = [
  '#FF0000', // Red
  '#0000FF', // Blue
  '#008000', // Green
  '#FFFF00', // Yellow
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#000000', // Black
  '#FFFFFF', // White
  '#808080', // Gray
  '#000080', // Navy
  '#008080', // Teal
  '#800000', // Maroon
  '#00FFFF', // Cyan
  '#C0C0C0'  // Silver
];

export const assignTeams = (athletes, numTeams) => {
  if (!athletes || athletes.length === 0) {
    return {
      success: false,
      error: 'No athletes provided'
    };
  }
  
  if (numTeams < 1) {
    return {
      success: false,
      error: 'Number of teams must be at least 1'
    };
  }
  
  // NEW APPROACH: Separate by gender first, then balance each gender group independently
  const maleAthletes = athletes.filter(athlete => athlete.gender === 'Male');
  const femaleAthletes = athletes.filter(athlete => athlete.gender === 'Female');
  
  // Initialize teams with colors and tracking
  const teams = Array.from({ length: numTeams }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
    athletes: [],
    maleCount: 0,
    femaleCount: 0,
    maleTalentScore: 0,
    femaleTalentScore: 0,
    tierCounts: { high: 0, med: 0, low: 0 }
  }));
  
  // Helper function to assign a gender group with balanced talent distribution
  const assignGenderGroup = (genderAthletes, genderKey) => {
    // Separate by tier and shuffle within each tier for randomness
    const highTier = shuffleArray(genderAthletes.filter(a => a.tier === 'High'));
    const medTier = shuffleArray(genderAthletes.filter(a => a.tier === 'Med'));
    const lowTier = shuffleArray(genderAthletes.filter(a => a.tier === 'Low'));
    
    // Combine all athletes with tier values
    const allGenderAthletes = [
      ...highTier.map(a => ({ ...a, tierValue: 3 })),
      ...medTier.map(a => ({ ...a, tierValue: 2 })),
      ...lowTier.map(a => ({ ...a, tierValue: 1 }))
    ];
    
    // Calculate base size and extra athletes
    const totalGenderAthletes = genderAthletes.length;
    const baseSize = Math.floor(totalGenderAthletes / numTeams);
    const extraAthletes = totalGenderAthletes % numTeams;
    
    // Track how many athletes have been assigned to each team for this gender
    const assignedCounts = teams.map(() => 0);
    
    // Assign each athlete dynamically based on current team scores
    allGenderAthletes.forEach(athlete => {
      // Find teams that can still receive athletes
      const availableTeams = teams
        .map((team, index) => ({
          team,
          index,
          currentSize: assignedCounts[index],
          genderTalentScore: genderKey === 'male' ? team.maleTalentScore : team.femaleTalentScore,
          totalTalentScore: team.maleTalentScore + team.femaleTalentScore,
          canReceiveMore: assignedCounts[index] < baseSize || 
                         (assignedCounts[index] === baseSize && assignedCounts[index] < baseSize + 1)
        }))
        .filter(t => t.canReceiveMore);
      
      if (availableTeams.length === 0) return; // All teams full
      
      // Separate teams at base size vs those that can take extras
      const teamsNeedingBase = availableTeams.filter(t => t.currentSize < baseSize);
      const teamsForExtras = availableTeams.filter(t => t.currentSize >= baseSize);
      
      let selectedTeam;
      
      if (teamsNeedingBase.length > 0) {
        // Priority: Fill all teams to base size first
        teamsNeedingBase.sort((a, b) => {
          if (a.genderTalentScore !== b.genderTalentScore) {
            return a.genderTalentScore - b.genderTalentScore;
          }
          if (a.totalTalentScore !== b.totalTalentScore) {
            return a.totalTalentScore - b.totalTalentScore;
          }
          return a.index - b.index;
        });
        selectedTeam = teamsNeedingBase[0];
      } else if (teamsForExtras.length > 0 && assignedCounts.filter(c => c > baseSize).length < extraAthletes) {
        // All teams at base size, assign extras to teams with lowest scores
        teamsForExtras.sort((a, b) => {
          if (a.genderTalentScore !== b.genderTalentScore) {
            return a.genderTalentScore - b.genderTalentScore;
          }
          if (a.totalTalentScore !== b.totalTalentScore) {
            return a.totalTalentScore - b.totalTalentScore;
          }
          return a.index - b.index;
        });
        selectedTeam = teamsForExtras[0];
      } else {
        return; // No valid team found
      }
      
      // Assign athlete to selected team
      selectedTeam.team.athletes.push(athlete);
      selectedTeam.team.tierCounts[athlete.tier.toLowerCase()]++;
      assignedCounts[selectedTeam.index]++;
      
      if (genderKey === 'male') {
        selectedTeam.team.maleCount++;
        selectedTeam.team.maleTalentScore += athlete.tierValue;
      } else {
        selectedTeam.team.femaleCount++;
        selectedTeam.team.femaleTalentScore += athlete.tierValue;
      }
    });
  };
  
  // Assign males first, then females (order doesn't matter for balance)
  assignGenderGroup(maleAthletes, 'male');
  assignGenderGroup(femaleAthletes, 'female');
  
  // Remove temporary tracking fields from final result
  const finalTeams = teams.map(team => ({
    id: team.id,
    name: team.name,
    color: team.color,
    athletes: team.athletes
  }));
  
  return {
    success: true,
    teams: finalTeams,
    stats: {
      totalAthletes: athletes.length,
      maleAthletes: maleAthletes.length,
      femaleAthletes: femaleAthletes.length,
      highTier: athletes.filter(a => a.tier === 'High').length,
      medTier: athletes.filter(a => a.tier === 'Med').length,
      lowTier: athletes.filter(a => a.tier === 'Low').length,
      averageTeamSize: Math.round(athletes.length / numTeams * 10) / 10,
      teamBalance: teams.map(team => ({
        teamName: team.name,
        totalAthletes: team.athletes.length,
        males: team.maleCount,
        females: team.femaleCount,
        maleTalentScore: team.maleTalentScore,
        femaleTalentScore: team.femaleTalentScore,
        totalTalentScore: team.maleTalentScore + team.femaleTalentScore,
        distribution: `${team.tierCounts.high}H/${team.tierCounts.med}M/${team.tierCounts.low}L`
      }))
    }
  };
};

// Helper function to shuffle array for randomness
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const moveAthlete = (teams, athleteId, fromTeamId, toTeamId) => {
  const fromTeam = teams.find(team => team.id === fromTeamId);
  const toTeam = teams.find(team => team.id === toTeamId);
  
  if (!fromTeam || !toTeam) {
    return {
      success: false,
      error: 'Invalid team ID'
    };
  }
  
  const athleteIndex = fromTeam.athletes.findIndex(athlete => athlete.id === athleteId);
  if (athleteIndex === -1) {
    return {
      success: false,
      error: 'Athlete not found in source team'
    };
  }
  
  const athlete = fromTeam.athletes.splice(athleteIndex, 1)[0];
  toTeam.athletes.push(athlete);
  
  return {
    success: true,
    teams: teams
  };
};

// Export color utilities for use in other components
export const getTeamColors = () => TEAM_COLORS;

export const getColorName = (colorHex) => {
  const colorMap = {
    '#FF0000': 'Red',
    '#0000FF': 'Blue',
    '#008000': 'Green', 
    '#FFFF00': 'Yellow',
    '#FFA500': 'Orange',
    '#800080': 'Purple',
    '#FFC0CB': 'Pink',
    '#A52A2A': 'Brown',
    '#000000': 'Black',
    '#FFFFFF': 'White',
    '#808080': 'Gray',
    '#000080': 'Navy',
    '#008080': 'Teal',
    '#800000': 'Maroon',
    '#00FFFF': 'Cyan',
    '#C0C0C0': 'Silver'
  };
  return colorMap[colorHex] || 'Custom';
}; 