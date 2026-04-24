export interface Coach {
  id: string;
  name: string;
  title: string;
  school: string;
  conference: string;
  division: string;
  positionCoached: string;
  email: string;
  phone?: string;
  twitter?: string;
  imageUrl?: string;
}

export const conferences = [
  // Power Conferences
  "SEC",
  "Big Ten",
  "ACC",
  "Big 12",
  "Pac-12",
  // Group of 5
  "American",
  "Mountain West",
  "Sun Belt",
  "MAC",
  "Conference USA",
  // FCS Conferences
  "Big Sky",
  "CAA",
  "MVFC",
  // Division II Conferences
  "GLIAC",
  "Lone Star",
  "CIAA",
  "Gulf South",
  "RMAC",
  // Division III Conferences
  "WIAC",
  "MIAC",
  "ODAC",
  "Centennial",
  // NAIA Conferences
  "Heart",
  "Mid-South",
  "SAC",
  // Junior College Conferences
  "KJCCC",
  "MACCC",
  "CCCAA",
  "SWJCFC",
  // Other
  "Independent",
] as const;

export const divisions = [
  "FBS",
  "FCS",
  "Division II",
  "Division III",
  "NAIA",
  "Junior College",
  "Prep School",
] as const;

export const positions = [
  // Leadership
  "Head Coach",
  "Athletic Director",
  "Associate Athletic Director",
  // Coordinators
  "Offensive Coordinator",
  "Defensive Coordinator",
  "Special Teams Coordinator",
  "Recruiting Coordinator",
  // Offensive Position Coaches
  "Quarterbacks",
  "Running Backs",
  "Wide Receivers",
  "Tight Ends",
  "Offensive Line",
  // Defensive Position Coaches
  "Defensive Line",
  "Linebackers",
  "Defensive Backs",
  // Special Teams
  "Special Teams",
] as const;

export const positionCategories = [
  { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
  { label: "Coordinators", positions: ["Offensive Coordinator", "Defensive Coordinator", "Special Teams Coordinator", "Recruiting Coordinator"] },
  { label: "Offensive Coaches", positions: ["Quarterbacks", "Running Backs", "Wide Receivers", "Tight Ends", "Offensive Line"] },
  { label: "Defensive Coaches", positions: ["Defensive Line", "Linebackers", "Defensive Backs"] },
  { label: "Special Teams", positions: ["Special Teams"] },
] as const;

// Sport-specific coach position categories
export const sportCoachPositionCategories: Record<string, { label: string; positions: string[] }[]> = {
  football: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Coordinators", positions: ["Offensive Coordinator", "Defensive Coordinator", "Special Teams Coordinator", "Recruiting Coordinator"] },
    { label: "Offensive Coaches", positions: ["Quarterbacks", "Running Backs", "Wide Receivers", "Tight Ends", "Offensive Line"] },
    { label: "Defensive Coaches", positions: ["Defensive Line", "Linebackers", "Defensive Backs"] },
    { label: "Special Teams", positions: ["Special Teams"] },
  ],
  basketball: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Assistant Coach", "Associate Head Coach", "Recruiting Coordinator", "Director of Player Development"] },
    { label: "Position Coaches", positions: ["Guards Coach", "Forwards Coach", "Centers Coach", "Shooting Coach"] },
    { label: "Support Staff", positions: ["Video Coordinator", "Strength & Conditioning Coach", "Director of Operations"] },
  ],
  baseball: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Pitching Coach", "Hitting Coach", "Recruiting Coordinator"] },
    { label: "Position Coaches", positions: ["Infield Coach", "Outfield Coach", "Catching Coach", "Base Running Coach"] },
    { label: "Support Staff", positions: ["Bullpen Coach", "Strength & Conditioning Coach", "Director of Operations"] },
  ],
  softball: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Pitching Coach", "Hitting Coach", "Recruiting Coordinator"] },
    { label: "Position Coaches", positions: ["Infield Coach", "Outfield Coach", "Catching Coach", "Base Running Coach"] },
    { label: "Support Staff", positions: ["Strength & Conditioning Coach", "Director of Operations"] },
  ],
  soccer: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Assistant Coach", "Associate Head Coach", "Recruiting Coordinator", "Technical Director"] },
    { label: "Position Coaches", positions: ["Goalkeeper Coach", "Defensive Coach", "Midfield Coach", "Attacking Coach"] },
    { label: "Support Staff", positions: ["Fitness Coach", "Video Analyst", "Director of Operations"] },
  ],
  volleyball: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Assistant Coach", "Recruiting Coordinator"] },
    { label: "Position Coaches", positions: ["Setters Coach", "Hitters Coach", "Libero/Defensive Coach", "Blocking Coach"] },
    { label: "Support Staff", positions: ["Video Coordinator", "Strength & Conditioning Coach", "Director of Operations"] },
  ],
  swimming: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Assistant Coach", "Recruiting Coordinator"] },
    { label: "Specialty Coaches", positions: ["Sprint Coach", "Distance Coach", "Stroke Technique Coach", "Diving Coach"] },
    { label: "Support Staff", positions: ["Strength & Conditioning Coach", "Sports Psychologist", "Director of Operations"] },
  ],
  track: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Assistant Coach", "Recruiting Coordinator"] },
    { label: "Event Coaches", positions: ["Sprints Coach", "Distance Coach", "Hurdles Coach", "Jumps Coach", "Throws Coach", "Multi-Events Coach"] },
    { label: "Support Staff", positions: ["Strength & Conditioning Coach", "Director of Operations"] },
  ],
  lacrosse: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Offensive Coordinator", "Defensive Coordinator", "Recruiting Coordinator"] },
    { label: "Position Coaches", positions: ["Attack Coach", "Midfield Coach", "Defense Coach", "Goalie Coach", "Face-Off Specialist Coach"] },
    { label: "Support Staff", positions: ["Strength & Conditioning Coach", "Director of Operations"] },
  ],
  hockey: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Assistant Coach", "Recruiting Coordinator"] },
    { label: "Position Coaches", positions: ["Forwards Coach", "Defensemen Coach", "Goaltending Coach", "Power Play Coach", "Penalty Kill Coach"] },
    { label: "Support Staff", positions: ["Video Coach", "Strength & Conditioning Coach", "Director of Operations"] },
  ],
  golf: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Assistant Coach", "Recruiting Coordinator"] },
    { label: "Specialty Coaches", positions: ["Swing Coach", "Short Game Coach", "Putting Coach", "Mental Performance Coach"] },
    { label: "Support Staff", positions: ["Strength & Conditioning Coach", "Director of Operations"] },
  ],
  cheerleading: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Assistant Coach", "Recruiting Coordinator", "Program Coordinator"] },
    { label: "Specialty Coaches", positions: ["Tumbling Coach", "Stunts Coach", "Dance Coach", "Pyramid Coach", "Jump Coach"] },
    { label: "Support Staff", positions: ["Choreographer", "Strength & Conditioning Coach", "Director of Operations"] },
  ],
  wrestling: [
    { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
    { label: "Staff", positions: ["Associate Head Coach", "Assistant Coach", "Recruiting Coordinator"] },
    { label: "Weight Class Coaches", positions: ["Lightweight Coach", "Middleweight Coach", "Heavyweight Coach", "Technique Coach"] },
    { label: "Support Staff", positions: ["Strength & Conditioning Coach", "Nutrition Coach", "Director of Operations"] },
  ],
};

