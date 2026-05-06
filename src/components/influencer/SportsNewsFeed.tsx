/**
 * SportsNewsFeed — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/SportsNewsFeed.tsx
 *
 * Translations applied:
 *  - <Card>/<CardHeader>/<CardContent>/<CardTitle>/<CardDescription> → RN ui Card primitives
 *  - <Input> shadcn → RN <Input> (TextInput)
 *  - <Select>/<SelectTrigger>/etc → RN Select (Modal-backed)
 *  - <Button asChild><a target="_blank">> → Pressable + Linking.openURL
 *  - lucide-react → lucide-react-native
 *  - <img> → <Image> with resizeMode="cover"
 *  - max-h + overflow-y-auto → ScrollView with maxHeight
 *  - tailwind classes → StyleSheet using theme tokens
 *  - date-fns format() preserved
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, StyleSheet, Linking } from 'react-native';
import { format } from 'date-fns';
import { Newspaper, ExternalLink, Sparkles, Search } from 'lucide-react-native';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useSportsNewsFeed } from '@/hooks/useInfluencerHootsuite';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface Props {
  onShareToCompose?: (item: { title: string; description?: string; url?: string; image?: string }) => void;
  compact?: boolean;
}

import { SPORTS_CONFIG } from '@/lib/data/sports';

const SPORTS = ['all', ...Object.values(SPORTS_CONFIG).map(s => s.name)];

function capitalize(s: string) { return s.length ? s[0].toUpperCase() + s.slice(1) : s; }

export function SportsNewsFeed({ onShareToCompose, compact = false }: Props) {
  const { data: news = [], isLoading } = useSportsNewsFeed(compact ? 20 : 60);
  const [sport, setSport] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return (news as any[]).filter((n: any) => {
      if (sport !== 'all' && n.sport !== sport) return false;
      if (q && !`${n.title} ${n.description || ''}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [news, sport, q]);

  return (
    <Card>
      <CardHeader style={s.header}>
        <View style={s.headerTopRow}>
          <View style={s.headerTitleCol}>
            <View style={s.titleRow}>
              <Newspaper size={20} color={colors.primary} />
              <CardTitle>Sports News Wire</CardTitle>
            </View>
            <CardDescription>
              Live from OfferHound's scrape jobs — high school, college, and amateur. Tap the spark icon to draft a post about it.
            </CardDescription>
          </View>
        </View>
        <View style={s.controlsRow}>
          <View style={s.searchWrap}>
            <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
            <Input
              placeholder="Search…"
              value={q}
              onChangeText={setQ}
              style={s.searchInput}
              containerStyle={s.searchContainer}
            />
          </View>
          <View style={s.selectWrap}>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((sp) => (
                  <SelectItem key={sp} value={sp}>
                    {sp === 'all' ? 'All sports' : capitalize(sp)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        </View>
      </CardHeader>

      <CardContent>
        <ScrollView style={s.list} contentContainerStyle={s.listContent} nestedScrollEnabled>
          {isLoading ? (
            <Text style={s.emptyText}>Loading newswire…</Text>
          ) : filtered.length === 0 ? (
            <Text style={s.emptyText}>No matching stories.</Text>
          ) : (
            filtered.map((n: any) => (
              <View key={n.id} style={s.row}>
                {n.image ? (
                  <Image source={{ uri: n.image }} style={s.thumb} resizeMode="cover" accessibilityLabel="" />
                ) : null}
                <View style={s.rowBody}>
                  <Text style={s.rowTitle} numberOfLines={2}>{n.title}</Text>
                  {n.description ? (
                    <Text style={s.rowDesc} numberOfLines={2}>{n.description}</Text>
                  ) : null}
                  <View style={s.metaRow}>
                    <Badge variant="outline" style={s.metaBadge}>{n.source}</Badge>
                    {n.sport ? (
                      <Badge variant="secondary" style={s.metaBadge}>{capitalize(n.sport)}</Badge>
                    ) : null}
                    {n.date ? (
                      <Text style={s.metaDate}>{format(new Date(n.date), 'MMM d')}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={s.actionsCol}>
                  {onShareToCompose ? (
                    <Pressable
                      onPress={() => onShareToCompose({ title: n.title, description: n.description, url: n.url, image: n.image })}
                      style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
                      accessibilityLabel="Draft a post about this"
                    >
                      <Sparkles size={16} color={colors.foreground} />
                    </Pressable>
                  ) : null}
                  {n.url ? (
                    <Pressable
                      onPress={() => Linking.openURL(n.url).catch(() => {})}
                      style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
                      accessibilityLabel="Open source"
                    >
                      <ExternalLink size={16} color={colors.foreground} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </CardContent>
    </Card>
  );
}

export default SportsNewsFeed;

const s = StyleSheet.create({
  header: { gap: 12 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  headerTitleCol: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  searchWrap: { flex: 1, minWidth: 160, position: 'relative' },
  searchIcon: { position: 'absolute', left: 8, top: '50%', marginTop: -8, zIndex: 1 },
  searchContainer: { flex: 1 },
  searchInput: { paddingLeft: 32, minHeight: 36 },
  selectWrap: { width: 144 },
  list: { maxHeight: 600 },
  listContent: { gap: 8 },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 80, height: 80, borderRadius: 6, flexShrink: 0, backgroundColor: colors.muted },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: typography.fontSize.sm * 1.3,
  },
  rowDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  metaBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  metaDate: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  actionsCol: { gap: 4, flexShrink: 0 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: colors.muted },
});
