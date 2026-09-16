// Ported from Lovable web src/pages/PublicHSCoachProfile.tsx (156 LOC).
// Web → RN translation:
//   - useParams({ id })     → useRoute<RouteProp>().params.hsCoachId
//   - useNavigate / <Link>  → useNavigation().navigate
//   - tailwind/shadcn       → @/components/ui/* + StyleSheet via @/lib/theme
//   - lucide-react          → lucide-react-native
//   - <a href="mailto:">    → Linking.openURL
//   - <a href="tel:">       → Linking.openURL
//   - <Link to="/letters?"> → nav.navigate('LetterComposer', { prefill })
//   - NotRegisteredUser     → inline not-found card (same as scout screen pattern)
//   - SEO / ScrollToTop     → no-op on native
//
// Table: high_school_coach_profiles (eq id, eq is_published=true)
// Contact gating: NONE — MAIN shows email/phone/twitter/website unconditionally
//   when present. No show_contact_info field exists on this table.
// CTA "Compose Letter" is NOT auth-gated in MAIN; shown whenever coach.email exists.
// image_url (not profile_image_url) is the avatar field on this table.
//
// Navigator: PublicProfileStack (same as PublicScoutProfile — share-target stack).
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Mail,
  Phone,
  MapPin,
  School,
  Twitter,
  Globe,
  Users,
} from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

import { colors, typography, spacing } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'PublicHSCoachProfile'>;

export default function PublicHSCoachProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.hsCoachId;
  const nav = useNavigation<any>();

  const { data: coach, isLoading } = useQuery({
    queryKey: ['public-hs-coach-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('high_school_coach_profiles' as any)
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  // "Compose Letter" — seeds LetterComposer with coach prefill, same pattern
  // as PublicScoutProfileScreen. No auth gate: MAIN shows this whenever email exists.
  const handleComposeLetter = () => {
    if (!coach) return;
    const prefill = {
      recipientCategory: 'coach',
      recipientType: 'hs-coach',
      recipientName: (coach as any).name || '',
      recipientEmail: (coach as any).email || '',
      organizationName: (coach as any).school_name || '',
      recipientTitle: (coach as any).title || '',
      letterType: 'initial-interest',
    };
    nav.navigate('LetterComposer' as any, { prefill });
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!coach) {
    return (
      <View style={s.loading}>
        <Text style={s.muted}>Coach not found or profile is not published.</Text>
      </View>
    );
  }

  const location = [(coach as any).school_city, (coach as any).school_state]
    .filter(Boolean)
    .join(', ');
  const initials = ((coach as any).name || 'C').charAt(0).toUpperCase();

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            {/* ── Header: avatar + name / verified badge / title / school ── */}
            <View style={s.headRow}>
              <Avatar
                size={80}
                source={(coach as any).image_url ? { uri: (coach as any).image_url } : null}
                fallback={initials}
              />
              <View style={s.headInfo}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{(coach as any).name}</Text>
                  {!!(coach as any).is_verified && (
                    <Badge style={s.verifiedBadge}>
                      <View style={s.verifiedInner}>
                        <Award size={12} color={colors.primary} />
                        <Text style={s.verifiedText}>Verified</Text>
                      </View>
                    </Badge>
                  )}
                </View>
                <Text style={s.titleText}>{(coach as any).title}</Text>
                {!!(coach as any).school_name && (
                  <View style={s.schoolRow}>
                    <School size={14} color={colors.mutedForeground} />
                    <Text style={s.schoolText}>{(coach as any).school_name}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Classification / conference / sport / position badges ── */}
            <View style={s.badgeRow}>
              {!!(coach as any).school_classification && (
                <Badge variant="secondary">
                  {String((coach as any).school_classification)}
                </Badge>
              )}
              {!!(coach as any).conference_name && (
                <Badge variant="outline">{String((coach as any).conference_name)}</Badge>
              )}
              {!!(coach as any).sport && (
                <Badge variant="outline">{String((coach as any).sport)}</Badge>
              )}
              {!!(coach as any).position_coached && (
                <Badge variant="outline">{`Coaches: ${(coach as any).position_coached}`}</Badge>
              )}
            </View>

            {/* ── Bio ── */}
            {!!(coach as any).bio && (
              <>
                <Text style={s.sectionTitle}>About</Text>
                <Text style={s.bio}>{(coach as any).bio}</Text>
              </>
            )}

            {/* ── Stats: location / years coaching / career record ── */}
            <View style={s.statsGrid}>
              {!!location && (
                <View style={s.statRow}>
                  <MapPin size={14} color={colors.mutedForeground} />
                  <Text style={s.statText}>{location}</Text>
                </View>
              )}
              {typeof (coach as any).years_coaching === 'number' && (
                <View style={s.statRow}>
                  <Users size={14} color={colors.mutedForeground} />
                  <Text style={s.statText}>
                    {(coach as any).years_coaching} years coaching
                  </Text>
                </View>
              )}
              {!!(coach as any).career_record && (
                <View style={s.statRow}>
                  <Award size={14} color={colors.mutedForeground} />
                  <Text style={s.statText}>Record: {(coach as any).career_record}</Text>
                </View>
              )}
            </View>

            {/* ── Actions: Compose Letter / Email / Call / Twitter / Website ── */}
            {/* No auth gate — MAIN shows all contact buttons whenever fields exist */}
            <View style={s.ctaWrap}>
              {!!(coach as any).email && (
                <Button
                  onPress={handleComposeLetter}
                  size="lg"
                  leftIcon={<Mail size={16} color={colors.primaryForeground} />}
                >
                  Compose Letter
                </Button>
              )}
              {!!(coach as any).email && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => openURL(`mailto:${(coach as any).email}`)}
                  leftIcon={<Mail size={14} color={colors.foreground} />}
                >
                  Email
                </Button>
              )}
              {!!(coach as any).phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => openURL(`tel:${(coach as any).phone}`)}
                  leftIcon={<Phone size={14} color={colors.foreground} />}
                >
                  Call
                </Button>
              )}
              {!!(coach as any).twitter && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() =>
                    openURL(
                      (coach as any).twitter.startsWith('http')
                        ? (coach as any).twitter
                        : `https://twitter.com/${(coach as any).twitter.replace(/^@/, '')}`,
                    )
                  }
                  leftIcon={<Twitter size={14} color={colors.foreground} />}
                >
                  Twitter
                </Button>
              )}
              {!!(coach as any).website && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => openURL((coach as any).website)}
                  leftIcon={<Globe size={14} color={colors.foreground} />}
                >
                  Website
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
      <Footer />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  muted: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
  },
  card: { marginTop: spacing.lg },
  cardContent: { padding: spacing.lg },

  headRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  headInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 24,
    color: colors.foreground,
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: `${colors.primary}20`,
    borderColor: `${colors.primary}50`,
  },
  verifiedInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: typography.fontFamily.body,
  },
  titleText: {
    color: colors.primary,
    marginTop: 2,
    fontFamily: typography.fontFamily.body,
  },
  schoolRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  schoolText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontFamily: typography.fontFamily.body,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  bio: {
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
    fontFamily: typography.fontFamily.body,
    lineHeight: 22,
  },

  statsGrid: { gap: spacing.sm, marginBottom: spacing.md },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontFamily: typography.fontFamily.body,
  },

  ctaWrap: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
