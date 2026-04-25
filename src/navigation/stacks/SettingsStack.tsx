// SettingsStack — Account, Notifications, Following, Cookies per Part 2 §2.1
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import SettingsScreen from '@/screens/shared/SettingsScreen';
import DeleteAccountScreen from '@/screens/shared/DeleteAccountScreen';
import PrivacySettingsScreen from '@/screens/shared/PrivacySettingsScreen';
import AccountSettingsScreen from '@/screens/settings/AccountSettingsScreen';
import NotificationSettingsScreen from '@/screens/settings/NotificationSettingsScreen';
import OrganizationSettingsScreen from '@/screens/settings/OrganizationSettingsScreen';
import LegalStack from '@/navigation/stacks/LegalStack';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

// PORT-PENDING: Lovable source at offerhound-repo/src/pages/FollowingSettings.tsx (112 LOC) — schedule in next wave
const FollowingSettingsScreen = makePlaceholder('Following Settings', 'Arrives in Session 8', 'Manage followed athletes, coaches, and camps.');

export type SettingsStackParamList = {
  Settings: undefined;
  AccountSettings: undefined;
  NotificationSettings: undefined;
  FollowingSettings: undefined;
  OrganizationSettings: undefined;
  CookieSettings: undefined;
  DeleteAccount: undefined;
  LegalStack: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="FollowingSettings" component={FollowingSettingsScreen} />
      <Stack.Screen name="OrganizationSettings" component={OrganizationSettingsScreen} />
      <Stack.Screen name="CookieSettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="LegalStack" component={LegalStack} />
    </Stack.Navigator>
  );
}
