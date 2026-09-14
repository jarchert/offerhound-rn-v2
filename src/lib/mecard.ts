// Shared MECARD builder for QR payloads on shareable role/athlete cards.
//
// Extracted from RoleCardGenerator.tsx so ProfileCardGenerator can reuse the
// exact same escaping + field ordering (Tier 3 #3). Any future MECARD tweak
// should land here once instead of in both card components.
//
// MECARD format reference: https://en.wikipedia.org/wiki/MECARD
//   Fields are separated by `;`, key/value by `:`, and the payload ends `;;`.
//   Characters `\ ; , :` inside values must be backslash-escaped.

export type MecardFields = {
  name: string;
  phone?: string | null;
  email?: string | null;
  organization?: string | null;
  title?: string | null;
  location?: string | null;
  url?: string | null;
};

/**
 * Escape a single MECARD field value.
 * Backslash, semicolon, comma, and colon all get a leading `\`.
 */
export const escapeMecard = (value: string | null | undefined): string =>
  (value ?? '').replace(/([\\;,:])/g, '\\$1');

/**
 * Build a MECARD-encoded string from the given fields.
 *
 * Only non-empty fields are included. `name` is always emitted (even if empty,
 * to keep a stable `N:` prefix), matching MAIN's RoleCardGenerator behavior.
 * Callers that want contact gating (e.g. Tier 3 contact-visibility rules)
 * must apply that gate BEFORE calling this — pass `undefined`/`null` for any
 * field that shouldn't appear in the QR.
 */
export const buildMecard = (fields: MecardFields): string => {
  const parts = [
    `N:${escapeMecard(fields.name)}`,
    fields.phone ? `TEL:${escapeMecard(fields.phone)}` : '',
    fields.email ? `EMAIL:${escapeMecard(fields.email)}` : '',
    fields.organization ? `ORG:${escapeMecard(fields.organization)}` : '',
    fields.title ? `TITLE:${escapeMecard(fields.title)}` : '',
    fields.location ? `ADR:${escapeMecard(fields.location)}` : '',
    fields.url ? `URL:${escapeMecard(fields.url)}` : '',
  ].filter(Boolean);
  return `MECARD:${parts.join(';')};;`;
};
