/** Independently implemented guardian management using server-owned invitation contracts. */
import React from 'react';
import {GuardianManagement} from '@/components/GuardianManagement';
export function ParentInviteModal({athleteProfileId}:{athleteProfileId?:string}){return <GuardianManagement athleteProfileId={athleteProfileId}/>;}
export default ParentInviteModal;
