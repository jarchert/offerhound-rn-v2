// RN port of Lovable src/components/ProfileManagement.tsx.
//
// Web→RN mapping:
//   - <div>/<h*>/<p>            → <View>/<Text>
//   - shadcn Card/Input/Textarea/Label/Progress/Button → @/components/ui/*
//   - lucide-react              → lucide-react-native
//   - react-router-dom          → @react-navigation/native
//   - <input type="file">       → expo-image-picker
//   - sonner toast              → @/components/ui/toast
//   - useRef<HTMLInputElement>  → n/a (image picker triggers directly)
//   - <img>                     → <Image>
//
// Behavior preserved verbatim:
//   - Profile Overview card: avatar/name/sport-position-year, completion %
//     and top-3 missing fields.
//   - Manage Profile Content: routes to OnboardingStack, GalleryStack,
//     SettingsStack.
//   - Performance Data section: Height/Weight inputs + SportStatsEditor
//     with measurableMirrorFromStats helper on save; read-only grid otherwise.
//   - Academic Transcript: <TranscriptManager compact />.
//   - Who I Compare Myself To: name + why + comparison image upload
//     (Supabase storage bucket `profile-images`, path `${user.id}/comparison-player.<ext>`).

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Settings as SettingsIcon,
  ChevronRight,
  Target,
  Upload,
  Save,
  Edit,
  Camera,
  FileText,
  Activity,
} from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Progress } from '@/components/ui/Progress';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { supabase } from '@/integrations/supabase/client';
import { isMinorSafeAthlete } from '@/lib/isMinorSafeAthlete';
import {
  SportStatsEditor,
  measurableMirrorFromStats,
} from '@/components/athlete/SportStatsEditor';
import { TranscriptManager } from '@/components/transcripts/TranscriptManager';
import { colors, typography, spacing, radius } from '@/lib/theme';

