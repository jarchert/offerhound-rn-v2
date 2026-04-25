/**
 * Utilities for building shareable links with UTM tracking parameters.
 * Used by camp managers to attribute traffic from HUDL, social, profile
 * pages, and other external surfaces.
 *
 * Parity port from Lovable web src/lib/utm.ts (verbatim logic).
 * RN-safe: no DOM/window references.
 */
import { supabase } from "@/integrations/supabase/client";

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

const UTM_KEYS: Array<keyof UtmParams> = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
];

/**
 * Internal/system tracking parameters that must NEVER appear in a
 * public-facing share link.
 */
const INTERNAL_PARAM_BLOCKLIST = new Set([
  "access_token",
  "refresh_token",
  "token",
  "auth_token",
  "session_id",
  "supabase_token",
  "sb-access-token",
  "sb-refresh-token",
  "lovable_preview",
  "lovable_token",
  "preview_token",
  "__lovable",
  "__lovable_token",
  "stripe_session_id",
  "checkout_session_id",
  "internal",
  "debug",
  "_internal",
]);

function isInternalParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (INTERNAL_PARAM_BLOCKLIST.has(lower)) return true;
  if (lower.startsWith("__")) return true;
  if (lower.startsWith("sb-")) return true;
  return false;
}

export interface BuildUtmResult {
  url: string;
  strippedKeys: string[];
  hadHash: boolean;
}

/**
 * Variant of `buildUtmUrl` that also reports which keys were stripped
 * and whether a hash was dropped. Used by the share-link UI to surface
 * an audit trail.
 */
export function buildUtmUrlWithReport(
  baseUrl: string,
  params: UtmParams
): BuildUtmResult {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { url: baseUrl, strippedKeys: [], hadHash: false };
  }

  const strippedKeys: string[] = [];
  url.searchParams.forEach((_value, key) => {
    if (isInternalParam(key)) strippedKeys.push(key);
  });
  for (const k of strippedKeys) url.searchParams.delete(k);

  const hadHash = !!url.hash;
  url.hash = "";

  for (const key of UTM_KEYS) {
    const value = params[key];
    if (value && value.trim()) {
      url.searchParams.set(`utm_${key}`, value.trim());
    }
  }

  return { url: url.toString(), strippedKeys, hadHash };
}

/**
 * Append UTM params to a URL, preserving any existing PUBLIC query
 * string. Internal/system identifiers are stripped.
 */
export function buildUtmUrl(baseUrl: string, params: UtmParams): string {
  return buildUtmUrlWithReport(baseUrl, params).url;
}

/**
 * Normalize a referrer URL or arbitrary URL string by stripping
 * internal/system tracking params and hash fragments. Returns `null`
 * if the input is unparseable. Used by analytics capture so we record
 * a consistent, attribution-friendly URL — not whatever raw string
 * happened to land in `document.referrer`.
 */
export function normalizeReferrerUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const toDelete: string[] = [];
  url.searchParams.forEach((_v, k) => {
    if (isInternalParam(k)) toDelete.push(k);
  });
  for (const k of toDelete) url.searchParams.delete(k);
  url.hash = "";
  // Lowercase host for consistency in analytics buckets.
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

/**
 * Best-effort audit trail for share-link generation. Inserts a
 * `share_link_sanitized` event into `camp_audit_events` whenever the
 * builder strips internal params or drops a hash. Failures are
 * swallowed — the audit log must never break link copy/paste.
 */
export async function logShareLinkAudit(opts: {
  campId?: string | null;
  baseUrl: string;
  finalUrl: string;
  strippedKeys: string[];
  hadHash: boolean;
  source?: string | null;
}): Promise<void> {
  if (!opts.campId) return;
  if (opts.strippedKeys.length === 0 && !opts.hadHash) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("camp_audit_events").insert({
      camp_id: opts.campId,
      actor_user_id: user?.id ?? null,
      event_type: "share_link_sanitized",
      details: {
        base_url: opts.baseUrl,
        final_url: opts.finalUrl,
        stripped_param_keys: opts.strippedKeys,
        dropped_hash: opts.hadHash,
        source: opts.source ?? null,
      },
    } as any);
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[utm] share-link audit log failed:", err);
    }
  }
}

/**
 * Curated campaign source presets. The `value` is what gets stored
 * in `utm_source` (and analytics buckets), `label` is what coaches see.
 */
export const CAMPAIGN_SOURCE_OPTIONS: Array<{
  value: string;
  label: string;
  medium: string;
  description?: string;
}> = [
  { value: "hudl", label: "HUDL profile", medium: "profile" },
  { value: "twitter", label: "Twitter / X", medium: "social" },
  { value: "instagram", label: "Instagram bio", medium: "social" },
  { value: "facebook", label: "Facebook post", medium: "social" },
  { value: "tiktok", label: "TikTok bio", medium: "social" },
  { value: "youtube", label: "YouTube description", medium: "video" },
  { value: "email", label: "Email signature", medium: "signature" },
  { value: "newsletter", label: "Newsletter blast", medium: "email" },
  { value: "sms", label: "SMS / text", medium: "message" },
  { value: "athlete-profile", label: "Athlete profile", medium: "referral" },
  { value: "school-site", label: "School website", medium: "referral" },
  { value: "qr-flyer", label: "Printed QR flyer", medium: "print" },
  { value: "qr-poster", label: "Event poster", medium: "print" },
  { value: "podcast", label: "Podcast episode", medium: "audio" },
  { value: "partner", label: "Partner cross-promo", medium: "referral" },
  { value: "direct", label: "Direct / unattributed", medium: "direct" },
];

/**
 * Common surface presets for one-click share buttons.
 */
export const UTM_PRESETS: Array<{
  label: string;
  source: string;
  medium: string;
}> = CAMPAIGN_SOURCE_OPTIONS.slice(0, 7).map((o) => ({
  label: o.label,
  source: o.value,
  medium: o.medium,
}));
