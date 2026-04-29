// ClubCoachLettersScreen — RN port of Lovable src/pages/ClubCoachLetters.tsx (71 LOC).
// Web→RN mapping: react-router-dom→@react-navigation/native; lucide-react→lucide-react-native;
// shadcn lowercase→PascalCase; Tailwind→StyleSheet via @/lib/theme; sonner→@/hooks/use-toast.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useUnifiedLetterHistory } from '@/hooks/useUnifiedLetterHistory';
import { LetterDashboard } from '@/components/letters/LetterDashboard';
import { CLUB_COACH_LETTER_TEMPLATES } from '@/components/letters/letterTemplates';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing } from '@/lib/theme';

export default function ClubCoachLettersScreen() {
  const nav = useNavigation<any>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCoachProfile();
  const { history, isLoading: historyLoading, addToHistory, deleteFromHistory } =
    useUnifiedLetterHistory('club-coach');
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // RN auth gate handled at navigator level.
    }
  }, [authLoading, isAuthenticated]);

  const handleSendLetter = async (data: {
    recipientName: string; recipientEmail: string; recipientType: any;
    recipientCategory?: any; organizationName?: string; letterType: string; letterContent: string;
  }) => {
    setIsSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) throw new Error('You must be logged in');
      // Lovable parity: central SUPABASE_FUNCTIONS_URL replaces fragile (supabase as any).supabaseUrl.
      const response = await fetch(SUPABASE_FUNCTIONS_URL + "/send-letter", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          to: data.recipientEmail,
          subject: `Message from Coach ${(profile as any)?.name}`,
          letterContent: data.letterContent,
        }),
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to send');
      }
      await addToHistory({
        recipient_name: data.recipientName,
        recipient_email: data.recipientEmail,
        organization_name: data.organizationName,
        letter_type: data.letterType,
        letter_content: data.letterContent,
      } as any);
      toast({ title: `Letter sent to ${data.recipientEmail}` });
    } catch (e: any) {
      toast({ title: e?.message || 'Failed to send', variant: 'destructive' });
      throw e;
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!profile) return null;

  const p = profile as any;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <BackButton label="Back" />
        <Text style={s.headerTitle}>Club Coach Letters</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <LetterDashboard
          senderType={'club-coach' as any}
          senderProfile={{
            name: p.name,
            email: p.email,
            phone: p.phone || undefined,
            title: p.title,
            club_name: p.club_name || p.school,
            sport: p.sport,
          }}
          letterTypes={CLUB_COACH_LETTER_TEMPLATES as any}
          history={history.map((h: any) => ({
            ...h,
            recipient_name: h.athlete_name,
            recipient_email: h.athlete_email,
            organization_name: h.athlete_school,
          })) as any}
          historyLoading={historyLoading}
          onSendLetter={handleSendLetter as any}
          onDeleteHistory={deleteFromHistory}
          isSending={isSending}
          pageTitle="Club Coach Letters"
          pageDescription="AI-powered letters for athletes, parents, college coaches, scouts, HS coaches, and media."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.lg,
    color: colors.foregroundSubtle,
    letterSpacing: typography.letterSpacing.heading,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
});
