// RoleCardGenerator — RN port of Lovable src/components/RoleCardGenerator.tsx.
// Generates shareable profile cards for: coach, club_coach, scout, hs_coach.
// Full visual parity: gradient card, avatar, detail rows, social links, QR.
// Web→RN: div+className → View+StyleSheet; QRCodeSVG → QRCode (react-native-qrcode-svg).
import React, { useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import {
  Copy, Mail, Phone, MapPin, Building, Shield, Link as LinkIcon
} from 'lucide-react-native';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardShareActions } from '@/components/CardShareActions';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing, radius } from '@/lib/theme';

type Role = 'coach' | 'club_coach' | 'scout' | 'hs_coach';

const BASE_URL = 'https://offer-hound.com';

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram, facebook: Facebook, x: Twitter, twitter: Twitter,
  tiktok: LinkIcon, youtube: Youtube, linkedin: LinkIcon,
};

const ROLE_LABELS: Record<Role, string> = {
  coach: 'Coach', club_coach: 'Club Coach', scout: 'Scout', hs_coach: 'HS Coach',
};

interface CardData {
  name: string;
  title: string;
  organization: string;
  email: string;
  phone: string;
  imageUrl: string;
  sport: string;
  location: string;
  isVerified: boolean;
  socialLinks: Record<string, string>;
  badges: string[];
}

function useClubCoachProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['club-coach-profile-card', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from('club_coach_profiles').select('*').eq('user_id', userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });
}

