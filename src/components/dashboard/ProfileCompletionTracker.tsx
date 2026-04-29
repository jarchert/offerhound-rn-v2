// ProfileCompletionTracker (dashboard) — RN port of Lovable src/components/ProfileCompletionTracker.tsx
// 8-field completion bar + % score. Tap navigates to AthleteProfileEdit.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Target, TrendingUp } from 'lucide-react-native';
import { Card, CardContent, Progress } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { colors, spacing, typography } from '@/lib/theme';

export function ProfileCompletionTracker() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = usePlayerProfile();

  const fields = [
    { label: 'Full Name', complete: !!profile?.full_name },
    { label: 'Sport & Position', complete: !!(profile?.sport && profile?.position) },
    { label: 'School', complete: !!profile?.school },
    { label: 'Graduation Year', complete: !!profile?.graduation_year },
    { label: 'GPA', complete: !!profile?.gpa },
    { label: 'Profile Photo', complete: !!profile?.profile_image_url },
    { label: 'Highlight Video', complete: !!profile?.highlight_video_url },
    { label: 'Bio', complete: !!profile?.bio },
  ];
  const completed = fields.filter((f) => f.complete).length;
  const percentage = Math.round((completed / fields.length) * 100);

  if (!user) return null;

  const goEdit = () => {
    try { nav.navigate('AthleteProfileEdit' as never); } catch { /* noop */ }
  };

  return (
    <Pressable onPress={goEdit}>
      <Card>
        <CardContent style={s.content}>
          <View style={s.headerRow}>
            <View style={s.titleRow}>
              <Target size={18} color={colors.primary} />
              <Text style={s.title}>Profile Completion</Text>
            </View>
            <Text style={s.percent}>{percentage}%</Text>
          </View>
          <Progress value={percentage} />
          <View style={s.grid}>
            {fields.map((f) => (
              <View key={f.label} style={s.fieldRow}>
                <View style={[s.dot, { backgroundColor: f.complete ? colors.success : colors.border }]} />
                <Text style={[s.fieldLabel, { color: f.complete ? colors.foreground : colors.mutedForeground }]}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
          {percentage < 100 && (
            <View style={s.tipRow}>
              <TrendingUp size={12} color={colors.mutedForeground} />
              <Text style={s.tipText}>
                Complete your profile to increase visibility to coaches by up to 5x.
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { gap: spacing.sm, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { color: colors.foreground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodySemiBold },
  percent: { color: colors.primary, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodyBold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  fieldRow: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  fieldLabel: { fontSize: typography.fontSize.xs },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  tipText: { color: colors.mutedForeground, fontSize: typography.fontSize.xs, flex: 1 },
});

export default ProfileCompletionTracker;
