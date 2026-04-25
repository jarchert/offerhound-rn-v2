// Ported from Lovable src/components/nil/NILSideBySideComparison.tsx
// Web → RN mapping:
//   - Tailwind emerald/red/orange utility colors → theme tokens / explicit hex
//   - shadcn/ui Card, Badge → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - <input type="range"> slider — @react-native-community/slider is not installed,
//     so we substitute a stepper (−/+) plus a numeric Input. Step size matches web (1000).
//   - md:grid-cols-2/3/4 → flexDirection:'row', flexWrap:'wrap' with flex-basis sized
//     to (100/N)% and a minWidth so columns wrap on narrow screens.
//   - Visual % bars (tailwind width:%) → View with width:`${pct}%`
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  School, DollarSign, Shield, AlertTriangle, Trophy, X, SlidersHorizontal, Minus, Plus,
} from 'lucide-react-native';
import { STATE_TAX_DATA, useNILSchoolData } from '@/hooks/useNILSchoolData';
import { colors, typography, spacing } from '@/lib/theme';

interface SchoolSelection {
  name: string;
  state: string;
}

interface NILSideBySideComparisonProps {
  schools: SchoolSelection[];
  grossIncome: number;
  onRemoveSchool: (name: string) => void;
}

function calcSchoolNet(
  state: string,
  gross: number,
  schoolData?: { state_income_tax_rate?: number | null; local_tax_rate?: number | null; has_luxury_tax?: boolean | null }
) {
  const fallback = STATE_TAX_DATA[state];
  const stateRate = schoolData?.state_income_tax_rate != null
    ? Number(schoolData.state_income_tax_rate) : (fallback?.rate ?? 0);
  const localRate = schoolData?.local_tax_rate != null
    ? Number(schoolData.local_tax_rate) : (fallback?.localRate ?? 0);
  const hasLuxury = schoolData?.has_luxury_tax ?? fallback?.hasLuxury ?? false;
  const notes = fallback?.notes ?? '';

  const federalTax = gross * 0.22;
  const selfEmploymentTax = gross * 0.153;
  const stateTax = gross * (stateRate / 100);
  const localTax = gross * (localRate / 100);
  const luxuryTax = hasLuxury && gross > 1_000_000 ? (gross - 1_000_000) * 0.04 : 0;
  const totalTax = federalTax + selfEmploymentTax + stateTax + localTax + luxuryTax;
  const net = gross - totalTax;
  const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;
  return { net, federalTax, selfEmploymentTax, stateTax, localTax, luxuryTax, totalTax, effectiveRate, stateRate, localRate, hasLuxury, notes };
}

