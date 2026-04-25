// Ported from Lovable src/components/scout/ScoutLettersTab.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - react-router-dom <Link> → @react-navigation/native useNavigation().navigate
//   - Responsive flex (sm:flex-row) → useWindowDimensions width >= 640
//   - line-clamp-2 → Text numberOfLines={2}
//   - @tanstack/react-query kept (already used elsewhere in app)
// Supabase note: `scout_letter_history` is not in generated types. The
// permissive overlay in src/integrations/supabase/client.ts makes `.from()`
// accept any table name with Row: any, so no explicit cast is needed.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import {
  FileText,
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
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
import { formatDistanceToNow } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

type LetterRow = {
  id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_type: string;
  organization_name: string | null;
  letter_type: string;
  letter_content: string;
  sent_at: string;
};

const PAGE_SIZE = 25;

const RECIPIENT_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All recipients' },
  { value: 'athlete', label: 'Athletes' },
  { value: 'parent', label: 'Parents' },
  { value: 'coach', label: 'Coaches' },
];

export function ScoutLettersTab() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const [page, setPage] = useState(0);
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['scout-letters', user?.id],
    queryFn: async () => {
      if (!user) return [] as LetterRow[];
      const { data, error } = await supabase
        .from('scout_letter_history')
        .select(
          'id, recipient_name, recipient_email, recipient_type, organization_name, letter_type, letter_content, sent_at'
        )
        .eq('scout_user_id', user.id)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LetterRow[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const rows = data || [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (recipientFilter !== 'all' && r.recipient_type !== recipientFilter) return false;
      if (!q) return true;
      return (
        r.recipient_name?.toLowerCase().includes(q) ||
        r.recipient_email?.toLowerCase().includes(q) ||
        r.organization_name?.toLowerCase().includes(q) ||
        r.letter_type?.toLowerCase().includes(q)
      );
    });
  }, [data, search, recipientFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const goCompose = () => navigation.navigate('ScoutLetters' as never);

  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.centerPad}>
          <ActivityIndicator color={colors.mutedForeground} />
          <Text style={s.loadingText}>Loading letters…</Text>
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
            <Text style={s.errorTitle}>Couldn't load letters</Text>
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
            <FileText size={24} color={colors.primary} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={s.emptyTitle}>No letters sent yet</Text>
            <Text style={[s.mutedText, { maxWidth: 360, textAlign: 'center' }]}>
              Compose your first outreach letter to athletes, parents, or coaches.
              We'll keep a record of every send here.
            </Text>
          </View>
          <Button
            size="sm"
            onPress={goCompose}
            leftIcon={<Mail size={16} color={colors.primaryForeground} />}
          >
            Compose your first letter
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={[s.filterRow, isWide && s.filterRowWide]}>
        <View style={s.searchWrap}>
          <View style={s.searchIcon}>
            <Search size={16} color={colors.mutedForeground} />
          </View>
          <Input
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Search recipient, school, or letter type"
            style={{ paddingLeft: 36 }}
          />
        </View>
        <View style={isWide ? { width: 180 } : undefined}>
          <Select
            value={recipientFilter}
            onValueChange={(v) => {
              setRecipientFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECIPIENT_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
        <Button
          onPress={goCompose}
          leftIcon={<Mail size={16} color={colors.primaryForeground} />}
        >
          New Letter
        </Button>
      </View>

      {filtered.length === 0 ? (
        <Card>
          <CardContent style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <Text style={s.mutedText}>No letters match the current filters.</Text>
          </CardContent>
        </Card>
      ) : (
        <>
          <View style={{ gap: spacing.xs }}>
            {pageRows.map((row) => (
              <Card key={row.id}>
                <CardContent style={s.rowContent}>
                  <View style={s.rowIcon}>
                    <FileText size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.badgeRow}>
                      <Text style={s.rowName} numberOfLines={1}>
                        {row.recipient_name}
                      </Text>
                      <Badge variant="outline">
                        <Text style={s.badgeText}>{row.recipient_type}</Text>
                      </Badge>
                      <Badge variant="secondary">
                        <Text style={s.badgeText}>
                          {row.letter_type.replace(/-/g, ' ')}
                        </Text>
                      </Badge>
                      <Badge variant="default">
                        <Text style={s.badgeText}>Sent</Text>
                      </Badge>
                    </View>
                    <Text style={[s.mutedXs, { marginTop: 2 }]} numberOfLines={1}>
                      {row.recipient_email}
                      {row.organization_name ? ` · ${row.organization_name}` : ''}
                    </Text>
                    <Text style={[s.mutedXs, { marginTop: 4 }]} numberOfLines={2}>
                      {row.letter_content}
                    </Text>
                  </View>
                  <Text style={s.timeText}>
                    {formatDistanceToNow(new Date(row.sent_at), { addSuffix: true })}
                  </Text>
                </CardContent>
              </Card>
            ))}
          </View>

          {totalPages > 1 && (
            <View style={s.pager}>
              <Text style={s.mutedXs}>
                Page {page + 1} of {totalPages} · {filtered.length} letter
                {filtered.length === 1 ? '' : 's'}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  leftIcon={<ChevronLeft size={16} color={colors.foreground} />}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  rightIcon={<ChevronRight size={16} color={colors.foreground} />}
                >
                  Next
                </Button>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default ScoutLettersTab;

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
  rowContent: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowIcon: {
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '1a',
  },
  rowName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    color: colors.foreground,
    textTransform: 'capitalize',
    fontFamily: typography.fontFamily.body,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
});
