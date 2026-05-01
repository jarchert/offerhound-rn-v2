// Ported from Lovable src/components/TransferPortalFeed.tsx
// Pulls transfer_portal_news rows from Supabase; Refresh invokes
// the `crawl-recruiting-podcasts` edge function.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import { Repeat, ExternalLink, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface PortalNewsItem {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_name: string | null;
  sport: string;
  created_at: string;
}

export function TransferPortalFeed({ sport }: { sport?: string }) {
  const [news, setNews] = useState<PortalNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('transfer_portal_news' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);
    if (sport) query = query.eq('sport', sport);
    const { data } = await query;
    setNews((data as unknown as PortalNewsItem[]) || []);
    setLoading(false);
  }, [sport]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke('crawl-recruiting-podcasts', {
        body: sport ? { sport } : {},
      });
      await fetchNews();
    } catch (e) {
      console.warn('Transfer portal refresh failed:', e);
    }
    setRefreshing(false);
  }, [sport, fetchNews]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (loading) {
    return (
      <View style={[s.card, s.emptyCard]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (news.length === 0) {
    return (
      <View style={[s.card, s.emptyCard]}>
        <View style={s.iconBubble}>
          <Repeat color={colors.primary} size={22} />
        </View>
        <Text style={s.emptyTitle}>Transfer Portal</Text>
        <Text style={s.emptyBody}>
          No transfer portal news yet for {sport || 'your sport'}.
        </Text>
        <Pressable
          style={s.btnOutline}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <RefreshCw color={colors.primary} size={14} />
          )}
          <Text style={s.btnOutlineText}>Fetch Latest</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Repeat color={colors.primary} size={18} />
          <Text style={s.headerTitle}>Transfer Portal Feed</Text>
          {sport ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{sport}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={handleRefresh} disabled={refreshing} hitSlop={8}>
          {refreshing ? (
            <ActivityIndicator color={colors.foregroundSubtle} size="small" />
          ) : (
            <RefreshCw color={colors.foregroundSubtle} size={16} />
          )}
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {news.map((item) => (
          <Pressable
            key={item.id}
            style={s.itemCard}
            onPress={() => item.source_url && Linking.openURL(item.source_url)}
          >
            <View style={s.itemTopRow}>
              <Text style={s.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.source_url ? (
                <ExternalLink color={colors.foregroundSubtle} size={14} />
              ) : null}
            </View>
            {item.description ? (
              <Text style={s.itemDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={s.itemFoot}>
              <Text style={s.itemFootText}>
                {item.source_name || item.sport}
              </Text>
              <Text style={s.itemFootText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default TransferPortalFeed;

const s = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.size.base,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  btnOutline: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  btnOutlineText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.primary,
    fontSize: typography.size.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    color: colors.foreground,
    fontSize: typography.heading.h5,
    letterSpacing: typography.letterSpacing.heading,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foregroundSubtle,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  row: { gap: spacing.sm, paddingVertical: 4 },
  itemCard: {
    width: 260,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  itemTitle: {
    flex: 1,
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.size.sm,
  },
  itemDesc: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.xs,
  },
  itemFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemFootText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foregroundSubtle,
    fontSize: typography.size.xs,
    textTransform: 'capitalize',
  },
});
