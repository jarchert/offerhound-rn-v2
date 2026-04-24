// Port stub for AdminLegalContentEditor (web sibling).
// Full Terms & Privacy editor not yet ported; show placeholder.
// See GAPS in AdminLegalContentTabs port notes.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/lib/theme';

export function AdminLegalContentEditor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms & Privacy</CardTitle>
        <CardDescription>Edit Terms of Service and Privacy Policy content</CardDescription>
      </CardHeader>
      <CardContent>
        <View style={s.placeholder}>
          <Text style={s.placeholderText}>
            [AdminLegalContentEditor] — port pending. Full editor will load here.
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}

export default AdminLegalContentEditor;

const s = StyleSheet.create({
  placeholder: {
    padding: spacing.lg,
    backgroundColor: colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
