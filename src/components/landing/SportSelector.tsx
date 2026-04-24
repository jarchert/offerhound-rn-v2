// RN port of Lovable src/components/SportSelector.tsx.
// Web used shadcn <Select>; RN uses a Modal with a picker list for parity on iOS + Android.
// Variants: 'default' | 'compact' | 'mobile' — matches Lovable exactly.
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  ViewStyle,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { SPORTS_LIST, SportType, SPORTS_CONFIG } from '@/lib/data/sports';
import { colors, typography, spacing, radius } from '@/lib/theme';

// Sport icon emoji map — matches Lovable's visual treatment even though
// Lovable mixed Lucide icons + emoji. Using emoji uniformly is closer to the
// rendered mobile screenshot than a half-iconography.
const SPORT_ICONS: Record<SportType, string> = {
  football: '🏈',
  basketball: '🏀',
  soccer: '⚽',
  baseball: '⚾',
  softball: '🥎',
  volleyball: '🏐',
  'track-field': '🏃',
  swimming: '🏊',
  lacrosse: '🥍',
  hockey: '🏒',
  golf: '⛳',
  cheerleading: '📣',
  wrestling: '🤼',
};

export type SportSelectorVariant = 'default' | 'compact' | 'mobile';

interface SportSelectorProps {
  selectedSport: SportType;
  onSportChange: (sport: SportType) => void;
  variant?: SportSelectorVariant;
}

export function SportSelector({
  selectedSport,
  onSportChange,
  variant = 'default',
}: SportSelectorProps) {
  const [open, setOpen] = useState(false);
  const currentSport = SPORTS_CONFIG[selectedSport];

  const triggerStyle: ViewStyle = (() => {
    if (variant === 'compact') return s.triggerCompact;
    if (variant === 'mobile') return s.triggerMobile;
    return s.triggerDefault;
  })();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.triggerBase, triggerStyle, pressed && s.pressed]}
      >
        <View style={s.row}>
          {variant === 'mobile' && (
            <Text style={s.prefix}>Sport:</Text>
          )}
          <Text style={s.icon}>{SPORT_ICONS[selectedSport]}</Text>
          <Text
            style={[
              s.label,
              variant === 'mobile' && s.labelMobile,
              variant === 'compact' && s.labelCompact,
            ]}
          >
            {currentSport?.name || 'Football'}
          </Text>
        </View>
        <ChevronDown size={16} color={colors.foregroundSubtle} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Choose your sport</Text>
            <FlatList
              data={SPORTS_LIST}
              keyExtractor={(sport) => sport.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSportChange(item.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    s.item,
                    item.id === selectedSport && s.itemSelected,
                    pressed && s.pressed,
                  ]}
                >
                  <Text style={s.icon}>{SPORT_ICONS[item.id]}</Text>
                  <Text
                    style={[
                      s.itemLabel,
                      item.id === selectedSport && s.itemLabelSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.id === selectedSport && (
                    <Check size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  triggerBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    gap: spacing.xs,
  },
  triggerDefault: {
    width: 200,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  triggerCompact: {
    backgroundColor: 'rgba(39, 43, 52, 0.8)',
    borderColor: 'rgba(43, 48, 58, 0.5)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  triggerMobile: {
    width: '100%',
    backgroundColor: 'rgba(39, 43, 52, 0.9)',
    borderColor: 'rgba(231, 175, 8, 0.3)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.85 },
  prefix: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foregroundSubtle,
  },
  icon: { fontSize: 18 },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  labelCompact: { fontSize: typography.fontSize.sm },
  labelMobile: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
  },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
  },
  sheetTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  itemSelected: { backgroundColor: 'rgba(231, 175, 8, 0.1)' },
  itemLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  itemLabelSelected: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primary,
  },
});
