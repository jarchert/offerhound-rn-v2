import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { useScoutOrganization } from '@/hooks/useScoutOrganization';
import { colors } from '@/lib/theme';
const destinations:Record<string,string>={athlete:'AthleteTabs',coach:'CoachTabs',scout:'ScoutTabs',parent:'ParentTabs',influencer:'InfluencerTabs',admin:'AdminTabs',moderator:'AdminTabs',high_school_coach:'HSCoachTabs',club_coach:'ClubCoachTabs'};
export default function RoleLandingScreen(){
 const {user,userRole,isLoading}=useAuth();const organization=useScoutOrganization();const navigation=useNavigation<any>();
 useEffect(()=>{if(isLoading||userRole==='scout'&&organization.isPending)return;if(!user){navigation.replace('AuthStack',{screen:'SignIn'});return;}const target=userRole==='scout'&&organization.data?.organization?'AgencyTabs':destinations[userRole||'athlete']||'AthleteTabs';navigation.replace(target);},[user?.id,userRole,isLoading,organization.isPending,organization.data,navigation]);
 return <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:colors.background}}><ActivityIndicator/><Text style={{color:colors.foreground}}>Opening your dashboard…</Text></SafeAreaView>;
}