export function RoleCardGenerator({ role }: { role: Role }) {
  const { user } = useAuth();
  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: orgData } = useScoutOrganization();
  const { data: hsProfile } = useHSCoachProfile();
  const { data: clubProfile } = useClubCoachProfile(user?.id);
  const captureRef = useRef<View>(null);

  const isLoadingForRole =
    role === 'coach' || role === 'club_coach' ? (coachProfile === undefined)
    : role === 'scout' ? (scoutProfile === undefined)
    : role === 'hs_coach' ? (hsProfile === undefined)
    : false;

  const getProfileData = (): CardData | null => {
    const p = coachProfile as any;
    const sp = scoutProfile as any;
    const hp = hsProfile as any;
    const cp = clubProfile as any;

    if (role === 'hs_coach' && hp) {
      return {
        name: hp.name || 'Coach',
        title: hp.title || hp.position_coached || 'HS Coach',
        organization: hp.school_name || '',
        email: hp.email || '',
        phone: hp.phone || '',
        imageUrl: hp.image_url || '',
        sport: hp.sport || '',
        location: [hp.school_city, hp.school_state].filter(Boolean).join(', '),
        isVerified: hp.is_verified || false,
        socialLinks: (hp as any).social_links || {},
        badges: [hp.sport, hp.school_classification, hp.conference_name, 'High School'].filter(Boolean),
      };
    }

    if (role === 'scout' && sp) {
      return {
        name: sp.name || 'Scout',
        title: sp.title || sp.specialization || 'Scout',
        organization: sp.company || (orgData as any)?.organization?.name || '',
        email: sp.email || '',
        phone: sp.phone || '',
        imageUrl: sp.image_url || '',
        sport: sp.sports?.[0] || '',
        location: sp.regions_covered?.join(', ') || '',
        isVerified: sp.is_verified || false,
        socialLinks: (sp as any).social_links || {},
        badges: [sp.specialization, sp.is_independent ? 'Independent' : 'Agency'].filter(Boolean),
      };
    }

    if ((role === 'coach' || role === 'club_coach') && p) {
      return {
        name: p.name || 'Coach',
        title: p.title || 'Coach',
        organization: role === 'club_coach' && cp ? cp.club_name : p.school || '',
        email: p.email || '',
        phone: p.phone || '',
        imageUrl: role === 'club_coach' && cp?.club_logo_url ? cp.club_logo_url : p.image_url || '',
        sport: p.sport || '',
        location: [p.city, p.state].filter(Boolean).join(', '),
        isVerified: p.is_verified || false,
        socialLinks: (p as any).social_links || {},
        badges: [p.sport, p.division, p.conference, role === 'club_coach' && 'Club Coach'].filter(Boolean),
      };
    }

    return null;
  };

  if (isLoadingForRole) {
    return <View style={s.loading}><Text style={s.loadingText}>Loading your card…</Text></View>;
  }

  const profileData = getProfileData();
  if (!profileData) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingText}>We couldn't find your {ROLE_LABELS[role]} profile.</Text>
        <Text style={s.hint}>Complete your profile in Settings to enable card sharing.</Text>
      </View>
    );
  }

  const sp = scoutProfile as any;
  const data = profileData;

  const initials = data.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Public URL logic from Lovable
  const publicWebUrl =
    role === 'scout' && sp?.id ? `${BASE_URL}/scouts/${(scoutProfile as any).id}`
    : role === 'club_coach' ? `${BASE_URL}/discover/clubs`
    : `${BASE_URL}/coaches`;

  const qrPayload = publicWebUrl;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(publicWebUrl);
    toast({ title: 'Profile link copied!' });
  };

  const socials: { platform: string; url: string }[] = [];
  if (data.socialLinks && typeof data.socialLinks === 'object') {
    Object.entries(data.socialLinks as Record<string, string>).forEach(([key, val]) => {
      if (val) socials.push({ platform: key.toLowerCase(), url: val });
    });
  }

  const detailRows: { key: string; label: string; value: string; Icon: React.ElementType }[] = [
    data.organization ? { key: 'org', label: role === 'scout' ? 'Organization' : 'Program', value: data.organization, Icon: Building } : null,
    data.location ? { key: 'loc', label: 'Location', value: data.location, Icon: MapPin } : null,
    data.email ? { key: 'email', label: 'Email', value: data.email, Icon: Mail } : null,
    data.phone ? { key: 'phone', label: 'Phone', value: data.phone, Icon: Phone } : null,
  ].filter(Boolean) as { key: string; label: string; value: string; Icon: React.ElementType }[];

  const safe = data.name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      {/* Capture region */}
      <View ref={captureRef} style={s.capture}>

        {/* Main card */}
        <View style={s.card}>
          <View style={s.accentBar} />
          <View style={s.cardBody}>

            {/* Identity row */}
            <View style={s.identityRow}>
              {data.imageUrl ? (
                <Image source={{ uri: data.imageUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={s.identityInfo}>
                <View style={s.nameRow}>
                  <View style={s.nameCol}>
                    <Text style={s.name} numberOfLines={1}>{data.name}</Text>
                    <Text style={s.title} numberOfLines={1}>{data.title}</Text>
                  </View>
                  {data.isVerified && <Shield size={16} color={colors.primary} style={s.verifiedBadge} />}
                </View>
                <View style={s.badgeRow}>
                  <Badge variant="outline" style={s.roleBadge}>{ROLE_LABELS[role]}</Badge>
                  {data.sport ? <Badge variant="secondary">{data.sport}</Badge> : null}
                  {data.badges.map((b, i) => <Badge key={i} variant="secondary" style={s.extraBadge}>{b}</Badge>)}
                </View>
              </View>
            </View>

            {/* Detail rows */}
            {detailRows.length > 0 && (
              <View style={s.detailGrid}>
                {detailRows.map(row => {
                  const Icon = row.Icon;
                  return (
                    <View key={row.key} style={s.detailCell}>
                      <View style={s.detailRow}>
                        <Icon size={14} color={colors.mutedForeground} />
                        <Text style={s.detailLabel}>  {row.label}</Text>
                      </View>
                      <Text style={s.detailValue}>{row.value}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Social links */}
            {socials.length > 0 && (
              <View style={s.socialSection}>
                <Text style={s.socialLabel}>Social</Text>
                <View style={s.socialRow}>
                  {socials.map((soc, i) => {
                    const Icon = SOCIAL_ICONS[soc.platform] || LinkIcon;
                    return (
                      <View key={i} style={s.socialChip}>
                        <Icon size={12} color={colors.foreground} />
                        <Text style={s.socialChipText}>{soc.platform}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* QR row */}
        <View style={s.qrRow}>
          <QRCode value={qrPayload} size={64} color={colors.foreground} backgroundColor={colors.background} />
          <View style={s.qrInfo}>
            <Text style={s.qrTitle}>
              {role === 'scout' ? 'Scan to view profile' : 'Scan to save contact'}
            </Text>
            <Text style={s.qrUrl} numberOfLines={1}>{publicWebUrl}</Text>
          </View>
        </View>

      </View>
      {/* /Capture */}

      {/* Actions */}
      <View style={s.actions}>
        <Pressable style={s.copyBtn} onPress={handleCopyLink}>
          <Copy size={14} color={colors.foreground} />
          <Text style={s.copyText}>  Copy profile link</Text>
        </Pressable>
        <CardShareActions
          targetRef={captureRef}
          senderName={data.name}
          fileBaseName={`${safe}-${ROLE_LABELS[role].toLowerCase().replace(' ', '-')}-card`}
        />
      </View>
    </ScrollView>
  );
}

export default RoleCardGenerator;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md },
  loading: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  loadingText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground },
  hint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },

  capture: { gap: spacing.md },

  card: {
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    backgroundColor: colors.background,
  },
  accentBar: { height: 6, backgroundColor: colors.primary },
  cardBody: { padding: spacing.lg, gap: spacing.md },

  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.primary, resizeMode: 'cover' },
  avatarFallback: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primary,
  },
  avatarInitials: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.primary },
  identityInfo: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  nameCol: { flex: 1 },
  name: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground },
  title: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  verifiedBadge: { marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  roleBadge: { fontSize: 11 },
  extraBadge: { fontSize: 11 },

  detailGrid: { gap: spacing.xs },
  detailCell: {
    borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: colors.muted, padding: spacing.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.foreground, marginTop: 2 },

  socialSection: { backgroundColor: colors.muted, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  socialLabel: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  socialChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  socialChipText: { fontFamily: typography.fontFamily.body, fontSize: 11, color: colors.foreground },

  qrRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.muted, borderRadius: radius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  qrInfo: { flex: 1 },
  qrTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  qrUrl: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },

  actions: { gap: spacing.sm },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  copyText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
