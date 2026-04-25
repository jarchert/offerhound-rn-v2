// Verbatim port from Lovable web — RN-adapted.
// Source: offerhound-repo/src/components/SocialPostComposer.tsx
//
// Adaptations:
//   - <div>/<span>/<button> → <View>/<Text>/<Pressable>
//   - Tailwind classNames → StyleSheet
//   - react-icons/fa (FaXTwitter, FaFacebookF, …) → lucide-react-native
//     (Twitter, Facebook, Instagram, Youtube). TikTok has no lucide icon
//     so we fall back to a text monogram.
//   - navigator.clipboard → expo-clipboard
//   - window.open(shareUrl, '_blank') → Linking.openURL
//   - KeyboardAvoidingView wraps the card so the Textarea stays visible
//     when the keyboard opens (required by session-parity checklist).
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { toast } from '@/components/ui/toast';
import {
  Copy,
  Check,
  ExternalLink,
  Send,
  Image as ImageIcon,
  Hash,
} from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface SocialPlatform {
  key: string;
  label: string;
  color: string;        // background
  fg: string;           // foreground
  monogram: string;     // 1–2 char badge (brand icons removed from lucide v1)
  shareUrl: (text: string) => string;
}

const PLATFORMS: SocialPlatform[] = [
  {
    key: 'x',
    label: 'X (Twitter)',
    color: '#000000',
    fg: '#ffffff',
    monogram: 'X',
    shareUrl: (text) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    fg: '#ffffff',
    monogram: 'f',
    shareUrl: (text) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#bc1888',
    fg: '#ffffff',
    monogram: 'IG',
    shareUrl: () => `https://instagram.com`,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    color: '#000000',
    fg: '#ffffff',
    monogram: 'TT',
    shareUrl: () => `https://tiktok.com/upload`,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    fg: '#ffffff',
    monogram: 'YT',
    shareUrl: () => `https://studio.youtube.com`,
  },
];

const HASHTAG_SUGGESTIONS = [
  '#OfferHound', '#Recruiting', '#CollegeAthletics', '#NextLevel',
  '#Committed', '#Highlights', '#GameDay', '#TrainHard',
];

interface SocialPostComposerProps {
  defaultText?: string;
  profileUrl?: string;
  mediaUrl?: string;
  style?: any;
  /** When false, skip the outer Card chrome (for embedding inside SyndicationCenter). */
  bare?: boolean;
}

export function SocialPostComposer({
  defaultText = '',
  profileUrl,
  mediaUrl,
  style,
  bare,
}: SocialPostComposerProps) {
  const [postText, setPostText] = useState(defaultText);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fullText = [postText, profileUrl ? `\n\n🔗 ${profileUrl}` : ''].join('');

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const addHashtag = (tag: string) => {
    if (!postText.includes(tag)) {
      setPostText((prev) => (prev ? prev + ' ' + tag : tag));
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(fullText);
    setCopied(true);
    toast.success('Post copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePost = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform');
      return;
    }
    await Clipboard.setStringAsync(fullText);
    for (const platformKey of selectedPlatforms) {
      const platform = PLATFORMS.find((p) => p.key === platformKey);
      if (platform) {
        const url = platform.shareUrl(fullText);
        try {
          await Linking.openURL(url);
        } catch {
          /* skip platforms not installed or blocked */
        }
      }
    }
    toast.success(
      `Post copied! Opening ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}...`,
    );
  };

  const body = (
    <>
      {/* Post text */}
      <View style={{ gap: spacing.xs }}>
        <Label>What's on your mind?</Label>
        <Textarea
          value={postText}
          onChangeText={setPostText}
          placeholder="Share your latest accomplishment, highlight reel, or training update..."
          rows={4}
        />
        <View style={s.row}>
          <Text style={s.metaText}>{fullText.length} characters</Text>
          {mediaUrl ? (
            <Badge variant="secondary">
              <View style={s.badgeRow}>
                <ImageIcon size={12} color={colors.foreground} />
                <Text style={s.badgeText}>Media attached</Text>
              </View>
            </Badge>
          ) : null}
        </View>
      </View>

      {/* Hashtag suggestions */}
      <View style={{ gap: spacing.xs }}>
        <View style={s.labelRow}>
          <Hash size={14} color={colors.foreground} />
          <Label>Suggested Hashtags</Label>
        </View>
        <View style={s.tagWrap}>
          {HASHTAG_SUGGESTIONS.map((tag) => {
            const active = postText.includes(tag);
            return (
              <Pressable key={tag} onPress={() => addHashtag(tag)}>
                <Badge variant={active ? 'default' : 'outline'}>
                  <Text style={[s.tagText, active && s.tagTextActive]}>{tag}</Text>
                </Badge>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Platforms */}
      <View style={{ gap: spacing.xs }}>
        <Label>Post to</Label>
        <View style={s.platformWrap}>
          {PLATFORMS.map((p) => {
            const isSelected = selectedPlatforms.includes(p.key);
            return (
              <Pressable
                key={p.key}
                onPress={() => togglePlatform(p.key)}
                style={[
                  s.platformBtn,
                  isSelected
                    ? { backgroundColor: p.color, borderColor: p.color }
                    : { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <View style={[s.monogramPill, { backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'transparent' }]}>
                  <Text style={[s.monogram, { color: isSelected ? p.fg : colors.mutedForeground }]}>{p.monogram}</Text>
                </View>
                <Text
                  style={[
                    s.platformText,
                    { color: isSelected ? p.fg : colors.mutedForeground },
                  ]}
                >
                  {p.label}
                </Text>
                {isSelected ? <Check size={12} color={p.fg} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Preview */}
      {postText ? (
        <View style={s.preview}>
          <Text style={s.previewLabel}>Preview</Text>
          <Text style={s.previewText}>{fullText}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={s.actions}>
        <Button
          variant="outline"
          onPress={handleCopy}
          style={{ flex: 1 }}
          leftIcon={copied ? <Check size={16} color={colors.foreground} /> : <Copy size={16} color={colors.foreground} />}
        >
          {copied ? 'Copied!' : 'Copy Text'}
        </Button>
        <Button
          onPress={handlePost}
          disabled={!postText || selectedPlatforms.length === 0}
          style={{ flex: 1 }}
          leftIcon={<ExternalLink size={16} color={colors.primaryForeground} />}
        >
          Post to {selectedPlatforms.length || ''} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
        </Button>
      </View>
      <Text style={s.footer}>
        Text will be copied to your clipboard, then each platform will open so you can paste and post.
      </Text>
    </>
  );

  const content = bare ? (
    <View style={[{ gap: spacing.md }, style]}>{body}</View>
  ) : (
    <Card style={style}>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Send size={20} color={colors.primary} />
            <Text style={s.titleText}>Social Media Post</Text>
          </View>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <View style={{ gap: spacing.md }}>{body}</View>
      </CardContent>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

export default SocialPostComposer;

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.xs, color: colors.foreground },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.xs, color: colors.foreground },
  tagTextActive: { color: colors.primaryForeground },
  platformWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  platformBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1,
  },
  platformText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm },
  monogramPill: { minWidth: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingHorizontal: 2 },
  monogram: { fontFamily: typography.fontFamily.bodyBold, fontSize: 12 },
  preview: {
    backgroundColor: colors.muted, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  previewLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  previewText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  footer: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center' },
});
