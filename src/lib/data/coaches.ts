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
  "SEC", "Big Ten", "ACC", "Big 12", "Pac-12",
  "American", "Mountain West", "Sun Belt", "MAC", "Conference USA",
  "Big Sky", "CAA", "MVFC",
  "GLIAC", "Lone Star", "CIAA", "Gulf South", "RMAC",
  "WIAC", "MIAC", "ODAC", "Centennial",
  "Heart", "Mid-South", "SAC",
  "KJCCC", "MACCC", "CCCAA", "SWJCFC",
  "Independent",
] as const;

export const divisions = [
  "FBS", "FCS", "Division II", "Division III", "NAIA", "Junior College", "Prep School",
] as const;

export const positions = [
  "Head Coach", "Athletic Director", "Associate Athletic Director",
  "Offensive Coordinator", "Defensive Coordinator", "Special Teams Coordinator", "Recruiting Coordinator",
  "Quarterbacks", "Running Backs", "Wide Receivers", "Tight Ends", "Offensive Line",
  "Defensive Line", "Linebackers", "Defensive Backs",
  "Special Teams",
] as const;

export const positionCategories = [
  { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
  { label: "Coordinators", positions: ["Offensive Coordinator", "Defensive Coordinator", "Special Teams Coordinator", "Recruiting Coordinator"] },
  { label: "Offensive Coaches", positions: ["Quarterbacks", "Running Backs", "Wide Receivers", "Tight Ends", "Offensive Line"] },
  { label: "Defensive Coaches", positions: ["Defensive Line", "Linebackers", "Defensive Backs"] },
  { label: "Special Teams", positions: ["Special Teams"] },
] as const;

export const sportCoachPositionCategories: Record<string, { label: string; positions: string[] }[]> = {
  football: [
     { label: "Leadership", positions: ["Head Coach", "Athletic Director", "Associate Athletic Director"] },
     { label: "Coordinators", positions: ["Offensive Coordinator", "Defensive Coordinator", "Special Teams Coordinator", "Recruiting Coordinator"] },
     { label: "Offensive Coaches", positions: ["Quarterbacks", "Running Backs", "Wide Receivers", "Tight Ends","Offensive Line"] },
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
      { label: "Support Staff", positions: ["Strength & Conditioning Coach", "Sports Psychologist", "Director ofOperations"] },
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
      { label: "Position Coaches", positions: ["Forwards Coach", "Defensemen Coach", "Goaltending Coach", "PowerPlay Coach", "Penalty Kill Coach"] },
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

export const getCoachPositionCategories = (sport: string) => {
   return sportCoachPositionCategories[sport] || sportCoachPositionCategories.football;
};

export const schoolStateMap: Record<string, string> = {
   "University of Texas": "TX", "Texas A&M": "TX", "Texas Tech": "TX", "Baylor University": "TX",
   "TCU": "TX", "SMU": "TX", "Houston": "TX", "North Texas": "TX", "UTSA": "TX", "Texas State": "TX",
   "University of Alabama": "AL", "Auburn University": "AL", "University of Georgia": "GA",
   "LSU": "LA", "University of Florida": "FL", "University of Tennessee": "TN",
   "Ohio State University": "OH", "University of Michigan": "MI", "Penn State University": "PA",
   "Clemson University": "SC", "Florida State University": "FL", "University of Notre Dame": "IN",
};

export const mockCoaches: Coach[] = [];
