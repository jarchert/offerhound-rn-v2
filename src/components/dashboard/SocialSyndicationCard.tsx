// SocialSyndicationCard — RN port of Lovable SocialSyndicationCenter.tsx (connect/manage flavor).
// Connect/disconnect handles for Instagram, X (Twitter), TikTok, YouTube, Facebook.
// Saves to player_profiles.social_links JSON column via usePlayerProfile.updateProfile.
//
// Brand icons: lucide-react-native@1.11 does not export Instagram/Twitter/Youtube/
// Facebook. Codebase pattern for brand marks is @expo/vector-icons FontAwesome6
// (see MediaShareButtons, InfluencerShareButtons, RoleCardGenerator). We wrap
// FontAwesome6 in a small adapter that matches the { size?, color? } prop shape
// used by lucide-react-native so the PLATFORMS table stays consistent.
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Megaphone, Music2, X as XIcon, Check } from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

type PlatformKey = 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'facebook';

interface PlatformDef {
  key: PlatformKey;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  placeholder: string;
}

// FontAwesome6 adapter: match lucide-react-native's { size, color } prop shape.
const brand = (name: string): React.ComponentType<{ size?: number; color?: string }> =>
  ({ size = 18, color = colors.primary }) => (
    <FontAwesome6 name={name as any} size={size} color={color} />
  );

const Instagram = brand('instagram');
const Twitter = brand('x-twitter'); // X (Twitter) — FontAwesome6 brand name
const Youtube = brand('youtube');
const Facebook = brand('facebook');

const PLATFORMS: PlatformDef[] = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram, placeholder: '@yourhandle' },
  { key: 'twitter',   label: 'X (Twitter)', Icon: Twitter,  placeholder: '@yourhandle' },
  { key: 'tiktok',    label: 'TikTok',    Icon: Music2,   placeholder: '@yourhandle' },
  { key: 'youtube',   label: 'YouTube',   Icon: Youtube,  placeholder: 'channel URL or @handle' },
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook, placeholder: 'profile URL or username' },
];

export function SocialSyndicationCard() {
  const { profile, updateProfile } = usePlayerProfile();
  const { toast } = useToast();
  const social: Record<string, string> = useMemo(() => {
    const raw = (profile?.social_links ?? {}) as Record<string, string> | null;
    return raw && typeof raw === 'object' ? raw : {};
  }, [profile?.social_links]);

  const [editing, setEditing] = useState<PlatformKey | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (key: PlatformKey) => {
    setEditing(key);
    setDraft(social[key] || '');
  };

  const persist = async (next: Record<string, string>) => {
    setSaving(true);
    try {
      await updateProfile({ social_links: next });
      toast({ title: 'Social accounts updated' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    const next = { ...social, [editing]: draft.trim() };
    if (!next[editing]) delete next[editing];
    setEditing(null);
    setDraft('');
    await persist(next);
  };

  const handleDisconnect = async (key: PlatformKey) => {
    const next = { ...social };
    delete next[key];
    await persist(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Megaphone size={18} color={colors.primary} />
            <Text style={s.titleText}>Social Syndication</Text>
          </View>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm }}>
        <Text style={s.muted}>
          Connect your social accounts so coaches and parents can follow your highlights and updates.
        </Text>
        {PLATFORMS.map(({ key, label, Icon, placeholder }) => {
          const value = social[key];
          const connected = !!value;
          const isEditing = editing === key;
          return (
            <View key={key} style={s.row}>
              <View style={s.rowLeft}>
                <Icon size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.platformLabel}>{label}</Text>
                  {connected ? (
                    <Text style={s.handleText} numberOfLines={1}>{value}</Text>
                  ) : (
                    <Text style={s.muted}>Not connected</Text>
                  )}
                </View>
                {connected && (
                  <Badge variant="success">
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Check size={10} color="#fff" />
                      <Text style={s.connectedBadge}> Connected</Text>
                    </View>
                  </Badge>
                )}
              </View>

              {isEditing ? (
                <View style={s.editRow}>
                  <Input
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={placeholder}
                    autoCapitalize="none"
                    containerStyle={{ flex: 1 }}
                  />
                  <Button size="sm" onPress={handleSave} loading={saving}>Save</Button>
                  <Button size="sm" variant="ghost" onPress={() => { setEditing(null); setDraft(''); }}
                    leftIcon={<XIcon size={14} color={colors.foreground} />}>{''}</Button>
                </View>
              ) : (
                <View style={s.actionsRow}>
                  <Button size="sm" variant="outline" onPress={() => startEdit(key)}>
                    {connected ? 'Edit' : 'Connect'}
                  </Button>
                  {connected && (
                    <Button size="sm" variant="ghost" onPress={() => handleDisconnect(key)} loading={saving}>
                      Disconnect
                    </Button>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.heading },
  muted: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  row: { gap: spacing.xs, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  platformLabel: { color: colors.foreground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodyMedium },
  handleText: { color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  connectedBadge: { color: '#fff', fontSize: 10 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
});

export default SocialSyndicationCard;
