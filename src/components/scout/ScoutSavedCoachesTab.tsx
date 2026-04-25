// Ported from Lovable src/components/scout/ScoutSavedCoachesTab.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - react-router-dom <Link> → @react-navigation/native useNavigation().navigate
//   - Responsive lg: breakpoint (>= 1024) / md: (>= 768) via useWindowDimensions
//   - <img> → react-native <Image>
//   - useToast → react-native-toast-message (project convention)
//   - @tanstack/react-query kept (already used elsewhere in app)
//
// GAP / KNOWN ISSUE:
//   The `scout_saved_coaches` table migration may not be present in the live
//   Supabase schema / generated types yet. The v2 supabase client uses a
//   permissive overlay that treats every table as Row:any, so this file
//   compiles and runs, but runtime 404s from Supabase will surface until
//   the migration is shipped. If/when strict types are reintroduced, cast
//   rows via `Tables<'scout_saved_coaches'>` from '@/integrations/supabase/types'.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import {
  Bookmark,
  Search,
  AlertCircle,
  MapPin,
  Trash2,
  Star,
  CircleDot,
  ArrowDown,
  Mail,
  Plus,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { colors, typography, spacing, radius } from '@/lib/theme';

type SavedCoachRow = {
  id: string;
  coach_id: string;
  priority: string | null;
  notes: string | null;
  saved_at: string;
  coach: {
    id: string;
    name: string;
    school: string;
    title: string;
    sport: string;
    state: string | null;
    city: string | null;
    division: string;
    image_url: string | null;
  } | null;
};

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_META: Record<
  Priority,
  { label: string; Icon: any; bg: string; fg: string; border: string }
> = {
  high: {
    label: 'High',
    Icon: Star,
    bg: 'rgba(245,158,11,0.1)',
    fg: '#b45309',
    border: 'rgba(245,158,11,0.3)',
  },
  medium: {
    label: 'Medium',
    Icon: CircleDot,
    bg: 'rgba(59,130,246,0.1)',
    fg: '#1d4ed8',
    border: 'rgba(59,130,246,0.3)',
  },
  low: {
    label: 'Low',
    Icon: ArrowDown,
    bg: colors.muted,
    fg: colors.mutedForeground,
    border: colors.border,
  },
};

