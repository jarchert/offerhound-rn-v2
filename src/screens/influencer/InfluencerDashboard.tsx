import {CreatorGallery} from '@/components/influencer/CreatorGallery';
import {CreatorBlogs} from '@/components/influencer/CreatorBlogs';
import { UserProfileHeader } from '@/components/UserProfileHeader';
// InfluencerDashboard — Lovable parity: tabbed studio for verified influencers.
// Tabs: Composer | Library | Schedule | Syndication | Analytics.
// SportsNewsFeed anchors the bottom as a sharable newsroom rail.
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Mic, Users, Eye, Calendar, Plus } from 'lucide-react-native';
import {useCreatorSyndication} from '@/hooks/useCreatorSyndication';
import { useMyInfluencerProfile } from '@/hooks/useInfluencer';
import {Button} from '@/components/ui/Button';
import { Navbar } from '@/components/Navbar';
import { StatTile } from '@/components/StatTile';
import { SectionHeader } from '@/components/SectionHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { InfluencerComposer } from '@/components/influencer/InfluencerComposer';
import { InfluencerContentLibrary } from '@/components/influencer/InfluencerContentLibrary';
import { InfluencerScheduleQueue } from '@/components/influencer/InfluencerScheduleQueue';
import { InfluencerSyndicationSettings } from '@/components/influencer/InfluencerSyndicationSettings';
import { InfluencerAnalytics } from '@/components/influencer/InfluencerAnalytics';
import { SportsNewsFeed } from '@/components/influencer/SportsNewsFeed';
import { colors, typography, spacing, radius } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type TabKey = 'gallery' | 'blogs' | 'composer' | 'library' | 'schedule' | 'syndication' | 'analytics';

export default function InfluencerDashboard() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: profile, isLoading, refetch, isError: profileFailed } = useMyInfluencerProfile() as any;
  const [tab, setTab] = useState<TabKey>('composer');
  const [editingPost,setEditingPost]=useState<any>(null);
  const [newsSeed,setNewsSeed]=useState<any>(null);
  const body=useRef<ScrollView>(null);

  const influencerId: string | null = profile?.id ?? null;
  const {data: privateSharing}=useCreatorSyndication(influencerId);
  const syndicationEnabled = privateSharing?.enabled === true;

  const needsProfile = !isLoading && !profile;

  if (profileFailed) return <SafeAreaView style={s.container}><Navbar/><Text accessibilityRole="alert">Your creator profile could not be loaded.</Text><Button onPress={() => void refetch()}>Retry creator profile</Button></SafeAreaView>;

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <ScrollView ref={body}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <UserProfileHeader profile={profile} />
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{profile?.display_name || 'Influencer'}</Text>
            <Text style={s.subtitle}>@{profile?.handle || 'handle'}</Text>
          </View>
          <Pressable
            style={s.newPostBtn}
            onPress={() => nav.navigate('InfluencerBlogComposer', undefined as any)}
          >
            <Plus size={16} color={colors.primaryForeground} />
            <Text style={s.newPostText}>New Blog</Text>
          </Pressable>
        </View>

        {/* Stat tiles */}
        <View style={s.statsRow}>
          <StatTile label="Followers" value={profile?.follower_count ?? 0} icon={Users} />
          <StatTile label="Views (30d)" value={profile?.views_30d ?? 0} icon={Eye} />
        </View>

        {/* Quick-jump shortcuts (tab peers) */}
        <SectionHeader title="Quick actions" />
        <View style={s.actions}>
          <Pressable
            style={s.action}
            onPress={() => nav.navigate('InfluencerTabs', { screen: 'BoardTab' } as any)}
          >
            <Calendar size={18} color={colors.primary} />
            <Text style={s.actionText}>Influencer Board</Text>
          </Pressable>
          <Pressable
            style={s.action}
            onPress={() => nav.navigate('InfluencerTabs', { screen: 'PodcastsTab' } as any)}
          >
            <Mic size={18} color={colors.primary} />
            <Text style={s.actionText}>Podcast Library</Text>
          </Pressable>
        </View>

        {/* Studio tabs */}
        {needsProfile ? (
          <Card style={s.emptyCard}>
            <Text style={s.emptyTitle}>Finish your influencer profile</Text>
            <Text style={s.emptyBody}>
              Create an influencer profile to compose posts, manage your content library, schedule
              publishing, and track analytics.
            </Text>
          </Card>
        ) : influencerId ? (
          <View style={s.studio}>
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tabsScroll}
              >
                <TabsList style={s.tabsList}>
                  <TabsTrigger value="composer" testID="creator-tab-composer">Composer</TabsTrigger>
                  <TabsTrigger value="gallery" testID="creator-tab-gallery">Gallery</TabsTrigger>
                  <TabsTrigger value="blogs" testID="creator-tab-blogs">Blogs</TabsTrigger>
                  <TabsTrigger value="library" testID="creator-tab-library">Library</TabsTrigger>
                  <TabsTrigger value="schedule" testID="creator-tab-schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="syndication" testID="creator-tab-syndication">Syndication</TabsTrigger>
                  <TabsTrigger value="analytics" testID="creator-tab-analytics">Analytics</TabsTrigger>
                </TabsList>
              </ScrollView>

              <TabsContent value="composer" style={s.tabPanel}>
                <InfluencerComposer key={editingPost?.id || "new"}
                  editingPost={editingPost}
                  influencerId={influencerId}
                  seed={newsSeed}
                  onCleared={()=>{setNewsSeed(null);setEditingPost(null);}}
                  syndicationEnabled={syndicationEnabled}
                />
              </TabsContent>

              <TabsContent value="gallery" style={s.tabPanel}><CreatorGallery influencerId={influencerId}/></TabsContent>

              <TabsContent value="blogs" style={s.tabPanel}>
                <CreatorBlogs influencerId={influencerId} onNew={()=>nav.navigate('InfluencerBlogComposer',undefined)} onEdit={postId=>nav.navigate('InfluencerBlogComposer',{postId})}/>
              </TabsContent>

              <TabsContent value="library" style={s.tabPanel}>
                <InfluencerContentLibrary influencerId={influencerId} />
              </TabsContent>

              <TabsContent value="schedule" style={s.tabPanel}>
                <InfluencerScheduleQueue influencerId={influencerId} onEdit={post=>{setEditingPost(post);setNewsSeed(null);setTab("composer");body.current?.scrollTo({y:0,animated:true});}} />
              </TabsContent>

              <TabsContent value="syndication" style={s.tabPanel}>
                <InfluencerSyndicationSettings
                  influencerId={influencerId}
                />
              </TabsContent>

              <TabsContent value="analytics" style={s.tabPanel}>
                <InfluencerAnalytics influencerId={influencerId} />
              </TabsContent>
            </Tabs>
          </View>
        ) : null}

        {/* Sports news rail — sharable seeds for the composer */}
        <View style={s.newsWrap}>
          <SectionHeader title="Sports news" />
          <SportsNewsFeed compact onShareToCompose={item=>{setEditingPost(null);setNewsSeed(item);setTab('composer');body.current?.scrollTo({y:0,animated:true});}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: {
    marginBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  newPostText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  actions: { gap: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  studio: { marginTop: spacing.sm, gap: spacing.sm },
  tabsScroll: { paddingRight: spacing.md },
  tabsList: { flexDirection: 'row', gap: spacing.xs },
  tabPanel: { marginTop: spacing.sm },
  emptyCard: { padding: spacing.md, gap: spacing.xs, marginTop: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  newsWrap: { marginTop: spacing.md, gap: spacing.sm },
});
