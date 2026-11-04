import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Text, View, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { useIsFocused } from '@react-navigation/native';
import { File } from 'expo-file-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/lib/theme';
import { discardNativeUpload, nativeVoicePlayback, newVoiceIdentity, persistNativeVoice, removeNativeVoice, VOICE_LIMIT_MS, type CampVoiceNote, type NativeVoiceDraft } from '@/lib/nativeCampVoice';

type Props = { campId: string; enrollmentId: string; drill: string; onBusyChange?: (busy: boolean) => void };
export function CampEvaluatorVoiceNotes({ campId, enrollmentId, drill, onBusyChange }: Props) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const focused = useIsFocused();
  const focusRef = useRef(focused);
  focusRef.current = focused;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const [draft, setDraft] = useState<NativeVoiceDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Record a private evaluator note, up to two minutes.');
  const [denied, setDenied] = useState(false);
  const [playingId, setPlayingId] = useState('');
  const stopping = useRef(false);
  const mounted = useRef(true);
  const draftRef = useRef<NativeVoiceDraft | null>(null);
  const permission = useQuery({ queryKey: ['camp-voice-access', campId, user?.id], enabled: !!user, queryFn: async () => { const r = await (supabase.rpc as any)('can_evaluate_camp', { p_camp_id: campId }); if (r.error) throw r.error; return r.data === true; } });
  const notes = useQuery({ queryKey: ['native-camp-voice', campId, enrollmentId, drill, user?.id], enabled: !!user && permission.data === true, queryFn: async () => { const r = await supabase.from('camp_voice_notes').select('*').eq('camp_id', campId).eq('enrollment_id', enrollmentId).eq('drill_key', drill).order('created_at', { ascending: false }); if (r.error) throw r.error; return r.data as CampVoiceNote[]; } });
  const clearLocal = (value: NativeVoiceDraft | null) => { if (!value) return; try { const f = new File(value.uri); if (f.exists) f.delete(); } catch {} };
  const stop = async (cancel = false) => {
    if (stopping.current) return;
    stopping.current = true;
    try {
      const elapsed = Math.min(VOICE_LIMIT_MS, Math.max(1, recorder.getStatus().durationMillis));
      await recorder.stop();
      const uri = recorder.uri;
      if (uri && user) {
        const value = { id: newVoiceIdentity(), uri, durationMs: elapsed, staffId: user.id };
        if (cancel || !mounted.current) { clearLocal(value); if (mounted.current) setMessage('Recording cancelled.'); }
        else { draftRef.current = value; setDraft(value); setMessage('Recording ready. Preview, save or discard it.'); }
      }
    } catch (error: any) { if (mounted.current) setMessage(error.message || 'Recording interrupted. Try again.'); }
    finally { stopping.current = false; await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
  };
  useEffect(() => { if (!focused) { player.pause(); if (recorder.isRecording) void stop(); } }, [focused]);
  useEffect(() => {
    if (state.isRecording && state.durationMillis >= VOICE_LIMIT_MS - 250) void stop();
  }, [state.isRecording, state.durationMillis]);
  useEffect(() => {
    onBusyChange?.(busy || state.isRecording || !!draft);
    return () => onBusyChange?.(false);
  }, [busy, state.isRecording, !!draft, onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', value => { if (value !== 'active' && recorder.isRecording) void stop(); });
    return () => { mounted.current = false; sub.remove(); player.pause(); if (recorder.isRecording) void stop(true); clearLocal(draftRef.current); };
  }, [recorder, player]);
  const start = async () => {
    if (!user || permission.data !== true || busy || draft || recorder.isRecording) return;
    setBusy(true);
    try {
      const granted = await requestRecordingPermissionsAsync();
      if (!granted.granted) { setDenied(true); setMessage('Microphone access is denied. Enable it in Settings, or use written notes.'); return; }
      if (!mounted.current || !focusRef.current || AppState.currentState !== 'active') return;
      player.pause(); setDenied(false);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!mounted.current || !focusRef.current || AppState.currentState !== 'active') { await recorder.stop(); await setAudioModeAsync({ allowsRecording: false }); return; }
      recorder.record(); setMessage('Recording… Stop when finished.');
    } catch (error: any) { setMessage(error.message || 'Microphone unavailable. Written notes remain available.'); await setAudioModeAsync({ allowsRecording: false }).catch(() => {}); }
    finally { if (mounted.current) setBusy(false); }
  };
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const bytes = await new File(draft.uri).arrayBuffer();
      await persistNativeVoice(campId, enrollmentId, drill, draft, bytes);
      player.pause(); clearLocal(draft); draftRef.current = null; setDraft(null); setMessage('Voice note saved.');
      await cache.invalidateQueries({ queryKey: ['native-camp-voice', campId, enrollmentId] });
    } catch (error: any) { setMessage(`${error.message || 'Upload failed.'} Your draft is kept for retry.`); }
    finally { if (mounted.current) setBusy(false); }
  };
  const discard = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try { player.pause(); await discardNativeUpload(campId, enrollmentId, draft); clearLocal(draft); draftRef.current = null; setDraft(null); setMessage('Draft discarded.'); await notes.refetch(); }
    catch (error: any) { setMessage(error.message || 'Could not discard. Retry while connected.'); }
    finally { setBusy(false); }
  };
  const play = async (note: CampVoiceNote) => {
    setBusy(true);
    try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); const url = await nativeVoicePlayback(note); player.replace(url); player.play(); setPlayingId(note.id); setMessage('Playing saved voice note.'); }
    catch (error: any) { setMessage(error.message || 'Playback unavailable. Retry while connected.'); }
    finally { setBusy(false); }
  };
  const remove = async (note: CampVoiceNote) => {
    setBusy(true);
    try { player.pause(); await removeNativeVoice(note); setMessage('Voice note deleted.'); await notes.refetch(); }
    catch (error: any) { setMessage(error.message || 'Could not delete. Retry.'); }
    finally { setBusy(false); }
  };
  if (!user || permission.data !== true) return <Text style={s.text}>{permission.isPending ? 'Checking evaluator access…' : 'Only the camp owner or accepted evaluators can record voice notes.'}</Text>;
  return <View style={s.stack}>
    <Text style={s.title}>Evaluator voice notes</Text>
    <Text accessibilityLiveRegion="polite" testID="camp-voice-status" style={s.text}>{message}</Text>
    {state.isRecording ? <><Text style={s.text}>Recording {Math.floor(state.durationMillis / 1000)} seconds</Text><Button testID="camp-voice-stop" onPress={() => { void stop(); }}>Stop recording</Button><Button testID="camp-voice-cancel" variant="outline" onPress={() => { void stop(true); }}>Cancel recording</Button></> : !draft && <Button disabled={busy} testID="camp-voice-record" onPress={() => { void start(); }}>Record voice note</Button>}
    {denied && <Button variant="outline" onPress={() => { void Linking.openSettings(); }}>Open microphone settings</Button>}
    {draft && <><Text style={s.text}>Draft: {(draft.durationMs / 1000).toFixed(1)} seconds</Text><Button testID="camp-voice-preview" variant="outline" disabled={busy} onPress={() => { void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).then(() => { player.replace(draft.uri); player.play(); setPlayingId('draft'); }).catch(() => setMessage('Preview unavailable. Try again.')); }}>Preview draft</Button><Button testID="camp-voice-save" disabled={busy} onPress={() => { void save(); }}>Save voice note</Button><Button testID="camp-voice-discard" variant="outline" disabled={busy} onPress={() => { void discard(); }}>Discard draft</Button></>}
    {playback.playing && <Button testID="camp-voice-pause" variant="outline" onPress={() => player.pause()}>Pause audio</Button>}
    {!!playingId && (playback.playing || playback.currentTime > 0) && <Text testID="camp-voice-playing" style={s.text}>{playback.playing ? 'Playing' : 'Audio'} {playingId === 'draft' ? 'draft' : 'saved note'}: {playback.currentTime.toFixed(1)} of {playback.duration.toFixed(1)} seconds</Text>}
    {notes.isError && <Button variant="outline" onPress={() => { void notes.refetch(); }}>Retry loading voice notes</Button>}
    <Text testID="camp-voice-count" style={s.text}>{notes.data?.length ?? 0} saved voice notes</Text>
    {notes.data?.map((note, i) => <View key={note.id} style={s.stack}><Text testID={`camp-voice-saved-${i}`} style={s.text}>Saved voice note · {(note.duration_ms / 1000).toFixed(1)} seconds</Text><Button testID={`camp-voice-play-${i}`} disabled={busy || state.isRecording} variant="outline" onPress={() => { void play(note); }}>Play saved note</Button><Button testID={`camp-voice-delete-${i}`} disabled={busy || state.isRecording} variant="outline" onPress={() => Alert.alert('Delete voice note?', 'This removes the saved audio for this evaluation.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void remove(note); } }])}>Delete voice note</Button></View>)}
  </View>;
}
const s = StyleSheet.create({ stack: { gap: spacing.sm, marginTop: spacing.md }, title: { color: colors.foreground, fontSize: 18 }, text: { color: colors.foreground } });
