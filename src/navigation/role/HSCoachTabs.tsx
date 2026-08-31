// HSCoachTabs — merged single-tab-bar navigation (Group 3 #7, Option C variant b, ROLE 3).
//
// Before: 5 tabs (Home, Athletes, Letters, Messages, Inbox). HS Coach was
// already close to the target shape — no separate companion nav overlay was
// mounted from the HS-coach dashboard (unlike Athlete's OwnerNav and Club
// Coach's CoachNav phone-bottom-bar overlays). Grep over
// `src/screens/hs-coach/HSCoachDashboardScreen.tsx` shows a single stray
// cross-app verb the tabs did not surface: `navigation.navigate('CoachDirectory')`
// from the "College Coaches" quick-action.
//
// After: every real cross-app verb the HS coach reaches (verified via grep)
// is now a first-class Tab.Screen in this navigator. The pre-existing
// SearchTab already hosts `AthleteSearchScreen` — the same screen the banner
// "Search Athletes" / quick-action "Find Athletes" call `navigate('AthleteSearch')`
// for — so no change there. The pre-existing MessagesTab covers the
// `navigate('Messages')` calls. `LetterComposer` and `PublicProfileStack`
// remain Root Stack navigate targets (composer + deep-link, not cross-app
// verbs the user reaches for as top-level surfaces) — same treatment as
// ClubCoachTabs.
//
// Real cross-app verbs found in hs-coach screens (grep evidence):
//   - AthleteSearch  (banner "Search Athletes", quick-action "Find Athletes",
//                     saved-athletes empty state "Search Athletes")
//                     → already SearchTab; kept
//   - Messages       (banner "Messages", quick-action "Messages",
//                     saved-athletes card onMessage)
//                     → already MessagesTab; kept
//   - CoachDirectory (quick-action "College Coaches")
//                     → CoachesTab (NEW)
//   - LetterComposer (banner "AI Letters", quick-action "AI Letters",
//                     inline LetterButton)
//                     — distinct from LettersTab (HSCoachLettersScreen is the
//                     letters *history*). Stays as a Root Stack navigate;
//                     not lifted.
//   - PublicProfileStack (saved-athletes "View Profile")
//                     — deep-link only; not a nav-verb the user reaches for
//                     standalone. Stays as a Root Stack navigate.
//
// Final tab set: Home / Athletes / Letters / Messages / Inbox / Coaches
// (6 tabs). Because 6 > 5, we reuse the same CompactGridTabBar renderer
// Athlete and Club Coach use so the phone bottom bar stays legible.
//
// No ViewToggle: HSCoachDashboardScreen has no owner/visitor concept, so
// nothing to lift to headerRight.
// No companion nav retirement: no HSCoachNav / OwnerNav / CoachNav mount is
// wired to the HS-coach dashboard path at HEAD (grep confirmed clean).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { CompactGridTabBar } from '@/components/CompactGridTabBar';
import { LayoutDashboard, Mail, Search, MessageSquare, Inbox, GraduationCap } from 'lucide-react-native';

import HSCoachDashboardScreen from '@/screens/hs-coach/HSCoachDashboardScreen';
import HSCoachLettersScreen from '@/screens/hs-coach/HSCoachLettersScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';
import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';

const Tab = createBottomTabNavigator();

export default function HSCoachTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CompactGridTabBar {...props} />}
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="DashboardTab" component={HSCoachDashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="SearchTab" component={AthleteSearchScreen} options={{ title: 'Athletes', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={HSCoachLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
      {/* CoachesTab — lifted from quick-action "College Coaches" (was Root Stack navigate('CoachDirectory')). */}
      <Tab.Screen name="CoachesTab" component={CoachDirectoryScreen} options={{ title: 'Coaches', tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
