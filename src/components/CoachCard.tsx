// Coach summary card — used across search, matches, and saved-coach screens.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Building2, MapPin, MessageSquare, Mail } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

export interface CoachCardData {
  id: string;
  name: string;
  title?: string | null;
  school?: string | null;
  conference?: string | null;
  division?: string | null;
  position_coached?: string | null;
  email?: string | null;
  image_url?: string | null;
  city?: string | null;
  state?: string | null;
}

interface Props {
  coach: CoachCardData;
  onPress?: () => void;
  matchScore?: number;
  rightSlot?: React.ReactNode;
  /** Show contact/letter action buttons (for athlete views) */
  showActions?: boolean;
  /** Called when the Contact/Message button is tapped */
  onContact?: () => void;
  /** Called when the Letter button is tapped */
  onLetter?: () => void;
}

export function CoachCard({ coach, onPress, matchScore, rightSlot, showActions, onContact, onLetter }: Props) {
  const location = [coach.city, coach.state].filter(Boolean).join(', ');
  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.cardTop}>
        <Avatar source={coach.image_url ? { uri: coach.image_url } : null} fallback={coach.name} size={56} />
        <View style={s.info}>
          <View style={s.row}>
            <Text style={s.name} numberOfLines={1}>{coach.name}</Text>
            {matchScore != null && <Badge variant="success">{Math.round(matchScore)}%</Badge>}
          </View>
          {coach.title && <Text style={s.title} numberOfLines={1}>{coach.title}</Text>}
          {coach.school ? (
            <View style={s.metaRow}>
              <Building2 size={11} color={colors.mutedForeground} />
              <Text style={s.metaText} numberOfLines={1}>{coach.school}</Text>
            </View>
          ) : null}
          <View style={s.metaRow}>
            {coach.division && <Badge variant="outline">{coach.division}</Badge>}
            {coach.conference && <Badge variant="secondary">{coach.conference}</Badge>}
          </View>
          {location ? (
            <View style={s.metaRow}>
              <MapPin size={11} color={colors.mutedForeground} />
              <Text style={s.metaText} numberOfLines={1}>{location}</Text>
            </View>
          ) : null}
        </View>
        {rightSlot}
      </View>

      {/* Action buttons for athlete views */}
      {showActions && (onContact || onLetter) ? (
        <View style={s.actionsRow}>
          {onContact ? (
            <Pressable style={s.actionBtn} onPress={() => { onContact(); }}>
              <MessageSquare size={14} color={colors.primaryForeground} />
              <Text style={s.actionBtnText}>Contact</Text>
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

export default CoachCard;

const s = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  info: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  name: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flexShrink: 1 },
  title: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius?.md ?? 8, flex: 1, justifyContent: 'center' },
  actionBtnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.primaryForeground },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  actionBtnOutlineText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
});
