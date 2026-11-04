// linking.ts — React Navigation deep-link config per Part 2 §2.1
// Universal Links include the canonical OfferHound web domain.
// Custom scheme: offerhoundv2://
// Coverage is recorded by the separate URL audit; parser matches do not certify screen parity.
import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

export const linking: LinkingOptions<any> = {
  prefixes: [
    Linking.createURL('/'),
    'offerhoundv2://',
    'https://offer-hound.com',
    'https://www.offer-hound.com',
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
          SignIn: { path: 'signin', alias: ['auth'] },
          SignUp: 'signup',
          BetaRegister: 'beta-register',
          ParentalConsent: 'parental-consent',
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
      CampStack: {
        screens: {
          CampDiscovery: 'camp-discovery',
          CampsList: 'camps/list',
          CampsDiscover: 'camps/discover',
          ClaimCampSpot: 'camps/claim',
          CampDetail: 'camps/:campId',
          CampLeaderboard: 'camps/:campId/leaderboard',
          CampDeliverables: 'camps/:campId/deliverables/:enrollmentId',
          CampSpectator: 'spectator/:token',
          CampStaffCheckin: 'staff-checkin/:token',
          CampMobileCheckin: 'camps/:campId/mobile-checkin',
          CampEvaluatorScoring: 'camps/:campId/score',
          CampLeaderboardEmbed: 'camps/:campId/leaderboard-embed',
          UnsubscribeCampAlerts: 'camps/unsubscribe',
        },
      },

      // Settings
      SettingsStack: {
        screens: {
          Settings: 'settings',
          NotificationSettings: 'settings/notifications',
          FollowingSettings: 'settings/following',
          CookieSettings: 'settings/privacy',
          DeleteAccount: 'settings/delete-account',
        },
      },

      // Public profile share targets
      PublicProfileStack: {
        screens: {
          PublicProfile: 'p/:customUrl',
          AthleteProfileByUrl: 'a/:customUrl',
          ProfileLegacy: 'profile/:customUrl',
          PublicScoutProfile: 'scout/:scoutId',
          InfluencerProfile: 'influencer/:handle',
          InfluencerBlogPost: 'influencer/:handle/blog/:slug',
          InviteShareCard: 'invite',
        },
      },

      // Athlete role tabs
      AthleteTabs: {
        screens: {
          HomeTab: { path: 'athlete', alias: ['home'] },
          MatchesTab: 'athlete/matches',
          MessagesTab: { path: 'athlete/messages', alias: ['messages', 'inbox'] },
          LettersTab: 'athlete/letters',
          ProfileTab: 'athlete/profile',
        },
      },

      // Coach role tabs
      CoachTabs: {
        screens: {
          DashboardTab: { path: 'coach', alias: ['coach/dashboard'] },
          PipelineTab: 'coach/pipeline',
          CampsTab: 'coach/camps',
          LettersTab: 'coach/letters',
          DirectoryTab: 'coach/directory',
        },
      },

      // Scout role tabs
      ScoutTabs: {
        screens: {
          DashboardTab: { path: 'scout', alias: ['scout/dashboard'] },
          LettersTab: 'scout/letters',
          TrendsTab: 'scout/trends',
          OnboardingTab: 'scout/guide',
        },
      },

      // Club coach role tabs
      ClubCoachTabs: {
        screens: {
          DashboardTab: { path: 'club-coach', alias: ['club/dashboard'] },
          CampsTab: 'club-coach/camps',
          LettersTab: 'club-coach/letters',
        },
      },

      // HS coach role tabs
      HSCoachTabs: {
        screens: {
          DashboardTab: { path: 'hs-coach', alias: ['hs-coach/dashboard'] },
          LettersTab: 'hs-coach/letters',
        },
      },

      // Parent role tabs
      ParentTabs: {
        screens: {
          DashboardTab: { path: 'parent', alias: ['parent/dashboard'] },
          TrustSafetyTab: 'parent/safety',
        },
      },

      // Influencer role tabs
      InfluencerTabs: {
        screens: {
          DashboardTab: { path: 'influencer', alias: ['influencer/dashboard'] },
          BoardTab: 'influencer/board',
          PodcastsTab: 'influencer/podcasts',
        },
      },

      // Agency role tabs (NEW in Session 2)
      AgencyTabs: {
        screens: {
          DashboardTab: { path: 'agency', alias: ['agency/dashboard'] },
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
      Pricing: 'pricing',
      SubscriptionSuccess: 'subscription/success',

      // Fallback not-found (optional; RN v7 supports this)
      NotFound: '*',
    },
  },
};
