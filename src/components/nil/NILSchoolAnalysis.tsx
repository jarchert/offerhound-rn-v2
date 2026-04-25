// Ported from Lovable src/components/nil/NILSchoolAnalysis.tsx
// Web → RN mapping:
//   - Tailwind emerald/red/orange/yellow/purple utility colors → explicit hex/theme tokens
//   - shadcn/ui Card, Badge → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - CSS grid (grid-cols-2/md:grid-cols-5) → flex-wrap row with percent basis
//   - Proportional bar segments implemented with flex widths inside a fixed row
//   - Inline emoji ("⭐", "💡") kept as plain Text — renders in RN
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { School, MapPin, AlertTriangle, Shield } from 'lucide-react-native';
import { useNILSchoolData, STATE_TAX_DATA } from '@/hooks/useNILSchoolData';
import { colors, typography, spacing } from '@/lib/theme';

interface NILSchoolAnalysisProps {
  athleteProfileId: string;
}

function formatAvgNIL(amount: number | null): string {
  if (!amount || amount === 0) return 'N/A';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

// Segment color palette for tax breakdown bar. Mirrors web tailwind classes.
const SEG = {
  federal: '#ef4444',      // red-500 @ 70% via rgba
  federalBg: 'rgba(239,68,68,0.7)',
  selfEmp: '#f97316',      // orange-500
  selfEmpBg: 'rgba(249,115,22,0.7)',
  state: '#eab308',        // yellow-500
  stateBg: 'rgba(234,179,8,0.7)',
  local: '#a855f7',        // purple-500
  localBg: 'rgba(168,85,247,0.7)',
};

export function NILSchoolAnalysis({ athleteProfileId }: NILSchoolAnalysisProps) {
  const { schoolInterests, schoolData } = useNILSchoolData(athleteProfileId);

  const getSchoolData = (schoolName: string) =>
    (schoolData ?? []).find((s: any) => s.school_name === schoolName);
  const getStateTax = (state: string | null) => (state && STATE_TAX_DATA[state]) || null;

  if ((schoolInterests?.length ?? 0) === 0) {
    return (
      <Card>
        <CardContent style={styles.emptyContent}>
          <School size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>
            Add target schools from the survey tab to see detailed analysis
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {schoolInterests!.map((interest: any) => {
        const data: any = getSchoolData(interest.school_name);
        const taxInfo: any = getStateTax(interest.state || data?.state || null);
        const avgFunding = Number(data?.avg_nil_funding) || 0;
        const stateTaxRate =
          data?.state_income_tax_rate != null
            ? Number(data.state_income_tax_rate)
            : taxInfo?.rate ?? 0;
        const localTaxRate =
          data?.local_tax_rate != null ? Number(data.local_tax_rate) : taxInfo?.localRate ?? 0;
        const hasLuxury = data?.has_luxury_tax ?? taxInfo?.hasLuxury ?? false;
        const federalRate = 22;
        const selfEmploymentRate = 15.3;
        const totalTaxRate = federalRate + stateTaxRate + localTaxRate + selfEmploymentRate;
        const netPerDollar = 1 - totalTaxRate / 100;
        const estimatedTakeHome =
          avgFunding > 0 ? Math.round(avgFunding * netPerDollar) : 0;
        const state = interest.state || data?.state || 'Unknown';

        const level = interest.interest_level;
        const levelLabel =
          level === 'dream'
            ? '⭐ Dream School'
            : level === 'top_choice'
            ? 'Top Choice'
            : level === 'considering'
            ? 'Considering'
            : 'Interested';

        return (
          <Card key={interest.id}>
            <CardHeader>
              <View style={styles.headerRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.titleRow}>
                    <School size={18} color={colors.primary} />
                    <CardTitle>{interest.school_name}</CardTitle>
                  </View>
                  <View style={styles.locRow}>
                    <MapPin size={12} color={colors.mutedForeground} />
                    <CardDescription>
                      {(data?.city || interest.city || '—') + ', ' + state}
                      {data?.conference ? ` • ${data.conference}` : ''}
                    </CardDescription>
                  </View>
                </View>
                <Badge variant="outline">{levelLabel}</Badge>
              </View>
            </CardHeader>
            <CardContent>
              <View style={{ gap: spacing.md }}>
                {/* Stats grid */}
                <View style={styles.statsGrid}>
                  <Stat label="Avg School NIL" value={formatAvgNIL(avgFunding)} />
                  <Stat label="State Tax" value={`${stateTaxRate}%`} />
                  <Stat label="Local Tax" value={`${localTaxRate}%`} />
                  <Stat label="Net per $1" value={`$${netPerDollar.toFixed(2)}`} />
                  <Stat
                    label="Est. Take-Home"
                    value={estimatedTakeHome > 0 ? formatAvgNIL(estimatedTakeHome) : 'N/A'}
                    highlight
                  />
                </View>

                {/* Tax breakdown bar */}
                <View style={{ gap: 8 }}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barHeaderLabel}>Total Estimated Tax Burden</Text>
                    <Text style={styles.barHeaderValue}>{totalTaxRate.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.bar}>
                    <View style={{ flex: federalRate, backgroundColor: SEG.federalBg }} />
                    <View style={{ flex: selfEmploymentRate, backgroundColor: SEG.selfEmpBg }} />
                    <View style={{ flex: stateTaxRate, backgroundColor: SEG.stateBg }} />
                    {localTaxRate > 0 && (
                      <View style={{ flex: localTaxRate, backgroundColor: SEG.localBg }} />
                    )}
                  </View>
                  <View style={styles.legendRow}>
                    <LegendDot color={SEG.federal} label={`Federal ${federalRate}%`} />
                    <LegendDot color={SEG.selfEmp} label={`Self-Emp ${selfEmploymentRate}%`} />
                    <LegendDot color={SEG.state} label={`State ${stateTaxRate}%`} />
                    {localTaxRate > 0 && (
                      <LegendDot color={SEG.local} label={`Local ${localTaxRate}%`} />
                    )}
                  </View>
                </View>

                {/* Warnings */}
                <View style={styles.warningsRow}>
                  {hasLuxury && (
                    <Badge variant="destructive">
                      {'⚠ Luxury/Millionaire Tax'}
                    </Badge>
                  )}
                  {stateTaxRate === 0 && (
                    <Badge variant="success">{'🛡 No State Income Tax'}</Badge>
                  )}
                  {stateTaxRate > 8 && (
                    <Badge variant="warning">{'⚠ High Tax State'}</Badge>
                  )}
                </View>

                {taxInfo?.notes ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>💡 {taxInfo.notes}</Text>
                  </View>
                ) : null}
              </View>
            </CardContent>
          </Card>
        );
      })}
    </View>
  );
}

export default NILSchoolAnalysis;

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.statCell, highlight && styles.statCellHighlight]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContent: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCell: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 110,
    backgroundColor: colors.muted,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCellHighlight: { borderColor: colors.primary, backgroundColor: colors.card },
  statLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body, marginBottom: 4 },
  statValue: { fontSize: typography.fontSize.lg, color: colors.foreground, fontFamily: typography.fontFamily.heading, letterSpacing: typography.letterSpacing.heading },
  statValueHighlight: { color: colors.primary },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barHeaderLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  barHeaderValue: { fontSize: typography.fontSize.xs, color: colors.primary, fontFamily: typography.fontFamily.bodySemiBold },
  bar: { height: 12, borderRadius: 999, backgroundColor: colors.muted, overflow: 'hidden', flexDirection: 'row' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  warningsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteBox: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8 },
  noteText: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
});
