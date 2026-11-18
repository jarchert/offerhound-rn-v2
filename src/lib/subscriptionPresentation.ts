/** Free role access never implies a paid subscription or every premium feature. */
export function subscriptionPresentation(roleFree:boolean,iap:any,web:any,skuTier:(sku:string)=>string|null,tiers:Array<{id:string;priceId:string;name:string}>) {
 const unexpired=(date:string|null|undefined)=>!date||(Number.isFinite(Date.parse(date))&&Date.parse(date)>Date.now());
 const iapPaid=!!iap?.is_active&&unexpired(iap.expires_at);
 const webPaid=web?.subscribed===true&&unexpired(web.subscription_end);
 const paid=iapPaid||webPaid;
 const product=iapPaid?iap.product_id:webPaid?web.price_id:null;
 const matched=tiers.find(t=>t.priceId===product);
 const tier=paid?(iapPaid?skuTier(product)||matched?.id||iap.tier||'paid':matched?.id||'paid'):roleFree?'free':'none';
 return {tier,isActive:paid||roleFree,hasRoleAccess:roleFree,hasPaidSubscription:paid,tierName:paid?(tiers.find(t=>t.id===tier)?.name||'Paid subscription'):roleFree?'Free role access':null,priceId:product,subscriptionEnd:iapPaid?iap.expires_at:webPaid?web.subscription_end:null};
}
