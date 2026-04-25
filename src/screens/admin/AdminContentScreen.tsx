// AdminContentScreen — thin wrapper around the ported PodcastTileUpload component.
// Lovable parity (AdminMediaCenter / AdminPodcasts / AdminInfluencers): the most-ported
// piece of the admin Content surface today is the podcast tile uploader. The remaining
// pieces (media center, influencer roster admin, letter analytics) are tracked as
// PORT-PENDING in the AdminContent stack and will replace this wrapper as they land.
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, Text } from 'react-native';
import { PodcastTileUpload } from '@/components/admin/PodcastTileUpload';
import { colors, typography, spacing } from '@/lib/theme';

export default function AdminContentScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>Content</Text>
          <Text style={s.subtitle}>
            Podcast tile uploads. Media center, influencers, and letter analytics arrive in a follow-up.
          </Text>
        </View>
        <PodcastTileUpload />
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
});
