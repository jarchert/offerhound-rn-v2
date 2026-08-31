import React from 'react';
import { render, waitFor, fireEvent, act, cleanup } from '@testing-library/react-native';

// ── react-query stub ──────────────────────────────────────────────────────────
jest.mock('@tanstack/react-query', () => ({
  QueryClient:         class { constructor() {} },
  QueryClientProvider: ({ children }: any) => children,
  useQuery:            jest.fn(),
  useMutation:         jest.fn(),
  useQueryClient:      jest.fn(),
}));

// ── useFootballProgram: controlled via globalThis ─────────────────────────────
jest.mock('@/hooks/useFootballProgram', () => ({
  useFootballProgram: () => (globalThis as any).__footballProgramHook,
  PROGRAM_EMPTY: {
    program_name: '', school_name: '', city: '', state: '',
    classification: '', head_coach_name: '', head_coach_email: '', head_coach_phone: '',
  },
}));

// ── expo-clipboard ────────────────────────────────────────────────────────────
const mockSetStringAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: any[]) => mockSetStringAsync(...args),
}));

// ── lucide-react-native ───────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R = require('react');
  return new Proxy({}, {
    get: (_: any, name: string) =>
      function MockIcon() { return R.createElement(View, { testID: 'icon-' + name }); },
  });
});

// ── Theme ─────────────────────────────────────────────────────────────────────
jest.mock('@/lib/theme', () => ({
  colors: {
    background: '#101318', foreground: '#fff', foregroundSubtle: '#808',
    primary: '#e7af08', primaryForeground: '#101318', accent: '#edbd2a',
    secondary: '#272b34', muted: '#20242b', mutedForeground: '#808',
    destructive: '#dc2828', border: '#2b303a',
  },
  typography: { fontSize: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24 } },
  spacing:    { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius:     { sm: 4, md: 8, lg: 16, full: 9999 },
  shadows:    {},
}));

// ── UI stubs ──────────────────────────────────────────────────────────────────
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onPress, disabled, testID, variant, style }: any) => {
    const { Pressable, Text } = require('react-native');
    const isDisabled = !!disabled;
    return (
      <Pressable
        testID={testID}
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
        accessibilityState={{ disabled: isDisabled }}
      >
        <Text>{children}</Text>
      </Pressable>
    );
  },
}));

jest.mock('@/components/ui/Textarea', () => ({
  Textarea: ({ value, onChangeText, testID, placeholder, numberOfLines, style }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID={testID}
        value={value ?? ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline
      />
    );
  },
}));

jest.mock('@/components/ui/Card', () => {
  const { View } = require('react-native');
  return {
    Card:            ({ children }: any) => <View>{children}</View>,
    CardContent:     ({ children }: any) => <View>{children}</View>,
    CardHeader:      ({ children }: any) => <View>{children}</View>,
    CardTitle:       ({ children }: any) => <View>{children}</View>,
    CardDescription: ({ children }: any) => <View>{children}</View>,
  };
});

// ── Subject ───────────────────────────────────────────────────────────────────
import {
  FootballEmailBlockTab,
  buildSignature,
  MERGE_FIELDS,
} from '@/components/football/FootballEmailBlockTab';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const FULL_PROGRAM = {
  id: 'prog-1',
  owner_user_id: 'user-123',
  program_name:     'Eagles Football',
  school_name:      'Riverside High',
  city:             'Riverside',
  state:            'CA',
  classification:   '4A',
  head_coach_name:  'John Smith',
  head_coach_email: 'jsmith@riverside.edu',
  head_coach_phone: '(555) 867-5309',
};

const PARTIAL_PROGRAM = {
  program_name:    'Lions Football',
  school_name:     '',
  city:            'Springfield',
  state:           'IL',
  head_coach_name: 'Jane Doe',
  head_coach_email: '',
  head_coach_phone: '',
};

// ── Hook helpers ──────────────────────────────────────────────────────────────
function setupHook(program: any = null, isLoading = false) {
  (globalThis as any).__footballProgramHook = { program, isLoading };
}

