// BulkExportButton — verbatim port from Lovable web.
// Source: offerhound-repo/src/components/BulkExportButton.tsx
//
// Web-only APIs replaced with RN equivalents:
//   • lucide-react             → lucide-react-native
//   • <div>/<span>/<p>         → View / Text
//   • Blob + URL.createObjectURL + <a download> → expo-file-system + expo-sharing
//   • jsPDF (web-only)         → plain-text report + share (same pattern as AdminBetaFeedbackDashboard)
//   • Dialog/Button/Checkbox/ScrollArea/Badge → RN ui primitives in @/components/ui/*
// All business logic (selection, fetch, CSV shape, toasts) preserved verbatim.

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download, FileType, FileText } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface SavedAthlete {
  id: string;
  athlete_profile_id: string;
  notes: string | null;
  priority: string | null;
  player_profiles?: {
    id: string;
    full_name: string;
    position: string | null;
    school: string | null;
    graduation_year: string | null;
    height: string | null;
    weight: string | null;
    gpa: string | null;
    forty_yard: string | null;
    vertical: string | null;
    bench_press: string | null;
    squat: string | null;
    arm_length: string | null;
    city: string | null;
    state: string | null;
    bio: string | null;
    highlights_description: string | null;
    hudl_url: string | null;
    twitter_url: string | null;
    instagram_url: string | null;
    email: string | null;
    phone: string | null;
    traits: string[] | null;
    intangibles: string[] | null;
  };
}

interface BulkExportButtonProps {
  savedAthletes: SavedAthlete[];
  className?: string;
}

