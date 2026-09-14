/**
 * E.164 phone normalization — real coverage for the common human input
 * formats users type into the four SMS-collecting inputs (ParentInviteModal,
 * StaffManager, CardShareActions, ShareTranscriptDialog).
 *
 * Context: pre-fix, the raw typed string was handed to the Supabase edge
 * functions → Twilio. Twilio requires E.164 (+15551234567), so common human
 * formats like "(555) 123-4567" hit Twilio error 21211 and users saw only a
 * generic "delivery may have failed" toast. src/lib/phone.ts centralizes the
 * normalization; this test locks in the exact behavior for the real formats
 * users type on mobile keyboards.
 */
import { toE164, stripPhoneFormatting, isValidPhoneForSms } from '@/lib/phone';

describe('toE164 — real US input formats', () => {
  const expectedUS = '+15551234567';

  test.each([
    ['10 raw digits', '5551234567'],
    ['parens+space+dash', '(555) 123-4567'],
    ['parens+dash only', '(555)123-4567'],
    ['dashes throughout', '555-123-4567'],
    ['spaces only', '555 123 4567'],
    ['dot separators', '555.123.4567'],
    ['leading whitespace', '  555-123-4567  '],
    ['tabs/newlines mixed in', '\t555\n123 4567 '],
    ['11 digits with leading 1', '15551234567'],
    ['11 digits with 1 and dashes', '1-555-123-4567'],
    ['11 digits with 1 and parens', '1 (555) 123-4567'],
    ['already E.164', '+15551234567'],
    ['E.164 with visual spaces', '+1 555 123 4567'],
    ['E.164 with parens+dashes', '+1 (555) 123-4567'],
  ])('%s → +15551234567', (_label, input) => {
    expect(toE164(input)).toBe(expectedUS);
  });
});

describe('toE164 — non-US E.164 passthrough (no country-code guessing)', () => {
  test.each([
    ['UK mobile', '+447700900123'],
    ['German landline', '+493012345678'],
    ['Japan mobile', '+819012345678'],
    ['Australia mobile', '+61412345678'],
  ])('%s stays intact', (_label, input) => {
    expect(toE164(input)).toBe(input.replace(/\s+/g, ''));
  });

  test('non-US with formatting still normalizes when starting with +', () => {
    expect(toE164('+44 7700 900 123')).toBe('+447700900123');
    expect(toE164('+81 (90) 1234-5678')).toBe('+819012345678');
  });
});

describe('toE164 — refuses to guess (returns null, does not silently prepend +1)', () => {
  test.each([
    ['empty', ''],
    ['just whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
    ['too short (7 digits)', '1234567'],
    ['too short (9 digits, ambiguous)', '123456789'],
    ['11 digits NOT starting with 1', '25551234567'],
    ['12 digits without +', '445551234567'],
    ['alpha only', 'abcdefghij'],
    ['+ but too few digits (7)', '+1234567'],
    ['+ but too many digits (16)', '+1234567890123456'],
    ['+ with non-digits after', '+1-abc-def-ghij'],
  ])('%s → null', (_label, input) => {
    expect(toE164(input as any)).toBeNull();
  });
});

describe('stripPhoneFormatting — helper behavior', () => {
  test('preserves leading + and strips everything non-digit', () => {
    expect(stripPhoneFormatting('+1 (555) 123-4567')).toBe('+15551234567');
    expect(stripPhoneFormatting('(555) 123-4567')).toBe('5551234567');
  });
  test('empty / null / undefined → empty string', () => {
    expect(stripPhoneFormatting('')).toBe('');
    expect(stripPhoneFormatting('   ')).toBe('');
    expect(stripPhoneFormatting(null)).toBe('');
    expect(stripPhoneFormatting(undefined)).toBe('');
  });
});

describe('isValidPhoneForSms — convenience wrapper for form validation', () => {
  test('true for anything toE164 accepts', () => {
    expect(isValidPhoneForSms('(555) 123-4567')).toBe(true);
    expect(isValidPhoneForSms('+447700900123')).toBe(true);
    expect(isValidPhoneForSms('5551234567')).toBe(true);
  });
  test('false for garbage / short / ambiguous input', () => {
    expect(isValidPhoneForSms('')).toBe(false);
    expect(isValidPhoneForSms('123')).toBe(false);
    expect(isValidPhoneForSms('abc')).toBe(false);
    expect(isValidPhoneForSms(null)).toBe(false);
  });
});
