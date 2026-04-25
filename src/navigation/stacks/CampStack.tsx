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
import PublicCampRegistrationScreen from '@/screens/camps/PublicCampRegistrationScreen';
import CampStaffCheckinScreen from '@/screens/camps/CampStaffCheckinScreen';
import CampAthleteDeliverablesScreen from '@/screens/camps/CampAthleteDeliverablesScreen';

// PORT-PENDING: no remaining placeholders in CampStack — every route maps to a ported screen.
// (CampDetail intentionally aliases PublicCampRegistrationScreen, matching Lovable's
// PublicCampRegistration.tsx serving as the camp detail page.) If new camp surfaces are
// added in Lovable they should be ported here and an explicit placeholder reintroduced.

const CampDiscovery = CampDiscoveryScreen;
const ClaimCampSpot = ClaimCampSpotScreen;
// CampDetail is served by the public registration page (Lovable: PublicCampRegistration.tsx).
const CampDetail = PublicCampRegistrationScreen;
const CampLeaderboard = CampLiveLeaderboardScreen;
const CampDeliverables = CampAthleteDeliverablesScreen;
const CampSpectator = CampSpectatorViewScreen;
const CampStaffCheckin = CampStaffCheckinScreen;
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
