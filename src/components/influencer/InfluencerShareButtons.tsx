// Ported from Lovable web (src/components/influencer/InfluencerShareButtons.tsx) → React Native.
// RN adaptations:
//   - navigator.clipboard          → expo-clipboard
//   - <a href target="_blank">     → Linking.openURL
//   - sonner toast                 → @/components/ui/toast
//   - lucide-react brand icons     → @expo/vector-icons FontAwesome6 (mirrors MediaShareButtons pattern)
//                                    (Twitter→x-twitter, LinkedIn→linkedin-in, Facebook→facebook-f)
//   - lucide-react Link2           → lucide-react-native Link2
//   - Tailwind className           → StyleSheet + theme tokens (visual parity, not pixel-perfect)
import React from 'react';
import { View, Pressable, StyleSheet, Linking, ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Link2 } from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { shareLinks } from '@/lib/influencerShare';
import { toast } from '@/components/ui/toast';
import { colors, spacing } from '@/lib/theme';

export function InfluencerShareButtons({ url, title }: { url: string; title: string }) {
  const links = shareLinks(url, title);

  const open = (target: string) => {
    Linking.openURL(target).catch(() => toast.error("Couldn't open link"));
  };

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(url);
      toast.success('Link copied');
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share on X / Twitter"
        onPress={() => open(links.twitter)}
        style={styles.iconBtn}
      >
        <FontAwesome6 name="x-twitter" size={16} color={colors.foreground} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share on LinkedIn"
        onPress={() => open(links.linkedin)}
        style={styles.iconBtn}
      >
        <FontAwesome6 name="linkedin-in" size={16} color={colors.foreground} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share on Facebook"
        onPress={() => open(links.facebook)}
        style={styles.iconBtn}
      >
        <FontAwesome6 name="facebook-f" size={16} color={colors.foreground} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy link"
        onPress={copy}
        style={styles.iconBtn}
      >
        <Link2 size={16} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

export default InfluencerShareButtons;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  iconBtn: {
    height: 32,
    width: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
