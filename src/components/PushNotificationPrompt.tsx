// Push notification prompt — asks permission on first use (iOS + Android).
// Required for the FCM/APNs integration (App Store + Play Store).
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@/lib/theme';

const PROMPT_KEY = 'push_prompt_shown';

export function PushNotificationPrompt() {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PROMPT_KEY).then(v => setShown(v === 'true'));
  }, []);

  if (shown) return null;

  const handleEnable = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(PROMPT_KEY, 'true');
    setShown(true);
    if (status !== 'granted') {
      Alert.alert('Notifications disabled', 'You can enable them later in device settings.');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(PROMPT_KEY, 'true');
    setShown(true);
  };

  return (
    <View style={s.card}>
      <Bell size={20} color={colors.primary} />
      <View style={s.text}>
        <Text style={s.title}>Get notified about new matches</Text>
        <Text style={s.body}>Turn on notifications to hear about new coach matches, messages, and camps.</Text>
      </View>
      <View style={s.actions}>
        <Pressable style={s.skip} onPress={handleSkip}><Text style={s.skipText}>Not now</Text></Pressable>
        <Pressable style={s.enable} onPress={handleEnable}><Text style={s.enableText}>Enable</Text></Pressable>
      </View>
    </View>
  );
}

export default PushNotificationPrompt;

const s = StyleSheet.create({
  card: { padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, gap: spacing.sm },
  text: { gap: 2 },
  title: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  skip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  skipText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  enable: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  enableText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primaryForeground },
});
