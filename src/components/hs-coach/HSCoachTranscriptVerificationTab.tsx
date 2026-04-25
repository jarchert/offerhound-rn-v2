// HSCoachTranscriptVerificationTab — RN port of Lovable
// src/components/hs-coach/HSCoachTranscriptVerificationTab.tsx
//
// Verbatim port, web→RN mappings:
//   - Card / CardContent / CardHeader / CardTitle / CardDescription → RN Card primitives
//   - Button / Badge / Textarea / Label / Avatar → RN primitives (@/components/ui)
//   - shadcn Select (SelectTrigger/SelectContent/SelectItem/SelectValue) → RN Select
//     (single onValueChange + items array)
//   - lucide-react → lucide-react-native
//   - useToast (sonner-like) → shared @/hooks/use-toast (RN port)
//   - className + tailwind → StyleSheet + small dynamic styles
//
// GAPS_IN_LOVABLE captured during port:
//   * No new gaps. Supabase query shapes (academic_transcripts w/ nested player_profiles,
//     transcript_verifications) and insert payload are identical to Lovable.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { FileCheck, Loader2, ShieldCheck, FileText } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';

type BadgeLevel = 'standard' | 'gold' | 'platinum';

/**
 * HS Coach Transcript Verification Tab.
 * Lists transcripts uploaded by athletes on this HS coach's roster
 * and allows the coach to stamp a verification badge (standard/gold/platinum).
 */
