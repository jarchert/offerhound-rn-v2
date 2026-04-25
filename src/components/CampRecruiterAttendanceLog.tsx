// Ported verbatim from Lovable src/components/CampRecruiterAttendanceLog.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - useToast hook → @/components/ui/toast (toast.* helpers)
//   - <Input onChange(e.target.value)> → onChangeText(text)
//   - <Textarea rows={n}> retained (RN Textarea wrapper supports it)
//   - Hover/responsive utility classes are no-ops in RN
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/toast';
import { Plus, Trash2, GraduationCap, Mail, MapPin } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Props {
  campId: string;
  campName: string;
}

export function CampRecruiterAttendanceLog({ campId, campName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    recruiter_name: '', recruiter_email: '', school_name: '',
    recruiter_role: '', division: '', positions_watching: '', notes: '',
  });

  const { data: log = [], isLoading } = useQuery({
    queryKey: ['camp-recruiter-attendance', campId],
    queryFn: async () => {
      const { data } = await supabase
        .from('camp_recruiter_attendance')
        .select('*')
        .eq('camp_id', campId)
        .order('checked_in_at', { ascending: false });
      return data || [];
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!form.recruiter_name) throw new Error('Recruiter name required');
      const { error } = await supabase.from('camp_recruiter_attendance').insert({
        camp_id: campId,
        recruiter_name: form.recruiter_name.trim(),
        recruiter_email: form.recruiter_email.trim() || null,
        school_name: form.school_name.trim() || null,
        recruiter_role: form.recruiter_role.trim() || null,
        division: form.division.trim() || null,
        positions_watching: form.positions_watching
          ? form.positions_watching.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        notes: form.notes.trim() || null,
        checked_in_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recruiter logged');
      qc.invalidateQueries({ queryKey: ['camp-recruiter-attendance', campId] });
      setShowAdd(false);
      setForm({ recruiter_name: '', recruiter_email: '', school_name: '', recruiter_role: '', division: '', positions_watching: '', notes: '' });
    },
    onError: (err: any) => toast.error('Error', err.message),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('camp_recruiter_attendance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['camp-recruiter-attendance', campId] }),
  });

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={{ flexShrink: 1 }}>
            <View style={s.titleRow}>
              <GraduationCap size={20} color={colors.primary} />
              <CardTitle>College coach attendance</CardTitle>
            </View>
            <CardDescription>
              {campName} — {log.length} {log.length === 1 ? 'recruiter' : 'recruiters'} on-site
            </CardDescription>
          </View>
          <Button size="sm" onPress={() => setShowAdd(true)} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>
            Log recruiter
          </Button>
        </View>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm }}>
        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        ) : log.length === 0 ? (
          <Text style={s.empty}>No college coaches logged yet. Tap "Log recruiter" when one arrives on-site.</Text>
        ) : (
          log.map((r: any) => (
            <View key={r.id} style={s.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{r.recruiter_name}</Text>
                  {r.recruiter_role && <Badge variant="outline">{r.recruiter_role}</Badge>}
                  {r.division && <Badge variant="secondary">{r.division}</Badge>}
                </View>
                {r.school_name && (
                  <View style={s.metaRow}><MapPin size={12} color={colors.mutedForeground} /><Text style={s.meta}>{r.school_name}</Text></View>
                )}
                {r.recruiter_email && (
                  <View style={s.metaRow}><Mail size={12} color={colors.mutedForeground} /><Text style={s.metaXs}>{r.recruiter_email}</Text></View>
                )}
                {r.positions_watching?.length > 0 && (
                  <View style={s.posRow}>
                    {r.positions_watching.map((p: string) => <Badge key={p} variant="outline">{p}</Badge>)}
                  </View>
                )}
                {r.notes && <Text style={s.notes}>{r.notes}</Text>}
                <Text style={s.metaXs}>{format(new Date(r.checked_in_at), 'MMM d, yyyy h:mm a')}</Text>
              </View>
              <Pressable onPress={() => removeEntry.mutate(r.id)} hitSlop={8} style={{ padding: 4 }}>
                <Trash2 size={16} color={colors.destructive} />
              </Pressable>
            </View>
          ))
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log college coach attendance</DialogTitle>
          </DialogHeader>
          <View style={{ gap: spacing.sm }}>
            <View>
              <Label>Recruiter name *</Label>
              <Input value={form.recruiter_name} onChangeText={(t) => setForm({ ...form, recruiter_name: t })} placeholder="Coach Smith" />
            </View>
            <View>
              <Label>School</Label>
              <Input value={form.school_name} onChangeText={(t) => setForm({ ...form, school_name: t })} placeholder="State University" />
            </View>
            <View style={s.grid2}>
              <View style={{ flex: 1 }}>
                <Label>Role</Label>
                <Input value={form.recruiter_role} onChangeText={(t) => setForm({ ...form, recruiter_role: t })} placeholder="OC, Recruiter…" />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Division</Label>
                <Input value={form.division} onChangeText={(t) => setForm({ ...form, division: t })} placeholder="D1, D2, JUCO" />
              </View>
            </View>
            <View>
              <Label>Email</Label>
              <Input keyboardType="email-address" autoCapitalize="none" value={form.recruiter_email} onChangeText={(t) => setForm({ ...form, recruiter_email: t })} />
            </View>
            <View>
              <Label>Positions watching (comma-separated)</Label>
              <Input value={form.positions_watching} onChangeText={(t) => setForm({ ...form, positions_watching: t })} placeholder="QB, WR, DB" />
            </View>
            <View>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setShowAdd(false)}>Cancel</Button>
            <Button onPress={() => addEntry.mutate()} disabled={addEntry.isPending} loading={addEntry.isPending}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  empty: { textAlign: 'center', color: colors.mutedForeground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.body, paddingVertical: spacing.lg },
  row: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  name: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.body },
  metaXs: { color: colors.mutedForeground, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingTop: 4 },
  notes: { color: colors.mutedForeground, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body, fontStyle: 'italic', paddingTop: 4 },
  grid2: { flexDirection: 'row', gap: spacing.sm },
});
