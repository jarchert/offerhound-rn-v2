// RootNavigator — post-Session 2 rewrite per Part 2 §2.1
// NO NavigationContainer here (App.tsx owns it). This is the root Stack that
// branches on auth + role and exposes 9 role navigators + 7 shared stacks.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { colors } from '@/lib/theme';
import type { UserRole } from '@/lib/constants';

// Role navigators
import AthleteTabs from '@/navigation/role/AthleteTabs';
import CoachTabs from '@/navigation/role/CoachTabs';
import ScoutTabs from '@/navigation/role/ScoutTabs';
import ParentTabs from '@/navigation/role/ParentTabs';
import InfluencerTabs from '@/navigation/role/InfluencerTabs';
import AdminTabs from '@/navigation/role/AdminTabs';
import HSCoachTabs from '@/navigation/role/HSCoachTabs';
import ClubCoachTabs from '@/navigation/role/ClubCoachTabs';
import AgencyTabs from '@/navigation/role/AgencyTabs';

// Shared stacks
import AuthStack from '@/navigation/stacks/AuthStack';
import OnboardingStack from '@/navigation/stacks/OnboardingStack';
import CampStack from '@/navigation/stacks/CampStack';
import SettingsStack from '@/navigation/stacks/SettingsStack';
import PublicProfileStack from '@/navigation/stacks/PublicProfileStack';
import PublicTabs from '@/navigation/stacks/PublicTabs';
import PublicSportStack from '@/navigation/stacks/PublicSportStack';

// Shared screens accessed from any role
import ProfileScreen from '@/screens/shared/ProfileScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import NotificationsScreen from '@/screens/shared/NotificationsScreen';
import InboxScreen from '@/screens/shared/InboxScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';
import AICoachScreen from '@/screens/shared/AICoachScreen';
import LeaveReviewScreen from '@/screens/shared/LeaveReviewScreen';
import CoachSearchScreen from '@/screens/shared/CoachSearchScreen';
import ScoutDirectoryScreen from '@/screens/scout/ScoutDirectoryScreen';
import SavedCampsScreen from '@/screens/shared/SavedCampsScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import InfluencerBoardScreen from '@/screens/influencer/InfluencerBoardScreen';
import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';
import CoachProfileScreen from '@/screens/shared/CoachProfileScreen';
import PublicClubCoachProfileScreen from '@/screens/public/PublicClubCoachProfileScreen';
import SavedCoachesScreen from '@/screens/shared/SavedCoachesScreen';
import ReferralTrackingScreen from '@/screens/shared/ReferralTrackingScreen';
import PodcastEpisodeDetailScreen from '@/screens/shared/PodcastEpisodeDetailScreen';
import ScoutTrendsScreen from '@/screens/scout/ScoutTrendsScreen';
import SmokeTestScreen from '@/screens/dev/SmokeTestScreen';
import InstallScreen from '@/screens/shared/InstallScreen';
import FounderMessageScreen from '@/screens/shared/FounderMessageScreen';
import PricingScreen from '@/screens/shared/PricingScreen';
import SubscriptionSuccessScreen from '@/screens/shared/SubscriptionSuccessScreen';
import NILIntelligenceScreen from '@/screens/shared/NILIntelligenceScreen';
import SupportScreen from '@/screens/shared/SupportScreen';
import NotFoundScreen from '@/screens/shared/NotFoundScreen';
import CoachCampaignsScreen from '@/screens/coach/CoachCampaignsScreen';
import CoachCommunicationRulesScreen from '@/screens/coach/CoachCommunicationRulesScreen';
import AthleteProfileEditScreen from '@/screens/athlete/AthleteProfileEditScreen';
import InfluencerBlogComposerScreen from '@/screens/influencer/InfluencerBlogComposerScreen';
import ParentAthleteEditor from '@/components/ParentAthleteEditor';

// Persistent post-auth overlay
import FloatingAICoach from '@/components/FloatingAICoach';

