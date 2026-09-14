// CoachTabs — merged single-tab-bar navigation (Group 3 #7, Option C variant b, ROLE 7 — College Coach).
//
// Before: 6 tabs (Dashboard/Home, Pipeline, Camps, Letters, Directory, Campaigns). Two real
// cross-app verbs were reached via Root Stack navigates that never had a first-class tab:
//
//   - AthleteSearch  (CoachRosterScreen.tsx L179 — `(nav as any).navigate('AthleteSearch')`)
//                    → SearchTab (NEW) — AthleteSearchScreen, label "Athletes"
//   - Messages       (CoachDashboard.tsx L147 — `(nav as any).navigate('Messages', …)`)
//                    (CoachAthleteMatchesScreen.tsx L50 — `nav.navigate('Messages')`)
//                    → MessagesTab (NEW) — MessagesScreen, label "Messages"
//
// Routes that stay in Root Stack (not lifted):
//   - LetterComposer  — always invoked with a seed param (athlete object); not a standalone surface.
//   - PublicProfileStack — deep-link into a profile viewer; not a nav-verb the user reaches for
//                          as a top-level surface.
//   - CoachTabs/PipelineTab, CoachTabs/CampsTab — already first-class tabs; intra-navigator
//                          navigates from CoachDashboard are fine after lift.
//
// CoachNav mount state: `grep -rn "<CoachNav" src/screens/coach/ src/screens/shared/` returned
// nothing at HEAD — CoachNav is NOT mounted anywhere in college-coach-reachable code. No gating
// change needed, no retirement test needed.
//
// ViewToggle: not present in CoachDashboard.tsx (grep confirmed) — nothing to lift.
//
// Final tab count: 8 > 5 → CompactGridTabBar renderer wired (same as Athlete / Club Coach /
// HS Coach / Scout / Agency).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { CompactGridTabBar } from '@/components/CompactGridTabBar';
import {
  LayoutDashboard,
  Users,
  Search,
  Tent,
  Mail,
  BookUser,
  MessageSquare,
  Megaphone,
} from 'lucide-react-native';

import CoachDashboard from '@/screens/coach/CoachDashboard';
import CoachRosterScreen from '@/screens/coach/CoachRosterScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import CampsScreen from '@/screens/shared/CampsScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';
import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import CoachCampaignsScreen from '@/screens/coach/CoachCampaignsScreen';

const Tab = createBottomTabNavigator();

export default function CoachTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CompactGridTabBar {...props} />}
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="DashboardTab" component={CoachDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tab.Screen name="PipelineTab" component={CoachRosterScreen} options={{ title: 'Pipeline', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      {/* SearchTab — lifted from CoachRosterScreen.tsx L179 navigate('AthleteSearch'). */}
      <Tab.Screen name="SearchTab" component={AthleteSearchScreen} options={{ title: 'Athletes', tabBarIcon: ({ color, size }) => <Search size={size} color={color} /> }} />
      <Tab.Screen name="CampsTab" component={CampsScreen} options={{ title: 'Camps', tabBarIcon: ({ color, size }) => <Tent size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={LetterComposerScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      <Tab.Screen name="DirectoryTab" component={CoachDirectoryScreen} options={{ title: 'Directory', tabBarIcon: ({ color, size }) => <BookUser size={size} color={color} /> }} />
      {/* MessagesTab — lifted from CoachDashboard.tsx L147 + CoachAthleteMatchesScreen.tsx L50 navigate('Messages'). */}
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="CampaignsTab" component={CoachCampaignsScreen} options={{ title: 'Campaigns', tabBarIcon: ({ color, size }) => <Megaphone size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
