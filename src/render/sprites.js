import {EDEF} from '../data/enemies.js';
import {ctx} from './canvas.js';
const sprites=new Map();
function load(d) {
 if(!d.svg)return null;
 let entry=sprites.get(d.svg);if(entry)return entry;
 entry={canvas:null,promise:null};sprites.set(d.svg,entry);
 entry.promise=new Promise(resolve=>{
  const img=new Image();img.onload=()=>{
   const size=d.final?512:d.boss?256:96,c=document.createElement('canvas');c.width=c.height=size;
   c.getContext('2d').drawImage(img,0,0,size,size);entry.canvas=c;resolve(true);
  };img.onerror=()=>resolve(false);img.src=new URL('../../'+d.svg,import.meta.url).href;
 });return entry;
}
export async function preloadSprites(){return Promise.all(Object.values(EDEF).filter(d=>d.svg).map(d=>load(d).promise));}
export function drawSprite(d,e) {
 const entry=load(d);if(!entry?.canvas)return false;
 const size=e.r*2.75;ctx.drawImage(entry.canvas,-size/2,-size/2,size,size);return true;
}
// Small idle batches avoid downloading the entire catalogue during initial boot.
const unique=[...new Map(Object.values(EDEF).filter(d=>d.svg).map(d=>[d.svg,d])).values()];
let index=0;function warm(){for(let n=0;n<4&&index<unique.length;n++)load(unique[index++]);if(index<unique.length)setTimeout(warm,100);}
setTimeout(warm,100);
