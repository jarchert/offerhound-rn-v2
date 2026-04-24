// RN port of Lovable src/components/ViewerTypeSelector.tsx.
// Two-button pill toggle "I am a..." — only visible when unauthenticated.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, Search } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/lib/theme';

export type ViewerType = 'athlete' | 'coach';

interface ViewerTypeSelectorProps {
  selectedType: ViewerType;
  onTypeChange: (type: ViewerType) => void;
  hidden?: boolean;
}

export function ViewerTypeSelector({
  selectedType,
  onTypeChange,
  hidden,
}: ViewerTypeSelectorProps) {
  if (hidden) return null;
  return (
    <View style={s.wrap}>
      <Text style={s.label}>I am a...</Text>
      <View style={s.buttons}>
        <Button
          variant={selectedType === 'athlete' ? 'hero' : 'outline'}
          size="lg"
          onPress={() => onTypeChange('athlete')}
          leftIcon={<Trophy size={20} color={selectedType === 'athlete' ? colors.primaryForeground : colors.foreground} />}
          style={selectedType === 'athlete' ? s.active : undefined}
        >
          Athlete / Parent
        </Button>
        <Button
          variant={selectedType === 'coach' ? 'hero' : 'outline'}
          size="lg"
          onPress={() => onTypeChange('coach')}
          leftIcon={<Search size={20} color={selectedType === 'coach' ? colors.primaryForeground : colors.foreground} />}
          style={selectedType === 'coach' ? s.active : undefined}
        >
          Coach / Scout
        </Button>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  active: {
    transform: [{ scale: 1.05 }],
  },
});
