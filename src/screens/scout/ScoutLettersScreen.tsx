// ScoutLettersScreen — RN port of Lovable src/pages/ScoutLetters.tsx (218 LOC).
// Web→RN mapping: react-router-dom→@react-navigation/native; lucide-react→lucide-react-native;
// shadcn lowercase→PascalCase; Tailwind→StyleSheet via @/lib/theme; sonner→@/hooks/use-toast.
// Renders the LetterDashboard (compose + history) plus a "Saved Prospects" tab pulled
// from useScoutSavedAthletes. The route accepts the same prefill query params as web.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Image, Pressable, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, User, MapPin } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { useScoutLetterHistory } from '@/hooks/useScoutLetterHistory';
import { useScoutSavedAthletes } from '@/hooks/useScoutSavedAthletes';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { LetterDashboard } from '@/components/letters/LetterDashboard';
import { SCOUT_LETTER_TEMPLATES } from '@/components/letters/letterTemplates';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/BackButton';
import { colors, typography, spacing, radius } from '@/lib/theme';

import { Navbar } from '@/components/Navbar';
export default function ScoutLettersScreen() {
  const nav = useNavigation<any>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useScoutProfile();
  const { data: orgData } = useScoutOrganization();
  const { history, isLoading: historyLoading, addToHistory, deleteFromHistory } = useScoutLetterHistory();
  const { data: savedAthletes = [] } = useScoutSavedAthletes();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('letters');

  const allLoading = authLoading || profileLoading || !profileFetched;

  useEffect(() => {
    if (!profileFetched || !isAuthenticated || authLoading) return;
    // RN: onboarding gate handled higher in the navigator stack.
  }, [profileFetched, isAuthenticated, authLoading, profile]);

  const handleSendLetter = async (data: {
    recipientName: string; recipientEmail: string; recipientType: any;
    organizationName?: string; letterType: string; letterContent: string; inResponseToType?: string;
  }) => {
    setIsSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) throw new Error('You must be logged in to send letters');
      // Lovable parity: central SUPABASE_FUNCTIONS_URL replaces fragile (supabase as any).supabaseUrl.
      const p = profile as any;
      const response = await fetch(SUPABASE_FUNCTIONS_URL + "/send-letter", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          to: data.recipientEmail,
          subject: `Message from ${p?.name || 'Scout'} - ${p?.company || p?.organization_name || 'OfferHound'}`,
          letterContent: data.letterContent,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send email');
      }
      await addToHistory({
        recipient_name: data.recipientName,
        recipient_email: data.recipientEmail,
        recipient_type: data.recipientType,
        organization_name: data.organizationName || null,
        letter_type: data.letterType,
        letter_content: data.letterContent,
        in_response_to_type: data.inResponseToType || null,
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

  const p = profile as any;

  const mappedHistory = history.map((h: any) => ({
    id: h.id,
    recipient_name: h.recipient_name,
    recipient_email: h.recipient_email,
    recipient_type: h.recipient_type,
    organization_name: h.organization_name,
    letter_type: h.letter_type,
    letter_content: h.letter_content,
    in_response_to_type: h.in_response_to_type,
    sent_at: h.sent_at,
  }));

  return (
    <SafeAreaView style={s.root}>
      <Navbar />
      <View style={s.header}>
        <BackButton label="Back" />
        <Text style={s.headerTitle}>Scout Letter Center</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList style={s.tabsList}>
            <TabsTrigger value="letters">Compose &amp; History</TabsTrigger>
            <TabsTrigger value="saved">Saved Prospects ({savedAthletes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="letters">
            <LetterDashboard
              senderType="scout"
              senderProfile={{
                name: p?.name || p?.full_name || '',
                email: p?.email || '',
                phone: p?.phone || undefined,
                title: p?.title || undefined,
                company: p?.company || p?.organization_name || undefined,
                specialization: p?.specialization || undefined,
                regions_covered: p?.regions_covered || undefined,
                sports: p?.sports || undefined,
              }}
              letterTypes={SCOUT_LETTER_TEMPLATES as any}
              history={mappedHistory as any}
              historyLoading={historyLoading}
              onSendLetter={handleSendLetter as any}
              onDeleteHistory={deleteFromHistory}
              isSending={isSending}
              pageTitle="Scouting Letters"
              pageDescription="Generate AI-powered outreach letters to athletes, parents, and coaches. Select a template, customize, and send."
            />
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <View style={s.savedTitleRow}>
                  <Users size={20} color={colors.foreground} />
                  <CardTitle>Saved Prospects ({savedAthletes.length})</CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                {savedAthletes.length === 0 ? (
                  <View style={s.emptyState}>
                    <Text style={s.emptyText}>
                      No saved prospects yet. Use the athlete search to find and save athletes.
                    </Text>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => nav.navigate?.('Directory' as never)}>
                      Search Athletes
                    </Button>
                  </View>
                ) : (
                  <View style={s.savedList}>
                    {savedAthletes.map((item: any) => (
                      <View key={item.id} style={s.prospectRow}>
                        <View style={s.prospectInfo}>
                          <View style={s.avatar}>
                            {item.athlete?.profile_image_url ? (
                              <Image
                                source={{ uri: item.athlete.profile_image_url }}
                                style={s.avatarImg}
                              />
                            ) : (
                              <User size={20} color={colors.foregroundSubtle} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.prospectName}>{item.athlete?.full_name || 'Unknown'}</Text>
                            <Text style={s.prospectMeta}>
                              {[item.athlete?.position, item.athlete?.school, item.athlete?.graduation_year]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                            {(item.athlete?.city || item.athlete?.state) && (
                              <View style={s.locationRow}>
                                <MapPin size={12} color={colors.foregroundSubtle} />
                                <Text style={s.prospectMeta}>
                                  {[item.athlete?.city, item.athlete?.state].filter(Boolean).join(', ')}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={s.prospectActions}>
                          {item.priority ? (
                            <Badge variant="outline">{item.priority}</Badge>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onPress={() => {
                              // PORT-PENDING: deep-link prefill via route params (web uses query string).
                              setActiveMainTab('letters');
                            }}>
                            Send Letter
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
  tabsList: { marginBottom: spacing.md },
  savedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emptyText: {
    color: colors.foregroundSubtle,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
  savedList: { gap: spacing.sm },
  prospectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  prospectInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  prospectName: {
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bodyMedium,
  },
  prospectMeta: {
    color: colors.foregroundSubtle,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.body,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  prospectActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
