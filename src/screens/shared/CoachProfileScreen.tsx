// CoachProfileScreen — RN port of Lovable web CoachProfile page.
// Source: offerhound-repo/src/pages/CoachProfile.tsx (205 LOC)
//
// Web → RN translation:
//   - useParams → useRoute<RouteProp>().params ({ id })
//   - useQuery(coaches by id) → same @tanstack/react-query + supabase
//   - tailwind/shadcn Card/Avatar/Badge/Button → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - <Link to="/letters?..."> Compose Letter → navigate LetterComposer{seed}
//   - <a href="mailto:/tel:/https"> → Linking.openURL
//   - NotRegisteredUser fallback → inline "Coach not found" message
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  MessageCircle as Twitter,
  Camera as Instagram,
  Link as Linkedin,
  Globe,
  Building2,
  CheckCircle2,
} from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type R = RouteProp<RootStackParamList, 'CoachProfile'>;

export default function CoachProfileScreen() {
  const { params } = useRoute<R>();
  const id = params?.id;
  const nav = useNavigation<any>();

  const { data: coach, isLoading } = useQuery({
    queryKey: ['coach-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('coaches').select('*').eq('id', id).maybeSingle();
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
    return (
      <View style={s.loading}>
        <Text style={s.muted}>Coach not found.</Text>
        <Button variant="outline" onPress={() => nav.goBack()} style={{ marginTop: spacing.md }}>
          Go back
        </Button>
      </View>
    );
  }

  const location = [coach.city, coach.state].filter(Boolean).join(', ');
  const initials = coach.name?.charAt(0) || 'C';
  const verified = coach.verification_status === 'verified';

  const composeLetter = () => {
    // Web: <Link to="/letters?coachName=...&coachEmail=...&coachSchool=...&coachTitle=...">
    // RN: shared LetterComposer consumes a { seed } param.
    nav.navigate('LetterComposer', {
      seed: {
        recipientName: coach.name || '',
        schoolName: coach.school || '',
      },
    });
  };

  const twitterUrl = coach.twitter
    ? coach.twitter.startsWith('http')
      ? coach.twitter
      : `https://twitter.com/${String(coach.twitter).replace(/^@/, '')}`
    : null;
  const instagramUrl = coach.instagram
    ? coach.instagram.startsWith('http')
      ? coach.instagram
      : `https://instagram.com/${String(coach.instagram).replace(/^@/, '')}`
    : null;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />

        <Card style={s.card}>
          <CardContent style={s.cardContent}>
            <View style={s.headRow}>
              <Avatar
                size={80}
                source={coach.image_url ? { uri: coach.image_url } : null}
                fallback={initials}
              />
              <View style={s.headInfo}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{coach.name}</Text>
                  {verified && (
                    <Badge>
                      <View style={s.verifiedInner}>
                        <CheckCircle2 size={12} color={colors.primaryForeground} />
                        <Text style={s.verifiedText}>Verified</Text>
                      </View>
                    </Badge>
                  )}
                </View>
                {!!coach.title && <Text style={s.title}>{coach.title}</Text>}
                {!!coach.school && (
                  <View style={s.schoolRow}>
                    <Building2 size={14} color={colors.mutedForeground} />
                    <Text style={s.schoolText}>{coach.school}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.badgeRow}>
              {!!coach.division && <Badge variant="secondary">{String(coach.division)}</Badge>}
              {!!coach.conference && <Badge variant="outline">{String(coach.conference)}</Badge>}
              {!!coach.sport && <Badge variant="outline">{String(coach.sport)}</Badge>}
              {!!coach.position_coached && (
                <Badge variant="outline">{`Coaches: ${coach.position_coached}`}</Badge>
              )}
            </View>

            {!!coach.bio && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>About</Text>
                <Text style={s.bio}>{coach.bio}</Text>
              </View>
            )}

            <View style={s.metaGrid}>
              {!!location && (
                <View style={s.metaRow}>
                  <MapPin size={14} color={colors.mutedForeground} />
                  <Text style={s.metaText}>{location}</Text>
                </View>
              )}
              {typeof coach.years_experience === 'number' && (
                <View style={s.metaRow}>
                  <GraduationCap size={14} color={colors.mutedForeground} />
                  <Text style={s.metaText}>{`${coach.years_experience} years experience`}</Text>
                </View>
              )}
            </View>

            <View style={s.actions}>
              {!!coach.email && (
                <Button size="sm" onPress={composeLetter} leftIcon={<Mail size={14} color={colors.primaryForeground} />}>
                  Compose Letter
                </Button>
              )}
              {!!coach.email && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => Linking.openURL(`mailto:${coach.email}`)}
                  leftIcon={<Mail size={14} color={colors.foreground} />}>
                  Email
                </Button>
              )}
              {!!coach.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => Linking.openURL(`tel:${coach.phone}`)}
                  leftIcon={<Phone size={14} color={colors.foreground} />}>
                  Call
                </Button>
              )}
              {!!coach.linkedin_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => Linking.openURL(coach.linkedin_url)}
                  leftIcon={<Linkedin size={14} color={colors.foreground} />}>
                  LinkedIn
                </Button>
              )}
              {!!twitterUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => Linking.openURL(twitterUrl)}
                  leftIcon={<Twitter size={14} color={colors.foreground} />}>
                  Twitter
                </Button>
              )}
              {!!instagramUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => Linking.openURL(instagramUrl)}
                  leftIcon={<Instagram size={14} color={colors.foreground} />}>
                  Instagram
                </Button>
              )}
              {!!coach.source_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => Linking.openURL(coach.source_url)}
                  leftIcon={<Globe size={14} color={colors.foreground} />}>
                  Staff Page
                </Button>
              )}
            </View>
          </CardContent>
        </Card>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  name: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground },
  title: { fontFamily: typography.fontFamily.body, color: colors.primary, marginTop: 2 },
  schoolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  schoolText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  verifiedInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.primaryForeground },
  section: { gap: spacing.xs },
  sectionTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, color: colors.foreground },
  bio: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, lineHeight: 22, fontSize: typography.fontSize.base },
  metaGrid: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
