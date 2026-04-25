// Parity port from Lovable src/components/CampEnrollmentManager.tsx (verbatim logic).
// Web→RN mapping:
//   - shadcn Card/Button/Badge/Input/Label/Select/Dialog → src/components/ui/*
//   - lucide-react → lucide-react-native
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - QRCodeSVG (qrcode.react) → placeholder View (GAP: react-native-qrcode-svg not installed,
//     matches AdminInvitationCards convention).
//   - Tabs are imported in the web source but never used in the rendered tree; kept logic verbatim.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/Dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserCheck,
  Clock,
  QrCode,
  Loader2,
  Search,
} from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Enrollment {
  id: string;
  camp_id: string;
  user_id: string;
  athlete_profile_id: string | null;
  status: string;
  payment_status: string;
  jersey_number: string | null;
  group_assignment: string | null;
  position_group: string | null;
  qr_code_token: string | null;
  checked_in_at: string | null;
  notes: string | null;
  created_at: string;
}

interface CampEnrollmentManagerProps {
  campId: string;
  campName: string;
  capacity: number | null;
  isFree: boolean;
  priceCents: number;
}

export function CampEnrollmentManager({
  campId,
  campName,
  capacity,
  isFree: _isFree,
  priceCents: _priceCents,
}: CampEnrollmentManagerProps) {
  const { user: _user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['camp-enrollments', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('*')
        .eq('camp_id', campId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Enrollment[];
    },
  });

  const { data: waitlist = [] } = useQuery({
    queryKey: ['camp-waitlist', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_waitlist')
        .select('*')
        .eq('camp_id', campId)
        .order('waitlist_position', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const updateEnrollment = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Enrollment>;
    }) => {
      const { error } = await supabase
        .from('camp_enrollments')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-enrollments', campId] });
      toast({ title: 'Enrollment Updated' });
    },
  });

  const checkInAthlete = async (enrollmentId: string) => {
    await updateEnrollment.mutateAsync({
      id: enrollmentId,
      updates: {
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
      } as any,
    });
  };

  const filtered = enrollments.filter((e) => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        e.jersey_number?.toLowerCase().includes(term) ||
        e.position_group?.toLowerCase().includes(term) ||
        e.group_assignment?.toLowerCase().includes(term) ||
        e.notes?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const registered = enrollments.filter((e) => e.status === 'registered').length;
  const checkedIn = enrollments.filter((e) => e.status === 'checked_in').length;
  const waitlisted = waitlist.length;
  const paid = enrollments.filter((e) => e.payment_status === 'paid').length;

  const stats: Array<{ label: string; value: number; Icon: any }> = [
    { label: 'Registered', value: registered, Icon: Users },
    { label: 'Checked In', value: checkedIn, Icon: UserCheck },
    { label: 'Waitlisted', value: waitlisted, Icon: Clock },
    { label: 'Paid', value: paid, Icon: Users },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.headerTitle}>Enrollments — {campName}</Text>
          <Text style={s.headerSubtitle}>
            {enrollments.length}
            {capacity ? ` / ${capacity}` : ''} registered
          </Text>
        </View>
      </View>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        {stats.map(({ label, value, Icon }) => (
          <View key={label} style={s.statCell}>
            <Card>
              <CardContent style={s.statCardContent}>
                <View style={s.statRow}>
                  <Icon width={16} height={16} color={colors.primary} />
                  <Text style={s.statValue}>{value}</Text>
                </View>
                <Text style={s.statLabel}>{label}</Text>
              </CardContent>
            </Card>
          </View>
        ))}
      </View>

      {/* Search + filter */}
      <View style={s.searchRow}>
        <View style={s.searchInputWrap}>
          <View style={s.searchIcon} pointerEvents="none">
            <Search width={16} height={16} color={colors.mutedForeground} />
          </View>
          <Input
            placeholder="Search enrollments..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={s.searchInput}
          />
        </View>
        <View style={s.filterWrap}>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent style={s.emptyCardContent}>
            <Users width={48} height={48} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No enrollments yet</Text>
          </CardContent>
        </Card>
      ) : (
        <ScrollView style={s.listScroll} contentContainerStyle={s.listContent}>
          {filtered.map((enrollment) => (
            <View key={enrollment.id} style={s.listItem}>
              <Card>
                <CardContent style={s.itemContent}>
                  <View style={s.itemLeft}>
                    {enrollment.jersey_number ? (
                      <View style={s.jerseyBadge}>
                        <Text style={s.jerseyText}>
                          {enrollment.jersey_number}
                        </Text>
                      </View>
                    ) : null}
                    <View style={s.itemTextWrap}>
                      <View style={s.itemTopRow}>
                        <Text style={s.athleteName}>
                          Athlete #{enrollment.id.slice(0, 8)}
                        </Text>
                        {enrollment.position_group ? (
                          <Badge variant="outline">
                            {enrollment.position_group}
                          </Badge>
                        ) : null}
                        {enrollment.group_assignment ? (
                          <Badge variant="secondary">
                            Group {enrollment.group_assignment}
                          </Badge>
                        ) : null}
                      </View>
                      <View style={s.itemBottomRow}>
                        <Badge
                          variant={
                            enrollment.status === 'checked_in'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {enrollment.status.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant={
                            enrollment.payment_status === 'paid'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {enrollment.payment_status}
                        </Badge>
                      </View>
                    </View>
                  </View>
                  <View style={s.itemActions}>
                    {enrollment.qr_code_token ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          setSelectedEnrollment(enrollment);
                          setShowQrDialog(true);
                        }}
                      >
                        <QrCode width={16} height={16} color={colors.foreground} />
                      </Button>
                    ) : null}
                    {enrollment.status !== 'checked_in' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => checkInAthlete(enrollment.id)}
                      >
                        <View style={s.btnRow}>
                          <UserCheck
                            width={16}
                            height={16}
                            color={colors.foreground}
                          />
                          <Text style={s.btnLabel}>Check In</Text>
                        </View>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        setSelectedEnrollment(enrollment);
                        setShowEditDialog(true);
                      }}
                    >
                      <Text style={s.btnLabel}>Edit</Text>
                    </Button>
                  </View>
                </CardContent>
              </Card>
            </View>
          ))}
        </ScrollView>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Athlete QR Code</DialogTitle>
            <DialogDescription>Scan to check in at camp</DialogDescription>
          </DialogHeader>
          <View style={s.qrWrap}>
            {selectedEnrollment?.qr_code_token ? (
              // GAP: react-native-qrcode-svg not installed; placeholder block
              // (matches AdminInvitationCards convention).
              <View style={s.qrPlaceholder}>
                <Text style={s.qrPlaceholderText}>QR</Text>
                <Text style={s.qrPlaceholderHint}>scan to check in</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.qrTokenText}>
            Token: {selectedEnrollment?.qr_code_token?.slice(0, 12)}...
          </Text>
        </DialogContent>
      </Dialog>

      {/* Edit Enrollment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Enrollment</DialogTitle>
          </DialogHeader>
          {selectedEnrollment ? (
            <EditEnrollmentForm
              enrollment={selectedEnrollment}
              onSave={async (updates) => {
                await updateEnrollment.mutateAsync({
                  id: selectedEnrollment.id,
                  updates,
                });
                setShowEditDialog(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </View>
  );
}

function EditEnrollmentForm({
  enrollment,
  onSave,
}: {
  enrollment: Enrollment;
  onSave: (updates: Partial<Enrollment>) => Promise<void>;
}) {
  const [jersey, setJersey] = useState(enrollment.jersey_number || '');
  const [group, setGroup] = useState(enrollment.group_assignment || '');
  const [position, setPosition] = useState(enrollment.position_group || '');
  const [notes, setNotes] = useState(enrollment.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      jersey_number: jersey || null,
      group_assignment: group || null,
      position_group: position || null,
      notes: notes || null,
    } as any);
    setSaving(false);
  };

  return (
    <View style={s.formWrap}>
      <View style={s.formGrid}>
        <View style={s.formCellHalf}>
          <Label>Jersey Number</Label>
          <Input value={jersey} onChangeText={setJersey} placeholder="#" />
        </View>
        <View style={s.formCellHalf}>
          <Label>Group Assignment</Label>
          <Input value={group} onChangeText={setGroup} placeholder="A, B, C..." />
        </View>
        <View style={s.formCellFull}>
          <Label>Position Group</Label>
          <Input
            value={position}
            onChangeText={setPosition}
            placeholder="QB, WR, etc."
          />
        </View>
        <View style={s.formCellFull}>
          <Label>Notes</Label>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Coach notes..."
          />
        </View>
      </View>
      <DialogFooter>
        <Button onPress={handleSave} disabled={saving}>
          <View style={s.btnRow}>
            {saving ? (
              <Loader2 width={16} height={16} color={colors.primaryForeground} />
            ) : null}
            <Text style={s.btnLabel}>Save</Text>
          </View>
        </Button>
      </DialogFooter>
    </View>
  );
}

export default CampEnrollmentManager;

const s = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  statCell: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  statCardContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: spacing.xl + spacing.xs,
  },
  filterWrap: {
    width: 160,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyCardContent: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  listScroll: {
    maxHeight: 600,
  },
  listContent: {
    gap: spacing.xs,
  },
  listItem: {
    marginBottom: spacing.xs,
  },
  itemContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  jerseyBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(231, 175, 8, 0.1)', // primary/10
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyText: {
    fontFamily: typography.fontFamily.heading,
    color: colors.primary,
  },
  itemTextWrap: {
    flexShrink: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  btnLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  qrWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    fontFamily: typography.fontFamily.heading,
    color: colors.foreground,
    fontSize: typography.fontSize.xl,
  },
  qrPlaceholderHint: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  qrTokenText: {
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  formWrap: {
    gap: spacing.md,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  formCellHalf: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  formCellFull: {
    width: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
});
