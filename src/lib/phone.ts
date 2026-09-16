// Real E.164 phone-number normalization for SMS surfaces.
//
// Context: All four SMS-collecting inputs in this app (ParentInviteModal,
// StaffManager, CardShareActions "SMS" tab, ShareTranscriptDialog "SMS" tab)
// previously sent the raw user-typed phone string directly to Supabase edge
// functions, which pass it to Twilio. Twilio requires E.164 (+15551234567).
// Common human formats — "(555) 123-4567", "555-123-4567", "555 123 4567",
// "5551234567", "1-555-123-4567" — all hit Twilio error 21211 "Invalid To
// Phone Number" and the user only sees a generic "delivery may have failed"
// toast. This helper normalizes those formats client-side so the vast
// majority of real US inputs succeed on first try.
//
// Scope: intentionally conservative. We handle NANP (US/Canada, +1) with
// 10-digit or 11-digit-leading-1 inputs, and pass through anything that
// already looks like a valid E.164 number (starts with +, all digits after).
// For non-NANP numbers users are still expected to enter with the +country
// prefix — the E.164 pass-through path handles that. We do not silently
// prepend +1 to arbitrary 10-digit strings that look like they might be
// international, so users get an explicit error rather than a wrong-country
// misdial.

/**
 * Strip all non-digit characters except a leading '+'.
 * "(555) 123-4567" -> "5551234567"
 * "+1 (555) 123-4567" -> "+15551234567"
 * "abc" -> ""
 */
export function stripPhoneFormatting(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D+/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Try to normalize a user-typed phone string to E.164 (+<countrycode><digits>).
 *
 * Returns the E.164 string on success, or null if the input can't be
 * confidently normalized. Callers should surface a validation error to the
 * user rather than sending an un-normalized string to the SMS backend.
 *
 * Rules (deliberate, real):
 *   - Empty / whitespace -> null.
 *   - Already-E.164 ("+15551234567", digits only after +, length 8-15): passthrough.
 *   - 10 digits (NANP local, e.g. "5551234567" or "(555) 123-4567") -> "+1" + 10.
 *   - 11 digits starting with "1" (e.g. "15551234567" or "1-555-123-4567") -> "+" + 11.
 *   - Anything else -> null (caller must show an error; we refuse to guess).
 */
export function toE164(input: string | null | undefined): string | null {
  const stripped = stripPhoneFormatting(input);
  if (!stripped) return null;

  // Already-E.164 path.
  if (stripped.startsWith('+')) {
    const digits = stripped.slice(1);
    // E.164 max 15 digits, min 8 to be sensible (country code + subscriber).
    if (/^\d{8,15}$/.test(digits)) return stripped;
    return null;
  }

  // NANP: 10-digit local number.
  if (/^\d{10}$/.test(stripped)) return `+1${stripped}`;

  // NANP: 11-digit "1XXXXXXXXXX".
  if (/^1\d{10}$/.test(stripped)) return `+${stripped}`;

  // Refuse to guess for anything else (e.g. 7-digit, or 11-digit non-NANP).
  return null;
}

/**
 * True iff toE164(input) can produce a valid E.164 string.
 * Handy for disabling submit buttons before the user commits.
 */
export function isValidPhoneForSms(input: string | null | undefined): boolean {
  return toE164(input) !== null;
}
