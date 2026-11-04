import React, { useEffect, useRef, useState } from 'react';
import { View, Text, AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { loadNativeProfileVoice } from '@/lib/nativeProfileVoice';
import { nativeVoicePlayback, type CampVoiceNote } from '@/lib/nativeCampVoice';
import { colors, spacing } from '@/lib/theme';
const drillNames:Record<string,string>={forty_yard_dash:'40-yard dash',shuttle_5_10_5:'5-10-5 shuttle',three_cone_drill:'3-cone drill',vertical_jump:'Vertical jump',broad_jump:'Broad jump'};
export function CampProfileVoiceNotes({enrollmentId}:{enrollmentId:string}) {
 const {user}=useAuth();const focused=useIsFocused();const focus=useRef(focused);focus.current=focused;const alive=useRef(true);
 const player=useAudioPlayer(null,{keepAudioSessionActive:true});const playback=useAudioPlayerStatus(player);
 const [busy,setBusy]=useState(false);const [selected,setSelected]=useState('');const [message,setMessage]=useState('');
 const identity=useRef(`${user?.id}:${enrollmentId}`);identity.current=`${user?.id}:${enrollmentId}`;
 const saved=useQuery({queryKey:['native-profile-voice',enrollmentId,user?.id],enabled:!!user,queryFn:()=>loadNativeProfileVoice(enrollmentId),refetchInterval:15000});
 useEffect(()=>{alive.current=true;const listener=AppState.addEventListener('change',state=>{if(state!=='active'&&alive.current){try{player.pause();}catch{}}});return()=>{alive.current=false;listener.remove();};},[player]);
 useEffect(()=>{if(!focused&&alive.current){try{player.pause();}catch{}}},[focused,player]);
 useEffect(()=>{player.pause();setSelected('');setMessage('');setBusy(false);},[enrollmentId,user?.id,player]);
 useEffect(()=>{if(!saved.data){player.pause();setSelected('');}},[saved.data,player]);
 async function play(note:CampVoiceNote) {
  const requested=identity.current;setBusy(true);setMessage('');
  try{const url=await nativeVoicePlayback(note);if(!alive.current||!focus.current||identity.current!==requested)return;
   await setAudioModeAsync({allowsRecording:false,playsInSilentMode:true});if(!alive.current||!focus.current||identity.current!==requested)return;
   player.replace(url);player.play();setSelected(note.id);
  }catch(e:any){if(alive.current&&identity.current===requested)setMessage(e.message||'Playback unavailable. Try again.');}
  finally{if(alive.current&&identity.current===requested)setBusy(false);}
 }
 if(!user)return null;
 if(saved.isError)return <View><Text style={{color:colors.destructive}}>Private voice notes could not be loaded.</Text><Button onPress={()=>{void saved.refetch();}}>Retry voice notes</Button></View>;
 if(!saved.data)return saved.isPending?<Text style={{color:colors.mutedForeground}}>Checking saved voice notes…</Text>:null;
 return <View style={{gap:spacing.sm,padding:12}}><Text style={{color:colors.foreground,fontSize:18,fontWeight:'bold'}}>Private evaluator voice notes</Text><Text style={{color:colors.mutedForeground}}>Available to the note author and camp owner. Includes all drills for this athlete at this camp.</Text>
 <Text testID="profile-voice-count" style={{color:colors.foreground}}>{saved.data.notes.length} saved voice notes</Text>
 {saved.data.notes.length===0&&<Text style={{color:colors.mutedForeground}}>No saved notes are available to your account. Save a recording from Evaluate athletes first.</Text>}
 {saved.data.notes.map((note,index)=><View key={note.id} style={{gap:8}}><Text style={{color:colors.foreground}}>{drillNames[note.drill_key]||note.drill_key.replace(/_/g,' ')} · {(note.duration_ms/1000).toFixed(1)} seconds · {new Date(note.created_at).toLocaleString()}</Text><Button testID={`profile-voice-play-${index}`} variant="outline" disabled={busy} onPress={()=>{void play(note);}}>Play saved note</Button></View>)}
 {selected&&playback.playing?<Button testID="profile-voice-pause" variant="outline" onPress={()=>{try{player.pause();}catch{setMessage('Playback stopped.');}}}>Pause audio</Button>:null}
 {selected&&(playback.playing||playback.currentTime>0)?<Text testID="profile-voice-progress" style={{color:colors.foreground}}>{playback.currentTime.toFixed(1)} of {playback.duration.toFixed(1)} seconds</Text>:null}
 {message?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{message}</Text>:null}<Button variant="ghost" onPress={()=>{void saved.refetch();}}>Refresh voice notes</Button></View>;
}
