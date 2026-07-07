# Font Setup Guide for Velox 1 Design System

## Required Fonts

The Velox 1 design system requires the following Google Fonts to be downloaded and placed in the `assets/fonts/` directory:

### Font Files Needed:

1. **Inter Font Family**
   - `Inter-Regular.ttf` (weight 400)
   - `Inter-Bold.ttf` (weight 700) 
   - `Inter-ExtraBold.ttf` (weight 800)

2. **Roboto Font Family**
   - `Roboto-Regular.ttf` (weight 400)
   - `Roboto-Medium.ttf` (weight 500)
   - `Roboto-Bold.ttf` (weight 700)

3. **Roboto Mono Font Family**
   - `RobotoMono-Regular.ttf` (weight 400)
   - `RobotoMono-Bold.ttf` (weight 700)

## Download Instructions

### Option 1: Google Fonts Website
1. Visit [Google Fonts](https://fonts.google.com/)
2. Search for each font family:
   - [Inter](https://fonts.google.com/specimen/Inter)
   - [Roboto](https://fonts.google.com/specimen/Roboto)
   - [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono)
3. Download each font family
4. Extract the TTF files to `assets/fonts/`

### Option 2: Direct Download Links
- **Inter**: https://fonts.google.com/download?family=Inter
- **Roboto**: https://fonts.google.com/download?family=Roboto
- **Roboto Mono**: https://fonts.google.com/download?family=Roboto+Mono

### Option 3: Package Manager (Recommended)
```bash
# Install expo-google-fonts packages
npm install @expo-google-fonts/inter @expo-google-fonts/roboto @expo-google-fonts/roboto-mono

# Then update App.js to use the package fonts instead of local files
```

## File Structure
```
assets/
  fonts/
    Inter-Regular.ttf
    Inter-Bold.ttf
    Inter-ExtraBold.ttf
    Roboto-Regular.ttf
    Roboto-Medium.ttf
    Roboto-Bold.ttf
    RobotoMono-Regular.ttf
    RobotoMono-Bold.ttf
```

## Verification
After placing the font files, restart your Expo development server:
```bash
expo start --clear
```

The app should now load with the custom fonts. If fonts fail to load, the app will fall back to system fonts and show a warning in the console.

## Troubleshooting

### Font Loading Errors
- Ensure all font files are in the correct directory
- Check file names match exactly (case-sensitive)
- Verify font files are valid TTF format
- Clear Expo cache: `expo start --clear`

### Performance Issues
- Font files should be optimized (under 500KB each)
- Consider using variable fonts for better performance
- Use `expo-google-fonts` packages for automatic optimization

## Alternative: Using expo-google-fonts Packages

If you prefer to use the official Expo Google Fonts packages instead of local files:

1. Install packages:
```bash
npm install @expo-google-fonts/inter @expo-google-fonts/roboto @expo-google-fonts/roboto-mono
```

2. Update `App.js` to use package fonts:
```javascript
import {
  useFonts,
  Inter_400Regular,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import {
  RobotoMono_400Regular,
  RobotoMono_700Bold,
} from '@expo-google-fonts/roboto-mono';

// In your App component:
const [fontsLoaded] = useFonts({
  'Inter-Regular': Inter_400Regular,
  'Inter-Bold': Inter_700Bold,
  'Inter-ExtraBold': Inter_800ExtraBold,
  'Roboto-Regular': Roboto_400Regular,
  'Roboto-Medium': Roboto_500Medium,
  'Roboto-Bold': Roboto_700Bold,
  'RobotoMono-Regular': RobotoMono_400Regular,
  'RobotoMono-Bold': RobotoMono_700Bold,
});
```

This approach provides better performance and automatic font optimization.
