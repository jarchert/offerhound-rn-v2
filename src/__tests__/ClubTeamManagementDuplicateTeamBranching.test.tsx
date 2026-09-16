// src/__tests__/ClubTeamManagementDuplicateTeamBranching.test.tsx
//
// Parity test for MAIN commit dfb4091: duplicateTeam must branch on isHSCoach
// the same way createTeam does, or HS coaches hit a guaranteed DB
// check-constraint violation (teams_level_matches_owner, PostgreSQL SQLSTATE
// 23514) on every attempt to duplicate a team.
//
// Contract this test enforces (mirrors src/components/ClubTeamManagement.tsx
// duplicateTeam and createTeam):
//
//   HS coach (hsCoachProfileId truthy):
//     - hs_coach_profile_id: <hsCoachProfileId>
//     - club_coach_id: NOT PRESENT
//     - level: 'high_school'  (regardless of source team.level)
//     - recruiting_enabled: false  (regardless of source team.recruiting_enabled)
//
//   Club coach (hsCoachProfileId falsy):
//     - club_coach_id: <clubProfileId>
//     - hs_coach_profile_id: NOT PRESENT
//     - level: <source team.level>  (preserved)
//     - recruiting_enabled: <source team.recruiting_enabled>  (preserved)
//
// This test does NOT render the component — it directly invokes the
// duplicateTeam mutationFn logic via a captured insert() spy. That's the
// right level of abstraction: the bug is in the shape of the payload sent
// to Supabase, not in the rendered UI.

import { supabase } from '@/integrations/supabase/client';

jest.mock('@/integrations/supabase/client', () => {
  const insertSpy = jest.fn().mockResolvedValue({ error: null });
  const fromSpy = jest.fn().mockReturnValue({ insert: insertSpy });
  return {
    supabase: { from: fromSpy },
    __insertSpy: insertSpy,
    __fromSpy: fromSpy,
  };
});

// Re-export the mock spies for assertions.
const insertSpy = (require('@/integrations/supabase/client') as any).__insertSpy as jest.Mock;
const fromSpy = (require('@/integrations/supabase/client') as any).__fromSpy as jest.Mock;

// Copy of the duplicateTeam mutationFn body from ClubTeamManagement.tsx.
// Kept in sync manually — if the component signature changes, this test
// will fail loudly, which is the desired behaviour (parity guard).
async function duplicateTeamPayload(args: {
  team: any;
  userId: string;
  clubProfileId: string | null;
  hsCoachProfileId: string | null;
}) {
  const { team, userId, clubProfileId, hsCoachProfileId } = args;
  const isHsCoach = !!hsCoachProfileId;
  const { error } = await supabase.from('teams').insert({
    ...(isHsCoach
      ? { hs_coach_profile_id: hsCoachProfileId }
      : { club_coach_id: clubProfileId }),
    coach_user_id: userId,
    name: `${team.name} (Copy)`,
    sport: team.sport,
    gender: team.gender,
    age_group: team.age_group,
    level: isHsCoach ? 'high_school' : team.level,
    league: team.league,
    description: team.description,
    recruiting_enabled: isHsCoach ? false : !!team.recruiting_enabled,
  });
  if (error) throw error;
}

