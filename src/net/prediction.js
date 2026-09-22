/* Predição apenas visual do convidado. Colisões, dano e compras são do host. */
import { S } from '../core/state.js';
import { COLS, ROWS } from '../core/config.js';
let predicted=null, pending=[], receivedAt=0, arenaKey='';
const clone=p=>({...p,cells:p.cells.map(c=>[...c]),dir:{...p.dir},qdir:p.qdir?{...p.qdir}:null});
const wrap=(n,lo,size)=>lo+((n-lo)%size+size)%size;
function advance(p,ms){
  if(!p||p.dead)return;
  p.mt-=ms;
  for(let guard=0;p.mt<=0&&guard<4;guard++){
    p.mt+=p.spd*(p.pvpSlowT>0?1.25:1);
    if(p.qdir){const d=p.qdir;p.qdir=null;if(d.x!==-p.dir.x||d.y!==-p.dir.y)p.dir=d;}
    const a=S.rs?.pvp?.arena;
    const h=p.cells[0];
    p.cells.unshift([wrap(h[0]+p.dir.x,a?.x0||0,a?a.x1-a.x0:COLS),wrap(h[1]+p.dir.y,a?.y0||0,a?a.y1-a.y0:ROWS)]);
    if(p.grow>0)p.grow--;else p.cells.pop();
  }
}
export function predictInput(direction,seq){
  pending.push({direction:{...direction},seq});if(pending.length>16)pending.shift();
  if(predicted)predicted.qdir={...direction};
}
export function reconcilePrediction(snapshot){
  const p=snapshot.players?.[1];if(!p){predicted=null;return;}
  receivedAt=performance.now();
  const previous=predicted, nextArena=JSON.stringify(snapshot.pvp?.arena || null);
  pending=pending.filter(i=>i.seq>(p.inputAck||0));
  // Pacotes enviados antes da curva não desfazem a previsão enquanto o
  // comando viaja. Teleporte, morte e pausa sempre obedecem ao host.
  const preserve=previous && pending.length && !p.dead && snapshot.phase==='play' && !snapshot.paused && nextArena===arenaKey;
  predicted=preserve ? {...p,cells:previous.cells,dir:previous.dir,mt:previous.mt,grow:previous.grow} : clone(p);
  arenaKey=nextArena;
  if(pending.length)predicted.qdir={...pending.at(-1).direction};
  if(!preserve && snapshot.phase==='play'&&!snapshot.paused)advance(predicted,Math.min(100,(S.pingMs||0)/2));
}
export function tickPrediction(dt){
  if(S.phase!=='play'||S.paused||performance.now()-receivedAt>200)return;
  advance(predicted,dt*1000);
}
export function predictedPlayers(players){
  if(!predicted||!S.runActive)return players;
  return players.map(p=>p.idx===1?{...p,cells:predicted.cells,dir:predicted.dir}:p);
}
export function resetPrediction(){predicted=null;pending=[];receivedAt=0;arenaKey='';}
