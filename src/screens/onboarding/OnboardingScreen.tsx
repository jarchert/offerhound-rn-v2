import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/integrations/supabase/types';
import { colors, typography, spacing } from '@/lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLES: { key: AppRole; label: string; emoji: string; desc: string }[] = [
  { key: 'athlete', label: 'Athlete', emoji: '🏆', desc: 'Looking to get recruited for college sports' },
  { key: 'coach', label: 'College Coach', emoji: '📋', desc: 'Recruiting athletes for your program' },
  { key: 'scout', label: 'Scout', emoji: '🔍', desc: 'Evaluating and identifying talent' },
  { key: 'parent', label: 'Parent', emoji: '👨‍👩‍👧', desc: 'Supporting your athlete through recruiting' },
  { key: 'influencer', label: 'Influencer', emoji: '📢', desc: 'Creating content for the recruiting community' },
  { key: 'high_school_coach', label: 'HS Coach', emoji: '🏫', desc: 'Endorsing and supporting your athletes' },
  { key: 'club_coach', label: 'Club Coach', emoji: '⚽', desc: 'Managing club athletes and camps' },
  { key: 'agency' as AppRole, label: 'Agency', emoji: '🏢', desc: 'Multi-recruiter scouting organization' },
];

export default function OnboardingScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedRole || !user) return;
    setLoading(true);
    await supabase.from('user_roles').upsert({ user_id: user.id, role: selectedRole });
    setLoading(false);
    // Navigate to the appropriate role-specific navigator
    switch (selectedRole) {
      case 'athlete':
      case 'parent':
        nav.navigate('AthleteTabs' as any);
        break;
      case 'coach':
        nav.navigate('CoachDrawer' as any);
        break;
      case 'scout':
        nav.navigate('ScoutDrawer' as any);
        break;
      case 'influencer':
        nav.navigate('InfluencerDrawer' as any);
        break;
      case 'high_school_coach':
        nav.navigate('HSCoachDrawer' as any);
        break;
      case 'club_coach':
        nav.navigate('ClubCoachDrawer' as any);
        break;
      case 'agency' as AppRole:
        nav.navigate('AgencyDrawer' as any);
        break;
      default:
        nav.navigate('AthleteTabs' as any);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>WELCOME TO OFFERHOUND</Text>
        <Text style={s.subtitle}>Tell us about yourself so we can personalize your experience</Text>
        {ROLES.map(role => (
          <Pressable key={role.key} style={[s.roleCard, selectedRole === role.key && s.roleCardSelected]} onPress={() => setSelectedRole(role.key)}>
            <Text style={s.roleEmoji}>{role.emoji}</Text>
            <View style={s.roleInfo}>
              <Text style={s.roleLabel}>{role.label}</Text>
              <Text style={s.roleDesc}>{role.desc}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable style={[s.primaryBtn, (!selectedRole || loading) && s.disabled]} onPress={handleComplete} disabled={!selectedRole || loading}>
          <Text style={s.primaryBtnText}>Get Started</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.primary, letterSpacing: typography.letterSpacing.heading, textAlign: 'center' },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center' },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  roleCardSelected: { borderColor: colors.primary, backgroundColor: colors.secondary },
  roleEmoji: { fontSize: 32 },
  roleInfo: { flex: 1 },
  roleLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  roleDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.primaryForeground },
  disabled: { opacity: 0.5 },
});
