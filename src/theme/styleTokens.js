export const styleTokens = {
  // Colors
  colors: {
    primary: '#64E2D3',
    primaryDark: '#5A5E62',
    primaryLight: 'rgba(100, 226, 211, 0.15)',
    background: '#9FA7AE',
    backgroundLight: '#F5F5F5',
    textPrimary: '#080A0B',
    textSecondary: '#E7E3E9',
    textMuted: 'rgba(8, 10, 11, 0.7)',
    border: '#E8E8E8',
    borderLight: 'rgba(0, 0, 0, 0.05)',
    white: '#FFFFFF',
    black: '#000000',
    danger: '#ff6464',
    success: '#45A196',
    warning: '#f39c12',
    disabled: '#bdc3c7',
    surface: '#f8f9fa',
    shadow: '#000000'
  },

  // Typography
  typography: {
    fonts: {
      inter: 'Inter',
      roboto: 'Roboto',
      robotoMono: 'Roboto Mono'
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    },
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 20,
      xl: 24,
      '2xl': 32,
      '3xl': 48,
      '4xl': 64,
      '5xl': 70
    },
    lineHeights: {
      tight: 1.1,
      normal: 1.2,
      relaxed: 1.3,
      loose: 1.5,
      extraLoose: 1.6,
      veryLoose: 1.7
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 0.8,
      widest: 1.2
    }
  },

  // Spacing
  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    '2xl': 64,
    '3xl': 80
  },

  // Border Radius
  radius: {
    sm: 4,
    md: 8,
    lg: 10,
    xl: 12,
    '2xl': 20
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 6
    }
  },

  // Transitions
  transitions: {
    fast: 200,
    base: 300,
    slow: 500
  },

  // Components
  components: {
    button: {
      primary: {
        backgroundColor: '#64E2D3',
        color: '#080A0B',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 4,
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase'
      },
      secondary: {
        backgroundColor: '#5A5E62',
        color: '#FFFFFF',
        paddingVertical: 7,
        paddingHorizontal: 28,
        borderRadius: 5,
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase'
      },
      roulette: {
        backgroundColor: '#2a2a2a',
        color: '#64E2D3',
        paddingVertical: 18,
        paddingHorizontal: 36,
        borderRadius: 12,
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        borderWidth: 3,
        borderColor: '#64E2D3'
      }
    },
    input: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderWidth: 1,
      borderRadius: 4,
      paddingVertical: 18,
      paddingHorizontal: 24,
      fontSize: 16,
      color: '#080A0B',
      fontFamily: 'Roboto Mono'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      borderRadius: 8,
      padding: 24,
      backdropFilter: 'blur(20px)'
    }
  }
};
