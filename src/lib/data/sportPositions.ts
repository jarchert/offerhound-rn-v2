// Sport-specific positions for onboarding

export interface PositionOption {
  label: string;
  category: string;
}

export const SPORT_POSITIONS: Record<string, PositionOption[]> = {
  football: [
    // Offense
    { label: "Quarterback (QB)", category: "Offense" },
    { label: "Running Back (RB)", category: "Offense" },
    { label: "Wide Receiver (WR)", category: "Offense" },
    { label: "Tight End (TE)", category: "Offense" },
    { label: "Offensive Tackle (OT)", category: "Offense" },
    { label: "Offensive Guard (OG)", category: "Offense" },
    { label: "Center (C)", category: "Offense" },
    { label: "Fullback (FB)", category: "Offense" },
    // Defense
    { label: "Defensive End (DE)", category: "Defense" },
    { label: "Defensive Tackle (DT)", category: "Defense" },
    { label: "Nose Tackle (NT)", category: "Defense" },
    { label: "Outside Linebacker (OLB)", category: "Defense" },
    { label: "Inside Linebacker (ILB)", category: "Defense" },
    { label: "Middle Linebacker (MLB)", category: "Defense" },
    { label: "Cornerback (CB)", category: "Defense" },
    { label: "Safety (S)", category: "Defense" },
    { label: "Free Safety (FS)", category: "Defense" },
    { label: "Strong Safety (SS)", category: "Defense" },
    { label: "Defensive Back (DB)", category: "Defense" },
    // Special Teams
    { label: "Kicker (K)", category: "Special Teams" },
    { label: "Punter (P)", category: "Special Teams" },
    { label: "Long Snapper (LS)", category: "Special Teams" },
    // Versatile
    { label: "Athlete (ATH)", category: "Versatile" },
    { label: "Edge Rusher (EDGE)", category: "Versatile" },
    { label: "Linebacker (LB)", category: "Versatile" },
    { label: "Offensive Line (OL)", category: "Versatile" },
    { label: "Defensive Line (DL)", category: "Versatile" },
  ],
  basketball: [
    { label: "Point Guard (PG)", category: "Guards" },
    { label: "Shooting Guard (SG)", category: "Guards" },
    { label: "Small Forward (SF)", category: "Forwards" },
    { label: "Power Forward (PF)", category: "Forwards" },
    { label: "Center (C)", category: "Centers" },
    { label: "Combo Guard", category: "Versatile" },
    { label: "Wing", category: "Versatile" },
    { label: "Forward", category: "Versatile" },
  ],
  soccer: [
    { label: "Goalkeeper (GK)", category: "Goalkeeper" },
    { label: "Center Back (CB)", category: "Defense" },
    { label: "Left Back (LB)", category: "Defense" },
    { label: "Right Back (RB)", category: "Defense" },
    { label: "Left Wing Back (LWB)", category: "Defense" },
    { label: "Right Wing Back (RWB)", category: "Defense" },
    { label: "Defensive Midfielder (CDM)", category: "Midfield" },
    { label: "Central Midfielder (CM)", category: "Midfield" },
    { label: "Attacking Midfielder (CAM)", category: "Midfield" },
    { label: "Left Midfielder (LM)", category: "Midfield" },
    { label: "Right Midfielder (RM)", category: "Midfield" },
    { label: "Left Wing (LW)", category: "Attack" },
    { label: "Right Wing (RW)", category: "Attack" },
    { label: "Striker (ST)", category: "Attack" },
    { label: "Center Forward (CF)", category: "Attack" },
  ],
  baseball: [
    { label: "Pitcher (P)", category: "Battery" },
    { label: "Catcher (C)", category: "Battery" },
    { label: "First Base (1B)", category: "Infield" },
    { label: "Second Base (2B)", category: "Infield" },
    { label: "Third Base (3B)", category: "Infield" },
    { label: "Shortstop (SS)", category: "Infield" },
    { label: "Left Field (LF)", category: "Outfield" },
    { label: "Center Field (CF)", category: "Outfield" },
    { label: "Right Field (RF)", category: "Outfield" },
    { label: "Designated Hitter (DH)", category: "Versatile" },
    { label: "Utility (UTIL)", category: "Versatile" },
  ],
  "track-field": [
    { label: "100m Sprinter", category: "Sprints" },
    { label: "200m Sprinter", category: "Sprints" },
    { label: "400m Sprinter", category: "Sprints" },
    { label: "800m Runner", category: "Middle Distance" },
    { label: "1600m Runner", category: "Distance" },
    { label: "3200m Runner", category: "Distance" },
    { label: "Cross Country", category: "Distance" },
    { label: "110m/100m Hurdles", category: "Hurdles" },
    { label: "300m/400m Hurdles", category: "Hurdles" },
    { label: "Long Jump", category: "Jumps" },
    { label: "Triple Jump", category: "Jumps" },
    { label: "High Jump", category: "Jumps" },
    { label: "Pole Vault", category: "Jumps" },
    { label: "Shot Put", category: "Throws" },
    { label: "Discus", category: "Throws" },
    { label: "Javelin", category: "Throws" },
    { label: "Multi-Event (Decathlon/Heptathlon)", category: "Multi" },
    { label: "Relay Specialist", category: "Relays" },
  ],
  lacrosse: [
    { label: "Attack", category: "Offense" },
    { label: "Midfield", category: "Midfield" },
    { label: "Defense (Long Stick)", category: "Defense" },
    { label: "Goalie", category: "Goalie" },
    { label: "FOGO (Face-Off Get-Off)", category: "Specialist" },
    { label: "LSM (Long Stick Middie)", category: "Specialist" },
    { label: "SSDM (Short Stick Defensive Middie)", category: "Specialist" },
  ],
  golf: [
    { label: "Golfer", category: "General" },
  ],
  volleyball: [
    { label: "Setter", category: "Setters" },
    { label: "Outside Hitter (OH)", category: "Hitters" },
    { label: "Middle Blocker (MB)", category: "Hitters" },
    { label: "Opposite Hitter (OPP)", category: "Hitters" },
    { label: "Libero", category: "Defense" },
    { label: "Defensive Specialist (DS)", category: "Defense" },
    { label: "Serving Specialist", category: "Specialist" },
  ],
  swimming: [
    { label: "Freestyle Sprinter (50/100)", category: "Freestyle" },
    { label: "Freestyle Distance (200/500)", category: "Freestyle" },
    { label: "Backstroke", category: "Stroke" },
    { label: "Breaststroke", category: "Stroke" },
    { label: "Butterfly", category: "Stroke" },
    { label: "Individual Medley (IM)", category: "IM" },
    { label: "Distance Freestyle (500+)", category: "Distance" },
    { label: "Relay Specialist", category: "Relay" },
  ],
  softball: [
    { label: "Pitcher (P)", category: "Battery" },
    { label: "Catcher (C)", category: "Battery" },
    { label: "First Base (1B)", category: "Infield" },
    { label: "Second Base (2B)", category: "Infield" },
    { label: "Third Base (3B)", category: "Infield" },
    { label: "Shortstop (SS)", category: "Infield" },
    { label: "Left Field (LF)", category: "Outfield" },
    { label: "Center Field (CF)", category: "Outfield" },
    { label: "Right Field (RF)", category: "Outfield" },
    { label: "Designated Player (DP)", category: "Versatile" },
    { label: "Flex", category: "Versatile" },
    { label: "Utility (UTIL)", category: "Versatile" },
  ],
  hockey: [
    { label: "Center (C)", category: "Forwards" },
    { label: "Left Wing (LW)", category: "Forwards" },
    { label: "Right Wing (RW)", category: "Forwards" },
    { label: "Left Defense (LD)", category: "Defense" },
    { label: "Right Defense (RD)", category: "Defense" },
    { label: "Goalie (G)", category: "Goalie" },
    { label: "Forward", category: "Versatile" },
    { label: "Defenseman", category: "Versatile" },
  ],
  cheerleading: [
    { label: "Flyer", category: "Stunts" },
    { label: "Main Base", category: "Stunts" },
    { label: "Side Base", category: "Stunts" },
    { label: "Back Spot", category: "Stunts" },
    { label: "Front Spot", category: "Stunts" },
    { label: "Tumbler", category: "Tumbling" },
    { label: "Jumper", category: "Specialty" },
    { label: "Dance Captain", category: "Specialty" },
    { label: "All-Around", category: "Versatile" },
    { label: "Basket Toss Flyer", category: "Specialty" },
  ],
  wrestling: [
    // Lightweight Classes
    { label: "106 lbs", category: "Lightweight" },
    { label: "113 lbs", category: "Lightweight" },
    { label: "120 lbs", category: "Lightweight" },
    { label: "126 lbs", category: "Lightweight" },
    { label: "132 lbs", category: "Lightweight" },
    // Middleweight Classes
    { label: "138 lbs", category: "Middleweight" },
    { label: "144 lbs", category: "Middleweight" },
    { label: "150 lbs", category: "Middleweight" },
    { label: "157 lbs", category: "Middleweight" },
    // Heavyweight Classes
    { label: "165 lbs", category: "Heavyweight" },
    { label: "175 lbs", category: "Heavyweight" },
    { label: "190 lbs", category: "Heavyweight" },
    { label: "215 lbs", category: "Heavyweight" },
    { label: "285 lbs (Heavyweight)", category: "Heavyweight" },
  ],
};