beforeEach(() => {
  mockSetStringAsync.mockReset();
  mockSetStringAsync.mockResolvedValue(undefined);
  setupHook();
});

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — buildSignature (pure function)
// ─────────────────────────────────────────────────────────────────────────────
describe('buildSignature', () => {
  it('returns empty string for null program', () => {
    expect(buildSignature(null)).toBe('');
  });

  it('returns empty string for all-empty program', () => {
    expect(buildSignature({
      head_coach_name: '', program_name: '', school_name: '',
      city: '', state: '', head_coach_phone: '', head_coach_email: '',
    })).toBe('');
  });

  it('generates correct signature from full program', () => {
    const sig = buildSignature(FULL_PROGRAM);
    expect(sig).toBe(
      'John Smith\nEagles Football — Riverside High\nRiverside, CA\n(555) 867-5309\njsmith@riverside.edu'
    );
  });

  it('uses only program_name when school_name is empty', () => {
    const sig = buildSignature({ ...FULL_PROGRAM, school_name: '' });
    expect(sig).toContain('Eagles Football');
    expect(sig).not.toContain('—');
  });

  it('uses only school_name when program_name is empty', () => {
    const sig = buildSignature({ ...FULL_PROGRAM, program_name: '' });
    expect(sig).toContain('Riverside High');
    expect(sig).not.toContain('—');
  });

  it('omits city/state line when both are empty', () => {
    const sig = buildSignature({ ...FULL_PROGRAM, city: '', state: '' });
    // 'Riverside' still appears in school_name ('Riverside High') — check the
    // combined city, state format is absent, not the word itself.
    expect(sig).not.toContain('Riverside, CA');
    expect(sig).not.toContain(', CA');
  });

  it('omits phone when empty', () => {
    const sig = buildSignature({ ...FULL_PROGRAM, head_coach_phone: '' });
    expect(sig).not.toContain('867-5309');
  });

  it('omits email when empty', () => {
    const sig = buildSignature({ ...FULL_PROGRAM, head_coach_email: '' });
    expect(sig).not.toContain('jsmith');
  });

  it('handles partial program (city+state, no email/phone)', () => {
    const sig = buildSignature(PARTIAL_PROGRAM);
    expect(sig).toContain('Jane Doe');
    expect(sig).toContain('Lions Football');
    expect(sig).toContain('Springfield, IL');
    expect(sig).not.toContain('jsmith');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — MERGE_FIELDS contract
// ─────────────────────────────────────────────────────────────────────────────
describe('MERGE_FIELDS', () => {
  it('has exactly 11 entries', () => {
    expect(MERGE_FIELDS.length).toBe(11);
  });

  it('contains all expected tags', () => {
    const tags = MERGE_FIELDS.map(f => f.tag);
    expect(tags).toContain('{{program_name}}');
    expect(tags).toContain('{{school_name}}');
    expect(tags).toContain('{{head_coach_name}}');
    expect(tags).toContain('{{head_coach_email}}');
    expect(tags).toContain('{{athlete_name}}');
    expect(tags).toContain('{{athlete_position}}');
    expect(tags).toContain('{{athlete_grad_year}}');
    expect(tags).toContain('{{athlete_hudl_url}}');
    expect(tags).toContain('{{athlete_highlights}}');
    expect(tags).toContain('{{athlete_socials}}');
    expect(tags).toContain('{{signature_block}}');
  });

  it('every entry has a non-empty desc', () => {
    MERGE_FIELDS.forEach(f => {
      expect(f.desc.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballEmailBlockTab — rendering', () => {
  it('renders signature textarea', async () => {
    setupHook(FULL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('signature-textarea')).toBeTruthy());
  });

  it('renders copy-signature and reset-signature buttons', async () => {
    setupHook(FULL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => {
      expect(getByTestId('copy-signature')).toBeTruthy();
      expect(getByTestId('reset-signature')).toBeTruthy();
    });
  });

  it('renders all 11 merge-field buttons', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => {
      MERGE_FIELDS.forEach(({ tag }) => {
        expect(getByTestId(`merge-field-${tag}`)).toBeTruthy();
      });
    });
  });

  it('shows program-hint when program is null', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('program-hint')).toBeTruthy());
  });

  it('does not show program-hint when program exists', async () => {
    setupHook(FULL_PROGRAM);
    const { queryByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(queryByTestId('program-hint')).toBeNull());
  });

  it('shows loading indicator while isLoading=true', async () => {
    setupHook(null, true);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('email-block-loading')).toBeTruthy());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — signature auto-generation from program data
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballEmailBlockTab — signature auto-generation', () => {
  it('seeds textarea with generated signature from full program', async () => {
    setupHook(FULL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => {
      const ta = getByTestId('signature-textarea');
      expect(ta.props.value).toBe(
        'John Smith\nEagles Football — Riverside High\nRiverside, CA\n(555) 867-5309\njsmith@riverside.edu'
      );
    });
  });

  it('seeds textarea with partial signature when some fields empty', async () => {
    setupHook(PARTIAL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => {
      const ta = getByTestId('signature-textarea');
      expect(ta.props.value).toContain('Jane Doe');
      expect(ta.props.value).toContain('Springfield, IL');
    });
  });

  it('textarea is empty when program is null', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => {
      expect(getByTestId('signature-textarea').props.value).toBe('');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — edit / override behaviour
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballEmailBlockTab — edit/override', () => {
  it('allows coach to edit the signature textarea', async () => {
    setupHook(FULL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('signature-textarea')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('signature-textarea'), 'My custom sig');
    });
    await waitFor(() => {
      expect(getByTestId('signature-textarea').props.value).toBe('My custom sig');
    });
  });

  it('reset button restores auto-generated signature after edit', async () => {
    setupHook(FULL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('signature-textarea')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(getByTestId('signature-textarea'), 'edited content');
    });
    await waitFor(() =>
      expect(getByTestId('signature-textarea').props.value).toBe('edited content')
    );

    await act(async () => { fireEvent.press(getByTestId('reset-signature')); });
    await waitFor(() => {
      expect(getByTestId('signature-textarea').props.value).toContain('John Smith');
    });
  });

  it('reset button is disabled when no program exists', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('reset-signature')).toBeTruthy());
    expect(getByTestId('reset-signature').props.accessibilityState.disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — copy button / expo-clipboard
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballEmailBlockTab — copy signature', () => {
  it('calls Clipboard.setStringAsync with current signature on copy press', async () => {
    setupHook(FULL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('copy-signature')).toBeTruthy());

    await act(async () => { fireEvent.press(getByTestId('copy-signature')); });

    expect(mockSetStringAsync).toHaveBeenCalledTimes(1);
    expect(mockSetStringAsync).toHaveBeenCalledWith(
      'John Smith\nEagles Football — Riverside High\nRiverside, CA\n(555) 867-5309\njsmith@riverside.edu'
    );
  });

  it('calls Clipboard.setStringAsync with edited signature after manual edit', async () => {
    setupHook(FULL_PROGRAM);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('signature-textarea')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(getByTestId('signature-textarea'), 'Custom override sig');
    });
    await act(async () => { fireEvent.press(getByTestId('copy-signature')); });

    expect(mockSetStringAsync).toHaveBeenCalledWith('Custom override sig');
  });

  it('copy-signature button is disabled when program is null and textarea is empty', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() => expect(getByTestId('copy-signature')).toBeTruthy());
    expect(getByTestId('copy-signature').props.accessibilityState.disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — merge-field copy
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballEmailBlockTab — merge field copy', () => {
  it('calls Clipboard.setStringAsync with the tag when a merge field is pressed', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() =>
      expect(getByTestId('merge-field-{{program_name}}')).toBeTruthy()
    );

    await act(async () => {
      fireEvent.press(getByTestId('merge-field-{{program_name}}'));
    });

    expect(mockSetStringAsync).toHaveBeenCalledWith('{{program_name}}');
  });

  it('calls Clipboard.setStringAsync with the correct tag for each field', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() =>
      expect(getByTestId('merge-field-{{signature_block}}')).toBeTruthy()
    );

    await act(async () => {
      fireEvent.press(getByTestId('merge-field-{{signature_block}}'));
    });

    expect(mockSetStringAsync).toHaveBeenCalledWith('{{signature_block}}');
  });

  it('renders all 11 merge fields and each is pressable', async () => {
    setupHook(null);
    const { getByTestId } = await render(<FootballEmailBlockTab />);
    await waitFor(() =>
      expect(getByTestId(`merge-field-${MERGE_FIELDS[0].tag}`)).toBeTruthy()
    );

    for (const { tag } of MERGE_FIELDS) {
      const btn = getByTestId(`merge-field-${tag}`);
      expect(btn).toBeTruthy();
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — isolation / cross-test hygiene
// ─────────────────────────────────────────────────────────────────────────────
describe('cross-test isolation', () => {
  it('clipboard mock is clean at start of test (1)', () => {
    expect(mockSetStringAsync).not.toHaveBeenCalled();
  });

  it('clipboard mock is clean at start of test (2)', () => {
    expect(mockSetStringAsync).not.toHaveBeenCalled();
  });
});
