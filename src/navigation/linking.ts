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
          CampDiscovery: 'camps',
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
      ScoutTabs: {
        screens: {
          DashboardTab: 'scout',
          LettersTab: 'scout/letters',
          TrendsTab: 'scout/trends',
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
          SettingsTab: 'admin/settings',
        },
      },

      // Cross-cutting public screens
      Install: 'install',
      FounderMessage: 'founder',
      LeaveReview: 'leave-review',
      CoachSearchScreen: 'coach-search',
      PodcastEpisodeDetail: 'podcasts/:id',
      ScoutTrends: 'scout/trends',
      Pricing: 'pricing',
      SubscriptionSuccess: 'subscription-success',

      // Fallback not-found (optional; RN v7 supports this)
      NotFound: '*',
    },
  },
};
