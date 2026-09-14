// Payload builder for the "Universal Letter Center" edge function
// (`generate-coach-scout-letter`). All AI letter-generation surfaces in the
// app funnel through this helper so the request shape matches the function's
// validation contract exactly.
//
// Edge function contract (see MAIN supabase/functions/generate-coach-scout-letter/index.ts):
//   {
//     senderType:        'athlete' | 'parent' | 'coach' | 'club-coach' | 'hs-coach' | 'scout' | 'influencer',
//     letterType:        non-empty string, <= 80 chars,
//     recipientCategory: 'athlete' | 'parent' | 'college-coach' | 'club-coach' | 'hs-coach' | 'scout' | 'influencer',
//     senderProfile?:    any (merged into the AI prompt SENDER PROFILE block),
//     recipientInfo?:    any (merged into RECIPIENT INFO block),
//     customContext?:    string (appended verbatim to the prompt),
//   }
//
// See memory/2026-09-14.md → "Universal Letter Center" for background.

import type { AppRole } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// Edge-function enum types (must match VALID_SENDERS / VALID_CATEGORIES in
// generate-coach-scout-letter/index.ts).
// ---------------------------------------------------------------------------
export type EdgeSenderType =
  | 'athlete'
  | 'parent'
  | 'coach'
  | 'club-coach'
  | 'hs-coach'
  | 'scout'
  | 'influencer';

export type EdgeRecipientCategory =
  | 'athlete'
  | 'parent'
  | 'college-coach'
  | 'club-coach'
  | 'hs-coach'
  | 'scout'
  | 'influencer';

export const VALID_SENDERS: ReadonlySet<EdgeSenderType> = new Set<EdgeSenderType>([
  'athlete',
  'parent',
  'coach',
  'club-coach',
  'hs-coach',
  'scout',
  'influencer',
]);

export const VALID_CATEGORIES: ReadonlySet<EdgeRecipientCategory> = new Set<EdgeRecipientCategory>([
  'athlete',
  'parent',
  'college-coach',
  'club-coach',
  'hs-coach',
  'scout',
  'influencer',
]);

export const MAX_LETTER_TYPE_LEN = 80;

/**
 * Map RN's canonical AppRole (underscore form) to the edge function's
 * hyphenated senderType enum.
 *
 *   athlete             -> athlete
 *   parent              -> parent
 *   coach               -> coach
 *   club_coach          -> club-coach
 *   high_school_coach   -> hs-coach
 *   scout               -> scout
 *   influencer          -> influencer
 *   agency              -> scout          (agency has no edge equivalent; treat as scout on the wire)
 *
 * Roles with no letter-writing surface (`admin`, `moderator`, `user`,
 * `beta_tester`) return `null` — callers must NOT attempt AI generation.
 */
export function mapRoleToSenderType(role: AppRole | string | null | undefined): EdgeSenderType | null {
  if (!role) return null;
  switch (role) {
    case 'athlete':
      return 'athlete';
    case 'parent':
      return 'parent';
    case 'coach':
      return 'coach';
    case 'club_coach':
      return 'club-coach';
    case 'high_school_coach':
      return 'hs-coach';
    case 'scout':
      return 'scout';
    case 'influencer':
      return 'influencer';
    case 'agency':
      // Agency accounts don't have a dedicated edge sender label; on-wire
      // they identify as scouts (closest tone/prompt fit — evaluators, not
      // college programs). Documented for clarity.
      return 'scout';
    default:
      return null;
  }
}

export interface GenerateLetterPayload {
  senderType: EdgeSenderType;
  letterType: string;
  recipientCategory: EdgeRecipientCategory;
  senderProfile?: unknown;
  recipientInfo?: unknown;
  customContext?: string;
}

export interface BuildGenerateLetterPayloadArgs {
  role: AppRole | string | null | undefined;
  letterType: string;
  recipientCategory?: EdgeRecipientCategory;
  /** When recipientCategory is not provided, infer it from a hint: `'athlete'`
   *  when the seed / draft indicates the recipient is an athlete (e.g. seed
   *  came from a coach dashboard's athlete card, or the composer's recipient
   *  role text is exactly "Athlete"), else default to `'college-coach'`. */
  recipientCategoryHint?: 'athlete' | 'college-coach' | null;
  senderProfile?: unknown;
  recipientInfo?: unknown;
  customContext?: string;
}

/**
 * Build a payload that will pass the edge function's validation OR return
 * null with a reason if we can't. Callers should surface `reason` in a toast
 * on null.
 */
export function buildGenerateLetterPayload(
  args: BuildGenerateLetterPayloadArgs,
): { payload: GenerateLetterPayload } | { payload: null; reason: string } {
  const senderType = mapRoleToSenderType(args.role);
  if (!senderType || !VALID_SENDERS.has(senderType)) {
    return { payload: null, reason: 'Your account role cannot generate AI letters.' };
  }

  const letterType = (args.letterType ?? '').toString().trim();
  if (!letterType) {
    return { payload: null, reason: 'Please select a letter type first.' };
  }
  if (letterType.length > MAX_LETTER_TYPE_LEN) {
    return { payload: null, reason: `Letter type must be ${MAX_LETTER_TYPE_LEN} characters or fewer.` };
  }

  let recipientCategory: EdgeRecipientCategory;
  if (args.recipientCategory && VALID_CATEGORIES.has(args.recipientCategory)) {
    recipientCategory = args.recipientCategory;
  } else if (args.recipientCategoryHint === 'athlete') {
    recipientCategory = 'athlete';
  } else {
    // Default surface-B/C fallback: the overwhelmingly common case is
    // athletes/coaches contacting college coaches.
    recipientCategory = 'college-coach';
  }

  const payload: GenerateLetterPayload = {
    senderType,
    letterType,
    recipientCategory,
  };
  if (args.senderProfile) payload.senderProfile = args.senderProfile;
  if (args.recipientInfo) payload.recipientInfo = args.recipientInfo;
  if (args.customContext && args.customContext.trim()) payload.customContext = args.customContext;

  return { payload };
}
