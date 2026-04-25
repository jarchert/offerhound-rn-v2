// HSCoachEndorsementComposer — RN port of Lovable
// src/components/hs-coach/HSCoachEndorsementComposer.tsx
// Verbatim port, web→RN mappings:
//   - Card / CardContent / CardHeader / CardTitle / CardDescription → RN Card primitives
//   - Button / Textarea / Label / Select / Avatar → RN ui primitives
//   - shadcn Input (years known) → RN <Input> (numeric keyboard)
//   - lucide-react → lucide-react-native
//   - useToast() shim → react-native-toast-message
//   - className + tailwind → StyleSheet + inline dynamic styles
//   - No CSS grid: "md:grid-cols-2" for Strengths/Growth → flex row that wraps on
//     narrow widths (parity with sm breakpoint).
//   - <KeyboardAvoidingView> wraps the whole composer so the on-screen keyboard
//     does not occlude the active textarea.
//   - line-clamp-2 → numberOfLines={2}
//   - hover:scale-110 transition-transform → no hover on RN (intentional gap).
//
// GAPS_IN_LOVABLE captured during port:
//   * Web hover-scale on stars is not reproduced (RN has no hover state).
//   * Web grid breakpoints (md:grid-cols-2) are approximated with flex-wrap.
//   * Supabase shape and queryKeys are preserved verbatim for behaviour parity.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/hooks/use-toast';
import { Star, Award, Loader2, MessageSquare } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

const SCORE_CATEGORIES = [
  { key: 'leadership_score', label: 'Leadership' },
  { key: 'work_ethic_score', label: 'Work Ethic' },
  { key: 'coachability_score', label: 'Coachability' },
  { key: 'teamwork_score', label: 'Teamwork' },
  { key: 'integrity_score', label: 'Integrity' },
] as const;

