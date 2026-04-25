// Ported from Lovable src/components/transcripts/RequestTranscriptButton.tsx
// Web → RN mapping:
//   - lucide-react → lucide-react-native
//   - shadcn/ui Button/Dialog/Textarea/Label → @/components/ui/*
//   - useToast → @/hooks/use-toast (compat shim over react-native-toast-message)
//   - react-router-dom useNavigate + window.location → @react-navigation/native
//     useNavigation().navigate('Auth'); deep-link redirect param dropped (the
//     RN Auth screen returns the user to wherever they came from automatically)
//   - Tailwind utility classes → StyleSheet using @/lib/theme tokens
//   - Loader2 spinner → ActivityIndicator
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FileText } from 'lucide-react-native';
import { Button, ButtonVariant, ButtonSize } from '@/components/ui/Button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { useRequestTranscript } from '@/hooks/useRequestTranscript';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  athleteProfileId: string;
  athleteName?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: any;
}

export function RequestTranscriptButton({
  athleteProfileId,
  athleteName,
  variant = 'outline',
  size = 'sm',
  style,
}: Props) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const request = useRequestTranscript();

  const handleSubmit = async () => {
    try {
      await request.mutateAsync({ athleteProfileId, reason: reason.trim() || undefined });
      toast({
        title: 'Request sent',
        description: `${athleteName || 'The athlete'} will be notified to approve transcript access.`,
      });
      setOpen(false);
      setReason('');
    } catch (e: any) {
      toast({ title: 'Request failed', description: e.message || 'Try again', variant: 'destructive' });
    }
  };

  const onPressTrigger = () => {
    if (!user) {
      navigation.navigate('Auth' as never);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        style={style}
        onPress={onPressTrigger}
        leftIcon={<FileText size={16} color={variant === 'default' ? colors.primaryForeground : colors.foreground} style={{ marginRight: 6 }} />}
      >
        Request Transcript
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Academic Transcript</DialogTitle>
            <DialogDescription>
              {athleteName ? `Ask ${athleteName} for transcript access.` : 'Ask for transcript access.'}{' '}
              They will receive a notification and can approve or deny. Approved transcripts are sent as a secure 7-day link.
            </DialogDescription>
          </DialogHeader>

          <View style={s.body}>
            <Label style={s.label}>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Reviewing for our 2026 recruiting class — academic eligibility check."
              rows={5}
              style={s.textarea}
            />
          </View>

          <DialogFooter>
            <Button variant="outline" onPress={() => setOpen(false)} disabled={request.isPending}>
              Cancel
            </Button>
            <Button
              onPress={handleSubmit}
              disabled={request.isPending}
              leftIcon={
                request.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} style={{ marginRight: 8 }} />
                ) : (
                  <FileText size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />
                )
              }
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RequestTranscriptButton;

const s = StyleSheet.create({
  body: { gap: spacing.sm, paddingVertical: spacing.sm },
  label: { fontSize: typography.fontSize.sm, color: colors.foreground },
  textarea: { minHeight: 100 },
});
