// QuickStartCoachScreen — RN port of Lovable src/pages/QuickStartCoach.tsx (155 LOC).
// 2-step quick start (Terms → Info) that creates a coach_profiles row.
// Web→RN mappings: react-router-dom→@react-navigation/native; useToast at @/hooks/use-toast;
// shadcn primitives (PascalCase) from @/components/ui/*; Tailwind→StyleSheet via @/lib/theme.
// SEO/Footer/cn omitted (no-op on native). Link→Linking.openURL for terms/privacy.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Zap, ArrowRight, ArrowLeft, CheckCircle, GraduationCap, Building } from 'lucide-react-native';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useHasAcceptedTerms, useAcceptTerms } from '@/hooks/useTermsAcceptance';
import { useRoleGuard, getRoleConflictMessage } from '@/hooks/useRoleGuard';
import { supabase } from '@/integrations/supabase/client';
import { QuickStartCompleteDialog } from '@/components/QuickStartCompleteDialog';
import { colors, typography, spacing } from '@/lib/theme';
import type { OnboardingStackParamList } from '@/navigation/stacks/OnboardingStack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList & RootStackParamList>;

const divisions = ['Division I (FBS)', 'Division I (FCS)', 'Division II', 'Division III', 'NAIA', 'JUCO', 'Other'];
const coachTitles = ['Head Coach', 'Offensive Coordinator', 'Defensive Coordinator', 'Position Coach', 'Graduate Assistant', 'Recruiting Coordinator', 'Director of Operations', 'Other'];

