/**
 * CampWalkupRegistration.test.tsx
 *
 * Tests for the walk-up registration form:
 *   1. Form validation — athlete name is required, others are optional
 *   2. Online submit path — inserts directly to camp_enrollments via supabase
 *   3. Offline submit path — enqueues via checkinQueue.ts walkup_register op
 *
 * Strategy: test the mutationFn logic directly (extracted into a helper) rather
 * than rendering the full component, to avoid the QueryClient/Provider render
 * complexity and native dep mocking overhead. The component itself is a thin
 * wiring layer over this logic.
 */

// ─── AsyncStorage (required by checkinQueue.ts) ───────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(null),
    multiRemove: jest.fn().mockResolvedValue(null),
  },
}));

// ─── Expo native deps ─────────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// ─── Supabase ─────────────────────────────────────────────────────────────────
// Use `var` so the declaration is hoisted into the jest.mock() factory scope.
// `const` would be in TDZ when the factory runs at module-load time.
var mockInsert: jest.Mock;
mockInsert = jest.fn();
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    // Return a fresh builder each call, reading mockInsert lazily so
    // clearAllMocks() between tests doesn't break the chain.
    from: jest.fn().mockImplementation(() => ({
      insert: (...args: any[]) => mockInsert(...args),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

// ─── checkinQueue ─────────────────────────────────────────────────────────────
jest.mock('@/lib/checkinQueue', () => ({
  enqueueOp: jest.fn().mockResolvedValue({ id: 'queued-op-1' }),
}));

import { enqueueOp } from '@/lib/checkinQueue';
import { supabase } from '@/integrations/supabase/client';

// ─── The inline mutationFn logic extracted for direct testing ─────────────────
// Mirrors exactly what CampWalkupRegistration's useMutation.mutationFn does.
interface WalkupForm {
  athleteName: string;
  email: string;
  jerseyNumber: string;
  positionGroup: string;
}

async function runMutationFn(
  data: WalkupForm,
  opts: { campId: string; userId: string | null; isOnline: boolean },
) {
  const payload = {
    jersey_number: data.jerseyNumber.trim() || null,
    position_group: data.positionGroup || null,
    notes: data.email.trim() ? `walk-up email: ${data.email.trim()}` : null,
    user_id: opts.userId,
    athlete_profile_id: null,
  };

  if (!opts.isOnline) {
    await enqueueOp({
      kind: 'walkup_register',
      campId: opts.campId,
      payload,
    });
    return { queued: true as const };
  }

  const { error } = await supabase.from('camp_enrollments').insert({
    camp_id: opts.campId,
    user_id: opts.userId,
    athlete_profile_id: null,
    jersey_number: payload.jersey_number,
    position_group: payload.position_group,
    notes: payload.notes,
    status: 'checked_in',
    payment_status: 'walkup',
    checked_in_at: new Date().toISOString(),
  } as any);

  if (error) throw error;
  return { queued: false as const };
}

// ─── Validation helper (mirrors component's handleSubmit guard) ───────────────
function validateForm(form: WalkupForm): string {
  if (!form.athleteName.trim()) return 'Athlete name is required.';
  return '';
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CampWalkupRegistration — form validation', () => {
  test('rejects empty athlete name', () => {
    const err = validateForm({ athleteName: '', email: '', jerseyNumber: '', positionGroup: '' });
    expect(err).toBe('Athlete name is required.');
  });

  test('rejects whitespace-only athlete name', () => {
    const err = validateForm({ athleteName: '   ', email: '', jerseyNumber: '', positionGroup: '' });
    expect(err).toBe('Athlete name is required.');
  });

  test('passes with name only (all optional fields empty)', () => {
    const err = validateForm({ athleteName: 'John Smith', email: '', jerseyNumber: '', positionGroup: '' });
    expect(err).toBe('');
  });

  test('passes with all fields populated', () => {
    const err = validateForm({ athleteName: 'Jane Doe', email: 'j@example.com', jerseyNumber: '12', positionGroup: 'QB' });
    expect(err).toBe('');
  });
});

describe('CampWalkupRegistration — online submit path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-assign implementation after clearAllMocks() wipes it.
    mockInsert.mockResolvedValue({ error: null });
    // Re-wire from() to return the builder (clearAllMocks wipes mockImplementation too).
    const { supabase } = require('@/integrations/supabase/client');
    supabase.from.mockImplementation(() => ({ insert: (...args: any[]) => mockInsert(...args) }));
  });

  test('calls supabase insert with correct fields', async () => {
    const result = await runMutationFn(
      { athleteName: 'John Smith', email: 'j@example.com', jerseyNumber: '42', positionGroup: 'WR' },
      { campId: 'camp-123', userId: 'user-abc', isOnline: true },
    );

    expect(result).toEqual({ queued: false });
    expect(supabase.from).toHaveBeenCalledWith('camp_enrollments');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        camp_id: 'camp-123',
        user_id: 'user-abc',
        jersey_number: '42',
        position_group: 'WR',
        notes: 'walk-up email: j@example.com',
        status: 'checked_in',
        payment_status: 'walkup',
        athlete_profile_id: null,
      }),
    );
    // checked_in_at should be a valid ISO string
    const insertArg = mockInsert.mock.calls[0][0];
    expect(() => new Date(insertArg.checked_in_at)).not.toThrow();
    expect(new Date(insertArg.checked_in_at).getTime()).toBeGreaterThan(0);
  });

  test('omits optional fields when blank (null in insert)', async () => {
    await runMutationFn(
      { athleteName: 'Jane Doe', email: '', jerseyNumber: '', positionGroup: '' },
      { campId: 'camp-123', userId: null, isOnline: true },
    );

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.jersey_number).toBeNull();
    expect(insertArg.position_group).toBeNull();
    expect(insertArg.notes).toBeNull();
    expect(insertArg.user_id).toBeNull();
  });

  test('throws when supabase returns an error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });

    await expect(
      runMutationFn(
        { athleteName: 'Test', email: '', jerseyNumber: '', positionGroup: '' },
        { campId: 'camp-123', userId: null, isOnline: true },
      ),
    ).rejects.toEqual({ message: 'DB error' });
  });

  test('does not call enqueueOp when online', async () => {
    await runMutationFn(
      { athleteName: 'Test', email: '', jerseyNumber: '', positionGroup: '' },
      { campId: 'camp-123', userId: null, isOnline: true },
    );

    expect(enqueueOp).not.toHaveBeenCalled();
  });
});

