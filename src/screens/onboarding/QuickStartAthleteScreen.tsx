// QuickStartAthleteScreen — RN page-level wrapper for the ported AthleteQuickStartGuide dialog.
// There is no 1:1 Lovable page (Lovable's QuickStart.tsx is a multi-step profile-creation flow);
// in the mobile app we surface the existing AthleteQuickStartGuide as the athlete quick-start
// experience and gate it on auth + role, mirroring the gating used by the other quick-start
// screens (QuickStartCoachScreen / QuickStartScoutScreen). On dismissal we return the user to
// AthleteTabs, which is the equivalent landing surface for "/dashboard" in the web app.
//
// PORT-PENDING (next wave): port the full multi-step profile-creation flow from
// offerhound-repo/src/pages/QuickStart.tsx (terms → info → photo → publish). For now the
// dialog-based guide ships behind the same route to unblock navigation parity.
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '@/hooks/useAuth';
import { useRoleGuard, getRoleConflictMessage } from '@/hooks/useRoleGuard';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useToast } from '@/hooks/use-toast';
import AthleteQuickStartGuide from '@/components/AthleteQuickStartGuide';
import { colors } from '@/lib/theme';
import type { OnboardingStackParamList } from '@/navigation/stacks/OnboardingStack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList & RootStackParamList>;

export default function QuickStartAthleteScreen() {
  const nav = useNavigation<Nav>();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isLoading: roleLoading, currentRole, redirectPath } = useRoleGuard('athlete');
  const { profile, isLoading: profileLoading } = usePlayerProfile();

  // Auth gate: unauthenticated users go to Auth.
  useEffect(() => {
    if (!authLoading && !user) {
      nav.getParent()?.reset({ index: 0, routes: [{ name: 'AuthStack' as any }] });
    }
  }, [authLoading, user, nav]);

  // Role gate: if user already has a non-athlete role, bounce to QuickStartSelect.
  useEffect(() => {
    if (!roleLoading && redirectPath && currentRole && currentRole !== 'none' && currentRole !== 'athlete') {
      const message = getRoleConflictMessage(currentRole);
      toast({ title: message.title, description: message.description });
      nav.navigate('QuickStartSelect' as any);
    }
  }, [roleLoading, redirectPath, currentRole, nav, toast]);

  if (authLoading || roleLoading || profileLoading || !user) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (redirectPath && currentRole && currentRole !== 'none' && currentRole !== 'athlete') {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const athleteName = (profile as any)?.full_name || user.email?.split('@')[0] || 'Athlete';
  const hasProfileImage = !!(profile as any)?.profile_image_url;
  const hasHighlightVideo = !!(profile as any)?.highlight_video_url;

  return (
    <SafeAreaView style={s.safe}>
      <AthleteQuickStartGuide
        athleteName={athleteName}
        hasProfileImage={hasProfileImage}
        hasHighlightVideo={hasHighlightVideo}
        onDismiss={() => nav.navigate('QuickStartAthleteProfile')}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
