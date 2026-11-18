import {campQRVector} from './campEventQR';
import palettes from './themePalettes.json';
const colors=palettes.dark;
const xml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
function lines(value:string,width:number) {
  return value.split(/\r?\n/).flatMap(paragraph=>{
    const result:string[]=[];let line='';
    for(const word of paragraph.trim().split(/\s+/)) {
      const chunks=Array.from(word);while(chunks.length>width){if(line){result.push(line);line='';}result.push(chunks.splice(0,width).join(''));}
      const part=chunks.join('');if(Array.from(line+' '+part).length>width){result.push(line);line=part;}else line+=(line?' ':'')+part;
    }
    result.push(line);return result;
  });
}
/** Shared content/layout for PNG, SVG and PDF; all camp text is escaped. */
export function campFlyer(url:string,name:string,description='') {
  const title=lines(name,34),body=lines(description||'No camp description provided.',64);
  const qr=campQRVector(url),qrY=205+title.length*56+body.length*34+40;
  const urlLines=lines(url,110),height=qrY+600+170+urlLines.length*18;
  const text=(value:string,y:number,size:number,weight=400)=>`<text x="512" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#101318">${xml(value)}</text>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="${height}" viewBox="0 0 1024 ${height}"><rect width="1024" height="${height}" fill="white"/><rect width="1024" height="125" fill="${colors.primary}"/>${text('OFFERHOUND',72,52,700)}${text('CAMP REGISTRATION',108,22,700)}${title.map((line,i)=>text(line,185+i*56,44,700)).join('')}${body.map((line,i)=>text(line,205+title.length*56+i*34,24)).join('')}<g transform="translate(212 ${qrY}) scale(${600/qr.size})"><rect width="${qr.size}" height="${qr.size}" fill="white"/><path fill="black" d="${qr.cells.map(([x,y])=>`M${x} ${y}h1v1h-1z`).join('')}"/></g>${text('SCAN TO REGISTER',qrY+648,30,700)}${text('Adults or parents/guardians can register and review camp consent.',qrY+688,22)}${text('No account required.',qrY+722,22)}${urlLines.map((line,i)=>text(line,qrY+758+i*18,14)).join('')}</svg>`;
  return {svg,width:1024,height};
}
export function campFlyerHTML(flyer:ReturnType<typeof campFlyer>) {
  return `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>@page{margin:0}html,body{margin:0;padding:0}svg{display:block;width:100%;height:auto}</style></head><body>${flyer.svg}</body></html>`;
}
