// Ported from Lovable src/components/nil/NILNetIncomeCalculator.tsx
// Web → RN mapping:
//   - Tailwind emerald/red/orange/yellow/purple/pink utility colors → explicit hex/theme tokens
//   - shadcn/ui Card, Input, Label, Badge, Select → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - <input type="number"> → <Input keyboardType="numeric">
//   - md:grid-cols-2 / grid-cols-3 → flex row with flex:1 cells
//   - Comparison bar (CSS width %) → View with flex/width %
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calculator, DollarSign, TrendingDown, ArrowRight } from 'lucide-react-native';
import { useNILSchoolData, STATE_TAX_DATA } from '@/hooks/useNILSchoolData';
import { colors, typography, spacing } from '@/lib/theme';

interface NILNetIncomeCalculatorProps {
  athleteProfileId?: string;
}

// Mirror of Lovable tailwind segment colors at 60% opacity.
const SEG = {
  federal: 'rgba(239,68,68,0.6)',     // red-500
  selfEmp: 'rgba(249,115,22,0.6)',    // orange-500
  state: 'rgba(234,179,8,0.6)',       // yellow-500
  local: 'rgba(168,85,247,0.6)',      // purple-500
  luxury: 'rgba(236,72,153,0.6)',     // pink-500
};

export function NILNetIncomeCalculator({ athleteProfileId }: NILNetIncomeCalculatorProps) {
  const { schoolInterests } = useNILSchoolData(athleteProfileId);
  const states = Object.keys(STATE_TAX_DATA).sort();

  const [grossIncome, setGrossIncome] = useState('50000');
  const [selectedState, setSelectedState] = useState(
    (schoolInterests as any)?.[0]?.state || 'Texas'
  );

  const calculation = useMemo(() => {
    const gross = parseFloat(grossIncome) || 0;
    const tax = STATE_TAX_DATA[selectedState];
    if (!tax) return null;

    const federalTax = gross * 0.22;
    const selfEmploymentTax = gross * 0.153;
    const stateTax = gross * (tax.rate / 100);
    const localTax = gross * (tax.localRate / 100);
    const luxuryTax = tax.hasLuxury && gross > 1_000_000 ? (gross - 1_000_000) * 0.04 : 0;
    const totalTax = federalTax + selfEmploymentTax + stateTax + localTax + luxuryTax;
    const netIncome = gross - totalTax;
    const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;
    return {
      gross, federalTax, selfEmploymentTax, stateTax, localTax, luxuryTax,
      totalTax, netIncome, effectiveRate, stateRate: tax.rate, notes: tax.notes,
    };
  }, [grossIncome, selectedState]);

  const comparisons = useMemo(() => {
    const gross = parseFloat(grossIncome) || 0;
    if (!schoolInterests || schoolInterests.length === 0) return [];
    return schoolInterests.map((interest: any) => {
      const state = interest.state || '';
      const tax = STATE_TAX_DATA[state];
      if (!tax) return { school: interest.school_name, state, net: gross, rate: 0 };
      const totalRate = 22 + 15.3 + tax.rate + tax.localRate;
      const net = gross * (1 - totalRate / 100);
      return { school: interest.school_name, state, net, rate: totalRate };
    }).sort((a: any, b: any) => b.net - a.net);
  }, [grossIncome, schoolInterests]);

  const breakdownItems = calculation ? [
    { label: 'Federal Income Tax (22%)', amount: calculation.federalTax, color: SEG.federal },
    { label: 'Self-Employment Tax (15.3%)', amount: calculation.selfEmploymentTax, color: SEG.selfEmp },
    { label: `State Tax - ${selectedState} (${calculation.stateRate}%)`, amount: calculation.stateTax, color: SEG.state },
    ...(calculation.localTax > 0 ? [{ label: 'Local/City Tax', amount: calculation.localTax, color: SEG.local }] : []),
    ...(calculation.luxuryTax > 0 ? [{ label: 'Luxury/Millionaire Tax', amount: calculation.luxuryTax, color: SEG.luxury }] : []),
  ] : [];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <CardHeader>
          <View style={styles.titleRow}>
            <Calculator size={20} color={colors.primary} />
            <CardTitle>Net Income Calculator</CardTitle>
          </View>
          <CardDescription>Estimate your take-home NIL earnings after all taxes</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing.md }}>
          <View style={styles.inputRow}>
            <View style={styles.inputCell}>
              <Label>Gross NIL Income ($)</Label>
              <Input
                keyboardType="numeric"
                value={grossIncome}
                onChangeText={setGrossIncome}
                placeholder="50000"
              />
            </View>
            <View style={styles.inputCell}>
              <Label>State</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>
                      {`${s} (${STATE_TAX_DATA[s].rate}%)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          </View>

          {calculation && (
            <>
              {/* Big result */}
              <View style={styles.resultRow}>
                <View style={styles.resultBox}>
                  <DollarSign size={18} color={colors.primary} />
                  <Text style={styles.resultBig}>${calculation.gross.toLocaleString()}</Text>
                  <Text style={styles.resultLabel}>Gross Income</Text>
                </View>
                <View style={styles.resultBoxPlain}>
                  <TrendingDown size={18} color={colors.destructive} />
                  <Text style={[styles.resultMid, { color: colors.destructive }]}>
                    -${Math.round(calculation.totalTax).toLocaleString()}
                  </Text>
                  <Text style={[styles.resultLabel, { color: colors.destructive }]}>Total Taxes</Text>
                </View>
                <View style={[styles.resultBox, styles.resultBoxHighlight]}>
                  <ArrowRight size={18} color={colors.primary} />
                  <Text style={[styles.resultBig, { color: colors.primary }]}>
                    ${Math.round(calculation.netIncome).toLocaleString()}
                  </Text>
                  <Text style={styles.resultLabel}>Take Home</Text>
                </View>
              </View>

              {/* Breakdown rows */}
              <View style={{ gap: 6 }}>
                {breakdownItems.map((item, i) => (
                  <View key={i} style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelWrap}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                    </View>
                    <Text style={styles.breakdownAmount}>
                      -${Math.round(item.amount).toLocaleString()}
                    </Text>
                  </View>
                ))}
                <View style={styles.effectiveRow}>
                  <Text style={styles.effectiveLabel}>Effective Tax Rate</Text>
                  <Text style={styles.effectiveValue}>{calculation.effectiveRate.toFixed(1)}%</Text>
                </View>
              </View>

              {calculation.notes ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>💡 {calculation.notes}</Text>
                </View>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* School Comparison */}
      {comparisons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings Comparison by School</CardTitle>
            <CardDescription>See how your NIL take-home varies across your target schools</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.sm }}>
            {comparisons.map((c: any, i: number) => {
              const maxNet = comparisons[0]?.net || 1;
              const pct = Math.max(0, Math.min(100, (c.net / maxNet) * 100));
              return (
                <View key={i} style={{ gap: 4 }}>
                  <View style={styles.compHeader}>
                    <View style={styles.compHeaderLeft}>
                      {i === 0 && <Badge variant="success" style={{ marginRight: 4 }}>Best</Badge>}
                      <Text style={styles.compSchool}>{c.school}</Text>
                      <Text style={styles.compState}>({c.state})</Text>
                    </View>
                    <Text style={styles.compNet}>${Math.round(c.net).toLocaleString()}</Text>
                  </View>
                  <View style={styles.compBarBg}>
                    <View style={[styles.compBarFill, { width: `${pct}%`, backgroundColor: i === 0 ? colors.primary : 'rgba(231,175,8,0.5)' }]} />
                  </View>
                </View>
              );
            })}
            <Text style={styles.disclaimer}>
              ⚠️ These are estimates for educational purposes only. Consult a qualified tax professional for advice.
            </Text>
          </CardContent>
        </Card>
      )}
    </View>
  );
}

export default NILNetIncomeCalculator;

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  inputCell: { flexGrow: 1, flexBasis: 200, gap: 4 },
  resultRow: { flexDirection: 'row', gap: 8 },
  resultBox: {
    flex: 1, padding: spacing.sm, borderRadius: 12,
    backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 4,
  },
  resultBoxPlain: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  resultBoxHighlight: { borderColor: colors.primary, backgroundColor: colors.card },
  resultBig: { fontSize: typography.fontSize['2xl'], fontFamily: typography.fontFamily.heading, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  resultMid: { fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.heading, letterSpacing: typography.letterSpacing.heading },
  resultLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  breakdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    backgroundColor: colors.muted, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  breakdownLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: typography.fontSize.sm, color: colors.mutedForeground, fontFamily: typography.fontFamily.body, flexShrink: 1 },
  breakdownAmount: { fontSize: typography.fontSize.sm, color: colors.destructive, fontFamily: typography.fontFamily.bodySemiBold },
  effectiveRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    backgroundColor: colors.card, borderRadius: 6,
    borderWidth: 1, borderColor: colors.primary,
  },
  effectiveLabel: { fontSize: typography.fontSize.sm, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
  effectiveValue: { fontSize: typography.fontSize.sm, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
  noteBox: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8 },
  noteText: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  compHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  compSchool: { fontSize: typography.fontSize.sm, color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  compState: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  compNet: { fontSize: typography.fontSize.sm, color: colors.primary, fontFamily: typography.fontFamily.heading, letterSpacing: typography.letterSpacing.heading },
  compBarBg: { height: 8, borderRadius: 999, backgroundColor: colors.muted, overflow: 'hidden' },
  compBarFill: { height: '100%' },
  disclaimer: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body, marginTop: spacing.sm },
});
