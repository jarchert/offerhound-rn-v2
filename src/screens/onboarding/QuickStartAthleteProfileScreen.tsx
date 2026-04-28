// QuickStartAthleteProfileScreen — RN port of Lovable src/pages/QuickStart.tsx (~108 LOC).
// Multi-step athlete profile creation wizard:
//   1. Terms acceptance
//   2. Basic info (name, sport, custom URL, positions) + URL availability check
//   3. Profile photo
//   4. Preview + publish (gated by subscription via publishProfile -> PublishPaywallDialog)
// Saves to player_profiles via usePlayerProfile().createProfile / updateProfile.
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable, Image, ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp, CommonActions } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  Zap, ArrowRight, ArrowLeft, CheckCircle, User, Camera, Share2, Link2, ExternalLink,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { supabase } from '@/integrations/supabase/client';
import { SPORTS_LIST } from '@/lib/data/sports';
import { getPositionsForSport } from '@/lib/data/sportPositions';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { PublishPaywallDialog } from '@/components/PublishPaywallDialog';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Step = 'terms' | 'info' | 'photo' | 'publish';
const STEPS: Step[] = ['terms', 'info', 'photo', 'publish'];
type Nav = NavigationProp<RootStackParamList>;

export default function QuickStartAthleteProfileScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { profile, isLoading, createProfile, updateProfile, publishProfile, checkUrlAvailability } = usePlayerProfile();

  const [step, setStep] = useState<Step>('terms');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const [form, setForm] = useState({
    sport: 'football',
    custom_url: '',
    full_name: '',
    positions: [] as string[],
  });
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [urlAvailable, setUrlAvailable] = useState<boolean | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        sport: (profile as any).sport || 'football',
        custom_url: (profile as any).custom_url || '',
        full_name: (profile as any).full_name || '',
        positions: Array.isArray((profile as any).positions)
          ? ((profile as any).positions as string[])
          : (profile as any).position
            ? [(profile as any).position]
            : [],
      });
      setProfileImageUrl((profile as any).profile_image_url ?? null);
    }
  }, [profile]);

  const positions = getPositionsForSport(form.sport);

  const formatUrl = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const togglePosition = (label: string) => {
    setForm((p) => {
      if (p.positions.includes(label)) return { ...p, positions: p.positions.filter((x) => x !== label) };
      if (p.positions.length >= 3) return p;
      return { ...p, positions: [...p.positions, label] };
    });
  };

  const handleAcceptTerms = () => {
    if (!termsAgreed) return;
    setStep('info');
  };

  // URL availability check — fires onBlur for the custom URL field, mirroring Lovable.
  const handleUrlBlur = async () => {
    const u = formatUrl(form.custom_url);
    setForm((p) => ({ ...p, custom_url: u }));
    if (u.length >= 3) {
      setCheckingUrl(true);
      try {
        const available = await checkUrlAvailability(u);
        setUrlAvailable(available);
      } catch {
        setUrlAvailable(null);
      } finally {
        setCheckingUrl(false);
      }
    } else {
      setUrlAvailable(null);
    }
  };

  const handleInfoNext = async () => {
    const customUrl = formatUrl(form.custom_url);
    if (!form.full_name.trim() || customUrl.length < 3 || form.positions.length === 0) {
      Toast.show({ type: 'error', text1: 'Required fields', text2: 'Name, URL, and at least one position' });
      return;
    }
    if (urlAvailable === false) {
      Toast.show({ type: 'error', text1: 'URL taken', text2: 'Please choose a different profile URL' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name,
        sport: form.sport,
        custom_url: customUrl,
        position: form.positions[0],
        positions: form.positions,
      };
      if (profile) await updateProfile(payload);
      else await createProfile(payload);
      setStep('photo');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Permission denied' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    if (!user) return;
    setSubmitting(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/profile-${Date.now()}.${ext}`;
      const fileBlob = await (await fetch(asset.uri)).blob();
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, fileBlob, {
        contentType: `image/${ext}`,
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;
      await updateProfile({ profile_image_url: url });
      setProfileImageUrl(url);
      Toast.show({ type: 'success', text1: 'Photo updated' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setSubmitting(true);
    try {
      // publishProfile() enforces subscription gating for athletes/parents and
      // throws an Error with code === 'SUBSCRIPTION_REQUIRED' when the user is
      // not subscribed. We surface that via the PublishPaywallDialog.
      await publishProfile();
      Toast.show({ type: 'success', text1: 'Profile published!' });
      nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'AthleteTabs' as any }] }));
    } catch (e: any) {
      if (e?.code === 'SUBSCRIPTION_REQUIRED' || e?.message === 'SUBSCRIPTION_REQUIRED') {
        setShowPaywall(true);
      } else {
        Toast.show({ type: 'error', text1: 'Publish failed', text2: e?.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerCenter}>
          <View style={s.pill}>
            <Zap size={14} color={colors.primary} />
            <Text style={s.pillText}>Quick Start</Text>
          </View>
          <Text style={s.h1}>Get Live in Minutes</Text>
        </View>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {STEPS.map((sName, i) => {
            const idx = STEPS.indexOf(step);
            const done = idx > i;
            const active = step === sName;
            return (
              <React.Fragment key={sName}>
                <View style={[s.stepBubble, (active || done) && s.stepBubbleActive]}>
                  {done ? (
                    <CheckCircle size={14} color={colors.primaryForeground} />
                  ) : (
                    <Text style={[s.stepNum, (active || done) && s.stepNumActive]}>{i + 1}</Text>
                  )}
                </View>
                {i < STEPS.length - 1 && <View style={[s.stepLine, idx > i && s.stepLineActive]} />}
              </React.Fragment>
            );
          })}
        </View>

        {step === 'terms' && (
          <Card>
            <CardHeader><CardTitle>Quick Terms</CardTitle></CardHeader>
            <CardContent style={{ gap: spacing.md }}>
              <Pressable style={s.termsBox} onPress={() => setTermsAgreed(!termsAgreed)}>
                <Checkbox checked={termsAgreed} onCheckedChange={setTermsAgreed} />
                <Text style={s.termsText}>
                  I agree to the Terms of Service and Privacy Policy.
                </Text>
              </Pressable>
              <Button onPress={handleAcceptTerms} disabled={!termsAgreed} rightIcon={<ArrowRight size={14} color={colors.primaryForeground} />}>
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'info' && (
          <Card>
            <CardHeader>
              <View style={s.row}>
                <User size={18} color={colors.foreground} />
                <CardTitle>Basic Info</CardTitle>
              </View>
            </CardHeader>
            <CardContent style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Label>Sport *</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.chipRow}>
                    {SPORTS_LIST.slice(0, 12).map((sp: any) => {
                      const active = form.sport === sp.id;
                      return (
                        <Pressable
                          key={sp.id}
                          onPress={() => setForm({ ...form, sport: sp.id, positions: [] })}
                          style={[s.chip, active && s.chipActive]}>
                          <Text style={[s.chipText, active && s.chipTextActive]}>{sp.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Label>Full name *</Label>
                <Input
                  value={form.full_name}
                  onChangeText={(v) => setForm({ ...form, full_name: v })}
                  placeholder="Enter your full name"
                />
              </View>

              <View style={{ gap: spacing.xs }}>
                <Label>Profile URL *</Label>
                <Input
                  value={form.custom_url}
                  onChangeText={(v) => {
                    setForm({ ...form, custom_url: v });
                    setUrlAvailable(null);
                  }}
                  onBlur={handleUrlBlur}
                  placeholder="your-name"
                  autoCapitalize="none"
                />
                {!!form.custom_url && (
                  <Text style={s.muted}>offer-hound.com/p/{formatUrl(form.custom_url)}</Text>
                )}
                {checkingUrl && <Text style={s.muted}>Checking availability…</Text>}
                {!checkingUrl && urlAvailable === true && (
                  <View style={s.row}>
                    <CheckCircle size={12} color="#16a34a" />
                    <Text style={[s.muted, { color: '#16a34a' }]}>Available!</Text>
                  </View>
                )}
                {!checkingUrl && urlAvailable === false && (
                  <Text style={[s.muted, { color: colors.destructive }]}>This URL is taken</Text>
                )}
              </View>

              <View style={{ gap: spacing.xs }}>
                <View style={s.rowBetween}>
                  <Label>Position(s) *</Label>
                  <Text style={s.muted}>Up to 3</Text>
                </View>
                <View style={s.chipWrap}>
                  {positions.slice(0, 30).map((p) => {
                    const active = form.positions.includes(p.label);
                    return (
                      <Pressable
                        key={p.label}
                        onPress={() => togglePosition(p.label)}
                        style={[s.chipSm, active && s.chipActive]}>
                        <Text style={[s.chipText, active && s.chipTextActive]}>{p.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {form.positions.length > 0 && (
                  <View style={[s.chipWrap, { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.xs }]}>
                    {form.positions.map((p) => (
                      <Badge key={p} variant="secondary">{p}</Badge>
                    ))}
                  </View>
                )}
              </View>

              <View style={s.actionsRow}>
                <Button variant="outline" style={{ flex: 1 }} onPress={() => setStep('terms')} leftIcon={<ArrowLeft size={14} color={colors.foreground} />}>
                  Back
                </Button>
                <Button style={{ flex: 1 }} onPress={handleInfoNext} loading={submitting} rightIcon={<ArrowRight size={14} color={colors.primaryForeground} />}>
                  Next
                </Button>
              </View>
            </CardContent>
          </Card>
        )}

        {step === 'photo' && (
          <Card>
            <CardHeader>
              <View style={s.row}>
                <Camera size={18} color={colors.foreground} />
                <CardTitle>Profile Photo</CardTitle>
              </View>
            </CardHeader>
            <CardContent style={{ gap: spacing.md }}>
              <View style={s.photoBox}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={s.photo} />
                ) : (
                  <View style={[s.photo, s.photoPlaceholder]}>
                    <User size={42} color={colors.mutedForeground} />
                  </View>
                )}
              </View>
              <Button onPress={pickImage} loading={submitting} variant="outline" leftIcon={<Camera size={14} color={colors.foreground} />}>
                {profileImageUrl ? 'Change photo' : 'Upload photo'}
              </Button>
              <View style={s.actionsRow}>
                <Button variant="outline" style={{ flex: 1 }} onPress={() => setStep('info')} leftIcon={<ArrowLeft size={14} color={colors.foreground} />}>
                  Back
                </Button>
                <Button style={{ flex: 1 }} onPress={() => setStep('publish')} rightIcon={<ArrowRight size={14} color={colors.primaryForeground} />}>
                  Next
                </Button>
              </View>
              <Pressable onPress={() => setStep('publish')}>
                <Text style={[s.muted, { textAlign: 'center' }]}>Skip for now</Text>
              </Pressable>
            </CardContent>
          </Card>
        )}

        {step === 'publish' && (
          <Card>
            <CardHeader>
              <View style={s.row}>
                <Share2 size={18} color={colors.foreground} />
                <CardTitle>Ready to Go Live!</CardTitle>
              </View>
            </CardHeader>
            <CardContent style={{ gap: spacing.md }}>
              <View style={s.previewCard}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={s.previewPhoto} />
                ) : (
                  <View style={[s.previewPhoto, s.photoPlaceholder]}>
                    <User size={32} color={colors.mutedForeground} />
                  </View>
                )}
                <Text style={s.previewName}>{form.full_name}</Text>
                <View style={s.chipWrap}>
                  {form.positions.map((p) => (
                    <Badge key={p} variant="secondary">{p}</Badge>
                  ))}
                </View>
              </View>
              <View style={s.urlBox}>
                <View style={s.row}>
                  <Link2 size={14} color={colors.primary} />
                  <Text style={s.muted}>Your URL:</Text>
                </View>
                <Text style={s.urlText}>offer-hound.com/p/{formatUrl(form.custom_url)}</Text>
              </View>
              <View style={s.actionsRow}>
                <Button variant="outline" style={{ flex: 1 }} onPress={() => setStep('photo')} leftIcon={<ArrowLeft size={14} color={colors.foreground} />}>
                  Back
                </Button>
                <Button style={{ flex: 1 }} onPress={handlePublish} loading={submitting} rightIcon={<ExternalLink size={14} color={colors.primaryForeground} />}>
                  Publish
                </Button>
              </View>
            </CardContent>
          </Card>
        )}
      </ScrollView>
      <PublishPaywallDialog open={showPaywall} onOpenChange={setShowPaywall} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl, maxWidth: 600, alignSelf: 'stretch' },
  headerCenter: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: 'rgba(231,175,8,0.1)' },
  pillText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primary },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading, textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm },
  stepBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  stepBubbleActive: { backgroundColor: colors.primary },
  stepNum: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  stepNumActive: { color: colors.primaryForeground },
  stepLine: { width: 32, height: 2, backgroundColor: colors.muted, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.primary },
  termsBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.muted, borderRadius: 12, alignItems: 'flex-start' },
  termsText: { flex: 1, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipSm: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  chipTextActive: { color: colors.primaryForeground },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  photoBox: { alignItems: 'center', paddingVertical: spacing.md },
  photo: { width: 128, height: 128, borderRadius: 64 },
  photoPlaceholder: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border },
  previewCard: { padding: spacing.lg, backgroundColor: colors.muted, borderRadius: 16, alignItems: 'center', gap: spacing.sm },
  previewPhoto: { width: 96, height: 96, borderRadius: 48 },
  previewName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.xl, color: colors.foreground },
  urlBox: { padding: spacing.md, borderRadius: 12, backgroundColor: 'rgba(231,175,8,0.08)', gap: spacing.xs },
  urlText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primary },
});
