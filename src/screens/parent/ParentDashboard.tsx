// ParentDashboard — RN port of Lovable src/pages/ParentDashboard.tsx (~563 LOC).
// Inner tabs: Overview (linked athletes), Add (invite by email), Safety, Consent.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl, Pressable } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Shield, Users, UserPlus, AlertTriangle, CheckCircle, Eye, FileText, Mail } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useAthleteProfile } from '@/contexts/AthleteProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Tab = 'overview' | 'add' | 'safety' | 'consent';
type Nav = NavigationProp<RootStackParamList>;

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'add', label: 'Add Athlete', icon: UserPlus },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'consent', label: 'Consent', icon: CheckCircle },
];

export default function ParentDashboard() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { linkedAthletes, selectedAthleteId, selectAthlete } = useAthleteProfile();

  const [tab, setTab] = useState<Tab>('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [consentStatus, setConsentStatus] = useState<{ accepted: boolean; date?: string } | null>(null);

  const fetchConsent = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('coppa_consents' as any)
        .select('accepted_at')
        .eq('parent_user_id', user.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setConsentStatus({ accepted: true, date: (data as any).accepted_at });
      } else {
        setConsentStatus({ accepted: false });
      }
    } catch {
      setConsentStatus({ accepted: false });
    }
  }, [user]);

  useEffect(() => { fetchConsent(); }, [fetchConsent]);

  const handleInvite = async () => {
    if (!user || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { error } = await supabase
        .from('parent_athlete_relationships' as any)
        .insert({
          parent_user_id: user.id,
          invitation_email: inviteEmail.trim(),
          invitation_accepted: false,
        });
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Invitation sent', text2: inviteEmail.trim() });
      setInviteEmail('');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to invite', text2: e?.message });
    } finally {
      setInviting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConsent();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={s.headerRow}>
          <View style={s.iconBubble}><Shield size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <View style={s.titleRow}>
              <Text style={s.title}>Parent View</Text>
              <Badge variant="secondary">
                <Eye size={10} color={colors.secondaryForeground} /> Viewer
              </Badge>
            </View>
            <Text style={s.subtitle}>
              {linkedAthletes.length} linked athlete{linkedAthletes.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.tabBar}>
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <Pressable key={t.id} onPress={() => setTab(t.id)} style={[s.tabBtn, active && s.tabBtnActive]}>
                  <Icon size={14} color={active ? colors.foreground : colors.mutedForeground} />
                  <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {tab === 'overview' && (
          <View style={{ gap: spacing.md }}>
            {linkedAthletes.length === 0 ? (
              <Card style={s.empty}>
                <Users size={28} color={colors.mutedForeground} />
                <Text style={s.emptyTitle}>No linked athletes</Text>
                <Text style={s.emptyText}>Invite your child by email to manage their recruiting profile together.</Text>
                <Button onPress={() => setTab('add')} leftIcon={<UserPlus size={14} color={colors.primaryForeground} />}>
                  Invite athlete
                </Button>
              </Card>
            ) : (
              linkedAthletes.map((a: any) => (
                <Card key={a.id} style={s.athleteCard}>
                  <View style={s.athleteRow}>
                    <Avatar source={a.profile_image_url ? { uri: a.profile_image_url } : null} fallback={a.full_name} size={56} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.athleteName}>{String(a.full_name ?? '')}</Text>
                      {a.position && <Text style={s.athleteMeta}>{String(a.position)}</Text>}
                      {a.school && <Text style={s.athleteMeta}>{String(a.school)}</Text>}
                      {a.is_published ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </View>
                  </View>
                  <View style={s.actions}>
                    <Button
                      variant={selectedAthleteId === a.id ? 'default' : 'outline'}
                      size="sm"
                      onPress={() => selectAthlete(a.id)}>
                      {selectedAthleteId === a.id ? 'Viewing' : 'View profile'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => a.user_id && nav.navigate('Profile', { userId: a.user_id })}>
                      Open
                    </Button>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {tab === 'add' && (
          <Card>
            <CardHeader>
              <CardTitle>Link an athlete</CardTitle>
              <CardDescription>
                Send an invitation to your child\u2019s OfferHound account email. They\u2019ll need to accept it.
              </CardDescription>
            </CardHeader>
            <CardContent style={{ gap: spacing.sm }}>
              <View style={{ gap: spacing.xs }}>
                <Label>Athlete email</Label>
                <Input
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="athlete@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <Button onPress={handleInvite} loading={inviting} disabled={!inviteEmail.trim()}>
                Send invitation
              </Button>
            </CardContent>
          </Card>
        )}

        {tab === 'safety' && (
          <View style={{ gap: spacing.md }}>
            <Card>
              <CardHeader>
                <View style={s.row}>
                  <Shield size={18} color={colors.primary} />
                  <CardTitle>Trust & Safety</CardTitle>
                </View>
                <CardDescription>
                  Review messages, contact attempts, and reported activity for your linked athletes.
                </CardDescription>
              </CardHeader>
              <CardContent style={{ gap: spacing.sm }}>
                <Button
                  variant="outline"
                  onPress={() => nav.navigate('ParentTabs' as any)}
                  leftIcon={<FileText size={14} color={colors.foreground} />}>
                  Open contact log
                </Button>
                <Button
                  variant="outline"
                  onPress={() => nav.navigate('Messages' as any)}
                  leftIcon={<Mail size={14} color={colors.foreground} />}>
                  Review messages
                </Button>
              </CardContent>
            </Card>

            <Card style={s.warnCard}>
              <View style={s.row}>
                <AlertTriangle size={16} color={colors.destructive} />
                <Text style={s.warnTitle}>Suspicious activity?</Text>
              </View>
              <Text style={s.warnText}>
                Report any inappropriate contact to support@offer-hound.com. We respond within 24 hours.
              </Text>
            </Card>
          </View>
        )}

        {tab === 'consent' && (
          <Card>
            <CardHeader>
              <View style={s.row}>
                <CheckCircle size={18} color={consentStatus?.accepted ? (colors.success || '#10b981') : colors.mutedForeground} />
                <CardTitle>COPPA Consent</CardTitle>
              </View>
              <CardDescription>
                Required for athletes under 13. Tracks your acceptance of our minor data policy.
              </CardDescription>
            </CardHeader>
            <CardContent style={{ gap: spacing.sm }}>
              {consentStatus?.accepted ? (
                <View style={s.consentBox}>
                  <Badge variant="success">Accepted</Badge>
                  {consentStatus.date && (
                    <Text style={s.muted}>On {new Date(consentStatus.date).toLocaleDateString()}</Text>
                  )}
                </View>
              ) : (
                <View style={s.consentBox}>
                  <Badge variant="outline">Not on file</Badge>
                  <Text style={s.muted}>
                    Required if any linked athlete is under 13.
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBubble: { padding: spacing.sm, borderRadius: 12, backgroundColor: 'rgba(231,175,8,0.1)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['2xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 2 },
  tabBar: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: colors.muted, borderRadius: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.card },
  tabText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  tabTextActive: { color: colors.foreground },
  athleteCard: { padding: spacing.md, gap: spacing.sm },
  athleteRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  athleteName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  athleteMeta: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  actions: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  empty: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  warnCard: { padding: spacing.md, gap: spacing.xs, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(220,40,40,0.4)', backgroundColor: 'rgba(220,40,40,0.06)' },
  warnTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.destructive },
  warnText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  consentBox: { gap: spacing.xs },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
});
