import {roleShareCard} from '@/lib/roleShareCard';
import {useHSCoachProfile} from '@/hooks/useHSCoachProfile';
import {getCanonicalOrigin} from '@/lib/canonicalDomain';
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

const APP_PUBLIC_URL = getCanonicalOrigin();

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
  const {data:hsProfile}=useHSCoachProfile();
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

  const {data:clubProfile,isError:clubFailed,refetch:reloadClub}=useQuery({queryKey:['club-profile-share',user?.id],enabled:!!user&&role==='club_coach',queryFn:async()=>{const r=await supabase.from('club_coach_profiles').select('id,club_name').eq('user_id',user!.id).maybeSingle();if(r.error)throw r.error;return r.data;}});
  const card=useMemo(()=>roleShareCard(role,{coach:coachProfile,hs:hsProfile,club:clubFailed?null:clubProfile,scout:scoutProfile,player:playerProfile,influencer:influencerProfile},user,APP_PUBLIC_URL),[role,coachProfile,hsProfile,clubProfile,clubFailed,scoutProfile,playerProfile,influencerProfile,user]);

  const titleMap: Record<ShareRole, string> = {
    athlete: 'Share Athlete Card',
    coach: 'Share Coach Card',
    club_coach: 'Share Club Coach Card',
    hs_coach: 'Share HS Coach Card',
    scout: 'Share Scout Card',
    influencer: 'Share Creator Card',
  };

  const onShare = async () => {
    if(!card.link)return;
    try {
      await Share.share({
        message: `Connect with ${card.name} on OfferHound: ${card.link}`,
        url: card.link,
        title: `${card.name} on OfferHound`,
      });
    } catch { /* user cancelled */ }
  };

  const onCopy = async () => {
    if(!card.link)return;
    await Clipboard.setStringAsync(card.link);
    toast({ title: 'Link copied to clipboard!' });
  };

  return (
    <>
      {/* Uncontrolled: render the child as the trigger */}
      {!isControlled && children ? (
        React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<any>,{onPress:handleOpen}) : <Pressable onPress={handleOpen} accessibilityRole="button">{children}</Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable accessible={false} style={styles.backdrop} onPress={handleClose}>
        <Pressable accessible={false} style={styles.sheet} onPress={event=>event.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{titleMap[role]}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close share card" onPress={handleClose} hitSlop={8}><X size={20} color={colors.mutedForeground} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {role==='club_coach'&&clubFailed?<View><Text style={{color:colors.foreground}}>Could not load the club card.</Text><Pressable accessibilityRole="button" onPress={()=>reloadClub()}><Text style={{color:colors.primary}}>Retry club card</Text></Pressable></View>:null}
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

            {!card.link&&<Text accessibilityRole="alert" style={{color:colors.mutedForeground}}>Complete your profile before sharing a personal link.</Text>}
            {/* Actions */}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Share profile card" accessibilityState={{disabled:!card.link}} disabled={!card.link} style={styles.actionBtn} onPress={onShare}>
                <Share2 size={18} color={colors.primaryForeground} />
                <Text style={styles.actionBtnText}>Share</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Copy profile link" accessibilityState={{disabled:!card.link}} disabled={!card.link} style={[styles.actionBtn, styles.outlineBtn]} onPress={onCopy}>
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
