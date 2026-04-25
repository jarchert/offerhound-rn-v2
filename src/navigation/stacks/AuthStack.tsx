// AuthStack — signed-out flows per Part 2 §2.1
// Screens: Auth (signin+signup), BetaRegister, ParentalConsent, DeleteAccount, PasswordReset
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';

import SignInScreen from '@/screens/auth/SignInScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';
import LandingScreen from '@/screens/auth/LandingScreen';
import ParentalConsentScreen from '@/screens/auth/ParentalConsentScreen';
import BetaRegisterScreen from '@/screens/auth/BetaRegisterScreen';
import DeleteAccountScreen from '@/screens/shared/DeleteAccountScreen';
import LegalStack from '@/navigation/stacks/LegalStack';
import { makePlaceholder } from '@/navigation/PlaceholderScreen';

// PORT-PENDING: no Lovable page — PasswordReset is the Supabase deep-link target; needs a dedicated RN screen wrapping supabase.auth.updateUser. Schedule in next wave.
const PasswordResetScreen = makePlaceholder('Password Reset', 'Supabase password reset link target.');

export type AuthStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  SignUp: undefined;
  BetaRegister: undefined;
  ParentalConsent: undefined;
  DeleteAccount: undefined;
  PasswordReset: undefined;
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
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="BetaRegister" component={BetaRegisterScreen} />
      <Stack.Screen name="ParentalConsent" component={ParentalConsentScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
      <Stack.Screen name="LegalStack" component={LegalStack} />
    </Stack.Navigator>
  );
}
