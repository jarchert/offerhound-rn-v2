// PublicCoachProfileScreen — analogous to PublicScoutProfileScreen.
// Resolves a coach by id OR user_id so AthleteCard/CoachCard taps from any
// search/match surface land on a real profile instead of "profile not found".
// parity/2026-04-29 #6 (coach-side tap-to-profile).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Award, MapPin, Mail, GraduationCap, Share2 } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

import { NotRegisteredUser } from '@/components/NotRegisteredUser';

import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'PublicCoachProfile'>;

export default function PublicCoachProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.coachId || (params as any)?.id;
  const nav = useNavigation<any>();

  const { profile: athleteProfile } = usePlayerProfile();
  const { data: viewerCoachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();
  const isAthlete = !!(athleteProfile as any)?.id;
  const isCoach = !!viewerCoachProfile;
  const isScout = !!scoutProfile;
  const isHSCoach = !!hsCoachProfile;

  const { data: coach, isLoading } = useQuery({
    queryKey: ['public-coach-profile', id],
    queryFn: async () => {
      if (!id) return null;
      // Try by primary id, then by user_id — cards in the app pass either
      // depending on the source surface.
      let { data } = await supabase
        .from('coach_profiles' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!data) {
        const res = await supabase
          .from('coach_profiles' as any)
          .select('*')
          .eq('user_id', id)
          .maybeSingle();
        data = res.data;
      }
      return data as any;
    },
    enabled: !!id,
  });

  const [shareCardOpen, setShareCardOpen] = React.useState(false);

  const handleSendLetter = () => {
    if (!coach) return;
    const prefill = {
      recipientCategory: 'coach',
      recipientType: 'coach',
      recipientName: coach.name || '',
      recipientEmail: coach.email || '',
      organizationName: coach.school || coach.organization || '',
      recipientTitle: coach.title || coach.position || 'Coach',
      letterType: isAthlete ? 'initial-interest' : 'coach-introduction',
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
  if (!coach) {
    return <NotRegisteredUser />;
  }

  const city = (coach as any).city as string | undefined;
  const state = (coach as any).state as string | undefined;
  const location = [city, state].filter(Boolean).join(', ');
  const school = (coach as any).school || (coach as any).organization;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.headRow}>
              <Avatar
                size={80}
                source={(coach as any).profile_image_url ? { uri: (coach as any).profile_image_url } : null}
                fallback={(coach as any).name || '?'}
              />
              <View style={s.headInfo}>
                <Text style={s.name}>{(coach as any).name}</Text>
                <Text style={s.title}>{(coach as any).title || (coach as any).position || 'Coach'}</Text>
                <View style={s.badgeRow}>
                  {!!school && <Badge variant="secondary">{school}</Badge>}
                  {(coach as any).sport && <Badge>{String((coach as any).sport)}</Badge>}
                  {(coach as any).is_verified && (
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

            {!!school && (
              <View style={s.locRow}>
                <GraduationCap size={14} color={colors.mutedForeground} />
                <Text style={s.locText}>{school}</Text>
              </View>
            )}

            {!!(coach as any).bio && <Text style={s.bio}>{(coach as any).bio}</Text>}

            {(isCoach || isAthlete || isScout || isHSCoach) && (
              <View style={s.ctaWrap}>
                <Button onPress={handleSendLetter} size="lg" leftIcon={<Mail size={16} color={colors.primaryForeground} />}>
                  Generate AI Letter to Coach
                </Button>
                <Text style={s.ctaHint}>
                  Compose a professional outreach letter pre-filled with this coach's info.
                </Text>
              </View>
            )}
            <ShareRoleCardDialog role="coach" open={shareCardOpen} onOpenChange={setShareCardOpen}>
              <Pressable style={s.shareBtn} onPress={() => setShareCardOpen(true)} accessibilityRole="button" accessibilityLabel="Share Coach Card">
                <Share2 size={14} color={colors.foreground} />
                <Text style={s.shareBtnText}>Share Card</Text>
              </Pressable>
            </ShareRoleCardDialog>
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
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  locText: { color: colors.mutedForeground, fontSize: 13, fontFamily: typography.fontFamily.body },
  bio: { color: colors.mutedForeground, marginBottom: spacing.lg, marginTop: spacing.sm, fontFamily: typography.fontFamily.body, lineHeight: 20 },
  ctaWrap: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  shareBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: 13, color: colors.foreground },
});
