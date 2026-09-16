// ShareRoleCardDialog — RN port of Lovable ShareRoleCardDialog.tsx + RoleCardGenerator.tsx
//
// Bug fix (parity with cd10343 SharePlayerCardDialog Bug 3): the modal sheet
// caps at maxHeight: '85%' and contains a header + a single <ScrollView> for
// card+actions. On short devices with bottom safe-area insets (iPhone home
// indicator, Android nav bar) the Share/Copy action buttons sat flush against
// the sheet's bottom edge, which on real hardware landed behind the system
// bar, making them tap-unreachable and creating the reported "cut off at
// bottom, no scroll" symptom. The fix: give the ScrollView contentContainer
// flexGrow:1 (so it always claims the sheet's usable height even when content
// is short) plus a generous paddingBottom that clears typical device safe-area
// insets, mirroring the discipline applied to SharePlayerCardDialog.
//
// Perf fix (Sep 2026, follow-up to 383e098 T2.C — which was investigate-only):
// per explicit build-cycle instruction, apply the same lazy-mount discipline
// used for SharePlayerCardDialog's heavy ProfileCardGenerator (T2.A) and the
// Dialog radar-chart deferral. The outer <ShareRoleCardDialog> keeps all four
// role-gated useQuery declarations at the top level (this preserves the
// hook-order contract and the role-gated-queries test), but the heavy card
// composition (useMemo over profile → card view, QRCode SVG, action row JSX)
// now lives inside <ShareRoleCardDialogContent>, a child component that is
// only mounted when `open === true`. That way, every dashboard re-render
// (Agency / ClubCoach / HSCoach) touches only the tiny outer shell — the
// useMemo body and QRCode element creation are not paid until the sheet
// actually opens.
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

  // Perf fix (Sep 2026): the previous implementation unconditionally called
  // useCoachProfile() + useScoutProfile() + usePlayerProfile() at the top of
  // this component. Because ShareRoleCardDialog is rendered eagerly in the
  // Scout/ClubCoach/HSCoach dashboards, every dashboard mount fired 3 concurrent
  // Supabase RTTs, 2 of which always returned null for a given user. Now we
  // gate each query on the actual role prop so only the relevant one runs.
  // Query keys match the shared hooks so react-query cache stays consistent
  // if the user later navigates to a screen that uses those hooks directly.
  const isCoachRole = role === 'coach' || role === 'club_coach' || role === 'hs_coach';
  const isScoutRole = role === 'scout';
  const isAthleteRole = role === 'athlete';
  const isInfluencerRole = role === 'influencer';

  const { data: coachProfile } = useQuery({
    queryKey: ['coach-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isCoachRole,
  });

  const { data: scoutProfile } = useQuery({
    queryKey: ['scout-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from('scout_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user && isScoutRole,
  });

  const { data: playerProfile } = useQuery({
    queryKey: ['player-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAthleteRole,
  });

  const { data: influencerProfile } = useQuery({
    queryKey: ['influencer-profile-share', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any).from('influencer_profiles').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user && isInfluencerRole,
  });

  return (
    <>
      {/* Uncontrolled: render the child as the trigger */}
      {!isControlled && children ? (
        <Pressable onPress={handleOpen} accessibilityRole="button">
          {children}
        </Pressable>
      ) : null}

      {/*
        Lazy-mount the heavy modal content (useMemo card composition, QRCode
        SVG, action row JSX). When open === false the entire Modal element is
        omitted from the React tree — dashboard re-renders don't pay for
        creating those elements. When open flips to true, the content mounts
        fresh; when it flips back to false, React unmounts and drops its state.
        This matches the T2.A pattern already used for SharePlayerCardDialog.
      */}
      {open ? (
        <ShareRoleCardDialogContent
          role={role}
          onClose={handleClose}
          user={user}
          toast={toast}
          coachProfile={coachProfile}
          scoutProfile={scoutProfile}
          playerProfile={playerProfile}
          influencerProfile={influencerProfile}
        />
      ) : null}
    </>
  );
}

// ── Heavy inner content — only mounted while the sheet is open ─────────────
// Split out from ShareRoleCardDialog so dashboard re-renders don't pay for
// the useMemo card composition + QRCode element creation when the sheet is
// closed. The outer component still declares the four useQuery hooks so
// the query registration + role-gated cache warming behavior is unchanged
// (see ShareRoleCardDialogRoleGatedQueries.test.tsx contract).
interface ShareRoleCardDialogContentProps {
  role: ShareRole;
  onClose: () => void;
  user: { id?: string; email?: string | null } | null | undefined;
  toast: (opts: { title: string }) => void;
  coachProfile: any;
  scoutProfile: any;
  playerProfile: any;
  influencerProfile: any;
}

function ShareRoleCardDialogContent({
  role,
  onClose,
  user,
  toast,
  coachProfile,
  scoutProfile,
  playerProfile,
  influencerProfile,
}: ShareRoleCardDialogContentProps) {
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
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{titleMap[role]}</Text>
            <Pressable onPress={onClose} hitSlop={8}><X size={20} color={colors.mutedForeground} /></Pressable>
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
    // Bug fix (parity with SharePlayerCardDialog cd10343): flexGrow:1 makes the
    // ScrollView's content column claim the full available height inside the
    // maxHeight-capped sheet, and paddingBottom clears bottom safe-area insets
    // so the Share/Copy action buttons remain reachable on every device.
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
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
