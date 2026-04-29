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
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Status = 'draft' | 'published';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function InfluencerBlogComposerScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InfluencerBlogComposer'>>();
  const { user } = useAuth() as any;
  const postId = route.params?.postId;
  const isEdit = !!postId;

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<Status>('draft');

  const [influencerId, setInfluencerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Resolve influencer profile; if editing, also load the post.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user?.id) {
          setLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from('influencer_profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const id = (profile as any)?.id ?? null;
        setInfluencerId(id);

        if (isEdit && id && postId) {
          const { data: post } = await supabase
            .from('influencer_blog_posts' as any)
            .select('*')
            .eq('id', postId)
            .eq('influencer_id', id)
            .maybeSingle();
          if (cancelled) return;
          if (post) {
            const p = post as any;
            setTitle(p.title ?? '');
            setExcerpt(p.excerpt ?? '');
            setContent(p.content ?? '');
            setTagsInput(Array.isArray(p.tags) ? p.tags.join(', ') : '');
            setStatus((p.status as Status) ?? 'draft');
          }
        }
      } catch (err) {
        // swallow; surface via Alert on save attempts.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isEdit, postId]);

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
      const tags = parseTags(tagsInput);
      const payload: Record<string, any> = {
        influencer_id: influencerId,
        title: title.trim(),
        slug: generateSlug(title),
        excerpt: excerpt.trim() || null,
        content: content,
        tags,
        status: targetStatus,
      };
      if (publish) {
        payload.published_at = new Date().toISOString();
      }

      if (isEdit && postId) {
        const { error } = await supabase
          .from('influencer_blog_posts' as any)
          .update(payload)
          .eq('id', postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('influencer_blog_posts' as any)
          .insert(payload);
        if (error) throw error;
      }

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
              value={title}
              onChangeText={setTitle}
              placeholder="A bold, scroll-stopping title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={s.label}>Excerpt</Text>
            <TextInput
              style={[s.input, s.multiline]}
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
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="nil, recruiting, training (comma-separated)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />

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
              onPress={() => submit(true)}
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
