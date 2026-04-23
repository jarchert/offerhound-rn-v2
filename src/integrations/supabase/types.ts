// Auto-generated Supabase types for OfferHound
// Supabase project: abdzdcgsmdlnytkkhvtb
// Source: Lovable → React Native conversion guide (database schema chapter)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUMS
// ============================================================
export type ActivityType = 'new_post' | 'live_session' | 'camp_clinic' | 'recruiting_qa' | 'video_drop' | 'giveaway_promo' | 'athlete_spotlight' | 'announcement'
export type ActivityVisibility = 'public' | 'followers_only' | 'private'
export type AppRole = 'admin' | 'moderator' | 'user' | 'beta_tester' | 'influencer' | 'high_school_coach' | 'athlete' | 'coach' | 'scout' | 'parent' | 'club_coach' | 'agency'
export type AthleteVisibility = 'private' | 'team_only' | 'coaches_only' | 'public'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'
export type CampaignTimeline = 'immediate' | 'this_season' | 'next_season' | 'transfer_window'
export type FollowSource = 'board' | 'profile' | 'activity' | 'referral' | 'coach_onboarding' | 'other'
export type FrequencyCap = 'none' | 'daily' | 'weekly'
export type InfluencerAffiliationType = 'athlete' | 'trainer' | 'coach' | 'analyst' | 'media' | 'nil_advisor' | 'other'
export type InfluencerAudienceCategory = 'youth' | 'hs' | 'college' | 'pro' | 'all'
export type InfluencerBoardVisibility = 'eligible' | 'hidden' | 'suspended'
export type InfluencerVerificationStatus = 'unverified' | 'basic' | 'pending' | 'verified' | 'rejected'
export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'removed'
export type PlaybackEventType = 'play' | 'pause' | 'resume' | 'seek' | 'complete'
export type PodcastAudioType = 'mp3' | 'm4a' | 'wav' | 'aac'
export type PodcastSource = 'notebooklm' | 'other'
export type PodcastStatus = 'draft' | 'published' | 'archived'
export type PodcastVisibility = 'public' | 'logged_in_only' | 'coaches_only'
export type PrivacyVisibility = 'private' | 'public_opt_in'
export type SafetyDecision = 'allow' | 'queue_review' | 'block'
export type SafetyEntityType = 'influencer_profile' | 'influencer_activity' | 'social_link' | 'campaign' | 'podcast' | 'other'
export type ScholarshipContext = 'full' | 'partial' | 'pwo' | 'nil_focus' | 'unknown'
export type SocialConnectionMethod = 'url_only' | 'oauth'
export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'x' | 'youtube'
export type TriageBucket = 'immediate_eval' | 'developmental' | 'not_fit'

