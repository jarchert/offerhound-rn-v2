// AdminTermsAcceptanceAnalytics — verbatim port from Lovable web.
// Source: offerhound-repo/src/components/AdminTermsAcceptanceAnalytics.tsx
//
// Web→RN substitutions:
//   - <div> / Tailwind utility classes   → <View> + RN StyleSheet
//   - shadcn <Table> (not available)     → View-based row/header layout with borders
//   - <Input className="pl-10">          → TextInput with left-inset icon overlay
//   - lucide-react                       → lucide-react-native
//   - No recharts in this file; no SVG needed.
//
// Behavior, data-fetching, filtering, math, and copy preserved verbatim.
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import {
  Users,
  CheckCircle,
  XCircle,
  Search,
  Clock,
  TrendingUp,
} from 'lucide-react-native';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

interface TermsAcceptanceRecord {
  id: string;
  user_id: string;
  terms_version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface UserWithAcceptance {
  id: string;
  full_name: string;
  email: string | null;
  user_id: string | null;
  created_at: string;
  acceptance?: TermsAcceptanceRecord | null;
}

export function AdminTermsAcceptanceAnalytics() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersWithAcceptance, setUsersWithAcceptance] = useState<UserWithAcceptance[]>([]);
  const [acceptanceRecords, setAcceptanceRecords] = useState<TermsAcceptanceRecord[]>([]);
  const [activeTermsVersion, setActiveTermsVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active terms version
      const { data: activeVersion } = await (supabase as any)
        .from('terms_versions')
        .select('version')
        .eq('is_active', true)
        .maybeSingle();

      setActiveTermsVersion(activeVersion?.version || null);

      // Fetch all acceptance records
      const { data: acceptances, error: acceptanceError } = await (supabase as any)
        .from('terms_acceptance')
        .select('*')
        .order('accepted_at', { ascending: false });

      if (acceptanceError) throw acceptanceError;
      setAcceptanceRecords((acceptances as TermsAcceptanceRecord[]) || []);

      // Fetch all player profiles
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('player_profiles')
        .select('id, full_name, email, user_id, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all coach profiles
      const { data: coachProfiles, error: coachError } = await (supabase as any)
        .from('coach_profiles')
        .select('id, name, email, user_id, created_at')
        .order('created_at', { ascending: false });

      if (coachError) throw coachError;

      // Merge users and map acceptances
      const allUsers: UserWithAcceptance[] = [
        ...((profiles as any[]) || []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          user_id: p.user_id,
          created_at: p.created_at,
          acceptance:
            (acceptances as TermsAcceptanceRecord[] | null)?.find(
              (a) => a.user_id === p.user_id && a.terms_version === activeVersion?.version,
            ) || null,
        })),
        ...((coachProfiles as any[]) || []).map((c) => ({
          id: c.id,
          full_name: c.name,
          email: c.email,
          user_id: c.user_id,
          created_at: c.created_at,
          acceptance:
            (acceptances as TermsAcceptanceRecord[] | null)?.find(
              (a) => a.user_id === c.user_id && a.terms_version === activeVersion?.version,
            ) || null,
        })),
      ];

      // Remove duplicates by user_id
      const uniqueUsers = allUsers.reduce((acc, user) => {
        if (user.user_id && !acc.find((u) => u.user_id === user.user_id)) {
          acc.push(user);
        } else if (!user.user_id) {
          acc.push(user);
        }
        return acc;
      }, [] as UserWithAcceptance[]);

      setUsersWithAcceptance(uniqueUsers);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usersWithAcceptance.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalUsers = usersWithAcceptance.length;
  const acceptedUsers = usersWithAcceptance.filter((u) => u.acceptance).length;
  const pendingUsers = totalUsers - acceptedUsers;
  const acceptanceRate = totalUsers > 0 ? Math.round((acceptedUsers / totalUsers) * 100) : 0;

  // Get recent acceptances (last 7 days)
  const recentAcceptances = acceptanceRecords.filter((a) => {
    const acceptedDate = new Date(a.accepted_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return acceptedDate >= weekAgo;
  }).length;

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.root}>
      {/* Statistics Cards */}
      <View style={s.statsGrid}>
        <Card style={s.statCard}>
          <CardHeader style={s.statHeader}>
            <CardTitle style={s.statTitle}>Total Users</CardTitle>
            <Users size={20} color={colors.mutedForeground} />
          </CardHeader>
          <CardContent>
            <Text style={s.statValue}>{totalUsers}</Text>
            <Text style={s.statHint}>Registered accounts</Text>
          </CardContent>
        </Card>

        <Card style={s.statCard}>
          <CardHeader style={s.statHeader}>
            <CardTitle style={s.statTitle}>Accepted Terms</CardTitle>
            <CheckCircle size={20} color="#22c55e" />
          </CardHeader>
          <CardContent>
            <Text style={[s.statValue, { color: '#16a34a' }]}>{acceptedUsers}</Text>
            <Text style={s.statHint}>
              {activeTermsVersion ? `v${activeTermsVersion}` : 'Current version'}
            </Text>
          </CardContent>
        </Card>

        <Card style={s.statCard}>
          <CardHeader style={s.statHeader}>
            <CardTitle style={s.statTitle}>Pending</CardTitle>
            <Clock size={20} color="#f59e0b" />
          </CardHeader>
          <CardContent>
            <Text style={[s.statValue, { color: '#d97706' }]}>{pendingUsers}</Text>
            <Text style={s.statHint}>Awaiting acceptance</Text>
          </CardContent>
        </Card>

        <Card style={s.statCard}>
          <CardHeader style={s.statHeader}>
            <CardTitle style={s.statTitle}>Acceptance Rate</CardTitle>
            <TrendingUp size={20} color={colors.primary} />
          </CardHeader>
          <CardContent>
            <Text style={s.statValue}>{acceptanceRate}%</Text>
            <Text style={s.statHint}>{recentAcceptances} in last 7 days</Text>
          </CardContent>
        </Card>
      </View>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>User Acceptance Status</CardTitle>
          <CardDescription>
            {`View which users have accepted the current terms of use${
              activeTermsVersion ? ` (v${activeTermsVersion})` : ''
            }`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search input with leading icon */}
          <View style={s.searchWrap}>
            <View style={s.searchIcon} pointerEvents="none">
              <Search size={16} color={colors.mutedForeground} />
            </View>
            <TextInput
              placeholder="Search by name or email..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={s.searchInput}
            />
          </View>

          {/* Table */}
          <View style={s.tableWrap}>
            {/* Header */}
            <View style={[s.tableRow, s.tableHeaderRow]}>
              <Text style={[s.th, s.colUser]}>User</Text>
              <Text style={[s.th, s.colEmail]}>Email</Text>
              <Text style={[s.th, s.colRegistered]}>Registered</Text>
              <Text style={[s.th, s.colStatus]}>Status</Text>
              <Text style={[s.th, s.colAccepted]}>Accepted At</Text>
            </View>

            {filteredUsers.length === 0 ? (
              <View style={s.emptyRow}>
                <Text style={s.emptyText}>
                  {searchQuery ? 'No users match your search' : 'No users found'}
                </Text>
              </View>
            ) : (
              filteredUsers.map((user) => (
                <View key={user.id} style={s.tableRow}>
                  <Text style={[s.td, s.tdStrong, s.colUser]} numberOfLines={1}>
                    {user.full_name}
                  </Text>
                  <Text style={[s.td, s.tdMuted, s.colEmail]} numberOfLines={1}>
                    {user.email || 'No email'}
                  </Text>
                  <Text style={[s.td, s.tdMuted, s.colRegistered]} numberOfLines={1}>
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </Text>
                  <View style={s.colStatus}>
                    {user.acceptance ? (
                      <Badge
                        variant="default"
                        style={{ backgroundColor: '#dcfce7', flexDirection: 'row' } as any}
                      >
                        <View style={s.badgeInner}>
                          <CheckCircle size={12} color="#15803d" />
                          <Text style={[s.badgeText, { color: '#15803d' }]}> Accepted</Text>
                        </View>
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: '#fef3c7', flexDirection: 'row' } as any}
                      >
                        <View style={s.badgeInner}>
                          <XCircle size={12} color="#b45309" />
                          <Text style={[s.badgeText, { color: '#b45309' }]}> Pending</Text>
                        </View>
                      </Badge>
                    )}
                  </View>
                  <Text style={[s.td, s.tdMuted, s.colAccepted]} numberOfLines={1}>
                    {user.acceptance
                      ? formatDistanceToNow(new Date(user.acceptance.accepted_at), {
                          addSuffix: true,
                        })
                      : '—'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

export default AdminTermsAcceptanceAnalytics;

const s = StyleSheet.create({
  root: { padding: spacing.md, gap: spacing.lg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

  // Stats grid — 1 col on narrow, 2 col at md, 4 col at lg; RN: use flexWrap with basis
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { flexGrow: 1, flexBasis: 160, minWidth: 160 },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  statTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.mutedForeground,
  },
  statValue: {
    fontSize: typography.fontSize['3xl'] ?? 28,
    fontFamily: typography.fontFamily.heading,
    color: colors.foreground,
  },
  statHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    marginTop: 4,
  },

  // Search
  searchWrap: { position: 'relative', marginBottom: spacing.md },
  searchIcon: {
    position: 'absolute',
    left: spacing.sm + 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 36,
    paddingRight: spacing.sm,
    color: colors.foreground,
    backgroundColor: colors.background,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },

  // Table
  tableWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tableHeaderRow: { backgroundColor: colors.muted },
  th: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  td: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.body },
  tdStrong: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  tdMuted: { color: colors.mutedForeground },

  colUser: { flexGrow: 1.2, flexBasis: 120, flexShrink: 1 },
  colEmail: { flexGrow: 1.4, flexBasis: 140, flexShrink: 1 },
  colRegistered: { flexGrow: 1, flexBasis: 100, flexShrink: 1 },
  colStatus: { flexGrow: 0.9, flexBasis: 110, flexShrink: 0 },
  colAccepted: { flexGrow: 1.2, flexBasis: 130, flexShrink: 1 },

  emptyRow: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
  },

  badgeInner: { flexDirection: 'row', alignItems: 'center' },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
});
