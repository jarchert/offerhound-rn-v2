// CampReportExportButton — generates a plain-text post-camp summary and hands
// it to the OS share sheet via expo-sharing. The full PDF pipeline lives in a
// server-side edge function not yet ported; this stub gives athletes a usable
// shareable artifact today.
import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { FileText } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';

interface Props {
  campName: string;
  campId: string;
  enrollmentId: string;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export default function CampReportExportButton({ campName, campId, enrollmentId, variant = 'default', size }: Props) {
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    setBusy(true);
    try {
      const safeName = (campName || 'camp-report').replace(/[^a-z0-9-_]+/gi, '_');
      const path = `${FileSystem.cacheDirectory}${safeName}.txt`;
      const body = [
        `OfferHound Camp Report`,
        `=======================`,
        `Camp: ${campName}`,
        `Camp ID: ${campId}`,
        `Enrollment: ${enrollmentId}`,
        ``,
        `Performance breakdowns and evaluator notes will appear here once the`,
        `full PDF pipeline is enabled. Share this file with coaches in the meantime.`,
      ].join('\n');
      await FileSystem.writeAsStringAsync(path, body, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Share camp report' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant as any}
      size={size as any}
      onPress={onPress}
      disabled={busy}
      leftIcon={busy ? <ActivityIndicator color={colors.primaryForeground} /> : <FileText size={16} color={variant === 'outline' ? colors.primary : colors.primaryForeground} />}>
      {busy ? 'Preparing…' : 'Download report'}
    </Button>
  );
}
