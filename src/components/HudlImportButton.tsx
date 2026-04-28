// HudlImportButton — RN port of offerhound-repo/src/components/HudlImportButton.tsx
//
// Modal for athletes to paste their HUDL + MaxPreps URLs. Returns both via
// onImport callback so the parent can persist them to player_profiles.hudl_url
// and player_profiles.maxpreps_url.
//
// Web → RN translations:
//   - shadcn Dialog/Input/Label → src/components/ui/* equivalents
//   - lucide-react → lucide-react-native
//   - cn(...) Tailwind classes → StyleSheet via theme tokens
import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { ExternalLink, FileText } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { colors, typography, spacing } from '@/lib/theme';

interface HudlImportButtonProps {
  onImport: (data: { hudlUrl?: string; maxprepsUrl?: string }) => void;
  currentHudlUrl?: string;
  currentMaxPrepsUrl?: string;
}

export function HudlImportButton({
  onImport,
  currentHudlUrl,
  currentMaxPrepsUrl,
}: HudlImportButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [hudlUrl, setHudlUrl] = useState(currentHudlUrl || '');
  const [maxprepsUrl, setMaxprepsUrl] = useState(currentMaxPrepsUrl || '');

  const handleImport = () => {
    onImport({ hudlUrl: hudlUrl || undefined, maxprepsUrl: maxprepsUrl || undefined });
    setShowDialog(false);
  };

  const openHudl = () => {
    Linking.openURL('https://www.hudl.com/').catch(() => {});
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<FileText size={14} color={colors.foreground} />}
        onPress={() => setShowDialog(true)}
      >
        Import from HUDL/MaxPreps
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <View style={s.titleRow}>
              <FileText size={18} color={colors.foreground} />
              <DialogTitle>Import Athlete Data</DialogTitle>
            </View>
          </DialogHeader>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: 4 }}>
              <Label>HUDL Profile URL</Label>
              <Input
                value={hudlUrl}
                onChangeText={setHudlUrl}
                placeholder="https://www.hudl.com/profile/..."
                autoCapitalize="none"
              />
            </View>
            <View style={{ gap: 4 }}>
              <Label>MaxPreps Profile URL</Label>
              <Input
                value={maxprepsUrl}
                onChangeText={setMaxprepsUrl}
                placeholder="https://www.maxpreps.com/athlete/..."
                autoCapitalize="none"
              />
            </View>
            <Text style={s.helper}>
              Paste your profile URLs to link them to your OfferHound profile. Stats will be
              displayed on your public profile.
            </Text>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ExternalLink size={14} color={colors.primary} />}
              onPress={openHudl}
            >
              Open HUDL to copy your URL
            </Button>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleImport}
              disabled={!hudlUrl && !maxprepsUrl}
              leftIcon={<ExternalLink size={14} color={colors.primaryForeground} />}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HudlImportButton;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  helper: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});
