// ScoutDashboard — full parity port of Lovable web ScoutDashboard.tsx
// Inlines minimal RN versions of ScoutPipeline, ScoutAnalyticsDashboard,
// ScoutQuickStartGuide, and TransferPortalFeed (no new files).
//
// Tabs: Overview, Pipeline, Saved Athletes, Transfer Portal, Analytics, Profile
//
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - useNavigate (react-router) → useNavigation (react-navigation)
//   - <a target="_blank"> → Linking.openURL
//   - useToast → react-native-toast-message
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {
  LayoutDashboard,
  Users,
  Target,
  TrendingUp,
  FileText,
  Search,
  Eye,
  Star,
  User as UserIcon,
  MessageSquare,
  Send,
  Trash2,
  Edit,
  Save,
  ChevronRight,
  Repeat,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Circle,
  X,
  BarChart3,
  Globe,
  Building2,
  Share2,
} from 'lucide-react-native';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useUpdateScoutProfile } from '@/hooks/useUpdateScoutProfile';
import { useScoutSavedAthletes } from '@/hooks/useScoutSavedAthletes';
import { useScoutActivity } from '@/hooks/useScoutActivity';
import { useScoutPipelineStages } from '@/hooks/useScoutPipeline';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { StatTile } from '@/components/StatTile';
import SocialLinksManager from '@/components/SocialLinksManager';

import { colors, typography, spacing } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type InnerTab = 'overview' | 'pipeline' | 'saved' | 'portal' | 'analytics' | 'profile';

const TABS: { key: InnerTab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'pipeline', label: 'Pipeline', icon: Target },
  { key: 'saved', label: 'Saved', icon: Star },
  { key: 'portal', label: 'Portal', icon: Repeat },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'profile', label: 'Profile', icon: UserIcon },
];

