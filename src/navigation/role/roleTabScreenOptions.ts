// RoleTabScreenOptions — shared screenOptions factory for all role tab navigators.
// Adds:
//   - NotificationBell as headerRight (persistent across all role screens)
//   - Consistent brand header style
// Each tab navigator sets `screenOptions={roleTabScreenOptions()}` and individual
// Screen components can override `options={{ headerShown: false }}` if they have
// their own custom header (e.g. DashboardScreen).
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';
import { NotificationBell } from '@/components/NotificationBell';

export function roleTabHeaderRight() {
  return <NotificationBell />;
}

export const roleTabScreenOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerShadowVisible: false,
  headerTintColor: colors.foreground,
  headerTitleStyle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
    color: colors.foreground,
    letterSpacing: 0.5,
  },
  headerRight: roleTabHeaderRight,
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
} as const;
