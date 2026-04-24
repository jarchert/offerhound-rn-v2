// Parity port from Lovable src/components/SharePlayerCardDialog.tsx (verbatim logic).
// Web→RN mapping: shadcn Dialog/ScrollArea/Button → src/components/ui/*;
// lucide-react → lucide-react-native; Tailwind → StyleSheet @/lib/theme;
// HTMLDivElement ref → View ref.
import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
import { Share2, MessageSquare } from 'lucide-react-native';
import { ProfileCardGenerator } from '@/components/ProfileCardGenerator';
import { CardShareActions } from '@/components/CardShareActions';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { colors, spacing } from '@/lib/theme';

interface SharePlayerCardDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function SharePlayerCardDialog({
  children,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: SharePlayerCardDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [smsOpen, setSmsOpen] = useState(false);
  const captureRef = useRef<View>(null);
  const { profile } = usePlayerProfile();
  const name = profile?.full_name || 'Athlete';
  const safe = name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent style={styles.content}>
        <DialogHeader style={styles.header}>
          <DialogTitle style={styles.title}>Share Player Card</DialogTitle>
          <Button
            size="sm"
            variant="outline"
            style={styles.smsButton}
            onPress={() => setSmsOpen(true)}
            leftIcon={<Share2 size={16} color={colors.foreground} />}
            rightIcon={<MessageSquare size={14} color={colors.foreground} />}
          />
        </DialogHeader>
        <ScrollArea style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View ref={captureRef} style={styles.capture}>
            <ProfileCardGenerator />
          </View>
        </ScrollArea>
        <CardShareActions
          targetRef={captureRef}
          senderName={name}
          fileBaseName={`${safe}-offerhound-card`}
          hideTriggers
          sendDialogOpen={smsOpen}
          onSendDialogOpenChange={setSmsOpen}
          defaultChannel="sms"
        />
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 0,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
  },
  smsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  capture: {
    minWidth: 0,
  },
});
