// VerificationBadgesInline — compact transcript/film verified badges used
// inline on the athlete public profile (next to the Season Statistics heading).
// Build 55 item 4.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Video } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  athleteProfileId?: string | null;
  athleteUserId?: string | null;
}

export function VerificationBadgesInline({ athleteProfileId, athleteUserId }: Props) {
  const { data: transcriptOk } = useQuery({
    queryKey: ['inline-transcript-verif', athleteUserId, athleteProfileId],
    queryFn: async () => {
      let userId = athleteUserId;
      if (!userId && athleteProfileId) {
        const { data: p } = await supabase
          .from('player_profiles' as any)
          .select('user_id')
          .eq('id', athleteProfileId)
          .maybeSingle();
        userId = (p as any)?.user_id ?? null;
      }
      if (!userId) return false;
      const { data: transcripts } = await supabase
        .from('academic_transcripts' as any)
        .select('id')
        .eq('user_id', userId);
      const ids = (transcripts || []).map((t: any) => t.id);
      if (!ids.length) return false;
      const { data: verifs } = await supabase
        .from('transcript_verifications' as any)
        .select('id')
        .in('transcript_id', ids)
        .eq('verification_status', 'verified')
        .eq('is_expired', false)
        .limit(1);
      return (verifs || []).length > 0;
    },
    enabled: !!(athleteProfileId || athleteUserId),
  });

  const { data: filmOk } = useQuery({
    queryKey: ['inline-film-verif', athleteProfileId],
    queryFn: async () => {
      if (!athleteProfileId) return false;
      const { data } = await supabase
        .from('media_verifications' as any)
        .select('id')
        .eq('athlete_profile_id', athleteProfileId)
        .eq('is_verified', true)
        .limit(1);
      return (data || []).length > 0;
    },
    enabled: !!athleteProfileId,
  });

  if (!transcriptOk && !filmOk) return null;

  return (
    <View style={s.row}>
      {transcriptOk ? (
        <Badge variant="outline">
          <View style={s.inner}>
            <GraduationCap size={12} color={colors.primary} />
            <Text style={s.text}>Transcript ✓</Text>
          </View>
        </Badge>
      ) : null}
      {filmOk ? (
        <Badge variant="outline">
          <View style={s.inner}>
            <Video size={12} color={colors.primary} />
            <Text style={s.text}>Film ✓</Text>
          </View>
        </Badge>
      ) : null}
    </View>
  );
}

export default VerificationBadgesInline;

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4, marginBottom: spacing.xs },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.foreground },
});
