// CoachTabs — 5 tabs per Part 2 §2.1: Dashboard, Pipeline, Camps, Letters, Directory
// Part 4 of the conversion guide is the detailed reference.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { LayoutDashboard, Users, Tent, Mail, Search } from 'lucide-react-native';

import CoachDashboard from '@/screens/coach/CoachDashboard';
import CoachRosterScreen from '@/screens/coach/CoachRosterScreen';
import CoachSearchAthletesScreen from '@/screens/coach/CoachSearchAthletesScreen';
import CampsScreen from '@/screens/shared/CampsScreen';
import CoachLettersScreen from '@/screens/coach/CoachLettersScreen';

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
      <Tab.Screen name="DashboardTab" component={CoachDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="PipelineTab" component={CoachRosterScreen} options={{ title: 'Pipeline', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tab.Screen name="CampsTab" component={CampsScreen} options={{ title: 'Camps', tabBarIcon: ({ color, size }) => <Tent size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={CoachLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="DirectoryTab" component={CoachSearchAthletesScreen} options={{ title: 'Directory', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
