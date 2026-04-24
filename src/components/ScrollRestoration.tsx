import { useEffect } from "react";
import { useNavigationState } from "@react-navigation/native";

/**
 * Scrolls to the top of the page on route changes.
 * Respects location.state.scrollTo for anchor navigation.
 *
 * RN PARITY NOTE:
 * On web, this called `window.scrollTo(0, 0)` on every route change.
 * React Native has no global scroll position — scrolling is per-ScrollView/FlatList.
 * In RN, each screen is unmounted/remounted (or kept in its own stack frame) by
 * React Navigation, so per-screen scroll state is already handled by the
 * navigator. Individual screens that need to reset scroll on focus should use
 * `useScrollToTop` from `@react-navigation/native` on their own ScrollView ref.
 *
 * This component is therefore a no-op wrapper, kept for structural parity with
 * the Lovable web app so call sites (e.g. App.tsx) don't need to change.
 * We still subscribe to navigation state so the effect fires on route change,
 * mirroring the original `useLocation()` dependency, in case future per-screen
 * logic wants to hook in here.
 */
export function ScrollRestoration() {
  // Mirror web's `useLocation()` — re-run effect on route change.
  const routeKey = useNavigationState((state) => state?.routes?.[state.index]?.key ?? null);

  useEffect(() => {
    // No-op in RN: scroll position is owned per-ScrollView, not globally.
    // See component docblock for rationale.
  }, [routeKey]);

  return null;
}
