// AdminTabs — 6 tabs per Part 2 §2.1: Overview, Users, Moderation, Content, Audit, Settings
// Part 32 describes admin suite conversion.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';

import AdminDashboard from '@/screens/admin/AdminDashboard';
import AdminUsersScreen from '@/screens/admin/AdminUsersScreen';
import AdminModerationScreen from '@/screens/admin/AdminModerationScreen';
import AdminContentScreen from '@/screens/admin/AdminContentScreen';
import AdminAuditScreen from '@/screens/admin/AdminAuditScreen';
import AdminSettingsScreen from '@/screens/admin/AdminSettingsScreen';

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
