// RN port of Lovable src/components/TeammateInviteModal.tsx.
//
// NOTE: The Lovable web version is itself only 35 lines and does not persist
// anything — it fires a local toast and closes. This RN port matches that
// behavior. If/when the web side wires this to a real invite endpoint
// (parity table looked at was `teammate_invites` — not present in the schema
// probe on 2026-07-15), update both sides together.
//
// Web→RN mapping:
//   - shadcn Dialog/Input/Label/Button → @/components/ui/*
//   - lucide-react UserPlus            → lucide-react-native UserPlus
//   - sonner toast                     → @/components/ui/toast

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { toast } from '@/components/ui/toast';
import { colors, spacing } from '@/lib/theme';

export const TeammateInviteModal = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleInvite = () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }
    toast.success(`Invitation sent to ${name || email}!`);
    setEmail('');
    setName('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<UserPlus size={14} color={colors.foreground} />}
        >
          Invite Teammate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Teammate</DialogTitle>
        </DialogHeader>
        <View style={s.formCol}>
          <View style={s.field}>
            <Label>Name</Label>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Teammate name"
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
              autoCorrect={false}
            />
          </View>
          <Button onPress={handleInvite}>Send Invitation</Button>
        </View>
      </DialogContent>
    </Dialog>
  );
};

export default TeammateInviteModal;

const s = StyleSheet.create({
  formCol: { gap: spacing.md, paddingTop: spacing.sm },
  field: { gap: spacing.xs },
});
