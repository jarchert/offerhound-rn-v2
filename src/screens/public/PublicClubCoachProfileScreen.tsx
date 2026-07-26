// PublicClubCoachProfileScreen — RN port of Lovable web PublicClubCoachProfile.
// Source: offerhound-repo/src/pages/PublicClubCoachProfile.tsx (175 LOC)
//
// Web -> RN translation:
//   - useParams -> useRoute<RouteProp>().params ({ id })
//   - useQuery(club_coach_profiles + teams) -> same @tanstack/react-query + supabase
//   - tailwind/shadcn Card/Avatar/Badge/Button -> @/components/ui/*
//   - lucide-react -> lucide-react-native
//   - <Link to="/auth?redirect=/onboarding"> Connect -> nav to AuthStack{redirect}
//   - <a href={website}> -> Linking.openURL
//   - NotRegisteredUser fallback -> inline "not found" message
//   - SEO/Footer/ScrollToTop -> RN parity shims (no-op head on native)
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRoute, useNavigation, RouteProp, CommonActions } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Mail, MapPin, Trophy, Globe, Users, Lock } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type R = RouteProp<RootStackParamList, 'PublicClubCoachProfile'>;

export default function PublicClubCoachProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.id;
  const nav = useNavigation<any>();

  const { data: club, isLoading } = useQuery({
    queryKey: ['public-club-coach-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('club_coach_profiles')
        .select('*')
        .eq('id', id)
        .neq('is_active', false)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['public-club-coach-teams', club?.id],
    queryFn: async () => {
      if (!club?.id) return [];
      const { data } = await supabase
        .from('teams')
        .select('id, name, sport, age_group, level, league, gender, season, year, logo_url')
        .eq('club_coach_id', club.id)
        .neq('is_active', false)
        .order('name');
      return (data ?? []) as any[];
    },
    enabled: !!club?.id,
  });

  const goConnect = () =>
    nav.dispatch(
      CommonActions.navigate({ name: 'AuthStack' as any, params: { redirect: '/onboarding' } }),
    );

  if (isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={s.loading}>
        <Text style={s.muted}>Club coach not found.</Text>
        <Button variant="outline" onPress={() => nav.goBack()} style={{ marginTop: spacing.md }}>
          Go back
        </Button>
      </View>
    );
  }

  const initials = (club.club_name || 'C')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const location = [club.city, club.state, club.country !== 'USA' ? club.country : null]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={s.container}>
      <SEO
        title={`${club.club_name} – Club Coach | OfferHound™`}
        description={club.club_description?.slice(0, 155) || `Connect with ${club.club_name}.`}
      />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />

        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.headRow}>
              <Avatar
                size={80}
                source={club.club_logo_url ? { uri: club.club_logo_url } : null}
                fallback={initials}
              />
              <View style={s.headInfo}>
                <Text style={s.name}>{club.club_name}</Text>
                {!!location && (
                  <View style={s.locRow}>
                    <MapPin size={14} color={colors.mutedForeground} />
                    <Text style={s.locText}>{location}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.badgeRow}>
              {!!club.sport && <Badge variant="secondary">{String(club.sport)}</Badge>}
              {!!club.team_level && <Badge variant="outline">{String(club.team_level)}</Badge>}
              {!!club.age_group && <Badge variant="outline">{String(club.age_group)}</Badge>}
              {!!club.league_association && (
                <Badge variant="outline">
                  <View style={s.badgeInner}>
                    <Trophy size={12} color={colors.mutedForeground} />
                    <Text style={s.badgeInnerText}>{String(club.league_association)}</Text>
                  </View>
                </Badge>
              )}
            </View>

            {!!(club.club_description || club.bio) && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>About</Text>
                <Text style={s.bio}>{club.club_description || club.bio}</Text>
              </View>
            )}

            {teams.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionTitleRow}>
                  <Users size={16} color={colors.foreground} />
                  <Text style={s.sectionTitle}>Teams</Text>
                </View>
                <View style={s.teamsGrid}>
                  {teams.map((t) => (
                    <Card key={t.id} style={s.teamCard}>
                      <CardContent style={s.teamCardContent}>
                        <Text style={s.teamName} numberOfLines={1}>{t.name}</Text>
                        <View style={s.teamBadges}>
                          {!!t.level && <Badge variant="outline">{String(t.level)}</Badge>}
                          {!!t.age_group && <Badge variant="outline">{String(t.age_group)}</Badge>}
                          {!!t.gender && <Badge variant="outline">{String(t.gender)}</Badge>}
                        </View>
                        {!!(t.season && t.year) && (
                          <Text style={s.teamMeta}>{`${t.season} ${t.year}`}</Text>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </View>
                <View style={s.privateRow}>
                  <Lock size={12} color={colors.mutedForeground} />
                  <Text style={s.privateText}>Roster details are private</Text>
                </View>
              </View>
            )}

            <View style={s.actions}>
              <Button size="sm" onPress={goConnect} leftIcon={<Mail size={14} color={colors.primaryForeground} />}>
                Connect
              </Button>
              {!!club.website && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => Linking.openURL(club.website)}
                  leftIcon={<Globe size={14} color={colors.foreground} />}>
                  Website
                </Button>
              )}
            </View>
          </CardContent>
        </Card>

        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  muted: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.base },
  card: { marginTop: spacing.md },
  cardContent: { gap: spacing.lg, paddingVertical: spacing.lg },
  headRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  headInfo: { flex: 1, minWidth: 0 },
  name: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  locText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeInnerText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  section: { gap: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground },
  bio: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, lineHeight: 22, fontSize: typography.fontSize.base },
  teamsGrid: { gap: spacing.sm },
  teamCard: { backgroundColor: colors.secondary },
  teamCardContent: { padding: spacing.sm, gap: spacing.xs },
  teamName: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  teamBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  teamMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  privateText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
