// Ported from Lovable src/components/CoachMatchSuggestionFeed.tsx.
// Top athlete match preview for coach dashboard. Uses AthleteMatchCard
// compact variant. LetterButton web-only; we pass a simple "Write letter"
// Pressable as the letterSlot equivalent.
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Users, ArrowRight, Mail } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AthleteMatchCard } from '@/components/athlete/AthleteMatchCard';
import { useLetterCenter } from '@/hooks/useLetterCenter';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface MatchWithAthlete {
  id: string;
  match_score: number;
  match_reason: string | null;
  priority: string | null;
  athletic_fit_score: number | null;
  academic_fit_score: number | null;
  geographic_fit_score: number | null;
  position_fit_score: number | null;
  athlete_profile_id: string;
  athlete?: {
    id: string;
    full_name: string | null;
    position: string | null;
    school: string | null;
    graduation_year: string | null;
    city: string | null;
    state: string | null;
    profile_image_url: string | null;
    gpa: string | null;
  };
}

export function CoachMatchSuggestionFeed({
  maxItems = 5,
}: {
  variant?: string;
  maxItems?: number;
}) {
  const { user } = useAuth();
  const nav = useNavigation<NavigationProp<any>>();
  const { goToLetterForAthlete } = useLetterCenter();

  const { data: matches, isLoading } = useQuery({
    queryKey: ['coach-match-preview', user?.id],
    queryFn: async () => {
      if (!user) return [] as MatchWithAthlete[];
      const { data, error } = await supabase
        .from('coach_athlete_matches' as any)
        .select(
          'id, match_score, match_reason, priority, athletic_fit_score, academic_fit_score, geographic_fit_score, position_fit_score, athlete_profile_id'
        )
        .eq('coach_user_id', user.id)
        .eq('is_dismissed', false)
        .order('match_score', { ascending: false })
        .limit(maxItems);
      if (error) throw error;
      if (!data || data.length === 0) return [] as MatchWithAthlete[];
      const profileIds = (data as any[]).map((m) => m.athlete_profile_id);
      const { data: profiles } = await supabase
        .from('player_profiles' as any)
        .select(
          'id, full_name, position, school, graduation_year, city, state, profile_image_url, gpa'
        )
        .in('id', profileIds);
      const profileMap = new Map(
        ((profiles as any[]) || []).map((p) => [p.id, p])
      );
      return (data as any[]).map((m) => ({
        ...m,
        athlete: profileMap.get(m.athlete_profile_id),
      })) as MatchWithAthlete[];
    },
    enabled: !!user,
  });

  const goMatches = useCallback(() => nav.navigate('AthleteTabs' as never, { screen: 'MatchesTab' } as never), [nav]);

  if (isLoading) {
    return (
      <View style={s.card}>
        <View style={s.centerRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <View style={[s.card, s.dashed]}>
        <View style={s.iconBubble}>
          <Users color={colors.primary} size={22} />
        </View>
        <Text style={s.emptyTitle}>Athlete Match Suggestions</Text>
        <Text style={s.emptyBody}>
          AI-powered athlete matches based on your program needs, position gaps,
          and recruiting criteria will appear here.
        </Text>
        <Pressable style={s.btnOutline} onPress={goMatches}>
          <Text style={s.btnOutlineText}>View Matches</Text>
          <ArrowRight color={colors.primary} size={14} />
        </Pressable>
      </View>
    );
  }

  const topScore = matches[0]?.match_score || 0;
  const avg = Math.round(
    matches.reduce((sum, m) => sum + m.match_score, 0) / matches.length
  );

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Users color={colors.primary} size={18} />
          <Text style={s.headerTitle}>Top Athlete Matches</Text>
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{matches.length}</Text>
          </View>
        </View>
        <Pressable style={s.viewAll} onPress={goMatches} hitSlop={6}>
          <Text style={s.viewAllText}>View All</Text>
          <ArrowRight color={colors.primary} size={14} />
        </Pressable>
      </View>

      <View style={{ gap: spacing.sm }}>
        {matches.map((match) => (
          <AthleteMatchCard
            key={match.id}
            variant="compact"
            athlete={{
              id: match.athlete?.id || match.athlete_profile_id,
              full_name: match.athlete?.full_name,
              position: match.athlete?.position,
              school: match.athlete?.school,
              graduation_year: match.athlete?.graduation_year,
              city: match.athlete?.city,
              state: match.athlete?.state,
              profile_image_url: match.athlete?.profile_image_url,
            }}
            scores={{
              match_score: match.match_score,
              athletic_fit_score: match.athletic_fit_score,
              academic_fit_score: match.academic_fit_score,
              geographic_fit_score: match.geographic_fit_score,
              match_reason: match.match_reason,
              priority: match.priority || undefined,
            }}
            letterSlot={
              <Pressable
                style={s.letterBtn}
                onPress={() =>
                  goToLetterForAthlete(match.athlete as any, {
                    surface: 'coach-match-suggestion-feed',
                  })
                }
              >
                <Mail color={colors.primaryForeground} size={12} />
                <Text style={s.letterBtnText}>Letter</Text>
              </Pressable>
            }
            onMessage={() =>
              (nav as any).navigate('Messages', {
                athleteProfileId: match.athlete?.id,
                athleteName: match.athlete?.full_name || '',
              })
            }
          />
        ))}
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>Best match: {topScore}%</Text>
        <Text style={s.footerText}>Avg: {avg}%</Text>
      </View>
    </View>
  );
}

export default CoachMatchSuggestionFeed;

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dashed: {
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  centerRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.size.base,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  btnOutline: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  btnOutlineText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
    fontSize: typography.size.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    color: colors.foreground,
    fontSize: typography.heading.h5,
    letterSpacing: typography.letterSpacing.heading,
  },
  countBadge: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: 10,
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
    fontSize: typography.size.sm,
  },
  letterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  letterBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primaryForeground,
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.xs,
  },
});
