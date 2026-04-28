// LettersScreen — RN port of Lovable src/pages/Letters.tsx.
// Athlete-facing letter composer: template picker, coach targeting, AI generation,
// send via Supabase function, history list, and subscription paywall gate.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {
  FileText,
  Sparkles,
  Send,
  Lock,
  Crown,
  History as HistoryIcon,
  Edit3,
  ChevronDown,
  ChevronUp,
  Mail,
} from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useUnifiedLetterHistory } from '@/hooks/useUnifiedLetterHistory';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing, radius } from '@/lib/theme';

// ---------------------------------------------------------------------------
// Letter template config (mirrors Lovable letterTemplates).
// ---------------------------------------------------------------------------
type LetterType =
  | 'contact'
  | 'follow-up'
  | 'visit'
  | 'visit-request'
  | 'camp-request'
  | 'thank-you'
  | 'commitment'
  | 'freshman-intro'
  | 'sophomore-intro'
  | 'junior-intro';

interface Template {
  type: LetterType;
  title: string;
  description: string;
}

const TEMPLATES: Template[] = [
  { type: 'contact', title: 'Initial Contact', description: 'First outreach to a coach' },
  { type: 'follow-up', title: 'Follow-Up', description: 'Follow up on previous communication' },
  { type: 'visit', title: 'Visit Agreement', description: 'Confirm a campus visit' },
  { type: 'visit-request', title: 'Visit Request', description: 'Request a campus visit' },
  { type: 'camp-request', title: 'Camp Request', description: 'Inquire about camps' },
  { type: 'thank-you', title: 'Thank You', description: 'Thank a coach after a meeting' },
  { type: 'commitment', title: 'Commitment', description: 'Announce your verbal commitment' },
  { type: 'freshman-intro', title: 'Freshman Intro', description: 'Introduce yourself early' },
  { type: 'sophomore-intro', title: 'Sophomore Intro', description: 'Build the recruiting conversation' },
  { type: 'junior-intro', title: 'Junior Intro', description: 'Prime recruiting time' },
];

