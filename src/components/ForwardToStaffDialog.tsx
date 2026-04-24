// Parity port from Lovable src/components/ForwardToStaffDialog.tsx (verbatim logic).
// Web→RN mapping: shadcn Dialog/Button/Badge/Textarea/Label/Avatar/ScrollArea →
// src/components/ui/*; lucide-react → lucide-react-native; Tailwind → StyleSheet @/lib/theme.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Avatar } from '@/components/ui/Avatar';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Forward, Loader2, CheckCircle2, User, Tent, Mail } from 'lucide-react-native';
import { colors, typography, spacing } from '@/lib/theme';

interface ForwardToStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'athlete' | 'camp' | 'letter';
  entityId: string;
  entityName: string;
}

export function ForwardToStaffDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
}: ForwardToStaffDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['coaching-staff-for-forward', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('coaching_staff')
        .select('*')
        .eq('owner_user_id', user.id)
        .neq('status', 'removed');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  const forwardMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const messageType = `${entityType}_forward`;
      const inserts = selectedStaffIds
        .map((staffId) => {
          const member = (staff as any[]).find((s: any) => s.id === staffId);
          const recipientUserId = member?.staff_user_id || member?.id;
          return [
            // Create forward record
            supabase.from('staff_forwards').insert({
              sender_user_id: user.id,
              recipient_user_id: recipientUserId,
              entity_type: entityType,
              entity_id: entityId,
              entity_name: entityName,
              note: note || null,
            }),
            // Send message notification
            supabase.from('staff_messages').insert({
              sender_user_id: user.id,
              recipient_user_id: recipientUserId,
              content: `${getForwardEmoji(entityType)} Forwarded ${entityType}: ${entityName}${note ? `\n\nNote: ${note}` : ''}`,
              message_type: messageType,
              forwarded_entity_id: entityId,
              forwarded_entity_type: entityType,
            }),
          ];
        })
        .flat();

      const results = await Promise.all(inserts);
      const errors = results.filter((r: any) => r.error);
      if (errors.length > 0) throw new Error((errors[0] as any).error!.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-message-threads'] });
      toast({
        title: 'Forwarded Successfully',
        description: `${entityName} sent to ${selectedStaffIds.length} staff member${selectedStaffIds.length > 1 ? 's' : ''}.`,
      });
      onOpenChange(false);
      setSelectedStaffIds([]);
      setNote('');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const getForwardEmoji = (type: string) => {
    if (type === 'athlete') return '🏈';
    if (type === 'camp') return '🏕️';
    if (type === 'letter') return '✉️';
    return '📎';
  };

  const EntityIcon = entityType === 'athlete' ? User : entityType === 'camp' ? Tent : Mail;

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={s.dialogContent}>
        <DialogHeader>
          <View style={s.titleRow}>
            <Forward size={20} color={colors.primary} />
            <DialogTitle>Forward to Staff</DialogTitle>
          </View>
          <DialogDescription>
            Share this {entityType} with your coaching staff
          </DialogDescription>
        </DialogHeader>

        {/* Entity Preview */}
        <View style={s.entityPreview}>
          <View style={s.entityIconWrap}>
            <EntityIcon size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={s.entityName}>{entityName}</Text>
            <Text style={s.entityType}>{entityType}</Text>
          </View>
        </View>

        {/* Staff Selection */}
        <View style={s.field}>
          <Label>Select Staff Members</Label>
          <ScrollArea style={s.staffBox}>
            {isLoading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={colors.foreground} />
              </View>
            ) : (staff as any[]).length === 0 ? (
              <Text style={s.emptyText}>No staff members. Add staff first.</Text>
            ) : (
              <View>
                {(staff as any[]).map((member: any, idx: number) => {
                  const isSelected = selectedStaffIds.includes(member.id);
                  const initials = (member.name || '')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => toggleStaff(member.id)}
                      style={[
                        s.staffRow,
                        idx > 0 && s.staffRowBorder,
                        isSelected && s.staffRowSelected,
                      ]}
                    >
                      <Avatar size={32} fallback={initials} />
                      <View style={s.staffText}>
                        <Text style={s.staffName} numberOfLines={1}>
                          {member.name}
                        </Text>
                        <Text style={s.staffRole} numberOfLines={1}>
                          {member.role?.replace('_', ' ')}
                        </Text>
                      </View>
                      {isSelected && (
                        <CheckCircle2 size={20} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollArea>
          {selectedStaffIds.length > 0 && (
            <Text style={s.selectedCount}>{selectedStaffIds.length} selected</Text>
          )}
        </View>

        {/* Note */}
        <View style={s.field}>
          <Label>Add a Note (optional)</Label>
          <Textarea
            value={note}
            onChangeText={setNote}
            placeholder="Check out this prospect..."
            rows={2}
          />
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onPress={() => forwardMutation.mutate()}
            disabled={selectedStaffIds.length === 0 || forwardMutation.isPending}
            loading={forwardMutation.isPending}
            leftIcon={
              !forwardMutation.isPending ? (
                <Forward size={16} color={colors.primaryForeground} />
              ) : undefined
            }
          >
            {`Forward to ${selectedStaffIds.length || ''} Staff`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ForwardToStaffDialog;

const s = StyleSheet.create({
  dialogContent: { maxWidth: 448 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: { gap: spacing.xs },
  entityPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(39, 43, 52, 0.3)',
    borderRadius: 12,
  },
  entityIconWrap: {
    padding: spacing.xs,
    backgroundColor: 'rgba(231, 175, 8, 0.10)',
    borderRadius: 8,
  },
  entityName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  entityType: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  staffBox: {
    maxHeight: 192,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  loadingRow: { paddingVertical: spacing.lg, alignItems: 'center' },
  emptyText: {
    paddingVertical: spacing.lg,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  staffRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  staffRowSelected: { backgroundColor: 'rgba(231, 175, 8, 0.05)' },
  staffText: { flex: 1, minWidth: 0 },
  staffName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  staffRole: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  selectedCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
