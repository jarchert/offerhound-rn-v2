import { isNativeOAuthCallback } from '@/lib/nativeOAuth';
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
  // AuthContext owns OAuth code exchange, including cold and warm callbacks.
  filter: url => !isNativeOAuthCallback(url),
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
          SportLanding_trackfield: { path: 'track-field', alias: ['track'] },
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
          CoachOnboarding: { path: 'coach-onboarding', alias: ['coach/onboarding'] },
          ScoutOnboarding: 'scout-onboarding',
          InfluencerOnboarding: { path: 'influencer-onboarding', alias: ['influencers/onboarding'] },
          QuickStartSelect: { path: 'quick-start', alias: ['register'] },
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
          CampDeliverables: { path: 'camps/:campId/deliverables/:enrollmentId', alias: ['camps/:campId/enrollments/:enrollmentId/deliverables'] },
          CampSpectator: { path: 'spectator/:token', alias: ['camp/spectator/:token'] },
          CampStaffCheckin: { path: 'staff-checkin/:token', alias: ['camp/staff-checkin/:token'] },
          CampMobileCheckin: { path: 'camps/:campId/mobile-checkin', alias: ['coach/camps/:campId/checkin'] },
          CampEvaluatorScoring: { path: 'camps/:campId/score', alias: ['coach/camps/:campId/evaluate'] },
          CampLeaderboardEmbed: { path: 'camps/:campId/leaderboard-embed', alias: ['embed/leaderboard/:campId'] },
          UnsubscribeCampAlerts: { path: 'camps/unsubscribe', alias: ['unsubscribe/camp-alerts'] },
        },
      },

      // Settings
      SettingsStack: {
        screens: {
          Settings: 'settings',
          AccountSettings: 'account-settings',
          OrganizationSettings: 'organization/settings',
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
          AthleteProfileByUrl: { path: 'a/:customUrl', alias: ['athlete/:customUrl'] },
          ProfileLegacy: 'profile/:customUrl',
          PublicScoutProfile: { path: 'scout/:scoutId', alias: ['scouts/:scoutId'] },
          InfluencerProfile: { path: 'influencer/:handle', alias: ['influencers/:handle'] },
          InfluencerBlogPost: { path: 'influencer/:handle/blog/:slug', alias: ['influencers/:handle/blog/:slug'] },
          InviteShareCard: { path: 'invite', alias: ['invite/share-card'] },
          Gallery: 'gallery',
          SampleAthlete: 'sample-athlete',
          SampleAthleteGallery: 'sample-athlete/gallery',
          PublicClubDiscovery: {path:'discover/clubs',alias:['discover/teams']},
          ContactActivity: 'activity',
          SubmitTestimonial: 'testimonial',
          SubmitReference: 'reference/:token',
        },
      },

      // Athlete role tabs
      AthleteTabs: {
        screens: {
          HomeTab: { path: 'athlete', alias: ['home'] },
          MatchesTab: {path:'athlete/matches',alias:['matches']},
          MessagesTab: 'athlete/messages',
          LettersTab: {path:'athlete/letters',alias:['letters']},
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
        },
      },

      // Scout role tabs
      ScoutTabs: {
        screens: {
          DashboardTab: { path: 'scout', alias: ['scout/dashboard'] },
          LettersTab: 'scout/letters',
        },
      },

      // Club coach role tabs
      ClubCoachTabs: {
        screens: {
          DashboardTab: { path: 'club-coach', alias: ['club/dashboard'] },
          CampsTab: {path:'club-coach/camps',alias:['club/camps']},
          LettersTab: {path:'club-coach/letters',alias:['club/letters']},
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
      Messages: 'messages',
      Inbox: {path:'inbox',alias:['notifications']},
      Install: 'install',
      FounderMessage: 'founder-message',
      LeaveReview: 'leave-review',
      CoachSearchScreen: 'coach-search',
      ScoutDirectory: 'scouts',
      SavedCamps: 'camps',
      AthleteSearch: 'athletes',
      InfluencerBoard: 'influencers',
      CoachDirectory: { path: 'coaches', alias: ['coach/directory', 'coach-directory'] },
      CoachProfile: 'coaches/:id',
      PublicClubCoachProfile: 'club-coach/:id',
      SavedCoaches: 'saved-coaches',
      Referrals: 'referrals',
      PodcastEpisodeDetail: 'podcasts/:id',
      ScoutTrends: 'scout/trends',
      Pricing: 'pricing',
      SubscriptionSuccess: 'subscription/success',
      Support: 'support',
      CoachCommunicationRules: 'coach-communication-rules',
      NILIntelligence: 'nil-intelligence',
      CoachCampaigns: 'coach/campaigns',
      CoachMatches: 'coach/matches',
      ParentTrustSafety: 'parent-trust-safety',
      NewsAndLearn: {path:'news-learn',alias:['news-and-learn']},
      RoleLanding: 'dashboard',
      LegalStack: {screens:{PrivacyPolicy:'privacy',TermsOfUse:'terms',CCPARights:'ccpa',CookiesPolicy:'cookies',CommunityGuidelines:'community-guidelines',Accessibility:'accessibility'}},

      WebMarketingCenter: '/admin/marketing-center',
      WebAdminOnboarding: '/admin/onboarding',
      WebOptoutAudit: '/admin/optout-audit',
      WebTestPasswords: '/admin/test-passwords',
      WebHSCoachProfile: '/hs-coach/:id',
      WebAgencyProfile: '/agency/:id',
      WebSportSample: '/sample-athlete/:sport',
      WebSportSampleGallery: '/sample-athlete/:sport/gallery',
      WebSmsTerms: '/sms-terms',
      WebAISlides: '/ai-experience-slides',
      WebAthleteSlides: '/athlete-experience-slides',
      WebAthleteProfileSlides: '/athlete-profile-slides',
      WebCoachSlides: '/coach-experience-slides',
      WebAdminInfluencers: '/admin/influencers',
      WebAdminPodcasts: '/admin/podcasts',
      WebAdminMedia: '/admin/media-center',
      WebChartSmoke: '/__rechart-smoke',
      WebChartArtifacts: '/admin/recharts-artifacts',
      WebLetterAnalytics: '/admin/letter-analytics',
      WebMarketingRender: '/marketing-render/cards',
      WebConsent: '/consent/:token',
      WebMinorInvite: '/minor-invite/:token',
      WebRosterConsent: '/roster-consent/:token',
      WebFootballHub: '/athlete/football-hub',

      // Fallback not-found (optional; RN v7 supports this)
      NotFound: { path: '*', alias: ['scout/guide'] },
    },
  },
};
