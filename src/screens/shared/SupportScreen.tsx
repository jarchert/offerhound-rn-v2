// SupportScreen — RN port of Lovable src/pages/Support.tsx (79 LOC).
// FAQ accordion + contact form posting to beta_feedback. SEO/Footer dropped (web-only).
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Mail, MessageSquare, HelpCircle, Send, CheckCircle } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion';
import { BackButton } from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing, radius } from '@/lib/theme';

const FAQS = [
  { question: 'How do I create my athlete profile?', answer: "After signing up, you'll be guided through our onboarding process." },
  { question: 'How do coaches find my profile?', answer: 'Once published, coaches can discover you through athlete search.' },
  { question: 'Can I contact coaches directly?', answer: 'Yes! Use our coach search to find and send personalized letters.' },
  { question: 'How do I upload highlight videos?', answer: 'Add your Hudl link or upload videos in the profile editor.' },
  { question: 'Is my information private?', answer: 'You control visibility. Published profiles are visible to coaches; unpublished ones remain private.' },
];

export default function SupportScreen() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !subject || !message) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from('beta_feedback' as any).insert({
        title: subject,
        description: message,
        category: 'support',
        user_email: email,
        user_name: name,
        user_id: 'anonymous',
      });
      setIsSubmitted(true);
      toast({ title: 'Message sent!' });
    } catch {
      toast({ title: 'Failed to send. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.headerBar}>
        <BackButton label="Back" />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroIconWrap}>
          <View style={s.heroIcon}>
            <HelpCircle size={32} color={colors.primary} />
          </View>
        </View>
        <Text style={s.h1}>Support Center</Text>
        <Text style={s.subtitle}>Find answers or contact our team.</Text>

        <Card style={s.card}>
          <CardHeader>
            <View style={s.titleRow}>
              <MessageSquare size={20} color={colors.primary} />
              <CardTitle style={s.titleText}>FAQs</CardTitle>
            </View>
          </CardHeader>
          <CardContent>
            <Accordion type="single">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger>{f.question}</AccordionTrigger>
                  <AccordionContent>
                    <Text style={s.faqAnswer}>{f.answer}</Text>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card style={s.card}>
          <CardHeader>
            <View style={s.titleRow}>
              <Mail size={20} color={colors.primary} />
              <CardTitle style={s.titleText}>Contact Us</CardTitle>
            </View>
            <CardDescription>support@offerhound.com</CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <View style={s.successWrap}>
                <CheckCircle size={48} color={colors.success} style={{ marginBottom: spacing.md }} />
                <Text style={s.successTitle}>Message sent!</Text>
                <Text style={s.successBody}>We'll respond within 24 hours.</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <View>
                  <Label>Name</Label>
                  <Input value={name} onChangeText={setName} />
                </View>
                <View>
                  <Label>Email</Label>
                  <Input keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                </View>
                <View>
                  <Label>Subject</Label>
                  <Input value={subject} onChangeText={setSubject} />
                </View>
                <View>
                  <Label>Message</Label>
                  <Textarea numberOfLines={4} value={message} onChangeText={setMessage} />
                </View>
                <Button onPress={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <View style={s.btnRow}>
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                      <Text style={s.btnText}>Sending...</Text>
                    </View>
                  ) : (
                    <View style={s.btnRow}>
                      <Send size={16} color={colors.primaryForeground} />
                      <Text style={s.btnText}>Send Message</Text>
                    </View>
                  )}
                </Button>
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
  headerBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  heroIconWrap: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  heroIcon: {
    width: 64, height: 64, borderRadius: radius.full,
    backgroundColor: 'rgba(231,175,8,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  h1: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.heading.h2,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: { marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { color: colors.foreground },
  faqAnswer: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  successWrap: { paddingVertical: spacing.lg, alignItems: 'center' },
  successTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  successBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btnText: { color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base },
});
