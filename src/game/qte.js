import {S} from '../core/state.js';
import {damagePlayer} from './player.js';
import {$} from '../core/utils.js';
import {toast} from '../ui/screens.js';

const directions=['up','right','down','left'];
const symbols={up:'↑',right:'→',down:'↓',left:'←'};
let serial=0;
export function startQte(boss){
  if(S.qte)return;
  const seq=Array.from({length:3},()=>directions[Math.floor(Math.random()*4)]);
  S.qte={id:++serial,bossId:boss.id,phase:(boss.bossPhase||0)+1,survival:!!boss.survival,sequence:seq,step:0,left:2.8,total:2.8};
  boss.burst=null;boss.hazards=[];S.ebullets=[];S.bossHazards=[];
}
export function resolveQte(success){
  const q=S.qte;if(!q)return;S.qte=null;
  const boss=S.enemies.find(e=>e.id===q.bossId);
  if(boss){boss.bossClock=success?3:1.5;boss.openT=success?4:0;boss.phaseLockT=0;}
  if(success){for(const p of S.players)if(!p.dead)p.iframes=Math.max(p.iframes,1.5);}
  else {for(const p of S.players)if(!p.dead)damagePlayer(p,2);}
  toast(success?(boss?.survival?'Última luz protegida. Sobreviva até o fim da canção!':'Ruptura! Chefe exposto por 4s.'):'Pulso do vazio · sequência interrompida');
}
export function qteInput(direction,who=0,id=S.qte?.id,step=S.qte?.step){
  const q=S.qte;
  if(!q||S.paused||!S.runActive||id!==q.id||step!==q.step||!S.players[who]||S.players[who].dead)return false;
  if(direction!==q.sequence[q.step]){resolveQte(false);return true;}
  q.step++;q.left=q.total;
  if(q.step===q.sequence.length)resolveQte(true);
  return true;
}
export function tickQte(dt){if(S.qte&&!S.paused){S.qte.left-=dt;if(S.qte.left<=0)resolveQte(false);}}
export function requestQte(direction,who=0){
  const q=S.role==='guest'?S.rs?.qte:S.qte;if(!q)return false;
  if(S.role==='guest')S.net?.send({t:'qte',direction,id:q.id,step:q.step});else qteInput(direction,who,q.id);
  return true;
}
export function renderQte(){
  let el=$('#qtePanel');
  const q=S.role==='guest'?S.rs?.qte:S.qte;
  if(!el){el=document.createElement('div');el.id='qtePanel';el.className='hidden';el.setAttribute('role','region');el.setAttribute('aria-label','Evento de reação rápida');$('#game').appendChild(el);
    el.innerHTML='<b>FASE II · RUPTURA DO VAZIO</b><p>Repita a sequência · WASD, setas ou botões</p><div id="qteSequence"></div><progress id="qteTime" max="2.8"></progress><div class="qte-buttons">'+directions.map(d=>'<button data-qte="'+d+'" aria-label="'+({up:'Cima',right:'Direita',down:'Baixo',left:'Esquerda'}[d])+'">'+symbols[d]+'</button>').join('')+'</div><small>O combate aguarda sua reação. Acerto: chefe exposto. Erro: 2 HP de dano.</small>';
    el.addEventListener('click',e=>{const btn=e.target.closest('[data-qte]');if(btn)requestQte(btn.dataset.qte);});
  }
  document.body.classList.toggle('qte-active',!!q&&S.runActive);
  el.classList.toggle('hidden',!q||!S.runActive||S.paused);if(!q)return;
  el.querySelector('b').textContent='FASE '+(q.phase===3?'III':'II')+' · RUPTURA DO VAZIO';
  el.querySelector('small').textContent=q.survival?'Acerto: proteção inicial. Erro: 2 HP de dano. Depois, sobreviva até a canção terminar · 1×.':'O combate aguarda sua reação. Acerto: chefe exposto. Erro: 2 HP de dano.';
  $('#qteSequence').innerHTML=q.sequence.map((d,i)=>'<span class="'+(i<q.step?'done':i===q.step?'current':'')+'">'+symbols[d]+'</span>').join('');
  $('#qteTime').value=q.left;
}
