// AuthStack — signed-out flows per Part 2 §2.1
// Screens: Auth (signin+signup), BetaRegister, ParentalConsent, DeleteAccount, PasswordReset
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import SignInScreen from '@/screens/auth/SignInScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';
import LandingScreen from '@/screens/auth/LandingScreen';
import AuthScreen from '@/screens/auth/AuthScreen';
import ParentalConsentScreen from '@/screens/auth/ParentalConsentScreen';
import BetaRegisterScreen from '@/screens/auth/BetaRegisterScreen';
import PasswordResetScreen from '@/screens/auth/PasswordResetScreen';
import DeleteAccountScreen from '@/screens/shared/DeleteAccountScreen';
import LegalStack from '@/navigation/stacks/LegalStack';
import PrivacyPolicyScreen from '@/screens/legal/PrivacyPolicyScreen';
import TermsOfUseScreen from '@/screens/legal/TermsOfUseScreen';
import CCPARightsScreen from '@/screens/legal/CCPARightsScreen';
import CookiesPolicyScreen from '@/screens/legal/CookiesPolicyScreen';
import CommunityGuidelinesScreen from '@/screens/legal/CommunityGuidelinesScreen';
import AccessibilityScreen from '@/screens/legal/AccessibilityScreen';

export type AuthStackParamList = {
  Landing: undefined;
  Auth: { mode?: 'signin' | 'signup' | 'reset'; parent_token?: string; redirect?: string } | undefined;
  SignIn: undefined;
  SignUp: undefined;
  BetaRegister: undefined;
  ParentalConsent: undefined;
  DeleteAccount: undefined;
  PasswordReset: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
  CCPARights: undefined;
  CookiesPolicy: undefined;
  CommunityGuidelines: undefined;
  Accessibility: undefined;
  ParentTrustSafety: undefined;
  CoachCommunicationRules: undefined;
  LegalStack: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="BetaRegister" component={BetaRegisterScreen} />
      <Stack.Screen name="ParentalConsent" component={ParentalConsentScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
      {/* Legal screens — reachable directly from Footer deep-links */}
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      <Stack.Screen name="CCPARights" component={CCPARightsScreen} />
      <Stack.Screen name="CookiesPolicy" component={CookiesPolicyScreen} />
      <Stack.Screen name="CommunityGuidelines" component={CommunityGuidelinesScreen} />
      <Stack.Screen name="Accessibility" component={AccessibilityScreen} />
      <Stack.Screen name="ParentTrustSafety" component={require('@/screens/parent/ParentTrustSafetyScreen').default} />
      <Stack.Screen name="CoachCommunicationRules" component={require('@/screens/coach/CoachCommunicationRulesScreen').default} />
      <Stack.Screen name="LegalStack" component={LegalStack} />
    </Stack.Navigator>
  );
}
