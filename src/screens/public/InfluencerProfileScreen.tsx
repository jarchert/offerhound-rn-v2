// Ported from Lovable web src/pages/InfluencerProfile.tsx (317 LOC).
// Web → RN translation:
//   - useParams → useRoute<RouteProp>().params
//   - <Link> → Pressable + nav.navigate
//   - lucide-react → lucide-react-native
//   - shadcn Tabs → @/components/ui/Tabs (controlled by useState<string>)
//   - <img>/<video> → Image + expo-av Video for inline video
//   - external <a href> → Linking.openURL
//   - Tailwind/responsive grids → ScrollView columns + StyleSheet
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  Globe,
  Users,
  MapPin,
  Mic,
  Image as ImageIcon,
  Newspaper,
  Headphones,
  ExternalLink,
  BookOpen,
  Radio,
} from 'lucide-react-native';
import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

import { SportsNewsFeed } from '@/components/influencer/SportsNewsFeed';
import { MessageButton } from '@/components/MessageButton';
import { InfluencerPostCard } from '@/components/influencer/InfluencerPostCard';
import {
  useInfluencerPosts,
  useInfluencerBlogPosts,
  useInfluencerLinkedPodcasts,
  useInfluencerGallery,
  useInfluencerSocialLinks,
  useFollowerCount,
} from '@/hooks/useInfluencerContent';
import { useFollowInfluencer, useIsFollowing } from '@/hooks/useInfluencer';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'InfluencerProfile'>;

