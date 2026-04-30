import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, DevSettings, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@/lib/theme';
import { supabase } from '@/integrations/supabase/client';

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { hasError: boolean; error?: Error; resetting?: boolean }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  resetSession = async () => {
    if (this.state.resetting) return;
    this.setState({ resetting: true });
    try {
      try { await supabase.auth.signOut(); } catch (e) { console.warn('[ErrorBoundary] signOut failed', e); }
      try { await AsyncStorage.clear(); } catch (e) { console.warn('[ErrorBoundary] AsyncStorage.clear failed', e); }
    } finally {
      // Clear boundary state so children re-mount.
      this.setState({ hasError: false, error: undefined, resetting: false });
      // In dev, force a full JS reload to flush providers & navigation state.
      if (__DEV__ && Platform.OS !== 'web' && DevSettings && typeof DevSettings.reload === 'function') {
        try { DevSettings.reload(); } catch {}
      } else {
        Alert.alert('Session reset', 'You have been signed out. Please relaunch the app.');
      }
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={s.container}>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>{this.state.error?.message ?? 'Unknown error'}</Text>
          <Pressable style={s.btn} onPress={this.reset}>
            <Text style={s.btnText}>Try again</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnSecondary]} onPress={this.resetSession} disabled={this.state.resetting}>
            <Text style={[s.btnText, s.btnSecondaryText]}>
              {this.state.resetting ? 'Resetting…' : 'Sign out & reset'}
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background, gap: spacing.sm },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  message: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center' },
  btn: { marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 12 },
  btnText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primaryForeground, fontSize: typography.fontSize.base },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.foreground },
});
