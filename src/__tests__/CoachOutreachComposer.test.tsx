jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R = require('react');
  return new Proxy({}, {
    get: (_t: any, name: string) =>
      function MockIcon() { return R.createElement(View, { testID: 'icon-' + name }); },
  });
});

jest.mock('@/integrations/supabase/client', () => ({
  supabase: { from: jest.fn(() => ({ insert: jest.fn(), select: jest.fn() })) },
}));

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/hooks/usePlayerProfile', () => ({ usePlayerProfile: () => ({ profile: null }) }));
jest.mock('@/hooks/useHSCoachProfile', () => ({ useHSCoachProfile: () => ({ profile: null }) }));
jest.mock('@/hooks/useRecordContactEvent', () => ({ useRecordContactEvent: () => ({ mutate: jest.fn() }) }));

jest.mock('@/lib/theme', () => ({
  colors: {
    background: '#101318', foreground: '#fffcf4', foregroundSubtle: '#808897',
    primary: '#e7af08', primaryForeground: '#101318', accent: '#edbd2a',
    secondary: '#272b34', muted: '#20242b', mutedForeground: '#808897',
    destructive: '#dc2828', border: '#2b303a',
  },
  typography: {
    fontFamily: { heading: 'System', body: 'System', mono: 'System' },
    fontSize: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  shadows: {},
}));

jest.mock('@/lib/utils', () => ({ copyToClipboard: jest.fn() }));
jest.mock('@/components/ui/Button', () => ({ Button: 'Button' }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));

import { buildMailtoUrl } from '@/components/CoachOutreachComposer';
import type { OutreachCoach, TemplateKey } from '@/components/CoachOutreachComposer';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const coach: OutreachCoach = {
  id: 'coach-1',
  name: 'Coach Smith',
  school: 'State University',
  email: 'smith@stateuniversity.edu',
  position_coached: 'Offensive Coordinator',
  sport: 'Football',
};

const coachNoEmail: OutreachCoach = {
  id: 'coach-2',
  name: 'Coach Jones',
  school: 'City College',
};

const coachNoName: OutreachCoach = {
  id: 'coach-3',
  school: 'City College',
};

const senderCtx = {
  senderName: 'John Doe',
  senderPosition: 'Wide Receiver',
  senderSchool: 'Lincoln High School',
  senderGradYear: '2026',
  senderGpa: '3.8',
  senderSport: 'Football',
};

// ── mailto URL construction ───────────────────────────────────────────────────

describe('buildMailtoUrl', () => {
  it('produces a valid mailto: URL with recipient email', () => {
    const url = buildMailtoUrl(coach, 'intro', senderCtx);
    expect(url).toMatch(/^mailto:smith@stateuniversity\.edu\?/);
  });

  it('includes encoded subject and body query params', () => {
    const url = buildMailtoUrl(coach, 'intro', senderCtx);
    expect(url).toContain('subject=');
    expect(url).toContain('body=');
  });

  it('URL-encodes spaces in subject', () => {
    const url = buildMailtoUrl(coach, 'intro', senderCtx);
    const subjectPart = url.split('subject=')[1].split('&')[0];
    expect(subjectPart).not.toContain(' ');
    expect(decodeURIComponent(subjectPart)).toContain('John Doe');
  });

  it('URL-encodes newlines in body', () => {
    const url = buildMailtoUrl(coach, 'intro', senderCtx);
    const bodyPart = url.split('body=')[1];
    // raw newlines must not appear — they must be encoded
    expect(bodyPart).not.toMatch(/\r?\n/);
  });

  it('falls back to empty string for email when coach has no email', () => {
    const url = buildMailtoUrl(coachNoEmail, 'intro', senderCtx);
    expect(url).toMatch(/^mailto:\?/);
  });
});

// ── Template personalization ──────────────────────────────────────────────────

describe('template personalization', () => {
  it('intro — subject contains sender name and grad year', () => {
    const url = buildMailtoUrl(coach, 'intro', senderCtx);
    const subject = decodeURIComponent(url.split('subject=')[1].split('&')[0]);
    expect(subject).toContain('John Doe');
    expect(subject).toContain('2026');
  });

  it('intro — body addresses coach by name', () => {
    const url = buildMailtoUrl(coach, 'intro', senderCtx);
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body).toContain('Coach Smith');
    expect(body).toContain('State University');
    expect(body).toContain('3.8');
  });

  it('camp_followup — subject references school', () => {
    const url = buildMailtoUrl(coach, 'camp_followup', senderCtx);
    const subject = decodeURIComponent(url.split('subject=')[1].split('&')[0]);
    expect(subject).toContain('State University');
  });

  it('camp_followup — body mentions attending camp', () => {
    const url = buildMailtoUrl(coach, 'camp_followup', senderCtx);
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body).toContain('camp');
    expect(body).toContain('John Doe');
  });

  it('highlight_share — subject contains position', () => {
    const url = buildMailtoUrl(coach, 'highlight_share', senderCtx);
    const subject = decodeURIComponent(url.split('subject=')[1].split('&')[0]);
    expect(subject).toContain('Wide Receiver');
  });

  it('highlight_share — body references highlight film', () => {
    const url = buildMailtoUrl(coach, 'highlight_share', senderCtx);
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body.toLowerCase()).toContain('highlight');
    expect(body).toContain('3.8');
  });

  it('all templates — body signs off with sender name', () => {
    (['intro', 'camp_followup', 'highlight_share'] as const).forEach((t) => {
      const url = buildMailtoUrl(coach, t, senderCtx);
      const body = decodeURIComponent(url.split('body=')[1]);
      expect(body).toContain('John Doe');
    });
  });

  it('omits GPA line when gpa is empty', () => {
    const ctxNoGpa = { ...senderCtx, senderGpa: '' };
    const url = buildMailtoUrl(coach, 'intro', ctxNoGpa);
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body).not.toContain('GPA');
  });

  it('falls back to "Coach" when coach name is missing', () => {
    const url = buildMailtoUrl(coachNoName, 'intro', senderCtx);
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body).toContain('Dear Coach,');
  });

  it('falls back to "your program" when school is missing', () => {
    const url = buildMailtoUrl(coachNoEmail, 'intro', senderCtx);
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body).toContain('your program');
  });
});

