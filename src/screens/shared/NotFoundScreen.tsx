import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, NavigationProp, CommonActions } from '@react-navigation/native';
import { Compass } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { roleToInitialRoute } from '@/navigation/RootNavigator';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { UserRole } from '@/lib/constants';
import { colors, typography, spacing } from '@/lib/theme';

export default function NotFoundScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, userRole } = useAuth() as any;
  const goHome = () => {
    const target = user
      ? roleToInitialRoute(userRole as UserRole | null | undefined)
      : 'PublicTabs';
    nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: target as any }] }));
  };
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Compass size={56} color={colors.primary} />
        <Text style={s.title}>Page not found</Text>
        <Text style={s.subtitle}>The screen you were looking for doesn't exist or moved.</Text>
        <Pressable style={s.btn} onPress={goHome}>
          <Text style={s.btnText}>Go Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.md },
  btnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.primaryForeground },
});
