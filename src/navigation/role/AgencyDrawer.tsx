// AgencyDrawer — hamburger-menu navigator for recruiting agency role.
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RoleHeader from '@/components/navigation/RoleHeader';
import RoleDrawerContent from '@/components/navigation/RoleDrawerContent';
import { colors } from '@/lib/theme';

import AgencyDashboardScreen from '@/screens/agency/AgencyDashboardScreen';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import LetterComposerScreen from '@/screens/shared/LetterComposerScreen';
import OrganizationSettingsScreen from '@/screens/settings/OrganizationSettingsScreen';

const Drawer = createDrawerNavigator();

export default function AgencyDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <RoleDrawerContent {...props} role="agency" />}
      screenOptions={{
        header: () => <RoleHeader />,
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={AgencyDashboardScreen} />
      <Drawer.Screen name="FindAthletes" component={AthleteSearchScreen} />
      <Drawer.Screen name="Letters" component={LetterComposerScreen} />
      <Drawer.Screen name="AgencyTeam" component={OrganizationSettingsScreen} />
    </Drawer.Navigator>
  );
}
