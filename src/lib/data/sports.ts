export const SPORTS_CONFIG: Record<string, { name: string; icon: string; positions: string[] }> = {
  football: {
    name: 'Football',
    icon: '🏈',
    positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
  },
  basketball: {
    name: 'Basketball',
    icon: '🏀',
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
  },
  baseball: {
    name: 'Baseball',
    icon: '⚾',
    positions: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'],
  },
  softball: {
    name: 'Softball',
    icon: '🥎',
    positions: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP'],
  },
  soccer: {
    name: 'Soccer',
    icon: '⚽',
    positions: ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'],
  },
  volleyball: {
    name: 'Volleyball',
    icon: '🏐',
    positions: ['S', 'OH', 'MB', 'OPP', 'L', 'DS'],
  },
  lacrosse: {
    name: 'Lacrosse',
    icon: '🥍',
    positions: ['A', 'M', 'D', 'LSM', 'G', 'SSDM'],
  },
  hockey: {
    name: 'Hockey',
    icon: '🏒',
    positions: ['G', 'D', 'LW', 'C', 'RW'],
  },
  golf: {
    name: 'Golf',
    icon: '⛳',
    positions: ['Golfer'],
  },
  swimming: {
    name: 'Swimming',
    icon: '🏊',
    positions: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'],
  },
  track: {
    name: 'Track & Field',
    icon: '🏃',
    positions: ['Sprints', 'Distance', 'Hurdles', 'Jumps', 'Throws', 'Pole Vault'],
  },
  wrestling: {
    name: 'Wrestling',
    icon: '🤼',
    positions: ['Wrestler'],
  },
  cheerleading: {
    name: 'Cheerleading',
    icon: '📣',
    positions: ['Flyer', 'Base', 'Back Spot', 'Tumbler'],
  },
};

export type SportType = keyof typeof SPORTS_CONFIG;
export const DEFAULT_SPORT: SportType = 'football';
export const SPORT_LIST = Object.keys(SPORTS_CONFIG) as SportType[];