// Sport-specific traits
export const SPORT_TRAITS: Record<string, string[]> = {
  football: [
    "Speed", "Strength", "Agility", "Power", "Explosiveness",
    "Quick Feet", "Ball Skills", "Route Running", "Blocking",
    "Tackling", "Coverage", "Pass Rush", "Vision", "Footwork",
    "Arm Strength", "Accuracy", "Durability", "Versatility"
  ],
  basketball: [
    "Scoring", "Shooting", "Ball Handling", "Passing", "Court Vision",
    "Rebounding", "Defense", "Athleticism", "Speed", "Vertical",
    "Post Moves", "Perimeter Defense", "Help Defense", "Shot Blocking",
    "Free Throw", "Three-Point", "Mid-Range", "Finishing"
  ],
  soccer: [
    "Speed", "Dribbling", "Passing", "Shooting", "Vision",
    "First Touch", "Crossing", "Heading", "Tackling", "Positioning",
    "Stamina", "Strength", "Aerial Ability", "Long Passing",
    "Set Pieces", "1v1 Defending", "Ball Control", "Work Rate"
  ],
  baseball: [
    "Bat Speed", "Power", "Contact", "Plate Discipline", "Speed",
    "Arm Strength", "Arm Accuracy", "Fielding", "Range", "First Step",
    "Fastball Velocity", "Command", "Breaking Ball", "Changeup",
    "Pitch Mix", "Game Calling", "Blocking", "Pop Time"
  ],
  "track-field": [
    "Explosive Start", "Top-End Speed", "Speed Endurance", "Acceleration",
    "Technique", "Race Strategy", "Mental Toughness", "Flexibility",
    "Power", "Coordination", "Stamina", "Form", "Finish",
    "Exchange (Relay)", "Consistency", "PR Drive"
  ],
  lacrosse: [
    "Stick Skills", "Shooting", "Dodging", "Passing", "Ground Balls",
    "Faceoffs", "Clearing", "Riding", "Checking", "Footwork",
    "Vision", "IQ", "Speed", "Agility", "Physicality",
    "Save Percentage", "Outlet Passing", "Communication"
  ],
  golf: [
    "Driving Distance", "Driving Accuracy", "Iron Play", "Approach Shots",
    "Short Game", "Putting", "Course Management", "Mental Game",
    "Consistency", "Scrambling", "Sand Play", "Recovery Shots",
    "Distance Control", "Green Reading", "Pressure Performance"
  ],
  volleyball: [
    "Hitting Power", "Hitting Accuracy", "Blocking", "Serving",
    "Passing", "Setting", "Digging", "Court Awareness",
    "Jumping", "Footwork", "Timing", "Reading", "Communication",
    "Serve Receive", "Back Row Attack", "Transition"
  ],
  swimming: [
    "Underwater Speed", "Starts", "Turns", "Stroke Technique",
    "Endurance", "Sprint Speed", "Race Strategy", "Pacing",
    "Kick Strength", "Pull Power", "Breakouts", "Finishes",
    "IM Transitions", "Relay Exchanges", "Mental Toughness"
  ],
  softball: [
    "Bat Speed", "Power", "Contact", "Slap Hitting", "Bunting",
    "Speed", "Arm Strength", "Arm Accuracy", "Fielding", "Range",
    "Pitch Velocity", "Spin Rate", "Movement", "Command",
    "Game Calling", "Blocking", "Pop Time", "Stealing"
  ],
  hockey: [
    "Skating Speed", "Acceleration", "Edges", "Stickhandling",
    "Shooting", "Passing", "Vision", "Hockey IQ", "Faceoffs",
    "Checking", "Positioning", "Gap Control", "Shot Blocking",
    "Puck Protection", "Compete Level", "Glove", "Blocker", "Rebound Control"
  ],
  cheerleading: [
    "Flexibility", "Tumbling", "Stunting", "Jumps", "Dance",
    "Strength", "Balance", "Coordination", "Timing", "Showmanship",
    "Conditioning", "Synchronization", "Precision", "Energy", "Crowd Engagement",
    "Basket Toss", "Pyramid Building", "Motion Technique"
  ],
  wrestling: [
    "Takedowns", "Escapes", "Reversals", "Pins", "Riding",
    "Bottom Wrestling", "Top Control", "Hand Fighting", "Sprawl",
    "Shot Speed", "Shot Accuracy", "Chain Wrestling", "Conditioning",
    "Flexibility", "Strength", "Explosiveness", "Balance",
    "Leg Attacks", "Upper Body Attacks", "Mat Returns"
  ],
};

