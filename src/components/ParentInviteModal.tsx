// Ported verbatim from Lovable src/components/ParentInviteModal.tsx, RN-adapted.
// Hook useParentInvitation is inlined here (not yet ported to v2 as a separate file)
// to keep this port a single file-write. Logic matches the web hook exactly.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { UserPlus, Loader2, Mail, Phone, Check, Trash2, MessageSquare, AlertCircle, X } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ---------- Inlined hook (parity port of useParentInvitation) ----------
export interface ParentRelationship {
  id: string;
  parent_user_id: string;
  athlete_profile_id: string;
  relationship_type: string;
  invitation_token: string | null;
  invitation_email: string | null;
  invitation_phone: string | null;
  invitation_sent_at: string | null;
  invitation_accepted: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

function useParentInvitation(athleteProfileId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [relationships, setRelationships] = useState<ParentRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRelationships = async () => {
    if (!athleteProfileId) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('parent_athlete_relationships')
        .select('*')
        .eq('athlete_profile_id', athleteProfileId);
      if (error) throw error;
      setRelationships((data as any) || []);
    } catch (err) {
      console.error('Error fetching parent relationships:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteProfileId]);

  const MAX_PARENTS = 2;
  const canInviteMore = relationships.length < MAX_PARENTS;

  const inviteParent = async (email?: string, phone?: string): Promise<any> => {
    if (!user || !athleteProfileId) {
      toast({ title: 'Error', description: 'You must be logged in to invite a parent.', variant: 'destructive' });
      return { success: false };
    }
    if (!email && !phone) {
      toast({ title: 'Error', description: 'Please provide an email or phone number.', variant: 'destructive' });
      return { success: false };
    }
    if (relationships.length >= MAX_PARENTS) {
      toast({ title: 'Limit Reached', description: `You can only invite up to ${MAX_PARENTS} parents or guardians.`, variant: 'destructive' });
      return { success: false };
    }

    try {
      const existingCheck = await supabase
        .from('parent_athlete_relationships')
        .select('id, invitation_email, invitation_phone, invitation_sent_at, invitation_accepted')
        .eq('athlete_profile_id', athleteProfileId);

      if (existingCheck.data) {
        const duplicate = (existingCheck.data as any[]).find(
          (r) => (email && r.invitation_email === email) || (phone && r.invitation_phone === phone),
        );
        if (duplicate) {
          return {
            success: false,
            isDuplicate: true,
            duplicateInfo: {
              contact: email || phone,
              sentAt: duplicate.invitation_sent_at,
              isAccepted: duplicate.invitation_accepted,
            },
          };
        }
      }

      // RN-safe UUID (crypto.randomUUID may be unavailable).
      const token =
        (typeof (globalThis as any).crypto !== 'undefined' && (globalThis as any).crypto.randomUUID
          ? (globalThis as any).crypto.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`) as string;
      const placeholderUserId = token;

      const { data, error } = await supabase
        .from('parent_athlete_relationships')
        .insert({
          parent_user_id: placeholderUserId,
          athlete_profile_id: athleteProfileId,
          invitation_token: token,
          invitation_email: email || null,
          invitation_phone: phone || null,
          invitation_sent_at: new Date().toISOString(),
          invited_by: user.id,
        } as any)
        .select()
        .single();
      if (error) throw error;

      let athleteName: string | undefined;
      try {
        const { data: profileData } = await supabase
          .from('player_profiles')
          .select('full_name')
          .eq('id', athleteProfileId)
          .single();
        athleteName = (profileData as any)?.full_name;
      } catch {
        // ignore
      }

      // RN has no window.location; edge fns can derive appUrl server-side if absent.
      const appUrl = '';

      if (email) {
        const { error: emailError } = await supabase.functions.invoke('send-parent-invitation', {
          body: { email, invitationToken: token, appUrl, athleteName },
        });
        if (emailError) {
          console.error('Error sending email invitation:', emailError);
          toast({ title: 'Warning', description: 'Invitation created but email delivery may have failed. Please verify.', variant: 'destructive' });
        } else {
          toast({ title: 'Email Invitation Sent', description: `An invitation has been sent to ${email}.` });
        }
      } else if (phone) {
        const { error: smsError } = await supabase.functions.invoke('send-parent-sms-invitation', {
          body: { phone, invitationToken: token, appUrl, athleteName },
        });
        if (smsError) {
          console.error('Error sending SMS invitation:', smsError);
          toast({ title: 'Warning', description: 'Invitation created but SMS delivery may have failed. Please verify.', variant: 'destructive' });
        } else {
          toast({ title: 'SMS Invitation Sent', description: `An invitation has been sent to ${phone}.` });
        }
      }

      await fetchRelationships();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error inviting parent:', err);
      toast({ title: 'Error', description: err?.message || 'Failed to send invitation.', variant: 'destructive' });
      return { success: false, error: err };
    }
  };

  const removeParent = async (relationshipId: string) => {
    try {
      const { error } = await supabase
        .from('parent_athlete_relationships')
        .delete()
        .eq('id', relationshipId);
      if (error) throw error;
      toast({ title: 'Parent Removed', description: 'The parent has been removed from your profile.' });
      await fetchRelationships();
      return { success: true };
    } catch (err) {
      console.error('Error removing parent:', err);
      return { success: false, error: err };
    }
  };

  return { relationships, isLoading, inviteParent, removeParent, refetch: fetchRelationships, canInviteMore, maxParents: MAX_PARENTS };
}

// ---------- Component ----------
interface ParentInviteModalProps {
  athleteProfileId: string;
}

interface DuplicateAlert {
  contact: string;
  sentAt: string | null;
  isAccepted: boolean;
}

export function ParentInviteModal({ athleteProfileId }: ParentInviteModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms'>('email');
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateAlert | null>(null);
  const { relationships, inviteParent, removeParent, canInviteMore, maxParents } = useParentInvitation(athleteProfileId);

  const handleSubmit = async () => {
    setDuplicateAlert(null);
    if (inviteMethod === 'email' && !email.trim()) return;
    if (inviteMethod === 'sms' && !phone.trim()) return;

    setIsSending(true);
    const result = await inviteParent(
      inviteMethod === 'email' ? email.trim() : undefined,
      inviteMethod === 'sms' ? phone.trim() : undefined,
    );

    if (result.success) {
      setEmail('');
      setPhone('');
    } else if (result.isDuplicate && result.duplicateInfo) {
      setDuplicateAlert(result.duplicateInfo);
    }
    setIsSending(false);
  };

  const handleRemove = async (relationshipId: string) => {
    await removeParent(relationshipId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus size={16} color={colors.foreground} style={{ marginRight: 8 }} />
          <Text style={s.triggerText}>Invite Parent</Text>
          {relationships.length > 0 && (
            <Badge variant="secondary" style={{ marginLeft: 8 }}>
              {relationships.length}/{maxParents}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Parent or Guardian</DialogTitle>
          <DialogDescription>
            Invite up to {maxParents} parents or guardians to manage your profile with full control.
          </DialogDescription>
          <Text style={s.slotsUsed}>
            {relationships.length} of {maxParents} slots used
          </Text>
        </DialogHeader>

        {duplicateAlert && (
          <View style={s.alert}>
            <View style={s.alertHeaderRow}>
              <AlertCircle size={16} color={colors.destructive} />
              <Text style={s.alertTitle}>Invitation Already Exists</Text>
            </View>
            <Text style={s.alertDesc}>
              <Text style={s.alertContact}>{duplicateAlert.contact}</Text>
              <Text> has already been invited</Text>
              {duplicateAlert.sentAt && (
                <Text style={s.mutedText}>
                  {' '}({formatDistanceToNow(new Date(duplicateAlert.sentAt), { addSuffix: true })})
                </Text>
              )}
              <Text>. </Text>
              <Text>
                {duplicateAlert.isAccepted
                  ? 'This parent is already connected to your profile.'
                  : 'Check the pending invitations below or remove the existing invitation to send a new one.'}
              </Text>
            </Text>
            <Pressable style={s.alertClose} onPress={() => setDuplicateAlert(null)} hitSlop={8}>
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {canInviteMore ? (
          <Tabs value={inviteMethod} onValueChange={(v: string) => setInviteMethod(v as 'email' | 'sms')}>
            <TabsList>
              <TabsTrigger value="email">
                <View style={s.tabLabelRow}>
                  <Mail size={16} color={colors.foreground} />
                  <Text style={s.tabLabelText}>Email</Text>
                </View>
              </TabsTrigger>
              <TabsTrigger value="sms">
                <View style={s.tabLabelRow}>
                  <MessageSquare size={16} color={colors.foreground} />
                  <Text style={s.tabLabelText}>SMS</Text>
                </View>
              </TabsTrigger>
            </TabsList>

            <View style={{ marginTop: spacing.md }}>
              <TabsContent value="email">
                <View style={s.fieldGroup}>
                  <Label>Parent's Email</Label>
                  <View style={s.row}>
                    <View style={{ flex: 1 }}>
                      <Input
                        placeholder="parent@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <Button onPress={handleSubmit} disabled={isSending || !email.trim()}>
                      {isSending ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Mail size={16} color={colors.primaryForeground} />
                      )}
                    </Button>
                  </View>
                </View>
              </TabsContent>

              <TabsContent value="sms">
                <View style={s.fieldGroup}>
                  <Label>Parent's Phone Number</Label>
                  <View style={s.row}>
                    <View style={{ flex: 1 }}>
                      <Input
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                    <Button onPress={handleSubmit} disabled={isSending || !phone.trim()}>
                      {isSending ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Phone size={16} color={colors.primaryForeground} />
                      )}
                    </Button>
                  </View>
                  <Text style={s.helperText}>Standard message rates may apply</Text>
                </View>
              </TabsContent>
            </View>
          </Tabs>
        ) : (
          <View style={s.maxedBox}>
            <Text style={s.maxedText}>
              Maximum of {maxParents} parents reached. Remove an existing parent to invite a new one.
            </Text>
          </View>
        )}

        {relationships.length > 0 && (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Label>Connected Parents</Label>
            <View style={{ gap: spacing.sm }}>
              {relationships.map((rel) => (
                <ParentRow key={rel.id} relationship={rel} onRemove={handleRemove} />
              ))}
            </View>
          </View>
        )}

        <DialogFooter>
          <Button variant="ghost" onPress={() => setOpen(false)}>
            <Text style={s.closeBtnText}>Close</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ParentRowProps {
  relationship: ParentRelationship;
  onRemove: (id: string) => void;
}

function ParentRow({ relationship, onRemove }: ParentRowProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    await onRemove(relationship.id);
    setIsRemoving(false);
  };

  const contactInfo = relationship.invitation_email || relationship.invitation_phone;
  const contactType = relationship.invitation_email ? 'email' : 'sms';

  return (
    <View style={s.parentRow}>
      <View style={s.parentRowLeft}>
        {contactType === 'email' ? (
          <Mail size={12} color={colors.mutedForeground} />
        ) : (
          <Phone size={12} color={colors.mutedForeground} />
        )}
        <Text style={s.contactText}>{contactInfo}</Text>
        {relationship.invitation_accepted ? (
          <Badge variant="default">
            <View style={s.badgeInner}>
              <Check size={12} color={colors.primaryForeground} />
              <Text style={[s.badgeText, { color: colors.primaryForeground }]}>Connected</Text>
            </View>
          </Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        )}
      </View>
      <View style={s.parentRowRight}>
        {relationship.invitation_sent_at && !relationship.invitation_accepted && (
          <Text style={s.sentText}>
            Sent {formatDistanceToNow(new Date(relationship.invitation_sent_at), { addSuffix: true })}
          </Text>
        )}
        <Button variant="ghost" size="sm" onPress={handleRemove} disabled={isRemoving}>
          {isRemoving ? (
            <Loader2 size={16} color={colors.destructive} />
          ) : (
            <Trash2 size={16} color={colors.destructive} />
          )}
        </Button>
      </View>
    </View>
  );
}

export default ParentInviteModal;

const s = StyleSheet.create({
  triggerText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  slotsUsed: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  alert: {
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: 'rgba(220, 40, 40, 0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.destructive,
    fontSize: typography.fontSize.sm,
  },
  alertDesc: {
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  alertContact: { fontFamily: typography.fontFamily.bodySemiBold },
  mutedText: { color: colors.mutedForeground },
  alertClose: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: 4 },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tabLabelText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  fieldGroup: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  helperText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
  maxedBox: {
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  maxedText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  closeBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
  },
  parentRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, flexWrap: 'wrap' },
  parentRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactText: {
    fontFamily: typography.fontFamily.body,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  badgeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xs },
  sentText: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
});
