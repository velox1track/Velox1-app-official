# Expo SDK 53 Upgrade Guide

## Changes Made

### 1. Package Dependencies Updated
- **Expo**: `~50.0.0` → `~53.0.0`
- **React**: `18.2.0` → `18.3.1`
- **React Native**: `0.73.6` → `0.76.3`
- **React Navigation**: Updated to latest compatible versions
- **React Native Screens**: `~3.29.0` → `~4.1.0`
- **React Native Safe Area Context**: `4.8.2` → `4.12.0`
- **React Native Gesture Handler**: `~2.14.0` → `~2.20.2`
- **AsyncStorage**: Kept at `1.21.0` for compatibility

### 2. Configuration Files
- **app.json**: Created new Expo SDK 53 configuration
- **package.json**: Updated with new dependency versions
- **README.md**: Updated to reflect SDK 53 requirements

### 3. Asset Structure
- Created `assets/` folder with placeholder files
- Icon, splash, adaptive icon, and favicon placeholders added

## Installation Steps

1. **Clean Install** (Recommended)
   ```bash
   # Remove old dependencies
   rm -rf node_modules package-lock.json
   
   # Install new dependencies
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   # or
   npx expo start
   ```

## Compatibility Notes

- **Node.js**: Requires v18 or higher (was v14+)
- **Expo Go**: Must be updated to support SDK 53
- **iOS**: Compatible with iOS 15.0+
- **Android**: Compatible with Android 8.0+

## Testing Checklist

- [ ] App starts without errors
- [ ] Navigation works between screens
- [ ] AsyncStorage functionality works
- [ ] CSV import works
- [ ] Event generation works
- [ ] Team assignment works
- [ ] Scoring system works

## Known Issues

- Asset placeholders need to be replaced with actual PNG files
- Some npm warnings about deprecated packages (non-critical)

## Next Steps

1. Replace placeholder assets with actual images
2. Test all functionality on physical device
3. Verify Expo Go compatibility
4. Test on both iOS and Android if possible

## Rollback Plan

If issues arise, you can rollback to SDK 50:
1. Restore original package.json
2. Run `npm install`
3. Clear Metro cache: `npx expo start --clear`