// Sport-specific intangibles
export const SPORT_INTANGIBLES: Record<string, string[]> = {
  football: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "High Football IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Accountable", "Respectful", "Focused"
  ],
  basketball: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "High Basketball IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Floor General", "Energy Giver", "Defensive Communicator"
  ],
  soccer: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "Tactical Awareness", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Game Reader", "Composure Under Pressure", "Communication"
  ],
  baseball: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "High Baseball IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Mound Presence", "Plate Discipline", "Situational Awareness"
  ],
  "track-field": [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "Race IQ", "Clutch Performer", "Mental Toughness", "Positive Attitude",
    "Vocal Leader", "Humble", "Disciplined", "Resilient", "Self-Motivated",
    "PR Driven", "Relay Focus", "Process Oriented", "Recovery Discipline"
  ],
  lacrosse: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "Lacrosse IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Field General", "Transition Hustle", "Ride Energy"
  ],
  golf: [
    "Leadership", "Coachable", "Work Ethic", "Competitive", "Mental Toughness",
    "Course Management", "Clutch Performer", "Positive Attitude", "Humble",
    "Disciplined", "Resilient", "Self-Motivated", "Focused", "Patient",
    "Pressure Handling", "Routine Discipline", "Sportsmanship", "Adaptable"
  ],
  volleyball: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "Volleyball IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Floor Communication", "Transition Energy", "Serve Tough"
  ],
  swimming: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "Race IQ", "Clutch Performer", "Mental Toughness", "Positive Attitude",
    "Humble", "Disciplined", "Resilient", "Self-Motivated", "Process Focused",
    "Relay Commitment", "Recovery Discipline", "Goal Oriented", "Pain Tolerance"
  ],
  softball: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "High Softball IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Mound Presence", "Situational Awareness", "Dugout Energy"
  ],
  hockey: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "Hockey IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Compete Level", "Physical Play", "Shift Management"
  ],
  cheerleading: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "Routine IQ", "Clutch Performer", "Mental Toughness", "Positive Attitude",
    "Humble", "Disciplined", "Resilient", "Self-Motivated", "Crowd Connector",
    "Safety Conscious", "Energy Giver", "Synchronization Focus", "Spirit Leader"
  ],
  wrestling: [
    "Leadership", "Coachable", "Team Player", "Work Ethic", "Competitive",
    "High Wrestling IQ", "Clutch Performer", "Film Study", "Mental Toughness",
    "Positive Attitude", "Vocal Leader", "Humble", "Disciplined", "Resilient",
    "Self-Motivated", "Weight Management", "Tournament Tested", "Grinder Mentality",
    "Recovery Discipline", "Practice Partner"
  ],
};

