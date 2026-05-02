// ScoutNav — scout-role post-auth global navigation.
// Ported verbatim from Lovable (src/components/ScoutNav.tsx) with web → RN mapping:
//   - react-router useLocation / useNavigate / <Link> → @react-navigation useNavigation + current route
//   - localStorage → AsyncStorage
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - lucide-react → lucide-react-native
//   - Tooltip + kbd shortcuts → accessibilityLabel (no tooltip primitive on RN)
//   - Desktop sidebar shown on wide (≥1024) screens; phones/narrow → bottom nav.
// Mirrors OwnerNav/CoachNav/OrganizationNav pattern exactly.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useNavigationState, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Settings,
  ChevronUp,
  ChevronDown,
  Search,
  Building2,
  LogOut,
  User,
  LucideIcon,
} from 'lucide-react-native';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { useAuth } from '@/hooks/useAuth';

// Mirrors Lovable scoutNavItems exactly. `path` is the web route; we also carry a
// `route` name for @react-navigation. Labels, descriptions, icons verbatim.
type NavItem = {
  path: string;
  route: string;
  params?: Record<string, unknown>;
  label: string;
  icon: LucideIcon;
  description: string;
};

const NAV_COLLAPSED_KEY = 'scoutNavCollapsed';

// Breakpoint matches Tailwind `lg:` = 1024px.
const LG_BREAKPOINT = 1024;