export default function QuickStartCoachScreen() {
  const nav = useNavigation<Nav>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasAccepted: hasAcceptedTerms, isLoading: termsLoading } = useHasAcceptedTerms();
  const acceptTerms = useAcceptTerms();
  const { isLoading: roleLoading, currentRole, redirectPath } = useRoleGuard('coach');

  const [step, setStep] = useState<'terms' | 'info'>('terms');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', school: '', title: '', division: '', position_coached: '' });

  useEffect(() => {
    if (!roleLoading && redirectPath && currentRole && currentRole !== 'none' && currentRole !== 'coach') {
      const message = getRoleConflictMessage(currentRole);
      toast({ title: message.title, description: message.description });
      // PORT-PENDING: redirectPath is a web path string; route mapping deferred.
      nav.goBack();
    }
  }, [roleLoading, redirectPath, currentRole, nav, toast]);

  useEffect(() => {
    if (!termsLoading && hasAcceptedTerms && step === 'terms') setStep('info');
  }, [hasAcceptedTerms, termsLoading, step]);

  useEffect(() => { if (user?.email) setFormData(p => ({ ...p, email: user.email || '' })); }, [user]);

  if (roleLoading || (redirectPath && currentRole && currentRole !== 'none' && currentRole !== 'coach')) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  if (termsLoading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  const update = (k: keyof typeof formData, v: string) => setFormData(p => ({ ...p, [k]: v }));

  const handleAcceptTerms = async () => {
    if (!termsAgreed) { toast({ title: 'Required', description: 'Please agree to the Terms of Use and Privacy Policy', variant: 'destructive' }); return; }
    setIsSubmitting(true);
    try { await acceptTerms.mutateAsync(); setStep('info'); } catch (e) { console.error('Error accepting terms:', e); }
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast({ title: 'Required', description: 'Please enter your name', variant: 'destructive' });
    if (!formData.email.trim()) return toast({ title: 'Required', description: 'Please enter your email', variant: 'destructive' });
    if (!formData.school.trim()) return toast({ title: 'Required', description: 'Please enter your school', variant: 'destructive' });
    if (!formData.title) return toast({ title: 'Required', description: 'Please select your title', variant: 'destructive' });
    if (!formData.division) return toast({ title: 'Required', description: 'Please select a division', variant: 'destructive' });

    setIsSubmitting(true);
    try {
      if (!user) { nav.navigate('Auth' as any); setIsSubmitting(false); return; }
      const { error } = await supabase.from('coach_profiles').insert({
        user_id: user.id, name: formData.name, email: formData.email, school: formData.school,
        title: formData.title, division: formData.division,
        position_coached: formData.position_coached || 'All Positions', conference: 'Unknown', is_verified: false,
      } as any);
      if (error) {
        if ((error as any).code === '23505') toast({ title: 'Profile Exists', description: 'A coach profile already exists for this account.', variant: 'destructive' });
        else throw error;
      } else {
        toast({ title: 'Profile Created!', description: 'Your coach profile is now active.' });
        setShowCompleteDialog(true);
      }
    } catch (e) {
      console.error('Error creating coach profile:', e);
      toast({ title: 'Error', description: 'Failed to create profile. Please try again.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const stepIdx = step === 'terms' ? 0 : 1;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.headerWrap}>
          <View style={s.pill}>
            <Zap size={18} color={colors.primary} />
            <Text style={s.pillText}>Coach Quick Start</Text>
            <View style={s.timeBadge}><Text style={s.timeBadgeText}>~2 min</Text></View>
          </View>
          <Text style={s.h1}>Get Recruiting in Minutes</Text>
          <Text style={s.subtitle}>Create your coach profile and start discovering athletes.</Text>
        </View>

        <View style={s.stepperRow}>
          {['terms', 'info'].map((sName, i) => (
            <View key={sName} style={s.stepperItem}>
              <View style={[s.stepDot, stepIdx >= i && s.stepDotActive]}>
                {stepIdx > i ? <CheckCircle size={18} color={colors.primaryForeground} /> : <Text style={[s.stepDotText, stepIdx >= i && s.stepDotTextActive]}>{i + 1}</Text>}
              </View>
              {i < 1 && <View style={[s.stepLine, stepIdx > i && s.stepLineActive]} />}
            </View>
          ))}
        </View>

        {step === 'terms' && (
          <Card>
            <CardHeader><CardTitle>Quick Terms</CardTitle><CardDescription>Accept our terms to get started</CardDescription></CardHeader>
            <CardContent>
              <Pressable onPress={() => setTermsAgreed(!termsAgreed)} style={s.termsRow}>
                <Checkbox checked={termsAgreed} onCheckedChange={v => setTermsAgreed(!!v)} />
                <Text style={s.termsText}>
                  I agree to the{' '}
                  <Text style={s.link} onPress={() => Linking.openURL('https://offerhound.com/terms')}>Terms of Use</Text>
                  {' '}and{' '}
                  <Text style={s.link} onPress={() => Linking.openURL('https://offerhound.com/privacy')}>Privacy Policy</Text>
                </Text>
              </Pressable>
              <Button onPress={handleAcceptTerms} disabled={isSubmitting || !termsAgreed} loading={isSubmitting} rightIcon={<ArrowRight size={18} color={colors.primaryForeground} />} style={{ marginTop: spacing.md }}>
                Continue
              </Button>
              <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                <Button variant="ghost" onPress={() => nav.navigate('CoachOnboarding' as any)} leftIcon={<ArrowLeft size={16} color={colors.foregroundSubtle} />}>
                  Full onboarding instead
                </Button>
              </View>
            </CardContent>
          </Card>
        )}

        {step === 'info' && (
          <Card>
            <CardHeader>
              <View style={s.titleRow}>
                <GraduationCap size={20} color={colors.foreground} />
                <CardTitle> Coach Info</CardTitle>
              </View>
              <CardDescription>The essentials for your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <View style={s.field}><Label>Full Name *</Label><Input value={formData.name} onChangeText={v => update('name', v)} placeholder="Coach John Smith" /></View>
              <View style={s.field}><Label>Email *</Label><Input value={formData.email} onChangeText={v => update('email', v)} placeholder="coach@university.edu" keyboardType="email-address" autoCapitalize="none" /></View>
              <View style={s.field}>
                <Label>School/University *</Label>
                <View>
                  <View style={s.iconLeft}><Building size={18} color={colors.mutedForeground} /></View>
                  <Input value={formData.school} onChangeText={v => update('school', v)} placeholder="State University" style={{ paddingLeft: 38 }} />
                </View>
              </View>
              <View style={s.field}>
                <Label>Title *</Label>
                <Select value={formData.title} onValueChange={v => update('title', v)}>
                  <SelectTrigger><SelectValue placeholder="Select your title" /></SelectTrigger>
                  <SelectContent>{coachTitles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </View>
              <View style={s.field}>
                <Label>Division *</Label>
                <Select value={formData.division} onValueChange={v => update('division', v)}>
                  <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>{divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </View>
              <View style={s.field}>
                <Label>Position Coached (optional)</Label>
                <Input value={formData.position_coached} onChangeText={v => update('position_coached', v)} placeholder="e.g., Quarterbacks, Linebackers" />
              </View>

              <View style={s.actionsRow}>
                <Button variant="outline" onPress={() => setStep('terms')} leftIcon={<ArrowLeft size={16} color={colors.foreground} />} style={{ flex: 1 }}>Back</Button>
                <Button onPress={handleSubmit} disabled={isSubmitting} loading={isSubmitting} rightIcon={<ArrowRight size={18} color={colors.primaryForeground} />} style={{ flex: 1 }}>Create Profile</Button>
              </View>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      <QuickStartCompleteDialog isOpen={showCompleteDialog} onClose={() => setShowCompleteDialog(false)} userType="coach" userName={formData.name} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  headerWrap: { alignItems: 'center', gap: spacing.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.muted, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999 },
  pillText: { color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm },
  timeBadge: { backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginLeft: 4 },
  timeBadgeText: { color: colors.primary, fontSize: typography.fontSize.xs },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, textAlign: 'center' },
  subtitle: { color: colors.foregroundSubtle, fontSize: typography.fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.md },
  stepperRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  stepperItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotText: { color: colors.foregroundSubtle, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodySemiBold },
  stepDotTextActive: { color: colors.primaryForeground },
  stepLine: { width: 60, height: 2, backgroundColor: colors.muted, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.primary },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, backgroundColor: colors.muted, borderRadius: 12 },
  termsText: { flex: 1, color: colors.foreground, fontSize: typography.fontSize.sm, lineHeight: 20 },
  link: { color: colors.primary, textDecorationLine: 'underline', fontFamily: typography.fontFamily.bodySemiBold },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  field: { gap: 6, marginBottom: spacing.md },
  iconLeft: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
