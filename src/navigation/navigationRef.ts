// navigationRef.ts — shared navigation ref for use outside navigator context.
// Pass this to <NavigationContainer ref={navigationRef}> in App.tsx.
// Components that are NOT descendants of a navigator (e.g. FloatingAICoach
// rendered as a sibling to Stack.Navigator) must use this ref instead of
// useNavigation() / useNavigationState() to avoid the
// "Is your component inside a navigator?" error.
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navigate to any root-stack screen from outside a navigator. */
export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params);
  }
}

/** Return the name of the currently active route, or undefined. */
export function getCurrentRouteName(): string | undefined {
  if (!navigationRef.isReady()) return undefined;
  return navigationRef.getCurrentRoute()?.name;
}
