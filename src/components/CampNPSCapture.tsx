// CampNPSCapture — simple 0–10 NPS rating capture for post-camp feedback.
// Persists verified feedback; failed writes retain the editable draft.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Star, Check } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { saveCampFeedback } from '@/lib/campFollowup';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, spacing } from '@/lib/theme';

interface Props {
  campId: string;
  enrollmentId: string;
  athleteUserId?: string | null;
}

export default function CampNPSCapture({ campId, enrollmentId, athleteUserId }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{setScore(null);setComment('');},[campId,enrollmentId,athleteUserId]);
  const [loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setError('');setSubmitted(false);void(async()=>{
    try {const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user)throw Error('Sign in again to continue.');
    const r=await supabase.from('camp_nps_responses').select('id,nps_score,written_feedback').eq('camp_id',campId).eq('user_id',auth.data.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(r.error)throw r.error;if(!active)return;
    if(r.data){setScore(r.data.nps_score);setComment(r.data.written_feedback||'');}
    }catch(e:any){if(active)setError(e.message||'Could not load the previous submission.');}finally{if(active)setLoading(false);}
  })();return()=>{active=false;};},[campId,enrollmentId,athleteUserId,reload]);


  const submit = async () => {
    if (score == null) return;
    setError('');
    setBusy(true);
    try {
      await saveCampFeedback(campId,enrollmentId,score,comment);
      setSubmitted(true);
    } catch(e:any) {
      setError(e.message || 'Your rating was not saved. Please retry.');
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
            <Text style={s.h}>Thanks for the feedback!</Text>
          </View>
          <Text style={s.muted}>Your rating helps us improve future camps.</Text>
          <Button variant="outline" onPress={()=>setSubmitted(false)}>Edit my rating</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent style={s.body}>
        <View style={s.iconRow}>
          <Star size={20} color={colors.primary} />
          <Text style={s.h}>How likely are you to recommend this camp?</Text>
        </View>
        <Text style={s.muted}>0 = Not likely · 10 = Extremely likely</Text>
        <View style={s.scoreRow} accessibilityRole="radiogroup" accessibilityLabel="Camp rating">
          {Array.from({ length: 11 }, (_, i) => i).map(i => (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityLabel={`Rate ${i}`}
              accessibilityState={{checked:score===i}}
              aria-checked={score===i}
              onPress={() => setScore(i)}
              style={[s.chip, score === i && s.chipActive]}>
              <Text style={[s.chipText, score === i && s.chipTextActive]}>{i}</Text>
            </Pressable>
          ))}
        </View>
        <Textarea
          accessibilityLabel="Camp feedback (optional)"
          value={comment}
          onChangeText={setComment}
          placeholder="What stood out (optional)"
        />
        {!!error&&<View><Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text><Button variant="outline" onPress={()=>setReload(x=>x+1)}>Reload submission status</Button></View>}
        <Button onPress={submit} disabled={score == null || busy}>
          {busy ? 'Submitting…' : 'Submit rating'}
        </Button>
      </CardContent>
    </Card>
  );
}

const s = StyleSheet.create({
  body: { gap: spacing.sm, padding: spacing.md },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  h: { fontFamily: typography.fontFamily.bodyBold, fontSize: typography.fontSize.base, color: colors.foreground, flex: 1 },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: spacing.xs },
  chip: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.fontSize.sm, color: colors.foreground },
  chipTextActive: { color: colors.primaryForeground },
});
