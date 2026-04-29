// AdminTabs — 6 tabs per Part 2 §2.1: Overview, Users, Moderation, Content, Audit, Settings
// Part 32 describes admin suite conversion.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { BarChart2, Users, AlertTriangle, FileText, ClipboardList, Settings, Mail } from 'lucide-react-native';

import AdminDashboard from '@/screens/admin/AdminDashboard';
import AdminUsersScreen from '@/screens/admin/AdminUsersScreen';
import AdminModerationScreen from '@/screens/admin/AdminModerationScreen';
import AdminContentScreen from '@/screens/admin/AdminContentScreen';
import AdminAuditScreen from '@/screens/admin/AdminAuditScreen';
import AdminLetterAnalytics from '@/screens/admin/AdminLetterAnalytics';
import AdminSettingsScreen from '@/screens/admin/AdminSettingsScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="OverviewTab" component={AdminDashboard} options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} /> }} />
      <Tab.Screen name="UsersTab" component={AdminUsersScreen} options={{ title: 'Users', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      <Tab.Screen name="ModerationTab" component={AdminModerationScreen} options={{ title: 'Moderate', tabBarIcon: ({ color, size }) => <AlertTriangle size={size} color={color} /> }} />
      <Tab.Screen name="ContentTab" component={AdminContentScreen} options={{ title: 'Content', tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }} />
      <Tab.Screen name="AuditTab" component={AdminAuditScreen} options={{ title: 'Audit', tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} /> }} />
      <Tab.Screen name="LettersAnalyticsTab" component={AdminLetterAnalytics} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="SettingsTab" component={AdminSettingsScreen} options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
