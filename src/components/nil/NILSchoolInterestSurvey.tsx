// Ported from Lovable src/components/nil/NILSchoolInterestSurvey.tsx
// Web → RN mapping:
//   - Tailwind emerald-* → theme tokens via StyleSheet
//   - shadcn/ui Card, Input, Badge, Select → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - <button> → <Pressable>
//   - overflow-y-auto container → <ScrollView> with fixed maxHeight
//   - useNILSchoolData hook reused as-is from @/hooks/useNILSchoolData
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Search, Plus, X, School, Heart } from 'lucide-react-native';
import { useNILSchoolData } from '@/hooks/useNILSchoolData';
import { colors, typography, spacing } from '@/lib/theme';

interface NILSchoolInterestSurveyProps {
  athleteProfileId: string;
}

export function NILSchoolInterestSurvey({ athleteProfileId }: NILSchoolInterestSurveyProps) {
  const { schoolInterests, schoolData, addSchoolInterest, removeSchoolInterest } =
    useNILSchoolData(athleteProfileId);
  const [search, setSearch] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('interested');

  const filteredSchools = (schoolData ?? []).filter(
    (s: any) =>
      s.school_name.toLowerCase().includes(search.toLowerCase()) &&
      !(schoolInterests ?? []).some((i: any) => i.school_name === s.school_name),
  );

  const handleAdd = (school: any) => {
    addSchoolInterest.mutate({
      school_name: school.school_name,
      city: school.city || undefined,
      state: school.state || undefined,
      conference: school.conference || undefined,
      division: school.division || undefined,
      interest_level: selectedInterest,
    });
    setSearch('');
  };

  return (
    <Card>
      <CardHeader>
        <View style={styles.titleRow}>
          <Heart size={18} color={colors.primary} />
          <CardTitle>Target Schools</CardTitle>
        </View>
        <CardDescription>
          Add schools you're interested in to compare NIL earnings and tax impact
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={{ gap: spacing.md }}>
          {(schoolInterests?.length ?? 0) > 0 && (
            <View style={styles.badgeWrap}>
              {schoolInterests!.map((interest: any) => (
                <View key={interest.id} style={styles.interestBadge}>
                  <School size={12} color={colors.primary} />
                  <Text style={styles.interestText}>{interest.school_name}</Text>
                  {interest.state ? (
                    <Text style={styles.interestTextSubtle}>({interest.state})</Text>
                  ) : null}
                  <Pressable
                    onPress={() => removeSchoolInterest.mutate(interest.id)}
                    style={styles.closeBtn}
                    hitSlop={6}
                  >
                    <X size={12} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
              <Input
                placeholder="Search schools..."
                value={search}
                onChangeText={setSearch}
                style={{ paddingLeft: 36 }}
              />
            </View>
            <View style={styles.selectWrap}>
              <Select value={selectedInterest} onValueChange={setSelectedInterest}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dream">Dream School</SelectItem>
                  <SelectItem value="top_choice">Top Choice</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="considering">Considering</SelectItem>
                </SelectContent>
              </Select>
            </View>
          </View>

          {search.length >= 2 && (
            <ScrollView style={styles.results} nestedScrollEnabled>
              {filteredSchools.length === 0 ? (
                <Text style={styles.noResults}>No matching schools found</Text>
              ) : (
                filteredSchools.slice(0, 10).map((school: any) => (
                  <Pressable
                    key={school.id}
                    onPress={() => handleAdd(school)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{school.school_name}</Text>
                      <Text style={styles.resultMeta}>
                        {school.conference} • {school.division} • {school.city}, {school.state}
                      </Text>
                    </View>
                    <Plus size={16} color={colors.primary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}

          {(schoolInterests?.length ?? 0) === 0 && (
            <View style={styles.empty}>
              <School size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>
                Add target schools to see NIL earnings comparison and tax analysis
              </Text>
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
}

export default NILSchoolInterestSurvey;

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  interestText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.foreground },
  interestTextSubtle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  closeBtn: { padding: 2, borderRadius: 4, marginLeft: 4 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInputWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  selectWrap: { width: 144 },
  results: {
    maxHeight: 192,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 8,
  },
  noResults: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, fontFamily: typography.fontFamily.body, padding: 8 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
  },
  resultRowPressed: { backgroundColor: colors.muted },
  resultName: { fontSize: typography.fontSize.sm, color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  resultMeta: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center', fontFamily: typography.fontFamily.body },
});
