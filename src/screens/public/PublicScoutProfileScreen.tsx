// Ported from Lovable web src/pages/PublicScoutProfile.tsx (122 LOC).
// Web → RN translation:
//   - useParams → useRoute<RouteProp>().params
//   - useNavigate → useNavigation().navigate
//   - tailwind/shadcn → @/components/ui/* + StyleSheet via @/lib/theme
//   - lucide-react → lucide-react-native
//   - URLSearchParams routing string → typed nav params on the relevant stack
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Award, MapPin, Mail } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

import { useCoachProfile } from '@/hooks/useCoachProfile';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';
import { NotRegisteredUser } from '@/components/NotRegisteredUser';

type R = RouteProp<PublicProfileStackParamList, 'PublicScoutProfile'>;

export default function PublicScoutProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.scoutId || (params as any)?.id;
  const nav = useNavigation<any>();

  const { data: coachProfile } = useCoachProfile();
  const { profile: athleteProfile } = usePlayerProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();

  const isClubCoach = !!(coachProfile as any)?.is_club_coach;
  const isHSCoach = !!hsCoachProfile;
  const isCollegeCoach = !!coachProfile && !isClubCoach;
  const isCoach = !!coachProfile;
  const isAthlete = !!(athleteProfile as any)?.id;
  const isScout = !!scoutProfile;

  const { data: scout, isLoading } = useQuery({
    queryKey: ['public-scout-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('scout_profiles' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  const handleSendLetter = () => {
    if (!scout) return;
    // PORT-PENDING: Lovable web uses `navigate("/letters", { state: { coach } })` and
    // `navigate("/<role>/letters?<query>")` to seed the AI Letter Center. RN's
    // LetterComposer screen hasn't been wired to consume role-scoped scout-prefill
    // params yet; we route into the shared LetterComposer with what data we can
    // pass via params. Track via session-parity follow-up.
    const prefill = {
      recipientCategory: 'scout',
      recipientType: 'coach',
      recipientName: (scout as any).name || '',
      recipientEmail: (scout as any).email || '',
      organizationName: (scout as any).company || (scout as any).title || '',
      recipientTitle: (scout as any).title || '',
      letterType: isAthlete
        ? 'initial-interest'
        : isScout
        ? 'initial-interest'
        : 'scout-introduction',
    };
    nav.navigate('LetterComposer' as any, { prefill });
  };

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!scout) {
    return <NotRegisteredUser />;
  }

  const city = (scout as any).city as string | undefined;
  const state = (scout as any).state as string | undefined;
  const location = [city, state].filter(Boolean).join(', ');

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.headRow}>
              <Avatar
                size={80}
                source={(scout as any).profile_image_url ? { uri: (scout as any).profile_image_url } : null}
                fallback={(scout as any).name || '?'}
              />
              <View style={s.headInfo}>
                <Text style={s.name}>{(scout as any).name}</Text>
                <Text style={s.title}>{(scout as any).title || 'Scout'}</Text>
                <View style={s.badgeRow}>
                  {(scout as any).specialization && (
                    <Badge variant="secondary">{String((scout as any).specialization)}</Badge>
                  )}
                  {(scout as any).is_verified && (
                    <Badge>
                      <View style={s.verifiedInner}>
                        <Award size={12} color={colors.primaryForeground} />
                        <Text style={s.verifiedText}>Verified</Text>
                      </View>
                    </Badge>
                  )}
                </View>
              </View>
            </View>

            {!!location && (
              <View style={s.locRow}>
                <MapPin size={14} color={colors.mutedForeground} />
                <Text style={s.locText}>{location}</Text>
              </View>
            )}

            {!!(scout as any).bio && <Text style={s.bio}>{(scout as any).bio}</Text>}

            {(isCoach || isAthlete || isScout) && (
              <View style={s.ctaWrap}>
                <Button onPress={handleSendLetter} size="lg" leftIcon={<Mail size={16} color={colors.primaryForeground} />}>
                  Generate AI Letter to Scout
                </Button>
                <Text style={s.ctaHint}>
                  Compose a professional outreach letter pre-filled with this scout's info.
                </Text>
              </View>
            )}
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  card: { marginTop: spacing.lg },
  cardContent: { padding: spacing.lg },
  headRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  headInfo: { flex: 1, minWidth: 0 },
  name: { fontFamily: typography.fontFamily.heading, fontSize: 24, color: colors.foreground },
  title: { color: colors.mutedForeground, marginTop: 2, fontFamily: typography.fontFamily.body },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
  verifiedInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: colors.primaryForeground, fontSize: 11, fontFamily: typography.fontFamily.body },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  locText: { color: colors.mutedForeground, fontSize: 13, fontFamily: typography.fontFamily.body },
  bio: { color: colors.mutedForeground, marginBottom: spacing.lg, fontFamily: typography.fontFamily.body, lineHeight: 20 },
  ctaWrap: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  ctaHint: { color: colors.mutedForeground, fontSize: 12, marginTop: spacing.sm, fontFamily: typography.fontFamily.body },
});
