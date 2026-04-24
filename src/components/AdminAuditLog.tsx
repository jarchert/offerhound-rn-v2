// Ported verbatim from Lovable src/components/AdminAuditLog.tsx
// Web → RN mapping:
//   - HTML table → @shopify/flash-list FlashList (v2 API, no estimatedItemSize)
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - useMediaQuery ("md:" breakpoint) → useWindowDimensions width >= 768
//   - Mobile card layout preserved; desktop table layout rendered with FlashList rows.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Search,
  Loader2,
  History,
  Shield,
  Trash2,
  UserPlus,
  Eye,
  Edit,
  Ban,
  RefreshCw,
} from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: string;
  target_user_id: string | null;
  target_user_name: string | null;
  details: string | null;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  user_deleted: <Trash2 size={16} color={colors.destructive} />,
  role_updated: <Shield size={16} color={colors.warning} />,
  user_impersonated: <Eye size={16} color={colors.info} />,
  admin_invited: <UserPlus size={16} color={colors.success} />,
  profile_suspended: <Ban size={16} color={colors.destructive} />,
  profile_unsuspended: <RefreshCw size={16} color={colors.success} />,
  profile_published: <Edit size={16} color={colors.info} />,
  profile_unpublished: <Edit size={16} color={colors.mutedForeground} />,
};

const ACTION_LABELS: Record<string, string> = {
  user_deleted: 'User Deleted',
  role_updated: 'Role Updated',
  user_impersonated: 'User Impersonated',
  admin_invited: 'Admin Invited',
  profile_suspended: 'Profile Suspended',
  profile_unsuspended: 'Profile Unsuspended',
  profile_published: 'Profile Published',
  profile_unpublished: 'Profile Unpublished',
};

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { width } = useWindowDimensions();
  // Lovable's `md:` breakpoint is 768px.
  const isDesktop = width >= 768;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data as AuditLogEntry[]) || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.admin_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <CardTitle>
              <View style={s.titleRow}>
                <History size={20} color={colors.foreground} />
                <Text style={s.titleText}> Audit Log</Text>
              </View>
            </CardTitle>
            <CardDescription>
              View all administrative actions ({filteredLogs.length} entries)
            </CardDescription>
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={fetchLogs}
            disabled={loading}
            leftIcon={
              <RefreshCw
                size={16}
                color={colors.foreground}
                // Note: RN doesn't have CSS animations; the spinning effect
                // from `animate-spin` is approximated with ActivityIndicator in
                // the loading branch below.
              />
            }
          >
            Refresh
          </Button>
        </View>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <View style={s.filters}>
          <View style={s.searchWrap}>
            <View style={s.searchIcon}>
              <Search size={16} color={colors.mutedForeground} />
            </View>
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={s.searchInputContainer}
              style={s.searchInput}
            />
          </View>

          <View style={s.selectWrap}>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {ACTION_LABELS[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={s.emptyWrap}>
            <History size={48} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No audit logs found</Text>
          </View>
        ) : isDesktop ? (
          <DesktopTable logs={filteredLogs} />
        ) : (
          <MobileList logs={filteredLogs} />
        )}
      </CardContent>
    </Card>
  );
}

export default AdminAuditLog;

// ---------------- Mobile card layout ----------------
function MobileList({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <View style={{ height: Math.min(600, logs.length * 120 + 40) }}>
      <FlashList
        data={logs}
        keyExtractor={(log) => log.id}
        contentContainerStyle={{ paddingVertical: 4 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item: log }) => (
          <View style={s.mobileCard}>
            <View style={s.mobileCardTop}>
              <View style={s.mobileCardLeft}>
                <View style={s.shrink0}>
                  {ACTION_ICONS[log.action] || <Shield size={16} color={colors.foreground} />}
                </View>
                <Badge variant="outline">
                  {ACTION_LABELS[log.action] || log.action}
                </Badge>
              </View>
              <Text
                style={s.timeText}
                numberOfLines={1}
                // title (HTML tooltip) has no direct RN equivalent.
                accessibilityLabel={format(new Date(log.created_at), 'PPpp')}
              >
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </Text>
            </View>
            <View style={s.mobileCardBody}>
              <Text style={s.bodyLine}>
                <Text style={s.bodyLabel}>Admin: </Text>
                <Text style={s.bodyValueBreak}>{log.admin_email}</Text>
              </Text>
              {log.target_user_name ? (
                <Text style={s.bodyLine}>
                  <Text style={s.bodyLabel}>Target: </Text>
                  {log.target_user_name}
                </Text>
              ) : null}
              {log.details ? (
                <Text style={s.detailsText}>{log.details}</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

// ---------------- Desktop table layout ----------------
function DesktopTable({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <View style={s.tableWrap}>
      <View style={[s.tableRow, s.tableHeaderRow]}>
        <Text style={[s.th, s.colAction]}>Action</Text>
        <Text style={[s.th, s.colAdmin]}>Admin</Text>
        <Text style={[s.th, s.colTarget]}>Target User</Text>
        <Text style={[s.th, s.colDetails]}>Details</Text>
        <Text style={[s.th, s.colTime]}>Time</Text>
      </View>
      <View style={{ height: Math.min(600, logs.length * 56 + 40) }}>
        <FlashList
          data={logs}
          keyExtractor={(log) => log.id}
          renderItem={({ item: log }) => (
            <View style={s.tableRow}>
              <View style={[s.colAction, s.actionCell]}>
                <View style={s.shrink0}>
                  {ACTION_ICONS[log.action] || <Shield size={16} color={colors.foreground} />}
                </View>
                <Badge variant="outline">
                  {ACTION_LABELS[log.action] || log.action}
                </Badge>
              </View>
              <Text style={[s.colAdmin, s.cellText]} numberOfLines={1}>
                {log.admin_email}
              </Text>
              <Text style={[s.colTarget, s.cellText]} numberOfLines={1}>
                {log.target_user_name || '—'}
              </Text>
              <Text
                style={[s.colDetails, s.cellTextMuted]}
                numberOfLines={1}
              >
                {log.details || '—'}
              </Text>
              <Text
                style={[s.colTime, s.cellTextMuted]}
                numberOfLines={1}
                accessibilityLabel={format(new Date(log.created_at), 'PPpp')}
              >
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerLeft: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },

  // Filters
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  searchWrap: {
    flex: 1,
    minWidth: 200,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm + 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInputContainer: { flex: 1 },
  searchInput: { paddingLeft: spacing.xl + 6 }, // pl-10 ≈ 40px
  selectWrap: { width: 180 },

  // Loading / empty
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },

  // Mobile card
  mobileCard: {
    padding: spacing.sm + 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  mobileCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mobileCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
    minWidth: 0,
  },
  shrink0: { flexShrink: 0 },
  timeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    flexShrink: 0,
  },
  mobileCardBody: { gap: 4 },
  bodyLine: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  bodyLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
  },
  bodyValueBreak: { color: colors.mutedForeground },
  detailsText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    flexWrap: 'wrap',
  },

  // Desktop table
  tableWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tableHeaderRow: { backgroundColor: colors.muted },
  th: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  actionCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cellText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  cellTextMuted: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  colAction: { width: 180 },
  colAdmin: { flex: 1, minWidth: 140 },
  colTarget: { flex: 1, minWidth: 120 },
  colDetails: { flex: 2, minWidth: 200 },
  colTime: { width: 140 },
});
