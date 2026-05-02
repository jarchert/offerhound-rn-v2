// LettersScreen — 3-tab athlete letter management (Lovable parity).
// Tabs: Compose (letter type selector + AI generate paywall-gated), History (with delete), Scheduled (with cancel).
// Branch: parity/2026-04-29 | Commit: feat(letters): rebuild Athlete Letters 3-tab compose/history/scheduled
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useUnifiedLetterHistory } from '@/hooks/useUnifiedLetterHistory';
import { useScheduledLetters } from '@/hooks/useScheduledLetters';
import { useSubscription } from '@/hooks/useSubscription';
import { Navbar } from '@/components/Navbar';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { colors, typography, spacing, radius } from '@/lib/theme';

type LetterType = 'contact' | 'follow-up' | 'thank-you' | 'visit-request' | 'camp-request' | 'commitment' | 'freshman-intro' | 'sophomore-intro' | 'junior-intro';

interface LetterTemplate {
  type: LetterType;
  title: string;
  description: string;
}

const LETTER_TEMPLATES: LetterTemplate[] = [
  { type: 'contact', title: 'Initial Contact', description: 'First outreach to introduce yourself' },
  { type: 'follow-up', title: 'Follow-Up', description: 'Follow up on previous communication' },
  { type: 'visit-request', title: 'Visit Request', description: 'Request a campus visit opportunity' },
  { type: 'camp-request', title: 'Camp Request', description: 'Inquire about attending a camp' },
  { type: 'thank-you', title: 'Thank You', description: 'Express gratitude after a visit or meeting' },
  { type: 'commitment', title: 'Commitment', description: 'Announce your verbal commitment' },
  { type: 'freshman-intro', title: 'Freshman Intro', description: "Get on a coach's radar early" },
  { type: 'sophomore-intro', title: 'Sophomore Intro', description: 'Build on your development' },
  { type: 'junior-intro', title: 'Junior Intro', description: 'Prime recruiting time showcase' },
];

