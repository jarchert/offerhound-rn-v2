// ShareRoleCardDialog — exact design match to user-provided coach card screenshot.
// Roles: coach, club_coach, scout, hs_coach. Navy gradient + bokeh, orange-ringed avatar,
// verified check badge, COACH pill, contact rows, meta grid, bio, QR + OFFERHOUND brand.
import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView, Modal, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import {
  X, Image as ImageIcon, Smartphone, QrCode,
  Phone, Mail, Check,
} from 'lucide-react-native';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardShareActions } from '@/components/CardShareActions';
import { colors, typography, spacing, radius } from '@/lib/theme';

type Role = 'coach' | 'club_coach' | 'scout' | 'hs_coach';
type FormatTab = 'post' | 'story' | 'qr';

const BASE_URL = 'https://offer-hound.com';
const ORANGE = '#f97316';
const VERIFIED_GREEN = '#10b981';

const ROLE_TITLES: Record<Role, string> = {
  coach: 'SHARE COACH CARD',
  club_coach: 'SHARE CLUB COACH CARD',
  scout: 'SHARE SCOUT CARD',
  hs_coach: 'SHARE HS COACH CARD',
};
const ROLE_SUBS: Record<Role, string> = {
  coach: 'Choose a format and share your coach card with your info and QR code.',
  club_coach: 'Choose a format and share your club coach card with your info and QR code.',
  scout: 'Choose a format and share your scout card with your info and QR code.',
  hs_coach: 'Choose a format and share your HS coach card with your info and QR code.',
};
const ROLE_PILL: Record<Role, string> = {
  coach: 'COACH', club_coach: 'CLUB COACH', scout: 'SCOUT', hs_coach: 'HS COACH',
};

