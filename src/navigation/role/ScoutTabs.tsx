// ScoutTabs — merged single-tab-bar navigation (Group 3 #7, Option C variant b, ROLE 4).
//
// Before: 5 tabs (Home, Athletes, Letters, Messages, Inbox). Scout was already
// close to the target shape — grep over `src/screens/scout/` shows no
// ScoutNav / OrganizationNav / OwnerNav / CoachNav / HSCoachNav companion
// component mounted anywhere in scout-reachable render paths at HEAD
// (verified again for ROLE 4), so there is nothing to gate behind isWide or
// retire. `ScoutDashboard.tsx` has no ViewToggle / isOwnerView / isVisitorView
// state, so nothing to lift to headerRight either.
//
// The only real cross-app verb the pre-existing tabs did not surface is
// `navigation.navigate('ScoutTrends')`, reached via the "Trends" quick-action
// button on the scout dashboard (ScoutDashboard.tsx L197, wired to the
// quick-row Button at L271).
//
// After: every real cross-app verb the scout reaches (verified via grep) is
// now a first-class Tab.Screen in this navigator. The pre-existing SearchTab
// already hosts `AthleteSearchScreen` — `ScoutDashboard.tsx` L191's
// `navigate('PublicTabs', { screen: 'PublicAthletes' })` from the "Search"
// quick-action is a divergent path to the same "browse athletes" intent
// SearchTab covers, not a distinct destination, so no change there. The
// pre-existing MessagesTab covers the `navigate('Messages')` call at L188.
// `LetterComposer` and `PublicProfileStack` remain Root Stack navigate
// targets (composer + deep-link, not cross-app verbs the user reaches for as
// top-level surfaces) — same treatment as ClubCoachTabs and HSCoachTabs.
//
// Real cross-app verbs found in scout-reachable screens (grep evidence):
//   - AthleteSearch / browse-athletes intent
//       ScoutDashboard.tsx L191 (quick-action "Search" via PublicAthletes)
//       → already covered by SearchTab (AthleteSearchScreen); kept
//   - Messages
//       ScoutDashboard.tsx L188 (banner + SavedProspects onMessage L336)
//       → already MessagesTab; kept
//   - LettersTab (self-nav)
//       ScoutDashboard.tsx L194 (quick-action "AI Letters" wired to
//       goLetters at L263)
//       → already LettersTab; kept
//   - ScoutTrends
//       ScoutDashboard.tsx L197 (quick-action "Trends" wired to goTrends at
//       L271)
//       → TrendsTab (NEW — lifted from Root Stack navigate)
//   - LetterComposer
//       ScoutDashboard.tsx L185 (goLetter, per-athlete seed) +
//       ScoutDirectoryScreen.tsx L81, L92 (seeded compose flows)
//       — composer with `seed` params; not a cross-app verb the user reaches
//       for standalone. Stays as a Root Stack navigate.
//   - PublicProfileStack
//       ScoutDashboard.tsx L182 (goAthlete, per-slug) +
//       ScoutDirectoryScreen.tsx L107
//       — deep-link only; not a nav-verb the user reaches for standalone.
//       Stays as a Root Stack navigate.
//   - 'Directory' (ScoutLettersScreen.tsx L169, "Search Athletes" empty-state)
//       — legacy misnamed target; no route named 'Directory' is registered
//       in RootNavigator. Dead nav, not liftable. Flagged as a follow-up
//       cleanup opportunity but out of scope for this Group 3 #7 pass.
//
// Final tab set: Home / Athletes / Letters / Messages / Inbox / Trends
// (6 tabs). Because 6 > 5, we reuse the same CompactGridTabBar renderer
// Athlete, Club Coach, and HS Coach use so the phone bottom bar stays
// legible.
//
// Deep-link preservation: `<Stack.Screen name="ScoutTrends">` remains
// registered in `RootNavigator.tsx` so existing `scout/trends` linking
// (linking.ts:249) and any external `navigate('ScoutTrends')` callers keep
// working; the tab is an *additional* entry point, not a replacement.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { CompactGridTabBar } from '@/components/CompactGridTabBar';
import { LayoutDashboard, Search, Mail, MessageSquare, Inbox, TrendingUp } from 'lucide-react-native';

import ScoutDashboard from '@/screens/scout/ScoutDashboard';
import ScoutLettersScreen from '@/screens/scout/ScoutLettersScreen';
import ScoutTrendsScreen from '@/screens/scout/ScoutTrendsScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';

const Tab = createBottomTabNavigator();

export default function ScoutTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CompactGridTabBar {...props} />}
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="DashboardTab" component={ScoutDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="SearchTab" component={AthleteSearchScreen} options={{ title: 'Athletes', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={ScoutLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
      {/* TrendsTab — lifted from quick-action "Trends" (was Root Stack navigate('ScoutTrends')). */}
      <Tab.Screen name="TrendsTab" component={ScoutTrendsScreen} options={{ title: 'Trends', tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
