import {takePendingProfileJourney,clearPendingProfileJourney} from '@/lib/pendingProfileJourney';
import GuardianInvitationScreen from '@/screens/shared/GuardianInvitationScreen';
import {pendingGuardianInvitation} from '@/lib/guardianInvitation';
import ClubInvitationScreen from '@/screens/shared/ClubInvitationScreen';
import {pendingClubInvitation} from '@/lib/clubInvitation';
import DirectMessageDraftScreen from '@/screens/shared/DirectMessageDraftScreen';
import type {DirectMessageTarget} from '@/lib/directMessageDraft';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {HomeNavigationProvider,HomeNavigationBar} from '@/navigation/HomeNavigation';
import { clearPendingCampJourney, takePendingCampJourney } from '@/lib/pendingCampJourney';
import LegalStack from '@/navigation/stacks/LegalStack';
import WebCompanionScreen from '@/screens/shared/WebCompanionScreen';
import RoleLandingScreen from '@/screens/shared/RoleLandingScreen';
import CoachMatchesScreen from '@/screens/coach/CoachAthleteMatchesScreen';
import ParentTrustSafetyScreen from '@/screens/parent/ParentTrustSafetyScreen';
import NewsAndLearnScreen from '@/screens/shared/NewsAndLearnScreen';
// RootNavigator — post-Session 2 rewrite per Part 2 §2.1
// NO NavigationContainer here (App.tsx owns it). This is the root Stack that
// branches on auth + role and exposes 9 role navigators + 7 shared stacks.
import React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { navigationRef } from '@/navigation/navigationRef';
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
import NILAdvisorScreen from '@/screens/athlete/NILAdvisorScreen';
import SupportScreen from '@/screens/shared/SupportScreen';
import NotFoundScreen from '@/screens/shared/NotFoundScreen';
import CoachCampaignsScreen from '@/screens/coach/CoachCampaignsScreen';
import CoachCommunicationRulesScreen from '@/screens/coach/CoachCommunicationRulesScreen';
import AthleteProfileEditScreen from '@/screens/athlete/AthleteProfileEditScreen';
import InfluencerBlogComposerScreen from '@/screens/influencer/InfluencerBlogComposerScreen';

// Persistent post-auth overlay
import FloatingAICoach from '@/components/FloatingAICoach';

