import React,{useEffect,useRef,useState} from 'react';
import {View,Text,ScrollView,Pressable,Linking,Image as RNImage,StyleSheet,ActivityIndicator,Alert} from 'react-native';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {Card,CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Label} from '@/components/ui/Label';
import {Badge} from '@/components/ui/Badge';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/Select';
import {Switch} from '@/components/ui/Switch';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/Dialog';
import {useToast} from '@/hooks/use-toast';
import {Image as ImageIcon,Video,Plus,Trash2,Star,Search,Loader2,ExternalLink} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import {useVideoPlayer,VideoView} from 'expo-video';
import {clubGalleries,clubMediaRows,saveClubFile,saveClubLink,discardClubFile,deleteClubMedia,featureClubMedia,clubHttpsLink,type ClubPendingUpload} from '@/lib/clubMedia';
import {colors,typography,spacing,radius} from '@/lib/theme';
type PickedAsset={uri:string;name:string;mimeType:string};
function ClubVideo({uri}:{uri:string}){const player=useVideoPlayer(uri,p=>{p.loop=false;});const [error,setError]=useState(false);useEffect(()=>{const listener=player.addListener('statusChange',event=>setError(event.status==='error'));return()=>listener.remove();},[player]);return <View><VideoView player={player} nativeControls fullscreenOptions={{enable:true}} style={{width:'100%',height:300}}/>{error&&<Text style={{color:colors.foreground}}>Video could not be played. Close the preview, refresh, and try again.</Text>}</View>;}
export function ClubMediaGallery(){
 const {user}=useAuth();const actor=useRef(user?.id);actor.current=user?.id;const {toast}=useToast(),queryClient=useQueryClient();
 const [selectedOwner,setSelectedOwner]=useState(''),[showAddDialog,setShowAddDialog]=useState(false),[filterTeam,setFilterTeam]=useState('all'),[filterType,setFilterType]=useState('all'),[searchQuery,setSearchQuery]=useState(''),[debouncedSearch,setDebouncedSearch]=useState(''),[page,setPage]=useState(0);
 const [url,setUrl]=useState(''),[caption,setCaption]=useState(''),[mediaType,setMediaType]=useState('image'),[teamId,setTeamId]=useState(''),[eventName,setEventName]=useState(''),[tags,setTags]=useState(''),[isFeatured,setIsFeatured]=useState(false),[selectedFile,setSelectedFile]=useState<PickedAsset|null>(null),[pending,setPending]=useState<ClubPendingUpload|null>(null),[uploading,setUploading]=useState(false),[preview,setPreview]=useState<{uri:string;type:string}|null>(null);
 const [saveError,setSaveError]=useState('');
 const galleries=useQuery({queryKey:['club-galleries',user?.id],enabled:!!user,queryFn:()=>clubGalleries(supabase),staleTime:20000});
 useEffect(()=>{if(galleries.data?.length&&!galleries.data.some(g=>g.owner_user_id===selectedOwner))setSelectedOwner((galleries.data.find(g=>g.is_own)||galleries.data[0]).owner_user_id);},[galleries.data,selectedOwner]);
 useEffect(()=>{setSelectedOwner('');setPending(null);setSelectedFile(null);setShowAddDialog(false);setPreview(null);setUrl('');setCaption('');setTags('');},[user?.id]);
 useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(searchQuery),250);return()=>clearTimeout(timer);},[searchQuery]);
 useEffect(()=>{setPage(0);},[selectedOwner,filterTeam,filterType,debouncedSearch]);
 const gallery=galleries.data?.find(g=>g.owner_user_id===selectedOwner),canManage=gallery?.can_manage===true;
 const teamsQuery=useQuery({queryKey:['club-media-teams',user?.id,selectedOwner],enabled:!!gallery,queryFn:async()=>{const {data,error}=await supabase.from('teams').select('id,name').eq('coach_user_id',selectedOwner).neq('status','archived');if(error)throw error;return data||[];}});const teams=teamsQuery.data||[];
 const mediaQuery=useQuery({queryKey:['club-media-items',user?.id,selectedOwner,filterTeam,filterType,debouncedSearch,page],enabled:!!gallery&&!galleries.isError,queryFn:()=>clubMediaRows(supabase,selectedOwner,{team:filterTeam,type:filterType,search:debouncedSearch,page}),refetchInterval:40*60*1000});const filtered=mediaQuery.data?.items||[],isLoading=mediaQuery.isPending;
 const resetForm=()=>{setSaveError('');setUrl('');setCaption('');setMediaType('image');setTeamId('');setEventName('');setTags('');setIsFeatured(false);setSelectedFile(null);setPending(null);};
 const refresh=()=>{void queryClient.invalidateQueries({queryKey:['club-media-items',user?.id,selectedOwner]});void queryClient.invalidateQueries({queryKey:['club-media-count']});};
 const addMutation=useMutation({onMutate:()=>{setSaveError('');return{actor:user?.id};},mutationFn:async()=>{if(!user||!canManage)throw Error('This gallery is view only.');const fields={caption,event_name:eventName,team_id:teamId||null,tags:tags.split(',').map(t=>t.trim()).filter(Boolean),is_featured:isFeatured};if(mediaType==='image'&&!selectedFile)throw Error('Choose a photo from your library.');if(selectedFile){setUploading(true);const response=await fetch(selectedFile.uri);if(!response.ok&&response.status!==0)throw Error('Could not read the selected file.');return saveClubFile(supabase,{owner:selectedOwner,nonce:Crypto.randomUUID(),bytes:await response.arrayBuffer(),fields,pending,onPending:setPending});}return saveClubLink(supabase,selectedOwner,mediaType,url,fields);},onSuccess:(_data,_vars,context)=>{if(context?.actor!==actor.current)return;refresh();setShowAddDialog(false);resetForm();toast({title:'Media saved'});},onError:(error:any,_vars,context)=>{if(context?.actor!==actor.current)return;if(error.fileRemoved)setPending(null);setSaveError(error.message||'Could not save this media. Check your connection and retry.');toast({title:'Media not confirmed',description:error.message,variant:'destructive'});},onSettled:()=>setUploading(false)});
 const deleteMutation=useMutation({mutationFn:async(id:string)=>{if(!canManage)throw Error('This gallery is view only.');return deleteClubMedia(supabase,id);},onSuccess:()=>{refresh();toast({title:'Media deleted'});},onError:(error:any)=>toast({title:'Deletion not confirmed',description:error.message,variant:'destructive'})});
 const toggleFeatured=useMutation({mutationFn:async({id,featured}:{id:string;featured:boolean})=>{if(!canManage)throw Error('This gallery is view only.');return featureClubMedia(supabase,id,featured);},onSuccess:refresh,onError:(error:any)=>toast({title:'Could not change featured media',description:error.message,variant:'destructive'})});
 const cancelAdd=async()=>{if(addMutation.isPending)return;try{if(pending)await discardClubFile(supabase,pending);setShowAddDialog(false);resetForm();refresh();}catch{setShowAddDialog(false);resetForm();toast({title:'Upload could not be checked',description:'It remains private. Refresh the gallery before starting another upload.',variant:'destructive'});}};
 const pickImage=async()=>{if(!canManage||pending)return;try{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){toast({title:'Photo access required',description:'Allow library access to pick a file.',variant:'destructive'});return;}const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:mediaType==='video'?ImagePicker.MediaTypeOptions.Videos:ImagePicker.MediaTypeOptions.Images,quality:0.9});if(result.canceled||!result.assets[0])return;let asset=result.assets[0],uri=asset.uri,name=asset.fileName||'media',mime=asset.mimeType||'';if(mime==='image/heic'||mime==='image/heif'||/\.hei[cf]$/i.test(name)){const manipulator=await import('expo-image-manipulator');const converted=await manipulator.manipulateAsync(uri,[],{format:manipulator.SaveFormat.JPEG,compress:0.9});uri=converted.uri;name='photo.jpg';mime='image/jpeg';}setSelectedFile({uri,name,mimeType:mime});setUrl('');}catch(error:any){toast({title:'Could not pick media',description:error.message,variant:'destructive'});}};
 const openItem=async(item:any)=>{try{if(item.storage_path){const result=await supabase.storage.from('club-media').createSignedUrl(item.storage_path,3600);if(result.error||!result.data?.signedUrl)throw result.error||Error('Private preview unavailable.');setPreview({uri:result.data.signedUrl,type:item.media_type});}else await Linking.openURL(clubHttpsLink(item.url));}catch(error:any){toast({title:'Could not open media',description:error.message||'Refresh this gallery and try again.',variant:'destructive'});}};
 const confirmDelete=(item:any)=>Alert.alert('Delete this media?','This removes the item and its uploaded file from the gallery.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>deleteMutation.mutate(item.id)}]);
 if(!user)return <Text style={s.subtitle}>Sign in to view club media.</Text>;
 if(galleries.isPending)return <ActivityIndicator accessibilityLabel="Loading galleries"/>;
 if(galleries.isError)return <Button onPress={()=>void galleries.refetch()}>Retry loading galleries</Button>;
 if(!galleries.data?.length)return <View><Text style={s.subtitle}>No club galleries are available to this account.</Text><Button onPress={()=>void galleries.refetch()}>Refresh access</Button></View>;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <ImageIcon size={20} color={colors.foreground} />
            <Text style={s.title}>Media Gallery</Text>
          </View>
          <Text style={s.subtitle}>Photos, videos, and embedded content organized by team and event</Text>
        </View>
        {canManage && <Button testID="club-media-add" accessibilityLabel="Add media" onPress={() => { if(!pending)resetForm(); setShowAddDialog(true); }}>
          <Plus size={16} color={colors.primaryForeground} />
          <Text style={s.btnPrimaryText}>Add Media</Text>
        </Button>}
      </View>

      <Select value={selectedOwner} onValueChange={value=>{if(!pending&&!addMutation.isPending){setSelectedOwner(value);setFilterTeam('all');}}}><SelectTrigger><SelectValue placeholder="Choose gallery"/></SelectTrigger><SelectContent>{galleries.data.map(g=><SelectItem key={g.owner_user_id} value={g.owner_user_id}>{g.label}</SelectItem>)}</SelectContent></Select>
      {!canManage&&<Text style={s.helpText}>View-only gallery</Text>}
      {teamsQuery.isError&&<Button variant="outline" onPress={()=>void teamsQuery.refetch()}>Retry loading teams</Button>}
      <Button variant="outline" onPress={()=>void mediaQuery.refetch()}>Refresh private previews</Button>
      {/* Filters */}
      <View style={s.filters}>
        <View style={s.searchWrap}>
          <Search size={16} color={colors.mutedForeground} style={s.searchIcon} />
          <Input
            placeholder="Search by caption, event, tag..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={s.searchInput}
          />
        </View>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger style={{ width: 160 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger style={{ width: 140 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="link">Links</SelectItem>
          </SelectContent>
        </Select>
      </View>

      {/* Gallery Grid */}
      {mediaQuery.isError ? <Button onPress={()=>void mediaQuery.refetch()}>Couldn't load gallery. Retry</Button> : isLoading ? (
        <View style={s.centerPad}><ActivityIndicator size="large" color={colors.mutedForeground} /></View>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent style={s.emptyCard}>
            <ImageIcon size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.md }} />
            <Text style={s.emptyTitle}>No media yet</Text>
            <Text style={s.emptySubtitle}>No items match this gallery and its current filters.</Text>
          </CardContent>
        </Card>
      ) : (
        <View style={s.grid}>
          {filtered.map((item: any) => (
            <Card key={item.id} style={s.gridCard}>
              <View style={s.mediaBox}>
                {item.storage_path&&item.media_type==='image'&&item.preview_url ? <Pressable accessibilityRole="button" accessibilityLabel="Open photo" onPress={()=>void openItem(item)} style={{flex:1}}><RNImage source={{uri:item.preview_url}} style={s.mediaImage} resizeMode="cover"/></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Open media" onPress={()=>void openItem(item)} style={s.videoPlaceholder}><Video size={32} color={colors.mutedForeground}/><Text style={s.helpText}>{item.storage_path?'Open private media':'Open link'}</Text></Pressable>}
                {item.is_featured && (
                  <View style={s.featuredBadgeWrap}>
                    <Badge>
                      <Star size={10} color={colors.primaryForeground} />
                      <Text style={s.badgeTextTiny}>Featured</Text>
                    </Badge>
                  </View>
                )}
              </View>
              <CardContent style={s.cardBody}>
                {item.caption ? <Text style={s.caption} numberOfLines={1}>{item.caption}</Text> : null}
                <View style={s.badgeRow}>
                  {item.teams?.name ? <Badge variant="outline"><Text style={s.badgeTextTiny}>{item.teams.name}</Text></Badge> : null}
                  {item.event_name ? <Badge variant="secondary"><Text style={s.badgeTextTiny}>{item.event_name}</Text></Badge> : null}
                  <Badge variant="outline"><Text style={s.badgeTextTiny}>{item.media_type}</Text></Badge>
                </View>
                {item.tags && item.tags.length > 0 ? (
                  <View style={s.badgeRow}>
                    {item.tags.slice(0, 3).map((t: string) => (
                      <Badge key={t} variant="secondary"><Text style={s.badgeTextMicro}>{t}</Text></Badge>
                    ))}
                  </View>
                ) : null}
                <View style={s.actionRow}>
                  {canManage && <Button accessibilityLabel="Toggle featured media" disabled={toggleFeatured.isPending} variant="ghost" size="sm" onPress={() => toggleFeatured.mutate({ id: item.id, featured: !item.is_featured })}>
                    <Star size={12} color={item.is_featured ? colors.primary : colors.foreground} fill={item.is_featured ? colors.primary : "transparent"} />
                  </Button>}
                  <Button accessibilityLabel="Open media" variant="ghost" size="sm" onPress={() => void openItem(item)}>
                    <ExternalLink size={12} color={colors.foreground} />
                  </Button>
                  <View style={{ flex: 1 }} />
                  {canManage && <Button accessibilityLabel="Delete media" disabled={deleteMutation.isPending} variant="ghost" size="sm" onPress={() => confirmDelete(item)}>
                    <Trash2 size={12} color={colors.destructive} />
                  </Button>}
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      )}

      {!mediaQuery.isPending&&!mediaQuery.isError&&<View style={s.actionRow}><Button disabled={page===0} variant="outline" onPress={()=>setPage(v=>v-1)}>Previous</Button><Text style={s.helpText}>{mediaQuery.data?.total||0} items · page {page+1}</Text><Button disabled={(page+1)*50>=(mediaQuery.data?.total||0)} variant="outline" onPress={()=>setPage(v=>v+1)}>Next</Button></View>}
      <Dialog open={!!preview} onOpenChange={open=>{if(!open)setPreview(null);}}><DialogContent><DialogHeader><DialogTitle>Private media</DialogTitle></DialogHeader>{preview?.type==='image'?<RNImage source={{uri:preview.uri}} style={{width:'100%',height:300}} resizeMode="contain"/>:preview?<ClubVideo uri={preview.uri}/>:null}<Button onPress={()=>setPreview(null)}>Close preview</Button></DialogContent></Dialog>
      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={open=>{if(open)setShowAddDialog(true);else void cancelAdd();}}>
        <DialogContent style={{ maxWidth: 520 }}>
          <DialogHeader><DialogTitle>Add Media</DialogTitle></DialogHeader>
          <View style={s.dialogBody}>
            <View style={s.fieldGroup}>
              <Label>Media Type</Label>
              <Select value={mediaType} onValueChange={value=>{if(!pending){setMediaType(value);setSelectedFile(null);}}}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="link">HTTPS Link</SelectItem>
                </SelectContent>
              </Select>
            </View>
            {mediaType!=="image"&&<View style={s.fieldGroup}>
              <Label>URL</Label>
              <Input accessibilityLabel="Media URL" editable={!pending&&!selectedFile} value={url} onChangeText={setUrl} placeholder="https://..." />
              <Text style={s.helpText}>Use HTTPS links, or a YouTube link for video. Choose a file to upload a private video.</Text>
            </View>}
            {mediaType !== "link" ? (
              <View style={s.fieldGroup}>
                <Label>{mediaType==='image'?'Photo from Library':'Or Upload from Library'}</Label>
                <Button testID="club-media-pick-file" variant="outline" disabled={!!pending} onPress={()=>void pickImage()}>
                  <Text style={s.btnOutlineText}>{selectedFile ? "Replace file" : "Pick photo or video"}</Text>
                </Button>
                {selectedFile ? (
                  <Text style={s.helpText} numberOfLines={1}>Selected: {selectedFile.name}</Text>
                ) : null}
              </View>
            ) : null}
            <View style={s.twoCol}>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Label>Team (optional)</Label>
                <Select value={teamId} onValueChange={value=>{if(!pending)setTeamId(value);}}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </View>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Label>Event Name (optional)</Label>
                <Input editable={!pending} value={eventName} onChangeText={setEventName} placeholder="e.g. Spring Tournament" />
              </View>
            </View>
            <View style={s.fieldGroup}>
              <Label>Caption</Label>
              <Input accessibilityLabel="Media caption" editable={!pending} value={caption} onChangeText={setCaption} />
            </View>
            <View style={s.fieldGroup}>
              <Label>Tags (comma-separated)</Label>
              <Input editable={!pending} value={tags} onChangeText={setTags} placeholder="e.g. highlights, defense" />
            </View>
            <View style={s.switchRow}>
              <Switch disabled={!!pending} value={isFeatured} onValueChange={setIsFeatured} />
              <Label>Featured content</Label>
            </View>
          </View>
          {pending&&<Text style={s.helpText}>Your private upload is kept for retry. Cancel checks whether it was saved before removing an unfinished file.</Text>}
          {saveError?<Text accessibilityRole="alert" testID="club-media-save-error" style={{color:colors.destructive}}>{saveError}</Text>:null}
          <DialogFooter>
            <Button variant="outline" disabled={addMutation.isPending} onPress={()=>void cancelAdd()}>
              <Text style={s.btnOutlineText}>Cancel</Text>
            </Button>
            <Button
              testID="club-media-save"
              accessibilityLabel={pending?'Retry save media':'Save media'}
              onPress={() => addMutation.mutate()}
              disabled={!canManage || (!url.trim() && !selectedFile) || addMutation.isPending || uploading}
            >
              {(addMutation.isPending || uploading) ? <Loader2 size={16} color={colors.primaryForeground} /> : null}
              <Text style={s.btnPrimaryText}>{pending?'Retry save':'Add Media'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

export default ClubMediaGallery;

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, flexWrap: "wrap" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: typography.fontFamily.heading, fontSize: typography.size.xl, color: colors.foreground, letterSpacing: typography.letterSpacing.heading },
  subtitle: { fontFamily: typography.fontFamily.body, fontSize: typography.size.sm, color: colors.mutedForeground, marginTop: 2 },
  btnPrimaryText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primaryForeground, fontSize: typography.size.sm, marginLeft: spacing.xs },
  btnOutlineText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.size.sm },
  filters: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", alignItems: "center" },
  searchWrap: { flex: 1, minWidth: 200, position: "relative", justifyContent: "center" },
  searchIcon: { position: "absolute", left: spacing.sm, zIndex: 1 },
  searchInput: { paddingLeft: spacing.xl },
  centerPad: { paddingVertical: spacing.xxxl, alignItems: "center" },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyTitle: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.size.base, marginBottom: spacing.xs },
  emptySubtitle: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.size.sm, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridCard: { width: "48%", overflow: "hidden" },
  mediaBox: { aspectRatio: 16 / 9, backgroundColor: colors.muted, position: "relative" },
  mediaImage: { width: "100%", height: "100%" },
  videoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },
  featuredBadgeWrap: { position: "absolute", top: spacing.xs, left: spacing.xs },
  cardBody: { padding: spacing.sm, gap: spacing.xs },
  caption: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.sm, color: colors.foreground },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" },
  badgeTextTiny: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.foreground, marginLeft: 2 },
  badgeTextMicro: { fontFamily: typography.fontFamily.body, fontSize: 9, color: colors.foreground },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingTop: spacing.xs },
  dialogBody: { gap: spacing.md, paddingVertical: spacing.sm },
  fieldGroup: { gap: spacing.xs },
  twoCol: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  helpText: { fontFamily: typography.fontFamily.body, fontSize: typography.size.xs, color: colors.mutedForeground },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
