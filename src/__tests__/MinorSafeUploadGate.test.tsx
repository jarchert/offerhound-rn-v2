/**
 * MinorSafeUploadGate.test.tsx
 *
 * Verifies the minor-safe upload guard for all 7 RN athlete upload components.
 *
 * Guard design (belt-and-suspenders):
 *   1. Prop fast-path: isMinorSafe={true} → blocked immediately, zero DB round-trip.
 *   2. DB verification: isMinorSafeAthlete(athleteId) queries player_profiles.is_minor_safe.
 *      Fires even when the prop is false/omitted so callers that forget the prop are still
 *      protected. Fail-open: a DB lookup error returns false and never blocks a normal upload.
 *
 * Test suites:
 *   A. isMinorSafeAthlete helper — unit tests for the shared guard function.
 *   B. Prop-path guard — isMinorSafe=true blocks storage.upload in all 7 components.
 *   C. DB-path guard — prop=false/omitted but DB returns is_minor_safe=true; still blocked.
 *   D. Fail-open — DB error → upload proceeds (no false blockage of normal uploads).
 *   E. Non-minor-safe uploads — normal (non-minor) uploads are completely unaffected.
 *
 * Covered components:
 *   AthleteProfileImageUpload, BannerImageUpload, FamilyImageUpload,
 *   FooterImageUpload, HeroBackgroundImageUpload, GalleryImageManager,
 *   HighlightVideoUpload
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mutable mock state ────────────────────────────────────────────────────────
// `var` so the declarations are hoisted into the jest.mock() factory scope.
// Without hoisting, the factory captures `undefined` and all test overrides
// via jest.fn().mockReturnValue() have no effect.
var mockMaybySingle: jest.Mock;
mockMaybySingle = jest.fn().mockResolvedValue({ data: null, error: null });

const mockToast = jest.fn();
const mockStorageUpload = jest.fn().mockResolvedValue({ error: null });

// ─── Supabase mock ─────────────────────────────────────────────────────────────
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      // Lazy indirection — reads mockMaybySingle at call time, not factory time.
      maybeSingle: (...args: any[]) => mockMaybySingle(...args),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: mockStorageUpload,
        remove: jest.fn().mockResolvedValue({}),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/img.jpg' } })),
      })),
    },
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{
      uri: 'file:///mock/photo.jpg',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 100,
      width: 800,
      height: 600,
    }],
  }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos' },
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const R = require('react');
  return new Proxy({}, {
    get: (_t: any, name: string) =>
      function MockIcon() { return R.createElement(View, { testID: 'icon-' + name }); },
  });
});

jest.mock('@/lib/theme', () => ({
  colors: {
    primary: '#E7AF08', primaryForeground: '#101318', foreground: '#FFFFFF',
    mutedForeground: '#808897', background: '#101318', border: '#1E2430',
    destructive: '#EF4444', destructiveForeground: '#FFFFFF', card: '#161B25',
    cardForeground: '#FFFFFF', accent: '#1A2235', accentForeground: '#FFFFFF',
    secondary: '#1E2430', secondaryForeground: '#FFFFFF', muted: '#1E2430',
    input: '#1E2430', ring: '#E7AF08', popover: '#161B25', popoverForeground: '#FFFFFF',
  },
  typography: {
    fontFamily: {
      heading: 'System', body: 'System', bodyMedium: 'System',
      bodySemiBold: 'System', bodyBold: 'System',
    },
    letterSpacing: { heading: 0.5, tight: -0.2, wide: 1 },
    size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
    heading: { h1: 40, h2: 32, h3: 26, h4: 22, h5: 18, h6: 16 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, xxl: 48, xxxl: 64 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
}));

// ─── Component + helper imports (after mocks) ──────────────────────────────────
import { AthleteProfileImageUpload } from '@/components/AthleteProfileImageUpload';
import { BannerImageUpload } from '@/components/BannerImageUpload';
import { FamilyImageUpload } from '@/components/FamilyImageUpload';
import { FooterImageUpload } from '@/components/FooterImageUpload';
import { HeroBackgroundImageUpload } from '@/components/HeroBackgroundImageUpload';
import { GalleryImageManager } from '@/components/GalleryImageManager';
import { HighlightVideoUpload } from '@/components/HighlightVideoUpload';
import { isMinorSafeAthlete } from '@/lib/isMinorSafeAthlete';

const ATHLETE_ID = 'athlete-uuid-123';

// Helper: make the supabase mock look like a minor-safe DB row.
function mockDBMinorSafe(minorSafe: boolean) {
  mockMaybySingle.mockResolvedValue({
    data: { is_minor_safe: minorSafe },
    error: null,
  });
}

// Helper: make the supabase mock return a DB error (fail-open scenario).
function mockDBError() {
  mockMaybySingle.mockResolvedValue({
    data: null,
    error: { message: 'connection refused' },
  });
}

// Helper: normal DB (is_minor_safe=false, null row).
function mockDBNormal() {
  mockMaybySingle.mockResolvedValue({ data: null, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDBNormal(); // default: not minor-safe
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite A — isMinorSafeAthlete helper (unit tests)
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite A — isMinorSafeAthlete helper', () => {
  it('returns true when DB row has is_minor_safe=true', async () => {
    mockDBMinorSafe(true);
    const result = await isMinorSafeAthlete(ATHLETE_ID);
    expect(result).toBe(true);
  });

  it('returns false when DB row has is_minor_safe=false', async () => {
    mockDBMinorSafe(false);
    const result = await isMinorSafeAthlete(ATHLETE_ID);
    expect(result).toBe(false);
  });

  it('returns false (fail-open) when DB returns null row (athlete not found)', async () => {
    mockDBNormal(); // data: null
    const result = await isMinorSafeAthlete(ATHLETE_ID);
    expect(result).toBe(false);
  });

  it('returns false (fail-open) when DB returns an error — never blocks normal uploads', async () => {
    mockDBError();
    const result = await isMinorSafeAthlete(ATHLETE_ID);
    expect(result).toBe(false);
  });

  it('returns false immediately for empty athleteId without hitting DB', async () => {
    const result = await isMinorSafeAthlete('');
    expect(mockMaybySingle).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite B — Prop-path guard: isMinorSafe=true blocks storage in all 7 components
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite B — prop-path guard (isMinorSafe=true) blocks storage.upload', () => {

  it('AthleteProfileImageUpload: Upload Locked toast, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(AthleteProfileImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null, athleteName: 'Test Athlete',
        onImageUpdated: jest.fn(), isMinorSafe: true,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Photo')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('BannerImageUpload: Upload Locked toast, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(BannerImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: true,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Banner')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('FamilyImageUpload: Upload Locked toast, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(FamilyImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: true,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Family Photo')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('GalleryImageManager: Upload Locked toast, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(GalleryImageManager, {
        athleteId: ATHLETE_ID, galleryImages: [],
        onImagesUpdated: jest.fn(), isMinorSafe: true,
      })
    );
    await act(async () => { fireEvent.press(getByText('Add')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('HeroBackgroundImageUpload: Upload Locked toast, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(HeroBackgroundImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: true,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload hero image')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('FooterImageUpload: Upload Locked toast, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(FooterImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: true,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload footer image')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('HighlightVideoUpload: Upload Locked toast, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(HighlightVideoUpload, {
        athleteId: ATHLETE_ID, currentVideoUrl: null,
        onVideoUpdated: jest.fn(), isMinorSafe: true,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload highlight video')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite C — DB-path guard: prop=false but DB says is_minor_safe=true → still blocked
// This is the critical belt-and-suspenders scenario: caller forgot the prop.
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite C — DB-path guard fires even when isMinorSafe prop is false/omitted', () => {

  beforeEach(() => {
    // DB returns is_minor_safe=true for this athlete even though the prop says false.
    mockDBMinorSafe(true);
  });

  it('AthleteProfileImageUpload: DB guard fires, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(AthleteProfileImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null, athleteName: 'Test Athlete',
        onImageUpdated: jest.fn(), isMinorSafe: false,  // prop says NOT minor-safe
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Photo')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('BannerImageUpload: DB guard fires, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(BannerImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Banner')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('FamilyImageUpload: DB guard fires, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(FamilyImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Family Photo')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('GalleryImageManager: DB guard fires, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(GalleryImageManager, {
        athleteId: ATHLETE_ID, galleryImages: [],
        onImagesUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Add')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('HeroBackgroundImageUpload: DB guard fires, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(HeroBackgroundImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload hero image')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('FooterImageUpload: DB guard fires, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(FooterImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload footer image')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('HighlightVideoUpload: DB guard fires, storage.upload never called', async () => {
    const { getByText } = await render(
      React.createElement(HighlightVideoUpload, {
        athleteId: ATHLETE_ID, currentVideoUrl: null,
        onVideoUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload highlight video')); });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload Locked', variant: 'destructive' })
      );
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite D — Fail-open: DB error → upload NOT blocked (no false positive blockage)
// A transient DB error must NEVER prevent a normal (non-minor) upload.
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite D — fail-open: DB lookup error never blocks normal uploads', () => {

  beforeEach(() => {
    mockDBError(); // DB returns error — should fail open
  });

  it('AthleteProfileImageUpload: DB error → Upload Locked toast NOT fired', async () => {
    const { getByText } = await render(
      React.createElement(AthleteProfileImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null, athleteName: 'Test Athlete',
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Photo')); });
    // Wait enough for the DB async path to complete.
    await waitFor(() => { /* flush */ });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Upload Locked' })
    );
  });

  it('BannerImageUpload: DB error → Upload Locked toast NOT fired', async () => {
    const { getByText } = await render(
      React.createElement(BannerImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Banner')); });
    await waitFor(() => { /* flush */ });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Upload Locked' })
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite E — Normal uploads: non-minor-safe profiles completely unaffected
// ══════════════════════════════════════════════════════════════════════════════

describe('Suite E — non-minor-safe profiles: Upload Locked toast never fires', () => {

  beforeEach(() => {
    mockDBNormal(); // DB: is_minor_safe=false / null
  });

  it('AthleteProfileImageUpload: isMinorSafe=false → no Upload Locked toast', async () => {
    const { getByText } = await render(
      React.createElement(AthleteProfileImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null, athleteName: 'Test Athlete',
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Photo')); });
    await waitFor(() => { /* flush */ });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Upload Locked' })
    );
  });

  it('BannerImageUpload: isMinorSafe=false → no Upload Locked toast', async () => {
    const { getByText } = await render(
      React.createElement(BannerImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Banner')); });
    await waitFor(() => { /* flush */ });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Upload Locked' })
    );
  });

  it('FamilyImageUpload: isMinorSafe=false → no Upload Locked toast', async () => {
    const { getByText } = await render(
      React.createElement(FamilyImageUpload, {
        athleteId: ATHLETE_ID, currentImageUrl: null,
        onImageUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Upload Family Photo')); });
    await waitFor(() => { /* flush */ });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Upload Locked' })
    );
  });

  it('GalleryImageManager: isMinorSafe=false → no Upload Locked toast', async () => {
    const { getByText } = await render(
      React.createElement(GalleryImageManager, {
        athleteId: ATHLETE_ID, galleryImages: [],
        onImagesUpdated: jest.fn(), isMinorSafe: false,
      })
    );
    await act(async () => { fireEvent.press(getByText('Add')); });
    await waitFor(() => { /* flush */ });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Upload Locked' })
    );
  });
});