export const getIntangiblesForSport = (sport: string): string[] => {
  return SPORT_INTANGIBLES[sport] || SPORT_INTANGIBLES.football;
};

// Sport-specific stats/metrics for onboarding
export interface SportMetric {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
}

export const SPORT_METRICS: Record<string, SportMetric[]> = {
  football: [
    { key: "forty_yard", label: "40-Yard Dash", placeholder: "4.5", hint: "Time in seconds" },
    { key: "vertical", label: "Vertical Jump", placeholder: "32", hint: "Height in inches" },
    { key: "bench_press", label: "Bench Press", placeholder: "225 lbs or 10 reps", hint: "Max or reps @ 185" },
    { key: "squat", label: "Squat", placeholder: "315", hint: "Max in pounds" },
    { key: "arm_length", label: "Arm Length", placeholder: "32.5", hint: "Length in inches" },
  ],
  basketball: [
    { key: "ppg", label: "Points Per Game", placeholder: "18.5", hint: "Season average" },
    { key: "rpg", label: "Rebounds Per Game", placeholder: "7.2", hint: "Season average" },
    { key: "apg", label: "Assists Per Game", placeholder: "4.5", hint: "Season average" },
    { key: "vertical", label: "Vertical Jump", placeholder: "32", hint: "Max vertical in inches" },
    { key: "wingspan", label: "Wingspan", placeholder: "6'8\"", hint: "Wingspan measurement" },
  ],
  soccer: [
    { key: "goals", label: "Goals", placeholder: "15", hint: "Season total" },
    { key: "assists", label: "Assists", placeholder: "12", hint: "Season total" },
    { key: "games_played", label: "Games Played", placeholder: "22", hint: "This season" },
    { key: "clean_sheets", label: "Clean Sheets (GK)", placeholder: "8", hint: "For goalkeepers" },
  ],
  baseball: [
    { key: "batting_avg", label: "Batting Average", placeholder: ".350", hint: "Season average" },
    { key: "home_runs", label: "Home Runs", placeholder: "8", hint: "Season total" },
    { key: "rbi", label: "RBI", placeholder: "45", hint: "Season total" },
    { key: "era", label: "ERA (Pitchers)", placeholder: "2.50", hint: "Earned run average" },
    { key: "fastball_velo", label: "Fastball Velocity", placeholder: "88", hint: "MPH" },
  ],
  "track-field": [
    { key: "event_100m", label: "100m Time", placeholder: "11.2", hint: "Personal best in seconds" },
    { key: "event_200m", label: "200m Time", placeholder: "22.5", hint: "Personal best in seconds" },
    { key: "event_400m", label: "400m Time", placeholder: "52.0", hint: "Personal best" },
    { key: "long_jump", label: "Long Jump", placeholder: "20'6\"", hint: "Personal best" },
    { key: "high_jump", label: "High Jump", placeholder: "6'2\"", hint: "Personal best" },
  ],
  lacrosse: [
    { key: "goals", label: "Goals", placeholder: "45", hint: "Season total" },
    { key: "assists", label: "Assists", placeholder: "32", hint: "Season total" },
    { key: "ground_balls", label: "Ground Balls", placeholder: "65", hint: "Season total" },
    { key: "faceoff_pct", label: "Faceoff % (FOGO)", placeholder: "65%", hint: "Win percentage" },
    { key: "save_pct", label: "Save % (Goalie)", placeholder: "58%", hint: "Save percentage" },
  ],
  golf: [
    { key: "handicap", label: "Handicap Index", placeholder: "+2.5", hint: "Current handicap" },
    { key: "scoring_avg", label: "Scoring Average", placeholder: "72.5", hint: "18-hole average" },
    { key: "driving_distance", label: "Driving Distance", placeholder: "275", hint: "Average in yards" },
    { key: "tournament_wins", label: "Tournament Wins", placeholder: "3", hint: "Career/season" },
  ],
  volleyball: [
    { key: "kills", label: "Kills", placeholder: "350", hint: "Season total" },
    { key: "hitting_pct", label: "Hitting Percentage", placeholder: ".320", hint: "Season average" },
    { key: "assists", label: "Assists (Setters)", placeholder: "850", hint: "Season total" },
    { key: "digs", label: "Digs", placeholder: "280", hint: "Season total" },
    { key: "blocks", label: "Blocks", placeholder: "85", hint: "Season total" },
  ],
  swimming: [
    { key: "time_50_free", label: "50 Freestyle", placeholder: "22.50", hint: "Best time in seconds" },
    { key: "time_100_free", label: "100 Freestyle", placeholder: "49.80", hint: "Best time" },
    { key: "time_200_free", label: "200 Freestyle", placeholder: "1:48.50", hint: "Best time" },
    { key: "time_100_back", label: "100 Backstroke", placeholder: "55.20", hint: "Best time" },
    { key: "time_200_im", label: "200 IM", placeholder: "2:05.00", hint: "Best time" },
  ],
  softball: [
    { key: "batting_avg", label: "Batting Average", placeholder: ".425", hint: "Season average" },
    { key: "home_runs", label: "Home Runs", placeholder: "12", hint: "Season total" },
    { key: "rbi", label: "RBI", placeholder: "48", hint: "Season total" },
    { key: "era", label: "ERA (Pitchers)", placeholder: "1.85", hint: "Earned run average" },
    { key: "pitch_speed", label: "Pitch Speed", placeholder: "65", hint: "MPH" },
  ],
  hockey: [
    { key: "goals", label: "Goals", placeholder: "25", hint: "Season total" },
    { key: "assists", label: "Assists", placeholder: "35", hint: "Season total" },
    { key: "points", label: "Points", placeholder: "60", hint: "Goals + Assists" },
    { key: "plus_minus", label: "+/-", placeholder: "+15", hint: "Plus/Minus rating" },
    { key: "save_pct", label: "Save % (Goalies)", placeholder: ".920", hint: "Save percentage" },
  ],
  cheerleading: [
    { key: "tumbling_level", label: "Tumbling Level", placeholder: "Level 5", hint: "Highest level achieved" },
    { key: "standing_tumbling", label: "Standing Tumbling", placeholder: "Standing Back Tuck", hint: "Best standing skill" },
    { key: "running_tumbling", label: "Running Tumbling", placeholder: "Full Twisting Layout", hint: "Best running skill" },
    { key: "stunt_position", label: "Primary Stunt Position", placeholder: "Flyer", hint: "Main role in stunts" },
    { key: "years_experience", label: "Years of Experience", placeholder: "8", hint: "Years in cheerleading" },
  ],
  wrestling: [
    { key: "career_record", label: "Career Record", placeholder: "85-12", hint: "Wins-Losses" },
    { key: "season_record", label: "Season Record", placeholder: "32-4", hint: "Current season W-L" },
    { key: "pins", label: "Career Pins", placeholder: "45", hint: "Total pins" },
    { key: "takedowns", label: "Takedowns/Match", placeholder: "3.2", hint: "Average per match" },
    { key: "tech_falls", label: "Tech Falls", placeholder: "12", hint: "Career total" },
    { key: "major_decisions", label: "Major Decisions", placeholder: "18", hint: "Career total" },
    { key: "state_placement", label: "State Placement", placeholder: "2nd Place", hint: "Best state finish" },
    { key: "weight_class", label: "Competition Weight", placeholder: "152", hint: "Current weight class" },
  ],
};

