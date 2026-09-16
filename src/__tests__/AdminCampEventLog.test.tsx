/**
 * AdminCampEventLog.test.tsx
 *
 * 1. AdminCampEventLog — real component
 *    a. renders row for each camp_event_log entry
 *    b. shows event label and skipped-reason badge
 *    c. empty state when no events
 *    d. apply filters triggers a refetch with .eq / .ilike filters
 *    e. next / prev pager updates .range() offsets
 *    f. tapping a row opens the detail modal with raw JSON
 *    g. export CSV writes a file and invokes Sharing.shareAsync
 *    h. skipped-reason filter forces event_type=email_send_skipped
 *
 * 2. AdminAuditScreen — sub-tab wiring
 *    a. Opt-outs and Camp events sub-tabs render
 *    b. tapping Camp events shows the camp events surface
 *    c. tapping Opt-outs hides it again
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------- Supabase mock ----------

const mockSupabaseState: {
  handler:
    | null
    | ((op: {
        method: 'range' | 'limit';
        from: number;
        to: number;
        limit: number;
        chain: Array<{ fn: string; args: any[] }>;
      }) => any);
} = { handler: null };

jest.mock('@/integrations/supabase/client', () => {
  const buildQuery = () => {
    const chain: Array<{ fn: string; args: any[] }> = [];
    const q: any = {};
    const chainable = ['select', 'order', 'eq', 'ilike'];
    for (const fn of chainable) {
      q[fn] = jest.fn((...args: any[]) => {
        chain.push({ fn, args });
        return q;
      });
    }
    q.range = jest.fn(async (from: number, to: number) => {
      chain.push({ fn: 'range', args: [from, to] });
      return mockSupabaseState.handler
        ? mockSupabaseState.handler({ method: 'range', from, to, limit: 0, chain })
        : { data: [], error: null, count: 0 };
    });
    q.limit = jest.fn(async (limit: number) => {
      chain.push({ fn: 'limit', args: [limit] });
      return mockSupabaseState.handler
        ? mockSupabaseState.handler({ method: 'limit', from: 0, to: 0, limit, chain })
        : { data: [], error: null };
    });
    return q;
  };
  return {
    supabase: {
      from: jest.fn(() => buildQuery()),
    },
  };
});

// ---------- expo-file-system / expo-sharing ----------

const mockWriteAsStringAsync = jest.fn(async () => undefined);
const mockShareAsync = jest.fn(async () => undefined);
const mockIsAvailableAsync = jest.fn(async () => true);

jest.mock('expo-file-system', () => ({
  __esModule: true,
  cacheDirectory: '/cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: (...a: any[]) => (mockWriteAsStringAsync as any)(...a),
}));

jest.mock('expo-sharing', () => ({
  __esModule: true,
  isAvailableAsync: (...a: any[]) => (mockIsAvailableAsync as any)(...a),
  shareAsync: (...a: any[]) => (mockShareAsync as any)(...a),
}));

// ---------- @shopify/flash-list ----------

jest.mock('@shopify/flash-list', () => {
  const RN = require('react-native');
  const React = require('react');
  return {
    FlashList: ({ data, renderItem, keyExtractor }: any) =>
      React.createElement(
        RN.View,
        null,
        (data || []).map((item: any, index: number) =>
          React.createElement(
            RN.View,
            { key: keyExtractor ? keyExtractor(item, index) : String(index) },
            renderItem({ item, index }),
          ),
        ),
      ),
  };
});

// ---------- lucide-react-native ----------

jest.mock('lucide-react-native', () => {
  const RN = require('react-native');
  const React = require('react');
  const stub = (name: string) => (props: any) =>
    React.createElement(RN.View, { ...props, testID: props?.testID || `icon-${name}` });
  return new Proxy(
    {},
    {
      get: (_t, name) => stub(String(name)),
    },
  );
});

// ---------- imports under test ----------

import AdminCampEventLog from '@/components/AdminCampEventLog';
import AdminAuditScreen from '@/screens/admin/AdminAuditScreen';

// ---------- fixtures ----------

const now = '2026-08-24T12:00:00.000Z';
const sampleRows = [
  {
    id: 'evt-1',
    event_type: 'enrollment_created',
    camp_id: 'camp-1',
    enrollment_id: 'enr-1',
    waitlist_id: null,
    athlete_user_id: 'user-1',
    athlete_email: 'a@example.com',
    details: { source: 'walkup' },
    created_at: now,
  },
  {
    id: 'evt-2',
    event_type: 'email_send_skipped',
    camp_id: 'camp-1',
    enrollment_id: null,
    waitlist_id: 'wl-1',
    athlete_user_id: 'user-2',
    athlete_email: 'b@example.com',
    details: { skipped_reason: 'opted_out', template: 'waitlist' },
    created_at: now,
  },
];

async function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const result = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return result;
}

// helper: install a handler that echoes filters back for assertions
function setHandler(
  rows: any[],
  captures: {
    rangeCalls: Array<[number, number]>;
    limitCalls: number[];
    lastChain: Array<{ fn: string; args: any[] }>;
    chains?: Array<Array<{ fn: string; args: any[] }>>;
  },
) {
  captures.chains = captures.chains || [];
  mockSupabaseState.handler = (op) => {
    captures.lastChain = op.chain;
    captures.chains!.push(op.chain);
    if (op.method === 'range') {
      captures.rangeCalls.push([op.from, op.to]);
      return { data: rows, error: null, count: rows.length };
    }
    captures.limitCalls.push(op.limit);
    return { data: rows, error: null };
  };
}

// ---------- tests ----------

describe('AdminCampEventLog — real component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseState.handler = null;
  });

  it('renders a row for each camp_event_log entry', async () => {
    const captures = { rangeCalls: [] as Array<[number, number]>, limitCalls: [] as number[], lastChain: [] as any };
    setHandler(sampleRows, captures);

    const utils = await renderWithClient(<AdminCampEventLog />);
    await waitFor(() => {
      expect(utils.getByTestId('camp-event-row-evt-1')).toBeTruthy();
      expect(utils.getByTestId('camp-event-row-evt-2')).toBeTruthy();
    });
    // Human-facing labels are present
    expect(utils.getAllByText('Enrollment created').length).toBeGreaterThan(0);
    expect(utils.getAllByText('Email skipped').length).toBeGreaterThan(0);
    // Skipped-reason chip is rendered
    expect(utils.getAllByText('Opted out').length).toBeGreaterThan(0);
  });

  it('renders empty state when no events', async () => {
    const captures = { rangeCalls: [], limitCalls: [], lastChain: [] } as any;
    setHandler([], captures);
    const utils = await renderWithClient(<AdminCampEventLog />);
    await waitFor(() => {
      expect(utils.getByText('No events found')).toBeTruthy();
    });
  });

  it('apply filters triggers a refetch with .eq / .ilike filters', async () => {
    const captures = { rangeCalls: [] as Array<[number, number]>, limitCalls: [] as number[], lastChain: [] as any };
    setHandler(sampleRows, captures);

    const utils = await renderWithClient(<AdminCampEventLog />);
    await waitFor(() => utils.getByTestId('camp-events-apply'));

    await act(async () => {
      fireEvent.changeText(utils.getByTestId('filter-camp-id'), 'camp-42');
      fireEvent.changeText(utils.getByTestId('filter-email'), 'jane');
      fireEvent.press(utils.getByTestId('filter-event-type-enrollment_created'));
    });

    await act(async () => {
      fireEvent.press(utils.getByTestId('camp-events-apply'));
    });

    await waitFor(() => {
      const chain = captures.lastChain as Array<{ fn: string; args: any[] }>;
      const eqCalls = chain.filter((c) => c.fn === 'eq').map((c) => c.args);
      const ilikeCalls = chain.filter((c) => c.fn === 'ilike').map((c) => c.args);
      expect(eqCalls).toEqual(
        expect.arrayContaining([
          ['camp_id', 'camp-42'],
          ['event_type', 'enrollment_created'],
        ]),
      );
      expect(ilikeCalls).toEqual(expect.arrayContaining([['athlete_email', '%jane%']]));
    });
  });

  it('skipped-reason filter forces event_type=email_send_skipped and JSON key filter', async () => {
    const captures = { rangeCalls: [] as Array<[number, number]>, limitCalls: [] as number[], lastChain: [] as any };
    setHandler(sampleRows, captures);
    const utils = await renderWithClient(<AdminCampEventLog />);
    await waitFor(() => utils.getByTestId('camp-events-apply'));

    await act(async () => {
      fireEvent.press(utils.getByTestId('filter-skipped-reason-opted_out'));
    });
    await act(async () => {
      fireEvent.press(utils.getByTestId('camp-events-apply'));
    });

    await waitFor(() => {
      const eqCalls = (captures.lastChain as any[])
        .filter((c) => c.fn === 'eq')
        .map((c) => c.args);
      expect(eqCalls).toEqual(
        expect.arrayContaining([
          ['event_type', 'email_send_skipped'],
          ['details->>skipped_reason', 'opted_out'],
        ]),
      );
    });
  });

  it('next / prev pager updates .range() offsets', async () => {
    // Force enough rows to allow a second page
    const many = Array.from({ length: 60 }, (_, i) => ({ ...sampleRows[0], id: `evt-${i}` }));
    const captures = { rangeCalls: [] as Array<[number, number]>, limitCalls: [] as number[], lastChain: [] as any };
    mockSupabaseState.handler = (op) => {
      captures.lastChain = op.chain;
      if (op.method === 'range') {
        captures.rangeCalls.push([op.from, op.to]);
        return { data: many.slice(op.from, op.to + 1), error: null, count: many.length };
      }
      captures.limitCalls.push(op.limit);
      return { data: many, error: null };
    };

    const utils = await renderWithClient(<AdminCampEventLog />);
    await waitFor(() => utils.getByTestId('camp-events-next'));
    expect(captures.rangeCalls[0]).toEqual([0, 49]);

    await act(async () => {
      fireEvent.press(utils.getByTestId('camp-events-next'));
    });
    await waitFor(() => expect(captures.rangeCalls.length).toBeGreaterThanOrEqual(2));
    expect(captures.rangeCalls[captures.rangeCalls.length - 1]).toEqual([50, 99]);

    // Wait for the pager to re-mount after the query refetch completes.
    // React Query briefly returns undefined during refetch, which unmounts
    // the pager (rendered only when rows.length > 0). Without this wait,
    // camp-events-prev may not be in the tree when we try to press it.
    await waitFor(() => utils.getByTestId('camp-events-prev'));

    await act(async () => {
      fireEvent.press(utils.getByTestId('camp-events-prev'));
    });
    await waitFor(() => {
      const last = captures.rangeCalls[captures.rangeCalls.length - 1];
      expect(last).toEqual([0, 49]);
    });
  });

  it('tapping a row opens the detail modal with raw JSON', async () => {
    const captures = { rangeCalls: [], limitCalls: [], lastChain: [] } as any;
    setHandler(sampleRows, captures);
    const utils = await renderWithClient(<AdminCampEventLog />);
    await waitFor(() => utils.getByTestId('camp-event-row-evt-2'));

    fireEvent.press(utils.getByTestId('camp-event-row-evt-2'));

    await waitFor(() => {
      expect(utils.getByTestId('camp-event-detail-modal')).toBeTruthy();
      const json = utils.getByTestId('camp-event-detail-json');
      // raw JSON of the exact row
      expect(json.props.children).toContain('"id": "evt-2"');
      expect(json.props.children).toContain('"skipped_reason": "opted_out"');
    });
  });

  it('export CSV writes a file and calls Sharing.shareAsync', async () => {
    const captures = { rangeCalls: [] as Array<[number, number]>, limitCalls: [] as number[], lastChain: [] as any };
    setHandler(sampleRows, captures);

    const utils = await renderWithClient(<AdminCampEventLog />);
    // Wait for rows to load so the export button is enabled.
    await waitFor(() => utils.getByTestId('camp-event-row-evt-1'));

    await act(async () => {
      fireEvent.press(utils.getByTestId('camp-events-export'));
    });

    await waitFor(() => {
      expect(mockWriteAsStringAsync).toHaveBeenCalled();
      expect(mockShareAsync).toHaveBeenCalled();
    });

    const [uri, csv] = (mockWriteAsStringAsync.mock.calls as any[])[0] as [string, string];
    expect(String(uri)).toContain('/cache/camp-events-');
    expect(String(uri).endsWith('.csv')).toBe(true);
    // Header + both rows
    expect(csv).toContain(
      'created_at,event_type,camp_id,enrollment_id,waitlist_id,athlete_user_id,athlete_email,skipped_reason,details',
    );
    expect(csv).toContain('a@example.com');
    expect(csv).toContain('b@example.com');
    expect(csv).toContain('opted_out');
    // Export used .limit()
    expect(captures.limitCalls.length).toBeGreaterThan(0);
  });
});

describe('AdminAuditScreen — sub-tab wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseState.handler = null;
    // Give the opt-outs branch a benign response so it can render.
    setHandler([], {
      rangeCalls: [],
      limitCalls: [],
      lastChain: [],
    } as any);
  });

  it('renders Opt-outs and Camp events sub-tab buttons', async () => {
    const utils = await renderWithClient(<AdminAuditScreen />);
    await waitFor(() => {
      expect(utils.getByTestId('audit-tab-optouts')).toBeTruthy();
      expect(utils.getByTestId('audit-tab-camp-events')).toBeTruthy();
    });
  });

  it('tapping Camp events shows the camp events surface', async () => {
    const utils = await renderWithClient(<AdminAuditScreen />);
    await waitFor(() => utils.getByTestId('audit-tab-camp-events'));

    fireEvent.press(utils.getByTestId('audit-tab-camp-events'));
    await waitFor(() => {
      // The camp events surface owns these testIDs; the opt-outs surface does not.
      expect(utils.getByTestId('camp-events-apply')).toBeTruthy();
      expect(utils.getByTestId('filter-camp-id')).toBeTruthy();
    });
  });

  it('tapping Opt-outs hides the camp events surface again', async () => {
    const utils = await renderWithClient(<AdminAuditScreen />);
    await waitFor(() => utils.getByTestId('audit-tab-camp-events'));

    fireEvent.press(utils.getByTestId('audit-tab-camp-events'));
    await waitFor(() => utils.getByTestId('camp-events-apply'));

    fireEvent.press(utils.getByTestId('audit-tab-optouts'));
    await waitFor(() => {
      expect(utils.queryByTestId('camp-events-apply')).toBeNull();
    });
  });
});
