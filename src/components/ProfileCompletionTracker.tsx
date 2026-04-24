import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Progress } from '@/components/ui/Progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Trophy,
  Target,
  Zap,
  Lock,
  ArrowRight,
} from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@/lib/theme';

export const ProfileCompletionTracker = () => {
  const navigation = useNavigation<any>();
  const { percentage, missingFields, completedFields, isLoading, hasProfile } =
    useProfileCompletion();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle><Text style={styles.titleText}>Profile Completion</Text></CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.loadingBlock}>
            <View style={[styles.skeletonBar, { width: '100%' }]} />
            <View style={[styles.skeletonBar, { width: '75%' }]} />
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!hasProfile) {
    return (
      <Card style={styles.cardPrimary}>
        <CardHeader>
          <CardTitle>
            <View style={styles.titleRow}>
              <Target size={20} color={colors.primary} />
              <Text style={styles.titleText}>Profile Completion</Text>
            </View>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.contentStack}>
            <View style={styles.alertRow}>
              <AlertCircle size={20} color={colors.mutedForeground} />
              <Text style={styles.mutedText}>You haven't created a profile yet.</Text>
            </View>
            <Button
              onPress={() => navigation.navigate('OnboardingStack')}
              style={styles.fullWidthBtn}
              rightIcon={<ArrowRight size={16} color={colors.primaryForeground} />}
            >
              Create Your Profile
            </Button>
          </View>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = () => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return '#f97316'; // orange-500
  };

  const getStatusIcon = () => {
    if (percentage === 100) return <Trophy size={24} color={colors.success} />;
    if (percentage >= 80) return <Zap size={24} color={colors.success} />;
    return <Target size={24} color={colors.primary} />;
  };

  const getMotivationalMessage = () => {
    if (percentage === 100)
      return "Your profile is complete! You're ready to connect with coaches.";
    if (percentage >= 80)
      return 'Great job! Your profile is visible to coaches. Add a few more details to stand out.';
    if (percentage >= 50)
      return "You're making progress! Complete your profile to unlock coach contact info.";
    return 'Get started! Complete your profile to be discovered by college coaches.';
  };

  const renderUnlockMessage = () => {
    if (percentage >= 80) return null;
    return (
      <View style={styles.unlockBox}>
        <Lock size={16} color={colors.mutedForeground} />
        <Text style={styles.unlockText}>
          Complete <Text style={styles.unlockHighlight}>{80 - percentage}% more</Text> to unlock coach/scout contact info
        </Text>
      </View>
    );
  };

  const cardStyle =
    percentage >= 80
      ? styles.cardSuccess
      : percentage >= 50
      ? styles.cardWarning
      : styles.cardPrimary;

  return (
    <Card style={cardStyle}>
      <CardHeader style={styles.headerPb3}>
        <View style={styles.headerRow}>
          <CardTitle>
            <View style={styles.titleRow}>
              {getStatusIcon()}
              <Text style={styles.titleText}>Profile Completion</Text>
            </View>
          </CardTitle>
          <Badge
            variant={percentage >= 80 ? 'default' : 'secondary'}
            style={percentage >= 80 ? { backgroundColor: colors.success } : undefined}
          >
            {percentage}%
          </Badge>
        </View>
      </CardHeader>
      <CardContent>
        <View style={styles.contentStack}>
          {/* Progress Bar */}
          <View style={styles.progressGroup}>
            <View style={styles.progressWrap}>
              <Progress
                value={percentage}
                style={{ height: 16, backgroundColor: colors.muted }}
              />
              <View
                style={[
                  styles.progressFillOverlay,
                  { width: `${Math.max(0, Math.min(100, percentage))}%`, backgroundColor: getProgressColor() },
                ]}
              />
              {percentage >= 80 && <View style={styles.unlockMarker} />}
            </View>
            <Text style={styles.mutedText}>{getMotivationalMessage()}</Text>
          </View>

          {/* Unlock Message */}
          {renderUnlockMessage()}

          {/* Missing Fields - Show only top 4 */}
          {missingFields.length > 0 && (
            <View style={styles.missingGroup}>
              <View style={styles.missingHeaderRow}>
                <Text style={styles.missingHeaderText}>Missing Fields</Text>
                <Text style={styles.missingCountText}>
                  {missingFields.length} remaining
                </Text>
              </View>
              <View style={styles.missingGrid}>
                {missingFields.slice(0, 4).map((field) => (
                  <View key={field} style={styles.missingChip}>
                    <Circle size={12} color={colors.mutedForeground} />
                    <Text style={styles.missingChipText} numberOfLines={1}>
                      {field}
                    </Text>
                  </View>
                ))}
              </View>
              {missingFields.length > 4 && (
                <Text style={styles.missingMoreText}>
                  +{missingFields.length - 4} more fields
                </Text>
              )}
            </View>
          )}

          {/* Completed Fields - Collapsible summary */}
          {completedFields.length > 0 && percentage < 100 && (
            <View style={styles.completedRow}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={styles.completedText}>
                {completedFields.length} fields completed
              </Text>
            </View>
          )}

          {/* CTA Button */}
          {percentage < 100 && (
            <Button
              variant={percentage < 80 ? 'default' : 'outline'}
              onPress={() => navigation.navigate('OnboardingStack')}
              style={styles.fullWidthBtn}
              rightIcon={
                <ArrowRight
                  size={16}
                  color={percentage < 80 ? colors.primaryForeground : colors.foreground}
                />
              }
            >
              {percentage < 80
                ? 'Complete Profile to Contact Coaches'
                : 'Finish Your Profile'}
            </Button>
          )}

          {/* Success State */}
          {percentage === 100 && (
            <View style={styles.successBox}>
              <Trophy size={20} color={colors.success} />
              <Text style={styles.successText}>Profile Complete!</Text>
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  // Card variants (gradient approximated as tinted backgrounds)
  cardPrimary: {
    borderColor: colors.primary + '33',
    backgroundColor: colors.primary + '14',
  },
  cardWarning: {
    borderColor: colors.warning + '33',
    backgroundColor: colors.warning + '14',
  },
  cardSuccess: {
    borderColor: colors.success + '33',
    backgroundColor: colors.success + '14',
  },

  headerPb3: { paddingBottom: spacing.sm + 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },

  contentStack: { gap: spacing.md },

  // Loading
  loadingBlock: { gap: spacing.md },
  skeletonBar: {
    height: 16,
    backgroundColor: colors.muted,
    borderRadius: radius.sm,
  },

  // No-profile alert
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mutedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  fullWidthBtn: { width: '100%' },

  // Progress
  progressGroup: { gap: spacing.sm },
  progressWrap: {
    position: 'relative',
    height: 16,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  progressFillOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: radius.sm,
  },
  unlockMarker: {
    position: 'absolute',
    top: 0,
    left: '80%',
    height: '100%',
    width: 2,
    backgroundColor: colors.success,
  },

  // Unlock callout
  unlockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.secondary + '80',
    borderWidth: 1,
    borderColor: colors.border + '80',
  },
  unlockText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  unlockHighlight: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
  },

  // Missing fields
  missingGroup: { gap: spacing.sm },
  missingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missingHeaderText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  missingCountText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  missingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  missingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary + '4D',
    width: '48%',
  },
  missingChipText: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  missingMoreText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },

  // Completed summary
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  completedText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.success,
  },

  // Success state
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.success + '1A',
  },
  successText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.base,
    color: colors.success,
  },
});

export default ProfileCompletionTracker;
