// CampSpectatorViewScreen — RN port of Lovable web src/pages/CampSpectatorView.tsx (256 LOC).
// Spectator-shareable live view of a single athlete's camp performance, gated by a
// signed token. Polls performance every 15s and AI score every 30s. Read-only.
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Activity, Trophy, Timer, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

import { BackButton } from '@/components/BackButton';
interface SpectatorTokenRow {
  id: string;
  camp_id: string;
  enrollment_id: string;
  athlete_profile_id: string | null;
  display_name: string | null;
  revoked: boolean;
  expires_at: string | null;
}

const TIMED = [
  { key: 'forty_yard_dash', label: '40-yard dash', unit: 's', lower: true },
  { key: 'shuttle_5_10_5', label: '5-10-5 shuttle', unit: 's', lower: true },
  { key: 'three_cone_drill', label: '3-cone drill', unit: 's', lower: true },
] as const;

const JUMPS = [
  { key: 'vertical_jump', label: 'Vertical jump', unit: '"', lower: false },
  { key: 'broad_jump', label: 'Broad jump', unit: '"', lower: false },
] as const;

function bestOf(arr: number[] | null | undefined, lower: boolean): number | null {
  if (!arr || arr.length === 0) return null;
  return lower ? Math.min(...arr) : Math.max(...arr);
}