export default function InfluencerProfileScreen() {
  const { params } = useRoute<R>();
  const handle = params?.handle;
  const nav = useNavigation<any>();
  const { user } = useAuth();

  const { data: influencer, isLoading } = useQuery({
    queryKey: ['influencer-profile', handle],
    queryFn: async () => {
      if (!handle) return null;
      const { data } = await supabase
        .from('influencer_profiles' as any)
        .select('*')
        .eq('handle', handle)
        .maybeSingle();
      return data as any;
    },
    enabled: !!handle,
  });

  const influencerId = influencer?.id;
  const { data: posts = [] } = useInfluencerPosts(influencerId);
  const { data: blogs = [] } = useInfluencerBlogPosts(influencerId);
  const { data: podcasts = [] } = useInfluencerLinkedPodcasts(influencerId);
  const { data: gallery = [] } = useInfluencerGallery(influencerId);
  const { data: socialLinks = [] } = useInfluencerSocialLinks(influencerId);
  const { data: followerCount = 0 } = useFollowerCount(influencerId);
  const { data: isFollowing } = useIsFollowing(influencerId);
  const { follow, unfollow } = useFollowInfluencer();

  const [tab, setTab] = useState<string>('posts');

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!influencer) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Influencer not found.</Text>
      </View>
    );
  }

  const isOwner = user?.id === influencer.user_id;
  const region = [influencer.region_city, influencer.region_state].filter(Boolean).join(', ');

  return (
    <View style={s.container}>
      <SEO
        title={`${influencer.display_name} (@${influencer.handle}) - OfferHound`}
        description={influencer.bio?.slice(0, 155)}
      />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* HERO */}
        <View style={s.hero}>
          <BackButton />
          <View style={s.heroBody}>
            <View style={s.avatarWrap}>
              <Avatar
                size={128}
                source={influencer.profile_image_url ? { uri: influencer.profile_image_url } : null}
                fallback={influencer.display_name || '?'}
              />
              {influencer.verification_status === 'verified' && (
                <View style={s.verifiedBadge}>
                  <Badge>
                    <View style={s.verifiedInner}>
                      <Star size={12} color={colors.primaryForeground} />
                      <Text style={s.verifiedText}>Verified</Text>
                    </View>
                  </Badge>
                </View>
              )}
            </View>

            <View style={s.heroInfo}>
              <Text style={s.displayName}>{influencer.display_name}</Text>
              <Text style={s.handle}>@{influencer.handle}</Text>

              <View style={s.metaRow}>
                {!!influencer.affiliation_type && (
                  <Badge variant="outline">
                    {String(influencer.affiliation_type).replace(/_/g, ' ')}
                  </Badge>
                )}
                {!!region && (
                  <Badge variant="outline">
                    <View style={s.iconBadge}>
                      <MapPin size={12} color={colors.foreground} />
                      <Text style={s.iconBadgeText}>{region}</Text>
                    </View>
                  </Badge>
                )}
                <Badge variant="outline">
                  <View style={s.iconBadge}>
                    <Users size={12} color={colors.foreground} />
                    <Text style={s.iconBadgeText}>{Number(followerCount).toLocaleString()} followers</Text>
                  </View>
                </Badge>
              </View>

              {!!influencer.bio && <Text style={s.bio}>{influencer.bio}</Text>}

              <View style={s.ctaRow}>
                {!isOwner && user && (
                  <Button
                    variant={isFollowing ? 'outline' : 'default'}
                    onPress={() =>
                      isFollowing
                        ? unfollow(influencer.id)
                        : follow({ influencerId: influencer.id, source: 'profile' })
                    }
                    leftIcon={
                      <Star
                        size={16}
                        color={isFollowing ? colors.foreground : colors.primaryForeground}
                      />
                    }>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
                {isOwner && (
                  <Button
                    onPress={() =>
                      nav.navigate('InfluencerTabs' as any, { screen: 'DashboardTab' })
                    }>
                    Manage your profile
                  </Button>
                )}
                {!isOwner && user && (
                  <MessageButton
                    recipientId={influencer.user_id}
                    recipientName={influencer.display_name}
                  />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* CONTENT TABS */}
        <View style={s.tabsWrap}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="posts">
                <View style={s.tabLabel}>
                  <Newspaper size={14} color={colors.foreground} />
                  <Text style={s.tabText}>Posts</Text>
                </View>
              </TabsTrigger>
              <TabsTrigger value="blog">
                <View style={s.tabLabel}>
                  <BookOpen size={14} color={colors.foreground} />
                  <Text style={s.tabText}>Blog</Text>
                </View>
              </TabsTrigger>
              <TabsTrigger value="media">
                <View style={s.tabLabel}>
                  <ImageIcon size={14} color={colors.foreground} />
                  <Text style={s.tabText}>Media</Text>
                </View>
              </TabsTrigger>
              <TabsTrigger value="podcasts">
                <View style={s.tabLabel}>
                  <Headphones size={14} color={colors.foreground} />
                  <Text style={s.tabText}>Podcasts</Text>
                </View>
              </TabsTrigger>
              <TabsTrigger value="news">
                <View style={s.tabLabel}>
                  <Radio size={14} color={colors.foreground} />
                  <Text style={s.tabText}>News</Text>
                </View>
              </TabsTrigger>
              <TabsTrigger value="social">
                <View style={s.tabLabel}>
                  <Globe size={14} color={colors.foreground} />
                  <Text style={s.tabText}>Social</Text>
                </View>
              </TabsTrigger>
            </TabsList>

            {/* POSTS */}
            <TabsContent value="posts">
              {posts.length === 0 ? (
                <EmptyState Icon={Newspaper} text="No posts yet." />
              ) : (
                <View style={{ gap: spacing.md }}>
                  {posts.map((p: any) => (
                    <InfluencerPostCard
                      key={p.id}
                      post={p}
                      influencer={{
                        id: influencer.id,
                        handle: influencer.handle,
                        display_name: influencer.display_name,
                        profile_image_url: influencer.profile_image_url,
                      }}
                    />
                  ))}
                </View>
              )}
            </TabsContent>

            {/* BLOG */}
            <TabsContent value="blog">
              {blogs.length === 0 ? (
                <EmptyState Icon={BookOpen} text="No blog posts yet." />
              ) : (
                <View style={{ gap: spacing.md }}>
                  {blogs.map((b: any) => (
                    <Pressable
                      key={b.id}
                      onPress={() =>
                        nav.navigate('InfluencerBlogPost' as any, {
                          handle: influencer.handle,
                          slug: b.slug,
                        })
                      }>
                      <Card style={s.blogCard}>
                        {!!b.hero_image_url && (
                          <Image source={{ uri: b.hero_image_url }} style={s.blogHero} resizeMode="cover" />
                        )}
                        <CardContent style={s.blogContent}>
                          <Text style={s.blogTitle}>{b.title}</Text>
                          {!!b.excerpt && (
                            <Text style={s.blogExcerpt} numberOfLines={3}>
                              {b.excerpt}
                            </Text>
                          )}
                          <Text style={s.blogDate}>
                            {b.published_at ? format(new Date(b.published_at), 'MMM d, yyyy') : 'Draft'}
                          </Text>
                        </CardContent>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              )}
            </TabsContent>

            {/* MEDIA */}
            <TabsContent value="media">
              {gallery.length === 0 ? (
                <EmptyState Icon={ImageIcon} text="No media uploaded yet." />
              ) : (
                <View style={s.mediaGrid}>
                  {gallery.map((m: any) => (
                    <View key={m.id} style={s.mediaCell}>
                      {/* PORT-PENDING: video tiles use Image as a placeholder
                          poster; expo-av Video integration tracked separately. */}
                      <Image
                        source={{ uri: m.thumbnail_url || m.file_url }}
                        style={s.mediaImg}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </View>
              )}
            </TabsContent>

            {/* PODCASTS */}
            <TabsContent value="podcasts">
              {podcasts.length === 0 ? (
                <EmptyState Icon={Mic} text="No linked podcasts yet." />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {podcasts.map((p: any) => (
                    <Card key={p.id}>
                      <CardContent style={s.podRow}>
                        {p.cover_image_url ? (
                          <Image source={{ uri: p.cover_image_url }} style={s.podCover} resizeMode="cover" />
                        ) : (
                          <View style={[s.podCover, s.podCoverFallback]}>
                            <Mic size={22} color={colors.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.podTitle} numberOfLines={1}>{p.title}</Text>
                          <View style={s.podBadges}>
                            <Badge variant="outline">{p.platform}</Badge>
                            <Badge variant="secondary">{p.role}</Badge>
                          </View>
                          {!!p.description && (
                            <Text style={s.podDesc} numberOfLines={2}>{p.description}</Text>
                          )}
                        </View>
                        {!!p.external_url && (
                          <Pressable onPress={() => Linking.openURL(p.external_url)} hitSlop={8}>
                            <ExternalLink size={18} color={colors.foreground} />
                          </Pressable>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </View>
              )}
            </TabsContent>

            {/* SPORTS NEWS */}
            <TabsContent value="news">
              <SportsNewsFeed />
            </TabsContent>

            {/* SOCIAL */}
            <TabsContent value="social">
              {socialLinks.length === 0 ? (
                <EmptyState Icon={Globe} text="No social links added yet." />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {socialLinks.map((sl: any) => (
                    <Card key={sl.id}>
                      <CardContent style={s.socialRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.socialPlatform}>{sl.platform}</Text>
                          <Text style={s.socialUrl} numberOfLines={1}>{sl.profile_url}</Text>
                        </View>
                        <Pressable onPress={() => Linking.openURL(sl.profile_url)} hitSlop={8}>
                          <ExternalLink size={18} color={colors.foreground} />
                        </Pressable>
                      </CardContent>
                    </Card>
                  ))}
                </View>
              )}
            </TabsContent>
          </Tabs>
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

function EmptyState({ Icon, text }: { Icon: any; text: string }) {
  return (
    <Card>
      <CardContent style={s.emptyContent}>
        <Icon size={28} color={colors.mutedForeground} />
        <Text style={s.muted}>{text}</Text>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  muted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  scroll: { paddingBottom: spacing.xxxl },

  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  heroBody: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg, alignItems: 'flex-start', flexWrap: 'wrap' },
  avatarWrap: { position: 'relative' },
  verifiedBadge: { position: 'absolute', bottom: -8, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  verifiedInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: colors.primaryForeground, fontSize: 11, fontFamily: typography.fontFamily.body },
  heroInfo: { flex: 1, minWidth: 200 },
  displayName: { fontFamily: typography.fontFamily.heading, fontSize: 32, color: colors.foreground, lineHeight: 36 },
  handle: { color: colors.mutedForeground, marginTop: 2, fontFamily: typography.fontFamily.body },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  iconBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBadgeText: { color: colors.foreground, fontSize: 11, fontFamily: typography.fontFamily.body },
  bio: { color: colors.foreground, marginTop: spacing.md, fontFamily: typography.fontFamily.body, lineHeight: 20, fontSize: 14 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },

  tabsWrap: { padding: spacing.lg },
  tabLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: 13 },

  blogCard: { overflow: 'hidden' },
  blogHero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.muted },
  blogContent: { padding: spacing.md },
  blogTitle: { fontFamily: typography.fontFamily.heading, fontSize: 18, color: colors.foreground, lineHeight: 22 },
  blogExcerpt: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, fontFamily: typography.fontFamily.body },
  blogDate: { fontSize: 11, color: colors.mutedForeground, marginTop: spacing.sm, fontFamily: typography.fontFamily.body },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mediaCell: { width: '48%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.muted },
  mediaImg: { width: '100%', height: '100%' },

  podRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, alignItems: 'center' },
  podCover: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.muted },
  podCoverFallback: { alignItems: 'center', justifyContent: 'center' },
  podTitle: { fontFamily: typography.fontFamily.body, fontWeight: '500', color: colors.foreground },
  podBadges: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  podDesc: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, fontFamily: typography.fontFamily.body },

  socialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm },
  socialPlatform: { color: colors.foreground, fontFamily: typography.fontFamily.body, fontWeight: '500' },
  socialUrl: { color: colors.mutedForeground, fontSize: 12, fontFamily: typography.fontFamily.body },

  emptyContent: { paddingVertical: 48, alignItems: 'center', gap: spacing.sm },
});