interface Props {
  children?: React.ReactNode;
  role: Role;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function ShareRoleCardDialog({ children, role, open: controlled, onOpenChange, hideTrigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [tab, setTab] = useState<FormatTab>('post');
  const captureRef = useRef<View>(null);

  const { user } = useAuth();
  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: orgData } = useScoutOrganization();
  const { data: hsProfile } = useHSCoachProfile();
  const { data: clubProfile } = useQuery({
    queryKey: ['club-coach-profile-card', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('club_coach_profiles').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user && role === 'club_coach',
  });

  const data = buildData(role, coachProfile, scoutProfile, hsProfile, clubProfile, orgData);
  const trigger = !hideTrigger && children ? (
    <Pressable onPress={() => setOpen(true)}>{children}</Pressable>
  ) : null;

  return (
    <>
      {trigger}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <HeaderRow role={role} onClose={() => setOpen(false)} />
            {!data ? (
              <Text style={s.emptyText}>Complete your {ROLE_PILL[role]} profile to generate a share card.</Text>
            ) : (
              <Body data={data} role={role} tab={tab} setTab={setTab} captureRef={captureRef} scoutProfile={scoutProfile} />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Data builder ─────────────────────────────────────────────────
interface CardData {
  name: string; title: string; subtitle: string; organization: string;
  email: string; phone: string; twitter: string; imageUrl: string;
  isVerified: boolean; sport: string; division: string; conference: string;
  position: string; bio: string;
}

function buildData(role: Role, coach: any, scout: any, hs: any, club: any, org: any): CardData | null {
  if (role === 'hs_coach' && hs) {
    return {
      name: (hs.name || 'Coach').toUpperCase(),
      title: hs.title || hs.position_coached || 'HS Coach',
      subtitle: '',
      organization: hs.school_name || '',
      email: hs.email || '', phone: hs.phone || '', twitter: hs.twitter || '',
      imageUrl: hs.image_url || '', isVerified: !!hs.is_verified,
      sport: hs.sport || '', division: hs.school_classification || '', conference: hs.conference_name || '',
      position: hs.position_coached || '', bio: hs.bio || '',
    };
  }
  if (role === 'scout' && scout) {
    return {
      name: (scout.name || 'Scout').toUpperCase(),
      title: scout.title || scout.specialization || 'Scout',
      subtitle: '',
      organization: scout.company || org?.organization?.name || '',
      email: scout.email || '', phone: scout.phone || '', twitter: scout.twitter || '',
      imageUrl: scout.image_url || '', isVerified: !!scout.is_verified,
      sport: scout.sports?.[0] || '', division: scout.specialization || '', conference: scout.is_independent ? 'Independent' : 'Agency',
      position: '', bio: scout.bio || '',
    };
  }
  if ((role === 'coach' || role === 'club_coach') && coach) {
    return {
      name: (coach.name || 'Coach').toUpperCase(),
      title: coach.title || 'Coach',
      subtitle: coach.secondary_title || '',
      organization: role === 'club_coach' && club ? club.club_name : coach.school || '',
      email: coach.email || '', phone: coach.phone || '', twitter: coach.twitter || '',
      imageUrl: role === 'club_coach' && club?.club_logo_url ? club.club_logo_url : coach.image_url || '',
      isVerified: !!coach.is_verified,
      sport: coach.sport || '', division: coach.division || '', conference: coach.conference || '',
      position: coach.position_coached || coach.position || '', bio: coach.bio || '',
    };
  }
  return null;
}

// ─── Header ───────────────────────────────────────────────────────
function HeaderRow({ role, onClose }: { role: Role; onClose: () => void }) {
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <View style={s.headerIconBox}><ImageIcon size={18} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{ROLE_TITLES[role]}</Text>
          <Text style={s.headerSubtitle}>{ROLE_SUBS[role]}</Text>
        </View>
      </View>
      <Pressable onPress={onClose} style={s.closeBtn} hitSlop={10}>
        <X size={20} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ─── Body ─────────────────────────────────────────────────────────
function Body({ data, role, tab, setTab, captureRef, scoutProfile }: any) {
  const publicUrl =
    role === 'scout' && scoutProfile?.id ? `${BASE_URL}/scouts/${scoutProfile.id}`
    : role === 'club_coach' ? `${BASE_URL}/discover/clubs`
    : `${BASE_URL}/coaches`;

  const initials = data.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('');
  const safe = data.name.toLowerCase().replace(/[^a-z0-9-_]/gi, '-');
  const mailTo = () => data.email && Linking.openURL(`mailto:${data.email}`).catch(() => {});
  const callTo = () => data.phone && Linking.openURL(`tel:${data.phone}`).catch(() => {});

  return (
    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Tabs */}
      <View style={s.tabBar}>
        <TabBtn active={tab === 'post'} icon={<ImageIcon size={16} color={tab === 'post' ? colors.primaryForeground : colors.foreground} />} label="Post" onPress={() => setTab('post')} />
        <TabBtn active={tab === 'story'} icon={<Smartphone size={16} color={tab === 'story' ? colors.primaryForeground : colors.foreground} />} label="Story" onPress={() => setTab('story')} />
        <TabBtn active={tab === 'qr'} icon={<QrCode size={16} color={tab === 'qr' ? colors.primaryForeground : colors.foreground} />} label="QR Code" onPress={() => setTab('qr')} />
      </View>

      {/* Card */}
      <View ref={captureRef} style={s.cardWrap}>
        <LinearGradient colors={['#1e2a47', '#15213a', '#0f1829']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cardGradient}>
          <BokehBackground />

          {/* Identity row */}
          <View style={s.identityRow}>
            <View style={s.avatarSlot}>
              <View style={s.avatarRing}>
                {data.imageUrl ? (
                  <Image source={{ uri: data.imageUrl }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback]}>
                    <Text style={s.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
              {data.isVerified && (
                <View style={s.verifiedBadge}>
                  <Check size={12} color="#ffffff" strokeWidth={3} />
                </View>
              )}
            </View>

            <View style={s.identityInfo}>
              <View style={s.rolePill}>
                <Text style={s.rolePillText}>{ROLE_PILL[role as Role]}</Text>
              </View>
              <Text style={s.name} numberOfLines={2}>{data.name}</Text>
              {data.title ? <Text style={s.title}>{data.title}</Text> : null}
              {data.organization ? <Text style={s.org}>{data.organization}</Text> : null}

              <View style={{ gap: 2, marginTop: 4 }}>
                {data.phone ? (
                  <View style={s.contactLine}><Phone size={11} color="#9fb0c4" /><Text style={s.contactText}>  {data.phone}</Text></View>
                ) : null}
                {data.email ? (
                  <View style={s.contactLine}><Mail size={11} color="#9fb0c4" /><Text style={s.contactText}>  {data.email}</Text></View>
                ) : null}
                {data.twitter ? (
                  <Text style={s.twitterText}>𝕏 {data.twitter.startsWith('@') ? data.twitter : '@' + data.twitter}</Text>
                ) : null}
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Meta grid */}
          <View style={s.metaRow}>
            {data.sport ? <MetaCell label="SPORT" value={data.sport.toUpperCase()} /> : null}
            {data.division ? <MetaCell label="DIVISION" value={data.division} /> : null}
            {data.conference ? <MetaCell label="CONFERENCE" value={data.conference} /> : null}
          </View>
          {data.position ? (
            <View style={{ marginTop: spacing.sm }}>
              <MetaCell label="POSITION" value={data.position} />
            </View>
          ) : null}

          {/* Bio */}
          {data.bio ? (
            <Text style={s.bio} numberOfLines={3}>{data.bio}</Text>
          ) : null}

          {/* QR + brand */}
          <View style={s.qrBlock}>
            <View style={s.qrBox}>
              <QRCode value={publicUrl} size={120} color="#000" backgroundColor="#fff" />
            </View>
            <Text style={s.brandLogo}>OFFERHOUND<Text style={s.brandTm}> ™</Text></Text>
          </View>
        </LinearGradient>
      </View>

      {/* Action buttons */}
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <CardShareActions
          targetRef={captureRef}
          senderName={data.name}
          fileBaseName={`${safe}-${ROLE_PILL[role as Role].toLowerCase().replace(' ', '-')}-card`}
        />
      </View>

      <Text style={s.footerHint}>Download and attach to emails or social posts</Text>

      {/* Contact info pills */}
      {(data.email || data.phone) ? (
        <View style={{ alignItems: 'center', marginTop: spacing.md, gap: spacing.sm }}>
          <Text style={s.contactInfoLabel}>Contact info on card</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {data.email ? (
              <Pressable style={s.contactPill} onPress={mailTo}>
                <Mail size={13} color={colors.foreground} /><Text style={s.contactPillText}>  Email</Text>
              </Pressable>
            ) : null}
            {data.phone ? (
              <Pressable style={s.contactPill} onPress={callTo}>
                <Phone size={13} color={colors.foreground} /><Text style={s.contactPillText}>  Phone</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────
function TabBtn({ active, icon, label, onPress }: any) {
  return (
    <Pressable style={[s.tabBtn, active && s.tabBtnActive]} onPress={onPress}>
      {icon}
      <Text style={[s.tabLabel, active && s.tabLabelActive]}>  {label}</Text>
    </Pressable>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaCell}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

function BokehBackground() {
  const circles = [
    { cx: 60, cy: 40, r: 70, op: 0.06 }, { cx: 340, cy: 30, r: 50, op: 0.05 },
    { cx: 50, cy: 280, r: 90, op: 0.04 }, { cx: 310, cy: 220, r: 60, op: 0.05 },
    { cx: 200, cy: 380, r: 80, op: 0.05 }, { cx: 380, cy: 400, r: 70, op: 0.04 },
    { cx: 100, cy: 500, r: 60, op: 0.04 }, { cx: 350, cy: 560, r: 50, op: 0.05 },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 650">
        {circles.map((c, i) => (
          <Circle key={`b-${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="#ffffff" opacity={c.op} />
        ))}
      </Svg>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  modalCard: {
    backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    maxHeight: '95%', width: '100%', maxWidth: 480, overflow: 'hidden',
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, gap: spacing.sm },
  headerLeft: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  headerIconBox: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: colors.primary,
    backgroundColor: 'rgba(231,175,8,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.primary, letterSpacing: 1.5, fontWeight: '700' },
  headerSubtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.muted, borderRadius: radius.md, padding: 4,
    alignSelf: 'center', borderWidth: 1, borderColor: colors.border,
  },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.sm },
  tabBtnActive: { backgroundColor: colors.primary },
  tabLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  tabLabelActive: { color: colors.primaryForeground },

  // Card
  cardWrap: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardGradient: { padding: spacing.md, gap: spacing.sm, minHeight: 400 },

  // Identity
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatarSlot: { position: 'relative' },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: ORANGE, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: { backgroundColor: '#1e2a47', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: typography.fontFamily.heading, fontSize: 24, color: colors.primary },
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: VERIFIED_GREEN, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1e2a47',
  },

  identityInfo: { flex: 1, gap: 2 },
  rolePill: { backgroundColor: ORANGE, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, alignSelf: 'flex-start', marginBottom: 4 },
  rolePillText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 9, color: '#ffffff', letterSpacing: 0.5 },
  name: { fontFamily: typography.fontFamily.heading, fontSize: 20, color: '#ffffff', fontWeight: '800', letterSpacing: 0.5 },
  title: { fontFamily: typography.fontFamily.body, fontSize: 12, color: '#c7d2e0', marginTop: 2 },
  org: { fontFamily: typography.fontFamily.body, fontSize: 12, color: '#c7d2e0' },
  contactLine: { flexDirection: 'row', alignItems: 'center' },
  contactText: { fontFamily: typography.fontFamily.body, fontSize: 11, color: '#9fb0c4' },
  twitterText: { fontFamily: typography.fontFamily.body, fontSize: 11, color: '#9fb0c4' },

  divider: { height: 1, backgroundColor: ORANGE, opacity: 0.5, marginVertical: 6 },

  // Meta grid
  metaRow: { flexDirection: 'row', gap: spacing.md },
  metaCell: { flex: 1 },
  metaLabel: { fontFamily: typography.fontFamily.body, fontSize: 9, color: '#9fb0c4', letterSpacing: 1 },
  metaValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 14, color: '#ffffff', fontWeight: '700', marginTop: 2 },

  // Bio
  bio: { fontFamily: typography.fontFamily.body, fontStyle: 'italic', fontSize: 11, color: '#9fb0c4', lineHeight: 15, marginTop: spacing.sm },

  // QR block
  qrBlock: { alignItems: 'center', gap: 4, marginTop: spacing.md },
  qrBox: { backgroundColor: '#ffffff', padding: 8, borderRadius: 6 },
  brandLogo: { fontFamily: typography.fontFamily.heading, fontSize: 12, color: ORANGE, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  brandTm: { fontSize: 8, color: ORANGE },

  // Footer
  footerHint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.xs },
  contactInfoLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  contactPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.muted, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  contactPillText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 12, color: colors.foreground },

  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center', padding: spacing.lg },
});
