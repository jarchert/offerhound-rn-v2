import athleteProfileImage from "../../assets/lovable/athlete-profile.png";

export interface AthleteImage {
  url: string;
  alt: string;
  type: 'profile' | 'action' | 'team' | 'other';
}

export interface AthleteProfile {
  name: string;
  position: string;
  positions?: string[];
  height: string;
  weight: string;
  armLength?: string;
  classYear: string;
  gpa: string;
  highSchool: string;
  city: string;
  state: string;
  fortyYard?: string;
  benchPress?: string;
  squat?: string;
  vertical?: string;
  hudlUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  maxPrepsUrl?: string;
  youtubeUrl?: string;
  email: string;
  phone: string;
  highlights: string[];
  profileImage?: string | number;
  bannerImage?: string;
  heroImage?: string;
  familyImage?: string;
  highlightImage?: string;
  images: AthleteImage[];
  bio?: string;
  traits?: string[];
  intangibles?: string[];
  whyILoveSport?: string;
  playerComparison?: string;
  playerComparisonWhy?: string;
  myFamily?: string;
  whatMakesMeSpecial?: string;
  stats: {
    season: string;
    games: number;
    rushingYards?: number;
    passingYards?: number;
    receivingYards?: number;
    touchdowns: number;
    tackles?: number;
    interceptions?: number;
    passesDefended?: number;
    sacks?: number;
    note?: string;
  }[];
}

export const athleteProfile: AthleteProfile = {
  name: "Aiziah Thomas",
  position: "Defensive Back",
  positions: ["Cornerback", "Safety", "Nickel"],
  height: "6'3\"",
  weight: "170 lbs",
  armLength: "34.5\"",
  classYear: "2026",
  gpa: "3.5",
  highSchool: "Frisco High School",
  city: "Frisco",
  state: "TX",
  fortyYard: "4.52",
  vertical: "36\"",
  benchPress: "185 x 5",
  squat: "315 lbs",
  
  // Social & Highlight Links
  hudlUrl: "http://www.hudl.com/profile/18143981",
  twitterUrl: "https://x.com/aiziaht10242?s=21",
  instagramUrl: "https://instagram.com/aiziah_thomas",
  maxPrepsUrl: "https://maxpreps.com/athlete/yourprofile",
  youtubeUrl: "",
  
  // Contact Information
  email: "aiziahjai@yahoo.com",
  phone: "(469) 555-1026",
  
  // Career Highlights
  highlights: [
    "4 Career Interceptions (1 Pick-Six)",
    "7 Passes Defended",
    "Team Captain - 2024 Season",
    "3-Sport Athlete (Football, Basketball, Track)",
    "All-District Honorable Mention - 2024",
    "Varsity Starter Since Sophomore Year"
  ],
  
  // Images
  profileImage: athleteProfileImage,
  bannerImage: "/assets/sample-profiles/football-banner.jpg",
  heroImage: "/assets/sample-profiles/football-hero.png",
  familyImage: "/assets/sample-profiles/football-family.jpg",
  highlightImage: "/assets/sample-profiles/football-highlight.jpg",
  images: [
    { url: "/assets/sample-profiles/football-highlight.jpg", alt: "Making a play in coverage", type: "action" },
    { url: "/assets/sample-profiles/football-banner.jpg", alt: "Game day action shot", type: "action" }
  ],
  
  // Bio / About Me
  bio: "I'm a dedicated two-way athlete with a passion for football and a relentless work ethic. Standing at 6'3\" with long arms and natural ball skills, I bring a unique combination of size, speed, and instincts to the defensive backfield. My goal is to compete at the highest collegiate level while pursuing a degree in Sports Management. I pride myself on being a student of the game, constantly studying film and working to improve every aspect of my craft.",
  
  // Athletic Traits
  traits: [
    "Ball Skills",
    "Long Arms",
    "Hip Fluidity",
    "Closing Speed",
    "Man Coverage",
    "Zone Awareness",
    "Tackling"
  ],
  
  // Intangibles
  intangibles: [
    "Leadership",
    "Coachable",
    "Team Player",
    "Work Ethic",
    "High Football IQ",
    "Competitive",
    "Vocal Leader",
    "Film Study"
  ],
  
  // Why I Love Football
  whyILoveSport: "Football has been my passion since I first stepped on the field at age 7. There's nothing like the brotherhood you build with your teammates, the intensity of Friday night lights, and the constant challenge to be better than you were yesterday. I love the chess match between receivers and defensive backs - reading formations, anticipating routes, and making plays on the ball. Every snap is an opportunity to compete and prove myself.",
  
  // Player Comparison
  playerComparison: "Sauce Gardner",
  playerComparisonWhy: "I model my game after Sauce Gardner because of his length, technique, and ability to play press coverage. Like Sauce, I use my height and long arms to disrupt receivers at the line of scrimmage. I study his film to learn how he mirrors routes and stays patient in coverage. His competitive nature and confidence inspire me to bring that same energy to every rep.",
  
  // My Family
  myFamily: "My family is my biggest support system. My mom works tirelessly to make sure I have every opportunity to succeed, driving me to camps, training sessions, and games across Texas. My dad played college football at Prairie View A&M and has been my personal coach since day one - teaching me the fundamentals and pushing me to reach my potential. I have two younger siblings who look up to me, which motivates me to be the best role model I can be both on and off the field.",
  
  // What Makes Me Special
  whatMakesMeSpecial: "What sets me apart is my combination of size, length, and athletic ability at the cornerback position. At 6'3\" with a 34.5\" arm length, I can match up with any receiver on the field. But beyond my physical tools, I bring an unmatched work ethic and competitive fire. I'm the first one at practice and the last one to leave. I study film obsessively and take pride in knowing my opponent's tendencies before they even line up. My versatility allows me to play corner, safety, or nickel - wherever my team needs me most.",
  
  // Season-by-Season Stats
  stats: [
    {
      season: "2025 (Senior)",
      games: 0,
      tackles: 0,
      interceptions: 0,
      passesDefended: 0,
      touchdowns: 0,
      note: "Upcoming season - Committed to being a lockdown corner"
    },
    {
      season: "2024 (Junior)",
      games: 10,
      tackles: 42,
      interceptions: 2,
      passesDefended: 4,
      touchdowns: 1,
      sacks: 1,
      note: "Team Captain, All-District Honorable Mention"
    },
    {
      season: "2023 (Sophomore)",
      games: 10,
      tackles: 28,
      interceptions: 2,
      passesDefended: 3,
      touchdowns: 0,
      note: "First year as varsity starter"
    },
    {
      season: "2022 (Freshman)",
      games: 8,
      tackles: 12,
      interceptions: 0,
      passesDefended: 1,
      touchdowns: 0,
      note: "JV/Varsity rotation, learning the system"
    }
  ],
};
