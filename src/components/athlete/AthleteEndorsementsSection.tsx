// AthleteEndorsementsSection — RN port of Lovable web
// src/components/athlete/AthleteEndorsementsSection.tsx (199 LOC).
//
// Renders on public athlete profile. Three blocks:
//   1. Verified Credentials (transcript + film badges)
//   2. High School Coach Endorsements (grouped)
//   3. Character Testimonials (everyone else)
//
// Translations:
//   - Card/Avatar/Badge → RN ui primitives
//   - flex-wrap + gap → RN flexWrap + rowGap/columnGap
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Star, Award, ShieldCheck, GraduationCap, Video } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  athleteProfileId: string;
}

export function AthleteEndorsementsSection({ athleteProfileId }: Props) {
  const { data: testimonials } = useQuery({
    queryKey: ['athlete-public-testimonials', athleteProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from('athlete_testimonials' as any)
        .select(
          'id, author_name, author_role, author_school, author_title, testimonial_text, overall_character_score, leadership_score, work_ethic_score, coachability_score, teamwork_score, integrity_score, years_known, created_at'
        )
        .eq('athlete_profile_id', athleteProfileId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!athleteProfileId,
  });

  const { data: transcriptVerifications } = useQuery({
    queryKey: ['athlete-public-transcript-verifs', athleteProfileId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('player_profiles' as any)
        .select('user_id')
        .eq('id', athleteProfileId)
        .maybeSingle();
      const userId = (profile as any)?.user_id;
      if (!userId) return [];
      const { data: transcripts } = await supabase
        .from('academic_transcripts' as any)
        .select('id')
        .eq('user_id', userId);
      if (!transcripts || (transcripts as any[]).length === 0) return [];
      const ids = (transcripts as any[]).map((t: any) => t.id);
      const { data } = await supabase
        .from('transcript_verifications' as any)
        .select('id, verifier_name, verifier_role, verifier_institution, badge_level, verified_at, is_expired')
        .in('transcript_id', ids)
        .eq('verification_status', 'verified')
        .eq('is_expired', false);
      return (data || []) as any[];
    },
    enabled: !!athleteProfileId,
  });

  const { data: mediaVerifications } = useQuery({
    queryKey: ['athlete-public-media-verifs', athleteProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from('media_verifications' as any)
        .select('id, media_type, verified_at, coach_notes')
        .eq('athlete_profile_id', athleteProfileId)
        .eq('is_verified', true);
      return (data || []) as any[];
    },
    enabled: !!athleteProfileId,
  });

  const hasAnyBadges =
    (transcriptVerifications && transcriptVerifications.length > 0) ||
    (mediaVerifications && mediaVerifications.length > 0);

  const hsCoachEndorsements = (testimonials || []).filter(
    (t: any) => t.author_role === 'high_school_coach'
  );
  const otherEndorsements = (testimonials || []).filter(
    (t: any) => t.author_role !== 'high_school_coach'
  );

  if (!hasAnyBadges && (!testimonials || testimonials.length === 0)) {
    return null;
  }

  return (
    <View style={s.section}>
      {hasAnyBadges && (
        <Card>
          <CardHeader>
            <View style={s.titleRow}>
              <ShieldCheck size={20} color={colors.primary} />
              <CardTitle>Verified Credentials</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <View style={s.badgeRow}>
              {transcriptVerifications?.map((v: any) => (
                <Badge key={v.id} variant="outline">
                  <View style={s.badgeInner}>
                    <GraduationCap size={14} color={colors.primary} />
                    <Text style={s.badgeText}>Transcript Verified</Text>
                    {v.badge_level && v.badge_level !== 'standard' && (
                      <Text style={s.badgeMeta}> ({v.badge_level})</Text>
                    )}
                    {v.verifier_name && (
                      <Text style={s.badgeMeta}> by {v.verifier_name}</Text>
                    )}
                  </View>
                </Badge>
              ))}
              {mediaVerifications?.map((v: any) => (
                <Badge key={v.id} variant="outline">
                  <View style={s.badgeInner}>
                    <Video size={14} color={colors.primary} />
                    <Text style={s.badgeText}>Film Verified</Text>
                  </View>
                </Badge>
              ))}
            </View>
          </CardContent>
        </Card>
      )}

      {hsCoachEndorsements.length > 0 && (
        <Card>
          <CardHeader>
            <View style={s.titleRow}>
              <Award size={20} color={colors.primary} />
              <CardTitle>High School Coach Endorsements</CardTitle>
            </View>
          </CardHeader>
          <CardContent style={s.cardBody}>
            {hsCoachEndorsements.map((t: any) => (
              <EndorsementCard key={t.id} t={t} />
            ))}
          </CardContent>
        </Card>
      )}

      {otherEndorsements.length > 0 && (
        <Card>
          <CardHeader>
            <View style={s.titleRow}>
              <Star size={20} color={colors.primary} />
              <CardTitle>Character Testimonials</CardTitle>
            </View>
          </CardHeader>
          <CardContent style={s.cardBody}>
            {otherEndorsements.map((t: any) => (
              <EndorsementCard key={t.id} t={t} />
            ))}
          </CardContent>
        </Card>
      )}
    </View>
  );
}

function EndorsementCard({ t }: { t: any }) {
  return (
    <View style={s.endorsementCard}>
      <Avatar fallback={t.author_name?.charAt(0) || 'C'} size={40} />
      <View style={s.endorsementBody}>
        <View style={s.endorsementHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.authorName}>{t.author_name}</Text>
            {(t.author_title || t.author_school) && (
              <Text style={s.authorMeta}>
                {[t.author_title, t.author_school].filter(Boolean).join(' • ')}
              </Text>
            )}
          </View>
          {t.overall_character_score != null && (
            <View style={s.scoreRow}>
              <Star size={16} color={colors.primary} fill={colors.primary} />
              <Text style={s.score}>{Number(t.overall_character_score).toFixed(1)}</Text>
              <Text style={s.scoreMax}>/10</Text>
            </View>
          )}
        </View>
        <Text style={s.body}>{t.testimonial_text}</Text>
        {t.years_known != null && (
          <Text style={s.known}>
            Known for {t.years_known} year{t.years_known === 1 ? '' : 's'}
          </Text>
        )}
      </View>
    </View>
  );
}

export default AthleteEndorsementsSection;

const s = StyleSheet.create({
  section: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badgeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.foreground },
  badgeMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  cardBody: { gap: spacing.md },
  endorsementCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  endorsementBody: { flex: 1, gap: spacing.xs },
  endorsementHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  authorName: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  authorMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  score: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primary },
  scoreMax: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, lineHeight: 20 },
  known: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 4 },
});