// ============================================================
// DATABASE TYPE
// ============================================================
export type Database = {
  public: {
    Tables: {
      player_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          position: string | null
          sport: string | null
          custom_url: string | null
          is_published: boolean
          footer_image_url: string | null
          profile_image_url: string | null
          bio: string | null
          grad_year: number | null
          height: string | null
          weight: string | null
          gpa: number | null
          hometown: string | null
          state: string | null
          high_school: string | null
          created_at: string
          updated_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['player_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['player_profiles']['Row']>
      }
      coach_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          school_name: string | null
          position_title: string | null
          sport: string | null
          division: string | null
          conference: string | null
          profile_image_url: string | null
          bio: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['coach_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['coach_profiles']['Row']>
      }
      coaches: {
        Row: {
          id: string
          name: string
          school: string | null
          position: string | null
          sport: string | null
          division: string | null
          conference: string | null
          email: string | null
          phone: string | null
          twitter: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['coaches']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['coaches']['Row']>
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          content: string
          is_read: boolean
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Row']>
      }
      conversations: {
        Row: {
          id: string
          participant_1: string
          participant_2: string
          last_message_at: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['conversations']['Row']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: string
          is_read: boolean
          data: Json | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['user_roles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_roles']['Row']>
      }
      saved_coaches: {
        Row: {
          id: string
          user_id: string
          coach_id: string
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['saved_coaches']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['saved_coaches']['Row']>
      }
      saved_athletes: {
        Row: {
          id: string
          user_id: string
          athlete_id: string
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['saved_athletes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['saved_athletes']['Row']>
      }
      athlete_coach_matches: {
        Row: {
          id: string
          athlete_id: string
          coach_id: string
          match_score: number | null
          status: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['athlete_coach_matches']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['athlete_coach_matches']['Row']>
      }
      influencer_profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string
          bio: string | null
          profile_image_url: string | null
          follower_count: number | null
          verification_status: InfluencerVerificationStatus
          affiliation_type: InfluencerAffiliationType | null
          board_visibility: InfluencerBoardVisibility
          created_at: string
          updated_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['influencer_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['influencer_profiles']['Row']>
      }
      scout_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          organization: string | null
          sport: string | null
          profile_image_url: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['scout_profiles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['scout_profiles']['Row']>
      }
      teams: {
        Row: {
          id: string
          name: string
          sport: string | null
          division: string | null
          school_name: string | null
          coach_id: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['teams']['Row']>
      }
      podcasts: {
        Row: {
          id: string
          title: string
          description: string | null
          cover_image_url: string | null
          status: PodcastStatus
          visibility: PodcastVisibility
          created_by: string
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['podcasts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['podcasts']['Row']>
      }
      podcast_episodes: {
        Row: {
          id: string
          podcast_id: string
          title: string
          description: string | null
          audio_file_url: string
          cover_image_url: string | null
          duration_seconds: number | null
          episode_number: number | null
          status: PodcastStatus
          published_at: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['podcast_episodes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['podcast_episodes']['Row']>
      }
      nil_chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['nil_chat_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['nil_chat_sessions']['Row']>
      }
      nil_chat_messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['nil_chat_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['nil_chat_messages']['Row']>
      }
      recruiting_pipeline_stages: {
        Row: {
          id: string
          user_id: string
          coach_id: string
          stage: string
          notes: string | null
          created_at: string
          updated_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['recruiting_pipeline_stages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['recruiting_pipeline_stages']['Row']>
      }
      college_camps: {
        Row: {
          id: string
          school_name: string
          sport: string | null
          camp_name: string | null
          date: string | null
          location: string | null
          cost: number | null
          registration_url: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['college_camps']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['college_camps']['Row']>
      }
      sports_news_articles: {
        Row: {
          id: string
          title: string
          body: string | null
          source: string | null
          url: string | null
          image_url: string | null
          sport: string | null
          published_at: string | null
          created_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['sports_news_articles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sports_news_articles']['Row']>
      }
      terms_acceptance: {
        Row: {
          id: string
          user_id: string
          terms_version: string
          accepted_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['terms_acceptance']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['terms_acceptance']['Row']>
      }
      cookie_preferences: {
        Row: {
          id: string
          user_id: string
          analytics: boolean
          marketing: boolean
          preferences: boolean
          created_at: string
          updated_at: string
          [key: string]: Json | undefined
        }
        Insert: Omit<Database['public']['Tables']['cookie_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cookie_preferences']['Row']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_type: ActivityType
      activity_visibility: ActivityVisibility
      app_role: AppRole
      athlete_visibility: AthleteVisibility
      campaign_status: CampaignStatus
      campaign_timeline: CampaignTimeline
      follow_source: FollowSource
      frequency_cap: FrequencyCap
      influencer_affiliation_type: InfluencerAffiliationType
      influencer_audience_category: InfluencerAudienceCategory
      influencer_board_visibility: InfluencerBoardVisibility
      influencer_verification_status: InfluencerVerificationStatus
      moderation_status: ModerationStatus
      playback_event_type: PlaybackEventType
      podcast_audio_type: PodcastAudioType
      podcast_source: PodcastSource
      podcast_status: PodcastStatus
      podcast_visibility: PodcastVisibility
      privacy_visibility: PrivacyVisibility
      safety_decision: SafetyDecision
      safety_entity_type: SafetyEntityType
      scholarship_context: ScholarshipContext
      social_connection_method: SocialConnectionMethod
      social_platform: SocialPlatform
      triage_bucket: TriageBucket
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper type aliases for common rows
export type PlayerProfile = Database['public']['Tables']['player_profiles']['Row']
export type CoachProfile = Database['public']['Tables']['coach_profiles']['Row']
export type Coach = Database['public']['Tables']['coaches']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type InfluencerProfile = Database['public']['Tables']['influencer_profiles']['Row']
export type ScoutProfile = Database['public']['Tables']['scout_profiles']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Podcast = Database['public']['Tables']['podcasts']['Row']
export type PodcastEpisode = Database['public']['Tables']['podcast_episodes']['Row']
export type CollegeCamp = Database['public']['Tables']['college_camps']['Row']
export type RecruitingPipelineStage = Database['public']['Tables']['recruiting_pipeline_stages']['Row']
