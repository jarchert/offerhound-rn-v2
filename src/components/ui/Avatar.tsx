import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
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
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fallback: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
});
