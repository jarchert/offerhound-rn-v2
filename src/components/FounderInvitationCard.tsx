// STUB: full port pending. Lovable source is 310 LOC at
// src/components/FounderInvitationCard.tsx; queued as a separate parity port.
// This stub satisfies the import in AdminInvitationCards.tsx so tsc passes.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

export function FounderInvitationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Founder Card</CardTitle>
      </CardHeader>
      <CardContent>
        <View style={s.box}>
          <Text style={s.text}>FounderInvitationCard — pending verbatim port.</Text>
        </View>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  box: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.foregroundSubtle,
    fontSize: typography.size.sm,
  },
});
