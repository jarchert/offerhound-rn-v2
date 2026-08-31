// RegisterSearchGate — RN port of MAIN's src/components/RegisterSearchGate.tsx.
//
// Purpose: replace a search / directory surface with a call-to-action card
// prompting unauthenticated users to register or sign in before they can use
// the search feature. Used on the coach directory, athlete search and scout
// directory screens when the current session is not authenticated.
//
// Same prop API as MAIN: `message` (required headline) and `description`
// (optional subheading).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserPlus, LogIn, Search } from 'lucide-react-native';

import { Card, CardContent, Button } from '@/components/ui';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface RegisterSearchGateProps {
  message: string;
  description?: string;
}

export function RegisterSearchGate({ message, description }: RegisterSearchGateProps) {
  const nav = useNavigation<any>();

  const goRegister = () => {
    // MAIN: navigate('/register'). RN AuthStack registers the dedicated
    // sign-up screen as 'SignUp'. Navigate through AuthStack so the flow
    // works from any Root-level entry point.
    try {
      nav.navigate('AuthStack', { screen: 'SignUp' });
    } catch {
      // Fallback if we are already inside AuthStack.
      try { nav.navigate('SignUp'); } catch { /* silent */ }
    }
  };

  const goSignIn = () => {
    // MAIN: navigate('/auth'). RN AuthStack has both a combined Auth screen
    // and a dedicated SignIn screen \u2014 target Auth to match MAIN's tabbed
    // sign-in/up UI.
    try {
      nav.navigate('AuthStack', { screen: 'Auth' });
    } catch {
      try { nav.navigate('Auth'); } catch { /* silent */ }
    }
  };

  return (
    <View testID="register-search-gate">
    <Card style={s.card}>
      <CardContent style={s.content}>
        <View style={s.iconWrap}>
          <Search size={28} color={colors.primary} />
        </View>
        <View style={s.textBlock}>
          <Text style={s.title}>{message}</Text>
          {description ? <Text style={s.desc}>{description}</Text> : null}
        </View>
        <View style={s.buttons}>
          <Button
            size="lg"
            onPress={goRegister}
            leftIcon={<UserPlus size={16} color={colors.primaryForeground} />}
            testID="register-search-gate-register"
          >
            Create Free Account
          </Button>
          <Button
            size="lg"
            variant="outline"
            onPress={goSignIn}
            leftIcon={<LogIn size={16} color={colors.foreground} />}
            testID="register-search-gate-signin"
          >
            Sign In
          </Button>
        </View>
      </CardContent>
    </Card>
    </View>
  );
}

export default RegisterSearchGate;

const s = StyleSheet.create({
  card: {
    borderColor: colors.primary,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  content: {
    paddingVertical: spacing.xl ?? 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: (colors as any).primaryMuted ?? 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.xs ?? 4,
    maxWidth: 420,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl ?? 22,
    color: colors.foreground,
    textAlign: 'center',
  },
  desc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
