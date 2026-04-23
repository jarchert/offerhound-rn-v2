// src/lib/theme.ts
// Design tokens — **exact hex values derived from Lovable src/index.css HSL**.
// Every color here was computed from the Lovable CSS variables to guarantee
// visual parity with the web app. Do not hand-tune; if Lovable changes,
// re-run `scripts/extract-theme.py` (or inline computation) and overwrite.
//
// Source-of-truth HSL → hex mapping (from /home/ubuntu/.openclaw/workspace/offerhound-repo/src/index.css):
//   --background      220 20% 8%   → #101318
//   --foreground      45 100% 98%  → #fffcf4
//   --card            220 18% 12%  → #191c24
//   --primary         45 93% 47%   → #e7af08  (championship gold)
//   --accent          45 85% 55%   → #edbd2a
//   --secondary       220 15% 18%  → #272b34
//   --muted           220 15% 15%  → #20242b
//   --border/input    220 15% 20%  → #2b303a
//   --destructive     0 72% 51%    → #dc2828
//   --success         142 76% 36%  → #16a149
//   --warning         38 92% 50%   → #f49e0a
//   --info            199 89% 48%  → #0da2e7
//
// Gradients (from Lovable --gradient-gold, --gradient-dark, --gradient-card):
//   gold: linear-gradient(135°, #e7af08 → #f39d24)
//   dark: linear-gradient(180°, #101318 → #0a0b0f)
//   card: linear-gradient(145°, #1d212a → #14171e)

export const colors = {
  // Core surfaces
  background: '#101318',       // hsl(220 20% 8%)  — app background ("near black")
  backgroundDark: '#0a0b0f',   // hsl(220 18% 5%)  — gradient-dark endpoint
  card: '#191c24',             // hsl(220 18% 12%)
  cardHigh: '#1d212a',         // hsl(220 18% 14%) — gradient-card start
  cardLow: '#14171e',          // hsl(220 18% 10%) — gradient-card end + sidebar

  // Text
  foreground: '#fffcf4',       // hsl(45 100% 98%) — warm cream
  foregroundSubtle: '#808897', // hsl(220 10% 55%) — muted foreground

  // Brand — championship gold
  primary: '#e7af08',          // hsl(45 93% 47%)
  primaryForeground: '#101318',
  primaryEnd: '#f39d24',       // hsl(35 90% 55%) — gradient gold end

  // Accent — lighter gold
  accent: '#edbd2a',           // hsl(45 85% 55%)
  accentForeground: '#101318',

  // Secondary (navy)
  secondary: '#272b34',        // hsl(220 15% 18%)
  secondaryForeground: '#eae8e0',

  // Muted
  muted: '#20242b',            // hsl(220 15% 15%)
  mutedForeground: '#808897',

  // Status
  destructive: '#dc2828',
  destructiveForeground: '#fffcf4',
  success: '#16a149',
  successForeground: '#ffffff',
  warning: '#f49e0a',
  warningForeground: '#000000',
  info: '#0da2e7',
  infoForeground: '#ffffff',

  // Border / input
  border: '#2b303a',           // hsl(220 15% 20%)
  input: '#2b303a',
  ring: '#e7af08',

  // Sidebar
  sidebarBackground: '#14171e',
  sidebarForeground: '#eae8e0',
  sidebarBorder: '#2b303a',

  // Transparency helpers
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.7)',
  goldShadow: 'rgba(231, 175, 8, 0.3)',   // --shadow-gold: 0 4px 30px -5px hsl(45 93% 47% / 0.3)
};

export const gradients = {
  // Championship gold: 135° → #e7af08 → #f39d24
  gold: ['#e7af08', '#f39d24'] as [string, string],
  // Dark: 180° → #101318 → #0a0b0f
  dark: ['#101318', '#0a0b0f'] as [string, string],
  // Card: 145° → #1d212a → #14171e
  card: ['#1d212a', '#14171e'] as [string, string],
};

export const radius = {
  sm: 6,     // 0.375rem
  md: 9,     // 0.5625rem  (--radius - 6px in Lovable: 0.75rem - 6px)
  lg: 12,    // --radius = 0.75rem = 12px
  xl: 18,    // --radius + 6px
  xxl: 24,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Font families — values MUST match the keys used by useFonts() in App.tsx.
// The expo-google-fonts packages use snake_case keys like 'BebasNeue_400Regular'.
export const typography = {
  fontFamily: {
    heading: 'BebasNeue_400Regular',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
    bodyBold: 'Inter_700Bold',
  },
  // Lovable CSS: h* letter-spacing: 0.025em on Bebas Neue headings.
  letterSpacing: {
    heading: 0.5, // ~0.025em at 20pt
    tight: -0.2,
    wide: 1,
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  // Alias: older stubs use typography.fontSize.* — keep both working.
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  // Heading scale matches Lovable mobile render.
  // Bebas Neue is condensed — 1rem in Bebas reads smaller than 1rem in Inter.
  // Adjust head sizes upward ~10–20% vs body.
  heading: {
    h1: 40,
    h2: 32,
    h3: 26,
    h4: 22,
    h5: 18,
    h6: 16,
  },
};

export const shadows = {
  // Native equivalents of Lovable's --shadow-gold and --shadow-card.
  // RN shadow* props (iOS) + elevation (Android).
  gold: {
    shadowColor: '#e7af08',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Animation durations matching Lovable keyframes (fadeIn 0.6s, scaleIn 0.4s).
export const motion = {
  fast: 200,
  normal: 400,
  slow: 600,
};

export const theme = {
  colors,
  gradients,
  radius,
  spacing,
  typography,
  shadows,
  motion,
};

export default theme;