export const ProfileManagement = () => {
  const { user } = useAuth() as any;
  const navigation = useNavigation<any>();
  const { profile, updateProfile, fetchProfile } = usePlayerProfile() as any;
  const { percentage, missingFields } = useProfileCompletion() as any;

  const [isEditingComparison, setIsEditingComparison] = useState(false);
  const [comparisonName, setComparisonName] = useState('');
  const [comparisonWhy, setComparisonWhy] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [isEditingMeasurables, setIsEditingMeasurables] = useState(false);
  const [isSavingMeasurables, setIsSavingMeasurables] = useState(false);
  const [heightWeight, setHeightWeight] = useState({ height: '', weight: '' });
  const [sportStats, setSportStats] = useState<Record<string, any>>({});

  const openMeasurablesEditor = () => {
    setHeightWeight({
      height: profile?.height || '',
      weight: profile?.weight || '',
    });
    setSportStats((profile?.sport_stats as Record<string, any>) || {});
    setIsEditingMeasurables(true);
  };

  const handleSaveMeasurables = async () => {
    setIsSavingMeasurables(true);
    try {
      const mirror = measurableMirrorFromStats(sportStats);
      const payload: Record<string, any> = {
        height: heightWeight.height?.trim() || null,
        weight: heightWeight.weight?.trim() || null,
        sport_stats: sportStats,
        ...mirror,
      };
      await updateProfile(payload);
      fetchProfile?.();
      setIsEditingMeasurables(false);
      toast.success('Saved', 'Performance data updated. Radar graph refreshed.');
    } catch {
      toast.error('Error', 'Failed to save performance data.');
    } finally {
      setIsSavingMeasurables(false);
    }
  };

  if (!user) return null;

  const displayName = profile?.full_name || user.email;
  const sport = profile?.sport;
  const position = profile?.position;
  const gradYear = profile?.graduation_year;
  const imageUrl = profile?.profile_image_url;

  const openComparisonEditor = () => {
    setComparisonName(profile?.player_comparison || '');
    setComparisonWhy(profile?.player_comparison_why || '');
    setIsEditingComparison(true);
  };

  const handleSaveComparison = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        player_comparison: comparisonName || null,
        player_comparison_why: comparisonWhy || null,
      });
      fetchProfile?.();
      setIsEditingComparison(false);
      toast.success('Saved', 'Player comparison updated.');
    } catch {
      toast.error('Error', 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const pickAndUploadComparisonImage = async () => {
    if (!user) return;
    // Minor-Safe guard (prop fast-path not applicable here — no prop — so DB-path only).
    // isMinorSafeAthlete() is fail-open: lookup errors return false, never blocking
    // a normal upload due to a transient network/DB issue.
    const minorSafeLocked = await isMinorSafeAthlete(user.id);
    if (minorSafeLocked) {
      toast.error(
        'Upload Locked',
        'Profile photos cannot be uploaded until a parent completes the consent process for this minor athlete.',
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error('Permission denied', 'Photo library access required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setIsUploading(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const ext = uri.split('.').pop() || 'jpg';
      const path = `${user.id}/comparison-player.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(path, blob as any, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(path);

      await updateProfile({ player_comparison_image_url: urlData.publicUrl });
      fetchProfile?.();
      toast.success('Uploaded', 'Comparison player image saved.');
    } catch {
      toast.error('Upload failed', 'Could not upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const comparisonImageUrl = profile?.player_comparison_image_url;

  const goTo = (route: string) => {
    try {
      navigation.navigate(route as never);
    } catch {
      /* noop */
    }
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      {/* Profile Overview Card */}
      <Card>
        <CardContent style={s.overviewContent}>
          <View style={s.overviewRow}>
            <View style={s.avatarBubble}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={s.avatarImg} />
              ) : (
                <User size={32} color={colors.primary} />
              )}
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={s.overviewName} numberOfLines={1}>
                {displayName}
              </Text>
              {!!sport && (
                <Text style={s.overviewMeta}>
                  {sport}
                  {position ? ` · ${position}` : ''}
                  {gradYear ? ` · ${gradYear}` : ''}
                </Text>
              )}
            </View>
          </View>

          <View style={s.completionRow}>
            <View style={s.completionHeaderRow}>
              <Text style={s.completionLabel}>Profile Completion</Text>
              <Text style={s.completionPct}>{percentage}%</Text>
            </View>
            <Progress value={percentage} />
            {missingFields?.length > 0 && (
              <Text style={s.missing}>
                Missing: {missingFields.slice(0, 3).join(', ')}
                {missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ''}
              </Text>
            )}
          </View>
        </CardContent>
      </Card>

      {/* Content & Media Management */}
      <Card>
        <CardHeader style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <Edit size={16} color={colors.primary} />
            <CardTitle>Manage Profile Content</CardTitle>
          </View>
        </CardHeader>
        <CardContent style={s.navList}>
          <NavRow
            icon={<FileText size={16} color={colors.foreground} />}
            label="Edit Bio & Personal Info"
            onPress={() => goTo('OnboardingStack')}
          />
          <NavRow
            icon={<Camera size={16} color={colors.foreground} />}
            label="Media Gallery"
            onPress={() => goTo('Gallery')}
          />
          <NavRow
            icon={<SettingsIcon size={16} color={colors.foreground} />}
            label="Account Settings"
            onPress={() => goTo('SettingsStack')}
          />
        </CardContent>
      </Card>

      {/* Performance Data */}
      <Card>
        <CardHeader style={s.sectionHeader}>
          <View style={s.sectionTitleBetween}>
            <View style={s.sectionTitleRow}>
              <Activity size={16} color={colors.primary} />
              <CardTitle>
                Performance Data{sport ? ` · ${sport}` : ''}
              </CardTitle>
            </View>
            {!isEditingMeasurables && (
              <Button
                variant="ghost"
                size="sm"
                onPress={openMeasurablesEditor}
                leftIcon={<Edit size={14} color={colors.foreground} />}
              >
                Edit
              </Button>
            )}
          </View>
        </CardHeader>
        <CardContent style={{ gap: spacing.md }}>
          {isEditingMeasurables ? (
            <>
              <Text style={s.helper}>
                These values pre-populate your Athletic Profile radar graph on
                your profile, public profile, and shareable card.
              </Text>
              <View style={s.grid2}>
                <View style={s.gridCell}>
                  <Label>Height</Label>
                  <Input
                    placeholder={`6'2"`}
                    value={heightWeight.height}
                    onChangeText={(t) => setHeightWeight((p) => ({ ...p, height: t }))}
                  />
                </View>
                <View style={s.gridCell}>
                  <Label>Weight</Label>
                  <Input
                    placeholder="200 lbs"
                    value={heightWeight.weight}
                    onChangeText={(t) => setHeightWeight((p) => ({ ...p, weight: t }))}
                  />
                </View>
              </View>

              {sport ? (
                <SportStatsEditor sport={sport} value={sportStats} onChange={setSportStats} />
              ) : (
                <Text style={s.helperItalic}>
                  Set your primary sport to add performance data.
                </Text>
              )}

              <View style={s.actionRow}>
                <Button
                  size="sm"
                  onPress={handleSaveMeasurables}
                  loading={isSavingMeasurables}
                  leftIcon={!isSavingMeasurables ? <Save size={14} color={colors.primaryForeground} /> : undefined}
                >
                  Save
                </Button>
                <Button variant="outline" size="sm" onPress={() => setIsEditingMeasurables(false)}>
                  Cancel
                </Button>
              </View>
            </>
          ) : (
            <View style={s.grid4}>
              {[
                { label: 'Height', value: profile?.height },
                { label: 'Weight', value: profile?.weight },
                { label: '40-Yard', value: profile?.forty_yard ? `${profile.forty_yard}s` : null },
                { label: 'Vertical', value: profile?.vertical },
                { label: 'Bench', value: profile?.bench_press },
                { label: 'Squat', value: profile?.squat },
                { label: 'Arm Length', value: profile?.arm_length },
              ].map((m) => (
                <View
                  key={m.label}
                  style={[
                    s.metricTile,
                    { backgroundColor: m.value ? colors.secondary : colors.muted },
                  ]}
                >
                  <Text style={s.metricLabelText}>{m.label}</Text>
                  <Text style={[s.metricValueText, { color: m.value ? colors.primary : colors.mutedForeground }]}>
                    {m.value || '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>

      {/* Academic Transcript */}
      <TranscriptManager compact />

      {/* Who I Compare Myself To */}
      <Card>
        <CardHeader style={s.sectionHeader}>
          <View style={s.sectionTitleBetween}>
            <View style={s.sectionTitleRow}>
              <Target size={16} color={colors.primary} />
              <CardTitle>Who I Compare Myself To</CardTitle>
            </View>
            {!isEditingComparison && (
              <Button
                variant="ghost"
                size="sm"
                onPress={openComparisonEditor}
                leftIcon={<Edit size={14} color={colors.foreground} />}
              >
                Edit
              </Button>
            )}
          </View>
        </CardHeader>
        <CardContent style={{ gap: spacing.md }}>
          {isEditingComparison ? (
            <>
              <View style={{ gap: spacing.xs }}>
                <Label>Player Name</Label>
                <Input
                  value={comparisonName}
                  onChangeText={setComparisonName}
                  placeholder="e.g., Jalen Hurts"
                />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Label>Why This Player?</Label>
                <Textarea
                  value={comparisonWhy}
                  onChangeText={setComparisonWhy}
                  placeholder="What aspects of their game do you model?"
                  rows={4}
                />
              </View>
              <View style={s.actionRow}>
                <Button
                  size="sm"
                  onPress={handleSaveComparison}
                  loading={isSaving}
                  leftIcon={!isSaving ? <Save size={14} color={colors.primaryForeground} /> : undefined}
                >
                  Save
                </Button>
                <Button variant="outline" size="sm" onPress={() => setIsEditingComparison(false)}>
                  Cancel
                </Button>
              </View>
            </>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {profile?.player_comparison ? (
                <View style={s.comparisonBlock}>
                  <Text style={s.comparisonName}>{profile.player_comparison}</Text>
                  {!!profile?.player_comparison_why && (
                    <Text style={s.comparisonWhy}>{profile.player_comparison_why}</Text>
                  )}
                </View>
              ) : (
                <Text style={s.helper}>
                  No player comparison set yet. Tap Edit to add one.
                </Text>
              )}
            </View>
          )}

          {/* Comparison Image Upload */}
          <View style={{ gap: spacing.xs }}>
            <Label>Comparison Player Image</Label>
            {!!comparisonImageUrl && (
              <View style={s.comparisonImageWrap}>
                <Image source={{ uri: comparisonImageUrl }} style={s.comparisonImage} />
              </View>
            )}
            <Button
              variant="outline"
              size="sm"
              onPress={pickAndUploadComparisonImage}
              loading={isUploading}
              leftIcon={!isUploading ? <Upload size={14} color={colors.foreground} /> : undefined}
            >
              {comparisonImageUrl ? 'Change Image' : 'Upload Image'}
            </Button>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
};

export default ProfileManagement;

// ---------- helpers ----------
function NavRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Button
      variant="outline"
      onPress={onPress}
      style={s.navBtn}
      textStyle={s.navBtnText}
      leftIcon={icon}
      rightIcon={<ChevronRight size={16} color={colors.mutedForeground} />}
    >
      {label}
    </Button>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.md, padding: spacing.sm },

  overviewContent: { padding: spacing.md, gap: spacing.md },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  overviewName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  overviewMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  completionRow: { gap: 6 },
  completionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completionLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  completionPct: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  missing: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  sectionHeader: { paddingBottom: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitleBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  navList: { gap: spacing.xs },
  navBtn: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  navBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },

  helper: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  helperItalic: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontStyle: 'italic',
  },

  grid2: { flexDirection: 'row', gap: spacing.sm },
  gridCell: { flex: 1, gap: 4 },

  actionRow: { flexDirection: 'row', gap: spacing.sm },

  grid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricTile: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    marginHorizontal: 0,
    marginVertical: 2,
  },
  metricLabelText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  metricValueText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },

  comparisonBlock: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  comparisonName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  comparisonWhy: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  comparisonImageWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    maxWidth: 200,
  },
  comparisonImage: { width: '100%', aspectRatio: 1 },
});
