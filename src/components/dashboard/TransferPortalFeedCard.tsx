// TransferPortalFeedCard — RN port of Lovable TransferPortalFeed.tsx.
// Pull-to-refresh triggers crawl-recruiting-podcasts edge function. Filters by player sport.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Linking, Pressable } from 'react-native';
import { Repeat, ExternalLink, RefreshCw } from 'lucide-react-native';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { colors, spacing, typography } from '@/lib/theme';

interface PortalNewsItem {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_name: string | null;
  sport: string;
  created_at: string;
}

export function TransferPortalFeedCard({ sport: sportProp }: { sport?: string } = {}) {
  const { profile } = usePlayerProfile();
  const sport = sportProp ?? profile?.sport ?? undefined;
  const [news, setNews] = useState<PortalNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async () => {
    let q = supabase.from('transfer_portal_news').select('*').order('created_at', { ascending: false }).limit(8);
    if (sport) q = q.eq('sport', sport);
    const { data } = await q;
    setNews((data as PortalNewsItem[] | null) || []);
    setLoading(false);
  }, [sport]);

  useEffect(() => { setLoading(true); fetchNews(); }, [fetchNews]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke('crawl-recruiting-podcasts', { body: sport ? { sport } : {} });
      await fetchNews();
    } catch (e) {
      // swallow — feed will simply not update
    }
    setRefreshing(false);
  }, [fetchNews, sport]);

  return (
    <Card>
      <CardContent style={{ paddingTop: spacing.md, gap: spacing.sm }}>
        <View style={s.headerRow}>
          <View style={s.titleRow}>
            <Repeat size={18} color={colors.primary} />
            <Text style={s.title}>Transfer Portal Feed</Text>
            {sport && <Badge variant="outline">{String(sport)}</Badge>}
          </View>
          <Button variant="ghost" size="sm" onPress={handleRefresh} loading={refreshing}
            leftIcon={!refreshing ? <RefreshCw size={14} color={colors.foreground} /> : undefined}>
            {''}
          </Button>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        ) : news.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No transfer portal news yet for {sport || 'your sport'}.</Text>
            <Button variant="outline" size="sm" onPress={handleRefresh} loading={refreshing}>Fetch Latest</Button>
          </View>
        ) : (
          <FlatList
            data={news}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => item.source_url && Linking.openURL(item.source_url)}
                style={s.item}
              >
                <View style={s.itemHead}>
                  <Text style={s.itemTitle} numberOfLines={2}>{item.title}</Text>
                  {item.source_url && <ExternalLink size={14} color={colors.mutedForeground} />}
                </View>
                {item.description && <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text>}
                <View style={s.itemFoot}>
                  <Badge variant="outline">{item.sport}</Badge>
                  <Text style={s.metaText}>{item.source_name || ''}</Text>
                  <Text style={s.metaText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, flexWrap: 'wrap' },
  title: { color: colors.foreground, fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.heading },
  center: { padding: spacing.lg, alignItems: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyText: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, textAlign: 'center' },
  item: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, gap: 4 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  itemTitle: { color: colors.foreground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodySemiBold, flex: 1 },
  itemDesc: { color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: 2 },
  metaText: { color: colors.mutedForeground, fontSize: typography.fontSize.xs },
});

export default TransferPortalFeedCard;
