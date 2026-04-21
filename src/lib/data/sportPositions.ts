export interface PositionOption {
  label: string;
  category: string;
}

export const SPORT_POSITIONS: Record<string, PositionOption[]> = {
  football: [
     { label: "Quarterback (QB)", category: "Offense" },
     { label: "Running Back (RB)", category: "Offense" },
     { label: "Wide Receiver (WR)", category: "Offense" },
     { label: "Tight End (TE)", category: "Offense" },
     { label: "Offensive Tackle (OT)", category: "Offense" },
     { label: "Offensive Guard (OG)", category: "Offense" },
     { label: "Center (C)", category: "Offense" },
     { label: "Defensive End (DE)", category: "Defense" },
     { label: "Defensive Tackle (DT)", category: "Defense" },
     { label: "Outside Linebacker (OLB)", category: "Defense" },
     { label: "Inside Linebacker (ILB)", category: "Defense" },
     { label: "Cornerback (CB)", category: "Defense" },
     { label: "Safety (S)", category: "Defense" },
     { label: "Kicker (K)", category: "Special Teams" },
     { label: "Punter (P)", category: "Special Teams" },
     { label: "Athlete (ATH)", category: "Versatile" },
  ],
  basketball: [
     { label: "Point Guard (PG)", category: "Guards" },
     { label: "Shooting Guard (SG)", category: "Guards" },
     { label: "Small Forward (SF)", category: "Forwards" },
     { label: "Power Forward (PF)", category: "Forwards" },
     { label: "Center (C)", category: "Centers" },
  ],
  soccer: [
     { label: "Goalkeeper (GK)", category: "Goalkeeper" },
     { label: "Center Back (CB)", category: "Defense" },
     { label: "Left Back (LB)", category: "Defense" },
     { label: "Right Back (RB)", category: "Defense" },
     { label: "Central Midfielder (CM)", category: "Midfield" },
     { label: "Striker (ST)", category: "Attack" },
  ],
  baseball: [
     { label: "Pitcher (P)", category: "Battery" },
     { label: "Catcher (C)", category: "Battery" },
     { label: "First Base (1B)", category: "Infield" },
      { label: "Shortstop (SS)", category: "Infield" },
      { label: "Left Field (LF)", category: "Outfield" },
      { label: "Center Field (CF)", category: "Outfield" },
   ],
   "track-field": [
      { label: "100m Sprinter", category: "Sprints" },
      { label: "400m Sprinter", category: "Sprints" },
      { label: "800m Runner", category: "Middle Distance" },
      { label: "1600m Runner", category: "Distance" },
      { label: "Long Jump", category: "Jumps" },
      { label: "Shot Put", category: "Throws" },
   ],
   lacrosse: [
      { label: "Attack", category: "Offense" },
      { label: "Midfield", category: "Midfield" },
      { label: "Defense (Long Stick)", category: "Defense" },
      { label: "Goalie", category: "Goalie" },
   ],
   golf: [{ label: "Golfer", category: "General" }],
   volleyball: [
      { label: "Setter", category: "Setters" },
      { label: "Outside Hitter (OH)", category: "Hitters" },
      { label: "Middle Blocker (MB)", category: "Hitters" },
      { label: "Libero", category: "Defense" },
   ],
   swimming: [
      { label: "Freestyle Sprinter (50/100)", category: "Freestyle" },
      { label: "Backstroke", category: "Stroke" },
      { label: "Breaststroke", category: "Stroke" },
      { label: "Butterfly", category: "Stroke" },
      { label: "Individual Medley (IM)", category: "IM" },
   ],
   softball: [
      { label: "Pitcher (P)", category: "Battery" },
      { label: "Catcher (C)", category: "Battery" },
      { label: "Shortstop (SS)", category: "Infield" },
      { label: "Left Field (LF)", category: "Outfield" },
   ],
   hockey: [
      { label: "Center (C)", category: "Forwards" },
      { label: "Left Wing (LW)", category: "Forwards" },
      { label: "Right Wing (RW)", category: "Forwards" },
      { label: "Left Defense (LD)", category: "Defense" },
      { label: "Goalie (G)", category: "Goalie" },
   ],
   cheerleading: [
      { label: "Flyer", category: "Stunts" },
      { label: "Main Base", category: "Stunts" },
      { label: "Tumbler", category: "Tumbling" },
      { label: "All-Around", category: "Versatile" },
   ],
   wrestling: [
      { label: "106 lbs", category: "Lightweight" },
      { label: "132 lbs", category: "Lightweight" },
      { label: "152 lbs", category: "Middleweight" },
      { label: "175 lbs", category: "Heavyweight" },
      { label: "285 lbs (Heavyweight)", category: "Heavyweight" },
   ],
};

