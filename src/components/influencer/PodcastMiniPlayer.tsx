/**
 * PodcastMiniPlayer — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/PodcastMiniPlayer.tsx
 *
 * Translations applied:
 *  - <div fixed bottom-0 ...> → absolute-positioned RN <View>
 *  - shadcn <Button variant="ghost"> → RN ui Button (variant="ghost", size="icon")
 *  - <Progress> → RN ui Progress
 *  - lucide-react icons → lucide-react-native
 *  - Tailwind classes → StyleSheet using theme tokens
 *  - forwardRef<HTMLDivElement> → forwardRef<View>
 *  - Audio playback handled by usePodcastPlayer() (already expo-audio backed in
 *    src/contexts/PodcastPlayerContext.tsx); this component is presentational.
 */
import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { usePodcastPlayer } from '@/contexts/PodcastPlayerContext';
import { colors, typography, spacing } from '@/lib/theme';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PodcastMiniPlayer = forwardRef<View>(function PodcastMiniPlayer(_props, ref) {
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    pause,
    resume,
    skipForward,
    skipBackward,
    closePlayer,
  } = usePodcastPlayer();

  if (!currentEpisode) return null;

  const progressValue = duration ? (currentTime / duration) * 100 : 0;

  return (
    <View ref={ref} style={s.container}>
      <View style={s.row}>
        <View style={s.titleCol}>
          <Text style={s.title} numberOfLines={1}>
            {currentEpisode.title}
          </Text>
          <Text style={s.time}>
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </Text>
        </View>
        <View style={s.controls}>
          <Button variant="ghost" size="icon" onPress={() => skipBackward(15)}>
            <SkipBack size={16} color={colors.foreground} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => (isPlaying ? pause() : resume())}
          >
            {isPlaying ? (
              <Pause size={20} color={colors.foreground} />
            ) : (
              <Play size={20} color={colors.foreground} />
            )}
          </Button>
          <Button variant="ghost" size="icon" onPress={() => skipForward(15)}>
            <SkipForward size={16} color={colors.foreground} />
          </Button>
        </View>
        <View style={s.progressCol}>
          <Progress value={progressValue} />
        </View>
        <Button variant="ghost" size="icon" onPress={closePlayer}>
          <X size={16} color={colors.foreground} />
        </Button>
      </View>
    </View>
  );
});

PodcastMiniPlayer.displayName = 'PodcastMiniPlayer';

export default PodcastMiniPlayer;

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    // RN doesn't support web shadow-lg directly; light elevation:
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 896,
    width: '100%',
    alignSelf: 'center',
  },
  titleCol: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  time: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressCol: { width: 160, justifyContent: 'center' },
});
