#!/bin/bash
# Verification script: run AFTER applying 20260818000000_tier2_visibility_column_lockdown.sql
# to the Supabase project via dashboard SQL editor.
#
# Usage: bash 20260818000000_verify_tier2_visibility_lockdown.sh

SUPABASE_URL="https://abdzdcgsmdlnytkkhvtb.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZHpkY2dzbWRsbnl0a2todnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTcyMTcsImV4cCI6MjA4MTQ3MzIxN30.2tvNgfIc0BD53GsAJk1oF88vK3lW1RVZSouMsOa4J3I"
FAILURES=0

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; FAILURES=$((FAILURES + 1)); }

# Login as athlete
RESP=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email": "athlete@test.com", "password": "TestAthlete123!"}')
ATHLETE_TOKEN=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))")
ATHLETE_PROFILE_ID="094bd567-bf81-45f9-a7c4-7e4d922f810f"
AVS_ID="00b12576-6532-4b79-9b63-b76dcf9a1639"

echo "=== Test 1: athlete_visibility_settings — raw PATCH of visibility_level should be BLOCKED ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${SUPABASE_URL}/rest/v1/athlete_visibility_settings?id=eq.${AVS_ID}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATHLETE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"visibility_level": "public"}')
if [ "$RESP" -ge 400 ]; then
  pass "PATCH visibility_level blocked (HTTP $RESP)"
else
  fail "PATCH visibility_level NOT blocked — returned HTTP $RESP (expected 4xx)"
fi

echo "=== Test 2: athlete_visibility_settings — raw PATCH of show_in_recruiter_pipeline should be BLOCKED ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${SUPABASE_URL}/rest/v1/athlete_visibility_settings?id=eq.${AVS_ID}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATHLETE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"show_in_recruiter_pipeline": true}')
if [ "$RESP" -ge 400 ]; then
  pass "PATCH show_in_recruiter_pipeline blocked (HTTP $RESP)"
else
  fail "PATCH show_in_recruiter_pipeline NOT blocked — returned HTTP $RESP"
fi

echo "=== Test 3: athlete_visibility_settings — raw PATCH of show_contact_info should be BLOCKED ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${SUPABASE_URL}/rest/v1/athlete_visibility_settings?id=eq.${AVS_ID}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATHLETE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"show_contact_info": true}')
if [ "$RESP" -ge 400 ]; then
  pass "PATCH show_contact_info blocked (HTTP $RESP)"
else
  fail "PATCH show_contact_info NOT blocked — returned HTTP $RESP"
fi

echo "=== Test 4: player_profiles — raw PATCH of visibility_level should be BLOCKED ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${SUPABASE_URL}/rest/v1/player_profiles?id=eq.${ATHLETE_PROFILE_ID}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATHLETE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"visibility_level": "public"}')
if [ "$RESP" -ge 400 ]; then
  pass "player_profiles.visibility_level PATCH blocked (HTTP $RESP)"
else
  fail "player_profiles.visibility_level PATCH NOT blocked — returned HTTP $RESP"
fi

echo "=== Test 5: athlete_visibility_settings — PATCH of non-protected column should still WORK ==="
# Updating 'updated_at' or any non-protected column should succeed
# Since we're testing a column that might not exist, use show_in_search (exists, not protected)
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${SUPABASE_URL}/rest/v1/athlete_visibility_settings?id=eq.${AVS_ID}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATHLETE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"show_in_search": false}')
if [ "$RESP" -lt 400 ]; then
  pass "PATCH of show_in_search (non-protected) still works (HTTP $RESP)"
else
  fail "PATCH of show_in_search (non-protected) was incorrectly blocked (HTTP $RESP)"
fi

echo "=== Test 6: player_profiles — PATCH of non-protected column should still WORK ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${SUPABASE_URL}/rest/v1/player_profiles?id=eq.${ATHLETE_PROFILE_ID}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ATHLETE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"bio": "test bio update"}')
if [ "$RESP" -lt 400 ]; then
  pass "player_profiles.bio PATCH still works (HTTP $RESP)"
else
  fail "player_profiles.bio PATCH was incorrectly blocked (HTTP $RESP)"
fi

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "✅ All 6 tests passed — visibility columns are locked down correctly."
else
  echo "❌ $FAILURES test(s) failed. Review trigger installation."
fi
exit $FAILURES
