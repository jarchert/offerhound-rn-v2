/**
 * InfluencerSyndicationSettings — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/InfluencerSyndicationSettings.tsx
 *
 * Translations applied:
 *  - <Card>/<CardHeader>/<CardContent> → RN ui Card primitives
 *  - <Input>/<Label>/<Switch>/<Button> shadcn → RN equivalents
 *    (note: Switch uses `value`/`onValueChange` not `checked`/`onCheckedChange`)
 *  - sonner toast → RN toast wrapper (toast.success / toast.error)
 *  - <a target="_blank"> → Pressable + Linking.openURL
 *  - <strong> → Text with bodySemiBold font family
 *  - lucide-react → lucide-react-native
 *  - tailwind classes → StyleSheet using theme tokens
 *  - fetch() preserved (works in RN; supabase client preserved)
 */
import {useAuth} from '@/hooks/useAuth';
import {useCreatorSyndication} from '@/hooks/useCreatorSyndication';
import {saveCreatorSyndication} from '@/lib/creatorSyndication';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Webhook, ExternalLink, Send } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface InfluencerSyndicationSettingsProps {
  influencerId: string;
  initialUrl?: string | null;
  initialEnabled?: boolean;
  onSaved?: () => void;
}

export function InfluencerSyndicationSettings({
  influencerId,
  initialUrl,
  initialEnabled,
  onSaved,
}: InfluencerSyndicationSettingsProps) {
  const {user}=useAuth();
  const {data: settings, isLoading, isError, refetch}=useCreatorSyndication(influencerId);
  const hydrated=useRef<string|null>(null);
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  useEffect(()=>{if(!isLoading&&!isError&&hydrated.current!==influencerId){hydrated.current=influencerId;setUrl(settings?.webhook_url||'');setEnabled(!!settings?.enabled);}},[influencerId,settings,isLoading,isError]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const save = async () => {
    if (!user || isError || isLoading) return;
    setSaving(true);
    try {await saveCreatorSyndication(supabase,user.id,influencerId,url,enabled);await refetch();toast.success('Syndication settings saved');onSaved?.();}
    catch(error:any){toast.error(error.message || 'Settings save was not confirmed.');}
    finally {setSaving(false);}
  };
  const sendTest = () => toast.error('Test delivery is unavailable in this environment.');
  if (isError) return <Button onPress={() => void refetch()}>Could not load private sharing settings. Retry</Button>;
  if (isLoading) return <Text>Loading private sharing settings…</Text>;

  return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <Webhook size={20} color={colors.primary} />
          <CardTitle>Auto-Syndication Webhook</CardTitle>
        </View>
        <CardDescription>
          Auto-publish your new posts and blog entries to X, LinkedIn, Facebook, Threads, Bluesky and more by
          connecting a <Text style={s.strong}>Zapier</Text> or <Text style={s.strong}>Make.com</Text> webhook.
          We POST a JSON payload for every new piece of content; your Zap decides where it goes.
        </CardDescription>
      </CardHeader>

      <CardContent style={s.content}>
        <View style={s.howtoBox}>
          <Text style={s.howtoTitle}>Quick setup</Text>
          <Text style={s.howtoStep}>1. Create a new Zap (Zapier) or Scenario (Make).</Text>
          <Text style={s.howtoStep}>
            2. Trigger: <Text style={s.strong}>Webhooks → Catch Hook</Text>. Copy the URL.
          </Text>
          <Text style={s.howtoStep}>3. Paste the URL below and toggle on.</Text>
          <Text style={s.howtoStep}>4. Add actions: Post to X, LinkedIn, Buffer, etc.</Text>
          <Pressable
            onPress={() => Linking.openURL('https://zapier.com/apps/webhook/integrations').catch(() => {})}
            style={s.docsLinkRow}
          >
            <Text style={s.docsLinkText}>Zapier Webhook docs</Text>
            <ExternalLink size={12} color={colors.primary} />
          </Pressable>
        </View>

        <View style={s.field}>
          <Label>Webhook URL</Label>
          <Input
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View style={s.toggleRow}>
          <View style={s.toggleText}>
            <Text style={s.toggleTitle}>Auto-fire on new content</Text>
            <Text style={s.toggleHint}>Sends a POST every time you publish a post or blog.</Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>

        <View style={s.actionsRow}>
          <Button onPress={save} disabled={saving} style={s.saveBtn}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            onPress={sendTest}
            disabled={true}
            variant="outline"
            leftIcon={<Send size={16} color={colors.foreground} />}
          >
            Test delivery unavailable
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

export default InfluencerSyndicationSettings;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strong: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground },
  content: { gap: spacing.md },
  howtoBox: {
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    padding: spacing.sm + 4,
    gap: 2,
  },
  howtoTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  howtoStep: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  docsLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  docsLinkText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  field: { gap: 8 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    gap: spacing.md,
  },
  toggleText: { flex: 1, minWidth: 0 },
  toggleTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  toggleHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  actionsRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1 },
});
