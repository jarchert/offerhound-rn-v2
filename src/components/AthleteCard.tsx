// High-value building block: renders an athlete summary card used across
// coach/scout dashboards and search results.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, GraduationCap } from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';

export interface AthleteCardData {
  id: string;
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
}

interface Props {
  athlete: AthleteCardData;
  onPress?: () => void;
  matchScore?: number;
  rightSlot?: React.ReactNode;
}

export function AthleteCard({ athlete, onPress, matchScore, rightSlot }: Props) {
  const location = [athlete.city, athlete.state].filter(Boolean).join(', ');
  const position = athlete.position || athlete.positions?.[0];

  return (
    <Pressable style={s.card} onPress={onPress}>
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
    </Pressable>
  );
}

export default AthleteCard;

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  info: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'space-between' },
  name: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flexShrink: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  dot: { color: colors.mutedForeground, fontSize: 10 },
  school: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
});
