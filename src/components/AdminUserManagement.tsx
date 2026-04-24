// Ported verbatim from Lovable src/components/AdminUserManagement.tsx.
// Web → RN mapping notes:
//   - HTML <table> → per-row <View> cards rendered inside a FlashList (v2 API, no estimatedItemSize).
//     Mobile-first: no desktop columns. Every field from the Lovable table is present on the card.
//   - Tailwind classes → StyleSheet using @/lib/theme tokens.
//   - shadcn/ui imports → @/components/ui/* (Card/Button/Input/Badge/Checkbox/ScrollArea/Skeleton/Select/Dialog).
//   - <AlertDialog> → <Dialog> from @/components/ui/Dialog (AlertDialog not ported yet; pattern used in
//     AdminTermsManagement). Semantics preserved — confirmation copy + destructive action button.
//   - <DropdownMenu> → local BottomSheetMenu component (Modal-based) to preserve parity.
//   - lucide-react → lucide-react-native.
//   - supabase via @/integrations/supabase/client (unchanged — web already used the same module path).
//   - window.open(url) → Linking.openURL(url) (native deep-link / browser).
//   - CSV/Excel downloads → expo-file-system writeAsStringAsync + expo-sharing.shareAsync.
//   - toast (sonner) → @/components/ui/toast wrapper (react-native-toast-message).
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  Linking,
  ViewStyle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Skeleton } from '@/components/ui/Skeleton';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { toast } from '@/components/ui/toast';
import {
  Search,
  Loader2,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Eye,
  UserX,
  RefreshCw,
  ChevronDown,
  XSquare,
  UserCog,
  Download,
  FileSpreadsheet,
  Mail,
  Ban,
  UserCheck,
  History,
  FileText,
  Phone,
  Bell,
  Activity,
} from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface SuspensionInfo {
  suspended_at: string;
  reason: string | null;
  suspended_by_email: string;
}

interface ProfileVerification {
  athlete?: { is_verified: boolean; verified_at: string | null; verified_by_email: string | null };
  coach?: { is_verified: boolean };
  scout?: { is_verified: boolean };
}

interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  role: string;
  user_type: string;
  display_name: string | null;
  user_metadata: Record<string, unknown>;
  is_suspended: boolean;
  suspension_info: SuspensionInfo | null;
  profile_verification: ProfileVerification | null;
}

interface ActivityEvent {
  id: string;
  type: string;
  action: string;
  details: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
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
  separatorAbove?: boolean;
  trailing?: React.ReactNode;
}

