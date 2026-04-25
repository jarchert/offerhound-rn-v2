// Ported from Lovable web: src/components/agency/AgencyStaffManager.tsx
// Translations:
//   <div>/<p>/<h3>/<span> → <View>/<Text>
//   Tailwind classes → StyleSheet using @/lib/theme tokens
//   @/components/ui/* (lowercase) → PascalCase imports
//   lucide-react → lucide-react-native
//   <Input>/<Textarea>: onChange={e=>...e.target.value} → onChangeText
//   <Select> shadcn → RN Select wrapper (same Trigger/Content/Item shape)
//   <DropdownMenu> → local BottomSheetMenu (Modal-based) for parity
//   <Avatar> shadcn (composed) → unified Avatar({source, fallback, size})
//   sonner toast → @/components/ui/toast wrapper
//   Data logic (queries, mutations, filters) unchanged
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Modal, Pressable, FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/Select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/Dialog';
import {
  UserPlus, Users, Mail, Phone, Trash2, MoreVertical, Edit,
  Clock, CheckCircle2, XCircle, Search, Building2,
} from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';

const AGENCY_ROLES = [
  { value: 'recruiter', label: 'Recruiter', description: 'Scouts athletes and manages pipeline' },
  { value: 'senior_recruiter', label: 'Senior Recruiter', description: 'Lead recruiter with mentorship duties' },
  { value: 'regional_scout', label: 'Regional Scout', description: 'Covers a specific geographic territory' },
  { value: 'evaluator', label: 'Evaluator', description: 'Provides detailed athlete assessments' },
  { value: 'coordinator', label: 'Coordinator', description: 'Manages logistics and scheduling' },
  { value: 'analyst', label: 'Analyst', description: 'Data analysis and reporting' },
  { value: 'admin', label: 'Office Admin', description: 'Administrative support and operations' },
];

type StatusKey = 'active' | 'invited' | 'suspended' | 'removed';
const STATUS_CONFIG: Record<StatusKey, { label: string; bg: string; fg: string; border: string; Icon: typeof CheckCircle2 }> = {
  active:    { label: 'Active',    bg: 'rgba(22,161,73,0.15)',  fg: '#16a149', border: 'rgba(22,161,73,0.25)',  Icon: CheckCircle2 },
  invited:   { label: 'Invited',   bg: 'rgba(244,158,10,0.15)', fg: '#f49e0a', border: 'rgba(244,158,10,0.25)', Icon: Clock },
  suspended: { label: 'Suspended', bg: 'rgba(220,40,40,0.15)',  fg: '#dc2828', border: 'rgba(220,40,40,0.25)',  Icon: XCircle },
  removed:   { label: 'Removed',   bg: colors.muted,            fg: colors.mutedForeground, border: colors.border, Icon: XCircle },
};

interface AgencyStaffManagerProps {
  organizationId: string;
  organizationName: string;
}

