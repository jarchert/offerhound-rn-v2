// RoleDrawerContent — slide-out menu for non-athlete/non-admin roles.
// Receives role prop and renders the appropriate navigation links.
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useNavigation, CommonActions } from '@react-navigation/native';
import {
  LayoutDashboard,
  Search,
  Mail,
  CalendarDays,
  MessageCircle,
  Settings,
  TrendingUp,
  Users,
  Shield,
  Mic,
  Award,
  User,
  Kanban,
  LogOut,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

export type DrawerRole =
  | 'coach'
  | 'scout'
  | 'hs_coach'
  | 'club_coach'
  | 'agency'
  | 'parent'
  | 'influencer';

interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Drawer screen name (local to this drawer) */
  screen?: string;
  /** Root stack screen name (for screens outside the drawer) */
  rootScreen?: string;
}

const MENU_ITEMS: Record<DrawerRole, MenuItem[]> = {
  coach: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { key: 'pipeline', label: 'Pipeline', icon: Kanban, screen: 'Pipeline' },
    { key: 'athletes', label: 'Find Athletes', icon: Search, screen: 'FindAthletes' },
    { key: 'letters', label: 'Letters', icon: Mail, screen: 'Letters' },
    { key: 'camps', label: 'Camps', icon: CalendarDays, screen: 'Camps' },
    { key: 'directory', label: 'Coach Directory', icon: Users, rootScreen: 'CoachDirectory' },
    { key: 'messages', label: 'Messages', icon: MessageCircle, rootScreen: 'Messages' },
    { key: 'settings', label: 'Settings', icon: Settings, rootScreen: 'SettingsStack' },
  ],
  scout: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { key: 'athletes', label: 'Find Athletes', icon: Search, screen: 'FindAthletes' },
    { key: 'letters', label: 'Letters', icon: Mail, screen: 'Letters' },
    { key: 'trends', label: 'Trends', icon: TrendingUp, screen: 'Trends' },
    { key: 'messages', label: 'Messages', icon: MessageCircle, rootScreen: 'Messages' },
    { key: 'settings', label: 'Settings', icon: Settings, rootScreen: 'SettingsStack' },
  ],
  hs_coach: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { key: 'athletes', label: 'Find Athletes', icon: Search, screen: 'FindAthletes' },
    { key: 'letters', label: 'Letters', icon: Mail, screen: 'Letters' },
    { key: 'camps', label: 'Camps', icon: CalendarDays, screen: 'Camps' },
    { key: 'directory', label: 'Coach Directory', icon: Users, rootScreen: 'CoachDirectory' },
    { key: 'messages', label: 'Messages', icon: MessageCircle, rootScreen: 'Messages' },
    { key: 'settings', label: 'Settings', icon: Settings, rootScreen: 'SettingsStack' },
  ],
  club_coach: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { key: 'camps', label: 'Camps', icon: CalendarDays, screen: 'Camps' },
    { key: 'athletes', label: 'Find Athletes', icon: Search, screen: 'FindAthletes' },
    { key: 'letters', label: 'Letters', icon: Mail, screen: 'Letters' },
    { key: 'directory', label: 'Coach Directory', icon: Users, rootScreen: 'CoachDirectory' },
    { key: 'messages', label: 'Messages', icon: MessageCircle, rootScreen: 'Messages' },
    { key: 'settings', label: 'Settings', icon: Settings, rootScreen: 'SettingsStack' },
  ],
  agency: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { key: 'athletes', label: 'Find Athletes', icon: Search, screen: 'FindAthletes' },
    { key: 'letters', label: 'Letters', icon: Mail, screen: 'Letters' },
    { key: 'team', label: 'Agency Team', icon: Users, screen: 'AgencyTeam' },
    { key: 'messages', label: 'Messages', icon: MessageCircle, rootScreen: 'Messages' },
    { key: 'settings', label: 'Settings', icon: Settings, rootScreen: 'SettingsStack' },
  ],
  parent: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { key: 'camps', label: 'Camps', icon: CalendarDays, screen: 'Camps' },
    { key: 'messages', label: 'Messages', icon: MessageCircle, rootScreen: 'Messages' },
    { key: 'inbox', label: 'Inbox', icon: Mail, rootScreen: 'Inbox' },
    { key: 'safety', label: 'Trust & Safety', icon: Shield, screen: 'TrustSafety' },
    { key: 'settings', label: 'Settings', icon: Settings, rootScreen: 'SettingsStack' },
  ],
  influencer: [
    { key: 'dashboard', label: 'Creator Studio', icon: LayoutDashboard, screen: 'Dashboard' },
    { key: 'profile', label: 'My Profile', icon: User, screen: 'MyProfile' },
    { key: 'board', label: 'Creators Board', icon: Award, screen: 'Board' },
    { key: 'podcasts', label: 'Podcasts', icon: Mic, screen: 'Podcasts' },
    { key: 'messages', label: 'Messages', icon: MessageCircle, rootScreen: 'Messages' },
    { key: 'settings', label: 'Settings', icon: Settings, rootScreen: 'SettingsStack' },
  ],
};

const ROLE_LABELS: Record<DrawerRole, string> = {
  coach: 'College Coach',
  scout: 'Scout',
  hs_coach: 'HS Coach',
  club_coach: 'Club Coach',
  agency: 'Agency',
  parent: 'Parent',
  influencer: 'Creator',
};

interface Props extends DrawerContentComponentProps {
  role: DrawerRole;
}

export default function RoleDrawerContent({ role, state, navigation, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation();
  const { user, signOut } = useAuth() as any;
  const items = MENU_ITEMS[role] ?? [];
  const activeIndex = state.index;
  const activeRouteName = state.routes[activeIndex]?.name;

  const handlePress = (item: MenuItem) => {
    if (item.rootScreen) {
      // Navigate to a root-level screen outside the drawer
      (rootNav as any).navigate(item.rootScreen);
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
    navigation.closeDrawer();
  };

  const handleSignOut = async () => {
    navigation.closeDrawer();
    try {
      await signOut();
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          OFFER<Text style={styles.logoAccent}>HOUND</Text>
          <Text style={styles.tm}>™</Text>
        </Text>
        <Text style={styles.roleLabel}>{ROLE_LABELS[role]}</Text>
        {user?.email && (
          <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu items */}
      <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const isActive = item.screen ? activeRouteName === item.screen : false;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.key}
              onPress={() => handlePress(item)}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Icon
                size={20}
                color={isActive ? colors.primary : colors.foregroundSubtle}
              />
              <Text
                style={[
                  styles.menuLabel,
                  isActive && styles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sign out */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <Pressable
          onPress={handleSignOut}
          style={styles.menuItem}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <LogOut size={20} color={colors.destructive} />
          <Text style={[styles.menuLabel, { color: colors.destructive }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  logo: {
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
    fontSize: 20,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  logoAccent: {
    color: colors.foreground,
  },
  tm: {
    color: colors.primary,
    fontSize: 9,
    fontFamily: typography.fontFamily.body,
  },
  roleLabel: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  email: {
    color: colors.foregroundSubtle,
    fontFamily: typography.fontFamily.body,
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  menuScroll: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  menuItemActive: {
    backgroundColor: 'rgba(231, 175, 8, 0.1)',
  },
  menuLabel: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: 15,
  },
  menuLabelActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