export function ScoutSavedCoachesTab() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const isMd = width >= 768;
  const isLg = width >= 1024;
  const isXl = width >= 1280;

  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['scout-saved-coaches', user?.id],
    queryFn: async () => {
      if (!user) return [] as SavedCoachRow[];
      const { data, error } = await supabase
        .from('scout_saved_coaches')
        .select(
          'id, coach_id, priority, notes, saved_at, coach:coaches!scout_saved_coaches_coach_id_fkey(id, name, school, title, sport, state, city, division, image_url)'
        )
        .eq('scout_user_id', user.id)
        .order('saved_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SavedCoachRow[];
    },
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scout_saved_coaches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Coach removed',
        text2: 'Removed from your saved network.',
      });
      qc.invalidateQueries({ queryKey: ['scout-saved-coaches', user?.id] });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to remove',
        text2: e?.message || 'Try again',
      });
    },
  });

  const sports = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((r) => r.coach?.sport && set.add(r.coach.sport));
    return Array.from(set).sort();
  }, [data]);

  const states = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((r) => r.coach?.state && set.add(r.coach.state!));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data || [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!r.coach) return false;
      if (sportFilter !== 'all' && r.coach.sport !== sportFilter) return false;
      if (stateFilter !== 'all' && r.coach.state !== stateFilter) return false;
      if (priorityFilter !== 'all' && (r.priority || 'medium') !== priorityFilter)
        return false;
      if (!q) return true;
      return (
        r.coach.name?.toLowerCase().includes(q) ||
        r.coach.school?.toLowerCase().includes(q) ||
        r.coach.title?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
      );
    });
  }, [data, search, sportFilter, stateFilter, priorityFilter]);

  const goAddCoach = () => navigation.navigate('Coaches' as never);
  const viewCoach = (coachId: string) =>
    navigation.navigate('Coaches' as never, { coach: coachId } as never);

  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.centerPad}>
          <ActivityIndicator color={colors.mutedForeground} />
          <Text style={s.loadingText}>Loading saved coaches…</Text>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card style={{ borderColor: colors.destructive + '66' }}>
        <CardContent style={{ ...s.centerPad, gap: spacing.sm }}>
          <AlertCircle size={24} color={colors.destructive} />
          <View style={{ alignItems: 'center' }}>
            <Text style={s.errorTitle}>Couldn't load saved coaches</Text>
            <Text style={s.mutedText}>
              {(error as Error)?.message || 'Please try again.'}
            </Text>
          </View>
          <Button size="sm" variant="outline" onPress={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if ((data || []).length === 0) {
    return (
      <Card style={{ borderStyle: 'dashed' }}>
        <CardContent style={{ ...s.centerPad, gap: spacing.md }}>
          <View style={s.emptyIconBubble}>
            <Bookmark size={24} color={colors.primary} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={s.emptyTitle}>No saved coaches yet</Text>
            <Text style={[s.mutedText, { maxWidth: 360, textAlign: 'center' }]}>
              Save coaches you're working with or tracking. They'll appear here
              for quick access to profiles and contact info.
            </Text>
          </View>
          <Button
            size="sm"
            onPress={goAddCoach}
            leftIcon={<Plus size={16} color={colors.primaryForeground} />}
          >
            Add coach
          </Button>
        </CardContent>
      </Card>
    );
  }

  const numCols = isXl ? 3 : isMd ? 2 : 1;
  const cardWidthPct = `${100 / numCols}%` as const;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={[s.filterRow, isLg && s.filterRowWide]}>
        <View style={s.searchWrap}>
          <View style={s.searchIcon}>
            <Search size={16} color={colors.mutedForeground} />
          </View>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, school, or notes"
            style={{ paddingLeft: 36 }}
          />
        </View>
        <View style={isLg ? { width: 150 } : undefined}>
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sports</SelectItem>
              {sports.map((sp) => (
                <SelectItem key={sp} value={sp}>
                  {sp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
        <View style={isLg ? { width: 120 } : undefined}>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {states.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
        <View style={isLg ? { width: 140 } : undefined}>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </View>
        <Button
          onPress={goAddCoach}
          leftIcon={<Plus size={16} color={colors.primaryForeground} />}
        >
          Add coach
        </Button>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <CardContent style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <Text style={s.mutedText}>
              No saved coaches match the current filters.
            </Text>
          </CardContent>
        </Card>
      ) : (
        <View style={s.grid}>
          {filtered.map((row) => {
            const priority = (row.priority || 'medium') as Priority;
            const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
            const Icon = meta.Icon;
            const c = row.coach!;
            return (
              <View
                key={row.id}
                style={[s.gridCell, { width: cardWidthPct }]}
              >
                <Card>
                  <CardContent style={{ padding: spacing.md, gap: spacing.sm }}>
                    <View style={s.coachHeader}>
                      {c.image_url ? (
                        <Image
                          source={{ uri: c.image_url }}
                          style={s.avatar}
                        />
                      ) : (
                        <View style={s.avatarFallback}>
                          <Text style={s.avatarInitial}>
                            {c.name?.charAt(0)?.toUpperCase() || 'C'}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.coachName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={s.mutedXs} numberOfLines={1}>
                          {c.title}
                        </Text>
                        <Text style={s.mutedXs} numberOfLines={1}>
                          {c.school}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.priorityBadge,
                          {
                            backgroundColor: meta.bg,
                            borderColor: meta.border,
                          },
                        ]}
                      >
                        <Icon size={12} color={meta.fg} />
                        <Text
                          style={[s.priorityLabel, { color: meta.fg }]}
                        >
                          {meta.label}
                        </Text>
                      </View>
                    </View>

                    <View style={s.chipRow}>
                      <Badge variant="secondary">
                        <Text style={s.chipText}>{c.sport}</Text>
                      </Badge>
                      <Badge variant="outline">
                        <Text style={s.chipText}>{c.division}</Text>
                      </Badge>
                      {(c.city || c.state) && (
                        <View style={s.locationChip}>
                          <MapPin size={12} color={colors.mutedForeground} />
                          <Text style={s.mutedXs}>
                            {[c.city, c.state].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {row.notes ? (
                      <View style={s.notesBlock}>
                        <Text style={s.mutedXs} numberOfLines={2}>
                          {row.notes}
                        </Text>
                      </View>
                    ) : null}

                    <View style={s.cardFooter}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => viewCoach(c.id)}
                        leftIcon={<Mail size={14} color={colors.foreground} />}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={removeMutation.isPending}
                        onPress={() => removeMutation.mutate(row.id)}
                        leftIcon={
                          <Trash2 size={14} color={colors.destructive} />
                        }
                      >
                        {' '}
                      </Button>
                    </View>
                  </CardContent>
                </Card>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default ScoutSavedCoachesTab;

const s = StyleSheet.create({
  centerPad: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  emptyIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  mutedXs: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  filterRow: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  filterRowWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs / 2,
  },
  gridCell: {
    paddingHorizontal: spacing.xs / 2,
    paddingBottom: spacing.xs,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primary,
    fontSize: typography.fontSize.base,
  },
  coachName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 10,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notesBlock: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
