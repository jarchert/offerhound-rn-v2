import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { RoleCardGenerator } from '@/components/RoleCardGenerator';
import { spacing } from '@/lib/theme';

interface ShareRoleCardDialogProps {
  children?: React.ReactNode;
  role: 'coach' | 'club_coach' | 'scout' | 'hs_coach';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function ShareRoleCardDialog({
  children,
  role,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ShareRoleCardDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const titleMap: Record<ShareRoleCardDialogProps['role'], string> = {
    coach: 'Share Coach Card',
    club_coach: 'Share Club Coach Card',
    scout: 'Share Scout Card',
    hs_coach: 'Share HS Coach Card',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent style={styles.content}>
        <DialogHeader style={styles.header}>
          <DialogTitle>{titleMap[role]}</DialogTitle>
        </DialogHeader>
        <ScrollArea style={styles.scroll}>
          <View style={styles.inner}>
            <RoleCardGenerator role={role} />
          </View>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default ShareRoleCardDialog;

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 560, maxHeight: '90%', padding: 0, overflow: 'hidden' },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, width: '100%' },
  inner: { width: '100%' },
});
