// useActiveRoleScope (RN port) — derives the "active role" from the current
// React Navigation route name so multi-role users see counts/items scoped to
// the dashboard they're currently looking at. Falls back to "all".
//
// Source-of-truth parity: src/hooks/useActiveRoleScope.ts in the Lovable web
// app. The web version inspects window.location.pathname; here we inspect the
// active navigator/route names.
import { useMemo } from 'react';
import { useNavigationState } from '@react-navigation/native';

export type ActiveRole =
  | 'athlete'
  | 'coach'
  | 'scout'
  | 'agency'
  | 'club_coach'
  | 'hs_coach'
  | 'influencer'
  | 'parent'
  | 'admin'
  | 'all';

const ROUTE_TO_ROLE: Record<string, ActiveRole> = {
  AdminTabs: 'admin',
  HSCoachTabs: 'hs_coach',
  ClubCoachTabs: 'club_coach',
  CoachTabs: 'coach',
  AgencyTabs: 'agency',
  ScoutTabs: 'scout',
  InfluencerTabs: 'influencer',
  ParentTabs: 'parent',
  AthleteTabs: 'athlete',
};

/** Walk the navigation state to find the current top-level role navigator. */
export function getActiveRoleFromState(state: any): ActiveRole {
  if (!state || !Array.isArray(state.routes)) return 'all';
  // The root stack's currently-focused route name is the role-tab navigator.
  const route = state.routes[state.index ?? 0];
  if (!route) return 'all';
  if (ROUTE_TO_ROLE[route.name]) return ROUTE_TO_ROLE[route.name];
  // Recurse into nested navigators (e.g. shared stacks rendered above tabs).
  if (route.state) return getActiveRoleFromState(route.state);
  return 'all';
}

/**
 * Notification.type values that should count toward each role's unread badge.
 * Returning null means "no filter — count everything" (admin/all).
 */
export function notificationTypesForRole(role: ActiveRole): string[] | null {
  switch (role) {
    case 'athlete':
      return [
        'letter_sent', 'profile_view', 'athlete_saved', 'athlete_contacted',
        'recruiting', 'camp', 'profile', 'info', 'message',
      ];
    case 'coach':
    case 'scout':
    case 'agency':
    case 'club_coach':
    case 'hs_coach':
      return ['recruiting', 'athlete_saved', 'athlete_contacted', 'letter_sent', 'message', 'info'];
    case 'influencer':
      return ['message', 'info', 'profile', 'profile_view'];
    case 'parent':
      return ['info', 'recruiting', 'message', 'letter_sent', 'profile_view'];
    case 'admin':
      return null;
    case 'all':
    default:
      return null;
  }
}

export type ConvScope = 'athlete_side' | 'coach_side' | 'all';
export function conversationScopeForRole(role: ActiveRole): ConvScope {
  switch (role) {
    case 'coach':
    case 'scout':
    case 'agency':
    case 'club_coach':
    case 'hs_coach':
      return 'coach_side';
    case 'athlete':
    case 'parent':
    case 'influencer':
      return 'athlete_side';
    default:
      return 'all';
  }
}

export const ROLE_LABEL: Record<ActiveRole, string> = {
  athlete: 'Athlete',
  coach: 'Coach',
  scout: 'Scout',
  agency: 'Agency',
  club_coach: 'Club Coach',
  hs_coach: 'HS Coach',
  influencer: 'Creator',
  parent: 'Parent',
  admin: 'Admin',
  all: 'All roles',
};

export function useActiveRoleScope() {
  // Subscribe to root nav state — `useNavigationState(s => s)` re-renders on change.
  const state = useNavigationState((s) => s);
  return useMemo(() => {
    const role = getActiveRoleFromState(state);
    return {
      role,
      label: ROLE_LABEL[role],
      notifTypes: notificationTypesForRole(role),
      convScope: conversationScopeForRole(role),
    };
  }, [state]);
}
