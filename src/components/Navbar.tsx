import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { Home, MessageSquare, Bell, Search, User, Menu } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// Top navbar: brand + quick-nav icons. Tab bar handles primary nav per role.
export function Navbar() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  return (
    <View>
      <ImpersonationBanner />
      <View style={s.bar}>
        <Pressable onPress={() => nav.navigate('MainTabs')} style={s.brand} hitSlop={8}>
          <Text style={s.brandText}>OFFERHOUND</Text>
        </Pressable>
        <View style={s.actions}>
          {user ? (
            <>
              <Pressable onPress={() => nav.navigate('Notifications')} hitSlop={8} style={s.iconBtn}>
                <Bell size={20} color={colors.foreground} />
              </Pressable>
              <Pressable onPress={() => nav.navigate('Messages')} hitSlop={8} style={s.iconBtn}>
                <MessageSquare size={20} color={colors.foreground} />
              </Pressable>
              <Pressable onPress={() => nav.navigate('Settings')} hitSlop={8} style={s.iconBtn}>
                <Menu size={20} color={colors.foreground} />
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => nav.navigate('SignIn')} style={s.signInBtn}>
              <Text style={s.signInText}>Sign In</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default Navbar;

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 52 },
  brand: { paddingVertical: 4 },
  brandText: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.primary, letterSpacing: typography.letterSpacing.heading },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: 6 },
  signInBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 8 },
  signInText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primaryForeground, fontSize: typography.fontSize.sm },
});
