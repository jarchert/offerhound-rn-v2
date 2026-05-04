// Athlete dashboard "Invite Friends" card.
// Build 53 parity port of web src/components/ReferralCard.tsx.
//
// Changes vs Build 52:
//   - Canonical referral URL is now `https://offer-hound.com/?ref=athlete` and
//     is built via `buildCanonicalUrl('/?ref=athlete')` so preview origins
//     (lovable.app, vercel.app, localhost, Expo dev URLs) can never leak.
//     We never call Linking.getInitialURL() or use a runtime origin.
//   - The "Share with Teammates" button no longer opens the native share
//     sheet. It opens a custom modal styled like the coach card message
//     modal (Dialog + tabs) with Email and SMS tabs only — no In-app tab.
//     Each tab has a pre-filled 2-line message, a recipient field, and a
//     primary button that toggles between "Open in Email" and
//     "Open in Messages".
//
// Send behavior (matches web's Linking.openURL semantics):
//   - Email: mailto:{recipient}?subject={subject}&body={message}
//   - SMS:   sms:{recipient}{sep}body={message}
//            sep = "&" on iOS/macOS, "?" everywhere else.
//   - Empty message → destructive toast "Empty message" and abort.
//   - Success closes the modal.

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ViewStyle,
  Platform,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Gift, Copy, Share2, Mail, Phone, X } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/toast';
import { buildCanonicalUrl } from '@/lib/canonicalDomain';
import { colors, typography, spacing, radius } from '@/lib/theme';

type Channel = 'email' | 'sms';

// Exact two-line body used by web's Share with Teammates modal.
const DEFAULT_MESSAGE =
  'Try OfferHound and get recruited\n' +
  'offer-hound.com or visit the app store and search for OfferHound.';

const DEFAULT_SUBJECT = 'Try OfferHound and get recruited';

export function ReferralCard() {
  // Canonical athlete referral link. Never derived from a runtime origin.
  const referralLink = buildCanonicalUrl('/?ref=athlete');

  const [modalOpen, setModalOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      toast.success('Referral link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const openShareModal = () => {
    // Reset to defaults on each open so the body always shows the
    // canonical 2-line copy.
    setChannel('email');
    setRecipientEmail('');
    setRecipientPhone('');
    setSubject(DEFAULT_SUBJECT);
    setMessage(DEFAULT_MESSAGE);
    setModalOpen(true);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Empty message', 'Please enter a message');
      return;
    }

    try {
      if (channel === 'email') {
        const url =
          `mailto:${encodeURIComponent(recipientEmail)}` +
          `?subject=${encodeURIComponent(subject)}` +
          `&body=${encodeURIComponent(trimmed)}`;
        await Linking.openURL(url);
      } else {
        // Web parity: iOS/macOS require "&body=", everywhere else "?body=".
        const isApple = Platform.OS === 'ios' || Platform.OS === 'macos';
        const sep = isApple ? '&' : '?';
        const url =
          `sms:${encodeURIComponent(recipientPhone)}` +
          `${sep}body=${encodeURIComponent(trimmed)}`;
        await Linking.openURL(url);
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error('Could not open', e?.message || 'Please try again.');
    }
  };

  const primaryLabel =
    channel === 'email' ? 'Open in Email' : 'Open in Messages';

  return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <Gift size={20} color={colors.primary} />
          <CardTitle style={s.titleText}>Invite Friends</CardTitle>
        </View>
      </CardHeader>
      <CardContent style={s.contentSpacing}>
        <Text style={s.bodyText}>
          Share OfferHound™ with teammates and friends. Help them get recruited!
        </Text>

        <View style={s.linkRow}>
          <View style={s.inputWrap}>
            <Input
              value={referralLink}
              editable={false}
              selectTextOnFocus
              style={s.inputMono}
            />
          </View>
          <Pressable
            onPress={handleCopy}
            style={s.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Copy referral link"
          >
            <Copy size={16} color={colors.foreground} />
          </Pressable>
        </View>

        <Pressable
          onPress={openShareModal}
          style={s.primaryButton}
          accessibilityRole="button"
          accessibilityLabel="Share with Teammates"
        >
          <Share2 size={16} color={colors.primaryForeground} />
          <Text style={s.primaryButtonText}>Share with Teammates</Text>
        </Pressable>
      </CardContent>

      {/* Share with Teammates modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={s.sheet} onPress={(e: any) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Share with Teammates</Text>
                <Text style={s.modalDesc}>
                  Invite teammates by email or text message.
                </Text>
              </View>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Tabs — Email / SMS only */}
            <View style={s.tabs}>
              <Pressable
                style={[s.tab, channel === 'email' && s.tabActive]}
                onPress={() => setChannel('email')}
                accessibilityRole="tab"
                accessibilityState={{ selected: channel === 'email' }}
              >
                <Mail
                  size={14}
                  color={channel === 'email' ? colors.foreground : colors.mutedForeground}
                />
                <Text
                  style={[s.tabText, channel === 'email' && s.tabTextActive]}
                >
                  Email
                </Text>
              </Pressable>
              <Pressable
                style={[s.tab, channel === 'sms' && s.tabActive]}
                onPress={() => setChannel('sms')}
                accessibilityRole="tab"
                accessibilityState={{ selected: channel === 'sms' }}
              >
                <Phone
                  size={14}
                  color={channel === 'sms' ? colors.foreground : colors.mutedForeground}
                />
                <Text style={[s.tabText, channel === 'sms' && s.tabTextActive]}>
                  SMS
                </Text>
              </Pressable>
            </View>

            {channel === 'email' ? (
              <View style={s.fields}>
                <Input
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  placeholder="teammate@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Input
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Subject"
                />
              </View>
            ) : (
              <View style={s.fields}>
                <Input
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {/* Shared pre-populated message. 5 rows, resize disabled. */}
            <Textarea
              value={message}
              onChangeText={setMessage}
              rows={5}
              style={s.messageBox}
              placeholder="Your message"
            />

            <View style={s.actions}>
              <Pressable style={s.btnOutline} onPress={() => setModalOpen(false)}>
                <Text style={s.btnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.btnSend} onPress={handleSend}>
                {channel === 'email' ? (
                  <Mail size={14} color={colors.primaryForeground} />
                ) : (
                  <Phone size={14} color={colors.primaryForeground} />
                )}
                <Text style={s.btnSendText}>{primaryLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

export default ReferralCard;

const s = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  titleText: {
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    flexShrink: 1,
  },
  contentSpacing: { gap: spacing.md } as ViewStyle,
  bodyText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  inputWrap: { flex: 1 } as ViewStyle,
  inputMono: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: typography.fontSize.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  } as ViewStyle,
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  } as ViewStyle,
  primaryButtonText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  } as ViewStyle,
  sheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  modalTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  modalDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: 4,
  } as ViewStyle,
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.sm,
  } as ViewStyle,
  tabActive: { backgroundColor: colors.card } as ViewStyle,
  tabText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
  tabTextActive: { color: colors.foreground },
  fields: { gap: spacing.sm } as ViewStyle,
  messageBox: {
    minHeight: 120,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  } as ViewStyle,
  btnOutline: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  btnOutlineText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  btnSend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  } as ViewStyle,
  btnSendText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },
});
