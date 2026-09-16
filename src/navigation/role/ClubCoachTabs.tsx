// ClubCoachTabs — merged single-tab-bar navigation (Group 3 #7, Option C variant b, ROLE 2).
//
// Before: 5 tabs (Home, Camps, Letters, Messages, Inbox) with a separate
// CoachNav phone-bottom-bar overlay mounted from ClubCoachDashboardScreen at
// two sites (both passing `role="club_coach"`). That produced a dual-bar
// system on phone with Dashboard / Club Coach / Matches / Athletes / Messages
// / Settings sitting behind tab-bar-styled buttons on a *second* bar, none of
// which reflected the real cross-app verbs a club coach actually reaches for.
//
// After: every real cross-app verb the club coach reaches (verified via grep
// over ClubCoachDashboardScreen.tsx) is now a first-class Tab.Screen in this
// single navigator. The CoachNav wide-screen sidebar (width >= LG_BREAKPOINT
// = 1024) still renders in its own dashboard mount path — only the
// phone-bottom-bar mount is retired.
//
// Real cross-app verbs found in club-coach screens (grep evidence):
//   - AthleteSearch  (banner "Search", quick-action "Find Athletes",
//                     saved-athletes empty state "Search Athletes")  → AthletesTab (new)
//   - Messages       (banner "Messages", quick-action "Send Message")
//                     — already a pre-existing MessagesTab; kept
//   - LetterComposer (banner "Letters", quick-action "AI Letters")
//                     — distinct from the LettersTab (which shows the
//                     letters *index*). Stays as a Root Stack navigate; not
//                     lifted to a tab.
//   - CampStack      ("Open Full Camp Manager" — full camp stack) — distinct
//                     from the CampsTab (which is the club-coach camps list).
//                     Stays as a Root Stack navigate; not lifted to a tab.
//   - SettingsStack  (Profile-tab "Edit Profile Settings", plus CoachNav's
//                     Settings item) → SettingsTab (new)
//   - PublicProfileStack (Saved-athletes "View Profile") — deep link only;
//                     not a nav-verb the user reaches for standalone.
//
// Final tab set: Home / Camps / Letters / Messages / Inbox / Athletes /
// Settings (7 tabs).  Because 7 > 5, we reuse the same CompactGridTabBar
// renderer Athlete uses so the phone bottom bar stays legible.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { CompactGridTabBar } from '@/components/CompactGridTabBar';
import { LayoutDashboard, Tent, Mail, MessageSquare, Inbox, Search, Settings } from 'lucide-react-native';

import ClubCoachDashboardScreen from '@/screens/club/ClubCoachDashboardScreen';
import ClubCoachLettersScreen from '@/screens/club/ClubCoachLettersScreen';
import CoachCampsScreen from '@/screens/coach/CoachCampsScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import SettingsStack from '@/navigation/stacks/SettingsStack';

const Tab = createBottomTabNavigator();

export default function ClubCoachTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CompactGridTabBar {...props} />}
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="DashboardTab" component={ClubCoachDashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="CampsTab" component={CoachCampsScreen} options={{ title: 'Camps', tabBarIcon: ({ color, size }) => <Tent size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={ClubCoachLettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
      {/* AthletesTab — lifted from CoachNav phone-bottom-bar overlay + banner "Search" / quick-action "Find Athletes" (was Root Stack navigate('AthleteSearch')). */}
      <Tab.Screen name="AthletesTab" component={AthleteSearchScreen} options={{ title: 'Athletes', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
      {/* SettingsTab — lifted from CoachNav phone-bottom-bar overlay + profile-tab "Edit Profile Settings" (was Root Stack navigate('SettingsStack')). */}
      <Tab.Screen name="SettingsTab" component={SettingsStack} options={{ title: 'Settings', headerShown: false, tabBarIcon: ({ color, size }) => <Settings size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