export type RootStackParamList = {
  PublicTabs: undefined;
  PublicSportStack: undefined;
  AuthStack: undefined;
  OnboardingStack: undefined;
  AthleteTabs: undefined;
  CoachTabs: undefined;
  ScoutTabs: undefined;
  ParentTabs: undefined;
  InfluencerTabs: undefined;
  AdminTabs: undefined;
  HSCoachTabs: undefined;
  ClubCoachTabs: undefined;
  AgencyTabs: undefined;
  CampStack: undefined;
  SettingsStack: undefined;
  PublicProfileStack: undefined;
  Profile: { userId?: string };
  Messages: undefined;
  Notifications: undefined;
  Inbox: undefined;
  LetterComposer: { seed?: any } | undefined;
  AICoach: undefined;
  LeaveReview: undefined;
  CoachSearchScreen: undefined;
  ScoutDirectory: undefined;
  SavedCamps: undefined;
  AthleteSearch: undefined;
  InfluencerBoard: undefined;
  CoachDirectory: undefined;
  CoachProfile: { id: string };
  PublicClubCoachProfile: { id: string };
  SavedCoaches: undefined;
  Referrals: undefined;
  PodcastEpisodeDetail: { id?: string } | undefined;
  ScoutTrends: undefined;
  SmokeTest: undefined;
  Install: undefined;
  FounderMessage: undefined;
  Pricing: undefined;
  SubscriptionSuccess: undefined;
  NILIntelligence: undefined;
  Support: undefined;
  CoachCampaigns: undefined;
  CoachCommunicationRules: undefined;
  AthleteProfileEdit: undefined;
  InfluencerBlogComposer: { postId?: string } | undefined;
  /** Minor-safe profile creation — token from /minor-invite/:token deep link. */
  MinorInvite: { token: string };
  NotFound: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Map the resolved user role to the initial role-specific tab navigator name.
 * Default = athlete (the largest role). Unknown roles fall back to AthleteTabs.
 */
export function roleToInitialRoute(role: UserRole | null | undefined): keyof RootStackParamList {
  switch (role) {
    case 'athlete': return 'AthleteTabs';
    case 'coach': return 'CoachTabs';
    case 'scout': return 'ScoutTabs';
    case 'parent': return 'ParentTabs';
    case 'influencer': return 'InfluencerTabs';
    case 'admin':
    case 'moderator': return 'AdminTabs';
    case 'high_school_coach': return 'HSCoachTabs';
    case 'club_coach': return 'ClubCoachTabs';
    case 'agency' as UserRole: return 'AgencyTabs';
    default: return 'AthleteTabs';
  }
}

// Unauthenticated navigator — rendered when there is no logged-in user.
// Keeping this as its own component means React Navigation unmounts it
// entirely when the user signs in, so no public route can persist in the
// navigation state after authentication.
function PublicNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="PublicTabs"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="PublicTabs" component={PublicTabs} />
      <Stack.Screen name="PublicSportStack" component={PublicSportStack} />
      <Stack.Screen name="AuthStack" component={AuthStack} />
      <Stack.Screen name="PublicProfileStack" component={PublicProfileStack} />
      <Stack.Screen name="CampStack" component={CampStack} />
      <Stack.Screen name="Install" component={InstallScreen} />
      <Stack.Screen name="FounderMessage" component={FounderMessageScreen} />
      <Stack.Screen name="Pricing" component={PricingScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="CoachCommunicationRules" component={CoachCommunicationRulesScreen} />
      <Stack.Screen name="MinorInvite" component={ParentAthleteEditor} />
      {/* Public-access directory screens — contact gating applied per-screen */}
      <Stack.Screen name="CoachDirectory" component={CoachDirectoryScreen} />
      <Stack.Screen name="ScoutDirectory" component={ScoutDirectoryScreen} />
      <Stack.Screen name="InfluencerBoard" component={InfluencerBoardScreen} />
      <Stack.Screen name="AthleteSearch" component={AthleteSearchScreen} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} />
    </Stack.Navigator>
  );
}

