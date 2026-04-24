import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react-native';
import { useSyncStatus, SyncStatus } from '@/hooks/useSyncStatus';
import { colors, radius, spacing, typography } from '@/lib/theme';

// Memoize to prevent unnecessary re-renders
export const SyncIndicator = memo(() => {
  const { syncStatus, isOnline, triggerSync } = useSyncStatus();

  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'offline':
        return {
          icon: CloudOff,
          text: 'Offline',
          // bg-amber-500/10 text-amber-500 border-amber-500/20
          bg: 'rgba(245, 158, 11, 0.1)',
          fg: '#f59e0b',
          border: 'rgba(245, 158, 11, 0.2)',
          animate: false,
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          text: 'Syncing...',
          // bg-blue-500/10 text-blue-500 border-blue-500/20
          bg: 'rgba(59, 130, 246, 0.1)',
          fg: '#3b82f6',
          border: 'rgba(59, 130, 246, 0.2)',
          animate: true,
        };
      case 'synced':
        return {
          icon: Check,
          text: 'Synced',
          // bg-green-500/10 text-green-500 border-green-500/20
          bg: 'rgba(34, 197, 94, 0.1)',
          fg: '#22c55e',
          border: 'rgba(34, 197, 94, 0.2)',
          animate: false,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig(syncStatus);

  // Drive the spin animation unconditionally so hook order stays stable.
  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (config?.animate) {
      spinValue.setValue(0);
      const loop = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => {
        loop.stop();
      };
    }
  }, [config?.animate, spinValue]);

  // Don't show anything when idle and online
  if (!config) return null;

  const Icon = config.icon;
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const interactive = isOnline && syncStatus !== 'syncing';

  const content = (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <Animated.View
        style={config.animate ? { transform: [{ rotate: spin }] } : undefined}
      >
        <Icon size={16} color={config.fg} />
      </Animated.View>
      <Text style={[styles.text, { color: config.fg }]}>{config.text}</Text>
    </View>
  );

  if (interactive) {
    return (
      <Pressable
        onPress={triggerSync}
        accessibilityRole="button"
        style={styles.wrapper}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
});

SyncIndicator.displayName = 'SyncIndicator';

// Tailwind → StyleSheet mapping:
//   fixed bottom-4 left-4 z-50           -> position:'absolute', bottom:16, left:16, zIndex:50
//   flex items-center gap-2              -> flexDirection:'row', alignItems:'center', gap:8
//   px-3 py-2                            -> paddingHorizontal:12, paddingVertical:8
//   rounded-full                         -> borderRadius: radius.full
//   border backdrop-blur-sm              -> borderWidth:1 (RN has no backdrop-blur; approximated via semi-transparent bg)
//   h-4 w-4                              -> size={16}
//   text-sm font-medium                  -> fontSize: typography.size.sm, fontFamily: typography.fontFamily.bodyMedium
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    zIndex: 50,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyMedium,
  },
});

export default SyncIndicator;
