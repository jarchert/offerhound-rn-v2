// AdminTabs — 9 tabs after Wave 1 wiring.
// Overview (Stats+Sessions sub-tabs), Users, Moderate (Reports+Camps sub-tabs),
// Content (+InvitationCards), Audit, Letters, Social (Testimonials), Beta, Settings
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, typography } from '@/lib/theme';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import {
  BarChart2, Users, AlertTriangle, FileText, ClipboardList,
  Settings, Mail, Star, TestTube2,
} from 'lucide-react-native';

import AdminDashboard from '@/screens/admin/AdminDashboard';
import AdminUsersScreen from '@/screens/admin/AdminUsersScreen';
import AdminModerationScreen from '@/screens/admin/AdminModerationScreen';
import AdminContentScreen from '@/screens/admin/AdminContentScreen';
import AdminAuditScreen from '@/screens/admin/AdminAuditScreen';
import AdminLetterAnalytics from '@/screens/admin/AdminLetterAnalytics';
import AdminSocialScreen from '@/screens/admin/AdminSocialScreen';
import AdminBetaScreen from '@/screens/admin/AdminBetaScreen';
import AdminSettingsScreen from '@/screens/admin/AdminSettingsScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={roleTabScreenOptions}>
      <Tab.Screen
        name="OverviewTab"
        component={AdminDashboard}
        options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} /> }}
      />
      <Tab.Screen
        name="UsersTab"
        component={AdminUsersScreen}
        options={{ title: 'Users', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }}
      />
      <Tab.Screen
        name="ModerationTab"
        component={AdminModerationScreen}
        options={{ title: 'Moderate', tabBarIcon: ({ color, size }) => <AlertTriangle size={size} color={color} /> }}
      />
      <Tab.Screen
        name="ContentTab"
        component={AdminContentScreen}
        options={{ title: 'Content', tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }}
      />
      <Tab.Screen
        name="AuditTab"
        component={AdminAuditScreen}
        options={{ title: 'Audit', tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} /> }}
      />
      <Tab.Screen
        name="LettersAnalyticsTab"
        component={AdminLetterAnalytics}
        options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }}
      />
      <Tab.Screen
        name="SocialTab"
        component={AdminSocialScreen}
        options={{ title: 'Social', tabBarIcon: ({ color, size }) => <Star size={size} color={color} /> }}
      />
      <Tab.Screen
        name="BetaTab"
        component={AdminBetaScreen}
        options={{ title: 'Beta', tabBarIcon: ({ color, size }) => <TestTube2 size={size} color={color} /> }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={AdminSettingsScreen}
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
