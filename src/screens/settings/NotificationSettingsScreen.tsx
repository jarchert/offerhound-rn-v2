import React,{useEffect,useRef,useState} from 'react';
import {View,Text,ScrollView,StyleSheet,SafeAreaView,Switch,ActivityIndicator,Pressable} from 'react-native';
import {Bell,Mail,MessageSquare,Trophy,Calendar} from 'lucide-react-native';
import {CampNotificationMutes} from '@/components/CampNotificationMutes';
import {BackButton} from '@/components/BackButton';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/Card';
import {colors,typography,spacing} from '@/lib/theme';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {loadPreferences,savePreference,PreferenceKey,preferenceDefaults} from '@/lib/notificationPreferences';
const categories=[
 {key:'messages_in_app',label:'Messages · in app',description:'New direct and team message alerts. Messages remain in your inbox.',icon:MessageSquare},
 {key:'recruiting_in_app',label:'Recruiting activity · in app',description:'Profile views, coach interest and recruiting updates.',icon:Trophy},
 {key:'camps_in_app',label:'Camps & events · in app',description:'Camp invitations and team event alerts.',icon:Calendar},
 {key:'camps_email',label:'Camps & events · email',description:'Registration confirmations and waitlist offers. Camp-specific mutes still apply.',icon:Mail},
] as const;
export default function NotificationSettingsScreen(){
 const {user}=useAuth();const owner=user?.id||'';const activeOwner=useRef(owner);activeOwner.current=owner;
 const [loaded,setLoaded]=useState(''),[values,setValues]=useState(preferenceDefaults),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[saving,setSaving]=useState<PreferenceKey|null>(null),[failed,setFailed]=useState<{key:PreferenceKey,value:boolean}|null>(null);
 const generation=useRef(0),busy=useRef(false);
 const load=async()=>{const version=++generation.current;setLoading(true);setLoadError(false);setFailed(null);try{const next=await loadPreferences(supabase,owner);if(version===generation.current&&activeOwner.current===owner){setValues(next);setLoaded(owner);}}catch{if(version===generation.current)setLoadError(true);}finally{if(version===generation.current)setLoading(false);}};
 useEffect(()=>{setLoaded('');busy.current=false;setSaving(null);void load();return()=>{generation.current++;};},[owner]);
 const save=async(key:PreferenceKey,value:boolean)=>{if(busy.current||loaded!==owner)return;busy.current=true;setSaving(key);setFailed(null);const version=generation.current;try{const next=await savePreference(supabase,owner,key,value);if(version===generation.current&&activeOwner.current===owner)setValues(next);}catch{if(version===generation.current&&activeOwner.current===owner)setFailed({key,value});}finally{if(version===generation.current){busy.current=false;setSaving(null);}}};
 return <SafeAreaView style={s.container}><ScrollView contentContainerStyle={s.content}><BackButton label="Back"/><Text style={s.h1}>Notification Settings</Text><Text style={s.subtitle}>Choose which alerts you receive. Changes are saved to your account.</Text>
 {loading?<ActivityIndicator accessibilityLabel="Loading notification preferences"/>:loadError||loaded!==owner?<View><Text style={s.subtitle}>Couldn't load your settings.</Text><Pressable accessibilityRole="button" onPress={()=>void load()}><Text style={s.toggleLabel}>Try again</Text></Pressable></View>:<Card><CardHeader><CardTitle>Preferences</CardTitle></CardHeader><CardContent style={s.cardBody}>{categories.map(cat=>{const Icon=cat.icon;return <View key={cat.key} style={s.toggleRow}><View style={s.toggleLeft}><Icon size={20} color={colors.primary}/><View style={{flex:1}}><Text style={s.toggleLabel}>{cat.label}</Text><Text style={s.toggleDesc}>{cat.description}</Text></View></View>{saving===cat.key?<ActivityIndicator accessibilityLabel={'Saving '+cat.label}/>:null}<Switch testID={'notification-'+cat.key} accessibilityLabel={cat.label} value={values[cat.key]} disabled={saving!==null} onValueChange={value=>void save(cat.key,value)} trackColor={{true:colors.primary,false:colors.border}}/></View>;})}</CardContent></Card>}
 {failed?<View accessibilityRole="alert"><Text style={s.subtitle}>Couldn't save {categories.find(c=>c.key===failed.key)?.label}. Your previous setting is still in place.</Text><Pressable accessibilityRole="button" onPress={()=>void save(failed.key,failed.value)}><Text style={s.toggleLabel}>Try again</Text></Pressable></View>:null}
 <Text style={s.toggleLabel}>Always sent</Text><Text style={s.subtitle}>Sign-in and account security, guardian consent, payments and receipts, changes to camps you're registered for, and answers to your transcript requests.</Text><Text style={s.subtitle}>These categories do not send push notifications or text messages. Camp text messages use separate per-camp phone consent and STOP controls. Turning camp email back on does not override a camp mute.</Text>
 <CampNotificationMutes/>
 </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headingBlock: { gap: 4, marginTop: spacing.sm },
  h1: { fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize['3xl'], color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.base, color: colors.mutedForeground },
  cardBody: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10, gap: spacing.sm },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleLabel: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground },
  toggleDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
});
