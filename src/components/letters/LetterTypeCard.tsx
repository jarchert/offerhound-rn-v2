// Parity port from Lovable src/components/letters/LetterTypeCard.tsx (verbatim logic).
// Web→RN mapping: shadcn Card/Badge → src/components/ui/*; lucide-react → lucide-react-native;
// Tailwind utility classes → StyleSheet using @/lib/theme tokens; cn() resolved at style-array level.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText, Sparkles } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface LetterTypeCardProps {
  type: string;
  title: string;
  description: string;
  category?: string;
  isSelected?: boolean;
  onClick: () => void;
}

export function LetterTypeCard({
  title,
  description,
  category,
  isSelected,
  onClick,
}: LetterTypeCardProps) {
  return (
    <Pressable onPress={onClick}>
      <Card style={StyleSheet.flatten([s.card, isSelected && s.cardSelected])}>
        <CardContent style={s.content}>
          <View style={[s.iconWrap, isSelected ? s.iconWrapSelected : s.iconWrapDefault]}>
            <FileText size={16} color={isSelected ? colors.primaryForeground : colors.primary} />
          </View>
          <View style={s.body}>
            <View style={s.titleRow}>
              <Text style={s.title} numberOfLines={1}>{title}</Text>
              {category ? (
                <Badge variant="outline" style={s.badge}>
                  {category}
                </Badge>
              ) : null}
            </View>
            <Text style={s.description} numberOfLines={2}>{description}</Text>
            {isSelected && (
              <View style={s.hintRow}>
                <Sparkles size={12} color={colors.primary} />
                <Text style={s.hintText}>Click "Generate" to create letter</Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}

export default LetterTypeCard;

const s = StyleSheet.create({
  // Card base — Lovable: cursor-pointer transition hover:border-primary/50 hover:shadow-md.
  // RN has no hover state; render the resting style and rely on `isSelected` for the active look.
  card: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
    // Lovable: ring-2 ring-primary/20 shadow-lg → mimic with thicker border + gold shadow.
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // CardContent override: p-4 flex items-start gap-3
  content: {
    padding: spacing.md,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 4, // gap-3 ≈ 12
  },
  // Icon wrap: p-2 rounded-lg shrink-0; selected → bg-primary; default → bg-primary/10
  iconWrap: {
    padding: spacing.sm,
    borderRadius: 8,
    flexShrink: 0,
  },
  iconWrapSelected: { backgroundColor: colors.primary },
  iconWrapDefault: { backgroundColor: 'rgba(231, 175, 8, 0.10)' },
  body: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 4, // gap-2 = 8
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    flexShrink: 1,
  },
  // Badge text styling — Lovable: text-[10px] capitalize. Pass through Badge children;
  // Badge's own Text uses xs (12). For closer parity, override via wrapper text size.
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  description: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  hintText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
});
