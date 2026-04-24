// AnimatedRoutes (React Native port — verbatim-intent from Lovable source)
//
// Lovable source:
//   src/components/AnimatedRoutes.tsx
//
// In the Lovable web app, `AnimatedRoutes` is a `react-router-dom`
// `<Routes>` tree wrapped in framer-motion's `<AnimatePresence mode="wait">`
// so page transitions fade/slide as the URL changes. Every `<Route>`'s
// `element` is wrapped in `<AnimatedPage>`, which owns the per-page
// framer-motion transition (opacity/translate, ~250ms ease).
//
// In React Native, routing is NOT declared via JSX `<Route>` children —
// it's declared in the navigator (see
// `@react-navigation/native` + `@react-navigation/native-stack`'s
// `Stack.Navigator` / `Stack.Screen`). Per-screen enter/exit transitions
// are owned by the navigator itself (default native stack animations) and
// by `AnimatedPage.tsx`, which ports the framer-motion fade-in with
// `Animated.timing({ duration: 250 })` — matching the Lovable curve.
//
// Therefore the faithful RN port of this component is a no-op wrapper:
// the component exists so call sites / imports remain parity-compatible,
// but the actual route tree lives in the navigator module. Children, if
// passed, are rendered as-is so callers can still use this as a layout
// fragment without behavioral change.
//
// Parity gaps vs. Lovable (by design, due to platform):
//   - No `useLocation()` — RN route state lives in `useNavigation` /
//     `useRoute` from @react-navigation/native.
//   - No `useDeepLinks()` hook call here — deep links in RN are wired via
//     `NavigationContainer`'s `linking` prop, not inside this component.
//   - No `<AnimatePresence mode="wait">` — native stack handles transition
//     orchestration; per-page fade is handled by `AnimatedPage`.
//   - The concrete route table (Landing, Dashboard, Auth, QuickStart*,
//     CoachDashboard, ScoutDashboard, /podcasts, /influencers, etc.) must
//     be reproduced in the navigator, not here.

import React from 'react';

type AnimatedRoutesProps = {
  children?: React.ReactNode;
};

export function AnimatedRoutes({ children }: AnimatedRoutesProps) {
  return <>{children}</>;
}

export default AnimatedRoutes;
