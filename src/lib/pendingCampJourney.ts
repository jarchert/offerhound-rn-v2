/** One short-lived in-memory return destination; contains event IDs, never credentials or private tokens. */
let pending:{campId:string;enrollmentId?:string;at:number}|null=null;
const valid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function rememberCampJourney(campId:string,enrollmentId?:string,now=Date.now()){
 if(!valid(campId)||(enrollmentId&&!valid(enrollmentId)))throw Error('Invalid camp destination');pending={campId,enrollmentId,at:now};
}
export function clearPendingCampJourney(){pending=null;}
export function takePendingCampJourney(now=Date.now()){
 const target=pending;pending=null;if(!target||now-target.at>20*60*1000)return null;
 return target.enrollmentId?{screen:'CampDeliverables',params:{campId:target.campId,enrollmentId:target.enrollmentId}}:{screen:'CampDetail',params:{campId:target.campId}};
}
