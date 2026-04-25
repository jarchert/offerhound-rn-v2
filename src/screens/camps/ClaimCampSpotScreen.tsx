// ClaimCampSpotScreen — RN port of Lovable web src/pages/ClaimCampSpot.tsx (176 LOC).
// Public landing reached via waitlist offer email link.
// Validates a token against camp_waitlist via the `claim-waitlist-spot` edge function,
// shows a one-click "Claim my spot" button, and on success navigates to CampDetail.
//
// Web URL was /camps/claim?token=...; in RN the token is provided as a route param
// (deep links should map ?token=xxx → ClaimCampSpot { token: 'xxx' }).
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { Loader2, CheckCircle2, AlertCircle, Tent } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/lib/theme';
import type { CampStackParamList } from '@/navigation/stacks/CampStack';

type Status = 'validating' | 'ready' | 'claiming' | 'claimed' | 'expired' | 'invalid' | 'error';

export default function ClaimCampSpotScreen() {
  const route = useRoute<RouteProp<CampStackParamList, 'ClaimCampSpot'>>();
  const navigation = useNavigation<NavigationProp<CampStackParamList>>();
  const token = (route.params as any)?.token as string | undefined;

  const [status, setStatus] = useState<Status>('validating');
  const [campId, setCampId] = useState<string | null>(null);
  const [campName, setCampName] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('claim-waitlist-spot', {
          body: { token, action: 'validate' },
        });
        if (error) throw error;
        if (!data?.valid) {
          if (data?.expired) {
            setExpiresAt(data?.expires_at || null);
            setCampName(data?.camp_name || '');
            setStatus('expired');
          } else if (data?.claimed) {
            setStatus('invalid');
          } else {
            setStatus('invalid');
          }
          return;
        }
        setCampId(data.camp_id);
        setCampName(data.camp_name || 'the camp');
        setExpiresAt(data.expires_at || null);
        setStatus('ready');
      } catch (e: any) {
        setErrorMsg(e?.message || 'Could not validate this link.');
        setStatus('error');
      }
    })();
  }, [token]);

  const handleClaim = async () => {
    if (!token) return;
    setStatus('claiming');
    try {
      const { data, error } = await supabase.functions.invoke('claim-waitlist-spot', {
        body: { token, action: 'claim' },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus('claimed');
        setTimeout(() => {
          if (campId) navigation.navigate('CampDetail', { campId });
        }, 2000);
      } else {
        const msg = String(data?.error || '');
        if (/expired/i.test(msg)) {
          setStatus('expired');
        } else {
          setErrorMsg(msg || 'Could not claim this spot.');
          setStatus('error');
        }
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not claim this spot.');
      setStatus('error');
    }
  };

  const expiresLabel = expiresAt ? new Date(expiresAt).toLocaleString() : null;

  const title =
    status === 'claimed'
      ? "You're in!"
      : status === 'expired'
      ? 'This offer has expired'
      : status === 'invalid'
      ? 'Link is no longer valid'
      : 'Claim your spot';

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <Card style={s.card}>
          <CardHeader style={s.header}>
            <Tent size={40} color={colors.primary} style={s.iconCenter} />
            <CardTitle style={s.title}>{title}</CardTitle>
            <CardDescription style={s.description}>
              {status === 'ready' && (
                <Text style={s.description}>
                  A spot just opened for {campName}.
                  {expiresLabel ? `\n\nThis offer expires on ${expiresLabel}.` : ''}
                </Text>
              )}
              {status === 'validating' && 'Checking your link...'}
              {status === 'claiming' && 'Reserving your spot...'}
              {status === 'claimed' && 'Confirmation sent. Redirecting...'}
              {status === 'expired' &&
                `Waitlist offers are valid for 48 hours and this one has passed${
                  expiresLabel ? ` (expired ${expiresLabel})` : ''
                }. The spot has been offered to the next person in line.`}
              {status === 'invalid' &&
                "This claim link doesn't match an active offer. It may have already been used, been replaced by a newer offer, or the spot was filled by another athlete."}
              {status === 'error' && (errorMsg || 'Something went wrong.')}
            </CardDescription>
          </CardHeader>

          <CardContent style={s.content}>
            {status === 'validating' || status === 'claiming' ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : status === 'ready' ? (
              <Button size="lg" onPress={handleClaim} leftIcon={<CheckCircle2 size={16} color={colors.primaryForeground} />}>
                Claim my spot
              </Button>
            ) : status === 'claimed' ? (
              <CheckCircle2 size={48} color={colors.primary} />
            ) : (
              <View style={s.errorBlock}>
                <AlertCircle size={40} color={colors.destructive} />
                <Button variant="outline" onPress={() => navigation.navigate('CampsList')}>
                  Browse other camps
                </Button>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingVertical: spacing.xxl, alignItems: 'center' },
  card: { width: '100%', maxWidth: 560 },
  header: { alignItems: 'center', gap: spacing.sm },
  iconCenter: { alignSelf: 'center', marginBottom: spacing.xs },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  content: { alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg },
  errorBlock: { alignItems: 'center', gap: spacing.sm },
});
