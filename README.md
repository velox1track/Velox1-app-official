# Velox 1 Race Roulette App

A beginner-friendly Expo React Native mobile app for organizing track competitions. The app helps coaches and organizers manage athletes, create balanced teams, generate event sequences, and track scoring.

## Features

### 🏃‍♂️ Race Roulette
- Generate randomized event sequences with relay constraints
- Control total events and number of relays
- Optional relay position specification
- Event reveal system with loading animations
- Persistent state management

### 👥 Team Builder
- Add athletes with name, tier (High/Med/Low), and best events
- CSV import functionality for bulk athlete addition
- Tier-based athlete management
- Delete individual athletes or clear all

### 🏆 Assign Teams
- Automatic team generation using tier-balanced distribution
- Round-robin assignment across High → Med → Low tiers
- Configurable number of teams
- Team statistics and athlete counts

### 📊 Scoreboard
- Real-time team scoring with customizable point system
- Event result entry for completed events
- Team rankings and statistics
- Event status tracking (Locked/Pending/Completed)

### ⚙️ Settings
- Data management and export
- App statistics and information
- Data clearing and reset options
- Help and support information

## Tech Stack

- **Framework**: Expo React Native SDK 53 (managed workflow)
- **Language**: JavaScript (ES6+)
- **Navigation**: React Navigation Stack Navigator
- **Storage**: AsyncStorage for local persistence
- **CSV Parsing**: PapaParse library
- **UI**: Custom components with clean, mobile-first design

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device (SDK 53 compatible)

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd velox-1-race-roulette-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on your device**
   - Scan the QR code with Expo Go (iOS/Android)
   - Or press 'a' for Android emulator or 'i' for iOS simulator

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── EventCard.js    # Individual event display
│   ├── TeamList.js     # Team roster display
│   ├── AthleteForm.js  # Athlete addition form
│   └── CSVImporter.js  # CSV data import
├── lib/                # Utility functions
│   ├── randomizer.js   # Event sequence generation
│   └── assigner.js     # Team assignment algorithms
├── screens/            # Main app screens
│   ├── HomeScreen.js           # Landing page
│   ├── RaceRouletteScreen.js   # Event management
│   ├── TeamBuilderScreen.js    # Athlete management
│   ├── AssignTeamsScreen.js    # Team creation
│   ├── ScoreboardScreen.js     # Scoring and results
│   └── SettingsScreen.js       # App configuration
└── App.js              # Main app component
```

## Getting Started

### 1. First Steps
Start with the **Home Screen** to get familiar with the app navigation.

### 2. Add Athletes
Navigate to **Team Builder** to add athletes:
- Use the form to add individual athletes
- Or toggle CSV Import for bulk addition
- Assign tiers (High/Med/Low) based on skill level

### 3. Generate Event Sequence
Go to **Race Roulette** to create your competition:
- Set total events and relay count
- Generate sequence with relay constraints
- Use the reveal system during the competition

### 4. Create Teams
Visit **Assign Teams** to organize athletes:
- Choose number of teams
- Generate balanced teams automatically
- Review tier distribution

### 5. Track Scoring
Use **Scoreboard** to manage results:
- Enter placements for completed events
- View real-time team rankings
- Monitor competition progress

## Data Persistence

The app uses AsyncStorage to save:
- Athlete information
- Team assignments
- Event sequences and progress
- Competition results

Data persists between app sessions but is stored locally on your device.

## CSV Import Format

For bulk athlete import, use this CSV format:
```csv
name,tier,bestEvents
John Smith,High,100m,200m
Jane Doe,Med,400m
Bob Wilson,Low,800m,1 Mile
```

## Scoring System

Default point allocation:
- 1st Place: 10 points
- 2nd Place: 8 points
- 3rd Place: 6 points
- 4th Place: 4 points
- 5th Place: 2 points
- 6th Place: 1 point

## Testing the App

### Recommended Testing Order:
1. **Home Screen** - Verify navigation works
2. **Team Builder** - Add a few test athletes
3. **Race Roulette** - Generate a simple event sequence
4. **Assign Teams** - Create 2-3 teams
5. **Scoreboard** - Enter some test results
6. **Settings** - Check data statistics

### Sample Test Data:
- Add 6-8 athletes with mixed tiers
- Generate 5 events with 1 relay
- Create 2-3 teams
- Enter results for 2-3 events

## Troubleshooting

### Common Issues:
- **App won't start**: Ensure all dependencies are installed
- **Navigation errors**: Check that Expo Go is up to date (SDK 53)
- **Data not saving**: Verify AsyncStorage permissions
- **CSV import fails**: Check CSV format and required columns

### Development Tips:
- Use Expo DevTools for debugging
- Check console logs for error messages
- Clear app data if experiencing persistent issues
- Restart Expo server if changes aren't reflecting

## Future Enhancements

Potential improvements for future iterations:
- Cloud sync and backup
- Advanced scoring systems
- Team transfer functionality
- Event timing and scheduling
- Export to PDF/Excel
- Multi-competition support
- User authentication
- Real-time collaboration

## Contributing

This is a starter app designed for learning and iteration. Feel free to:
- Add new features
- Improve the UI/UX
- Optimize performance
- Add error handling
- Implement additional validation

## License

This project is open source and available under the MIT License.

## Support

For questions or issues:
- Check the app's Help section
- Review the code comments
- Test with the sample data provided

---

**Happy organizing! 🏃‍♂️🏆** 