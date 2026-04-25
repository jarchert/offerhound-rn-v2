// RootNavigator — post-Session 2 rewrite per Part 2 §2.1
// NO NavigationContainer here (App.tsx owns it). This is the root Stack that
// branches on auth + role and exposes 9 role navigators + 7 shared stacks.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/theme';
import type { UserRole } from '@/lib/constants';

// Role navigators
import AthleteTabs from '@/navigation/role/AthleteTabs';
import CoachTabs from '@/navigation/role/CoachTabs';
import ScoutTabs from '@/navigation/role/ScoutTabs';
import ParentTabs from '@/navigation/role/ParentTabs';
import InfluencerTabs from '@/navigation/role/InfluencerTabs';
import AdminTabs from '@/navigation/role/AdminTabs';
import HSCoachTabs from '@/navigation/role/HSCoachTabs';
import ClubCoachTabs from '@/navigation/role/ClubCoachTabs';
import AgencyTabs from '@/navigation/role/AgencyTabs';

// Shared stacks
import AuthStack from '@/navigation/stacks/AuthStack';
import OnboardingStack from '@/navigation/stacks/OnboardingStack';
import CampStack from '@/navigation/stacks/CampStack';
import SettingsStack from '@/navigation/stacks/SettingsStack';
import PublicProfileStack from '@/navigation/stacks/PublicProfileStack';
import PublicTabs from '@/navigation/stacks/PublicTabs';
import PublicSportStack from '@/navigation/stacks/PublicSportStack';

// Shared screens accessed from any role
import ProfileScreen from '@/screens/shared/ProfileScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import NotificationsScreen from '@/screens/shared/NotificationsScreen';
import InboxScreen from '@/screens/shared/InboxScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';
import AICoachScreen from '@/screens/shared/AICoachScreen';
import SmokeTestScreen from '@/screens/dev/SmokeTestScreen';

export type RootStackParamList = {
  PublicTabs: undefined;
  PublicSportStack: undefined;
  AuthStack: undefined;
  OnboardingStack: undefined;
  AthleteTabs: undefined;
  CoachTabs: undefined;
  ScoutTabs: undefined;
  ParentTabs: undefined;
  InfluencerTabs: undefined;
  AdminTabs: undefined;
  HSCoachTabs: undefined;
  ClubCoachTabs: undefined;
  AgencyTabs: undefined;
  CampStack: undefined;
  SettingsStack: undefined;
  PublicProfileStack: undefined;
  Profile: { userId?: string };
  Messages: undefined;
  Notifications: undefined;
  Inbox: undefined;
  LetterComposer: { seed?: any } | undefined;
  AICoach: undefined;
  SmokeTest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Map the resolved user role to the initial role-specific tab navigator name.
 * Default = athlete (the largest role). Unknown roles fall back to PublicTabs.
 */
function roleToInitialRoute(role: UserRole | null | undefined): keyof RootStackParamList {
  switch (role) {
    case 'athlete': return 'AthleteTabs';
    case 'coach': return 'CoachTabs';
    case 'scout': return 'ScoutTabs';
    case 'parent': return 'ParentTabs';
    case 'influencer': return 'InfluencerTabs';
    case 'admin':
    case 'moderator': return 'AdminTabs';
    case 'high_school_coach': return 'HSCoachTabs';
    case 'club_coach': return 'ClubCoachTabs';
    case 'agency' as UserRole: return 'AgencyTabs';
    default: return 'AthleteTabs';
  }
}

export default function RootNavigator() {
  const { user, userRole, isLoading } = useAuth() as any;

  if (isLoading) return null;

  const initialRouteName = user
    ? roleToInitialRoute(userRole as UserRole | null | undefined)
    : ('PublicTabs' as keyof RootStackParamList);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      {!user ? (
        <>
          <Stack.Screen name="PublicTabs" component={PublicTabs} />
          <Stack.Screen name="PublicSportStack" component={PublicSportStack} />
          <Stack.Screen name="AuthStack" component={AuthStack} />
          <Stack.Screen name="PublicProfileStack" component={PublicProfileStack} />
          <Stack.Screen name="CampStack" component={CampStack} />
        </>
      ) : (
        <>
          {/* Role-specific navigators — the initialRouteName picks one */}
          <Stack.Screen name="AthleteTabs" component={AthleteTabs} />
          <Stack.Screen name="CoachTabs" component={CoachTabs} />
          <Stack.Screen name="ScoutTabs" component={ScoutTabs} />
          <Stack.Screen name="ParentTabs" component={ParentTabs} />
          <Stack.Screen name="InfluencerTabs" component={InfluencerTabs} />
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="HSCoachTabs" component={HSCoachTabs} />
          <Stack.Screen name="ClubCoachTabs" component={ClubCoachTabs} />
          <Stack.Screen name="AgencyTabs" component={AgencyTabs} />

          {/* Shared stacks accessible from any role */}
          <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
          <Stack.Screen name="CampStack" component={CampStack} />
          <Stack.Screen name="SettingsStack" component={SettingsStack} />
          <Stack.Screen name="PublicProfileStack" component={PublicProfileStack} />
          <Stack.Screen name="PublicSportStack" component={PublicSportStack} />

          {/* Cross-cutting modals / shared screens */}
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Inbox" component={InboxScreen} />
          <Stack.Screen
            name="LetterComposer"
            component={LetterComposerScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="AICoach"
            component={AICoachScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="SmokeTest" component={SmokeTestScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
