import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Flag } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { toast } from '@/components/ui/toast';
import { colors, spacing } from '@/lib/theme';

interface Props {
  reportedUserId?: string;
  entityType: 'profile' | 'message' | 'media' | 'testimonial' | 'comment' | 'post';
  entityId?: string;
  variant?: 'icon' | 'menuitem';
  style?: ViewStyle;
}

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate or explicit content' },
  { value: 'impersonation', label: 'Impersonation or fake account' },
  { value: 'minor_safety', label: "Concern about a minor's safety" },
  { value: 'other', label: 'Other' },
];

export function ReportUserButton({
  reportedUserId,
  entityType,
  entityId,
  variant = 'icon',
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error('Please sign in to report content');
        return;
      }
      const { error } = await supabase.from('user_reports').insert({
        reporter_user_id: u.user.id,
        reported_user_id: reportedUserId ?? null,
        reported_entity_type: entityType,
        reported_entity_id: entityId ?? null,
        reason,
        description: description.trim() || null,
      });
      if (error) throw error;
      toast.success('Report submitted. Our team reviews reports within 24 hours.');
      setOpen(false);
      setDescription('');
      setReason('spam');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="sm"
            style={style}
            leftIcon={<Flag size={16} color={colors.foreground} />}
          />
        ) : (
          <Button
            variant="ghost"
            style={style}
            leftIcon={<Flag size={16} color={colors.foreground} />}
          >
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            Tell us why this content violates our community guidelines. Reports
            are reviewed within 24 hours.
          </DialogDescription>
        </DialogHeader>
        <View style={s.body}>
          <RadioGroup value={reason} onValueChange={setReason}>
            {REASONS.map((r) => (
              <RadioGroupItem key={r.value} value={r.value} label={r.label} />
            ))}
          </RadioGroup>
          <View style={s.descBlock}>
            <Label>Additional details (optional)</Label>
            <Textarea
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              numberOfLines={3}
              placeholder="Provide context to help us review faster"
            />
          </View>
        </View>
        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onPress={handleSubmit} disabled={loading} loading={loading}>
            {loading ? 'Submitting…' : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  body: { gap: spacing.md },
  descBlock: { gap: spacing.sm },
});
