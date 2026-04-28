// InfluencerTabs — 3 tabs per Part 2 §2.1: Dashboard, Profile, BlogPost
// Part 43 describes AI Coach + influencer content library.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { Home, Grid, Mic } from 'lucide-react-native';

import InfluencerDashboard from '@/screens/influencer/InfluencerDashboard';
import InfluencerBoardScreen from '@/screens/influencer/InfluencerBoardScreen';
import PodcastScreen from '@/screens/influencer/PodcastScreen';

const Tab = createBottomTabNavigator();

export default function InfluencerTabs() {
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
      <Tab.Screen name="DashboardTab" component={InfluencerDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="BoardTab" component={InfluencerBoardScreen} options={{ title: 'Board', tabBarIcon: ({ color, size }) => <Grid size={size} color={color} /> }} />
      <Tab.Screen name="PodcastsTab" component={PodcastScreen} options={{ title: 'Podcasts', tabBarIcon: ({ color, size }) => <Mic size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
