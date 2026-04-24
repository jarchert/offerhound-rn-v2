// SportLandingScreen — thin wrapper around LandingScreen for sport-specific deep-link routes.
// LandingScreen already reads route.params.sport and pre-selects the sport/context.
// This file exists so each of the 13 sports can be its own registered route with
// initialParams: { sport: '<sport>' } and distinct deep-link paths (/football, /basketball, ...).
import React from 'react';
import LandingScreen from '@/screens/auth/LandingScreen';

export default function SportLandingScreen() {
  return <LandingScreen />;
}
