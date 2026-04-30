// FollowingSettingsScreen — RN port of Lovable web src/pages/FollowingSettings.tsx (112 LOC).
// Lists followed influencers; per-row toggles for content types, channels, and frequency cap.
//
// Translation notes:
// - shadcn AlertDialog → RN Alert.alert confirm.
// - shadcn Select → simple inline Pressable that cycles "none → daily → weekly".
// - useNavigate("/auth?redirect=...") guard handled by AuthGate at navigator level; here we
//   only render a "sign in required" empty state if `user` is missing.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Switch, Pressable, Alert } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { BellOff, UserMinus, CheckCircle } from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
interface FollowedInfluencer {
  id: string;
  influencer_id: string;
  notify_posts: boolean;
  notify_live: boolean;
  notify_announcements: boolean;
  notification_in_app_enabled: boolean;
  notification_push_enabled: boolean;
  notification_email_enabled: boolean;
  frequency_cap: string;
  influencer: {
    id: string;
    display_name: string;
    handle: string;
    profile_image_url: string | null;
    primary_sport: string;
    verification_status: string;
  };
}

const FREQ_CYCLE = ['none', 'daily', 'weekly'] as const;
const FREQ_LABEL: Record<string, string> = { none: 'No Limit', daily: 'Daily', weekly: 'Weekly' };

export default function FollowingSettingsScreen() {
  const nav = useNavigation<NavigationProp<any>>();
  const { user, isLoading: authLoading } = useAuth();
  const [following, setFollowing] = useState<FollowedInfluencer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('influencer_follows')
          .select(
            'id, influencer_id, notify_posts, notify_live, notify_announcements, notification_in_app_enabled, notification_push_enabled, notification_email_enabled, frequency_cap, influencer:influencer_profiles!influencer_id (id, display_name, handle, profile_image_url, primary_sport, verification_status)',
          )
          .eq('follower_user_id', user.id)
          .eq('is_following', true);
        if (error) throw error;
        if (!cancelled) setFollowing(data as unknown as FollowedInfluencer[]);
      } catch (err) {
        console.error('[FollowingSettings] load failed', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePref = async (id: string, field: string, value: boolean | string) => {
    setSavingId(id);
    try {
      await supabase.from('influencer_follows').update({ [field]: value }).eq('id', id);
      setFollowing((prev) => prev.map((f) => (f.id === id ? ({ ...f, [field]: value } as FollowedInfluencer) : f)));
    } catch (err) {
      console.error('[FollowingSettings] update failed', err);
    } finally {
      setSavingId(null);
    }
  };

  const cycleFrequency = (f: FollowedInfluencer) => {
    const idx = FREQ_CYCLE.indexOf(f.frequency_cap as (typeof FREQ_CYCLE)[number]);
    const next = FREQ_CYCLE[(idx + 1) % FREQ_CYCLE.length];
    updatePref(f.id, 'frequency_cap', next);
  };

  const confirmUnfollow = (target: FollowedInfluencer) => {
    Alert.alert(
      `Unfollow ${target.influencer.display_name}?`,
      'You will no longer receive updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('influencer_follows').update({ is_following: false }).eq('id', target.id);
            setFollowing((prev) => prev.filter((f) => f.id !== target.id));
          },
        },
      ],
    );
  };

  if (authLoading || isLoading) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <View style={s.headingBlock}>
          <Text style={s.h1}>Following</Text>
          <Text style={s.subtitle}>Manage your followed influencers and notification preferences.</Text>
        </View>

        {following.length === 0 ? (
          <Card>
            <CardContent style={s.emptyContent}>
              <BellOff size={48} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No Influencers Followed</Text>
              <Text style={s.emptyBody}>Start following influencers to get updates.</Text>
              <Pressable style={s.primaryBtn} onPress={() => nav.navigate('InfluencerBoard' as any)}>
                <Text style={s.primaryBtnText}>Browse Influencers</Text>
              </Pressable>
            </CardContent>
          </Card>
        ) : (
          following.map((f) => (
            <Card key={f.id}>
              <CardHeader>
                <View style={s.rowBetween}>
                  <View style={s.identityRow}>
                    <Avatar source={f.influencer.profile_image_url ? { uri: f.influencer.profile_image_url } : null} fallback={f.influencer.display_name.slice(0, 2)} size={48} />
                    <View>
                      <View style={s.row}>
                        <Text style={s.name}>{f.influencer.display_name}</Text>
                        {f.influencer.verification_status === 'verified' && <CheckCircle size={16} color={colors.primary} />}
                      </View>
                      <Text style={s.handle}>
                        @{f.influencer.handle} · {f.influencer.primary_sport}
                      </Text>
                    </View>
                  </View>
                  <Pressable style={s.unfollowBtn} onPress={() => confirmUnfollow(f)}>
                    <UserMinus size={16} color={colors.destructive} />
                    <Text style={s.unfollowText}>Unfollow</Text>
                  </Pressable>
                </View>
              </CardHeader>
              <CardContent style={s.cardBody}>
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Notify me about:</Text>
                  {([
                    ['notify_posts', 'Posts'],
                    ['notify_live', 'Live'],
                    ['notify_announcements', 'Announcements'],
                  ] as const).map(([k, l]) => (
                    <View key={k} style={s.toggleRow}>
                      <Text style={s.toggleLabel}>{l}</Text>
                      <Switch
                        value={(f as any)[k]}
                        onValueChange={(v) => updatePref(f.id, k, v)}
                        disabled={savingId === f.id}
                        trackColor={{ true: colors.primary, false: colors.border }}
                      />
                    </View>
                  ))}
                </View>
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Channels:</Text>
                  {([
                    ['notification_in_app_enabled', 'In-App'],
                    ['notification_push_enabled', 'Push'],
                    ['notification_email_enabled', 'Email'],
                  ] as const).map(([k, l]) => (
                    <View key={k} style={s.toggleRow}>
                      <Text style={s.toggleLabel}>{l}</Text>
                      <Switch
                        value={(f as any)[k]}
                        onValueChange={(v) => updatePref(f.id, k, v)}
                        disabled={savingId === f.id}
                        trackColor={{ true: colors.primary, false: colors.border }}
                      />
                    </View>
                  ))}
                </View>
                <View style={s.frequencyRow}>
                  <Text style={s.toggleLabel}>Frequency</Text>
                  <Pressable style={s.freqBtn} onPress={() => cycleFrequency(f)} disabled={savingId === f.id}>
                    <Text style={s.freqBtnText}>{FREQ_LABEL[f.frequency_cap] || f.frequency_cap}</Text>
                  </Pressable>
                </View>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headingBlock: { gap: 4, marginTop: spacing.sm },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground },
  emptyContent: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  emptyBody: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.base },
  handle: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  unfollowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  unfollowText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.destructive, fontSize: typography.fontSize.sm },
  cardBody: { gap: spacing.md },
  section: { gap: spacing.xs },
  sectionLabel: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  toggleLabel: { fontFamily: typography.fontFamily.body, color: colors.foreground, fontSize: typography.fontSize.sm },
  frequencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  freqBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  freqBtnText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.sm },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.sm },
  primaryBtnText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primaryForeground, fontSize: typography.fontSize.base },
});
