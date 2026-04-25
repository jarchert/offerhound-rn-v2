-- 20260425053057_add_user_subscriptions.sql
--
-- Adds the `user_subscriptions` table that backs the IAP receipt-validation
-- flow (Apple StoreKit + Google Play Billing) wired in src/lib/iap.ts and
-- src/hooks/useSubscription.ts.
--
-- Notes on the schema choices (driven by the real OfferHound product map):
--
--  * `store_provider`               — 'apple' or 'google'.
--  * `product_id`                   — store SKU (Apple bundle-prefixed or Play sku).
--  * `tier`                         — internal tier id from PRICING_TIERS
--                                     (e.g. 'recruit-pro', 'camp-manager-annual').
--  * `is_active`                    — whether the entitlement is currently valid.
--  * `expires_at`                   — auto-renew expiry for subs; NULL for consumables.
--  * `original_transaction_id`      — Apple `originalTransactionId` / Google
--                                     `purchaseToken`. Used as the de-dupe key.
--  * `sport_id`                     — only relevant for `camp_manager_annual_unlimited`.
--                                     A user may hold MANY active rows for that
--                                     product, one per sport. NULL otherwise.
--  * `event_id` + `calendar_year`   — only relevant for the `camp_manager_event`
--                                     consumable: entitlement is "active" when
--                                     the current date falls within the calendar
--                                     year AND event_id matches the camp.
--  * `latest_receipt` / `raw_payload` — kept for replay / audit.
--
-- The unique key is widened to include sport_id and event_id so we can store
-- multiple per-sport / per-event rows without colliding on the original txn id.

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_provider text not null check (store_provider in ('apple','google')),
  product_id text not null,
  tier text not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  original_transaction_id text,
  latest_receipt text,
  raw_payload jsonb,
  -- Per-sport entitlement (camp_manager_annual_unlimited only). NULL for all
  -- other products.
  sport_id text,
  -- Per-event consumable entitlement (camp_manager_event only). Both NULL for
  -- all other products.
  event_id text,
  calendar_year int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, store_provider, original_transaction_id, sport_id, event_id)
);

alter table public.user_subscriptions enable row level security;

create policy "Users select own subs"
  on public.user_subscriptions
  for select
  using (auth.uid() = user_id);

create policy "Service role manages all subs"
  on public.user_subscriptions
  for all
  using (auth.role() = 'service_role');

create index user_subscriptions_user_idx
  on public.user_subscriptions(user_id);

create index user_subscriptions_active_idx
  on public.user_subscriptions(user_id, is_active)
  where is_active = true;

-- Fast lookup for the per-sport camp_manager_annual_unlimited entitlement.
create index user_subscriptions_user_product_sport_idx
  on public.user_subscriptions(user_id, product_id, sport_id)
  where is_active = true;

-- Fast lookup for the per-event camp_manager_event consumable entitlement.
create index user_subscriptions_user_event_year_idx
  on public.user_subscriptions(user_id, event_id, calendar_year)
  where is_active = true and event_id is not null;

-- updated_at trigger (assumes the standard public.update_updated_at_column()
-- helper already exists in the project; if not, create it before this migration).
create trigger set_updated_at
  before update on public.user_subscriptions
  for each row execute function public.update_updated_at_column();