export default function LettersScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const { history: letters = [], isLoading: isHistoryLoading, deleteFromHistory } = useUnifiedLetterHistory('athlete');
  const { scheduledLetters, isLoading: isScheduledLoading, cancelScheduledLetter } = useScheduledLetters();
  const { isSubscribed } = useSubscription();

  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'scheduled'>('compose');

  // Compose tab state
  const [selectedType, setSelectedType] = useState<LetterType>('contact');
  const [coachName, setCoachName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [generated, setGenerated] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Scheduled tab state - date/time as strings (no native picker dependency)
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  const handleGenerate = useCallback(async () => {
    if (!isSubscribed) {
      Alert.alert(
        'Pro Feature',
        'AI letter generation requires a Pro subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Pricing' as any) },
        ],
      );
      return;
    }
    if (!coachName.trim() || !schoolName.trim()) {
      Alert.alert('Missing details', 'Coach name and school are required to generate.');
      return;
    }
    setIsGenerating(true);
    setGenerated('');
    try {
      const athleteProfile = profile ? {
        name: (profile as any).full_name,
        position: (profile as any).position,
        height: (profile as any).height,
        weight: (profile as any).weight,
        classYear: (profile as any).graduation_year,
        gpa: (profile as any).gpa,
        highSchool: (profile as any).school,
        city: (profile as any).city,
        state: (profile as any).state,
        email: (profile as any).email,
        phone: (profile as any).phone,
        highlights: (profile as any).highlights || [],
      } : null;
      const resp = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-letter`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          letterType: selectedType,
          coachName: coachName || undefined,
          schoolName: schoolName || undefined,
          athleteProfile,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error((errBody as any)?.error || `Edge function returned ${resp.status}`);
      }
      const data = await resp.json().catch(() => ({}));
      if ((data as any).letter) {
        setGenerated((data as any).letter);
      } else {
        throw new Error('No letter returned');
      }
    } catch (e: any) {
      Alert.alert('Generation failed', e?.message ?? 'Unable to generate letter.');
    } finally {
      setIsGenerating(false);
    }
  }, [isSubscribed, coachName, schoolName, selectedType, profile, navigation]);

  const handleSave = useCallback(async () => {
    if (!generated.trim() || !user) return;
    setIsSaving(true);
    try {
      await supabase.from('letters' as any).insert({
        user_id: user.id,
        coach_name: coachName,
        school_name: schoolName,
        letter_type: selectedType,
        content: generated,
        subject: `${selectedType} letter to ${coachName}`,
      });
      Alert.alert('Saved', 'Letter saved to your history.');
      setGenerated('');
      setCoachName('');
      setSchoolName('');
      setKeyPoints('');
      setActiveTab('history');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unable to save letter.');
    } finally {
      setIsSaving(false);
    }
  }, [generated, user, coachName, schoolName, selectedType]);

  const handleShare = useCallback(async () => {
    if (!generated.trim()) return;
    try { await Share.share({ message: generated }); } catch {}
  }, [generated]);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('Delete letter', 'Remove this letter from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFromHistory(id) },
    ]);
  }, [deleteFromHistory]);

  const handleCancelScheduled = useCallback((id: string) => {
    Alert.alert('Cancel scheduled letter', 'Cancel this scheduled send?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Send', style: 'destructive', onPress: () => cancelScheduledLetter(id) },
    ]);
  }, [cancelScheduledLetter]);

  return (
    <SafeAreaView style={s.container}>
      <Navbar />
      <View style={s.header}>
        <BackButton />
        <View style={s.headerText}>
          <Text style={s.eyebrow}>LETTERS</Text>
          <Text style={s.title}>Letter Management</Text>
        </View>
      </View>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} style={s.tabs}>
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History {letters.length > 0 ? `(${letters.length})` : ''}</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled {scheduledLetters.length > 0 ? `(${scheduledLetters.length})` : ''}</TabsTrigger>
        </TabsList>


        {/* COMPOSE TAB */}
        <TabsContent value="compose">
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Card style={s.card}>
              <Text style={s.sectionTitle}>Letter Type</Text>
              <View style={s.templateGrid}>
                {LETTER_TEMPLATES.map((tmpl) => (
                  <Pressable
                    key={tmpl.type}
                    onPress={() => setSelectedType(tmpl.type)}
                    style={[s.templateCard, selectedType === tmpl.type && s.templateCardActive]}>
                    <Text style={[s.templateTitle, selectedType === tmpl.type && s.templateTitleActive]}>
                      {tmpl.title}
                    </Text>
                    <Text style={s.templateDesc} numberOfLines={2}>{tmpl.description}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            <Card style={s.card}>
              <Text style={s.sectionTitle}>Personalize</Text>
              <Text style={s.label}>Coach Name</Text>
              <TextInput
                style={s.input}
                value={coachName}
                onChangeText={setCoachName}
                placeholder="e.g., Coach Smith"
                placeholderTextColor={colors.foregroundSubtle}
              />
              <Text style={s.label}>School / Program</Text>
              <TextInput
                style={s.input}
                value={schoolName}
                onChangeText={setSchoolName}
                placeholder="e.g., University of Texas"
                placeholderTextColor={colors.foregroundSubtle}
              />
              <Text style={s.label}>Key Points (optional)</Text>
              <TextInput
                style={[s.input, s.textarea]}
                value={keyPoints}
                onChangeText={setKeyPoints}
                placeholder="Season stats, highlights, questions…"
                placeholderTextColor={colors.foregroundSubtle}
                multiline
              />

              {/* AI Generate button — paywall-gated */}
              {isSubscribed ? (
                <Pressable
                  onPress={handleGenerate}
                  style={[s.primaryBtn, isGenerating && s.btnDisabled]}
                  disabled={isGenerating}>
                  {isGenerating ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={s.primaryBtnText}>✦  AI Generate</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => navigation.navigate('Pricing' as any)}
                  style={s.paywallBtn}>
                  <Text style={s.paywallBtnText}>🔒  AI Generate  </Text>
                  <View style={s.crownBadge}>
                    <Text style={s.crownText}>PRO</Text>
                  </View>
                </Pressable>
              )}
            </Card>


            {!!generated && (
              <Card style={s.card}>
                <Text style={s.eyebrow}>DRAFT PREVIEW</Text>
                <Text style={s.letterBody}>{generated}</Text>
                <View style={s.actionRow}>
                  <Pressable onPress={handleShare} style={s.secondaryBtn}>
                    <Text style={s.secondaryBtnText}>Share</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    style={[s.primaryBtn, isSaving && s.btnDisabled]}
                    disabled={isSaving}>
                    <Text style={s.primaryBtnText}>{isSaving ? 'Saving…' : 'Save to History'}</Text>
                  </Pressable>
                </View>
              </Card>
            )}
          </ScrollView>
        </TabsContent>


        {/* HISTORY TAB */}
        <TabsContent value="history">
          {isHistoryLoading ? (
            <View style={s.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={letters as any[]}
              keyExtractor={(l) => l.id}
              contentContainerStyle={s.list}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Text style={s.emptyIcon}>✉</Text>
                  <Text style={s.emptyTitle}>No letters yet</Text>
                  <Text style={s.emptyText}>Compose your first letter from the Compose tab or coach directory.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Card style={s.historyCard}>
                  <View style={s.cardHeader}>
                    <View style={s.cardInfo}>
                      <Text style={s.coachName}>{item.coach_name ?? item.athlete_name ?? 'Unknown recipient'}</Text>
                      {(item.letter_type || item.in_response_to_type) && (
                        <Badge variant="outline">{item.letter_type ?? item.in_response_to_type}</Badge>
                      )}
                    </View>
                    <Pressable onPress={() => handleDelete(item.id)} style={s.deleteBtn}>
                      <Text style={s.deleteBtnText}>✕</Text>
                    </Pressable>
                  </View>
                  {(item.school_name || item.athlete_school) && (
                    <Text style={s.school}>{item.school_name ?? item.athlete_school}</Text>
                  )}
                  {item.letter_content && (
                    <Text style={s.preview} numberOfLines={2}>{item.letter_content}</Text>
                  )}
                  <Text style={s.date}>
                    {new Date(item.sent_at || item.created_at).toLocaleDateString()}
                  </Text>
                </Card>
              )}
            />
          )}
        </TabsContent>


        {/* SCHEDULED TAB */}
        <TabsContent value="scheduled">
          {isScheduledLoading ? (
            <View style={s.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={scheduledLetters as any[]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.list}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Text style={s.emptyIcon}>📅</Text>
                  <Text style={s.emptyTitle}>No scheduled letters</Text>
                  <Text style={s.emptyText}>Schedule a letter from the Compose tab to send it at a future time.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Card style={s.historyCard}>
                  <View style={s.cardHeader}>
                    <View style={s.cardInfo}>
                      <Text style={s.coachName}>{item.coach_name ?? 'Unknown recipient'}</Text>
                      {item.letter_type && (
                        <Badge variant="outline">{item.letter_type}</Badge>
                      )}
                    </View>
                    <Pressable onPress={() => handleCancelScheduled(item.id)} style={[s.deleteBtn, s.cancelBtn]}>
                      <Text style={s.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                  {item.school_name && <Text style={s.school}>{item.school_name}</Text>}
                  {item.scheduled_for && (
                    <View style={s.scheduledTimeRow}>
                      <Text style={s.scheduledTimeLabel}>📅  Scheduled: </Text>
                      <Text style={s.scheduledTime}>
                        {new Date(item.scheduled_for).toLocaleDateString()} at{' '}
                        {new Date(item.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}
                </Card>
              )}
            />
          )}
        </TabsContent>
      </Tabs>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  headerText: { flex: 1 },
  eyebrow: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 2, color: colors.primary, marginBottom: 2 },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize["2xl"] || 24, color: colors.foreground, letterSpacing: typography.letterSpacing?.heading ?? 0.5 },
  tabs: { flex: 1 },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  list: { padding: spacing.md, gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: 40 },
  card: { padding: spacing.md, gap: spacing.sm, marginBottom: 0 },
  historyCard: { padding: spacing.md, gap: 4, marginBottom: 0 },
  sectionTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, marginBottom: spacing.xs },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  templateCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, width: "48%" },
  templateCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + "1a" },
  templateTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  templateTitleActive: { color: colors.primary },
  templateDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  label: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground, marginTop: spacing.sm },
  input: { backgroundColor: colors.muted, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.md },
  primaryBtnText: { fontFamily: typography.fontFamily.bodyBold, color: colors.primaryForeground, fontSize: typography.fontSize.base },
  secondaryBtn: { backgroundColor: colors.muted, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.md, flex: 1 },
  secondaryBtnText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.fontSize.base },
  paywallBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.primary + "4d", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  paywallBtnText: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.fontSize.base },
  crownBadge: { backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  crownText: { fontFamily: typography.fontFamily.bodyBold, fontSize: 10, color: colors.primaryForeground },
  btnDisabled: { opacity: 0.6 },
  letterBody: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.foreground, lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  emptyText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  coachName: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground },
  school: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  preview: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground, fontStyle: "italic", marginTop: 2 },
  date: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: spacing.xs },
  deleteBtn: { padding: spacing.xs, borderRadius: radius.sm },
  deleteBtnText: { color: colors.destructive, fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base },
  cancelBtn: { backgroundColor: colors.muted, paddingHorizontal: spacing.sm },
  cancelBtnText: { color: colors.destructive, fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm },
  scheduledTimeRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
  scheduledTimeLabel: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  scheduledTime: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.primary },
});
