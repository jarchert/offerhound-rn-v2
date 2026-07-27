// Ported verbatim (RN-adapted) from Lovable web src/components/RoleCardGenerator.tsx.
// Web→RN translations applied:
//   - Tailwind className           → StyleSheet + theme tokens (visual parity)
//   - lucide-react                 → lucide-react-native
//   - shadcn ui (avatar/badge/button) → @/components/ui/* (PascalCase)
//   - react-icons FA brand icons   → @expo/vector-icons FontAwesome5/6
//   - qrcode.react QRCodeSVG       → placeholder View (GAP: react-native-qrcode-svg not installed,
//                                    same convention as AdminInvitationCards)
//   - window.location.origin       → Constants.expoConfig?.extra?.webBaseUrl ?? 'https://offer-hound.com'
//   - HTMLDivElement ref           → react-native-view-shot ref (passed to CardShareActions)
//   - useToast()                   → @/hooks/use-toast (RN shim)
import { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Constants from 'expo-constants';
import ViewShot from 'react-native-view-shot';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/hooks/use-toast';
import { Copy, Mail, Phone, MapPin, Building, Shield } from 'lucide-react-native';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { copyToClipboard } from '@/lib/utils';
import { CardShareActions } from '@/components/CardShareActions';
import { buildMecard } from '@/lib/mecard';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface RoleCardGeneratorProps {
  role: 'coach' | 'club_coach' | 'scout' | 'hs_coach';
}

type IconRender = (size: number, color: string) => React.ReactNode;
const socialIcons: Record<string, IconRender> = {
  instagram: (size, color) => <FontAwesome5 name="instagram" size={size} color={color} />,
  facebook: (size, color) => <FontAwesome5 name="facebook" size={size} color={color} />,
  x: (size, color) => <FontAwesome6 name="x-twitter" size={size} color={color} />,
  twitter: (size, color) => <FontAwesome6 name="x-twitter" size={size} color={color} />,
  tiktok: (size, color) => <FontAwesome5 name="tiktok" size={size} color={color} />,
  youtube: (size, color) => <FontAwesome5 name="youtube" size={size} color={color} />,
};

// GAP: RN has no window.location.origin. Use stable web baseUrl from app config.
const WEB_ORIGIN: string =
  (Constants.expoConfig?.extra as any)?.webBaseUrl || 'https://offer-hound.com';

export const RoleCardGenerator = ({ role }: RoleCardGeneratorProps) => {
  const { user } = useAuth();
  const { data: coachProfile, isLoading: coachLoading } = useCoachProfile();
  const { data: scoutProfile, isLoading: scoutLoading } = useScoutProfile();
  const { data: orgData } = useScoutOrganization();
  const { data: hsProfile, isLoading: hsLoading } = useHSCoachProfile();
  const { toast } = useToast();
  const cardRef = useRef<ViewShot>(null);

  const isLoadingForRole =
    role === 'coach' || role === 'club_coach'
      ? coachLoading
      : role === 'scout'
      ? scoutLoading
      : role === 'hs_coach'
      ? hsLoading
      : false;

  const { data: clubProfile } = useQuery({
    queryKey: ['club-coach-profile-card', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('club_coach_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && role === 'club_coach',
  });

  // Build profile data based on role
  const getProfileData = () => {
    if (role === 'hs_coach' && hsProfile) {
      const p = hsProfile as any;
      return {
        name: p.name || 'Coach',
        title: p.title || p.position_coached || 'HS Coach',
        organization: p.school_name || '',
        email: p.email || '',
        phone: p.phone || '',
        imageUrl: p.image_url || '',
        sport: p.sport || '',
        location: [p.school_city, p.school_state].filter(Boolean).join(', '),
        isVerified: p.is_verified || false,
        socialLinks: p.social_links || {},
        twitter: p.twitter || '',
        badges: [p.sport, p.school_classification, p.conference_name, 'High School'].filter(Boolean),
      };
    }

    if (role === 'scout' && scoutProfile) {
      const p = scoutProfile as any;
      return {
        name: p.name || 'Scout',
        title: p.title || p.specialization || 'Scout',
        organization: p.company || (orgData as any)?.organization?.name || '',
        email: p.email || '',
        phone: p.phone || '',
        imageUrl: p.image_url || '',
        sport: p.sports?.[0] || '',
        location: p.regions_covered?.join(', ') || '',
        isVerified: p.is_verified || false,
        socialLinks: p.social_links || {},
        twitter: p.twitter || '',
        badges: [
          p.specialization && p.specialization,
          p.is_independent ? 'Independent' : 'Agency',
        ].filter(Boolean),
      };
    }

    if ((role === 'coach' || role === 'club_coach') && coachProfile) {
      const p = coachProfile as any;
      const club = clubProfile as any;
      return {
        name: p.name || 'Coach',
        title: p.title || 'Coach',
        organization: role === 'club_coach' && club ? club.club_name : p.school || '',
        email: p.email || '',
        phone: p.phone || '',
        imageUrl:
          role === 'club_coach' && club?.club_logo_url ? club.club_logo_url : p.image_url || '',
        sport: p.sport || '',
        location: [p.city, p.state].filter(Boolean).join(', '),
        isVerified: p.is_verified || false,
        socialLinks: p.social_links || {},
        twitter: p.twitter || '',
        badges: [
          p.sport,
          p.division,
          p.conference,
          role === 'club_coach' && 'Club Coach',
        ].filter(Boolean),
      };
    }

    return null;
  };

  const data = getProfileData();
  if (isLoadingForRole) {
    return (
      <View style={s.stateWrap}>
        <Text style={s.stateText}>Loading your card…</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={s.stateWrap}>
        <Text style={s.stateText}>
          We couldn't find your{' '}
          {role === 'club_coach' ? 'club coach' : role === 'hs_coach' ? 'HS coach' : role} profile.
        </Text>
        <Text style={[s.stateText, s.stateHint]}>
          Complete your profile in Settings to enable card sharing.
        </Text>
      </View>
    );
  }

  const initials = data.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Public web URL for this role (used as the visible "Copy link" target).
  // Only Scouts currently have an individual public profile page.
  const publicWebUrl =
    role === 'scout' && (scoutProfile as any)?.id
      ? `${WEB_ORIGIN}/scouts/${(scoutProfile as any).id}`
      : role === 'club_coach'
      ? `${WEB_ORIGIN}/discover/clubs`
      : role === 'hs_coach' || role === 'coach'
      ? `${WEB_ORIGIN}/coaches`
      : `${WEB_ORIGIN}/`;

  // QR payload: encode a MECARD so any phone scanner can save the contact
  // directly. Delegated to shared helper (@/lib/mecard) so ProfileCardGenerator
  // uses the exact same escaping + field ordering (Tier 3 #3).
  const mecard = buildMecard({
    name: data.name,
    phone: data.phone,
    email: data.email,
    organization: data.organization,
    title: data.title,
    location: data.location,
    url: publicWebUrl,
  });

  const qrPayload = role === 'scout' ? publicWebUrl : mecard;
  const cardUrl = publicWebUrl;

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(cardUrl);
    toast({ title: ok ? 'Profile link copied!' : 'Failed to copy link' });
  };

  // Collect social links
  const socials: { platform: string; url: string }[] = [];
  if (data.socialLinks && typeof data.socialLinks === 'object') {
    Object.entries(data.socialLinks as Record<string, string>).forEach(([key, val]) => {
      if (val) socials.push({ platform: key.toLowerCase(), url: val });
    });
  }
  if (data.twitter && !socials.find((sx) => sx.platform === 'twitter' || sx.platform === 'x')) {
    const handle = data.twitter.replace(/^@/, '');
    socials.push({ platform: 'x', url: `https://x.com/${handle}` });
  }

  const roleLabel =
    role === 'club_coach'
      ? 'Club Coach'
      : role === 'scout'
      ? 'Scout'
      : role === 'hs_coach'
      ? 'HS Coach'
      : 'Coach';

  type DetailRow = {
    key: string;
    label: string;
    value: string;
    icon: (size: number, color: string) => React.ReactNode;
  };
  const detailRows: DetailRow[] = [
    data.organization && {
      key: 'organization',
      label: role === 'scout' ? 'Organization' : 'Program',
      value: data.organization,
      icon: (size: number, color: string) => <Building size={size} color={color} />,
    },
    data.location && {
      key: 'location',
      label: 'Location',
      value: data.location,
      icon: (size: number, color: string) => <MapPin size={size} color={color} />,
    },
    data.email && {
      key: 'email',
      label: 'Email',
      value: data.email,
      icon: (size: number, color: string) => <Mail size={size} color={color} />,
    },
    data.phone && {
      key: 'phone',
      label: 'Phone',
      value: data.phone,
      icon: (size: number, color: string) => <Phone size={size} color={color} />,
    },
  ].filter(Boolean) as DetailRow[];

  return (
    <View style={s.root}>
      <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }} style={s.captureWrap}>
        {/* Card body */}
        <View style={s.card}>
          {/* Top accent bar (gradient stand-in) */}
          <View style={s.accentBar} />

          <View style={s.cardBody}>
            {/* Header row: avatar + name */}
            <View style={s.headerRow}>
              <Avatar
                source={data.imageUrl ? { uri: data.imageUrl } : null}
                fallback={initials}
                size={72}
                style={s.avatar}
              />

              <View style={s.headerText}>
                <View style={s.nameRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name}>{data.name}</Text>
                    <Text style={s.title}>{data.title}</Text>
                  </View>
                  {data.isVerified && (
                    <Shield size={16} color={colors.primary} style={{ marginTop: 2 }} />
                  )}
                </View>

                <View style={s.badgeRow}>
                  <Badge variant="outline">{roleLabel}</Badge>
                  {data.sport ? <Badge variant="secondary">{data.sport}</Badge> : null}
                  {data.badges.map((badge: string, index: number) => (
                    <Badge key={`${badge}-${index}`} variant="secondary">
                      {badge}
                    </Badge>
                  ))}
                </View>
              </View>
            </View>

            {/* Detail rows */}
            {detailRows.length > 0 && (
              <View style={s.detailGrid}>
                {detailRows.map((item) => (
                  <View key={item.key} style={s.detailRow}>
                    <View style={s.detailInner}>
                      {item.icon(14, colors.mutedForeground)}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.detailLabel}>{item.label}</Text>
                        <Text style={s.detailValue}>{item.value}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Socials */}
            {socials.length > 0 && (
              <View style={s.socialsBox}>
                <Text style={s.socialsLabel}>Social</Text>
                <View style={s.socialsRow}>
                  {socials.map((social, index) => {
                    const renderIcon = socialIcons[social.platform];
                    return (
                      <View key={`${social.platform}-${index}`} style={s.socialPill}>
                        {renderIcon ? renderIcon(12, colors.foreground) : null}
                        <Text style={s.socialText}>{social.platform}</Text>
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
          {/* GAP: react-native-qrcode-svg not installed; placeholder block (matches AdminInvitationCards convention).
              qrPayload is computed and ready for when QR rendering is wired up. */}
          <View style={s.qrBox} accessibilityLabel={`QR: ${qrPayload.slice(0, 32)}`}>
            <Text style={s.qrPlaceholderText}>QR</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.qrTitle}>
              {role === 'scout' ? 'Scan to view profile' : 'Scan to save contact'}
            </Text>
            <Text style={s.qrUrl} numberOfLines={2}>
              {cardUrl}
            </Text>
          </View>
        </View>
      </ViewShot>

      {/* Actions */}
      <View style={s.actions}>
        <Button
          variant="outline"
          size="sm"
          onPress={handleCopyLink}
          leftIcon={<Copy size={14} color={colors.foreground} />}
          style={{ width: '100%' }}
        >
          Copy profile link
        </Button>
        <CardShareActions
          targetRef={cardRef}
          senderName={data.name}
          fileBaseName={`${data.name}-${roleLabel}-card`}
        />
      </View>
    </View>
  );
};

export default RoleCardGenerator;

const s = StyleSheet.create({
  root: { width: '100%', gap: spacing.md },
  captureWrap: { width: '100%', backgroundColor: colors.background, padding: 4, gap: spacing.md },

  stateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 6 },
  stateText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  stateHint: { fontSize: typography.fontSize.xs },

  // Outer card
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(231, 175, 8, 0.2)', // primary/20
    backgroundColor: colors.card,
  },
  accentBar: { height: 6, backgroundColor: colors.primary },

  cardBody: { padding: spacing.md, gap: spacing.md },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minWidth: 0 },
  avatar: { borderWidth: 2, borderColor: 'rgba(231, 175, 8, 0.3)' },
  headerText: { flex: 1, minWidth: 0, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, minWidth: 0 },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    lineHeight: 22,
  },
  title: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  // Detail rows
  detailGrid: { gap: spacing.xs },
  detailRow: {
    minWidth: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(43, 48, 58, 0.5)', // border/50
    backgroundColor: 'rgba(16, 19, 24, 0.7)', // background/70
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  detailInner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, minWidth: 0 },
  detailLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.mutedForeground,
  },
  detailValue: {
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
    lineHeight: 17,
    color: colors.foreground,
  },

  // Socials
  socialsBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(43, 48, 58, 0.5)',
    backgroundColor: 'rgba(16, 19, 24, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  socialsLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  socialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(43, 48, 58, 0.6)',
    backgroundColor: 'rgba(39, 43, 52, 0.4)', // secondary/40
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  socialText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 11,
    color: colors.foreground,
  },

  // QR row
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(43, 48, 58, 0.5)',
    backgroundColor: 'rgba(39, 43, 52, 0.2)', // secondary/20
    padding: spacing.md,
  },
  qrBox: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  qrPlaceholderText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  qrTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  qrUrl: {
    marginTop: 4,
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.mutedForeground,
  },

  actions: { width: '100%', gap: 8 },
});
