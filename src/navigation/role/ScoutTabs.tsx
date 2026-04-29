// ScoutTabs — 5 tabs: Dashboard, AthleteSearch, Letters, Messages, Inbox
// Build 25: dropped TrendsTab + OnboardingTab (onboarding now lives in OnboardingStack);
//   added athlete search + messaging surfaces.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { LayoutDashboard, Search, Mail, MessageSquare, Inbox } from 'lucide-react-native';

import ScoutDashboard from '@/screens/scout/ScoutDashboard';
import ScoutLettersScreen from '@/screens/scout/ScoutLettersScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';

const Tab = createBottomTabNavigator();

export default function ScoutTabs() {
  return (
    <Tab.Navigator
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="DashboardTab" component={ScoutDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="SearchTab" component={AthleteSearchScreen} options={{ title: 'Athletes', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={ScoutLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