export type RootStackParamList = {
  PublicTabs: undefined;
  LegalStack: undefined;
  RoleLanding: undefined;
  CoachMatches: undefined;
  ParentTrustSafety: undefined;
  NewsAndLearn: undefined;
  WebMarketingCenter: Record<string,string> | undefined;
  WebAdminOnboarding: Record<string,string> | undefined;
  WebOptoutAudit: Record<string,string> | undefined;
  WebTestPasswords: Record<string,string> | undefined;
  WebHSCoachProfile: Record<string,string> | undefined;
  WebAgencyProfile: Record<string,string> | undefined;
  WebSportSample: Record<string,string> | undefined;
  WebSportSampleGallery: Record<string,string> | undefined;
  WebSmsTerms: Record<string,string> | undefined;
  WebAISlides: Record<string,string> | undefined;
  WebAthleteSlides: Record<string,string> | undefined;
  WebAthleteProfileSlides: Record<string,string> | undefined;
  WebCoachSlides: Record<string,string> | undefined;
  WebAdminInfluencers: Record<string,string> | undefined;
  WebAdminPodcasts: Record<string,string> | undefined;
  WebAdminMedia: Record<string,string> | undefined;
  WebChartSmoke: Record<string,string> | undefined;
  WebChartArtifacts: Record<string,string> | undefined;
  WebLetterAnalytics: Record<string,string> | undefined;
  WebMarketingRender: Record<string,string> | undefined;
  WebConsent: Record<string,string> | undefined;
  WebMinorInvite: Record<string,string> | undefined;
  WebRosterConsent: Record<string,string> | undefined;
  WebFootballHub: Record<string,string> | undefined;

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
  Messages: { conversationId?: string } | undefined;
  DirectMessageDraft: DirectMessageTarget;
  ClubInvitation: undefined;
  GuardianInvitation: undefined;
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
  NILAdvisor: undefined;
  Support: undefined;
  CoachCampaigns: undefined;
  CoachCommunicationRules: undefined;
  AthleteProfileEdit: undefined;
  InfluencerBlogComposer: { postId?: string } | undefined;
  NotFound: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Map the resolved user role to the initial role-specific tab navigator name.
 * Default = athlete (the largest role). Unknown roles fall back to PublicTabs.
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

export default function RootNavigator() {
  const { user, userRole, isLoading, signOut } = useAuth() as any;
  const previousUserId = React.useRef<string | null>(user?.id ?? null);
  React.useEffect(() => {
    const endedSession = previousUserId.current !== null && !user;
    previousUserId.current = user?.id ?? null;
    // Camp routes are available in both auth states. Explicitly discard the
    // old shared route after the signed-out screen graph has committed.
    if(endedSession){clearPendingCampJourney();clearPendingProfileJourney();}
    if (endedSession && navigationRef.isReady()) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'PublicTabs' }] });
    }
  }, [user?.id]);


  // Agency detection: if user is a scout AND owns or belongs to a scout_organization,
  // route them to AgencyTabs instead of ScoutTabs. Mirrors Lovable Navbar.tsx logic.
  const scoutOrganization = useScoutOrganization();
  const scoutOrg = scoutOrganization.data;
  const isAgency = userRole === 'scout' && !!scoutOrg && ((scoutOrg as any).isOwner || (scoutOrg as any).isMember);
  React.useEffect(()=>{
    if(!user||!userRole||isLoading||(userRole==='scout'&&(scoutOrganization.isPending||scoutOrganization.isError)))return;
    const timer=setTimeout(()=>{if(!navigationRef.isReady())return;if(pendingGuardianInvitation()){(navigationRef.navigate as any)('GuardianInvitation');return;}if(pendingClubInvitation()){(navigationRef.navigate as any)('ClubInvitation');return;}const profileDestination=takePendingProfileJourney();if(profileDestination){(navigationRef.navigate as any)(profileDestination.name,profileDestination.params);return;}const destination=takePendingCampJourney();if(destination)(navigationRef.navigate as any)('CampStack',destination);},0);
    return()=>clearTimeout(timer);
  },[user?.id,userRole,isLoading,scoutOrganization.isPending,scoutOrganization.isError,isAgency]);


  // Session restoration can complete before the asynchronous role lookup.
  if (isLoading || (user && !userRole)) return null;

  // A scout's organization determines which navigator must mount first. Changing
  // initialRouteName after a navigator has mounted does not reliably replace the
  // NavigationContainer state on both platforms.
  if (user && userRole === 'scout' && (scoutOrganization.isPending || scoutOrganization.isError)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
          {scoutOrganization.isError ? (
            <>
              <Text style={{ color: colors.foreground, textAlign: 'center' }}>Could not load your organization.</Text>
              <Pressable accessibilityRole="button" onPress={() => { void scoutOrganization.refetch(); }} style={{ padding: 16 }}>
                <Text style={{ color: colors.primary }}>Retry</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { void signOut(); }} style={{ padding: 16 }}>
                <Text style={{ color: colors.foreground }}>Sign out</Text>
              </Pressable>
            </>
          ) : <ActivityIndicator accessibilityLabel="Loading organization" color={colors.primary} />}
        </View>
      </SafeAreaView>
    );
  }

  // Resolve the initial route. With the new fetchUserRole resolver, userRole is
  // always set for authenticated users (defaults to 'athlete' on error). The old
  // OnboardingStack-on-null path was the source of the role-picker bug.
  const effectiveRole: UserRole | null | undefined = isAgency
    ? ('agency' as UserRole)
    : (userRole as UserRole | null | undefined);

  const initialRouteName = !user
    ? ('PublicTabs' as keyof RootStackParamList)
    : roleToInitialRoute(effectiveRole);

  return (
    <HomeNavigationProvider route={initialRouteName}>
    <View style={{flex:1}}>
    <HomeNavigationBar authenticated={!!user}/>
    <SafeAreaProvider style={{flex:1}}>
    <Stack.Navigator
      key={`${user?.id ?? 'public'}:${initialRouteName}`}
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="CoachProfile" component={CoachProfileScreen} />
      <Stack.Screen name="PublicClubCoachProfile" component={PublicClubCoachProfileScreen} />
      <Stack.Screen name="GuardianInvitation" component={GuardianInvitationScreen} />
      <Stack.Screen name="ClubInvitation" component={ClubInvitationScreen} />
      {!user ? (
        <>
          <Stack.Screen name="PublicTabs" component={PublicTabs} />
          <Stack.Screen name="PublicSportStack" component={PublicSportStack} />
          <Stack.Screen name="AuthStack" component={AuthStack} />
          <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
          <Stack.Screen name="PublicProfileStack" component={PublicProfileStack} />
          <Stack.Screen name="CampStack" component={CampStack} navigationKey="public-camps" />
          <Stack.Screen name="Install" component={InstallScreen} />
          <Stack.Screen name="FounderMessage" component={FounderMessageScreen} />
          <Stack.Screen name="Pricing" component={PricingScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="CoachCommunicationRules" component={CoachCommunicationRulesScreen} />
          <Stack.Screen name="NotFound" component={NotFoundScreen} />
        </>
      ) : (
        <>
          {/* Role-specific navigators — the initialRouteName picks one */}
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
          <Stack.Screen name="CampStack" component={CampStack} navigationKey={`staff-camps:${user.id}`} />
          <Stack.Screen name="SettingsStack" component={SettingsStack} />
          <Stack.Screen name="PublicProfileStack" component={PublicProfileStack} />
          <Stack.Screen name="PublicSportStack" component={PublicSportStack} />

          {/* Cross-cutting modals / shared screens */}
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
          <Stack.Screen name="DirectMessageDraft" component={DirectMessageDraftScreen} />
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
          <Stack.Screen name="NILAdvisor" component={NILAdvisorScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="CoachCampaigns" component={CoachCampaignsScreen} />
          <Stack.Screen name="CoachCommunicationRules" component={CoachCommunicationRulesScreen} />
          <Stack.Screen name="AthleteProfileEdit" component={AthleteProfileEditScreen} />
          <Stack.Screen
            name="InfluencerBlogComposer"
            component={InfluencerBlogComposerScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="NotFound" component={NotFoundScreen} />
        </>
      )}
      <Stack.Screen name="LegalStack" component={LegalStack} />
      <Stack.Screen name="RoleLanding" component={RoleLandingScreen} />
      <Stack.Screen name="CoachMatches" component={CoachMatchesScreen} />
      <Stack.Screen name="ParentTrustSafety" component={ParentTrustSafetyScreen} />
      <Stack.Screen name="NewsAndLearn" component={NewsAndLearnScreen} />
      <Stack.Screen name="WebMarketingCenter" component={WebCompanionScreen} />
      <Stack.Screen name="WebAdminOnboarding" component={WebCompanionScreen} />
      <Stack.Screen name="WebOptoutAudit" component={WebCompanionScreen} />
      <Stack.Screen name="WebTestPasswords" component={WebCompanionScreen} />
      <Stack.Screen name="WebHSCoachProfile" component={WebCompanionScreen} />
      <Stack.Screen name="WebAgencyProfile" component={WebCompanionScreen} />
      <Stack.Screen name="WebSportSample" component={WebCompanionScreen} />
      <Stack.Screen name="WebSportSampleGallery" component={WebCompanionScreen} />
      <Stack.Screen name="WebSmsTerms" component={WebCompanionScreen} />
      <Stack.Screen name="WebAISlides" component={WebCompanionScreen} />
      <Stack.Screen name="WebAthleteSlides" component={WebCompanionScreen} />
      <Stack.Screen name="WebAthleteProfileSlides" component={WebCompanionScreen} />
      <Stack.Screen name="WebCoachSlides" component={WebCompanionScreen} />
      <Stack.Screen name="WebAdminInfluencers" component={WebCompanionScreen} />
      <Stack.Screen name="WebAdminPodcasts" component={WebCompanionScreen} />
      <Stack.Screen name="WebAdminMedia" component={WebCompanionScreen} />
      <Stack.Screen name="WebChartSmoke" component={WebCompanionScreen} />
      <Stack.Screen name="WebChartArtifacts" component={WebCompanionScreen} />
      <Stack.Screen name="WebLetterAnalytics" component={WebCompanionScreen} />
      <Stack.Screen name="WebMarketingRender" component={WebCompanionScreen} />
      <Stack.Screen name="WebConsent" component={WebCompanionScreen} />
      <Stack.Screen name="WebMinorInvite" component={WebCompanionScreen} />
      <Stack.Screen name="WebRosterConsent" component={WebCompanionScreen} />
      <Stack.Screen name="WebFootballHub" component={WebCompanionScreen} />
    </Stack.Navigator>
    </SafeAreaProvider>
    {/* Authenticated-only floating AI coach — never rendered for signed-out users. */}
    {user ? <FloatingAICoach /> : null}
    </View>
    </HomeNavigationProvider>
  );
}
