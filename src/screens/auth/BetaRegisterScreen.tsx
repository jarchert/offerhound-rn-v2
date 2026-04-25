// BetaRegisterScreen — RN port of Lovable web src/pages/BetaRegister.tsx (36 LOC).
// Token-redemption surface that calls the `use_beta_invitation` Postgres RPC.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

export default function BetaRegisterScreen() {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const { data } = await supabase.rpc('use_beta_invitation' as any, { token, new_user_id: user.id } as any);
      if (data) Alert.alert('Beta access granted!');
      else Alert.alert('Invalid or expired token.');
    } catch {
      Alert.alert('Error redeeming token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <Card style={{ marginTop: spacing.md }}>
          <CardHeader>
            <CardTitle>Join the Beta</CardTitle>
            <CardDescription>Enter your invitation token.</CardDescription>
          </CardHeader>
          <CardContent style={s.cardBody}>
            <Text style={s.label}>Token</Text>
            <TextInput
              style={s.input}
              placeholder="Enter token"
              placeholderTextColor={colors.mutedForeground}
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              editable={!loading}
            />
            <Pressable style={[s.primaryBtn, (!token || loading) && s.primaryBtnDisabled]} onPress={handleRedeem} disabled={loading || !token}>
              {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.primaryBtnText}>Redeem</Text>}
            </Pressable>
            {!user ? <Text style={s.note}>Sign in first to redeem a token.</Text> : null}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  cardBody: { gap: spacing.sm },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md, color: colors.foreground, backgroundColor: colors.card, fontFamily: typography.fontFamily.body },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: spacing.md, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.primaryForeground },
  note: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center' },
});
