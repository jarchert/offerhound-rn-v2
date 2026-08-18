/**
 * MinorSafeUploadGate.test.tsx
 *
 * Verifies that every RN upload component shows an "Upload Locked" toast and
 * returns BEFORE any storage call when isMinorSafe=true.
 *
 * Covered components:
 *   - AthleteProfileImageUpload
 *   - BannerImageUpload
 *   - FamilyImageUpload
 *   - FooterImageUpload
 *   - HeroBackgroundImageUpload
 *   - GalleryImageManager
 *   - HighlightVideoUpload
 *
 * Pattern: render is async in this project's jest-expo preset. Always await render()
 * and destructure query helpers from the result.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockToast = jest.fn();
const mockStorageUpload = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
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
    primary: '#E7AF08',
    primaryForeground: '#101318',
    foreground: '#FFFFFF',
    mutedForeground: '#808897',
    background: '#101318',
    border: '#1E2430',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    card: '#161B25',
    cardForeground: '#FFFFFF',
    accent: '#1A2235',
    accentForeground: '#FFFFFF',
    secondary: '#1E2430',
    secondaryForeground: '#FFFFFF',
    muted: '#1E2430',
    input: '#1E2430',
    ring: '#E7AF08',
    popover: '#161B25',
    popoverForeground: '#FFFFFF',
  },
  typography: {
    fontFamily: {
      heading: 'System',
      body: 'System',
      bodyMedium: 'System',
      bodySemiBold: 'System',
      bodyBold: 'System',
    },
    letterSpacing: { heading: 0.5, tight: -0.2, wide: 1 },
    size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
    heading: { h1: 40, h2: 32, h3: 26, h4: 22, h5: 18, h6: 16 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
}));

// ─── Component imports (after mocks) ────────────────────────────────────────

import { AthleteProfileImageUpload } from '@/components/AthleteProfileImageUpload';
import { BannerImageUpload } from '@/components/BannerImageUpload';
import { FamilyImageUpload } from '@/components/FamilyImageUpload';
import { FooterImageUpload } from '@/components/FooterImageUpload';
import { HeroBackgroundImageUpload } from '@/components/HeroBackgroundImageUpload';
import { GalleryImageManager } from '@/components/GalleryImageManager';
import { HighlightVideoUpload } from '@/components/HighlightVideoUpload';

const ATHLETE_ID = 'athlete-uuid-123';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Minor-Safe upload gate — isMinorSafe=true blocks all storage calls', () => {

  // ── AthleteProfileImageUpload ──────────────────────────────────────────

  it('AthleteProfileImageUpload: shows Upload Locked toast, never calls storage.upload', async () => {
    const { getByText } = await render(
      React.createElement(AthleteProfileImageUpload, {
        athleteId: ATHLETE_ID,
        currentImageUrl: null,
        athleteName: 'Test Athlete',
        onImageUpdated: jest.fn(),
        isMinorSafe: true,
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

  it('AthleteProfileImageUpload: isMinorSafe=false — no locked toast fires', async () => {
    const { getByText } = await render(
      React.createElement(AthleteProfileImageUpload, {
        athleteId: ATHLETE_ID,
        currentImageUrl: null,
        athleteName: 'Test Athlete',
        onImageUpdated: jest.fn(),
        isMinorSafe: false,
      })
    );

    await act(async () => { fireEvent.press(getByText('Upload Photo')); });

    // Give async operations a moment to settle
    await waitFor(() => { /* just flush */ });

    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Upload Locked' })
    );
  });

  // ── BannerImageUpload ──────────────────────────────────────────────────
  // No currentImageUrl → button text is 'Upload Banner'

  it('BannerImageUpload: shows Upload Locked toast, never calls storage.upload', async () => {
    const { getByText } = await render(
      React.createElement(BannerImageUpload, {
        athleteId: ATHLETE_ID,
        currentImageUrl: null,
        onImageUpdated: jest.fn(),
        isMinorSafe: true,
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

  // ── FamilyImageUpload ──────────────────────────────────────────────────
  // No currentImageUrl → 'Upload Family Photo' inside a <Button> (renders as string child)

  it('FamilyImageUpload: shows Upload Locked toast, never calls storage.upload', async () => {
    const { getByText } = await render(
      React.createElement(FamilyImageUpload, {
        athleteId: ATHLETE_ID,
        currentImageUrl: null,
        onImageUpdated: jest.fn(),
        isMinorSafe: true,
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

  // ── GalleryImageManager ────────────────────────────────────────────────
  // Tap the '+' / 'Add' pressable in the grid

  it('GalleryImageManager: shows Upload Locked toast, never calls storage.upload', async () => {
    const { getByText } = await render(
      React.createElement(GalleryImageManager, {
        athleteId: ATHLETE_ID,
        galleryImages: [],
        onImagesUpdated: jest.fn(),
        isMinorSafe: true,
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

  // ── HeroBackgroundImageUpload ──────────────────────────────────────────
  // Plain <Text> 'Upload hero image' inside a <Pressable>

  it('HeroBackgroundImageUpload: shows Upload Locked toast, never calls storage.upload', async () => {
    const { getByText } = await render(
      React.createElement(HeroBackgroundImageUpload, {
        athleteId: ATHLETE_ID,
        currentImageUrl: null,
        onImageUpdated: jest.fn(),
        isMinorSafe: true,
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

  // ── FooterImageUpload ──────────────────────────────────────────────────
  // Plain <Text> 'Upload footer image' inside a <Pressable>

  it('FooterImageUpload: shows Upload Locked toast, never calls storage.upload', async () => {
    const { getByText } = await render(
      React.createElement(FooterImageUpload, {
        athleteId: ATHLETE_ID,
        currentImageUrl: null,
        onImageUpdated: jest.fn(),
        isMinorSafe: true,
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

  // ── HighlightVideoUpload ───────────────────────────────────────────────
  // Plain <Text> 'Upload highlight video' inside a <Pressable>

  it('HighlightVideoUpload: shows Upload Locked toast, never calls storage.upload', async () => {
    const { getByText } = await render(
      React.createElement(HighlightVideoUpload, {
        athleteId: ATHLETE_ID,
        currentVideoUrl: null,
        onVideoUpdated: jest.fn(),
        isMinorSafe: true,
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