export function AgencyStaffManager({ organizationId, organizationName }: AgencyStaffManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDirectoryDialog, setShowDirectoryDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('recruiter');
  const [filterRole, setFilterRole] = useState('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'recruiter', title: '', territory: '', notes: '',
  });

  // Fetch staff via coaching_staff table (owner-based)
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['agency-staff', user?.id],
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

  // Search scout directory
  const { data: directoryResults = [], isFetching: directoryLoading } = useQuery({
    queryKey: ['scout-directory-search', directorySearch],
    queryFn: async () => {
      if (!directorySearch || directorySearch.length < 2) return [];
      const { data, error } = await supabase
        .from('scout_profiles')
        .select('id, user_id, name, title, specialization, image_url, is_verified')
        .or(`name.ilike.%${directorySearch}%,title.ilike.%${directorySearch}%,specialization.ilike.%${directorySearch}%`)
        .limit(20);
      if (error) return [];
      const staffUserIds = staff.filter((s: any) => s.linked_user_id).map((s: any) => s.linked_user_id);
      return (data || []).filter((s: any) => s.user_id !== user?.id && !staffUserIds.includes(s.user_id));
    },
    enabled: directorySearch.length >= 2,
  });

  const assignScout = useMutation({
    mutationFn: async (scout: any) => {
      if (!user || !organizationId) throw new Error('Missing context');
      const { error: staffErr } = await supabase.from('coaching_staff').insert({
        owner_user_id: user.id,
        name: scout.name,
        email: null,
        role: selectedRole,
        title: scout.title || null,
        status: 'active',
        accepted_at: new Date().toISOString(),
        linked_user_id: scout.user_id,
      });
      if (staffErr) throw staffErr;
      if (organizationId) {
        await supabase.from('organization_members').insert({
          organization_id: organizationId,
          user_id: scout.user_id,
          role: selectedRole,
          invited_by: user.id,
          invitation_accepted: true,
          joined_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: (_d, scout: any) => {
      queryClient.invalidateQueries({ queryKey: ['agency-staff'] });
      queryClient.invalidateQueries({ queryKey: ['scout-directory-search'] });
      toast.success(`${scout.name} added to ${organizationName}`);
      setShowDirectoryDialog(false);
      setDirectorySearch('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to assign scout'),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('coaching_staff').insert({
        owner_user_id: user.id,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        role: form.role,
        title: form.title || null,
        notes: form.notes || null,
        status: 'invited',
        invited_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-staff'] });
      toast.success(`${form.name} has been invited to ${organizationName}`);
      resetForm();
      setShowAddDialog(false);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add team member'),
  });

  const updateMember = useMutation({
    mutationFn: async (updates: { id: string; [key: string]: any }) => {
      const { id, ...data } = updates;
      const { error } = await supabase.from('coaching_staff').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-staff'] });
      toast.success('Team member updated');
      setEditingMember(null);
    },
    onError: () => toast.error('Failed to update team member'),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coaching_staff').update({ status: 'removed' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-staff'] });
      toast.success('Team member removed');
    },
    onError: () => toast.error('Failed to remove team member'),
  });

  const resetForm = () =>
    setForm({ name: '', email: '', phone: '', role: 'recruiter', title: '', territory: '', notes: '' });

  const filteredStaff = staff.filter((m: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    const matchesRole = filterRole === 'all' || m.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const activeCount  = staff.filter((m: any) => m.status === 'active').length;
  const invitedCount = staff.filter((m: any) => m.status === 'invited').length;

  const initials = (name?: string) =>
    (name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView contentContainerStyle={s.page}>
      {/* Stats row */}
      <View style={s.statsGrid}>
        <StatTile icon={<Users size={28} color={colors.primary} />} value={staff.length} label="Total Staff" />
        <StatTile icon={<CheckCircle2 size={28} color="#16a149" />} value={activeCount} label="Active" />
        <StatTile icon={<Clock size={28} color="#f49e0a" />} value={invitedCount} label="Pending" />
        <StatTile icon={<Building2 size={28} color={colors.primary} />} value={new Set(staff.map((m: any) => m.role)).size} label="Roles" />
      </View>

      {/* Toolbar */}
      <View style={s.toolbar}>
        <View style={s.toolbarSearch}>
          <View style={s.searchWrap}>
            <View style={s.searchIcon}><Search size={16} color={colors.mutedForeground} /></View>
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ paddingLeft: 36 }}
            />
          </View>
          <View style={{ width: 160 }}>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {AGENCY_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        </View>
        <View style={s.toolbarActions}>
          <Button
            variant="outline"
            leftIcon={<Search size={14} color={colors.foreground} />}
            onPress={() => { setDirectorySearch(''); setSelectedRole('recruiter'); setShowDirectoryDialog(true); }}
          >
            Add from Directory
          </Button>
          <Button
            leftIcon={<UserPlus size={14} color={colors.primaryForeground} />}
            onPress={() => { resetForm(); setShowAddDialog(true); }}
          >
            Add Manually
          </Button>
        </View>
      </View>

      {/* Staff grid */}
      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={colors.mutedForeground} />
          <Text style={s.mutedText}>Loading team...</Text>
        </View>
      ) : filteredStaff.length === 0 ? (
        <Card style={{ borderStyle: 'dashed' }}>
          <CardContent style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: spacing.sm }}>
            <Users size={48} color={colors.mutedForeground} />
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={s.emptyTitle}>No staff members yet</Text>
              <Text style={s.emptyBody}>
                Add recruiters, scouts, and evaluators to your agency to start collaborating on athlete pipelines.
              </Text>
            </View>
            <Button
              size="sm"
              leftIcon={<UserPlus size={14} color={colors.primaryForeground} />}
              onPress={() => { resetForm(); setShowAddDialog(true); }}
            >
              Add Your First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <View style={s.cardsGrid}>
          {filteredStaff.map((member: any) => {
            const status = STATUS_CONFIG[(member.status as StatusKey)] || STATUS_CONFIG.active;
            const StatusIcon = status.Icon;
            const roleLabel = AGENCY_ROLES.find(r => r.value === member.role)?.label || member.role;
            return (
              <Card key={member.id} style={s.memberCard}>
                <CardContent style={{ padding: spacing.md }}>
                  <View style={s.memberHeader}>
                    <View style={s.memberIdentity}>
                      <Avatar fallback={initials(member.name)} size={44} />
                      <View style={{ flexShrink: 1 }}>
                        <Text style={s.memberName} numberOfLines={1}>{member.name}</Text>
                        <Text style={s.memberSub} numberOfLines={1}>{member.title || roleLabel}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => setMenuOpenId(member.id)} style={s.menuBtn} hitSlop={8}>
                      <MoreVertical size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </View>

                  <View style={s.badgeRow}>
                    <Badge variant="outline">{roleLabel}</Badge>
                    <View style={[s.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
                      <StatusIcon size={12} color={status.fg} />
                      <Text style={[s.statusText, { color: status.fg }]}>{status.label}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 4 }}>
                    {member.email ? (
                      <View style={s.infoRow}>
                        <Mail size={12} color={colors.mutedForeground} />
                        <Text style={s.infoText} numberOfLines={1}>{member.email}</Text>
                      </View>
                    ) : null}
                    {member.phone ? (
                      <View style={s.infoRow}>
                        <Phone size={12} color={colors.mutedForeground} />
                        <Text style={s.infoText}>{member.phone}</Text>
                      </View>
                    ) : null}
                    {member.notes ? (
                      <Text style={s.notesText} numberOfLines={2}>{member.notes}</Text>
                    ) : null}
                  </View>
                </CardContent>

                {/* BottomSheet menu (per-member) */}
                <Modal
                  visible={menuOpenId === member.id}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setMenuOpenId(null)}
                >
                  <Pressable style={menuStyles.overlay} onPress={() => setMenuOpenId(null)}>
                    <Pressable style={menuStyles.sheet} onPress={(e) => e.stopPropagation()}>
                      <Pressable style={menuStyles.item} onPress={() => { setMenuOpenId(null); setEditingMember(member); }}>
                        <Edit size={16} color={colors.foreground} />
                        <Text style={menuStyles.itemText}>Edit</Text>
                      </Pressable>
                      {member.status === 'invited' && (
                        <Pressable style={menuStyles.item} onPress={() => { setMenuOpenId(null); updateMember.mutate({ id: member.id, status: 'active', accepted_at: new Date().toISOString() }); }}>
                          <CheckCircle2 size={16} color={colors.foreground} />
                          <Text style={menuStyles.itemText}>Mark Active</Text>
                        </Pressable>
                      )}
                      {member.status === 'active' && (
                        <Pressable style={menuStyles.item} onPress={() => { setMenuOpenId(null); updateMember.mutate({ id: member.id, status: 'suspended' }); }}>
                          <XCircle size={16} color={colors.foreground} />
                          <Text style={menuStyles.itemText}>Suspend</Text>
                        </Pressable>
                      )}
                      {member.status === 'suspended' && (
                        <Pressable style={menuStyles.item} onPress={() => { setMenuOpenId(null); updateMember.mutate({ id: member.id, status: 'active' }); }}>
                          <CheckCircle2 size={16} color={colors.foreground} />
                          <Text style={menuStyles.itemText}>Reactivate</Text>
                        </Pressable>
                      )}
                      <View style={menuStyles.separator} />
                      <Pressable style={menuStyles.item} onPress={() => { setMenuOpenId(null); removeMember.mutate(member.id); }}>
                        <Trash2 size={16} color={colors.destructive} />
                        <Text style={[menuStyles.itemText, { color: colors.destructive }]}>Remove</Text>
                      </Pressable>
                    </Pressable>
                  </Pressable>
                </Modal>
              </Card>
            );
          })}
        </View>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>Invite a new recruiter, scout, or coordinator to {organizationName}.</DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.md }}>
            <View style={s.formRow}>
              <View style={s.formCol}>
                <Label>Full Name *</Label>
                <Input value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Jane Smith" />
              </View>
              <View style={s.formCol}>
                <Label>Title</Label>
                <Input value={form.title} onChangeText={(v) => setForm(f => ({ ...f, title: v }))} placeholder="Southeast Region Lead" />
              </View>
            </View>
            <View style={s.formRow}>
              <View style={s.formCol}>
                <Label>Email</Label>
                <Input keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm(f => ({ ...f, email: v }))} placeholder="jane@agency.com" />
              </View>
              <View style={s.formCol}>
                <Label>Phone</Label>
                <Input value={form.phone} onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} placeholder="(555) 000-0000" />
              </View>
            </View>
            <View>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENCY_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChangeText={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Coverage area, specialization, etc." rows={3} />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onPress={() => addMember.mutate()}
              disabled={!form.name || addMember.isPending}
              loading={addMember.isPending}
              leftIcon={addMember.isPending ? undefined : <UserPlus size={14} color={colors.primaryForeground} />}
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <View style={{ gap: spacing.md }}>
              <View style={s.formRow}>
                <View style={s.formCol}>
                  <Label>Full Name</Label>
                  <Input value={editingMember.name ?? ''} onChangeText={(v) => setEditingMember({ ...editingMember, name: v })} />
                </View>
                <View style={s.formCol}>
                  <Label>Title</Label>
                  <Input value={editingMember.title ?? ''} onChangeText={(v) => setEditingMember({ ...editingMember, title: v })} />
                </View>
              </View>
              <View style={s.formRow}>
                <View style={s.formCol}>
                  <Label>Email</Label>
                  <Input keyboardType="email-address" autoCapitalize="none" value={editingMember.email ?? ''} onChangeText={(v) => setEditingMember({ ...editingMember, email: v })} />
                </View>
                <View style={s.formCol}>
                  <Label>Phone</Label>
                  <Input value={editingMember.phone ?? ''} onChangeText={(v) => setEditingMember({ ...editingMember, phone: v })} />
                </View>
              </View>
              <View>
                <Label>Role</Label>
                <Select value={editingMember.role} onValueChange={(v) => setEditingMember({ ...editingMember, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGENCY_ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View>
                <Label>Notes</Label>
                <Textarea value={editingMember.notes ?? ''} onChangeText={(v) => setEditingMember({ ...editingMember, notes: v })} rows={3} />
              </View>
            </View>
          )}
          <DialogFooter>
            <Button variant="outline" onPress={() => setEditingMember(null)}>Cancel</Button>
            <Button
              onPress={() => updateMember.mutate({
                id: editingMember.id, name: editingMember.name, title: editingMember.title,
                email: editingMember.email, phone: editingMember.phone, role: editingMember.role,
                notes: editingMember.notes,
              })}
              disabled={updateMember.isPending}
              loading={updateMember.isPending}
              leftIcon={updateMember.isPending ? undefined : <Edit size={14} color={colors.primaryForeground} />}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scout Directory Dialog */}
      <Dialog open={showDirectoryDialog} onOpenChange={setShowDirectoryDialog}>
        <DialogContent style={{ maxWidth: 520, maxHeight: '80%' }}>
          <DialogHeader>
            <DialogTitle>Add from Scout Directory</DialogTitle>
            <DialogDescription>Search registered scouts to add them to {organizationName}.</DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.md }}>
            <View style={s.searchWrap}>
              <View style={s.searchIcon}><Search size={16} color={colors.mutedForeground} /></View>
              <Input
                placeholder="Search by name, title, or specialization..."
                value={directorySearch}
                onChangeText={setDirectorySearch}
                style={{ paddingLeft: 36 }}
                autoFocus
              />
            </View>
            <View>
              <Label>Assign Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENCY_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={{ maxHeight: 256 }}>
              {directorySearch.length < 2 ? (
                <Text style={s.dirHint}>Type at least 2 characters to search</Text>
              ) : directoryLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator color={colors.mutedForeground} />
                </View>
              ) : directoryResults.length === 0 ? (
                <Text style={s.dirHint}>No scouts found matching "{directorySearch}"</Text>
              ) : (
                <FlatList
                  data={directoryResults as any[]}
                  keyExtractor={(it: any) => it.id}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
                  renderItem={({ item: scout }) => (
                    <View style={s.dirItem}>
                      <View style={s.dirItemLeft}>
                        <Avatar
                          source={scout.image_url ? { uri: scout.image_url } : null}
                          fallback={initials(scout.name)}
                          size={36}
                        />
                        <View style={{ flexShrink: 1 }}>
                          <View style={s.dirNameRow}>
                            <Text style={s.dirName} numberOfLines={1}>{scout.name}</Text>
                            {scout.is_verified ? <Badge variant="outline">Verified</Badge> : null}
                          </View>
                          <Text style={s.dirSub} numberOfLines={1}>
                            {[scout.title, scout.specialization].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      </View>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => assignScout.mutate(scout)}
                        disabled={assignScout.isPending}
                        loading={assignScout.isPending}
                        leftIcon={assignScout.isPending ? undefined : <UserPlus size={12} color={colors.foreground} />}
                      >
                        Add
                      </Button>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}

// ---------- StatTile ----------
function StatTile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card style={s.statCard}>
      <CardContent style={s.statContent}>
        {icon}
        <View style={{ flexShrink: 1 }}>
          <Text style={s.statValue}>{value}</Text>
          <Text style={s.statLabel}>{label}</Text>
        </View>
      </CardContent>
    </Card>
  );
}

