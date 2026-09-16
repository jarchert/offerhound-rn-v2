/**
 * Tier3NativeDeps.test.tsx
 *
 * Covers the 3 Tier-3 native dependency wirings:
 *   1. CampMobileCheckinScreen — expo-camera QR scan (permission gating + CameraView)
 *   2. InfluencerProfileScreen — expo-video VideoView for video items
 *   3. ClubSocialLinks         — react-native-qrcode-svg real QR code
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── lucide-react-native ──────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

// ─── AsyncStorage ─────────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
  },
}));

// ─── expo-camera ──────────────────────────────────────────────────────────────
const mockRequestCameraPermissionsAsync = jest.fn();

// Store the latest onBarcodeScanned callback so tests can invoke it.
let latestOnBarcodeScanned: ((e: { data: string }) => void) | undefined;

jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  return {
    Camera: {
      requestCameraPermissionsAsync: (...args: any[]) =>
        mockRequestCameraPermissionsAsync(...args),
    },
    CameraView: ({ onBarcodeScanned, testID, style, barcodeScannerSettings, facing }: any) => {
      latestOnBarcodeScanned = onBarcodeScanned;
      return <View testID={testID || 'camera-view'} style={style} />;
    },
  };
});

// ─── expo-video ───────────────────────────────────────────────────────────────
const mockUseVideoPlayer = jest.fn((source: any) => ({ loop: false, __source: source }));
jest.mock('expo-video', () => ({
  useVideoPlayer: (source: any, setup?: any) => mockUseVideoPlayer(source, setup),
  VideoView: ({ player, testID, style }: any) => {
    const { View } = require('react-native');
    return (
      <View
        testID={testID || 'video-view'}
        style={style}
        accessibilityLabel={player?.__source || ''}
      />
    );
  },
}));

// ─── react-native-qrcode-svg ──────────────────────────────────────────────────
jest.mock('react-native-qrcode-svg', () => {
  const { View } = require('react-native');
  return function MockQRCode({ value, size }: any) {
    return (
      <View
        testID="qr-code"
        accessibilityLabel={value}
        accessibilityHint={String(size)}
      />
    );
  };
});

// ─── expo-linking ─────────────────────────────────────────────────────────────
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `offerhoundv2://${path}`,
  openURL: jest.fn().mockResolvedValue(true),
  openSettings: jest.fn().mockResolvedValue(true),
}));

// ─── expo-clipboard ───────────────────────────────────────────────────────────
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

// ─── react-native Share ───────────────────────────────────────────────────────
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
}));

// ─── supabase ─────────────────────────────────────────────────────────────────
const makeSupa = (overrides?: { maybeSingleData?: any; listData?: any[] }) => ({
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    onAuthStateChange: jest
      .fn()
      .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  },
  from: jest.fn(() => {
    const b: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: overrides?.maybeSingleData ?? null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest
        .fn()
        .mockImplementation((cb: any) =>
          Promise.resolve(cb({ data: overrides?.listData ?? [], error: null, count: 0 })),
        ),
    };
    return b;
  }),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
});

jest.mock('@/integrations/supabase/client', () => ({
  supabase: makeSupa(),
}));

// ─── auth hooks ───────────────────────────────────────────────────────────────
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'coach-1' }, isAuthenticated: true, loading: false }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'viewer-1' }, isAuthenticated: true, loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

// ─── camp check-in sync + queue ───────────────────────────────────────────────
jest.mock('@/hooks/useCampCheckinSync', () => ({
  useCampCheckinSync: () => ({
    isOnline: true,
    queueCount: 0,
    isFlushing: false,
    flushNow: jest.fn(),
    refreshQueue: jest.fn(),
  }),
}));

jest.mock('@/lib/checkinQueue', () => ({
  enqueueOp: jest.fn().mockResolvedValue(true),
}));

// ─── toast ────────────────────────────────────────────────────────────────────
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ─── influencer content hooks ─────────────────────────────────────────────────
// Use a module-level array so individual tests can push items into it.
const galleryItems: any[] = [];

jest.mock('@/hooks/useInfluencerContent', () => ({
  useInfluencerPosts: () => ({ data: [] }),
  useInfluencerBlogPosts: () => ({ data: [] }),
  useInfluencerLinkedPodcasts: () => ({ data: [] }),
  useInfluencerGallery: () => ({ data: galleryItems }),
  useInfluencerSocialLinks: () => ({ data: [] }),
  useFollowerCount: () => ({ data: 0 }),
}));

jest.mock('@/hooks/useInfluencer', () => ({
  useFollowInfluencer: () => ({ follow: jest.fn(), unfollow: jest.fn() }),
  useIsFollowing: () => ({ data: false }),
}));

// ─── navigation ───────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { campId: 'camp-1', handle: 'testhandle' } }),
  useFocusEffect: jest.fn(),
}));

// ─── lightweight UI shims ─────────────────────────────────────────────────────
jest.mock('@/components/BackButton', () => ({ BackButton: () => null }));
jest.mock('@/components/Footer', () => ({ Footer: () => null }));
jest.mock('@/components/SEO', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/influencer/SportsNewsFeed', () => ({ SportsNewsFeed: () => null }));
jest.mock('@/components/influencer/InfluencerPostCard', () => ({
  InfluencerPostCard: () => null,
}));
jest.mock('@/components/MessageButton', () => ({ MessageButton: () => null }));
jest.mock('@/components/SocialSyndicationCenter', () => ({
  SocialSyndicationCenter: () => null,
}));

// ─── lazy imports (after all mocks) ──────────────────────────────────────────
import CampMobileCheckinScreen from '@/screens/camps/CampMobileCheckinScreen';
import InfluencerProfileScreen from '@/screens/public/InfluencerProfileScreen';
import { ClubSocialLinks } from '@/components/ClubSocialLinks';

// ─── render helper ────────────────────────────────────────────────────────────
function makeQC() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>;
}

// ─── setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  galleryItems.length = 0;
  latestOnBarcodeScanned = undefined;
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. CampMobileCheckinScreen — expo-camera QR scan
// ══════════════════════════════════════════════════════════════════════════════
describe('CampMobileCheckinScreen — QR camera scan', () => {
  const campRow = {
    id: 'camp-1',
    name: 'Test Camp',
    positions: ['QB', 'WR'],
    coach_user_id: 'coach-1', // matches useAuth mock user.id
  };

  beforeEach(() => {
    // Override supabase.from for camp queries.
    const { supabase } = require('@/integrations/supabase/client');
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: campRow, error: null }),
      then: jest.fn().mockImplementation((cb: any) =>
        Promise.resolve(cb({ data: [], error: null, count: 0 }))
      ),
    }));
  });
  it('auto-requests camera permission when the scan tab is active', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await render(wrap(<CampMobileCheckinScreen />));
    await waitFor(() => {
      expect(mockRequestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('shows CameraView (testID=qr-camera-view) when permission is granted', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const { findByTestId } = await render(wrap(<CampMobileCheckinScreen />));
    const cam = await findByTestId('qr-camera-view');
    expect(cam).toBeTruthy();
  });

  it('shows "Open Settings" when permission is denied, not the CameraView', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { findByText, queryByTestId } = await render(wrap(<CampMobileCheckinScreen />));
    await findByText('Open Settings');
    expect(queryByTestId('qr-camera-view')).toBeNull();
  });

  it('shows "Grant Camera Access" in undetermined state (before any permission call)', async () => {
    // Return a never-resolving promise so cameraPermission stays 'undetermined'
    mockRequestCameraPermissionsAsync.mockReturnValue(new Promise(() => {}));
    const { findByText } = await render(wrap(<CampMobileCheckinScreen />));
    await findByText('Grant Camera Access');
  });

  it('onBarcodeScanned callback feeds handleScanned → toast("No match") for unknown token', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await render(wrap(<CampMobileCheckinScreen />));

    // Wait for CameraView to mount and capture the callback.
    await waitFor(() => expect(latestOnBarcodeScanned).toBeDefined());

    await act(async () => {
      latestOnBarcodeScanned!({ data: 'unknown-qr-token-xyz' });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'No match' }),
      );
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. InfluencerProfileScreen — expo-video media tiles
// ══════════════════════════════════════════════════════════════════════════════
describe('InfluencerProfileScreen — expo-video media tiles', () => {
  const influencerRow = {
    id: 'inf-1',
    user_id: 'not-viewer-1', // different from viewer so Follow button shows
    handle: 'testhandle',
    display_name: 'Test Influencer',
    bio: 'bio text',
    profile_image_url: null,
    region_city: null,
    region_state: null,
    affiliation_type: null,
    verification_status: 'verified',
  };

  beforeEach(() => {
    // Override supabase.from for influencer profile lookup.
    const { supabase } = require('@/integrations/supabase/client');
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: influencerRow, error: null }),
      then: jest
        .fn()
        .mockImplementation((cb: any) =>
          Promise.resolve(cb({ data: [], error: null, count: 0 })),
        ),
    }));
  });

  it('calls useVideoPlayer with the video file_url for video gallery items', async () => {
    galleryItems.push({
      id: 'v1',
      file_type: 'video',
      file_url: 'https://cdn.example.com/vid1.mp4',
      thumbnail_url: null,
    });
    const { findByText } = await render(wrap(<InfluencerProfileScreen />));

    // Navigate to the Media tab.
    const mediaTrigger = await findByText('Media');
    fireEvent.press(mediaTrigger);

    await waitFor(() => {
      expect(mockUseVideoPlayer).toHaveBeenCalled();
    });

    const calledWithVideoUrl = mockUseVideoPlayer.mock.calls.some(
      ([source]) => source === 'https://cdn.example.com/vid1.mp4',
    );
    expect(calledWithVideoUrl).toBe(true);
  });

  it('calls useVideoPlayer with null for image gallery items', async () => {
    galleryItems.push({
      id: 'i1',
      file_type: 'image',
      file_url: 'https://cdn.example.com/img.jpg',
      thumbnail_url: null,
    });
    const { findByText } = await render(wrap(<InfluencerProfileScreen />));
    const mediaTrigger = await findByText('Media');
    fireEvent.press(mediaTrigger);

    await waitFor(() => expect(mockUseVideoPlayer).toHaveBeenCalled());

    const calledWithNull = mockUseVideoPlayer.mock.calls.some(([source]) => source === null);
    expect(calledWithNull).toBe(true);
  });

  it('renders VideoView for video items (testID=media-video present)', async () => {
    galleryItems.push({
      id: 'v2',
      file_type: 'video',
      file_url: 'https://cdn.example.com/vid2.mp4',
    });
    const { findByText, queryAllByTestId } = await render(wrap(<InfluencerProfileScreen />));
    const mediaTrigger = await findByText('Media');
    fireEvent.press(mediaTrigger);

    await waitFor(() => {
      const videos = queryAllByTestId('media-video');
      expect(videos.length).toBeGreaterThan(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. ClubSocialLinks — react-native-qrcode-svg
// ══════════════════════════════════════════════════════════════════════════════
describe('ClubSocialLinks — react-native-qrcode-svg', () => {
  it('hides the QR code by default', async () => {
    const { queryByTestId } = await render(wrap(<ClubSocialLinks />));
    expect(queryByTestId('qr-code')).toBeNull();
  });

  it('renders a QRCode (not the old text placeholder) when the QR Code button is pressed', async () => {
    const { getByText, findByTestId, queryByText } = await render(wrap(<ClubSocialLinks />));
    fireEvent.press(getByText('QR Code'));
    const qr = await findByTestId('qr-code');
    expect(qr).toBeTruthy();
    // The old stub text must be gone.
    expect(queryByText('QR code for:')).toBeNull();
  });

  it('encodes the deep-linked profile URL as the QR value', async () => {
    const { getByText, findByTestId } = await render(wrap(<ClubSocialLinks />));
    fireEvent.press(getByText('QR Code'));
    const qr = await findByTestId('qr-code');
    // expo-linking mock: createURL('/coach') → 'offerhoundv2:///coach'
    expect(qr.props.accessibilityLabel).toBe('offerhoundv2:///coach');
  });

  it('hides the QR code when the QR Code button is pressed again (toggle)', async () => {
    const { getByText, findByTestId, queryByTestId } = await render(wrap(<ClubSocialLinks />));
    fireEvent.press(getByText('QR Code'));
    await findByTestId('qr-code');
    // Press again to toggle off.
    fireEvent.press(getByText('QR Code'));
    await waitFor(() => {
      expect(queryByTestId('qr-code')).toBeNull();
    });
  });
});
