// OnboardingStack — 11 role-specific onboarding flows per Part 2 §2.1
// Part 7 + Part 41 describe the onboarding system.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const CoachOnboarding = makePlaceholder('Coach Onboarding', 'Arrives in Session 7', 'Coach role onboarding flow.');
const ScoutOnboarding = makePlaceholder('Scout Onboarding', 'Arrives in Session 7', 'Scout role onboarding flow.');
const InfluencerOnboarding = makePlaceholder('Influencer Onboarding', 'Arrives in Session 7', 'Influencer role onboarding flow.');
const QuickStartSelect = makePlaceholder('Quick Start', 'Arrives in Session 7', 'Pick your role to get started.');
const QuickStartCoach = makePlaceholder('Quick Start: Coach', 'Arrives in Session 7', 'Coach quick start guide.');
const QuickStartScout = makePlaceholder('Quick Start: Scout', 'Arrives in Session 7', 'Scout quick start guide.');
const QuickStartOrganization = makePlaceholder('Quick Start: Organization', 'Arrives in Session 7', 'Organization quick start guide.');
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