// ---------- Styles ----------
const s = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.md },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flexGrow: 1, flexBasis: '47%', minWidth: 140 },
  statContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  statValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xl, color: colors.foreground },
  statLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },

  toolbar: { flexDirection: 'column', gap: spacing.sm },
  toolbarSearch: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  toolbarActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },

  searchWrap: { flex: 1, position: 'relative' },
  searchIcon: { position: 'absolute', left: 10, top: 12, zIndex: 1 },

  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: spacing.sm },
  mutedText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm },

  emptyTitle: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.base },
  emptyBody: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, textAlign: 'center', maxWidth: 320 },

  cardsGrid: { gap: spacing.md },
  memberCard: { width: '100%' },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  memberIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  memberName: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.sm },
  memberSub: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  menuBtn: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  statusText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, flexShrink: 1 },
  notesText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, fontStyle: 'italic', marginTop: spacing.xs },

  formRow: { flexDirection: 'row', gap: spacing.sm },
  formCol: { flex: 1, gap: 6 },

  dirHint: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, textAlign: 'center', paddingVertical: 24 },
  dirItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  dirItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  dirNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dirName: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.sm },
  dirSub: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs },
});

const menuStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderColor: colors.border, borderWidth: 1,
    padding: spacing.md, gap: spacing.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  itemText: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});

export default AgencyStaffManager;
