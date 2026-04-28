// ParentTabs — 2 tabs per Part 2 §2.1: Dashboard, TrustSafety
// Part 33 describes parent experience + COPPA consent flows.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { Home, Shield } from 'lucide-react-native';

import ParentDashboard from '@/screens/parent/ParentDashboard';
import ParentTrustSafetyScreen from '@/screens/parent/ParentTrustSafetyScreen';

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
      <Tab.Screen name="DashboardTab" component={ParentDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="TrustSafetyTab" component={ParentTrustSafetyScreen} options={{ title: 'Safety', tabBarIcon: ({ color, size }) => <Shield size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
