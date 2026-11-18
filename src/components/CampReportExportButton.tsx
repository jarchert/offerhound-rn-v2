// Native report handoff preserves the authenticated web report route, never exports placeholder evidence.
import React,{useState} from 'react';
import {View,Text,Linking} from 'react-native';
import {Button} from '@/components/ui/Button';
import {campConsentUrl} from '@/lib/campConsent';
import {colors} from '@/lib/theme';
interface Props{campName:string;campId:string;enrollmentId:string;variant?:'default'|'outline';size?:'sm'|'default'|'lg'}
export default function CampReportExportButton({campName,campId,enrollmentId,variant='default',size}:Props){
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function open(){setBusy(true);setError('');try{if(!/^[0-9a-f-]{36}$/i.test(campId)||!/^[0-9a-f-]{36}$/i.test(enrollmentId))throw Error('This registration could not be identified. Return to camp details.');const origin=new URL(campConsentUrl('')).origin;await Linking.openURL(`${origin}/camps/${campId}/enrollments/${enrollmentId}/deliverables`);}catch(e:any){setError(e.message||'The report could not open. Check your connection and retry.');}finally{setBusy(false);}}
 return <View style={{gap:8}}><Text style={{color:colors.mutedForeground}}>Open {campName}’s report website to download a one-page or detailed PDF. Sign in with your OfferHound account if asked; the website returns to this camp’s report.</Text><Button variant={variant} size={size} disabled={busy} onPress={()=>void open()}>{busy?'Opening…':'Open PDF reports'}</Button>{!!error&&<Text accessibilityRole="alert" style={{color:colors.destructive}}>{error}</Text>}</View>;
}
