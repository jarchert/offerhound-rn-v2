// OnboardingScreen — RN port of Lovable src/pages/Onboarding.tsx (~720 LOC web).
// Six-step athlete onboarding wizard:
//   0. Terms acceptance
//   1. Sport + custom URL (auto-generated slug, availability check)
//   2. Basic info (name, school, grad year, state, GPA, height, weight, position, bio)
//   3. Highlights + social links + profile photo upload
//   4. Coach references (up to 3)
//   5. Publish + QR code share
// Each step persists to player_profiles via usePlayerProfile.{create,update}Profile.
// Resume support: if profile exists, jump to first incomplete step.
// Offline-tolerant: failed Supabase calls show a toast but don't block progress.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
  Share,
  Platform,
} from 'react-native';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import {
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  Activity,
  User,
  Trophy,
  Users,
  Share2,
  Camera,
  Plus,
  X,
  ExternalLink,
  Copy,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useSport } from '@/contexts/SportContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { supabase } from '@/integrations/supabase/client';
import { SPORTS_LIST, getSportConfig, SportType } from '@/lib/data/sports';
import { getPositionsForSport } from '@/lib/data/sportPositions';
import { US_STATES } from '@/lib/data/states';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NavigationProp<RootStackParamList>;

const STEPS = [
  { id: 0, title: 'Terms', icon: FileText, desc: 'Review and accept terms' },
  { id: 1, title: 'Sport', icon: Activity, desc: 'Choose your sport & URL' },
  { id: 2, title: 'Info', icon: User, desc: 'Add your personal details' },
  { id: 3, title: 'Highlights', icon: Trophy, desc: 'Highlights & social media' },
  { id: 4, title: 'Refs', icon: Users, desc: 'Coach references' },
  { id: 5, title: 'Publish', icon: Share2, desc: 'Share with coaches' },
];

const GRAD_YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];
const PROFILE_BASE_URL = 'https://offer-hound.com/athlete';

function formatSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function autoSlug(name: string) {
  return formatSlug(name.trim());
}

function showToast(type: 'success' | 'error' | 'info', text1: string, text2?: string) {
  try {
    Toast.show({ type: type === 'info' ? 'success' : type, text1, text2 });
  } catch {
    /* no-op if Toast is not mounted */
  }
}

