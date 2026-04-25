// Ported from Lovable web src/pages/InfluencerBlogPost.tsx (210 LOC).
// Web → RN translation:
//   - useParams → useRoute<RouteProp>().params
//   - <Link> → Pressable + nav.navigate
//   - Tailwind/shadcn → @/components/ui/* + StyleSheet
//   - lucide-react → lucide-react-native
//   - <article>/<img> → ScrollView + Image
//   - prose markdown render: web shows raw markdown via whitespace-pre-wrap.
//     RN keeps the same approach (no rich markdown component yet).
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ArrowRight } from 'lucide-react-native';
import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OfferHoundWatermark } from '@/components/influencer/OfferHoundWatermark';
import { InfluencerShareButtons } from '@/components/influencer/InfluencerShareButtons';
import { buildInfluencerShareUrl } from '@/lib/influencerShare';

import { colors, typography, spacing, radius } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'InfluencerBlogPost'>;

export default function InfluencerBlogPostScreen() {
  const { params } = useRoute<R>();
  const handle = params?.handle;
  const slug = params?.slug;
  const nav = useNavigation<any>();

  const { data: influencer } = useQuery({
    queryKey: ['influencer-by-handle-blog', handle],
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

  const { data: post, isLoading } = useQuery({
    queryKey: ['influencer-blog-single', influencerId, slug],
    queryFn: async () => {
      if (!influencerId || !slug) return null;
      const { data } = await supabase
        .from('influencer_blog_posts' as any)
        .select('*')
        .eq('influencer_id', influencerId)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      return data as any;
    },
    enabled: !!influencerId && !!slug,
  });

  const { data: related = [] } = useQuery({
    queryKey: ['influencer-blog-related', influencerId, post?.id],
    queryFn: async () => {
      if (!influencerId || !post?.id) return [];
      const { data } = await supabase
        .from('influencer_blog_posts' as any)
        .select('id, title, slug, excerpt, hero_image_url, published_at')
        .eq('influencer_id', influencerId)
        .eq('status', 'published')
        .neq('id', post.id)
        .order('published_at', { ascending: false })
        .limit(3);
      return (data || []) as any[];
    },
    enabled: !!influencerId && !!post?.id,
  });

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!post || !influencer) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Post not found.</Text>
        <View style={{ height: spacing.md }} />
        <Button
          variant="outline"
          size="sm"
          onPress={() =>
            handle
              ? nav.navigate('InfluencerProfile' as any, { handle })
              : nav.goBack()
          }>
          Back to profile
        </Button>
      </View>
    );
  }

  const shareUrl = buildInfluencerShareUrl(influencer.handle, `/blog/${post.slug}`);

  return (
    <View style={s.container}>
      <SEO
        title={`${post.title} - ${influencer.display_name} - OfferHound`}
        description={post.excerpt?.slice(0, 155) || post.title}
      />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton />

        {!!post.hero_image_url && (
          <View style={s.heroWrap}>
            <Image source={{ uri: post.hero_image_url }} style={s.hero} resizeMode="cover" />
            <OfferHoundWatermark />
          </View>
        )}

        <Text style={s.title}>{post.title}</Text>
        {!!post.excerpt && <Text style={s.excerpt}>{post.excerpt}</Text>}

        <View style={s.byline}>
          <Pressable
            style={s.authorRow}
            onPress={() => nav.navigate('InfluencerProfile' as any, { handle: influencer.handle })}>
            <Avatar
              size={40}
              source={influencer.profile_image_url ? { uri: influencer.profile_image_url } : null}
              fallback={influencer.display_name || '?'}
            />
            <View>
              <Text style={s.authorName}>{influencer.display_name}</Text>
              <Text style={s.authorHandle}>@{influencer.handle}</Text>
            </View>
          </Pressable>

          {!!post.published_at && (
            <View style={s.dateRow}>
              <Calendar size={14} color={colors.mutedForeground} />
              <Text style={s.dateText}>
                {format(new Date(post.published_at), 'MMMM d, yyyy')}
              </Text>
            </View>
          )}

          <View style={{ marginLeft: 'auto' }}>
            <InfluencerShareButtons url={shareUrl} title={post.title} />
          </View>
        </View>

        {(post.tags?.length > 0 || post.sport_tags?.length > 0) && (
          <View style={s.tagRow}>
            {post.sport_tags?.map((t: string) => (
              <Badge key={`sport-${t}`} variant="secondary">
                {t}
              </Badge>
            ))}
            {post.tags?.map((t: string) => (
              <Badge key={`tag-${t}`} variant="outline">
                {t}
              </Badge>
            ))}
          </View>
        )}

        <Text style={s.body}>{post.body_markdown}</Text>

        <View style={s.footerShare}>
          <Text style={s.muted}>Enjoyed this? Share it.</Text>
          <InfluencerShareButtons url={shareUrl} title={post.title} />
        </View>

        {related.length > 0 && (
          <View style={s.relatedWrap}>
            <Text style={s.relatedHeading}>More from {influencer.display_name}</Text>
            <View style={s.relatedGrid}>
              {related.map(r => (
                <Pressable
                  key={r.id}
                  style={s.relatedItem}
                  onPress={() =>
                    nav.navigate('InfluencerBlogPost' as any, {
                      handle: influencer.handle,
                      slug: r.slug,
                    })
                  }>
                  <Card style={s.relatedCard}>
                    {!!r.hero_image_url && (
                      <View style={s.relatedHeroWrap}>
                        <Image source={{ uri: r.hero_image_url }} style={s.relatedHero} resizeMode="cover" />
                        <OfferHoundWatermark size="sm" />
                      </View>
                    )}
                    <CardContent style={s.relatedContent}>
                      <Text style={s.relatedTitle} numberOfLines={2}>{r.title}</Text>
                      {!!r.published_at && (
                        <Text style={s.relatedDate}>
                          {format(new Date(r.published_at), 'MMM d, yyyy')}
                        </Text>
                      )}
                    </CardContent>
                  </Card>
                </Pressable>
              ))}
            </View>
            <View style={s.visitWrap}>
              <Button
                variant="outline"
                size="sm"
                onPress={() => nav.navigate('InfluencerProfile' as any, { handle: influencer.handle })}
                rightIcon={<ArrowRight size={14} color={colors.foreground} />}>
                Visit profile
              </Button>
            </View>
          </View>
        )}

        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  muted: { color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  scroll: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl, maxWidth: 720, alignSelf: 'center', width: '100%' },
  heroWrap: { marginTop: spacing.md, marginBottom: spacing.md, position: 'relative', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.muted },
  hero: { width: '100%', aspectRatio: 16 / 9 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: 32, color: colors.foreground, marginTop: spacing.md, lineHeight: 38 },
  excerpt: { fontSize: 17, color: colors.mutedForeground, marginTop: spacing.sm, fontFamily: typography.fontFamily.body },
  byline: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authorName: { fontSize: 14, color: colors.foreground, fontFamily: typography.fontFamily.body, fontWeight: '500' },
  authorHandle: { fontSize: 12, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: colors.mutedForeground, fontFamily: typography.fontFamily.body },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  body: { fontFamily: typography.fontFamily.body, color: colors.foreground, marginTop: spacing.xl, lineHeight: 24, fontSize: 15 },
  footerShare: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  relatedWrap: { marginTop: spacing.xxl },
  relatedHeading: { fontFamily: typography.fontFamily.heading, fontSize: 22, color: colors.foreground, marginBottom: spacing.md },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  relatedItem: { flexBasis: '100%', minWidth: 0 },
  relatedCard: { overflow: 'hidden' },
  relatedHeroWrap: { position: 'relative', backgroundColor: colors.muted },
  relatedHero: { width: '100%', aspectRatio: 16 / 9 },
  relatedContent: { padding: spacing.sm },
  relatedTitle: { fontSize: 14, color: colors.foreground, fontFamily: typography.fontFamily.body, fontWeight: '500' },
  relatedDate: { fontSize: 11, color: colors.mutedForeground, marginTop: 4, fontFamily: typography.fontFamily.body },
  visitWrap: { alignItems: 'center', marginTop: spacing.md },
});
