// Parity port from Lovable src/components/CampCrossCampInviteDialog.tsx (verbatim logic).
// Web→RN mapping:
//   - shadcn Button/Dialog/Checkbox/Label/Select/Badge/ScrollArea → src/components/ui/*
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - hover states are no-ops on RN; opacity used for "already invited" rows.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Sparkles } from 'lucide-react-native';
import { colors, spacing, radius } from '@/lib/theme';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCampId: string;
  targetCampName: string;
}

interface CandidateAthlete {
  enrollmentId: string;
  athleteProfileId: string | null;
  athleteUserId: string | null;
  fullName: string;
  position: string | null;
  composite: number;
  sourceCampId: string;
  sourceCampName: string;
  email: string | null;
}

export function CampCrossCampInviteDialog({ open, onOpenChange, targetCampId, targetCampName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sourceCampId, setSourceCampId] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(70);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: pastCamps = [] } = useQuery({
    queryKey: ['coach-past-camps', user?.id, targetCampId],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('camps')
        .select('id, name, start_date')
        .eq('coach_user_id', user!.id)
        .neq('id', targetCampId)
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  const { data: existingInvites = [] } = useQuery({
    queryKey: ['camp-invites-target', targetCampId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('camp_cross_camp_invites')
        .select('athlete_profile_id, recipient_email')
        .eq('target_camp_id', targetCampId);
      return data || [];
    },
  });

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['cross-camp-candidates', user?.id, sourceCampId, minScore, targetCampId],
    enabled: !!user && open && pastCamps.length > 0,
    queryFn: async () => {
      const campIds = sourceCampId === 'all' ? pastCamps.map((c) => c.id) : [sourceCampId];
      if (!campIds.length) return [] as CandidateAthlete[];

      const { data: scores } = await supabase
        .from('camp_ai_scores')
        .select('composite_score, athlete_profile_id, enrollment_id, camp_id')
        .in('camp_id', campIds)
        .gte('composite_score', minScore)
        .order('composite_score', { ascending: false })
        .limit(100);

      const enrollmentIds = (scores || []).map((x) => x.enrollment_id).filter(Boolean) as string[];
      const profileIds = (scores || []).map((x) => x.athlete_profile_id).filter(Boolean) as string[];

      const [{ data: enrollments }, { data: profiles }] = await Promise.all([
        enrollmentIds.length
          ? supabase.from('camp_enrollments').select('id, user_id, athlete_profile_id, notes').in('id', enrollmentIds)
          : Promise.resolve({ data: [] as any[] }),
        profileIds.length
          ? supabase.from('player_profiles').select('id, full_name, position').in('id', profileIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const enrollmentById = new Map((enrollments || []).map((e: any) => [e.id, e]));
      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
      const campById = new Map(pastCamps.map((c) => [c.id, c]));

      const bestByAthlete = new Map<string, CandidateAthlete>();
      for (const sc of scores || []) {
        const enrollment = sc.enrollment_id ? enrollmentById.get(sc.enrollment_id) : null;
        const profile = sc.athlete_profile_id ? profileById.get(sc.athlete_profile_id) : null;
        const sourceCamp = campById.get(sc.camp_id);
        if (!profile && !enrollment) continue;
        const key = (sc.athlete_profile_id || enrollment?.id) as string;
        const emailMatch = enrollment?.notes?.match(/Email:\s*(\S+@\S+)/i);
        const candidate: CandidateAthlete = {
          enrollmentId: sc.enrollment_id || '',
          athleteProfileId: sc.athlete_profile_id,
          athleteUserId: enrollment?.user_id || null,
          fullName: profile?.full_name || 'Unnamed athlete',
          position: profile?.position || null,
          composite: Number(sc.composite_score) || 0,
          sourceCampId: sc.camp_id,
          sourceCampName: sourceCamp?.name || 'Past camp',
          email: emailMatch ? emailMatch[1] : null,
        };
        const existing = bestByAthlete.get(key);
        if (!existing || existing.composite < candidate.composite) {
          bestByAthlete.set(key, candidate);
        }
      }
      return Array.from(bestByAthlete.values()).sort((a, b) => b.composite - a.composite);
    },
  });

  const alreadyInvitedKeys = new Set<string>();
  for (const inv of existingInvites) {
    if (inv.athlete_profile_id) alreadyInvitedKeys.add(inv.athlete_profile_id);
    if (inv.recipient_email) alreadyInvitedKeys.add(`email:${inv.recipient_email.toLowerCase()}`);
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const sendInvites = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (selected.size === 0) throw new Error('Select at least one athlete');

      const rows = Array.from(selected).map((key) => {
        const c = candidates.find((x) => (x.athleteProfileId || x.enrollmentId) === key)!;
        return {
          source_camp_id: c.sourceCampId,
          target_camp_id: targetCampId,
          athlete_profile_id: c.athleteProfileId,
          athlete_user_id: c.athleteUserId,
          recipient_email: c.email,
          recipient_name: c.fullName,
          invited_by: user.id,
          status: 'queued',
        };
      });

      const { error } = await supabase.from('camp_cross_camp_invites').insert(rows);
      if (error) throw error;

      const notifications = rows
        .filter((r) => r.athlete_user_id)
        .map((r) => ({
          user_id: r.athlete_user_id!,
          title: "You're invited to a new camp",
          message: `Coach invited you to ${targetCampName} based on your prior performance.`,
          type: 'camp_invite',
          link: `/camps`,
        }));
      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      return rows.length;
    },
    onSuccess: (count) => {
      toast({
        title: `${count} invite${count === 1 ? '' : 's'} queued`,
        description: 'Athletes with accounts received an in-app alert.',
      });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['camp-invites-target', targetCampId] });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({ title: "Couldn't send invites", description: err.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <View style={s.titleRow}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={s.titleText}>Invite top performers to {targetCampName}</Text>
            </View>
          </DialogTitle>
          <DialogDescription>
            Pull high-scoring athletes from your past camps and queue invitations.
          </DialogDescription>
        </DialogHeader>

        <View style={s.filters}>
          <View style={s.filterCol}>
            <Label>Source camp</Label>
            <Select value={sourceCampId} onValueChange={setSourceCampId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All past camps</SelectItem>
                {pastCamps.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
          <View style={s.filterCol}>
            <Label>Min composite score</Label>
            <Select value={String(minScore)} onValueChange={(v) => setMinScore(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60+</SelectItem>
                <SelectItem value="70">70+</SelectItem>
                <SelectItem value="80">80+</SelectItem>
                <SelectItem value="90">90+ (elite only)</SelectItem>
              </SelectContent>
            </Select>
          </View>
        </View>

        <ScrollView style={s.scroll}>
          {pastCamps.length === 0 ? (
            <Text style={s.empty}>You need at least one prior camp with AI scores to use this feature.</Text>
          ) : isLoading ? (
            <View style={s.loaderInline}><ActivityIndicator color={colors.primary} /></View>
          ) : candidates.length === 0 ? (
            <Text style={s.empty}>No athletes meet the score threshold. Try lowering the minimum.</Text>
          ) : (
            <View style={s.candidates}>
              {candidates.map((c) => {
                const key = (c.athleteProfileId || c.enrollmentId) as string;
                const already =
                  (c.athleteProfileId && alreadyInvitedKeys.has(c.athleteProfileId)) ||
                  (c.email && alreadyInvitedKeys.has(`email:${c.email.toLowerCase()}`));
                return (
                  <View key={key} style={[s.candidateRow, already ? s.candidateMuted : null]}>
                    <Checkbox
                      checked={selected.has(key)}
                      disabled={!!already}
                      onCheckedChange={() => toggle(key)}
                    />
                    <View style={s.candidateInfo}>
                      <Text style={s.candidateName} numberOfLines={1}>{c.fullName}</Text>
                      <Text style={s.candidateMeta} numberOfLines={1}>
                        {c.position || '—'} · {c.sourceCampName}
                      </Text>
                    </View>
                    <Badge variant="secondary"><Text style={s.badgeText}>{c.composite.toFixed(1)}</Text></Badge>
                    {already && <Badge variant="outline"><Text style={s.badgeText}>Invited</Text></Badge>}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <DialogFooter>
          <Text style={s.footerCount}>{selected.size} selected</Text>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text style={s.btnTextOutline}>Cancel</Text>
          </Button>
          <Button onPress={() => sendInvites.mutate()} disabled={selected.size === 0 || sendInvites.isPending}>
            <View style={s.btnRow}>
              {sendInvites.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Send size={16} color={colors.primaryForeground} />
              )}
              <Text style={s.btnTextPrimary}>Queue invites</Text>
            </View>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { color: colors.foreground, fontSize: 18, fontWeight: '600', flexShrink: 1 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  filterCol: { flex: 1 },
  scroll: { maxHeight: 340, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  empty: { fontSize: 13, color: colors.mutedForeground, padding: spacing.xl, textAlign: 'center' },
  loaderInline: { paddingVertical: spacing.xl, alignItems: 'center' },
  candidates: { padding: spacing.xs, gap: 4 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.xs + 4, borderRadius: radius.md },
  candidateMuted: { opacity: 0.6 },
  candidateInfo: { flex: 1, minWidth: 0 },
  candidateName: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  candidateMeta: { fontSize: 11, color: colors.mutedForeground },
  badgeText: { fontSize: 11, color: colors.foreground },
  footerCount: { fontSize: 11, color: colors.mutedForeground, alignSelf: 'center', marginRight: 'auto' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  btnTextPrimary: { color: colors.primaryForeground, fontWeight: '600' },
  btnTextOutline: { color: colors.foreground, fontWeight: '600' },
});
