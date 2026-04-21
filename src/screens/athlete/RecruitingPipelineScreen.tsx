import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Navbar } from '@/components/Navbar';
import { RecruitingPipeline } from '@/components/RecruitingPipeline';
import { colors, typography, spacing } from '@/lib/theme';

export default function RecruitingPipelineScreen() {
  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <Text style={s.title}>Recruiting Pipeline</Text>
        <Text style={s.subtitle}>Track coaches across recruiting stages</Text>
      </View>
      <View style={s.board}>
        <RecruitingPipeline />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  board: { flex: 1 },
});
