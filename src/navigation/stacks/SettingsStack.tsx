// SettingsStack — Account, Notifications, Following, Cookies per Part 2 §2.1
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import SettingsScreen from '@/screens/shared/SettingsScreen';
import NotificationsScreen from '@/screens/shared/NotificationsScreen';
import DeleteAccountScreen from '@/screens/shared/DeleteAccountScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const FollowingSettingsScreen = makePlaceholder('Following Settings', 'Arrives in Session 8', 'Manage followed athletes, coaches, and camps.');
const CookieSettingsScreen = makePlaceholder('Privacy Settings', 'Arrives in Session 9', 'ATT + analytics opt-in preferences.');

export type SettingsStackParamList = {
  Settings: undefined;
  NotificationSettings: undefined;
  FollowingSettings: undefined;
  CookieSettings: undefined;
  DeleteAccount: undefined;
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
      <Stack.Screen name="NotificationSettings" component={NotificationsScreen} />
      <Stack.Screen name="FollowingSettings" component={FollowingSettingsScreen} />
      <Stack.Screen name="CookieSettings" component={CookieSettingsScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </Stack.Navigator>
  );
}
