import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  MapPin,
  Trophy,
  TrendingUp,
  Dumbbell,
  Brain,
  X,
  Mail,
  Heart,
  Send,
  User,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { colors, typography, spacing, radius } from '@/lib/theme';

/**
 * AthleteMatchCard
 *
 * Unified contact-card UI for athletes across the platform. Mirrors the
 * design language of `CoachMatchCard` (the expanded coach card on the
 * athlete dashboard): rounded secondary surface, avatar left, dense info
 * column, optional AI scoring grid (variant="full"), and consistent
 * mobile layout (RN target = single-column mobile-first).
 *
 * Ported verbatim from Lovable web; Tailwind → StyleSheet, lucide-react
 * → lucide-react-native, react-router-dom → @react-navigation/native,
 * shadcn → @/components/ui/* (PascalCase). Web's sm:hidden / hidden sm:
 * dual layouts collapse to the mobile branch — RN has no responsive CSS
 * and the app is mobile-first.
 *
 * No new behaviors are introduced — callers wire actions via callbacks.
 */
export interface AthleteCardData {
  id: string;
  full_name?: string | null;
  position?: string | null;
  school?: string | null;
  graduation_year?: string | number | null;
  city?: string | null;
  state?: string | null;
  profile_image_url?: string | null;
  custom_url?: string | null;
  email?: string | null;
}

export interface AthleteCardScores {
  match_score: number;
  athletic_fit_score?: number | null;
  academic_fit_score?: number | null;
  geographic_fit_score?: number | null;
  position_fit_score?: number | null;
  match_reason?: string | null;
  priority?: 'high' | 'medium' | 'low' | string | null;
}

export interface AthleteMatchCardProps {
  athlete: AthleteCardData;
  variant?: 'compact' | 'full';
  scores?: AthleteCardScores | null;
  isSaved?: boolean;
  onToggleSave?: (athleteId: string) => void;
  onDismiss?: () => void;
  /** Override the contact (Letter) action. Defaults to no-op. */
  onContact?: () => void;
  /** Override the message action. Defaults to no-op. */
  onMessage?: () => void;
  /** Optional meta-line label (e.g. "Need match", "Saved") */
  proximityLabel?: string | null;
  /** Hide the View Profile click-through (used inside link wrappers). */
  disableNavigate?: boolean;
  /**
   * Optional custom Letter CTA. When provided, it replaces the default
   * inline button — used by callers that want the shared
   * `<LetterButton />` (with options popover) instead of the bare
   * onContact handler.
   */
  letterSlot?: React.ReactNode;
}

interface PriorityCfg {
  bg: string;
  fg: string;
  border: string;
  icon: string;
}

// Lovable used Tailwind tokens like bg-green-500/20 text-green-400 border-green-500/30.
// Translated to RN-friendly hex with matching semantic intent.
const PRIORITY_CONFIG: Record<string, PriorityCfg> = {
  high: { bg: 'rgba(34,197,94,0.2)', fg: '#4ade80', border: 'rgba(34,197,94,0.3)', icon: '🔥' },
  medium: { bg: 'rgba(245,158,11,0.2)', fg: '#fbbf24', border: 'rgba(245,158,11,0.3)', icon: '⭐' },
  low: { bg: 'rgba(59,130,246,0.2)', fg: '#60a5fa', border: 'rgba(59,130,246,0.3)', icon: '💡' },
};

function ScoreIndicator({
  label,
  score,
  icon,
  highlighted,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
  highlighted?: boolean;
}) {
  const getColor = (s: number) =>
    s >= 75 ? colors.success : s >= 55 ? colors.warning : colors.info;
  return (
    <View style={[s.scoreCell, highlighted ? s.scoreCellHighlight : s.scoreCellBase]}>
      <View style={s.scoreLabelRow}>
        {icon}
        <Text style={s.scoreLabelText}>{label}</Text>
      </View>
      <View style={s.scoreValueRow}>
        <Progress value={score} style={s.scoreProgress} />
        <Text style={[s.scoreValueText, { color: getColor(score) }]}>
          {Math.round(score)}
        </Text>
      </View>
    </View>
  );
}

