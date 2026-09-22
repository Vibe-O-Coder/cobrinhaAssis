/* Cinco camadas navegáveis; cada compra abre três filhos. */
import { $, esc } from '../core/utils.js';
import { save, persist } from '../core/save.js';
import { TREE_BASES, TREE_STAT_LABELS } from '../data/tree.js';
import { treeNode, treeRoot, treeTotals, effectiveTree, treeBlocked, canBuyNode, MAX_DEPTH } from '../game/tree.js';
import { showScreen, toast } from './screens.js';
import { sfx } from '../core/audio.js';
let view={bi:-1,path:[]};
const owned=k=>save.tree.includes(k);
export function openTree(){view={bi:-1,path:[]};showScreen('tree');renderTree();}
function totalsBar(){
  const raw=treeTotals(save.tree),totals=effectiveTree(raw);
  const chips=Object.entries(totals).filter(([k,v])=>v && TREE_STAT_LABELS[k]).map(([k,v])=>{
    const [label,unit]=TREE_STAT_LABELS[k];
    return `<span class="pchip">${label} +${Math.round(v*100)/100}${unit}</span>`;
  }).join('');
  return `<details class="tree-totals"><summary>Bônus da árvore · rendimento decrescente</summary><p>Compras somam pontos; bônus altos têm rendimento menor. Projéteis, escudos e HP são arredondados na run. Os tetos finais aparecem em Status.</p>${chips || 'Compre a primeira raiz para começar.'}</details>`;
}
function card(node,path){
  const isOwned=owned(node.key),blocked=treeBlocked(node.key,save.tree),afford=save.souls>=node.cost;
  return `<button class="card tree-node ${isOwned?'sel':''} ${blocked?'blocked':''}" data-node="${path.join('-')}" ${blocked?'disabled':''}>
    <div class="ic">${isOwned?'✅':blocked?'🔒':'✦'}</div><h3>${esc(node.name)}</h3><p>${esc(node.desc)}</p>
    <div class="tags">${isOwned?(path.length<MAX_DEPTH?'EXPLORAR 3 RAMOS':'ADQUIRIDO'):blocked?'ESPECIALIZAÇÃO INCOMPATÍVEL':`<span style="color:${afford?'#ffd75e':'#ff6f8e'}">💜 ${node.cost.toLocaleString('pt-BR')}</span>`}</div></button>`;
}
export function renderTree(){
  $('#treeSouls').textContent=save.souls.toLocaleString('pt-BR');
  const wrap=$('#treeWrap');
  if(view.bi<0){
    wrap.innerHTML='<div class="grid">'+TREE_BASES.map((b,i)=>{
      const count=save.tree.filter(k=>k===String(i)||k.startsWith(i+'-')).length;
      return `<button class="card" data-open="${i}"><div class="ic">${b.ic}</div><h3>${esc(b.n)}</h3><p>${esc(b.d)}</p><div class="tags">${count}/364 nós · 5 camadas</div></button>`;
    }).join('')+'</div>'+totalsBar();return;
  }
  const {bi,path}=view, base=TREE_BASES[bi];
  const key=path.length?bi+'-'+path.join('-'):String(bi);
  const lineage=`<button class="btn small" data-home>Constelações</button> <button class="btn small" data-depth="0">${base.ic} ${base.n}</button>`+path.map((_,i)=>`<button class="btn small" data-depth="${i+1}">${path.slice(0,i+1).join('.')}</button>`).join('');
  let html=`<nav class="tree-breadcrumb">${lineage}</nav><h3>${base.ic} ${base.n} · camada ${path.length}/${MAX_DEPTH}</h3>`;
  html+='<div class="tree-layers">'+[0,1,2,3,4,5].map(d=>{
    const count=save.tree.filter(k=>(k===String(bi)||k.startsWith(bi+'-'))&&k.split('-').length-1===d).length;
    return `<span>${d===0?'Raiz':'Camada '+d}<b>${count}/${3**d}</b></span>`;
  }).join('')+'</div>';
  html+='<div class="grid">'+card(path.length?treeNode(bi,path):treeRoot(bi),path)+'</div>';
  if(owned(key)&&path.length<MAX_DEPTH){
    html+='<p class="hintbar">Os três ramos podem ser comprados. Bloqueios especiais são indicados na descrição.</p><div class="grid">';
    for(let d=1;d<=3;d++){const next=[...path,d];html+=card(treeNode(bi,next),next);}
    html+='</div>';
  }
  if(owned(String(bi))){
    const cost=save.tree.filter(k=>k===String(bi)||k.startsWith(bi+'-')).reduce((n,k)=>n+(save.treeSpent[k]||0),0);
    html+=`<details class="tree-respec"><summary>Refazer esta constelação</summary><p>Remove todos os seus nós de ${base.n} e devolve 80% do valor registrado nas compras: 💜 ${Math.floor(cost*0.8)}. Libera suas especializações incompatíveis.</p><button class="btn small" data-reset>Refazer ${base.n} e receber almas</button></details>`;
  }
  wrap.innerHTML=html+totalsBar();
}
export function buyTree(bi,path){
  if(!canBuyNode(bi,path,save.tree)) return false;
  const node=path.length?treeNode(bi,path):treeRoot(bi);
  if(save.souls<node.cost){toast('💜 Almas insuficientes');return false;}
  save.souls-=node.cost;save.tree.push(node.key);save.treeSpent[node.key]=node.cost;
  persist();sfx('gold');renderTree();return true;
}
export function installTreeUI(){
  $('#treeWrap')?.addEventListener('click',e=>{
    const open=e.target.closest('[data-open]');
    if(open){view={bi:Number(open.dataset.open),path:[]};renderTree();return;}
    if(e.target.closest('[data-home]')){view.bi=-1;renderTree();return;}
    const crumb=e.target.closest('[data-depth]');
    if(crumb){view.path=view.path.slice(0,Number(crumb.dataset.depth));renderTree();return;}
    if(e.target.closest('[data-reset]')){
      const removed=save.tree.filter(k=>k===String(view.bi)||k.startsWith(view.bi+'-'));
      save.souls+=Math.floor(removed.reduce((n,k)=>n+(save.treeSpent[k]||0),0)*0.8);
      save.tree=save.tree.filter(k=>!removed.includes(k));removed.forEach(k=>delete save.treeSpent[k]);
      view.path=[];persist();renderTree();return;
    }
    const target=e.target.closest('[data-node]');if(!target)return;
    const path=target.dataset.node?target.dataset.node.split('-').map(Number):[];
    const key=path.length?view.bi+'-'+path.join('-'):String(view.bi);
    if(owned(key)){view.path=path;renderTree();}else buyTree(view.bi,path);
  });
}
