import { campConsentUrl } from './campConsent';
// Public event IDs are not private attendee capabilities. This is a documented URL contract.
export function campEventUrl(campId:string) {
 if(!/^[0-9a-f-]{36}$/i.test(campId))throw Error('Invalid camp event');
 return campConsentUrl('').split('#')[0]+'?event='+encodeURIComponent(campId);
}
// Use the native QR renderer's QR engine, with a four-module white quiet zone.
const QR = require('qrcode');
export function campQRVector(url:string) {
 const modules=QR.create(url,{errorCorrectionLevel:'H'}).modules;
 const size=modules.size+8;
 const cells:Array<[number,number]>=[];
 for(let y=0;y<modules.size;y++)for(let x=0;x<modules.size;x++)if(modules.get(y,x))cells.push([x+4,y+4]);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/><path fill="black" d="${cells.map(([x,y])=>`M${x} ${y}h1v1h-1z`).join('')}"/></svg>`;
 return {size,cells,svg};
}
export function campQRFilename(name:string,id:string){return (name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'camp')+'-'+id.slice(0,8)+'-qr';}
// Standalone vector PDF, no network/render service; ASCII content makes byte offsets deterministic.
export function campQRPDF(url:string,name:string){
 const {size,cells}=campQRVector(url),scale=320/size;
 const escape=(v:string)=>v.replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,'\\$&');
 const stream=`BT /F1 18 Tf 50 740 Td (${escape(name.slice(0,60))}) Tj ET\nBT /F1 11 Tf 50 710 Td (Scan to register and provide camp consent) Tj ET\n`+cells.map(([x,y])=>`${(145+x*scale).toFixed(3)} ${(370+(size-y-1)*scale).toFixed(3)} ${scale.toFixed(3)} ${scale.toFixed(3)} re f`).join('\n')+`\nBT /F1 7 Tf 30 340 Td (${escape(url)}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let out='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
 const start=out.length;out+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;return out;
}
