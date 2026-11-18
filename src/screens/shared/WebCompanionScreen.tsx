import React, { useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { WEB_COMPANION_ROUTES, webCompanionURL } from '@/lib/webCompanionRoutes';
import { useAdminRole } from '@/hooks/useAdminRole';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/lib/theme';
export default function WebCompanionScreen(){
 const route=useRoute<any>();const metadata=WEB_COMPANION_ROUTES[route.name];const admin=useAdminRole();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 if(!metadata)return <SafeAreaView><BackButton/><Text>Unsupported link.</Text></SafeAreaView>;
 const allowed=!metadata.admin||admin.isAdmin;
 async function open(){if(!allowed)return;setBusy(true);setError('');try{await WebBrowser.openBrowserAsync(webCompanionURL(route.name,route.params,process.env.EXPO_PUBLIC_APP_ENV==='staging'));}catch{setError('This page could not be opened. Check the link and try again.');}finally{setBusy(false);}}
 return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><View style={{padding:spacing.lg,gap:spacing.md}}><BackButton/><Text style={{fontSize:24,color:colors.foreground}}>OfferHound web companion</Text><Text style={{color:colors.foreground}}>{metadata.description}</Text>{metadata.admin&&admin.loading?<Text style={{color:colors.foreground}}>Checking administrator access…</Text>:allowed?<><Text style={{color:colors.mutedForeground}}>This feature opens in the secure web workspace. You may need to sign in there. Review and submit any changes yourself.</Text><Button loading={busy} onPress={()=>{void open();}}>Open OfferHound web page</Button></>:<Text style={{color:colors.foreground}}>Administrator access is required.</Text>}{error?<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>:null}</View></SafeAreaView>;
}