// Helper function to get position categories for a sport
export const getCoachPositionCategories = (sport: string) => {
  return sportCoachPositionCategories[sport] || sportCoachPositionCategories.football;
};

// School to state mapping for proximity sorting
export const schoolStateMap: Record<string, string> = {
  // Texas schools
  "University of Texas": "TX",
  "Texas A&M": "TX",
  "Texas Tech": "TX",
  "Baylor University": "TX",
  "TCU": "TX",
  "SMU": "TX",
  "Houston": "TX",
  "North Texas": "TX",
  "UTSA": "TX",
  "Texas State": "TX",
  "Rice University": "TX",
  "UTEP": "TX",
  // SEC
  "University of Alabama": "AL",
  "Auburn University": "AL",
  "University of Georgia": "GA",
  "LSU": "LA",
  "University of Florida": "FL",
  "University of Tennessee": "TN",
  "University of Kentucky": "KY",
  "University of South Carolina": "SC",
  "Vanderbilt University": "TN",
  "University of Mississippi": "MS",
  "Mississippi State": "MS",
  "University of Missouri": "MO",
  "University of Arkansas": "AR",
  "Oklahoma University": "OK",
  // Big Ten
  "Ohio State University": "OH",
  "University of Michigan": "MI",
  "Penn State University": "PA",
  "University of Wisconsin": "WI",
  "University of Iowa": "IA",
  "University of Minnesota": "MN",
  "University of Nebraska": "NE",
  "Northwestern University": "IL",
  "Purdue University": "IN",
  "Indiana University": "IN",
  "University of Illinois": "IL",
  "Rutgers University": "NJ",
  "University of Maryland": "MD",
  "Michigan State": "MI",
  "USC": "CA",
  "UCLA": "CA",
  "University of Oregon": "OR",
  "University of Washington": "WA",
  // ACC
  "Clemson University": "SC",
  "Florida State University": "FL",
  "University of Miami": "FL",
  "University of North Carolina": "NC",
  "NC State": "NC",
  "Duke University": "NC",
  "Wake Forest": "NC",
  "University of Virginia": "VA",
  "Virginia Tech": "VA",
  "University of Pittsburgh": "PA",
  "Syracuse University": "NY",
  "Boston College": "MA",
  "Georgia Tech": "GA",
  "University of Louisville": "KY",
  // Big 12
  "Kansas State": "KS",
  "University of Kansas": "KS",
  "Iowa State": "IA",
  "Oklahoma State": "OK",
  "West Virginia": "WV",
  "Cincinnati": "OH",
  "UCF": "FL",
  "BYU": "UT",
  "Arizona": "AZ",
  "Arizona State": "AZ",
  "Colorado": "CO",
  "Utah": "UT",
  // Independent
  "University of Notre Dame": "IN",
  // Default fallback handled in code
};

