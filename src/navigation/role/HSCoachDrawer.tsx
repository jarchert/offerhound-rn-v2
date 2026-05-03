// HSCoachDrawer — hamburger-menu navigator for high school coach role.
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RoleHeader from '@/components/navigation/RoleHeader';
import RoleDrawerContent from '@/components/navigation/RoleDrawerContent';
import { colors } from '@/lib/theme';

import HSCoachDashboardScreen from '@/screens/hs-coach/HSCoachDashboardScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';
import CampsScreen from '@/screens/shared/CampsScreen';

const Drawer = createDrawerNavigator();

export default function HSCoachDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <RoleDrawerContent {...props} role="hs_coach" />}
      screenOptions={{
        header: () => <RoleHeader />,
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={HSCoachDashboardScreen} />
      <Drawer.Screen name="FindAthletes" component={AthleteSearchScreen} />
      <Drawer.Screen name="Letters" component={LetterComposerScreen} />
      <Drawer.Screen name="Camps" component={CampsScreen} />
    </Drawer.Navigator>
  );
}
