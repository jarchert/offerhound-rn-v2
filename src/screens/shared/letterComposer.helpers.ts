// Pure helpers for LetterComposerScreen, split out for unit-testability without
// pulling in the whole screen (which imports Navbar → ImpersonationBanner →
// AsyncStorage native module, unavailable in jsdom).
//
// See LetterComposerScreen.tsx for full context on the sender-profile parity
// fix (2026-09-05).

export type LetterType = 'recruiting' | 'endorsement' | 'intro' | 'thank_you' | 'update';

export interface LetterDraft {
  recipientName: string;
  recipientRole: string;
  schoolName: string;
  letterType: LetterType;
  keyPoints: string;
  tone: 'professional' | 'warm' | 'direct';
}

export const DEFAULT_DRAFT: LetterDraft = {
  recipientName: '',
  recipientRole: '',
  schoolName: '',
  letterType: 'recruiting',
  keyPoints: '',
  tone: 'professional',
};

// SenderProfile mirrors MAIN's shape (subset — RN reads only the fields the
// existing role hooks return today). See MAIN LetterDashboard.tsx:20.
export interface SenderProfile {
  name: string;
  title?: string;
  school?: string;
  position?: string;
  sport?: string;
  graduation_year?: string;
  gpa?: string;
  email?: string;
  role: 'athlete' | 'coach' | 'club_coach' | 'scout' | 'high_school_coach' | 'other';
}

/**
 * Resolve the sender identity for the composer header + edge function payload.
 *
 * Mirrors MAIN's LetterDashboard behavior: pick the profile row that matches
 * the user's canonical role (from AuthContext). Returns `null` while the
 * relevant query is still loading OR if no matching profile row exists.
 */
export function deriveSenderProfile(args: {
  userRole: string | null;
  userEmail?: string | null;
  playerProfile: any;
  coachProfile: any;
  scoutProfile: any;
  hsCoachProfile: any;
}): SenderProfile | null {
  const { userRole, userEmail, playerProfile, coachProfile, scoutProfile, hsCoachProfile } = args;
  if (!userRole) return null;

  if (userRole === 'athlete' || userRole === 'parent') {
    if (!playerProfile) return null;
    return {
      name: playerProfile.full_name || '',
      position: playerProfile.position || undefined,
      school: playerProfile.school || undefined,
      sport: playerProfile.sport || undefined,
      graduation_year: playerProfile.graduation_year || undefined,
      gpa: playerProfile.gpa || undefined,
      email: userEmail || undefined,
      role: 'athlete',
    };
  }
  if (userRole === 'coach' || userRole === 'club_coach') {
    if (!coachProfile) return null;
    return {
      name: coachProfile.name || '',
      title: coachProfile.title || coachProfile.position_coached || undefined,
      school: coachProfile.school || undefined,
      sport: coachProfile.sport || undefined,
      email: coachProfile.email || userEmail || undefined,
      role: userRole === 'club_coach' ? 'club_coach' : 'coach',
    };
  }
  if (userRole === 'scout') {
    if (!scoutProfile) return null;
    return {
      name: scoutProfile.name || '',
      title: scoutProfile.title || undefined,
      school: scoutProfile.company || scoutProfile.organization || undefined,
      email: scoutProfile.email || userEmail || undefined,
      role: 'scout',
    };
  }
  if (userRole === 'high_school_coach') {
    if (!hsCoachProfile) return null;
    return {
      name: hsCoachProfile.name || hsCoachProfile.full_name || '',
      title: hsCoachProfile.title || 'Head Coach',
      school: hsCoachProfile.school || undefined,
      sport: hsCoachProfile.sport || undefined,
      email: hsCoachProfile.email || userEmail || undefined,
      role: 'high_school_coach',
    };
  }
  return null;
}

/**
 * Extract a flat recipient seed from route params — accepting BOTH the shapes
 * currently in use across the app:
 *   - flat: { recipientName, recipientRole, schoolName, ... } (PublicProfileScreen,
 *           CoachMatchCard, AthleteSearchScreen, CoachProfileScreen — and the
 *           newly-fixed CoachDashboard/ScoutDashboard/HSCoachDashboardScreen)
 *   - nested athlete: { athlete: {...}, surface? } (defensive fallback for the
 *           old shape those 3 sites used to emit)
 *   - legacy prefillAthlete*: { prefillAthleteName, prefillAthleteId }
 */
export function extractRecipientSeed(rawSeed: any): {
  recipientName?: string;
  recipientRole?: string;
  schoolName?: string;
  letterType?: LetterType;
  tone?: 'professional' | 'warm' | 'direct';
  prefillAthleteId?: string;
} {
  if (!rawSeed || typeof rawSeed !== 'object') return {};
  const seed = rawSeed as any;

  // Nested-athlete shape from the 3 (now-fixed) coach-side dashboards.
  if (seed.athlete && typeof seed.athlete === 'object') {
    const a = seed.athlete;
    return {
      recipientName: a.full_name || a.name || undefined,
      recipientRole: 'Athlete',
      schoolName: a.school || undefined,
      prefillAthleteId: a.id || undefined,
    };
  }

  return {
    recipientName: seed.recipientName || seed.prefillAthleteName || undefined,
    recipientRole: seed.recipientRole || undefined,
    schoolName: seed.schoolName || undefined,
    letterType: seed.letterType,
    tone: seed.tone,
    prefillAthleteId: seed.prefillAthleteId || undefined,
  };
}
