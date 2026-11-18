import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/hooks/useAuth';
import {supabase} from '@/integrations/supabase/client';
import {readCreatorSyndication} from '@/lib/creatorSyndication';
export function useCreatorSyndication(influencerId?:string|null){const {user}=useAuth();return useQuery({queryKey:['creator-syndication',user?.id,influencerId],enabled:!!user?.id&&!!influencerId,queryFn:()=>readCreatorSyndication(supabase,user!.id,influencerId!)});}
