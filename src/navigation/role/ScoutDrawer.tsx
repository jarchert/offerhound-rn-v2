// ScoutDrawer — hamburger-menu navigator for scout role.
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RoleHeader from '@/components/navigation/RoleHeader';
import RoleDrawerContent from '@/components/navigation/RoleDrawerContent';
import { colors } from '@/lib/theme';

import ScoutDashboard from '@/screens/scout/ScoutDashboard';
import AthleteSearchScreen from '@/screens/shared/AthleteSearchScreen';
import ScoutLettersScreen from '@/screens/scout/ScoutLettersScreen';
import ScoutTrendsScreen from '@/screens/scout/ScoutTrendsScreen';

const Drawer = createDrawerNavigator();

export default function ScoutDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <RoleDrawerContent {...props} role="scout" />}
      screenOptions={{
        header: () => <RoleHeader />,
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={ScoutDashboard} />
      <Drawer.Screen name="FindAthletes" component={AthleteSearchScreen} />
      <Drawer.Screen name="Letters" component={ScoutLettersScreen} />
      <Drawer.Screen name="Trends" component={ScoutTrendsScreen} />
    </Drawer.Navigator>
  );
}
