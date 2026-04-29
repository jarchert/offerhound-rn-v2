// ParentTabs — 4 tabs: Dashboard, TrustSafety, Messages, Inbox
// Build 25: added Messages + Inbox so parent-only users (rare path; most parents go
// through AthleteTabs via the parent overlay) can still reach communication surfaces.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { Home, Shield, MessageSquare, Inbox } from 'lucide-react-native';

import ParentDashboard from '@/screens/parent/ParentDashboard';
import ParentTrustSafetyScreen from '@/screens/parent/ParentTrustSafetyScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';

const Tab = createBottomTabNavigator();

export default function ParentTabs() {
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
      <Tab.Screen name="DashboardTab" component={ParentDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
      <Tab.Screen name="TrustSafetyTab" component={ParentTrustSafetyScreen} options={{ title: 'Safety', tabBarIcon: ({ color, size }) => <Shield size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
