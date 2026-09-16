import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ── react-query stub ──────────────────────────────────────────────────────────
jest.mock('@tanstack/react-query', () => ({
  QueryClient:         class { constructor() {} },
  QueryClientProvider: ({ children }: any) => children,
  useQuery:            jest.fn(),
  useMutation:         jest.fn(),
  useQueryClient:      jest.fn(),
}));

// ── useFootballRoster: controlled via globalThis ──────────────────────────────
jest.mock('@/hooks/useFootballRoster', () => ({
  useFootballRoster: () => (globalThis as any).__footballRosterHook,
  ROSTER_ATHLETE_EMPTY: {
    athlete_name:         '',
    jersey_number:        '',
    position:             '',
    class_year:           '',
    height:               '',
    weight:               '',
    gpa:                  '',
    hudl_url:             '',
    highlight_video_urls: [],
    twitter_handle:       '',
    instagram_handle:     '',
    tiktok_handle:        '',
    youtube_handle:       '',
    notes:                '',
    is_active:            true,
    display_order:        0,
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
  typography: {
    fontFamily: { heading: 'System', bodyMedium: 'System' },
    fontSize: { xs: 11, sm: 13, base: 15, md: 15, lg: 17, xl: 20, xxl: 24 },
    letterSpacing: { heading: 1 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius:  { sm: 4, md: 8, lg: 16, full: 9999 },
  shadows: {},
}));

// ── UI stubs ──────────────────────────────────────────────────────────────────
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onPress, disabled, testID, leftIcon }: any) => {
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
    Card:        ({ children, style }: any) => <View style={style}>{children}</View>,
    CardContent: ({ children }: any) => <View>{children}</View>,
    CardHeader:  ({ children }: any) => <View>{children}</View>,
    CardTitle:   ({ children }: any) => <View>{children}</View>,
  };
});

// ── Subject ───────────────────────────────────────────────────────────────────
import { FootballRosterTab } from '@/components/football/FootballRosterTab';
import { ROSTER_ATHLETE_EMPTY } from '@/hooks/useFootballRoster';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const ATHLETE_1: any = {
  id:                   'ath-1',
  owner_user_id:        'user-123',
  athlete_name:         'Marcus Johnson',
  jersey_number:        '12',
  position:             'QB',
  class_year:           '2027',
  height:               '6\'2"',
  weight:               '195',
  gpa:                  '3.8',
  hudl_url:             'https://hudl.com/marcus',
  highlight_video_urls: ['https://youtube.com/v1', 'https://youtube.com/v2'],
  twitter_handle:       '@marcus_qb',
  instagram_handle:     '@marcus_qb',
  tiktok_handle:        '',
  youtube_handle:       '',
  notes:                'Strong arm, good leader',
  is_active:            true,
  display_order:        0,
};

const ATHLETE_2: any = {
  id:                   'ath-2',
  owner_user_id:        'user-123',
  athlete_name:         'Devon Williams',
  jersey_number:        '44',
  position:             'RB',
  class_year:           '2026',
  height:               '5\'10"',
  weight:               '210',
  gpa:                  '3.2',
  hudl_url:             '',
  highlight_video_urls: [],
  twitter_handle:       '',
  instagram_handle:     '',
  tiktok_handle:        '',
  youtube_handle:       '',
  notes:                '',
  is_active:            true,
  display_order:        1,
};

// ── Hook state helpers ────────────────────────────────────────────────────────
const mockSaveAthlete   = jest.fn();
const mockDeleteAthlete = jest.fn();

function setupHook(athletes: any[] = [], isSaving = false, isDeleting = false) {
  (globalThis as any).__footballRosterHook = {
    athletes,
    isLoading:     false,
    isSaving,
    isDeleting,
    saveAthlete:   mockSaveAthlete,
    deleteAthlete: mockDeleteAthlete,
  };
}

