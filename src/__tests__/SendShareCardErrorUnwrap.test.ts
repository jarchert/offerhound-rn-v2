/**
 * sendShareCard() must unwrap `FunctionsHttpError.context.json()` so the
 * real edge-function error message (e.g. "recipient not verified",
 * "twilio failed") surfaces in the toast rather than the generic
 * "Edge Function returned a non-2xx status code" wrapper string.
 *
 * Mirrors the inlined unwrap pattern already used in
 * src/screens/athlete/LettersScreen.tsx (commit ec07bdb) so the codebase
 * only has one shape of error handling for edge-function calls.
 *
 * Build 124/96 follow-up (T1.2).
 */

const invokeMock = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => (global as any).__invokeMock(...args),
    },
  },
}));

(global as any).__invokeMock = invokeMock;

// Import AFTER the mock so shareCard.ts binds to the mocked supabase.
import { sendShareCard } from '@/lib/shareCard';

const baseParams = {
  channel: 'sms' as const,
  recipient: '+15555550123',
  senderName: 'Test Sender',
  fileName: 'card.png',
  mimeType: 'image/png',
  base64: 'AAAA',
};

beforeEach(() => {
  invokeMock.mockReset();
});

describe('sendShareCard — FunctionsHttpError unwrap', () => {
  it('A: unwraps context.json().error → throws with the real edge-function message', async () => {
    const err = new Error('Edge Function returned a non-2xx status code');
    (err as any).context = { json: async () => ({ error: 'recipient not verified' }) };
    invokeMock.mockResolvedValue({ data: null, error: err });

    await expect(sendShareCard(baseParams)).rejects.toThrow('recipient not verified');
  });

  it('B: unwraps a different edge-function error (twilio failed)', async () => {
    const err = new Error('Edge Function returned a non-2xx status code');
    (err as any).context = { json: async () => ({ error: 'twilio failed' }) };
    invokeMock.mockResolvedValue({ data: null, error: err });

    await expect(sendShareCard(baseParams)).rejects.toThrow('twilio failed');
  });

  it('C: error with NO .context → falls back to error.message', async () => {
    const err = new Error('network gremlin');
    // no context
    invokeMock.mockResolvedValue({ data: null, error: err });

    await expect(sendShareCard(baseParams)).rejects.toThrow('network gremlin');
  });

  it('D: context.json() rejects → still falls back to error.message', async () => {
    const err = new Error('boom');
    (err as any).context = {
      json: async () => {
        throw new Error('body already consumed');
      },
    };
    invokeMock.mockResolvedValue({ data: null, error: err });

    await expect(sendShareCard(baseParams)).rejects.toThrow('boom');
  });

  it('D2: context.json() returns a body with no `.error` string → falls back to error.message', async () => {
    const err = new Error('fallback message');
    (err as any).context = { json: async () => ({ notError: 'foo' }) };
    invokeMock.mockResolvedValue({ data: null, error: err });

    await expect(sendShareCard(baseParams)).rejects.toThrow('fallback message');
  });

  it('E: no error but data.error present → throws with data.error (existing behavior preserved)', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'send-share-card said no' }, error: null });

    await expect(sendShareCard(baseParams)).rejects.toThrow('send-share-card said no');
  });

  it('F: success (no error, no data.error) → returns data', async () => {
    invokeMock.mockResolvedValue({ data: { ok: true, id: 'msg-1' }, error: null });

    const out = await sendShareCard(baseParams);
    expect(out).toEqual({ ok: true, id: 'msg-1' });
  });

  it('invokes the edge function with the right function name and body', async () => {
    invokeMock.mockResolvedValue({ data: {}, error: null });
    await sendShareCard(baseParams);
    expect(invokeMock).toHaveBeenCalledWith('send-share-card', { body: baseParams });
  });
});
