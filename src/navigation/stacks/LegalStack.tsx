// LegalStack — static legal/policy screens reachable from both Settings (signed-in)
// and Auth (signed-out) flows. Privacy/Terms in particular are a hard App Store
// review requirement and must work without authentication.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import PrivacyPolicyScreen from '@/screens/legal/PrivacyPolicyScreen';
import TermsOfUseScreen from '@/screens/legal/TermsOfUseScreen';
import CCPARightsScreen from '@/screens/legal/CCPARightsScreen';
import CookiesPolicyScreen from '@/screens/legal/CookiesPolicyScreen';
import CommunityGuidelinesScreen from '@/screens/legal/CommunityGuidelinesScreen';
import AccessibilityScreen from '@/screens/legal/AccessibilityScreen';

export type LegalStackParamList = {
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
  CCPARights: undefined;
  CookiesPolicy: undefined;
  CommunityGuidelines: undefined;
  Accessibility: undefined;
};

const Stack = createNativeStackNavigator<LegalStackParamList>();

export default function LegalStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="CCPARights" component={CCPARightsScreen} />
      <Stack.Screen name="CookiesPolicy" component={CookiesPolicyScreen} />
      <Stack.Screen name="CommunityGuidelines" component={CommunityGuidelinesScreen} />
      <Stack.Screen name="Accessibility" component={AccessibilityScreen} />
    </Stack.Navigator>
  );
}
