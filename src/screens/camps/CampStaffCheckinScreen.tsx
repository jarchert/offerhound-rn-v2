// CampStaffCheckinScreen — RN port of Lovable web src/pages/CampStaffCheckin.tsx (78 LOC).
// Token-based RPC check-in surface for camp staff/volunteers. Calls the
// `check_in_staff_by_token` Postgres RPC and displays the resulting state
// (success / already / error). The token arrives as a route param.
//
// PORT-PENDING: web used date-fns `format(..., "h:mm a")`. We render an
// equivalent locale-time string via toLocaleTimeString to avoid pulling
// date-fns into this screen. Swap once the shared formatter lands.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

import { BackButton } from '@/components/BackButton';
type State = 'loading' | 'success' | 'already' | 'error';
interface Info {
  staff_name?: string;
  station_name?: string;
  checked_in_at?: string;
  error?: string;
}

function formatTime(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function CampStaffCheckinScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampStaffCheckin'>>();
  const token = route.params?.token;
  const [state, setState] = useState<State>('loading');
  const [info, setInfo] = useState<Info>({});

  useEffect(() => {
    if (!token) {
      setState('error');
      setInfo({ error: 'Missing check-in token.' });
      return;
    }
    let cancelled = false;
    (async () => {
      // RPC name is not in the generated Database types in this RN copy; cast.
      const { data, error } = await (supabase as any).rpc('check_in_staff_by_token', { p_token: token });
      if (cancelled) return;
      if (error) {
        setState('error');
        setInfo({ error: error.message });
        return;
      }
      const result = data as any;
      if (!result?.success) {
        setState('error');
        setInfo({ error: result?.error || 'Check-in failed' });
        return;
      }
      setInfo({
        staff_name: result.staff_name,
        station_name: result.station_name,
        checked_in_at: result.checked_in_at,
      });
      setState(result.already_checked_in ? 'already' : 'success');
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const checkedInAt = formatTime(info.checked_in_at);

  return (
    <SafeAreaView style={s.container}>
      <BackButton />
      <ScrollView contentContainerStyle={s.scroll}>
        <Card style={s.card}>
          <CardHeader>
            <CardTitle>Staff Check-in</CardTitle>
          </CardHeader>
          <CardContent style={s.content}>
            {state === 'loading' && (
              <ActivityIndicator size="large" color={colors.mutedForeground} />
            )}

            {state === 'success' && (
              <>
                <CheckCircle2 size={64} color={colors.primary} />
                <Text style={s.heading}>Checked in!</Text>
                <Text style={s.muted}>
                  {info.staff_name ? (
                    <>
                      <Text style={s.bold}>{info.staff_name}</Text>
                      {' at '}
                    </>
                  ) : null}
                  <Text style={s.bold}>{info.station_name}</Text>
                </Text>
              </>
            )}

            {state === 'already' && (
              <>
                <CheckCircle2 size={64} color={colors.mutedForeground} />
                <Text style={s.heading}>Already checked in</Text>
                <Text style={s.muted}>
                  {info.staff_name} at {info.station_name}
                  {checkedInAt ? ` at ${checkedInAt}` : ''}
                </Text>
              </>
            )}

            {state === 'error' && (
              <>
                <AlertCircle size={64} color={colors.destructive} />
                <Text style={s.heading}>Check-in failed</Text>
                <Text style={s.muted}>{info.error}</Text>
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: { width: '100%', maxWidth: 480 },
  content: { alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.lg },
  heading: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    textAlign: 'center',
  },
  muted: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  bold: { fontFamily: typography.fontFamily.bodyBold, color: colors.foreground },
});
