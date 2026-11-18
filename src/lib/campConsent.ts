/** Web consent URLs are an API contract, never an import of web application source. */
export function campConsentUrl(token: string) {
  const configured = process.env.EXPO_PUBLIC_CAMP_CONSENT_WEB_URL;
  if (!configured)
    throw Error(
      "The camp consent website has not been configured for this build. Staff can sign on this device instead.",
    );
  const base = new URL(configured);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  ) {
    throw Error("Camp consent requires a secure website origin.");
  }
  if (
    process.env.EXPO_PUBLIC_APP_ENV === "staging" &&
    ["offer-hound.com", "www.offer-hound.com"].includes(base.hostname)
  ) {
    throw Error("QA consent must use its own staging website.");
  }
  return `${base.origin}/camp-consent#${encodeURIComponent(token)}`;
}
