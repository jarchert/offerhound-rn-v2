// On mobile we don't show a cookie banner — there are no third-party cookies in
// the RN client. This component is kept for API compatibility with web ports
// and renders nothing.
import React from 'react';

export function CookieConsentBanner() {
  return null;
}

export default CookieConsentBanner;
