// Ported from Lovable web: src/components/StaffManager.tsx
// Translations:
//   <div>/<p>/<h*>/<span>/<label> -> <View>/<Text>/<Pressable>
//   Tailwind classes -> StyleSheet using @/lib/theme tokens
//   @/components/ui/* (lowercase) -> PascalCase imports
//   lucide-react -> lucide-react-native
//   shadcn DropdownMenu -> local BottomSheetMenu (Modal-based; pattern from AdminUserManagement)
//   useToast -> @/hooks/use-toast (RN compat shim)
//   Data layer (supabase, useQuery, useMutation, useAuth) preserved verbatim
//   send-staff-invitation edge function call preserved verbatim
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
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
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import { Checkbox } from '@/components/ui/Checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  UserPlus,
  Users,
  Mail,
  Phone,
  Loader2,
  Trash2,
  MessageCircle,
  MoreVertical,
  Edit,
  Send,
} from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';

const STAFF_ROLES = [
  { value: 'assistant_coach', label: 'Assistant Coach' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'evaluator', label: 'Evaluator' },
  { value: 'admin', label: 'Admin' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'scout', label: 'Scout' },
];

interface StaffManagerProps {
  onMessageStaff?: (staffMember: any) => void;
}

// ------------------------------------------------------------------
// BottomSheetMenu — minimal DropdownMenu replacement.
// ------------------------------------------------------------------
interface MenuItemSpec {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

function BottomSheetMenu({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItemSpec[];
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={menuStyles.overlay} onPress={onClose}>
        <Pressable style={menuStyles.sheet} onPress={(e) => e.stopPropagation()}>
          {items.map((it) => (
            <Pressable
              key={it.key}
              disabled={it.disabled}
              style={[menuStyles.item, it.disabled && { opacity: 0.5 }]}
              onPress={() => {
                onClose();
                it.onPress();
              }}
            >
              {it.icon}
              <Text
                style={[
                  menuStyles.itemText,
                  it.destructive ? { color: colors.destructive } : null,
                ]}
              >
                {it.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  itemText: {
    color: colors.foreground,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.body,
  },
});

export function StaffManager({ onMessageStaff }: StaffManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'assistant_coach',
    title: '',
    notes: '',
  });
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['coaching-staff', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('coaching_staff')
        .select('*')
        .eq('owner_user_id', user.id)
        .neq('status', 'removed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addStaff = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const channels: ('email' | 'sms')[] = [];
      if (sendEmail && form.email) channels.push('email');
      if (sendSms && form.phone) channels.push('sms');

      const { data: inserted, error } = await supabase
        .from('coaching_staff')
        .insert({
          owner_user_id: user.id,
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          role: form.role,
          title: form.title || null,
          notes: form.notes || null,
          status: channels.length > 0 ? 'invited' : 'active',
        })
        .select('id')
        .single();
      if (error) throw error;

      if (channels.length > 0 && inserted?.id) {
        const { data: inviteData, error: inviteErr } = await supabase.functions.invoke(
          'send-staff-invitation',
          {
            body: {
              staffId: inserted.id,
              channels,
              staffName: form.name,
              staffEmail: form.email || null,
              staffPhone: form.phone || null,
              role: form.role,
              customMessage: inviteMessage || null,
            },
          },
        );
        if (inviteErr) throw inviteErr;
        return { staff: inserted, invite: inviteData };
      }
      return { staff: inserted, invite: null };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['coaching-staff'] });
      setShowAddDialog(false);
      resetForm();
      const inv = result?.invite;
      if (inv?.results?.length) {
        const ok = inv.results.filter((r: any) => r.success).map((r: any) => r.channel.toUpperCase());
        const fail = inv.results.filter((r: any) => !r.success);
        toast({
          title: ok.length ? 'Invitation sent via ' + ok.join(' & ') : 'Staff added',
          description: fail.length
            ? 'Failed: ' + fail.map((f: any) => f.channel + ' (' + f.error + ')').join(', ')
            : 'Staff member has been added to your team.',
          variant: fail.length && !ok.length ? 'destructive' : 'default',
        });
      } else {
        toast({ title: 'Staff Added', description: 'Staff member has been added to your team.' });
      }
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const resendInvitation = async (member: any, channels: ('email' | 'sms')[]) => {
    setResendingId(member.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-staff-invitation', {
        body: {
          staffId: member.id,
          channels,
          staffName: member.name,
          staffEmail: member.email,
          staffPhone: member.phone,
          role: member.role,
        },
      });
      if (error) throw error;
      const ok =
        data?.results?.filter((r: any) => r.success).map((r: any) => r.channel.toUpperCase()) || [];
      toast({
        title: ok.length ? 'Invitation resent via ' + ok.join(' & ') : 'Could not send invitation',
        variant: ok.length ? 'default' : 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['coaching-staff'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setResendingId(null);
    }
  };

  const updateStaff = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('coaching_staff').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-staff'] });
      setEditingStaff(null);
      toast({ title: 'Staff Updated' });
    },
  });

  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coaching_staff').update({ status: 'removed' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching-staff'] });
      toast({ title: 'Staff Removed' });
    },
  });

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', role: 'assistant_coach', title: '', notes: '' });
    setSendEmail(true);
    setSendSms(false);
    setInviteMessage('');
  };

  const activeStaff = staff.filter((s: any) => s.status === 'active');
  const invitedStaff = staff.filter((s: any) => s.status === 'invited');

  const getRoleBadgeVariant = (role: string): any => {
    const variants: Record<string, string> = {
      assistant_coach: 'default',
      coordinator: 'secondary',
      evaluator: 'outline',
      admin: 'default',
      analyst: 'secondary',
      recruiter: 'default',
      scout: 'outline',
    };
    return variants[role] || 'outline';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.mutedForeground} />
      </View>
    );
  }

  const buildMenuItems = (member: any): MenuItemSpec[] => {
    const items: MenuItemSpec[] = [];
    items.push({
      key: 'edit',
      label: 'Edit',
      icon: <Edit size={16} color={colors.foreground} />,
      onPress: () => {
        setEditingStaff(member);
        setForm({
          name: member.name,
          email: member.email || '',
          phone: member.phone || '',
          role: member.role,
          title: member.title || '',
          notes: member.notes || '',
        });
      },
    });
    if (onMessageStaff && member.staff_user_id) {
      items.push({
        key: 'message',
        label: 'Message',
        icon: <MessageCircle size={16} color={colors.foreground} />,
        onPress: () => onMessageStaff(member),
      });
    }
    if (member.email || member.phone) {
      items.push({
        key: 'invite',
        label: member.status === 'invited' ? 'Resend Invitation' : 'Send Invitation',
        icon: <Send size={16} color={colors.foreground} />,
        disabled: resendingId === member.id,
        onPress: () => {
          const channels: ('email' | 'sms')[] = [];
          if (member.email) channels.push('email');
          if (member.phone) channels.push('sms');
          if (channels.length) resendInvitation(member, channels);
        },
      });
    }
    items.push({
      key: 'remove',
      label: 'Remove',
      destructive: true,
      icon: <Trash2 size={16} color={colors.destructive} />,
      onPress: () => removeStaff.mutate(member.id),
    });
    return items;
  };

  const initialsFor = (name: string) =>
    name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Users size={20} color={colors.primary} />
            <Text style={styles.title}>Staff Directory</Text>
          </View>
          <Text style={styles.subtitle}>
            {staff.length} staff member{staff.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Button
          onPress={() => setShowAddDialog(true)}
          leftIcon={<UserPlus size={16} color={colors.primaryForeground} />}
        >
          Add Staff
        </Button>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Total Staff', value: staff.length },
          { label: 'Active', value: activeStaff.length },
          { label: 'Invited', value: invitedStaff.length },
        ].map(({ label, value }) => (
          <Card key={label} style={styles.statCard}>
            <CardContent style={styles.statContent}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Staff list */}
      {staff.length === 0 ? (
        <Card>
          <CardContent style={styles.emptyContent}>
            <Users size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No staff members yet</Text>
            <Text style={styles.emptyHint}>
              Add your coaching staff, coordinators, and evaluators
            </Text>
            <Button
              onPress={() => setShowAddDialog(true)}
              leftIcon={<UserPlus size={16} color={colors.primaryForeground} />}
            >
              Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <View style={styles.staffList}>
          {staff.map((member: any) => (
            <Card key={member.id} style={styles.memberCard}>
              <CardContent style={styles.memberContent}>
                <View style={styles.memberRow}>
                  <Avatar size={48} fallback={initialsFor(member.name)} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.memberHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {member.title ? (
                          <Text style={styles.memberTitle}>{member.title}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => setMenuMemberId(member.id)}
                        style={styles.menuBtn}
                        hitSlop={8}
                      >
                        <MoreVertical size={16} color={colors.foreground} />
                      </Pressable>
                    </View>
                    <View style={styles.badgeRow}>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {STAFF_ROLES.find((r) => r.value === member.role)?.label || member.role}
                      </Badge>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </View>
                    <View style={styles.contactRow}>
                      {member.email ? (
                        <View style={styles.contactItem}>
                          <Mail size={12} color={colors.mutedForeground} />
                          <Text style={styles.contactText}>{member.email}</Text>
                        </View>
                      ) : null}
                      {member.phone ? (
                        <View style={styles.contactItem}>
                          <Phone size={12} color={colors.mutedForeground} />
                          <Text style={styles.contactText}>{member.phone}</Text>
                        </View>
                      ) : null}
                    </View>
                    {member.notes ? (
                      <Text style={styles.memberNotes}>{member.notes}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.memberActions}>
                  {onMessageStaff ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => onMessageStaff(member)}
                      leftIcon={<MessageCircle size={12} color={colors.foreground} />}
                    >
                      Message
                    </Button>
                  ) : null}
                  {member.status === 'invited' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        updateStaff.mutate({ id: member.id, status: 'active' })
                      }
                    >
                      Mark Active
                    </Button>
                  ) : null}
                </View>
              </CardContent>
              <BottomSheetMenu
                open={menuMemberId === member.id}
                onClose={() => setMenuMemberId(null)}
                items={buildMenuItems(member)}
              />
            </Card>
          ))}
        </View>
      )}

      {/* Add / Edit dialog */}
      <Dialog
        open={showAddDialog || !!editingStaff}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingStaff(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </DialogTitle>
            <DialogDescription>
              Add coaching staff, coordinators, and evaluators to your team
            </DialogDescription>
          </DialogHeader>

          <View style={styles.formColumn}>
            <View style={styles.formField}>
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="John Smith"
              />
            </View>
            <View style={styles.formField}>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChangeText={(t) => setForm({ ...form, email: t })}
                placeholder="john@school.edu"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formField}>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.formField}>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={styles.formField}>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
                placeholder="Offensive Coordinator"
              />
            </View>
            <View style={styles.formField}>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChangeText={(t) => setForm({ ...form, notes: t })}
                placeholder="Additional notes..."
                rows={2}
              />
            </View>

            {!editingStaff ? (
              <View style={styles.inviteBox}>
                <View>
                  <Label>Send Invitation</Label>
                  <Text style={styles.inviteHint}>
                    Choose how to invite this staff member to OfferHound™.
                  </Text>
                </View>
                <View style={styles.inviteChannels}>
                  <Pressable
                    style={styles.inviteChannelRow}
                    onPress={() => form.email && setSendEmail(!sendEmail)}
                  >
                    <Checkbox
                      checked={sendEmail}
                      onCheckedChange={(v) => setSendEmail(!!v)}
                      disabled={!form.email}
                    />
                    <Mail size={16} color={colors.mutedForeground} />
                    <Text style={styles.inviteChannelText}>
                      Email
                      {!form.email ? (
                        <Text style={styles.inviteChannelMuted}> (add email above)</Text>
                      ) : null}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.inviteChannelRow}
                    onPress={() => form.phone && setSendSms(!sendSms)}
                  >
                    <Checkbox
                      checked={sendSms}
                      onCheckedChange={(v) => setSendSms(!!v)}
                      disabled={!form.phone}
                    />
                    <Phone size={16} color={colors.mutedForeground} />
                    <Text style={styles.inviteChannelText}>
                      SMS
                      {!form.phone ? (
                        <Text style={styles.inviteChannelMuted}> (add phone above)</Text>
                      ) : null}
                    </Text>
                  </Pressable>
                </View>
                {(sendEmail || sendSms) ? (
                  <View style={styles.formField}>
                    <Label style={{ fontSize: typography.size.xs }}>
                      Personal message (optional)
                    </Label>
                    <Textarea
                      value={inviteMessage}
                      onChangeText={(t) => setInviteMessage(t)}
                      placeholder="Looking forward to having you on staff..."
                      rows={2}
                      maxLength={500}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => {
                setShowAddDialog(false);
                setEditingStaff(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={addStaff.isPending || updateStaff.isPending}
              loading={addStaff.isPending || updateStaff.isPending}
              leftIcon={
                addStaff.isPending || updateStaff.isPending ? (
                  <Loader2 size={16} color={colors.primaryForeground} />
                ) : undefined
              }
              onPress={() => {
                if (!form.name.trim()) {
                  toast({ title: 'Name required', variant: 'destructive' });
                  return;
                }
                if (editingStaff) {
                  updateStaff.mutate({
                    id: editingStaff.id,
                    name: form.name,
                    email: form.email || null,
                    phone: form.phone || null,
                    role: form.role,
                    title: form.title || null,
                    notes: form.notes || null,
                  });
                } else {
                  addStaff.mutate();
                }
              }}
            >
              {editingStaff ? 'Update' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default StaffManager;

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing?.heading ?? 0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: { flex: 1 },
  statContent: {
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.size['2xl'],
    color: colors.primary,
    letterSpacing: typography.letterSpacing?.heading ?? 0.5,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  // Empty
  emptyContent: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  emptyHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  // List
  staffList: { gap: spacing.md },
  memberCard: {
    borderColor: colors.border,
  },
  memberContent: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 4,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  memberName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  memberTitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.mutedForeground,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
  },
  memberNotes: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  // Dialog form
  formColumn: { gap: spacing.md },
  formField: { gap: 6 },
  inviteBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  inviteHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  inviteChannels: { gap: spacing.sm },
  inviteChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteChannelText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foreground,
  },
  inviteChannelMuted: {
    color: colors.mutedForeground,
    fontSize: typography.size.xs,
  },
});
