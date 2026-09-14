// ViewToggleLabels.test.tsx — Group 3 #7 follow-up.
//
// Locks in the user-facing label change from 'Owner View' -> 'My View'
// and confirms 'Public View' is preserved.  Also verifies the toggle
// callback fires with the inverted value when the label row is pressed
// (existing tap-to-toggle affordance is unchanged).

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Stub the theme + Switch dependency chain so the pure text/behavior
// assertions don't need react-native-gesture-handler etc.
jest.mock('@/lib/theme', () => ({
  colors: {
    background: '#000',
    border: '#111',
    card: '#222',
    foreground: '#fff',
    mutedForeground: '#888',
  },
  typography: { fontFamily: { body: 'System' }, fontSize: { sm: 12 } },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  radius: { md: 6 },
}));

jest.mock('@/components/ui/Switch', () => {
  const R = require('react');
  const { View } = require('react-native');
  return {
    Switch: ({ value }: { value: boolean }) =>
      R.createElement(View, { testID: `switch-${value ? 'on' : 'off'}` }),
  };
});

import { ViewToggle } from '../components/ViewToggle';

describe('ViewToggle labels (Group 3 #7 follow-up)', () => {
  it('renders "My View" when isOwnerView is true', async () => {
    const { getByText, queryByText } = await render(
      <ViewToggle isOwnerView={true} onToggle={() => {}} />,
    );
    expect(getByText('My View')).toBeTruthy();
    expect(queryByText('Owner View')).toBeNull();
  });

  it('renders "Public View" when isOwnerView is false', async () => {
    const { getByText, queryByText } = await render(
      <ViewToggle isOwnerView={false} onToggle={() => {}} />,
    );
    expect(getByText('Public View')).toBeTruthy();
    expect(queryByText('My View')).toBeNull();
    expect(queryByText('Owner View')).toBeNull();
  });

  it('calls onToggle with the inverted value when the label row is pressed', async () => {
    const onToggle = jest.fn();
    const { getByText } = await render(
      <ViewToggle isOwnerView={true} onToggle={onToggle} />,
    );
    fireEvent.press(getByText('My View'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
