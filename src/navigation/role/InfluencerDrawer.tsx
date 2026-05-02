// InfluencerDrawer — hamburger-menu navigator for influencer/creator role.
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import RoleHeader from '@/components/navigation/RoleHeader';
import RoleDrawerContent from '@/components/navigation/RoleDrawerContent';
import { colors } from '@/lib/theme';

import InfluencerDashboard from '@/screens/influencer/InfluencerDashboard';
import ProfileScreen from '@/screens/shared/ProfileScreen';
import InfluencerBoardScreen from '@/screens/influencer/InfluencerBoardScreen';
import PodcastScreen from '@/screens/influencer/PodcastScreen';

const Drawer = createDrawerNavigator();

export default function InfluencerDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <RoleDrawerContent {...props} role="influencer" />}
      screenOptions={{
        header: () => <RoleHeader />,
        drawerStyle: { backgroundColor: colors.card, width: 280 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Dashboard" component={InfluencerDashboard} />
      <Drawer.Screen name="MyProfile" component={ProfileScreen} />
      <Drawer.Screen name="Board" component={InfluencerBoardScreen} />
      <Drawer.Screen name="Podcasts" component={PodcastScreen} />
    </Drawer.Navigator>
  );
}
