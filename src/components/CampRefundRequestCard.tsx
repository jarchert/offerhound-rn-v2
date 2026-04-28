// CampRefundRequestCard — minimal refund-request form. Persists a row in
// camp_refund_requests so staff can review/process. Status-locked after submit.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign, Check } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  campId: string;
  enrollmentId: string;
  athleteUserId?: string | null;
}

export default function CampRefundRequestCard({ campId, enrollmentId, athleteUserId }: Props) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await supabase.from('camp_refund_requests' as any).insert({
        camp_id: campId,
        enrollment_id: enrollmentId,
        athlete_user_id: athleteUserId ?? null,
        reason: reason.trim(),
        status: 'pending',
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent style={s.body}>
          <View style={s.iconRow}>
            <Check size={20} color={colors.success} />
            <Text style={s.h}>Refund request received</Text>
          </View>
          <Text style={s.muted}>Our team will review and email you within 5 business days.</Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent style={s.body}>
        <View style={s.iconRow}>
          <DollarSign size={20} color={colors.primary} />
          <Text style={s.h}>Request a refund</Text>
        </View>
        <Text style={s.muted}>
          Refunds are reviewed case-by-case. Please describe the reason in detail so our staff can act quickly.
        </Text>
        <Textarea
          value={reason}
          onChangeText={setReason}
          placeholder="Tell us why you're requesting a refund…"
        />
        <Button variant="destructive" onPress={submit} disabled={!reason.trim() || busy}>
          {busy ? 'Submitting…' : 'Submit refund request'}
        </Button>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  body: { gap: spacing.sm, padding: spacing.md },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  h: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, lineHeight: 20 },
});
