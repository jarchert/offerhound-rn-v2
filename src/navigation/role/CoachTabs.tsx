// CoachTabs — 6 tabs per Part 2 §2.1: Dashboard, Pipeline, Camps, Letters, Directory, Campaigns
// Bug 9 fix: Campaigns tab surfaces roster-gap campaign management for college coaches.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import CoachDashboard from '@/screens/coach/CoachDashboard';
import CoachRosterScreen from '@/screens/coach/CoachRosterScreen';
import CampsScreen from '@/screens/shared/CampsScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';
// Build 55 item 7: Coach "Directory" tab was pointing at the athlete search
// screen (CoachSearchAthletesScreen), which is the wrong surface — that's
// Pipeline's companion view. The Directory tab should open the Coach
// Directory (discover / saved coach contacts), matching the Lovable web nav.
import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';
import CoachCampaignsScreen from '@/screens/coach/CoachCampaignsScreen';

const Tab = createBottomTabNavigator();

export default function CoachTabs() {
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
      <Tab.Screen name="DashboardTab" component={CoachDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="PipelineTab" component={CoachRosterScreen} options={{ title: 'Pipeline' }} />
      <Tab.Screen name="CampsTab" component={CampsScreen} options={{ title: 'Camps' }} />
      <Tab.Screen name="LettersTab" component={LetterComposerScreen} options={{ title: 'Letters' }} />
      <Tab.Screen name="DirectoryTab" component={CoachDirectoryScreen} options={{ title: 'Directory' }} />
      <Tab.Screen name="CampaignsTab" component={CoachCampaignsScreen} options={{ title: 'Campaigns' }} />
    </Tab.Navigator>
  );
}
