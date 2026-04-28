// CampNPSCapture — simple 0–10 NPS rating capture for post-camp feedback.
// Persists to camp_nps_responses (best-effort) and locks after submission.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Star, Check } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  campId: string;
  enrollmentId: string;
  athleteUserId?: string | null;
}

export default function CampNPSCapture({ campId, enrollmentId, athleteUserId }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (score == null) return;
    setBusy(true);
    try {
      await supabase.from('camp_nps_responses' as any).insert({
        camp_id: campId,
        enrollment_id: enrollmentId,
        athlete_user_id: athleteUserId ?? null,
        score,
        comment: comment.trim() || null,
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent style={s.body}>
          <View style={s.iconRow}>
            <Check size={20} color={colors.success} />
            <Text style={s.h}>Thanks for the feedback!</Text>
          </View>
          <Text style={s.muted}>Your rating helps us improve future camps.</Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent style={s.body}>
        <View style={s.iconRow}>
          <Star size={20} color={colors.primary} />
          <Text style={s.h}>How likely are you to recommend this camp?</Text>
        </View>
        <Text style={s.muted}>0 = Not likely · 10 = Extremely likely</Text>
        <View style={s.scoreRow}>
          {Array.from({ length: 11 }, (_, i) => i).map(i => (
            <Pressable
              key={i}
              onPress={() => setScore(i)}
              style={[s.chip, score === i && s.chipActive]}>
              <Text style={[s.chipText, score === i && s.chipTextActive]}>{i}</Text>
            </Pressable>
          ))}
        </View>
        <Textarea
          value={comment}
          onChangeText={setComment}
          placeholder="What stood out (optional)"
        />
        <Button onPress={submit} disabled={score == null || busy}>
          {busy ? 'Submitting…' : 'Submit rating'}
        </Button>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  body: { gap: spacing.sm, padding: spacing.md },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  h: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: spacing.xs },
  chip: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  chipTextActive: { color: colors.primaryForeground },
});
