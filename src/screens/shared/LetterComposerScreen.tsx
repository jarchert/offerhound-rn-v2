// LetterComposerScreen — AI-driven letter authoring with streaming response and
// native sharing. Wires to the `generate-letter` edge function (Lovable parity).
// Part 4 §4.x of the conversion guide describes this screen.
//
// Sender-profile parity note (2026-09-05):
// MAIN's <LetterDashboard> loads the authenticated user's role-specific profile
// (athlete/coach/scout/HS coach) and passes it into <LetterComposer> as the
// `senderProfile` prop. That is done at the composer container level, NOT via
// route params — callers only ever wire the recipient side. RN mirrors that
// pattern here: this screen resolves `senderProfile` from the current role via
// the appropriate profile hook and displays it as a read-only "Sending as"
// header. Fixes the athlete-tapping-Contact-on-own-profile UX bug (they no
// longer have to retype their own name/position/school every time) and includes
// the same sender context in the generate-letter edge function payload so the
// AI generation matches MAIN's quality.
import React, { useState, useCallback, useMemo } from 'react';
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
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';
import {
  deriveSenderProfile,
  extractRecipientSeed,
  DEFAULT_DRAFT,
  type LetterDraft,
  type LetterType,
  type SenderProfile,
} from '@/screens/shared/letterComposer.helpers';

export { deriveSenderProfile, extractRecipientSeed };
export type { LetterDraft, LetterType, SenderProfile };

