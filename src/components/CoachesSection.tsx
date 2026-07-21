// RN port of Lovable src/components/CoachesSection.tsx.
//
// Web→RN mapping:
//   - <section>/<div>/<h*> → <View>/<Text>
//   - shadcn Button/Switch/Label → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - react-router-dom Link → navigation.navigate('CoachesTab')
//
// Behavior preserved verbatim:
//   - Query `coaches` (limit 12).
//   - Pull athlete → coach matches from useAthleteMatches.
//   - Toggle "AI Matches Only" filters to intersection of coaches ∩ matches.
//   - Sort: matched coaches first (highest match_score), otherwise slice(0, 6).
//   - Save/unsave via useSaveCoach / useRemoveSavedCoach + useSavedCoaches.
//   - Render each row through <CoachMatchCard variant="compact">.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Sparkles } from 'lucide-react-native';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { supabase } from '@/integrations/supabase/client';
import {
  useSavedCoaches,
  useSaveCoach,
  useRemoveSavedCoach,
} from '@/hooks/useSavedCoaches';
import { useAthleteMatches } from '@/hooks/useAthleteMatches';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface CoachRow {
  id: string;
  name: string | null;
  title: string | null;
  school: string | null;
  sport: string | null;
  division: string | null;
  conference: string | null;
  image_url: string | null;
  state: string | null;
  position_coached: string | null;
  email: string | null;
}

export const CoachesSection = () => {
  const navigation = useNavigation<any>();
  const [aiMatchOnly, setAiMatchOnly] = useState(false);

  const { data: coaches = [] } = useQuery<CoachRow[]>({
    queryKey: ['coaches-section-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('coaches')
        .select(
          'id, name, title, school, sport, division, conference, image_url, state, position_coached, email',
        )
        .limit(12);
      return (data as CoachRow[]) || [];
    },
  });

  const { data: matches = [] } = useAthleteMatches();
  const { data: savedCoaches = [] } = useSavedCoaches();
  const saveMutation = useSaveCoach();
  const removeMutation = useRemoveSavedCoach();

  const savedIds = useMemo(
    () => new Set((savedCoaches as any[]).map((s) => s.coach_id)),
    [savedCoaches],
  );
  const matchByCoachId = useMemo(() => {
    const map = new Map<string, any>();
    (matches as any[]).forEach((m) => map.set(m.coach_id, m));
    return map;
  }, [matches]);

  const visibleCoaches = useMemo(() => {
    const list = aiMatchOnly
      ? coaches.filter((c) => matchByCoachId.has(c.id))
      : [...coaches];
    list.sort((a, b) => {
      const ma = matchByCoachId.get(a.id);
      const mb = matchByCoachId.get(b.id);
      if (ma && !mb) return -1;
      if (!ma && mb) return 1;
      if (ma && mb) return (mb.match_score ?? 0) - (ma.match_score ?? 0);
      return 0;
    });
    return aiMatchOnly ? list : list.slice(0, 6);
  }, [coaches, aiMatchOnly, matchByCoachId]);

  if (coaches.length === 0) return null;

  const aiMatchCount = coaches.filter((c) => matchByCoachId.has(c.id)).length;

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>Coaches to Connect With</Text>
        <View style={s.headerActions}>
          {matches.length > 0 && (
            <View style={s.filterChip}>
              <Sparkles size={14} color={colors.primary} />
              <Label style={s.filterLabel}>
                AI Matches Only{aiMatchCount > 0 ? ` (${aiMatchCount})` : ''}
              </Label>
              <Switch
                value={aiMatchOnly}
                onValueChange={setAiMatchOnly}
              />
            </View>
          )}
          <Pressable
            onPress={() => {
              // Web routed to `/coaches`; the RN app exposes the coach directory
              // via `CoachSearchScreen` (used by DashboardScreen `View All`).
              try {
                navigation.navigate('CoachSearchScreen' as never);
              } catch {
                /* noop */
              }
            }}
            hitSlop={6}
          >
            <Text style={s.viewAll}>View All</Text>
          </Pressable>
        </View>
      </View>

      {visibleCoaches.length === 0 ? (
        <Text style={s.emptyText}>
          No AI matches in this list yet. Refresh your matches from the AI
          Coach Match section.
        </Text>
      ) : (
        <View style={s.list}>
          {visibleCoaches.map((coach) => {
            const isSaved = savedIds.has(coach.id);
            const match = matchByCoachId.get(coach.id);
            const scores = match
              ? {
                  match_score: match.match_score,
                  athletic_fit_score: match.athletic_fit_score,
                  program_fit_score: match.program_fit_score,
                  geographic_fit_score: match.geographic_fit_score,
                  match_reason: match.match_reason,
                  priority: match.priority,
                }
              : null;
            return (
              <CoachMatchCard
                key={coach.id}
                variant="compact"
                coach={{
                  id: coach.id,
                  name: coach.name || '',
                  title: coach.title || '',
                  school: coach.school || '',
                  division: coach.division || '',
                  conference: coach.conference || '',
                  position_coached: coach.position_coached || '',
                  email: coach.email || '',
                  image_url: coach.image_url || '',
                }}
                scores={scores}
                isSaved={isSaved}
                onToggleSave={(id: string) =>
                  isSaved
                    ? removeMutation.mutate(id)
                    : saveMutation.mutate({ coachId: id } as any)
                }
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export default CoachesSection;

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  viewAll: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },

  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  list: { gap: spacing.sm },
});