export function BulkExportButton({ savedAthletes }: BulkExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const { toast } = useToast();

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === savedAthletes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(savedAthletes.map((a) => a.athlete_profile_id)));
    }
  };

  const fetchFullProfiles = async (ids: string[]) => {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }
    return data;
  };

  // jsPDF is web-only; build a plain-text report instead (same approach as AdminBetaFeedbackDashboard).
  const generateBulkPDF = (profiles: any[]) => {
    const lines: string[] = [];
    profiles.forEach((profile, index) => {
      if (index > 0) lines.push('', '----------------------------------------', '');
      lines.push(profile.full_name);
      const subtitle = [profile.position, profile.school].filter(Boolean).join(' | ');
      if (subtitle) lines.push(subtitle);
      lines.push(`Class of ${profile.graduation_year || 'N/A'}`);
      lines.push('');

      const addSection = (title: string, items: { label: string; value: string }[]) => {
        const rendered = items.filter((i) => i.value);
        if (rendered.length === 0) return;
        lines.push(title);
        rendered.forEach((i) => lines.push(`  ${i.label}: ${i.value}`));
        lines.push('');
      };

      addSection('BASIC INFORMATION', [
        { label: 'Position', value: profile.position || '' },
        { label: 'School', value: profile.school || '' },
        { label: 'Location', value: [profile.city, profile.state].filter(Boolean).join(', ') },
        { label: 'Class', value: profile.graduation_year || '' },
        { label: 'GPA', value: profile.gpa || '' },
      ]);

      addSection('PHYSICAL ATTRIBUTES', [
        { label: 'Height', value: profile.height || '' },
        { label: 'Weight', value: profile.weight || '' },
        { label: 'Arm Length', value: profile.arm_length || '' },
      ]);

      if (profile.forty_yard || profile.vertical || profile.bench_press || profile.squat) {
        addSection('ATHLETIC TESTING', [
          { label: '40-Yard Dash', value: profile.forty_yard || '' },
          { label: 'Vertical Jump', value: profile.vertical || '' },
          { label: 'Bench Press', value: profile.bench_press || '' },
          { label: 'Squat', value: profile.squat || '' },
        ]);
      }

      if (profile.email || profile.phone) {
        addSection('CONTACT', [
          { label: 'Email', value: profile.email || '' },
          { label: 'Phone', value: profile.phone || '' },
        ]);
      }

      lines.push(`Page ${index + 1} of ${profiles.length} | Generated by OfferHound™`);
    });
    return lines.join('\n');
  };

  const generateBulkCSV = (profiles: any[]) => {
    const headers = [
      'Name', 'Position', 'School', 'City', 'State', 'Class',
      'Height', 'Weight', '40-Yard', 'Vertical', 'Bench Press', 'Squat',
      'GPA', 'Email', 'Phone', 'HUDL', 'Twitter',
    ];

    const rows = profiles.map((p) => [
      p.full_name,
      p.position || '',
      p.school || '',
      p.city || '',
      p.state || '',
      p.graduation_year || '',
      p.height || '',
      p.weight || '',
      p.forty_yard || '',
      p.vertical || '',
      p.bench_press || '',
      p.squat || '',
      p.gpa || '',
      p.email || '',
      p.phone || '',
      p.hudl_url || '',
      p.twitter_url || '',
    ]);

    const escapeCsvValue = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    return [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(',')),
    ].join('\n');
  };

  const writeAndShareFile = async (filename: string, content: string, mimeType: string) => {
    const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
    const uri = `${dir}${filename}`;
    await (FileSystem as any).writeAsStringAsync(uri, content);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
    } else {
      toast({ title: 'Saved', description: uri });
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No Athletes Selected',
        description: 'Please select at least one athlete to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const profiles = await fetchFullProfiles(Array.from(selectedIds));
      const date = new Date().toISOString().split('T')[0];

      if (exportFormat === 'pdf') {
        const content = generateBulkPDF(profiles || []);
        await writeAndShareFile(`Saved_Athletes_${date}.txt`, content, 'text/plain');
      } else {
        const content = generateBulkCSV(profiles || []);
        await writeAndShareFile(`Saved_Athletes_${date}.csv`, content, 'text/csv');
      }

      toast({
        title: 'Export Complete',
        description: `${selectedIds.size} athlete profile(s) exported successfully.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the profiles. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (savedAthletes.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        onPress={() => setIsOpen(true)}
        leftIcon={<Download size={16} color={colors.foreground} />}
      >
        Bulk Export
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent style={s.dialogContent}>
          <DialogHeader>
            <DialogTitle>Export Saved Athletes</DialogTitle>
            <DialogDescription>
              Select athletes to export and choose a format.
            </DialogDescription>
          </DialogHeader>

          <View style={s.section}>
            <View style={s.rowBetween}>
              <Button variant="outline" size="sm" onPress={selectAll}>
                {selectedIds.size === savedAthletes.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Text style={s.muted}>
                {selectedIds.size} of {savedAthletes.length} selected
              </Text>
            </View>

            <ScrollArea style={s.listBox}>
              <View style={{ gap: spacing.sm }}>
                {savedAthletes.map((athlete) => {
                  const isSelected = selectedIds.has(athlete.athlete_profile_id);
                  return (
                    <Pressable
                      key={athlete.id}
                      style={[s.row, isSelected ? s.rowSelected : null]}
                      onPress={() => toggleSelect(athlete.athlete_profile_id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(athlete.athlete_profile_id)}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name} numberOfLines={1}>
                          {athlete.player_profiles?.full_name || 'Unknown'}
                        </Text>
                        <View style={s.metaRow}>
                          {athlete.player_profiles?.position ? (
                            <Badge variant="secondary">
                              {athlete.player_profiles.position}
                            </Badge>
                          ) : null}
                          {athlete.player_profiles?.school ? (
                            <Text style={s.muted} numberOfLines={1}>
                              {athlete.player_profiles.school}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollArea>

            <View style={s.formatRow}>
              <Button
                variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                size="sm"
                onPress={() => setExportFormat('pdf')}
                style={{ flex: 1 }}
                leftIcon={<FileType size={16} color={exportFormat === 'pdf' ? colors.primaryForeground : colors.foreground} />}
              >
                PDF
              </Button>
              <Button
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                size="sm"
                onPress={() => setExportFormat('csv')}
                style={{ flex: 1 }}
                leftIcon={<FileText size={16} color={exportFormat === 'csv' ? colors.primaryForeground : colors.foreground} />}
              >
                CSV
              </Button>
            </View>
          </View>

          <DialogFooter>
            <Button variant="outline" onPress={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleExport}
              disabled={isExporting || selectedIds.size === 0}
              loading={isExporting}
              leftIcon={!isExporting ? <Download size={16} color={colors.primaryForeground} /> : undefined}
            >
              {isExporting
                ? 'Exporting...'
                : `Export ${selectedIds.size} Athlete${selectedIds.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BulkExportButton;

const s = StyleSheet.create({
  dialogContent: { maxWidth: 520, width: '100%' },
  section: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm },
  listBox: {
    height: 250,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: colors.muted },
  name: { color: colors.foreground, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  formatRow: { flexDirection: 'row', gap: spacing.sm },
});
