// Verbatim port of /offerhound-repo/src/components/BetaFeedbackWidget.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme
//   - lucide-react → lucide-react-native
//   - shadcn ui (Button/Dialog/Label/Input/Textarea/Select) → @/components/ui/*
//   - window.location.pathname → not available in RN; replaced with a best-effort value.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  MessageSquarePlus,
  Bug,
  Palette,
  Zap,
  Lightbulb,
  FileText,
  HelpCircle,
  Send,
  ClipboardList,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useBetaTester } from '@/hooks/useBetaTester';
import {
  useBetaFeedback,
  type FeedbackCategory,
  type FeedbackPriority,
} from '@/hooks/useBetaFeedback';
import { BetaThankYouDialog } from './BetaThankYouDialog';
import { BetaTesterFeedbackLog } from './BetaTesterFeedbackLog';
import { colors, spacing, typography, radius, shadows } from '@/lib/theme';

const CATEGORY_OPTIONS: {
  value: FeedbackCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  { value: 'bug', label: 'Bug Report', icon: <Bug size={16} color={colors.foreground} />, description: 'Something is broken or not working' },
  { value: 'ui_ux', label: 'UI/UX Issue', icon: <Palette size={16} color={colors.foreground} />, description: 'Design or usability problem' },
  { value: 'performance', label: 'Performance', icon: <Zap size={16} color={colors.foreground} />, description: 'Slow loading or lag' },
  { value: 'feature_request', label: 'Feature Request', icon: <Lightbulb size={16} color={colors.foreground} />, description: 'Suggest new functionality' },
  { value: 'content', label: 'Content Issue', icon: <FileText size={16} color={colors.foreground} />, description: 'Text or imagery problem' },
  { value: 'other', label: 'Other', icon: <HelpCircle size={16} color={colors.foreground} />, description: 'General feedback' },
];

const PRIORITY_OPTIONS: { value: FeedbackPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#22c55e' },      // bg-green-500
  { value: 'medium', label: 'Medium', color: '#eab308' }, // bg-yellow-500
  { value: 'high', label: 'High', color: '#f97316' },    // bg-orange-500
  { value: 'critical', label: 'Critical', color: '#ef4444' }, // bg-red-500
];

