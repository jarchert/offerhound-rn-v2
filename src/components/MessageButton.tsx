// MessageButton — Build 51 A6: tabbed modal with In-app / SMS / Email channels.
// Web parity: src/components/MessageButton.tsx (273 LOC).
//
// Translation notes:
//   - shadcn Dialog/Tabs → RN Modal + simple segmented tab bar.
//   - web opens sms:/mailto: links via window.location.href.
//     RN uses expo-sms / expo-mail-composer (the native composers) to keep
//     the Build 48 behavior, with graceful fallback to Linking sms:/mailto:
//     when the composer isn't available.
//   - In-app tab: navigate to the app Messages surface (unchanged).
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as SMS from 'expo-sms';
import * as MailComposer from 'expo-mail-composer';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Phone, Mail, Send, X } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

type Channel = 'app' | 'sms' | 'email';
type TriggerVariant = 'default' | 'outline' | 'ghost';
type TriggerSize = 'default' | 'sm';

interface Props {
  recipientId?: string;
  recipientName?: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  label?: string;
  compact?: boolean;
  subject?: string;
  body?: string;
  /** legacy: some call-sites pass raw id */
  recipientUserId?: string;
  /** Web parity — recipient classification (coach, athlete, etc). */
  recipientType?: string;
  /** Web parity — recipient role used by send-direct-message edge fn. */
  recipientRole?: string;
  /** Web parity — coach_profile id passed to send-direct-message. */
  coachProfileId?: string;
  /** Trigger button styling. */
  variant?: TriggerVariant;
  size?: TriggerSize;
  /** Optional style override for the trigger button. */
  style?: any;
}

export function MessageButton({
  recipientId,
  recipientUserId,
  recipientName,
  recipientPhone,
  recipientEmail,
  label = 'Message',
  compact = false,
  subject,
  body,
  recipientType: _recipientType,
  recipientRole: _recipientRole,
  coachProfileId: _coachProfileId,
  variant = 'default',
  size = 'default',
  style,
}: Props) {
  const nav = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>('app');
  const [message, setMessage] = useState(body || '');
  const [sending, setSending] = useState(false);

  const rid = recipientId || recipientUserId;

  const tabs: { id: Channel; icon: any; label: string }[] = useMemo(
    () => [
      { id: 'app', icon: MessageCircle, label: 'In-app' },
      { id: 'sms', icon: Phone, label: 'SMS' },
      { id: 'email', icon: Mail, label: 'Email' },
    ],
    []
  );

  const send = async () => {
    const text = message.trim();
    if (!text) {
      Alert.alert('Empty message', 'Please enter a message.');
      return;
    }
    try {
      setSending(true);
      if (channel === 'app') {
        setOpen(false);
        nav.navigate('Messages' as any, { recipientId: rid, recipientName } as any);
        return;
      }
      if (channel === 'sms') {
        if (!recipientPhone) {
          Alert.alert('No phone on file', `${recipientName || 'This user'} hasn't shared a phone number.`);
          return;
        }
        const available = await SMS.isAvailableAsync().catch(() => false);
        if (available) {
          await SMS.sendSMSAsync([recipientPhone], text);
        } else {
          await Linking.openURL(`sms:${recipientPhone}?body=${encodeURIComponent(text)}`);
        }
        setOpen(false);
        return;
      }
      if (channel === 'email') {
        if (!recipientEmail) {
          Alert.alert('No email on file', `${recipientName || 'This user'} hasn't shared an email address.`);
          return;
        }
        const available = await MailComposer.isAvailableAsync().catch(() => false);
        if (available) {
          await MailComposer.composeAsync({
            recipients: [recipientEmail],
            subject: subject || 'Message from OfferHound',
            body: text,
          });
        } else {
          await Linking.openURL(
            `mailto:${recipientEmail}?subject=${encodeURIComponent(subject || 'Message from OfferHound')}&body=${encodeURIComponent(text)}`
          );
        }
        setOpen(false);
        return;
      }
    } catch (e: any) {
      Alert.alert('Could not send', e?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const smsDisabled = channel === 'sms' && !recipientPhone;
  const emailDisabled = channel === 'email' && !recipientEmail;

  return (
    <>
      <Pressable
        style={[
          s.btn,
          variant === 'outline' && s.btnOutlineTrigger,
          variant === 'ghost' && s.btnGhostTrigger,
          (size === 'sm' || compact) && s.compact,
          style,
        ]}
        onPress={() => setOpen(true)}
      >
        <MessageCircle
          size={(size === 'sm' || compact) ? 14 : 16}
          color={variant === 'default' ? colors.primaryForeground : colors.foreground}
        />
        {!compact && (
          <Text
            style={[
              s.btnText,
              variant !== 'default' && { color: colors.foreground },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.header}>
              <Text style={s.title}>Message {recipientName || ''}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={s.desc}>Choose how you'd like to reach out.</Text>

            <View style={s.tabs}>
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = channel === t.id;
                return (
                  <Pressable
                    key={t.id}
                    style={[s.tab, active && s.tabActive]}
                    onPress={() => setChannel(t.id)}
                  >
                    <Icon size={14} color={active ? colors.foreground : colors.mutedForeground} />
                    <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.hint}>
              {channel === 'app'
                ? `They'll see your message in their OfferHound inbox.`
                : channel === 'sms'
                  ? recipientPhone
                    ? `Opens your phone's messaging app to text ${recipientPhone}.`
                    : `${recipientName || 'They'} hasn't shared a phone number — SMS isn't available.`
                  : recipientEmail
                    ? `Opens your email client to write ${recipientEmail}.`
                    : `${recipientName || 'They'} hasn't shared an email — Email isn't available.`}
            </Text>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message here…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={s.input}
            />

            <View style={s.actions}>
              <Pressable style={[s.btnOutline]} onPress={() => setOpen(false)}>
                <Text style={s.btnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.btnSend, (sending || !message.trim() || smsDisabled || emailDisabled) && s.btnDisabled]}
                onPress={send}
                disabled={sending || !message.trim() || smsDisabled || emailDisabled}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : channel === 'sms' ? (
                  <><Phone size={14} color={colors.primaryForeground} /><Text style={s.btnText}>Send SMS</Text></>
                ) : channel === 'email' ? (
                  <><Mail size={14} color={colors.primaryForeground} /><Text style={s.btnText}>Send Email</Text></>
                ) : (
                  <><Send size={14} color={colors.primaryForeground} /><Text style={s.btnText}>Send Message</Text></>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default MessageButton;

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  btnOutlineTrigger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnGhostTrigger: { backgroundColor: 'transparent' },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: 6 },
  btnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primaryForeground, marginLeft: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 440, backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground },
  desc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginBottom: spacing.xs },
  tabs: { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: 10, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  tabTextActive: { color: colors.foreground },
  hint: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  input: { minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, textAlignVertical: 'top', backgroundColor: colors.background },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  btnOutline: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  btnOutlineText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.sm },
  btnSend: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  btnDisabled: { opacity: 0.5 },
});
