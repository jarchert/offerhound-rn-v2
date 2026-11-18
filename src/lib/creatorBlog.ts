/** Owner-scoped blog writes. Publication is confirmed by the returned row, never by request intent. */
export async function saveCreatorBlog(client:any,input:{influencerId:string;postId?:string;updatedAt?:string;title:string;bodyMarkdown:string;excerpt:string;tags:string[];publish:boolean;heroImageUrl?:string;sportTags?:string[];visibility?:string}) {
 if(!input.influencerId)throw new Error('Creator profile required.');
 if(!input.title.trim())throw new Error('Give your post a title before saving.');
 if(input.title.trim().length>200||input.excerpt.length>500||input.bodyMarkdown.length>100000||input.tags.length>20)throw new Error('Shorten the title, excerpt, body or tags before saving.');
 if(input.postId&&!input.updatedAt)throw new Error('Reload this blog before saving.');
 if(input.publish&&!input.bodyMarkdown.trim())throw new Error('Write your post before publishing.');
 if(input.heroImageUrl?.trim()&&!/^https?:\/\//i.test(input.heroImageUrl.trim()))throw new Error('Use an HTTP or HTTPS cover image link.');
 if(input.sportTags&&input.sportTags.length>20)throw new Error('Choose up to 20 sports.');
 if(input.visibility!==undefined&&!['public','logged_in_only'].includes(input.visibility))throw new Error('Choose Everyone or Signed-in members before saving.');
 const payload={influencer_id:input.influencerId,title:input.title.trim(),body_markdown:input.bodyMarkdown,excerpt:input.excerpt.trim()||null,tags:input.tags,status:input.publish?'published':'draft',
  ...(input.heroImageUrl!==undefined?{hero_image_url:input.heroImageUrl.trim()||null}:{}),
  ...(input.sportTags!==undefined?{sport_tags:[...new Set(input.sportTags.map(value=>value.trim().toLowerCase()).filter(Boolean))]}:{}),
  ...(input.visibility!==undefined?{visibility:input.visibility}:{})};
 let query=client.from('influencer_blog_posts');
 query=input.postId?query.update(payload).eq('id',input.postId).eq('influencer_id',input.influencerId).eq('updated_at',input.updatedAt):query.insert({...payload,slug:''});
 const result=await query.select('id,influencer_id,status,body_markdown,updated_at,hero_image_url,sport_tags,visibility').single();if(result.error)throw result.error;
 if(!result.data?.id||(input.postId&&result.data.id!==input.postId)||result.data.influencer_id!==input.influencerId||result.data.status!==payload.status||result.data.body_markdown!==payload.body_markdown)throw new Error('Blog save was not confirmed. Reload before retrying.');
 if(input.heroImageUrl!==undefined&&result.data.hero_image_url!==(input.heroImageUrl.trim()||null)||input.visibility!==undefined&&result.data.visibility!==input.visibility||input.sportTags!==undefined&&JSON.stringify(result.data.sport_tags)!==JSON.stringify(payload.sport_tags))throw new Error('Blog options were not confirmed. Reload before retrying.');
 return result.data;
}
export async function changeCreatorBlog(client:any,input:{influencerId:string;postId:string;updatedAt:string;action:'archive'|'restore'|'delete'}){
 if(!input.influencerId||!input.postId||!input.updatedAt)throw new Error('Reload this blog before changing it.');
 if(!['archive','restore','delete'].includes(input.action))throw new Error('Choose a valid blog action.');
 let query=client.from('influencer_blog_posts');
 query=input.action==='delete'?query.delete():query.update({status:input.action==='archive'?'archived':'draft'});
 const result=await query.eq('id',input.postId).eq('influencer_id',input.influencerId).eq('updated_at',input.updatedAt).select('id,status').single();if(result.error)throw result.error;
 if(result.data?.id!==input.postId||(input.action!=='delete'&&result.data.status!==(input.action==='archive'?'archived':'draft')))throw new Error('Blog change was not confirmed. It may have changed elsewhere. Reload before retrying.');return result.data;
}
