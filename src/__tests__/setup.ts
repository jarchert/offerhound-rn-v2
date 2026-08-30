import '@testing-library/jest-native/extend-expect';

// lucide-react-native ships ESM-only; Jest (CommonJS) can't parse it.
// Stub every named export as a no-op component so any screen that imports
// icons doesn't blow up the test suite.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_target: object, prop: string) => {
        if (prop === '__esModule') return true;
        const Icon = () => React.createElement('View', null);
        Icon.displayName = prop;
        return Icon;
      },
    },
  );
});