export function ScoutNav() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { data: orgData } = useScoutOrganization();

  // Current route name — RN analogue of useLocation().pathname.
  const currentRouteName = useNavigationState((state) => {
    if (!state) return undefined;
    let route: any = state.routes[state.index];
    while (route?.state) {
      const childState: any = route.state;
      route = childState.routes[childState.index ?? 0];
    }
    return route?.name as string | undefined;
  });

  // Collapsed state persisted to AsyncStorage (default true, matching Lovable).
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(NAV_COLLAPSED_KEY).then((saved) => {
      if (!active) return;
      if (saved !== null) setIsCollapsed(saved === 'true');
      setHydrated(true);
    }).catch(() => setHydrated(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(NAV_COLLAPSED_KEY, String(isCollapsed)).catch(() => {});
  }, [isCollapsed, hydrated]);

  // Keyboard shortcut (Cmd/Ctrl+B) — web only.
  const toggle = useCallback(() => setIsCollapsed((p) => !p), []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: any) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    // @ts-ignore — document exists on web.
    document.addEventListener('keydown', handler);
    // @ts-ignore
    return () => document.removeEventListener('keydown', handler);
  }, [toggle]);

  // Build nav items dynamically based on organization membership — verbatim from Lovable.
  const scoutNavItems: NavItem[] = [
    { path: '/scout/dashboard',                route: 'ScoutDrawer',        label: 'Dashboard',    icon: LayoutDashboard, description: 'Your scouting dashboard' },
    { path: '/scout/dashboard?tab=profile',    route: 'ScoutDrawer',        params: { tab: 'profile' }, label: 'My Profile', icon: User, description: 'Update your scout profile' },
    { path: '/athletes',                       route: 'ScoutDrawer',        label: 'Athletes',     icon: Search,          description: 'Search and discover athletes' },
    { path: '/coaches',                        route: 'CoachDrawer',        label: 'Coaches',      icon: Users,           description: 'Browse coach directory' },
    { path: '/messages',                       route: 'Messages',         label: 'Messages',     icon: MessageCircle,   description: 'Messages with athletes and coaches' },
    // Show organization settings if user is an org owner
    ...(orgData?.isOwner
      ? [{ path: '/organization/settings', route: 'OrganizationSettings', label: 'Organization', icon: Building2, description: 'Manage your organization' } as NavItem]
      : []),
    { path: '/settings',                       route: 'SettingsStack',    label: 'Settings',     icon: Settings,        description: 'Account settings' },
  ];

  const homeItem = scoutNavItems[0];

  const go = (item: NavItem) => {
    try {
      navigation.navigate(item.route as never, item.params as never);
    } catch {
      // If the target route is not registered in the current nav tree, silently no-op.
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      // Mirror Lovable: navigate("/") after sign-out.
      try {
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Landing' as never }] })
        );
      } catch {
        // No-op if Landing route isn't registered.
      }
    }
  };

  const isItemActive = (item: NavItem) => currentRouteName === item.route;

  const isWide = width >= LG_BREAKPOINT;

  // ── Wide (≥ lg) sidebar ───────────────────────────────────────────────
  if (isWide) {
    return (
      <View style={styles.sidebarWrap} pointerEvents="box-none">
        <View style={[styles.sidebar, isCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded]}>
          {isCollapsed ? (
            <View style={styles.collapsedInner}>
              <Pressable
                onPress={() => go(homeItem)}
                style={[
                  styles.iconOnlyBtn,
                  isItemActive(homeItem) ? styles.active : styles.inactive,
                ]}
                accessibilityLabel={homeItem.label}
              >
                <LayoutDashboard size={20} color={isItemActive(homeItem) ? colors.primaryForeground : colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={() => setIsCollapsed(false)}
                style={styles.expandChevron}
                accessibilityLabel="Expand navigation"
              >
                <ChevronDown size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.expandedList}>
              <Pressable
                onPress={() => setIsCollapsed(true)}
                style={styles.collapseRow}
                accessibilityLabel="Collapse navigation"
              >
                <ChevronUp size={16} color={colors.mutedForeground} />
                <Text style={styles.collapseText}>Collapse</Text>
              </Pressable>
              <View style={styles.collapseDivider} />
              {scoutNavItems.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => go(item)}
                    style={[styles.navRow, active ? styles.active : styles.inactive]}
                  >
                    <Icon size={20} color={active ? colors.primaryForeground : colors.mutedForeground} />
                    <Text style={[styles.navLabel, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              {/* Sign Out row — mirrors Lovable bottom border-separated button */}
              <View style={styles.signOutDivider} />
              <Pressable
                onPress={handleSignOut}
                style={styles.signOutRow}
                accessibilityLabel="Sign out of your account"
              >
                <LogOut size={20} color={colors.destructive} />
                <Text style={[styles.navLabel, { color: colors.destructive }]}>
                  Sign Out
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Phone / narrow bottom nav (< lg) ──────────────────────────────────
  // Lovable shows first 5 items on mobile bottom nav.
  return (
    <View style={[styles.bottomWrap, { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm }]}>
      <View style={styles.bottomList}>
        {scoutNavItems.slice(0, 5).map((item) => {
          const active = isItemActive(item);
          const Icon = item.icon;
          return (
            <Pressable
              key={item.path}
              onPress={() => go(item)}
              style={[styles.bottomItem, active ? styles.active : null]}
            >
              <Icon size={20} color={active ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.bottomLabel, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default ScoutNav;

const styles = StyleSheet.create({
  // Sidebar container — fixed left, vertically centered. RN uses absolute positioning.
  sidebarWrap: {
    position: 'absolute',
    left: spacing.lg,
    top: '50%',
    transform: [{ translateY: -200 }],
    zIndex: 40,
  },
  sidebar: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    ...shadows.card,
    overflow: 'hidden',
  },
  sidebarCollapsed: { padding: 6 },    // p-1.5
  sidebarExpanded:  { padding: spacing.sm },

  collapsedInner: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  iconOnlyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  expandChevron: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 8,
  },

  expandedList: { flexDirection: 'column', gap: 4 },
  collapseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  collapseText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  collapseDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 4,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  navLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
  },

  signOutDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: 4,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },

  active: { backgroundColor: colors.primary },
  inactive: { backgroundColor: 'transparent' },

  // Bottom nav (phones)
  bottomWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  bottomList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 4,
  },
  bottomItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bottomLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 10,
  },
});
