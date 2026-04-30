// CoachLettersScreen — RN port of Lovable src/pages/CoachLetters.tsx (130 LOC).
// Web→RN mapping: react-router-dom→@react-navigation/native; lucide-react→lucide-react-native;
// shadcn lowercase→PascalCase; Tailwind→StyleSheet via @/lib/theme; sonner→@/hooks/use-toast.
// Renders the LetterDashboard with the role-specific coach templates and persists history
// through the existing useCoachLetterHistory hook.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Loader2 } from 'lucide-react-native';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { useCoachLetterHistory } from '@/hooks/useCoachLetterHistory';
import { LetterDashboard } from '@/components/letters/LetterDashboard';
import { COACH_LETTER_TEMPLATES } from '@/components/letters/letterTemplates';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
export default function CoachLettersScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const routeParams = (route?.params || {}) as Record<string, any>;
  const prefillFromRoute = useMemo(() => ({
    recipientName: routeParams.recipientName,
    recipientEmail: routeParams.recipientEmail,
    recipientType: routeParams.recipientType,
    recipientCategory: routeParams.recipientCategory,
    organizationName: routeParams.organizationName,
    recipientTitle: routeParams.recipientTitle,
    letterType: routeParams.letterType,
  }), [routeParams]);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useCoachProfile();
  const { data: hsProfile, isFetched: hsFetched } = useHSCoachProfile();
  const { history, isLoading: historyLoading, addToHistory, deleteFromHistory } = useCoachLetterHistory();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const isClubCoach = !!(profile as any)?.is_club_coach;
  const isHSCoach = !!hsProfile;

  useEffect(() => {
    if (!profileFetched || !hsFetched) return;
    if (profile && (isClubCoach || isHSCoach)) {
      // Sibling tabs handle these roles; no-op redirect on RN — main navigator routes by role.
    }
  }, [profileFetched, hsFetched, profile, isClubCoach, isHSCoach]);

  const allLoading = authLoading || profileLoading || !profileFetched;

  const handleSendLetter = async (data: {
    recipientName: string; recipientEmail: string; recipientType: any; letterType: string;
    letterContent: string; athleteSchool?: string;
  }) => {
    setIsSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) throw new Error('You must be logged in to send letters');
      // PORT-PENDING: VITE_SUPABASE_URL → resolved via supabase client URL in app build config.
      // Lovable parity: central SUPABASE_FUNCTIONS_URL replaces fragile (supabase as any).supabaseUrl.
      const response = await fetch(SUPABASE_FUNCTIONS_URL + "/send-letter", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          to: data.recipientEmail,
          subject: `Message from Coach ${(profile as any)?.name} - ${(profile as any)?.school}`,
          letterContent: data.letterContent,
          athleteName: (profile as any)?.name,
          athleteEmail: (profile as any)?.email,
          athletePhone: (profile as any)?.phone,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send email');
      }
      await addToHistory({
        athlete_name: data.recipientName,
        athlete_email: data.recipientEmail,
        athlete_school: data.athleteSchool || null,
        letter_type: data.letterType,
        letter_content: data.letterContent,
        in_response_to_type: data.letterType.startsWith('response-')
          ? data.letterType.replace('response-to-', '')
          : null,
      } as any);
      toast({ title: `Letter sent to ${data.recipientEmail}!` });
    } catch (e: any) {
      toast({ title: e?.message ?? 'Failed to send email', variant: 'destructive' });
      throw e;
    } finally {
      setIsSending(false);
    }
  };

  if (allLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (!profile) return null;

  const mappedHistory = history.map((h: any) => ({
    id: h.id,
    athlete_name: h.athlete_name,
    athlete_email: h.athlete_email,
    athlete_school: h.athlete_school,
    letter_type: h.letter_type,
    letter_content: h.letter_content,
    in_response_to_type: h.in_response_to_type,
    sent_at: h.sent_at,
  }));

  const p = profile as any;

  return (
    <SafeAreaView style={s.root}>
      <Navbar />
      <View style={s.header}>
        <BackButton label="Back" />
        <Text style={s.headerTitle}>Coach Letters</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <LetterDashboard
          senderType="coach"
          senderProfile={{
            name: p.name,
            email: p.email,
            phone: p.phone || undefined,
            title: p.title,
            school: p.school,
            conference: p.conference,
            division: p.division,
            position_coached: p.position_coached,
            sport: p.sport,
            secondary_sports: p.secondary_sports,
          }}
          letterTypes={COACH_LETTER_TEMPLATES as any}
          history={mappedHistory as any}
          historyLoading={historyLoading}
          onSendLetter={handleSendLetter as any}
          onDeleteHistory={deleteFromHistory}
          isSending={isSending}
          pageTitle="Recruiting Letters"
          pageDescription="Generate AI-powered letters tailored to your contact — athletes, college coaches, scouts, or high school coaches."
          prefill={prefillFromRoute}
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