export const SPORT_TRAITS: Record<string, string[]> = {
   football: ["Speed", "Strength", "Agility", "Power", "Explosiveness", "Ball Skills", "Route Running", "Blocking", "Tackling", "Coverage", "Vision", "Footwork", "Arm Strength", "Accuracy"],
   basketball: ["Scoring", "Shooting", "Ball Handling", "Passing", "Court Vision", "Rebounding", "Defense", "Athleticism", "Speed", "Vertical"],
   soccer: ["Speed", "Dribbling", "Passing", "Shooting", "Vision", "First Touch", "Tackling", "Positioning", "Stamina"],
   baseball: ["Bat Speed", "Power", "Contact", "Speed", "Arm Strength", "Fielding", "Range", "Fastball Velocity", "Command"],
   "track-field": ["Explosive Start", "Top-End Speed", "Speed Endurance", "Technique", "Mental Toughness", "Power"],
   lacrosse: ["Stick Skills", "Shooting", "Dodging", "Ground Balls", "Speed", "Agility", "Vision"],
   golf: ["Driving Distance", "Driving Accuracy", "Iron Play", "Short Game", "Putting", "Course Management", "Mental Game"],
   volleyball: ["Hitting Power", "Blocking", "Serving", "Passing", "Setting", "Digging", "Court Awareness"],
   swimming: ["Underwater Speed", "Starts", "Turns", "Stroke Technique", "Endurance", "Sprint Speed"],
   softball: ["Bat Speed", "Power", "Speed", "Arm Strength", "Fielding", "Pitch Velocity", "Command"],
   hockey: ["Skating Speed", "Stickhandling", "Shooting", "Passing", "Vision", "Hockey IQ", "Checking"],
   cheerleading: ["Flexibility", "Tumbling", "Stunting", "Jumps", "Dance", "Strength", "Balance"],
   wrestling: ["Takedowns", "Escapes", "Reversals", "Riding", "Hand Fighting", "Sprawl", "Conditioning"],
};

export type RadarAxis =
  | "Speed" | "Power" | "Skill" | "Endurance" | "Size" | "Length"
  | "Explosiveness" | "Upper Body" | "Lower Body"
  | "Scoring" | "Playmaking" | "Rebounding" | "Defense" | "Vertical" | "Wingspan"
  | "Pace" | "Finishing" | "Passing" | "Defending" | "Stamina"
  | "Hitting" | "Arm Strength" | "Fielding" | "Pitching"
  | "Ground Game" | "Shot Power"
  | "Attack" | "Setting" | "Blocking" | "Serving"
  | "Discipline" | "Goaltending" | "Skating"
  | "Accuracy" | "Approach" | "Short Game" | "Mental Game"
  | "Win Rate" | "Pinning" | "Technique" | "Takedowns" | "Conditioning" | "Achievement"
  | "Tumbling" | "Stunting" | "Jumps" | "Flexibility" | "Performance" | "Experience"
  | "Consistency" | "Versatility"
  | "Sprint Speed" | "Stroke Versatility";

