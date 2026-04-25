// Ported from Lovable src/components/transcripts/ShareTranscriptDialog.tsx
// Web → RN mapping:
//   - lucide-react → lucide-react-native
//   - shadcn/ui Dialog/Button/Input/Label/Textarea/RadioGroup → @/components/ui/*
//   - useToast → @/hooks/use-toast (compat shim over react-native-toast-message)
//   - <Input type="email"/"tel"> → RN TextInput props keyboardType/autoCapitalize
//   - Tailwind utility classes → StyleSheet using @/lib/theme tokens
//   - Loader2 spinner → ActivityIndicator
//   - supabase.functions.invoke("share-transcript") kept verbatim
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Loader2 as _Loader2, Send } from 'lucide-react-native';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AcademicTranscript } from '@/hooks/useTranscripts';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  transcript: AcademicTranscript;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTranscriptDialog({ transcript, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast({ title: 'Recipient required', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('share-transcript', {
        body: {
          transcriptId: transcript.id,
          channel,
          recipient: recipient.trim(),
          recipientName: recipientName.trim() || undefined,
          message: message.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: 'Transcript shared',
        description: `Secure 7-day link sent via ${channel}.`,
      });
      onOpenChange(false);
      setRecipient('');
      setRecipientName('');
      setMessage('');
    } catch (e: any) {
      toast({ title: 'Share failed', description: e.message || 'Try again', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Transcript</DialogTitle>
          <DialogDescription>
            Send a secure, time-limited link (valid 7 days) to one recipient. The PDF stays private otherwise.
          </DialogDescription>
        </DialogHeader>

        <View style={s.body}>
          <View>
            <Label style={s.label}>Delivery</Label>
            <RadioGroup
              value={channel}
              onValueChange={(v) => setChannel(v as 'email' | 'sms')}
              style={s.radioRow}
            >
              <RadioGroupItem value="email" label="Email" />
              <RadioGroupItem value="sms" label="SMS" />
            </RadioGroup>
          </View>

          <View>
            <Label style={s.label}>
              {channel === 'email' ? 'Recipient email' : 'Phone number (E.164, e.g. +15551234567)'}
            </Label>
            <Input
              value={recipient}
              onChangeText={setRecipient}
              placeholder={channel === 'email' ? 'coach@school.edu' : '+15551234567'}
              keyboardType={channel === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={s.fieldMargin}
            />
          </View>

          <View>
            <Label style={s.label}>Recipient name (optional)</Label>
            <Input
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Coach Smith"
              containerStyle={s.fieldMargin}
            />
          </View>

          <View>
            <Label style={s.label}>Personal note (optional)</Label>
            <Textarea
              value={message}
              onChangeText={setMessage}
              placeholder="Here is my latest transcript as requested."
              rows={4}
              containerStyle={s.fieldMargin}
              style={{ minHeight: 80 }}
            />
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onPress={handleSend}
            disabled={sending || !recipient.trim()}
            leftIcon={
              sending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} style={{ marginRight: 8 }} />
              ) : (
                <Send size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />
              )
            }
          >
            Send Secure Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareTranscriptDialog;

const s = StyleSheet.create({
  body: { gap: spacing.md, paddingVertical: spacing.sm },
  label: { fontSize: typography.fontSize.sm, color: colors.foreground, marginBottom: 6 },
  radioRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  fieldMargin: { marginTop: 4 },
});
