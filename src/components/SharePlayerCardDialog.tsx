// Parity port from Lovable src/components/SharePlayerCardDialog.tsx (verbatim logic).
// Web→RN mapping: shadcn Dialog/ScrollArea/Button → src/components/ui/*;
// lucide-react → lucide-react-native; Tailwind → StyleSheet @/lib/theme;
// HTMLDivElement ref → View ref.
//
// Bug 3 fix (shareable athlete card cut off): the previous implementation
// wrapped <ProfileCardGenerator /> in a nested <ScrollArea /> that itself
// sat inside DialogContent's outer <ScrollView>. RN doesn't cleanly handle
// nested same-axis vertical scrolls — the inner ScrollView captured gesture
// focus and its content height exceeded the visible dialog viewport, so
// the Share buttons at the bottom of ProfileCardGenerator were unreachable
// on shorter screens. The nested ScrollArea has been removed; the Dialog's
// own ScrollView now handles scrolling for the whole card. The
// hideTriggers CardShareActions instance (SMS dialog host) is invisible
// UI-wise so its DOM position is irrelevant — kept as a sibling.
import React, { useRef, useState, useEffect } from 'react';
import { View, ActivityIndicator, InteractionManager, StyleSheet } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
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
  // Defer mounting the heavy ProfileCardGenerator (SVG radar, gradient card,
  // QR code, expo-image avatar) until after the modal open animation and any
  // other in-flight interactions have settled. Mounting all of that
  // synchronously on the same tick the dialog opens visibly janks the fade-in
  // animation on lower-end devices. A lightweight ActivityIndicator skeleton
  // fills the capture slot in the meantime; note the skeleton lives *inside*
  // the same <View ref={captureRef}> so captureRef stays valid across the
  // swap (CardShareActions guards against a null ref, but the ref itself
  // never changes here).
  const [heavyReady, setHeavyReady] = useState(false);
  useEffect(() => {
    if (!open) {
      setHeavyReady(false);
      return;
    }
    let cancelled = false;
    const handle = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setHeavyReady(true);
    });
    return () => {
      cancelled = true;
      // handle is a { cancel } object on RN; cancel if the dialog closes fast.
      (handle as any)?.cancel?.();
    };
  }, [open]);
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
        {/*
          NOTE: DialogContent already wraps its children in a ScrollView
          internally (see @/components/ui/Dialog). Do NOT add another
          ScrollView / ScrollArea around ProfileCardGenerator — nesting
          same-axis scrolls hides the Share buttons at the bottom of the
          card on shorter phones (Bug 3).
        */}
        <View
          ref={captureRef}
          style={styles.capture}
          testID="share-player-card-capture"
        >
          {heavyReady ? (
            <ProfileCardGenerator />
          ) : (
            <View style={styles.skeleton} testID="share-player-card-skeleton">
              <ActivityIndicator size="large" color={colors.mutedForeground} />
            </View>
          )}
        </View>
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
    // Kept for backward-compat should a caller import the style; no longer
    // applied to a ScrollView. See Bug 3 comment above.
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  capture: {
    minWidth: 0,
  },
  skeleton: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
});