export default function LetterComposerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, userRole } = useAuth();

  // Role-specific profile fetches. Each hook is conditionally-enabled internally
  // via react-query's `enabled: !!user`, so all four run cheaply and only the
  // matching one returns data.
  const { profile: playerProfile } = usePlayerProfile();
  const { data: coachProfile } = useCoachProfile();
  const { data: scoutProfile } = useScoutProfile();
  const { data: hsCoachProfile } = useHSCoachProfile();

  const senderProfile = useMemo(
    () =>
      deriveSenderProfile({
        userRole,
        userEmail: user?.email,
        playerProfile,
        coachProfile,
        scoutProfile,
        hsCoachProfile,
      }),
    [userRole, user?.email, playerProfile, coachProfile, scoutProfile, hsCoachProfile],
  );

  const [draft, setDraft] = useState<LetterDraft>(() => {
    const recipient = extractRecipientSeed(route.params?.seed);
    return {
      ...DEFAULT_DRAFT,
      ...(recipient.recipientName ? { recipientName: recipient.recipientName } : {}),
      ...(recipient.recipientRole ? { recipientRole: recipient.recipientRole } : {}),
      ...(recipient.schoolName ? { schoolName: recipient.schoolName } : {}),
      ...(recipient.letterType ? { letterType: recipient.letterType } : {}),
      ...(recipient.tone ? { tone: recipient.tone } : {}),
    };
  });
  const prefillAthleteId: string | undefined = extractRecipientSeed(route.params?.seed).prefillAthleteId;
  const [generated, setGenerated] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const setField = <K extends keyof LetterDraft>(key: K, value: LetterDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleGenerate = useCallback(async () => {
    if (!draft.recipientName.trim() || !draft.schoolName.trim()) {
      Alert.alert('Missing details', 'Recipient name and school are required.');
      return;
    }
    setIsGenerating(true);
    setGenerated('');
    try {
      // Invoke streaming edge function via fetch (Supabase client wraps non-streaming).
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${(supabase as any).supabaseUrl}/functions/v1/generate-letter`;
      // Payload includes senderProfile (MAIN parity — the generate-letter edge
      // function on MAIN accepts and uses the sender fields to personalize
      // the AI-generated letter).
      const payload = {
        ...draft,
        senderProfile: senderProfile ?? undefined,
      };
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`Edge function returned ${resp.status}`);

      const reader = (resp.body as any)?.getReader?.();
      if (!reader) {
        const text = await resp.text();
        setGenerated(text);
        return;
      }
      const decoder = new TextDecoder();
      let buffered = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });
        setGenerated(buffered);
      }
    } catch (e: any) {
      Alert.alert('Generation failed', e?.message ?? 'Unable to generate letter.');
    } finally {
      setIsGenerating(false);
    }
  }, [draft, senderProfile]);

  const handleSave = useCallback(async () => {
    if (!generated.trim() || !user) return;
    setIsSaving(true);
    try {
      await supabase.from('letters' as any).insert({
        user_id: user.id,
        coach_name: draft.recipientName,
        school_name: draft.schoolName,
        letter_type: draft.letterType,
        content: generated,
        subject: `${draft.letterType} letter`,
      });
      Alert.alert('Saved', 'Letter saved to your history.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unable to save letter.');
    } finally {
      setIsSaving(false);
    }
  }, [generated, user, draft, navigation]);

  const handleShare = useCallback(async () => {
    if (!generated.trim()) return;
    try {
      await Share.share({ message: generated });
    } catch {}
  }, [generated]);

  // "Sending as" header — MAIN parity for the read-only sender identity.
  const senderHeaderLine = useMemo(() => {
    if (!senderProfile) return null;
    const parts = [senderProfile.name, senderProfile.title || senderProfile.position, senderProfile.school]
      .filter((s): s is string => !!s && s.length > 0);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [senderProfile]);

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <View style={s.headerText}>
          <Text style={s.eyebrow}>COMPOSE</Text>
          <Text style={s.title}>Letter composer</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {senderHeaderLine ? (
          <Card style={s.card}>
            <Text style={s.eyebrow}>SENDING AS</Text>
            <Text style={s.senderLine} testID="sender-header-line">{senderHeaderLine}</Text>
          </Card>
        ) : null}

        <Card style={s.card}>
          <Text style={s.label}>Recipient</Text>
          <TextInput
            style={s.input}
            value={draft.recipientName}
            onChangeText={(v) => setField('recipientName', v)}
            placeholder="Head coach name"
            placeholderTextColor={colors.foregroundSubtle}
          />

          <Text style={s.label}>Role</Text>
          <TextInput
            style={s.input}
            value={draft.recipientRole}
            onChangeText={(v) => setField('recipientRole', v)}
            placeholder="e.g. Head Coach, Recruiting Coordinator"
            placeholderTextColor={colors.foregroundSubtle}
          />

          <Text style={s.label}>School / program</Text>
          <TextInput
            style={s.input}
            value={draft.schoolName}
            onChangeText={(v) => setField('schoolName', v)}
            placeholder="e.g. University of Southern California"
            placeholderTextColor={colors.foregroundSubtle}
          />

          <Text style={s.label}>Letter type</Text>
          <View style={s.chipRow}>
            {(['recruiting', 'intro', 'thank_you', 'update', 'endorsement'] as const).map((t) => (
              <Pressable key={t} onPress={() => setField('letterType', t)}>
                <Badge variant={draft.letterType === t ? 'secondary' : 'outline'}>{t}</Badge>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Tone</Text>
          <View style={s.chipRow}>
            {(['professional', 'warm', 'direct'] as const).map((t) => (
              <Pressable key={t} onPress={() => setField('tone', t)}>
                <Badge variant={draft.tone === t ? 'secondary' : 'outline'}>{t}</Badge>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Key points</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={draft.keyPoints}
            onChangeText={(v) => setField('keyPoints', v)}
            placeholder="Highlights, season stats, interests, questions…"
            placeholderTextColor={colors.foregroundSubtle}
            multiline
          />

          <Pressable
            onPress={handleGenerate}
            style={[s.primaryBtn, isGenerating && s.btnDisabled]}
            disabled={isGenerating}>
            {isGenerating ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.primaryBtnText}>Generate letter</Text>
            )}
          </Pressable>
        </Card>

        {!!generated && (
          <Card style={s.card}>
            <Text style={s.eyebrow}>DRAFT</Text>
            <Text style={s.letterBody}>{generated}</Text>
            <View style={s.actionRow}>
              <Pressable onPress={handleShare} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Share</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[s.primaryBtn, isSaving && s.btnDisabled]}
                disabled={isSaving}>
                <Text style={s.primaryBtnText}>{isSaving ? 'Saving…' : 'Save letter'}</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
  },
  senderLine: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.base,
    color: colors.foreground,
  },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  label: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.size.sm,
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minWidth: 140,
  },
  primaryBtnText: {
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.primaryForeground,
    fontSize: typography.size.base,
  },
  secondaryBtn: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minWidth: 120,
  },
  secondaryBtnText: {
    fontFamily: typography.fontFamily.bodyMedium,
    color: colors.foreground,
    fontSize: typography.size.base,
  },
  btnDisabled: { opacity: 0.6 },
  letterBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.base,
    color: colors.foreground,
    lineHeight: typography.lineHeight.normal * typography.size.base,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
});
