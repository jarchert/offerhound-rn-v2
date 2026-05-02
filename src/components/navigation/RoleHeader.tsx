// RoleHeader — shared top bar for drawer-based role navigators.
// Hamburger toggle (left), OFFERHOUND™ logo (center), notification bell + settings (right).
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Menu, Bell, Settings } from 'lucide-react-native';
import { colors, spacing, typography } from '@/lib/theme';

interface RoleHeaderProps {
  title?: string;
}

export default function RoleHeader({ title }: RoleHeaderProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {/* Hamburger */}
        <Pressable
          onPress={() => nav.dispatch(DrawerActions.toggleDrawer())}
          style={styles.iconBtn}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Menu size={22} color={colors.foreground} />
        </Pressable>

        {/* Logo / title */}
        <View style={styles.center}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          ) : (
            <Text style={styles.logo}>
              OFFER<Text style={styles.logoAccent}>HOUND</Text>
              <Text style={styles.tm}>™</Text>
            </Text>
          )}
        </View>

        {/* Right actions */}
        <View style={styles.rightActions}>
          <Pressable
            onPress={() => (nav as any).navigate('Inbox')}
            style={styles.iconBtn}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <Bell size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => (nav as any).navigate('SettingsStack')}
            style={styles.iconBtn}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Settings size={20} color={colors.foregroundSubtle} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
    borderRadius: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontFamily.heading,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  logo: {
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
    fontSize: 18,
    letterSpacing: 1,
  },
  logoAccent: {
    color: colors.foreground,
  },
  tm: {
    color: colors.primary,
    fontSize: 8,
    fontFamily: typography.fontFamily.body,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
