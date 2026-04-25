import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Trophy,
  Send,
  Mail,
  Heart,
  X,
  User,
  Sparkles,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, radius } from '@/lib/theme';

/**
 * InfluencerMatchCard
 *
 * Unified contact-card UI for influencers across the platform.
 * Mirrors the design language of `AthleteMatchCard` and `CoachMatchCard`:
 * rounded secondary surface, avatar left, dense info column, optional
 * rank/verified badges, consistent mobile-first layout.
 *
 * Ported verbatim from Lovable web; Tailwind → StyleSheet, lucide-react
 * → lucide-react-native, react-router-dom → @react-navigation/native,
 * shadcn → @/components/ui/* (PascalCase). Web's sm:hidden / hidden sm:
 * dual layouts collapse to the mobile branch — RN has no responsive CSS
 * and the app is mobile-first.
 *
 * No new behaviors are introduced — callers wire actions via callbacks.
 */
export interface InfluencerCardData {
  id: string;
  handle?: string | null;
  display_name?: string | null;
  primary_sport?: string | null;
  affiliation_type?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  verification_status?: string | null;
}

export interface InfluencerCardSnapshot {
  rank?: number | null;
  score?: number | null;
}

export interface InfluencerMatchCardProps {
  influencer: InfluencerCardData;
  variant?: 'compact' | 'full';
  snapshot?: InfluencerCardSnapshot | null;
  showRank?: boolean;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  onDismiss?: () => void;
  onContact?: () => void;
  onMessage?: () => void;
  proximityLabel?: string | null;
  /** Hide the View Profile click-through (used inside link wrappers). */
  disableNavigate?: boolean;
}

export function InfluencerMatchCard({
  influencer,
  variant = 'compact',
  snapshot,
  showRank,
  isSaved,
  onToggleSave,
  onDismiss,
  onContact,
  onMessage,
  proximityLabel,
  disableNavigate,
}: InfluencerMatchCardProps) {
  const navigation = useNavigation<any>();
  const rank = showRank && snapshot?.rank ? snapshot.rank : null;
  const verified = influencer.verification_status === 'verified';

  const handleNavigate = () => {
    if (disableNavigate) return;
    // Web: navigate(`/influencers/${influencer.handle}`)
    if (influencer.handle) {
      navigation.navigate('InfluencerProfile', { handle: influencer.handle });
    }
  };

  const showActionRow = !!onContact || !!onMessage || !!onDismiss;

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
      {/* Header row: rank + avatar + name/handle + save */}
      <View style={s.headerRow}>
        {rank ? (
          <Text style={s.rankText}>#{rank}</Text>
        ) : null}
        <Avatar
          source={influencer.profile_image_url ? { uri: influencer.profile_image_url } : null}
          fallback={influencer.display_name?.charAt(0) || ''}
          size={40}
          style={s.avatar}
        />
        <View style={s.headerCol}>
          <View style={s.nameRow}>
            <Text style={s.nameText} numberOfLines={1}>
              {influencer.display_name || 'Influencer'}
            </Text>
            {verified ? (
              <View style={s.verifiedBadge}>
                <Sparkles size={10} color={colors.primary} />
                <Text style={s.verifiedText}>Verified</Text>
              </View>
            ) : null}
            {!verified && proximityLabel ? (
              <Badge variant="secondary" style={s.tinyBadge}>
                {proximityLabel}
              </Badge>
            ) : null}
          </View>
          {influencer.handle ? (
            <Text style={s.subText} numberOfLines={1}>
              @{influencer.handle}
            </Text>
          ) : null}
        </View>
        {typeof snapshot?.score === 'number' ? (
          <View style={s.scoreBlock}>
            <Text style={s.scoreBig}>{Math.round(snapshot.score)}</Text>
            <Text style={s.scoreCaption}>Score</Text>
          </View>
        ) : onToggleSave ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleSave(influencer.id);
            }}
            accessibilityLabel={isSaved ? 'Saved' : 'Save influencer'}
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

      {/* Meta row: sport + affiliation */}
      {(influencer.primary_sport || influencer.affiliation_type) ? (
        <View style={s.metaRow}>
          {influencer.primary_sport ? (
            <Badge variant="secondary" style={s.tinyBadge}>
              <Text style={s.metaBadgeText}>
                <Trophy size={10} color={colors.foreground} />{' '}
                {influencer.primary_sport}
              </Text>
            </Badge>
          ) : null}
          {influencer.affiliation_type ? (
            <Badge variant="outline" style={s.tinyBadge}>
              <Text style={s.outlineBadgeText}>
                {String(influencer.affiliation_type).replace(/_/g, ' ')}
              </Text>
            </Badge>
          ) : null}
        </View>
      ) : null}

      {/* Full variant: bio */}
      {variant === 'full' && influencer.bio ? (
        <Text style={s.bioText} numberOfLines={2}>
          {influencer.bio}
        </Text>
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
          {onContact ? (
            <Button
              variant="default"
              size="sm"
              style={s.actionBtnFlex}
              onPress={onContact}
              leftIcon={<Send size={12} color={colors.primaryForeground} />}
            >
              Contact
            </Button>
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

export default InfluencerMatchCard;

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
  rankText: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.lg,
    width: 24,
    textAlign: 'center',
  },
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

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(231,175,8,0.20)',
    backgroundColor: 'rgba(231,175,8,0.15)',
  },
  verifiedText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.primary,
  },
  tinyBadge: { paddingHorizontal: 6, paddingVertical: 1 },
  metaBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.foreground,
    textTransform: 'capitalize',
  },
  outlineBadgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 10,
    color: colors.foreground,
    textTransform: 'capitalize',
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

  bioText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtnFlex: { flex: 1, height: 32 },
});
