// CampStack — 10 cross-role camp routes per Part 2 §2.1
// Part 11 + Part 38 describe the camp mobile-specific screens.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import CampsScreen from '@/screens/shared/CampsScreen';
import CampDiscoveryScreen from '@/screens/shared/CampDiscoveryScreen';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

const CampDiscovery = CampDiscoveryScreen;
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/ClaimCampSpot.tsx (176 LOC) — schedule in next wave
const ClaimCampSpot = makePlaceholder('Claim Camp Spot', 'Arrives in Session 6', 'Register for a camp.');
// PORT-PENDING: no dedicated Lovable CampDetail page — the detail surface lives inside CampManagerDashboard / public registration; schedule a focused detail screen in next wave.
const CampDetail = makePlaceholder('Camp Detail', 'Arrives in Session 6', 'Camp details + enrollment.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampLiveLeaderboard.tsx (307 LOC) — schedule in next wave
const CampLeaderboard = makePlaceholder('Camp Leaderboard', 'Arrives in Session 6', 'Live leaderboard during camp.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampAthleteDeliverables.tsx (116 LOC) — schedule in next wave
const CampDeliverables = makePlaceholder('Camp Deliverables', 'Arrives in Session 6', 'Athlete performance deliverables.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampSpectatorView.tsx (256 LOC) — schedule in next wave
const CampSpectator = makePlaceholder('Camp Spectator', 'Arrives in Session 6', 'Spectator view of live camp.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampStaffCheckin.tsx (78 LOC) — schedule in next wave
const CampStaffCheckin = makePlaceholder('Staff Check-In', 'Arrives in Session 6', 'Staff-side QR check-in.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampMobileCheckin.tsx (433 LOC) — schedule in next wave
const CampMobileCheckin = makePlaceholder('Mobile Check-In', 'Arrives in Session 6', 'Coach-side mobile check-in.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampEvaluatorScoring.tsx (441 LOC) — schedule in next wave
const CampEvaluatorScoring = makePlaceholder('Evaluator Scoring', 'Arrives in Session 6', 'Evaluator scoring interface.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/CampLeaderboardEmbed.tsx (103 LOC) — schedule in next wave
const CampLeaderboardEmbed = makePlaceholder('Leaderboard Embed', 'Arrives in Session 6', 'Embeddable leaderboard view.');
// PORT-PENDING: Lovable source at offerhound-repo/src/pages/UnsubscribeCampAlerts.tsx (138 LOC) — schedule in next wave
const UnsubscribeCampAlerts = makePlaceholder('Unsubscribe', 'Arrives in Session 6', 'Unsubscribe from camp alerts.');

export type CampStackParamList = {
  CampDiscovery: undefined;
  CampsList: undefined;
  CampsDiscover: undefined;
  ClaimCampSpot: undefined;
  CampDetail: { campId: string };
  CampLeaderboard: { campId: string };
  CampDeliverables: { campId: string; enrollmentId: string };
  CampSpectator: { token: string };
  CampStaffCheckin: { token: string };
  CampMobileCheckin: { campId: string };
  CampEvaluatorScoring: { campId: string };
  CampLeaderboardEmbed: { campId: string };
  UnsubscribeCampAlerts: undefined;
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
