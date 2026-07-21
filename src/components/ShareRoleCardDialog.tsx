// ShareRoleCardDialog — RN port of Lovable ShareRoleCardDialog.tsx + RoleCardGenerator.tsx
// Renders a modal bottom sheet with role-specific contact card + QR code + native share.
// Roles: athlete | coach | club_coach | hs_coach | scout | influencer
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Share,
  ScrollView,
} from 'react-native';
import { Share2, X, Mail, Phone, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { useToast } from '@/hooks/use-toast';

export type ShareRole = 'athlete' | 'coach' | 'club_coach' | 'hs_coach' | 'scout' | 'influencer';

interface ShareRoleCardDialogProps {
  role: ShareRole;
  /**
   * Controlled mode: parent owns `visible` + `onClose`.
   * Uncontrolled mode: omit both and wrap a trigger element in `children`;
   * tapping the child opens the sheet, internal state manages close.
   */
  visible?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

const APP_PUBLIC_URL = 'https://offer-hound.com';

export function ShareRoleCardDialog({ role, visible, onClose, children }: ShareRoleCardDialogProps) {
  const isControlled = typeof visible === 'boolean';
  const [internalVisible, setInternalVisible] = React.useState(false);
  const open = isControlled ? !!visible : internalVisible;
  const handleClose = () => {
    if (isControlled) onClose?.();
    else setInternalVisible(false);
  };
  const handleOpen = () => {
    if (!isControlled) setInternalVisible(true);
  };
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { profile: playerProfile } = usePlayerProfile();

  const { data: influencerProfile } = useQuery({
    queryKey: ['influencer-profile-share', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any).from('influencer_profiles').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user && role === 'influencer',
  });

  const card = useMemo(() => {
    const coach = coachProfile as any;
    const scout = scoutProfile as any;
    const player = playerProfile as any;
    const inf = influencerProfile as any;

    switch (role) {
      case 'athlete':
        return {
          name: player?.full_name || 'Athlete',
          title: [player?.sport, player?.position].filter(Boolean).join(' · ') || 'Athlete',
          organization: player?.high_school_name || player?.college_name || '',
          email: user?.email || '',
          link: player?.custom_url
            ? `${APP_PUBLIC_URL}/athlete/${player.custom_url}`
            : `${APP_PUBLIC_URL}/p/${user?.id}`,
        };
      case 'coach':
        return {
          name: coach?.name || 'Coach',
          title: [coach?.position_coached, coach?.division].filter(Boolean).join(' · ') || 'Coach',
          organization: coach?.school || '',
          email: coach?.email || user?.email || '',
          link: `${APP_PUBLIC_URL}/coaches`,
        };
      case 'club_coach':
        return {
          name: coach?.name || 'Club Coach',
          title: coach?.position_coached || 'Club Coach',
          organization: coach?.school || '',
          email: coach?.email || user?.email || '',
          link: `${APP_PUBLIC_URL}/coaches`,
        };
      case 'hs_coach':
        return {
          name: coach?.name || 'HS Coach',
          title: 'High School Coach',
          organization: coach?.school || '',
          email: coach?.email || user?.email || '',
          link: `${APP_PUBLIC_URL}/coaches`,
        };
      case 'scout':
        return {
          name: scout?.name || 'Scout',
          title: [scout?.title, scout?.company].filter(Boolean).join(' · ') || 'Scout',
          organization: scout?.company || '',
          email: scout?.email || user?.email || '',
          link: `${APP_PUBLIC_URL}/scouts`,
        };
      case 'influencer':
        return {
          name: inf?.display_name || 'Creator',
          title: 'Sports Media Creator',
          organization: '',
          email: user?.email || '',
          link: inf?.handle ? `${APP_PUBLIC_URL}/influencers/${inf.handle}` : `${APP_PUBLIC_URL}/influencers`,
        };
      default:
        return { name: '', title: '', organization: '', email: '', link: APP_PUBLIC_URL };
    }
  }, [role, coachProfile, scoutProfile, playerProfile, influencerProfile, user]);

  const titleMap: Record<ShareRole, string> = {
    athlete: 'Share Athlete Card',
    coach: 'Share Coach Card',
    club_coach: 'Share Club Coach Card',
    hs_coach: 'Share HS Coach Card',
    scout: 'Share Scout Card',
    influencer: 'Share Creator Card',
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Connect with ${card.name} on OfferHound: ${card.link}`,
        url: card.link,
        title: `${card.name} on OfferHound`,
      });
    } catch { /* user cancelled */ }
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(card.link);
    toast({ title: 'Link copied to clipboard!' });
  };

  return (
    <>
      {/* Uncontrolled: render the child as the trigger */}
      {!isControlled && children ? (
        <Pressable onPress={handleOpen} accessibilityRole="button">
          {children}
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{titleMap[role]}</Text>
            <Pressable onPress={handleClose} hitSlop={8}><X size={20} color={colors.mutedForeground} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Card */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(card.name || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  {!!card.organization && <Text style={styles.cardOrg}>{card.organization}</Text>}
                </View>
              </View>

              {!!card.email && (
                <View style={styles.contactRow}>
                  <Mail size={14} color={colors.primary} />
                  <Text style={styles.contactText}>{card.email}</Text>
                </View>
              )}

              {/* QR Code */}
              {!!card.link && (
                <View style={styles.qrWrap}>
                  <QRCode value={card.link} size={120} color={colors.foreground} backgroundColor={colors.card} />
                  <Text style={styles.qrLabel}>{card.link}</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={onShare}>
                <Share2 size={18} color={colors.primaryForeground} />
                <Text style={styles.actionBtnText}>Share</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.outlineBtn]} onPress={onCopy}>
                <Copy size={18} color={colors.foreground} />
                <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Copy Link</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 24,
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  cardOrg: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    flex: 1,
  },
  qrWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  qrLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.primaryForeground,
  },
});
