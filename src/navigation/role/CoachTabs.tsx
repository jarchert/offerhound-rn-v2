// CoachTabs — 5 tabs: Dashboard, Pipeline, Camps, Letters, Inbox
// Build 25 fixes:
//   - DirectoryTab dropped (was pointing at 68-line stub CoachSearchAthletesScreen);
//     athlete search is now reachable via Pipeline / Dashboard CTAs that route to the
//     full AthleteSearchScreen (388 lines) via the root stack.
//   - CampsTab now uses CoachCampsScreen (167 lines, role-correct) instead of the
//     shared CampsScreen (105 lines, athlete-oriented).
//   - Inbox added so coaches can read DMs/letters from their tab bar.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { LayoutDashboard, Users, Tent, Mail, Inbox } from 'lucide-react-native';

import CoachDashboard from '@/screens/coach/CoachDashboard';
import CoachRosterScreen from '@/screens/coach/CoachRosterScreen';
import CoachCampsScreen from '@/screens/coach/CoachCampsScreen';
import CoachLettersScreen from '@/screens/coach/CoachLettersScreen';
import InboxScreen from '@/screens/shared/InboxScreen';

const Tab = createBottomTabNavigator();

export default function CoachTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.foregroundSubtle,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.bodyMedium,
          fontSize: 11,
          letterSpacing: 0.5,
        },
      }}>
      <Tab.Screen name="DashboardTab" component={CoachDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="PipelineTab" component={CoachRosterScreen} options={{ title: 'Pipeline', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tab.Screen name="CampsTab" component={CoachCampsScreen} options={{ title: 'Camps', tabBarIcon: ({ color, size }) => <Tent size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={CoachLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
