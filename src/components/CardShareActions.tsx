// RN-adapted port of the Lovable web CardShareActions.
// Web original used html2canvas + DOM refs; here the parent passes a ref to a
// View, which react-native-view-shot captures. PDF download is unavailable in
// the mobile client (the lib supports png/jpg only), so the format menu is
// limited to PNG and JPEG. SMS still forces PNG, matching the web behavior.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Download, Mail, MessageSquare, FileImage, Send } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toast';
import {
  captureCardImage,
  shareCapturedCard,
  sendShareCard,
  type ShareFormat,
} from '@/lib/shareCard';
import { colors, spacing, typography } from '@/lib/theme';

interface CardShareActionsProps {
  /** ref of the View to capture as image */
  targetRef: React.RefObject<any>;
  /** sender display name shown in the email/SMS */
  senderName: string;
  /** base file name without extension */
  fileBaseName: string;
  /** optional: hide the inline buttons and only render the Send dialog (controlled externally) */
  hideTriggers?: boolean;
  /** optional: control the Send dialog open state externally */
  sendDialogOpen?: boolean;
  onSendDialogOpenChange?: (open: boolean) => void;
  /** optional: which channel to default to when opened */
  defaultChannel?: 'email' | 'sms';
}

export function CardShareActions({
  targetRef,
  senderName,
  fileBaseName,
  hideTriggers,
  sendDialogOpen,
  onSendDialogOpenChange,
  defaultChannel = 'email',
}: CardShareActionsProps) {
  const [busy, setBusy] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = sendDialogOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onSendDialogOpenChange) onSendDialogOpenChange(v);
    else setInternalOpen(v);
  };
  const [channel, setChannel] = useState<'email' | 'sms'>(defaultChannel);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [format, setFormat] = useState<ShareFormat>('png');

  const safeName = fileBaseName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'card';

  async function withCapture<T>(
    fmt: ShareFormat,
    fn: (cap: Awaited<ReturnType<typeof captureCardImage>>) => Promise<T>,
  ) {
    if (!targetRef.current) {
      toast.error('Card not ready');
      return;
    }
    setBusy(true);
    try {
      const cap = await captureCardImage(targetRef.current, fmt);
      return await fn(cap);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to generate card');
    } finally {
      setBusy(false);
    }
  }

  // RN equivalent of the web "download" menu — hand the captured image to the
  // native share sheet (Files / Save Image / etc.).
  const handleDownload = (fmt: ShareFormat) =>
    withCapture(fmt, async (cap) => {
      const ok = await shareCapturedCard(cap, `Save ${safeName}`);
      if (ok) toast.success(`Ready to save ${cap.extension.toUpperCase()}`);
      else toast.error('Sharing not available');
    });

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error(channel === 'email' ? 'Enter an email address' : 'Enter a phone number');
      return;
    }
    // SMS: PNG only
    const fmtForSend: ShareFormat = channel === 'sms' ? 'png' : format;
    await withCapture(fmtForSend, async (cap) => {
      try {
        await sendShareCard({
          channel,
          recipient: recipient.trim(),
          senderName,
          fileName: `${safeName}.${cap.extension}`,
          mimeType: cap.mimeType,
          base64: cap.base64,
          message: message.trim() || undefined,
        });
        toast.success(`Card sent via ${channel === 'email' ? 'email' : 'SMS'}`);
        setOpen(false);
        setRecipient('');
        setMessage('');
      } catch (e: any) {
        // Build 48 parity #2/#19/#22 — on-device fallback when Supabase send-share-card fails.
        try {
          const SMS = await import('expo-sms');
          const MailComposer = await import('expo-mail-composer');
          const Sharing = await import('expo-sharing');
          const FileSystem = await import('expo-file-system');
          // Write base64 capture to a temp file so SMS/email can attach it.
          const ext = cap.extension;
          const tmp = `${(FileSystem as any).cacheDirectory || ''}offerhound-card-${Date.now()}.${ext}`;
          await (FileSystem as any).writeAsStringAsync(tmp, cap.base64, { encoding: 'base64' });
          if (channel === 'email' && (await MailComposer.isAvailableAsync())) {
            await MailComposer.composeAsync({
              recipients: [recipient.trim()],
              subject: `${senderName || 'OfferHound'} shared a card`,
              body: message.trim() || '',
              attachments: [tmp],
            });
            toast.success('Opened email with card attached');
          } else if (channel === 'sms' && (await SMS.isAvailableAsync())) {
            await SMS.sendSMSAsync([recipient.trim()], message.trim() || '', { attachments: [{ uri: tmp, mimeType: cap.mimeType, filename: `${safeName}.${ext}` }] } as any);
            toast.success('Opened SMS with card attached');
          } else if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(tmp, { mimeType: cap.mimeType, dialogTitle: `Share ${safeName}` });
          } else {
            throw e;
          }
          setOpen(false);
          setRecipient('');
          setMessage('');
        } catch (e2: any) {
          toast.error(e?.message || e2?.message || 'Failed to send');
        }
      }
    });
  };

  return (
    <View style={hideTriggers ? undefined : s.row}>
      {!hideTriggers && (
        <>
          <View style={s.cell}>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              loading={busy}
              leftIcon={<Download size={14} color={colors.foreground} />}
              onPress={() => handleDownload('png')}
            >
              PNG
            </Button>
          </View>
          <View style={s.cell}>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              leftIcon={<FileImage size={14} color={colors.foreground} />}
              onPress={() => handleDownload('jpg')}
            >
              JPEG
            </Button>
          </View>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        {!hideTriggers && (
          <View style={s.cell}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={busy}
                style={{ backgroundColor: '#059669' }}
                leftIcon={<Send size={14} color="#fff" />}
              >
                Send
              </Button>
            </DialogTrigger>
          </View>
        )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send card</DialogTitle>
          </DialogHeader>
          <Tabs value={channel} onValueChange={(v) => setChannel(v as 'email' | 'sms')}>
            <TabsList>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
            </TabsList>
            <TabsContent value="email" style={s.tabSection}>
              <View style={s.field}>
                <Label>Recipient email</Label>
                <Input
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="coach@example.com"
                  value={recipient}
                  onChangeText={setRecipient}
                />
              </View>
              <View style={s.field}>
                <Label>Attachment format</Label>
                <View style={s.formatRow}>
                  {(['png', 'jpg'] as ShareFormat[]).map((f) => (
                    <Button
                      key={f}
                      variant={format === f ? 'default' : 'outline'}
                      size="sm"
                      onPress={() => setFormat(f)}
                    >
                      {f.toUpperCase()}
                    </Button>
                  ))}
                </View>
              </View>
            </TabsContent>
            <TabsContent value="sms" style={s.tabSection}>
              <View style={s.field}>
                <Label>Recipient phone (E.164)</Label>
                <Input
                  keyboardType="phone-pad"
                  placeholder="+15555550123"
                  value={recipient}
                  onChangeText={setRecipient}
                />
                <Text style={s.hint}>SMS sends a PNG image via MMS.</Text>
              </View>
            </TabsContent>
          </Tabs>
          <View style={s.field}>
            <Label>Message (optional)</Label>
            <Textarea
              placeholder="Hi! Sharing my OfferHound card with you."
              value={message}
              onChangeText={setMessage}
              rows={3}
            />
          </View>
          <Button
            onPress={handleSend}
            disabled={busy}
            loading={busy}
            leftIcon={<Send size={16} color="#fff" />}
          >
            Send card
          </Button>
        </DialogContent>
      </Dialog>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
  cell: { flexBasis: '48%', flexGrow: 1, minWidth: 0 },
  tabSection: { gap: spacing.sm, marginTop: spacing.sm },
  field: { gap: 6 },
  formatRow: { flexDirection: 'row', gap: spacing.sm },
  hint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
