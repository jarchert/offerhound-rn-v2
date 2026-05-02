// TeammateInviteModal — RN port of Lovable src/components/TeammateInviteModal.tsx
// Web → RN: Dialog → @/components/ui/Dialog, sonner → useToast, className → StyleSheet
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

export function TeammateInviteModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { toast } = useToast();

  const handleInvite = () => {
    if (!email) {
      toast({ title: 'Email required', description: 'Please enter a teammate email.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Invitation sent!', description: `Invite sent to ${name || email}.` });
    setEmail('');
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onPress={() => setOpen(true)}>
          <View style={s.triggerRow}>
            <UserPlus size={16} color={colors.foreground} />
            <Text style={s.triggerText}>Invite Teammate</Text>
          </View>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Teammate</DialogTitle>
        </DialogHeader>
        <View style={s.form}>
          <View style={s.field}>
            <Label>Name</Label>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Teammate name"
              autoCapitalize="words"
            />
          </View>
          <View style={s.field}>
            <Label>Email</Label>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="teammate@school.edu"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <Button onPress={handleInvite} style={s.submitBtn}>
            Send Invitation
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export default TeammateInviteModal;

const s = StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  triggerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  form: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
});
