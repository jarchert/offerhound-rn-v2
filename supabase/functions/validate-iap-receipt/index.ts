/**
 * Supabase Edge Function: validate-iap-receipt
 *
 * Validates an in-app-purchase receipt with the relevant store, then upserts
 * the resulting entitlement into the `public.user_subscriptions` table.
 *
 * ┌─ Required env vars (set via `supabase secrets set ...`) ────────────────
 * │ APPLE_IAP_SHARED_SECRET     App-Store-Connect "App-Specific Shared Secret"
 * │                             (App Information → App-Specific Shared Secret).
 * │ GOOGLE_PLAY_SERVICE_ACCOUNT JSON for a Play-Console-linked GCP service
 * │                             account with the
 * │                             `androidpublisher.subscriptions.get` and
 * │                             `androidpublisher.purchases.products.get`
 * │                             scopes. Paste the entire JSON file contents.
 * │ GOOGLE_PLAY_PACKAGE_NAME    Optional override; defaults to the constant
 * │                             below.
 * │ SUPABASE_URL                Auto-injected by Supabase Functions runtime.
 * │ SUPABASE_SERVICE_ROLE_KEY   Auto-injected by Supabase Functions runtime.
 * └─────────────────────────────────────────────────────────────────────────
 *
 * Request body (POST, JSON):
 * {
 *   "store":         "apple" | "google",
 *   "receipt":       string,   // iOS: base64 receipt or JWS; Android: purchaseToken
 *   "productId":     string,   // store SKU
 *   "transactionId": string,   // iOS: transactionId; Android: orderId or token
 *   "sportId":       string?,  // optional, camp_manager_annual_unlimited only
 *   "eventId":       string?,  // optional, camp_manager_event only
 *   "calendarYear":  number?   // optional, camp_manager_event only
 * }
 *
 * Response: { tier, isActive, expiresAt, productId, sportId?, eventId? }
 *
 * Auth: must be invoked with a logged-in user JWT (Supabase Functions enforce
 * this when called via supabase.functions.invoke from the client).
 */

// @ts-expect-error  Deno std import is resolved at deploy time.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error  esm.sh import is resolved at deploy time.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

declare const Deno: {
  env: { get(key: string): string | undefined };
};

// ---------------------------------------------------------------------------
// Product map (mirror of src/lib/iap.ts — keep in sync!)
// ---------------------------------------------------------------------------

type ProductGroup = 'athletes' | 'coaches' | 'camp_manager' | null;
type TierEntry = {
  ios: string;
  android: string;
  type: 'subscription' | 'consumable';
  group: ProductGroup;
  tierId: string;
};

const TIERS: TierEntry[] = [
  { tierId: 'recruit-pro',         ios: 'com.emergentmindlab.offerhoundv2.recruit_pro_monthly',           android: 'recruit_pro_monthly',          type: 'subscription', group: 'athletes' },
  { tierId: 'recruit-elite',       ios: 'com.emergentmindlab.offerhoundv2.recruit_elite_monthly',         android: 'recruit_elite_monthly',        type: 'subscription', group: 'athletes' },
  { tierId: 'family-bundle',       ios: 'com.emergentmindlab.offerhoundv2.family_bundle_monthly',         android: 'family_bundle_monthly',        type: 'subscription', group: 'athletes' },
  { tierId: 'club-coach',          ios: 'com.emergentmindlab.offerhoundv2.club_coach_annual',             android: 'club_coach_annual',            type: 'subscription', group: 'coaches' },
  { tierId: 'camp-manager-event',  ios: 'com.emergentmindlab.offerhoundv2.camp_manager_event',            android: 'camp_manager_event',           type: 'consumable',   group: null },
  { tierId: 'camp-manager-annual', ios: 'com.emergentmindlab.offerhoundv2.camp_manager_annual_unlimited', android: 'camp_manager_annual_unlimited', type: 'subscription', group: 'camp_manager' },
];

function tierFor(productId: string): TierEntry | null {
  return TIERS.find(t => t.ios === productId || t.android === productId) ?? null;
}

const GOOGLE_PLAY_PACKAGE_NAME =
  Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME') ?? 'com.emergentmindlab.offerhoundv2';

// ---------------------------------------------------------------------------
// Apple validation
// ---------------------------------------------------------------------------

const APPLE_PROD_URL    = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

interface AppleVerifyResult {
  status: number;
  // Truncated — see Apple docs for the full schema.
  // deno-lint-ignore no-explicit-any
  latest_receipt_info?: any[];
  // deno-lint-ignore no-explicit-any
  receipt?: { in_app?: any[] };
  environment?: 'Sandbox' | 'Production';
}

async function verifyApple(receipt: string): Promise<AppleVerifyResult> {
  const sharedSecret = Deno.env.get('APPLE_IAP_SHARED_SECRET');
  if (!sharedSecret) throw new Error('APPLE_IAP_SHARED_SECRET not set');

  const body = JSON.stringify({
    'receipt-data': receipt,
    password: sharedSecret,
    'exclude-old-transactions': true,
  });

  let res = await fetch(APPLE_PROD_URL, { method: 'POST', body });
  let json: AppleVerifyResult = await res.json();
  // Status 21007 → receipt is from sandbox; retry against sandbox endpoint.
  if (json.status === 21007) {
    res = await fetch(APPLE_SANDBOX_URL, { method: 'POST', body });
    json = await res.json();
  }
  if (json.status !== 0) {
    throw new Error(`Apple verifyReceipt failed: status=${json.status}`);
  }
  return json;
}

