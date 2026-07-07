# Quick Start Guide - Velox 1 Design System

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install expo-font
```

### 2. Download Fonts
Download these Google Fonts and place them in `assets/fonts/`:
- [Inter](https://fonts.google.com/specimen/Inter) (Regular, Bold, ExtraBold)
- [Roboto](https://fonts.google.com/specimen/Roboto) (Regular, Medium, Bold)
- [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono) (Regular, Bold)

### 3. Test the System
```bash
expo start --clear
```

The app will open to the StyleDemoScreen showing all components!

## 📱 What You'll See

- **Typography**: All heading levels (H1-H4), body text, captions
- **Buttons**: Primary and secondary buttons with press states
- **Cards**: Multiple card variants with shadows
- **Inputs**: Form inputs with focus and error states
- **Header**: Navigation header with back/action buttons
- **Colors**: Full color palette swatches
- **Spacing**: Visual spacing scale examples

## 🎯 Quick Component Usage

```javascript
import { H1, ButtonPrimary, Card, Input } from '../components';

// Typography
<H1>Your Title</H1>

// Buttons
<ButtonPrimary title="Submit" onPress={handleSubmit} />

// Cards
<Card>Your content here</Card>

// Inputs
<Input label="Email" placeholder="Enter email" />
```

## 🔧 Customization

All styling is controlled by `src/theme/styleTokens.js`. Modify colors, spacing, typography, and component styles there.

## ❓ Need Help?

- Check `FONT_SETUP.md` for detailed font installation
- See `IMPLEMENTATION_SUMMARY.md` for full documentation
- Review inline comments in component files

## 🎨 Design System Features

- ✅ Responsive typography scaling
- ✅ Consistent 8px spacing grid
- ✅ Accessible touch targets (48px minimum)
- ✅ Press state animations
- ✅ Glassmorphism effects
- ✅ Mobile-optimized shadows
- ✅ Complete color palette
- ✅ Font fallback handling

Ready to build beautiful, consistent UIs! 🚀
