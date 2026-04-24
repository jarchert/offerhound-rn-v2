// Ported verbatim from Lovable src/components/SocialLinksManager.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - useToast (shadcn) → @/hooks/use-toast (compat shim)
//   - <a href target="_blank"> → Pressable + Linking.openURL
//   - navigator.clipboard → expo-clipboard
//   - navigator.share → expo-sharing (with copy fallback)
//   - window.location.origin → Constants.expoConfig?.extra?.webBaseUrl (GAP: stubbed; RN has no window)
//   - QRCodeSVG (qrcode.react) → not rendered (GAP: react-native-qrcode-svg not installed; matches AdminInvitationCards)
//   - useRef<HTMLDivElement> → useRef<View> (capture target ref handed to CardShareActions)
//   - Loader2 spin via animate-spin → ActivityIndicator
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
  ScrollView,
  ViewStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { Share2, Globe, ExternalLink } from 'lucide-react-native';
import { ProfileCardGenerator } from '@/components/ProfileCardGenerator';
import { CardShareActions } from '@/components/CardShareActions';
import { colors, typography, spacing } from '@/lib/theme';

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', prefix: 'https://instagram.com/' },
  { key: 'facebook', label: 'Facebook', prefix: 'https://facebook.com/' },
  { key: 'x', label: 'X (Twitter)', prefix: 'https://x.com/' },
  { key: 'tiktok', label: 'TikTok', prefix: 'https://tiktok.com/@' },
  { key: 'youtube', label: 'YouTube', prefix: 'https://youtube.com/@' },
  { key: 'snapchat', label: 'Snapchat', prefix: 'https://snapchat.com/add/' },
  { key: 'linkedin', label: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
  { key: 'threads', label: 'Threads', prefix: 'https://threads.net/@' },
  { key: 'discord', label: 'Discord', prefix: 'https://discord.com/users/' },
  { key: 'twitch', label: 'Twitch', prefix: 'https://twitch.tv/' },
  { key: 'hudl', label: 'Hudl', prefix: 'https://hudl.com/' },
  { key: 'maxpreps', label: 'MaxPreps', prefix: 'https://maxpreps.com/' },
  { key: '247sports', label: '247Sports', prefix: 'https://247sports.com/player/' },
  { key: 'rivals', label: 'Rivals', prefix: 'https://rivals.com/' },
  { key: 'on3', label: 'On3', prefix: 'https://on3.com/db/' },
  { key: 'athleticnet', label: 'Athletic.net', prefix: 'https://athletic.net/' },
  { key: 'milesplit', label: 'MileSplit', prefix: 'https://milesplit.com/' },
  { key: 'trackingfootball', label: 'Tracking Football', prefix: 'https://trackingfootball.com/' },
  { key: 'ncsa', label: 'NCSA', prefix: 'https://ncsasports.org/' },
  { key: 'fieldlevel', label: 'FieldLevel', prefix: 'https://fieldlevel.com/' },
  { key: 'berecruited', label: 'BeRecruited', prefix: 'https://berecruited.com/' },
  { key: 'website', label: 'Personal Website', prefix: 'https://' },
];

export type SocialLinksRole = 'athlete' | 'coach' | 'scout';

interface SocialLinksManagerProps {
  role: SocialLinksRole;
  profileName?: string;
  profileImageUrl?: string | null;
  profileUrl?: string;
  /** Pre-loaded social_links from the profile query */
  initialLinks?: Record<string, string>;
}

// GAP: RN has no window.location.origin. Pull a base URL from app config when available.
const WEB_BASE_URL: string =
  (Constants.expoConfig?.extra as any)?.webBaseUrl || 'https://offerhound.app';

