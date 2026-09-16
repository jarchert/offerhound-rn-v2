import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

// ── react-query: fully synchronous stub ──────────────────────────────────────
jest.mock('@tanstack/react-query', () => ({
  QueryClient:         class { constructor() {} },
  QueryClientProvider: ({ children }: any) => children,
  useQuery:            jest.fn(),
  useMutation:         jest.fn(),
  useQueryClient:      jest.fn(),
}));

// ── useFootballProgram: controlled via module-level var ───────────────────────
// jest.mock is hoisted above imports, so the factory cannot close over a `let`
// declared below it. Instead we smuggle state through globalThis.
jest.mock('@/hooks/useFootballProgram', () => ({
  useFootballProgram: () => (globalThis as any).__footballProgramHook,
  PROGRAM_EMPTY: {
    program_name:     '',
    school_name:      '',
    city:             '',
    state:            '',
    classification:   '',
    head_coach_name:  '',
    head_coach_email: '',
    head_coach_phone: '',
  },
}));

// ── Auth ──────────────────────────────────────────────────────────────────────
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

// ── Toast ─────────────────────────────────────────────────────────────────────
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ── lucide-react-native ───────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R        = require('react');
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
  // Expose `disabled` via both the prop and accessibilityState so tests can
  // check either. The key is that Pressable receives the raw boolean.
  Button: ({ children, onPress, disabled, testID }: any) => {
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
jest.mock('@/components/ui/Input', () => ({
  Input: ({ onChangeText, value, testID, placeholder }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID={testID}
        value={value ?? ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    );
  },
}));
jest.mock('@/components/ui/Label', () => ({
  Label: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));
jest.mock('@/components/ui/Card', () => {
  const { View } = require('react-native');
  return {
    Card:        ({ children }: any) => <View>{children}</View>,
    CardContent: ({ children }: any) => <View>{children}</View>,
    CardHeader:  ({ children }: any) => <View>{children}</View>,
    CardTitle:   ({ children }: any) => <View>{children}</View>,
  };
});

// ── Subject ───────────────────────────────────────────────────────────────────
import { FootballProgramTab } from '@/components/football/FootballProgramTab';
import { PROGRAM_EMPTY }      from '@/hooks/useFootballProgram';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const EXISTING_PROGRAM = {
  id:               'prog-1',
  owner_user_id:    'user-123',
  program_name:     'Eagles Football',
  school_name:      'Riverside High',
  city:             'Riverside',
  state:            'CA',
  classification:   '4A',
  head_coach_name:  'John Smith',
  head_coach_email: 'jsmith@riverside.edu',
  head_coach_phone: '(555) 867-5309',
  created_at:       '2026-08-24T00:00:00Z',
  updated_at:       '2026-08-24T00:00:00Z',
};

// ── Hook state helpers ────────────────────────────────────────────────────────
const mockSaveProgram = jest.fn();

function setupHook(program: any = null, isPending = false) {
  (globalThis as any).__footballProgramHook = {
    program,
    isLoading:   false,
    isPending,
    saveProgram: mockSaveProgram,
  };
}

beforeEach(() => {
  mockSaveProgram.mockReset();
  mockSaveProgram.mockReturnValue(undefined);
  mockToast.mockReset();
  setupHook();
});

afterEach(() => {
  setupHook();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — PROGRAM_EMPTY contract
// ─────────────────────────────────────────────────────────────────────────────
describe('PROGRAM_EMPTY', () => {
  it('has exactly the 8 required data keys (incl. 3 newly-added)', () => {
    expect(Object.keys(PROGRAM_EMPTY).sort()).toEqual([
      'city', 'classification', 'head_coach_email', 'head_coach_name',
      'head_coach_phone', 'program_name', 'school_name', 'state',
    ]);
  });

  it('all values are empty strings', () => {
    Object.values(PROGRAM_EMPTY).forEach(v => expect(v).toBe(''));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — UI rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballProgramTab — rendering', () => {
  it('renders all 8 input fields', async () => {
    const { getByTestId } = await render(<FootballProgramTab />);
    await waitFor(() => {
      expect(getByTestId('field-program_name')).toBeTruthy();
      expect(getByTestId('field-school_name')).toBeTruthy();
      expect(getByTestId('field-city')).toBeTruthy();
      expect(getByTestId('field-state')).toBeTruthy();
      expect(getByTestId('field-classification')).toBeTruthy();
      expect(getByTestId('field-head_coach_name')).toBeTruthy();
      expect(getByTestId('field-head_coach_email')).toBeTruthy();
      expect(getByTestId('field-head_coach_phone')).toBeTruthy();
    });
  });

  it('Save button is disabled initially (nothing dirty)', async () => {
    const { getByTestId } = await render(<FootballProgramTab />);
    await waitFor(() => expect(getByTestId('save-program')).toBeTruthy());
    expect(getByTestId('save-program').props.accessibilityState.disabled).toBe(true);
  });

  it('Save button enables after editing any field', async () => {
    const { getByTestId } = await render(<FootballProgramTab />);
    await waitFor(() => expect(getByTestId('field-program_name')).toBeTruthy());
    fireEvent.changeText(getByTestId('field-program_name'), 'Eagles Football');
    await waitFor(() =>
      expect(getByTestId('save-program').props.accessibilityState.disabled).toBe(false)
    );
    await act(async () => {});
  });

  it('seeds all fields from existing program record', async () => {
    setupHook(EXISTING_PROGRAM);
    const { getByTestId } = await render(<FootballProgramTab />);
    await waitFor(() => {
      expect(getByTestId('field-program_name').props.value).toBe('Eagles Football');
      expect(getByTestId('field-school_name').props.value).toBe('Riverside High');
      expect(getByTestId('field-city').props.value).toBe('Riverside');
      expect(getByTestId('field-state').props.value).toBe('CA');
      expect(getByTestId('field-classification').props.value).toBe('4A');
      expect(getByTestId('field-head_coach_name').props.value).toBe('John Smith');
      expect(getByTestId('field-head_coach_email').props.value).toBe('jsmith@riverside.edu');
      expect(getByTestId('field-head_coach_phone').props.value).toBe('(555) 867-5309');
    });
  });

  it('Save button disabled while mutation is pending', async () => {
    setupHook(null, true);
    const { getByTestId } = await render(<FootballProgramTab />);
    await waitFor(() => expect(getByTestId('save-program')).toBeTruthy());
    expect(getByTestId('save-program').props.accessibilityState.disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — save behaviour
// Mock hook is fully synchronous — render returns immediately, no waitFor needed.
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballProgramTab — save', () => {
  it('calls saveProgram with all 8 data columns + owner_user_id', async () => {
    const { getByTestId } = await render(<FootballProgramTab />);
    await act(async () => {
      fireEvent.changeText(getByTestId('field-program_name'),     'Eagles Football');
      fireEvent.changeText(getByTestId('field-school_name'),      'Riverside High');
      fireEvent.changeText(getByTestId('field-city'),             'Riverside');
      fireEvent.changeText(getByTestId('field-state'),            'CA');
      fireEvent.changeText(getByTestId('field-classification'),   '4A');
      fireEvent.changeText(getByTestId('field-head_coach_name'),  'John Smith');
      fireEvent.changeText(getByTestId('field-head_coach_email'), 'jsmith@riverside.edu');
      fireEvent.changeText(getByTestId('field-head_coach_phone'), '(555) 867-5309');
    });
    expect(getByTestId('save-program').props.accessibilityState.disabled).toBe(false);
    await act(async () => { fireEvent.press(getByTestId('save-program')); });
    expect(mockSaveProgram).toHaveBeenCalledTimes(1);
    expect(mockSaveProgram).toHaveBeenCalledWith({
      owner_user_id:    'user-123',
      program_name:     'Eagles Football',
      school_name:      'Riverside High',
      city:             'Riverside',
      state:            'CA',
      classification:   '4A',
      head_coach_name:  'John Smith',
      head_coach_email: 'jsmith@riverside.edu',
      head_coach_phone: '(555) 867-5309',
    });
  });

  it('regression: 3 newly-added columns always present in payload', async () => {
    const { getByTestId } = await render(<FootballProgramTab />);
    await act(async () => {
      fireEvent.changeText(getByTestId('field-program_name'),     'Test Program');
      fireEvent.changeText(getByTestId('field-head_coach_email'), 'bob@test.edu');
      fireEvent.changeText(getByTestId('field-head_coach_phone'), '5551234567');
    });
    expect(getByTestId('save-program').props.accessibilityState.disabled).toBe(false);
    await act(async () => { fireEvent.press(getByTestId('save-program')); });
    expect(mockSaveProgram).toHaveBeenCalledTimes(1);
    const row = mockSaveProgram.mock.calls[0][0];
    expect(row).toHaveProperty('program_name',     'Test Program');
    expect(row).toHaveProperty('head_coach_email', 'bob@test.edu');
    expect(row).toHaveProperty('head_coach_phone', '5551234567');
  });

  it('does not call saveProgram when nothing is dirty', async () => {
    const { getByTestId } = await render(<FootballProgramTab />);
    expect(getByTestId('save-program').props.accessibilityState.disabled).toBe(true);
    await act(async () => { fireEvent.press(getByTestId('save-program')); });
    expect(mockSaveProgram).not.toHaveBeenCalled();
  });
});
