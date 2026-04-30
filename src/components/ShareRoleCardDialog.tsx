// ShareRoleCardDialog — RN port of Lovable src/components/ShareRoleCardDialog.tsx.
// Wraps RoleCardGenerator in a Dialog for coach/club_coach/scout/hs_coach share cards.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { RoleCardGenerator } from '@/components/RoleCardGenerator';

type Role = 'coach' | 'club_coach' | 'scout' | 'hs_coach';

interface ShareRoleCardDialogProps {
  children?: React.ReactNode;
  role: Role;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const TITLE_MAP: Record<Role, string> = {
  coach: 'Share Coach Card',
  club_coach: 'Share Club Coach Card',
  scout: 'Share Scout Card',
  hs_coach: 'Share HS Coach Card',
};

export function ShareRoleCardDialog({
  children, role,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ShareRoleCardDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent style={styles.content}>
        <DialogHeader style={styles.header}>
          <DialogTitle>{TITLE_MAP[role]}</DialogTitle>
        </DialogHeader>
        <ScrollArea style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.inner}>
            <RoleCardGenerator role={role} />
          </View>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Minimal DialogTrigger polyfill for RN
function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  // Parent Dialog handles open state — this just renders children
  return <>{children}</>;
}

const styles = StyleSheet.create({
  content: { padding: 0, overflow: 'hidden', maxHeight: '90%' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  scroll: { maxHeight: 'calc(90vh - 80px)' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  inner: { minWidth: 0 },
});