// AthleteTabs — 5 tabs per Part 2 §2.1: Home, Matches, Messages, Letters, Profile
// Part 3 of the conversion guide describes this navigator in detail.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import AthleteDashboard from '@/screens/athlete/AthleteDashboard';
import AthleteMatchesScreen from '@/screens/athlete/AthleteMatchesScreen';
import LettersScreen from '@/screens/athlete/LettersScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import ProfileScreen from '@/screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AthleteTabs() {
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
      <Tab.Screen name="HomeTab" component={AthleteDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="MatchesTab" component={AthleteMatchesScreen} options={{ title: 'Matches' }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages' }} />
      <Tab.Screen name="LettersTab" component={LettersScreen} options={{ title: 'Letters' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