export interface SportMetric {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
  /** Higher is better unless inverse=true (used for time-based metrics) */
  inverse?: boolean;
  /** Elite benchmark used by the radar to compute percentile */
  benchmark?: number;
  /** Which radar axis this metric contributes to */
  radarAxis?: RadarAxis;
}

export const SPORT_METRICS: Record<string, SportMetric[]> = {
  football: [
     { key: "forty_yard", label: "40-Yard Dash (sec)", placeholder: "4.5", hint: "Time in seconds", inverse: true, benchmark: 4.4, radarAxis: "Speed" },
     { key: "vertical", label: "Vertical Jump (in)", placeholder: "32", hint: "Height in inches", benchmark: 40, radarAxis: "Explosiveness" },
     { key: "bench_press", label: "Bench Press (reps @ 225)", placeholder: "20", hint: "Reps at 225 lbs", benchmark: 25, radarAxis: "Upper Body" },
     { key: "squat", label: "Squat Max (lbs)", placeholder: "450", hint: "1-rep max", benchmark: 500, radarAxis: "Lower Body" },
     { key: "arm_length", label: "Arm Length (in)", placeholder: "33", hint: "Inches", benchmark: 33, radarAxis: "Length" },
     { key: "broad_jump", label: "Broad Jump (in)", placeholder: "120", hint: "Inches", benchmark: 125, radarAxis: "Explosiveness" },
     { key: "shuttle", label: "Shuttle 5-10-5 (sec)", placeholder: "4.2", hint: "Seconds", inverse: true, benchmark: 4.1, radarAxis: "Speed" },
  ],
  basketball: [
     { key: "ppg", label: "Points Per Game", placeholder: "18.5", hint: "Season avg", benchmark: 25, radarAxis:"Scoring" },
     { key: "rpg", label: "Rebounds Per Game", placeholder: "7.2", hint: "Season avg", benchmark: 10, radarAxis: "Rebounding" },
     { key: "apg", label: "Assists Per Game", placeholder: "4.5", hint: "Season avg", benchmark: 8, radarAxis:"Playmaking" },
     { key: "spg", label: "Steals Per Game", placeholder: "1.8", hint: "Season avg", benchmark: 3, radarAxis: "Defense" },
     { key: "vertical", label: "Vertical Jump (in)", placeholder: "32", hint: "Inches", benchmark: 38, radarAxis: "Vertical" },
     { key: "wingspan", label: "Wingspan (in)", placeholder: "78", hint: "Inches", benchmark: 82, radarAxis: "Wingspan" },
     { key: "standing_reach", label: "Standing Reach (in)", placeholder: "100", hint: "Inches", benchmark: 105,radarAxis: "Wingspan" },
  ],
  soccer: [
     { key: "goals", label: "Goals", placeholder: "15", hint: "Season total", benchmark: 20, radarAxis: "Finishing" },
     { key: "assists", label: "Assists", placeholder: "12", hint: "Season total", benchmark: 15, radarAxis: "Passing" },
     { key: "clean_sheets", label: "Clean Sheets (GK)", placeholder: "8", hint: "Season total", benchmark: 10,radarAxis: "Defending" },
     { key: "save_pct", label: "Save % (GK)", placeholder: "75", hint: "Percentage", benchmark: 80, radarAxis:"Defending" },
     { key: "minutes_played", label: "Minutes Played", placeholder: "1800", hint: "Season total", benchmark: 2200, radarAxis: "Stamina" },
     { key: "forty_yard", label: "40-Yard Sprint (sec)", placeholder: "4.6", hint: "Seconds", inverse: true, benchmark: 4.5, radarAxis: "Pace" },
     { key: "vertical", label: "Vertical Jump (in)", placeholder: "28", hint: "Inches", benchmark: 32, radarAxis: "Skill" },
  ],
  baseball: [
     { key: "batting_avg", label: "Batting Average", placeholder: ".350", hint: "Season avg", benchmark: 0.4, radarAxis: "Hitting" },
     { key: "home_runs", label: "Home Runs", placeholder: "12", hint: "Season total", benchmark: 15, radarAxis:"Power" },
     { key: "rbi", label: "RBI", placeholder: "45", hint: "Season total", benchmark: 60, radarAxis: "Hitting" },
     { key: "ops", label: "OPS", placeholder: "1.050", hint: "On-base + slugging", benchmark: 1.1, radarAxis: "Hitting" },
     { key: "era", label: "ERA (Pitchers)", placeholder: "2.50", hint: "Earned run avg", inverse: true, benchmark: 1.5, radarAxis: "Pitching" },
     { key: "fastball_velo", label: "Fastball Velocity (mph)", placeholder: "88", hint: "Top mph", benchmark: 92, radarAxis: "Pitching" },
     { key: "sixty_yard", label: "60-Yard Dash (sec)", placeholder: "6.8", hint: "Seconds", inverse: true, benchmark: 6.5, radarAxis: "Speed" },
     { key: "exit_velo", label: "Exit Velocity (mph)", placeholder: "92", hint: "Top mph", benchmark: 98, radarAxis: "Power" },
     { key: "pop_time", label: "Pop Time (Catcher, sec)", placeholder: "1.95", hint: "Seconds", inverse: true,benchmark: 1.85, radarAxis: "Arm Strength" },
  ],
  softball: [
     { key: "batting_avg", label: "Batting Average", placeholder: ".425", hint: "Season avg", benchmark: 0.45,radarAxis: "Hitting" },
     { key: "home_runs", label: "Home Runs", placeholder: "8", hint: "Season total", benchmark: 12, radarAxis:"Power" },
     { key: "rbi", label: "RBI", placeholder: "35", hint: "Season total", benchmark: 50, radarAxis: "Hitting" },
     { key: "stolen_bases", label: "Stolen Bases", placeholder: "20", hint: "Season total", benchmark: 30, radarAxis: "Speed" },
     { key: "era", label: "ERA (Pitchers)", placeholder: "1.85", hint: "Earned run avg", inverse: true, benchmark: 1.0, radarAxis: "Pitching" },
     { key: "pitch_speed", label: "Pitch Speed (mph)", placeholder: "62", hint: "Top mph", benchmark: 68, radarAxis: "Pitching" },
     { key: "sixty_yard", label: "60-Yard Dash (sec)", placeholder: "8.2", hint: "Seconds", inverse: true, benchmark: 7.8, radarAxis: "Speed" },
     { key: "pop_time", label: "Pop Time (Catcher, sec)", placeholder: "2.1", hint: "Seconds", inverse: true, benchmark: 1.95, radarAxis: "Arm Strength" },
  ],
  lacrosse: [
     { key: "goals", label: "Goals", placeholder: "45", hint: "Season total", benchmark: 60, radarAxis: "Scoring" },
     { key: "assists", label: "Assists", placeholder: "32", hint: "Season total", benchmark: 45, radarAxis: "Playmaking" },
     { key: "ground_balls", label: "Ground Balls", placeholder: "65", hint: "Season total", benchmark: 90, radarAxis: "Ground Game" },
     { key: "save_pct", label: "Save % (Goalie)", placeholder: "60", hint: "Percentage", benchmark: 65, radarAxis: "Defense" },
     { key: "faceoff_pct", label: "Faceoff Win % (FOGO)", placeholder: "55", hint: "Percentage", benchmark: 65,radarAxis: "Ground Game" },
     { key: "shot_speed", label: "Shot Speed (mph)", placeholder: "85", hint: "Top mph", benchmark: 95, radarAxis: "Shot Power" },
     { key: "forty_yard", label: "40-Yard Dash (sec)", placeholder: "4.7", hint: "Seconds", inverse: true, benchmark: 4.5, radarAxis: "Speed" },
  ],
  volleyball: [
     { key: "kills", label: "Kills", placeholder: "350", hint: "Season total", benchmark: 450, radarAxis: "Attack" },
     { key: "assists", label: "Assists", placeholder: "200", hint: "Season total", benchmark: 600, radarAxis: "Setting" },
     { key: "blocks", label: "Blocks", placeholder: "60", hint: "Season total", benchmark: 100, radarAxis: "Blocking" },
     { key: "digs", label: "Digs", placeholder: "250", hint: "Season total", benchmark: 350, radarAxis: "Defense" },
     { key: "aces", label: "Aces", placeholder: "40", hint: "Season total", benchmark: 60, radarAxis: "Serving"},
     { key: "hitting_pct", label: "Hitting Percentage", placeholder: ".320", hint: "Season avg", benchmark: 0.4, radarAxis: "Attack" },
     { key: "approach_jump", label: "Approach Jump (in)", placeholder: "28", hint: "Inches", benchmark: 32, radarAxis: "Vertical" },
     { key: "block_jump", label: "Block Jump (in)", placeholder: "26", hint: "Inches", benchmark: 30, radarAxis: "Vertical" },
  ],
  hockey: [
     { key: "goals", label: "Goals", placeholder: "25", hint: "Season total", benchmark: 35, radarAxis: "Scoring" },
     { key: "assists", label: "Assists", placeholder: "35", hint: "Season total", benchmark: 50, radarAxis: "Playmaking" },
     { key: "points", label: "Points", placeholder: "60", hint: "G + A", benchmark: 80, radarAxis: "Scoring" },
     { key: "plus_minus", label: "+/-", placeholder: "+15", hint: "Season +/-", benchmark: 25, radarAxis: "Defense" },
     { key: "pim", label: "PIM (Penalty Min)", placeholder: "20", hint: "Lower is better", inverse: true, benchmark: 10, radarAxis: "Discipline" },
     { key: "save_pct", label: "Save % (Goalie)", placeholder: "92", hint: "Percentage", benchmark: 93, radarAxis: "Goaltending" },
     { key: "gaa", label: "GAA (Goalie)", placeholder: "2.5", hint: "Goals against avg", inverse: true, benchmark: 2.0, radarAxis: "Goaltending" },
     { key: "skating_speed", label: "Skating Speed (mph)", placeholder: "22", hint: "Top mph", benchmark: 25, radarAxis: "Skating" },
  ],
  golf: [
      { key: "handicap", label: "Handicap Index", placeholder: "2.5", hint: "Lower is better", inverse: true, benchmark: 0, radarAxis: "Scoring" },
      { key: "scoring_avg", label: "Scoring Average", placeholder: "72.5", hint: "Lower is better", inverse: true, benchmark: 70, radarAxis: "Scoring" },
      { key: "driving_distance", label: "Driving Distance (yds)", placeholder: "280", hint: "Average yards", benchmark: 300, radarAxis: "Power" },
      { key: "driving_accuracy", label: "Driving Accuracy %", placeholder: "65", hint: "Fairways hit %", benchmark: 75, radarAxis: "Accuracy" },
      { key: "gir_pct", label: "GIR %", placeholder: "60", hint: "Greens in regulation", benchmark: 70, radarAxis: "Approach" },
      { key: "putts_per_round", label: "Putts/Round", placeholder: "30", hint: "Lower is better", inverse: true,benchmark: 28, radarAxis: "Short Game" },
      { key: "best_finish", label: "Best Tournament Finish", placeholder: "T-3", hint: "Best result", radarAxis:"Mental Game" },
   ],
   wrestling: [
      { key: "career_record", label: "Career Record (W-L)", placeholder: "85-12", hint: "Wins-Losses", radarAxis: "Win Rate" },
      { key: "season_record", label: "Season Record", placeholder: "32-3", hint: "Wins-Losses", radarAxis: "WinRate" },
      { key: "pins", label: "Pins", placeholder: "25", hint: "Season total", benchmark: 30, radarAxis: "Pinning"},
      { key: "tech_falls", label: "Tech Falls", placeholder: "8", hint: "Season total", benchmark: 12, radarAxis: "Technique" },
      { key: "major_decisions", label: "Major Decisions", placeholder: "10", hint: "Season total", benchmark: 15, radarAxis: "Technique" },
      { key: "takedowns", label: "Takedowns", placeholder: "120", hint: "Season total", benchmark: 180, radarAxis: "Takedowns" },
      { key: "weight_class", label: "Weight Class (lbs)", placeholder: "152", hint: "Lbs", radarAxis: "Conditioning" },
      { key: "state_placement", label: "State Placement", placeholder: "2nd", hint: "Best finish", radarAxis: "Achievement" },
   ],
   cheerleading: [
      { key: "tumbling_level", label: "Tumbling Level", placeholder: "5", hint: "USASF level 1-6", benchmark: 6,radarAxis: "Tumbling" },
      { key: "standing_tumbling", label: "Standing Tumbling", placeholder: "Standing Full", hint: "Highest skill", radarAxis: "Tumbling" },
      { key: "running_tumbling", label: "Running Tumbling", placeholder: "Running Double", hint: "Highest skill", radarAxis: "Tumbling" },
      { key: "stunt_level", label: "Stunt Level", placeholder: "5", hint: "USASF level 1-6", benchmark: 6, radarAxis: "Stunting" },
      { key: "jump_height", label: "Jump Height (in)", placeholder: "24", hint: "Inches", benchmark: 30, radarAxis: "Jumps" },
      { key: "flexibility", label: "Flexibility (Splits)", placeholder: "All splits", hint: "Y/Description", radarAxis: "Flexibility" },
      { key: "years_experience", label: "Years of Experience", placeholder: "8", hint: "Years", benchmark: 10, radarAxis: "Experience" },
   ],
   // Track & Field and Swimming use SPORT_EVENT_CATALOG instead — see below
   "track-field": [],
   swimming: [],
};

