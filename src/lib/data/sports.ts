// Sport configuration for multi-sport platform support

export type SportType = 
  | 'football'
  | 'basketball'
  | 'track-field'
  | 'soccer'
  | 'baseball'
  | 'lacrosse'
  | 'golf'
  | 'volleyball'
  | 'swimming'
  | 'softball'
  | 'hockey'
  | 'cheerleading'
  | 'wrestling';

export interface SportConfig {
  id: SportType;
  name: string;
  displayName: string;
  tagline: string;
  description: string;
  heroImage: string;
  positions: string[];
  stats: SportStat[];
  terminology: {
    whyILoveSport: string;
    highlights: string;
    gameFootage: string;
  };
  hasTransferPortal: boolean;
  hasCampsFeed: boolean;
}

export interface SportStat {
  key: string;
  label: string;
  unit?: string;
}

export const SPORTS_CONFIG: Record<SportType, SportConfig> = {
  football: {
    id: 'football',
    name: 'Football',
    displayName: 'High School Football',
    tagline: 'The Only AI Powered Platform for High School Football Recruiting',
    description: 'OfferHound connects high school football athletes directly with college coaches. Build your profile, showcase your highlights, and let coaches find YOU.',
    heroImage: '/assets/bg-hero-football.jpg',
    positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'ATH'],
    stats: [
      { key: 'fortyYard', label: '40-Yard', unit: 's' },
      { key: 'vertical', label: 'Vertical', unit: '"' },
      { key: 'benchPress', label: 'Bench', unit: ' lbs' },
      { key: 'squat', label: 'Squat', unit: ' lbs' },
      { key: 'armLength', label: 'Arm Length', unit: '"' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Football',
      highlights: 'Game Film',
      gameFootage: 'Hudl',
    },
    hasTransferPortal: true,
    hasCampsFeed: true,
  },
  basketball: {
    id: 'basketball',
    name: 'Basketball',
    displayName: 'High School Basketball',
    tagline: 'The Only AI Powered Platform for High School Basketball Recruiting',
    description: 'OfferHound connects high school basketball players directly with college coaches. Showcase your game, build your profile, and get discovered.',
    heroImage: '/assets/bg-hero-basketball.jpg',
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    stats: [
      { key: 'ppg', label: 'PPG' },
      { key: 'rpg', label: 'RPG' },
      { key: 'apg', label: 'APG' },
      { key: 'vertical', label: 'Vertical', unit: '"' },
      { key: 'wingspan', label: 'Wingspan', unit: '"' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Basketball',
      highlights: 'Game Film',
      gameFootage: 'Hudl / MaxPreps',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  'track-field': {
    id: 'track-field',
    name: 'Track & Field',
    displayName: 'High School Track & Field',
    tagline: 'The Only AI Powered Platform for High School Track & Field Recruiting',
    description: 'OfferHound connects high school track & field athletes directly with college coaches. Showcase your times, marks, and achievements.',
    heroImage: '/assets/bg-hero-track.jpg',
    positions: ['Sprints', 'Distance', 'Hurdles', 'Jumps', 'Throws', 'Multi-Event'],
    stats: [
      { key: 'event100m', label: '100m', unit: 's' },
      { key: 'event200m', label: '200m', unit: 's' },
      { key: 'event400m', label: '400m', unit: 's' },
      { key: 'longJump', label: 'Long Jump', unit: "'" },
      { key: 'highJump', label: 'High Jump', unit: "'" },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Track & Field',
      highlights: 'Meet Footage',
      gameFootage: 'MileSplit',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  soccer: {
    id: 'soccer',
    name: 'Soccer',
    displayName: 'High School Soccer',
    tagline: 'The Only AI Powered Platform for High School Soccer Recruiting',
    description: 'OfferHound connects high school soccer players directly with college coaches. Build your profile, showcase your skills, and get recruited.',
    heroImage: '/assets/bg-hero-soccer.jpg',
    positions: ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'],
    stats: [
      { key: 'goals', label: 'Goals' },
      { key: 'assists', label: 'Assists' },
      { key: 'cleanSheets', label: 'Clean Sheets' },
      { key: 'minutesPlayed', label: 'Minutes' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Soccer',
      highlights: 'Match Footage',
      gameFootage: 'Hudl / Veo',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  baseball: {
    id: 'baseball',
    name: 'Baseball',
    displayName: 'High School Baseball',
    tagline: 'The Only AI Powered Platform for High School Baseball Recruiting',
    description: 'OfferHound connects high school baseball players directly with college coaches. Showcase your stats, video, and get discovered.',
    heroImage: '/assets/bg-hero-baseball.jpg',
    positions: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'],
    stats: [
      { key: 'battingAvg', label: 'AVG' },
      { key: 'homeRuns', label: 'HR' },
      { key: 'rbi', label: 'RBI' },
      { key: 'era', label: 'ERA' },
      { key: 'fastball', label: 'Fastball', unit: ' mph' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Baseball',
      highlights: 'Game Footage',
      gameFootage: 'Perfect Game / Prep Baseball',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  lacrosse: {
    id: 'lacrosse',
    name: 'Lacrosse',
    displayName: 'High School Lacrosse',
    tagline: 'The Only AI Powered Platform for High School Lacrosse Recruiting',
    description: 'OfferHound connects high school lacrosse players directly with college coaches. Build your profile and showcase your skills.',
    heroImage: '/assets/bg-hero-lacrosse.jpg',
    positions: ['Attack', 'Midfield', 'Defense', 'Goalie', 'FOGO', 'LSM'],
    stats: [
      { key: 'goals', label: 'Goals' },
      { key: 'assists', label: 'Assists' },
      { key: 'groundBalls', label: 'Ground Balls' },
      { key: 'savePercentage', label: 'Save %' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Lacrosse',
      highlights: 'Game Film',
      gameFootage: 'Hudl',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  golf: {
    id: 'golf',
    name: 'Golf',
    displayName: 'High School Golf',
    tagline: 'The Only AI Powered Platform for High School Golf Recruiting',
    description: 'OfferHound connects high school golfers directly with college coaches. Showcase your scores, tournaments, and achievements.',
    heroImage: '/assets/bg-hero-golf.jpg',
    positions: ['Golfer'],
    stats: [
      { key: 'handicap', label: 'Handicap' },
      { key: 'scoringAvg', label: 'Scoring Avg' },
      { key: 'drivingDistance', label: 'Drive Dist', unit: ' yds' },
      { key: 'gir', label: 'GIR %' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Golf',
      highlights: 'Tournament Footage',
      gameFootage: 'Junior Golf Scoreboard',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  volleyball: {
    id: 'volleyball',
    name: 'Volleyball',
    displayName: 'High School Volleyball',
    tagline: 'The Only AI Powered Platform for High School Volleyball Recruiting',
    description: 'OfferHound connects high school volleyball players directly with college coaches. Build your profile and get noticed.',
    heroImage: '/assets/bg-hero-volleyball.jpg',
    positions: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero', 'DS'],
    stats: [
      { key: 'kills', label: 'Kills' },
      { key: 'assists', label: 'Assists' },
      { key: 'blocks', label: 'Blocks' },
      { key: 'digs', label: 'Digs' },
      { key: 'aces', label: 'Aces' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Volleyball',
      highlights: 'Match Footage',
      gameFootage: 'Hudl',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  swimming: {
    id: 'swimming',
    name: 'Swimming',
    displayName: 'High School Swimming',
    tagline: 'The Only AI Powered Platform for High School Swimming Recruiting',
    description: 'OfferHound connects high school swimmers directly with college coaches. Showcase your times and achievements.',
    heroImage: '/assets/bg-hero-swimming.jpg',
    positions: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM', 'Distance'],
    stats: [
      { key: 'time50free', label: '50 Free' },
      { key: 'time100free', label: '100 Free' },
      { key: 'time200free', label: '200 Free' },
      { key: 'time100fly', label: '100 Fly' },
      { key: 'time200im', label: '200 IM' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Swimming',
      highlights: 'Race Footage',
      gameFootage: 'SwimCloud',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  softball: {
    id: 'softball',
    name: 'Softball',
    displayName: 'High School Softball',
    tagline: 'The Only AI Powered Platform for High School Softball Recruiting',
    description: 'OfferHound connects high school softball players directly with college coaches. Build your profile and get recruited.',
    heroImage: '/assets/bg-hero-softball.jpg',
    positions: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'UTIL'],
    stats: [
      { key: 'battingAvg', label: 'AVG' },
      { key: 'homeRuns', label: 'HR' },
      { key: 'rbi', label: 'RBI' },
      { key: 'era', label: 'ERA' },
      { key: 'pitchSpeed', label: 'Pitch Speed', unit: ' mph' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Softball',
      highlights: 'Game Footage',
      gameFootage: 'Extra Innings Softball',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  hockey: {
    id: 'hockey',
    name: 'Hockey',
    displayName: 'High School Hockey',
    tagline: 'The Only AI Powered Platform for High School Hockey Recruiting',
    description: 'OfferHound connects high school hockey players directly with college coaches. Showcase your skills and get noticed.',
    heroImage: '/assets/bg-hero-hockey.jpg',
    positions: ['C', 'LW', 'RW', 'LD', 'RD', 'G'],
    stats: [
      { key: 'goals', label: 'Goals' },
      { key: 'assists', label: 'Assists' },
      { key: 'points', label: 'Points' },
      { key: 'plusMinus', label: '+/-' },
      { key: 'savePercentage', label: 'Save %' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Hockey',
      highlights: 'Game Film',
      gameFootage: 'Elite Prospects',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  cheerleading: {
    id: 'cheerleading',
    name: 'Cheerleading',
    displayName: 'High School Cheerleading',
    tagline: 'The Only AI Powered Platform for High School Cheerleading Recruiting',
    description: 'OfferHound connects high school cheerleaders directly with college coaches. Showcase your skills, stunts, and routines to get recruited.',
    heroImage: '/assets/bg-hero-cheerleading.jpg',
    positions: ['Flyer', 'Base', 'Back Spot', 'Tumbler', 'Jumper', 'All-Around'],
    stats: [
      { key: 'tuckLevel', label: 'Tumbling Level' },
      { key: 'standingTumbling', label: 'Standing Tumbling' },
      { key: 'runningTumbling', label: 'Running Tumbling' },
      { key: 'stuntLevel', label: 'Stunt Level' },
      { key: 'flexibility', label: 'Flexibility' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Cheerleading',
      highlights: 'Routine Footage',
      gameFootage: 'Varsity TV',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
  wrestling: {
    id: 'wrestling',
    name: 'Wrestling',
    displayName: 'High School Wrestling',
    tagline: 'The Only AI Powered Platform for High School Wrestling Recruiting',
    description: 'OfferHound connects high school wrestlers directly with college coaches. Showcase your record, technique, and championships to get recruited.',
    heroImage: '/assets/bg-hero-wrestling.jpg',
    positions: ['106', '113', '120', '126', '132', '138', '144', '150', '157', '165', '175', '190', '215', '285'],
    stats: [
      { key: 'record', label: 'Record' },
      { key: 'pins', label: 'Pins' },
      { key: 'takedowns', label: 'Takedowns' },
      { key: 'techFalls', label: 'Tech Falls' },
      { key: 'nearFalls', label: 'Near Falls' },
    ],
    terminology: {
      whyILoveSport: 'Why I Love Wrestling',
      highlights: 'Match Footage',
      gameFootage: 'FloWrestling / TrackWrestling',
    },
    hasTransferPortal: false,
    hasCampsFeed: true,
  },
};

export const SPORTS_LIST = Object.values(SPORTS_CONFIG);

export const DEFAULT_SPORT: SportType = 'football';

export function getSportConfig(sportId: string): SportConfig {
  return SPORTS_CONFIG[sportId as SportType] || SPORTS_CONFIG[DEFAULT_SPORT];
}

export function getSportByName(name: string): SportConfig | undefined {
  return SPORTS_LIST.find(
    (s) => s.name.toLowerCase() === name.toLowerCase() || s.id === name.toLowerCase()
  );
}

/**
 * Get the clean URL path for a sport's landing page.
 * Handles special cases like track-field -> /track
 */
export function getSportPath(sportId: SportType): string {
  // Special case: track-field uses /track for cleaner URL
  if (sportId === 'track-field') {
    return '/track';
  }
  return `/${sportId}`;
}

/**
 * Get the URL segment for a sport (without leading slash).
 * Used for sample athlete routes like /sample-athlete/football
 */
export function getSportUrlSegment(sportId: SportType | string): string {
  // Special case: track-field uses 'track' for cleaner URL
  if (sportId === 'track-field') {
    return 'track';
  }
  return sportId;
}

/**
 * Get the sport ID from a URL segment.
 * Handles special cases like track -> track-field
 */
export function getSportFromUrlSegment(segment: string): SportType {
  // Special case: track URL segment maps to track-field sport ID
  if (segment === 'track') {
    return 'track-field';
  }
  return segment as SportType;
}

/**
 * Get the clean URL path for a sample athlete profile.
 */
export function getSampleAthletePath(sportId: SportType | string): string {
  return `/sample-athlete/${getSportUrlSegment(sportId as SportType)}`;
}

/**
 * Get the clean URL path for a sample athlete gallery.
 */
export function getSampleAthleteGalleryPath(sportId: SportType | string): string {
  return `/sample-athlete/${getSportUrlSegment(sportId as SportType)}/gallery`;
}