// Authenticated navigator — rendered only when a user session exists.
// initialRouteName is set to the role-specific tab navigator so the user
// lands directly on their dashboard. PublicTabs / LandingScreen are not
// registered here, making it impossible for them to appear post-login.
function AuthenticatedNavigator({ initialRouteName }: { initialRouteName: keyof RootStackParamList }) {
  return (
    <>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        {/* Role-specific navigators — initialRouteName picks one */}
        <Stack.Screen name="AthleteTabs" component={AthleteTabs} />
        <Stack.Screen name="CoachTabs" component={CoachTabs} />
        <Stack.Screen name="ScoutTabs" component={ScoutTabs} />
        <Stack.Screen name="ParentTabs" component={ParentTabs} />
        <Stack.Screen name="InfluencerTabs" component={InfluencerTabs} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="HSCoachTabs" component={HSCoachTabs} />
        <Stack.Screen name="ClubCoachTabs" component={ClubCoachTabs} />
        <Stack.Screen name="AgencyTabs" component={AgencyTabs} />

        {/* Shared stacks accessible from any role */}
        <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
        <Stack.Screen name="CampStack" component={CampStack} />
        <Stack.Screen name="SettingsStack" component={SettingsStack} />
        <Stack.Screen name="PublicProfileStack" component={PublicProfileStack} />
        <Stack.Screen name="PublicSportStack" component={PublicSportStack} />

        {/* Cross-cutting modals / shared screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Inbox" component={InboxScreen} />
        <Stack.Screen
          name="LetterComposer"
          component={LetterComposerScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AICoach"
          component={AICoachScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="LeaveReview" component={LeaveReviewScreen} />
        <Stack.Screen name="CoachSearchScreen" component={CoachSearchScreen} />
        <Stack.Screen name="ScoutDirectory" component={ScoutDirectoryScreen} />
        <Stack.Screen name="SavedCamps" component={SavedCampsScreen} />
        <Stack.Screen name="AthleteSearch" component={AthleteSearchScreen} />
        <Stack.Screen name="InfluencerBoard" component={InfluencerBoardScreen} />
        <Stack.Screen name="CoachDirectory" component={CoachDirectoryScreen} />
        <Stack.Screen name="CoachProfile" component={CoachProfileScreen} />
        <Stack.Screen name="PublicClubCoachProfile" component={PublicClubCoachProfileScreen} />
        <Stack.Screen name="SavedCoaches" component={SavedCoachesScreen} />
        <Stack.Screen name="Referrals" component={ReferralTrackingScreen} />
        <Stack.Screen name="PodcastEpisodeDetail" component={PodcastEpisodeDetailScreen} />
        <Stack.Screen name="ScoutTrends" component={ScoutTrendsScreen} />
        <Stack.Screen name="SmokeTest" component={SmokeTestScreen} />
        <Stack.Screen name="Install" component={InstallScreen} />
        <Stack.Screen name="FounderMessage" component={FounderMessageScreen} />
        <Stack.Screen name="Pricing" component={PricingScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="SubscriptionSuccess" component={SubscriptionSuccessScreen} />
        <Stack.Screen name="NILIntelligence" component={NILIntelligenceScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="CoachCampaigns" component={CoachCampaignsScreen} />
        <Stack.Screen name="CoachCommunicationRules" component={CoachCommunicationRulesScreen} />
        <Stack.Screen name="AthleteProfileEdit" component={AthleteProfileEditScreen} />
        <Stack.Screen
          name="InfluencerBlogComposer"
          component={InfluencerBlogComposerScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="MinorInvite" component={ParentAthleteEditor} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
      <FloatingAICoach />
    </>
  );
}

export default function RootNavigator() {
  const { user, userRole, isLoading } = useAuth() as any;

  // Agency detection: if user is a scout AND owns or belongs to a scout_organization,
  // route them to AgencyTabs instead of ScoutTabs. Mirrors Lovable Navbar.tsx logic.
  const { data: scoutOrg } = useScoutOrganization();
  const isAgency = userRole === 'scout' && !!scoutOrg && ((scoutOrg as any).isOwner || (scoutOrg as any).isMember);

  if (isLoading) return null;

  if (!user) {
    return <PublicNavigator />;
  }

  const effectiveRole: UserRole | null | undefined = isAgency
    ? ('agency' as UserRole)
    : (userRole as UserRole | null | undefined);

  return <AuthenticatedNavigator initialRouteName={roleToInitialRoute(effectiveRole)} />;
}
