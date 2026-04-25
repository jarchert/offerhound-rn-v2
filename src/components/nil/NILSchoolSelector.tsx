// Ported from Lovable src/components/nil/NILSchoolSelector.tsx
// Web → RN mapping:
//   - Tailwind emerald-* utility classes → theme tokens via StyleSheet
//   - shadcn/ui Card, Button, Input, Badge, Select, Checkbox → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - CSS grid (12-col) → flexDirection:'row' rows w/ flex weights matching col-spans
//   - max-h scrollable list → ScrollView with maxHeight
//   - <input> search → <Input> with onChangeText
//   - Filters toggle: collapsible <View> on showFilters
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Search, Filter, ArrowUpDown, School, Plus, Check, ChevronDown, ChevronUp, Shield } from 'lucide-react-native';
import { useNILSchoolData, STATE_TAX_DATA } from '@/hooks/useNILSchoolData';
import { colors, typography, spacing } from '@/lib/theme';

interface NILSchoolSelectorProps {
  selectedSchools: string[];
  onToggleSchool: (schoolName: string, state: string) => void;
  maxSelections?: number;
}

const CONFERENCES = [
  'All', 'SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12', 'AAC', 'Mountain West',
  'Sun Belt', 'Conference USA', 'MAC', 'Independent', 'Ivy League', 'Patriot League',
  'Big East', 'WCC', 'A-10', 'Missouri Valley', 'Colonial', 'Horizon',
];

const DIVISIONS = ['All', 'Division I', 'Division II', 'Division III', 'NAIA', 'JUCO'];

const STATES_LIST = ['All', ...Object.keys(STATE_TAX_DATA).sort()];

type SortField = 'name' | 'state_tax' | 'conference' | 'state' | 'avg_nil';
type SortDir = 'asc' | 'desc';