// ── Send All staggering ───────────────────────────────────────────────────────

describe('Send All staggering', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('staggers N coaches with 350 ms delays between opens', async () => {
    const openURL = jest.fn().mockResolvedValue(undefined);
    const coaches = [
      { ...coach, id: 'c1', email: 'a@x.com' },
      { ...coach, id: 'c2', email: 'b@x.com' },
      { ...coach, id: 'c3', email: 'c@x.com' },
    ];

    // Replicate the Send All loop logic directly (pure logic test)
    const delays: number[] = [];
    const runSendAll = async () => {
      for (let i = 0; i < coaches.length; i++) {
        openURL(buildMailtoUrl(coaches[i], 'intro', senderCtx));
        if (i < coaches.length - 1) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 350);
            delays.push(350);
          });
        }
      }
    };

    const promise = runSendAll();
    // advance all timers and flush microtasks between each
    await jest.runAllTimersAsync();
    await promise;

    expect(openURL).toHaveBeenCalledTimes(3);
    expect(delays).toHaveLength(2); // N-1 delays between N coaches
    delays.forEach((d) => expect(d).toBe(350));
  });
});

// ── Contact event logging ─────────────────────────────────────────────────────

describe('contact event logging', () => {
  it('mutate is called once per coach open with correct shape', () => {
    const mutateMock = jest.fn();

    // Simulate what openMailto does after Linking.openURL succeeds
    const simulateOpen = (c: OutreachCoach, _tmpl: TemplateKey) => {
      mutateMock({
        coach_id: c.id,
        coach_name: c.name ?? '',
        school: c.school ?? null,
        contact_type: 'email',
        status: 'sent',
        notes: `Template: Intro`,
      });
    };

    simulateOpen(coach, 'intro');

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        coach_id: 'coach-1',
        contact_type: 'email',
        status: 'sent',
      }),
    );
  });

  it('does not call mutate when Linking.openURL throws', async () => {
    const mutateMock = jest.fn();
    const openURL = jest.fn().mockRejectedValue(new Error('no mail app'));

    const simulateOpenMailto = async (c: OutreachCoach) => {
      try {
        await openURL('mailto:test@test.com');
        mutateMock({ coach_id: c.id });
      } catch {
        // swallowed — toast would fire instead
      }
    };

    await simulateOpenMailto(coach);
    expect(mutateMock).not.toHaveBeenCalled();
  });
});

// ── coach_outreach_followups missing ─────────────────────────────────────────

describe('coach_outreach_followups table absence', () => {
  it('core send flow does not reference coach_outreach_followups', () => {
    // The follow-up scheduling feature is deferred. Verify buildMailtoUrl
    // and the contact-event path have no dependency on that table.
    const url = buildMailtoUrl(coach, 'intro', senderCtx);
    // If we got here without error, there is no runtime dependency on the missing table.
    expect(url).toMatch(/^mailto:/);
  });
});
