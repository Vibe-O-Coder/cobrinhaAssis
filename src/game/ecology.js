import {S} from '../core/state.js';
import {W,H,TAU} from '../core/config.js';
import {dist,clamp} from '../core/utils.js';
import {MAX_ENEMIES,MAX_ENEMY_BULLETS} from '../core/scaling.js';
import {MUTATIONS} from '../data/ecology.js';
import {addEnemyHazard} from './bosses.js';
import {ring,addText,aim} from '../render/fx.js';

function fire(e,a,speed=220,offset=0) {
 if(S.ebullets.length>=MAX_ENEMY_BULLETS)return;
 S.ebullets.push({x:e.x+Math.cos(a)*offset,y:e.y+Math.sin(a)*offset,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
  r:5,life:4,c:e.ecologyColor,aff:e.affixes,effect:e.effect,damage:e.contactMul||1});
}
function spread(e,a,n,gap=.2,speed=220){for(let i=0;i<n;i++)fire(e,a+(i-(n-1)/2)*gap,speed);}
function zone(e,x,y,r=65,delay=.9,life=.35,extra={}){addEnemyHazard(e,{shape:'circle',x,y,r,delay,life,c:e.ecologyColor,effect:e.effect,damage:e.contactMul||1,...extra});}
function ray(e,x,y,a,len=400,delay=1,width=16){addEnemyHazard(e,{shape:'line',x,y,x2:x+Math.cos(a)*len,y2:y+Math.sin(a)*len,width,delay,life:.4,c:e.ecologyColor,effect:e.effect,damage:e.contactMul||1});}
function allies(e,fn){for(const o of S.enemies)if(o!==e&&o.hp>0&&!o.bossGates&&dist(o.x,o.y,e.x,e.y)<200)fn(o);}
function extra(e,kind,t,a) {
 switch(kind){
  case 'blades':spread(e,a,2,.85,270);break;
  case 'trail':zone(e,e.x,e.y,40,.65,2);break;
  case 'echo':e.echo={x:t.x,y:t.y,t:.85};break;
  case 'aftershock':zone(e,t.x,t.y,120,1.65,.4);break;
  case 'cloud':zone(e,t.x,t.y,80,1.3,2.5);break;
  case 'cross':for(let i=0;i<4;i++)fire(e,a+i*TAU/4,220);break;
  case 'thorns':for(let i=0;i<7;i++)fire(e,i*TAU/7,160);break;
  case 'wall':ray(e,t.x-130,t.y+90,0,260,1.3);break;
  case 'reflect':e.shellT=1.5;break;
  case 'ring':zone(e,t.x,t.y,140,1.3,.5,{shape:'ring',inner:90});break;
  case 'trap':zone(e,t.x+Math.cos(a)*85,t.y+Math.sin(a)*85,45,1.5,2);break;
  case 'blink':case 'decoy':{
   const side=e.castN%2?1:-1;const x=clamp(t.x+Math.cos(a+side*1.3)*200,35,W-35),y=clamp(t.y+Math.sin(a+side*1.3)*200,35,H-35);
   zone(e,x,y,52,1,.4);e.blink={x,y,t:1};if(kind==='decoy')zone(e,t.x-(x-t.x),t.y-(y-t.y),52,1.5,.4);break;
  }
  case 'haste':allies(e,o=>o.rageT=Math.max(o.rageT||0,2));ring(e.x,e.y,200,'#ffe277',2);break;
  case 'drain':e.hp=Math.min(e.mhp,e.hp+e.mhp*.035);zone(e,t.x,t.y,65,1.25,.45);break;
  case 'nova':for(let i=0;i<9;i++)fire(e,a+i*TAU/9,145+i%2*80);break;
 }
}