// ============================================================================
// Event-based sports: athletes select events and enter per-event data
// ============================================================================

export interface SportEventOption {
   key: string;
   label: string;
   /** Format hint for the PB/season-best inputs */
   format?: "time" | "distance" | "height" | "score";
   /** Elite benchmark for radar scoring (lower-is-better for time-based) */
   benchmark?: number;
   /** Maps to a radar axis */
   radarAxis?: RadarAxis;
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
            { key: "800m", label: "800m", format: "time", benchmark: 110, radarAxis: "Endurance", hasSplits: true},
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
            { key: "4x100", label: "4x100m", format: "time", benchmark: 41.0, radarAxis: "Speed", hasSplits: true},
            { key: "4x200", label: "4x200m", format: "time", benchmark: 89.0, radarAxis: "Speed", hasSplits: true},
            { key: "4x400", label: "4x400m", format: "time", benchmark: 200.0, radarAxis: "Endurance", hasSplits:true },
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
            { key: "100_back", label: "100 Back", format: "time", benchmark: 50.0, radarAxis: "Stroke Versatility"},
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
            { key: "400_im", label: "400 IM", format: "time", benchmark: 240.0, radarAxis: "Endurance", hasSplits:true },
         ],
      },
      {
         key: "relays", label: "Relays",
         events: [
            { key: "200_free_relay", label: "200 Free Relay", format: "time", benchmark: 86.0, radarAxis: "SprintSpeed", hasSplits: true },
            { key: "400_free_relay", label: "400 Free Relay", format: "time", benchmark: 190.0, radarAxis: "SprintSpeed", hasSplits: true },
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

export const findEventOption = (sport: string, eventKey: string): { category: SportEventCategory; event: SportEventOption } | null => {
   const cats = getEventCatalogForSport(sport);
   for (const c of cats) {
      const e = c.events.find(ev => ev.key === eventKey);
     if (e) return { category: c, event: e };
   }
   return null;
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

export const getPositionCategories = (sport: string): string[] => {
   const positions = getPositionsForSport(sport);
   return [...new Set(positions.map(p => p.category))];
};
