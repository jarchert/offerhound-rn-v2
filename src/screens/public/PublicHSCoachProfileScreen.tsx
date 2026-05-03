// PublicHSCoachProfile — read-only profile for high school coaches.
// New for Build 50 (parity/2026-04-29) — universal user-card → profile flow.
//
// Loads from `high_school_coach_profiles` where id=:id AND is_published=true
// AND is_test2_account=false. Renders <NotRegisteredUser/> when row missing.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  MapPin,
  Mail,
  Phone,
  GraduationCap,
  Globe,
  Trophy,
} from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { NotRegisteredUser } from '@/components/NotRegisteredUser';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'PublicHSCoachProfile'>;

export default function PublicHSCoachProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.id;

  const { data: coach, isLoading } = useQuery({
    queryKey: ['public-hs-coach-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('high_school_coach_profiles' as any)
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .eq('is_test2_account', false)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
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
  const secondary: string[] = Array.isArray(coach.secondary_sports) ? coach.secondary_sports : [];
  const social: Record<string, any> = (coach.social_links as any) || {};

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.headRow}>
              <Avatar
                size={84}
                source={coach.image_url ? { uri: coach.image_url } : null}
                fallback={coach.name || '?'}
              />
              <View style={s.headInfo}>
                <Text style={s.name}>{coach.name}</Text>
                {!!coach.title && <Text style={s.title}>{coach.title}</Text>}
                <View style={s.badgeRow}>
                  {!!coach.school_name && <Badge variant="secondary">{coach.school_name}</Badge>}
                  {!!coach.sport && <Badge>{String(coach.sport)}</Badge>}
                  {coach.is_verified ? (
                    <Badge>
                      <View style={s.verifiedInner}>
                        <Award size={12} color={colors.primaryForeground} />
                        <Text style={s.verifiedText}>Verified</Text>
                      </View>
                    </Badge>
                  ) : null}
                </View>
              </View>
            </View>

            {!!coach.school_name && (
              <Row icon={<GraduationCap size={14} color={colors.mutedForeground} />} text={coach.school_name} />
            )}
            {!!coach.district && <Row text={`District: ${coach.district}`} />}
            {!!location && <Row icon={<MapPin size={14} color={colors.mutedForeground} />} text={location} />}
            {!!coach.conference_name && (
              <Row icon={<Trophy size={14} color={colors.mutedForeground} />} text={coach.conference_name} />
            )}
            {!!coach.position_coached && <Row text={`Position coached: ${coach.position_coached}`} />}
            {coach.years_coaching != null && (
              <Row text={`${coach.years_coaching} years coaching`} />
            )}

            {secondary.length > 0 && (
              <View style={s.badgeRow}>
                {secondary.map((sp, i) => (
                  <Badge key={i} variant="outline">{sp}</Badge>
                ))}
              </View>
            )}

            {!!coach.bio && <Text style={s.bio}>{coach.bio}</Text>}

            <View style={s.linksRow}>
              {!!coach.website && (
                <LinkBtn icon={<Globe size={14} color={colors.foreground} />} label="Website" onPress={() => { Linking.openURL(coach.website); }} />
              )}
              {!!coach.twitter && (
                <LinkBtn icon={<Globe size={14} color={colors.foreground} />} label="Twitter" onPress={() => { Linking.openURL(coach.twitter.startsWith('http') ? coach.twitter : `https://twitter.com/${coach.twitter.replace('@','')}`); }} />
              )}
              {social && typeof social === 'object' &&
                Object.entries(social).filter(([, v]) => !!v).map(([k, v]) => (
                  <LinkBtn key={k} label={k} onPress={() => { Linking.openURL(String(v)); }} />
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

function Row({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <View style={s.row}>
      {icon}
      <Text style={s.rowText}>{text}</Text>
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
  verifiedInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: colors.primaryForeground, fontSize: 11, fontFamily: typography.fontFamily.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  rowText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: 13 },
  bio: { color: colors.foreground, marginTop: spacing.md, fontFamily: typography.fontFamily.body, lineHeight: 20 },
  linksRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.md },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius?.md ?? 8 },
  linkBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  linkBtnText: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: 13 },
  linkBtnTextPrimary: { color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold },
});
