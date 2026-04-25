// ScoutLettersScreen — thin wrapper around the ported ScoutLettersTab component.
// Lovable parity (ScoutLetters / src/components/scout/ScoutLettersTab): list/search of
// scout letter history. The streaming AI composer ships separately as
// LetterComposerScreen and is reachable from the coach directory.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { ScoutLettersTab } from '@/components/scout/ScoutLettersTab';
import { colors, spacing } from '@/lib/theme';

export default function ScoutLettersScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <ScoutLettersTab />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