function BottomSheetMenu({
  open,
  onClose,
  items,
  title,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItemSpec[];
  title?: string;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={menuStyles.overlay} onPress={onClose}>
        <Pressable style={menuStyles.sheet} onPress={(e) => e.stopPropagation()}>
          {title ? <Text style={menuStyles.title}>{title}</Text> : null}
          {items.map((it) => (
            <React.Fragment key={it.key}>
              {it.separatorAbove ? <View style={menuStyles.separator} /> : null}
              <Pressable
                style={menuStyles.item}
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
                {it.trailing ? <View style={{ marginLeft: 'auto' }}>{it.trailing}</View> : null}
              </Pressable>
            </React.Fragment>
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
  title: {
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyMedium,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
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
  separator: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------
export function AdminUserManagement() {
  const { user: currentUser } = useAuth();
  const { startImpersonation } = useImpersonation();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk delete dialog
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AuthUser | null>(null);
  const [newRole, setNewRole] = useState<string>('user');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Bulk role dialog
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>('user');
  const [bulkUpdatingRole, setBulkUpdatingRole] = useState(false);

  // Impersonation
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Activity timeline
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityUser, setActivityUser] = useState<AuthUser | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Resend verification
  const [resendingVerification, setResendingVerification] = useState<string | null>(null);

  // Suspend/unsuspend
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<AuthUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [unsuspending, setUnsuspending] = useState<string | null>(null);

  // Profile verification
  const [verifyingProfile, setVerifyingProfile] = useState<string | null>(null);

  // Menu states (replaces DropdownMenu.open)
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users');

      if (error) throw error;
      setUsers((data as any)?.users || []);
      setSelectedUsers(new Set());
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableUsers = filteredUsers
        .filter((u) => u.id !== currentUser?.id)
        .map((u) => u.id);
      setSelectedUsers(new Set(selectableUsers));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: userToDelete.id, userEmail: userToDelete.email },
      });

      if (error) throw error;

      toast.success(`User ${userToDelete.email} deleted successfully`);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSelectedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userToDelete.id);
        return newSet;
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    setBulkDeleting(true);
    const usersToDelete = Array.from(selectedUsers);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const userId of usersToDelete) {
        const user = users.find((u) => u.id === userId);
        if (!user) continue;

        try {
          const { error } = await supabase.functions.invoke('admin-delete-user', {
            body: { userId: user.id, userEmail: user.email },
          });

          if (error) throw error;
          successCount++;
        } catch (err) {
          console.error(`Failed to delete user ${user.email}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} user(s)`);
        setUsers((prev) => prev.filter((u) => !selectedUsers.has(u.id) || failCount > 0));
        setSelectedUsers(new Set());
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} user(s)`);
      }

      setBulkDeleteDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Error in bulk delete:', err);
      toast.error('Bulk delete operation failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!userToEdit) return;

    setUpdatingRole(true);
    try {
      const { error } = await supabase.functions.invoke('admin-update-role', {
        body: {
          targetUserId: userToEdit.id,
          targetUserEmail: userToEdit.email,
          newRole,
        },
      });

      if (error) throw error;

      toast.success(`Role updated to ${newRole}`);
      setUsers((prev) => prev.map((u) => (u.id === userToEdit.id ? { ...u, role: newRole } : u)));
      setRoleDialogOpen(false);
      setUserToEdit(null);
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleBulkRoleUpdate = async () => {
    if (selectedUsers.size === 0) return;

    setBulkUpdatingRole(true);
    const usersToUpdate = Array.from(selectedUsers);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const userId of usersToUpdate) {
        const user = users.find((u) => u.id === userId);
        if (!user) continue;

        try {
          const { error } = await supabase.functions.invoke('admin-update-role', {
            body: {
              targetUserId: user.id,
              targetUserEmail: user.email,
              newRole: bulkRole,
            },
          });

          if (error) throw error;
          successCount++;
        } catch (err) {
          console.error(`Failed to update role for ${user.email}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully updated role for ${successCount} user(s)`);
        setUsers((prev) =>
          prev.map((u) => (selectedUsers.has(u.id) ? { ...u, role: bulkRole } : u)),
        );
        setSelectedUsers(new Set());
      }
      if (failCount > 0) {
        toast.error(`Failed to update ${failCount} user(s)`);
      }

      setBulkRoleDialogOpen(false);
    } catch (err: any) {
      console.error('Error in bulk role update:', err);
      toast.error('Bulk role update failed');
    } finally {
      setBulkUpdatingRole(false);
    }
  };

  const handleImpersonate = async (user: AuthUser) => {
    if (!user.email) {
      toast.error('Cannot impersonate user without email');
      return;
    }

    setImpersonating(user.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-impersonate-user', {
        body: { targetUserId: user.id, targetUserEmail: user.email },
      });

      if (error) throw error;

      if ((data as any)?.impersonationUrl) {
        // Store impersonation data before opening new tab
        startImpersonation({
          adminEmail: (data as any).adminEmail || currentUser?.email || 'admin',
          targetUserId: user.id,
          targetUserEmail: user.email,
        });

        toast.success('Opening impersonation session in new tab');
        Linking.openURL((data as any).impersonationUrl);
      } else {
        toast.error('Failed to generate impersonation link');
      }
    } catch (err: any) {
      console.error('Error impersonating user:', err);
      toast.error(err.message || 'Failed to impersonate user');
    } finally {
      setImpersonating(null);
    }
  };

  const handleResendVerification = async (user: AuthUser) => {
    if (!user.email) {
      toast.error('Cannot send verification to user without email');
      return;
    }

    setResendingVerification(user.id);
    try {
      const { error } = await supabase.functions.invoke('admin-resend-verification', {
        body: { userId: user.id, userEmail: user.email },
      });

      if (error) throw error;

      toast.success(`Verification email sent to ${user.email}`);
    } catch (err: any) {
      console.error('Error resending verification:', err);
      toast.error(err.message || 'Failed to resend verification');
    } finally {
      setResendingVerification(null);
    }
  };

  const handleViewActivity = async (user: AuthUser) => {
    setActivityUser(user);
    setActivityDialogOpen(true);
    setLoadingActivities(true);
    setActivities([]);

    try {
      const { data, error } = await supabase.functions.invoke('admin-user-activity', {
        body: { userId: user.id },
      });

      if (error) throw error;
      setActivities((data as any)?.activities || []);
    } catch (err: any) {
      console.error('Error fetching user activity:', err);
      toast.error('Failed to load user activity');
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!userToSuspend) return;

    setSuspending(true);
    try {
      const { error } = await supabase.functions.invoke('admin-suspend-user', {
        body: {
          targetUserId: userToSuspend.id,
          targetUserEmail: userToSuspend.email,
          action: 'suspend',
          reason: suspendReason || null,
        },
      });

      if (error) throw error;

      toast.success(`User ${userToSuspend.email} has been suspended`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToSuspend.id
            ? {
                ...u,
                is_suspended: true,
                suspension_info: {
                  suspended_at: new Date().toISOString(),
                  reason: suspendReason || null,
                  suspended_by_email: currentUser?.email || '',
                },
              }
            : u,
        ),
      );
      setSuspendDialogOpen(false);
      setUserToSuspend(null);
      setSuspendReason('');
    } catch (err: any) {
      console.error('Error suspending user:', err);
      toast.error(err.message || 'Failed to suspend user');
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspendUser = async (user: AuthUser) => {
    setUnsuspending(user.id);
    try {
      const { error } = await supabase.functions.invoke('admin-suspend-user', {
        body: {
          targetUserId: user.id,
          targetUserEmail: user.email,
          action: 'unsuspend',
        },
      });

      if (error) throw error;

      toast.success(`User ${user.email} has been reactivated`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                is_suspended: false,
                suspension_info: null,
              }
            : u,
        ),
      );
    } catch (err: any) {
      console.error('Error unsuspending user:', err);
      toast.error(err.message || 'Failed to unsuspend user');
    } finally {
      setUnsuspending(null);
    }
  };

  const handleVerifyProfile = async (
    user: AuthUser,
    profileType: string,
    action: 'verify' | 'unverify',
  ) => {
    setVerifyingProfile(`${user.id}-${profileType}`);
    try {
      const { error } = await supabase.functions.invoke('admin-verify-user', {
        body: {
          targetUserId: user.id,
          targetUserEmail: user.email,
          profileType,
          action,
        },
      });

      if (error) throw error;

      const actionText = action === 'verify' ? 'verified' : 'unverified';
      toast.success(
        `${profileType.charAt(0).toUpperCase() + profileType.slice(1)} profile ${actionText}`,
      );

      // Update local state
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== user.id) return u;

          const newVerification = { ...u.profile_verification } as ProfileVerification;
          if (profileType === 'athlete') {
            newVerification.athlete = {
              is_verified: action === 'verify',
              verified_at: action === 'verify' ? new Date().toISOString() : null,
              verified_by_email: action === 'verify' ? currentUser?.email || null : null,
            };
          } else if (profileType === 'coach') {
            newVerification.coach = { is_verified: action === 'verify' };
          } else if (profileType === 'scout') {
            newVerification.scout = { is_verified: action === 'verify' };
          }

          return { ...u, profile_verification: newVerification };
        }),
      );
    } catch (err: any) {
      console.error('Error updating verification:', err);
      toast.error(err.message || 'Failed to update verification status');
    } finally {
      setVerifyingProfile(null);
    }
  };

  // Shared writer for CSV/Excel (replaces the web Blob + anchor-download dance).
  const writeAndShareFile = async (filename: string, content: string, mimeType: string) => {
    try {
      const uri = (FileSystem as any).cacheDirectory + filename;
      await (FileSystem as any).writeAsStringAsync(uri, content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
      } else {
        toast.success('Saved', uri);
      }
    } catch (e: any) {
      toast.error('Export failed', e?.message);
    }
  };

  const exportToCSV = () => {
    const dataToExport =
      selectedUsers.size > 0 ? filteredUsers.filter((u) => selectedUsers.has(u.id)) : filteredUsers;

    const headers = ['Email', 'Role', 'Created', 'Last Sign In', 'Verified', 'User ID'];
    const rows = dataToExport.map((user) => [
      user.email || 'No email',
      user.role,
      format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss'),
      user.last_sign_in_at
        ? format(new Date(user.last_sign_in_at), 'yyyy-MM-dd HH:mm:ss')
        : 'Never',
      user.email_confirmed_at ? 'Yes' : 'No',
      user.id,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    void writeAndShareFile(
      `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      csvContent,
      'text/csv;charset=utf-8;',
    );

    toast.success(`Exported ${dataToExport.length} users to CSV`);
  };

  const exportToExcel = () => {
    // For Excel, we'll create a tab-separated file with .xls extension
    // Excel can open this format
    const dataToExport =
      selectedUsers.size > 0 ? filteredUsers.filter((u) => selectedUsers.has(u.id)) : filteredUsers;

    const headers = ['Email', 'Role', 'Created', 'Last Sign In', 'Verified', 'User ID'];
    const rows = dataToExport.map((user) => [
      user.email || 'No email',
      user.role,
      format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss'),
      user.last_sign_in_at
        ? format(new Date(user.last_sign_in_at), 'yyyy-MM-dd HH:mm:ss')
        : 'Never',
      user.email_confirmed_at ? 'Yes' : 'No',
      user.id,
    ]);

    const xlsContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

    void writeAndShareFile(
      `users_export_${format(new Date(), 'yyyy-MM-dd')}.xls`,
      xlsContent,
      'application/vnd.ms-excel',
    );

    toast.success(`Exported ${dataToExport.length} users to Excel`);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    const matchesUserType =
      userTypeFilter === 'all' ||
      (userTypeFilter === 'none' && user.user_type === 'none') ||
      user.user_type.includes(userTypeFilter);

    return matchesSearch && matchesRole && matchesUserType;
  });

  const selectableUsersCount = filteredUsers.filter((u) => u.id !== currentUser?.id).length;
  const allSelectableSelected =
    selectableUsersCount > 0 &&
    filteredUsers.filter((u) => u.id !== currentUser?.id).every((u) => selectedUsers.has(u.id));
  const someSelected = selectedUsers.size > 0;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge style={{ backgroundColor: '#f59e0b' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Shield size={12} color="#fff" />
              <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Admin</Text>
            </View>
          </Badge>
        );
      case 'moderator':
        return (
          <Badge style={{ backgroundColor: '#3b82f6' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={12} color="#fff" />
              <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Mod</Text>
            </View>
          </Badge>
        );
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'letter':
        return <FileText size={16} color="#3b82f6" />;
      case 'contact':
        return <Phone size={16} color="#22c55e" />;
      case 'admin_action':
        return <Shield size={16} color="#f59e0b" />;
      case 'notification':
        return <Bell size={16} color="#a855f7" />;
      case 'profile':
        return <Users size={16} color="#06b6d4" />;
      default:
        return <Activity size={16} color={colors.mutedForeground} />;
    }
  };

  // ------------------------------------------------------------------
  // Row renderer — replaces <TableRow> per user.
  // ------------------------------------------------------------------
  const renderUserRow = ({ item: user }: { item: AuthUser }) => {
    const isSelf = user.id === currentUser?.id;
    const isRowSelected = selectedUsers.has(user.id);
    const typeTokens = user.user_type === 'none' ? [] : user.user_type.split(', ');

    const typeBadgeStyle = (t: string): ViewStyle | undefined => {
      if (t === 'athlete') return { backgroundColor: '#d1fae5' };
      if (t === 'coach') return { backgroundColor: '#dbeafe' };
      if (t === 'scout') return { backgroundColor: '#ede9fe' };
      if (t === 'parent') return { backgroundColor: '#ffedd5' };
      return undefined;
    };
    const typeBadgeTextColor = (t: string) => {
      if (t === 'athlete') return '#047857';
      if (t === 'coach') return '#1d4ed8';
      if (t === 'scout') return '#6d28d9';
      if (t === 'parent') return '#c2410c';
      return colors.foreground;
    };

    return (
      <View style={[styles.row, isRowSelected && styles.rowSelected]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <Checkbox
            checked={isRowSelected}
            onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
            disabled={isSelf}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
              <Text style={styles.userName}>{user.display_name || user.email || 'No email'}</Text>
              {isSelf ? <Badge variant="outline">You</Badge> : null}
            </View>
            {user.display_name ? <Text style={styles.userSub}>{user.email}</Text> : null}

            {/* Type */}
            <View style={styles.badgeRow}>
              {typeTokens.length === 0 ? (
                <Badge variant="outline"><Text style={{ color: colors.mutedForeground, fontSize: typography.size.xs }}>None</Text></Badge>
              ) : (
                typeTokens.map((type) => (
                  <Badge key={type} variant="secondary" style={typeBadgeStyle(type)}>
                    <Text style={{ color: typeBadgeTextColor(type), fontSize: typography.size.xs }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Badge>
                ))
              )}
            </View>

            {/* Role + status */}
            <View style={styles.badgeRow}>
              {getRoleBadge(user.role)}
              {user.is_suspended ? (
                <View style={{ flexDirection: 'column', gap: 2 }}>
                  <Badge style={{ backgroundColor: '#ef4444' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ban size={12} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Suspended</Text>
                    </View>
                  </Badge>
                  {user.suspension_info?.reason ? (
                    <Text style={styles.metaSmall} numberOfLines={1}>
                      {user.suspension_info.reason}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Badge style={{ backgroundColor: '#22c55e' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <UserCheck size={12} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Active</Text>
                  </View>
                </Badge>
              )}
            </View>

            {/* Created / Last sign-in */}
            <Text style={styles.metaSmall}>
              Created {format(new Date(user.created_at), 'MMM d, yyyy')}
              {'  ·  '}
              {user.last_sign_in_at
                ? `Last ${formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })}`
                : 'Never signed in'}
            </Text>

            {/* Email verified */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
              {user.email_confirmed_at ? (
                <Badge style={{ backgroundColor: '#22c55e' }}>
                  <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Verified</Text>
                </Badge>
              ) : (
                <>
                  <Badge variant="secondary">
                    <Text style={{ fontSize: typography.size.xs }}>Unverified</Text>
                  </Badge>
                  <Pressable
                    style={styles.iconPill}
                    onPress={() => handleResendVerification(user)}
                    disabled={resendingVerification === user.id}
                  >
                    {resendingVerification === user.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Mail size={14} color={colors.foreground} />
                    )}
                  </Pressable>
                </>
              )}
            </View>

            {/* Profile verification */}
            <View style={{ gap: spacing.xs }}>
              {user.profile_verification ? (
                <>
                  {user.profile_verification.athlete ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      {user.profile_verification.athlete.is_verified ? (
                        <Badge style={{ backgroundColor: '#10b981' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={12} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Athlete</Text>
                          </View>
                        </Badge>
                      ) : (
                        <Badge variant="outline" style={{ borderColor: '#f59e0b' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ShieldAlert size={12} color="#d97706" />
                            <Text style={{ color: '#d97706', fontSize: typography.size.xs }}>Athlete</Text>
                          </View>
                        </Badge>
                      )}
                      <Pressable
                        style={styles.iconPillSmall}
                        onPress={() =>
                          handleVerifyProfile(
                            user,
                            'athlete',
                            user.profile_verification?.athlete?.is_verified ? 'unverify' : 'verify',
                          )
                        }
                        disabled={verifyingProfile === `${user.id}-athlete`}
                      >
                        {verifyingProfile === `${user.id}-athlete` ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : user.profile_verification.athlete.is_verified ? (
                          <XSquare size={12} color="#ef4444" />
                        ) : (
                          <ShieldCheck size={12} color="#22c55e" />
                        )}
                      </Pressable>
                    </View>
                  ) : null}

                  {user.profile_verification.coach ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      {user.profile_verification.coach.is_verified ? (
                        <Badge style={{ backgroundColor: '#3b82f6' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={12} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Coach</Text>
                          </View>
                        </Badge>
                      ) : (
                        <Badge variant="outline" style={{ borderColor: '#f59e0b' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ShieldAlert size={12} color="#d97706" />
                            <Text style={{ color: '#d97706', fontSize: typography.size.xs }}>Coach</Text>
                          </View>
                        </Badge>
                      )}
                      <Pressable
                        style={styles.iconPillSmall}
                        onPress={() =>
                          handleVerifyProfile(
                            user,
                            'coach',
                            user.profile_verification?.coach?.is_verified ? 'unverify' : 'verify',
                          )
                        }
                        disabled={verifyingProfile === `${user.id}-coach`}
                      >
                        {verifyingProfile === `${user.id}-coach` ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : user.profile_verification.coach.is_verified ? (
                          <XSquare size={12} color="#ef4444" />
                        ) : (
                          <ShieldCheck size={12} color="#22c55e" />
                        )}
                      </Pressable>
                    </View>
                  ) : null}

                  {user.profile_verification.scout ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      {user.profile_verification.scout.is_verified ? (
                        <Badge style={{ backgroundColor: '#a855f7' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={12} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: typography.size.xs }}>Scout</Text>
                          </View>
                        </Badge>
                      ) : (
                        <Badge variant="outline" style={{ borderColor: '#f59e0b' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ShieldAlert size={12} color="#d97706" />
                            <Text style={{ color: '#d97706', fontSize: typography.size.xs }}>Scout</Text>
                          </View>
                        </Badge>
                      )}
                      <Pressable
                        style={styles.iconPillSmall}
                        onPress={() =>
                          handleVerifyProfile(
                            user,
                            'scout',
                            user.profile_verification?.scout?.is_verified ? 'unverify' : 'verify',
                          )
                        }
                        disabled={verifyingProfile === `${user.id}-scout`}
                      >
                        {verifyingProfile === `${user.id}-scout` ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : user.profile_verification.scout.is_verified ? (
                          <XSquare size={12} color="#ef4444" />
                        ) : (
                          <ShieldCheck size={12} color="#22c55e" />
                        )}
                      </Pressable>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.metaSmall}>No profile</Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => handleViewActivity(user)}
              >
                <History size={16} color={colors.foreground} />
              </Pressable>
              <Pressable
                style={[styles.actionBtn, (impersonating === user.id || isSelf) && styles.actionBtnDisabled]}
                onPress={() => handleImpersonate(user)}
                disabled={impersonating === user.id || isSelf}
              >
                {impersonating === user.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Eye size={16} color={colors.foreground} />
                )}
              </Pressable>
              <Pressable
                style={[styles.actionBtn, isSelf && styles.actionBtnDisabled]}
                onPress={() => {
                  setUserToEdit(user);
                  setNewRole(user.role);
                  setRoleDialogOpen(true);
                }}
                disabled={isSelf}
              >
                <ShieldAlert size={16} color={colors.foreground} />
              </Pressable>
              {user.is_suspended ? (
                <Pressable
                  style={[styles.actionBtn, (unsuspending === user.id || isSelf) && styles.actionBtnDisabled]}
                  onPress={() => handleUnsuspendUser(user)}
                  disabled={unsuspending === user.id || isSelf}
                >
                  {unsuspending === user.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <UserCheck size={16} color="#22c55e" />
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.actionBtn, isSelf && styles.actionBtnDisabled]}
                  onPress={() => {
                    setUserToSuspend(user);
                    setSuspendReason('');
                    setSuspendDialogOpen(true);
                  }}
                  disabled={isSelf}
                >
                  <Ban size={16} color="#d97706" />
                </Pressable>
              )}
              <Pressable
                style={[styles.actionBtn, isSelf && styles.actionBtnDisabled]}
                onPress={() => {
                  setUserToDelete(user);
                  setDeleteDialogOpen(true);
                }}
                disabled={isSelf}
              >
                <Trash2 size={16} color={colors.destructive} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <CardTitle>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Users size={20} color={colors.foreground} />
                  <Text style={styles.cardTitleText}>User Accounts</Text>
                </View>
              </CardTitle>
              <CardDescription>
                Manage user accounts and roles ({filteredUsers.length} users)
              </CardDescription>
            </View>
            <View style={styles.headerActions}>
              {someSelected ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Badge variant="secondary">
                    <Text style={{ fontSize: typography.size.sm }}>{selectedUsers.size} selected</Text>
                  </Badge>
                  <Button variant="default" size="sm" onPress={() => setBulkMenuOpen(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <UserCog size={16} color={colors.primaryForeground} />
                      <Text style={styles.btnLabelOnPrimary}>Bulk Actions</Text>
                      <ChevronDown size={16} color={colors.primaryForeground} />
                    </View>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setSelectedUsers(new Set())}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <XSquare size={16} color={colors.foreground} />
                      <Text style={styles.btnLabel}>Clear</Text>
                    </View>
                  </Button>
                </View>
              ) : null}

              <Button variant="outline" size="sm" onPress={() => setExportMenuOpen(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Download size={16} color={colors.foreground} />
                  <Text style={styles.btnLabel}>Export</Text>
                  <ChevronDown size={16} color={colors.foreground} />
                </View>
              </Button>

              <Button variant="outline" size="sm" onPress={fetchUsers} disabled={loading}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.foreground} />
                  ) : (
                    <RefreshCw size={16} color={colors.foreground} />
                  )}
                  <Text style={styles.btnLabel}>Refresh</Text>
                </View>
              </Button>
            </View>
          </View>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <View style={styles.filtersRow}>
            <View style={[styles.searchWrap, { flex: 1, minWidth: 200 }]}>
              <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ paddingLeft: 36 }}
              />
            </View>

            <View style={{ width: 150 }}>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </View>

            <View style={{ width: 150 }}>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="athlete">Athletes</SelectItem>
                  <SelectItem value="coach">Coaches</SelectItem>
                  <SelectItem value="scout">Scouts</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                  <SelectItem value="none">No Profile</SelectItem>
                </SelectContent>
              </Select>
            </View>
          </View>

          {/* Select-all helper (replaces table head checkbox) */}
          {!loading && filteredUsers.length > 0 ? (
            <View style={styles.selectAllRow}>
              <Checkbox
                checked={allSelectableSelected}
                onCheckedChange={handleSelectAll}
              />
              <Text style={styles.selectAllText}>Select all ({selectableUsersCount})</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.xl }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <UserX size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          ) : (
            <View style={{ minHeight: 400 }}>
              <FlashList
                data={filteredUsers}
                keyExtractor={(u) => u.id}
                renderItem={renderUserRow}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              />
            </View>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Menu */}
      <BottomSheetMenu
        open={bulkMenuOpen}
        onClose={() => setBulkMenuOpen(false)}
        title="Bulk Actions"
        items={[
          {
            key: 'role',
            label: 'Change Role',
            icon: <Shield size={16} color={colors.foreground} />,
            onPress: () => {
              setBulkRole('user');
              setBulkRoleDialogOpen(true);
            },
          },
          {
            key: 'delete',
            label: 'Delete Selected',
            icon: <Trash2 size={16} color={colors.destructive} />,
            destructive: true,
            separatorAbove: true,
            onPress: () => setBulkDeleteDialogOpen(true),
          },
        ]}
      />

      {/* Export Menu */}
      <BottomSheetMenu
        open={exportMenuOpen}
        onClose={() => setExportMenuOpen(false)}
        title="Export"
        items={[
          {
            key: 'csv',
            label: 'Export as CSV',
            icon: <FileText size={16} color={colors.foreground} />,
            onPress: exportToCSV,
            trailing: someSelected ? (
              <Badge variant="secondary"><Text style={{ fontSize: typography.size.xs }}>{selectedUsers.size}</Text></Badge>
            ) : undefined,
          },
          {
            key: 'xls',
            label: 'Export as Excel',
            icon: <FileSpreadsheet size={16} color={colors.foreground} />,
            onPress: exportToExcel,
            trailing: someSelected ? (
              <Badge variant="secondary"><Text style={{ fontSize: typography.size.xs }}>{selectedUsers.size}</Text></Badge>
            ) : undefined,
          },
        ]}
      />

      {/* Single Delete Confirmation Dialog (AlertDialog → Dialog) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account for {userToDelete?.email}? This action
              cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onPress={handleDeleteUser}
              disabled={deleting}
              loading={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedUsers.size} User Accounts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUsers.size} user account(s)? This action
              cannot be undone and will remove all associated data for these users.
            </DialogDescription>
          </DialogHeader>
          <View style={styles.dialogList}>
            <ScrollArea style={{ maxHeight: 200 }}>
              <View style={{ gap: 4 }}>
                {Array.from(selectedUsers).map((id) => {
                  const user = users.find((u) => u.id === id);
                  return user ? (
                    <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Trash2 size={12} color={colors.destructive} />
                      <Text style={styles.dialogListText}>{user.email}</Text>
                    </View>
                  ) : null;
                })}
              </View>
            </ScrollArea>
          </View>
          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onPress={handleBulkDelete}
              disabled={bulkDeleting}
              loading={bulkDeleting}
            >
              {bulkDeleting ? `Deleting ${selectedUsers.size}...` : `Delete ${selectedUsers.size} Accounts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Role Edit Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Change the role for {userToEdit?.email}
            </DialogDescription>
          </DialogHeader>
          <View style={{ paddingVertical: spacing.md }}>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setRoleDialogOpen(false)} disabled={updatingRole}>
              Cancel
            </Button>
            <Button onPress={handleUpdateRole} disabled={updatingRole} loading={updatingRole}>
              {updatingRole ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Role Edit Dialog */}
      <Dialog open={bulkRoleDialogOpen} onOpenChange={setBulkRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Role for {selectedUsers.size} Users</DialogTitle>
            <DialogDescription>Change the role for all selected users</DialogDescription>
          </DialogHeader>
          <View style={styles.dialogList}>
            <ScrollArea style={{ maxHeight: 150 }}>
              <View style={{ gap: 4 }}>
                {Array.from(selectedUsers).slice(0, 10).map((id) => {
                  const user = users.find((u) => u.id === id);
                  return user ? (
                    <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Users size={12} color={colors.mutedForeground} />
                      <Text style={styles.dialogListText}>{user.email}</Text>
                    </View>
                  ) : null;
                })}
                {selectedUsers.size > 10 ? (
                  <Text style={[styles.dialogListText, { color: colors.mutedForeground }]}>
                    ...and {selectedUsers.size - 10} more
                  </Text>
                ) : null}
              </View>
            </ScrollArea>
          </View>
          <View style={{ paddingVertical: spacing.md }}>
            <Select value={bulkRole} onValueChange={setBulkRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </View>
          <DialogFooter>
            <Button
              variant="outline"
              onPress={() => setBulkRoleDialogOpen(false)}
              disabled={bulkUpdatingRole}
            >
              Cancel
            </Button>
            <Button
              onPress={handleBulkRoleUpdate}
              disabled={bulkUpdatingRole}
              loading={bulkUpdatingRole}
            >
              {bulkUpdatingRole
                ? `Updating ${selectedUsers.size}...`
                : `Update ${selectedUsers.size} Users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ban size={20} color="#f59e0b" />
                <Text style={styles.cardTitleText}>Suspend User Account</Text>
              </View>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {userToSuspend?.email}? The user will not be able to
              access their account until unsuspended.
            </DialogDescription>
          </DialogHeader>
          <View style={{ paddingVertical: spacing.md, gap: spacing.xs }}>
            <Text style={styles.label}>Reason (optional)</Text>
            <Input
              placeholder="Enter reason for suspension..."
              value={suspendReason}
              onChangeText={setSuspendReason}
            />
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setSuspendDialogOpen(false)} disabled={suspending}>
              Cancel
            </Button>
            <Button
              onPress={handleSuspendUser}
              disabled={suspending}
              loading={suspending}
              style={{ backgroundColor: '#f59e0b' }}
            >
              {suspending ? 'Suspending...' : 'Suspend Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Timeline Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent style={{ maxWidth: 640 }}>
          <DialogHeader>
            <DialogTitle>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <History size={20} color={colors.foreground} />
                <Text style={styles.cardTitleText}>Activity Timeline</Text>
              </View>
            </DialogTitle>
            <DialogDescription>
              Activity history for {activityUser?.email}
            </DialogDescription>
          </DialogHeader>

          {loadingActivities ? (
            <View style={{ gap: spacing.md, paddingVertical: spacing.md }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                  <Skeleton style={{ width: 32, height: 32, borderRadius: 999 }} />
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Skeleton style={{ height: 14, width: '75%' }} />
                    <Skeleton style={{ height: 12, width: '50%' }} />
                  </View>
                </View>
              ))}
            </View>
          ) : activities.length === 0 ? (
            <View style={[styles.emptyState, { paddingVertical: spacing.xl }]}>
              <Activity size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No activity found for this user</Text>
            </View>
          ) : (
            <ScrollArea style={{ height: 400 }}>
              <View style={{ gap: spacing.md, paddingVertical: spacing.xs }}>
                {activities.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityIconWrap}>{getActivityIcon(activity.type)}</View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                        <Text style={styles.activityAction}>{activity.action}</Text>
                        <Badge variant="outline">
                          <Text style={{ fontSize: typography.size.xs, textTransform: 'capitalize' }}>
                            {activity.type.replace(/_/g, ' ')}
                          </Text>
                        </Badge>
                      </View>
                      {activity.details ? (
                        <Text style={styles.activityDetails} numberOfLines={2}>
                          {activity.details}
                        </Text>
                      ) : null}
                      <Text style={styles.activityMeta}>
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        {' • '}
                        {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onPress={() => setActivityDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  cardTitleText: {
    color: colors.foreground,
    fontSize: typography.heading.h5,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  btnLabel: {
    color: colors.foreground,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  btnLabelOnPrimary: {
    color: colors.primaryForeground,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
    zIndex: 1,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  selectAllText: {
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.body,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.cardHigh,
  },
  userName: {
    color: colors.foreground,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  userSub: {
    color: colors.mutedForeground,
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.body,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  metaSmall: {
    color: colors.mutedForeground,
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.body,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  iconPill: {
    width: 28,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillSmall: {
    width: 24,
    height: 20,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.body,
  },
  dialogList: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  dialogListText: {
    color: colors.foreground,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.body,
  },
  label: {
    color: colors.foreground,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAction: {
    color: colors.foreground,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  activityDetails: {
    color: colors.mutedForeground,
    fontSize: typography.size.xs,
    marginTop: 4,
    fontFamily: typography.fontFamily.body,
  },
  activityMeta: {
    color: colors.mutedForeground,
    fontSize: typography.size.xs,
    marginTop: 4,
    fontFamily: typography.fontFamily.body,
    opacity: 0.8,
  },
});
