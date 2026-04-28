// SportSelector — RN port.
// Lovable's SportSelector is a single-select dropdown over SPORTS_LIST. Per spec
// for the full profile editor we need a multi-select chip picker so athletes can
// designate primary + secondary sports. We expose BOTH modes: single (legacy
// onSportChange) and multi (onSportsChange), matching the surfaces that consume it.
//
// Translation notes:
//   - shadcn Select → chip grid (Pressable + Badge styles)
//   - Tailwind → StyleSheet via theme tokens
//   - Reads SPORTS_CONFIG from src/lib/data/sports.ts (parity with Lovable's SPORTS_LIST)
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { SPORTS_CONFIG, SportType, SportConfig } from '@/lib/data/sports';
import { colors, typography, spacing } from '@/lib/theme';

type SingleProps = {
  mode?: 'single';
  selectedSport: SportType;
  onSportChange: (sport: SportType) => void;
  variant?: 'default' | 'compact' | 'mobile';
};
type MultiProps = {
  mode: 'multi';
  selectedSports: SportType[];
  onSportsChange: (sports: SportType[]) => void;
  /** Maximum number of sports the user may pick (default 3). */
  max?: number;
};

export type SportSelectorProps = SingleProps | MultiProps;

const SPORTS_LIST: SportConfig[] = Object.values(SPORTS_CONFIG);

export function SportSelector(props: SportSelectorProps) {
  if (props.mode === 'multi') {
    return <MultiSportPicker {...props} />;
  }
  return <SingleSportPicker {...(props as SingleProps)} />;
}

function SingleSportPicker({ selectedSport, onSportChange }: SingleProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {SPORTS_LIST.map((sport) => {
        const active = sport.id === selectedSport;
        return (
          <Pressable
            key={sport.id}
            onPress={() => onSportChange(sport.id)}
            style={[s.chip, active && s.chipActive]}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{sport.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function MultiSportPicker({ selectedSports, onSportsChange, max = 3 }: MultiProps) {
  const toggle = (id: SportType) => {
    if (selectedSports.includes(id)) {
      onSportsChange(selectedSports.filter((s) => s !== id));
    } else {
      if (selectedSports.length >= max) return;
      onSportsChange([...selectedSports, id]);
    }
  };

  return (
    <View style={s.grid}>
      {SPORTS_LIST.map((sport) => {
        const active = selectedSports.includes(sport.id);
        const disabled = !active && selectedSports.length >= max;
        return (
          <Pressable
            key={sport.id}
            onPress={() => toggle(sport.id)}
            disabled={disabled}
            style={[s.chip, active && s.chipActive, disabled && s.chipDisabled]}
          >
            {active && <Check size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />}
            <Text style={[s.chipText, active && s.chipTextActive, disabled && s.chipTextDisabled]}>
              {sport.name}
            </Text>
          </Pressable>
        );
      })}
      <Text style={s.helper}>
        {selectedSports.length} / {max} selected
      </Text>
    </View>
  );
}

export default SportSelector;

const s = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.4 },
  chipText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  chipTextActive: { color: colors.primaryForeground },
  chipTextDisabled: { color: colors.mutedForeground },
  helper: {
    width: '100%',
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
});
