import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import {
  Search,
  Loader2,
  Eye,
  Filter,
  UserX,
  Ban,
  CheckCircle,
  Globe,
  GlobeLock,
  Shield,
  ShieldCheck,
  Download,
  LayoutList,
  LayoutGrid,
  Trash2,
} from 'lucide-react-native';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { SPORTS_LIST } from '@/lib/data/sports';

interface UserProfile {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  position: string | null;
  school: string | null;
  sport: string | null;
  graduation_year: string | null;
  city: string | null;
  state: string | null;
  is_published: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
  custom_url: string;
  height: string | null;
  weight: string | null;
  gpa: string | null;
  bio: string | null;
  profile_image_url: string | null;
  hudl_url: string | null;
}

interface AdminUserListProps {
  profiles: UserProfile[];
  userRoles: Map<string, string>;
  loadingProfiles: boolean;
  onTogglePublish: (profile: UserProfile) => void;
  onToggleSuspend: (profile: UserProfile) => void;
  onEditRole: (profile: UserProfile) => void;
  onDeleteProfile: (profile: UserProfile) => void;
  togglingPublish: string | null;
  togglingSuspend: string | null;
}

type ViewMode = 'list' | 'grid';
type StatusFilter = 'all' | 'published' | 'unpublished' | 'suspended' | 'active';
type RoleFilter = 'all' | 'admin' | 'moderator' | 'user';
type CompletionFilter = 'all' | 'complete' | 'incomplete';

