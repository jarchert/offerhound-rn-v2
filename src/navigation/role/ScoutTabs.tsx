// ScoutTabs — 4 tabs per Part 2 §2.1: Dashboard, Letters, Trends, Onboarding
// Part 35 of the conversion guide describes scout nav + Kanban pipeline.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { LayoutDashboard, Mail, TrendingUp, BookOpen } from 'lucide-react-native';

import ScoutDashboard from '@/screens/scout/ScoutDashboard';
import ScoutLettersScreen from '@/screens/scout/ScoutLettersScreen';
import ScoutTrendsScreen from '@/screens/scout/ScoutTrendsScreen';
import ScoutOnboardingScreen from '@/screens/onboarding/ScoutOnboardingScreen';

const Tab = createBottomTabNavigator();

export default function ScoutTabs() {
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
      <Tab.Screen name="DashboardTab" component={ScoutDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={ScoutLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="TrendsTab" component={ScoutTrendsScreen} options={{ title: 'Trends', tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} /> }} />
      <Tab.Screen name="OnboardingTab" component={ScoutOnboardingScreen} options={{ title: 'Guide', tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