export function HSCoachTranscriptVerificationTab() {
  const { user } = useAuth();
  const { data: hsProfile } = useHSCoachProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(null);
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevel>('gold');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get roster athlete profile IDs
  const { data: rosterIds } = useQuery({
    queryKey: ['hs-coach-roster-ids', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('team_rosters')
        .select('athlete_profile_id, teams!inner(coach_user_id)')
        .eq('teams.coach_user_id', user.id)
        .not('athlete_profile_id', 'is', null);
      return (data || []).map((r: any) => r.athlete_profile_id);
    },
    enabled: !!user,
  });

  // Get transcripts for roster athletes
  const { data: transcripts, isLoading } = useQuery({
    queryKey: ['hs-coach-roster-transcripts', rosterIds],
    queryFn: async () => {
      if (!rosterIds || rosterIds.length === 0) return [];
      const { data } = await supabase
        .from('academic_transcripts')
        .select(
          'id, file_name, gpa, semester, year, is_official, created_at, athlete_profile_id, player_profiles:athlete_profile_id(full_name, profile_image_url, school)'
        )
        .in('athlete_profile_id', rosterIds)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!rosterIds && rosterIds.length > 0,
  });

  // Existing verifications by this HS coach
  const { data: existingVerifications } = useQuery({
    queryKey: ['hs-coach-verifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('transcript_verifications')
        .select('transcript_id, badge_level, verified_at')
        .eq('verifier_user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const verifiedMap = useMemo(
    () => new Map((existingVerifications || []).map((v: any) => [v.transcript_id, v])),
    [existingVerifications]
  );

  const handleVerify = async (transcriptId: string) => {
    if (!user || !hsProfile) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('transcript_verifications').insert({
        transcript_id: transcriptId,
        verifier_user_id: user.id,
        verifier_role: 'high_school_coach',
        verifier_name: hsProfile.name,
        verifier_title: hsProfile.title,
        verifier_institution: hsProfile.school_name,
        verification_status: 'verified',
        verification_notes: notes.trim() || null,
        badge_level: badgeLevel,
      });
      if (error) throw error;
      toast({
        title: 'Transcript verified',
        description: `${badgeLevel.toUpperCase()} badge issued.`,
      });
      setActiveTranscriptId(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['hs-coach-verifications'] });
    } catch (e: any) {
      toast({
        title: 'Could not verify transcript',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.root}>
      <Card>
        <CardHeader>
          <View style={s.titleRow}>
            <FileCheck size={20} color={colors.primary} />
            <CardTitle>Transcript Verification</CardTitle>
          </View>
          <CardDescription>
            Review and verify academic transcripts uploaded by athletes on your roster. Verifications appear as
            trust badges on athlete profiles for college recruiters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : !transcripts || transcripts.length === 0 ? (
            <View style={s.emptyWrap}>
              <FileText size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>
                No transcripts uploaded by your roster athletes yet.
              </Text>
            </View>
          ) : (
            <View style={s.list}>
              {transcripts.map((t: any) => {
                const existing = verifiedMap.get(t.id);
                const isActive = activeTranscriptId === t.id;
                return (
                  <View key={t.id} style={s.row}>
                    <View style={s.rowTop}>
                      <Avatar
                        source={
                          t.player_profiles?.profile_image_url
                            ? { uri: t.player_profiles.profile_image_url }
                            : null
                        }
                        fallback={t.player_profiles?.full_name?.charAt(0) || 'A'}
                        size={40}
                      />
                      <View style={s.rowInfo}>
                        <Text style={s.name} numberOfLines={1}>
                          {t.player_profiles?.full_name}
                        </Text>
                        <Text style={s.fileName} numberOfLines={1}>
                          {t.file_name}
                        </Text>
                        <View style={s.badgeRow}>
                          {t.gpa ? (
                            <Badge variant="secondary" style={s.smallBadge}>
                              <Text style={s.smallBadgeText}>GPA {t.gpa}</Text>
                            </Badge>
                          ) : null}
                          {t.semester ? (
                            <Badge variant="outline" style={s.smallBadge}>
                              <Text style={s.smallBadgeText}>{t.semester}</Text>
                            </Badge>
                          ) : null}
                          {t.year ? (
                            <Badge variant="outline" style={s.smallBadge}>
                              <Text style={s.smallBadgeText}>{t.year}</Text>
                            </Badge>
                          ) : null}
                          {t.is_official ? (
                            <Badge style={s.officialBadge}>
                              <Text style={s.officialBadgeText}>Official</Text>
                            </Badge>
                          ) : null}
                        </View>
                      </View>
                      <View>
                        {existing ? (
                          <Badge style={s.verifiedBadge}>
                            <View style={s.verifiedBadgeRow}>
                              <ShieldCheck size={12} color={colors.primaryForeground} />
                              <Text style={s.verifiedBadgeText}>
                                {String(existing.badge_level).toUpperCase()}
                              </Text>
                            </View>
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={isActive ? 'secondary' : 'default'}
                            onPress={() =>
                              setActiveTranscriptId(isActive ? null : t.id)
                            }
                          >
                            <Text
                              style={
                                isActive ? s.btnTextSecondary : s.btnTextPrimary
                              }
                            >
                              {isActive ? 'Cancel' : 'Verify'}
                            </Text>
                          </Button>
                        )}
                      </View>
                    </View>

                    {isActive && !existing ? (
                      <View style={s.expandedBlock}>
                        <View style={s.fieldGroup}>
                          <Label style={s.fieldLabel}>Badge Level</Label>
                          <Select
                            value={badgeLevel}
                            onValueChange={(v) => setBadgeLevel(v as BadgeLevel)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">
                                Standard — basic verification
                              </SelectItem>
                              <SelectItem value="gold">
                                Gold — strong academic standing
                              </SelectItem>
                              <SelectItem value="platinum">
                                Platinum — exceptional / honors
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </View>
                        <View style={s.fieldGroup}>
                          <Label style={s.fieldLabel}>Verification Notes (optional)</Label>
                          <Textarea
                            rows={2}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Any context college recruiters should know..."
                          />
                        </View>
                        <Button
                          size="sm"
                          onPress={() => handleVerify(t.id)}
                          disabled={submitting}
                        >
                          <View style={s.btnRow}>
                            {submitting ? (
                              <Loader2 size={12} color={colors.primaryForeground} />
                            ) : (
                              <ShieldCheck size={12} color={colors.primaryForeground} />
                            )}
                            <Text style={s.btnTextPrimary}>
                              {submitting
                                ? 'Verifying...'
                                : `Issue ${badgeLevel.toUpperCase()} Badge`}
                            </Text>
                          </View>
                        </Button>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

export default HSCoachTranscriptVerificationTab;

const s = StyleSheet.create({
  root: { padding: spacing.md, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingWrap: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { paddingVertical: 40, alignItems: 'center', gap: spacing.sm },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  list: { gap: spacing.sm },
  row: {
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowInfo: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  fileName: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 6,
  },
  smallBadge: {},
  smallBadgeText: { fontSize: 10, color: colors.foreground },
  officialBadge: { backgroundColor: colors.primary, borderColor: colors.primary },
  officialBadgeText: { fontSize: 10, color: colors.primaryForeground },
  verifiedBadge: { backgroundColor: colors.primary },
  verifiedBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedBadgeText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
  },
  expandedBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTextPrimary: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },
  btnTextSecondary: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.secondaryForeground,
    fontSize: typography.fontSize.sm,
  },
});
