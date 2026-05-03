// In-app message CTA with SMS/email fallback (long-press action sheet) — Build 48 parity.
import React from 'react';
import { Pressable, Text, StyleSheet, ActionSheetIOS, Alert, Platform } from 'react-native';
import * as SMS from 'expo-sms';
import * as MailComposer from 'expo-mail-composer';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { MessageSquare } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

interface Props {
  recipientId: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  label?: string;
  compact?: boolean;
  subject?: string;
  body?: string;
}

async function openSMS(phone: string | undefined, body: string | undefined) {
  try {
    const available = await SMS.isAvailableAsync();
    if (!available) {
      Alert.alert('SMS not available', 'This device cannot send SMS.');
      return;
    }
    await SMS.sendSMSAsync(phone ? [phone] : [], body || '');
  } catch (e: any) {
    Alert.alert('SMS failed', e?.message || 'Please try again.');
  }
}

async function openEmail(email: string | undefined, subject: string | undefined, body: string | undefined) {
  try {
    const available = await MailComposer.isAvailableAsync();
    if (!available) {
      Alert.alert('Email not available', 'No email client is configured on this device.');
      return;
    }
    await MailComposer.composeAsync({
      recipients: email ? [email] : [],
      subject: subject || '',
      body: body || '',
    });
  } catch (e: any) {
    Alert.alert('Email failed', e?.message || 'Please try again.');
  }
}

export function MessageButton({
  recipientId, recipientName, recipientPhone, recipientEmail,
  label = 'Message', compact = false, subject, body,
}: Props) {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const openInApp = () =>
    nav.navigate('Messages' as any, { recipientId, recipientName } as any);

  const showSheet = () => {
    const options = ['In-app message', 'Send SMS', 'Send email', 'Cancel'];
    const cancelIndex = 3;
    const onSelect = (idx: number) => {
      if (idx === 0) openInApp();
      else if (idx === 1) openSMS(recipientPhone, body || `Hi ${recipientName || ''}`);
      else if (idx === 2) openEmail(recipientEmail, subject || 'OfferHound', body || '');
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIndex }, onSelect);
    } else {
      Alert.alert('Send message', undefined, [
        { text: options[0], onPress: () => onSelect(0) },
        { text: options[1], onPress: () => onSelect(1) },
        { text: options[2], onPress: () => onSelect(2) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <Pressable
      style={[s.btn, compact && s.compact]}
      onPress={openInApp}
      onLongPress={showSheet}
      delayLongPress={350}
      accessibilityHint="Long-press for SMS or email options"
    >
      <MessageSquare size={compact ? 14 : 16} color={colors.primaryForeground} />
      {!compact && <Text style={s.text}>{label}</Text>}
    </Pressable>
  );
}

export default MessageButton;

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: 6 },
  text: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primaryForeground },
});
