// Native-only resource generation. No web runtime/source dependency.
const {withDangerousMod}=require('@expo/config-plugins');
const fs=require('node:fs/promises');const path=require('node:path');
const palettes=require('../src/lib/themePalettes.json');
const alphas=['33','40','4D','66','80','99','B3','F2'];
const name=(key,alpha='')=>'offerhound_'+key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())+(alpha?'_'+alpha.toLowerCase():'');
function colorXml(palette) {
 const entries=[];
 for(const [key,value] of Object.entries(palette))if(/^#[\da-f]{6}$/i.test(value)) {
  entries.push(`<color name="${name(key)}">${value}</color>`);
  for(const alpha of alphas)entries.push(`<color name="${name(key,alpha)}">#${alpha}${value.slice(1)}</color>`);
 }
 return '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'+entries.join('\n')+'\n</resources>\n';
}
module.exports=config=>withDangerousMod(config,['android',async config=>{
 for(const [theme,folder]of [['light','values'],['dark','values-night']]) {
  const dir=path.join(config.modRequest.platformProjectRoot,'app','src','main','res',folder);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'offerhound_theme.xml'),colorXml(palettes[theme]));
 }
 return config;
}]);
module.exports.colorXml=colorXml;