export function SocialLinksManager({
  role,
  profileName,
  profileImageUrl,
  profileUrl,
  initialLinks,
}: SocialLinksManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>(initialLinks || {});
  const [showQR, setShowQR] = useState(false);
  const [showFullCard, setShowFullCard] = useState(role === 'athlete');
  const cardCaptureRef = useRef<View>(null);

  useEffect(() => {
    if (initialLinks) setLinks(initialLinks);
  }, [initialLinks]);

  const tableName =
    role === 'athlete' ? 'player_profiles' : role === 'coach' ? 'coach_profiles' : 'scout_profiles';
  const shareUrl = profileUrl || `${WEB_BASE_URL}/dashboard`;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const filtered = Object.fromEntries(
        Object.entries(links).filter(([, v]) => v.trim()),
      );
      const { error } = await supabase
        .from(tableName as any)
        .update({ social_links: filtered } as any)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      setEditing(false);
      toast({ title: 'Social Links Saved' });
    },
    onError: (err: any) =>
      toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const copyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    toast({ title: 'Link Copied!' });
  };

  const shareProfile = async () => {
    // GAP: navigator.share has no direct RN equivalent. Use expo-sharing when available;
    // fall back to copying the link to the clipboard.
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        // expo-sharing only shares files, not URLs — so we copy the URL and surface the sheet
        // for any installed image/text targets is not viable. Fall back to clipboard for parity.
        await copyLink();
      } else {
        await copyLink();
      }
    } catch {
      /* user cancelled */
    }
  };

  const openLink = (value: string) => {
    const url = value.startsWith('http') ? value : `https://${value}`;
    Linking.openURL(url).catch(() => toast({ title: 'Could not open link', variant: 'destructive' }));
  };

  const activeLinks = Object.entries(links).filter(([, v]) => v);
  const displayName = profileName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <View style={s.root}>
      <View>
        <View style={s.headingRow}>
          <Globe size={20} color={colors.foreground} />
          <Text style={s.heading}>Social & Sharing</Text>
        </View>
        <Text style={s.subheading}>Connect social platforms and share your profile</Text>
      </View>

      <View style={s.grid}>
        {/* Social Links Editor */}
        <Card>
          <CardHeader>
            <View style={s.headerRow}>
              <CardTitle style={s.cardTitleBase}>Social Platforms</CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onPress={() => setEditing(true)}>
                  Edit Links
                </Button>
              )}
            </View>
          </CardHeader>
          <CardContent style={s.contentSpacing}>
            {editing ? (
              <>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <View key={platform.key} style={s.fieldGroup}>
                    <Label style={s.fieldLabel}>{platform.label}</Label>
                    <Input
                      value={links[platform.key] || ''}
                      onChangeText={(text) => setLinks({ ...links, [platform.key]: text })}
                      placeholder={platform.prefix}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={s.fieldInput}
                    />
                  </View>
                ))}
                <View style={s.actionRow}>
                  <Button
                    size="sm"
                    onPress={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    leftIcon={
                      saveMutation.isPending ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : undefined
                    }
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onPress={() => setEditing(false)}>
                    Cancel
                  </Button>
                </View>
              </>
            ) : (
              <>
                {activeLinks.length === 0 ? (
                  <Text style={s.emptyText}>No social links configured yet</Text>
                ) : (
                  activeLinks.map(([key, value]) => {
                    const platform = SOCIAL_PLATFORMS.find((p) => p.key === key);
                    return (
                      <Pressable
                        key={key}
                        onPress={() => openLink(value)}
                        style={({ pressed }) => [s.linkRow, pressed && s.linkRowPressed]}
                      >
                        <Badge variant="secondary">{platform?.label || key}</Badge>
                        <Text style={s.linkValue} numberOfLines={1}>
                          {value}
                        </Text>
                        <ExternalLink size={12} color={colors.mutedForeground} />
                      </Pressable>
                    );
                  })
                )}
              </>
            )}
          </CardContent>
        </Card>
      </View>

      {role === 'athlete' && (
        <Card>
          <CardHeader>
            <View style={s.cardSplitRow}>
              <View style={s.flexShrink}>
                <View style={s.headingRow}>
                  <Share2 size={16} color={colors.foreground} />
                  <CardTitle style={s.cardTitleBase}>Shareable Athlete Card</CardTitle>
                </View>
                <Text style={s.cardHelpText}>
                  Download or send your full OfferHound™ player card via email or SMS.
                </Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={() => setShowFullCard((v) => !v)}
              >
                {showFullCard ? 'Hide Card' : 'Show Card'}
              </Button>
            </View>
          </CardHeader>
          {showFullCard && (
            <CardContent style={s.contentSpacingLg}>
              <View ref={cardCaptureRef} style={s.cardCapture}>
                <ProfileCardGenerator />
              </View>
              <CardShareActions
                targetRef={cardCaptureRef}
                senderName={displayName}
                fileBaseName={`${displayName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()}-offerhound-card`}
              />
            </CardContent>
          )}
        </Card>
      )}
    </View>
  );
}

export default SocialLinksManager;

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  subheading: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  grid: { gap: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleBase: { fontSize: typography.fontSize.base },
  contentSpacing: { gap: spacing.sm },
  contentSpacingLg: { gap: spacing.md },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: typography.fontSize.xs },
  fieldInput: { fontSize: typography.fontSize.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
  },
  linkRowPressed: { backgroundColor: colors.muted },
  linkValue: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  cardSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  flexShrink: { flexShrink: 1, flexBasis: '60%' as any },
  cardHelpText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  cardCapture: { borderRadius: 8, overflow: 'hidden' },
});
