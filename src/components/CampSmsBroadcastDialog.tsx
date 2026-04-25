// Ported verbatim from Lovable src/components/CampSmsBroadcastDialog.tsx
// Web → RN mapping:
//   - Tailwind → StyleSheet using @/lib/theme tokens
//   - shadcn/ui → @/components/ui/* (PascalCase)
//   - lucide-react → lucide-react-native
//   - useToast → toast.* from @/components/ui/toast
//   - Textarea onChange(e.target.value) → onChangeText(text)
//   - SelectItem rich children: rendered as label-only because RN Select
//     stores `label` as a string; icons are dropped from the dropdown row
//     (still shown elsewhere in the UI). Functional behavior identical.
//   - ScrollArea → @/components/ui/ScrollArea (ScrollView wrapper)
//   - line-clamp-2 → numberOfLines={2}
//   - sm:grid-cols-4 responsive grid → vertical stack on mobile (single col)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { toast } from '@/components/ui/toast';
import { Send, MessageSquare } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface BroadcastRecord {
  id: string;
  category: string;
  message_body: string;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

interface Props {
  campId: string;
  campName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_TEMPLATES: Record<string, string> = {
  weather:
    'Weather update: heavy rain expected at the field. Please bring rain gear and check back at 7am for any schedule changes.',
  schedule:
    'Schedule update: please check in by 8:00am at the main gate. First whistle moves to 9:00am.',
  reminder:
    'Reminder: bring your physical form, water bottle, and cleats tomorrow. Parking opens at 7:30am.',
  general: '',
};

export function CampSmsBroadcastDialog({ campId, campName, open, onOpenChange }: Props) {
  const [category, setCategory] = useState<keyof typeof CATEGORY_TEMPLATES>('weather');
  const [message, setMessage] = useState(CATEGORY_TEMPLATES.weather);
  const [recipients, setRecipients] = useState<number>(0);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [{ count }, { data: hist }] = await Promise.all([
        supabase
          .from('camp_sms_optins')
          .select('id', { count: 'exact', head: true })
          .eq('camp_id', campId)
          .eq('opted_in', true),
        supabase
          .from('camp_sms_broadcasts')
          .select('*')
          .eq('camp_id', campId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (cancel) return;
      setRecipients(count ?? 0);
      setHistory((hist ?? []) as BroadcastRecord[]);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [open, campId]);

  const handleCategoryChange = (val: string) => {
    setCategory(val as keyof typeof CATEGORY_TEMPLATES);
    if (CATEGORY_TEMPLATES[val]) setMessage(CATEGORY_TEMPLATES[val]);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message required');
      return;
    }
    if (recipients === 0) {
      toast.error('No subscribers', 'No athletes have opted in for SMS alerts yet.');
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-camp-sms', {
      body: { campId, category, message },
    });
    setSending(false);
    if (error) {
      toast.error('Send failed', error.message);
      return;
    }
    toast.success(
      'Broadcast sent',
      `${data?.delivered ?? 0} delivered, ${data?.failed ?? 0} failed (of ${data?.recipients ?? 0}).`
    );
    const { data: hist } = await supabase
      .from('camp_sms_broadcasts')
      .select('*')
      .eq('camp_id', campId)
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory((hist ?? []) as BroadcastRecord[]);
  };

  const remaining = 1500 - message.length;

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' =>
    status === 'sent' ? 'default' : status === 'partial' ? 'secondary' : 'destructive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 640 }}>
        <DialogHeader>
          <View style={s.titleRow}>
            <MessageSquare size={20} color={colors.primary} />
            <DialogTitle>{`Text broadcast — ${campName}`}</DialogTitle>
          </View>
          <DialogDescription>
            Send time-sensitive updates to athletes who opted in for SMS alerts.
          </DialogDescription>
        </DialogHeader>

        <View style={{ gap: spacing.md }}>
          <View style={s.badgeRow}>
            <Badge variant="secondary">{loading ? '…' : `${recipients} subscribed`}</Badge>
            <Badge variant="outline">SMS via Twilio</Badge>
          </View>

          <View style={{ gap: spacing.sm }}>
            <View>
              <Label style={{ fontSize: typography.fontSize.xs }}>Category</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weather">Weather</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <View>
              <Label style={{ fontSize: typography.fontSize.xs }}>Message</Label>
              <Textarea
                rows={4}
                value={message}
                onChangeText={(t) => setMessage(t.slice(0, 1500))}
                placeholder="Type your text…"
              />
              <Text style={[s.charCount, remaining < 50 && { color: colors.destructive }]}>
                {remaining} characters left. Camp name and STOP footer added automatically.
              </Text>
            </View>
          </View>

          <View>
            <Label style={{ fontSize: typography.fontSize.xs }}>Recent broadcasts</Label>
            <View style={s.historyBox}>
              <ScrollArea style={{ maxHeight: 160 }}>
                {history.length === 0 ? (
                  <Text style={s.historyEmpty}>No broadcasts yet.</Text>
                ) : (
                  <View>
                    {history.map((b, idx) => (
                      <View
                        key={b.id}
                        style={[s.historyItem, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                      >
                        <View style={s.historyHeader}>
                          <Text style={s.categoryLabel}>{b.category}</Text>
                          <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                        </View>
                        <Text style={s.historyBody} numberOfLines={2}>{b.message_body}</Text>
                        <Text style={s.historyMeta}>
                          {format(new Date(b.created_at), 'MMM d, h:mm a')} · {b.delivered_count}/{b.recipient_count} delivered
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollArea>
            </View>
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>Close</Button>
          <Button
            onPress={handleSend}
            disabled={sending || recipients === 0}
            loading={sending}
            leftIcon={!sending ? <Send size={16} color={colors.primaryForeground} /> : undefined}
          >
            {sending ? 'Sending…' : `Send to ${recipients}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  charCount: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body, color: colors.mutedForeground, marginTop: 4 },
  historyBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: 4, overflow: 'hidden' },
  historyEmpty: { fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.body, color: colors.mutedForeground, padding: spacing.sm },
  historyItem: { padding: spacing.sm, gap: 4 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs, color: colors.foreground, textTransform: 'capitalize' },
  historyBody: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  historyMeta: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.mutedForeground },
});
