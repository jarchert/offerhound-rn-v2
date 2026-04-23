import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/theme';

// Auth screens
import LandingScreen from '@/screens/auth/LandingScreen';
import SignInScreen from '@/screens/auth/SignInScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';

// Onboarding screens
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';

// Role-specific dashboards
import AthleteDashboard from '@/screens/athlete/AthleteDashboard';
import CoachDashboard from '@/screens/coach/CoachDashboard';
import ScoutDashboard from '@/screens/scout/ScoutDashboard';
import ParentDashboard from '@/screens/parent/ParentDashboard';
import InfluencerDashboard from '@/screens/influencer/InfluencerDashboard';
import AdminDashboard from '@/screens/admin/AdminDashboard';

// Shared screens
import ProfileScreen from '@/screens/shared/ProfileScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import NotificationsScreen from '@/screens/shared/NotificationsScreen';
import SettingsScreen from '@/screens/shared/SettingsScreen';
import CoachSearchScreen from '@/screens/shared/CoachSearchScreen';
import CampsScreen from '@/screens/shared/CampsScreen';
import NewsScreen from '@/screens/shared/NewsScreen';
import DeleteAccountScreen from '@/screens/shared/DeleteAccountScreen';

// Athlete-specific screens
import AthleteMatchesScreen from '@/screens/athlete/AthleteMatchesScreen';
import RecruitingPipelineScreen from '@/screens/athlete/RecruitingPipelineScreen';
import LettersScreen from '@/screens/athlete/LettersScreen';
import NILAdvisorScreen from '@/screens/athlete/NILAdvisorScreen';

// Coach-specific screens
import CoachSearchAthletesScreen from '@/screens/coach/CoachSearchAthletesScreen';
import CoachRosterScreen from '@/screens/coach/CoachRosterScreen';

// Influencer screens
import InfluencerBoardScreen from '@/screens/influencer/InfluencerBoardScreen';
import PodcastScreen from '@/screens/influencer/PodcastScreen';
import SmokeTestScreen from '@/screens/dev/SmokeTestScreen';

import { useTheme } from '@/contexts/ThemeContext';

export type RootStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Profile: { userId?: string };
  Messages: undefined;
  Notifications: undefined;
  Settings: undefined;
  CoachSearch: undefined;
  Camps: undefined;
  News: undefined;
  DeleteAccount: undefined;
  AthleteMatches: undefined;
  RecruitingPipeline: undefined;
  Letters: undefined;
  NILAdvisor: undefined;
  CoachSearchAthletes: undefined;
  CoachRoster: undefined;
  InfluencerBoard: undefined;
  Podcast: undefined;
  SmokeTest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function AthleteTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
    }}>
      <Tab.Screen name="Home" component={AthleteDashboard} />
      <Tab.Screen name="Matches" component={AthleteMatchesScreen} />
      <Tab.Screen name="Pipeline" component={RecruitingPipelineScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function CoachTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
    }}>
      <Tab.Screen name="Home" component={CoachDashboard} />
      <Tab.Screen name="Athletes" component={CoachSearchAthletesScreen} />
      <Tab.Screen name="Roster" component={CoachRosterScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const { userRole } = useAuth();
  switch (userRole) {
    case 'coach': return <CoachTabs />;
    case 'scout': return <ScoutDashboard />;
    case 'parent': return <ParentDashboard />;
    case 'influencer': return <InfluencerDashboard />;
    case 'admin': return <AdminDashboard />;
    default: return <AthleteTabs />;
  }
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="CoachSearch" component={CoachSearchScreen} />
            <Stack.Screen name="Camps" component={CampsScreen} />
            <Stack.Screen name="News" component={NewsScreen} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
            <Stack.Screen name="Letters" component={LettersScreen} />
            <Stack.Screen name="NILAdvisor" component={NILAdvisorScreen} />
            <Stack.Screen name="InfluencerBoard" component={InfluencerBoardScreen} />
            <Stack.Screen name="Podcast" component={PodcastScreen} />
            <Stack.Screen name="SmokeTest" component={SmokeTestScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
