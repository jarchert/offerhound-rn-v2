// CoachReferencesCard — RN port of Lovable CoachReferencesManager.tsx.
// Lists coach references and allows requesting a new one (inline form).
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { UserPlus, Mail, CheckCircle2, Clock, Copy } from 'lucide-react-native';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Badge } from '@/components/ui';
import { supabase } from '@/integrations/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useToast } from '@/hooks/use-toast';
import { colors, spacing, typography } from '@/lib/theme';

interface CoachRef {
  id: string;
  coach_name: string;
  coach_email: string;
  coach_school: string | null;
  invitation_status: string | null;
  invitation_token: string | null;
  submitted_at: string | null;
}

function uuid(): string {
  // RFC4122-ish v4 fallback when crypto.randomUUID is unavailable in RN.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CoachReferencesCard() {
  const { profile } = usePlayerProfile();
  const { toast } = useToast();
  const profileId = profile?.id;
  const [refs, setRefs] = useState<CoachRef[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) return;
    const { data, error } = await supabase
      .from('coach_references')
      .select('id, coach_name, coach_email, coach_school, invitation_status, invitation_token, submitted_at')
      .eq('athlete_profile_id', profileId)
      .order('created_at', { ascending: false });
    if (error) {
      // Table may not exist in this environment — fall back to graceful empty state.
      setTableMissing(true);
      setRefs([]);
      return;
    }
    setRefs((data as CoachRef[] | null) || []);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!profileId || !name || !email) return;
    setSubmitting(true);
    const token = uuid();
    const { error } = await supabase.from('coach_references').insert({
      athlete_profile_id: profileId,
      coach_name: name,
      coach_email: email,
      coach_school: school || null,
      invitation_status: 'pending',
      invitation_token: token,
      invitation_sent_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Failed to send reference request', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Invitation queued for ${name}` });
    setName(''); setEmail(''); setSchool(''); setShowForm(false);
    load();
  };

  const copyToken = async (token: string | null) => {
    if (!token) return;
    try { await Clipboard.setStringAsync(token); toast({ title: 'Token copied' }); } catch { /* ignore */ }
  };

  return (
    <Card>
      <CardHeader style={s.headerRow}>
        <CardTitle>
          <View style={s.titleRow}>
            <Mail size={18} color={colors.primary} />
            <Text style={s.titleText}>Coach References</Text>
          </View>
        </CardTitle>
        {!tableMissing && (
          <Button variant="outline" size="sm" onPress={() => setShowForm((v) => !v)}
            leftIcon={<UserPlus size={14} color={colors.foreground} />}>Request</Button>
        )}
      </CardHeader>
      <CardContent style={{ gap: spacing.sm }}>
        {tableMissing ? (
          <Text style={s.muted}>No references yet. Coach references will appear here once enabled for your account.</Text>
        ) : (
          <>
            {showForm && (
              <View style={s.form}>
                <View><Label>Coach Name</Label>
                  <Input value={name} onChangeText={setName} placeholder="Coach name" /></View>
                <View><Label>Coach Email</Label>
                  <Input value={email} onChangeText={setEmail} placeholder="coach@school.edu" autoCapitalize="none" keyboardType="email-address" /></View>
                <View><Label>School / Organization (optional)</Label>
                  <Input value={school} onChangeText={setSchool} placeholder="Lincoln High School" /></View>
                <Button onPress={handleSubmit} disabled={!name || !email} loading={submitting} size="sm">
                  Send Reference Invite
                </Button>
              </View>
            )}

            {refs.length === 0 && !showForm && (
              <Text style={s.muted}>No references yet. Request one from a coach who knows your abilities.</Text>
            )}
            {refs.map((r) => (
              <View key={r.id} style={s.refRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.refName}>{r.coach_name}</Text>
                  <Text style={s.refMeta} numberOfLines={1}>
                    {r.coach_email}{r.coach_school ? ` · ${r.coach_school}` : ''}
                  </Text>
                </View>
                <View style={s.refActions}>
                  {!r.submitted_at && r.invitation_token && (
                    <Button variant="ghost" size="sm" onPress={() => copyToken(r.invitation_token)}
                      leftIcon={<Copy size={12} color={colors.foreground} />}>{''}</Button>
                  )}
                  <Badge variant={r.submitted_at ? 'default' : 'secondary'}>
                    {r.submitted_at ? 'Submitted' : (r.invitation_status || 'pending')}
                  </Badge>
                </View>
              </View>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  titleText: { color: colors.foreground, fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.heading },
  muted: { color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  form: { gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.muted },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  refName: { color: colors.foreground, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodyMedium },
  refMeta: { color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  refActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});

export default CoachReferencesCard;
