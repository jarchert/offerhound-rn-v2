import {useQuery} from '@tanstack/react-query';
import {useLocalDraft} from '@/hooks/useLocalDraft';
import {useSubscription} from '@/hooks/useSubscription';
import {KeyboardSafeBody} from '@/components/KeyboardSafeBody';
import {shortcutLetterSeed,shortcutLetterRequest,letterSenderTable,type ShortcutLetterDraft} from '@/lib/letterRequests';
// Shared shortcut composer: role-specific authenticated generation and local unsent drafts.
// Generation, sharing and sending remain separate actions.
import React, { useState, useCallback } from 'react';
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
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, typography, spacing, radius } from '@/lib/theme';

export default function LetterComposerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user,userRole } = useAuth();
  const {isSubscribed}=useSubscription();
  const initial=shortcutLetterSeed(route.params,userRole);
  const [draft,setDraft,draftError]=useLocalDraft<ShortcutLetterDraft>(user?.id,`shortcut-letter:${initial.recipientCategory}:${initial.recipientName}`,initial);
  const [generated,setGenerated,generatedError]=useLocalDraft(user?.id,`shortcut-letter-output:${initial.recipientCategory}:${initial.recipientName}`,'');
  const {data:senderProfile,isLoading:profileLoading,error:profileError}=useQuery({queryKey:['letter-sender',user?.id,userRole],enabled:!!user&&!!letterSenderTable(userRole),queryFn:async()=>{
    const {data,error}=await supabase.from(letterSenderTable(userRole)!).select('*').eq('user_id',user!.id).maybeSingle();if(error)throw error;return data;
  }});
  const [isGenerating, setIsGenerating] = useState(false);

  const setField = <K extends keyof ShortcutLetterDraft>(key: K, value: ShortcutLetterDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleGenerate = useCallback(async () => {
    if (!draft.recipientName.trim() || !draft.schoolName.trim()) {
      Alert.alert('Missing details', 'Recipient name and school are required.');
      return;
    }
    if(!user){Alert.alert('Sign in required','Sign in before generating a letter.');return;}
    if(userRole==='athlete'&&!isSubscribed){navigation.navigate('Pricing');return;}
    if(profileLoading||profileError||!senderProfile){Alert.alert('Sender profile unavailable','Your details could not be loaded. Please try again.');return;}
    setIsGenerating(true);
    try {
      const request=shortcutLetterRequest(userRole,senderProfile,draft);
      const {data,error}=await supabase.functions.invoke(request.functionName,{body:request.body});
      if(error)throw error;
      if(data?.error)throw Error(data.error);
      if(typeof data?.letter!=='string'||!data.letter.trim())throw Error('No letter returned.');
      setGenerated(data.letter);
    } catch (e:any) {
      Alert.alert('Generation failed',e?.message||'Unable to generate letter. Your draft is kept.');
    } finally {setIsGenerating(false);}
  },[draft,user,userRole,isSubscribed,senderProfile,profileLoading,profileError,navigation]);

  const handleShare = useCallback(async () => {
    if (!generated.trim()) return;
    try {
      await Share.share({ message: generated });
    } catch {}
  }, [generated]);

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

      {(draftError||generatedError)&&<Text accessibilityRole="alert" style={{color:colors.destructive,padding:12}}>Draft could not be saved on this device. Copy it before leaving.</Text>}
      <KeyboardSafeBody>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Card style={s.card}>
          <Text style={s.label}>Recipient</Text>
          <TextInput
            style={s.input}
            value={draft.recipientName}
            onChangeText={(v) => setField('recipientName', v)}
            placeholder="Recipient name"
            placeholderTextColor={colors.foregroundSubtle}
          />

          <Text style={s.label}>Recipient type</Text>
          <View style={s.chipRow}>{['athlete','parent','college-coach','club-coach','hs-coach','scout','influencer'].map(category=><Pressable key={category} accessibilityRole="button" accessibilityState={{selected:draft.recipientCategory===category}} onPress={()=>setField('recipientCategory',category)}><Badge variant={draft.recipientCategory===category?'secondary':'outline'}>{category}</Badge></Pressable>)}</View>
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
                onPress={() => Alert.alert(draftError||generatedError?'Draft could not be saved':'Draft kept on this device',draftError||generatedError?'Copy your letter before leaving.':'Your unsent letter is saved automatically on this device. It has not been sent.')}
                style={s.primaryBtn}>
                <Text style={s.primaryBtnText}>Keep local draft</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>
      </KeyboardSafeBody>
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
