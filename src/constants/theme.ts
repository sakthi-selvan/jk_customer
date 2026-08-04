/**
 * JK Taxi — light, feel-good mobility UI.
 * Soft surfaces + deep violet accent (not neon, not dark mode).
 */
export const Colors = {
  // Brand — deep violet accent on light UI
  primary: '#5B21B6',
  primaryDark: '#4C1D95',
  primaryMid: '#6D28D9',
  primaryLight: '#7C3AED',
  primarySoft: '#F3EEFF',
  primaryMuted: '#E9E0FF',

  // Light app chrome
  background: '#F7F7FB',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Sheets / map overlays
  sheet: '#FFFFFF',
  sheetAlt: '#F3F4F8',
  ink: '#1A1B2E',
  inkSecondary: '#5B6178',
  inkMuted: '#8B90A5',

  // Text on light surfaces
  text: '#1A1B2E',
  textSecondary: '#5B6178',
  textMuted: '#8B90A5',

  // Status (slightly softened)
  success: '#0D9488',
  error: '#E11D48',
  warning: '#EA580C',
  info: '#2563EB',

  border: '#E8E9F0',
  borderDark: '#D1D5E0',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(26, 27, 46, 0.35)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadows = {
  soft: {
    shadowColor: '#1A1B2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  nav: {
    shadowColor: '#1A1B2E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
};
