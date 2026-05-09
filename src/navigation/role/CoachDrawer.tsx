// CoachDrawer — hamburger-menu navigator for college coach role.
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RoleHeader from '@/components/navigation/RoleHeader';
import RoleDrawerContent from '@/components/navigation/RoleDrawerContent';
import { colors } from '@/lib/theme';

import CoachDashboard from '@/screens/coach/CoachDashboard';
import CoachRosterScreen from '@/screens/coach/CoachRosterScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import CoachAthleteMatchesScreen from '@/screens/coach/CoachAthleteMatchesScreen';
import CoachLettersScreen from '@/screens/coach/CoachLettersScreen';
import CampsScreen from '@/screens/shared/CampsScreen';

const Drawer = createDrawerNavigator();

export default function CoachDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <RoleDrawerContent {...props} role="coach" />}
      screenOptions={{
        header: () => <RoleHeader />,
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={CoachDashboard} />
      <Drawer.Screen name="Pipeline" component={CoachRosterScreen} />
      <Drawer.Screen name="FindAthletes" component={AthleteSearchScreen} />
      {/* Build 55 item 8: full athlete-match list the dashboard 'See all' routes to. */}
      <Drawer.Screen name="AthleteMatches" component={CoachAthleteMatchesScreen} options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="Letters" component={CoachLettersScreen} />
      <Drawer.Screen name="Camps" component={CampsScreen} />
    </Drawer.Navigator>
  );
}
