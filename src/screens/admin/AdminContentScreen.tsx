// AdminContentScreen — podcast tile uploads + invitation cards.
// Wave 1 wiring: AdminInvitationCards appended below PodcastTileUpload in same scroll.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, Text } from 'react-native';
import { PodcastTileUpload } from '@/components/admin/PodcastTileUpload';
import { AdminInvitationCards } from '@/components/AdminInvitationCards';
import AdminPlatformEmailTemplates from '@/components/AdminPlatformEmailTemplates';
import { colors, typography, spacing } from '@/lib/theme';

export default function AdminContentScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>Content</Text>
          <Text style={s.subtitle}>
            Podcast tile uploads, user invitation cards, and athlete transactional email templates. Media center, influencers, and letter analytics arrive in a follow-up.
          </Text>
        </View>
        <PodcastTileUpload />
        <View style={s.divider} />
        <AdminInvitationCards />
        <View style={s.divider} />
        <AdminPlatformEmailTemplates />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.sm,
    color: colors.foregroundSubtle,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
});