export default function CampSpectatorViewScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'CampSpectator'>>();
  const navigation = useNavigation<NavigationProp<any>>();
  const token = route.params?.token;

  const { data: tokenRow, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ['spectator-token', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_spectator_tokens')
        .select('id, camp_id, enrollment_id, athlete_profile_id, display_name, revoked, expires_at')
        .eq('token', token!)
        .maybeSingle();
      if (error) throw error;
      return data as SpectatorTokenRow | null;
    },
  });

  const isExpired = tokenRow?.expires_at ? new Date(tokenRow.expires_at) < new Date() : false;
  const isRevoked = tokenRow?.revoked === true;
  const tokenValid = !!tokenRow && !isExpired && !isRevoked;

  const { data: camp } = useQuery({
    queryKey: ['spectator-camp', tokenRow?.camp_id],
    enabled: tokenValid && !!tokenRow?.camp_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camps')
        .select('id, name, sport, start_date, location, city, state')
        .eq('id', tokenRow!.camp_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ['spectator-enrollment', tokenRow?.enrollment_id],
    enabled: tokenValid && !!tokenRow?.enrollment_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_enrollments')
        .select('id, jersey_number, position_group, checked_in_at')
        .eq('id', tokenRow!.enrollment_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: perf } = useQuery({
    queryKey: ['spectator-perf', tokenRow?.enrollment_id],
    enabled: tokenValid && !!tokenRow?.enrollment_id,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_performance_entries')
        .select('forty_yard_dash, shuttle_5_10_5, three_cone_drill, vertical_jump, broad_jump, updated_at')
        .eq('enrollment_id', tokenRow!.enrollment_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: aiScore } = useQuery({
    queryKey: ['spectator-ai', tokenRow?.enrollment_id],
    enabled: tokenValid && !!tokenRow?.enrollment_id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_ai_scores')
        .select('composite_score, ai_rank')
        .eq('enrollment_id', tokenRow!.enrollment_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (tokenLoading) {
    return (
      <SafeAreaView style={s.fullCenter}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (tokenError || !tokenRow) {
    return (
      <SafeAreaView style={s.fullCenter}>
        <AlertCircle size={40} color={colors.mutedForeground} />
        <Text style={s.errorText}>This spectator link is invalid.</Text>
        <Button variant="outline" onPress={() => navigation.navigate('PublicTabs' as never)}>Go home</Button>
      </SafeAreaView>
    );
  }

  if (!tokenValid) {
    return (
      <SafeAreaView style={s.fullCenter}>
        <AlertCircle size={40} color={colors.mutedForeground} />
        <Text style={s.errorText}>
          {isRevoked ? 'This spectator link has been revoked.' : 'This spectator link has expired.'}
        </Text>
        <Button variant="outline" onPress={() => navigation.navigate('PublicTabs' as never)}>Go home</Button>
      </SafeAreaView>
    );
  }

  const displayName = tokenRow.display_name || 'Athlete';
  const subline = `${camp?.name ?? 'Loading camp...'}${
    enrollment?.position_group ? ` · ${enrollment.position_group}` : ''
  }${enrollment?.jersey_number ? ` · #${enrollment.jersey_number}` : ''}`;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{displayName}</Text>
          <Text style={s.headerSub}>{subline}</Text>
        </View>
        <Badge variant="secondary">
          <Activity size={12} color={colors.secondaryForeground} />  Live
        </Badge>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {enrollment?.checked_in_at ? (
          <Card>
            <CardContent style={s.statusCard}>
              <Text style={s.statusText}>
                ✓ Checked in at {new Date(enrollment.checked_in_at).toLocaleTimeString()}
              </Text>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent style={s.statusCard}>
              <Text style={[s.statusText, { color: colors.mutedForeground }]}>Waiting for check-in…</Text>
            </CardContent>
          </Card>
        )}

        {aiScore?.composite_score != null && (
          <Card>
            <CardHeader style={s.cardHeaderTight}>
              <CardTitle style={s.cardTitleRow}>
                <Trophy size={16} color={colors.foreground} />  AI evaluation
              </CardTitle>
            </CardHeader>
            <CardContent style={s.aiRow}>
              <Text style={s.aiScore}>{Number(aiScore.composite_score).toFixed(1)}</Text>
              <Text style={s.aiLabel}>composite / 100</Text>
              {aiScore.ai_rank ? (
                <View style={{ marginLeft: 'auto' }}>
                  <Badge variant="outline">Rank #{aiScore.ai_rank}</Badge>
                </View>
              ) : null}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader style={s.cardHeaderTight}>
            <CardTitle style={s.cardTitleRow}>
              <Timer size={16} color={colors.foreground} />  Timed drills
            </CardTitle>
          </CardHeader>
          <CardContent style={s.gridThree}>
            {TIMED.map((d) => {
              const best = bestOf((perf as any)?.[d.key], d.lower);
              return (
                <View key={d.key} style={s.metricCell}>
                  <Text style={s.metricLabel}>{d.label}</Text>
                  <Text style={s.metricValue}>{best != null ? `${best.toFixed(2)}${d.unit}` : '—'}</Text>
                </View>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={s.cardHeaderTight}>
            <CardTitle style={s.cardTitleRow}>
              <Trophy size={16} color={colors.foreground} />  Jumps
            </CardTitle>
          </CardHeader>
          <CardContent style={s.gridTwo}>
            {JUMPS.map((d) => {
              const best = bestOf((perf as any)?.[d.key], d.lower);
              return (
                <View key={d.key} style={s.metricCell}>
      <BackButton />
                  <Text style={s.metricLabel}>{d.label}</Text>
                  <Text style={s.metricValue}>{best != null ? `${best.toFixed(1)}${d.unit}` : '—'}</Text>
                </View>
              );
            })}
          </CardContent>
        </Card>

        <Text style={s.footer}>Powered by OfferHound™ · refreshes every 15 seconds</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fullCenter: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  errorText: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  headerSub: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  content: { padding: spacing.md, gap: spacing.md, maxWidth: 720, alignSelf: 'stretch' },
  statusCard: { paddingVertical: spacing.md },
  statusText: { fontSize: typography.fontSize.sm, color: colors.foreground },
  cardHeaderTight: { paddingBottom: spacing.xs },
  cardTitleRow: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    fontFamily: typography.fontFamily.bodySemiBold,
  },
  aiRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, paddingBottom: spacing.md },
  aiScore: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.primary,
  },
  aiLabel: { fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  gridThree: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md },
  gridTwo: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md },
  metricCell: { flex: 1, alignItems: 'center', gap: 2 },
  metricLabel: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center' },
  metricValue: { fontFamily: 'Courier', fontSize: typography.fontSize.lg, color: colors.foreground },
  footer: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
});