function cast(e,d,t,hv,spawnMinion) {
 const rank=e.rank||0,a=Math.atan2(t.y-e.y,t.x-e.x),n=1+rank;
 const predicted={x:clamp(t.x+(hv?.vx||0)*.35,20,W-20),y:clamp(t.y+(hv?.vy||0)*.35,20,H-20)};
 e.castN=(e.castN||0)+1;e.lastAttack=d.attack;
 switch(d.attack){
  case 'pursuit':case 'rush':case 'ram':{
   const len=d.attack==='pursuit'?130:d.attack==='ram'?260:370;
   e.ecoDash={x:e.x,y:e.y,x2:clamp(e.x+Math.cos(a)*len,20,W-20),y2:clamp(e.y+Math.sin(a)*len,20,H-20),delay:.8,t:0};
   ray(e,e.x,e.y,a,len,.8,22);if(d.attack==='ram')zone(e,e.ecoDash.x2,e.ecoDash.y2,70+rank*15,1.25,.35);
   if(rank)spread(e,a,2+rank,.5,170);break;
  }
  case 'skirmish':spread(e,a,rank?3:1,.35,210);break;
  case 'volley':spread(e,a,1+rank*2,.18,230);if(rank)e.echo={...t,t:.45};break;
  case 'stomp':zone(e,e.x,e.y,125+rank*22,1,.45,{shape:'ring',inner:rank?38:55});if(rank)zone(e,t.x,t.y,48,1.5,.4);break;
  case 'brood':for(let i=0;i<2+rank&&S.enemies.length<MAX_ENEMIES;i++)S.enemies.push(spawnMinion(e.x+Math.cos(i*2)*35,e.y+Math.sin(i*2)*35));if(rank)spread(e,a,3,.45,155);break;
  case 'orbit':spread(e,a+(e.castN%2?.35:-.35),n,.16,210);break;
  case 'mend':allies(e,o=>o.hp=Math.min(o.mhp,o.hp+o.mhp*.08));ring(e.x,e.y,200,'#95dc73',2);if(rank)extra(e,'thorns',t,a);break;
  case 'snipe':e.aimShot={a,x:t.x,y:t.y,t:1,n:1+rank*2};aim(e.x,e.y,t.x,t.y,d.c,1);break;
  case 'detonate':zone(e,e.x,e.y,110+rank*20,1.15,.6);e.shellT=1.2;if(rank)zone(e,t.x,t.y,60,1.7,.4);break;
  case 'weave':for(let i=0;i<2+rank;i++)ray(e,t.x-110+i*70,t.y-130,Math.PI/3,290,1.15+i*.12,13);break;
  case 'ward':e.shellT=2;allies(e,o=>o.ecoWardT=2);ring(e.x,e.y,200,'#9bacff',3);if(rank)ray(e,e.x,e.y,a,420,1);break;
  case 'fan':spread(e,a,3+rank*2,.22,190);break;
  case 'siphon':zone(e,t.x,t.y,60+rank*15,1.1,.5);e.hp=Math.min(e.mhp,e.hp+e.mhp*.04);if(rank)extra(e,'ring',t,a);break;
  case 'mortar':for(let i=0;i<n;i++)zone(e,predicted.x+(i-(n-1)/2)*100,predicted.y,65,1.2+i*.2,.45);break;
  case 'lattice':for(let i=0;i<2+rank;i++)ray(e,t.x-160+i*100,t.y-200,Math.PI/2,400,1.1+i*.15,15);break;
  case 'flank':spread(e,a,2+rank,.25,245);break;
  case 'mine':for(let i=0;i<2+rank;i++)zone(e,t.x+Math.cos(a+i*2.1)*110,t.y+Math.sin(a+i*2.1)*110,44,1.4,2.5);break;
  case 'reflect':e.shellT=1.8;spread(e,a,3+rank*2,.32,155);break;
  case 'wall':for(let i=0;i<n;i++)ray(e,t.x-160,t.y+100+i*65,0,320,1.3+i*.2,18);break;
  case 'chime':zone(e,e.x,e.y,180+rank*30,1.1,.6,{shape:'ring',inner:100});if(rank)zone(e,t.x,t.y,55,1.8,.4);break;
  case 'well':zone(e,t.x,t.y,95+rank*12,1.3,2.2);if(rank)spread(e,a,4,.55,130);break;
  case 'arc':for(let i=0;i<2+rank;i++)ray(e,e.x,e.y,a+(i-(1+rank)/2)*.45,320,1,.45+15);break;
  case 'ambush':zone(e,predicted.x,predicted.y,60,1,.5);e.blink={...predicted,t:1};if(rank)zone(e,t.x-100,t.y,60,1.5,.4);break;
 }
 extra(e,d.gimmick,t,a);
 // Elites ganham uma segunda geometria; veteranos já mudam o ataque principal.
 if(rank===2&&e.castN%2===0)extra(e,['cross','ring','trap','nova','wall'][d.ordinal%5],t,a);
}

