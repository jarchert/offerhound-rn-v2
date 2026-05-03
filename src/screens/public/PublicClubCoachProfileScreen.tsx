// PublicClubCoachProfile — read-only profile for club coaches.
// New for Build 50 (parity/2026-04-29) — universal user-card → profile flow.
//
// coach_profiles where id=:id AND is_club_coach=true. Plus teams managed
// by this coach (teams.coach_user_id = coach_profiles.user_id).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Mail, Phone, Globe, Users } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { NotRegisteredUser } from '@/components/NotRegisteredUser';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'PublicClubCoachProfile'>;

export default function PublicClubCoachProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.id;

  const { data: coach, isLoading } = useQuery({
    queryKey: ['public-club-coach-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('coach_profiles' as any)
        .select('*')
        .eq('id', id)
        .eq('is_club_coach', true)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  const { data: teams } = useQuery({
    queryKey: ['public-club-coach-teams', coach?.user_id],
    queryFn: async () => {
      if (!coach?.user_id) return [];
      const { data } = await supabase
        .from('teams' as any)
        .select('id,name,age_group,sport')
        .eq('coach_user_id', coach.user_id);
      return (data as any[]) || [];
    },
    enabled: !!coach?.user_id,
  });

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

  const location = [coach.city, coach.state].filter(Boolean).join(', ');
  const social: Record<string, any> = (coach.social_links as any) || {};
  const secondary: string[] = Array.isArray(coach.secondary_sports) ? coach.secondary_sports : [];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.headRow}>
              <Avatar
                size={84}
                source={coach.profile_image_url ? { uri: coach.profile_image_url } : null}
                fallback={coach.name || '?'}
              />
              <View style={s.headInfo}>
                <Text style={s.name}>{coach.name}</Text>
                {!!coach.title && <Text style={s.title}>{coach.title}</Text>}
                <View style={s.badgeRow}>
                  {!!coach.organization && <Badge variant="secondary">{coach.organization}</Badge>}
                  {!!coach.sport && <Badge>{String(coach.sport)}</Badge>}
                  <Badge variant="outline">Club</Badge>
                </View>
              </View>
            </View>

            {!!location && (
              <View style={s.row}>
                <MapPin size={14} color={colors.mutedForeground} />
                <Text style={s.rowText}>{location}</Text>
              </View>
            )}

            {secondary.length > 0 && (
              <View style={s.badgeRow}>
                {secondary.map((sp, i) => <Badge key={i} variant="outline">{sp}</Badge>)}
              </View>
            )}

            {!!coach.bio && <Text style={s.bio}>{coach.bio}</Text>}

            {teams && teams.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Users size={14} color={colors.primary} />
                  <Text style={s.sectionTitle}>Managed Teams</Text>
                </View>
                {teams.map((t) => (
                  <View key={t.id} style={s.teamRow}>
                    <Text style={s.teamName}>{t.name}</Text>
                    {!!t.age_group && <Text style={s.teamMeta}>{t.age_group}</Text>}
                    {!!t.sport && <Text style={s.teamMeta}>{t.sport}</Text>}
                  </View>
                ))}
              </View>
            )}

            <View style={s.linksRow}>
              {social && typeof social === 'object' &&
                Object.entries(social).filter(([, v]) => !!v).map(([k, v]) => (
                  <LinkBtn key={k} icon={<Globe size={14} color={colors.foreground} />} label={k} onPress={() => { Linking.openURL(String(v)); }} />
                ))}
            </View>

            <View style={s.ctaRow}>
              {!!coach.email && (
                <LinkBtn primary icon={<Mail size={14} color={colors.primaryForeground} />} label="Email" onPress={() => { Linking.openURL(`mailto:${coach.email}`); }} />
              )}
              {!!coach.phone && (
                <LinkBtn primary icon={<Phone size={14} color={colors.primaryForeground} />} label="Call" onPress={() => { Linking.openURL(`tel:${coach.phone}`); }} />
              )}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
      <Footer />
    </View>
  );
}

function LinkBtn({ icon, label, onPress, primary }: { icon?: React.ReactNode; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable style={[s.linkBtn, primary && s.linkBtnPrimary]} onPress={onPress}>
      {icon}
      <Text style={[s.linkBtnText, primary && s.linkBtnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  card: { marginTop: spacing.lg },
  cardContent: { padding: spacing.lg },
  headRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  headInfo: { flex: 1, minWidth: 0 },
  name: { fontFamily: typography.fontFamily.heading, fontSize: 26, color: colors.foreground, letterSpacing: 0.5 },
  title: { color: colors.mutedForeground, marginTop: 2, fontFamily: typography.fontFamily.body },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  rowText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: 13 },
  bio: { color: colors.foreground, marginTop: spacing.md, fontFamily: typography.fontFamily.body, lineHeight: 20 },
  section: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold, fontSize: 15 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  teamName: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: 14, flex: 1 },
  teamMeta: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: 12 },
  linksRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.md },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius?.md ?? 8 },
  linkBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  linkBtnText: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: 13 },
  linkBtnTextPrimary: { color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold },
});
