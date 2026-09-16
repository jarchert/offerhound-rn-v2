// CompactGridTabBar — Group 3 #7 (Option C variant b) support component.
//
// Purpose: render 5-9 tabs across a compact 2-row grid instead of
// react-navigation's default single row.  Default single-row bottom-tabs
// gets visibly cramped past 5 tabs on narrow phones (~360dp).  Splitting
// into 2 rows lets us keep a first-class tab for every real cross-app verb
// per role without the overflow menu the user explicitly rejected.
//
// Usage:
//   <Tab.Navigator tabBar={(p) => <CompactGridTabBar {...p} />} ...>
//
// Layout:
//   - Tabs are split evenly-ish across two rows.  For an odd count N, the
//     top row gets ceil(N/2) and the bottom row gets floor(N/2).
//     Examples: 5 -> 3/2, 6 -> 3/3, 7 -> 4/3, 8 -> 4/4, 9 -> 5/4.
//   - Each cell shows icon (20dp) on top and label (11pt) below, matching
//     roleTabScreenOptions.tabBarLabelStyle sizing.
//   - Active tab uses tabBarActiveTintColor from theme (route options
//     override the default).
//   - Accessibility: each cell exposes `accessibilityRole="button"` and
//     `accessibilityState={{ selected }}`.  Labels use the tab's
//     `options.title` (falls back to route.name).

import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/lib/theme';

const TAB_ICON_SIZE = 20;
const ROW_MIN_HEIGHT = 48;

export function CompactGridTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const routes = state.routes;
  const total = routes.length;
  const topCount = Math.ceil(total / 2);
  const topRoutes = routes.slice(0, topCount);
  const bottomRoutes = routes.slice(topCount);

  const renderRow = (rowRoutes: typeof routes, rowKey: string) => (
    <View key={rowKey} style={s.row}>
      {rowRoutes.map((route) => {
        const idx = state.routes.indexOf(route);
        const isFocused = state.index === idx;
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
        const tint = isFocused
          ? (options.tabBarActiveTintColor ?? colors.primary)
          : (options.tabBarInactiveTintColor ?? colors.foregroundSubtle);
        const Icon = options.tabBarIcon;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            // Cast to `any` — typed navigation.navigate() requires the exact
            // param-list generic which we don't have inside a generic tab-bar
            // renderer. This mirrors how react-navigation's own default
            // BottomTabBar dispatches non-focused tab presses.
            (navigation as any).navigate(route.name, route.params);
          }
        };
        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            testID={`grid-tab-${route.name}`}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={typeof label === 'string' ? label : undefined}
            onPress={onPress}
            onLongPress={onLongPress}
            style={s.cell}>
            {Icon ? (
              <View style={s.iconWrap}>
                {Icon({ focused: isFocused, color: tint, size: TAB_ICON_SIZE })}
              </View>
            ) : null}
            <Text
              style={[s.label, { color: tint }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {typeof label === 'string' ? label : String(label ?? '')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View
      testID="compact-grid-tab-bar"
      style={[s.container, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      {renderRow(topRoutes, 'top')}
      {bottomRoutes.length > 0 ? renderRow(bottomRoutes, 'bottom') : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: ROW_MIN_HEIGHT,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

export default CompactGridTabBar;
