import React from "react";

// RN PARITY NO-OP:
// The web version of this component (Lovable) inspects `window.location.hostname`
// to redirect custom domains (e.g. aiziahthomas.com) to the athlete's
// public profile route (`/p/:customUrl`). React Native apps do not have a
// hostname / custom-domain concept — the app is opened by bundle id, not by URL —
// so the entire custom-domain redirect mechanism is web-only and has no
// equivalent here. We render children directly.
//
// Source: src/components/CustomDomainRedirect.tsx (Lovable)

export const CustomDomainRedirect = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
