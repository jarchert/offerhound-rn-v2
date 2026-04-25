// Ported verbatim from Lovable src/lib/data/campManagerSports.ts.
// Pure data + types; no web/RN-specific code, identical to source.
// =============================================================================
// Camp Manager — single source of truth for sport configuration.
//
// To add a new supported sport in the Coach Camp Manager:
//   1) Add the sport id to CAMP_MANAGER_SUPPORTED_SPORTS (must match a
//      SportType in src/lib/data/sports.ts).
//   2) Add an entry to CAMP_SPORT_STAT_FOCUS describing the public-page
//      stat-focus label and a short list of recruiting categories.
//   3) Add an entry to CAMP_SPORT_METRICS describing the measurable metrics
//      coaches should record at camps for that sport. Every UI surface that
//      records or renders camp stats reads from these maps so future sports
//      "just work" without editing component code.
// =============================================================================
import type { SportType } from "@/lib/data/sports";

/** Sports currently supported by the Coach Camp Manager. */
export const CAMP_MANAGER_SUPPORTED_SPORTS: SportType[] = [
  "football",
  "basketball",
  "baseball",
  "soccer",
  "volleyball",
  "track-field",
];

export function isCampManagerSupported(sport?: string | null): boolean {
  if (!sport) return false;
  return CAMP_MANAGER_SUPPORTED_SPORTS.includes(sport as SportType);
}

// ─── Public stat-focus hints ────────────────────────────────────────────────
export const CAMP_SPORT_STAT_FOCUS: Record<string, { label: string; stats: string[] }> = {
  football: {
    label: "Combine metrics",
    stats: ["40-yard dash", "Vertical jump", "Broad jump", "Shuttle 5-10-5", "3-cone drill", "Bench press"],
  },
  basketball: {
    label: "Athletic + skill metrics",
    stats: ["Vertical jump", "Wingspan", "Lane agility", "3/4 court sprint", "Shooting %", "PPG / RPG / APG"],
  },
  baseball: {
    label: "Showcase metrics",
    stats: ["60-yard dash", "Exit velocity", "Pop time", "Fastball velocity", "Pitch spin rate", "Batting AVG"],
  },
  soccer: {
    label: "Match + athletic metrics",
    stats: ["40m sprint", "Vertical jump", "Yo-Yo IR1", "Goals / Assists", "Pass accuracy", "Clean sheets"],
  },
  volleyball: {
    label: "Athletic + skill metrics",
    stats: ["Approach jump", "Block jump", "Reach", "Kills", "Blocks", "Digs"],
  },
  "track-field": {
    label: "Performance metrics",
    stats: ["100m dash", "200m dash", "400m dash", "Long jump", "Shot put", "Discus"],
  },
};

// ─── Measurable metric definitions (for capture UI) ─────────────────────────
export interface CampSportMetric {
  key: string;
  label: string;
  unit: string;
  lowerIsBetter?: boolean;
  step?: number;
  placeholder?: string;
}

export const CAMP_SPORT_METRICS: Record<string, CampSportMetric[]> = {
  football: [
    { key: "forty_yard_dash", label: "40-Yard Dash", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "4.55" },
    { key: "shuttle_5_10_5", label: "5-10-5 Shuttle", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "4.20" },
    { key: "three_cone_drill", label: "3-Cone Drill", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "6.90" },
    { key: "vertical_jump", label: "Vertical Jump", unit: "in", step: 0.5, placeholder: "34.5" },
    { key: "broad_jump", label: "Broad Jump", unit: "in", step: 0.5, placeholder: "118" },
    { key: "bench_press_reps", label: "Bench Press (225 lbs)", unit: "reps", step: 1, placeholder: "12" },
  ],
  basketball: [
    { key: "vertical_jump", label: "Vertical Jump", unit: "in", step: 0.5, placeholder: "32" },
    { key: "three_quarter_sprint", label: "3/4 Court Sprint", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "3.20" },
    { key: "lane_agility", label: "Lane Agility", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "10.80" },
    { key: "shuttle_5_10_5", label: "5-10-5 Shuttle", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "4.30" },
    { key: "max_reach", label: "Max Reach", unit: "in", step: 0.5, placeholder: "108" },
    { key: "shooting_pct", label: "Shooting %", unit: "%", step: 0.1, placeholder: "47.5" },
  ],
  baseball: [
    { key: "sixty_yard_dash", label: "60-Yard Dash", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "6.85" },
    { key: "exit_velocity_mph", label: "Exit Velocity", unit: "mph", step: 0.1, placeholder: "92" },
    { key: "fastball_velocity_mph", label: "Fastball Velocity", unit: "mph", step: 0.1, placeholder: "88" },
    { key: "pop_time_sec", label: "Pop Time", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "1.95" },
    { key: "infield_velocity_mph", label: "Infield Velocity", unit: "mph", step: 0.1, placeholder: "82" },
    { key: "outfield_velocity_mph", label: "Outfield Velocity", unit: "mph", step: 0.1, placeholder: "85" },
  ],
  soccer: [
    { key: "forty_meter_sprint", label: "40m Sprint", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "5.00" },
    { key: "vertical_jump", label: "Vertical Jump", unit: "in", step: 0.5, placeholder: "26" },
    { key: "yo_yo_ir1_level", label: "Yo-Yo IR1 Level", unit: "lvl", step: 0.1, placeholder: "19.6" },
    { key: "max_kick_distance_yd", label: "Max Kick Distance", unit: "yd", step: 1, placeholder: "55" },
    { key: "shuttle_5_10_5", label: "5-10-5 Shuttle", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "4.30" },
    { key: "ball_juggling_count", label: "Ball Juggling (max consecutive)", unit: "reps", step: 1, placeholder: "150" },
  ],
  volleyball: [
    { key: "approach_jump", label: "Approach Jump", unit: "in", step: 0.5, placeholder: "30" },
    { key: "block_jump", label: "Block Jump", unit: "in", step: 0.5, placeholder: "26" },
    { key: "max_reach", label: "Max Reach (standing)", unit: "in", step: 0.5, placeholder: "84" },
    { key: "spike_velocity_mph", label: "Spike Velocity", unit: "mph", step: 0.1, placeholder: "55" },
    { key: "serve_velocity_mph", label: "Serve Velocity", unit: "mph", step: 0.1, placeholder: "50" },
    { key: "shuttle_5_10_5", label: "5-10-5 Shuttle", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "4.40" },
  ],
  "track-field": [
    { key: "hundred_meter", label: "100m", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "10.95" },
    { key: "two_hundred_meter", label: "200m", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "22.10" },
    { key: "four_hundred_meter", label: "400m", unit: "sec", lowerIsBetter: true, step: 0.01, placeholder: "49.20" },
    { key: "long_jump", label: "Long Jump", unit: "m", step: 0.01, placeholder: "7.10" },
    { key: "shot_put", label: "Shot Put", unit: "m", step: 0.01, placeholder: "16.50" },
    { key: "high_jump", label: "High Jump", unit: "m", step: 0.01, placeholder: "2.05" },
  ],
};

export function getCampSportMetrics(sport?: string | null): CampSportMetric[] {
  if (!sport) return [];
  return CAMP_SPORT_METRICS[sport] || [];
}

export const CAMP_PERF_COLUMN_METRICS = new Set<string>([
  "forty_yard_dash",
  "shuttle_5_10_5",
  "three_cone_drill",
  "vertical_jump",
  "broad_jump",
]);

export const CAMP_HERO_IMAGE_RULES = {
  maxSize: 10 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  minAspectRatio: 16 / 9,
  maxAspectRatio: 16 / 5,
  minWidth: 800,
} as const;
