// Lovable asset map — maps the SportType ids to the require()d image modules
// in /home/ubuntu/.openclaw/workspace/offerhound-v2/app/assets/lovable/.
// Keep this as the single source of truth; every landing component imports from here.
import type { SportType } from '@/lib/data/sports';

export const SPORT_HERO_IMAGES: Record<SportType, any> = {
  football: require('../../assets/lovable/bg-hero-football.jpg'),
  basketball: require('../../assets/lovable/bg-hero-basketball.jpg'),
  'track-field': require('../../assets/lovable/bg-hero-track.jpg'),
  soccer: require('../../assets/lovable/bg-hero-soccer.jpg'),
  baseball: require('../../assets/lovable/bg-hero-baseball.jpg'),
  lacrosse: require('../../assets/lovable/bg-hero-lacrosse.jpg'),
  golf: require('../../assets/lovable/bg-hero-golf.jpg'),
  volleyball: require('../../assets/lovable/bg-hero-volleyball.jpg'),
  swimming: require('../../assets/lovable/bg-hero-swimming.jpg'),
  softball: require('../../assets/lovable/bg-hero-softball.jpg'),
  hockey: require('../../assets/lovable/bg-hero-hockey.jpg'),
  cheerleading: require('../../assets/lovable/bg-hero-cheerleading.jpg'),
  wrestling: require('../../assets/lovable/bg-hero-wrestling.jpg'),
};

export const BG_HERO_ATHLETE = require('../../assets/lovable/bg-hero-athlete.jpg');
export const BG_COACH_SCOUT = require('../../assets/lovable/bg-coach-scout.jpg');
export const BG_HOW_IT_WORKS = require('../../assets/lovable/bg-how-it-works.jpg');
export const BG_WHY_OFFERHOUND = require('../../assets/lovable/bg-why-offerhound.jpg');
export const BG_TESTIMONIALS = require('../../assets/lovable/bg-testimonials.jpg');
export const BG_CTA_SECTION = require('../../assets/lovable/bg-cta-section.jpg');
export const BG_CTA_WRESTLING = require('../../assets/lovable/bg-cta-wrestling.jpg');
export const BG_FEATURES_TRAINING = require('../../assets/lovable/bg-features-training.jpg');
export const BG_SCREENSHOTS = require('../../assets/lovable/bg-screenshots.jpg');

export const LOGO_FULL = require('../../assets/lovable/offerhound-logo-full.png');
export const LOGO_TEXT = require('../../assets/lovable/offerhound-logo-text.png');
export const FOUNDER_PHOTO = require('../../assets/lovable/archer-thomas-founder.jpg');
export const COACH_AVATAR = require('../../assets/lovable/coach-avatar.webp');
export const ATHLETE_PROFILE_IMG = require('../../assets/lovable/athlete-profile.png');
export const ATHLETE_ACTION_IMG = require('../../assets/lovable/athlete-action.png');
export const MARCUS_JOHNSON_HERO = require('../../assets/lovable/marcus-johnson-hero.png');

export const SCREENSHOT_COACH_SEARCH = require('../../assets/lovable/screenshot-coach-search.png');
export const SCREENSHOT_LETTER_WRITING = require('../../assets/lovable/screenshot-letter-writing.png');
export const SCREENSHOT_TRANSFER_PORTAL = require('../../assets/lovable/screenshot-transfer-portal.png');

export const SPORT_CTA_IMAGES: Record<SportType, any> = {
  football: BG_CTA_SECTION,
  basketball: SPORT_HERO_IMAGES.basketball,
  'track-field': SPORT_HERO_IMAGES['track-field'],
  soccer: SPORT_HERO_IMAGES.soccer,
  baseball: SPORT_HERO_IMAGES.baseball,
  lacrosse: SPORT_HERO_IMAGES.lacrosse,
  golf: SPORT_HERO_IMAGES.golf,
  volleyball: SPORT_HERO_IMAGES.volleyball,
  swimming: SPORT_HERO_IMAGES.swimming,
  softball: SPORT_HERO_IMAGES.softball,
  hockey: SPORT_HERO_IMAGES.hockey,
  cheerleading: SPORT_HERO_IMAGES.cheerleading,
  wrestling: BG_CTA_WRESTLING,
};
