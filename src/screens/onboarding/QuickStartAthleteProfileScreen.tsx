// QuickStartAthleteProfileScreen — RN port of the Lovable multi-step athlete profile wizard.
// Source of truth: offerhound-repo/src/pages/QuickStart.tsx (terms→info→photo→publish) +
// offerhound-repo/src/pages/Onboarding.tsx (basic info content).
// Differences from web:
//  - 4 steps: basic info (name/grad year/HS) → sport+position → photo → preview/publish.
//  - Persists incrementally to player_profiles via usePlayerProfile.updateProfile().
//  - Uses expo-image-picker for the photo upload (uploaded to Supabase Storage 'avatars').
//  - On publish: marks is_published=true and resets to AthleteTabs.
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  SafeAreaView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft, ArrowRight, CheckCircle, User, Camera, Trophy, Share2, Loader as Loader2,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, typography } from '@/lib/theme';
import { SPORTS_LIST, SportType } from '@/lib/data/sports';
import { getPositionsForSport, PositionOption } from '@/lib/data/sportPositions';
import type { OnboardingStackParamList } from '@/navigation/stacks/OnboardingStack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList & RootStackParamList>;

const STEPS = [1, 2, 3, 4] as const;
type Step = (typeof STEPS)[number];

const groupByCategory = (positions: PositionOption[]): Record<string, PositionOption[]> =>
  positions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, PositionOption[]>);

export default function QuickStartAthleteProfileScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { profile, isLoading, createProfile, updateProfile, publishProfile } = usePlayerProfile();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [highSchool, setHighSchool] = useState('');
  const [sport, setSport] = useState<SportType>('football');
  const [positions, setPositions] = useState<string[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Hydrate from existing profile if present.
  useEffect(() => {
    if (!profile) return;
    const p: any = profile;
    if (p.full_name) setFullName(p.full_name);
    if (p.graduation_year) setGraduationYear(String(p.graduation_year));
    if (p.high_school_name) setHighSchool(p.high_school_name);
    if (p.sport) setSport(p.sport);
    if (Array.isArray(p.positions)) setPositions(p.positions);
    else if (p.position) setPositions([p.position]);
    if (p.profile_image_url) setProfileImageUrl(p.profile_image_url);
  }, [profile]);

  const sportPositions = useMemo(() => getPositionsForSport(sport), [sport]);
  const positionsByCategory = useMemo(() => groupByCategory(sportPositions), [sportPositions]);

  // ----- persistence helper -----
  const persist = async (updates: Record<string, any>) => {
    if (!profile) {
      await createProfile(updates);
    } else {
      await updateProfile(updates);
    }
  };

  // ----- handlers -----
  const togglePosition = (label: string) => {
    setPositions((prev) =>
      prev.includes(label)
        ? prev.filter((x) => x !== label)
        : prev.length < 3
        ? [...prev, label]
        : prev
    );
  };

  const handleStep1Next = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Full name required' });
      return;
    }
    setSubmitting(true);
    try {
      const yearNum = graduationYear ? parseInt(graduationYear, 10) : null;
      await persist({
        full_name: fullName.trim(),
        graduation_year: yearNum && !isNaN(yearNum) ? yearNum : null,
        high_school_name: highSchool.trim() || null,
      });
      setStep(2);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Next = async () => {
    if (!positions.length) {
      Toast.show({ type: 'error', text1: 'Select at least one position' });
      return;
    }
    setSubmitting(true);
    try {
      await persist({
        sport,
        position: positions[0],
        positions,
      });
      setStep(3);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Permission required', text2: 'Photo access denied' });
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
    if (!user) return;

    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/profile-${Date.now()}.${ext}`;
      // RN-compatible upload: read file into binary via fetch+blob.
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;
      setProfileImageUrl(url);
      await persist({ profile_image_url: url });
      Toast.show({ type: 'success', text1: 'Photo uploaded' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: e?.message });
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    setSubmitting(true);
    try {
      await publishProfile();
      Toast.show({ type: 'success', text1: 'Profile Published!', text2: 'You\'re live.' });
      nav.getParent()?.reset({ index: 0, routes: [{ name: 'AthleteTabs' as any }] });
    } catch (e: any) {
      if (e?.code === 'SUBSCRIPTION_REQUIRED' || e?.message === 'SUBSCRIPTION_REQUIRED') {
        Toast.show({
          type: 'info',
          text1: 'Subscription required',
          text2: 'Upgrade to publish your profile.',
        });
      } else {
        Toast.show({ type: 'error', text1: 'Publish failed', text2: e?.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ----- progress dots -----
  const ProgressBar = () => (
    <View style={s.progress}>
      {STEPS.map((n, i) => {
        const done = step > n;
        const active = step === n;
        return (
          <View key={n} style={s.progressItem}>
            <View style={[s.dot, (active || done) && s.dotActive]}>
              {done ? (
                <CheckCircle size={14} color={colors.primaryForeground} />
              ) : (
                <Text style={[s.dotText, (active || done) && s.dotTextActive]}>{n}</Text>
              )}
            </View>
            {i < STEPS.length - 1 && <View style={[s.line, done && s.lineActive]} />}
          </View>
        );
      })}
    </View>
  );

  // ----- loading -----
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.heroTag}>Quick Start</Text>
            <Text style={s.title}>Build Your Athlete Profile</Text>
          </View>

          <ProgressBar />

          {/* ---------------- Step 1: Basic Info ---------------- */}
          {step === 1 && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <User size={20} color={colors.primary} />
                <Text style={s.cardTitle}>Basic Info</Text>
              </View>
              <View style={s.cardBody}>
                <Input
                  label="Full Name *"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                />
                <Input
                  label="Graduation Year"
                  value={graduationYear}
                  onChangeText={setGraduationYear}
                  placeholder="e.g. 2026"
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Input
                  label="High School"
                  value={highSchool}
                  onChangeText={setHighSchool}
                  placeholder="Your high school name"
                  autoCapitalize="words"
                />
                <Button
                  onPress={handleStep1Next}
                  loading={submitting}
                  disabled={submitting}
                  rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}>
                  Next
                </Button>
              </View>
            </View>
          )}

          {/* ---------------- Step 2: Sport + Position ---------------- */}
          {step === 2 && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Trophy size={20} color={colors.primary} />
                <Text style={s.cardTitle}>Sport & Position</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.label}>Sport *</Text>
                <View style={s.sportGrid}>
                  {SPORTS_LIST.map((sp) => {
                    const selected = sport === sp.id;
                    return (
                      <Pressable
                        key={sp.id}
                        onPress={() => {
                          setSport(sp.id);
                          setPositions([]);
                        }}
                        style={[s.sportCard, selected && s.sportCardActive]}>
                        <Text style={[s.sportName, selected && s.sportNameActive]}>
                          {sp.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={s.positionHeader}>
                  <Text style={s.label}>Position(s) *</Text>
                  <Text style={s.hint}>Up to 3</Text>
                </View>
                <View style={{ gap: spacing.md }}>
                  {Object.entries(positionsByCategory).map(([cat, list]) => (
                    <View key={cat}>
                      <Text style={s.categoryLabel}>{cat.toUpperCase()}</Text>
                      <View style={s.posWrap}>
                        {list.map((p) => {
                          const selected = positions.includes(p.label);
                          return (
                            <Pressable
                              key={p.label}
                              onPress={() => togglePosition(p.label)}
                              style={[s.posChip, selected && s.posChipActive]}>
                              <Text style={[s.posChipText, selected && s.posChipTextActive]}>
                                {p.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>

                <View style={s.row}>
                  <Button
                    variant="outline"
                    onPress={() => setStep(1)}
                    style={s.flex}
                    leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>
                    Back
                  </Button>
                  <Button
                    onPress={handleStep2Next}
                    loading={submitting}
                    disabled={submitting}
                    style={s.flex}
                    rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}>
                    Next
                  </Button>
                </View>
              </View>
            </View>
          )}

          {/* ---------------- Step 3: Photo ---------------- */}
          {step === 3 && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Camera size={20} color={colors.primary} />
                <Text style={s.cardTitle}>Profile Photo</Text>
              </View>
              <View style={s.cardBody}>
                <View style={s.photoBox}>
                  {profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={s.photo} />
                  ) : (
                    <View style={[s.photo, s.photoEmpty]}>
                      <User size={56} color={colors.mutedForeground} />
                    </View>
                  )}
                </View>
                <Button
                  variant="outline"
                  onPress={handlePickImage}
                  loading={uploading}
                  disabled={uploading}
                  leftIcon={<Camera size={16} color={colors.foreground} />}>
                  {profileImageUrl ? 'Change Photo' : 'Choose Photo'}
                </Button>
                <View style={s.row}>
                  <Button
                    variant="outline"
                    onPress={() => setStep(2)}
                    style={s.flex}
                    leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>
                    Back
                  </Button>
                  <Button
                    onPress={() => setStep(4)}
                    style={s.flex}
                    rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}>
                    Next
                  </Button>
                </View>
                <Pressable onPress={() => setStep(4)} style={s.skip}>
                  <Text style={s.skipText}>Skip for now</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ---------------- Step 4: Preview + Publish ---------------- */}
          {step === 4 && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Share2 size={20} color={colors.primary} />
                <Text style={s.cardTitle}>Ready to Go Live!</Text>
              </View>
              <View style={s.cardBody}>
                <View style={s.previewBox}>
                  {profileImageUrl ? (
                    <Image source={{ uri: profileImageUrl }} style={s.previewPhoto} />
                  ) : (
                    <View style={[s.previewPhoto, s.photoEmpty]}>
                      <User size={40} color={colors.mutedForeground} />
                    </View>
                  )}
                  <Text style={s.previewName}>{fullName || 'Your Name'}</Text>
                  {graduationYear ? (
                    <Text style={s.previewMeta}>Class of {graduationYear}</Text>
                  ) : null}
                  {highSchool ? <Text style={s.previewMeta}>{highSchool}</Text> : null}
                  <View style={s.previewBadges}>
                    {positions.map((p) => (
                      <Badge key={p} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </View>
                </View>

                <View style={s.row}>
                  <Button
                    variant="outline"
                    onPress={() => setStep(3)}
                    style={s.flex}
                    leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>
                    Back
                  </Button>
                  <Button
                    onPress={handlePublish}
                    loading={submitting}
                    disabled={submitting}
                    style={s.flex}>
                    Publish
                  </Button>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },

  header: { alignItems: 'center', marginTop: spacing.md },
  heroTag: {
    color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: 1,
  },
  title: {
    color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xl, marginTop: spacing.xs, textAlign: 'center',
  },

  progress: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginVertical: spacing.md,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.primary },
  dotText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.bodySemiBold, fontSize: 13 },
  dotTextActive: { color: colors.primaryForeground },
  line: { width: 32, height: 2, backgroundColor: colors.muted, marginHorizontal: 4 },
  lineActive: { backgroundColor: colors.primary },

  card: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardTitle: {
    color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
  },
  cardBody: { padding: spacing.md, gap: spacing.md },

  label: {
    color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
  },
  hint: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs },

  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sportCard: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted,
  },
  sportCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sportName: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm },
  sportNameActive: { color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold },

  positionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  categoryLabel: {
    color: colors.mutedForeground, fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs, marginBottom: spacing.xs,
  },
  posWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  posChip: {
    paddingVertical: 6, paddingHorizontal: spacing.sm + 2,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent',
  },
  posChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  posChipText: { color: colors.foreground, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body },
  posChipTextActive: { color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold },

  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },

  photoBox: { alignItems: 'center', paddingVertical: spacing.md },
  photo: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.muted },
  photoEmpty: {
    alignItems: 'center', justifyContent: 'center',
    borderW