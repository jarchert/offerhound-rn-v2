// Platform-safe re-export of expo-tracking-transparency.
// Native build: imports the real module (iOS only actually does anything).
// Web build: resolved via ./tracking-transparency.web.ts stub — Metro auto-picks .web.ts.
export * from 'expo-tracking-transparency';