interface NormalizedEntitlement {
  productId: string;
  originalTransactionId: string;
  expiresAt: string | null;       // ISO-8601 or null for consumables.
  isActive: boolean;
}

function pickAppleEntitlement(
  apple: AppleVerifyResult,
  productId: string,
): NormalizedEntitlement | null {
  const txns = [
    ...(apple.latest_receipt_info ?? []),
    ...(apple.receipt?.in_app ?? []),
  ].filter(t => t.product_id === productId);
  if (txns.length === 0) return null;
  // Pick the latest by `expires_date_ms` (or `purchase_date_ms` if consumable).
  txns.sort((a, b) => {
    const ax = Number(a.expires_date_ms ?? a.purchase_date_ms ?? 0);
    const bx = Number(b.expires_date_ms ?? b.purchase_date_ms ?? 0);
    return bx - ax;
  });
  const t = txns[0];
  const expiresMs = t.expires_date_ms ? Number(t.expires_date_ms) : null;
  return {
    productId,
    originalTransactionId: t.original_transaction_id ?? t.transaction_id,
    expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
    isActive: expiresMs ? expiresMs > Date.now() : true,
  };
}

// ---------------------------------------------------------------------------
// Google validation
// ---------------------------------------------------------------------------

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

async function googleAccessToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT');
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT not set');
  const sa: GoogleServiceAccount = JSON.parse(raw);

  // Build a JWT, sign it with the service account private key (RS256), then
  // exchange it for a 1-hour access token at sa.token_uri.
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claim = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const toSign = `${header}.${claim}`;

  // Import the PEM private key for RS256 signing.
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(toSign),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${toSign}.${sig}`;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

async function verifyGoogle(
  productId: string,
  purchaseToken: string,
  isSubscription: boolean,
): Promise<NormalizedEntitlement> {
  const token = await googleAccessToken();
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PLAY_PACKAGE_NAME}`;
  const url = isSubscription
    ? `${base}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`
    : `${base}/purchases/products/${productId}/tokens/${purchaseToken}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google verify failed: ${res.status}`);
  const json = await res.json();

  if (isSubscription) {
    const expiryMs = Number(json.expiryTimeMillis ?? 0);
    return {
      productId,
      originalTransactionId: json.orderId ?? purchaseToken,
      expiresAt: expiryMs ? new Date(expiryMs).toISOString() : null,
      isActive: expiryMs > Date.now(),
    };
  }
  // One-time product: active iff purchaseState=0 (purchased) and not consumed.
  return {
    productId,
    originalTransactionId: json.orderId ?? purchaseToken,
    expiresAt: null,
    isActive: json.purchaseState === 0,
  };
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

interface ReqBody {
  store: 'apple' | 'google';
  receipt: string;
  productId: string;
  transactionId: string;
  sportId?: string | null;
  eventId?: string | null;
  calendarYear?: number | null;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Resolve the calling user from the JWT.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = userRes.user.id;

  const body = (await req.json()) as ReqBody;
  const tier = tierFor(body.productId);
  if (!tier) {
    return new Response(`Unknown productId: ${body.productId}`, { status: 400 });
  }

  let entitlement: NormalizedEntitlement | null;
  try {
    if (body.store === 'apple') {
      const apple = await verifyApple(body.receipt);
      entitlement = pickAppleEntitlement(apple, body.productId);
    } else {
      entitlement = await verifyGoogle(
        body.productId,
        body.receipt,
        tier.type === 'subscription',
      );
    }
  } catch (err) {
    return new Response(`Verification failed: ${(err as Error).message}`, { status: 400 });
  }

  if (!entitlement) {
    return new Response('No matching transaction in receipt', { status: 400 });
  }

  // Use service-role for the upsert so RLS doesn't block the writeback.
  const admin = createClient(supabaseUrl, serviceKey);
  const sportId = tier.tierId === 'camp-manager-annual' ? (body.sportId ?? null) : null;
  const eventId = tier.tierId === 'camp-manager-event' ? (body.eventId ?? null) : null;
  const calendarYear =
    tier.tierId === 'camp-manager-event' ? (body.calendarYear ?? new Date().getFullYear()) : null;

  const { error: upsertErr } = await admin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        store_provider: body.store,
        product_id: body.productId,
        tier: tier.tierId,
        is_active: entitlement.isActive,
        expires_at: entitlement.expiresAt,
        original_transaction_id: entitlement.originalTransactionId,
        latest_receipt: body.receipt,
        sport_id: sportId,
        event_id: eventId,
        calendar_year: calendarYear,
        raw_payload: { transactionId: body.transactionId },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,store_provider,original_transaction_id,sport_id,event_id',
      },
    );

  if (upsertErr) {
    return new Response(`Upsert failed: ${upsertErr.message}`, { status: 500 });
  }

  return new Response(
    JSON.stringify({
      tier: tier.tierId,
      isActive: entitlement.isActive,
      expiresAt: entitlement.expiresAt,
      productId: body.productId,
      sportId,
      eventId,
      calendarYear,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
