// ClubCoachDrawer — hamburger-menu navigator for club/travel team coach role.
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RoleHeader from '@/components/navigation/RoleHeader';
import RoleDrawerContent from '@/components/navigation/RoleDrawerContent';
import { colors } from '@/lib/theme';

import ClubCoachDashboardScreen from '@/screens/club/ClubCoachDashboardScreen';
import CampsScreen from '@/screens/shared/CampsScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';

const Drawer = createDrawerNavigator();

export default function ClubCoachDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <RoleDrawerContent {...props} role="club_coach" />}
      screenOptions={{
        header: () => <RoleHeader />,
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={ClubCoachDashboardScreen} />
      <Drawer.Screen name="Camps" component={CampsScreen} />
      <Drawer.Screen name="FindAthletes" component={AthleteSearchScreen} />
      <Drawer.Screen name="Letters" component={LetterComposerScreen} />
    </Drawer.Navigator>
  );
}
