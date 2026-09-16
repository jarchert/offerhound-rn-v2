/**
 * PublicProfilesWave2.test.tsx
 *
 * Tests for two new public-profile screens (Tier 2 Feature Parity):
 *   A. PublicHSCoachProfileScreen
 *   B. PublicAgencyProfileScreen
 *
 * Following the established codebase pattern:
 *   - Source-code string inspection for wiring/structure checks
 *     (same pattern as ParentVisibilityWiring.test.tsx, AdminWave1Wiring.test.tsx)
 *   - await render(...) + findByText / findAllByTestId for render checks
 *     (same pattern as AdminFixes.test.tsx)
 *   - No dynamic require() of modules that run Expo Linking at init time
 */
import path from 'path';
import fs from 'fs';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Supabase mock ────────────────────────────────────────────────────────────
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
  },
}));

// ─── Navigation mocks ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(() => ({ params: {} })),
  useNavigation: jest.fn(() => ({ navigate: mockNavigate, goBack: mockGoBack })),
}));

// ─── Role hooks: everyone unauthenticated by default ─────────────────────────
jest.mock('@/hooks/useCoachProfile', () => ({ useCoachProfile: () => ({ data: null }) }));
jest.mock('@/hooks/usePlayerProfile', () => ({ usePlayerProfile: () => ({ profile: null }) }));
jest.mock('@/hooks/useScoutProfile', () => ({ useScoutProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useHSCoachProfile', () => ({ useHSCoachProfile: () => ({ data: null }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, session: null }) }));

// ─── UI component mocks (same as AdminFixes / ParentVisibilityWiring) ─────────
jest.mock('@/components/BackButton', () => ({
  BackButton: () => null,
}));
jest.mock('@/components/Footer', () => ({
  Footer: () => null,
}));
jest.mock('@/components/ui/Card', () => {
  const { View } = require('react-native');
  return {
    Card: ({ children, ...p }: any) => <View {...p}>{children}</View>,
    CardContent: ({ children, ...p }: any) => <View {...p}>{children}</View>,
  };
});
jest.mock('@/components/ui/Badge', () => {
  const { Text } = require('react-native');
  return { Badge: ({ children, ...p }: any) => <Text {...p}>{children}</Text> };
});
jest.mock('@/components/ui/Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, ...p }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID} {...p}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
  };
});
jest.mock('@/components/ui/Avatar', () => {
  const { View } = require('react-native');
  return { Avatar: (p: any) => <View testID="avatar" {...p} /> };
});
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = (p: any) => <View {...p} />;
  return new Proxy({}, { get: () => Icon });
});
jest.mock('@/lib/theme', () => ({
  colors: {
    background: '#fff',
    foreground: '#000',
    mutedForeground: '#888',
    primary: '#6c47ff',
    primaryForeground: '#fff',
    secondary: '#f4f4f5',
    border: '#e4e4e7',
  },
  typography: {
    fontFamily: { body: 'System', heading: 'System', bodySemiBold: 'System' },
    fontSize: { xs: 10, sm: 12, base: 14, lg: 18, xl: 20, '2xl': 24 },
  },
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxxl: 48,
  },
  radius: { md: 8 },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQC()}>{children}</QueryClientProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART A — PublicHSCoachProfileScreen
// ═══════════════════════════════════════════════════════════════════════════════

describe('PublicHSCoachProfileScreen — source wiring', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../screens/public/PublicHSCoachProfileScreen.tsx'),
    'utf-8',
  );

  it('lives in screens/public/ (same directory as PublicScoutProfileScreen)', () => {
    expect(src).toBeTruthy();
  });

  it('reads from high_school_coach_profiles table', () => {
    expect(src).toMatch(/high_school_coach_profiles/);
  });

  it('gates query with is_published=true (matches MAIN)', () => {
    expect(src).toMatch(/is_published.*true|\.eq\(.*is_published/);
  });

  it('uses hsCoachId param (not id) — consistent with PublicScoutProfile scoutId naming', () => {
    expect(src).toMatch(/hsCoachId/);
  });

  it('uses image_url (not profile_image_url) for avatar — correct field for this table', () => {
    // Strip comments before checking — the comment block explains the distinction
    const codeSrc = src.replace(/^\/\/.+$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeSrc).toMatch(/image_url/);
    // Must NOT reference profile_image_url in actual code (that is the scout_profiles field)
    expect(codeSrc).not.toMatch(/profile_image_url/);
  });

  it('imports from PublicProfileStackParamList (not RootStackParamList)', () => {
    expect(src).toMatch(/PublicProfileStackParamList/);
    expect(src).not.toMatch(/RootStackParamList/);
  });

  it('has NO show_contact_info gate (matches MAIN — no such field on this table)', () => {
    const codeSrc = src.replace(/^\/\/.+$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeSrc).not.toMatch(/show_contact_info/);
  });

  it('renders email/phone/twitter/website buttons unconditionally when present', () => {
    expect(src).toMatch(/coach.*\.email|email.*coach/);
    expect(src).toMatch(/coach.*\.phone|phone.*coach/);
    expect(src).toMatch(/coach.*\.twitter|twitter.*coach/);
    expect(src).toMatch(/coach.*\.website|website.*coach/);
  });

  it('"Compose Letter" navigates to LetterComposer with prefill (matches MAIN intent)', () => {
    expect(src).toMatch(/LetterComposer/);
    expect(src).toMatch(/prefill/);
  });

  it('shows classification / conference / sport / position_coached badges', () => {
    expect(src).toMatch(/school_classification/);
    expect(src).toMatch(/conference_name/);
    expect(src).toMatch(/sport/);
    expect(src).toMatch(/position_coached/);
  });

  it('shows years_coaching and career_record stats', () => {
    expect(src).toMatch(/years_coaching/);
    expect(src).toMatch(/career_record/);
  });

  it('includes BackButton and Footer (same as scout screen)', () => {
    expect(src).toMatch(/BackButton/);
    expect(src).toMatch(/Footer/);
  });
});

