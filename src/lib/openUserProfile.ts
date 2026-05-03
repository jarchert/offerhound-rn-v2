// Universal user-profile navigation helper.
// Mirrors the web `openUserProfile` flow so any tappable user card across
// roles routes to the correct public profile screen with the right param shape.
//
// Web parity (offerhound-repo/src/components/AnimatedRoutes.tsx):
//   athlete         → /p/:customUrl
//   college_coach   → /coaches/:id        (RN: PublicCoachProfile)
//   hs_coach        → /hs-coach/:id       (RN: PublicHSCoachProfile, NEW Build 50)
//   club_coach      → /club-coach/:id     (RN: PublicClubCoachProfile, NEW Build 50)
//   scout           → /scouts/:id
//   agency          → /agency/:id         (RN: PublicAgencyProfile, NEW Build 50)
//   influencer      → /influencers/:handle

export const NOT_REGISTERED_USER_MESSAGE =
  'This contact is not a registered OfferHound™ application user.';

export type UserKind =
  | 'athlete'
  | 'college_coach'
  | 'hs_coach'
  | 'club_coach'
  | 'scout'
  | 'agency'
  | 'influencer';

export interface UserRef {
  kind: UserKind;
  id?: string | null;
  customUrl?: string | null;
  handle?: string | null;
}

/**
 * Returns the canonical web path for a user ref. Used for share-card URLs
 * and any place we want to show the public-facing https link.
 */
export function profilePathFor(ref: UserRef): string | null {
  if (!ref) return null;
  switch (ref.kind) {
    case 'athlete': {
      const slug = ref.customUrl || ref.id;
      return slug ? `/p/${slug}` : null;
    }
    case 'college_coach':
      return ref.id ? `/coaches/${ref.id}` : null;
    case 'hs_coach':
      return ref.id ? `/hs-coach/${ref.id}` : null;
    case 'club_coach':
      return ref.id ? `/club-coach/${ref.id}` : null;
    case 'scout':
      return ref.id ? `/scouts/${ref.id}` : null;
    case 'agency':
      return ref.id ? `/agency/${ref.id}` : null;
    case 'influencer': {
      const h = ref.handle || ref.id;
      return h ? `/influencers/${h}` : null;
    }
    default:
      return null;
  }
}

/**
 * Navigate to the correct public-profile RN screen for a given user ref.
 * All public profiles live under PublicProfileStack so we always nest into it.
 */
export function navigateToProfile(navigation: any, ref: UserRef): void {
  if (!navigation || !ref) return;
  const dispatch = (screen: string, params: Record<string, any>) =>
    navigation.navigate('PublicProfileStack' as never, { screen, params } as never);

  switch (ref.kind) {
    case 'athlete': {
      const customUrl = ref.customUrl || ref.id;
      if (!customUrl) return;
      dispatch('PublicProfile', { customUrl });
      return;
    }
    case 'college_coach': {
      if (!ref.id) return;
      // Existing screen takes coachId param.
      dispatch('PublicCoachProfile', { coachId: ref.id, id: ref.id });
      return;
    }
    case 'hs_coach': {
      if (!ref.id) return;
      dispatch('PublicHSCoachProfile', { id: ref.id });
      return;
    }
    case 'club_coach': {
      if (!ref.id) return;
      dispatch('PublicClubCoachProfile', { id: ref.id });
      return;
    }
    case 'scout': {
      if (!ref.id) return;
      dispatch('PublicScoutProfile', { scoutId: ref.id, id: ref.id });
      return;
    }
    case 'agency': {
      if (!ref.id) return;
      dispatch('PublicAgencyProfile', { id: ref.id });
      return;
    }
    case 'influencer': {
      const handle = ref.handle || ref.id;
      if (!handle) return;
      dispatch('InfluencerProfile', { handle });
      return;
    }
  }
}
