/* Dois ponteiros independentes no multiplayer local; um no solo/online. */
import { $ } from '../core/utils.js';
import { S } from '../core/state.js';
import { save, persist } from '../core/save.js';
import { initAudio } from '../core/audio.js';
import { steer, useAbilityOf, useItemOf } from './input.js';
import { togglePause, togglePowers, toggleStats } from './overlays.js';
const sticks=[];
export function touchWanted(){
  if(save.touch==='on')return true;if(save.touch==='off')return false;
  return navigator.maxTouchPoints>0 || window.matchMedia?.('(pointer: coarse)').matches;
}
export function refreshTouchUI(){
  const on=touchWanted();document.body.classList.toggle('touch-on',on);$('#touchUI')?.classList.toggle('hidden',!on);
  if(!on)sticks.forEach(s=>s.release());
}
function installStick(zone,who,suffix=''){
  let id=null,ox=0,oy=0,last=null;
  const wrap=$('#tStick'+suffix),knob=$('#tStickKnob'+suffix);
  const release=()=>{id=null;last=null;wrap.classList.remove('live');knob.style.transform='translate(0,0)';};
  sticks.push({release});
  zone.addEventListener('pointerdown',e=>{
    if(id!==null||S.phase!=='play'||S.paused)return;
    initAudio();id=e.pointerId;ox=e.clientX;oy=e.clientY;
    const r=zone.getBoundingClientRect();wrap.style.left=ox-r.left+'px';wrap.style.top=oy-r.top+'px';wrap.classList.add('live');zone.setPointerCapture(id);e.preventDefault();
  });
  zone.addEventListener('pointermove',e=>{
    if(e.pointerId!==id)return;
    const dx=e.clientX-ox,dy=e.clientY-oy,d=Math.hypot(dx,dy),scale=d>54?54/d:1;
    knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
    if(d<22)return;
    const horizontal=last?.y===0 ? Math.abs(dx)*1.3>=Math.abs(dy) : last?.x===0 ? Math.abs(dx)>=Math.abs(dy)*1.3 : Math.abs(dx)>=Math.abs(dy);
    const direction=horizontal?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)};
    if(last?.x!==direction.x||last?.y!==direction.y){last=direction;steer(direction,who);}
    e.preventDefault();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(event,e=>{if(e.pointerId===id)release();});
}
export function installTouch(){
  const ui=$('#touchUI');if(!ui)return;
  const zone=$('#tStickZone'),z2=zone.cloneNode(true);z2.id='tStickZone2';
  z2.querySelectorAll('[id]').forEach(el=>el.id+='2');ui.appendChild(z2);
  const b2=document.createElement('div');b2.id='tBtns2';b2.innerHTML='<button class="tbtn ab" data-touch="ab2" title="habilidade do J2">✨</button><button class="tbtn item" data-touch="item2" title="item do J2">🎒</button>';ui.appendChild(b2);
  installStick(zone,0);installStick(z2,1,'2');
  const actions={ab:()=>useAbilityOf(0),ab2:()=>useAbilityOf(1),item:()=>useItemOf(0),item2:()=>useItemOf(1),powers:togglePowers,stats:toggleStats,pause:()=>{if(S.phase==='play'||S.paused)togglePause();}};
  ui.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-touch]');if(!b)return;e.preventDefault();initAudio();actions[b.dataset.touch]?.();b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),120);});
  ui.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('blur',()=>sticks.forEach(s=>s.release()));
  refreshTouchUI();syncTouchLayout();
}
export function cycleTouchPref(){const values=['auto','on','off'];save.touch=values[(values.indexOf(save.touch)+1)%3];persist();refreshTouchUI();return save.touch;}
export function syncTouchLayout(){
  const local=S.role==='solo' && (S.mode==='local'||S.pvpLocal);
  document.body.classList.toggle('local-touch',local);
  $('#tStickZone2')?.classList.toggle('hidden',!local);$('#tBtns2')?.classList.toggle('hidden',!local);
  $('#tAb2')?.classList.add('hidden');
  $('#tItem')?.classList.toggle('hidden',S.mode!=='pvp');
  $('#tBtns2 [data-touch="item2"]')?.classList.toggle('hidden',S.mode!=='pvp');
  sticks.forEach(s=>s.release());
}
