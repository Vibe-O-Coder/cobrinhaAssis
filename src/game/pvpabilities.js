/* Ativas de duelo: valores próprios, sem execução de hordas ou cura sem limite. */
import { S } from '../core/state.js';
import { CELL, TAU } from '../core/config.js';
import { headPx, heal } from './player.js';
import { bulletDmg } from './stats.js';
import { foeOf, pvpHit, pvpBounds, wrapX, wrapY } from './pvp.js';
import { dist } from '../core/utils.js';
import { shockwave, ring, addParts, addText, shieldFx, beam, bombWarning } from '../render/fx.js';
import { cleanupEnemies, slowEnemy } from './enemies.js';

export const PVP_ABILITIES = [
  ['Giro Mortal',10,'Golpe próximo, dano e pressão em área.'],
  ['Nova Arcana',12,'Oito projéteis perfurantes em todas as direções.'],
  ['Passo Sombrio',10,'Avança cinco células e ataca ao reaparecer.'],
  ['Colheita Sombria',14,'Drena alvos próximos; cura até 2 de vida.'],
  ['Égide Divina',16,'Imunidade por 2 segundos.'],
  ['Bomba Ambulante',12,'Bomba com aviso, explode depois de 1 segundo.'],
  ['Fúria Controlada',16,'Ataques 35% mais rápidos por 4 segundos; ganha 2 de escudo.'],
  ['Recomposição',18,'Recupera até 3 segmentos e dispara uma flecha pesada.'],
  ['Zero Absoluto',14,'Dano em área e lentidão de 20% por 2 segundos.'],
  ['Brotar',14,'Recupera corpo e dispara cinco projéteis em leque.'],
  ['Chocalho',12,'Onda na cauda que causa dano e desacelera.'],
  ['Fase Ectoplasmática',16,'Atravessa golpes e corpos por 1,5 segundo.'],
  ['Banquete',16,'Recupera 3 segmentos e até 2 de vida.'],
  ['Torre Pesada',16,'Torre temporária que também mira no adversário.'],
  ['Trovoada',14,'Raio anunciado na posição do adversário próximo.'],
  ['Retroceder',18,'Retorna à posição passada e recupera até 3 de vida.'],
];
function salvo(p,count,mul,all=false) {
  const h=headPx(p), foe=foeOf(p), target=foe && headPx(foe);
  const a=target ? Math.atan2(target.y-h.y,target.x-h.x) : Math.atan2(p.dir.y,p.dir.x);
  for(let i=0;i<count;i++) {
    const angle=all ? i*TAU/count : a+(i-(count-1)/2)*0.22;
    S.pbullets.push({x:h.x,y:h.y,vx:Math.cos(angle)*480,vy:Math.sin(angle)*480,dmg:bulletDmg(p)*mul,owner:p,color:p.color,life:1.3,hits:[],pierce:1,trail:true,ls:p.ls,venom:0});
  }
}
function pulse(p,x,y,r,damage,slow=0) {
  shockwave(x,y,r,p.color,10); ring(x,y,r*1.15,'#ffffff',4);
  const foe=foeOf(p);
  if(foe) {
    const h=headPx(foe);
    if(dist(x,y,h.x,h.y)<r && pvpHit(foe,damage,p,'ability')>0 && slow) foe.pvpSlowT=slow;
  }
  for(const e of S.enemies) if(e.hp>0 && dist(x,y,e.x,e.y)<r) {
    e.hp-=damage*1.4; e.lastHitBy=p; if(slow) slowEnemy(e,slow,0.3);
  }
  cleanupEnemies();
}
export function usePvpAbility(p) {
  const h=headPx(p), foe=foeOf(p), damage=2.4+Math.min(3,p.level*0.08);
  p.abT=p.abCd;
  addParts(h.x,h.y,p.color,30,3); ring(h.x,h.y,90,p.color,5);
  addText(h.x,h.y-35,PVP_ABILITIES[p.cls][0],p.color,1,16);
  S.shake=Math.min(12,S.shake+5);
  switch(p.cls) {
    case 0: pulse(p,h.x,h.y,175,damage+1); break;
    case 1: salvo(p,8,0.85,true); break;
    case 2: {
      const b=pvpBounds();
      for(let i=0;i<5;i++) {const c=p.cells[0];p.cells.unshift([wrapX(c[0]+p.dir.x,b),wrapY(c[1]+p.dir.y,b)]);p.cells.pop();}
      p.iframes=0.4;
      const n=headPx(p); pulse(p,n.x,n.y,100,damage); break;
    }
    case 3: {
      const inReach=(foe && dist(h.x,h.y,headPx(foe).x,headPx(foe).y)<170) || S.enemies.some(e=>dist(h.x,h.y,e.x,e.y)<170);
      pulse(p,h.x,h.y,170,damage); if(inReach) heal(p,2); break;
    }
    case 4: p.shieldT=2; shieldFx(h.x,h.y,46,2,'#ffd75e',p); break;
    case 5: S.bombs.push({x:h.x,y:h.y,t:1,r:180,dmg:damage+2,owner:p}); bombWarning(h.x,h.y,180,1,p.color); break;
    case 6: p.overdriveT=4; p.guard=Math.min(p.guardMax,p.guard+2); break;
    case 7: p.grow+=Math.max(0,Math.min(3,10-p.cells.length-p.grow)); salvo(p,1,1.8); break;
    case 8: pulse(p,h.x,h.y,240,damage,2); break;
    case 9: p.grow+=3; salvo(p,5,0.65); break;
    case 10: { const t=p.cells.at(-1);pulse(p,(t[0]+0.5)*CELL,(t[1]+0.5)*CELL,240,damage,1.5);break; }
    case 11: p.phaseT=1.5; p.iframes=1.5; break;
    case 12: p.grow+=Math.max(0,Math.min(3,18-p.cells.length-p.grow));heal(p,2);pulse(p,h.x,h.y,150,damage);break;
    case 13:
      if(p.turrets.length>=3) p.turrets.shift();
      p.turrets.push({x:h.x,y:h.y,life:9,cd:0,rate:0.9,mul:0.7,owner:p});break;
    case 14:
      if(foe && dist(h.x,h.y,headPx(foe).x,headPx(foe).y)<500) {
        const t=headPx(foe);S.pvp.meteors.push({x:t.x,y:t.y,t:0.75,r:85,dmg:damage+1,owner:p});
        bombWarning(t.x,t.y,85,0.75,p.color);
      } else pulse(p,h.x,h.y,230,damage);break;
    case 15: {
      const past=p.timeline?.[0];
      if(past) {
        const b=pvpBounds();p.cells=past.cells.map(([x,y])=>[wrapX(x,b),wrapY(y,b)]);
        p.dir={...past.dir};p.qdir=null;p.hp=Math.min(p.maxHp,p.hp+Math.max(0,Math.min(3,past.hp-p.hp)));p.timeline=[];
      }
      p.iframes=0.6; const n=headPx(p);ring(n.x,n.y,200,p.color,7);break;
    }
  }
}
