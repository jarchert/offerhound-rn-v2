// Coach summary card — used across search, matches, and saved-coach screens.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Building2, MapPin } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

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
}

export function CoachCard({ coach, onPress, matchScore, rightSlot }: Props) {
  const location = [coach.city, coach.state].filter(Boolean).join(', ');
  return (
    <Pressable style={s.card} onPress={onPress}>
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
    </Pressable>
  );
}

export default CoachCard;

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  info: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  name: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flexShrink: 1 },
  title: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
