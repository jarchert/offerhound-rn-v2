// LeaveReviewScreen — RN port of Lovable web src/pages/LeaveReview.tsx (145 LOC).
// Writes to the app_reviews Supabase table.
//
// Web→RN translations:
//   - SEO/Footer chrome → SafeAreaView
//   - star hover states → press-only (RN has no hover)
//   - useToast → Alert.alert
//   - navigate('/auth?redirect=/leave-review') → nav.navigate('Auth')
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Star, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { colors, typography, spacing } from '@/lib/theme';

export default function LeaveReviewScreen() {
  const { user } = useAuth();
  const nav = useNavigation<any>();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      nav.navigate('Auth' as any);
      return;
    }
    if (rating < 1) {
      Alert.alert('Please select a star rating');
      return;
    }
    if (body.trim().length < 10) {
      Alert.alert('Please write at least 10 characters');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('app_reviews' as any).insert({
      user_id: user.id,
      reviewer_name: (user.user_metadata as any)?.full_name || user.email,
      rating,
      title: title.trim() || null,
      body: body.trim(),
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Could not submit review', error.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <BackButton label="Back" />
        <Card style={{ marginTop: spacing.md }}>
          <CardHeader>
            <CardTitle>Leave a Review</CardTitle>
            <CardDescription>
              Tell us how OfferHound™ is working for you. Your feedback helps shape the platform.
            </CardDescription>
          </CardHeader>
          <CardContent style={s.body}>
            {submitted ? (
              <View style={s.done}>
                <CheckCircle2 size={48} color={colors.primary} />
                <Text style={s.doneTitle}>Thank you!</Text>
                <Text style={s.doneDesc}>Your review has been submitted.</Text>
                <Button onPress={() => nav.navigate('Dashboard' as any)}>Back to Dashboard</Button>
              </View>
            ) : (
              <>
                <View style={s.field}>
                  <Label>Your Rating *</Label>
                  <View style={s.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => setRating(n)}
                        accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                        hitSlop={4}
                      >
                        <Star
                          size={36}
                          color={n <= rating ? colors.primary : colors.mutedForeground}
                          fill={n <= rating ? colors.primary : 'transparent'}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={s.field}>
                  <Label>Title (optional)</Label>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Sum it up in a few words"
                    placeholderTextColor={colors.mutedForeground}
                    maxLength={120}
                    style={s.input}
                  />
                </View>

                <View style={s.field}>
                  <Label>Your Review *</Label>
                  <TextInput
                    value={body}
                    onChangeText={setBody}
                    placeholder="What's working well? What could be better?"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    style={[s.input, s.textarea]}
                  />
                </View>

                <Button onPress={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                      <Text style={{ color: colors.primaryForeground }}>Submitting…</Text>
                    </View>
                  ) : (
                    'Submit Review'
                  )}
                </Button>

                {!user && (
                  <Text style={s.authHint}>
                    You'll be asked to sign in before your review is posted.
                  </Text>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  body: { gap: spacing.md },
  field: { gap: spacing.xs },
  stars: { flexDirection: 'row', gap: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, color: colors.foreground, fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, backgroundColor: colors.card },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  done: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  doneTitle: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground },
  doneDesc: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, marginBottom: spacing.sm },
  authHint: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: 'center' },
});
