import React from 'react';
import {View,Text,ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@/hooks/useAuth';
import {rememberProfileJourney} from '@/lib/pendingProfileJourney';
import {BackButton} from '@/components/BackButton';
import {Button} from '@/components/ui/Button';
import {colors,spacing} from '@/lib/theme';
export function ProfileUnavailable({kind,id,failed=false,retry}:{kind:'coach'|'club'|'scout'|'influencer';id?:string;failed?:boolean;retry:()=>unknown}){const {user,isLoading}=useAuth(),nav=useNavigation<any>();return <View style={{flex:1,padding:spacing.lg,gap:spacing.md,backgroundColor:colors.background}}><BackButton/>{isLoading?<ActivityIndicator accessibilityLabel="Restoring session"/>:failed?<><Text accessibilityRole="alert" style={{color:colors.foreground}}>We couldn’t load this profile.</Text><Button onPress={()=>retry()}>Try again</Button></>:!user?<><Text style={{color:colors.foreground}}>Sign in to view this profile.</Text><Button disabled={!id} onPress={()=>{if(!id)return;rememberProfileJourney(kind,id);nav.navigate('AuthStack',{screen:'SignIn'});}}>Sign in to view profile</Button></>:<Text style={{color:colors.foreground}}>Profile not found or unavailable to this account.</Text>}</View>;}
