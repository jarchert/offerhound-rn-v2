/**
 * AdminPlatformEmailTemplates.test.tsx
 *
 * 1. AdminPlatformEmailTemplates — component
 *    a. renders both template tabs
 *    b. loads and displays waitlist_offer subject/body
 *    c. renders one chip per available_token
 *    d. live preview substitutes {{tokens}} with sample data
 *    e. Save is disabled until draft differs from loaded value
 *    f. Save calls supabase update({ subject, body }).eq('id', <id>)
 *    g. tapping a token chip calls Clipboard.setStringAsync('{{token}}')
 *    h. switching tabs loads the second template's content into the draft
 *    i. missing template shows the empty-seed hint
 *
 * 2. AdminContentScreen — wiring
 *    a. AdminPlatformEmailTemplates renders inside the Content screen
 */

import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/integrations/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// AdminContentScreen pulls in these siblings; stub so this test file
// only exercises AdminPlatformEmailTemplates wiring.
jest.mock('@/components/admin/PodcastTileUpload', () => ({
  PodcastTileUpload: () => null,
}));
jest.mock('@/components/AdminInvitationCards', () => ({
  AdminInvitationCards: () => null,
}));

// ── imports (after mocks) ──────────────────────────────────────────────────

import AdminPlatformEmailTemplates from '@/components/AdminPlatformEmailTemplates';
import AdminContentScreen from '@/screens/admin/AdminContentScreen';

// ── fixtures ───────────────────────────────────────────────────────────────

const WAITLIST_ROW = {
  id: 'row-1',
  template_key: 'athlete_waitlist_offer',
  subject: 'You are off the waitlist for {{camp_name}}',
  body:
    'Hi {{athlete_name}},\n\n' +
    'A spot just opened for {{camp_name}} on {{camp_dates}}{{camp_location_line}}. ' +
    'Claim it here: {{claim_link}}',
  description: 'Sent when an athlete is auto-promoted from the waitlist.',
  available_tokens: [
    'athlete_name',
    'camp_name',
    'camp_dates',
    'camp_location_line',
    'claim_link',
  ],
  updated_at: '2026-05-01T12:00:00Z',
};

const CLAIM_ROW = {
  id: 'row-2',
  template_key: 'athlete_claim_confirmation',
  subject: 'You are confirmed for {{camp_name}}',
  body:
    'Hi {{athlete_name}},\n\n' +
    "You're all set for {{camp_name}}. See details: {{camp_link}}",
  description: 'Confirmation once the athlete claims the offered spot.',
  available_tokens: ['athlete_name', 'camp_name', 'camp_link'],
  updated_at: '2026-05-02T12:00:00Z',
};

// ── supabase mock helpers ──────────────────────────────────────────────────

/**
 * Build a supabase chain that supports the two shapes this component uses:
 *   from('platform_email_templates').select('*').in('template_key', keys)
 *   from('platform_email_templates').update({...}).eq('id', <id>)
 */
function makeSupabaseChain(rows: any[]) {
  const inFn = jest.fn().mockResolvedValue({ data: rows, error: null });
  const selectFn = jest.fn().mockReturnValue({ in: inFn });
  const eqFn = jest.fn().mockResolvedValue({ data: null, error: null });
  const updateFn = jest.fn().mockReturnValue({ eq: eqFn });
  return {
    from: jest.fn().mockReturnValue({
      select: selectFn,
      update: updateFn,
    }),
    _spies: { selectFn, inFn, updateFn, eqFn },
  };
}

function installSupabase(rows: any[]) {
  const { supabase } = require('@/integrations/supabase/client');
  const chain = makeSupabaseChain(rows);
  supabase.from.mockImplementation(chain.from);
  return chain;
}