export function AthleteMatchCard({
  athlete,
  variant = 'compact',
  scores,
  isSaved,
  onToggleSave,
  onDismiss,
  onContact,
  onMessage,
  proximityLabel,
  disableNavigate,
  letterSlot,
}: AthleteMatchCardProps) {
  const navigation = useNavigation<any>();
  const priorityKey = (scores?.priority as string) || '';
  const priorityCfg = PRIORITY_CONFIG[priorityKey] || null;
  const hasScore = typeof scores?.match_score === 'number';
  const gradShort = athlete.graduation_year
    ? `'${String(athlete.graduation_year).slice(-2)}`
    : null;
  const location = [athlete.city, athlete.state].filter(Boolean).join(', ');

  const handleNavigate = () => {
    if (disableNavigate) return;
    // Web: navigate(`/p/${athlete.custom_url || athlete.id}`)
    navigation.navigate('Profile', { handle: athlete.custom_url || athlete.id });
  };

  const showActionRow =
    !!letterSlot || !!onContact || !!onMessage || (!!onToggleSave && hasScore) || !!onDismiss;

  return (
    <Pressable
      onPress={handleNavigate}
      disabled={disableNavigate}
      accessibilityRole={disableNavigate ? undefined : 'button'}
      style={({ pressed }) => [
        s.container,
        !disableNavigate && pressed && s.containerPressed,
      ]}
    >
      {/* Header row: avatar + name/meta + score-or-save */}
      <View style={s.headerRow}>
        <Avatar
          source={athlete.profile_image_url ? { uri: athlete.profile_image_url } : null}
          fallback={athlete.full_name?.charAt(0) || ''}
          size={40}
          style={s.avatar}
        />
        <View style={s.headerCol}>
          <View style={s.nameRow}>
            <Text style={s.nameText} numberOfLines={1}>
              {athlete.full_name || 'Unnamed Athlete'}
            </Text>
            {priorityCfg && scores?.priority ? (
              <View
                style={[
                  s.priorityBadge,
                  { backgroundColor: priorityCfg.bg, borderColor: priorityCfg.border },
                ]}
              >
                <Text style={[s.priorityBadgeText, { color: priorityCfg.fg }]}>
                  {priorityCfg.icon} {scores.priority}
                </Text>
              </View>
            ) : !priorityCfg && proximityLabel ? (
              <Badge variant="secondary" style={s.tinyBadge}>
                {proximityLabel}
              </Badge>
            ) : null}
          </View>
          {athlete.position ? (
            <Text style={s.subText} numberOfLines={1}>
              {athlete.position}
            </Text>
          ) : null}
          {athlete.school ? (
            <Text style={s.subText} numberOfLines={1}>
              {athlete.school}
            </Text>
          ) : null}
        </View>
        {hasScore ? (
          <View style={s.scoreBlock}>
            <Text style={s.scoreBig}>{Math.round(scores!.match_score)}</Text>
            <Text style={s.scoreCaption}>Match</Text>
          </View>
        ) : onToggleSave ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleSave(athlete.id);
            }}
            accessibilityLabel={isSaved ? 'Saved' : 'Save athlete'}
            style={s.iconBtn}
          >
            <Heart
              size={16}
              color={isSaved ? colors.primary : colors.mutedForeground}
              fill={isSaved ? colors.primary : 'transparent'}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Meta row: grad / location / position */}
      <View style={s.metaRow}>
        {gradShort ? (
          <View style={s.metaItem}>
            <GraduationCap size={12} color={colors.mutedForeground} />
            <Text style={s.metaText} numberOfLines={1}>
              {gradShort}
            </Text>
          </View>
        ) : null}
        {location ? (
          <View style={s.metaItem}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text style={s.metaText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}
        {athlete.position ? (
          <Badge variant="outline" style={s.tinyBadge}>
            <Text style={s.outlineBadgeText}>
              <Trophy size={10} color={colors.foreground} /> {athlete.position}
            </Text>
          </Badge>
        ) : null}
      </View>

      {/* Full variant: reason + 4-up score grid */}
      {variant === 'full' && hasScore ? (
        <>
          {scores?.match_reason ? (
            <Text style={s.reasonText} numberOfLines={2}>
              {scores.match_reason}
            </Text>
          ) : null}
          <View style={s.scoreGrid}>
            <ScoreIndicator
              label="Athletic"
              score={scores?.athletic_fit_score ?? 0}
              icon={<Dumbbell size={12} color={colors.mutedForeground} />}
            />
            <ScoreIndicator
              label="Academic"
              score={scores?.academic_fit_score ?? 0}
              icon={<Brain size={12} color={colors.mutedForeground} />}
            />
            <ScoreIndicator
              label="Geographic"
              score={scores?.geographic_fit_score ?? 0}
              icon={<MapPin size={12} color={colors.mutedForeground} />}
            />
            <ScoreIndicator
              label="Overall"
              score={scores!.match_score}
              icon={<TrendingUp size={12} color={colors.mutedForeground} />}
              highlighted
            />
          </View>
        </>
      ) : null}

      {/* Action row */}
      {showActionRow ? (
        <View style={s.actionRow}>
          {onMessage ? (
            <Button
              variant="outline"
              size="sm"
              style={s.actionBtnFlex}
              onPress={onMessage}
              leftIcon={<Mail size={12} color={colors.foreground} />}
            >
              Message
            </Button>
          ) : null}
          {letterSlot ? (
            <View style={s.actionBtnFlex}>{letterSlot}</View>
          ) : onContact ? (
            <Button
              variant="default"
              size="sm"
              style={s.actionBtnFlex}
              onPress={onContact}
              leftIcon={<Send size={12} color={colors.primaryForeground} />}
            >
              Letter
            </Button>
          ) : null}
          {onToggleSave && hasScore ? (
            <Pressable
              onPress={() => onToggleSave(athlete.id)}
              accessibilityLabel={isSaved ? 'Saved' : 'Save athlete'}
              style={s.iconBtn}
            >
              <Heart
                size={16}
                color={isSaved ? colors.primary : colors.mutedForeground}
                fill={isSaved ? colors.primary : 'transparent'}
              />
            </Pressable>
          ) : null}
          {onDismiss ? (
            <Pressable
              onPress={onDismiss}
              accessibilityLabel="Dismiss"
              style={s.iconBtn}
            >
              <X size={12} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default AthleteMatchCard;

const s = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing.sm,
  } as ViewStyle,
  containerPressed: { borderColor: colors.primary, opacity: 0.95 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatar: { borderWidth: 2, borderColor: colors.background },
  headerCol: { flex: 1, minWidth: 0 },

  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  nameText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    maxWidth: 150,
  },
  subText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },

  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
  },
  tinyBadge: { paddingHorizontal: 6, paddingVertical: 1 },
  outlineBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.foreground,
  },

  scoreBlock: { alignItems: 'flex-end' },
  scoreBig: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.primary,
    fontSize: typography.fontSize.lg,
  },
  scoreCaption: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: 10,
  },

  iconBtn: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },

  reasonText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },

  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreCell: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  scoreCellBase: { backgroundColor: colors.muted },
  scoreCellHighlight: { backgroundColor: 'rgba(231,175,8,0.1)' },
  scoreLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  scoreLabelText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
  scoreValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreProgress: { flex: 1, height: 6 },
  scoreValueText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
  },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtnFlex: { flex: 1, height: 32 },
});
