// RootNavigator — post-Session 2 rewrite per Part 2 §2.1
// NO NavigationContainer here (App.tsx owns it). This is the root Stack that
// branches on auth + role. Athlete + Admin use bottom tabs; all other roles
// use drawer (hamburger menu) navigators per NAV_REDESIGN.md.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/theme';
import type { UserRole } from '@/lib/constants';

// Role navigators — Athlete + Admin keep bottom tabs; all others use drawer.
import AthleteTabs from '@/navigation/role/AthleteTabs';
import AdminTabs from '@/navigation/role/AdminTabs';
import CoachDrawer from '@/navigation/role/CoachDrawer';
import ScoutDrawer from '@/navigation/role/ScoutDrawer';
import ParentDrawer from '@/navigation/role/ParentDrawer';
import InfluencerDrawer from '@/navigation/role/InfluencerDrawer';
import HSCoachDrawer from '@/navigation/role/HSCoachDrawer';
import ClubCoachDrawer from '@/navigation/role/ClubCoachDrawer';
import AgencyDrawer from '@/navigation/role/AgencyDrawer';

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
import SmokeTestScreen from '@/screens/dev/SmokeTestScreen';
import InstallScreen from '@/screens/shared/InstallScreen';
import FounderMessageScreen from '@/screens/shared/FounderMessageScreen';
import PricingScreen from '@/screens/shared/PricingScreen';
import SubscriptionSuccessScreen from '@/screens/shared/SubscriptionSuccessScreen';
import NILIntelligenceScreen from '@/screens/shared/NILIntelligenceScreen';
import SupportScreen from '@/screens/shared/SupportScreen';
import CoachCampaignsScreen from '@/screens/coach/CoachCampaignsScreen';
import CoachCommunicationRulesScreen from '@/screens/coach/CoachCommunicationRulesScreen';
import SavedCoachesScreen from '@/screens/shared/SavedCoachesScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';
import ScoutTrendsScreen from '@/screens/scout/ScoutTrendsScreen';
import CampDiscoveryScreen from '@/screens/shared/CampDiscoveryScreen';
import CoachSearchScreen from '@/screens/shared/CoachSearchScreen';
import NILAdvisorScreen from '@/screens/athlete/NILAdvisorScreen';
import PodcastLibraryScreen from '@/screens/shared/PodcastLibraryScreen';
import PodcastEpisodeDetailScreen from '@/screens/shared/PodcastEpisodeDetailScreen';
import NewsAndLearnScreen from '@/screens/shared/NewsAndLearnScreen';
import SavedCampsScreen from '@/screens/shared/SavedCampsScreen';
import ReferralTrackingScreen from '@/screens/shared/ReferralTrackingScreen';
import InfluencerBoardScreen from '@/screens/influencer/InfluencerBoardScreen';

import PasswordResetScreen from '@/screens/auth/PasswordResetScreen';
import LeaveReviewScreen from '@/screens/LeaveReviewScreen';
import FloatingAICoach from '@/components/FloatingAICoach';