export const BetaFeedbackWidget = () => {
  const { isBetaTester, isLoading } = useBetaTester();
  const { submitFeedback, isSubmitting } = useBetaFeedback();

  const [isOpen, setIsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isThankYouOpen, setIsThankYouOpen] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState('');
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');

  // Don't show widget if not a beta tester
  if (isLoading || !isBetaTester) {
    return null;
  }

  const handleSubmit = async () => {
    if (!category || !title || !description) return;

    const result = await submitFeedback({
      category: category as FeedbackCategory,
      title,
      description,
      priority,
    });

    if (result) {
      setIsOpen(false);
      setSubmittedTitle(result.title);
      setIsThankYouOpen(true);
      setCategory('');
      setTitle('');
      setDescription('');
      setPriority('medium');
    }
  };

  return (
    <>
      {/* Floating Buttons */}
      <View style={s.floatingContainer} pointerEvents="box-none">
        {/* Feedback Log Button */}
        <Button
          onPress={() => setIsLogOpen(true)}
          variant="outline"
          size="icon"
          style={s.logButton}
        >
          <ClipboardList size={16} color={colors.foreground} />
        </Button>

        {/* Submit Feedback Button */}
        <View style={s.submitWrapper}>
          <Button
            onPress={() => setIsOpen(true)}
            size="icon"
            style={s.submitButton}
          >
            <MessageSquarePlus size={20} color={colors.primaryForeground} />
          </Button>
          {/* Beta badge indicator */}
          <View style={s.betaBadge}>
            <Text style={s.betaBadgeText}>BETA</Text>
          </View>
        </View>
      </View>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent style={s.dialogContent}>
          <DialogHeader>
            <View style={s.titleRow}>
              <MessageSquarePlus size={20} color={colors.primary} />
              <DialogTitle>Beta Feedback</DialogTitle>
            </View>
            <DialogDescription>
              Help us improve OfferHound™ by sharing your feedback. Your input is invaluable!
            </DialogDescription>
          </DialogHeader>

          <View style={s.body}>
            {/* Category Selection */}
            <View style={s.field}>
              <Label>Feedback Type *</Label>
              <View style={s.grid}>
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = category === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setCategory(option.value)}
                      style={[s.categoryTile, selected && s.categoryTileSelected]}
                    >
                      {option.icon}
                      <View style={{ flex: 1 }}>
                        <Text style={[s.categoryLabel, selected && s.categoryLabelSelected]}>
                          {option.label}
                        </Text>
                        <Text style={s.categoryDesc}>{option.description}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Title */}
            <View style={s.field}>
              <Label>Title *</Label>
              <Input
                placeholder="Brief summary of your feedback"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={s.field}>
              <Label>Description *</Label>
              <Textarea
                placeholder="Please describe the issue or suggestion in detail. Include steps to reproduce if reporting a bug."
                value={description}
                onChangeText={setDescription}
                rows={4}
                maxLength={2000}
              />
            </View>

            {/* Priority */}
            <View style={s.field}>
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v: string) => setPriority(v as FeedbackPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <View style={s.priorityRow}>
                        <View style={[s.priorityDot, { backgroundColor: option.color }]} />
                        <Text style={s.priorityText}>{option.label}</Text>
                      </View>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            {/* Current Page Info */}
            <View style={s.pageInfo}>
              <Text style={s.pageInfoText}>
                <Text style={s.pageInfoLabel}>Current page: </Text>
                {/* window.location.pathname is not available in RN; left blank for parity */}
                {''}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <Button variant="outline" onPress={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleSubmit}
              disabled={!category || !title || !description || isSubmitting}
              leftIcon={!isSubmitting ? <Send size={16} color={colors.primaryForeground} /> : undefined}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* Feedback Log Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent style={s.logDialogContent}>
          <DialogHeader>
            <View style={s.titleRow}>
              <ClipboardList size={20} color={colors.primary} />
              <DialogTitle>My Feedback</DialogTitle>
            </View>
            <DialogDescription>
              Track the status of feedback you've submitted
            </DialogDescription>
          </DialogHeader>
          <BetaTesterFeedbackLog />
        </DialogContent>
      </Dialog>

      {/* Thank You Dialog */}
      <BetaThankYouDialog
        isOpen={isThankYouOpen}
        onClose={() => setIsThankYouOpen(false)}
        feedbackTitle={submittedTitle}
      />
    </>
  );
};

export default BetaFeedbackWidget;

const s = StyleSheet.create({
  // fixed bottom-20 right-4 z-50 flex flex-col gap-2
  floatingContainer: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 50,
    flexDirection: 'column',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  // h-10 w-10 rounded-full shadow-lg bg-background
  logButton: {
    height: 40,
    width: 40,
    borderRadius: 9999,
    backgroundColor: colors.background,
    ...shadows.card,
  },
  submitWrapper: { position: 'relative' },
  // h-12 w-12 rounded-full shadow-lg gradient-gold
  submitButton: {
    height: 48,
    width: 48,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    ...shadows.gold,
  },
  // absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full
  betaBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  betaBadgeText: {
    color: colors.accentForeground,
    fontSize: 10,
    fontFamily: typography.fontFamily.bodyBold,
  },
  // sm:max-w-[500px] max-h-[90vh] overflow-y-auto — Dialog handles scroll/maxHeight
  dialogContent: { maxWidth: 500 },
  // sm:max-w-lg max-h-[80vh]
  logDialogContent: { maxWidth: 512 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { gap: spacing.md, paddingVertical: spacing.md },
  field: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // grid-cols-2 → 2 columns; each tile ≈ 48% width; p-3 rounded-lg border
  categoryTile: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  // border-primary bg-primary/10 text-primary
  categoryTileSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(231, 175, 8, 0.10)',
  },
  categoryLabel: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  categoryLabelSelected: { color: colors.primary },
  categoryDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priorityDot: { height: 8, width: 8, borderRadius: 9999 },
  priorityText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  // text-xs text-muted-foreground bg-muted p-2 rounded
  pageInfo: {
    backgroundColor: colors.muted,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  pageInfoText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  pageInfoLabel: { fontFamily: typography.fontFamily.bodyBold },
  // flex justify-end gap-2
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
