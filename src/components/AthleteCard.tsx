// High-value building block: renders an athlete summary card used across
// coach/scout dashboards and search results.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, GraduationCap, MessageSquare, Mail, TrendingUp } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface AthleteCardData {
  id: string;
  user_id?: string | null;
  full_name: string;
  position?: string | null;
  positions?: string[] | null;
  school?: string | null;
  city?: string | null;
  state?: string | null;
  graduation_year?: string | null;
  height?: string | null;
  weight?: string | null;
  profile_image_url?: string | null;
  gpa?: string | null;
  sport?: string | null;
  email?: string | null;
  phone?: string | null;
  custom_url?: string | null;
}

interface Props {
  athlete: AthleteCardData;
  onPress?: () => void;
  matchScore?: number;
  rightSlot?: React.ReactNode;
  /** Show message/letter action buttons (for coach/scout views) */
  showActions?: boolean;
  /** Called when the Message button is tapped */
  onMessage?: () => void;
  /**
   * Optional custom Message CTA slot. When provided it replaces the default
   * inline Message button — use this to render `<MessageButton />` with full
   * in-app / SMS / email / phone channel options.
   */
  messageSlot?: React.ReactNode;
  /** Called when the Letter button is tapped */
  onLetter?: () => void;
  /** AI matching score details for coach/scout views */
  matchScores?: {
    athletic_fit_score?: number | null;
    academic_fit_score?: number | null;
    geographic_fit_score?: number | null;
    match_reason?: string | null;
  } | null;
}

export function AthleteCard({ athlete, onPress, matchScore, rightSlot, showActions, onMessage, messageSlot, onLetter, matchScores }: Props) {
  const location = [athlete.city, athlete.state].filter(Boolean).join(', ');
  const position = athlete.position || athlete.positions?.[0];

  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.cardTop}>
        <Avatar source={athlete.profile_image_url ? { uri: athlete.profile_image_url } : null} fallback={athlete.full_name} size={56} />
        <View style={s.info}>
          <View style={s.row}>
            <Text style={s.name} numberOfLines={1}>{athlete.full_name}</Text>
            {matchScore != null && <Badge variant="success">{Math.round(matchScore)}%</Badge>}
          </View>
          <View style={s.meta}>
            {position && <Text style={s.metaText}>{position}</Text>}
            {athlete.graduation_year && (
              <>
                <Text style={s.dot}>•</Text>
                <View style={s.metaRow}>
                  <GraduationCap size={11} color={colors.mutedForeground} />
                  <Text style={s.metaText}>{athlete.graduation_year}</Text>
                </View>
              </>
            )}
          </View>
          {location ? (
            <View style={s.metaRow}>
              <MapPin size={11} color={colors.mutedForeground} />
              <Text style={s.metaText} numberOfLines={1}>{location}</Text>
            </View>
          ) : null}
          {athlete.school ? <Text style={s.school} numberOfLines={1}>{athlete.school}</Text> : null}
        </View>
        {rightSlot}
      </View>

      {/* AI matching score details */}
      {matchScores?.match_reason ? (
        <View style={s.matchReasonRow}>
          <TrendingUp size={12} color={colors.primary} />
          <Text style={s.matchReasonText} numberOfLines={2}>{matchScores.match_reason}</Text>
        </View>
      ) : null}

      {/* Action buttons for coach/scout views */}
      {showActions && (onMessage || messageSlot || onLetter) ? (
        <View style={s.actionsRow}>
          {messageSlot ? (
            <View style={{ flex: 1 }}>{messageSlot}</View>
          ) : onMessage ? (
            <Pressable style={s.actionBtn} onPress={() => { onMessage(); }}>
              <MessageSquare size={14} color={colors.primaryForeground} />
              <Text style={s.actionBtnText}>Message</Text>
            </Pressable>
          ) : null}
          {onLetter ? (
            <Pressable style={[s.actionBtn, s.actionBtnOutline]} onPress={() => { onLetter(); }}>
              <Mail size={14} color={colors.foreground} />
              <Text style={s.actionBtnOutlineText}>Letter</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default AthleteCard;

const s = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  info: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  name: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  dot: { color: colors.mutedForeground, fontSize: 10 },
  school: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  matchReasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 2 },
  matchReasonText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius?.md ?? 8, flex: 1, justifyContent: 'center' },
  actionBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primaryForeground },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  actionBtnOutlineText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
