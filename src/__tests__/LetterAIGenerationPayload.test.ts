// Tests for `buildGenerateLetterPayload` \u2014 the shared helper both AI letter
// surfaces (LetterComposerScreen and athlete LettersScreen) use to construct
// requests to the `generate-coach-scout-letter` edge function.
//
// This exercises the real edge-function validation contract from
// MAIN supabase/functions/generate-coach-scout-letter/index.ts:
//   - senderType must be in VALID_SENDERS
//   - letterType must be non-empty and <= 80 chars
//   - recipientCategory must be in VALID_CATEGORIES
//   - senderProfile / recipientInfo / customContext are optional passthroughs

import {
  buildGenerateLetterPayload,
  mapRoleToSenderType,
  VALID_SENDERS,
  VALID_CATEGORIES,
  MAX_LETTER_TYPE_LEN,
  type EdgeSenderType,
} from '@/lib/generateLetterPayload';
import type { AppRole } from '@/integrations/supabase/types';

describe('mapRoleToSenderType', () => {
  it('maps every RN AppRole with a letter surface to a VALID_SENDERS value', () => {
    const cases: Array<[AppRole, EdgeSenderType]> = [
      ['athlete', 'athlete'],
      ['parent', 'parent'],
      ['coach', 'coach'],
      ['club_coach', 'club-coach'],
      ['high_school_coach', 'hs-coach'],
      ['scout', 'scout'],
      ['influencer', 'influencer'],
    ];
    for (const [role, expected] of cases) {
      const mapped = mapRoleToSenderType(role);
      expect(mapped).toBe(expected);
      expect(VALID_SENDERS.has(mapped as EdgeSenderType)).toBe(true);
    }
  });

  it('maps agency \u2192 scout on the wire (agency has no edge senderType)', () => {
    expect(mapRoleToSenderType('agency' as AppRole)).toBe('scout');
    expect(VALID_SENDERS.has('scout')).toBe(true);
  });

  it('returns null for roles with no letter-writing surface', () => {
    expect(mapRoleToSenderType('admin' as AppRole)).toBeNull();
    expect(mapRoleToSenderType('moderator' as AppRole)).toBeNull();
    expect(mapRoleToSenderType('user' as AppRole)).toBeNull();
    expect(mapRoleToSenderType('beta_tester' as AppRole)).toBeNull();
  });

  it('returns null for null/undefined/empty inputs', () => {
    expect(mapRoleToSenderType(null)).toBeNull();
    expect(mapRoleToSenderType(undefined)).toBeNull();
    expect(mapRoleToSenderType('')).toBeNull();
  });

  it('does NOT accept the edge-form hyphenated values back through the mapper', () => {
    // Callers must pass the RN AppRole (underscore), not the edge form.
    expect(mapRoleToSenderType('club-coach')).toBeNull();
    expect(mapRoleToSenderType('hs-coach')).toBeNull();
  });
});

describe('buildGenerateLetterPayload \u2014 builds validation-passing payloads for every real sender type', () => {
  // Cover each of the 7 real senderType values the edge function accepts
  // with a plausible RN-side role \u2192 payload construction path.
  const roleCases: Array<{ role: AppRole; expectedSenderType: EdgeSenderType }> = [
    { role: 'athlete', expectedSenderType: 'athlete' },
    { role: 'parent', expectedSenderType: 'parent' },
    { role: 'coach', expectedSenderType: 'coach' },
    { role: 'club_coach', expectedSenderType: 'club-coach' },
    { role: 'high_school_coach', expectedSenderType: 'hs-coach' },
    { role: 'scout', expectedSenderType: 'scout' },
    { role: 'influencer', expectedSenderType: 'influencer' },
  ];

  it.each(roleCases)(
    'role=$role builds a payload the edge function would accept',
    ({ role, expectedSenderType }) => {
      const built = buildGenerateLetterPayload({
        role,
        letterType: 'recruiting',
        recipientCategoryHint: 'college-coach',
        senderProfile: { name: 'Test User' },
        recipientInfo: { name: 'Coach Smith', organization: 'State U' },
        customContext: 'Please emphasize academics.',
      });
      expect(built.payload).not.toBeNull();
      const p = built.payload!;
      expect(p.senderType).toBe(expectedSenderType);
      expect(VALID_SENDERS.has(p.senderType)).toBe(true);
      expect(p.letterType).toBe('recruiting');
      expect(p.letterType.length).toBeGreaterThan(0);
      expect(p.letterType.length).toBeLessThanOrEqual(MAX_LETTER_TYPE_LEN);
      expect(VALID_CATEGORIES.has(p.recipientCategory)).toBe(true);
      expect(p.senderProfile).toEqual({ name: 'Test User' });
      expect(p.recipientInfo).toEqual({ name: 'Coach Smith', organization: 'State U' });
      expect(p.customContext).toBe('Please emphasize academics.');
    },
  );

  it('agency role produces a payload with senderType=scout that still validates', () => {
    const built = buildGenerateLetterPayload({
      role: 'agency' as AppRole,
      letterType: 'intro',
      recipientCategoryHint: 'college-coach',
    });
    expect(built.payload).not.toBeNull();
    expect(built.payload!.senderType).toBe('scout');
    expect(VALID_SENDERS.has(built.payload!.senderType)).toBe(true);
  });
});

