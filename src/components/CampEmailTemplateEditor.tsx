// Parity port from Lovable src/components/CampEmailTemplateEditor.tsx (verbatim logic).
// Web→RN mapping:
//   - shadcn Card/Button/Input/Label/Textarea/Tabs/Badge → src/components/ui/*
//   - lucide-react → lucide-react-native
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - <code> tag → <Text> with monospace styling
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Mail, Info } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface CampEmailTemplateEditorProps {
  campId: string;
  campName?: string;
}

type TemplateKind = 'athlete_confirmation' | 'coach_alert' | 'waitlist_offer';

const TEMPLATE_TABS: Array<{
  kind: TemplateKind;
  label: string;
  description: string;
  defaultSubject: string;
  defaultBody: string;
}> = [
  {
    kind: 'athlete_confirmation',
    label: 'Athlete confirmation',
    description: 'Sent to the athlete immediately after they enroll.',
    defaultSubject: "You're registered for {{camp_name}}",
    defaultBody:
      "Hi {{athlete_name}},\n\nYour spot is confirmed for {{camp_name}} on {{camp_dates}}{{camp_location_line}}.\n\nThe camp organizer will follow up with check-in details.\n\nView the camp page: {{camp_link}}",
  },
  {
    kind: 'coach_alert',
    label: 'Coach alert',
    description: 'Sent to you when a new athlete registers.',
    defaultSubject: 'New registration: {{athlete_name}} signed up for {{camp_name}}',
    defaultBody:
      "Hi {{coach_name}},\n\n{{athlete_name}} just registered for {{camp_name}}.\n\nDates: {{camp_dates}}\nAthlete contact: {{athlete_email}}\n\nOpen the camp dashboard: {{camp_link}}",
  },
  {
    kind: 'waitlist_offer',
    label: 'Waitlist offer',
    description: 'Sent automatically when a spot opens up. Includes a one-click claim link.',
    defaultSubject: 'A spot just opened for {{camp_name}}!',
    defaultBody:
      "Good news — a spot just opened for {{camp_name}} on {{camp_dates}}{{camp_location_line}}.\n\nClaim your spot before it's gone (expires in 48 hours):\n{{claim_link}}",
  },
];

const TOKEN_LIST = [
  '{{camp_name}}',
  '{{camp_dates}}',
  '{{camp_location_line}}',
  '{{camp_link}}',
  '{{athlete_name}}',
  '{{athlete_email}}',
  '{{coach_name}}',
  '{{claim_link}}',
];

interface TemplateRow {
  id: string;
  template_kind: TemplateKind;
  subject: string;
  body: string;
}

export function CampEmailTemplateEditor({ campId, campName }: CampEmailTemplateEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeKind, setActiveKind] = useState<TemplateKind>('athlete_confirmation');
  const [draft, setDraft] = useState<{ subject: string; body: string }>({ subject: '', body: '' });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['camp-email-templates', campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camp_email_templates' as any)
        .select('id, template_kind, subject, body')
        .eq('camp_id', campId);
      if (error) throw error;
      return (data ?? []) as unknown as TemplateRow[];
    },
    enabled: !!campId,
  });

  useEffect(() => {
    const saved = templates.find((t) => t.template_kind === activeKind);
    const meta = TEMPLATE_TABS.find((t) => t.kind === activeKind)!;
    setDraft({
      subject: saved?.subject ?? meta.defaultSubject,
      body: saved?.body ?? meta.defaultBody,
    });
  }, [activeKind, templates]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in required');
      const { error } = await supabase
        .from('camp_email_templates' as any)
        .upsert(
          {
            coach_user_id: user.id,
            camp_id: campId,
            template_kind: activeKind,
            subject: draft.subject.trim(),
            body: draft.body.trim(),
            is_active: true,
          },
          { onConflict: 'coach_user_id,camp_id,template_kind' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-email-templates', campId] });
      toast({ title: 'Template saved', description: 'New registrations will use this template.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not save',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetToDefault = () => {
    const meta = TEMPLATE_TABS.find((t) => t.kind === activeKind)!;
    setDraft({ subject: meta.defaultSubject, body: meta.defaultBody });
  };

  const insertToken = (token: string) => {
    setDraft((prev) => ({ ...prev, body: prev.body + ' ' + token }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent style={s.loaderWrap}>
          <ActivityIndicator color={colors.primary} />
        </CardContent>
      </Card>
    );
  }

  const activeMeta = TEMPLATE_TABS.find((t) => t.kind === activeKind)!;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <View style={s.titleRow}>
            <Mail size={20} color={colors.foreground} />
            <Text style={s.titleText}>Email templates</Text>
            {campName ? <Text style={s.titleSub}> · {campName}</Text> : null}
          </View>
        </CardTitle>
        <CardDescription>
          Customize the subject line and message body for each transactional email this camp sends. Use tokens like {'{{camp_name}}'} to inject dynamic data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeKind} onValueChange={(v) => setActiveKind(v as TemplateKind)}>
          <TabsList>
            {TEMPLATE_TABS.map((t) => (
              <TabsTrigger key={t.kind} value={t.kind}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeKind}>
            <View style={s.section}>
              <View style={s.descRow}>
                <Info size={14} color={colors.mutedForeground} style={s.descIcon} />
                <Text style={s.descText}>{activeMeta.description}</Text>
              </View>

              <View style={s.field}>
                <Label>Subject line</Label>
                <Input
                  value={draft.subject}
                  maxLength={200}
                  onChangeText={(t) => setDraft({ ...draft, subject: t })}
                />
              </View>

              <View style={s.field}>
                <Label>Message body</Label>
                <Textarea
                  value={draft.body}
                  rows={10}
                  onChangeText={(t) => setDraft({ ...draft, body: t })}
                  style={s.bodyMono}
                />
              </View>

              <View>
                <Text style={s.tokenHeader}>Available tokens (tap to insert)</Text>
                <View style={s.tokenWrap}>
                  {TOKEN_LIST.map((token) => (
                    <Pressable key={token} onPress={() => insertToken(token)}>
                      <Badge variant="outline">
                        <Text style={s.tokenText}>{token}</Text>
                      </Badge>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.actionRow}>
                <Button onPress={() => save.mutate()} disabled={save.isPending}>
                  <View style={s.btnRow}>
                    {save.isPending ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Save size={16} color={colors.primaryForeground} />
                    )}
                    <Text style={s.btnText}>Save template</Text>
                  </View>
                </Button>
                <Button variant="outline" onPress={resetToDefault}>
                  <Text style={s.btnTextOutline}>Reset to default</Text>
                </Button>
              </View>
            </View>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  loaderWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  titleText: { color: colors.foreground, fontSize: 18, fontWeight: '600' },
  titleSub: { color: colors.mutedForeground, fontSize: 16, fontWeight: '400' },
  section: { gap: spacing.md, paddingTop: spacing.md },
  descRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  descIcon: { marginTop: 2 },
  descText: { color: colors.mutedForeground, fontSize: 13, flex: 1 },
  field: { gap: 6 },
  bodyMono: { fontFamily: 'Courier', fontSize: 13 },
  tokenHeader: { fontSize: 11, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  tokenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tokenText: { fontFamily: 'Courier', fontSize: 11, color: colors.foreground },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  btnText: { color: colors.primaryForeground, fontWeight: '600' },
  btnTextOutline: { color: colors.foreground, fontWeight: '600' },
});