export type RootStackParamList = {
  PublicTabs: undefined;
  PublicSportStack: undefined;
  AuthStack: undefined;
  OnboardingStack: undefined;
  AthleteTabs: undefined;
  CoachDrawer: undefined;
  ScoutDrawer: undefined;
  ParentDrawer: undefined;
  InfluencerDrawer: undefined;
  AdminTabs: undefined;
  HSCoachDrawer: undefined;
  ClubCoachDrawer: undefined;
  AgencyDrawer: undefined;
  CampStack: undefined;
  SettingsStack: undefined;
  PublicProfileStack: undefined;
  Profile: { userId?: string };
  Messages: { recipientId?: string; recipientName?: string } | undefined;
  Notifications: undefined;
  Inbox: undefined;
  LetterComposer: { seed?: any; athlete?: any; coachName?: string; coachRole?: string; coachSchool?: string; schoolName?: string; recipientName?: string; recipientRole?: string; athleteName?: string; athletePosition?: string; athleteSchool?: string } | undefined;
  AICoach: undefined;
  SmokeTest: undefined;
  Install: undefined;
  FounderMessage: undefined;
  Pricing: undefined;
  SubscriptionSuccess: undefined;
  NILIntelligence: undefined;
  Support: undefined;
  CoachCampaigns: undefined;
  CoachCommunicationRules: undefined;
  SavedCoaches: undefined;
  AthleteSearch: { q?: string; sport?: string; state?: string; position?: string } | undefined;
  CoachDirectory: undefined;
  ScoutTrends: undefined;
  CampDiscovery: undefined;
  CoachSearch: undefined;
  NILAdvisor: undefined;
  PodcastLibrary: undefined;
  PodcastEpisodeDetail: { id?: string; episodeId?: string } | undefined;
  NewsAndLearn: undefined;
  SavedCamps: undefined;
  ReferralTracking: undefined;
  InfluencerBoard: undefined;
  PasswordReset: undefined;
  LeaveReview: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Map the resolved user role to the initial role-specific tab navigator name.
 * Default = athlete (the largest role). Unknown roles fall back to PublicTabs.
 */
function roleToInitialRoute(role: UserRole | null | undefined): keyof RootStackParamList {
  switch (role) {
    case 'athlete': return 'AthleteTabs';
    case 'coach': return 'CoachDrawer';
    case 'scout': return 'ScoutDrawer';
    case 'parent': return 'ParentDrawer';
    case 'influencer': return 'InfluencerDrawer';
    case 'admin':
    case 'moderator': return 'AdminTabs';
    case 'high_school_coach': return 'HSCoachDrawer';
    case 'club_coach': return 'ClubCoachDrawer';
    case 'agency' as UserRole: return 'AgencyDrawer';
    default: return 'AthleteTabs';
  }
}

export default function RootNavigator() {
  const { user, userRole, isLoading } = useAuth() as any;

  React.useEffect(() => {
    if (!isLoading) {
      console.log(`[boot] first screen rendered (user=${!!user}, role=${userRole ?? 'none'})`);
    }
  }, [isLoading, user, userRole]);

  if (isLoading) return null;

  const initialRouteName = user
    ? roleToInitialRoute(userRole as UserRole | null | undefined)
    : ('PublicTabs' as keyof RootStackParamList);

  return (
    <>
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      {!user ? (
        <>
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
          <Stack.Screen name="LeaveReview" component={LeaveReviewScreen} />
        </>
      ) : (
        <>
          {/* Role-specific navigators — the initialRouteName picks one */}
          <Stack.Screen name="AthleteTabs" component={AthleteTabs} />
          <Stack.Screen name="CoachDrawer" component={CoachDrawer} />
          <Stack.Screen name="ScoutDrawer" component={ScoutDrawer} />
          <Stack.Screen name="ParentDrawer" component={ParentDrawer} />
          <Stack.Screen name="InfluencerDrawer" component={InfluencerDrawer} />
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
          <Stack.Screen name="HSCoachDrawer" component={HSCoachDrawer} />
          <Stack.Screen name="ClubCoachDrawer" component={ClubCoachDrawer} />
          <Stack.Screen name="AgencyDrawer" component={AgencyDrawer} />

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
          <Stack.Screen name="SmokeTest" component={SmokeTestScreen} />
          <Stack.Screen name="Install" component={InstallScreen} />
          <Stack.Screen name="FounderMessage" component={FounderMessageScreen} />
          <Stack.Screen name="Pricing" component={PricingScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="SubscriptionSuccess" component={SubscriptionSuccessScreen} />
          <Stack.Screen name="NILIntelligence" component={NILIntelligenceScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="CoachCampaigns" component={CoachCampaignsScreen} />
          <Stack.Screen name="CoachCommunicationRules" component={CoachCommunicationRulesScreen} />
          <Stack.Screen name="SavedCoaches" component={SavedCoachesScreen} />
          <Stack.Screen name="AthleteSearch" component={AthleteSearchScreen} />
          <Stack.Screen name="CoachDirectory" component={CoachDirectoryScreen} />
          <Stack.Screen name="ScoutTrends" component={ScoutTrendsScreen} />
          <Stack.Screen name="CampDiscovery" component={CampDiscoveryScreen} />
          <Stack.Screen name="CoachSearch" component={CoachSearchScreen} />
          <Stack.Screen name="NILAdvisor" component={NILAdvisorScreen} />
          <Stack.Screen name="PodcastLibrary" component={PodcastLibraryScreen} />
          <Stack.Screen name="PodcastEpisodeDetail" component={PodcastEpisodeDetailScreen} />
          <Stack.Screen name="NewsAndLearn" component={NewsAndLearnScreen} />
          <Stack.Screen name="SavedCamps" component={SavedCampsScreen} />
          <Stack.Screen name="ReferralTracking" component={ReferralTrackingScreen} />
          <Stack.Screen name="InfluencerBoard" component={InfluencerBoardScreen} />
          <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
        </>
      )}
    </Stack.Navigator>
    {/* Authenticated-only floating AI coach — never rendered for signed-out users. */}
    {user ? <FloatingAICoach /> : null}
    </>
  );
}