function formatAvgNIL(amount: number | null): string {
  if (!amount || amount === 0) return 'N/A';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export function NILSchoolSelector({ selectedSchools, onToggleSchool, maxSelections = 4 }: NILSchoolSelectorProps) {
  const { schoolData } = useNILSchoolData();
  const [search, setSearch] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [taxFriendlyOnly, setTaxFriendlyOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('avg_nil');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir(field === 'name' ? 'asc' : 'desc'); }
  };

  const filteredSchools = useMemo(() => {
    let list = schoolData || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s: any) =>
        s.school_name.toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.conference || '').toLowerCase().includes(q)
      );
    }
    if (conferenceFilter !== 'All') list = list.filter((s: any) => s.conference === conferenceFilter);
    if (divisionFilter !== 'All') list = list.filter((s: any) => s.division === divisionFilter);
    if (stateFilter !== 'All') list = list.filter((s: any) => s.state === stateFilter);
    if (taxFriendlyOnly) {
      const noTaxStates = Object.entries(STATE_TAX_DATA).filter(([, v]) => v.rate === 0).map(([k]) => k);
      list = list.filter((s: any) => s.state && noTaxStates.includes(s.state));
    }
    list = [...list].sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.school_name.localeCompare(b.school_name); break;
        case 'state_tax': {
          const rateA = a.state_income_tax_rate ?? STATE_TAX_DATA[a.state || '']?.rate ?? 99;
          const rateB = b.state_income_tax_rate ?? STATE_TAX_DATA[b.state || '']?.rate ?? 99;
          cmp = Number(rateA) - Number(rateB);
          break;
        }
        case 'avg_nil': cmp = (Number(a.avg_nil_funding) || 0) - (Number(b.avg_nil_funding) || 0); break;
        case 'conference': cmp = (a.conference || '').localeCompare(b.conference || ''); break;
        case 'state': cmp = (a.state || '').localeCompare(b.state || ''); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [schoolData, search, conferenceFilter, divisionFilter, stateFilter, taxFriendlyOnly, sortField, sortDir]);

  const hasActiveFilter = conferenceFilter !== 'All' || divisionFilter !== 'All' || stateFilter !== 'All' || taxFriendlyOnly;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} color={colors.mutedForeground} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} color={colors.primary} />
      : <ChevronDown size={12} color={colors.primary} />;
  };

  return (
    <Card>
      <CardHeader>
        <View style={styles.titleRow}>
          <School size={20} color={colors.primary} />
          <CardTitle>Select Schools to Compare</CardTitle>
        </View>
        <CardDescription>
          Choose up to {maxSelections} schools — tax & NIL data auto-populated from 301 schools
        </CardDescription>
      </CardHeader>
      <CardContent style={{ gap: spacing.md }}>
        {selectedSchools.length > 0 && (
          <View style={styles.selectedRow}>
            <Text style={styles.selectedLabel}>{selectedSchools.length}/{maxSelections} selected:</Text>
            {selectedSchools.map(name => (
              <Badge key={name} variant="outline" style={styles.selectedBadge}>{name}</Badge>
            ))}
          </View>
        )}

        {/* Search + filter toggle */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
            <Input
              placeholder="Search schools by name, city, state, or conference..."
              value={search}
              onChangeText={setSearch}
              containerStyle={{ flex: 1 }}
              style={{ paddingLeft: 36 }}
            />
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={() => setShowFilters(!showFilters)}
            leftIcon={<Filter size={14} color={colors.primary} />}
          >
            Filters{hasActiveFilter ? ' •' : ''}
          </Button>
        </View>

        {showFilters && (
          <View style={styles.filtersBox}>
            <View style={styles.filterCell}>
              <Text style={styles.filterLabel}>Conference</Text>
              <Select value={conferenceFilter} onValueChange={setConferenceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONFERENCES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </View>
            <View style={styles.filterCell}>
              <Text style={styles.filterLabel}>Division</Text>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </View>
            <View style={styles.filterCell}>
              <Text style={styles.filterLabel}>State</Text>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATES_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </View>
            <Pressable
              onPress={() => setTaxFriendlyOnly(v => !v)}
              style={styles.taxFriendlyRow}
            >
              <Checkbox checked={taxFriendlyOnly} onCheckedChange={v => setTaxFriendlyOnly(!!v)} />
              <Text style={styles.filterLabel}>No state income tax only</Text>
            </Pressable>
          </View>
        )}

        {/* Column header (sort buttons) */}
        <View style={styles.colHeader}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => toggleSort('name')} style={[styles.colBtn, { flex: 3 }]}>
            <Text style={styles.colHeaderText}>School</Text><SortIcon field="name" />
          </Pressable>
          <Pressable onPress={() => toggleSort('conference')} style={[styles.colBtn, { flex: 2 }]}>
            <Text style={styles.colHeaderText}>Conference</Text><SortIcon field="conference" />
          </Pressable>
          <Pressable onPress={() => toggleSort('state')} style={[styles.colBtn, { flex: 1 }]}>
            <Text style={styles.colHeaderText}>State</Text><SortIcon field="state" />
          </Pressable>
          <Pressable onPress={() => toggleSort('state_tax')} style={[styles.colBtn, { flex: 2 }]}>
            <Text style={styles.colHeaderText}>Tax</Text><SortIcon field="state_tax" />
          </Pressable>
          <Pressable onPress={() => toggleSort('avg_nil')} style={[styles.colBtn, { flex: 2 }]}>
            <Text style={styles.colHeaderText}>NIL</Text><SortIcon field="avg_nil" />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        {/* List */}
        <ScrollView style={styles.listScroll} nestedScrollEnabled>
          {filteredSchools.length === 0 ? (
            <Text style={styles.emptyText}>No schools match your filters</Text>
          ) : (
            filteredSchools.map((school: any) => {
              const isSelected = selectedSchools.includes(school.school_name);
              const taxRate = school.state_income_tax_rate != null
                ? Number(school.state_income_tax_rate)
                : STATE_TAX_DATA[school.state || '']?.rate;
              const atMax = selectedSchools.length >= maxSelections && !isSelected;
              const avgNil = Number(school.avg_nil_funding) || 0;

              return (
                <Pressable
                  key={school.id}
                  onPress={() => !atMax && onToggleSchool(school.school_name, school.state || '')}
                  disabled={atMax}
                  style={[
                    styles.row,
                    isSelected && styles.rowSelected,
                    atMax && styles.rowDisabled,
                  ]}
                >
                  <View style={[styles.rowCol, { flex: 1, alignItems: 'center' }]}>
                    {isSelected ? (
                      <View style={styles.checkBox}><Check size={12} color="#fff" /></View>
                    ) : (
                      <View style={styles.checkBoxEmpty} />
                    )}
                  </View>
                  <View style={[styles.rowCol, { flex: 3 }]}>
                    <Text style={styles.rowName} numberOfLines={1}>{school.school_name}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {school.city || ''}{school.city ? ', ' : ''}{school.state || ''}
                    </Text>
                  </View>
                  <View style={[styles.rowCol, { flex: 2 }]}>
                    <Text style={styles.rowSub} numberOfLines={1}>{school.conference || '—'}</Text>
                  </View>
                  <View style={[styles.rowCol, { flex: 1 }]}>
                    <Text style={styles.rowSub} numberOfLines={1}>{school.state || '—'}</Text>
                  </View>
                  <View style={[styles.rowCol, { flex: 2 }]}>
                    {taxRate !== undefined ? (
                      <Badge
                        variant={taxRate === 0 ? 'success' : taxRate > 8 ? 'warning' : 'outline'}
                        style={styles.taxBadge}
                      >
                        {taxRate === 0 ? '🛡 0%' : `${taxRate}%`}
                      </Badge>
                    ) : (
                      <Text style={styles.rowSub}>—</Text>
                    )}
                  </View>
                  <View style={[styles.rowCol, { flex: 2 }]}>
                    <Text style={[styles.nilValue, avgNil > 5_000_000 && styles.nilValueHigh]}>
                      {formatAvgNIL(avgNil)}
                    </Text>
                  </View>
                  <View style={[styles.rowCol, { flex: 1, alignItems: 'flex-end' }]}>
                    {!isSelected && !atMax && <Plus size={14} color={colors.mutedForeground} />}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Text style={styles.footerText}>
          {filteredSchools.length} schools found • Tax & NIL data auto-populated
        </Text>
      </CardContent>
    </Card>
  );
}

export default NILSchoolSelector;

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  selectedLabel: { fontSize: typography.fontSize.xs, color: colors.primary, fontFamily: typography.fontFamily.body },
  selectedBadge: { borderColor: colors.primary },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  searchWrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 10, top: 12, zIndex: 1 },
  filtersBox: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  filterCell: { gap: 4 },
  filterLabel: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  taxFriendlyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  colBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colHeaderText: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  listScroll: { maxHeight: 400 },
  emptyText: { textAlign: 'center', color: colors.mutedForeground, fontSize: typography.fontSize.sm, paddingVertical: spacing.lg, fontFamily: typography.fontFamily.body },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
    marginBottom: 2,
  },
  rowSelected: { backgroundColor: colors.muted, borderColor: colors.primary },
  rowDisabled: { opacity: 0.4 },
  rowCol: { justifyContent: 'center' },
  rowName: { fontSize: typography.fontSize.sm, color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold },
  rowSub: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  checkBox: { width: 18, height: 18, borderRadius: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkBoxEmpty: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  taxBadge: { paddingHorizontal: 6, paddingVertical: 1 },
  nilValue: { fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.bodySemiBold },
  nilValueHigh: { color: colors.primary },
  footerText: { textAlign: 'center', fontSize: typography.fontSize.xs, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
});
