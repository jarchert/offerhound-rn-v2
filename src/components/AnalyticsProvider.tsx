// React Native port of Lovable's AnalyticsProvider.
// Verbatim semantics preserved:
//   - Initialize consent-aware analytics with optional IDs.
//   - Fire trackPageView on every route change.
// Web → RN adaptations:
//   - react-router-dom `useLocation().pathname + search`
//       → @react-navigation/native `useNavigationState` current route name + params.
//   - JSX fragment wrapper preserved.
// Documented gap: there is no "search" string in RN navigation; we serialize route params
//   as a query-like suffix so the tracked value stays informative.
import { useEffect } from "react";
import { useNavigationState } from "@react-navigation/native";
import {
  useConsentAwareAnalytics,
  trackPageView,
} from "@/hooks/useConsentAwareAnalytics";

interface AnalyticsProviderProps {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  children: React.ReactNode;
}

function getCurrentPath(
  state: any,
): string {
  if (!state) return "/";
  try {
    const route = state.routes?.[state.index];
    if (!route) return "/";
    const name = route.name || "/";
    const params = (route as any).params as Record<string, unknown> | undefined;
    if (params && Object.keys(params).length > 0) {
      try {
        const qs = Object.entries(params)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(
                typeof v === "string" ? v : JSON.stringify(v),
              )}`,
          )
          .join("&");
        return `/${name}?${qs}`;
      } catch {
        return `/${name}`;
      }
    }
    return `/${name}`;
  } catch {
    return "/";
  }
}

export function AnalyticsProvider({
  googleAnalyticsId,
  facebookPixelId,
  children,
}: AnalyticsProviderProps) {
  // In RN the navigation state may be undefined outside a NavigationContainer.
  const navState = useNavigationState((s) => s);

  // Initialize analytics with consent checking
  useConsentAwareAnalytics({
    googleAnalyticsId,
    facebookPixelId,
  });

  // Track page views on route changes
  useEffect(() => {
    trackPageView(getCurrentPath(navState));
  }, [navState]);

  return <>{children}</>;
}

export default AnalyticsProvider;
