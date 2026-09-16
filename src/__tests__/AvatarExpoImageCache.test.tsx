/**
 * Avatar — swapped plain react-native <Image> for expo-image with
 * memory-disk cache (perf fix A/B, Sep 2026).
 *
 * BEFORE fix:
 *   src/components/ui/Avatar.tsx imported <Image> from 'react-native'. Every
 *   mount of a share-card Avatar (SharePlayerCardDialog + the inline
 *   ProfileCardGenerator inside SocialLinksManager) re-decoded the JPEG on
 *   the JS thread with no memory/disk cache.
 *
 * AFTER fix:
 *   Avatar imports Image from 'expo-image' (already a project dep, used in
 *   4 other components) and passes cachePolicy="memory-disk" so subsequent
 *   mounts hit the cache and don't re-decode.
 *
 * This test:
 *   (a) Mocks expo-image with a spy and asserts the Avatar rendered element
 *       is the expo-image Image (not the RN one), and the cachePolicy prop
 *       is "memory-disk" when a source is present.
 *   (b) Asserts fallback path (no source / error) does NOT render Image at
 *       all — so we don't pay the cache lookup for the initials fallback.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

// Spy on expo-image.
const expoImageProps: Array<any> = [];
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    Image: (props: any) => {
      expoImageProps.push(props);
      return React.createElement(View, { testID: 'expo-image' });
    },
  };
});

// Import AFTER mocks.
import { Avatar } from '@/components/ui/Avatar';

describe('Avatar — expo-image with memory-disk cache (perf fix A/B)', () => {
  beforeEach(() => {
    expoImageProps.length = 0;
  });

  test('renders expo-image with cachePolicy="memory-disk" when source provided', async () => {
    await act(async () => {
      render(
        React.createElement(Avatar, {
          source: { uri: 'https://cdn.example.com/photos/athlete-42.jpg' },
          fallback: 'JA',
          size: 80,
        }),
      );
      await Promise.resolve();
    });
    // Exactly one expo-image invocation for the mounted Avatar.
    expect(expoImageProps.length).toBe(1);
    const props = expoImageProps[0];
    expect(props.source).toEqual({ uri: 'https://cdn.example.com/photos/athlete-42.jpg' });
    expect(props.cachePolicy).toBe('memory-disk');
    // contentFit=cover matches the intended behavior of the fixed-size round avatar.
    expect(props.contentFit).toBe('cover');
    // Transition disabled to avoid extra JS work per mount.
    expect(props.transition).toBe(0);
  });

  test('renders fallback text (no Image call) when source is null', async () => {
    let getByText: any;
    await act(async () => {
      const result = await render(
        React.createElement(Avatar, { source: null, fallback: 'JA', size: 40 }),
      );
      getByText = result.getByText;
    });
    expect(expoImageProps.length).toBe(0); // no cache lookup, no decode
    expect(getByText('JA')).toBeTruthy();
  });

  test('renders fallback text (no Image call) when source uri is empty string', async () => {
    let getByText: any;
    await act(async () => {
      const result = await render(
        React.createElement(Avatar, { source: { uri: '' }, fallback: 'JA', size: 40 }),
      );
      getByText = result.getByText;
    });
    expect(expoImageProps.length).toBe(0);
    expect(getByText('JA')).toBeTruthy();
  });
});