function formatAvgNIL(amount: number | null): string {
  if (!amount || amount === 0) return 'N/A';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export function NILSideBySideComparison({ schools, grossIncome, onRemoveSchool }: NILSideBySideComparisonProps) {
  const { schoolData } = useNILSchoolData();
  const [sliderValue, setSliderValue] = useState(grossIncome);

  // Sync slider when grossIncome changes externally (parity with web's render-time setState).
  const [lastGross, setLastGross] = useState(grossIncome);
  if (grossIncome !== lastGross) {
    setSliderValue(grossIncome);
    setLastGross(grossIncome);
  }

  const sliderMin = Math.max(0, Math.round(grossIncome * 0.1));
  const sliderMax = Math.round(grossIncome * 3) || 150_000;
  const step = 1000;
  const actualGross = sliderValue;

  const adjust = (delta: number) => {
    const next = Math.max(sliderMin, Math.min(sliderMax, sliderValue + delta));
    setSliderValue(next);
  };

  const comparisons = useMemo(() => {
    return schools.map((s) => {
      const sd: any = schoolData?.find((d: any) => d.school_name === s.name);
      const avgNil = Number(sd?.avg_nil_funding) || 0;
      return {
        ...s,
        ...calcSchoolNet(s.state, actualGross, sd ? {
          state_income_tax_rate: sd.state_income_tax_rate,
          local_tax_rate: sd.local_tax_rate,
          has_luxury_tax: sd.has_luxury_tax,
        } : undefined),
        avgNil,
        conference: sd?.conference || '',
        division: sd?.division || '',
        city: sd?.city || '',
      };
    });
  }, [schools, actualGross, schoolData]);

  const bestNet = comparisons.length ? Math.max(...comparisons.map(c => c.net)) : 0;
  const worstNet = comparisons.length ? Math.min(...comparisons.map(c => c.net)) : 0;
  const savingsDiff = bestNet - worstNet;

  if (schools.length === 0) {
    return (
      <Card>
        <CardContent style={styles.emptyContent}>
          <School size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Select schools above to compare</Text>
          <Text style={styles.emptySub}>Choose 2-4 schools to see a side-by-side earnings breakdown</Text>
        </CardContent>
      </Card>
    );
  }

  if (schools.length === 1) {
    return (
      <Card>
        <CardContent style={styles.emptyContent}>
          <Text style={styles.emptySub}>Select at least one more school to compare</Text>
        </CardContent>
      </Card>
    );
  }

  // Column flex-basis: emulate md:grid-cols-N. Min width keeps cards readable on phones.
  const colBasis = `${100 / Math.min(schools.length, 2)}%`;

  return (
    <View style={{ gap: spacing.md }}>
      {/* "Slider" — RN substitute (stepper + numeric input) */}
      <Card>
        <CardContent style={{ gap: spacing.sm, padding: spacing.md }}>
          <View style={styles.sliderHead}>
            <SlidersHorizontal size={14} color={colors.primary} />
            <Text style={styles.sliderLabel}>NIL Income Slider</Text>
            <Text style={styles.sliderValue}>${actualGross.toLocaleString()}</Text>
          </View>
          <View style={styles.stepperRow}>
            <Pressable onPress={() => adjust(-step * 5)} style={styles.stepBtn}>
              <Minus size={14} color={colors.primary} />
              <Text style={styles.stepBtnText}>5k</Text>
            </Pressable>
            <Pressable onPress={() => adjust(-step)} style={styles.stepBtn}>
              <Minus size={14} color={colors.primary} />
            </Pressable>
            <Input
              keyboardType="numeric"
              value={String(sliderValue)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ''));
                if (!isNaN(n)) setSliderValue(Math.max(sliderMin, Math.min(sliderMax, n)));
              }}
              containerStyle={{ flex: 1 }}
            />
            <Pressable onPress={() => adjust(step)} style={styles.stepBtn}>
              <Plus size={14} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => adjust(step * 5)} style={styles.stepBtn}>
              <Plus size={14} color={colors.primary} />
              <Text style={styles.stepBtnText}>5k</Text>
            </Pressable>
          </View>
          <View style={styles.rangeRow}>
            <Text style={styles.rangeText}>${sliderMin.toLocaleString()}</Text>
            <Text style={styles.rangeText}>Adjust to see take-home change</Text>
            <Text style={styles.rangeText}>${sliderMax.toLocaleString()}</Text>
          </View>
        </CardContent>
      </Card>

      {/* Summary banner */}
      {savingsDiff > 0 && (
        <Card style={{ borderColor: colors.primary }}>
          <CardContent style={styles.summaryBanner}>
            <Trophy size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                You could save <Text style={styles.summarySaveAmt}>${Math.round(savingsDiff).toLocaleString()}</Text> per year
              </Text>
              <Text style={styles.summarySub}>
                by choosing {comparisons.find(c => c.net === bestNet)?.name} over {comparisons.find(c => c.net === worstNet)?.name}
                {' '}(on ${actualGross.toLocaleString()} gross NIL income)
              </Text>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side columns */}
      <View style={styles.colsWrap}>
        {comparisons.map((c) => {
          const isBest = c.net === bestNet && comparisons.length > 1;
          const keepPct = actualGross > 0 ? (c.net / actualGross) * 100 : 0;
          const taxPct = actualGross > 0 ? (c.totalTax / actualGross) * 100 : 0;

          return (
            <View key={c.name} style={[styles.colCell, { flexBasis: colBasis as any }]}>
              <Card style={isBest ? { borderColor: colors.primary } : undefined}>
                <View style={[styles.colHead, isBest && styles.colHeadBest]}>
                  <View style={styles.colHeadLeft}>
                    {isBest && <Badge variant="success" style={{ marginRight: 4 }}>Best</Badge>}
                    <Text style={styles.colTitle} numberOfLines={1}>{c.name}</Text>
                  </View>
                  <Pressable onPress={() => onRemoveSchool(c.name)}>
                    <X size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <CardContent style={{ gap: spacing.sm }}>
                  <Text style={styles.locText}>
                    {c.city ? `${c.city}, ` : ''}{c.state}
                    {c.conference ? ` • ${c.conference}` : ''}
                    {c.division ? ` • ${c.division}` : ''}
                  </Text>
                  <View style={styles.warnRow}>
                    {c.stateRate === 0 && (
                      <Badge variant="success">🛡 No State Tax</Badge>
                    )}
                    {c.stateRate > 8 && (
                      <Badge variant="warning">⚠ High Tax</Badge>
                    )}
                    {c.hasLuxury && (
                      <Badge variant="destructive">⚠ Luxury Tax</Badge>
                    )}
                  </View>

                  {/* Avg NIL */}
                  <View style={styles.avgNilRow}>
                    <Text style={styles.avgNilLabel}>Avg School NIL</Text>
                    <Text style={styles.avgNilValue}>{formatAvgNIL(c.avgNil)}</Text>
                  </View>

                  {/* Take-home */}
                  <View style={styles.takeHomeBox}>
                    <DollarSign size={18} color={colors.primary} />
                    <Text style={styles.takeHomeAmt}>${Math.round(c.net).toLocaleString()}</Text>
                    <Text style={styles.takeHomeLabel}>Estimated Take-Home</Text>
                  </View>

                  {/* Tax breakdown */}
                  <View style={{ gap: 4 }}>
                    <BreakdownLine label="Federal (22%)" amount={c.federalTax} />
                    <BreakdownLine label="Self-Emp (15.3%)" amount={c.selfEmploymentTax} />
                    <BreakdownLine
                      label={`State (${c.stateRate}%)`}
                      amount={c.stateTax}
                      good={c.stateTax === 0}
                    />
                    {c.localTax > 0 && <BreakdownLine label={`Local (${c.localRate}%)`} amount={c.localTax} />}
                    {c.luxuryTax > 0 && <BreakdownLine label="Luxury Tax" amount={c.luxuryTax} />}
                    <View style={styles.effectiveRow}>
                      <Text style={styles.effectiveLabel}>Effective Rate</Text>
                      <Text style={styles.effectiveValue}>{c.effectiveRate.toFixed(1)}%</Text>
                    </View>
                  </View>

                  {/* Visual bar */}
                  <View style={{ gap: 4 }}>
                    <View style={styles.bar}>
                      <View style={[styles.barKeep, { width: `${Math.max(0, Math.min(100, keepPct))}%` }]} />
                      <View style={[styles.barTax, { width: `${Math.max(0, Math.min(100, taxPct))}%` }]} />
                    </View>
                    <View style={styles.barFooter}>
                      <Text style={styles.barFooterText}>Keep: {keepPct.toFixed(0)}%</Text>
                      <Text style={styles.barFooterText}>Tax: {c.effectiveRate.toFixed(0)}%</Text>
                    </View>
                  </View>

                  {c.notes ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>💡 {c.notes}</Text>
                    </View>
                  ) : null}
                </CardContent>
              </Card>
            </View>
          );
        })}
      </View>

      <Text style={styles.disclaimer}>
        ⚠️ Estimates for educational purposes only. Tax data auto-calculated per school from database. Consult a qualified tax professional.
      </Text>
    </View>
  );
}

