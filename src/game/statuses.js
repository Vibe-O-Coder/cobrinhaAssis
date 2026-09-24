import {S} from '../core/state.js';
import {headPx,hitPlayer} from './player.js';
import {addText} from '../render/fx.js';
const locks={silence:['silenceT',1.8,'ULT BLOQUEADO','#ce97ff'],disarm:['disarmT',1.5,'DESARMADO','#ff80b8'],stun:['staggerT',.35,'ATORDOADO','#ffe277'],freeze:['frostT',2,'CONGELADO','#75e4ff'],slow:['frostT',1.3,'LENTIDÃO','#99aeff'],poison:['poisonT',3,'VENENO','#89e66a'],burn:['burnT',2,'CHAMAS','#ff974e']};
export function inflict(p,effect) {
 if(!p||p.dead||S.sandbox?.invulnerable)return;
 const d=locks[effect]||(effect==='weaken'?['weakT',3,'CORROSÃO','#ffb5d0']:effect==='noregen'?['noRegenT',4,'SEM REGENERAÇÃO','#b9d667']:null);if(!d)return;
 p.statusImmunity??={};if((p.statusImmunity[effect]||0)>0)return;
 p[d[0]]=Math.max(p[d[0]]||0,d[1]);
 if(effect==='weaken')p.weakN=Math.min(4,(p.weakN||0)+1);
 p.statusImmunity[effect]=d[1]+(effect==='stun'?4:2);
 const h=headPx(p);addText(h.x,h.y-42,d[2],d[3],1,13);
}
export function tickStatuses(p,dt) {
 for(const field of ['silenceT','disarmT','staggerT','frostT','poisonT','burnT'])p[field]=Math.max(0,(p[field]||0)-dt);
 for(const key in p.statusImmunity)p.statusImmunity[key]=Math.max(0,p.statusImmunity[key]-dt);
 if(p.poisonT>0||p.burnT>0){p.statusTick=(p.statusTick||0)-dt;if(p.statusTick<=0){p.statusTick=1;hitPlayer(p,p.burnT>0?.4:.3);}}
}
