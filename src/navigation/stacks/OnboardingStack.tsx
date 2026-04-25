// OnboardingStack — 11 role-specific onboarding flows per Part 2 §2.1
// Part 7 + Part 41 describe the onboarding system.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CoachOnboarding.tsx (560 LOC) — schedule in next wave
const CoachOnboarding = makePlaceholder('Coach Onboarding', 'Arrives in Session 7', 'Coach role onboarding flow.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/ScoutOnboarding.tsx (154 LOC) — schedule in next wave
const ScoutOnboarding = makePlaceholder('Scout Onboarding', 'Arrives in Session 7', 'Scout role onboarding flow.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/InfluencerOnboarding.tsx (244 LOC) — schedule in next wave
const InfluencerOnboarding = makePlaceholder('Influencer Onboarding', 'Arrives in Session 7', 'Influencer role onboarding flow.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/QuickStartSelect.tsx (105 LOC) — schedule in next wave
const QuickStartSelect = makePlaceholder('Quick Start', 'Arrives in Session 7', 'Pick your role to get started.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/QuickStartCoach.tsx (155 LOC); CoachQuickStartGuide dialog component is ported but the page-level wrapper (auth + redirects + role gating) is not. Schedule in next wave.
const QuickStartCoach = makePlaceholder('Quick Start: Coach', 'Arrives in Session 7', 'Coach quick start guide.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/QuickStartScout.tsx (156 LOC); ScoutQuickStartGuide dialog component is ported but the page-level wrapper is not. Schedule in next wave.
const QuickStartScout = makePlaceholder('Quick Start: Scout', 'Arrives in Session 7', 'Scout quick start guide.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/QuickStartOrganization.tsx (174 LOC) — schedule in next wave
const QuickStartOrganization = makePlaceholder('Quick Start: Organization', 'Arrives in Session 7', 'Organization quick start guide.');
// PORT-PENDING: no Lovable QuickStartAthlete page — AthleteQuickStartGuide dialog component is ported but the page-level wrapper (auth + redirects + role gating) is not. Schedule in next wave.
const QuickStartAthlete = makePlaceholder('Quick Start: Athlete', 'Arrives in Session 7', 'Athlete quick start guide.');

export type OnboardingStackParamList = {
  Onboarding: undefined;
  CoachOnboarding: undefined;
  ScoutOnboarding: undefined;
  InfluencerOnboarding: undefined;
  QuickStartSelect: undefined;
  QuickStartCoach: undefined;
  QuickStartScout: undefined;
  QuickStartOrganization: undefined;
  QuickStartAthlete: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="CoachOnboarding" component={CoachOnboarding} />
      <Stack.Screen name="ScoutOnboarding" component={ScoutOnboarding} />
      <Stack.Screen name="InfluencerOnboarding" component={InfluencerOnboarding} />
      <Stack.Screen name="QuickStartSelect" component={QuickStartSelect} />
      <Stack.Screen name="QuickStartCoach" component={QuickStartCoach} />
      <Stack.Screen name="QuickStartScout" component={QuickStartScout} />
      <Stack.Screen name="QuickStartOrganization" component={QuickStartOrganization} />
      <Stack.Screen name="QuickStartAthlete" component={QuickStartAthlete} />
    </Stack.Navigator>
  );
}