export function AdminUserList({
  profiles,
  userRoles,
  loadingProfiles,
  onTogglePublish,
  onToggleSuspend,
  onEditRole,
  onDeleteProfile,
  togglingPublish,
  togglingSuspend,
}: AdminUserListProps) {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [classYearFilter, setClassYearFilter] = useState<string>('all');

  const calculateCompletion = (profile: UserProfile): number => {
    const fields = [
      { value: profile.full_name, weight: 10 },
      { value: profile.position, weight: 10 },
      { value: profile.school, weight: 10 },
      { value: profile.graduation_year, weight: 10 },
      { value: profile.height, weight: 5 },
      { value: profile.weight, weight: 5 },
      { value: profile.gpa, weight: 10 },
      { value: profile.bio, weight: 10 },
      { value: profile.profile_image_url, weight: 10 },
      { value: profile.hudl_url, weight: 10 },
      { value: profile.email, weight: 5 },
      { value: profile.city, weight: 3 },
      { value: profile.state, weight: 2 },
    ];
    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
    const earnedWeight = fields.reduce((sum, f) => {
      const hasValue = f.value !== null && f.value !== undefined && f.value !== '';
      return sum + (hasValue ? f.weight : 0);
    }, 0);
    return Math.round((earnedWeight / totalWeight) * 100);
  };

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    profiles.forEach((p) => { if (p.state) states.add(p.state); });
    return Array.from(states).sort();
  }, [profiles]);

  const uniqueClassYears = useMemo(() => {
    const years = new Set<string>();
    profiles.forEach((p) => { if (p.graduation_year) years.add(p.graduation_year); });
    return Array.from(years).sort();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        profile.full_name?.toLowerCase().includes(searchLower) ||
        profile.email?.toLowerCase().includes(searchLower) ||
        profile.school?.toLowerCase().includes(searchLower) ||
        profile.position?.toLowerCase().includes(searchLower) ||
        profile.city?.toLowerCase().includes(searchLower) ||
        profile.state?.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && profile.is_published) ||
        (statusFilter === 'unpublished' && !profile.is_published) ||
        (statusFilter === 'suspended' && profile.is_suspended) ||
        (statusFilter === 'active' && !profile.is_suspended);

      const userRole = profile.user_id ? userRoles.get(profile.user_id) || 'user' : 'user';
      const matchesRole = roleFilter === 'all' || userRole === roleFilter;
      const matchesSport = sportFilter === 'all' || profile.sport === sportFilter;
      const matchesState = stateFilter === 'all' || profile.state === stateFilter;
      const matchesClassYear = classYearFilter === 'all' || profile.graduation_year === classYearFilter;

      const completion = calculateCompletion(profile);
      const matchesCompletion =
        completionFilter === 'all' ||
        (completionFilter === 'complete' && completion >= 80) ||
        (completionFilter === 'incomplete' && completion < 80);

      return matchesSearch && matchesStatus && matchesRole && matchesSport &&
        matchesState && matchesClassYear && matchesCompletion;
    });
  }, [profiles, searchQuery, statusFilter, roleFilter, sportFilter, stateFilter, classYearFilter, completionFilter, userRoles]);

  const renderRoleBadge = (userId: string | null) => {
    if (!userId) return <Badge variant="outline">No Account</Badge>;
    const role = userRoles.get(userId) || 'user';
    switch (role) {
      case 'admin':
        return (
          <Badge variant="warning" style={styles.badgeRow}>
            <Shield size={12} color={colors.foreground} /> Admin
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="default" style={{ backgroundColor: colors.info }}>
            <ShieldCheck size={12} color={colors.foreground} /> Mod
          </Badge>
        );
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  const renderCompletionBadge = (profile: UserProfile) => {
    const completion = calculateCompletion(profile);
    if (completion >= 80) return <Badge variant="success">{completion}%</Badge>;
    if (completion >= 50) return <Badge variant="warning">{completion}%</Badge>;
    return <Badge variant="destructive">{completion}%</Badge>;
  };

  const writeAndShareFile = async (filename: string, content: string, mimeType: string) => {
    try {
      const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
      const uri = `${dir}${filename}`;
      await (FileSystem as any).writeAsStringAsync(uri, content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
      } else {
        toast.info('Saved', uri);
      }
    } catch (e: any) {
      toast.error('Export failed', e.message);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'School', 'Position', 'Sport', 'State', 'Class Year', 'Published', 'Suspended', 'Completion %', 'Created'];
    const rows = filteredProfiles.map((p) => [
      p.full_name,
      p.email || '',
      p.school || '',
      p.position || '',
      p.sport || '',
      p.state || '',
      p.graduation_year || '',
      p.is_published ? 'Yes' : 'No',
      p.is_suspended ? 'Yes' : 'No',
      `${calculateCompletion(p)}%`,
      format(new Date(p.created_at), 'yyyy-MM-dd'),
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const filename = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    writeAndShareFile(filename, csvContent, 'text/csv');
    toast.success('Users exported successfully');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRoleFilter('all');
    setSportFilter('all');
    setStateFilter('all');
    setClassYearFilter('all');
    setCompletionFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || roleFilter !== 'all' ||
    sportFilter !== 'all' || stateFilter !== 'all' || classYearFilter !== 'all' ||
    completionFilter !== 'all' || !!searchQuery;

  const goToProfile = (customUrl: string) => {
    navigation.navigate('PublicProfileStack', { screen: 'PublicProfile', params: { customUrl } });
  };

  const renderListRow = ({ item: profile }: { item: UserProfile }) => (
    <Card style={StyleSheet.flatten([styles.rowCard, profile.is_suspended && styles.suspendedBg]) as any}>
      <CardContent style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{profile.full_name}</Text>
              {profile.is_suspended && (
                <Badge variant="destructive" style={{ marginLeft: spacing.xs }}>Suspended</Badge>
              )}
            </View>
            <Text style={styles.subtleText}>{profile.email || '—'}</Text>
          </View>
          {renderRoleBadge(profile.user_id)}
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>School</Text>
            <Text style={styles.metaValue}>{profile.school || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Sport</Text>
            <Text style={[styles.metaValue, styles.capitalize]}>{profile.sport || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Class</Text>
            <Text style={styles.metaValue}>{profile.graduation_year || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>State</Text>
            <Text style={styles.metaValue}>{profile.state || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Completion</Text>
            {renderCompletionBadge(profile)}
          </View>
        </View>

        <View style={styles.togglesRow}>
          <View style={styles.toggleItem}>
            <Text style={styles.metaLabel}>Status</Text>
            <View style={styles.toggleInline}>
              <Switch
                value={!profile.is_suspended}
                onValueChange={() => onToggleSuspend(profile)}
                disabled={togglingSuspend === profile.id}
              />
              {profile.is_suspended ? (
                <Ban size={16} color={colors.destructive} />
              ) : (
                <CheckCircle size={16} color={colors.success} />
              )}
            </View>
          </View>
          <View style={styles.toggleItem}>
            <Text style={styles.metaLabel}>Published</Text>
            <View style={styles.toggleInline}>
              <Switch
                value={profile.is_published || false}
                onValueChange={() => onTogglePublish(profile)}
                disabled={togglingPublish === profile.id}
              />
              {profile.is_published ? (
                <Globe size={16} color={colors.success} />
              ) : (
                <GlobeLock size={16} color={colors.mutedForeground} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Button variant="ghost" size="icon" onPress={() => goToProfile(profile.custom_url)}>
            <Eye size={16} color={colors.foreground} />
          </Button>
          <Button variant="ghost" size="icon" onPress={() => onEditRole(profile)}>
            <Shield size={16} color={colors.foreground} />
          </Button>
          <Button variant="ghost" size="icon" onPress={() => onDeleteProfile(profile)}>
            <Trash2 size={16} color={colors.destructive} />
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  const renderGridCard = ({ item: profile }: { item: UserProfile }) => (
    <Card style={StyleSheet.flatten([styles.gridCard, profile.is_suspended && styles.suspendedBg]) as any}>
      <CardContent style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameText}>{profile.full_name}</Text>
            <Text style={styles.subtleText}>{profile.email || 'No email'}</Text>
          </View>
          {renderRoleBadge(profile.user_id)}
        </View>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <View style={styles.kvRow}><Text style={styles.metaLabel}>School:</Text><Text style={styles.metaValue}>{profile.school || '—'}</Text></View>
          <View style={styles.kvRow}><Text style={styles.metaLabel}>Sport:</Text><Text style={[styles.metaValue, styles.capitalize]}>{profile.sport || '—'}</Text></View>
          <View style={styles.kvRow}><Text style={styles.metaLabel}>Class:</Text><Text style={styles.metaValue}>{profile.graduation_year || '—'}</Text></View>
          <View style={styles.kvRow}><Text style={styles.metaLabel}>Location:</Text><Text style={styles.metaValue}>{profile.city && profile.state ? `${profile.city}, ${profile.state}` : profile.state || '—'}</Text></View>
          <View style={styles.kvRow}><Text style={styles.metaLabel}>Completion:</Text>{renderCompletionBadge(profile)}</View>
        </View>
        <View style={[styles.actionsRow, { justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm }]}>
          <View style={styles.toggleInline}>
            {profile.is_published ? (
              <Globe size={16} color={colors.success} />
            ) : (
              <GlobeLock size={16} color={colors.mutedForeground} />
            )}
            <Text style={styles.smallText}>{profile.is_published ? 'Published' : 'Draft'}</Text>
            {profile.is_suspended && <Badge variant="destructive">Suspended</Badge>}
          </View>
          <Button variant="ghost" size="sm" onPress={() => goToProfile(profile.custom_url)} leftIcon={<Eye size={14} color={colors.foreground} />}>
            View
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader style={{ gap: spacing.md }}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Viewing {filteredProfiles.length} of {profiles.length} users
            </CardDescription>
          </View>
          <View style={styles.headerRight}>
            <Button variant="outline" size="sm" onPress={exportToCSV} leftIcon={<Download size={14} color={colors.foreground} />}>
              Export
            </Button>
            <View style={styles.viewToggleGroup}>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onPress={() => setViewMode('list')}
              >
                <LayoutList size={16} color={colors.foreground} />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onPress={() => setViewMode('grid')}
              >
                <LayoutGrid size={16} color={colors.foreground} />
              </Button>
            </View>
          </View>
        </View>

        <View style={styles.filtersWrap}>
          <View style={styles.searchWrap}>
            <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ paddingLeft: 36 }}
              containerStyle={{ flex: 1 }}
            />
          </View>

          <View style={styles.selectRow}>
            <View style={styles.selectItem}>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </View>

            <View style={styles.selectItem}>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </View>

            <View style={styles.selectItem}>
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  {SPORTS_LIST.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>{sport.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            <View style={styles.selectItem}>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            <View style={styles.selectItem}>
              <Select value={classYearFilter} onValueChange={setClassYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Class Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueClassYears.map((year) => (
                    <SelectItem key={year} value={year}>Class of {year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            <View style={styles.selectItem}>
              <Select value={completionFilter} onValueChange={(v) => setCompletionFilter(v as CompletionFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Completion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  <SelectItem value="complete">Complete (80%+)</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </View>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onPress={clearFilters}>
                Clear Filters
              </Button>
            )}
          </View>
        </View>
      </CardHeader>

      <CardContent>
        {loadingProfiles ? (
          <View style={styles.loadingWrap}>
            <Loader2 size={24} color={colors.primary} />
          </View>
        ) : filteredProfiles.length === 0 ? (
          <View style={styles.emptyWrap}>
            <UserX size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No users found matching your filters</Text>
            {hasActiveFilters && (
              <Button variant="link" onPress={clearFilters}>Clear all filters</Button>
            )}
          </View>
        ) : (
          <View style={{ minHeight: 400 }}>
            <FlashList
              data={filteredProfiles}
              keyExtractor={(item) => item.id}
              renderItem={viewMode === 'list' ? renderListRow : renderGridCard}
              contentContainerStyle={{ paddingVertical: spacing.xs }}
            />
          </View>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  viewToggleGroup: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  filtersWrap: { gap: spacing.sm },
  searchWrap: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: spacing.sm, zIndex: 1 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  selectItem: { minWidth: 140 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base },
  rowCard: { marginBottom: spacing.sm },
  gridCard: { marginBottom: spacing.sm },
  suspendedBg: { borderColor: colors.destructive, backgroundColor: 'rgba(220,40,40,0.06)' },
  rowContent: { padding: spacing.md, gap: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  nameText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },
  subtleText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  smallText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.foreground },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaItem: { minWidth: 100 },
  metaLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  metaValue: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  capitalize: { textTransform: 'capitalize' },
  togglesRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  toggleItem: { gap: 2 },
  toggleInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
