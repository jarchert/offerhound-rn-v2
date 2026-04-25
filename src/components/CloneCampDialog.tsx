// Ported verbatim from Lovable src/components/CloneCampDialog.tsx
// Web → RN mapping:
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - shadcn/ui → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - useToast → toast.* from @/components/ui/toast
//   - <Input type="date"> → text Input with YYYY-MM-DD placeholder.
//     GAP: native date picker (e.g. @react-native-community/datetimepicker) not
//     wired here; coach types the date directly. Validation matches web.
//   - Checkbox onCheckedChange(v|"indeterminate") → onCheckedChange(boolean)
//   - data-testid attributes preserved as testID props
//   - Hover/transition utility classes are no-ops
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { Copy } from 'lucide-react-native';
import { toast } from '@/components/ui/toast';
import { useCloneCamp } from '@/hooks/useCloneCamp';
import type { Camp } from '@/hooks/useCampManager';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface CloneCampDialogProps {
  source: Camp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloned?: (newCampId: string) => void;
}

export function CloneCampDialog({ source, open, onOpenChange, onCloned }: CloneCampDialogProps) {
  const cloneCamp = useCloneCamp();

  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [copyStaff, setCopyStaff] = useState(true);
  const [copyDrillStations, setCopyDrillStations] = useState(true);
  const [copyPricing, setCopyPricing] = useState(true);
  const [copyEmailTemplates, setCopyEmailTemplates] = useState(true);

  useEffect(() => {
    if (open && source) {
      setNewName(`${source.name} (Copy)`);
      setNewStartDate('');
      setNewEndDate('');
      setCopyStaff(true);
      setCopyDrillStations(true);
      setCopyPricing(true);
      setCopyEmailTemplates(true);
    }
  }, [open, source]);

  const handleClone = async () => {
    if (!source) return;
    if (!newName.trim()) {
      toast.error('Name required', 'Please name the new camp before cloning.');
      return;
    }
    if (!newStartDate) {
      toast.error('Start date required', 'Pick a start date for the new camp.');
      return;
    }
    try {
      const result = await cloneCamp.mutateAsync({
        source,
        newName: newName.trim(),
        newStartDate,
        newEndDate: newEndDate || null,
        copyStaff,
        copyDrillStations,
        copyPricing,
        copyEmailTemplates,
      });
      toast.success(
        'Camp cloned',
        `Copied ${result.copied.staff} staff, ${result.copied.drillStations} drill station(s), and ${result.copied.emailTemplates} email template(s). New camp is a draft — review and publish when ready.`
      );
      onCloned?.(result.newCampId);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Clone failed', err?.message ?? 'Could not clone camp.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <View style={s.titleRow}>
            <Copy size={16} color={colors.foreground} />
            <DialogTitle>Clone camp template</DialogTitle>
          </View>
          <DialogDescription>
            {source
              ? `Duplicate ${source.name} into a new draft camp. Pick what to copy across — historical enrollments, waitlist, and performance data are never copied.`
              : 'Pick a source camp.'}
          </DialogDescription>
        </DialogHeader>

        <View style={{ gap: spacing.md }}>
          <View style={{ gap: 6 }}>
            <Label>New camp name</Label>
            <Input
              testID="clone-camp-name"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Summer Showcase 2026"
            />
          </View>

          <View style={s.grid2}>
            <View style={{ flex: 1, gap: 6 }}>
              <Label>Start date</Label>
              <Input
                testID="clone-camp-start-date"
                value={newStartDate}
                onChangeText={setNewStartDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Label>End date (optional)</Label>
              <Input
                value={newEndDate}
                onChangeText={setNewEndDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={s.optionGroup}>
            <Text style={s.optionGroupTitle}>What to copy</Text>
            <Pressable style={s.checkRow} onPress={() => setCopyStaff(!copyStaff)}>
              <Checkbox checked={copyStaff} onCheckedChange={(v) => setCopyStaff(!!v)} />
              <Text style={s.checkLabel}>Staff list (names, emails, roles)</Text>
            </Pressable>
            <Pressable style={s.checkRow} onPress={() => setCopyDrillStations(!copyDrillStations)}>
              <Checkbox checked={copyDrillStations} onCheckedChange={(v) => setCopyDrillStations(!!v)} />
              <Text style={s.checkLabel}>Drill stations</Text>
            </Pressable>
            <Pressable style={s.checkRow} onPress={() => setCopyPricing(!copyPricing)}>
              <Checkbox checked={copyPricing} onCheckedChange={(v) => setCopyPricing(!!v)} />
              <Text style={s.checkLabel}>Pricing (standard + premium tiers)</Text>
            </Pressable>
            <Pressable style={s.checkRow} onPress={() => setCopyEmailTemplates(!copyEmailTemplates)}>
              <Checkbox checked={copyEmailTemplates} onCheckedChange={(v) => setCopyEmailTemplates(!!v)} />
              <Text style={s.checkLabel}>Notification email templates</Text>
            </Pressable>
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={cloneCamp.isPending}>
            Cancel
          </Button>
          <Button
            onPress={handleClone}
            disabled={cloneCamp.isPending || !source}
            loading={cloneCamp.isPending}
            leftIcon={!cloneCamp.isPending ? <Copy size={16} color={colors.primaryForeground} /> : undefined}
          >
            {cloneCamp.isPending ? 'Cloning…' : 'Clone as draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grid2: { flexDirection: 'row', gap: spacing.sm },
  optionGroup: { gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  optionGroupTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkLabel: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, flexShrink: 1 },
});