// ── harness ───────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>;
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('AdminPlatformEmailTemplates — loading + tabs', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders both template tabs', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));
    await findByTestId('template-tab-athlete_waitlist_offer');
    await findByTestId('template-tab-athlete_claim_confirmation');
  });

  it('populates subject/body with the loaded waitlist_offer copy', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));
    const subject = await findByTestId('template-subject-input');
    const body = await findByTestId('template-body-input');
    await waitFor(() => expect(subject.props.value).toBe(WAITLIST_ROW.subject));
    expect(body.props.value).toBe(WAITLIST_ROW.body);
  });

  it('switching to claim_confirmation swaps the draft to that template', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));
    // wait for initial load
    const subject = await findByTestId('template-subject-input');
    await waitFor(() => expect(subject.props.value).toBe(WAITLIST_ROW.subject));

    fireEvent.press(await findByTestId('template-tab-athlete_claim_confirmation'));
    await waitFor(() => expect(subject.props.value).toBe(CLAIM_ROW.subject));
  });

  it('shows empty hint when the template is not seeded', async () => {
    installSupabase([]); // no rows
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));
    await findByTestId('templates-empty');
  });
});

describe('AdminPlatformEmailTemplates — token chips', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders a chip for every available_token', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));
    for (const t of WAITLIST_ROW.available_tokens) {
      await findByTestId(`token-chip-${t}`);
    }
  });

  it('tapping a token chip copies {{token}} via expo-clipboard', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const Clipboard = require('expo-clipboard');
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));
    const chip = await findByTestId('token-chip-athlete_name');
    await act(async () => {
      fireEvent.press(chip);
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('{{athlete_name}}');
  });
});

describe('AdminPlatformEmailTemplates — live preview', () => {
  afterEach(() => jest.clearAllMocks());

  it('substitutes {{tokens}} in subject and body preview with sample data', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));

    const previewSubject = await findByTestId('preview-subject');
    const previewBody = await findByTestId('preview-body');

    // Subject uses only {{camp_name}}
    await waitFor(() =>
      expect(previewSubject.props.children).toBe(
        'You are off the waitlist for Summer Showcase',
      ),
    );
    // Body substitutes several tokens and must NOT contain any {{...}} left
    const bodyText: string = previewBody.props.children;
    expect(bodyText).toContain('Marcus Johnson');
    expect(bodyText).toContain('Summer Showcase');
    expect(bodyText).toContain('Jul 12 – Jul 14, 2026');
    expect(bodyText).toContain(' at Lincoln HS Stadium, Austin, TX');
    expect(bodyText).toContain('https://offerhound.app/camps/claim?token=sample');
    expect(bodyText).not.toMatch(/\{\{[a-z_]+\}\}/);
  });
});

describe('AdminPlatformEmailTemplates — save', () => {
  afterEach(() => jest.clearAllMocks());

  it('Save is disabled while draft matches loaded values', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));
    // wait for load
    const subject = await findByTestId('template-subject-input');
    await waitFor(() => expect(subject.props.value).toBe(WAITLIST_ROW.subject));

    const btn = await findByTestId('template-save-btn');
    // Pressable exposes disabled via accessibilityState
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('editing the subject enables Save and update/eq are called on press', async () => {
    const chain = installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminPlatformEmailTemplates />));

    const subject = await findByTestId('template-subject-input');
    await waitFor(() => expect(subject.props.value).toBe(WAITLIST_ROW.subject));

    fireEvent.changeText(subject, 'A new subject line');
    const btn = await findByTestId('template-save-btn');
    await waitFor(() => expect(btn.props.accessibilityState?.disabled).toBe(false));

    await act(async () => {
      fireEvent.press(btn);
    });

    await waitFor(() => {
      expect(chain._spies.updateFn).toHaveBeenCalledWith({
        subject: 'A new subject line',
        body: WAITLIST_ROW.body,
      });
      expect(chain._spies.eqFn).toHaveBeenCalledWith('id', WAITLIST_ROW.id);
    });
  });

  it('queries platform_email_templates with template_key IN [both keys]', async () => {
    const chain = installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    render(wrap(<AdminPlatformEmailTemplates />));
    await waitFor(() =>
      expect(chain._spies.inFn).toHaveBeenCalledWith('template_key', [
        'athlete_waitlist_offer',
        'athlete_claim_confirmation',
      ]),
    );
  });
});

describe('AdminContentScreen — wiring', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders AdminPlatformEmailTemplates inside the Content screen', async () => {
    installSupabase([WAITLIST_ROW, CLAIM_ROW]);
    const { findByTestId } = await render(wrap(<AdminContentScreen />));
    await findByTestId('platform-email-templates');
  });
});
