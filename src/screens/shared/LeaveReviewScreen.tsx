// LeaveReviewScreen — RN port of Lovable web LeaveReview page.
// Source: offerhound-repo/src/pages/LeaveReview.tsx (145 LOC)
//
// Adaptations (web -> RN):
//   - <div>/<h1>/<p> -> <View>/<Text>
//   - className utility -> StyleSheet
//   - lucide-react -> lucide-react-native
//   - useAuth (web hook) -> @/contexts/AuthContext (RN)
//   - useToast (shadcn) -> @/components/ui/toast wrapper
//   - hover state on stars (mouse) -> press-only rating (touch)
//   - navigate("/auth?redirect=...") -> nav to AuthStack; navigate("/dashboard") -> goBack
// Functional parity: inserts into `app_reviews` with same columns
//   (user_id, reviewer_name, rating, title, body) and same validation
//   (rating >= 1, body >= 10 chars).
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Star, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/toast';
import { colors, typography, spacing } from '@/lib/theme';

export default function LeaveReviewScreen() {
  const { user, isAuthenticated } = useAuth() as any;
  const nav = useNavigation<any>();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      nav.navigate('AuthStack' as never);
      return;
    }
    if (rating < 1) {
      toast.error('Please select a star rating');
      return;
    }
    if (body.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('app_reviews').insert({
      user_id: user.id,
      reviewer_name: user.user_metadata?.full_name || user.email,
      rating,
      title: title.trim() || null,
      body: body.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit review', error.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton />
        <Card style={s.card}>
          <CardContent>
            <Text style={s.title}>Leave a Review</Text>
            <Text style={s.desc}>
              Tell us how OfferHound is working for you. Your feedback helps shape the platform.
            </Text>

            {submitted ? (
              <View style={s.thanks}>
                <CheckCircle2 size={48} color={colors.primary} />
                <Text style={s.thanksTitle}>Thank you!</Text>
                <Text style={s.desc}>Your review has been submitted.</Text>
                <Button onPress={() => nav.goBack()}>Back to Dashboard</Button>
              </View>
            ) : (
              <View style={s.form}>
                <View style={s.field}>
                  <Text style={s.label}>Your Rating *</Text>
                  <View style={s.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setRating(n)}
                        accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                      >
                        <Star
                          size={32}
                          color={n <= rating ? colors.primary : colors.mutedForeground}
                          fill={n <= rating ? colors.primary : 'transparent'}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Input
                  label="Title (optional)"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Sum it up in a few words"
                  maxLength={120}
                />

                <Textarea
                  label="Your Review *"
                  value={body}
                  onChangeText={setBody}
                  rows={6}
                  placeholder="What's working well? What could be better?"
                />

                <Button onPress={handleSubmit} disabled={submitting} loading={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>

                {!isAuthenticated && (
                  <Text style={s.hint}>
                    You'll be asked to sign in before your review is posted.
                  </Text>
                )}
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { marginTop: spacing.md },
  title: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    letterSpacing: typography.letterSpacing.heading,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  desc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginBottom: spacing.md },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  stars: { flexDirection: 'row', gap: spacing.xs },
  hint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center' },
  thanks: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  thanksTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
});
