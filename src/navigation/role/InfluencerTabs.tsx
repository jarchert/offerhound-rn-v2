// InfluencerTabs — 4 tabs: Dashboard, Board, Podcasts, Messages
// Build 25: added Messages so influencers can read DMs.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { Home, Grid, Mic, MessageSquare } from 'lucide-react-native';

import InfluencerDashboard from '@/screens/influencer/InfluencerDashboard';
import InfluencerBoardScreen from '@/screens/influencer/InfluencerBoardScreen';
import PodcastScreen from '@/screens/influencer/PodcastScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';

const Tab = createBottomTabNavigator();

export default function InfluencerTabs() {
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
      <Tab.Screen name="DashboardTab" component={InfluencerDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="BoardTab" component={InfluencerBoardScreen} options={{ title: 'Board', tabBarIcon: ({ color, size }) => <Grid size={size} color={color} /> }} />
      <Tab.Screen name="PodcastsTab" component={PodcastScreen} options={{ title: 'Podcasts', tabBarIcon: ({ color, size }) => <Mic size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
