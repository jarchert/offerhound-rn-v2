import {saveAthleteMedia} from './athleteMedia';
/** Persist only the explicit current step. Rejections leave the form open for retry. */
export async function persistOnboardingStep(options:any) {
 const {step,profile,form,userId,createProfile,updateProfile,positions,profileImageUrl,coachRefs,client,acceptTerms,termsSaved,newToken,slug}=options;
 if(!userId)throw Error('Sign in before saving your profile.');
 if(step===0){if(!termsSaved)await acceptTerms();return;}
 let data:any;
 if(step===1)data={custom_url:slug,full_name:form.full_name,sport:form.sport};
 if(step===2&&String(form.gpa??'').trim()&&(!Number.isFinite(Number(form.gpa))||Number(form.gpa)<0||Number(form.gpa)>5))throw Error('Enter a GPA between 0 and 5.');
 if(step===2)data={position:positions[0]||form.position||null,positions,school:form.school,state:form.state||null,graduation_year:form.graduation_year,gpa:String(form.gpa??'').trim()?Number(form.gpa):null,height:form.height||null,weight:form.weight||null,bio:form.bio||null};
 if(step===3){if(!profile?.id)throw Error('Save your athlete profile before adding media.');if((form.highlight_video_url||null)!==(profile.highlight_video_url||null))await saveAthleteMedia(client,profile.id,{highlight_video_url:form.highlight_video_url||null},{highlight_video_url:profile.highlight_video_url||null});}
 if(step===3)data={instagram_url:form.instagram_url||null,twitter_url:form.twitter_url||null,tiktok_url:form.tiktok_url||null};
 if(data){if(profile)await updateProfile(data);else await createProfile(data);return;}
 if(step===4){
  const valid=coachRefs.filter((c:any)=>c.name.trim()&&c.email.trim());if(!valid.length)return;
  if(!profile?.id)throw Error('Save your athlete profile before adding references.');
  const {data:existing,error:readError}=await client.from('coach_references').select('coach_email').eq('athlete_profile_id',profile.id).in('coach_email',valid.map((c:any)=>c.email.trim().toLowerCase()));if(readError)throw readError;
  const seen=new Set((existing||[]).map((r:any)=>r.coach_email?.toLowerCase()));
  const rows=valid.filter((c:any)=>{const email=c.email.trim().toLowerCase();if(seen.has(email))return false;seen.add(email);return true;}).map((c:any)=>({athlete_profile_id:profile.id,coach_name:c.name.trim(),coach_email:c.email.trim().toLowerCase(),invitation_status:'pending',invitation_token:newToken()}));
  if(rows.length){const {error}=await client.from('coach_references').insert(rows);if(error)throw error;}
 }
}
