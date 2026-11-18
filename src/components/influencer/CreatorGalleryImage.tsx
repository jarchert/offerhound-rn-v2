import React,{useState} from 'react';
import {View,Text,Image,StyleSheet,type StyleProp,type ViewStyle} from 'react-native';
import {Button} from '@/components/ui/Button';
import {creatorContentUrl} from '@/lib/creatorSchedule';
import {colors} from '@/lib/theme';
/** A display overlay is not represented as a baked-in watermark in saved metadata. */
export function CreatorGalleryImage({uri,title,isWatermarked,style}:{uri:string;title?:string;isWatermarked?:boolean;style?:StyleProp<ViewStyle>}){
 const [failedUri,setFailedUri]=useState<string|null>(null);let safe:string|undefined;try{safe=creatorContentUrl(uri);}catch{}
 if(!safe)return <View style={style}><Text style={{color:colors.mutedForeground}}>Media unavailable.</Text></View>;
 return <View style={[{overflow:'hidden',position:'relative'},style]}>{failedUri===safe?<Button variant="outline" onPress={()=>setFailedUri(null)}>Image unavailable. Retry</Button>:<><Image accessibilityLabel={title||'Creator gallery image'} source={{uri:safe}} style={StyleSheet.absoluteFillObject} resizeMode="contain" onError={()=>setFailedUri(safe!)}/>{!isWatermarked?<View pointerEvents="none" style={{position:'absolute',right:6,bottom:6,paddingHorizontal:6,paddingVertical:2,backgroundColor:'rgba(0,0,0,0.65)'}}><Text style={{color:'#fff',fontSize:12}}>OfferHound</Text></View>:null}</>}</View>;
}
