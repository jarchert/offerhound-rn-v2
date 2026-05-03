// ParentTabs — 4 tabs: Home, Inbox, Safety, Profile
// Standardized baseline (Home/Inbox/Profile) + role-specific Safety tab.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import ParentDashboard from '@/screens/parent/ParentDashboard';
import InboxScreen from '@/screens/shared/InboxScreen';
import ParentTrustSafetyScreen from '@/screens/parent/ParentTrustSafetyScreen';
import CampsScreen from '@/screens/shared/CampsScreen';
import ProfileScreen from '@/screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function ParentTabs() {
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
      <Tab.Screen name="DashboardTab" component={ParentDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox' }} />
      <Tab.Screen name="CampsTab" component={CampsScreen} options={{ title: 'Camps' }} />
      <Tab.Screen name="TrustSafetyTab" component={ParentTrustSafetyScreen} options={{ title: 'Safety' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
