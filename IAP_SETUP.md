# In-App Purchase Setup — OfferHound v2

This document describes the App Store Connect, Google Play Console, and
Supabase configuration required to ship the native IAP flow wired in
`app/src/lib/iap.ts`, `app/src/hooks/useSubscription.ts`, and the
`validate-iap-receipt` edge function.

Library: [`expo-iap`](https://github.com/hyodotdev/openiap) v4.x
(OpenIAP-compliant; successor to the archived `react-native-iap`).

---

## 1. Product Map (single source of truth)

The mapping below MUST stay in lockstep with App Store Connect, Google Play
Console, the Supabase `user_subscriptions` table, and `src/lib/iap.ts`'s
`TIER_TO_PRODUCT_ID`. If any one of those drifts, receipt validation breaks
silently for a subset of users.

| Tier ID                | iOS product ID                                                     | Android product ID                  | Type           | Apple Group   |
|------------------------|--------------------------------------------------------------------|-------------------------------------|----------------|---------------|
| `recruit-pro`          | `com.emergentmindlab.offerhoundv2.recruit_pro_monthly`             | `recruit_pro_monthly`               | Subscription   | `athletes`    |
| `recruit-elite`        | `com.emergentmindlab.offerhoundv2.recruit_elite_monthly`           | `recruit_elite_monthly`             | Subscription   | `athletes`    |
| `family-bundle`        | `com.emergentmindlab.offerhoundv2.family_bundle_monthly`           | `family_bundle_monthly`             | Subscription   | `athletes`    |
| `club-coach`           | `com.emergentmindlab.offerhoundv2.club_coach_annual`               | `club_coach_annual`                 | Subscription   | `coaches`     |
| `camp-manager-event`   | `com.emergentmindlab.offerhoundv2.camp_manager_event`              | `camp_manager_event`                | **Consumable** | _none_        |
| `camp-manager-annual`  | `com.emergentmindlab.offerhoundv2.camp_manager_annual_unlimited`   | `camp_manager_annual_unlimited`     | Subscription   | `camp_manager`|

### Apple Subscription Groups

Subscriptions inside the same group are **mutually exclusive** at the
StoreKit layer (Apple lets a user hold at most one active subscription per
group at a time; upgrades/downgrades happen through the system UI).

1. **OfferHound Athletes** — `recruit_pro_monthly` + `recruit_elite_monthly`
   + `family_bundle_monthly`. A user upgrading from Pro → Elite → Family
   Bundle must do so within this group.
2. **OfferHound Coaches** — `club_coach_annual` only.
3. **OfferHound Camp Manager** — `camp_manager_annual_unlimited` only.

`camp_manager_event` is a **consumable** (not auto-renewing) and therefore
has no subscription group.

### Per-sport entitlement (`camp-manager-annual`)

There is exactly **one** Apple/Google product for `camp_manager_annual_unlimited`,
but the entitlement is granted **per sport**. A user who pays for the unlimited
plan twice (once for Football, once for Soccer) ends up with **two active
`user_subscriptions` rows** — same `product_id`, different `sport_id`. The
store has no idea this distinction exists; sport selection happens in-app
before purchase and is sent to the edge function as `sportId` along with the
receipt.

When checking entitlement server-side, look up by:

```
(user_id, product_id = 'camp_manager_annual_unlimited', sport_id, is_active)
```

### Calendar-year consumable (`camp-manager-event`)

`camp_manager_event` is a one-shot purchase tied to a specific event AND a
calendar year. The validation flow stores `event_id` and `calendar_year`
(default = `today.year`). Entitlement is "active" iff:

```
event_id matches AND today is between Jan 1 and Dec 31 of calendar_year
```

After Dec 31 the row's `is_active` should be flipped (a nightly cron is
suggested) — there is intentionally no auto-renew for consumables.

---

## 2. Server-side free tiers (no IAP product)

Three roles get full access **without** an IAP purchase. These are pure
server-side entitlements; do not create App Store / Play Console products
for them.

| Role           | How granted                                                |
|----------------|------------------------------------------------------------|
| `admin`        | Row in `public.user_roles` where `role = 'admin'`          |
| `college_coach`| Row in `public.coach_profiles`                             |
| `scout`        | Row in `public.scout_profiles`                             |

`useSubscription` checks role FIRST. If any role is present, the hook
returns `{ tier: 'free', isActive: true }` and never consults
`user_subscriptions`. This means a coach signing up never sees the paywall
and never produces a StoreKit/Play receipt — exactly the behaviour Apple
requires (no "free trial via login" loophole, but also no paywall blocking
legitimate non-paying users).

---

## 3. App Store Connect setup

1. **App ID**: `6762979687`, bundle `com.emergentmindlab.offerhoundv2`,
   team `8MG7GFDJ62`.
2. Go to **My Apps → OfferHound → In-App Purchases**.
3. Create the three subscription groups above with their localized display
   names. Set the appropriate **Subscription Duration** for each product
   (monthly / annual).
