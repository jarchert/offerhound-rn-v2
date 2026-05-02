// Parity port from Lovable src/hooks/useLetterCenter.ts.
// Web→RN mapping:
//   - react-router-dom `useNavigate()` → @react-navigation/native
//     `useNavigation<NavigationProp<RootStackParamList>>()`.
//   - URL navigation (`navigate('/coach/letters?recipientCategory=...')`) is
//     replaced by per-role nested `navigation.navigate('<RoleTabs>', { screen:
//     'LettersTab', params: prefill })` using the same role-resolution logic so
//     the user lands on the role-appropriate Letter Center.
//   - `window.setTimeout` → `setTimeout` (no `window` in RN).
//   - `URLSearchParams` is unavailable in some RN engines and route params
//     arrive as a plain object; `sanitizeLetterPrefill` therefore accepts
//     either `URLSearchParams` or `Record<string, any>` while preserving the
//     web validation logic verbatim.
//   - `trackEvent` is sourced from `@/hooks/useConsentAwareAnalytics` (the RN
//     home for the helper); call semantics are identical.
//
// All other logic (role detection, click dedup/throttle, supabase insert into
// `letter_button_clicks`, prefill builder, override resolution) is preserved
// verbatim from the web hook.

import { useCallback, useMemo, useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useCoachProfile } from "@/hooks/useCoachProfile";
import { useScoutProfile } from "@/hooks/useScoutProfile";
import { useHSCoachProfile } from "@/hooks/useHSCoachProfile";
import { trackEvent } from "@/hooks/useConsentAwareAnalytics";
import { supabase } from "@/integrations/supabase/client";

/**
 * useLetterCenter
 *
 * Single source of truth for routing the platform's "Letter" buttons
 * (player cards, public profile, dashboards) to the correct AI Letter
 * Center based on the *viewer's* role.
 *
 * Resolution priority (most specific role first):
 *   1. High School Coach  -> /hs-coach/letters
 *   2. Club Coach         -> /club/letters
 *   3. College Coach      -> /coach/letters
 *   4. Scout              -> /scout/letters
 *   5. Athlete / fallback -> /letters
 */
export type AthleteLike = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  school?: string | null;
};

export type RecipientCategory =
  | "athlete"
  | "parent"
  | "college-coach"
  | "club-coach"
  | "scout"
  | "hs-coach"
  | "influencer";

export type RecipientType = "athlete" | "parent" | "coach";

export const VALID_RECIPIENT_CATEGORIES: ReadonlySet<RecipientCategory> =
  new Set([
    "athlete",
    "parent",
    "college-coach",
    "club-coach",
    "scout",
    "hs-coach",
    "influencer",
  ]);
export const VALID_RECIPIENT_TYPES: ReadonlySet<RecipientType> = new Set([
  "athlete",
  "parent",
  "coach",
]);

/** Letter types we expose to override pickers (LetterButton popover). */
export const VALID_LETTER_TYPES: ReadonlySet<string> = new Set([
  "initial-interest",
  "follow-up",
  "camp-invitation",
  "scholarship-offer",
  "thank-you",
  "introduction",
]);

const DEFAULT_LETTER_TYPE_BY_CATEGORY: Record<RecipientCategory, string> = {
  "athlete": "initial-interest",
  "parent": "initial-interest",
  "college-coach": "initial-interest",
  "club-coach": "initial-interest",
  "scout": "initial-interest",
  "hs-coach": "initial-interest",
  "influencer": "initial-interest",
};

const CATEGORY_TO_RECIPIENT_TYPE: Record<RecipientCategory, RecipientType> = {
  "athlete": "athlete",
  "parent": "parent",
  "college-coach": "coach",
  "club-coach": "coach",
  "scout": "coach",
  "hs-coach": "coach",
  "influencer": "coach",
};

export interface LetterCenterOverrides {
  recipientCategory?: RecipientCategory;
  recipientType?: RecipientType;
  letterType?: string;
  organizationName?: string | null;
  surface?: string;
}

