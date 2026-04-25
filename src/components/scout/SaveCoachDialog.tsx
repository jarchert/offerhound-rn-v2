// Parity port from Lovable src/components/scout/SaveCoachDialog.tsx (verbatim logic).
// Web→RN mapping: shadcn Dialog/Select/Button/Label/Textarea → src/components/ui/*;
// lucide-react → lucide-react-native; Tailwind → StyleSheet @/lib/theme.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Loader2, Star, CircleDot, ArrowDown } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface SaveCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachName: string;
  coachSchool: string;
  onSave: (data: { notes: string; priority: 'high' | 'medium' | 'low' }) => void;
  isPending?: boolean;
}

export function SaveCoachDialog({
  open,
  onOpenChange,
  coachName,
  coachSchool,
  onSave,
  isPending,
}: SaveCoachDialogProps) {
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleSave = () => {
    onSave({ notes, priority });
    setNotes('');
    setPriority('medium');
  };
  const handleClose = (next?: boolean) => {
    // Lovable wraps onOpenChange with a reset. Mirror that here: clear local state
    // before bubbling close. Accept the bool from Dialog so it forwards correctly.
    if (next === false || next === undefined) {
      setNotes('');
      setPriority('medium');
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={s.dialogContent}>
        <DialogHeader>
          <DialogTitle>Save Coach to Network</DialogTitle>
          <DialogDescription>
            Add {coachName} from {coachSchool} to your saved coaches network.
          </DialogDescription>
        </DialogHeader>

        <View style={s.body}>
          <View style={s.field}>
            <Label>Priority Level</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as 'high' | 'medium' | 'low')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <View style={s.optionRow}>
                    <Star size={16} color="#f59e0b" />
                    <Text style={s.optionText}>High Priority</Text>
                  </View>
                </SelectItem>
                <SelectItem value="medium">
                  <View style={s.optionRow}>
                    <CircleDot size={16} color="#3b82f6" />
                    <Text style={s.optionText}>Medium Priority</Text>
                  </View>
                </SelectItem>
                <SelectItem value="low">
                  <View style={s.optionRow}>
                    <ArrowDown size={16} color={colors.mutedForeground} />
                    <Text style={s.optionText}>Low Priority</Text>
                  </View>
                </SelectItem>
              </SelectContent>
            </Select>
          </View>

          <View style={s.field}>
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes about this coach..."
              value={notes}
              onChangeText={setNotes}
              style={s.notesInput}
            />
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => handleClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onPress={handleSave}
            disabled={isPending}
            loading={isPending}
            leftIcon={
              isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : undefined
            }
          >
            {isPending ? 'Saving...' : 'Save Coach'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SaveCoachDialog;

// Suppress unused-import lint for Loader2 — kept for parity reference; Button's
// `loading` prop renders the spinner via ActivityIndicator instead.
void Loader2;

const s = StyleSheet.create({
  // Lovable: sm:max-w-[425px]
  dialogContent: { maxWidth: 425 },
  body: { gap: spacing.md, paddingVertical: spacing.md },
  field: { gap: spacing.xs + 4 }, // space-y-2 = 8
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 4 },
  optionText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  // Lovable: min-h-[100px]
  notesInput: { minHeight: 100 },
});