type ScoreKey = (typeof SCORE_CATEGORIES)[number]['key'];

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n)}
          accessibilityRole="button"
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          hitSlop={6}
        >
          <Star
            size={24}
            color={n <= value ? colors.primary : colors.mutedForeground}
            fill={n <= value ? colors.primary : 'transparent'}
            opacity={n <= value ? 1 : 0.4}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function HSCoachEndorsementComposer() {
  const { user } = useAuth();
  const { data: hsProfile } = useHSCoachProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    leadership_score: 0,
    work_ethic_score: 0,
    coachability_score: 0,
    teamwork_score: 0,
    integrity_score: 0,
  });
  const [testimonialText, setTestimonialText] = useState('');
  const [strengths, setStrengths] = useState('');
  const [growth, setGrowth] = useState('');
  const [additional, setAdditional] = useState('');
  const [yearsKnown, setYearsKnown] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: rosterAthletes } = useQuery({
    queryKey: ['hs-coach-endorsement-roster', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('team_rosters')
        .select(
          'athlete_profile_id, athlete_name, position, jersey_number, teams!inner(coach_user_id), player_profiles:athlete_profile_id(id, full_name, profile_image_url, position, school)',
        )
        .eq('teams.coach_user_id', user.id)
        .not('athlete_profile_id', 'is', null)
        .neq('status', 'removed');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: existingEndorsements } = useQuery({
    queryKey: ['hs-coach-endorsements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('athlete_testimonials')
        .select(
          'id, athlete_profile_id, overall_character_score, testimonial_text, created_at, player_profiles:athlete_profile_id(full_name, profile_image_url)',
        )
        .eq('author_user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user || !hsProfile) return;
    if (!selectedAthleteId) {
      toast({ title: 'Select an athlete', variant: 'destructive' });
      return;
    }
    if (!testimonialText.trim() || testimonialText.trim().length < 30) {
      toast({
        title: 'Endorsement text required (min 30 chars)',
        variant: 'destructive',
      });
      return;
    }
    const allScored = SCORE_CATEGORIES.every((c) => scores[c.key] > 0);
    if (!allScored) {
      toast({
        title: 'Please rate all 5 character categories',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('athlete_testimonials').insert({
        athlete_profile_id: selectedAthleteId,
        author_user_id: user.id,
        author_role: 'high_school_coach',
        author_name: hsProfile.name,
        author_title: hsProfile.title,
        author_school: hsProfile.school_name,
        leadership_score: scores.leadership_score,
        work_ethic_score: scores.work_ethic_score,
        coachability_score: scores.coachability_score,
        teamwork_score: scores.teamwork_score,
        integrity_score: scores.integrity_score,
        testimonial_text: testimonialText.trim(),
        strengths_comment: strengths.trim() || null,
        areas_for_growth_comment: growth.trim() || null,
        additional_comments: additional.trim() || null,
        relationship_to_athlete: 'High School Coach',
        years_known: yearsKnown ? parseInt(yearsKnown, 10) : null,
        is_visible: true,
      });
      if (error) throw error;
      toast({
        title: 'Endorsement submitted',
        description:
          "Your character endorsement has been recorded for this athlete.",
      });
      setSelectedAthleteId('');
      setScores({
        leadership_score: 0,
        work_ethic_score: 0,
        coachability_score: 0,
        teamwork_score: 0,
        integrity_score: 0,
      });
      setTestimonialText('');
      setStrengths('');
      setGrowth('');
      setAdditional('');
      setYearsKnown('');
      queryClient.invalidateQueries({ queryKey: ['hs-coach-endorsements'] });
    } catch (e: any) {
      toast({
        title: 'Could not submit endorsement',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <CardHeader>
            <CardTitle style={styles.titleRow}>
              <Award size={20} color={colors.primary} />
              <Text style={styles.titleText}>  Athlete Endorsement</Text>
            </CardTitle>
            <CardDescription>
              Provide a character endorsement for an athlete on your roster. Your
              rating and notes will appear on the athlete's profile and help
              college recruiters evaluate them.
            </CardDescription>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <View style={styles.fieldGroup}>
              <Label>Select Roster Athlete</Label>
              <Select
                value={selectedAthleteId}
                onValueChange={setSelectedAthleteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an athlete to endorse..." />
                </SelectTrigger>
                <SelectContent>
                  {(rosterAthletes || []).length === 0 && (
                    <SelectItem value="none">
                      No roster athletes with profiles
                    </SelectItem>
                  )}
                  {(rosterAthletes || []).map((r: any) => (
                    <SelectItem
                      key={r.athlete_profile_id}
                      value={r.athlete_profile_id}
                    >
                      {(r.player_profiles?.full_name || r.athlete_name) +
                        (r.position ? ` • ${r.position}` : '') +
                        (r.jersey_number ? ` • #${r.jersey_number}` : '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            <View style={styles.ratingsBlock}>
              <Text style={styles.ratingsLabel}>Character Ratings (1-5 stars)</Text>
              {SCORE_CATEGORIES.map((cat) => (
                <View key={cat.key} style={styles.ratingRow}>
                  <Label style={styles.ratingRowLabel}>{cat.label}</Label>
                  <StarRow
                    value={scores[cat.key]}
                    onChange={(v) =>
                      setScores((s) => ({ ...s, [cat.key]: v }))
                    }
                  />
                </View>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <Label>Endorsement Statement *</Label>
              <Textarea
                value={testimonialText}
                onChangeText={setTestimonialText}
                numberOfLines={4}
                multiline
                placeholder="Provide a written endorsement of this athlete's character, work ethic, and recruitability..."
              />
              <Text style={styles.helperText}>
                {testimonialText.length} characters (minimum 30)
              </Text>
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.fieldGroup, styles.twoColItem]}>
                <Label>Strengths</Label>
                <Textarea
                  value={strengths}
                  onChangeText={setStrengths}
                  numberOfLines={3}
                  multiline
                  placeholder="What stands out about this athlete?"
                />
              </View>
              <View style={[styles.fieldGroup, styles.twoColItem]}>
                <Label>Areas for Growth</Label>
                <Textarea
                  value={growth}
                  onChangeText={setGrowth}
                  numberOfLines={3}
                  multiline
                  placeholder="What is this athlete still developing?"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Label>Additional Notes (open field)</Label>
              <Textarea
                value={additional}
                onChangeText={setAdditional}
                numberOfLines={3}
                multiline
                placeholder="Any additional context for college coaches — leadership moments, off-field involvement, family, academics..."
              />
            </View>

            <View style={styles.submitRow}>
              <View style={styles.yearsField}>
                <Label>Years Known</Label>
                <Input
                  keyboardType="number-pad"
                  value={yearsKnown}
                  onChangeText={setYearsKnown}
                />
              </View>
              <View style={styles.submitButtonWrap}>
                <Button onPress={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <View style={styles.btnInner}>
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                      <Text style={styles.btnLabel}>  Submitting...</Text>
                    </View>
                  ) : (
                    <View style={styles.btnInner}>
                      <Award size={16} color={colors.primaryForeground} />
                      <Text style={styles.btnLabel}>  Submit Endorsement</Text>
                    </View>
                  )}
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>

        <Card style={styles.spacer}>
          <CardHeader>
            <CardTitle style={styles.titleRow}>
              <MessageSquare size={20} color={colors.foreground} />
              <Text style={styles.titleText}>
                  Your Endorsements ({existingEndorsements?.length || 0})
              </Text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!existingEndorsements || existingEndorsements.length === 0 ? (
              <Text style={styles.emptyText}>
                You haven't submitted any endorsements yet.
              </Text>
            ) : (
              <View style={styles.endorsementList}>
                {existingEndorsements.map((e: any) => (
                  <View key={e.id} style={styles.endorsementItem}>
                    <Avatar
                      source={
                        e.player_profiles?.profile_image_url
                          ? { uri: e.player_profiles.profile_image_url }
                          : undefined
                      }
                      fallback={
                        e.player_profiles?.full_name?.charAt(0) || 'A'
                      }
                      size={40}
                    />
                    <View style={styles.endorsementBody}>
                      <View style={styles.endorsementHeader}>
                        <Text style={styles.endorsementName}>
                          {e.player_profiles?.full_name}
                        </Text>
                        <View style={styles.scoreBadge}>
                          <Star
                            size={12}
                            color={colors.primary}
                            fill={colors.primary}
                          />
                          <Text style={styles.scoreBadgeText}>
                            {Number(e.overall_character_score || 0).toFixed(1)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={styles.endorsementText}
                        numberOfLines={2}
                      >
                        {e.testimonial_text}
                      </Text>
                      <Text style={styles.endorsementDate}>
                        {new Date(e.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  spacer: {
    marginTop: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    color: colors.foreground,
    fontSize: typography.size.lg,
    fontWeight: '600',
  },
  cardContent: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  starRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  ratingsBlock: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.95,
  },
  ratingsLabel: {
    fontSize: typography.size.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ratingRowLabel: {
    fontSize: typography.size.sm,
  },
  helperText: {
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  twoColItem: {
    flexGrow: 1,
    flexBasis: 240,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  yearsField: {
    width: 160,
    gap: spacing.xs,
  },
  submitButtonWrap: {
    flex: 1,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  endorsementList: {
    gap: spacing.sm,
  },
  endorsementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.95,
  },
  endorsementBody: {
    flex: 1,
    minWidth: 0,
  },
  endorsementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  endorsementName: {
    fontWeight: '500',
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: '500',
    color: colors.primary,
  },
  endorsementText: {
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  endorsementDate: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
  },
});