export default function ScoutDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useScoutProfile();
  const { data: savedAthletes = [], isLoading: savedLoading, refetch: refetchSaved } =
    useScoutSavedAthletes() as any;
  const { data: activity = [], refetch: refetchActivity } = useScoutActivity(20);
  const updateProfile = useUpdateScoutProfile();

  const [activeTab, setActiveTab] = useState<InnerTab>('overview');
  const [showGuide, setShowGuide] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    organization: '',
    title: '',
    email: '',
    phone: '',
    specializations: '',
    regions: '',
    sports_covered: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setEditForm({
        name: p.name || p.full_name || '',
        organization: p.organization || '',
        title: p.title || '',
        email: p.email || '',
        phone: p.phone || '',
        specializations: Array.isArray(p.specializations)
          ? p.specializations.join(', ')
          : p.specializations || '',
        regions: Array.isArray(p.regions) ? p.regions.join(', ') : p.regions || '',
        sports_covered: Array.isArray(p.sports_covered)
          ? p.sports_covered.join(', ')
          : p.sports_covered || '',
        bio: p.bio || '',
      });
    }
  }, [profile]);

  const scoutName =
    (profile as any)?.name ||
    (profile as any)?.full_name ||
    user?.email?.split('@')[0] ||
    'Scout';

  const stats = useMemo(() => {
    const list = activity as any[];
    return {
      saved: savedAthletes.length,
      profilesViewed: list.filter(a => a.activity_type === 'profile_view').length,
      lettersSent: list.filter(a => a.activity_type === 'letter_sent').length,
      searches: list.filter(a => a.activity_type === 'search_performed').length,
    };
  }, [activity, savedAthletes]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        name: editForm.name,
        organization: editForm.organization,
        title: editForm.title,
        email: editForm.email,
        phone: editForm.phone,
        specializations: editForm.specializations
          .split(',')
          .map(x => x.trim())
          .filter(Boolean),
        regions: editForm.regions
          .split(',')
          .map(x => x.trim())
          .filter(Boolean),
        sports_covered: editForm.sports_covered
          .split(',')
          .map(x => x.trim())
          .filter(Boolean),
        bio: editForm.bio,
      });
      setIsEditingProfile(false);
      Toast.show({ type: 'success', text1: 'Profile updated' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e?.message });
    }
  };

  const goAthlete = (athlete: any) => {
    if (!athlete) return;
    const slug = athlete.custom_url || athlete.id;
    (nav as any).navigate('PublicProfileStack', { screen: 'PublicProfile', params: { slug } });
  };
  const goLetter = (athlete: any) => {
    (nav as any).navigate('LetterComposer', { seed: { athlete } });
  };
  const goMessages = (recipientName?: string) => {
    (nav as any).navigate('Messages', recipientName ? { recipientName } : undefined);
  };
  const goSearchAthletes = () => {
    (nav as any).navigate('PublicTabs', { screen: 'PublicAthletes' });
  };
  const goLetters = () => {
    (nav as any).navigate('ScoutTabs', { screen: 'LettersTab' });
  };
  const goTrends = () => {
    (nav as any).navigate('ScoutTrends');
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={[s.container, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const initials = (scoutName || 'S').slice(0, 2);
  const orgLabel = (profile as any)?.organization;
  const isVerified = (profile as any)?.is_verified || (profile as any)?.verified;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={profileLoading || savedLoading}
            onRefresh={() => {
              refetchProfile();
              refetchSaved();
              refetchActivity();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <Card>
          <CardContent style={{ paddingTop: spacing.md }}>
            <View style={s.headerRow}>
              <Avatar
                size={64}
                source={(profile as any)?.image_url ? { uri: (profile as any).image_url } : undefined}
                fallback={initials}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={s.name}>Welcome, {scoutName}</Text>
                  {isVerified ? <Badge variant="success">Verified</Badge> : null}
                </View>
                <Text style={s.muted}>Your scouting command center</Text>
                {orgLabel ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Building2 size={12} color={colors.mutedForeground} />
                    <Text style={s.muted}>{orgLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={s.quickRow}>
              <Button
                size="sm"
                variant="outline"
                onPress={goSearchAthletes}
                leftIcon={<Search size={14} color={colors.foreground} />}
              >
                Search
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPress={goLetters}
                leftIcon={<FileText size={14} color={colors.foreground} />}
              >
                AI Letters
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPress={goTrends}
                leftIcon={<TrendingUp size={14} color={colors.foreground} />}
              >
                Trends
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        {showGuide && !(profile as any)?.onboarding_complete ? (
          <ScoutQuickStartGuide
            scoutName={scoutName}
            hasOrganization={!!orgLabel}
            onDismiss={() => setShowGuide(false)}
          />
        ) : null}

        {/* Stat Tiles */}
        <View style={s.statsRow}>
          <StatTile label="Saved Athletes" value={stats.saved} icon={Users} />
          <StatTile label="Profiles Viewed" value={stats.profilesViewed} icon={Eye} />
        </View>
        <View style={s.statsRow}>
          <StatTile label="Letters Sent" value={stats.lettersSent} icon={FileText} />
          <StatTile label="Searches" value={stats.searches} icon={Star} />
        </View>

        {/* Inner Tab Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabStrip}
        >
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                style={[s.tab, active && s.tabActive]}
              >
                <Icon size={16} color={active ? colors.primaryForeground : colors.foreground} />
                <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === 'overview' && (
          <OverviewTab
            activity={activity as any[]}
            savedCount={stats.saved}
            onAthletePress={goAthlete}
          />
        )}

        {activeTab === 'pipeline' && <ScoutPipelineInline />}

        {activeTab === 'saved' && (
          <SavedAthletesList
            items={savedAthletes}
            loading={savedLoading}
            onView={goAthlete}
            onMessage={goMessages}
            onLetter={goLetter}
          />
        )}

        {activeTab === 'portal' && <TransferPortalFeedInline sport={(profile as any)?.sports_covered?.[0]} />}

        {activeTab === 'analytics' && <ScoutAnalyticsInline />}

        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            isEditing={isEditingProfile}
            setEditing={setIsEditingProfile}
            editForm={editForm}
            setEditForm={setEditForm}
            onSave={handleSave}
            saving={updateProfile.isPending}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- Overview Tab ----------------------------- */

function OverviewTab({
  activity,
  savedCount,
  onAthletePress,
}: {
  activity: any[];
  savedCount: number;
  onAthletePress: (athlete: any) => void;
}) {
  const recent = activity.slice(0, 5);
  const lockedMessages = activity.filter(a => a.activity_type === 'letter_locked').length;
  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest scouting actions</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          {recent.length === 0 ? (
            <Text style={s.muted}>No recent activity yet.</Text>
          ) : (
            recent.map((a: any) => (
              <Pressable
                key={a.id}
                onPress={() => a.athlete && onAthletePress(a.athlete)}
                style={s.activityRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.activityType}>
                    {String(a.activity_type || 'activity').replace(/_/g, ' ')}
                  </Text>
                  <Text style={s.muted}>
                    {a.athlete?.full_name
                      ? `Athlete: ${a.athlete.full_name}`
                      : a.coach?.name
                        ? `Coach: ${a.coach.name}`
                        : ''}
                  </Text>
                </View>
                <Text style={s.muted}>
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                </Text>
              </Pressable>
            ))
          )}
        </CardContent>
      </Card>

      {lockedMessages > 0 ? (
        <Card style={{ borderColor: colors.primary + '55' }}>
          <CardHeader>
            <CardTitle>Conversion Insight</CardTitle>
            <CardDescription>
              {lockedMessages} locked message{lockedMessages === 1 ? '' : 's'} — upgrade to unlock direct contact
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </View>
  );
}

/* ----------------------------- Pipeline (inline) ----------------------------- */

function ScoutPipelineInline() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: stages = [], isLoading: sl } = useScoutPipelineStages();

  const { data: athletes = [], isLoading: al } = useQuery({
    queryKey: ['scout-pipeline-athletes-detail', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('scout_athlete_pipeline_status' as any)
        .select(
          '*, player_profiles:athlete_profile_id(id, full_name, position, school, profile_image_url, custom_url)',
        )
        .eq('scout_user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const move = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { error } = await supabase
        .from('scout_athlete_pipeline_status' as any)
        .update({ stage_id: stageId })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-pipeline-athletes-detail'] });
      Toast.show({ type: 'success', text1: 'Athlete moved' });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: 'Move failed', text2: e?.message });
    },
  });

  if (sl || al) {
    return (
      <Card>
        <CardContent style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </CardContent>
      </Card>
    );
  }

  if (!stages || stages.length === 0) {
    return (
      <Card>
        <CardContent style={{ paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
          <Users size={28} color={colors.mutedForeground} />
          <Text style={s.cardTitleText}>No Pipeline Stages</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>
            Complete onboarding to set up your scout pipeline.
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {stages.map((stage: any) => {
        const sa = (athletes as any[]).filter((a: any) => a.stage_id === stage.id);
        return (
          <Card key={stage.id}>
            <CardHeader>
              <View style={s.stageHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <View style={[s.stageDot, { backgroundColor: stage.color || colors.primary }]} />
                  <Text style={s.cardTitleText}>{stage.name}</Text>
                </View>
                <Badge variant="secondary">{String(sa.length)}</Badge>
              </View>
            </CardHeader>
            <CardContent style={{ gap: spacing.xs, paddingBottom: spacing.md }}>
              {sa.length === 0 ? (
                <Text style={s.muted}>Empty</Text>
              ) : (
                sa.map((a: any) => {
                  const p = a.player_profiles || {};
                  const otherStages = (stages as any[]).filter((x: any) => x.id !== stage.id);
                  const next = otherStages[0];
                  return (
                    <View key={a.id} style={s.pipelineRow}>
                      <Avatar
                        size={36}
                        source={p.profile_image_url ? { uri: p.profile_image_url } : undefined}
                        fallback={(p.full_name || 'A').slice(0, 2)}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={s.athleteName}>{p.full_name || 'Unknown'}</Text>
                        <Text style={s.muted}>{[p.position, p.school].filter(Boolean).join(' • ')}</Text>
                      </View>
                      {next ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => move.mutate({ id: a.id, stageId: next.id })}
                          rightIcon={<ChevronRight size={12} color={colors.foreground} />}
                        >
                          {next.name}
                        </Button>
                      ) : null}
                    </View>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </View>
  );
}

/* ------------------------- Saved Athletes List ------------------------- */

function SavedAthletesList({
  items,
  loading,
  onView,
  onMessage,
  onLetter,
}: {
  items: any[];
  loading: boolean;
  onView: (a: any) => void;
  onMessage: (name?: string) => void;
  onLetter: (a: any) => void;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_athletes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-saved-athletes'] });
      Toast.show({ type: 'success', text1: 'Athlete removed' });
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: 'Remove failed', text2: e?.message }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Athletes ({items.length})</CardTitle>
        <CardDescription>Your scouting board</CardDescription>
      </CardHeader>
      <CardContent style={{ paddingBottom: spacing.md, gap: spacing.sm }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : items.length === 0 ? (
          <Text style={s.muted}>No saved athletes yet. Use search to find and save athletes.</Text>
        ) : (
          items.map((item: any) => {
            const a = item.athlete || {};
            return (
              <View key={item.id} style={s.athleteRow}>
                <Avatar
                  size={48}
                  source={a.profile_image_url ? { uri: a.profile_image_url } : undefined}
                  fallback={(a.full_name || 'A').slice(0, 2)}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text style={s.athleteName}>{a.full_name || 'Athlete'}</Text>
                    {item.priority ? <Badge variant="outline">{item.priority}</Badge> : null}
                  </View>
                  <Text style={s.muted}>
                    {[a.position, a.school, a.graduation_year].filter(Boolean).join(' • ')}
                  </Text>
                  <View style={s.actionsRow}>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => onView(a)}
                      leftIcon={<Eye size={12} color={colors.foreground} />}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => onMessage(a.full_name)}
                      leftIcon={<MessageSquare size={12} color={colors.foreground} />}
                    >
                      Message
                    </Button>
                    <Button
                      size="sm"
                      onPress={() => onLetter(a)}
                      leftIcon={<Send size={12} color={colors.primaryForeground} />}
                    >
                      Letter
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => remove.mutate(item.id)}
                      leftIcon={<Trash2 size={12} color={colors.destructive} />}
                      textStyle={{ color: colors.destructive }}
                    >
                      Remove
                    </Button>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------ Transfer Portal Feed ------------------------ */

function TransferPortalFeedInline({ sport }: { sport?: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['transfer-portal-news', sport || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('transfer_portal_news' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);
      if (sport) query = query.eq('sport', sport);
      const { data } = await query;
      return (data as any[]) || [];
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke('crawl-recruiting-podcasts', {
        body: sport ? { sport } : {},
      });
      await queryClient.invalidateQueries({ queryKey: ['transfer-portal-news'] });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Refresh failed', text2: e?.message });
    }
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Repeat size={16} color={colors.primary} />
            <Text style={s.cardTitleText}>Transfer Portal Feed</Text>
            {sport ? <Badge variant="outline">{sport}</Badge> : null}
          </View>
          <Button
            size="sm"
            variant="ghost"
            onPress={handleRefresh}
            disabled={refreshing}
            leftIcon={
              refreshing ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <RefreshCw size={14} color={colors.foreground} />
              )
            }
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </View>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        {news.length === 0 ? (
          <Text style={s.muted}>No transfer portal news yet for {sport || 'your sport'}.</Text>
        ) : (
          news.map((item: any) => (
            <Pressable
              key={item.id}
              onPress={() => item.source_url && Linking.openURL(item.source_url)}
              style={s.portalRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.portalTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={s.muted} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={s.muted}>{item.source_name || item.sport}</Text>
                  <Text style={s.muted}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </Text>
                </View>
              </View>
              {item.source_url ? (
                <ExternalLink size={14} color={colors.mutedForeground} />
              ) : null}
            </Pressable>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------- Analytics (inline) --------------------------- */

function ScoutAnalyticsInline() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['scout-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const [pipelineRes, lettersRes, activityRes] = await Promise.all([
        supabase
          .from('scout_athlete_pipeline_status' as any)
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
        supabase
          .from('scout_letter_history' as any)
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
        supabase
          .from('scout_activity_log' as any)
          .select('id', { count: 'exact', head: true })
          .eq('scout_user_id', user.id),
      ]);
      return {
        pipeline: pipelineRes.count || 0,
        letters: lettersRes.count || 0,
        activities: activityRes.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </CardContent>
      </Card>
    );
  }

  const responseRate =
    stats && stats.letters > 0
      ? Math.min(100, Math.round((stats.activities / Math.max(1, stats.letters)) * 25))
      : 0;

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <CardHeader>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <BarChart3 size={16} color={colors.primary} />
            <Text style={s.cardTitleText}>Scout Analytics</Text>
          </View>
        </CardHeader>
        <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          <View style={s.statsRow}>
            <StatTile label="In Pipeline" value={stats?.pipeline || 0} icon={Users} />
            <StatTile label="Letters Sent" value={stats?.letters || 0} icon={FileText} />
          </View>
          <View style={s.statsRow}>
            <StatTile label="Activities" value={stats?.activities || 0} icon={Eye} />
            <StatTile label="Response Rate" value={`${responseRate}%`} icon={TrendingUp} />
          </View>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Letter Performance</CardTitle>
          <CardDescription>Engagement across your outreach</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          <Text style={s.muted}>Open rate (estimated)</Text>
          <Progress value={Math.min(100, (stats?.letters || 0) * 5)} />
          <Text style={s.muted}>Response rate (estimated)</Text>
          <Progress value={responseRate} />
        </CardContent>
      </Card>
    </View>
  );
}

/* --------------------------- Quick Start Guide --------------------------- */

function ScoutQuickStartGuide({
  scoutName,
  hasOrganization,
  onDismiss,
}: {
  scoutName?: string;
  hasOrganization?: boolean;
  onDismiss: () => void;
}) {
  const STEPS = [
    { key: 'profile', label: 'Complete your scout profile' },
    { key: 'org', label: 'Set up your organization' },
    { key: 'search', label: 'Search for athletes' },
    { key: 'pipeline', label: 'Build your scouting pipeline' },
    { key: 'report', label: 'Create your first scouting report' },
  ];
  const completed = [true, !!hasOrganization, false, false, false];
  const progress = Math.round((completed.filter(Boolean).length / STEPS.length) * 100);
  return (
    <Card style={{ borderColor: colors.primary + '55' }}>
      <CardHeader>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.cardTitleText}>Welcome{scoutName ? `, ${scoutName}` : ''}!</Text>
          <Pressable onPress={onDismiss} hitSlop={10}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </CardHeader>
      <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Progress value={progress} />
          </View>
          <Text style={s.muted}>{progress}%</Text>
        </View>
        {STEPS.map((step, i) => (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {completed[i] ? (
              <CheckCircle2 size={16} color={colors.success || colors.primary} />
            ) : (
              <Circle size={16} color={colors.mutedForeground} />
            )}
            <Text
              style={[
                { color: completed[i] ? colors.mutedForeground : colors.foreground },
                completed[i] && { textDecorationLine: 'line-through' as const },
                { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm },
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Profile Tab ------------------------------- */

function ProfileTab({
  profile,
  isEditing,
  setEditing,
  editForm,
  setEditForm,
  onSave,
  saving,
}: {
  profile: any;
  isEditing: boolean;
  setEditing: (b: boolean) => void;
  editForm: any;
  setEditForm: any;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <CardHeader>
          <CardTitle>My Scout Profile</CardTitle>
          <CardDescription>Update your scout information</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          {isEditing ? (
            <>
              <Input
                label="Full Name"
                value={editForm.name}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, name: t }))}
              />
              <Input
                label="Organization"
                value={editForm.organization}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, organization: t }))}
              />
              <Input
                label="Title"
                value={editForm.title}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, title: t }))}
              />
              <Input
                label="Email"
                value={editForm.email}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, email: t }))}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Input
                label="Phone"
                value={editForm.phone}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, phone: t }))}
                keyboardType="phone-pad"
              />
              <Input
                label="Specializations (comma-separated)"
                value={editForm.specializations}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, specializations: t }))}
              />
              <Input
                label="Regions Covered (comma-separated)"
                value={editForm.regions}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, regions: t }))}
              />
              <Input
                label="Sports Covered (comma-separated)"
                value={editForm.sports_covered}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, sports_covered: t }))}
              />
              <Input
                label="Bio"
                value={editForm.bio}
                onChangeText={(t: string) => setEditForm((f: any) => ({ ...f, bio: t }))}
                multiline
                numberOfLines={4}
                style={{ minHeight: 96, textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <Button
                  onPress={onSave}
                  loading={saving}
                  leftIcon={<Save size={14} color={colors.primaryForeground} />}
                >
                  Save Changes
                </Button>
                <Button variant="outline" onPress={() => setEditing(false)}>
                  Cancel
                </Button>
              </View>
            </>
          ) : (
            <>
              <ProfileField label="Name" value={profile?.name || profile?.full_name} />
              <ProfileField label="Organization" value={profile?.organization} />
              <ProfileField label="Title" value={profile?.title} />
              <ProfileField label="Email" value={profile?.email} />
              <ProfileField label="Phone" value={profile?.phone} />
              <ProfileField
                label="Specializations"
                value={
                  Array.isArray(profile?.specializations)
                    ? profile.specializations.join(', ')
                    : profile?.specializations
                }
              />
              <ProfileField
                label="Regions"
                value={
                  Array.isArray(profile?.regions) ? profile.regions.join(', ') : profile?.regions
                }
              />
              <ProfileField
                label="Sports Covered"
                value={
                  Array.isArray(profile?.sports_covered)
                    ? profile.sports_covered.join(', ')
                    : profile?.sports_covered
                }
              />
              {profile?.bio ? <ProfileField label="Bio" value={profile.bio} /> : null}
              <Button
                onPress={() => setEditing(true)}
                leftIcon={<Edit size={14} color={colors.primaryForeground} />}
                style={{ marginTop: spacing.sm }}
              >
                Edit Profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Social Links Manager */}
      <SocialLinksManager
        role="scout"
        profileName={profile?.name || profile?.full_name || undefined}
        profileImageUrl={profile?.image_url}
        initialLinks={profile?.social_links || {}}
      />
    </View>
  );
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foreground,
  },
  muted: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  cardTitleText: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  quickRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  tabStrip: { gap: spacing.xs, paddingVertical: spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tabTextActive: { color: colors.primaryForeground },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityType: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    textTransform: 'capitalize',
  },
  athleteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  actionsRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  portalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  portalTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  field: { gap: 2 },
  fieldLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  fieldValue: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
});
