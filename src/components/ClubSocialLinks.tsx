// RN port of Lovable src/components/ClubSocialLinks.tsx
// - lucide-react           → lucide-react-native
// - shadcn Card/Button/Input/Label/Badge → @/components/ui/* (PascalCase RN)
// - useToast               → @/hooks/use-toast (RN compat shim)
// - QRCodeSVG (qrcode.react) → react-native-qrcode-svg (SVG-based, same visual)
// - window.location.origin → Linking.createURL (expo-linking) for deep link
// - navigator.clipboard    → expo-clipboard
// - navigator.share        → React Native Share API
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Share, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { Share2, QrCode, Globe, Copy, ExternalLink } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { SocialSyndicationCenter } from '@/components/SocialSyndicationCenter';
import { colors, typography, spacing, radius } from '@/lib/theme';

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', prefix: 'https://instagram.com/' },
  { key: 'facebook', label: 'Facebook', prefix: 'https://facebook.com/' },
  { key: 'x', label: 'X (Twitter)', prefix: 'https://x.com/' },
  { key: 'tiktok', label: 'TikTok', prefix: 'https://tiktok.com/@' },
  { key: 'youtube', label: 'YouTube', prefix: 'https://youtube.com/@' },
  { key: 'hudl', label: 'Hudl', prefix: 'https://hudl.com/' },
  { key: 'maxpreps', label: 'MaxPreps', prefix: 'https://maxpreps.com/' },
];

export function ClubSocialLinks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [showQR, setShowQR] = useState(false);

  const { data: clubProfile } = useQuery({
    queryKey: ['club-social-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('club_coach_profiles')
        .select('id, club_name, sport, social_links, club_logo_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.social_links) setLinks(data.social_links as Record<string, string>);
      return data;
    },
    enabled: !!user,
  });

  // coachProfile fetched for parity with web (name/image_url may be consumed by
  // syndication downstream); left as side-effect query to match behavior exactly.
  useQuery({
    queryKey: ['club-social-coach', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('coach_profiles')
        .select('id, name, image_url')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clubProfile) throw new Error('No profile');
      const filtered = Object.fromEntries(Object.entries(links).filter(([, v]) => v.trim()));
      const { error } = await supabase
        .from('club_coach_profiles')
        .update({ social_links: filtered })
        .eq('id', clubProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-social-profile'] });
      setEditing(false);
      toast({ title: 'Social Links Saved' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // RN equivalent of `${window.location.origin}/coach/dashboard` — use Expo deep link URL.
  // Path is '/coach' (not '/coach/dashboard'): RN linking.ts registers the coach
  // dashboard as `DashboardTab: 'coach'`, so a recipient tapping this custom-scheme
  // link (offerhoundv2:///coach) lands on the coach dashboard tab. Using
  // '/coach/dashboard' would 404 inside the RN app itself because that path is
  // not registered.
  const profileUrl = Linking.createURL('/coach');

  const copyLink = async () => {
    await Clipboard.setStringAsync(profileUrl);
    toast({ title: 'Link Copied!' });
  };

  const shareProfile = async () => {
    try {
      await Share.share({
        title: `${clubProfile?.club_name || 'Coach'} - OfferHound`,
        message: profileUrl,
        url: profileUrl,
      });
    } catch {
      // user cancelled or unsupported — fall back to clipboard
      await copyLink();
    }
  };

  const visibleLinks = Object.entries(links).filter(([, v]) => v);

  return (
    <ScrollView contentContainerStyle={s.root}>
      <View>
        <View style={s.titleRow}>
          <Globe size={20} color={colors.foreground} />
          <Text style={s.title}>Social & Sharing</Text>
        </View>
        <Text style={s.subtitle}>Connect social platforms and share your Coach Card</Text>
      </View>

      <View style={s.grid}>
        {/* Quick share actions */}
        <View style={s.actionsRow}>
          <Button size="sm" variant="outline" onPress={shareProfile} leftIcon={<Share2 size={12} color={colors.foreground} />}>
            Share
          </Button>
          <Button size="sm" variant="outline" onPress={copyLink} leftIcon={<Copy size={12} color={colors.foreground} />}>
            Copy Link
          </Button>
          <Button size="sm" variant="outline" onPress={() => setShowQR(!showQR)} leftIcon={<QrCode size={12} color={colors.foreground} />}>
            QR Code
          </Button>
        </View>

        {showQR && (
          <View style={s.qrBox}>
            <QRCode
              value={profileUrl}
              size={200}
              backgroundColor="#ffffff"
              color="#101318"
            />
            <Text style={[s.qrUrl, { marginTop: 8 }]}>{profileUrl}</Text>
          </View>
        )}

        {/* Social Syndication Center */}
        <SocialSyndicationCenter entityName={clubProfile?.club_name} profileUrl={profileUrl} />

        {/* Social Links */}
        <Card>
          <CardHeader>
            <View style={s.headerRow}>
              <CardTitle style={s.cardTitle}>Social Platforms</CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onPress={() => setEditing(true)}>
                  Edit Links
                </Button>
              )}
            </View>
          </CardHeader>
          <CardContent>
            <View style={s.content}>
              {editing ? (
                <>
                  {SOCIAL_PLATFORMS.map(platform => (
                    <View key={platform.key} style={s.field}>
                      <Label style={s.fieldLabel}>{platform.label}</Label>
                      <Input
                        value={links[platform.key] || ''}
                        onChangeText={(text) => setLinks({ ...links, [platform.key]: text })}
                        placeholder={platform.prefix}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  ))}
                  <View style={s.editActions}>
                    <Button size="sm" onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} loading={saveMutation.isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onPress={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  {visibleLinks.length === 0 ? (
                    <Text style={s.empty}>No social links configured yet</Text>
                  ) : (
                    visibleLinks.map(([key, value]) => {
                      const platform = SOCIAL_PLATFORMS.find(p => p.key === key);
                      const href = value.startsWith('http') ? value : `https://${value}`;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => Linking.openURL(href).catch(() => { /* noop */ })}
                          style={({ pressed }) => [s.linkRow, pressed && s.linkRowPressed]}
                        >
                          <Badge variant="secondary">{platform?.label || key}</Badge>
                          <Text style={s.linkValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
                          <ExternalLink size={12} color={colors.mutedForeground} />
                        </Pressable>
                      );
                    })
                  )}
                </>
              )}
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

export default ClubSocialLinks;

const s = StyleSheet.create({
  root: { gap: spacing.lg, padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing?.heading ?? 0.6,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  grid: { gap: spacing.lg },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  qrBox: {
    alignSelf: 'center',
    padding: spacing.md,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    alignItems: 'center',
    minWidth: 200,
  },
  qrPlaceholder: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: '#101318',
    marginBottom: 4,
  },
  qrUrl: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: '#101318',
    textAlign: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: typography.fontSize.base },
  content: { gap: spacing.sm + 4 },
  field: { gap: 4 },
  fieldLabel: { fontSize: typography.fontSize.xs },
  editActions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    padding: spacing.sm + 4,
    borderRadius: radius.lg,
  },
  linkRowPressed: { backgroundColor: colors.muted },
  linkValue: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});
