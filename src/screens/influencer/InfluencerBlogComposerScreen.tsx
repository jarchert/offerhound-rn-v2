// InfluencerBlogComposerScreen — Lovable parity blog composer.
// Allows verified influencers to draft or publish a blog post backed by
// the `influencer_blog_posts` table. Supports edit mode via route.params.postId.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { colors, typography, spacing, radius } from '@/lib/theme';
import {useQueryClient} from '@tanstack/react-query';
import { saveCreatorBlog } from '@/lib/creatorBlog';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Status = 'draft' | 'published';

export default function InfluencerBlogComposerScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InfluencerBlogComposer'>>();
  const { user } = useAuth() as any;
  const queryClient=useQueryClient();
  const [savedPostId,setSavedPostId]=useState<string|undefined>();
  const postId = savedPostId||route.params?.postId;
  const isEdit = !!postId;

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [heroImageUrl,setHeroImageUrl]=useState('');
  const [sportsInput,setSportsInput]=useState('');
  const [visibility,setVisibility]=useState('public');
  const [updatedAt,setUpdatedAt]=useState<string | undefined>();
  const [status, setStatus] = useState<Status>('draft');
  const signature=JSON.stringify({title,excerpt,content,tagsInput,heroImageUrl,sportsInput,visibility});
  const [savedSignature,setSavedSignature]=useState(JSON.stringify({title:'',excerpt:'',content:'',tagsInput:'',heroImageUrl:'',sportsInput:'',visibility:'public'}));
  usePreventRemove(signature!==savedSignature,({data})=>Alert.alert('Discard unsaved blog edits?','Your changes have not been saved.',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>nav.dispatch(data.action)}]));

  const [influencerId, setInfluencerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // Resolve influencer profile; if editing, also load the post.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setInfluencerId(null);
    (async () => {
      try {
        if (!user?.id) {
          throw new Error('Sign in to edit a blog post.');
        }
        const { data: profile, error: profileError } = await supabase
          .from('influencer_profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (profileError) throw profileError;
        const id = (profile as any)?.id ?? null;
        if (!id) throw new Error('Creator profile required.');
        setInfluencerId(id);

        if (isEdit && id && postId) {
          const { data: post, error: postError } = await supabase
            .from('influencer_blog_posts' as any)
            .select('*')
            .eq('id', postId)
            .eq('influencer_id', id)
            .maybeSingle();
          if (cancelled) return;
          if (postError) throw postError;
          if (!post) throw new Error('This blog post is unavailable.');
          if (post) {
            const p = post as any;
            setUpdatedAt(p.updated_at);
            setHeroImageUrl(p.hero_image_url||'');
            setSportsInput(Array.isArray(p.sport_tags)?p.sport_tags.join(', '):'');
            setVisibility(p.visibility||'public');
            setTitle(p.title ?? '');
            setExcerpt(p.excerpt ?? '');
            setContent(p.body_markdown ?? '');
            setTagsInput(Array.isArray(p.tags) ? p.tags.join(', ') : '');
            setSavedSignature(JSON.stringify({title:p.title??'',excerpt:p.excerpt??'',content:p.body_markdown??'',tagsInput:Array.isArray(p.tags)?p.tags.join(', '):'',heroImageUrl:p.hero_image_url||'',sportsInput:Array.isArray(p.sport_tags)?p.sport_tags.join(', '):'',visibility:p.visibility||'public'}));
            setStatus((p.status as Status) ?? 'draft');
          }
        }
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Could not load blog editor.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isEdit, postId, retry]);

  const parseTags = (raw: string): string[] =>
    raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

  const submit = async (publish: boolean) => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your post a title before saving.');
      return;
    }
    if (!influencerId) {
      Alert.alert(
        'Profile required',
        'You need an influencer profile before composing posts.',
      );
      return;
    }

    setSaving(true);
    try {
      const targetStatus: Status = publish ? 'published' : 'draft';
      const saved=await saveCreatorBlog(supabase, {influencerId,postId,updatedAt,title,bodyMarkdown:content,excerpt,tags:parseTags(tagsInput),publish,heroImageUrl,sportTags:parseTags(sportsInput),visibility});
      setSavedPostId(saved.id);setUpdatedAt(saved.updated_at);

      void queryClient.invalidateQueries({queryKey:['influencer-blog-posts',influencerId]});
      setSavedSignature(signature);
      setStatus(targetStatus);
      Alert.alert(
        publish ? 'Published' : 'Draft saved',
        publish
          ? 'Your post is live in your library.'
          : 'Your draft is saved. You can publish it later.',
        [{ text: 'OK', onPress: () => nav.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Could not save your post.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <SafeAreaView style={s.container}><Navbar /><BackButton /><Text style={s.label}>{loadError}</Text><Pressable onPress={() => setRetry(value => value + 1)}><Text style={s.label}>Retry</Text></Pressable></SafeAreaView>;

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <Navbar />
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.headerRow}>
            <BackButton />
            <Text style={s.title}>{isEdit ? 'Edit post' : 'New post'}</Text>
          </View>

          <Card style={s.card}>
            <Text style={s.label}>Title</Text>
            <TextInput
              style={s.input}
              editable={!saving}
              value={title}
              onChangeText={setTitle}
              placeholder="A bold, scroll-stopping title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={s.label}>Excerpt</Text>
            <TextInput
              style={[s.input, s.multiline]}
              editable={!saving}
              value={excerpt}
              onChangeText={setExcerpt}
              placeholder="2-3 sentence summary used in previews"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <Text style={s.label}>Content</Text>
            <TextInput
              style={[s.input, s.contentArea]}
              editable={!saving}
              value={content}
              onChangeText={setContent}
              placeholder="Write the full body of your post here…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />

            <Text style={s.label}>Tags</Text>
            <TextInput
              style={s.input}
              editable={!saving}
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="nil, recruiting, training (comma-separated)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />

            <Text style={s.label}>Cover image link</Text>
            <TextInput style={s.input} value={heroImageUrl} onChangeText={setHeroImageUrl} editable={!saving}
              autoCapitalize="none" keyboardType="url" placeholder="https://…" placeholderTextColor={colors.mutedForeground}/>
            <Text style={s.label}>Sports</Text>
            <TextInput style={s.input} value={sportsInput} onChangeText={setSportsInput} editable={!saving}
              placeholder="football, basketball (comma-separated)" placeholderTextColor={colors.mutedForeground}/>
            <Text style={s.label}>Who can read this post?</Text>
            {!['public','logged_in_only'].includes(visibility)&&<Text style={s.label}>This post uses an unsupported audience setting. Choose an audience explicitly before saving.</Text>}
            <View style={s.statusRow}>{[{value:'public',label:'Everyone'},{value:'logged_in_only',label:'Signed-in members'}].map(option=><Pressable key={option.value} disabled={saving} accessibilityRole="button" accessibilityState={{selected:visibility===option.value}} onPress={()=>setVisibility(option.value)} style={[s.pill,visibility===option.value&&s.pillActive]}><Text style={[s.pillText,visibility===option.value&&s.pillTextActive]}>{option.label}</Text></Pressable>)}</View>
            <Text style={s.label}>Status</Text>
            <View style={s.statusRow}>
              <Pressable
                onPress={() => setStatus('draft')}
                style={[s.pill, status === 'draft' && s.pillActive]}
              >
                <Text style={[s.pillText, status === 'draft' && s.pillTextActive]}>
                  Draft
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStatus('published')}
                style={[s.pill, status === 'published' && s.pillActive]}
              >
                <Text style={[s.pillText, status === 'published' && s.pillTextActive]}>
                  Published
                </Text>
              </Pressable>
            </View>
          </Card>

          <View style={s.actions}>
            <Pressable
              onPress={() => submit(false)}
              disabled={saving}
              style={[s.btn, s.btnSecondary, saving && s.btnDisabled]}
            >
              <Text style={s.btnSecondaryText}>
                {saving ? 'Saving…' : 'Save draft'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Publish this blog?', 'This makes the post available on your creator profile.', [{text:'Cancel',style:'cancel'},{text:'Publish',onPress:()=>void submit(true)}])}
              disabled={saving}
              style={[s.btn, s.btnPrimary, saving && s.btnDisabled]}
            >
              <Text style={s.btnPrimaryText}>
                {saving ? 'Publishing…' : 'Publish'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  card: { padding: spacing.md, gap: spacing.xs },
  label: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  multiline: { minHeight: 72 },
  contentArea: { minHeight: 220 },
  statusRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  pillTextActive: { color: colors.primaryForeground },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.primaryForeground,
  },
  btnSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  btnDisabled: { opacity: 0.6 },
});
