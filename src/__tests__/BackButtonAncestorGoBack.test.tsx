// BackButtonAncestorGoBack.test.tsx — Group 2 Bug 6
//
// Regression test: BackButton must walk up parent navigators to find one
// that can go back, not silently do nothing when the immediate navigator
// (typically a bottom-tab navigator surrounding the current screen) cannot
// pop. Reported as "back navigation broken on all pages".
//
// Old behaviour: `if (nav.canGoBack()) nav.goBack();` \u2014 canGoBack() on the
// current navigator returned false for any screen rendered inside a tab
// navigator (tabs don't have a back stack), so pressing Back did nothing.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@/lib/theme', () => ({
  colors: { foreground: '#000' },
  typography: { fontFamily: { bodySemiBold: 'System' }, fontSize: { sm: 14 } },
  spacing: { sm: 8 },
}));

// nav ancestors are wired up per-test via useNavigation mock.
let mockNav: any;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
}));

import { BackButton } from '@/components/BackButton';

describe('BackButton — walks up parent navigators (Group 2 Bug 6)', () => {
  it('calls goBack on the parent when the current navigator cannot go back', async () => {
    const parentGoBack = jest.fn();
    const childGoBack = jest.fn();
    const parent = {
      canGoBack: () => true,
      goBack: parentGoBack,
      getParent: () => null,
    };
    mockNav = {
      canGoBack: () => false,      // tab navigator: no back stack
      goBack: childGoBack,
      getParent: () => parent,
    };

    const { getByText } = await render(<BackButton />);
    fireEvent.press(getByText('Back'));

    expect(childGoBack).not.toHaveBeenCalled();
    expect(parentGoBack).toHaveBeenCalledTimes(1);
  });

  it('prefers the closest navigator that can go back', async () => {
    const rootGoBack = jest.fn();
    const midGoBack = jest.fn();
    const childGoBack = jest.fn();
    const root = { canGoBack: () => true, goBack: rootGoBack, getParent: () => null };
    const mid = { canGoBack: () => true, goBack: midGoBack, getParent: () => root };
    mockNav = {
      canGoBack: () => false,
      goBack: childGoBack,
      getParent: () => mid,
    };

    const { getByText } = await render(<BackButton />);
    fireEvent.press(getByText('Back'));

    // mid can go back, so we stop there \u2014 root and child are not invoked.
    expect(midGoBack).toHaveBeenCalledTimes(1);
    expect(rootGoBack).not.toHaveBeenCalled();
    expect(childGoBack).not.toHaveBeenCalled();
  });

  it('is a no-op when no ancestor can go back', async () => {
    const childGoBack = jest.fn();
    mockNav = {
      canGoBack: () => false,
      goBack: childGoBack,
      getParent: () => null,
    };

    const { getByText } = await render(<BackButton />);
    expect(() => fireEvent.press(getByText('Back'))).not.toThrow();
    expect(childGoBack).not.toHaveBeenCalled();
  });

  it('honours a provided onPress override', async () => {
    const onPress = jest.fn();
    const childGoBack = jest.fn();
    mockNav = { canGoBack: () => true, goBack: childGoBack, getParent: () => null };

    const { getByText } = await render(<BackButton onPress={onPress} />);
    fireEvent.press(getByText('Back'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(childGoBack).not.toHaveBeenCalled();
  });
});
