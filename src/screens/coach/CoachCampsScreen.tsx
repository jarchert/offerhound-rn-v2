// CoachCampsScreen — RN port of Lovable src/pages/CoachCamps.tsx (151 LOC).
// Web→RN mapping: react-router-dom→@react-navigation/native; lucide-react→lucide-react-native;
// shadcn lowercase→PascalCase; Tailwind→StyleSheet via @/lib/theme; sonner→@/hooks/use-toast.
// Surfaces the existing CampManagerDashboard + CampDiscovery components for sport-aware
// camp management, with a graceful "Coming Soon" card for unsupported sports.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Calendar } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CampManagerDashboard } from '@/components/CampManagerDashboard';
import { CampDiscovery } from '@/components/CampDiscovery';
import { TermsAcceptanceGate } from '@/components/TermsAcceptanceGate';
import { BackButton } from '@/components/BackButton';
import {
  CAMP_MANAGER_SUPPORTED_SPORTS,
  isCampManagerSupported,
} from '@/lib/data/campManagerSports';
import { SPORTS_CONFIG, type SportType } from '@/lib/data/sports';
import { colors, typography, spacing, radius } from '@/lib/theme';

export default function CoachCampsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const isClubRoute = !!route?.params?.club || route?.name?.startsWith?.('Club');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetched } = useCoachProfile();

  const { data: clubProfile } = useQuery({
    queryKey: ['club-coach-profile-camps', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('club_coach_profiles' as any)
        .select('id, sport')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && isFetched && !profile && isAuthenticated) {
      // RN: onboarding redirect handled by navigator-level auth gate.
    }
  }, [authLoading, isFetched, profile, isAuthenticated]);

  if (authLoading || profileLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!profile) return null;

  const sport: SportType = ((clubProfile as any)?.sport || (profile as any).sport || 'football') as SportType;
  const isClubCoach = isClubRoute || !!clubProfile;
  const headerLabel = isClubCoach ? 'Club Camp Manager' : 'Camp Manager';
  const sportSupported = isCampManagerSupported(sport);
  const sportName = SPORTS_CONFIG[sport]?.name || String(sport);

  return (
    <TermsAcceptanceGate>
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <BackButton label="Back" />
          <Text style={s.headerTitle}>{headerLabel}</Text>
        </View>
        <ScrollView contentContainerStyle={s.content}>
          {sportSupported ? (
            <CampManagerDashboard sport={sport} />
          ) : (
            <Card>
              <CardHeader>
                <View style={s.iconBubbleWrap}>
                  <View style={s.iconBubble}>
                    <Sparkles size={28} color={colors.primary} />
                  </View>
                </View>
                <CardTitle>Camp Manager for {sportName} — Coming Soon</CardTitle>
                <CardDescription>
                  We're tailoring sport-specific stat tracking, drill stations, and AI scoring for{' '}
                  <Text style={s.bold}>{sportName}</Text>. The Coach Camp Manager is currently
                  available for these sports:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View style={s.sportsRow}>
                  {CAMP_MANAGER_SUPPORTED_SPORTS.map((sp: SportType) => (
                    <Badge key={sp} variant="secondary">
                      {SPORTS_CONFIG[sp].name}
                    </Badge>
                  ))}
                </View>
                <Text style={s.muted}>
                  In the meantime, you can still discover camps to attend in your sport below.
                </Text>
              </CardContent>
            </Card>
          )}

          <View style={s.divider} />

          <View style={s.discoveryHeader}>
            <Calendar size={20} color={colors.primary} />
            <Text style={s.discoveryTitle}>Discover Other Camps</Text>
          </View>
          <CampDiscovery coachSport={sport} coachState={(profile as any).state} />
        </ScrollView>
      </SafeAreaView>
    </TermsAcceptanceGate>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foregroundSubtle,
    letterSpacing: typography.letterSpacing.heading,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  iconBubbleWrap: { alignItems: 'center', marginBottom: spacing.sm },
  iconBubble: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(231,175,8,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
  muted: {
    color: colors.foregroundSubtle,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.body,
  },
  bold: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  discoveryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  discoveryTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bodyBold,
  },
});