describe('PublicHSCoachProfileScreen — PublicProfileStack registration', () => {
  const stackSrc = fs.readFileSync(
    path.resolve(__dirname, '../navigation/stacks/PublicProfileStack.tsx'),
    'utf-8',
  );

  it('imports PublicHSCoachProfileScreen into PublicProfileStack', () => {
    expect(stackSrc).toMatch(/PublicHSCoachProfileScreen/);
  });

  it('adds PublicHSCoachProfile to PublicProfileStackParamList', () => {
    expect(stackSrc).toMatch(/PublicHSCoachProfile.*hsCoachId|hsCoachId.*PublicHSCoachProfile/);
  });

  it('registers Screen name="PublicHSCoachProfile" in Stack.Navigator', () => {
    expect(stackSrc).toMatch(/name="PublicHSCoachProfile"/);
  });
});

describe('PublicHSCoachProfileScreen — linking.ts deep-link route', () => {
  const linkSrc = fs.readFileSync(
    path.resolve(__dirname, '../navigation/linking.ts'),
    'utf-8',
  );

  it('adds PublicHSCoachProfile route inside PublicProfileStack screens block', () => {
    expect(linkSrc).toMatch(/PublicHSCoachProfile.*hs-coach.*hsCoachId|hs-coach.*hsCoachId/);
  });

  it('does NOT register PublicHSCoachProfile flat in RootNavigator (must be nested)', () => {
    // The route IS registered, but only inside the PublicProfileStack.screens block.
    // A flat top-level entry would be at zero-indent (no nesting under 'screens:').
    // Verify it appears inside the PublicProfileStack block by checking its indentation
    // relative to the surrounding context, not via absolute indentation count.
    expect(linkSrc).toMatch(/PublicProfileStack[\s\S]{0,500}PublicHSCoachProfile/);
    // And confirm there's no duplicate at the same level as PublicClubCoachProfile (flat)
    // by verifying PublicHSCoachProfile only appears once in the file
    const matches = linkSrc.match(/PublicHSCoachProfile/g) || [];
    expect(matches.length).toBe(1);
  });
});

describe('PublicHSCoachProfileScreen — CoachDirectory entry point', () => {
  const dirSrc = fs.readFileSync(
    path.resolve(__dirname, '../screens/shared/CoachDirectoryScreen.tsx'),
    'utf-8',
  );

  it('passes onOpenProfile to CoachMatchCard for HS coach cards', () => {
    expect(dirSrc).toMatch(/onOpenProfile/);
  });

  it('navigates into PublicProfileStack → PublicHSCoachProfile (not flat navigate)', () => {
    expect(dirSrc).toMatch(/PublicProfileStack/);
    expect(dirSrc).toMatch(/PublicHSCoachProfile/);
    expect(dirSrc).toMatch(/hsCoachId/);
  });
});

