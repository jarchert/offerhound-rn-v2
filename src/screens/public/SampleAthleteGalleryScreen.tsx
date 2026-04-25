// Ported from Lovable web src/pages/SampleAthleteGallery.tsx (25 LOC).
// Web → RN translation:
//   - lucide-react → lucide-react-native
//   - <Card>/<Badge> mapped to RN @/components/ui
//   - SEO is a no-op shim for parity.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image as ImageIcon, Video, Camera } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import { Badge, Card, CardContent } from '@/components/ui';
import { colors, typography, spacing } from '@/lib/theme';

const tiles = [ImageIcon, Video, Camera, ImageIcon, Video, Camera];

export default function SampleAthleteGalleryScreen() {
  return (
    <View style={s.container}>
      <SEO title="Sample Gallery - OfferHound" description="Sample athlete media gallery preview." />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton label="Back" />
        <Badge style={s.badge}>Sample Gallery</Badge>
        <Text style={s.title}>Media Gallery</Text>
        <View style={s.grid}>
          {tiles.map((Icon, i) => (
            <Card key={i} style={s.tile}>
              <CardContent style={s.tileInner}>
                <Icon size={32} color={colors.mutedForeground} />
              </CardContent>
            </Card>
          ))}
        </View>
        <Text style={s.note}>
          This is a sample gallery. Create your profile to upload your own
          highlights and photos.
        </Text>
      </ScrollView>
      <Footer />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl },
  badge: { alignSelf: 'flex-start', marginTop: spacing.lg, marginBottom: spacing.md },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 28,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: '47%', aspectRatio: 16 / 9 },
  tileInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  note: {
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 13,
  },
});
