// ParentAthleteSwitcher — RN port of Lovable ParentAthleteSwitcher.tsx
// Shown in AthleteTabs header when user has parent + athlete role combo.
// Fetches linked children from parent_athlete_relationships, lets parent switch view.
// When only 1 or 0 athletes linked, renders nothing (parent sees their own athlete view).
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, FlatList } from 'react-native';
import { Users, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface LinkedAthlete {
  id: string;
  athlete_profile_id: string;
  athlete_name: string;
}

interface ParentAthleteSwitcherProps {
  onAthleteChange?: (athleteProfileId: string) => void;
}

export function ParentAthleteSwitcher({ onAthleteChange }: ParentAthleteSwitcherProps) {
  const { user, userRole } = useAuth();
  const [athletes, setAthletes] = useState<LinkedAthlete[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Only relevant when the user has the parent role or is an athlete with a linked parent
  const isParentUser = (userRole as string) === 'parent';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('parent_athlete_relationships')
        .select('id, athlete_profile_id')
        .eq('parent_user_id', user.id)
        .eq('invitation_accepted', true);
      if (error || !data || data.length === 0) return;

      const profileIds = data.map((d: any) => d.athlete_profile_id);
      const { data: profiles } = await supabase
        .from('player_profiles')
        .select('id, full_name')
        .in('id', profileIds);
      const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

      const mapped: LinkedAthlete[] = data.map((d: any) => ({
        id: d.id,
        athlete_profile_id: d.athlete_profile_id,
        athlete_name: nameMap.get(d.athlete_profile_id) || 'Athlete',
      }));
      setAthletes(mapped);
      if (!selectedId && mapped.length > 0) {
        setSelectedId(mapped[0].athlete_profile_id);
        onAthleteChange?.(mapped[0].athlete_profile_id);
      }
    })();
  }, [user]);

  // Only show if multiple linked athletes (single link doesn't need a switcher)
  if (athletes.length <= 1) return null;

  const selectedAthlete = athletes.find(a => a.athlete_profile_id === selectedId);

  const handleSelect = (athleteProfileId: string) => {
    setSelectedId(athleteProfileId);
    onAthleteChange?.(athleteProfileId);
    setPickerOpen(false);
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setPickerOpen(true)}>
        <Users size={14} color={colors.mutedForeground} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {selectedAthlete?.athlete_name || 'Select Athlete'}
        </Text>
        <ChevronDown size={12} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Switch Athlete View</Text>
            <FlatList
              data={athletes}
              keyExtractor={a => a.athlete_profile_id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.athlete_profile_id === selectedId && styles.optionActive]}
                  onPress={() => handleSelect(item.athlete_profile_id)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.athlete_name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.optionText, item.athlete_profile_id === selectedId && styles.optionTextActive]}>
                    {item.athlete_name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
    backgroundColor: colors.muted,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  triggerText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '80%',
    maxHeight: '60%',
  },
  sheetTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionActive: {
    backgroundColor: colors.primary + '20',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  optionText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  optionTextActive: {
    color: colors.primary,
  },
});
