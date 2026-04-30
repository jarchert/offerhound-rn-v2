// UnsubscribeCampAlertsScreen — RN port of Lovable web src/pages/UnsubscribeCampAlerts.tsx (138 LOC).
// Lets a signed-in user, or anyone with an email link, opt out of camp alert emails.
// Web URL was /unsubscribe/camp-alerts?email=...; in RN, optional `email` route param.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { BellOff, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

import { BackButton } from '@/components/BackButton';
type Status = 'loading' | 'confirm' | 'done' | 'error';
interface Subscription { id: string; sport: string; email: string }

export default function UnsubscribeCampAlertsScreen() {
  const { user } = useAuth();
  const route = useRoute<RouteProp<CampStackParamList, 'UnsubscribeCampAlerts'>>();
  const emailParam = (route.params as any)?.email as string | undefined;
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>('loading');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const loadSubscriptions = useCallback(async () => {
    try {
      let query = supabase
        .from('camp_alert_subscriptions')
        .select('id, sport, email')
        .is('unsubscribed_at', null);

      if (user) {
        query = query.eq('user_id', user.id);
      } else if (emailParam) {
        query = query.eq('email', emailParam);
      } else {
        setStatus('confirm');
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubscriptions((data || []) as Subscription[]);
      setStatus('confirm');
    } catch {
      setStatus('error');
    }
  }, [user, emailParam]);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  async function handleUnsubscribeAll() {
    setStatus('loading');
    try {
      for (const sub of subscriptions) {
        await supabase
          .from('camp_alert_subscriptions')
          .update({ unsubscribed_at: new Date().toISOString() })
          .eq('id', sub.id);
      }
      setStatus('done');
      toast({ title: 'Unsubscribed successfully' });
    } catch {
      setStatus('error');
      toast({ title: 'Error unsubscribing', variant: 'destructive' });
    }
  }

  async function handleUnsubscribeOne(id: string) {
    try {
      await supabase
        .from('camp_alert_subscriptions')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('id', id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Unsubscribed from alert' });
      if (subscriptions.length <= 1) setStatus('done');
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <BackButton />
      <ScrollView contentContainerStyle={s.scroll}>
        <Card style={s.card}>
          <CardContent style={s.content}>
            {status === 'loading' && <ActivityIndicator size="large" color={colors.primary} />}

            {status === 'done' && (
              <>
                <CheckCircle size={48} color={colors.primary} />
                <Text style={s.heading}>Unsubscribed</Text>
                <Text style={s.muted}>You will no longer receive camp alert emails.</Text>
              </>
            )}

            {status === 'error' && (
              <>
                <AlertTriangle size={48} color={colors.destructive} />
                <Text style={s.heading}>Something went wrong</Text>
                <Text style={s.muted}>Please try again or contact support.</Text>
                <Button variant="outline" onPress={() => loadSubscriptions()}>Retry</Button>
              </>
            )}

            {status === 'confirm' && (
              <>
                <BellOff size={48} color={colors.mutedForeground} />
                <Text style={s.heading}>Camp Alert Subscriptions</Text>
                {subscriptions.length === 0 ? (
                  <Text style={s.muted}>No active camp alert subscriptions found.</Text>
                ) : (
                  <>
                    <Text style={s.muted}>
                      You have {subscriptions.length} active camp alert
                      {subscriptions.length > 1 ? 's' : ''}:
                    </Text>
                    <View style={s.subList}>
                      {subscriptions.map((sub) => (
                        <View key={sub.id} style={s.subRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.subSport}>{sub.sport}</Text>
                            <Text style={s.subEmail}>{sub.email}</Text>
                          </View>
                          <Button
                            size="sm"
                            variant="ghost"
                            textStyle={{ color: colors.destructive }}
                            onPress={() => handleUnsubscribeOne(sub.id)}
                          >
                            Remove
                          </Button>
                        </View>
                      ))}
                    </View>
                    <Button variant="destructive" style={s.fullWidthBtn} onPress={handleUnsubscribeAll}>
                      Unsubscribe from All
                    </Button>
                  </>
                )}
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
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md, paddingVertical: spacing.xxl },
  card: { width: '100%', maxWidth: 480 },
  content: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.md },
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
  subList: { width: '100%', gap: spacing.sm, marginTop: spacing.sm },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    backgroundColor: colors.muted,
    borderRadius: 8,
  },
  subSport: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  subEmail: { fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  fullWidthBtn: { width: '100%', marginTop: spacing.md },
});