export function runEcology(e,d,dt,tgt,h,hv,spawnMinion) {
 if(!h)return false;
 const mutation=MUTATIONS[e.mutation]||MUTATIONS.normal;
 e.ecologyColor=d.c;e.effect=mutation.effect||d.element;e.shellT=Math.max(0,(e.shellT||0)-dt);
 e.ecoWardT=Math.max(0,(e.ecoWardT||0)-dt);
 if(e.shellT>0||e.ecoWardT>0)e.ward=Math.max(e.ward,e.shellT>0?.65:.25);
 if(e.blink){e.blink.t-=dt;if(e.blink.t<=0){e.x=e.blink.x;e.y=e.blink.y;e.blink=null;}}
 if(e.echo){e.echo.t-=dt;if(e.echo.t<=0){spread(e,Math.atan2(e.echo.y-e.y,e.echo.x-e.x),1+(e.rank||0),.18,240);e.echo=null;}}
 if(e.aimShot){e.aimShot.t-=dt;if(e.aimShot.t<=0){spread(e,e.aimShot.a,e.aimShot.n,.09,420);e.aimShot=null;}}
 if(e.ecoDash){const c=e.ecoDash;c.delay-=dt;if(c.delay<=0){c.t+=dt;const f=Math.min(1,c.t/.45);e.x=c.x+(c.x2-c.x)*f;e.y=c.y+(c.y2-c.y)*f;if(f===1)e.ecoDash=null;}return false;}
 const distance=dist(e.x,e.y,h.x,h.y)||1,a=Math.atan2(h.y-e.y,h.x-e.x),rank=e.rank||0;
 e.shT-=dt;
 if(e.shT<=0&&distance<850){e.shT=(3.8+(d.ordinal%4)*.35)*mutation.rate/(1+rank*.16);cast(e,d,h,hv,spawnMinion);}
 let angle=a,speed=e.spdNow;
 if(['snipe','mortar','volley'].includes(d.attack)||d.gimmick==='retreat'){if(distance<290)angle+=Math.PI;else if(distance<410)speed=0;}
 if(['orbit','flank','weave','skirmish'].includes(d.attack)||d.gimmick==='orbit')angle+=Math.sin(S.gameT*(d.attack==='skirmish'?4:1.8)+e.id)*1.1;
 if(d.gimmick==='burrow'){speed*=e.shT>1.4?1.3:.65;e.burrowed=e.shT>1.4;}
 if(d.gimmick==='shield'&&e.shT>1)e.ward=Math.max(e.ward,.25);
 if(d.gimmick==='escort'){const ally=S.enemies.find(o=>o!==e&&o.hp>0&&o.r>e.r&&dist(o.x,o.y,e.x,e.y)<220);if(ally){angle=Math.atan2(ally.y-e.y,ally.x-e.x);if(dist(ally.x,ally.y,e.x,e.y)<90)speed=0;ally.ward=Math.max(ally.ward,.15);}}
 e.x=clamp(e.x+Math.cos(angle)*speed*dt,15,W-15);e.y=clamp(e.y+Math.sin(angle)*speed*dt,15,H-15);return false;
}
