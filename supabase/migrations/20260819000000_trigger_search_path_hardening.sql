-- ============================================================
-- Migration: Add SET search_path = public to trigger functions
-- Date: 2026-08-19
--
-- Closes "Function Search Path Mutable" linter warning on the two
-- trigger functions added in 20260818000000_tier2_visibility_column_lockdown.sql.
-- No behavioural change — both functions only reference public schema objects.
--
-- NOTE: SECURITY INVOKER is still the default (no SECURITY DEFINER added).
-- The search_path hardening only prevents schema-injection attacks via a
-- manipulated search_path; it does not affect the current_role detection
-- mechanism which the trigger relies on.
-- ============================================================

CREATE OR REPLACE FUNCTION public.block_direct_visibility_column_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.block_direct_player_visibility_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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
