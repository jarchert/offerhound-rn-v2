// AgencyTabs — merged single-tab-bar navigation (Group 3 #7, Option C variant b, ROLE 5).
//
// Before: 5 tabs (Home, Athletes, Letters, Messages, Inbox). Agency shares
// the same "scout-flavored" surface as Scout — same LettersScreen
// (ScoutLettersScreen), same shared AthleteSearchScreen/MessagesScreen/
// InboxScreen — and grep over agency-reachable code confirms Agency's
// cross-app verb surface tracks Scout's almost exactly.
//
// Companion mount audit (grep evidence):
//   - `src/components/OrganizationNav.tsx` exists but is NEVER mounted
//     anywhere at HEAD (`grep -rn "<OrganizationNav" src/` → 0 hits).
//     Its `orgNavItems` list (Dashboard / Organization / Athletes /
//     Coaches / Messages / Settings) is informational only and does not
//     reflect what an agency user actually reaches at runtime. Nothing
//     to gate behind isWide, nothing to retire.
//   - No AgencyNav / CoachNav / HSCoachNav / ScoutNav / OwnerNav mount
//     in `src/screens/agency/**` either. Only companion nav mounts in
//     the codebase are ClubCoachDashboardScreen's (isWide-gated
//     CoachNav — already retired in ROLE 2) and DashboardScreen's
//     (isOwnerView + isWide-gated OwnerNav — already retired in ROLE 1)
//     and ContactActivityScreen's (isOwnerView + _isWide-gated
//     OwnerNav — unrelated). Nothing agency-relevant to touch.
//
// ViewToggle audit: AgencyDashboardScreen has no
// `ViewToggle | isOwnerView | isVisitorView` state
// (`grep -n "ViewToggle\|isOwnerView\|isVisitorView"
//  src/screens/agency/AgencyDashboardScreen.tsx` → 0 hits).
// Its "isOwner" flag comes from `useScoutOrganization()` and drives
// conditional in-page tab visibility (Manage Staff / Organization),
// not a header owner/visitor view swap. Nothing to lift to
// `headerRight`.
//
// Real cross-app verbs found in agency-reachable screens (grep evidence):
//   AgencyDashboardScreen.tsx:
//     - L76  nav.navigate('AuthStack')      — auth redirect, not a verb.
//     - L131 (nav.getParent()).navigate('CoachTabs', { screen: 'DirectoryTab' })
//            — "Search Athletes" quick-action. Divergent path to the same
//              "browse athletes" intent SearchTab (AthleteSearchScreen)
//              already covers. Same shape as ScoutDashboard L191's
//              PublicTabs/PublicAthletes route. Kept as-is (no new tab).
//     - L137 nav.navigate('LetterComposer') — "Letter Center" quick-action.
//            Composer, not a top-level surface; identical treatment to
//            ScoutTabs and ClubCoach/HSCoach. Stays as Root Stack navigate.
//     - L144 nav.navigate('ScoutTrends')    — "Trends" quick-action. Real
//            cross-app verb, no pre-existing tab. → LIFTED to TrendsTab.
//     - L154 nav.navigate('PublicProfileStack', { screen: 'PublicAgencyProfile', … })
//            — "View Public Profile" deep-link (per-agency id). Not a
//              top-level nav-verb. Stays as Root Stack navigate.
//     - L224 nav.navigate('LetterComposer') — "View All" (Recent Letters).
//            Same composer. Stays as Root Stack navigate.
//     - L303 nav.navigate('LetterComposer', { seed: { … } })
//            — seeded per-athlete letter from Saved Athletes. Composer
//              with seed. Stays as Root Stack navigate.
//
//   ScoutLettersScreen.tsx (shared with Scout, mounted as LettersTab):
//     - L169 nav.navigate?.('Directory') — legacy misnamed target; no
//            route named 'Directory' is registered in RootNavigator.
//            Dead nav for Agency too. Flagged for cleanup in ROLE 4
//            report; out of scope here.
//
//   AthleteSearchScreen.tsx (shared, mounted as SearchTab):
//     - L365 nav.navigate('LetterComposer', { … }) — composer seed.
//     - L376 nav.navigate('Messages', { … })      — already MessagesTab.
//            Both are internal transitions from the search results row,
//            not standalone verbs Agency reaches for from the shell.
//
// Divergence from NAV_PROPOSAL §5 (Agency): ignored per plan. §5 is
// 0-for-4 on tab decisions across prior roles; we grep from scratch.
//
// Divergence from OrganizationNav's `orgNavItems` (informational only,
// since unmounted):
//   - orgNavItems has: Dashboard, Organization (SettingsStack),
//     Athletes (AthleteTabs), Coaches (CoachTabs), Messages, Settings.
//   - Grep shows Agency reaches none of these via first-class nav-verbs
//     from AgencyDashboardScreen except Messages (already MessagesTab)
//     and a divergent "Search Athletes" path to CoachTabs/DirectoryTab
//     (same intent as SearchTab). "Organization" and "Settings" are
//     shell-level surfaces reached via the global settings entry point,
//     not per-role tab candidates. "Coaches" as a browse-coaches
//     destination has no trigger site in agency screens. Not lifted.
//
// Shared-AthleteSearchScreen-with-Scout hypothesis (from ROLE 4 report):
// CONFIRMED. Both ScoutTabs and AgencyTabs mount SearchTab →
// AthleteSearchScreen. Both dashboards also have a divergent
// "Search Athletes" quick-action that navigates to a different
// browse-athletes route (Scout → PublicTabs/PublicAthletes,
// Agency → CoachTabs/DirectoryTab) but the intent is the same and
// SearchTab already covers it. Minimal-lift outcome mirrors Scout.
//
// Final tab set: Home / Athletes / Letters / Messages / Inbox / Trends
// (6 tabs, up from 5). Because 6 > 5, we reuse the same
// CompactGridTabBar renderer Athlete, Club Coach, HS Coach, and Scout
// use so the phone bottom bar stays legible.
//
// Deep-link preservation: `<Stack.Screen name="ScoutTrends">` remains
// registered in `RootNavigator.tsx:239` so existing `scout/trends`
// linking (linking.ts:249) and any external `navigate('ScoutTrends')`
// callers keep working; the tab is an *additional* entry point, not
// a replacement.
//
// Build 25 (prior): LettersTab uses ScoutLettersScreen (not
// CoachLettersScreen). Preserved.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { CompactGridTabBar } from '@/components/CompactGridTabBar';
import { Building2, Search, Mail, MessageSquare, Inbox, TrendingUp } from 'lucide-react-native';

import AgencyDashboardScreen from '@/screens/agency/AgencyDashboardScreen';
import ScoutLettersScreen from '@/screens/scout/ScoutLettersScreen';
import ScoutTrendsScreen from '@/screens/scout/ScoutTrendsScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';

const Tab = createBottomTabNavigator();

export default function AgencyTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CompactGridTabBar {...props} />}
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="DashboardTab" component={AgencyDashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} /> }} />
      <Tab.Screen name="SearchTab" component={AthleteSearchScreen} options={{ title: 'Athletes', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={ScoutLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
      {/* TrendsTab — lifted from quick-action "Trends" (was Root Stack navigate('ScoutTrends')). */}
      <Tab.Screen name="TrendsTab" component={ScoutTrendsScreen} options={{ title: 'Trends', tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
