// ProfileAnalyzerCard — RN port of Lovable src/components/ProfileAnalyzer.tsx.
// 6-criteria profile-strength score with tips.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Brain, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { colors, spacing, typography } from '@/lib/theme';

interface AnalysisItem { label: string; score: number; tip: string; }

export function ProfileAnalyzerCard() {
  const nav = useNavigation<any>();
  const { profile } = usePlayerProfile();
  if (!profile) return null;

  const items: AnalysisItem[] = [
    { label: 'Basic Info', score: profile.full_name && profile.position ? 100 : 50, tip: 'Complete your name and position' },
    { label: 'Academics', score: profile.gpa ? 100 : 0, tip: 'Add your GPA to attract academic programs' },
    { label: 'Athletics', score: profile.sport && profile.position ? 80 : 30, tip: 'Add detailed stats and measurables' },
    { label: 'Contact Info', score: profile.email ? 100 : 0, tip: 'Add contact email for coaches' },
    { label: 'Media', score: profile.highlight_video_url ? 100 : 0, tip: 'Upload highlight video to stand out' },
    { label: 'Location', score: profile.state && profile.city ? 100 : profile.state ? 60 : 0, tip: 'Add city and state for proximity matching' },
  ];
  const overall = Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length);

  const goEdit = () => { try { nav.navigate('AthleteProfileEdit' as never); } catch { /* noop */ } };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Brain size={18} color={colors.primary} />
            <Text style={s.titleText}>Profile Strength</Text>
          </View>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm }}>
        <View style={s.center}>
          <Text style={s.score}>{overall}%</Text>
          <Text style={s.scoreLabel}>Overall Profile Score</Text>
          <Progress value={overall} style={{ marginTop: spacing.xs, width: '100%' }} />
        </View>
        <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
          {items.map((item) => (
            <Pressable key={item.label} onPress={goEdit} style={s.itemRow}>
              {item.score >= 80
                ? <CheckCircle size={16} color={colors.primary} />
                : <AlertTriangle size={16} color={colors.mutedForeground} />}
              <View style={{ flex: 1 }}>
                <View style={s.itemHead}>
                  <Text style={s.itemLabel}>{item.label}</Text>
                  <Badge variant={item.score >= 80 ? 'default' : 'secondary'}>{`${item.score}%`}</Badge>
                </View>
                {item.score < 80 && (
                  <View style={s.tipRow}>
                    <Lightbulb size={12} color={colors.mutedForeground} />
                    <Text style={s.tipText}>{item.tip}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.heading },
  center: { alignItems: 'center', gap: 2 },
  score: { color: colors.primary, fontSize: 36, fontFamily: typography.fontFamily.bodyBold },
  scoreLabel: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  itemLabel: { color: colors.foreground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodyMedium },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tipText: { color: colors.mutedForeground, fontSize: typography.fontSize.xs, flex: 1 },
});

export default ProfileAnalyzerCard;