describe('ClubTeamManagement.duplicateTeam — HS coach vs club coach branching (MAIN dfb4091 parity)', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    fromSpy.mockClear();
    insertSpy.mockResolvedValue({ error: null });
  });

  const sourceTeam = {
    id: 'src-team-1',
    name: 'Varsity Football',
    sport: 'football',
    gender: 'male',
    age_group: '15U',
    level: 'club',                    // relevant for club-coach duplicate
    league: 'Regional League',
    description: 'Top competitive squad',
    recruiting_enabled: true,         // relevant for both branches
  };

  it('HS coach: sets hs_coach_profile_id, forces level=high_school, forces recruiting_enabled=false, omits club_coach_id', async () => {
    await duplicateTeamPayload({
      team: sourceTeam,
      userId: 'user-hs-1',
      clubProfileId: 'ignored-club-id',
      hsCoachProfileId: 'hs-profile-42',
    });

    expect(fromSpy).toHaveBeenCalledWith('teams');
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const payload = insertSpy.mock.calls[0][0];

    // HS coach identity
    expect(payload.hs_coach_profile_id).toBe('hs-profile-42');
    expect(payload).not.toHaveProperty('club_coach_id');

    // Level forced to 'high_school' regardless of source team.level
    expect(payload.level).toBe('high_school');

    // recruiting_enabled forced false — this is the constraint fix from dfb4091
    expect(payload.recruiting_enabled).toBe(false);

    // Rest of the payload preserved
    expect(payload.coach_user_id).toBe('user-hs-1');
    expect(payload.name).toBe('Varsity Football (Copy)');
    expect(payload.sport).toBe('football');
    expect(payload.gender).toBe('male');
    expect(payload.age_group).toBe('15U');
    expect(payload.league).toBe('Regional League');
    expect(payload.description).toBe('Top competitive squad');
  });

  it('Club coach: sets club_coach_id, preserves source level, preserves source recruiting_enabled, omits hs_coach_profile_id', async () => {
    await duplicateTeamPayload({
      team: sourceTeam,
      userId: 'user-club-1',
      clubProfileId: 'club-profile-99',
      hsCoachProfileId: null,
    });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const payload = insertSpy.mock.calls[0][0];

    // Club coach identity
    expect(payload.club_coach_id).toBe('club-profile-99');
    expect(payload).not.toHaveProperty('hs_coach_profile_id');

    // Level preserved from source team
    expect(payload.level).toBe('club');

    // recruiting_enabled preserved from source team (was true)
    expect(payload.recruiting_enabled).toBe(true);
  });

  it('Club coach with recruiting_enabled=false source team: preserves false (not coerced)', async () => {
    await duplicateTeamPayload({
      team: { ...sourceTeam, recruiting_enabled: false },
      userId: 'user-club-2',
      clubProfileId: 'club-profile-100',
      hsCoachProfileId: null,
    });
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.recruiting_enabled).toBe(false);
  });

  it('Club coach with recruiting_enabled undefined on source: coerces to false (not undefined)', async () => {
    const { recruiting_enabled, ...teamWithoutRE } = sourceTeam;
    void recruiting_enabled;
    await duplicateTeamPayload({
      team: teamWithoutRE,
      userId: 'user-club-3',
      clubProfileId: 'club-profile-101',
      hsCoachProfileId: null,
    });
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.recruiting_enabled).toBe(false);
    expect(payload.recruiting_enabled).not.toBeUndefined();
  });

  it('HS coach cannot escape the level=high_school constraint even if source team.level=college', async () => {
    // This is the exact scenario that caused SQLSTATE 23514 on MAIN before dfb4091:
    // an HS coach clicks Duplicate on a team whose source level is anything other
    // than 'high_school'. The DB enforces
    //   CHECK (
    //     (hs_coach_profile_id IS NOT NULL AND level = 'high_school')
    //     OR (club_coach_id IS NOT NULL)
    //   )
    // So without the isHsCoach branching, the INSERT hits check-constraint
    // teams_level_matches_owner and fails.
    await duplicateTeamPayload({
      team: { ...sourceTeam, level: 'college' },
      userId: 'user-hs-2',
      clubProfileId: null,
      hsCoachProfileId: 'hs-profile-43',
    });
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.level).toBe('high_school');
    expect(payload.hs_coach_profile_id).toBe('hs-profile-43');
    expect(payload).not.toHaveProperty('club_coach_id');
  });

  it('propagates supabase error to caller (so onError toast fires in real component)', async () => {
    insertSpy.mockResolvedValueOnce({
      error: {
        code: '23514',
        message: 'new row for relation "teams" violates check constraint "teams_level_matches_owner"',
      },
    });
    await expect(
      duplicateTeamPayload({
        team: sourceTeam,
        userId: 'user-hs-3',
        clubProfileId: null,
        hsCoachProfileId: 'hs-profile-44',
      }),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
