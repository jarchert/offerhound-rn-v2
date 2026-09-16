// RegisterSearchGate.test.tsx — Group 4 #9-#11 (component contract)
//
// Verifies:
//   - Renders the provided `message` and optional `description`.
//   - The register button navigates to AuthStack -> SignUp.
//   - The sign-in button navigates to AuthStack -> Auth.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/lib/theme', () => ({
  colors: {
    primary: '#f00', primaryForeground: '#fff', foreground: '#000',
    mutedForeground: '#888', card: '#111', border: '#222', background: '#000',
    cardForeground: '#fff',
  },
  typography: {
    fontFamily: { heading: 'System', body: 'System', bodyMedium: 'System' },
    fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22 },
    letterSpacing: { heading: 0 },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 32 },
  radius: { md: 8, lg: 12, xl: 16 },
}));

import { RegisterSearchGate } from '@/components/RegisterSearchGate';

describe('RegisterSearchGate', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the message and optional description', async () => {
    const { getByText } = await render(
      <RegisterSearchGate
        message="Register to find your coach and program match"
        description="Free, no credit card"
      />,
    );
    expect(getByText('Register to find your coach and program match')).toBeTruthy();
    expect(getByText('Free, no credit card')).toBeTruthy();
    expect(getByText('Create Free Account')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('omits the description block when not provided', async () => {
    const { queryByText, getByText } = await render(
      <RegisterSearchGate message="Register to find your AI matched players" />,
    );
    expect(getByText('Register to find your AI matched players')).toBeTruthy();
    expect(queryByText('Free, no credit card')).toBeNull();
  });

  it('navigates to AuthStack -> SignUp on Create Free Account', async () => {
    const { getByText } = await render(
      <RegisterSearchGate message="Register to connect with verified scouts" />,
    );
    fireEvent.press(getByText('Create Free Account'));
    expect(mockNavigate).toHaveBeenCalledWith('AuthStack', { screen: 'SignUp' });
  });

  it('navigates to AuthStack -> Auth on Sign In', async () => {
    const { getByText } = await render(
      <RegisterSearchGate message="Register to connect with verified scouts" />,
    );
    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('AuthStack', { screen: 'Auth' });
  });
});