describe('buildGenerateLetterPayload \u2014 recipientCategory resolution', () => {
  const base = { role: 'athlete' as AppRole, letterType: 'recruiting' };

  it('uses an explicit recipientCategory when provided and valid', () => {
    const built = buildGenerateLetterPayload({ ...base, recipientCategory: 'hs-coach' });
    expect(built.payload?.recipientCategory).toBe('hs-coach');
  });

  it('uses the athlete hint when seed indicates the recipient is an athlete', () => {
    const built = buildGenerateLetterPayload({ ...base, recipientCategoryHint: 'athlete' });
    expect(built.payload?.recipientCategory).toBe('athlete');
  });

  it('falls back to college-coach when hint is college-coach', () => {
    const built = buildGenerateLetterPayload({ ...base, recipientCategoryHint: 'college-coach' });
    expect(built.payload?.recipientCategory).toBe('college-coach');
  });

  it('defaults to college-coach when nothing is provided (surface B/C most common case)', () => {
    const built = buildGenerateLetterPayload({ ...base });
    expect(built.payload?.recipientCategory).toBe('college-coach');
  });

  it('every emitted recipientCategory is in VALID_CATEGORIES', () => {
    const outputs: Array<'athlete' | 'college-coach' | 'hs-coach' | 'club-coach' | 'scout' | 'influencer' | 'parent'> = [
      'athlete', 'college-coach', 'hs-coach', 'club-coach', 'scout', 'influencer', 'parent',
    ];
    for (const cat of outputs) {
      const built = buildGenerateLetterPayload({ ...base, recipientCategory: cat });
      expect(built.payload).not.toBeNull();
      expect(VALID_CATEGORIES.has(built.payload!.recipientCategory)).toBe(true);
    }
  });
});

describe('buildGenerateLetterPayload \u2014 validation rejections mirror the edge function', () => {
  it('rejects unknown / no-surface roles with a user-facing reason', () => {
    const built = buildGenerateLetterPayload({ role: 'admin' as AppRole, letterType: 'recruiting' });
    expect(built.payload).toBeNull();
    expect((built as any).reason).toMatch(/role/i);
  });

  it('rejects null role', () => {
    const built = buildGenerateLetterPayload({ role: null, letterType: 'recruiting' });
    expect(built.payload).toBeNull();
  });

  it('rejects empty / whitespace-only letterType', () => {
    for (const bad of ['', '   ', '\n\t']) {
      const built = buildGenerateLetterPayload({ role: 'athlete', letterType: bad });
      expect(built.payload).toBeNull();
      expect((built as any).reason).toMatch(/letter type/i);
    }
  });

  it('rejects letterType > 80 chars (matches edge function guard)', () => {
    const built = buildGenerateLetterPayload({ role: 'athlete', letterType: 'x'.repeat(81) });
    expect(built.payload).toBeNull();
    expect((built as any).reason).toMatch(/80/);
  });

  it('accepts letterType at exactly 80 chars', () => {
    const built = buildGenerateLetterPayload({ role: 'athlete', letterType: 'x'.repeat(80) });
    expect(built.payload).not.toBeNull();
    expect(built.payload!.letterType.length).toBe(80);
  });

  it('trims letterType before length check but keeps trimmed value', () => {
    const built = buildGenerateLetterPayload({ role: 'athlete', letterType: '  recruiting  ' });
    expect(built.payload?.letterType).toBe('recruiting');
  });
});

describe('buildGenerateLetterPayload \u2014 optional-field passthrough', () => {
  const base = { role: 'athlete' as AppRole, letterType: 'recruiting' as const };

  it('omits senderProfile / recipientInfo / customContext when not provided', () => {
    const built = buildGenerateLetterPayload(base);
    expect(built.payload).not.toBeNull();
    const p = built.payload!;
    expect(p.senderProfile).toBeUndefined();
    expect(p.recipientInfo).toBeUndefined();
    expect(p.customContext).toBeUndefined();
  });

  it('omits customContext when it is only whitespace', () => {
    const built = buildGenerateLetterPayload({ ...base, customContext: '   \n\t' });
    expect(built.payload?.customContext).toBeUndefined();
  });

  it('preserves nested senderProfile objects verbatim (edge function reads many fields)', () => {
    const senderProfile = {
      name: 'Alex Rivera',
      position: 'Wide Receiver',
      school: 'Lincoln HS',
      graduation_year: '2027',
      gpa: '3.7',
      height: "6'1",
      weight: '185',
      city: 'Austin',
      state: 'TX',
      email: 'alex@example.com',
    };
    const built = buildGenerateLetterPayload({ ...base, senderProfile });
    expect(built.payload?.senderProfile).toEqual(senderProfile);
  });
});
