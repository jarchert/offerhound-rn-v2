// Parity port from Lovable src/components/CampStaffScheduler.tsx (verbatim logic).
// Web→RN mapping:
//   - shadcn Card/Button/Badge/Input/Label/Select/Dialog → src/components/ui/*
//   - lucide-react → lucide-react-native
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - <input type="datetime-local"> → plain Input (text). RN datetime picker not yet
//     wired in this app; see CampMonetizationManager / CampEnrollmentManager for the
//     same convention. Caller types ISO-ish strings; backend stores as-is.
//   - QRCodeCanvas (qrcode.react) → placeholder View (GAP: react-native-qrcode-svg
//     not installed; matches AdminInvitationCards / CampEnrollmentManager convention).
//   - window.location.origin → static placeholder used only inside the QR placeholder.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, QrCode, AlertTriangle, CheckCircle2, Clock, Trash2, Loader2 } from 'lucide-react-native';
import { format, isPast, differenceInMinutes } from 'date-fns';
import { colors, spacing, radius } from '@/lib/theme';

interface Props { campId: string; }

interface Shift {
  id: string;
  camp_id: string;
  staff_id: string | null;
  station_name: string;
  role: string;
  shift_start: string;
  shift_end: string;
  check_in_token: string;
  checked_in_at: string | null;
  no_show: boolean;
  notes: string | null;
}

interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'evaluator', label: 'Evaluator' },
  { value: 'station_lead', label: 'Station Lead' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'medical', label: 'Medical' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'volunteer', label: 'Volunteer' },
];

