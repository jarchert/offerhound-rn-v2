// AthleteTabs — merged single-tab-bar navigation (Group 3 #7, Option C variant b).
//
// Before: 5 tabs (Home, Matches, Messages, Letters, Profile) with a separate
// OwnerNav phone-bottom-bar overlay mounted from DashboardScreen. That
// produced a dual-bar system on phone with Gallery / Coaches / Camps / News /
// Settings sitting behind tab-bar-styled buttons on a *second* bar.
//
// After: every real cross-app verb the athlete used to reach via OwnerNav's
// phone bottom bar is now a first-class Tab.Screen in this single navigator.
// The OwnerNav wide-screen sidebar (width >= LG_BREAKPOINT = 1024) still
// renders in its own dashboard mount path — only the phone-bottom-bar mount
// is retired.
//
// Compact grid tab bar (Group 3 #7 follow-up, 2026-08-31):
// The default react-navigation bottom-tabs single-row bar gets cramped past
// 5 tabs on narrow phones. We now register a custom `tabBar` renderer
// (CompactGridTabBar) that lays the 7 tabs out across 2 rows (4 top / 3
// bottom). Every route still resolves normally through navigation.emit +
// navigation.navigate, so deep-linking / tabPress / tabLongPress semantics
// are preserved.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Trophy, MessageCircle, Mail, Users, CalendarDays, User } from 'lucide-react-native';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { ParentAthleteSwitcher } from '@/components/ParentAthleteSwitcher';
import { CompactGridTabBar } from '@/components/CompactGridTabBar';

import DashboardScreen from '@/screens/shared/DashboardScreen';
import AthleteMatchesScreen from '@/screens/athlete/AthleteMatchesScreen';
import LettersScreen from '@/screens/athlete/LettersScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import ProfileScreen from '@/screens/shared/ProfileScreen';
import CoachDirectoryScreen from '@/screens/shared/CoachDirectoryScreen';
import CampStack from '@/navigation/stacks/CampStack';

const Tab = createBottomTabNavigator();

export default function AthleteTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CompactGridTabBar {...props} />}
      screenOptions={{
        ...roleTabScreenOptions,
        // Athlete tabs: add ParentAthleteSwitcher in header left when user
        // has a parent role linked — shows dropdown to switch child view.
        headerLeft: () => <ParentAthleteSwitcher />,
      }}>
      <Tab.Screen name="HomeTab" component={DashboardScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="MatchesTab" component={AthleteMatchesScreen} options={{ title: 'Matches', tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} /> }} />
      <Tab.Screen name="LettersTab" component={LettersScreen} options={{ title: 'Letters', tabBarIcon: ({ color, size }) => <Mail size={size} color={color} /> }} />
      {/* CoachesTab — lifted from OwnerNav (was Root Stack navigate('CoachDirectory')). */}
      <Tab.Screen name="CoachesTab" component={CoachDirectoryScreen} options={{ title: 'Coaches', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
      {/* CampsTab — lifted from OwnerNav (was Root Stack navigate('CampStack')). */}
      <Tab.Screen name="CampsTab" component={CampStack} options={{ title: 'Camps', headerShown: false, tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} /> }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
