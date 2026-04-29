// AthleteTabs — 5 tabs per Part 2 §2.1: Home, Matches, Messages, Letters, Profile
// Part 3 of the conversion guide describes this navigator in detail.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { Home, Trophy, MessageCircle, Mail, User } from 'lucide-react-native';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';

import DashboardScreen from '@/screens/shared/DashboardScreen';
import AthleteMatchesScreen from '@/screens/athlete/AthleteMatchesScreen';
import LettersScreen from '@/screens/athlete/LettersScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import ProfileScreen from '@/screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AthleteTabs() {
  return (
    <Tab.Navigator
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="HomeTab" component={DashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="MatchesTab" component={AthleteMatchesScreen} options={{ title: 'Matches', tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={LettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