export const getPositionsForSport = (sport: string): PositionOption[] => {
  return SPORT_POSITIONS[sport] || SPORT_POSITIONS.football;
};

export const getTraitsForSport = (sport: string): string[] => {
  return SPORT_TRAITS[sport] || SPORT_TRAITS.football;
};

export const getMetricsForSport = (sport: string): SportMetric[] => {
  return SPORT_METRICS[sport] || SPORT_METRICS.football;
};

// Get unique categories for a sport's positions
export const getPositionCategories = (sport: string): string[] => {
  const positions = getPositionsForSport(sport);
  return [...new Set(positions.map(p => p.category))];
};

// ----------------------------------------------------------------------------
// Event-based sports: Track & Field and Swimming
// Ported from web src/lib/data/sportPositions.ts (parity with Lovable).
// ----------------------------------------------------------------------------

export interface SportEventOption {
  key: string;
  label: string;
  /** Format hint for the PB/season-best inputs */
  format?: "time" | "distance" | "height" | "score";
  /** Elite benchmark for radar scoring (lower-is-better for time-based) */
  benchmark?: number;
  /** Maps to a radar axis (string in RN; full union lives in web src) */
  radarAxis?: string;
  /** Whether splits input is shown */
  hasSplits?: boolean;
}

export interface SportEventCategory {
  key: string;
  label: string;
  events: SportEventOption[];
}

