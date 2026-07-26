// RN port of Lovable src/components/PageBreadcrumb.tsx.
//
// Web reads pathname from react-router-dom's `useLocation()` and renders a
// clickable breadcrumb trail. RN uses @react-navigation/native — the
// equivalent structure is the route tree walked via `useNavigationState()`.
//
// Behavior preserved:
//   * Returns null when there is no meaningful trail (single route / root).
//   * Maps route segments through ROUTE_LABELS (verbatim from web) for the
//     visible label; falls back to a Title-cased version of the segment.
//   * Each intermediate crumb navigates back to that route via nav.navigate();
//     the last (current) crumb is inert text.
//
// Implementation notes:
//   * `useNavigationState` returns the *current* navigator state. We walk the
//     `state.routes` array to build the segment list, which mirrors the web's
//     pathname split-on-slash approach.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { ChevronRight, Home } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  coaches: 'Coaches',
  athletes: 'Athletes',
  letters: 'Letters',
  gallery: 'Gallery',
  activity: 'Activity',
  matches: 'Matches',
  messages: 'Messages',
  camps: 'Camps',
  referrals: 'Referrals',
  pricing: 'Pricing',
  coach: 'Coach',
  scout: 'Scout',
  admin: 'Admin',
  parent: 'Parent',
  onboarding: 'Onboarding',
  campaigns: 'Campaigns',
  trends: 'Trends',
  organization: 'Organization',
  'quick-start': 'Quick Start',
  'nil-intelligence': 'NIL Intelligence',
  'news-learn': 'News & Learn',
  influencers: 'Influencers',
  podcasts: 'Podcasts',
  support: 'Support',
};

function labelFor(routeName: string): string {
  const lower = routeName.toLowerCase().replace(/tab$/, '').replace(/screen$/, '');
  if (ROUTE_LABELS[lower]) return ROUTE_LABELS[lower];
  // Camel/Pascal case → spaced words, first letter cap
  const spaced = routeName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\bTab\b/, '')
    .replace(/\bScreen\b/, '')
    .trim();
  if (!spaced) return routeName;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const PageBreadcrumb = () => {
  const navigation = useNavigation<any>();

  // Walk the navigator state to build a route trail.
  const trail = useNavigationState((state) => {
    if (!state) return [] as string[];
    const names: string[] = [];
    let cur: any = state;
    while (cur) {
      const idx = typeof cur.index === 'number' ? cur.index : 0;
      const route = cur.routes?.[idx];
      if (!route) break;
      names.push(route.name);
      cur = route.state;
    }
    return names;
  });

  const crumbs = useMemo(() => {
    // Drop the top-level container (equivalent to the web's leading "/").
    // Also drop generic "Tabs" wrappers so users see the meaningful segments.
    const meaningful = (trail || []).filter(
      (n) => n && !/^Root$/i.test(n),
    );
    return meaningful.map((seg, i) => ({
      label: labelFor(seg),
      routeName: seg,
      isLast: i === meaningful.length - 1,
    }));
  }, [trail]);

  if (crumbs.length <= 1) return null;

  const goHome = () => {
    try {
      navigation.navigate('AthleteTabs' as never, { screen: 'DashboardTab' } as never);
    } catch {
      /* noop — best-effort */
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      accessibilityLabel="Breadcrumb"
    >
      <Pressable onPress={goHome} hitSlop={6} accessibilityRole="button">
        <Home size={14} color={colors.mutedForeground} />
      </Pressable>
      {crumbs.map((crumb) => (
        <View key={crumb.routeName} style={s.crumbRow}>
          <ChevronRight size={12} color={colors.mutedForeground} />
          {crumb.isLast ? (
            <Text style={s.crumbCurrent}>{crumb.label}</Text>
          ) : (
            <Pressable
              onPress={() => {
                try {
                  navigation.navigate(crumb.routeName as never);
                } catch {
                  /* noop */
                }
              }}
              accessibilityRole="button"
              hitSlop={4}
            >
              <Text style={s.crumbLink}>{crumb.label}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

export default PageBreadcrumb;

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  crumbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  crumbCurrent: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  crumbLink: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});
