// AdminTabs — 6 tabs per Part 2 §2.1: Overview, Users, Moderation, Content, Audit, Settings
// Part 32 describes admin suite conversion.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import AdminDashboard from '@/screens/admin/AdminDashboard';
import AdminUsersScreen from '@/screens/admin/AdminUsersScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const AdminModerationScreen = makePlaceholder('Moderation', 'Arrives in Session 8', 'Camp moderation + community guidelines.');
const AdminContentScreen = makePlaceholder('Content', 'Arrives in Session 8', 'Media center + influencers + podcasts + letter analytics.');
const AdminAuditScreen = makePlaceholder('Audit Log', 'Arrives in Session 8', 'Full audit trail viewer.');
const AdminSettingsScreen = makePlaceholder('Admin Settings', 'Arrives in Session 8', 'Terms management + legal center.');

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
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
      <Tab.Screen name="OverviewTab" component={AdminDashboard} options={{ title: 'Overview' }} />
      <Tab.Screen name="UsersTab" component={AdminUsersScreen} options={{ title: 'Users' }} />
      <Tab.Screen name="ModerationTab" component={AdminModerationScreen} options={{ title: 'Moderate' }} />
      <Tab.Screen name="ContentTab" component={AdminContentScreen} options={{ title: 'Content' }} />
      <Tab.Screen name="AuditTab" component={AdminAuditScreen} options={{ title: 'Audit' }} />
      <Tab.Screen name="SettingsTab" component={AdminSettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