export const SPORT_EVENT_CATALOG: Record<string, SportEventCategory[]> = {
  "track-field": [
    {
      key: "sprints", label: "Sprints",
      events: [
        { key: "60m", label: "60m", format: "time", benchmark: 6.8, radarAxis: "Speed" },
        { key: "100m", label: "100m", format: "time", benchmark: 10.5, radarAxis: "Speed" },
        { key: "200m", label: "200m", format: "time", benchmark: 21.5, radarAxis: "Speed" },
        { key: "400m", label: "400m", format: "time", benchmark: 47.5, radarAxis: "Speed", hasSplits: true },
      ],
    },
    {
      key: "middle_distance", label: "Middle Distance",
      events: [
        { key: "800m", label: "800m", format: "time", benchmark: 110, radarAxis: "Endurance", hasSplits: true },
        { key: "1500m", label: "1500m / Mile", format: "time", benchmark: 245, radarAxis: "Endurance", hasSplits: true },
        { key: "3000m", label: "3000m", format: "time", benchmark: 510, radarAxis: "Endurance", hasSplits: true },
      ],
    },
    {
      key: "distance", label: "Distance",
      events: [
        { key: "5k", label: "5K", format: "time", benchmark: 900, radarAxis: "Endurance", hasSplits: true },
        { key: "xc", label: "Cross Country", format: "time", benchmark: 950, radarAxis: "Endurance", hasSplits: true },
      ],
    },
    {
      key: "hurdles", label: "Hurdles",
      events: [
        { key: "100mh", label: "100m H (W)", format: "time", benchmark: 13.5, radarAxis: "Technique" },
        { key: "110mh", label: "110m H (M)", format: "time", benchmark: 14.0, radarAxis: "Technique" },
        { key: "300mh", label: "300m H", format: "time", benchmark: 39.0, radarAxis: "Technique" },
        { key: "400mh", label: "400m H", format: "time", benchmark: 52.0, radarAxis: "Technique" },
      ],
    },
    {
      key: "relays", label: "Relays",
      events: [
        { key: "4x100", label: "4x100m", format: "time", benchmark: 41.0, radarAxis: "Speed", hasSplits: true },
        { key: "4x200", label: "4x200m", format: "time", benchmark: 89.0, radarAxis: "Speed", hasSplits: true },
        { key: "4x400", label: "4x400m", format: "time", benchmark: 200.0, radarAxis: "Endurance", hasSplits: true },
      ],
    },
    {
      key: "jumps", label: "Jumps",
      events: [
        { key: "long_jump", label: "Long Jump", format: "distance", benchmark: 22, radarAxis: "Power" },
        { key: "triple_jump", label: "Triple Jump", format: "distance", benchmark: 45, radarAxis: "Power" },
        { key: "high_jump", label: "High Jump", format: "height", benchmark: 6.5, radarAxis: "Power" },
        { key: "pole_vault", label: "Pole Vault", format: "height", benchmark: 14, radarAxis: "Technique" },
      ],
    },
    {
      key: "throws", label: "Throws",
      events: [
        { key: "shot_put", label: "Shot Put", format: "distance", benchmark: 55, radarAxis: "Power" },
        { key: "discus", label: "Discus", format: "distance", benchmark: 160, radarAxis: "Power" },
        { key: "javelin", label: "Javelin", format: "distance", benchmark: 180, radarAxis: "Power" },
        { key: "hammer", label: "Hammer", format: "distance", benchmark: 180, radarAxis: "Power" },
      ],
    },
    {
      key: "multi_event", label: "Multi-Event",
      events: [
        { key: "heptathlon", label: "Heptathlon", format: "score", benchmark: 5500, radarAxis: "Versatility" },
        { key: "decathlon", label: "Decathlon", format: "score", benchmark: 7500, radarAxis: "Versatility" },
      ],
    },
  ],
  swimming: [
    {
      key: "freestyle", label: "Freestyle",
      events: [
        { key: "50_free", label: "50 Free", format: "time", benchmark: 21.0, radarAxis: "Sprint Speed" },
        { key: "100_free", label: "100 Free", format: "time", benchmark: 47.0, radarAxis: "Sprint Speed" },
        { key: "200_free", label: "200 Free", format: "time", benchmark: 105.0, radarAxis: "Endurance", hasSplits: true },
        { key: "500_free", label: "500 Free", format: "time", benchmark: 280.0, radarAxis: "Endurance", hasSplits: true },
        { key: "1000_free", label: "1000 Free", format: "time", benchmark: 580.0, radarAxis: "Endurance", hasSplits: true },
        { key: "1650_free", label: "1650 Free", format: "time", benchmark: 950.0, radarAxis: "Endurance", hasSplits: true },
      ],
    },
    {
      key: "backstroke", label: "Backstroke",
      events: [
        { key: "50_back", label: "50 Back", format: "time", benchmark: 23.5, radarAxis: "Stroke Versatility" },
        { key: "100_back", label: "100 Back", format: "time", benchmark: 50.0, radarAxis: "Stroke Versatility" },
        { key: "200_back", label: "200 Back", format: "time", benchmark: 110.0, radarAxis: "Stroke Versatility", hasSplits: true },
      ],
    },
    {
      key: "breaststroke", label: "Breaststroke",
      events: [
        { key: "50_breast", label: "50 Breast", format: "time", benchmark: 26.0, radarAxis: "Stroke Versatility" },
        { key: "100_breast", label: "100 Breast", format: "time", benchmark: 56.0, radarAxis: "Stroke Versatility" },
        { key: "200_breast", label: "200 Breast", format: "time", benchmark: 122.0, radarAxis: "Stroke Versatility", hasSplits: true },
      ],
    },
    {
      key: "butterfly", label: "Butterfly",
      events: [
        { key: "50_fly", label: "50 Fly", format: "time", benchmark: 22.5, radarAxis: "Power" },
        { key: "100_fly", label: "100 Fly", format: "time", benchmark: 49.0, radarAxis: "Power" },
        { key: "200_fly", label: "200 Fly", format: "time", benchmark: 110.0, radarAxis: "Power", hasSplits: true },
      ],
    },
    {
      key: "im", label: "Individual Medley",
      events: [
        { key: "100_im", label: "100 IM", format: "time", benchmark: 51.0, radarAxis: "Stroke Versatility" },
        { key: "200_im", label: "200 IM", format: "time", benchmark: 112.0, radarAxis: "Stroke Versatility", hasSplits: true },
        { key: "400_im", label: "400 IM", format: "time", benchmark: 240.0, radarAxis: "Endurance", hasSplits: true },
      ],
    },
    {
      key: "relays", label: "Relays",
      events: [
        { key: "200_free_relay", label: "200 Free Relay", format: "time", benchmark: 86.0, radarAxis: "Sprint Speed", hasSplits: true },
        { key: "400_free_relay", label: "400 Free Relay", format: "time", benchmark: 190.0, radarAxis: "Sprint Speed", hasSplits: true },
        { key: "200_medley_relay", label: "200 Medley Relay", format: "time", benchmark: 95.0, radarAxis: "Stroke Versatility", hasSplits: true },
        { key: "400_medley_relay", label: "400 Medley Relay", format: "time", benchmark: 205.0, radarAxis: "Stroke Versatility", hasSplits: true },
      ],
    },
  ],
};

export interface AthleteEventEntry {
  key: string;
  category: string;
  label: string;
  pb?: string;
  seasonBest?: string;
  placement?: string;
  splits?: string;
  record?: string;
}

export const isEventBasedSport = (sport: string): boolean =>
  sport === "track-field" || sport === "swimming";

export const getEventCatalogForSport = (sport: string): SportEventCategory[] =>
  SPORT_EVENT_CATALOG[sport] || [];

export const findEventOption = (
  sport: string,
  eventKey: string,
): { category: SportEventCategory; event: SportEventOption } | null => {
  const cats = getEventCatalogForSport(sport);
  for (const c of cats) {
    const e = c.events.find(ev => ev.key === eventKey);
    if (e) return { category: c, event: e };
  }
  return null;
};
