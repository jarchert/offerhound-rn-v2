// ClubCoachTabs — 5 tabs: Dashboard, Camps, Letters, Messages, Inbox
// Build 25: was 3 tabs; CampsTab now uses CoachCampsScreen (role-correct).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { LayoutDashboard, Tent, Mail, MessageSquare, Inbox } from 'lucide-react-native';

import ClubCoachDashboardScreen from '@/screens/club/ClubCoachDashboardScreen';
import ClubCoachLettersScreen from '@/screens/club/ClubCoachLettersScreen';
import CoachCampsScreen from '@/screens/coach/CoachCampsScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';

const Tab = createBottomTabNavigator();

export default function ClubCoachTabs() {
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
      <Tab.Screen name="DashboardTab" component={ClubCoachDashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="CampsTab" component={CoachCampsScreen} options={{ title: 'Camps', tabBarIcon: ({ color, size }) => <Tent size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={ClubCoachLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
