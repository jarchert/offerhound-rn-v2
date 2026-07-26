// RN port of Lovable src/components/CoachMatchSuggestionFeed.tsx.
//
// Web→RN mapping:
//   - <div>/<span>/<h*>/<p>       → <View>/<Text>
//   - Tailwind className          → StyleSheet
//   - lucide-react                → lucide-react-native
//   - react-router-dom (Link/useNavigate) → @react-navigation/native
//   - shadcn Card/Badge/Button    → @/components/ui/*
//   - AthleteMatchCard (web)      → AthleteMatchCard (already ported)
//   - LetterButton (web-only, popover w/ options)
//                                 → useLetterCenter.goToLetterForAthlete wired
//                                   through AthleteMatchCard's `onContact` prop.
//                                   The web popover for "override letter type"
//                                   is not carried over — RN LetterComposer
//                                   accepts the same seed via route params.
//
// Query shape:
//   Web does two queries: coach_athlete_matches (matches) + player_profiles
//   (athletes). RN already has `useCoachAthleteMatches()` that joins
//   `athlete:player_profiles(...)` in one round-trip. We reuse it here
//   instead of duplicating the split-query logic.

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, ArrowRight } from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AthleteMatchCard } from '@/components/athlete/AthleteMatchCard';
import { useCoachAthleteMatches } from '@/hooks/useAthleteMatches';
import { useLetterCenter } from '@/hooks/useLetterCenter';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface CoachMatchSuggestionFeedProps {
  variant?: 'compact' | 'full';
  maxItems?: number;
}

export const CoachMatchSuggestionFeed = ({
  variant = 'compact',
  maxItems = 5,
}: CoachMatchSuggestionFeedProps) => {
  const navigation = useNavigation<any>();
  const { data: matches, isLoading } = useCoachAthleteMatches();
  const { goToLetterForAthlete } = useLetterCenter();

  const goToAll = () => {
    // Coach doesn't have a dedicated Matches tab — Pipeline surfaces the full
    // roster/matches flow. Fall back to a root-level AthleteSearch push if the
    // caller is embedded outside a Coach tab context.
    try {
      navigation.navigate('CoachTabs', { screen: 'PipelineTab' });
    } catch {
      navigation.navigate('AthleteSearch' as never);
    }
  };

  // ─── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.centered}>
          <ActivityIndicator color={colors.mutedForeground} />
        </CardContent>
      </Card>
    );
  }

  const displayMatches = (matches || []).slice(0, maxItems);

  // ─── Empty ─────────────────────────────────────────────────
  if (displayMatches.length === 0) {
    return (
      <Card style={s.emptyCard}>
        <CardContent style={s.emptyContent}>
          <View style={s.emptyIconBubble}>
            <Users size={24} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>Athlete Match Suggestions</Text>
          <Text style={s.emptyBody}>
            AI-powered athlete matches based on your program needs, position gaps,
            and recruiting criteria will appear here.
          </Text>
          <Button
            variant="outline"
            size="sm"
            onPress={goToAll}
            rightIcon={<ArrowRight size={14} color={colors.foreground} />}
          >
            View Matches
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topScore = displayMatches[0]?.match_score || 0;
  const avgScore = Math.round(
    displayMatches.reduce((sum, m) => sum + m.match_score, 0) /
      displayMatches.length,
  );

  return (
    <Card>
      <CardHeader style={s.header}>
        <View style={s.titleRow}>
          <Users size={20} color={colors.primary} />
          <CardTitle>Top Athlete Matches</CardTitle>
          <Badge variant="secondary">{String(displayMatches.length)}</Badge>
        </View>
        <Pressable
          onPress={goToAll}
          accessibilityRole="button"
          hitSlop={6}
          style={s.viewAllBtn}
        >
          <Text style={s.viewAllText}>View All</Text>
          <ArrowRight size={14} color={colors.foreground} />
        </Pressable>
      </CardHeader>

      <CardContent style={s.body}>
        {displayMatches.map((match) => (
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
            onContact={() =>
              goToLetterForAthlete(
                {
                  id: match.athlete?.id,
                  full_name: match.athlete?.full_name,
                  school: match.athlete?.school,
                },
                { surface: 'coach-match-suggestion-feed' },
              )
            }
            onMessage={() =>
              navigation.navigate('Messages' as never, {
                athleteProfileId: match.athlete?.id,
                athleteName: match.athlete?.full_name || '',
              } as never)
            }
          />
        ))}

        {/* Summary stats — same content as web's flex-row */}
        <View style={s.statsRow}>
          <Text style={s.statText}>Best match: {topScore}%</Text>
          <Text style={s.statText}>Avg: {avgScore}%</Text>
        </View>
      </CardContent>
    </Card>
  );
};

export default CoachMatchSuggestionFeed;

const s = StyleSheet.create({
  centered: { paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },

  emptyCard: { borderStyle: 'dashed' as any },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    maxWidth: 360,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  viewAllText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },

  body: { gap: spacing.sm },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
});
