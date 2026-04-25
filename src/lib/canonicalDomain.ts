/**
 * Canonical public-facing origin for OfferHound. All shareable URLs
 * (camps, profiles, invites) MUST be built off of this so we never
 * leak preview/staging hosts (lovable.app, vercel.app, localhost) into
 * links that end up on athlete profiles, social bios, emails, or the
 * `referrer_url` analytics column.
 *
 * Resolution order:
 *   1. `EXPO_PUBLIC_SITE_URL`      — preferred, set per environment
 *   2. `EXPO_PUBLIC_CANONICAL_DOMAIN` — legacy alias, kept for back-compat
 *   3. Hard-coded production fallback — guarantees we never return ""
 *
 * Anything pointing at *.lovable.app, *.vercel.app, or localhost is
 * rejected and the production fallback is used instead.
 *
 * Parity port from Lovable web src/lib/canonicalDomain.ts. Web uses
 * Vite's `import.meta.env.VITE_*`; RN uses Expo's `process.env.EXPO_PUBLIC_*`.
 */

const PRODUCTION_FALLBACK = "https://offer-hound.com";

const NON_CANONICAL_HOST_RE =
  /(^|\.)(lovable\.app|vercel\.app|localhost)(:\d+)?$/i;

function normalizeOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (NON_CANONICAL_HOST_RE.test(u.hostname)) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Returns the canonical origin (no trailing slash), e.g.
 * `"https://offer-hound.com"`.
 */
export function getCanonicalOrigin(): string {
  const fromEnv =
    normalizeOrigin(process.env.EXPO_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.EXPO_PUBLIC_CANONICAL_DOMAIN);
  return fromEnv ?? PRODUCTION_FALLBACK;
}

/**
 * Build a fully-qualified canonical URL for an in-app path. Always
 * uses the canonical origin, never `window.location.origin`, so links
 * generated from preview/staging hosts still point at production.
 */
export function buildCanonicalUrl(path: string): string {
  const origin = getCanonicalOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
