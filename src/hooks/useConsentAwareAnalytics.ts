// React Native port of Lovable's useConsentAwareAnalytics hook.
// Verbatim structure preserved. Web-only APIs replaced with RN-compatible equivalents:
//   - localStorage          → @react-native-async-storage/async-storage (in-memory cache used synchronously)
//   - window.gtag / fbq     → no-op stubs (mobile bundle has no browser script tags / cookies)
//   - document.cookie       → no-op (no browser cookies in RN)
//   - window add/remove EventListener('storage' / 'cookie-consent-updated')
//                          → DeviceEventEmitter
// Documented gaps:
//   * Google Analytics / Facebook Pixel script-injection is not possible in RN; calls become no-ops.
//     A future port should swap in a native SDK (e.g. @react-native-firebase/analytics, react-native-fbsdk-next).
//   * Consent reads are synchronous in the web version (localStorage). Here we hydrate an in-memory
//     cache from AsyncStorage on mount; until hydration completes, getAnalyticsConsent/getMarketingConsent
//     return false (safer default — same as "no consent yet").
import { useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const COOKIE_CONSENT_KEY = "offerhound_cookie_consent";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  doNotSell?: boolean;
  version: string;
  timestamp: string;
}

// In-memory mirror of AsyncStorage (RN has no synchronous storage).
let cachedPrefs: CookiePreferences | null = null;
let hydrated = false;

async function hydrateCache(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(COOKIE_CONSENT_KEY);
    cachedPrefs = stored ? (JSON.parse(stored) as CookiePreferences) : null;
  } catch {
    cachedPrefs = null;
  } finally {
    hydrated = true;
  }
}

// Check if analytics cookies are allowed
export function getAnalyticsConsent(): boolean {
  try {
    if (!cachedPrefs) return false;
    return cachedPrefs.analytics === true && cachedPrefs.doNotSell !== true;
  } catch {
    return false;
  }
}

// Check if marketing cookies are allowed
export function getMarketingConsent(): boolean {
  try {
    if (!cachedPrefs) return false;
    return cachedPrefs.marketing === true && cachedPrefs.doNotSell !== true;
  } catch {
    return false;
  }
}

// Initialize Google Analytics (only if consent given)
// RN gap: no DOM/script tags. Stubbed to log so call sites still work.
function initGoogleAnalytics(measurementId: string) {
  // No-op on React Native (no window/document). Wire a native SDK here later.
  console.log("[Analytics] Google Analytics initialized with consent (stub)", measurementId);
}

// Initialize Facebook Pixel (only if marketing consent given)
// RN gap: no DOM/script tags. Stubbed.
function initFacebookPixel(pixelId: string) {
  // No-op on React Native. Wire react-native-fbsdk-next here later.
  console.log("[Analytics] Facebook Pixel initialized with consent (stub)", pixelId);
}

// Remove analytics scripts and cookies
function removeAnalytics() {
  // No browser cookies in RN — nothing to remove.
  console.log("[Analytics] Analytics cookies removed (stub)");
}

// Track a page view (respects consent)
export function trackPageView(path?: string) {
  if (!getAnalyticsConsent()) return;
  // No window.gtag in RN — stub.
  console.log("[Analytics] page_view", path);
}

// Track a custom event (respects consent)
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (!getAnalyticsConsent()) return;
  console.log("[Analytics] Event tracked:", eventName, eventParams);
}

// Track a conversion (respects marketing consent)
export function trackConversion(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (!getMarketingConsent()) return;
  console.log("[Analytics] Conversion tracked:", eventName, eventParams);
}

// Configuration for analytics providers
interface AnalyticsConfig {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

// Hook to manage analytics based on consent
export function useConsentAwareAnalytics(config: AnalyticsConfig = {}) {
  const { googleAnalyticsId, facebookPixelId } = config;

  const initializeAnalytics = useCallback(() => {
    const analyticsConsent = getAnalyticsConsent();
    const marketingConsent = getMarketingConsent();

    if (analyticsConsent && googleAnalyticsId) {
      initGoogleAnalytics(googleAnalyticsId);
    }

    if (marketingConsent && facebookPixelId) {
      initFacebookPixel(facebookPixelId);
    }

    if (!analyticsConsent && !marketingConsent) {
      removeAnalytics();
    }
  }, [googleAnalyticsId, facebookPixelId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!hydrated) {
        await hydrateCache();
      }
      if (cancelled) return;
      initializeAnalytics();
    };
    void run();

    // Listen for consent changes (RN equivalent of window storage + custom event).
    const consentSub = DeviceEventEmitter.addListener(
      "cookie-consent-updated",
      () => {
        void (async () => {
          await hydrateCache();
          initializeAnalytics();
        })();
      },
    );

    return () => {
      cancelled = true;
      consentSub.remove();
    };
  }, [initializeAnalytics]);

  return {
    trackPageView,
    trackEvent,
    trackConversion,
    hasAnalyticsConsent: getAnalyticsConsent,
    hasMarketingConsent: getMarketingConsent,
  };
}

// Dispatch event when consent is updated (to trigger re-initialization)
export function notifyConsentUpdate() {
  DeviceEventEmitter.emit("cookie-consent-updated");
}
