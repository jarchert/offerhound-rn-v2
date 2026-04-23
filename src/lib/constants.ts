// App constants — bundle ID updated for v2
export const APP_NAME = 'OfferHound';
export const BUNDLE_ID = 'com.emergentmindlab.offerhoundv2';
export const APPLE_TEAM_ID = '8MG7GFDJ62';
export const SUPABASE_URL = 'https://abdzdcgsmdlnytkkhvtb.supabase.co';

export const USER_ROLES = {
  ATHLETE: 'athlete',
  COACH: 'coach',
  SCOUT: 'scout',
  PARENT: 'parent',
  INFLUENCER: 'influencer',
  ADMIN: 'admin',
  CLUB_COACH: 'club_coach',
  HIGH_SCHOOL_COACH: 'high_school_coach',
  MODERATOR: 'moderator',
  AGENCY: 'agency',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const SPORTS = [
  'football', 'basketball', 'soccer', 'baseball', 'softball',
  'volleyball', 'lacrosse', 'hockey', 'golf', 'swimming',
  'track', 'cheerleading', 'wrestling',
] as const;

export type Sport = typeof SPORTS[number];
