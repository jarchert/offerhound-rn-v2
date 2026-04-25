// Ported from Lovable src/components/nil/NILDashboard.tsx
// Web → RN mapping:
//   - Tailwind emerald-* classes → theme tokens (primary/card/muted) via StyleSheet
//   - shadcn/ui Tabs, Card, Input, Label → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - Controlled Tabs (RN Tabs requires value/onValueChange)
//   - Number input: keyboardType="numeric" on <Input />
import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent } from '@/components/ui/Card';
import { DollarSign } from 'lucide-react-native';
import { NILSchoolInterestSurvey } from './NILSchoolInterestSurvey';
import { NILSchoolAnalysis } from './NILSchoolAnalysis';
import { NILNetIncomeCalculator } from './NILNetIncomeCalculator';
import { NILSchoolSelector } from './NILSchoolSelector';
import { NILSideBySideComparison } from './NILSideBySideComparison';
import { NILDisclaimer } from '@/components/NILDisclaimer';
import { colors, typography, spacing } from '@/lib/theme';

interface NILDashboardProps {
  athleteProfileId: string;
}

export function NILDashboard({ athleteProfileId }: NILDashboardProps) {
  const [tab, setTab] = useState('compare');
  const [comparisonSchools, setComparisonSchools] = useState<{ name: string; state: string }[]>([]);
  const [comparisonGross, setComparisonGross] = useState('50000');
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const toggleSchool = (name: string, state: string) => {
    setComparisonSchools(prev =>
      prev.some(s => s.name === name)
        ? prev.filter(s => s.name !== name)
        : [...prev, { name, state }]
    );
  };

  const removeSchool = (name: string) => {
    setComparisonSchools(prev => prev.filter(s => s.name !== name));
  };

  return (
    <View style={styles.root}>
      <NILDisclaimer />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {/* Note: TabsTrigger wraps children in <Text>; icons cannot be nested
              inside RN <Text>, so we render text-only labels here. */}
          <TabsTrigger value="compare">Compare Schools</TabsTrigger>
          <TabsTrigger value="schools">Target Schools</TabsTrigger>
          <TabsTrigger value="analysis">School Analysis</TabsTrigger>
          <TabsTrigger value="calculator">Net Income</TabsTrigger>
        </TabsList>

        <TabsContent value="compare">
          <View style={{ gap: spacing.lg }}>
            <Card>
              <CardContent style={{ padding: spacing.md }}>
                <View style={[styles.grossRow, isWide && styles.grossRowWide]}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <Label>Gross NIL Income for Comparison</Label>
                    <View style={styles.inputWrap}>
                      <DollarSign size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                      <Input
                        value={comparisonGross}
                        onChangeText={setComparisonGross}
                        keyboardType="numeric"
                        placeholder="50000"
                        style={{ paddingLeft: 36 }}
                      />
                    </View>
                  </View>
                  <Text style={styles.help}>
                    Enter your projected NIL earnings to compare take-home pay across schools
                  </Text>
                </View>
              </CardContent>
            </Card>

            <NILSchoolSelector
              selectedSchools={comparisonSchools.map(s => s.name)}
              onToggleSchool={toggleSchool}
              maxSelections={4}
            />

            <NILSideBySideComparison
              schools={comparisonSchools}
              grossIncome={parseFloat(comparisonGross) || 0}
              onRemoveSchool={removeSchool}
            />
          </View>
        </TabsContent>

        <TabsContent value="schools">
          <NILSchoolInterestSurvey athleteProfileId={athleteProfileId} />
        </TabsContent>

        <TabsContent value="analysis">
          <NILSchoolAnalysis athleteProfileId={athleteProfileId} />
        </TabsContent>

        <TabsContent value="calculator">
          <NILNetIncomeCalculator athleteProfileId={athleteProfileId} />
        </TabsContent>
      </Tabs>
    </View>
  );
}

export default NILDashboard;

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  grossRow: { gap: spacing.md, flexDirection: 'column', alignItems: 'flex-start' },
  grossRowWide: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 12, zIndex: 1 },
  help: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body, paddingBottom: 8 },
});
