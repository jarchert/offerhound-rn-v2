// Ported from Lovable web src/pages/SubmitTestimonial.tsx (52 LOC).
// Web → RN translation:
//   - useSearchParams → route.params.profile
//   - sonner toast → react-native-toast-message via @/components/ui/toast
//   - lucide-react → lucide-react-native
//   - <Card>/<Button>/<Input>/<Textarea>/<Label> mapped to RN @/components/ui
//   - SEO is a no-op shim (RN has no <head>); kept for parity.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { CheckCircle } from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BackButton } from '@/components/BackButton';
import { Footer } from '@/components/Footer';
import SEO from '@/components/SEO';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  toast,
} from '@/components/ui';
import { colors, typography, spacing } from '@/lib/theme';
import type { PublicProfileStackParamList } from '@/navigation/stacks/PublicProfileStack';

type R = RouteProp<PublicProfileStackParamList, 'SubmitTestimonial'>;

export default function SubmitTestimonialScreen() {
  const { params } = useRoute<R>();
  const profileId = params?.profile || '';
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    testimonial_text: '',
    leadership_score: 8, work_ethic_score: 8, coachability_score: 8, teamwork_score: 8, integrity_score: 8,
  });

  const handleSubmit = async () => {
    if (!user || !profileId) {
      toast.error('Missing required information.');
      return;
    }
    setLoading(true);
    try {
      const scoreKeys=['leadership_score','work_ethic_score','coachability_score','teamwork_score','integrity_score'] as const;
      if(form.testimonial_text.trim().length<30||scoreKeys.some(k=>!Number.isInteger(form[k])||form[k]<1||form[k]>10))
        throw Error('Enter at least 30 characters and five whole-number scores from 1 to 10.');
      const {data,error}=await supabase.from('athlete_testimonials').insert({
        athlete_profile_id:profileId,author_user_id:user.id,
        // Server derives the signed-in author's identity and authority.
        author_name:'',author_role:'',...form,testimonial_text:form.testimonial_text.trim(),
      }).select('id,athlete_profile_id,author_user_id,author_name,author_role').single();
      if(error)throw error;
      if(!data?.id||data.athlete_profile_id!==profileId||data.author_user_id!==user.id||!data.author_name||!data.author_role)
        throw Error('Testimonial was not confirmed. Your text has been kept; refresh before retrying.');
      setSubmitted(true);
      toast.success('Testimonial submitted!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit testimonial');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={s.centered}>
        <CheckCircle size={64} color={colors.success ?? '#22c55e'} />
        <Text style={s.thanksTitle}>Thank You!</Text>
        <Text style={s.thanksDesc}>Your testimonial has been submitted.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <SEO title="Submit Testimonial - OfferHound" description="Submit a character testimonial for an athlete." />
      <ScrollView contentContainerStyle={s.scroll}>
        <BackButton label="Back" />
        <Card style={s.card}>
          <CardHeader>
            <CardTitle>Submit Character Testimonial</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={s.thanksDesc}>Your verified coaching or recruiting identity is recorded by OfferHound. Only authorized reviewers can submit an endorsement.</Text>
            <View style={s.field}>
              <Label>Testimonial *</Label>
              <Textarea
                value={form.testimonial_text}
                onChangeText={(v) => setForm((f) => ({ ...f, testimonial_text: v }))}
                editable={!loading}
                rows={5}
                placeholder="Share your assessment..."
              />
            </View>
            {(['leadership_score','work_ethic_score','coachability_score','teamwork_score','integrity_score'] as const).map(key=>(
              <View style={s.field} key={key}>
                <Label>{key.replace('_score','').replaceAll('_',' ')} (1–10)</Label>
                <Input keyboardType="numeric" editable={!loading} value={String(form[key])}
                  onChangeText={value=>setForm(previous=>({...previous,[key]:Number(value)}))}/>
              </View>
            ))}
            <Button
              onPress={handleSubmit}
              disabled={loading || !user || form.testimonial_text.trim().length<30}
              style={s.submit}>
              {loading ? 'Submitting...' : 'Submit'}
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
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  col: { flex: 1 },
  field: { marginBottom: spacing.md },
  submit: { marginTop: spacing.sm },
});
