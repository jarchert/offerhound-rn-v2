/**
 * AthletePerformanceRadar — render-count perf fix (Sep 2026).
 *
 * BEFORE fix (real evidence):
 *   The component ran a hand-rolled 600ms requestAnimationFrame loop that
 *   called setAnimatedData(...) on every frame. At ~60fps that's ~36
 *   setState calls per mount, each re-rendering the entire radar Card
 *   (44+ SVG child elements). This competed with ScrollView gesture
 *   handling on the JS thread and caused the reported "first drag feels
 *   sticky" symptom on the shareable-card mounts.
 *
 * AFTER fix:
 *   - The RAF loop and useState(animatedData) are removed. displayData ===
 *     chartData directly.
 *   - The exported component is wrapped in React.memo, so a parent re-render
 *     that doesn't change the athlete prop reference will not cascade
 *     through the radar's SVG tree.
 *
 * This test:
 *   (a) Counts how many times the *impl* function body is invoked when the
 *       radar is mounted alone with a stable athlete prop, then advances
 *       fake timers ~1s. Post-fix: exactly 1 render.
 *   (b) Mounts the radar inside a parent that re-renders on unrelated state
 *       changes and asserts the radar impl is called exactly ONCE for the
 *       initial mount and NOT AGAIN when only the parent's counter changes
 *       (React.memo blocks the cascade because athlete ref is stable).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { View } from 'react-native';

// Track how many times the RADAR IMPL renders. We do this by intercepting
// react-native-svg's <Svg> element (the one thing the impl definitely renders).
let radarImplRenderCount = 0;

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const RNText = require('react-native').Text;
  const MkStub = (name: string) => {
    const Stub = (props: any) => {
      // Only count when Svg (the root radar element) renders.
      if (name === 'Svg') radarImplRenderCount += 1;
      // SvgText contains raw string children; wrap in RN <Text> so RN test
      // renderer doesn't throw "Text strings must be rendered within Text".
      const Wrapper = name === 'Text' ? RNText : View;
      return React.createElement(Wrapper, { testID: `svg-${name.toLowerCase()}` }, props?.children ?? null);
    };
    Stub.displayName = `SvgStub_${name}`;
    return Stub;
  };
  return {
    __esModule: true,
    default: MkStub('Svg'),
    Svg: MkStub('Svg'),
    Polygon: MkStub('Polygon'),
    Line: MkStub('Line'),
    Circle: MkStub('Circle'),
    Text: MkStub('Text'),
    G: MkStub('G'),
  };
});

// UI stubs that would otherwise pull in extra tree cost.
jest.mock('@/components/ui/Card', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Card: ({ children }: any) => React.createElement(View, null, children),
    CardHeader: ({ children }: any) => React.createElement(View, null, children),
    CardContent: ({ children }: any) => React.createElement(View, null, children),
    CardTitle: ({ children }: any) => React.createElement(Text, null, children),
  };
});
jest.mock('@/components/ui/Badge', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Badge: ({ children }: any) => React.createElement(Text, null, children) };
});

// Import AFTER mocks.
import { AthletePerformanceRadar } from '@/components/AthletePerformanceRadar';

// A minimal athlete with enough real numbers to make hasAnyData true, so the
// component doesn't short-circuit to null before rendering the SVG.
const STABLE_ATHLETE = {
  height: "6'2\"",
  weight: '210',
  forty_yard: '4.5s',
  vertical: '36"',
  bench_press: '20 reps',
  squat: '450 lbs',
  arm_length: '33"',
  position: 'wide receiver',
  positions: ['WR'],
};

describe('AthletePerformanceRadar — render counts (perf fix A/B)', () => {
  beforeEach(() => {
    radarImplRenderCount = 0;
  });

  test('mounts with a bounded render count (pre-fix would show ~36 via RAF loop)', async () => {
    jest.useFakeTimers();
    try {
      await act(async () => {
        render(React.createElement(AthletePerformanceRadar, { athlete: STABLE_ATHLETE }));
        await Promise.resolve();
      });
      // Give the previously-existing 100ms setTimeout + 600ms RAF loop a full
      // second of fake wall clock. Post-fix nothing schedules any timers.
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      // Post-fix expectation: ≤ 3 renders (React 18 dev reconciler runs the
      // function body up to 2-3 times on initial mount for hook accounting,
      // but the RAF loop is gone). Pre-fix: ~36 renders from the 600ms RAF
      // setState loop firing at ~60fps.
      expect(radarImplRenderCount).toBeGreaterThanOrEqual(1);
      expect(radarImplRenderCount).toBeLessThanOrEqual(3);
    } finally {
      jest.useRealTimers();
    }
  });

  test('React.memo blocks parent re-renders when athlete prop is stable', () => {
    let setCounter: (n: number) => void = () => {};

    function Parent() {
      const [counter, setCounterState] = React.useState(0);
      setCounter = setCounterState;
      return React.createElement(
        View,
        null,
        // Same STABLE_ATHLETE reference every render — memo should skip.
        React.createElement(AthletePerformanceRadar, { athlete: STABLE_ATHLETE }),
      );
    }

    // React 18 concurrent: wrap render + microtask flush in act.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    return (async () => {
      await act(async () => {
        render(React.createElement(Parent));
        await Promise.resolve();
      });
      const initial = radarImplRenderCount;
      expect(initial).toBeGreaterThanOrEqual(1);

      // Force 5 unrelated parent re-renders. With React.memo the child impl
      // must NOT re-run.
      await act(async () => { setCounter(1); });
      await act(async () => { setCounter(2); });
      await act(async () => { setCounter(3); });
      await act(async () => { setCounter(4); });
      await act(async () => { setCounter(5); });

      // Render count must not increase — React.memo blocks the cascade.
      expect(radarImplRenderCount).toBe(initial);
    })();
  });

  test('React.memo does NOT block re-render when the athlete object changes reference', () => {
    let swapAthlete: () => void = () => {};

    function Parent() {
      const [a, setA] = React.useState<any>(STABLE_ATHLETE);
      swapAthlete = () => setA({ ...STABLE_ATHLETE, weight: '220' });
      return React.createElement(AthletePerformanceRadar, { athlete: a });
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    return (async () => {
      await act(async () => {
        render(React.createElement(Parent));
        await Promise.resolve();
      });
      const initial = radarImplRenderCount;
      expect(initial).toBeGreaterThanOrEqual(1);

      await act(async () => { swapAthlete(); });
      // New athlete object → memo lets the update through: count must grow.
      expect(radarImplRenderCount).toBeGreaterThan(initial);
    })();
  });
});
