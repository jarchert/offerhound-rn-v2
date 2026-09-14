// FootballProgramTab — 8-field form for hs_football_program.
// Upserts on owner_user_id conflict (one row per coach).
//
// Confirmed DB columns (live introspection 2026-08-24):
//   program_name, school_name, city, state, classification,
//   head_coach_name, head_coach_email, head_coach_phone
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Save } from 'lucide-react-native';

import { useFootballProgram, PROGRAM_EMPTY } from '@/hooks/useFootballProgram';
import type { FootballProgram } from '@/hooks/useFootballProgram';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing } from '@/lib/theme';

type Field = {
  key: keyof Omit<FootballProgram, 'id' | 'owner_user_id' | 'created_at' | 'updated_at'>;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

const FIELDS: Field[] = [
  { key: 'program_name',     label: 'Program Name',     placeholder: 'e.g. Riverside Eagles Football', autoCapitalize: 'words' },
  { key: 'school_name',      label: 'School Name',      placeholder: 'e.g. Riverside High School',     autoCapitalize: 'words' },
  { key: 'city',             label: 'City',             placeholder: 'e.g. Riverside',                 autoCapitalize: 'words' },
  { key: 'state',            label: 'State',            placeholder: 'e.g. CA',                        autoCapitalize: 'characters' },
  { key: 'classification',   label: 'Classification',   placeholder: 'e.g. 4A, Division I …',          autoCapitalize: 'characters' },
  { key: 'head_coach_name',  label: 'Head Coach Name',  placeholder: 'e.g. John Smith',                autoCapitalize: 'words' },
  { key: 'head_coach_email', label: 'Head Coach Email', placeholder: 'coach@school.edu',               keyboardType: 'email-address', autoCapitalize: 'none' },
  { key: 'head_coach_phone', label: 'Head Coach Phone', placeholder: '(555) 867-5309',                 keyboardType: 'phone-pad' },
];

export function FootballProgramTab() {
  const { user } = useAuth();
  const { program, isLoading, isPending, saveProgram } = useFootballProgram();
  const { toast } = useToast();

  const [form, setForm] = useState<typeof PROGRAM_EMPTY>({ ...PROGRAM_EMPTY });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (program) {
      setForm({
        program_name:     program.program_name     ?? '',
        school_name:      program.school_name      ?? '',
        city:             program.city             ?? '',
        state:            program.state            ?? '',
        classification:   program.classification   ?? '',
        head_coach_name:  program.head_coach_name  ?? '',
        head_coach_email: program.head_coach_email ?? '',
        head_coach_phone: program.head_coach_phone ?? '',
      });
      setDirty(false);
    }
  }, [program]);

  const set = (key: keyof typeof form, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!dirty || isPending) return;
    saveProgram({ ...form, owner_user_id: user?.id });
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
      <Card>
        <CardHeader>
          <CardTitle>
            <Text style={s.cardTitle}>Program Details</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {FIELDS.map(({ key, label, placeholder, keyboardType, autoCapitalize }) => (
            <View key={key} style={s.field}>
              <Label>{label}</Label>
              <Input
                value={form[key]}
                onChangeText={v => set(key, v)}
                placeholder={placeholder}
                keyboardType={keyboardType ?? 'default'}
                autoCapitalize={autoCapitalize ?? 'sentences'}
                testID={`field-${key}`}
              />
            </View>
          ))}

          <Button
            onPress={handleSave}
            disabled={!dirty || isPending}
            testID="save-program"
            style={s.saveBtn}
          >
            {isPending ? 'Saving…' : 'Save Program'}
          </Button>

          {!program && !dirty && (
            <Text style={s.hint}>
              Fill in your program details above — they will pre-fill your Email Block signature.
            </Text>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:      { padding: spacing.md, gap: spacing.md },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  field:     { gap: spacing.xs, marginBottom: spacing.sm },
  cardTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.foreground },
  saveBtn:   { marginTop: spacing.md },
  hint:      { fontSize: typography.fontSize.sm, color: colors.foregroundSubtle, marginTop: spacing.md, textAlign: 'center' },
});
