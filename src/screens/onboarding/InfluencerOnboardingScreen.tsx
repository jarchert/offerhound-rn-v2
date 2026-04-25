// InfluencerOnboardingScreen — RN port of Lovable src/pages/InfluencerOnboarding.tsx (244 LOC).
// Single-page form (4 cards) → inserts influencer_profiles + influencer_social_links.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle, Sparkles, Globe, Music2, Webhook, Languages, Building2, Video as Youtube, Camera as Instagram, MessageCircle as Twitter, Users as Facebook } from 'lucide-react-native';

import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';
import type { OnboardingStackParamList } from '@/navigation/stacks/OnboardingStack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList & RootStackParamList>;

const BRAND_TYPES = [
  { value: 'media', label: 'Media / Publication' },
  { value: 'analyst', label: 'Analyst / Commentator' },
  { value: 'educator', label: 'Sports Educator' },
  { value: 'promoter', label: 'Sports Promoter / Brand' },
  { value: 'podcaster', label: 'Podcaster' },
  { value: 'blogger', label: 'Blogger / Journalist' },
  { value: 'other', label: 'Other' },
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC',
];

const SOCIAL = [
  { key: 'instagram', Icon: Instagram, label: 'Instagram', placeholder: '@handle or URL' },
  { key: 'x', Icon: Twitter, label: 'X / Twitter', placeholder: '@handle or URL' },
  { key: 'tiktok', Icon: Music2, label: 'TikTok', placeholder: '@handle or URL' },
  { key: 'facebook', Icon: Facebook, label: 'Facebook Page', placeholder: 'Page or URL' },
  { key: 'youtube', Icon: Youtube, label: 'YouTube', placeholder: '@channel or URL' },
] as const;