4. Create the consumable `camp_manager_event` outside any group.
5. For each product:
   - Set **Reference Name** (internal) and **Localized Display Name**.
   - Set **Price** in USD; Apple auto-converts to other tiers.
   - Add a **Localized Description** (visible inside the system purchase
     sheet — Apple rejects placeholder text).
   - Upload a **Review Screenshot** (required at first submission).
6. Under **App Information → App-Specific Shared Secret**, generate a
   shared secret. Store this as `APPLE_IAP_SHARED_SECRET` in Supabase
   (`supabase secrets set APPLE_IAP_SHARED_SECRET=...`).
7. Submit the IAPs alongside the next app build for review (they cannot ship
   independently of an app submission for the first release).

---

## 4. Google Play Console setup

1. Open **Play Console → OfferHound → Monetize → Products**.
2. Create the **Subscriptions** (5 of them — see table above). For each:
   - Create a **base plan** with the correct billing period.
   - Add an **offer** (intro pricing or auto-renew offer) if applicable.
   - Activate the base plan and offer.
3. Create the **In-app product** `camp_manager_event` (managed product /
   consumable).
4. Set up the **Service Account** for receipt validation:
   - GCP Console → IAM → Service Accounts → create a new account.
   - Grant the service account the `androidpublisher` API access via
     **Play Console → API access → Link Service Account**.
   - Grant scopes: `View financial data` + `Manage orders and subscriptions`.
   - Create a JSON key, copy the entire JSON, and store as
     `GOOGLE_PLAY_SERVICE_ACCOUNT` in Supabase.
5. Optional override: `GOOGLE_PLAY_PACKAGE_NAME` (defaults to
   `com.emergentmindlab.offerhoundv2`).

---

## 5. Supabase configuration

### 5.1 Migrations

Run the migration that creates `public.user_subscriptions`:

```bash
supabase db push  # or: psql -f supabase/migrations/20260425053057_add_user_subscriptions.sql
```

Schema highlights (full file: `app/supabase/migrations/20260425053057_add_user_subscriptions.sql`):

- `sport_id text` — for per-sport `camp_manager_annual_unlimited` rows.
- `event_id text` + `calendar_year int` — for per-event `camp_manager_event` rows.
- Unique key: `(user_id, store_provider, original_transaction_id, sport_id, event_id)`.
- RLS: users can `SELECT` their own rows; only `service_role` can write.

### 5.2 Edge function

Deploy `validate-iap-receipt`:

```bash
supabase functions deploy validate-iap-receipt
```

Required secrets:

```bash
supabase secrets set \
  APPLE_IAP_SHARED_SECRET="..." \
  GOOGLE_PLAY_SERVICE_ACCOUNT="$(cat path/to/service-account.json)"
```

The function:

- Resolves the calling user from the JWT (`Authorization: Bearer ...`).
- Apple: `POST https://buy.itunes.apple.com/verifyReceipt`, falls back to
  the sandbox URL on `status: 21007`.
- Google: builds a JWT signed with the service account private key,
  exchanges for an access token, then calls
  `androidpublisher.purchases.subscriptions.get` (or `.products.get` for
  consumables).
- Upserts into `user_subscriptions` using the service-role key.

---

## 6. Sandbox testing

### iOS (TestFlight / Xcode)

1. Create a **Sandbox Apple ID** under App Store Connect → Users and Access
   → Sandbox → Testers.
2. On a development device, sign out of the live App Store account in
   Settings → Apple ID, then sign in with the sandbox tester when prompted
   during purchase.
3. Build with `eas build --profile development -p ios` and install via
   TestFlight or Xcode. Receipts from sandbox have status `21007`; the
   edge function handles the fallback automatically.

### Android (Play Internal Track)

1. Add testers to **Play Console → Setup → License testing**.
2. Upload a build to the **Internal testing** track and add the same
   tester emails to the testers list.
3. Install from the opt-in link. Test purchases will not actually charge
   the card and complete in seconds.

### Local development

`expo-iap` requires a native build — it does **not** work in Expo Go.
Use:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

…and run `expo start --dev-client` against the resulting installable app.

---

## 7. Open follow-ups

- [ ] Add a nightly cron (Supabase scheduled function) to flip `is_active`
      on `camp_manager_event` rows whose `calendar_year < EXTRACT(year FROM now())`.
- [ ] Hook Apple App Store Server Notifications V2 + Google RTDN webhooks
      so we react to renewals / refunds without polling.
- [ ] Decide whether Android should also gate the Stripe checkout flow
      (Step 7 commit currently leaves Android web-pay enabled).
- [ ] Wire the per-sport selection UI into the `camp-manager-annual` purchase
      path so the `sportId` is sent to `validate-iap-receipt`.

---

_Last updated: 2026-04-25, alongside the initial expo-iap wiring._