function buildLocalLetter(
  type: LetterType,
  coachName: string,
  schoolName: string,
  athlete: { name: string; position: string; classYear: string; highSchool: string; city: string; state: string; gpa: string; height: string; weight: string },
): string {
  const cn = coachName || '[Coach Name]';
  const sn = schoolName || '[School Name]';
  const stats = `\n\nAthletic Profile:\n• Position: ${athlete.position}\n• Height: ${athlete.height}\n• Weight: ${athlete.weight}\n• Class of ${athlete.classYear}\n• GPA: ${athlete.gpa}`;
  const sign = `\n\nRespectfully,\n${athlete.name}\n${athlete.highSchool} - Class of ${athlete.classYear}`;
  switch (type) {
    case 'contact':
      return `Dear ${cn},\n\nMy name is ${athlete.name}, and I am a ${athlete.position} at ${athlete.highSchool} in ${athlete.city}, ${athlete.state}. I am reaching out to express my strong interest in the program at ${sn}.${stats}${sign}`;
    case 'follow-up':
      return `Dear ${cn},\n\nI hope this finds you well. I wanted to follow up on my previous correspondence regarding my interest in the program at ${sn}.${stats}${sign}`;
    case 'visit':
      return `Dear ${cn},\n\nThank you for the opportunity to visit ${sn}. I am excited to confirm my interest in attending a campus visit.${stats}${sign}`;
    case 'visit-request':
      return `Dear ${cn},\n\nI am writing to respectfully request the opportunity to visit ${sn} and learn more about your program.${stats}${sign}`;
    case 'camp-request':
      return `Dear ${cn},\n\nI am writing to inquire about upcoming camps at ${sn}.${stats}${sign}`;
    case 'thank-you':
      return `Dear ${cn},\n\nI wanted to express my sincere gratitude for the opportunity to visit ${sn}.${stats}${sign}`;
    case 'commitment':
      return `Dear ${cn},\n\nI am excited and honored to announce my verbal commitment to ${sn}.${stats}${sign}`;
    case 'freshman-intro':
      return `Dear ${cn},\n\nMy name is ${athlete.name}, a freshman ${athlete.position} at ${athlete.highSchool} in ${athlete.city}, ${athlete.state}. I wanted to introduce myself early and get on your radar.${stats}${sign}`;
    case 'sophomore-intro':
      return `Dear ${cn},\n\nMy name is ${athlete.name}, a sophomore ${athlete.position} at ${athlete.highSchool} in ${athlete.city}, ${athlete.state}.${stats}${sign}`;
    case 'junior-intro':
      return `Dear ${cn},\n\nMy name is ${athlete.name}, a junior ${athlete.position} at ${athlete.highSchool} in ${athlete.city}, ${athlete.state}. I wanted to formally express my serious interest in the program at ${sn}.${stats}${sign}`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function LettersScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = usePlayerProfile();
  const { isSubscribed, isLoading: isSubLoading } = useSubscription();
  const { history, isLoading: isHistoryLoading, addToHistory, refetch } = useUnifiedLetterHistory('athlete');

  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const [selectedType, setSelectedType] = useState<LetterType>('contact');
  const [coachName, setCoachName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [coachEmail, setCoachEmail] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const athleteData = useMemo(
    () => ({
      name: profile?.full_name || 'Athlete',
      position: profile?.position || 'Position',
      height: (profile as any)?.height || 'N/A',
      weight: (profile as any)?.weight || 'N/A',
      classYear: profile?.graduation_year?.toString() || '20XX',
      gpa: (profile as any)?.gpa?.toString() || 'N/A',
      highSchool: (profile as any)?.school || 'High School',
      city: (profile as any)?.city || 'City',
      state: (profile as any)?.state || 'State',
      email: (profile as any)?.email || '',
      phone: (profile as any)?.phone || '',
    }),
    [profile],
  );

  // Re-generate template letter whenever inputs/profile change.
  useEffect(() => {
    setLetterContent(buildLocalLetter(selectedType, coachName, schoolName, athleteData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, athleteData.name, athleteData.position]);

  const handleTypeChange = (type: LetterType) => {
    setSelectedType(type);
    setLetterContent(buildLocalLetter(type, coachName, schoolName, athleteData));
  };

  const handleUpdateLetter = () => {
    setLetterContent(buildLocalLetter(selectedType, coachName, schoolName, athleteData));
    Toast.show({ type: 'success', text1: 'Letter refreshed' });
  };

  const handleAIGenerate = async () => {
    if (!isSubscribed) {
      nav.navigate('Pricing');
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-letter', {
        body: {
          letterType: selectedType,
          coachName: coachName || undefined,
          schoolName: schoolName || undefined,
          athleteProfile: athleteData,
        },
      });
      if (error) throw error;
      if ((data as any)?.letter) {
        setLetterContent((data as any).letter);
        Toast.show({ type: 'success', text1: 'AI-generated letter ready!' });
      } else {
        throw new Error('No letter returned');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to generate', text2: err?.message ?? '' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!coachEmail) {
      Toast.show({ type: 'error', text1: "Coach email required" });
      return;
    }
    if (!letterContent.trim()) {
      Toast.show({ type: 'error', text1: 'Letter content is empty' });
      return;
    }
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please sign in' });
      return;
    }
    setIsSending(true);
    try {
      const subject = `Recruiting Interest - ${athleteData.name} (${athleteData.position}, Class of ${athleteData.classYear})`;
      const { error } = await supabase.functions.invoke('send-letter', {
        body: {
          to: coachEmail,
          subject,
          letterContent,
          athleteName: athleteData.name,
          athleteEmail: athleteData.email,
          athletePhone: athleteData.phone,
        },
      });
      if (error) throw error;
      await addToHistory({
        recipient_name: coachName || 'Coach',
        recipient_email: coachEmail,
        organization_name: schoolName || null,
        letter_type: selectedType,
        letter_content: letterContent,
      });
      Toast.show({ type: 'success', text1: `Email sent to ${coachEmail}!` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to send', text2: err?.message ?? '' });
    } finally {
      setIsSending(false);
    }
  };

  const onRefresh = useCallback(() => {
    refetch?.();
  }, [refetch]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const renderHeader = () => (
    <View style={s.headerWrap}>
      <BackButton />
      <Text style={s.title}>Letter Management</Text>
      <Text style={s.subtitle}>Create, customize, and send recruiting letters to coaches.</Text>

      <View style={s.tabRow}>
        <Pressable onPress={() => setTab('compose')} style={[s.tab, tab === 'compose' && s.tabActive]}>
          <Edit3 size={16} color={tab === 'compose' ? colors.primaryForeground : colors.foreground} />
          <Text style={[s.tabText, tab === 'compose' && s.tabTextActive]}>Compose</Text>
        </Pressable>
        <Pressable onPress={() => setTab('history')} style={[s.tab, tab === 'history' && s.tabActive]}>
          <HistoryIcon size={16} color={tab === 'history' ? colors.primaryForeground : colors.foreground} />
          <Text style={[s.tabText, tab === 'history' && s.tabTextActive]}>
            History {history.length > 0 ? `(${history.length})` : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPaywall = () => {
    if (isSubLoading || isSubscribed) return null;
    return (
      <Card style={s.paywall}>
        <CardHeader>
          <View style={s.paywallTitleRow}>
            <Crown size={20} color={colors.primary} />
            <CardTitle>Upgrade to Pro</CardTitle>
          </View>
          <CardDescription>
            Unlock AI-generated letters tailored to your profile and each coach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onPress={() => nav.navigate('Pricing')} variant="hero">
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderTemplatePicker = () => (
    <Card>
      <CardHeader>
        <View style={s.cardTitleRow}>
          <FileText size={18} color={colors.primary} />
          <CardTitle>Letter Templates</CardTitle>
        </View>
        <CardDescription>Pick a template to start composing</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.templateScroll}>
          {TEMPLATES.map((t) => {
            const active = selectedType === t.type;
            return (
              <Pressable
                key={t.type}
                onPress={() => handleTypeChange(t.type)}
                style={[s.templateCard, active && s.templateCardActive]}
              >
                <Text style={[s.templateTitle, active && s.templateTitleActive]}>{t.title}</Text>
                <Text style={s.templateDesc} numberOfLines={2}>
                  {t.description}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </CardContent>
    </Card>
  );

  const renderTargetingForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>Personalize Letter</CardTitle>
        <CardDescription>Add coach and school details</CardDescription>
      </CardHeader>
      <CardContent>
        <View style={{ gap: spacing.sm }}>
          <Input label="Coach Name" placeholder="e.g., Coach Smith" value={coachName} onChangeText={setCoachName} />
          <Input label="School Name" placeholder="e.g., University of Texas" value={schoolName} onChangeText={setSchoolName} />
          <Input
            label="Coach Email"
            placeholder="coach@university.edu"
            value={coachEmail}
            onChangeText={setCoachEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={s.row}>
            <Button variant="outline" onPress={handleUpdateLetter} style={{ flex: 1 }}>
              Refresh Template
            </Button>
            {isSubscribed ? (
              <Button
                onPress={handleAIGenerate}
                disabled={isGenerating}
                style={{ flex: 1 }}
                leftIcon={
                  isGenerating ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Sparkles size={16} color={colors.primaryForeground} />
                  )
                }
              >
                {isGenerating ? 'Generating...' : 'AI Generate'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onPress={() => nav.navigate('Pricing')}
                style={{ flex: 1 }}
                leftIcon={<Lock size={16} color={colors.foreground} />}
                rightIcon={<Crown size={14} color={colors.primary} />}
              >
                AI Generate
              </Button>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );

  const renderEditor = () => (
    <Card>
      <CardHeader>
        <CardTitle>Letter Preview</CardTitle>
        <CardDescription>{TEMPLATES.find((t) => t.type === selectedType)?.title}</CardDescription>
      </CardHeader>
      <CardContent>
        <View style={s.editorWrap}>
          <Input
            multiline
            value={letterContent}
            onChangeText={setLetterContent}
            placeholder="Letter content..."
            style={s.editor}
          />
        </View>
        <Button
          onPress={handleSend}
          disabled={isSending || !coachEmail}
          style={{ marginTop: spacing.md }}
          leftIcon={
            isSending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Send size={16} color={colors.primaryForeground} />
            )
          }
        >
          {isSending ? 'Sending...' : 'Send to Coach'}
        </Button>
      </CardContent>
    </Card>
  );

  const renderComposeBody = () => (
    <View style={{ gap: spacing.md, padding: spacing.md }}>
      {renderPaywall()}
      {renderTemplatePicker()}
      {renderTargetingForm()}
      {renderEditor()}
    </View>
  );

  const renderHistoryItem = ({ item }: { item: any }) => {
    const expanded = expandedId === item.id;
    return (
      <Pressable onPress={() => setExpandedId(expanded ? null : item.id)} style={s.historyRow}>
        <View style={s.historyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.historyCoach}>{item.athlete_name || item.recipient_name || 'Coach'}</Text>
            {!!(item.athlete_school || item.organization_name) && (
              <Text style={s.historySchool}>{item.athlete_school || item.organization_name}</Text>
            )}
            <Text style={s.historyDate}>
              {item.sent_at ? new Date(item.sent_at).toLocaleDateString() : ''}
            </Text>
          </View>
          <View style={s.historyMeta}>
            {item.letter_type && <Badge variant="outline">{String(item.letter_type)}</Badge>}
            {expanded ? (
              <ChevronUp size={16} color={colors.mutedForeground} />
            ) : (
              <ChevronDown size={16} color={colors.mutedForeground} />
            )}
          </View>
        </View>
        {expanded && !!item.letter_content && (
          <Text style={s.historyBody}>{item.letter_content}</Text>
        )}
      </Pressable>
    );
  };

  const renderHistoryEmpty = () => (
    <View style={s.empty}>
      <Mail size={36} color={colors.mutedForeground} />
      <Text style={s.emptyText}>No letters sent yet.</Text>
      <Text style={s.emptySub}>Compose your first one from the Compose tab.</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {tab === 'compose' ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xxl }}>
            {renderHeader()}
            {renderComposeBody()}
          </ScrollView>
        ) : (
          <FlatList
            ListHeaderComponent={renderHeader}
            data={history as any[]}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl }}
            ListEmptyComponent={renderHistoryEmpty}
            refreshControl={
              <RefreshControl
                refreshing={!!isHistoryLoading}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  headerWrap: { padding: spacing.md, gap: spacing.xs },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },

  tabRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  tabTextActive: { color: colors.primaryForeground },

  paywall: { borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.cardLow },
  paywallTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  templateScroll: { gap: spacing.sm, paddingRight: spacing.md },
  templateCard: {
    width: 200,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardLow,
    gap: 4,
  },
  templateCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(231,175,8,0.08)',
  },
  templateTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  templateTitleActive: { color: colors.primary },
  templateDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },

  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },

  editorWrap: { borderRadius: radius.md, overflow: 'hidden' },
  editor: { minHeight: 320, textAlignVertical: 'top', fontFamily: typography.fontFamily.body },

  historyRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  historyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  historyMeta: { alignItems: 'flex-end', gap: spacing.xs },
  historyCoach: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  historySchool: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  historyDate: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  historyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },
  emptyText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  emptySub: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});
