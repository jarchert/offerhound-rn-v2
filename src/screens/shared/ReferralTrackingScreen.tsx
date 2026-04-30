// ReferralTrackingScreen — RN port of Lovable web ReferralTracking page.
// Source: offerhound-repo/src/pages/ReferralTracking.tsx (32 LOC)
//
// Adaptations (web → RN):
//   - <div>/<h1>/<p>/<span> → <View>/<Text>
//   - className utility     → StyleSheet
//   - lucide-react          → lucide-react-native
//   - useAuth (web hook)    → @/contexts/AuthContext (RN)
//   - navigator.clipboard   → expo-clipboard (via copyToClipboard helper)
//   - window.location.origin → APP_DEEP_LINK_BASE constant pointing at the
//                              production web origin so the referral URL is
//                              still shareable from the device.
//   - sonner toast          → @/components/ui/toast wrapper
//
// PORT-PENDING:
//   - Native share sheet (react-native Share API). Today we copy-to-clipboard
//     only, matching the web flow.
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Gift, Link as LinkIcon } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
const REFERRAL_BASE_URL = 'https://offer-hound.com/auth';

export default function ReferralTrackingScreen() {
  const { user } = useAuth() as any;

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('referrals' as any)
        .select('*')
        .eq('referrer_user_id', user.id);
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const copyLink = async () => {
    const link = `${REFERRAL_BASE_URL}?ref=${user?.id ?? ''}`;
    const ok = await copyToClipboard(link);
    if (ok) toast.success('Referral link copied!');
    else toast.error('Could not copy link');
  };

  return (
    <SafeAreaView style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />

        <View style={s.headerRow}>
          <Gift size={28} color={colors.primary} />
          <Text style={s.title}>Referral Program</Text>
        </View>

        <Card style={{ marginBottom: spacing.md }}>
          <CardContent style={s.summaryRow}>
            <View>
              <Text style={s.summaryLabel}>Total Referrals</Text>
              <Text style={s.summaryValue}>{referrals.length}</Text>
            </View>
            <Button
              onPress={copyLink}
              leftIcon={<LinkIcon size={14} color={colors.primaryForeground} />}
            >
              Copy Link
            </Button>
          </CardContent>
        </Card>

        {referrals.length === 0 ? (
          <Text style={s.emptyText}>
            No referrals yet — share your link to get started.
          </Text>
        ) : (
          <View style={s.list}>
            {referrals.map((r: any) => (
              <Card key={r.id}>
                <CardContent style={s.referralRow}>
                  <Text style={s.referralEmail} numberOfLines={1}>
                    {r.referred_email || 'User'}
                  </Text>
                  <Badge>{r.status || 'pending'}</Badge>
                </CardContent>
              </Card>
            ))}
          </View>
        )}

        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['3xl'],
    color: colors.primary,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  list: { gap: spacing.xs },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  referralEmail: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    flex: 1,
  },
});
