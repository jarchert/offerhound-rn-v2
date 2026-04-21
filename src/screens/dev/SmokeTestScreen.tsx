// SmokeTestScreen — runtime sanity check for the bundle.
// Verifies: Supabase reachable, auth state, basic SELECT, push token, IAP init,
// secure store, async storage, calendar perm. Surface this in dev/TestFlight only.

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Calendar from 'expo-calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { initIAP } from '@/lib/iap';
import { requestPushPermissions } from '@/lib/push';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing } from '@/lib/theme';

type CheckStatus = 'pending' | 'pass' | 'fail' | 'warn';
type Check = { name: string; status: CheckStatus; detail?: string; ms?: number };

export default function SmokeTestScreen() {
  const { user, session, userRole } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const results: Check[] = [];
    const time = async (name: string, fn: () => Promise<{ status: CheckStatus; detail?: string }>) => {
      const t0 = Date.now();
      try {
        const r = await fn();
        results.push({ name, ...r, ms: Date.now() - t0 });
      } catch (e: any) {
        results.push({ name, status: 'fail', detail: e?.message ?? String(e), ms: Date.now() - t0 });
      }
      setChecks([...results]);
    };

    await time('Supabase reachable', async () => {
      const { error } = await supabase.from('player_profiles').select('id').limit(1);
      if (error && error.code !== 'PGRST116') return { status: 'fail', detail: error.message };
      return { status: 'pass', detail: 'SELECT id FROM player_profiles LIMIT 1' };
    });

    await time('Auth session', async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { status: 'warn', detail: 'No active session (sign in to test fully)' };
      return { status: 'pass', detail: `User ${data.session.user.email}` };
    });

    await time('User role', async () => {
      if (!user) return { status: 'warn', detail: 'Not signed in' };
      if (!userRole) return { status: 'warn', detail: 'No role assigned' };
      return { status: 'pass', detail: `Role: ${userRole}` };
    });

    await time('Authenticated SELECT', async () => {
      if (!user) return { status: 'warn', detail: 'Skipped (not signed in)' };
      const { data, error } = await supabase
        .from('player_profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return { status: 'fail', detail: error.message };
      return { status: 'pass', detail: data ? `Found profile: ${(data as any).full_name ?? '(no name)'}` : 'No profile yet' };
    });

    await time('AsyncStorage', async () => {
      await AsyncStorage.setItem('smoke-test', 'ok');
      const v = await AsyncStorage.getItem('smoke-test');
      await AsyncStorage.removeItem('smoke-test');
      return v === 'ok' ? { status: 'pass' } : { status: 'fail', detail: `read=${v}` };
    });

    await time('SecureStore', async () => {
      await SecureStore.setItemAsync('smoke-test', 'ok');
      const v = await SecureStore.getItemAsync('smoke-test');
      await SecureStore.deleteItemAsync('smoke-test');
      return v === 'ok' ? { status: 'pass' } : { status: 'fail', detail: `read=${v}` };
    });

    await time('IAP init', async () => {
      await initIAP();
      return { status: 'pass', detail: 'Connection established' };
    });

    await time('Push permission', async () => {
      const granted = await requestPushPermissions();
      return granted
        ? { status: 'pass', detail: 'Granted' }
        : { status: 'warn', detail: 'Not granted (or simulator)' };
    });

    await time('Calendar permission', async () => {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      return status === 'granted'
        ? { status: 'pass' }
        : { status: 'warn', detail: `Status: ${status} (will prompt on first add)` };
    });

    setRunning(false);
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = checks.reduce(
    (acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }),
    {} as Record<CheckStatus, number>,
  );

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Smoke Test</Text>
        <Pressable style={s.refreshBtn} onPress={run} disabled={running}>
          {running
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <RefreshCw size={16} color={colors.primary} />}
        </Pressable>
      </View>

      <View style={s.summaryRow}>
        <SummaryPill label="Pass" count={summary.pass ?? 0} color={colors.success ?? '#22c55e'} />
        <SummaryPill label="Warn" count={summary.warn ?? 0} color={'#f59e0b'} />
        <SummaryPill label="Fail" count={summary.fail ?? 0} color={colors.destructive} />
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {checks.map((c, i) => (
          <View key={i} style={s.row}>
            <View style={s.rowIcon}>
              {c.status === 'pass' && <CheckCircle2 size={20} color={colors.success ?? '#22c55e'} />}
              {c.status === 'warn' && <AlertCircle size={20} color="#f59e0b" />}
              {c.status === 'fail' && <XCircle size={20} color={colors.destructive} />}
              {c.status === 'pending' && <ActivityIndicator size="small" color={colors.mutedForeground} />}
            </View>
            <View style={s.rowText}>
              <Text style={s.rowName}>{c.name}</Text>
              {c.detail && <Text style={s.rowDetail}>{c.detail}</Text>}
            </View>
            {c.ms !== undefined && <Text style={s.rowMs}>{c.ms}ms</Text>}
          </View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <Text style={s.footerText}>
          Build: {require('expo-constants').default.expoConfig?.version} (
          {require('expo-constants').default.expoConfig?.ios?.buildNumber}/
          {require('expo-constants').default.expoConfig?.android?.versionCode})
        </Text>
      </View>
    </SafeAreaView>
  );
}

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[s.pill, { borderColor: color }]}>
      <Text style={[s.pillCount, { color }]}>{count}</Text>
      <Text style={s.pillLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  title: { flex: 1, fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  refreshBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  pill: { flex: 1, alignItems: 'center', padding: spacing.sm, borderWidth: 1, borderRadius: 8 },
  pillCount: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.xl },
  pillLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  list: { padding: spacing.md, gap: spacing.xs, paddingTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  rowIcon: { width: 24, alignItems: 'center' },
  rowText: { flex: 1 },
  rowName: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  rowDetail: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  rowMs: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  footer: { padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  footerText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
