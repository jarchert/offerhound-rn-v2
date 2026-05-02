// QuickStartOrganizationScreen — RN port of Lovable src/pages/QuickStartOrganization.tsx (174 LOC).
// 2-step quick start (Terms → Info) that creates a scout_organizations row + ensures
// the user has a scout_profiles row linked to the new organization.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Zap, ArrowRight, ArrowLeft, CheckCircle, Building2, Globe } from 'lucide-react-native';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
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

const organizationTypes = ['Scouting Agency', 'Recruiting Service', 'Talent Evaluation', 'Sports Consulting', 'Media/Content', 'Other'];
const teamSizes = ['1-5 members', '6-10 members', '11-25 members', '25+ members'];

export default function QuickStartOrganizationScreen() {
  const nav = useNavigation<Nav>();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasAccepted: hasAcceptedTerms, isLoading: termsLoading } = useHasAcceptedTerms();
  const acceptTerms = useAcceptTerms();
  const { isLoading: roleLoading, currentRole, redirectPath } = useRoleGuard('organization');

  const [step, setStep] = useState<'terms' | 'info'>('terms');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', organization_type: '', website: '', description: '', team_size: '', contact_email: '' });

  useEffect(() => {
    if (!roleLoading && redirectPath && currentRole && currentRole !== 'none' && currentRole !== 'organization') {
      const message = getRoleConflictMessage(currentRole);
      toast({ title: message.title, description: message.description });
      nav.goBack();
    }
  }, [roleLoading, redirectPath, currentRole, nav, toast]);

  useEffect(() => {
    if (!termsLoading && hasAcceptedTerms && step === 'terms') setStep('info');
  }, [hasAcceptedTerms, termsLoading, step]);

  useEffect(() => { if (user?.email) setFormData(p => ({ ...p, contact_email: user.email || '' })); }, [user]);

  if (roleLoading || (redirectPath && currentRole && currentRole !== 'none' && currentRole !== 'organization')) {
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
    if (!formData.name.trim()) return toast({ title: 'Required', description: 'Please enter your organization name', variant: 'destructive' });
    if (!formData.organization_type) return toast({ title: 'Required', description: 'Please select an organization type', variant: 'destructive' });
    if (!formData.contact_email.trim()) return toast({ title: 'Required', description: 'Please enter a contact email', variant: 'destructive' });

    setIsSubmitting(true);
    try {
      if (!user) { nav.navigate('AuthStack' as any); setIsSubmitting(false); return; }

      const { data: existingScout } = await supabase.from('scout_profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (!existingScout) {
        const { error: scoutError } = await supabase.from('scout_profiles').insert({
          user_id: user.id, name: user.email?.split('@')[0] || 'Scout', email: user.email || formData.contact_email,
          title: 'Organization Owner', specialization: 'General', regions_covered: ['National'], is_verified: false, is_independent: false,
        } as any);
        if (scoutError && (scoutError as any).code !== '23505') throw scoutError;
      }

      const { data: newOrg, error } = await supabase.from('scout_organizations').insert({
        owner_user_id: user.id, name: formData.name, organization_type: formData.organization_type,
        website: formData.website || null, description: formData.description || null,
        contact_email: formData.contact_email, is_verified: false,
      } as any).select('id').single();

      if (error) {
        if ((error as any).code === '23505') toast({ title: 'Organization Exists', description: 'An organization with this name already exists.', variant: 'destructive' });
        else throw error;
      } else if (newOrg) {
        const { data: verified } = await supabase.from('scout_organizations').select('id').eq('id', (newOrg as any).id).single();
        if (!verified) throw new Error('Organization created but not accessible');
        const { error: linkError } = await supabase.from('scout_profiles').update({ organization_id: (newOrg as any).id, is_independent: false } as any).eq('user_id', user.id);
        if (linkError) console.error('Error linking scout to organization:', linkError);
        toast({ title: 'Organization Created!', description: 'Your scouting organization is now registered.' });
        setShowCompleteDialog(true);
      }
    } catch (e) {
      console.error('Error creating organization:', e);
      toast({ title: 'Error', description: 'Failed to create organization. Please try again.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const stepIdx = step === 'terms' ? 0 : 1;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={16} color={colors.foregroundSubtle} />
          <Text style={s.backLabel}>Back</Text>
        </Pressable>

        <View style={s.headerWrap}>
          <View style={s.pill}>
            <Zap size={18} color={colors.primary} />
            <Text style={s.pillText}>Organization Quick Start</Text>
            <View style={s.timeBadge}><Text style={s.timeBadgeText}>~3 min</Text></View>
          </View>
          <Text style={s.h1}>Register Your Organization</Text>
          <Text style={s.subtitle}>Set up your scouting agency and build your team.</Text>
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
                <Button variant="ghost" onPress={() => nav.navigate('ScoutOnboarding' as any)} leftIcon={<ArrowLeft size={16} color={colors.foregroundSubtle} />}>
                  Register as individual scout
                </Button>
              </View>
            </CardContent>
          </Card>
        )}

        {step === 'info' && (
          <Card>
            <CardHeader>
              <View style={s.titleRow}>
                <Building2 size={20} color={colors.foreground} />
                <CardTitle> Organization Info</CardTitle>
              </View>
              <CardDescription>Tell us about your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <View style={s.field}><Label>Organization Name *</Label><Input value={formData.name} onChangeText={v => update('name', v)} placeholder="Your Organization Name" /></View>
              <View style={s.field}>
                <Label>Organization Type *</Label>
                <Select value={formData.organization_type} onValueChange={v => update('organization_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{organizationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </View>
              <View style={s.field}>
                <Label>Contact Email *</Label>
                <Input value={formData.contact_email} onChangeText={v => update('contact_email', v)} placeholder="contact@organization.com" keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={s.field}>
                <Label>Website (optional)</Label>
                <View>
                  <View style={s.iconLeft}><Globe size={18} color={colors.mutedForeground} /></View>
                  <Input value={formData.website} onChangeText={v => update('website', v)} placeholder="https://www.yoursite.com" autoCapitalize="none" style={{ paddingLeft: 38 }} />
                </View>
              </View>
              <View style={s.field}>
                <Label>Team Size (optional)</Label>
                <Select value={formData.team_size} onValueChange={v => update('team_size', v)}>
                  <SelectTrigger><SelectValue placeholder="Select team size" /></SelectTrigger>
                  <SelectContent>{teamSizes.map(sz => <SelectItem key={sz} value={sz}>{sz}</SelectItem>)}</SelectContent>
                </Select>
              </View>
              <View style={s.field}>
                <Label>Description (optional)</Label>
                <Textarea value={formData.description} onChangeText={v => update('description', v)} placeholder="Tell us about your organization..." rows={4} />
              </View>

              <View style={s.actionsRow}>
                <Button variant="outline" onPress={() => setStep('terms')} leftIcon={<ArrowLeft size={16} color={colors.foreground} />} style={{ flex: 1 }}>Back</Button>
                <Button onPress={handleSubmit} disabled={isSubmitting} loading={isSubmitting} rightIcon={<ArrowRight size={18} color={colors.primaryForeground} />} style={{ flex: 1 }}>Create Organization</Button>
              </View>
            </CardContent>
          </Card>
        )}
      </ScrollView>

      <QuickStartCompleteDialog isOpen={showCompleteDialog} onClose={() => setShowCompleteDialog(false)} userType="organization" userName={formData.name} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backLabel: { color: colors.foregroundSubtle, fontSize: typography.fontSize.sm },
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
