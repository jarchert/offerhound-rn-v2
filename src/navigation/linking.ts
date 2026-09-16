// linking.ts — React Navigation deep-link config per Part 2 §2.1
// Universal Links: https://playbook-promoter.lovable.app/* and https://offerhound.app/*
// Custom scheme: offerhoundv2://
// Route coverage: 122 paths from Lovable app.
import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

export const linking: LinkingOptions<any> = {
  prefixes: [
    Linking.createURL('/'),
    'offerhoundv2://',
    'https://offerhound.app',
    'https://www.offerhound.app',
    'https://playbook-promoter.lovable.app',
  ],
  config: {
    // Root-level stacks dispatched by RootNavigator based on auth + role
    screens: {
      // Public / unauthenticated
      PublicTabs: {
        screens: {
          LandingTab: '',
          DiscoverTab: 'discover',
          PodcastsTab: 'podcasts',
          AccountTab: 'account',
        },
      },

      // 13 discrete sport landing routes (deep-link parity with Lovable)
      PublicSportStack: {
        screens: {
          SportLanding_football: 'football',
          SportLanding_basketball: 'basketball',
          SportLanding_soccer: 'soccer',
          SportLanding_baseball: 'baseball',
          SportLanding_softball: 'softball',
          SportLanding_volleyball: 'volleyball',
          SportLanding_lacrosse: 'lacrosse',
          SportLanding_hockey: 'hockey',
          SportLanding_swimming: 'swimming',
          SportLanding_golf: 'golf',
          SportLanding_trackfield: 'track-field',
          SportLanding_cheerleading: 'cheerleading',
          SportLanding_wrestling: 'wrestling',
        },
      },

      // Auth stack
      AuthStack: {
        screens: {
          Landing: 'landing',
          SignIn: 'signin',
          SignUp: 'signup',
          BetaRegister: 'beta-register',
          ParentalConsent: 'parental-consent',
          RosterTransferConsent: 'roster-transfer-consent',
          VisibilityDecision: 'visibility-decision/:proposalId',
          DeleteAccount: 'delete-account',
          PasswordReset: 'reset-password',
        },
      },

      // Onboarding (11 flows)
      OnboardingStack: {
        screens: {
          Onboarding: 'onboarding',
          CoachOnboarding: 'coach-onboarding',
          ScoutOnboarding: 'scout-onboarding',
          InfluencerOnboarding: 'influencer-onboarding',
          QuickStartSelect: 'quick-start',
          QuickStartCoach: 'quick-start/coach',
          QuickStartScout: 'quick-start/scout',
          QuickStartOrganization: 'quick-start/organization',
          QuickStartAthlete: 'quick-start/athlete',
        },
      },

      // Camp ecosystem (shared across roles)
      // Note: the bare 'camps' path is intentionally NOT registered here. It is
      // claimed by the top-level SavedCamps screen below, matching Lovable MAIN
      // (src/components/AnimatedRoutes.tsx line 171: `<Route path="/camps"
      // element={<SavedCamps />} />`) and MAIN's global Navbar link. Camp browse
      // is reached via 'camps/discover' (CampsDiscover) which is the alt path
      // MAIN redirects to its /camp-discovery page.
      CampStack: {
        screens: {
          CampsList: 'camps/list',
          CampsDiscover: 'camps/discover',
          ClaimCampSpot: 'camps/claim',
          CampDetail: 'camps/:campId',
          CampLeaderboard: 'camps/:campId/leaderboard',
          CampDeliverables: 'camps/:campId/enrollments/:enrollmentId/deliverables',
          CampSpectator: 'camp/spectator/:token',
          CampStaffCheckin: 'camp/staff-checkin/:token',
          CampMobileCheckin: 'coach/camps/:campId/checkin',
          CampEvaluatorScoring: 'coach/camps/:campId/evaluate',
          CampLeaderboardEmbed: 'embed/leaderboard/:campId',
          UnsubscribeCampAlerts: 'unsubscribe/camp-alerts',
          // Legacy alias for the stale /camps/unsubscribe URL used before
          // MAIN moved to /unsubscribe/camp-alerts. Without this, the bare
          // path falls through to CampDetail's 'camps/:campId' param
          // pattern and tries to load a camp with id='unsubscribe'.
          // Silent recovery: same UnsubscribeCampAlertsScreen component.
          UnsubscribeCampAlertsLegacy: 'camps/unsubscribe',
        },
      },

      // Settings
      // Note: DeleteAccount is NOT registered here as 'settings/delete-account'.
      // MAIN serves this at unprefixed /delete-account (live-confirmed line 283),
      // and the same DeleteAccountScreen component is already reachable via
      // AuthStack.DeleteAccount -> 'delete-account'. Registering it here too
      // would create a duplicate pattern. In-app navigation from Settings uses
      // screen name jumps (nav.navigate('DeleteAccount')), which don't need a
      // URL registration to work.
      SettingsStack: {
        screens: {
          Settings: 'settings',
          NotificationSettings: 'settings/notifications',
          FollowingSettings: 'settings/following',
          CookieSettings: 'settings/privacy',
        },
      },

      // Public profile share targets
      PublicProfileStack: {
        screens: {
          PublicProfile: 'p/:customUrl',
          AthleteProfileByUrl: 'athlete/:customUrl',
          ProfileLegacy: 'profile/:customUrl',
          PublicScoutProfile: 'scouts/:scoutId',
          PublicHSCoachProfile: 'hs-coach/:hsCoachId',
          PublicAgencyProfile: 'agency/:agencyId',
          InfluencerProfile: 'influencers/:handle',
          InfluencerBlogPost: 'influencers/:handle/blog/:slug',
          InviteShareCard: 'invite/share-card',
        },
      },

      // Athlete role tabs
      AthleteTabs: {
        screens: {
          HomeTab: 'athlete',
          MatchesTab: 'athlete/matches',
          MessagesTab: 'athlete/messages',
          LettersTab: 'athlete/letters',
          ProfileTab: 'athlete/profile',
        },
      },

      // Coach role tabs
      CoachTabs: {
        screens: {
          DashboardTab: 'coach',
          PipelineTab: 'coach/pipeline',
          CampsTab: 'coach/camps',
          LettersTab: 'coach/letters',
          DirectoryTab: 'coach/directory',
        },
      },

      // Scout role tabs
      // Note: 'scout/trends' is intentionally NOT registered here. TrendsTab
      // was dropped from the ScoutTabs navigator in Build 25 (see
      // src/navigation/role/ScoutTabs.tsx). The path is owned by the top-level
      // ScoutTrends screen below, matching Lovable MAIN
      // (src/components/AnimatedRoutes.tsx line 196: `<Route path="/scout/trends"
      // element={<ScoutTrends />} />`).
      ScoutTabs: {
        screens: {
          DashboardTab: 'scout',
          LettersTab: 'scout/letters',
          OnboardingTab: 'scout/guide',
        },
      },

      // Club coach role tabs
      ClubCoachTabs: {
        screens: {
          DashboardTab: 'club-coach',
          CampsTab: 'club-coach/camps',
          LettersTab: 'club-coach/letters',
        },
      },

      // HS coach role tabs
      HSCoachTabs: {
        screens: {
          DashboardTab: 'hs-coach',
          LettersTab: 'hs-coach/letters',
        },
      },

      // Parent role tabs
      ParentTabs: {
        screens: {
          DashboardTab: 'parent',
          TrustSafetyTab: 'parent/safety',
        },
      },

      // Influencer role tabs
      InfluencerTabs: {
        screens: {
          DashboardTab: 'influencer',
          BoardTab: 'influencer/board',
          PodcastsTab: 'influencer/podcasts',
        },
      },

      // Agency role tabs (NEW in Session 2)
      AgencyTabs: {
        screens: {
          DashboardTab: 'agency',
          LettersTab: 'agency/letters',
        },
      },

      // Admin tabs
      AdminTabs: {
        screens: {
          OverviewTab: 'admin',
          UsersTab: 'admin/users',
          ModerationTab: 'admin/moderation',
          ContentTab: 'admin/content',
          AuditTab: 'admin/audit',
          LettersAnalyticsTab: 'admin/letter-analytics',
          SocialTab: 'admin/social',
          BetaTab: 'admin/beta',
          SettingsTab: 'admin/settings',
        },
      },

      // Cross-cutting public screens
      Install: 'install',
      FounderMessage: 'founder-message',
      LeaveReview: 'leave-review',
      CoachSearchScreen: 'coach-search',
      ScoutDirectory: 'scouts',
      SavedCamps: 'camps',
      AthleteSearch: 'athletes',
      InfluencerBoard: 'influencers',
      CoachDirectory: 'coaches',
      CoachProfile: 'coaches/:id',
      PublicClubCoachProfile: 'club-coach/:id',
      SavedCoaches: 'saved-coaches',
      Referrals: 'referrals',
      PodcastEpisodeDetail: 'podcasts/:id',
      ScoutTrends: 'scout/trends',
      Pricing: 'pricing',
      SubscriptionSuccess: 'subscription/success',

      // Fallback not-found (optional; RN v7 supports this)
      NotFound: '*',

      // Minor-safe parent profile creation — token from invite email
      // Matches MAIN's /minor-invite/:token route.
      MinorInvite: 'minor-invite/:token',
    },
  },
};
