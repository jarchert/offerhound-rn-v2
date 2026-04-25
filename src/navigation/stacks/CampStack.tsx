// CampStack — 10 cross-role camp routes per Part 2 §2.1
// Part 11 + Part 38 describe the camp mobile-specific screens.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import CampsScreen from '@/screens/shared/CampsScreen';
import CampDiscoveryScreen from '@/screens/shared/CampDiscoveryScreen';
import ClaimCampSpotScreen from '@/screens/camps/ClaimCampSpotScreen';
import CampLeaderboardEmbedScreen from '@/screens/camps/CampLeaderboardEmbedScreen';
import UnsubscribeCampAlertsScreen from '@/screens/camps/UnsubscribeCampAlertsScreen';
import CampSpectatorViewScreen from '@/screens/camps/CampSpectatorViewScreen';
import CampLiveLeaderboardScreen from '@/screens/camps/CampLiveLeaderboardScreen';
import CampMobileCheckinScreen from '@/screens/camps/CampMobileCheckinScreen';
import CampEvaluatorScoringScreen from '@/screens/camps/CampEvaluatorScoringScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const CampDiscovery = CampDiscoveryScreen;
const ClaimCampSpot = ClaimCampSpotScreen;
// PORT-PENDING: no dedicated Lovable CampDetail page — the detail surface lives inside CampManagerDashboard / public registration; schedule a focused detail screen in next wave.
const CampDetail = makePlaceholder('Camp Detail', 'Arrives in Session 6', 'Camp details + enrollment.');
const CampLeaderboard = CampLiveLeaderboardScreen;
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampAthleteDeliverables.tsx (116 LOC) — schedule in next wave
const CampDeliverables = makePlaceholder('Camp Deliverables', 'Arrives in Session 6', 'Athlete performance deliverables.');
const CampSpectator = CampSpectatorViewScreen;
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampStaffCheckin.tsx (78 LOC) — schedule in next wave
const CampStaffCheckin = makePlaceholder('Staff Check-In', 'Arrives in Session 6', 'Staff-side QR check-in.');
const CampMobileCheckin = CampMobileCheckinScreen;
const CampEvaluatorScoring = CampEvaluatorScoringScreen;
const CampLeaderboardEmbed = CampLeaderboardEmbedScreen;
const UnsubscribeCampAlerts = UnsubscribeCampAlertsScreen;

export type CampStackParamList = {
  CampDiscovery: undefined;
  CampsList: undefined;
  CampsDiscover: undefined;
  ClaimCampSpot: { token?: string } | undefined;
  CampDetail: { campId: string };
  CampLeaderboard: { campId: string };
  CampDeliverables: { campId: string; enrollmentId: string };
  CampSpectator: { token: string };
  CampStaffCheckin: { token: string };
  CampMobileCheckin: { campId: string };
  CampEvaluatorScoring: { campId: string };
  CampLeaderboardEmbed: { campId: string; metric?: string; limit?: number | string; theme?: string };
  UnsubscribeCampAlerts: { email?: string } | undefined;
};

const Stack = createNativeStackNavigator<CampStackParamList>();

export default function CampStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="CampDiscovery" component={CampDiscovery} />
      <Stack.Screen name="CampsList" component={CampsScreen} />
      <Stack.Screen name="CampsDiscover" component={CampDiscovery} />
      <Stack.Screen name="ClaimCampSpot" component={ClaimCampSpot} />
      <Stack.Screen name="CampDetail" component={CampDetail} />
      <Stack.Screen name="CampLeaderboard" component={CampLeaderboard} />
      <Stack.Screen name="CampDeliverables" component={CampDeliverables} />
      <Stack.Screen name="CampSpectator" component={CampSpectator} />
      <Stack.Screen name="CampStaffCheckin" component={CampStaffCheckin} />
      <Stack.Screen name="CampMobileCheckin" component={CampMobileCheckin} />
      <Stack.Screen name="CampEvaluatorScoring" component={CampEvaluatorScoring} />
      <Stack.Screen name="CampLeaderboardEmbed" component={CampLeaderboardEmbed} />
      <Stack.Screen name="UnsubscribeCampAlerts" component={UnsubscribeCampAlerts} />
    </Stack.Navigator>
  );
}