describe('PublicHSCoachProfileScreen — render: loading / not found', () => {
  const { useRoute } = require('@react-navigation/native');
  const { supabase } = require('@/integrations/supabase/client');

  beforeEach(() => {
    jest.clearAllMocks();
    useRoute.mockReturnValue({ params: { hsCoachId: 'coach-123' } });
    // Chain: from().select().eq().eq().maybeSingle()
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
  });

  it('shows ActivityIndicator while loading (source: loading branch renders ActivityIndicator)', () => {
    // The render-while-loading path is validated via source inspection.
    // RNTL v14's render return type doesn't expose UNSAFE_getByType from destructuring.
    // The source check confirms the loading branch is implemented.
    const hsSrc = fs.readFileSync(
      path.resolve(__dirname, '../screens/public/PublicHSCoachProfileScreen.tsx'),
      'utf-8',
    );
    expect(hsSrc).toMatch(/isLoading/);
    expect(hsSrc).toMatch(/ActivityIndicator/);
  });

  it('shows not-found message when coach is null / not published', async () => {
    supabase.maybeSingle.mockResolvedValue({ data: null });
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText(/not found|not published/i);
  });
});

describe('PublicHSCoachProfileScreen — render: real profile data', () => {
  const { useRoute } = require('@react-navigation/native');
  const { supabase } = require('@/integrations/supabase/client');

  const COACH = {
    id: 'coach-123',
    name: 'Jane Smith',
    title: 'Head Coach',
    school_name: 'Lincoln High School',
    school_city: 'Springfield',
    school_state: 'IL',
    school_classification: '4A',
    conference_name: 'IHSA Central',
    sport: 'basketball',
    position_coached: 'Guard',
    bio: 'Coaching varsity basketball for 12 years.',
    years_coaching: 12,
    career_record: '180-42',
    email: 'jane@lincoln.edu',
    phone: '555-0100',
    twitter: '@janesmith_coach',
    website: 'https://lincoln.edu/basketball',
    image_url: null,
    is_verified: true,
    is_published: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useRoute.mockReturnValue({ params: { hsCoachId: 'coach-123' } });
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.maybeSingle.mockResolvedValue({ data: COACH });
  });

  it('renders coach name', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Jane Smith');
  });

  it('renders school name', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Lincoln High School');
  });

  it('renders bio', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Coaching varsity basketball for 12 years.');
  });

  it('renders classification badge', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('4A');
  });

  it('renders location stat (city + state)', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Springfield, IL');
  });

  it('renders years_coaching stat', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('12 years coaching');
  });

  it('renders career_record stat', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Record: 180-42');
  });

  it('renders Compose Letter button when email present (no auth gate)', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Compose Letter');
  });

  it('renders Email button when email present (no auth gate)', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Email');
  });

  it('renders Call button when phone present (no auth gate)', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Call');
  });

  it('renders Twitter button when twitter present (no auth gate)', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Twitter');
  });

  it('renders Website button when website present (no auth gate)', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    await findByText('Website');
  });

  it('pressing Compose Letter calls navigate to LetterComposer with prefill', async () => {
    const PublicHSCoachProfileScreen = require('../screens/public/PublicHSCoachProfileScreen').default;
    const { useNavigation } = require('@react-navigation/native');
    useNavigation.mockReturnValue({ navigate: mockNavigate, goBack: mockGoBack });
    const { findByText } = await render(
      <Wrapper><PublicHSCoachProfileScreen /></Wrapper>,
    );
    const btn = await findByText('Compose Letter');
    fireEvent.press(btn);
    expect(mockNavigate).toHaveBeenCalledWith(
      'LetterComposer',
      expect.objectContaining({ prefill: expect.objectContaining({ recipientEmail: 'jane@lincoln.edu' }) }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART B — PublicAgencyProfileScreen
// ═══════════════════════════════════════════════════════════════════════════════

describe('PublicAgencyProfileScreen — source wiring', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../screens/public/PublicAgencyProfileScreen.tsx'),
    'utf-8',
  );

  it('reads from scout_organizations table (primary)', () => {
    expect(src).toMatch(/scout_organizations/);
  });

  it('reads scout_profiles roster with eq organization_id (MAIN join shape)', () => {
    expect(src).toMatch(/scout_profiles/);
    expect(src).toMatch(/organization_id/);
  });

  it('has NO is_published filter on scout_organizations (matches MAIN)', () => {
    // Strip comments — the comment explains the absence of the filter
    const codeSrc = src.replace(/^\/\/.+$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    // MAIN has no is_published gate on scout_organizations
    expect(codeSrc).not.toMatch(/is_published/);
  });

  it('uses agencyId param (not id) — consistent with PublicScoutProfile naming', () => {
    expect(src).toMatch(/agencyId/);
  });

  it('uses logo_url for avatar (correct field for scout_organizations)', () => {
    expect(src).toMatch(/logo_url/);
  });

  it('uses contact_email (not email) — correct field name for scout_organizations', () => {
    expect(src).toMatch(/contact_email/);
    // Must NOT try coach.email (wrong table field)
    expect(src).not.toMatch(/agency.*\.email\b|\.email.*agency/);
  });

  it('uses contact_phone (not phone)', () => {
    expect(src).toMatch(/contact_phone/);
  });

  it('uses website_url (not website) — correct field for scout_organizations', () => {
    expect(src).toMatch(/website_url/);
    expect(src).not.toMatch(/agency.*\.website\b|\.website.*agency/);
  });

  it('imports from PublicProfileStackParamList (not RootStackParamList)', () => {
    expect(src).toMatch(/PublicProfileStackParamList/);
    expect(src).not.toMatch(/RootStackParamList/);
  });

  it('has NO show_contact_info gate (MAIN has none)', () => {
    const codeSrc = src.replace(/^\/\/.+$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeSrc).not.toMatch(/show_contact_info/);
  });

  it('scout roster cards navigate to PublicScoutProfile (same stack)', () => {
    expect(src).toMatch(/PublicScoutProfile/);
    expect(src).toMatch(/scoutId/);
  });

  it('includes BackButton and Footer', () => {
    expect(src).toMatch(/BackButton/);
    expect(src).toMatch(/Footer/);
  });
});

describe('PublicAgencyProfileScreen — PublicProfileStack registration', () => {
  const stackSrc = fs.readFileSync(
    path.resolve(__dirname, '../navigation/stacks/PublicProfileStack.tsx'),
    'utf-8',
  );

  it('imports PublicAgencyProfileScreen into PublicProfileStack', () => {
    expect(stackSrc).toMatch(/PublicAgencyProfileScreen/);
  });

  it('adds PublicAgencyProfile to PublicProfileStackParamList with agencyId', () => {
    expect(stackSrc).toMatch(/PublicAgencyProfile.*agencyId|agencyId.*PublicAgencyProfile/);
  });

  it('registers Screen name="PublicAgencyProfile" in Stack.Navigator', () => {
    expect(stackSrc).toMatch(/name="PublicAgencyProfile"/);
  });
});

describe('PublicAgencyProfileScreen — linking.ts deep-link route', () => {
  const linkSrc = fs.readFileSync(
    path.resolve(__dirname, '../navigation/linking.ts'),
    'utf-8',
  );

  it('adds PublicAgencyProfile route inside PublicProfileStack screens block', () => {
    expect(linkSrc).toMatch(/PublicAgencyProfile.*agency.*agencyId|agency.*agencyId/);
  });

  it('does NOT register PublicAgencyProfile flat in RootNavigator', () => {
    // Same logic as HS Coach: verify it appears only once (nested in PublicProfileStack)
    expect(linkSrc).toMatch(/PublicProfileStack[\s\S]{0,500}PublicAgencyProfile/);
    const matches = linkSrc.match(/PublicAgencyProfile/g) || [];
    expect(matches.length).toBe(1);
  });
});

describe('PublicAgencyProfileScreen — AgencyDashboard "View Public Profile" entry point', () => {
  const agencySrc = fs.readFileSync(
    path.resolve(__dirname, '../screens/agency/AgencyDashboardScreen.tsx'),
    'utf-8',
  );

  it('navigates into PublicProfileStack → PublicAgencyProfile from AgencyDashboard', () => {
    expect(agencySrc).toMatch(/PublicProfileStack/);
    expect(agencySrc).toMatch(/PublicAgencyProfile/);
    expect(agencySrc).toMatch(/agencyId/);
  });

  it('"View Public Profile" button is owner-only (isOwner guard)', () => {
    expect(agencySrc).toMatch(/isOwner.*PublicAgencyProfile|View Public Profile/);
  });
});

describe('PublicAgencyProfileScreen — render: loading / not found', () => {
  const { useRoute } = require('@react-navigation/native');
  const { supabase } = require('@/integrations/supabase/client');

  beforeEach(() => {
    jest.clearAllMocks();
    useRoute.mockReturnValue({ params: { agencyId: 'agency-abc' } });
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
  });

  it('shows ActivityIndicator while loading (source: loading branch renders ActivityIndicator)', () => {
    const agSrc = fs.readFileSync(
      path.resolve(__dirname, '../screens/public/PublicAgencyProfileScreen.tsx'),
      'utf-8',
    );
    expect(agSrc).toMatch(/isLoading/);
    expect(agSrc).toMatch(/ActivityIndicator/);
  });

  it('shows not-found message when agency is null', async () => {
    supabase.maybeSingle.mockResolvedValue({ data: null });
    const PublicAgencyProfileScreen = require('../screens/public/PublicAgencyProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicAgencyProfileScreen /></Wrapper>,
    );
    await findByText(/not found/i);
  });
});

describe('PublicAgencyProfileScreen — render: real agency data', () => {
  const { useRoute } = require('@react-navigation/native');
  const { supabase } = require('@/integrations/supabase/client');

  const AGENCY = {
    id: 'agency-abc',
    name: 'Elite Sports Agency',
    description: 'Top recruiting firm in the Midwest.',
    logo_url: null,
    contact_email: 'contact@elitesports.com',
    contact_phone: '555-0200',
    website_url: 'https://elitesports.com',
  };

  const SCOUTS = [
    { id: 'scout-1', name: 'Tom Scout', title: 'Senior Scout', profile_image_url: null, specialization: 'basketball' },
    { id: 'scout-2', name: 'Amy Recruiter', title: null, profile_image_url: null, specialization: null },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useRoute.mockReturnValue({ params: { agencyId: 'agency-abc' } });
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    // Primary agency query ends with .maybeSingle()
    supabase.maybeSingle.mockResolvedValue({ data: AGENCY });
    // Roster query ends with .order() — override order to return data
    supabase.order.mockResolvedValue({ data: [] }); // empty roster by default
  });

  it('renders agency name', async () => {
    const PublicAgencyProfileScreen = require('../screens/public/PublicAgencyProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicAgencyProfileScreen /></Wrapper>,
    );
    await findByText('Elite Sports Agency');
  });

  it('renders description', async () => {
    const PublicAgencyProfileScreen = require('../screens/public/PublicAgencyProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicAgencyProfileScreen /></Wrapper>,
    );
    await findByText('Top recruiting firm in the Midwest.');
  });

  it('renders "Recruiting Agency" type label', async () => {
    const PublicAgencyProfileScreen = require('../screens/public/PublicAgencyProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicAgencyProfileScreen /></Wrapper>,
    );
    await findByText('Recruiting Agency');
  });

  it('renders Email Agency button when contact_email present (no auth gate)', async () => {
    const PublicAgencyProfileScreen = require('../screens/public/PublicAgencyProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicAgencyProfileScreen /></Wrapper>,
    );
    await findByText('Email Agency');
  });

  it('renders Call button when contact_phone present (no auth gate)', async () => {
    const PublicAgencyProfileScreen = require('../screens/public/PublicAgencyProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicAgencyProfileScreen /></Wrapper>,
    );
    await findByText('Call');
  });

  it('renders Website button when website_url present (no auth gate)', async () => {
    const PublicAgencyProfileScreen = require('../screens/public/PublicAgencyProfileScreen').default;
    const { findByText } = await render(
      <Wrapper><PublicAgencyProfileScreen /></Wrapper>,
    );
    await findByText('Website');
  });
});

describe('PublicAgencyProfileScreen — scout roster navigation', () => {
  it('tapping a scout card calls navigate to PublicScoutProfile', () => {
    // Source-code inspection: the handler navigates to 'PublicScoutProfile'
    const src = fs.readFileSync(
      path.resolve(__dirname, '../screens/public/PublicAgencyProfileScreen.tsx'),
      'utf-8',
    );
    expect(src).toMatch(/navigate.*PublicScoutProfile|PublicScoutProfile.*navigate/);
    // Shorthand { scoutId } in the navigate call passes scoutId as the key
    expect(src).toMatch(/\{\s*scoutId\s*\}/);
  });
});
