// AdminModerationScreen — thin wrapper around the ported AdminCampModeration component.
// Lovable parity: serves the camp moderation + community guidelines surface for admins.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { AdminCampModeration } from '@/components/AdminCampModeration';
import { colors, spacing } from '@/lib/theme';

export default function AdminModerationScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <AdminCampModeration />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