const slug = (str: string) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export default function InfluencerOnboardingScreen() {
  const nav = useNavigation<Nav>();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const [form, setForm] = useState({
    display_name: '', handle: '', bio: '', brand_type: 'media',
    organization: '', region_city: '', region_state: '',
    // PORT-PENDING: detect device timezone via expo-localization. Default to ET for now.
    timezone: 'America/New_York',
    languages: 'English', website: '', syndication_webhook_url: '',
    social_instagram: '', social_x: '', social_tiktok: '', social_facebook: '', social_youtube: '',
  });

  const update = (k: string, v: string) =>
    setForm(f => ({ ...f, [k]: v, ...(k === 'display_name' && !f.handle ? { handle: slug(v) } : {}) }));

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav.navigate('Auth' as any); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('influencer_profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) nav.navigate('InfluencerTabs' as any);
      else setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, nav]);

  const normalize = (platform: string, raw: string): string | null => {
    const v = (raw || '').trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    const h = v.replace(/^@/, '');
    const map: Record<string, string> = {
      instagram: `https://instagram.com/${h}`,
      x: `https://x.com/${h}`,
      tiktok: `https://tiktok.com/@${h}`,
      facebook: `https://facebook.com/${h}`,
      youtube: `https://youtube.com/@${h}`,
    };
    return map[platform] || v;
  };

  const submit = async () => {
    if (!user) { toast({ title: 'Please sign in first', variant: 'destructive' }); return; }
    if (!form.display_name.trim() || !form.bio.trim()) {
      toast({ title: 'Required', description: 'Display name and bio are required', variant: 'destructive' });
      return;
    }
    const handle = (form.handle || slug(form.display_name)).trim();
    if (!handle) { toast({ title: 'Required', description: 'Please choose a unique handle', variant: 'destructive' }); return; }

    setLoading(true);
    try {
      const tags: string[] = [];
      if (form.organization.trim()) tags.push(`org:${form.organization.trim()}`);
      if (form.timezone) tags.push(`tz:${form.timezone}`);
      if (form.languages) tags.push(`lang:${form.languages}`);
      if (form.website.trim()) tags.push(`site:${form.website.trim()}`);

      const { error } = await supabase.from('influencer_profiles' as any).insert({
        user_id: user.id,
        display_name: form.display_name.trim(),
        handle,
        bio: form.bio.trim(),
        primary_sport: 'general',
        affiliation_type: form.brand_type,
        region_city: form.region_city || null,
        region_state: form.region_state || null,
        content_tags: tags,
        syndication_webhook_url: form.syndication_webhook_url.trim() || null,
        syndication_enabled: !!form.syndication_webhook_url.trim(),
      });
      if (error) {
        if ((error as any).code === '23505') throw new Error('That handle is already taken — please choose another.');
        throw error;
      }
      const { data: created } = await supabase
        .from('influencer_profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const id = (created as any)?.id;
      if (id) {
        const links = SOCIAL
          .map(p => ({ platform: p.key, url: normalize(p.key, (form as any)[`social_${p.key}`]) }))
          .filter(l => !!l.url)
          .map(l => ({ influencer_id: id, platform: l.platform, profile_url: l.url as string }));
        if (links.length) await supabase.from('influencer_social_links' as any).insert(links);
      }
      toast({ title: 'Creator profile created — welcome!' });
      nav.navigate('InfluencerTabs' as any);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to create profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checking) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />
        <Text style={s.h1}>CREATOR SETUP</Text>
        <Text style={s.sub}>Set up your sports content creator account in 2 minutes.</Text>

        <Card style={s.banner}>
          <CardContent style={s.bannerContent}>
            <Sparkles size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={s.bannerTitle}>Free for Creators</Text>
                <Badge variant="secondary">No credit card</Badge>
              </View>
              <Text style={s.bannerSub}>Compose, schedule, and syndicate sports content from one dashboard.</Text>
            </View>
          </CardContent>
        </Card>

        {/* Brand basics */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Basics</CardTitle>
            <CardDescription>How you appear across the platform.</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.md }}>
            <View><Label>Display Name *</Label><Input value={form.display_name} onChangeText={v => update('display_name', v)} placeholder="e.g. Coach Cam Daily" /></View>
            <View><Label>Handle *</Label><Input value={form.handle} onChangeText={v => update('handle', slug(v))} placeholder="coach-cam-daily" autoCapitalize="none" /></View>
            <View>
              <Label>Brand Type *</Label>
              <Select value={form.brand_type} onValueChange={v => update('brand_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BRAND_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </View>
            <View>
              <View style={s.iconLabelRow}><Building2 size={14} color={colors.foreground} /><Label>Organization</Label></View>
              <Input value={form.organization} onChangeText={v => update('organization', v)} placeholder="Optional — your media outlet, brand, or company" />
            </View>
            <View><Label>Bio *</Label><Textarea value={form.bio} onChangeText={v => update('bio', v)} placeholder="Who you are, what you cover, who's your audience." /></View>
          </CardContent>
        </Card>

        {/* Locale & workflow */}
        <Card>
          <CardHeader>
            <CardTitle>Locale & Workflow</CardTitle>
            <CardDescription>Used for scheduling and audience defaults.</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.md }}>
            <View><Label>City</Label><Input value={form.region_city} onChangeText={v => update('region_city', v)} /></View>
            <View><Label>State</Label><Input value={form.region_state} onChangeText={v => update('region_state', v)} /></View>
            <View>
              <Label>Time Zone</Label>
              <Select value={form.timezone} onValueChange={v => update('timezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </View>
            <View>
              <View style={s.iconLabelRow}><Languages size={14} color={colors.foreground} /><Label>Languages</Label></View>
              <Input value={form.languages} onChangeText={v => update('languages', v)} placeholder="English, Spanish" />
            </View>
            <View>
              <View style={s.iconLabelRow}><Globe size={14} color={colors.foreground} /><Label>Website</Label></View>
              <Input value={form.website} onChangeText={v => update('website', v)} placeholder="https://yoursite.com" autoCapitalize="none" />
            </View>
          </CardContent>
        </Card>

        {/* Connected channels */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Channels</CardTitle>
            <CardDescription>All optional. Linked on your public profile.</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.md }}>
            {SOCIAL.map(p => {
              const Icon = p.Icon;
              return (
                <View key={p.key}>
                  <View style={s.iconLabelRow}><Icon size={14} color={colors.foreground} /><Label>{p.label}</Label></View>
                  <Input
                    value={(form as any)[`social_${p.key}`]}
                    onChangeText={v => update(`social_${p.key}`, v)}
                    placeholder={p.placeholder}
                    autoCapitalize="none"
                  />
                </View>
              );
            })}
          </CardContent>
        </Card>

        {/* Syndication */}
        <Card>
          <CardHeader>
            <View style={s.iconLabelRow}><Webhook size={20} color={colors.primary} /><CardTitle>Auto-Syndication</CardTitle></View>
            <CardDescription>Optional. Paste a Zapier or Make webhook URL to fan out posts automatically.</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: spacing.sm }}>
            <Label>Webhook URL</Label>
            <Input value={form.syndication_webhook_url} onChangeText={v => update('syndication_webhook_url', v)} placeholder="https://hooks.zapier.com/…" autoCapitalize="none" />
            <Text style={s.helperFine}>Each new post can fire this webhook so Zapier/Make can push it to X, LinkedIn, Discord, etc.</Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ paddingTop: spacing.lg }}>
            <Button
              onPress={submit}
              disabled={loading || !form.display_name || !form.bio}
              leftIcon={<CheckCircle size={16} color={colors.primaryForeground} />}
            >
              {loading ? 'Creating…' : 'Create Free Creator Account'}
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading, marginTop: spacing.md },
  sub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground, marginBottom: spacing.md },
  banner: { backgroundColor: 'rgba(231,175,8,0.05)', borderColor: 'rgba(231,175,8,0.20)', borderWidth: 1 },
  bannerContent: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, alignItems: 'flex-start' },
  bannerTitle: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  bannerSub: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 4 },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  helperFine: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
