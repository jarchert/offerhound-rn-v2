/** Stop before opening a store purchase when the entitlement service is absent. */
export async function requirePurchaseService(url: string, key: string, transport: typeof fetch = fetch) {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    response = await transport(`${url}/functions/v1/validate-iap-receipt`, {
      method: 'OPTIONS', headers: { apikey: key }, signal: controller.signal,
    });
  } catch { throw new Error('Purchases are temporarily unavailable. Please try again later. No purchase was started.'); }
  finally { clearTimeout(timer); }
  if (!response.ok) throw new Error('Purchases are temporarily unavailable. No purchase was started.');
}
