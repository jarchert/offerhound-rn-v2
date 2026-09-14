// ParentTabs — merged single-tab-bar navigation (Group 3 #7, Option C variant b, ROLE 6).
//
// Before: 4 tabs (Home, Messages, Inbox, Safety). These already represent
// the complete cross-app verb surface for the parent role — see ground-truth
// audit below.
//
// Companion nav mount audit (grep evidence):
//   `grep -rn "<ParentNav\|<OwnerNav\|<CoachNav\|<HSCoachNav\|<ScoutNav\|<OrganizationNav" src/screens/`
//   → 0 hits in any parent-reachable screen.
//   No companion nav to gate behind isWide. Nothing to retire.
//
// Real cross-app verbs found in parent-reachable screens (grep evidence):
//   ParentDashboard.tsx:
//     - L148  nav.dispatch(CommonActions.reset({...AuthStack...}))
//             — auth redirect for logged-out state. Not a cross-app verb.
//     - L391  (nav as any).navigate('AuthStack', { screen: 'VisibilityDecision', ... })
//             — proposal-banner tap opens the VisibilityDecision action screen
//               via AuthStack modal. Triggered per-proposal; not a standing
//               tab surface. Stays as Root Stack navigate.
//     - L590  nav.navigate('ParentTabs', { screen: 'TrustSafetyTab' })
//             — "Trust & Safety center" card in the dashboard navigates
//               *within* ParentTabs to TrustSafetyTab. Already a tab.
//               No new tab needed.
//   ParentTrustSafetyScreen.tsx: 0 navigate calls.
//   VisibilityDecisionScreen.tsx: 0 navigate calls.
//
// ViewToggle audit: 0 hits for ViewToggle/isOwnerView/isVisitorView in
// src/screens/parent/. Nothing to lift.
//
// Divergence from NAV_PROPOSAL §5: ignored per plan (0-for-5 track record).
//
// Final tab set: Home / Messages / Inbox / Safety (4 tabs — unchanged).
// Count 4 ≤ 5 → standard bottom tab bar; CompactGridTabBar not needed.
//
// Deep-link preservation: all 4 tab routes remain registered in linking.ts
// (ParentTabs.DashboardTab → 'parent', ParentTabs.TrustSafetyTab →
// 'parent/safety') and in RootNavigator.tsx. No changes needed.
//
// Build 25 (prior): Messages + Inbox added for parent-only users (most
// parents reach the parent overlay via AthleteTabs instead). Preserved.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { roleTabScreenOptions } from '@/navigation/role/roleTabScreenOptions';
import { Home, Shield, MessageSquare, Inbox } from 'lucide-react-native';

import ParentDashboard from '@/screens/parent/ParentDashboard';
import ParentTrustSafetyScreen from '@/screens/parent/ParentTrustSafetyScreen';
import MessagesScreen from '@/screens/shared/MessagesScreen';
import InboxScreen from '@/screens/shared/InboxScreen';

const Tab = createBottomTabNavigator();

export default function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={roleTabScreenOptions}>
      <Tab.Screen name="DashboardTab" component={ParentDashboard} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} /> }} />
      <Tab.Screen name="InboxTab" component={InboxScreen} options={{ title: 'Inbox', tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} /> }} />
      <Tab.Screen name="TrustSafetyTab" component={ParentTrustSafetyScreen} options={{ title: 'Safety', tabBarIcon: ({ color, size }) => <Shield size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}
