import React from 'react';
import {Text,View,Alert} from 'react-native';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {changeCreatorBlog} from '@/lib/creatorBlog';
import {useInfluencerBlogPosts} from '@/hooks/useInfluencerContent';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {colors,spacing} from '@/lib/theme';

/** Owner workspace: drafts remain distinct from published articles. */
export function CreatorBlogs({influencerId,onEdit,onNew}:{influencerId:string;onEdit:(id:string)=>void;onNew:()=>void}){
 const cache=useQueryClient();
 const change=useMutation({mutationFn:(input:Parameters<typeof changeCreatorBlog>[1])=>changeCreatorBlog(supabase,input),onSuccess:()=>{void cache.invalidateQueries({queryKey:['influencer-blog-posts',influencerId]});},onError:(error:any)=>Alert.alert('Not saved',error.message||'Blog change was not confirmed.')});
 const confirm=(post:any,action:'archive'|'restore'|'delete')=>Alert.alert(action==='delete'?'Delete this blog?':action==='archive'?'Archive this blog?':'Return this blog to draft?',post.title,[{text:'Cancel',style:'cancel'},{text:'Confirm',style:action==='delete'?'destructive':'default',onPress:()=>change.mutate({influencerId,postId:post.id,updatedAt:post.updated_at,action})}]);
 const posts=useInfluencerBlogPosts(influencerId,{includeDrafts:true});
 if(posts.isLoading)return <Text>Loading your blogs…</Text>;
 if(posts.isError)return <Button onPress={()=>void posts.refetch()}>Could not load your blogs. Retry</Button>;
 return <View style={{gap:spacing.md}}><Button onPress={onNew}>New blog</Button>{!posts.data?.length?<Text style={{color:colors.mutedForeground}}>No blogs yet. Create a draft to get started.</Text>:posts.data.map((post:any)=><Card key={post.id} style={{padding:spacing.md,gap:spacing.sm}}><Text style={{color:colors.foreground}}>{post.title}</Text><Text style={{color:colors.mutedForeground}}>{post.status==='published'?'Published':post.status==='archived'?'Archived':'Draft'}</Text><Button variant="outline" disabled={change.isPending} onPress={()=>onEdit(post.id)}>Edit blog</Button><Button variant="outline" disabled={change.isPending} onPress={()=>confirm(post,post.status==='archived'?'restore':'archive')}>{post.status==='archived'?'Restore as draft':'Archive blog'}</Button>{post.status==='published'?<Button disabled={change.isPending} variant="outline" onPress={()=>confirm(post,'restore')}>Unpublish blog</Button>:null}<Button variant="outline" disabled={change.isPending} onPress={()=>confirm(post,'delete')}>Delete blog</Button></Card>)}</View>;
}