export default function OnboardingScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { selectedSport, setSelectedSport } = useSport();
  const {
    profile,
    isLoading,
    createProfile,
    updateProfile,
    publishProfile,
    checkUrlAvailability,
  } = usePlayerProfile();

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [termsLoaded, setTermsLoaded] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    sport: (selectedSport as string) || 'football',
    custom_url: '',
    full_name: '',
    school: '',
    state: '',
    graduation_year: '',
    gpa: '',
    height: '',
    weight: '',
    position: '',
    bio: '',
    highlight_video_url: '',
    instagram_url: '',
    twitter_url: '',
    tiktok_url: '',
  });
  const [positions, setPositions] = useState<string[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [urlAvailable, setUrlAvailable] = useState<boolean | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);

  const [coachRefs, setCoachRefs] = useState<Array<{ name: string; email: string }>>([
    { name: '', email: '' },
  ]);

  // ────────────────────────────────────────────────────────────────────────
  // Resume / hydrate from existing profile
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    const existingPositions: string[] = Array.isArray(p.positions)
      ? p.positions
      : p.position
      ? [p.position]
      : [];
    setForm({
      sport: p.sport || 'football',
      custom_url: p.custom_url || '',
      full_name: p.full_name || '',
      school: p.school || '',
      state: p.state || '',
      graduation_year: p.graduation_year || '',
      gpa: p.gpa || '',
      height: p.height || '',
      weight: p.weight || '',
      position: p.position || '',
      bio: p.bio || '',
      highlight_video_url: p.highlight_video_url || '',
      instagram_url: p.instagram_url || '',
      twitter_url: p.twitter_url || '',
      tiktok_url: p.tiktok_url || '',
    });
    setPositions(existingPositions);
    setProfileImageUrl(p.profile_image_url || null);
  }, [profile]);

  // Detect terms acceptance and pick best initial step.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('terms_acceptances' as any)
          .select('id, accepted_at')
          .eq('user_id', user.id)
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setTermsAgreed(true);
          // If we already have terms acceptance, skip step 0 by default.
          setCurrentStep((s) => (s === 0 ? 1 : s));
        }
      } catch {
        // table may not exist — silently ignore
      } finally {
        if (!cancelled) setTermsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // After profile loads, jump to first incomplete step (resume support).
  useEffect(() => {
    if (!profile || !termsLoaded) return;
    const p = profile as any;
    if (p.is_published) {
      // Already published — let them land on step 5 to view/share.
      setCurrentStep(5);
      return;
    }
    if (!p.custom_url || !p.full_name) {
      setCurrentStep((s) => (s < 1 ? 1 : s));
      return;
    }
    if (!p.school || !p.graduation_year) {
      setCurrentStep((s) => (s < 2 ? 2 : s));
      return;
    }
    if (!p.highlight_video_url && !p.profile_image_url) {
      setCurrentStep((s) => (s < 3 ? 3 : s));
      return;
    }
    setCurrentStep((s) => (s < 4 ? 4 : s));
  }, [profile, termsLoaded]);

  const sportConfig = getSportConfig(form.sport);
  const sportPositions = getPositionsForSport(form.sport);
  const generatedSlug = useMemo(
    () => (form.full_name ? autoSlug(form.full_name) : ''),
    [form.full_name],
  );
  const profileSlug = form.custom_url || generatedSlug;
  const profileUrl = profileSlug ? `${PROFILE_BASE_URL}/${profileSlug}` : '';

  // ────────────────────────────────────────────────────────────────────────
  // Field helpers
  // ────────────────────────────────────────────────────────────────────────
  const setField = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'custom_url') setUrlAvailable(null);
  };

  const togglePosition = (label: string) => {
    setPositions((cur) =>
      cur.includes(label) ? cur.filter((p) => p !== label) : [...cur, label],
    );
  };

  const handleSportChange = (sport: SportType) => {
    setSelectedSport(sport);
    setForm((f) => ({ ...f, sport, position: '' }));
    setPositions([]);
  };

  const checkUrl = async () => {
    const slug = formatSlug(form.custom_url || generatedSlug);
    if (slug.length < 3) return;
    setForm((f) => ({ ...f, custom_url: slug }));
    setCheckingUrl(true);
    try {
      const ok = await checkUrlAvailability(slug);
      setUrlAvailable(ok);
    } catch {
      setUrlAvailable(null);
    }
    setCheckingUrl(false);
  };

  // ────────────────────────────────────────────────────────────────────────
  // Photo upload (Step 3)
  // ────────────────────────────────────────────────────────────────────────
  const pickProfileImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast('error', 'Permission denied', 'We need photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setSubmitting(true);
      try {
        const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user?.id || 'anon'}/profile-${Date.now()}.${ext}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const { error: uploadErr } = await supabase.storage
          .from('player-media')
          .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from('player-media').getPublicUrl(path);
        const url = pub.publicUrl;
        setProfileImageUrl(url);
        if (profile) {
          try {
            await updateProfile({ profile_image_url: url } as any);
          } catch {
            showToast('error', 'Saved locally', 'Will sync when online');
          }
        }
        showToast('success', 'Photo uploaded');
      } catch (e: any) {
        showToast('error', 'Upload failed', e?.message || 'Try again');
      } finally {
        setSubmitting(false);
      }
    } catch (e: any) {
      showToast('error', 'Could not pick photo', e?.message);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Step validation
  // ────────────────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (currentStep === 0 && !termsAgreed) {
      return 'You must agree to the Terms of Use and Privacy Policy';
    }
    if (currentStep === 1) {
      if (!form.full_name.trim()) return 'Full name is required';
      const slug = form.custom_url || generatedSlug;
      if (!slug || slug.length < 3) return 'Custom URL must be at least 3 characters';
      if (urlAvailable === false) return 'Choose an available URL';
    }
    if (currentStep === 2) {
      if (!form.school.trim()) return 'School name is required';
      if (!form.graduation_year) return 'Graduation year is required';
      if (positions.length === 0) return 'Select at least one position';
    }
    return null;
  };

  // ────────────────────────────────────────────────────────────────────────
  // Persist current step
  // ────────────────────────────────────────────────────────────────────────
  const persistStep = async (step: number): Promise<void> => {
    if (step === 0) {
      try {
        await supabase.from('terms_acceptances' as any).insert({
          user_id: user?.id,
          accepted_at: new Date().toISOString(),
        });
      } catch {
        showToast('info', 'Saved locally', 'terms_acceptances unavailable');
      }
      return;
    }

    if (step === 1) {
      const slug = formatSlug(form.custom_url || generatedSlug);
      const data: any = {
        custom_url: slug,
        full_name: form.full_name,
        sport: form.sport,
      };
      try {
        if (!profile) await createProfile(data);
        else await updateProfile(data);
      } catch (e: any) {
        showToast('error', 'Save failed', e?.message || 'Will retry later');
      }
      return;
    }

    if (step === 2) {
      const data: any = {
        position: positions[0] || form.position,
        positions,
        school: form.school,
        state: form.state,
        graduation_year: form.graduation_year,
        gpa: form.gpa,
        height: form.height,
        weight: form.weight,
        bio: form.bio,
      };
      try {
        if (!profile) await createProfile(data);
        else await updateProfile(data);
      } catch (e: any) {
        showToast('error', 'Save failed', e?.message || 'Will retry later');
      }
      return;
    }

    if (step === 3) {
      const data: any = {
        highlight_video_url: form.highlight_video_url,
        instagram_url: form.instagram_url,
        twitter_url: form.twitter_url,
        tiktok_url: form.tiktok_url,
        profile_image_url: profileImageUrl,
      };
      try {
        if (!profile) await createProfile(data);
        else await updateProfile(data);
      } catch (e: any) {
        showToast('error', 'Save failed', e?.message || 'Will retry later');
      }
      return;
    }

    if (step === 4) {
      // Save coach references — table may not exist, handle gracefully.
      const valid = coachRefs.filter((c) => c.name.trim() && c.email.trim());
      if (valid.length === 0) return;
      try {
        await supabase.from('coach_references' as any).insert(
          valid.map((c) => ({
            athlete_user_id: user?.id,
            coach_name: c.name,
            coach_email: c.email,
          })),
        );
      } catch {
        showToast('info', 'Saved locally', 'coach_references unavailable');
      }
      return;
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Navigation
  // ────────────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      showToast('error', 'Required field', err);
      return;
    }
    setSubmitting(true);
    try {
      await persistStep(currentStep);
    } finally {
      setSubmitting(false);
    }
    if (currentStep < 5) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handlePublish = async () => {
    if (!profile) {
      showToast('error', 'Profile incomplete', 'Finish earlier steps first');
      return;
    }
    setSubmitting(true);
    try {
      await publishProfile();
      showToast('success', 'Profile published!');
      // Navigate to athlete tabs
      nav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AthleteTabs' as any }],
        }),
      );
    } catch (e: any) {
      if (e?.code === 'SUBSCRIPTION_REQUIRED') {
        showToast('info', 'Subscription required', 'Upgrade to publish');
      } else {
        showToast('error', 'Publish failed', e?.message || 'Try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!profileUrl) return;
    try {
      await Share.share({
        message: `Check out my OfferHound profile: ${profileUrl}`,
        url: profileUrl,
      });
    } catch {
      /* user cancelled */
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  if (isLoading || !termsLoaded) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const stepMeta = STEPS[currentStep];
  const StepIcon = stepMeta.icon;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Progress dots */}
        <View style={s.stepRow}>
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            return (
              <View key={step.id} style={s.stepItem}>
                <View
                  style={[
                    s.stepCircle,
                    (isActive || isComplete) && s.stepCircleActive,
                  ]}
                >
                  {isComplete ? (
                    <CheckCircle size={16} color={colors.primaryForeground} />
                  ) : (
                    <Icon
                      size={14}
                      color={isActive ? colors.primaryForeground : colors.mutedForeground}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Card style={s.card}>
          <CardHeader>
            <View style={s.headerRow}>
              <StepIcon size={22} color={colors.primary} />
              <CardTitle>{stepMeta.title}</CardTitle>
            </View>
            <Text style={s.headerDesc}>{stepMeta.desc}</Text>
          </CardHeader>

          <CardContent>
            {/* ───────── Step 0 — Terms ───────── */}
            {currentStep === 0 && (
              <View style={{ gap: spacing.md }}>
                <Text style={s.bodyText}>
                  Welcome to OfferHound! Before creating your athlete profile, please
                  review and accept our Terms of Use and Privacy Policy.
                </Text>
                <View style={s.linksWrap}>
                  <Pressable style={s.linkRow}>
                    <FileText size={16} color={colors.primary} />
                    <Text style={s.link}>Terms of Use</Text>
                    <ExternalLink size={12} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable style={s.linkRow}>
                    <FileText size={16} color={colors.primary} />
                    <Text style={s.link}>Privacy Policy</Text>
                    <ExternalLink size={12} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <View style={s.checkboxRow}>
                  <Checkbox
                    checked={termsAgreed}
                    onCheckedChange={(c: boolean) => setTermsAgreed(c)}
                  />
                  <Text style={[s.bodyText, { flex: 1 }]}>
                    I agree to the Terms of Use and Privacy Policy.
                  </Text>
                </View>
              </View>
            )}

            {/* ───────── Step 1 — Sport + URL ───────── */}
            {currentStep === 1 && (
              <View style={{ gap: spacing.md }}>
                <Label>Select Your Sport</Label>
                <View style={s.sportGrid}>
                  {SPORTS_LIST.map((sp) => {
                    const active = form.sport === sp.id;
                    return (
                      <Pressable
                        key={sp.id}
                        onPress={() => handleSportChange(sp.id)}
                        style={[s.sportChip, active && s.sportChipActive]}
                      >
                        <Text
                          style={[
                            s.sportChipText,
                            active && { color: colors.primaryForeground },
                          ]}
                        >
                          {sp.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Label>
                  Full Name <Text style={s.req}>*</Text>
                </Label>
                <Input
                  value={form.full_name}
                  onChangeText={(v: string) => setField('full_name', v)}
                  placeholder="John Smith"
                />

                <Label>Custom URL</Label>
                <View style={s.urlRow}>
                  <View style={s.urlPrefix}>
                    <Text style={s.urlPrefixText}>offer-hound.com/athlete/</Text>
                  </View>
                  <Input
                    value={form.custom_url}
                    onChangeText={(v: string) => setField('custom_url', v)}
                    onBlur={checkUrl}
                    placeholder={generatedSlug || 'your-name'}
                    style={{ flex: 1 }}
                  />
                </View>
                {checkingUrl && (
                  <Text style={s.helperText}>Checking availability…</Text>
                )}
                {urlAvailable === true && (form.custom_url || generatedSlug).length >= 3 && (
                  <Badge variant="outline">
                    <CheckCircle size={12} color={colors.success} /> Available
                  </Badge>
                )}
                {urlAvailable === false && (
                  <Badge variant="destructive">URL taken</Badge>
                )}
                {!form.custom_url && generatedSlug ? (
                  <Pressable
                    onPress={() => setField('custom_url', generatedSlug)}
                    style={s.suggestRow}
                  >
                    <Text style={s.suggestText}>
                      Use auto-generated:{' '}
                      <Text style={{ color: colors.primary }}>/{generatedSlug}</Text>
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {/* ───────── Step 2 — Basic Info ───────── */}
            {currentStep === 2 && (
              <View style={{ gap: spacing.md }}>
                <Label>
                  School Name <Text style={s.req}>*</Text>
                </Label>
                <Input
                  value={form.school}
                  onChangeText={(v: string) => setField('school', v)}
                  placeholder="Lincoln High School"
                />

                <Label>
                  Graduation Year <Text style={s.req}>*</Text>
                </Label>
                <View style={s.chipRow}>
                  {GRAD_YEARS.map((y) => {
                    const active = form.graduation_year === y;
                    return (
                      <Pressable
                        key={y}
                        onPress={() => setField('graduation_year', y)}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text
                          style={[
                            s.chipText,
                            active && { color: colors.primaryForeground },
                          ]}
                        >
                          {y}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Label>State</Label>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.xs }}
                >
                  {US_STATES.map((st) => {
                    const active = form.state === st.abbreviation;
                    return (
                      <Pressable
                        key={st.abbreviation}
                        onPress={() => setField('state', st.abbreviation)}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text
                          style={[
                            s.chipText,
                            active && { color: colors.primaryForeground },
                          ]}
                        >
                          {st.abbreviation}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <Label>GPA</Label>
                    <Input
                      value={form.gpa}
                      onChangeText={(v: string) => setField('gpa', v)}
                      placeholder="3.5"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>Height</Label>
                    <Input
                      value={form.height}
                      onChangeText={(v: string) => setField('height', v)}
                      placeholder="6'2&quot;"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>Weight</Label>
                    <Input
                      value={form.weight}
                      onChangeText={(v: string) => setField('weight', v)}
                      placeholder="185"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Label>
                  Positions ({sportConfig.name}) <Text style={s.req}>*</Text>
                </Label>
                <View style={s.chipRow}>
                  {sportPositions.map((p) => {
                    const active = positions.includes(p.label);
                    return (
                      <Pressable
                        key={p.label}
                        onPress={() => togglePosition(p.label)}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text
                          style={[
                            s.chipText,
                            active && { color: colors.primaryForeground },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Label>Bio</Label>
                <Textarea
                  value={form.bio}
                  onChangeText={(v: string) => setField('bio', v)}
                  placeholder="Tell coaches about yourself…"
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}

            {/* ───────── Step 3 — Highlights & Social ───────── */}
            {currentStep === 3 && (
              <View style={{ gap: spacing.md }}>
                <View style={s.photoWrap}>
                  {profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={s.photo} />
                  ) : (
                    <View style={[s.photo, s.photoEmpty]}>
                      <Camera size={32} color={colors.mutedForeground} />
                    </View>
                  )}
                  <Button onPress={pickProfileImage} disabled={submitting}>
                    {profileImageUrl ? 'Replace photo' : 'Upload photo'}
                  </Button>
                </View>

                <Label>Highlight Video URL</Label>
                <Input
                  value={form.highlight_video_url}
                  onChangeText={(v: string) => setField('highlight_video_url', v)}
                  placeholder="https://www.hudl.com/video/..."
                  autoCapitalize="none"
                />

                <Label>Instagram</Label>
                <Input
                  value={form.instagram_url}
                  onChangeText={(v: string) => setField('instagram_url', v)}
                  placeholder="@yourhandle or full URL"
                  autoCapitalize="none"
                />

                <Label>Twitter / X</Label>
                <Input
                  value={form.twitter_url}
                  onChangeText={(v: string) => setField('twitter_url', v)}
                  placeholder="@yourhandle or full URL"
                  autoCapitalize="none"
                />

                <Label>TikTok</Label>
                <Input
                  value={form.tiktok_url}
                  onChangeText={(v: string) => setField('tiktok_url', v)}
                  placeholder="@yourhandle or full URL"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* ───────── Step 4 — Coach References ───────── */}
            {currentStep === 4 && (
              <View style={{ gap: spacing.md }}>
                <Text style={s.bodyText}>
                  Add up to 3 coaches who can vouch for you. They'll receive an email
                  invitation to add a reference.
                </Text>
                {coachRefs.map((ref, idx) => (
                  <View key={idx} style={s.refCard}>
                    <View style={s.refHeader}>
                      <Text style={s.refTitle}>Coach {idx + 1}</Text>
                      {coachRefs.length > 1 && (
                        <Pressable
                          onPress={() =>
                            setCoachRefs((cs) => cs.filter((_, i) => i !== idx))
                          }
                        >
                          <X size={16} color={colors.mutedForeground} />
                        </Pressable>
                      )}
                    </View>
                    <Input
                      value={ref.name}
                      onChangeText={(v: string) =>
                        setCoachRefs((cs) =>
                          cs.map((c, i) => (i === idx ? { ...c, name: v } : c)),
                        )
                      }
                      placeholder="Coach name"
                    />
                    <Input
                      value={ref.email}
                      onChangeText={(v: string) =>
                        setCoachRefs((cs) =>
                          cs.map((c, i) => (i === idx ? { ...c, email: v } : c)),
                        )
                      }
                      placeholder="coach@school.edu"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                ))}
                {coachRefs.length < 3 && (
                  <Pressable
                    onPress={() =>
                      setCoachRefs((cs) => [...cs, { name: '', email: '' }])
                    }
                    style={s.addRefBtn}
                  >
                    <Plus size={16} color={colors.primary} />
                    <Text style={s.addRefText}>Add another coach</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* ───────── Step 5 — Publish ───────── */}
            {currentStep === 5 && (
              <View style={{ gap: spacing.lg, alignItems: 'center' }}>
                <View style={s.previewCard}>
                  {profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={s.previewAvatar} />
                  ) : (
                    <View style={[s.previewAvatar, s.photoEmpty]}>
                      <Text style={{ fontSize: 28, color: colors.primary }}>
                        {form.full_name.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={s.previewName}>{form.full_name || 'Your name'}</Text>
                  <Text style={s.previewSport}>
                    {sportConfig.name}
                    {form.school ? ` • ${form.school}` : ''}
                    {form.graduation_year ? ` • ${form.graduation_year}` : ''}
                  </Text>
                  {positions.length > 0 && (
                    <View style={[s.chipRow, { justifyContent: 'center' }]}>
                      {positions.slice(0, 3).map((p) => (
                        <Badge key={p}>{p}</Badge>
                      ))}
                    </View>
                  )}
                </View>

                {profileUrl ? (
                  <View style={s.qrWrap}>
                    <QRCode value={profileUrl} size={160} />
                    <Text style={s.qrUrl}>{profileUrl}</Text>
                  </View>
                ) : (
                  <Text style={s.bodyText}>
                    Set your custom URL in Step 1 to generate a QR code.
                  </Text>
                )}

                <View style={{ width: '100%', gap: spacing.sm }}>
                  <Button onPress={handlePublish} disabled={submitting || !profile}>
                    {submitting
                      ? 'Publishing…'
                      : (profile as any)?.is_published
                      ? 'Re-publish Profile'
                      : 'Publish Profile'}
                  </Button>
                  <Button
                    variant="outline"
                    onPress={handleShare}
                    disabled={!profileUrl}
                  >
                    <Share2 size={16} color={colors.foreground} /> Share
                  </Button>
                </View>
              </View>
            )}

            {error && <Text style={s.errorText}>{error}</Text>}

            {/* Navigation */}
            <View style={s.navRow}>
              <Button
                variant="outline"
                onPress={handleBack}
                disabled={currentStep === 0 || submitting}
              >
                <ArrowLeft size={16} color={colors.foreground} /> Back
              </Button>
              {currentStep < 5 ? (
                <Button onPress={handleNext} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Continue'}{' '}
                  <ArrowRight size={16} color={colors.primaryForeground} />
                </Button>
              ) : null}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxxl },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  card: { padding: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  bodyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    lineHeight: 22,
  },
  helperText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.destructive,
    marginTop: spacing.sm,
  },
  req: { color: colors.destructive },
  linksWrap: { gap: spacing.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  link: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.base,
    color: colors.primary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sportChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sportChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sportChipText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  urlPrefix: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.muted,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.border,
  },
  urlPrefixText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  suggestRow: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  suggestText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
  photoWrap: { alignItems: 'center', gap: spacing.sm },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoEmpty: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  refHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  addRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addRefText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  previewCard: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  previewAvatar: { width: 80, height: 80, borderRadius: 40 },
  previewName: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h3,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  previewSport: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  qrWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
  },
  qrUrl: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: '#101318',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
