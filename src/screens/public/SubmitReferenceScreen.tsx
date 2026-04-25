// Ported from Lovable web src/pages/SubmitReference.tsx (50 LOC).
// Web → RN translation:
//   - useSearchParams → route.params.token
//   - sonner toast → react-native-toast-message via @/components/ui/toast
//   - lucide-react → lucide-react-native
//   - <Card>/<Button>/<Textarea>/<Label> mapped to RN @/components/ui
//   - SEO is a no-op shim (RN has no <head>); kept for parity.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { CheckCircle } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
  toast,
} from '@/components/ui';
import { colors, typography, spacing } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'SubmitReference'>;

export default function SubmitReferenceScreen() {
  const { params } = useRoute<R>();
  const token = params?.token || '';
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    reference_text: '',
    performance_assessment: '',
    character_assessment: '',
  });

  const handleSubmit = async () => {
    if (!token) {
      toast.error('Invalid reference link.');
      return;
    }
    setLoading(true);
    try {
      const { data: ref } = await supabase
        .from('coach_references')
        .select('id')
        .eq('invitation_token', token)
        .maybeSingle();
      if (!ref) throw new Error('Reference not found');
      await supabase
        .from('coach_references')
        .update({
          ...form,
          submitted_at: new Date().toISOString(),
          invitation_status: 'completed',
        } as any)
        .eq('id', (ref as any).id);
      setSubmitted(true);
      toast.success('Reference submitted!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit reference');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={s.centered}>
        <CheckCircle size={64} color={colors.success ?? '#22c55e'} />
        <Text style={s.thanksTitle}>Thank You!</Text>
        <Text style={s.thanksDesc}>Your reference has been submitted.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <SEO title="Submit Reference - OfferHound" description="Submit a coach reference for an athlete." />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton label="Back" />
        <Card style={s.card}>
          <CardHeader>
            <CardTitle>Submit Reference</CardTitle>
            <CardDescription>
              Your honest assessment helps athletes in their recruiting journey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View style={s.field}>
              <Label>Reference</Label>
              <Textarea
                value={form.reference_text}
                onChangeText={(v) => setForm((f) => ({ ...f, reference_text: v }))}
                rows={4}
                placeholder="Share your assessment..."
              />
            </View>
            <View style={s.field}>
              <Label>Performance</Label>
              <Textarea
                value={form.performance_assessment}
                onChangeText={(v) => setForm((f) => ({ ...f, performance_assessment: v }))}
                rows={3}
              />
            </View>
            <View style={s.field}>
              <Label>Character</Label>
              <Textarea
                value={form.character_assessment}
                onChangeText={(v) => setForm((f) => ({ ...f, character_assessment: v }))}
                rows={3}
              />
            </View>
            <Button
              onPress={handleSubmit}
              disabled={loading || !form.reference_text}
              style={s.submit}>
              {loading ? 'Submitting...' : 'Submit Reference'}
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
      <Footer />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  thanksTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: 24,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  thanksDesc: { color: colors.mutedForeground, marginTop: spacing.sm },
  card: { marginTop: spacing.lg },
  field: { marginBottom: spacing.md },
  submit: { marginTop: spacing.sm },
});
