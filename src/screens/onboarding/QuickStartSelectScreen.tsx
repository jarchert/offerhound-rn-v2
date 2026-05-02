// QuickStartSelectScreen — RN port of Lovable src/pages/QuickStartSelect.tsx (105 LOC).
// Lets the user pick a role and routes into the matching quick-start flow.
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Zap, Trophy, Users, Binoculars, Building2, Megaphone, Clock, CheckCircle2, ArrowRight,
  LucideIcon,
} from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing } from '@/lib/theme';
import type { OnboardingStackParamList } from '@/navigation/stacks/OnboardingStack';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

type RoleId = 'athlete' | 'coach' | 'scout' | 'organization' | 'influencer';

interface RoleOption {
  id: RoleId;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  route: keyof OnboardingStackParamList;
  time: string;
  badge?: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { id: 'athlete', icon: Trophy, title: 'Athlete', description: 'High school or college athlete looking to get recruited', features: ['Create a shareable profile', 'Get discovered by coaches', 'AI-powered recruiting tools'], route: 'QuickStartAthlete', time: '~2 min' },
  { id: 'coach', icon: Users, title: 'College Coach', description: 'College coach looking to discover and recruit athletes', features: ['Search athlete database', 'Save and track prospects', 'Direct athlete contact'], route: 'QuickStartCoach', time: '~2 min' },
  { id: 'scout', icon: Binoculars, title: 'Scout', description: 'Independent scout evaluating and recommending talent', features: ['Build scouting board', 'Connect with coaches', 'Export scouting reports'], route: 'QuickStartScout', time: '~2 min' },
  { id: 'organization', icon: Building2, title: 'Scouting Agency', description: 'Scouting organization with multiple team members', features: ['Team collaboration', 'Shared athlete boards', 'Agency branding'], route: 'QuickStartOrganization', time: '~3 min' },
  { id: 'influencer', icon: Megaphone, title: 'Creator / Influencer', description: 'Sports media, analyst, podcaster, or content creator', features: ['Content library + media bin', 'Social syndication via webhooks', 'Sports news feed & messaging'], route: 'InfluencerOnboarding', time: '~3 min', badge: 'New' },
];

export default function QuickStartSelectScreen() {
  const nav = useNavigation<Nav>();
  const [selected, setSelected] = useState<RoleId | null>(null);

  const onContinue = () => {
    const role = ROLE_OPTIONS.find(r => r.id === selected);
    if (role) nav.navigate(role.route as any);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton style={{ marginBottom: spacing.sm }} />

        <View style={s.headerWrap}>
          <View style={s.pill}>
            <Zap size={18} color={colors.primary} />
            <Text style={s.pillText}>Quick Start</Text>
          </View>
          <Text style={s.h1}>WELCOME TO OFFERHOUND</Text>
          <Text style={s.subtle}>Get started in minutes. Choose your role to create your profile.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          {ROLE_OPTIONS.map(role => {
            const Icon = role.icon;
            const isSelected = selected === role.id;
            return (
              <Pressable
                key={role.id}
                onPress={() => setSelected(role.id)}
                style={[s.card, isSelected && s.cardSelected]}
              >
                {role.badge ? (
                  <View style={s.badge}><Text style={s.badgeText}>{role.badge}</Text></View>
                ) : null}
                <View style={s.cardHeader}>
                  <View style={[s.iconWrap, isSelected && s.iconWrapSelected]}>
                    <Icon size={24} color={isSelected ? colors.primaryForeground : colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.cardTitle}>{role.title}</Text>
                      {isSelected && <CheckCircle2 size={18} color={colors.primary} />}
                    </View>
                    <Text style={s.cardDesc}>{role.description}</Text>
                  </View>
                </View>
                <View style={{ gap: 6, marginTop: spacing.sm }}>
                  {role.features.map((f, i) => (
                    <View key={i} style={s.featureRow}>
                      <CheckCircle2 size={14} color={colors.primary} />
                      <Text style={s.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.timeRow}>
                  <Clock size={14} color={colors.mutedForeground} />
                  <Text style={s.timeText}>{role.time}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[s.continueBtn, !selected && s.btnDisabled]}
          disabled={!selected}
          onPress={onContinue}
        >
          <Text style={s.continueBtnText}>Continue</Text>
          <ArrowRight size={20} color={colors.primaryForeground} />
        </Pressable>

        <Text style={s.signInText}>
          Already have an account?{' '}
          <Text style={s.link} onPress={() => nav.getParent()?.navigate('AuthStack' as any)}>Sign in</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  headerWrap: { alignItems: 'center', gap: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(231,175,8,0.10)', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999 },
  pillText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.base, color: colors.primary },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading, textAlign: 'center' },
  subtle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  iconWrapSelected: { backgroundColor: colors.primary },
  cardTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  cardDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  timeText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  badge: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, zIndex: 2 },
  badgeText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.primaryForeground },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, marginTop: spacing.md },
  continueBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.primaryForeground },
  btnDisabled: { opacity: 0.5 },
  signInText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
  link: { color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
});
