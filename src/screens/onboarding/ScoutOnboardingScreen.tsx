// ScoutOnboardingScreen — RN port of Lovable src/pages/ScoutOnboarding.tsx (154 LOC).
// 3-step flow: Personal → Specialization → Review, then create scout profile.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useScoutProfile, useCreateScoutProfile } from '@/hooks/useScoutProfile';
import { colors, typography, spacing } from '@/lib/theme';
import type { OnboardingStackParamList } from '@/navigation/stacks/OnboardingStack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList & RootStackParamList>;

const STEPS = ['Personal Info', 'Specialization', 'Review'];
const SPORTS = ['football', 'basketball', 'baseball', 'soccer', 'softball', 'volleyball', 'track', 'swimming', 'tennis', 'golf', 'lacrosse', 'wrestling'];

export default function ScoutOnboardingScreen() {
  const nav = useNavigation<Nav>();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: existingProfile, isLoading: profileLoading } = useScoutProfile() as any;
  const createProfile = useCreateScoutProfile() as any;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', title: '', email: user?.email || '', phone: '',
    specialization: 'football', bio: '', years_experience: '',
    city: '', state: '',
    twitter: '', instagram: '', tiktok: '', youtube: '', facebook: '',
  });

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      nav.navigate('Auth' as any);
    }
  }, [authLoading, isAuthenticated, nav]);

  useEffect(() => {
    if (!authLoading && !profileLoading && existingProfile && (existingProfile as any)?.onboarding_complete) {
      nav.navigate('ScoutTabs' as any);
    }
  }, [authLoading, profileLoading, existingProfile, nav]);

  useEffect(() => {
    if (user?.email && !form.email) update('email', user.email);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    try {
      await createProfile.mutateAsync({
        name: form.name, title: form.title, email: form.email,
        phone: form.phone || null, specialization: form.specialization,
        bio: form.bio || null, city: form.city || null, state: form.state || null,
        onboarding_complete: true,
      });
      toast({ title: 'Scout profile created!' });
      nav.navigate('ScoutTabs' as any);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to create profile', variant: 'destructive' });
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <Text style={s.h1}>SCOUT SETUP</Text>
        <Text style={s.sub}>Complete your scout profile to start evaluating talent.</Text>

        <View style={s.progress}>
          {STEPS.map((label, i) => (
            <View key={label} style={[s.progressBar, i <= step && s.progressBarActive]} />
          ))}
        </View>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>Step {step + 1} of {STEPS.length}</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.md }}>
            {step === 0 && (
              <>
                <View><Label>Full Name *</Label><Input value={form.name} onChangeText={v => update('name', v)} placeholder="John Smith" /></View>
                <View><Label>Title</Label><Input value={form.title} onChangeText={v => update('title', v)} placeholder="Regional Scout" /></View>
                <View><Label>Email *</Label><Input value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" autoCapitalize="none" /></View>
                <View><Label>Phone</Label><Input value={form.phone} onChangeText={v => update('phone', v)} placeholder="(555) 123-4567" keyboardType="phone-pad" /></View>
                <View><Label>City</Label><Input value={form.city} onChangeText={v => update('city', v)} /></View>
                <View><Label>State</Label><Input value={form.state} onChangeText={v => update('state', v)} /></View>
                <Button onPress={() => setStep(1)} disabled={!form.name || !form.email}>Continue</Button>
              </>
            )}
            {step === 1 && (
              <>
                <View>
                  <Label>Primary Sport</Label>
                  <Select value={form.specialization} onValueChange={v => update('specialization', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPORTS.map(sp => <SelectItem key={sp} value={sp}>{sp}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </View>
                <View><Label>Years of Experience</Label><Input value={form.years_experience} onChangeText={v => update('years_experience', v)} keyboardType="number-pad" /></View>
                <View><Label>Bio</Label><Textarea value={form.bio} onChangeText={v => update('bio', v)} placeholder="Tell coaches and athletes about your scouting background..." /></View>

                <View style={s.divider} />
                <View><Label>X (Twitter)</Label><Input value={form.twitter} onChangeText={v => update('twitter', v)} placeholder="@handle" autoCapitalize="none" /></View>
                <View><Label>Instagram</Label><Input value={form.instagram} onChangeText={v => update('instagram', v)} placeholder="@handle" autoCapitalize="none" /></View>
                <View><Label>TikTok</Label><Input value={form.tiktok} onChangeText={v => update('tiktok', v)} placeholder="@handle" autoCapitalize="none" /></View>
                <View><Label>YouTube</Label><Input value={form.youtube} onChangeText={v => update('youtube', v)} placeholder="@channel" autoCapitalize="none" /></View>
                <View><Label>Facebook</Label><Input value={form.facebook} onChangeText={v => update('facebook', v)} placeholder="Page or profile URL" autoCapitalize="none" /></View>

                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(0)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={() => setStep(2)} style={{ flex: 1 }}>Continue</Button>
                </View>
              </>
            )}
            {step === 2 && (
              <>
                <View style={{ gap: spacing.sm }}>
                  {([
                    ['Name', form.name],
                    ['Title', form.title],
                    ['Email', form.email],
                    ['Sport', form.specialization],
                    ['Location', [form.city, form.state].filter(Boolean).join(', ') || '—'],
                  ] as const).map(([label, val]) => (
                    <View key={label} style={s.reviewRow}>
                      <Text style={s.reviewKey}>{label}</Text>
                      <Text style={s.reviewVal}>{val || '—'}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.row}>
                  <Button variant="outline" onPress={() => setStep(1)} style={{ flex: 1 }}>Back</Button>
                  <Button onPress={handleSubmit} disabled={!!createProfile.isPending} style={{ flex: 1 }} leftIcon={<CheckCircle size={16} color={colors.primaryForeground} />}>
                    {createProfile.isPending ? 'Creating...' : 'Create Profile'}
                  </Button>
                </View>
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading, marginTop: spacing.md },
  sub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, marginBottom: spacing.md },
  progress: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  progressBar: { flex: 1, height: 6, borderRadius: 999, backgroundColor: colors.muted },
  progressBarActive: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewKey: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  reviewVal: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground, textTransform: 'capitalize' },
});
