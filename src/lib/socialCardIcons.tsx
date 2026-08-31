// Shared social-link icon map + data collector for shareable role/athlete cards.
//
// Extracted from RoleCardGenerator.tsx so ProfileCardGenerator (and any future
// card variant) uses the exact same icon rendering and data-shape (Tier 3 #4).
// The upstream `social_links` JSON is written by SocialLinksManager — this
// helper is a read-side reformatter, NOT a duplicate source of truth.
//
// Adding a new platform:
//   - Add its key + icon here.
//   - SocialLinksManager already accepts arbitrary keys; keys not in this map
//     still render as a text-only pill in cards (matches current behavior).
import React from 'react';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';

export type IconRender = (size: number, color: string) => React.ReactNode;

/**
 * Icon renderers keyed by lowercased platform id.
 * A card renders `socialIcons[platform.toLowerCase()]?.(size, color)` and
 * falls back to text-only when the platform has no icon here.
 */
export const socialIcons: Record<string, IconRender> = {
  instagram: (size, color) => <FontAwesome5 name="instagram" size={size} color={color} />,
  facebook: (size, color) => <FontAwesome5 name="facebook" size={size} color={color} />,
  x: (size, color) => <FontAwesome6 name="x-twitter" size={size} color={color} />,
  twitter: (size, color) => <FontAwesome6 name="x-twitter" size={size} color={color} />,
  tiktok: (size, color) => <FontAwesome5 name="tiktok" size={size} color={color} />,
  youtube: (size, color) => <FontAwesome5 name="youtube" size={size} color={color} />,
};

export type CollectedSocial = { platform: string; url: string };

/**
 * Normalize a profile's `social_links` JSON (Record<platform, url>) plus an
 * optional legacy `twitter` handle into the flat list a card renders.
 *
 * Behavior:
 *   - Non-string / falsy URL values are dropped.
 *   - Platform keys are lowercased so lookups against `socialIcons` are stable.
 *   - The legacy `twitter` handle is appended as an `x` entry only when
 *     neither `twitter` nor `x` already exists — matches RoleCardGenerator's
 *     de-dup rule, so an athlete who has social_links.x set won't get a
 *     second pill from a stray `twitter` column.
 */
export const collectSocials = (
  socialLinks: unknown,
  legacyTwitter?: string | null,
): CollectedSocial[] => {
  const out: CollectedSocial[] = [];
  if (socialLinks && typeof socialLinks === 'object') {
    for (const [rawKey, rawVal] of Object.entries(socialLinks as Record<string, unknown>)) {
      if (typeof rawVal !== 'string') continue;
      const url = rawVal.trim();
      if (!url) continue;
      out.push({ platform: rawKey.toLowerCase(), url });
    }
  }
  if (
    legacyTwitter &&
    typeof legacyTwitter === 'string' &&
    !out.find((sx) => sx.platform === 'twitter' || sx.platform === 'x')
  ) {
    const handle = legacyTwitter.replace(/^@/, '').trim();
    if (handle) out.push({ platform: 'x', url: `https://x.com/${handle}` });
  }
  return out;
};
