// Ported from Lovable web src/pages/SavedCoaches.tsx (155 LOC).
// Web → RN translations:
//   - useNavigate → useNavigation()
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet via @/lib/theme
//   - shadcn lowercase → PascalCase via @/components/ui
//   - Footer/SEO removed
//   - CoachMatchCard already RN-ported in @/components/coach/CoachMatchCard
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bookmark, Edit2, Check, X } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent, Button, Textarea } from '@/components/ui';
import {
  useSavedCoaches,
  useRemoveSavedCoach,
  useUpdateSavedCoach,
} from '@/hooks/useSavedCoaches';
import { useAthleteMatches } from '@/hooks/useAthleteMatches';
import { useAuth } from '@/hooks/useAuth';
import { CoachMatchCard } from '@/components/coach/CoachMatchCard';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
export default function SavedCoachesScreen() {
  const { isAuthenticated } = useAuth() as any;
  const nav = useNavigation<any>();
  const { data: savedCoaches = [], isLoading } = useSavedCoaches();
  const { data: aiMatches = [] } = useAthleteMatches();
  const removeMutation = useRemoveSavedCoach();
  const updateMutation = useUpdateSavedCoach();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const matchByCoachId = useMemo(() => {
    const map = new Map<string, any>();
    (aiMatches as any[]).forEach((m: any) => map.set(m.coach_id, m));
    return map;
  }, [aiMatches]);

  const sortedSaved = useMemo(() => {
    return [...(savedCoaches as any[])].sort((a: any, b: any) => {
      const ma = matchByCoachId.get(a.coach?.id);
      const mb = matchByCoachId.get(b.coach?.id);
      if (ma && !mb) return -1;
      if (!ma && mb) return 1;
      if (ma && mb) return (mb.match_score ?? 0) - (ma.match_score ?? 0);
      return 0;
    });
  }, [savedCoaches, matchByCoachId]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.signinWrap}>
          <Bookmark size={48} color={colors.mutedForeground} />
          <Text style={s.signinTitle}>Sign in to view saved coaches</Text>
          <Button onPress={() => nav.navigate('AuthStack' as never)}>Sign In</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <View style={s.header}>
          <Bookmark size={28} color={colors.primary} />
          <Text style={s.title}>Saved Coaches</Text>
        </View>
        <Text style={s.lead}>Manage your bookmarked coaches and add notes.</Text>

        {isLoading ? (
          <Text style={s.loading}>Loading saved coaches...</Text>
        ) : (savedCoaches as any[]).length === 0 ? (
          <Card style={{ ...s.card, ...s.empty }}>
            <CardContent style={s.emptyBody}>
              <Bookmark size={48} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No saved coaches yet</Text>
              <Text style={s.emptyDesc}>
                Browse the Coach Directory and bookmark coaches you're interested in.
              </Text>
              <Button variant="outline" onPress={() => nav.navigate('CoachDirectory' as never)}>
                Browse Coach Directory
              </Button>
            </CardContent>
          </Card>
        ) : (
          <View style={s.list}>
            {sortedSaved.map((saved: any) => {
              const coach = saved.coach;
              if (!coach) return null;
              const isEditing = editingId === saved.id;
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
                <View key={saved.id} style={s.itemWrap}>
                  <CoachMatchCard
                    variant="compact"
                    coach={{
                      id: coach.id,
                      name: coach.name,
                      title: coach.title,
                      school: coach.school,
                      division: coach.division,
                      conference: coach.conference,
                      position_coached: coach.position_coached,
                      email: coach.email,
                      image_url: coach.image_url,
                    }}
                    scores={scores}
                    isSaved
                    onToggleSave={() => removeMutation.mutate(coach.id)}
                  />
                  {isEditing ? (
                    <View style={s.editBox}>
                      <Textarea
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder="Add notes about this coach..."
                        style={{ minHeight: 80 }}
                      />
                      <View style={s.editActions}>
                        <Button
                          size="sm"
                          variant="default"
                          leftIcon={<Check size={12} color={colors.primaryForeground} />}
                          onPress={() => {
                            updateMutation.mutate({ coachId: coach.id, notes: editNotes });
                            setEditingId(null);
                          }}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<X size={12} color={colors.foreground} />}
                          onPress={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </View>
                    </View>
                  ) : (
                    <View style={s.notesRow}>
                      {saved.notes ? (
                        <Text style={s.notesText}>"{saved.notes}"</Text>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Edit2 size={12} color={colors.foreground} />}
                        onPress={() => {
                          setEditingId(saved.id);
                          setEditNotes(saved.notes || '');
                        }}>
                        {saved.notes ? 'Edit Notes' : 'Add Notes'}
                      </Button>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {(savedCoaches as any[]).length > 0 ? (
          <Text style={s.footer}>
            {(savedCoaches as any[]).length} saved coach{(savedCoaches as any[]).length !== 1 ? 'es' : ''}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  lead: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, marginBottom: spacing.lg },
  loading: { color: colors.mutedForeground, textAlign: 'center', paddingVertical: spacing.xl },
  card: { borderRadius: radius.lg },
  empty: { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
  emptyBody: { paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  emptyDesc: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  list: { gap: spacing.sm },
  itemWrap: { gap: spacing.xs },
  editBox: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
  },
  editActions: { flexDirection: 'row', gap: spacing.sm },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: 4 },
  notesText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    backgroundColor: colors.muted,
    padding: spacing.sm,
    borderRadius: radius.sm,
    fontStyle: 'italic',
  },
  footer: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  signinWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  signinTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
});
