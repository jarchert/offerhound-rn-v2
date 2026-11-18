// CampRefundRequestCard — minimal refund-request form. Persists a row in
// camp_refund_requests so staff can review/process. Status-locked after submit.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign, Check } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { requestCampRefund } from '@/lib/campFollowup';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  campId: string;
  enrollmentId: string;
  athleteUserId?: string | null;
}

export default function CampRefundRequestCard({ campId, enrollmentId, athleteUserId }: Props) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState<any>(null);
  const [error,setError]=useState('');
  useEffect(()=>setReason(''),[campId,enrollmentId,athleteUserId]);
  const [loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setError('');setSubmitted(null);void(async()=>{
    try {const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw Error('Sign in again to continue.');
    const r=await supabase.from('camp_refund_requests').select('id,status,reason,decision_notes').eq('camp_id',campId).eq('enrollment_id',enrollmentId).order('created_at',{ascending:false}).limit(1).maybeSingle();if(r.error)throw r.error;if(!active)return;
    setSubmitted(r.data);
    }catch(e:any){if(active)setError(e.message||'Could not load the previous submission.');}finally{if(active)setLoading(false);}
  })();return()=>{active=false;};},[campId,enrollmentId,athleteUserId,reload]);

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setError('');
    setBusy(true);
    try {
      const row=await requestCampRefund(campId,enrollmentId,reason);setSubmitted(row);
    } catch(e:any) {
      setError(e.message || 'Your request was not saved. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  if(loading)return <Text style={{color:colors.mutedForeground}}>Loading previous submission…</Text>;
  if (submitted) {
    return (
      <Card>
        <CardContent style={s.body}>
          <View style={s.iconRow}>
            <Check size={20} color={colors.success} />
            <Text style={s.h}>Refund request received</Text>
          </View>
          <Text style={s.muted}>Status: {submitted.status.replace(/_/g,' ')}. The camp organizer reviews refund requests. A request does not guarantee approval.</Text>
          <Text style={s.muted}>{submitted.reason}</Text>
          {!!submitted.decision_notes&&<Text style={s.muted}>Organizer note: {submitted.decision_notes}</Text>}
          <Button variant="outline" onPress={()=>setReload(x=>x+1)}>Refresh refund status</Button>
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
        <Text style={s.muted}>Refund reason (required)</Text>
        <Textarea
          accessibilityLabel="Refund reason (required)"
          value={reason}
          onChangeText={setReason}
          placeholder="Tell us why you're requesting a refund…"
        />
        {!!error&&<View><Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text><Button variant="outline" onPress={()=>setReload(x=>x+1)}>Reload submission status</Button></View>}
        <Text style={s.muted}>Required: a reason of at least 10 characters.</Text>
        <Button variant="destructive" onPress={submit} disabled={reason.trim().length<10 || busy}>
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
