// Versão explícita; os snapshots continuam independentes (perda não quebra deltas).
const schemas={
 enemies:'id x y hp mhp type r flash elite enraged tier ward affixes openT stunT cursedT mode fphase orb armed bossPhase bossAction rank tell survival',
 pbullets:'x y vx vy crit color trail', ebullets:'x y vx vy r c trail',
 foods:'x y t', drops:'x y t life born', blocks:'x y hp',bombs:'x y t r',
 bossHazards:'shape x y x2 y2 r inner width delay life c effect damage',
};
for(const key in schemas)schemas[key]=schemas[key].split(' ');
const interned=new Set(['type','c','color','shape']);
function encode(row,keys,intern){const a=keys.map(k=>{const v=row[k];return typeof v==='number'?Math.round(v*100)/100:typeof v==='string'&&interned.has(k)?intern(v):v??null;});while(a.at(-1)===null)a.pop();return a;}
function decode(row,keys,strings){const o={};for(let i=0;i<row.length;i++)if(row[i]!==null)o[keys[i]]=interned.has(keys[i])?strings[row[i]]:row[i];return o;}
export function packMessage(message) {
 if(message.t!=='state'||!message.s)return message;
 const s={...message.s,wire:1},strings=[],dict=new Map();
 const intern=value=>{if(!dict.has(value)){dict.set(value,strings.length);strings.push(value);}return dict.get(value);};
 for(const key in schemas)if(Array.isArray(s[key]))s[key]=s[key].map(row=>encode(row,schemas[key],intern));
 s.strings=strings;
 return {...message,s};
}
export function unpackMessage(message) {
 if(message?.t!=='state'||message.s?.wire!==1)return message;
 const s={...message.s},strings=s.strings;delete s.wire;delete s.strings;
 for(const key in schemas)if(Array.isArray(s[key]))s[key]=s[key].map(row=>decode(row,schemas[key],strings));
 return {...message,s};
}
