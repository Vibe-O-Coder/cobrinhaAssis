// Cada coleta temporária tem seu próprio relógio; bônus permanentes duram a run.
export const FRUITS = {
  banana: {name:'Banana', icon:'🍌', color:'#ffd75e', desc:'+30% velocidade de ataque por 10s'},
  strawberry: {name:'Morango', icon:'🍓', color:'#ff5575', desc:'+0,1% velocidade de ataque nesta run'},
  watermelon: {name:'Melancia', icon:'🍉', color:'#fa657d', desc:'+75% dano por 10s'},
  melon: {name:'Melão', icon:'🍈', color:'#d9ec83', desc:'+0,5% dano nesta run'},
  green_grape: {name:'Uva verde', icon:'🍇', color:'#a2e65e', desc:'+2 projéteis por tiro por 10s'},
  purple_grape: {name:'Uva roxa', icon:'🍇', color:'#bb84f5', desc:'A cada 10: +1 projétil por tiro nesta run'},
};
export function initFruits(p) {
  p.fruits = {banana:[], watermelon:[], green_grape:[], strawberry:0, melon:0, purple_grape:0};
}
export function collectFruit(p, type) {
  if (!FRUITS[type]) return false;
  if (!p.fruits) initFruits(p);
  if (Array.isArray(p.fruits[type])) p.fruits[type].push(10);
  else p.fruits[type]++;
  return true;
}
export function tickFruits(p, dt) {
  if (!p.fruits) return;
  for (const key of ['banana','watermelon','green_grape']) {
    const stacks=p.fruits[key];
    for(let i=stacks.length-1;i>=0;i--) {
      stacks[i]-=dt;
      if(stacks[i]<=1e-8) stacks.splice(i,1);
    }
  }
}
export const fruitAttack = p => 1+(p.fruits?.strawberry||0)*.001+(p.fruits?.banana?.length||0)*.30;
export const fruitDamage = p => 1+(p.fruits?.melon||0)*.005+(p.fruits?.watermelon?.length||0)*.75;
export const fruitShots = p => Math.floor((p.fruits?.purple_grape||0)/10)+(p.fruits?.green_grape?.length||0)*2;
export function fruitSummary(p) {
  if(!p.fruits)return '';
  return Object.entries(FRUITS).flatMap(([key,def])=>{
    const v=p.fruits[key];
    if(Array.isArray(v))return v.length?[`${def.name} ×${v.length} · ${Math.ceil(Math.min(...v))}s`]:[];
    if(!v)return [];
    return [key==='purple_grape'?`Uva roxa ${v%10}/10 · +${Math.floor(v/10)} tiro(s)`:
      `${def.name} +${(v*(key==='melon'?.5:.1)).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`];
  }).join(' · ');
}
