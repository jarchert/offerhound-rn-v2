// src/lib/theme.ts
// Design tokens — **exact hex values derived from Lovable src/index.css HSL**.
// Every color here was computed from the Lovable CSS variables using proper
// rounding (not truncation) to guarantee visual parity with the web app.
//
// Source-of-truth HSL → hex mapping (Lovable dark theme, src/index.css .dark):
//   --background      220 20% 8%   → #101318
//   --foreground      45 100% 98%  → #fffcf5
//   --card            220 18% 12%  → #191d24
//   --card-foreground 45 100% 98%  → #fffcf5
//   --popover         220 18% 12%  → #191d24
//   --popover-fg      45 100% 98%  → #fffcf5
//   --primary         45 93% 47%   → #e7b008  (championship gold)
//   --accent          45 85% 55%   → #eebd2b
//   --secondary       220 15% 18%  → #272c35
//   --muted           220 15% 15%  → #21242c
//   --border/input    220 15% 20%  → #2b303b
//   --destructive     0 72% 51%    → #dc2828
//   --success         142 76% 36%  → #16a249
//   --warning         38 92% 50%   → #f59f0a
//   --info            199 89% 48%  → #0da2e7
//
// Gradients (from Lovable --gradient-gold, --gradient-dark, --gradient-card):
//   gold: linear-gradient(135°, #e7b008 → #f49d25)
//   dark: linear-gradient(180°, #101318 → #0a0c0f)
//   card: linear-gradient(145°, #1d222a → #15181e)

export const colors = {
  // Core surfaces
  background: '#101318',       // hsl(220 20% 8%)  — app background ("near black")
  backgroundDark: '#0a0c0f',   // hsl(220 18% 5%)  — gradient-dark endpoint
  card: '#191d24',             // hsl(220 18% 12%)
  cardForeground: '#fffcf5',   // hsl(45 100% 98%) — MAIN --card-foreground
  cardHigh: '#1d222a',         // hsl(220 18% 14%) — gradient-card start
  cardLow: '#15181e',          // hsl(220 18% 10%) — gradient-card end + sidebar
  popover: '#191d24',          // hsl(220 18% 12%) — MAIN --popover
  popoverForeground: '#fffcf5',// hsl(45 100% 98%) — MAIN --popover-foreground

  // Text
  foreground: '#fffcf5',       // hsl(45 100% 98%) — warm cream
  foregroundSubtle: '#818898', // hsl(220 10% 55%) — muted foreground

  // Brand — championship gold
  primary: '#e7b008',          // hsl(45 93% 47%)
  primaryForeground: '#101318',
  primaryEnd: '#f49d25',       // hsl(35 90% 55%) — gradient gold end

  // Accent — lighter gold
  accent: '#eebd2b',           // hsl(45 85% 55%)
  accentForeground: '#101318',

  // Secondary (navy)
  secondary: '#272c35',        // hsl(220 15% 18%)
  secondaryForeground: '#ebe8e0',

  // Muted
  muted: '#21242c',            // hsl(220 15% 15%)
  mutedForeground: '#818898',

  // Status
  destructive: '#dc2828',
  destructiveForeground: '#fffcf5',
  success: '#16a249',
  successForeground: '#ffffff',
  warning: '#f59f0a',
  warningForeground: '#000000',
  info: '#0da2e7',
  infoForeground: '#ffffff',

  // Border / input
  border: '#2b303b',           // hsl(220 15% 20%)
  input: '#2b303b',
  ring: '#e7b008',

  // Sidebar
  sidebarBackground: '#15181e',
  sidebarForeground: '#ebe8e0',
  sidebarBorder: '#2b303b',

  // Transparency helpers
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.7)',
  goldShadow: 'rgba(231, 176, 8, 0.3)',   // --shadow-gold: 0 4px 30px -5px hsl(45 93% 47% / 0.3)
};

export const gradients = {
  // Championship gold: 135° → #e7b008 → #f49d25
  gold: ['#e7b008', '#f49d25'] as [string, string],
  // Dark: 180° → #101318 → #0a0c0f
  dark: ['#101318', '#0a0c0f'] as [string, string],
  // Card: 145° → #1d222a → #15181e
  card: ['#1d222a', '#15181e'] as [string, string],
};

export const radius = {
  sm: 8,     // calc(--radius - 4px) = 0.75rem - 4px
  md: 10,    // calc(--radius - 2px) = 0.75rem - 2px
  lg: 12,    // --radius = 0.75rem
  xl: 18,    // RN extension (--radius + 6px)
  xxl: 24,   // RN extension
  full: 9999,// RN extension (native pill shapes)
};

// Spacing steps land on Tailwind's 4px grid so ports from MAIN keep parity.
// xs..xxxl are the original named steps; the numeric aliases (sm2/md2/lg2)
// fill the previously-missing 12/20/40 gaps (Tailwind space-3/5/10).
export const spacing = {
  xs: 4,     // Tailwind space-1
  sm: 8,     // Tailwind space-2
  sm2: 12,   // Tailwind space-3
  md: 16,    // Tailwind space-4
  md2: 20,   // Tailwind space-5
  lg: 24,    // Tailwind space-6
  xl: 32,    // Tailwind space-8
  lg2: 40,   // Tailwind space-10
  xxl: 48,   // Tailwind space-12
  xxxl: 64,  // Tailwind space-16
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
    '7xl': 72,
    '8xl': 96,
    '9xl': 128,
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
    '7xl': 72,
    '8xl': 96,
    '9xl': 128,
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
  // Tailwind defaults MAIN inherits: leading-tight 1.25, leading-normal 1.5,
  // leading-relaxed 1.625.
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
};

export const shadows = {
  // Native equivalents of Lovable's --shadow-gold and --shadow-card.
  // RN shadow* props (iOS) + elevation (Android).
  gold: {
    shadowColor: '#e7b008',
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
