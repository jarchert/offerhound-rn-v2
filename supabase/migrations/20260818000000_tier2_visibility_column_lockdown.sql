-- ============================================================
-- Migration: Tier 2 visibility column lockdown
-- Date: 2026-08-18
--
-- PROBLEM: athlete_visibility_settings.visibility_level,
-- show_in_recruiter_pipeline, show_contact_info can be raw-PATCHed
-- by any authenticated user (the row owner). Similarly,
-- player_profiles.visibility_level is patchable directly.
-- Both should only be writable via the SECURITY DEFINER RPCs
-- (propose_athlete_public_visibility, record_parent_visibility_decision)
-- which bypass RLS by design.
--
-- MECHANISM:
-- Supabase/PostgREST REST API calls run with current_role = 'authenticated'
-- (PostgREST sets the role to 'authenticated' via SET LOCAL ROLE when the
-- caller presents a valid user JWT).
--
-- SECURITY DEFINER functions run with current_role = the function OWNER
-- (typically 'postgres' or 'supabase_admin') — not 'authenticated'.
--
-- A BEFORE UPDATE trigger function (SECURITY INVOKER — the default) that
-- checks current_role catches direct client PATCHes and blocks them,
-- while SECURITY DEFINER RPC writes pass through unaffected.
--
-- IMPORTANT: Trigger functions must NOT be SECURITY DEFINER for this pattern
-- to work — SECURITY INVOKER preserves the calling context's current_role.
-- ============================================================

-- ── Part A: athlete_visibility_settings ───────────────────────────────────

-- 1. Drop any existing permissive UPDATE policies by common Lovable-generated names.
--    (IF EXISTS prevents errors if the policy has a different name or doesn't exist.)
DROP POLICY IF EXISTS "Athletes can update their visibility settings" ON public.athlete_visibility_settings;
DROP POLICY IF EXISTS "Athletes can update own visibility settings" ON public.athlete_visibility_settings;
DROP POLICY IF EXISTS "Users can update their visibility settings" ON public.athlete_visibility_settings;
DROP POLICY IF EXISTS "Users can update own visibility settings" ON public.athlete_visibility_settings;
DROP POLICY IF EXISTS "Athlete can update own visibility" ON public.athlete_visibility_settings;
DROP POLICY IF EXISTS "Owner can update visibility settings" ON public.athlete_visibility_settings;
DROP POLICY IF EXISTS "athlete_visibility_settings_update" ON public.athlete_visibility_settings;
DROP POLICY IF EXISTS "Athletes update own" ON public.athlete_visibility_settings;

-- 2. Trigger function (SECURITY INVOKER — default, NOT SECURITY DEFINER).
--    current_role inside this function will reflect the calling context:
--    'authenticated' for direct PostgREST client calls, or the function
--    owner role for SECURITY DEFINER RPC calls.
CREATE OR REPLACE FUNCTION public.block_direct_visibility_column_write()
RETURNS TRIGGER
LANGUAGE plpgsql
-- No SECURITY DEFINER — default is SECURITY INVOKER, which preserves current_role
AS $$
BEGIN
  -- Block when called from a direct client REST call (current_role = 'authenticated').
  -- SECURITY DEFINER RPCs (propose_athlete_public_visibility,
  -- record_parent_visibility_decision) run as the function owner (e.g., 'postgres')
  -- so current_role ≠ 'authenticated' there — those writes pass through.
  IF current_role = 'authenticated' THEN
    IF (OLD.visibility_level IS DISTINCT FROM NEW.visibility_level)
    OR (OLD.show_in_recruiter_pipeline IS DISTINCT FROM NEW.show_in_recruiter_pipeline)
    OR (OLD.show_contact_info IS DISTINCT FROM NEW.show_contact_info)
    THEN
      RAISE EXCEPTION
        'Direct modification of visibility columns (visibility_level, '
        'show_in_recruiter_pipeline, show_contact_info) is not permitted. '
        'Use the coach visibility proposal workflow.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach trigger to athlete_visibility_settings.
DROP TRIGGER IF EXISTS trg_block_visibility_col_direct_write
  ON public.athlete_visibility_settings;

CREATE TRIGGER trg_block_visibility_col_direct_write
  BEFORE UPDATE ON public.athlete_visibility_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.block_direct_visibility_column_write();


-- ── Part B: player_profiles.visibility_level ──────────────────────────────

-- 4. Trigger function (SECURITY INVOKER — default).
CREATE OR REPLACE FUNCTION public.block_direct_player_visibility_write()
RETURNS TRIGGER
LANGUAGE plpgsql
-- No SECURITY DEFINER — SECURITY INVOKER preserves current_role
AS $$
BEGIN
  IF current_role = 'authenticated' THEN
    IF OLD.visibility_level IS DISTINCT FROM NEW.visibility_level THEN
      RAISE EXCEPTION
        'Direct modification of visibility_level on player_profiles is not permitted. '
        'Use the coach visibility proposal workflow.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Attach trigger to player_profiles (fires only when visibility_level changes).
DROP TRIGGER IF EXISTS trg_block_player_visibility_direct_write
  ON public.player_profiles;

CREATE TRIGGER trg_block_player_visibility_direct_write
  BEFORE UPDATE OF visibility_level ON public.player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_direct_player_visibility_write();
