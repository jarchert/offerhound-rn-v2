import React from 'react';
import {usePlayerProfile} from '@/hooks/usePlayerProfile';
import {GuardianManagement} from '@/components/GuardianManagement';
export function ParentInviteCard(){const {profile}=usePlayerProfile();return profile?.id?<GuardianManagement athleteProfileId={profile.id}/>:null;}
export default ParentInviteCard;