// State proximity tiers from Texas
export const stateProximityTiers: Record<string, number> = {
  // Same state - tier 0
  "TX": 0,
  // Neighboring states - tier 1
  "OK": 1,
  "LA": 1,
  "AR": 1,
  "NM": 1,
  // Regional (South/Southwest) - tier 2
  "MS": 2,
  "AL": 2,
  "TN": 2,
  "KS": 2,
  "CO": 2,
  "AZ": 2,
  // Extended region - tier 3
  "GA": 3,
  "FL": 3,
  "SC": 3,
  "NC": 3,
  "MO": 3,
  "NE": 3,
  "UT": 3,
  "CA": 3,
  // Further states - tier 4
  "VA": 4,
  "KY": 4,
  "IN": 4,
  "IL": 4,
  "OH": 4,
  "MI": 4,
  "IA": 4,
  "MN": 4,
  "WI": 4,
  // Far states - tier 5
  "PA": 5,
  "NY": 5,
  "NJ": 5,
  "MD": 5,
  "MA": 5,
  "WV": 5,
  "OR": 5,
  "WA": 5,
};

export const mockCoaches: Coach[] = [
  {
    id: "1",
    name: "Marcus Williams",
    title: "Head Coach",
    school: "University of Alabama",
    conference: "SEC",
    division: "FBS",
    positionCoached: "Head Coach",
    email: "mwilliams@ua.edu",
    phone: "(205) 555-0101",
    twitter: "@CoachMWilliams",
  },
  {
    id: "2",
    name: "David Chen",
    title: "Wide Receivers Coach",
    school: "Ohio State University",
    conference: "Big Ten",
    division: "FBS",
    positionCoached: "Wide Receivers",
    email: "dchen@osu.edu",
    twitter: "@CoachChenOSU",
  },
  {
    id: "3",
    name: "Robert Jackson",
    title: "Defensive Coordinator",
    school: "Clemson University",
    conference: "ACC",
    division: "FBS",
    positionCoached: "Defensive Coordinator",
    email: "rjackson@clemson.edu",
    phone: "(864) 555-0202",
  },
  {
    id: "4",
    name: "Michael Torres",
    title: "Running Backs Coach",
    school: "University of Texas",
    conference: "Big 12",
    division: "FBS",
    positionCoached: "Running Backs",
    email: "mtorres@texas.edu",
    twitter: "@CoachTorresUT",
  },
  {
    id: "5",
    name: "James Anderson",
    title: "Recruiting Coordinator",
    school: "University of Georgia",
    conference: "SEC",
    division: "FBS",
    positionCoached: "Recruiting Coordinator",
    email: "janderson@uga.edu",
    phone: "(706) 555-0303",
    twitter: "@RecruitingUGA",
  },
  {
    id: "6",
    name: "Christopher Brown",
    title: "Offensive Line Coach",
    school: "University of Michigan",
    conference: "Big Ten",
    division: "FBS",
    positionCoached: "Offensive Line",
    email: "cbrown@umich.edu",
  },
  {
    id: "7",
    name: "Anthony Davis",
    title: "Quarterbacks Coach",
    school: "USC",
    conference: "Pac-12",
    division: "FBS",
    positionCoached: "Quarterbacks",
    email: "adavis@usc.edu",
    twitter: "@QBCoachUSC",
  },
  {
    id: "8",
    name: "Kevin Martinez",
    title: "Linebackers Coach",
    school: "Florida State University",
    conference: "ACC",
    division: "FBS",
    positionCoached: "Linebackers",
    email: "kmartinez@fsu.edu",
    phone: "(850) 555-0404",
  },
  {
    id: "9",
    name: "Brian Thompson",
    title: "Defensive Backs Coach",
    school: "Penn State University",
    conference: "Big Ten",
    division: "FBS",
    positionCoached: "Defensive Backs",
    email: "bthompson@psu.edu",
    twitter: "@DBCoachPSU",
  },
  {
    id: "10",
    name: "Steven Garcia",
    title: "Special Teams Coordinator",
    school: "Oklahoma University",
    conference: "Big 12",
    division: "FBS",
    positionCoached: "Special Teams",
    email: "sgarcia@ou.edu",
  },
  {
    id: "11",
    name: "Daniel Wilson",
    title: "Tight Ends Coach",
    school: "University of Notre Dame",
    conference: "Independent",
    division: "FBS",
    positionCoached: "Tight Ends",
    email: "dwilson@nd.edu",
    phone: "(574) 555-0505",
  },
  {
    id: "12",
    name: "Mark Robinson",
    title: "Defensive Line Coach",
    school: "LSU",
    conference: "SEC",
    division: "FBS",
    positionCoached: "Defensive Line",
    email: "mrobinson@lsu.edu",
    twitter: "@DLineCoachLSU",
  },
];
