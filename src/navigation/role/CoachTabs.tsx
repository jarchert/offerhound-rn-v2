// CoachTabs — 5 tabs per Part 2 §2.1: Dashboard, Pipeline, Camps, Letters, Directory
// Part 4 of the conversion guide is the detailed reference.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import CoachDashboard from '@/screens/coach/CoachDashboard';
import CoachRosterScreen from '@/screens/coach/CoachRosterScreen';
import CoachSearchAthletesScreen from '@/screens/coach/CoachSearchAthletesScreen';
import CampsScreen from '@/screens/shared/CampsScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const CoachLettersScreen = makePlaceholder('Coach Letters', 'Arrives in Session 4', 'AI letter composer with streaming generation.');

const Tab = createBottomTabNavigator();

export default function CoachTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.foregroundSubtle,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.bodyMedium,
          fontSize: 11,
          letterSpacing: 0.5,
        },
      }}>
      <Tab.Screen name="DashboardTab" component={CoachDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="PipelineTab" component={CoachRosterScreen} options={{ title: 'Pipeline' }} />
      <Tab.Screen name="CampsTab" component={CampsScreen} options={{ title: 'Camps' }} />
      <Tab.Screen name="LettersTab" component={CoachLettersScreen} options={{ title: 'Letters' }} />
      <Tab.Screen name="DirectoryTab" component={CoachSearchAthletesScreen} options={{ title: 'Directory' }} />
    </Tab.Navigator>
  );
}