export function CampStaffScheduler({ campId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [qrShift, setQrShift] = useState<Shift | null>(null);

  const [form, setForm] = useState({
    staff_id: '',
    station_name: '',
    role: 'evaluator',
    shift_start: '',
    shift_end: '',
    notes: '',
  });

  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ['camp-staff', campId],
    queryFn: async () => {
      const { data, error } = await supabase.from('camp_staff').select('*').eq('camp_id', campId);
      if (error) throw error;
      return (data || []) as StaffMember[];
    },
  });

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ['camp-staff-shifts', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_staff_shifts' as any)
        .select('*')
        .eq('camp_id', campId)
        .order('shift_start', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Shift[];
    },
  });

  const createShift = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not authenticated');
      const { error } = await supabase.from('camp_staff_shifts' as any).insert({
        camp_id: campId,
        staff_id: form.staff_id || null,
        station_name: form.station_name,
        role: form.role,
        shift_start: form.shift_start,
        shift_end: form.shift_end,
        notes: form.notes || null,
        created_by: u.user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-staff-shifts', campId] });
      setOpen(false);
      setForm({ staff_id: '', station_name: '', role: 'evaluator', shift_start: '', shift_end: '', notes: '' });
      toast({ title: 'Shift created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteShift = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('camp_staff_shifts' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['camp-staff-shifts', campId] }),
  });

  const markNoShow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('camp_staff_shifts' as any).update({ no_show: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-staff-shifts', campId] });
      toast({ title: 'Marked as no-show' });
    },
  });

  const showQR = (shift: Shift) => setQrShift(shift);
  const getStaffName = (id: string | null) => staff.find((x) => x.id === id)?.name || 'Unassigned';

  const getStatus = (shift: Shift) => {
    if (shift.checked_in_at) return { label: 'Checked in', variant: 'default' as const, icon: CheckCircle2 };
    if (shift.no_show) return { label: 'No-show', variant: 'destructive' as const, icon: AlertTriangle };
    const start = new Date(shift.shift_start);
    if (isPast(start) && differenceInMinutes(new Date(), start) > 15) {
      return { label: 'Late', variant: 'destructive' as const, icon: AlertTriangle };
    }
    return { label: 'Scheduled', variant: 'secondary' as const, icon: Clock };
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={s.headerText}>
            <CardTitle>Staff & Volunteer Scheduler</CardTitle>
            <CardDescription>Assign staff to stations and shifts. Each shift gets a QR code for self check-in.</CardDescription>
          </View>
          <Button size="sm" onPress={() => setOpen(true)}>
            <View style={s.btnRow}>
              <Plus size={16} color={colors.primaryForeground} />
              <Text style={s.btnTextPrimary}>Add shift</Text>
            </View>
          </Button>
        </View>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>New shift</DialogTitle></DialogHeader>
            <View style={s.formGap}>
              <View>
                <Label>Staff member</Label>
                <Select value={form.staff_id} onValueChange={(v) => setForm({ ...form, staff_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {staff.length === 0 && (
                  <Text style={s.hint}>Add staff first via the Staff manager.</Text>
                )}
              </View>
              <View>
                <Label>Station name</Label>
                <Input
                  value={form.station_name}
                  onChangeText={(t) => setForm({ ...form, station_name: t })}
                  placeholder="e.g. 40-yard dash, Field 2"
                />
              </View>
              <View>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </View>
              <View style={s.row2}>
                <View style={s.col}>
                  <Label>Start</Label>
                  <Input
                    value={form.shift_start}
                    onChangeText={(t) => setForm({ ...form, shift_start: t })}
                    placeholder="YYYY-MM-DDTHH:MM"
                  />
                </View>
                <View style={s.col}>
                  <Label>End</Label>
                  <Input
                    value={form.shift_end}
                    onChangeText={(t) => setForm({ ...form, shift_end: t })}
                    placeholder="YYYY-MM-DDTHH:MM"
                  />
                </View>
              </View>
              <View>
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChangeText={(t) => setForm({ ...form, notes: t })}
                  placeholder="Optional"
                />
              </View>
            </View>
            <DialogFooter>
              <Button
                onPress={() => createShift.mutate()}
                disabled={!form.station_name || !form.shift_start || !form.shift_end || createShift.isPending}
              >
                <View style={s.btnRow}>
                  {createShift.isPending && <ActivityIndicator size="small" color={colors.primaryForeground} />}
                  <Text style={s.btnTextPrimary}>Create shift</Text>
                </View>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Text style={s.empty}>Loading shifts...</Text>
        ) : shifts.length === 0 ? (
          <Text style={s.empty}>No shifts yet. Add your first shift to generate a check-in QR.</Text>
        ) : (
          <View style={s.list}>
            {shifts.map((shift) => {
              const status = getStatus(shift);
              const StatusIcon = status.icon;
              const roleLabel = ROLE_OPTIONS.find((r) => r.value === shift.role)?.label || shift.role;
              return (
                <View key={shift.id} style={s.shiftRow}>
                  <View style={s.shiftMain}>
                    <View style={s.shiftBadges}>
                      <Text style={s.shiftName}>{shift.station_name}</Text>
                      <Badge variant="outline"><Text style={s.badgeText}>{roleLabel}</Text></Badge>
                      <Badge variant={status.variant}>
                        <View style={s.statusBadgeInner}>
                          <StatusIcon size={12} color={colors.foreground} />
                          <Text style={s.badgeText}>{status.label}</Text>
                        </View>
                      </Badge>
                    </View>
                    <Text style={s.shiftMeta}>
                      {getStaffName(shift.staff_id)} · {format(new Date(shift.shift_start), 'MMM d, h:mm a')} – {format(new Date(shift.shift_end), 'h:mm a')}
                    </Text>
                  </View>
                  <View style={s.actions}>
                    <Button size="sm" variant="outline" onPress={() => showQR(shift)}>
                      <QrCode size={16} color={colors.foreground} />
                    </Button>
                    {!shift.checked_in_at && !shift.no_show && (
                      <Button size="sm" variant="ghost" onPress={() => markNoShow.mutate(shift.id)}>
                        <AlertTriangle size={16} color={colors.foreground} />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onPress={() => deleteShift.mutate(shift.id)}>
                      <Trash2 size={16} color={colors.destructive} />
                    </Button>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </CardContent>

      <Dialog open={!!qrShift} onOpenChange={(o) => { if (!o) setQrShift(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check-in QR</DialogTitle></DialogHeader>
          {qrShift && (
            <View style={s.qrWrap}>
              <View style={s.qrMeta}>
                <Text style={s.qrTitle}>{qrShift.station_name}</Text>
                <Text style={s.qrSub}>
                  {getStaffName(qrShift.staff_id)} · {format(new Date(qrShift.shift_start), 'MMM d, h:mm a')}
                </Text>
              </View>
              <View style={s.qrBox}>
                <QrCode size={120} color={colors.foreground} />
                <Text style={s.qrToken} numberOfLines={1}>
                  /camp/staff-checkin/{qrShift.check_in_token}
                </Text>
              </View>
              <Text style={s.qrHint}>Staff scans this code at their station to check in.</Text>
            </View>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  headerText: { flex: 1, minWidth: 200 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  btnTextPrimary: { color: colors.primaryForeground, fontWeight: '600' },
  formGap: { gap: spacing.sm + 4 },
  hint: { fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
  row2: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1 },
  empty: { fontSize: 13, color: colors.mutedForeground, paddingVertical: spacing.xl, textAlign: 'center' },
  list: { gap: spacing.sm },
  shiftRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.sm + 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, flexWrap: 'wrap' },
  shiftMain: { flex: 1, minWidth: 0 },
  shiftBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  shiftName: { color: colors.foreground, fontWeight: '600' },
  shiftMeta: { fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
  badgeText: { fontSize: 11, color: colors.foreground },
  statusBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qrWrap: { gap: spacing.sm + 4, alignItems: 'center' },
  qrMeta: { alignItems: 'center' },
  qrTitle: { color: colors.foreground, fontWeight: '600' },
  qrSub: { color: colors.mutedForeground, fontSize: 13 },
  qrBox: { backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', gap: spacing.xs },
  qrToken: { fontSize: 10, color: colors.mutedForeground, fontFamily: 'Courier' },
  qrHint: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center' },
});