function clean(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = String(value).replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanEmail(value: unknown): string | undefined {
  const v = clean(value);
  if (!v) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return undefined;
  return v.toLowerCase();
}

function buildCleanParams(
  params: Record<string, string | null | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(params)) {
    if (raw === null || raw === undefined) continue;
    const value = String(raw).trim();
    if (!value) continue;
    out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------
// Click dedup / throttle for analytics inserts.
// Keyed by surface+viewerRole+recipient* so the *same* logical
// click only persists once per CLICK_DEDUP_WINDOW_MS. Prevents
// rapid double-clicks (impatient users / accidental React re-fires)
// from spamming `letter_button_clicks` and breaking RLS rate limits.
// Module-scoped so it survives across components in the same tab.
// ---------------------------------------------------------------
const CLICK_DEDUP_WINDOW_MS = 5000;
const recentClicks: Map<string, number> = new Map();

function shouldRecordClick(key: string): boolean {
  const now = Date.now();
  // Sweep stale entries opportunistically.
  if (recentClicks.size > 64) {
    for (const [k, t] of recentClicks) {
      if (now - t > CLICK_DEDUP_WINDOW_MS) recentClicks.delete(k);
    }
  }
  const last = recentClicks.get(key);
  if (last !== undefined && now - last < CLICK_DEDUP_WINDOW_MS) return false;
  recentClicks.set(key, now);
  return true;
}

/**
 * Server-safe sanitizer used by both the click builder *and* by
 * `LetterDashboard` when reading the incoming route params. Exported
 * so the destination screen can guard against malformed/garbage values.
 *
 * Web parity: accepts `URLSearchParams`. RN navigation params arrive as a
 * plain object, so we also accept `Record<string, any>` and read keys
 * uniformly. Validation logic is preserved verbatim.
 */
export function sanitizeLetterPrefill(
  params: URLSearchParams | Record<string, any> | null | undefined
) {
  const get = (key: string): string => {
    if (!params) return "";
    if (typeof (params as URLSearchParams).get === "function") {
      return (params as URLSearchParams).get(key) || "";
    }
    const v = (params as Record<string, any>)[key];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  const rawCategory = get("recipientCategory");
  const rawType = get("recipientType");
  const rawLetterType = get("letterType");

  const recipientCategory: RecipientCategory | undefined =
    VALID_RECIPIENT_CATEGORIES.has(rawCategory as RecipientCategory)
      ? (rawCategory as RecipientCategory)
      : undefined;

  const recipientType: RecipientType | undefined = VALID_RECIPIENT_TYPES.has(
    rawType as RecipientType
  )
    ? (rawType as RecipientType)
    : recipientCategory
    ? CATEGORY_TO_RECIPIENT_TYPE[recipientCategory]
    : undefined;

  const letterType =
    clean(rawLetterType) ||
    (recipientCategory
      ? DEFAULT_LETTER_TYPE_BY_CATEGORY[recipientCategory]
      : undefined);

  const recipientName =
    clean(get("recipientName")) ||
    clean(get("athleteName")) ||
    clean(get("coachName"));

  const recipientEmail =
    cleanEmail(get("recipientEmail")) ||
    cleanEmail(get("athleteEmail")) ||
    cleanEmail(get("coachEmail"));

  const organizationName =
    clean(get("organizationName")) || clean(get("coachSchool"));

  const recipientTitle =
    clean(get("recipientTitle")) || clean(get("coachTitle"));

  return {
    recipientCategory,
    recipientType,
    letterType,
    recipientName,
    recipientEmail,
    organizationName,
    recipientTitle,
  };
}

// Map the resolved web letter-center path to the matching RN nested route.
// Keeps the per-role routing semantics of the web hook intact.
// Drawer navigators use 'Letters' screen name; AthleteTabs keeps 'LettersTab'.
type LetterRoute = {
  parent: string;
  screen: string;
};

function letterRouteForPath(path: string): LetterRoute {
  switch (path) {
    case "/hs-coach/letters":
      return { parent: "HSCoachDrawer", screen: "Letters" };
    case "/club/letters":
      return { parent: "ClubCoachDrawer", screen: "Letters" };
    case "/coach/letters":
      return { parent: "CoachDrawer", screen: "Letters" };
    case "/scout/letters":
      return { parent: "ScoutDrawer", screen: "Letters" };
    case "/letters":
    default:
      return { parent: "AthleteTabs", screen: "LettersTab" };
  }
}

export function useLetterCenter() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();

  const [isNavigating, setIsNavigating] = useState(false);

  const isHSCoach = !!hsCoachProfile;
  const isClubCoach = !!(coachProfile as any)?.is_club_coach;
  const isCollegeCoach = !!coachProfile && !isClubCoach;
  const isScout = !!scoutProfile;

  const viewerRole = useMemo(() => {
    if (isHSCoach) return "hs-coach";
    if (isClubCoach) return "club-coach";
    if (isCollegeCoach) return "college-coach";
    if (isScout) return "scout";
    return "athlete";
  }, [isHSCoach, isClubCoach, isCollegeCoach, isScout]);

  const letterCenter = useMemo(() => {
    if (isHSCoach) return "/hs-coach/letters";
    if (isClubCoach) return "/club/letters";
    if (isCollegeCoach) return "/coach/letters";
    if (isScout) return "/scout/letters";
    return "/letters";
  }, [isHSCoach, isClubCoach, isCollegeCoach, isScout]);

  const buildAthleteLetterPrefill = useCallback(
    (
      athlete: AthleteLike | null | undefined,
      overrides: LetterCenterOverrides | string = {}
    ) => {
      const opts: LetterCenterOverrides =
        typeof overrides === "string" ? { letterType: overrides } : overrides;

      const recipientCategory: RecipientCategory =
        opts.recipientCategory && VALID_RECIPIENT_CATEGORIES.has(opts.recipientCategory)
          ? opts.recipientCategory
          : "athlete";

      const recipientType: RecipientType =
        opts.recipientType && VALID_RECIPIENT_TYPES.has(opts.recipientType)
          ? opts.recipientType
          : CATEGORY_TO_RECIPIENT_TYPE[recipientCategory];

      const letterType =
        clean(opts.letterType) ?? DEFAULT_LETTER_TYPE_BY_CATEGORY[recipientCategory];

      const recipientName = clean(athlete?.full_name);
      const recipientEmail = cleanEmail(athlete?.email);
      const organizationName =
        opts.organizationName !== undefined
          ? clean(opts.organizationName)
          : clean(athlete?.school);

      return buildCleanParams({
        recipientCategory,
        recipientType,
        recipientName: recipientName ?? "",
        recipientEmail: recipientEmail ?? "",
        organizationName: organizationName ?? "",
        letterType: letterType ?? "",
      });
    },
    []
  );

  // Web-parity helper: returns a path+query string for the resolved letter
  // center. Kept for any caller that wants to render a deep link or share URL.
  const buildAthleteLetterUrl = useCallback(
    (
      athlete: AthleteLike | null | undefined,
      overrides: LetterCenterOverrides | string = {}
    ) => {
      const params = buildAthleteLetterPrefill(athlete, overrides);
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) sp.set(k, v);
      const qs = sp.toString();
      return `${letterCenter}${qs ? `?${qs}` : ""}`;
    },
    [letterCenter, buildAthleteLetterPrefill]
  );

  const goToLetterForAthlete = useCallback(
    (
      athlete: AthleteLike | null | undefined,
      overrides: LetterCenterOverrides | string = {}
    ) => {
      if (isNavigating) return;

      const opts: LetterCenterOverrides =
        typeof overrides === "string" ? { letterType: overrides } : overrides;

      const recipientCategory =
        opts.recipientCategory && VALID_RECIPIENT_CATEGORIES.has(opts.recipientCategory)
          ? opts.recipientCategory
          : "athlete";
      const recipientType =
        opts.recipientType && VALID_RECIPIENT_TYPES.has(opts.recipientType)
          ? opts.recipientType
          : CATEGORY_TO_RECIPIENT_TYPE[recipientCategory];
      const letterType = opts.letterType || "initial-interest";

      const surface = opts.surface || "unknown";
      const hasEmail = !!cleanEmail(athlete?.email);
      const hasSchool = !!clean(athlete?.school);

      // ---- Lightweight in-page analytics ----------------------------
      try {
        trackEvent("letter_button_click", {
          surface,
          viewer_role: viewerRole,
          letter_center: letterCenter,
          recipient_category: recipientCategory,
          recipient_type: recipientType,
          letter_type: letterType,
          has_email: hasEmail,
          has_school: hasSchool,
        });
      } catch {
        /* never break navigation */
      }

      // ---- Persist to letter_button_clicks ------------------------
      // Fire-and-forget with throttle/dedup: rapid repeated clicks
      // (same surface+athlete+letterType within 5s) collapse to a
      // single insert so we don't spam analytics or trigger rate
      // limits. Wrapped in try/catch + .catch so analytics failures
      // (RLS, network, schema drift) NEVER break the Letter flow.
      try {
        const dedupKey = [
          surface,
          viewerRole,
          recipientCategory,
          recipientType,
          letterType,
          athlete?.id ?? "no-athlete",
        ].join("|");
        if (shouldRecordClick(dedupKey)) {
          // Promise chain — tolerate both real PromiseLike returns
          // from the SDK and stubbed responses in tests.
          const builder = supabase.from("letter_button_clicks").insert({
            surface,
            viewer_role: viewerRole,
            recipient_category: recipientCategory,
            recipient_type: recipientType,
            letter_type: letterType,
            letter_center: letterCenter,
            athlete_profile_id: athlete?.id || null,
            has_email: hasEmail,
            has_school: hasSchool,
          });
          Promise.resolve(builder as unknown as Promise<unknown>).catch(() => {
            /* swallow — analytics must never break navigation */
          });
        }
      } catch {
        /* analytics must never break navigation */
      }

      setIsNavigating(true);
      try {
        const prefill = buildAthleteLetterPrefill(athlete, opts);
        const route = letterRouteForPath(letterCenter);
        // Nested navigation: enter the role-specific tab navigator and land on
        // the LettersTab with the prefill params. `as never` accommodates the
        // generic NavigationProp signature without forcing every parent route
        // to declare nested params.
        (navigation as any).navigate(route.parent, {
          screen: route.screen,
          params: prefill,
        });
      } finally {
        setTimeout(() => setIsNavigating(false), 600);
      }
    },
    [navigation, buildAthleteLetterPrefill, isNavigating, viewerRole, letterCenter]
  );

  return {
    letterCenter,
    buildAthleteLetterUrl,
    goToLetterForAthlete,
    isNavigating,
    viewerRole,
    isHSCoach,
    isClubCoach,
    isCollegeCoach,
    isScout,
  };
}
