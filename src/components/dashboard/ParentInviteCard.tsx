// ParentInviteCard — RN port of Lovable ParentInviteModal.tsx.
// Card with "Invite Parent" button → modal with email input → creates parent_athlete_relationships
// row with crypto.randomUUID() token → renders invite link with Copy button.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { UserPlus, Copy, CheckCircle, Users } from 'lucide-react-native';
import {
  Card, CardContent, CardHeader, CardTitle,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Button, Input, Label,
} from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

const APP_DOMAIN = 'https://offerhound.com';

function uuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ParentInviteCard() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const reset = () => { setSent(false); setEmail(''); setInviteLink(''); };

  const createInvitation = async (): Promise<string | null> => {
    if (!user || !profile?.id) {
      toast({ title: 'Profile required', description: 'Please complete your athlete profile first.', variant: 'destructive' });
      return null;
    }
    const token = uuid();
    const { error } = await supabase.from('parent_athlete_relationships').insert({
      athlete_profile_id: profile.id,
      parent_user_id: user.id, // placeholder, replaced on accept
      invitation_token: token,
      invitation_email: email.trim() || null,
      invitation_sent_at: new Date().toISOString(),
      invitation_accepted: false,
      invited_by: user.id,
      relationship_type: 'parent',
    });
    if (error) {
      toast({ title: 'Could not create invitation', description: error.message, variant: 'destructive' });
      return null;
    }
    return `${APP_DOMAIN}/auth?parent_token=${token}`;
  };

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    const link = await createInvitation();
    setSending(false);
    if (!link) return;
    setInviteLink(link);
    setSent(true);
    toast({ title: 'Invitation ready', description: `Share the link with ${email}.` });
  };

  const handleCopyLink = async () => {
    let link = inviteLink;
    if (!link) {
      const created = await createInvitation();
      if (!created) return;
      link = created;
      setInviteLink(link);
    }
    try { await Clipboard.setStringAsync(link); toast({ title: 'Invite link copied' }); } catch { /* ignore */ }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Users size={18} color={colors.primary} />
            <Text style={s.titleText}>Invite a Parent</Text>
          </View>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm }}>
        <Text style={s.muted}>
          Give a parent or guardian access to your recruiting dashboard so they can help track outreach and offers.
        </Text>
        <Button variant="outline" size="sm" onPress={() => setOpen(true)}
          leftIcon={<UserPlus size={14} color={colors.foreground} />}>
          Invite Parent
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Parent / Guardian</DialogTitle>
          </DialogHeader>
          {sent ? (
            <View style={s.sentBox}>
              <CheckCircle size={48} color={colors.primary} />
              <Text style={s.sentTitle}>Invitation Ready!</Text>
              <Text style={s.muted}>
                Send this link to {email}. When they sign up, they'll be linked directly to your athlete profile.
              </Text>
              {!!inviteLink && (
                <View style={s.linkBox}>
                  <Text style={s.linkText} numberOfLines={3}>{inviteLink}</Text>
                  <Button variant="ghost" size="sm"
                    onPress={() => Clipboard.setStringAsync(inviteLink).then(() => toast({ title: 'Copied!' }))}
                    leftIcon={<Copy size={14} color={colors.foreground} />}>{''}</Button>
                </View>
              )}
              <Button variant="outline" onPress={reset}>Send Another</Button>
            </View>
          ) : (
            <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
              <View>
                <Label>Parent's Email</Label>
                <Input value={email} onChangeText={setEmail} placeholder="parent@email.com"
                  keyboardType="email-address" autoCapitalize="none" />
              </View>
              <Button onPress={handleSend} disabled={!email.trim()} loading={sending}
                leftIcon={<UserPlus size={14} color={colors.primaryForeground} />}>
                Generate Invitation
              </Button>
              <Button variant="outline" onPress={handleCopyLink}
                leftIcon={<Copy size={14} color={colors.foreground} />}>
                Copy Invite Link
              </Button>
            </View>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.heading },
  muted: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  sentBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  sentTitle: { color: colors.foreground, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bodySemiBold },
  linkBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.muted, borderRadius: 8, alignSelf: 'stretch' },
  linkText: { flex: 1, color: colors.foreground, fontSize: typography.fontSize.xs },
});

export default ParentInviteCard;
