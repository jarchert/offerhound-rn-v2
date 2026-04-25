// OnboardingStack — 11 role-specific onboarding flows per Part 2 §2.1
// Part 7 + Part 41 describe the onboarding system.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import CoachOnboardingScreen from '@/screens/onboarding/CoachOnboardingScreen';
import ScoutOnboardingScreen from '@/screens/onboarding/ScoutOnboardingScreen';
import InfluencerOnboardingScreen from '@/screens/onboarding/InfluencerOnboardingScreen';
import QuickStartSelectScreen from '@/screens/onboarding/QuickStartSelectScreen';
import QuickStartCoachScreen from '@/screens/onboarding/QuickStartCoachScreen';
import QuickStartScoutScreen from '@/screens/onboarding/QuickStartScoutScreen';
import QuickStartOrganizationScreen from '@/screens/onboarding/QuickStartOrganizationScreen';
import QuickStartAthleteScreen from '@/screens/onboarding/QuickStartAthleteScreen';

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
      <Stack.Screen name="CoachOnboarding" component={CoachOnboardingScreen} />
      <Stack.Screen name="ScoutOnboarding" component={ScoutOnboardingScreen} />
      <Stack.Screen name="InfluencerOnboarding" component={InfluencerOnboardingScreen} />
      <Stack.Screen name="QuickStartSelect" component={QuickStartSelectScreen} />
      <Stack.Screen name="QuickStartCoach" component={QuickStartCoachScreen} />
      <Stack.Screen name="QuickStartScout" component={QuickStartScoutScreen} />
      <Stack.Screen name="QuickStartOrganization" component={QuickStartOrganizationScreen} />
      <Stack.Screen name="QuickStartAthlete" component={QuickStartAthleteScreen} />
    </Stack.Navigator>
  );
}
