import {clearPendingCampJourney} from '@/lib/pendingCampJourney';
import React,{createContext,useContext} from 'react';
import {Alert,Pressable,Text,View,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Home, Bell, MessageSquare,Menu} from 'lucide-react-native';
import {navigationRef} from '@/navigation/navigationRef';
import {colors,typography} from '@/lib/theme';
export const HOME_TABS:Record<string,string>={PublicTabs:'LandingTab',AthleteTabs:'HomeTab',CoachTabs:'DashboardTab',ScoutTabs:'DashboardTab',ParentTabs:'DashboardTab',InfluencerTabs:'DashboardTab',AdminTabs:'OverviewTab',HSCoachTabs:'DashboardTab',ClubCoachTabs:'DashboardTab',AgencyTabs:'DashboardTab'};
export function homeDestination(root:string){const tab=HOME_TABS[root];if(!tab)throw Error('Unknown home destination');return {name:root,params:{screen:tab,params:{tab:'activity'},initial:true}};}
type HomeContext={goHome:()=>void};
const Context=createContext<HomeContext|null>(null);
export const useHomeNavigation=()=>useContext(Context);
export function HomeNavigationProvider({route,children}:{route:string;children:React.ReactNode}){
 const goHome=()=>{if(!navigationRef.isReady())return;clearPendingCampJourney();const destination=homeDestination(route);(navigationRef.navigate as any)(destination.name,{...destination.params,params:{...destination.params.params,homeReset:Date.now()}});};
 return <Context.Provider value={{goHome}}>{children}</Context.Provider>;
}
export function HomeButton({disabled=false,confirmLeave=false,beforeNavigate}:{disabled?:boolean;confirmLeave?:boolean;beforeNavigate?:()=>void}){
 const home=useHomeNavigation();if(!home)return null;
 const leave=()=>{beforeNavigate?.();home.goHome();};
 return <Pressable testID="global-home" accessibilityRole="button" accessibilityLabel="Home" accessibilityHint="Return to your home screen" accessibilityState={{disabled}} disabled={disabled} hitSlop={6} onPress={()=>{if(confirmLeave)Alert.alert('Return home?','Your unfinished changes in this dialog will not be saved.',[{text:'Keep editing',style:'cancel'},{text:'Go home',style:'destructive',onPress:leave}]);else leave();}} style={[styles.home,disabled&&{opacity:.5}]}><Home size={21} color={colors.primary}/><Text style={styles.label}>Home</Text></Pressable>;
}
export function HomeNavigationBar({authenticated}:{authenticated:boolean}){
 return <SafeAreaView edges={['top','left','right']} style={styles.safe}><View accessibilityLabel="Main navigation" style={styles.bar}><HomeButton/><View style={styles.actions}>{authenticated?<>
 <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.icon} onPress={()=>navigationRef.isReady()&&(navigationRef.navigate as any)('Notifications')}><Bell size={21} color={colors.foreground}/></Pressable>
 <Pressable accessibilityRole="button" accessibilityLabel="Messages" style={styles.icon} onPress={()=>navigationRef.isReady()&&(navigationRef.navigate as any)('Messages')}><MessageSquare size={21} color={colors.foreground}/></Pressable>
 <Pressable testID="header-settings" accessibilityRole="button" accessibilityLabel="Settings and account" style={styles.icon} onPress={()=>navigationRef.isReady()&&(navigationRef.navigate as any)('SettingsStack')}><Menu size={21} color={colors.foreground}/></Pressable>
 </>:<Pressable testID="header-sign-in" accessibilityRole="button" accessibilityLabel="Sign in" style={styles.icon} onPress={()=>navigationRef.isReady()&&(navigationRef.navigate as any)('AuthStack',{screen:'SignIn'})}><Text style={styles.label}>Sign in</Text></Pressable>}</View></View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{backgroundColor:colors.background},bar:{minHeight:48,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.border},home:{minWidth:76,minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:8},label:{fontFamily:typography.fontFamily.bodySemiBold,fontSize:16,color:colors.foreground},actions:{flexDirection:'row',alignItems:'center',gap:4},icon:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8}});