export default NILSideBySideComparison;

function BreakdownLine({ label, amount, good }: { label: string; amount: number; good?: boolean }) {
  return (
    <View style={styles.breakdownLine}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownAmount, good && { color: colors.primary }]}>
        {good ? '$0' : `-$${Math.round(amount).toLocaleString()}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContent: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.primary, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bodySemiBold, textAlign: 'center' },
  emptySub: { color: colors.mutedForeground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.body, textAlign: 'center' },
  sliderHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sliderLabel: { fontSize: typography.fontSize.sm, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
  sliderValue: { marginLeft: 'auto', fontSize: typography.fontSize.lg, color: colors.primary, fontFamily: typography.fontFamily.heading, letterSpacing: typography.letterSpacing.heading },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, borderRadius: 6,
  },
  stepBtnText: { fontSize: typography.fontSize.xs, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText: { fontSize: 10, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  summaryBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  summaryTitle: { fontSize: typography.fontSize.sm, color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  summarySaveAmt: { fontSize: typography.fontSize.lg, color: colors.primary, fontFamily: typography.fontFamily.heading, letterSpacing: typography.letterSpacing.heading },
  summarySub: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body, marginTop: 2 },
  colsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: -spacing.xs / 2 },
  colCell: { flexGrow: 1, minWidth: 260, paddingHorizontal: spacing.xs / 2 },
  colHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm, paddingVertical: 8,
    backgroundColor: colors.muted,
  },
  colHeadBest: { backgroundColor: colors.card },
  colHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  colTitle: { fontSize: typography.fontSize.sm, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold, flex: 1 },
  locText: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  warnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  avgNilRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.muted, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  avgNilLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  avgNilValue: { fontSize: typography.fontSize.base, color: colors.primary, fontFamily: typography.fontFamily.heading, letterSpacing: typography.letterSpacing.heading },
  takeHomeBox: {
    backgroundColor: colors.card, borderRadius: 12, padding: spacing.md,
    borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', gap: 4,
  },
  takeHomeAmt: { fontSize: typography.fontSize['2xl'], color: colors.primary, fontFamily: typography.fontFamily.heading, letterSpacing: typography.letterSpacing.heading },
  takeHomeLabel: { fontSize: 10, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  breakdownLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  breakdownAmount: { fontSize: typography.fontSize.xs, color: colors.destructive, fontFamily: typography.fontFamily.body },
  effectiveRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: colors.border,
  },
  effectiveLabel: { fontSize: typography.fontSize.xs, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
  effectiveValue: { fontSize: typography.fontSize.xs, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
  bar: { height: 12, borderRadius: 999, backgroundColor: colors.muted, overflow: 'hidden', flexDirection: 'row' },
  barKeep: { height: '100%', backgroundColor: colors.primary },
  barTax: { height: '100%', backgroundColor: 'rgba(220,40,40,0.4)' },
  barFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  barFooterText: { fontSize: 10, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  noteBox: { backgroundColor: colors.muted, borderRadius: 6, padding: 8, borderWidth: 1, borderColor: colors.border },
  noteText: { fontSize: 10, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  disclaimer: { textAlign: 'center', fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
});
