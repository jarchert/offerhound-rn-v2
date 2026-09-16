// src/__tests__/__mocks__/navigation.ts
// React Navigation mock — covers useNavigation, useRoute, RouteProp.
// Individual tests set route.params via mockUseRoute().

export const mockNavigate = jest.fn();
export const mockReset = jest.fn();
export const mockGoBack = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
  goBack: mockGoBack,
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  canGoBack: jest.fn(() => false),
};

export let mockRouteParams: Record<string, any> = {};

export function mockUseRoute(params: Record<string, any>) {
  mockRouteParams = params;
}

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
  RouteProp: jest.fn(),
}));