function setupLoadingHook() {
  (globalThis as any).__footballRosterHook = {
    athletes:      [],
    isLoading:     true,
    isSaving:      false,
    isDeleting:    false,
    saveAthlete:   mockSaveAthlete,
    deleteAthlete: mockDeleteAthlete,
  };
}

beforeEach(() => {
  mockSaveAthlete.mockReset();
  mockDeleteAthlete.mockReset();
  mockToast.mockReset();
  setupHook();
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — ROSTER_ATHLETE_EMPTY contract
// ─────────────────────────────────────────────────────────────────────────────
describe('ROSTER_ATHLETE_EMPTY', () => {
  it('has all 16 required data keys', () => {
    expect(Object.keys(ROSTER_ATHLETE_EMPTY).sort()).toEqual([
      'athlete_name', 'class_year', 'display_order', 'gpa',
      'height', 'highlight_video_urls', 'hudl_url', 'instagram_handle',
      'is_active', 'jersey_number', 'notes', 'position',
      'tiktok_handle', 'twitter_handle', 'weight', 'youtube_handle',
    ]);
  });

  it('highlight_video_urls defaults to empty array', () => {
    expect(ROSTER_ATHLETE_EMPTY.highlight_video_urls).toEqual([]);
  });

  it('is_active defaults to true', () => {
    expect(ROSTER_ATHLETE_EMPTY.is_active).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Loading and empty states
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballRosterTab — loading/empty states', () => {
  it('shows loading indicator while isLoading=true', async () => {
    setupLoadingHook();
    const { getByTestId } = await render(<FootballRosterTab />);
    expect(getByTestId('roster-loading')).toBeTruthy();
  });

  it('shows empty state when roster is empty', async () => {
    setupHook([]);
    const { getByTestId } = await render(<FootballRosterTab />);
    expect(getByTestId('roster-empty')).toBeTruthy();
  });

  it('renders Add Athlete button', async () => {
    const { getByTestId } = await render(<FootballRosterTab />);
    expect(getByTestId('add-athlete')).toBeTruthy();
  });

  it('renders athlete cards when roster has data', async () => {
    setupHook([ATHLETE_1, ATHLETE_2]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => {
      expect(getByTestId('athlete-header-ath-1')).toBeTruthy();
      expect(getByTestId('athlete-header-ath-2')).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Expand / dirty tracking / Save button state
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballRosterTab — dirty tracking', () => {
  it('Save button starts disabled for an existing clean athlete', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    fireEvent.press(getByTestId('athlete-header-ath-1'));
    await waitFor(() => expect(getByTestId('save-athlete-ath-1')).toBeTruthy());
    expect(getByTestId('save-athlete-ath-1').props.accessibilityState.disabled).toBe(true);
  });

  it('Save button enables after editing a field', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('field-athlete_name-ath-1')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('field-athlete_name-ath-1'), 'Marcus J. Updated');
    });
    await waitFor(() =>
      expect(getByTestId('save-athlete-ath-1').props.accessibilityState.disabled).toBe(false),
      { interval: 1, timeout: 1000 }
    );
  });

  it('dirty indicator dot appears after editing a field', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('field-position-ath-1')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('field-position-ath-1'), 'WR');
    });
    await waitFor(() => expect(getByTestId('dirty-indicator-ath-1')).toBeTruthy(),
      { interval: 1, timeout: 1000 }
    );
  });

  it('Save button disabled while isSaving=true', async () => {
    setupHook([ATHLETE_1], true);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('save-athlete-ath-1')).toBeTruthy());
    expect(getByTestId('save-athlete-ath-1').props.accessibilityState.disabled).toBe(true);
  });

  it('new athlete card starts with Save enabled (always dirty)', async () => {
    setupHook([]);
    const { getByTestId, getAllByTestId } = await render(<FootballRosterTab />);
    await act(async () => { fireEvent.press(getByTestId('add-athlete')); });
    await waitFor(() => {
      const saveButtons = getAllByTestId(/^save-athlete-new-/);
      expect(saveButtons.length).toBe(1);
      expect(saveButtons[0].props.accessibilityState.disabled).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Save payload shape
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballRosterTab — save payload', () => {
  it('calls saveAthlete with id + full payload when saving existing athlete', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('field-athlete_name-ath-1')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('field-athlete_name-ath-1'), 'Marcus Updated');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-athlete-ath-1'));
    });
    expect(mockSaveAthlete).toHaveBeenCalledTimes(1);
    const [id, payload] = mockSaveAthlete.mock.calls[0];
    expect(id).toBe('ath-1');
    expect(payload.athlete_name).toBe('Marcus Updated');
    expect(payload.owner_user_id).toBe('user-123');
    expect(payload).toHaveProperty('highlight_video_urls');
    expect(Array.isArray(payload.highlight_video_urls)).toBe(true);
  });

  it('calls saveAthlete with undefined id for a new athlete', async () => {
    setupHook([]);
    const { getByTestId, getAllByTestId } = await render(<FootballRosterTab />);
    fireEvent.press(getByTestId('add-athlete'));
    await waitFor(() => {
      const inputs = getAllByTestId(/^field-athlete_name-new-/);
      expect(inputs.length).toBeGreaterThan(0);
    });
    const nameInputs = getAllByTestId(/^field-athlete_name-new-/);
    await act(async () => {
      fireEvent.changeText(nameInputs[0], 'New Player');
    });
    const saveButtons = getAllByTestId(/^save-athlete-new-/);
    await act(async () => {
      fireEvent.press(saveButtons[0]);
    });
    expect(mockSaveAthlete).toHaveBeenCalledTimes(1);
    const [id, payload] = mockSaveAthlete.mock.calls[0];
    expect(id).toBeUndefined();
    expect(payload.athlete_name).toBe('New Player');
    expect(payload.owner_user_id).toBe('user-123');
  });

  it('highlight_video_urls array serializes correctly in payload', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('field-highlight_video_url-ath-1-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('field-highlight_video_url-ath-1-0'), 'https://youtube.com/updated');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-athlete-ath-1'));
    });
    expect(mockSaveAthlete).toHaveBeenCalledTimes(1);
    const [, payload] = mockSaveAthlete.mock.calls[0];
    expect(payload.highlight_video_urls).toEqual(['https://youtube.com/updated', 'https://youtube.com/v2']);
  });

  it('adding a video URL appends empty string to array and marks dirty', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('add-video-ath-1')).toBeTruthy());
    fireEvent.press(getByTestId('add-video-ath-1'));
    await waitFor(() =>
      expect(getByTestId('field-highlight_video_url-ath-1-2')).toBeTruthy(),
      { interval: 1, timeout: 1000 }
    );
    expect(getByTestId('save-athlete-ath-1').props.accessibilityState.disabled).toBe(false);
  });

  it('removing a video URL removes it from the array', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('remove-video-ath-1-0')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByTestId('remove-video-ath-1-0'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-athlete-ath-1'));
    });
    expect(mockSaveAthlete).toHaveBeenCalledTimes(1);
    const [, payload] = mockSaveAthlete.mock.calls[0];
    expect(payload.highlight_video_urls).toEqual(['https://youtube.com/v2']);
  });

  it('all 4 social handle fields included in payload', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('field-tiktok_handle-ath-1')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('field-tiktok_handle-ath-1'), '@marcus_tt');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-athlete-ath-1'));
    });
    const [, payload] = mockSaveAthlete.mock.calls[0];
    expect(payload).toHaveProperty('twitter_handle');
    expect(payload).toHaveProperty('instagram_handle');
    expect(payload).toHaveProperty('tiktok_handle', '@marcus_tt');
    expect(payload).toHaveProperty('youtube_handle');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Add new athlete flow
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballRosterTab — add athlete flow', () => {
  it('pressing Add Athlete appends a new expanded card', async () => {
    setupHook([]);
    const { getByTestId, getAllByTestId } = await render(<FootballRosterTab />);
    await act(async () => { fireEvent.press(getByTestId('add-athlete')); });
    await waitFor(() => {
      const saveButtons = getAllByTestId(/^save-athlete-new-/);
      expect(saveButtons.length).toBe(1);
    });
  });

  it('Cancel on a new card removes it without calling saveAthlete', async () => {
    setupHook([]);
    const { getByTestId, getAllByTestId, queryAllByTestId } = await render(<FootballRosterTab />);
    await act(async () => { fireEvent.press(getByTestId('add-athlete')); });
    await waitFor(() => {
      const deleteButtons = getAllByTestId(/^delete-athlete-new-/);
      expect(deleteButtons.length).toBe(1);
    });
    const deleteButtons = getAllByTestId(/^delete-athlete-new-/);
    await act(async () => {
      fireEvent.press(deleteButtons[0]);
    });
    expect(mockSaveAthlete).not.toHaveBeenCalled();
    await waitFor(() => {
      const remaining = queryAllByTestId(/^save-athlete-new-/);
      expect(remaining.length).toBe(0);
    });
  });

  it('can add multiple new athlete cards', async () => {
    setupHook([]);
    const { getByTestId, getAllByTestId } = await render(<FootballRosterTab />);
    await act(async () => { fireEvent.press(getByTestId('add-athlete')); });
    await act(async () => { fireEvent.press(getByTestId('add-athlete')); });
    await act(async () => { fireEvent.press(getByTestId('add-athlete')); });
    await waitFor(() => {
      const saveButtons = getAllByTestId(/^save-athlete-new-/);
      expect(saveButtons.length).toBe(3);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Delete athlete flow
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballRosterTab — delete athlete flow', () => {
  it('calls deleteAthlete with the athlete id', async () => {
    setupHook([ATHLETE_1]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('delete-athlete-ath-1')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByTestId('delete-athlete-ath-1'));
    });
    expect(mockDeleteAthlete).toHaveBeenCalledTimes(1);
    expect(mockDeleteAthlete).toHaveBeenCalledWith('ath-1');
  });

  it('does not call deleteAthlete when isDeleting=true (button disabled)', async () => {
    setupHook([ATHLETE_1], false, true);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('delete-athlete-ath-1')).toBeTruthy());
    expect(getByTestId('delete-athlete-ath-1').props.accessibilityState.disabled).toBe(true);
  });

  it('multiple athletes: deleting one does not affect others', async () => {
    setupHook([ATHLETE_1, ATHLETE_2]);
    const { getByTestId } = await render(<FootballRosterTab />);
    await waitFor(() => expect(getByTestId('athlete-header-ath-1')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('athlete-header-ath-1')); });
    await waitFor(() => expect(getByTestId('delete-athlete-ath-1')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByTestId('delete-athlete-ath-1'));
    });
    expect(mockDeleteAthlete).toHaveBeenCalledWith('ath-1');
    expect(mockDeleteAthlete).not.toHaveBeenCalledWith('ath-2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — Cross-test isolation (regression guard)
// ─────────────────────────────────────────────────────────────────────────────
describe('FootballRosterTab — cross-test isolation', () => {
  it('mock functions are clean at start of each test (1)', () => {
    expect(mockSaveAthlete).not.toHaveBeenCalled();
    expect(mockDeleteAthlete).not.toHaveBeenCalled();
  });

  it('mock functions are clean at start of each test (2)', () => {
    expect(mockSaveAthlete).not.toHaveBeenCalled();
    expect(mockDeleteAthlete).not.toHaveBeenCalled();
  });

  it('renders fresh with empty roster after prior test', async () => {
    const { getByTestId } = await render(<FootballRosterTab />);
    expect(getByTestId('roster-empty')).toBeTruthy();
  });
});
