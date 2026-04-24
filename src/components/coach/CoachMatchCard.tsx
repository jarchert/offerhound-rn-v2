// Verbatim port from Lovable web — RN-adapted.
// Source: offerhound-repo/src/components/coach/CoachMatchCard.tsx
//
// Adaptations:
//   - <div>/<span>/<h4>/<p>            → <View>/<Text>
//   - className → StyleSheet
//   - lucide-react → lucide-react-native (size/color props)
//   - useNavigate (react-router) → useNavigation (react-navigation)
//   - Tailwind responsive (sm:) → useWindowDimensions breakpoint at 640px
//   - Avatar/Badge/Button/Progress → local RN UI primitives
//   - URLSearchParams → simple route params object
import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  MapPin,
  Dumbbell,
  TrendingUp,
  X,
  Mail,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { useRecordContactEvent } from '@/hooks/useRecordContactEvent';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface CoachCardData {
  id: string;
  name?: string | null;
  title?: string | null;
  school?: string | null;
  division?: string | null;
  conference?: string | null;
  position_coached?: string | null;
  email?: string | null;
  image_url?: string | null;
}

export interface CoachCardScores {
  match_score: number;
  athletic_fit_score?: number | null;
  program_fit_score?: number | null;
  geographic_fit_score?: number | null;
  match_reason?: string | null;
  priority?: 'high' | 'medium' | 'low' | string | null;
}

export interface CoachMatchCardProps {
  coach: CoachCardData;
  variant?: 'compact' | 'full';
  scores?: CoachCardScores | null;
  isSaved?: boolean;
  onToggleSave?: (coachId: string) => void;
  onDismiss?: () => void;
  onContact?: () => void;
  proximityLabel?: string | null;
  viewerRole?: 'athlete' | 'coach' | 'scout' | 'club-coach' | 'hs-coach';
  coachAudience?: 'college-coach' | 'hs-coach';
}

const PRIORITY_CONFIG: Record<
  string,
  { bg: string; fg: string; border: string; icon: string }
> = {
  high:   { bg: 'rgba(34,197,94,0.20)',  fg: '#4ade80', border: 'rgba(34,197,94,0.30)',  icon: '🔥' },
  medium: { bg: 'rgba(245,158,11,0.20)', fg: '#fbbf24', border: 'rgba(245,158,11,0.30)', icon: '⭐' },
  low:    { bg: 'rgba(59,130,246,0.20)', fg: '#60a5fa', border: 'rgba(59,130,246,0.30)', icon: '💡' },
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
    <View
      style={[
        si.box,
        { backgroundColor: highlighted ? 'rgba(231,175,8,0.10)' : 'rgba(39,43,52,0.50)' },
      ]}
    >
      <View style={si.labelRow}>
        {icon}
        <Text style={si.label}>{label}</Text>
      </View>
      <View style={si.barRow}>
        <Progress value={score} style={si.bar} />
        <Text style={[si.score, { color: getColor(score) }]}>{Math.round(score)}</Text>
      </View>
    </View>
  );
}