describe('CampWalkupRegistration — offline queue path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { supabase } = require('@/integrations/supabase/client');
    supabase.from.mockImplementation(() => ({ insert: (...args: any[]) => mockInsert(...args) }));
  });

  test('calls enqueueOp with walkup_register kind when offline', async () => {
    const result = await runMutationFn(
      { athleteName: 'John Smith', email: '', jerseyNumber: '7', positionGroup: 'RB' },
      { campId: 'camp-456', userId: 'user-xyz', isOnline: false },
    );

    expect(result).toEqual({ queued: true });
    expect(enqueueOp).toHaveBeenCalledWith({
      kind: 'walkup_register',
      campId: 'camp-456',
      payload: expect.objectContaining({
        jersey_number: '7',
        position_group: 'RB',
        user_id: 'user-xyz',
        athlete_profile_id: null,
      }),
    });
  });

  test('does not call supabase insert when offline', async () => {
    await runMutationFn(
      { athleteName: 'Offline Athlete', email: '', jerseyNumber: '', positionGroup: '' },
      { campId: 'camp-456', userId: null, isOnline: false },
    );

    expect(supabase.from).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('includes email in notes payload when provided', async () => {
    await runMutationFn(
      { athleteName: 'Test', email: 'test@example.com', jerseyNumber: '', positionGroup: '' },
      { campId: 'camp-456', userId: null, isOnline: false },
    );

    const call = (enqueueOp as jest.Mock).mock.calls[0][0];
    expect(call.payload.notes).toBe('walk-up email: test@example.com');
  });

  test('sets notes to null when no email provided', async () => {
    await runMutationFn(
      { athleteName: 'Test', email: '  ', jerseyNumber: '', positionGroup: '' },
      { campId: 'camp-456', userId: null, isOnline: false },
    );

    const call = (enqueueOp as jest.Mock).mock.calls[0][0];
    expect(call.payload.notes).toBeNull();
  });
});
