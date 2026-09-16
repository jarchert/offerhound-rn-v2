// Perf fix (Sep 2026): swapped plain react-native <Image> for expo-image
// (already a dependency, used in Banner/Footer/Gallery/HeroBackground uploaders).
// The share-card Avatar renders profile.profile_image_url on every mount of
// SharePlayerCardDialog + the inline ProfileCardGenerator inside
// SocialLinksManager. Plain <Image> has no in-process memory/disk cache, so
// each open re-decoded the JPEG on the JS thread and re-fetched from the CDN
// on cold OS-cache. expo-image gives us memory+disk cache and a native decode
// path with essentially no source-shape change (source={{uri}} still works).
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography } from '@/lib/theme';

interface AvatarProps {
  source?: { uri: string } | null;
  fallback?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ source, fallback, size = 40, style }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const showFallback = !source?.uri || error;

  return (
    <View style={[s.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {showFallback ? (
        <Text style={[s.fallback, { fontSize: size * 0.4 }]}>
          {(fallback || '?').slice(0, 2).toUpperCase()}
        </Text>
      ) : (
        <Image
          source={source!}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setError(true)}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={0}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fallback: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
});
