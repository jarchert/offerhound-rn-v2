// ParentDrawer — hamburger-menu navigator for parent role.
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RoleHeader from '@/components/navigation/RoleHeader';
import RoleDrawerContent from '@/components/navigation/RoleDrawerContent';
import { colors } from '@/lib/theme';

import ParentDashboard from '@/screens/parent/ParentDashboard';
import ParentTrustSafetyScreen from '@/screens/parent/ParentTrustSafetyScreen';

const Drawer = createDrawerNavigator();

export default function ParentDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <RoleDrawerContent {...props} role="parent" />}
      screenOptions={{
        header: () => <RoleHeader />,
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={ParentDashboard} />
      <Drawer.Screen name="TrustSafety" component={ParentTrustSafetyScreen} />
    </Drawer.Navigator>
  );
}