export function CoachMatchCard({
  coach,
  variant = 'compact',
  scores,
  isSaved,
  onToggleSave,
  onDismiss,
  onContact,
  proximityLabel,
  viewerRole = 'athlete',
  coachAudience = 'college-coach',
}: CoachMatchCardProps) {
  const navigation = useNavigation<any>();
  const recordContact = useRecordContactEvent();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;

  const priorityKey = (scores?.priority as string) || '';
  const priorityCfg = PRIORITY_CONFIG[priorityKey] || null;
  const hasScore = typeof scores?.match_score === 'number';

  const handleContact = () => {
    recordContact.mutate({
      coach_id: coach.id,
      coach_name: coach.name || 'Coach',
      school: coach.school || '',
      contact_type: 'message',
      status: 'sent',
    });

    if (onContact) {
      onContact();
      return;
    }

    if (viewerRole !== 'athlete') {
      const params = {
        recipientCategory: coachAudience,
        recipientType: 'coach',
        recipientName: coach.name || '',
        recipientEmail: coach.email || '',
        organizationName: coach.school || '',
        recipientTitle: coach.title || '',
      };
      const letterCenter =
        viewerRole === 'scout'      ? 'ScoutLetters' :
        viewerRole === 'club-coach' ? 'ClubLetters' :
        viewerRole === 'hs-coach'   ? 'HsCoachLetters' :
                                      'CoachLetters';
      navigation.navigate(letterCenter, params);
      return;
    }

    navigation.navigate('Letters', {
      coachName:   coach.name || '',
      coachEmail:  coach.email || '',
      coachSchool: coach.school || '',
      coachTitle:  coach.title || '',
    });
  };

  const PriorityBadge = () =>
    priorityCfg && scores?.priority ? (
      <Badge
        style={{
          backgroundColor: priorityCfg.bg,
          borderWidth: 1,
          borderColor: priorityCfg.border,
        }}
      >
        <Text style={{ color: priorityCfg.fg, fontSize: typography.fontSize.xs }}>
          {priorityCfg.icon} {scores.priority}
        </Text>
      </Badge>
    ) : !priorityCfg && proximityLabel ? (
      <Badge variant="secondary">{proximityLabel}</Badge>
    ) : null;

  const MetaRow = () => (
    <View style={s.metaRow}>
      {coach.division ? (
        <View style={s.metaItem}>
          <GraduationCap size={12} color={colors.mutedForeground} />
          <Text style={s.metaText} numberOfLines={1}>{coach.division}</Text>
        </View>
      ) : null}
      {coach.conference ? (
        <View style={s.metaItem}>
          <MapPin size={12} color={colors.mutedForeground} />
          <Text style={s.metaText} numberOfLines={1}>{coach.conference}</Text>
        </View>
      ) : null}
      {coach.position_coached ? (
        <Badge variant="outline">{coach.position_coached}</Badge>
      ) : null}
    </View>
  );

  const FullScores = () =>
    variant === 'full' && hasScore ? (
      <>
        {scores?.match_reason ? (
          <Text style={s.matchReason} numberOfLines={2}>{scores.match_reason}</Text>
        ) : null}
        <View style={s.scoresGrid}>
          <View style={s.scoreCell}>
            <ScoreIndicator
              label="Athletic"
              score={scores?.athletic_fit_score ?? 0}
              icon={<Dumbbell size={12} color={colors.mutedForeground} />}
            />
          </View>
          <View style={s.scoreCell}>
            <ScoreIndicator
              label="Program"
              score={scores?.program_fit_score ?? 0}
              icon={<GraduationCap size={12} color={colors.mutedForeground} />}
            />
          </View>
          <View style={s.scoreCell}>
            <ScoreIndicator
              label="Geographic"
              score={scores?.geographic_fit_score ?? 0}
              icon={<MapPin size={12} color={colors.mutedForeground} />}
            />
          </View>
          <View style={s.scoreCell}>
            <ScoreIndicator
              label="Overall"
              score={scores!.match_score}
              icon={<TrendingUp size={12} color={colors.mutedForeground} />}
              highlighted
            />
          </View>
        </View>
      </>
    ) : null;

  // ─── Mobile layout ─────────────────────────────────────────
  if (!isDesktop) {
    return (
      <View style={s.container}>
        <View style={s.mobileHeader}>
          <Avatar
            source={coach.image_url ? { uri: coach.image_url } : null}
            fallback={coach.name?.charAt(0) || 'C'}
            size={40}
          />
          <View style={s.mobileHeaderText}>
            <View style={s.nameRow}>
              <Text style={s.nameSm} numberOfLines={1}>{coach.name}</Text>
              <PriorityBadge />
            </View>
            <Text style={s.metaText} numberOfLines={1}>{coach.title}</Text>
            <Text style={s.metaText} numberOfLines={1}>{coach.school}</Text>
          </View>
          {hasScore ? (
            <View style={s.scoreRight}>
              <Text style={s.scoreBig}>{Math.round(scores!.match_score)}</Text>
              <Text style={s.scoreLabelSm}>Match</Text>
            </View>
          ) : onToggleSave ? (
            <Pressable
              onPress={() => onToggleSave(coach.id)}
              style={s.iconBtn}
              hitSlop={8}
            >
              {isSaved ? (
                <BookmarkCheck size={16} color={colors.primary} />
              ) : (
                <Bookmark size={16} color={colors.mutedForeground} />
              )}
            </Pressable>
          ) : null}
        </View>

        <MetaRow />
        <FullScores />

        <View style={s.actionsRow}>
          <Button
            size="sm"
            variant="outline"
            onPress={handleContact}
            style={{ flex: 1 }}
          >
            Contact
          </Button>
          {onToggleSave && hasScore ? (
            <Pressable onPress={() => onToggleSave(coach.id)} style={s.iconBtn} hitSlop={8}>
              {isSaved ? (
                <BookmarkCheck size={16} color={colors.primary} />
              ) : (
                <Bookmark size={16} color={colors.mutedForeground} />
              )}
            </Pressable>
          ) : null}
          {onDismiss ? (
            <Pressable onPress={onDismiss} style={s.iconBtn} hitSlop={8}>
              <X size={12} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // ─── Desktop layout ────────────────────────────────────────
  return (
    <View style={s.container}>
      <View style={s.desktopRow}>
        <Avatar
          source={coach.image_url ? { uri: coach.image_url } : null}
          fallback={coach.name?.charAt(0) || 'C'}
          size={48}
        />
        <View style={s.desktopMain}>
          <View style={s.nameRow}>
            <Text style={s.nameLg} numberOfLines={1}>{coach.name}</Text>
            <PriorityBadge />
          </View>
          <Text style={s.subText} numberOfLines={1}>
            {coach.title}{coach.school ? ` • ${coach.school}` : ''}
          </Text>
          <MetaRow />
          <FullScores />
        </View>
        <View style={s.desktopRight}>
          {hasScore ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.scoreBig}>{Math.round(scores!.match_score)}</Text>
              <Text style={s.scoreLabel}>Match Score</Text>
            </View>
          ) : null}
          <View style={s.desktopActions}>
            <Button
              size="sm"
              variant="ghost"
              onPress={handleContact}
              leftIcon={<Mail size={12} color={colors.foreground} />}
            >
              Contact
            </Button>
            {onToggleSave ? (
              <Pressable onPress={() => onToggleSave(coach.id)} style={s.iconBtnSm} hitSlop={8}>
                {isSaved ? (
                  <BookmarkCheck size={16} color={colors.primary} />
                ) : (
                  <Bookmark size={16} color={colors.mutedForeground} />
                )}
              </Pressable>
            ) : null}
            {onDismiss ? (
              <Pressable onPress={onDismiss} style={s.iconBtnSm} hitSlop={8}>
                <X size={12} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export default CoachMatchCard;

const s = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: 'rgba(39,43,52,0.30)',  // bg-secondary/30
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(43,48,58,0.50)',      // border-border/50
    overflow: 'hidden',
    gap: spacing.sm,
  },
  // Mobile
  mobileHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  mobileHeaderText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  nameSm: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    maxWidth: 150,
  },
  scoreRight: { alignItems: 'flex-end' },
  scoreBig: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.primary,
  },
  scoreLabelSm: { fontSize: 10, color: colors.mutedForeground },
  scoreLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  iconBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm,
  },
  iconBtnSm: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  matchReason: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs / 2 },
  scoreCell: { width: '50%', paddingHorizontal: spacing.xs / 2, paddingVertical: spacing.xs / 2 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Desktop
  desktopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  desktopMain: { flex: 1, minWidth: 0, gap: 2 },
  nameLg: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  subText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  desktopRight: { alignItems: 'flex-end', gap: spacing.sm },
  desktopActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});

const si = StyleSheet.create({
  box: { padding: spacing.sm, borderRadius: radius.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  label: { fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: { flex: 1, height: 6 },
  score: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.bodySemiBold },
});
