// PublicSportStack — 13 discrete sport landing routes for deep-link parity with Lovable.
// Each route renders SportLandingScreen (wrapper of LandingScreen) with initialParams { sport }.
// Deep-link paths: /football, /basketball, /soccer, /baseball, /softball, /volleyball,
// /lacrosse, /hockey, /swimming, /golf, /track-field, /cheerleading, /wrestling.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';
import type { SportType } from '@/lib/data/sports';
import SportLandingScreen from '@/screens/shared/SportLandingScreen';

export type PublicSportStackParamList = {
  SportLanding_football: { sport: SportType };
  SportLanding_basketball: { sport: SportType };
  SportLanding_soccer: { sport: SportType };
  SportLanding_baseball: { sport: SportType };
  SportLanding_softball: { sport: SportType };
  SportLanding_volleyball: { sport: SportType };
  SportLanding_lacrosse: { sport: SportType };
  SportLanding_hockey: { sport: SportType };
  SportLanding_swimming: { sport: SportType };
  SportLanding_golf: { sport: SportType };
  SportLanding_trackfield: { sport: SportType };
  SportLanding_cheerleading: { sport: SportType };
  SportLanding_wrestling: { sport: SportType };
};

const Stack = createNativeStackNavigator<PublicSportStackParamList>();

export default function PublicSportStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="SportLanding_football"
        component={SportLandingScreen}
        initialParams={{ sport: 'football' }}
      />
      <Stack.Screen
        name="SportLanding_basketball"
        component={SportLandingScreen}
        initialParams={{ sport: 'basketball' }}
      />
      <Stack.Screen
        name="SportLanding_soccer"
        component={SportLandingScreen}
        initialParams={{ sport: 'soccer' }}
      />
      <Stack.Screen
        name="SportLanding_baseball"
        component={SportLandingScreen}
        initialParams={{ sport: 'baseball' }}
      />
      <Stack.Screen
        name="SportLanding_softball"
        component={SportLandingScreen}
        initialParams={{ sport: 'softball' }}
      />
      <Stack.Screen
        name="SportLanding_volleyball"
        component={SportLandingScreen}
        initialParams={{ sport: 'volleyball' }}
      />
      <Stack.Screen
        name="SportLanding_lacrosse"
        component={SportLandingScreen}
        initialParams={{ sport: 'lacrosse' }}
      />
      <Stack.Screen
        name="SportLanding_hockey"
        component={SportLandingScreen}
        initialParams={{ sport: 'hockey' }}
      />
      <Stack.Screen
        name="SportLanding_swimming"
        component={SportLandingScreen}
        initialParams={{ sport: 'swimming' }}
      />
      <Stack.Screen
        name="SportLanding_golf"
        component={SportLandingScreen}
        initialParams={{ sport: 'golf' }}
      />
      <Stack.Screen
        name="SportLanding_trackfield"
        component={SportLandingScreen}
        initialParams={{ sport: 'track-field' }}
      />
      <Stack.Screen
        name="SportLanding_cheerleading"
        component={SportLandingScreen}
        initialParams={{ sport: 'cheerleading' }}
      />
      <Stack.Screen
        name="SportLanding_wrestling"
        component={SportLandingScreen}
        initialParams={{ sport: 'wrestling' }}
      />
    </Stack.Navigator>
  );
}
