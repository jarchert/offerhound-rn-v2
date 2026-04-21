// Design tokens derived from src/index.css Lovable theme
// Dark athletic theme is the default for mobile

export const colors = {
  // Backgrounds
  background: '#0f172a',      // hsl(220 20% 8%)
  backgroundLight: '#f9f7f2', // hsl(45 30% 98%) - light mode
  card: '#1a2236',            // hsl(220 18% 12%)
  cardLight: '#ffffff',

  // Text
  foreground: '#fffef5',      // hsl(45 100% 98%)
  foregroundMuted: '#7a8ba8', // hsl(220 10% 55%)
  foregroundLight: '#1a2030', // hsl(220 25% 12%)

  // Brand
  primary: '#f59e0b',         // hsl(45 93% 47%) - gold
  primaryForeground: '#0f172a',
  accent: '#fbbf24',          // hsl(45 85% 55%) - lighter gold
  accentForeground: '#0f172a',

  // Secondary
  secondary: '#1e2d42',       // hsl(220 15% 18%)
  secondaryForeground: '#e8e0c8',

  // Muted
  muted: '#161f2e',           // hsl(220 15% 15%)
  mutedForeground: '#7a8ba8',

  // Status
  destructive: '#dc2626',
  destructiveForeground: '#fffef5',
  success: '#16a34a',
  successForeground: '#ffffff',
  warning: '#f59e0b',
  warningForeground: '#000000',
  info: '#0ea5e9',
  infoForeground: '#ffffff',

  // Border / input
  border: '#1e2d42',          // hsl(220 15% 20%)
  input: '#1e2d42',
  ring: '#f59e0b',

  // Sidebar (same as card in dark)
  sidebarBackground: '#111827',
  sidebarForeground: '#e8e0c8',
  sidebarBorder: '#1e2d42',
};

export const gradients = {
  gold: ['#f59e0b', '#f97316'] as [string, string],
  dark: ['#0f172a', '#0a1020'] as [string, string],
  card: ['#1a2236', '#131c2e'] as [string, string],
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontFamily: {
    heading: 'BebasNeue_400Regular',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  letterSpacing: {
    heading: 1.5,
    body: 0,
  },
};
