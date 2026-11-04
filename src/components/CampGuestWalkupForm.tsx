import { CampRegistrantIdentityForm, emptyNativeIdentity } from '@/components/CampRegistrantIdentity';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { enqueueOp } from '@/lib/checkinQueue';
import { makeGuestRequestKey, nativeGuestArguments, saveNativeGuest, type NativeGuestEntry } from '@/lib/nativeCampGuest';
import { colors, spacing } from '@/lib/theme';

type Props = { campId: string; positions: string[]; online: boolean; refreshQueue: () => void };
export function CampGuestWalkupForm({ campId, positions, online, refreshQueue }: Props) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [key, setKey] = useState(makeGuestRequestKey);
  const [identity, setIdentity] = useState(emptyNativeIdentity);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [number, setNumber] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [recentEntries, setRecentEntries] = useState<string[]>([]);
  const permission = useQuery({
    queryKey: ['native-guest-registration-access', campId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const result = await (supabase.rpc as any)('can_register_camp_guest', { p_camp_id: campId });
      if (result.error) throw result.error;
      return result.data === true;
    },
  });
  const registration = useMutation({
    mutationFn: async (draft: NativeGuestEntry) => {
      nativeGuestArguments(campId, draft);
      if (online) await saveNativeGuest(campId, draft);
      else await enqueueOp({ kind: 'walkup_register', campId, payload: draft });
      return { name: draft.fullName.trim(), queued: !online };
    },
    onSuccess: result => {
      setRecentEntries(previous => [`${result.name} ${result.queued ? 'saved offline' : 'registered'}`, ...previous].slice(0, 5));
      setIdentity(emptyNativeIdentity()); setGuestName(''); setGuestEmail(''); setNumber(''); setSelectedPosition(''); setKey(makeGuestRequestKey());
      refreshQueue();
      cache.invalidateQueries({ queryKey: ['camp-ops-enrollments', campId] });
      cache.invalidateQueries({ queryKey: ['camp-enrollments', campId] });
    },
  });

  if (!user) return <Text style={s.text}>Sign in as camp staff to register guests.</Text>;
  if (permission.isError) return <View style={s.stack}><Text style={s.text}>Registration access could not be checked.</Text><Button onPress={() => permission.refetch()}>Retry</Button></View>;
  if (permission.data !== true) return <Text style={s.text}>{permission.isPending ? (online ? 'Checking registration access…' : 'Connect once to verify registration access.') : 'Only the camp owner or accepted registration staff can register guests.'}</Text>;

  return <Card>
    <CardHeader><CardTitle>Guest walk-up registration</CardTitle></CardHeader>
    <CardContent style={s.stack}>
      <Input label="Guest name *" accessibilityLabel="Guest name" testID="guest-walkup-name" value={guestName} onChangeText={setGuestName} maxLength={120} editable={!registration.isPending} autoCapitalize="words" />
      <Input label="Email *" accessibilityLabel="Guest email" value={guestEmail} onChangeText={setGuestEmail} maxLength={254} editable={!registration.isPending} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <CampRegistrantIdentityForm campId={campId} requestKey={key} value={identity} onChange={setIdentity} disabled={registration.isPending || !online} />
      <Input label="Jersey # (optional)" accessibilityLabel="Guest jersey number" value={number} onChangeText={setNumber} maxLength={12} editable={!registration.isPending} />
      {positions.length > 0 && <View style={s.stack}><Text style={s.text}>Position (optional)</Text><View style={s.positions}>{positions.map(position => <Pressable key={position} accessibilityRole="radio" accessibilityLabel={`Position ${position}`} accessibilityState={{ selected: selectedPosition === position }} disabled={registration.isPending} onPress={() => setSelectedPosition(current => current === position ? '' : position)} style={[s.position, selectedPosition === position && s.selected]}><Text style={s.text}>{position}</Text></Pressable>)}</View></View>}
      {registration.error && <Text accessibilityRole="alert" style={s.error}>{(registration.error as Error).message || 'Could not register this guest. Retry the same entry.'}</Text>}
      <Button loading={registration.isPending} testID="guest-walkup-submit" disabled={registration.isPending || !guestName.trim()} onPress={() => registration.mutate({ requestKey: key, staffId: user.id, fullName: guestName, emailAddress: guestEmail, jerseyNumber: number, position: selectedPosition, ...identity })}>
        Register &amp; check in
      </Button>
      {recentEntries.map((entry, index) => <Text key={`${index}:${entry}`} style={s.text}>{entry}</Text>)}
    </CardContent>
  </Card>;
}
const s = StyleSheet.create({
  stack: { gap: spacing.md }, text: { color: colors.foreground }, error: { color: colors.destructive },
  positions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  position: { padding: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  selected: { borderColor: colors.primary, backgroundColor: colors.card },
});
