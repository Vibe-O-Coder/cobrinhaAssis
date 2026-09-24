import {$,esc} from '../core/utils.js';
import {save,persist} from '../core/save.js';
import {TREE_BASES,TREE_STAT_LABELS} from '../data/tree.js';
import {treeNode,treeRoot,treeTotals,effectiveTree,canBuyNode,treeBlocked,MAX_DEPTH,quoteBranch,purchaseBranch} from '../game/tree.js';
import {showScreen,toast} from './screens.js';
import {sfx} from '../core/audio.js';
let branch=0;
const money=n=>n.toLocaleString('pt-BR');
export function openTree(){if(save.mode==='hardcore'){toast('Hardcore: árvore indisponível.');return;}showScreen('tree');renderTree();}
function nodeCard(path){
  const n=path.length?treeNode(branch,path):treeRoot(branch),owned=save.tree.includes(n.key);
  const conflict=treeBlocked(n.key,save.tree),available=canBuyNode(branch,path,save.tree);
  return `<button class="tree-map-node ${owned?'owned':available?'available':'locked'}" data-node="${path.join('-')}" ${owned||!available?'disabled':''}>
    <b>${path.length?path.join('.'):'Raiz'} · ${esc(n.name.split(' · ')[0])}</b><span>${esc(n.desc)}</span>
    <small>${owned?'Adquirido':conflict?'Especialização incompatível':available?money(n.cost)+' almas':'Requer o nó anterior · '+money(n.cost)+' almas'}</small></button>`;
}
function limb(path){return `<div class="tree-limb">${nodeCard(path)}${path.length<MAX_DEPTH?'<div class="tree-children">'+[1,2,3].map(n=>limb([...path,n])).join('')+'</div>':''}</div>`;}
function buyButton(path,label){const q=quoteBranch(branch,path,save.tree);return `<button class="btn small" data-buy-branch="${path.join('-')}" ${!q.nodes.length||q.cost>save.souls?'disabled':''}>${label} · ${money(q.cost)} almas</button><small>${q.nodes.length} nós restantes${q.blocked?' · '+q.blocked+' incompatível excluído':''}</small>`;}
export function renderTree(){
  $('#treeSouls').textContent=money(save.souls);
  const base=TREE_BASES[branch],total=save.tree.filter(k=>k===String(branch)||k.startsWith(branch+'-')).length;
  const totals=effectiveTree(treeTotals(save.tree));
  $('#treeWrap').innerHTML=`<nav class="tree-tabs" aria-label="Ramificações">${TREE_BASES.map((b,i)=>`<button class="btn small ${i===branch?'gold':''}" data-open="${i}" aria-pressed="${i===branch}">${esc(b.n)}</button>`).join('')}</nav>
    <div class="tree-map-head"><div><h2>${esc(base.n)}</h2><p>${esc(base.d)} · ${total}/40 nós · 3 níveis</p></div><div class="tree-bulk">${buyButton([],'Comprar ramificação completa')}</div></div>
    <p class="hintbar">Todos os caminhos estão visíveis. Dourado: disponível · verde: adquirido · cinza: requer o anterior. Comprar ramo inclui pré-requisitos e desconta compras anteriores.</p>
    <div class="tree-map-root">${nodeCard([])}</div><div class="tree-map">${[1,2,3].map(n=>`<section class="tree-major"><div class="tree-bulk">${buyButton([n],'Comprar ramo '+n)}</div>${limb([n])}</section>`).join('')}</div>
    <details class="tree-totals"><summary>Bônus acumulados · rendimento decrescente</summary><p>Os efeitos crescem por nível; bônus acumulados altos têm rendimento menor e respeitam os tetos da partida.</p>${Object.entries(totals).filter(([k,v])=>v&&TREE_STAT_LABELS[k]).map(([k,v])=>`<span class="pchip">${TREE_STAT_LABELS[k][0]} +${Math.round(v*100)/100}${TREE_STAT_LABELS[k][1]}</span>`).join('')}</details>
    ${total?'<button class="btn small" data-reset>Refazer '+esc(base.n)+' · recuperar 80% das almas investidas</button>':''}`;
}
export function buyTree(bi,path){
  if(save.mode==='hardcore'||!canBuyNode(bi,path,save.tree))return false;
  const n=path.length?treeNode(bi,path):treeRoot(bi);
  if(save.souls<n.cost){toast('Almas insuficientes');return false;}
  save.souls-=n.cost;save.tree.push(n.key);save.treeSpent[n.key]=n.cost;persist();sfx('gold');renderTree();return true;
}
export function installTreeUI(){
  $('#treeWrap')?.addEventListener('click',e=>{
    const open=e.target.closest('[data-open]');if(open){branch=Number(open.dataset.open);renderTree();return;}
    if(save.mode==='hardcore')return;
    const bulk=e.target.closest('[data-buy-branch]');if(bulk){
      const path=bulk.dataset.buyBranch?bulk.dataset.buyBranch.split('-').map(Number):[];
      if(purchaseBranch(save,branch,path)){persist();sfx('gold');renderTree();toast('Ramificação comprada.');}return;
    }
    const node=e.target.closest('[data-node]');if(node){buyTree(branch,node.dataset.node?node.dataset.node.split('-').map(Number):[]);return;}
    if(e.target.closest('[data-reset]')){
      const removed=save.tree.filter(k=>k===String(branch)||k.startsWith(branch+'-'));
      save.souls+=Math.floor(removed.reduce((sum,k)=>sum+(save.treeSpent[k]||0),0)*.8);
      save.tree=save.tree.filter(k=>!removed.includes(k));for(const k of removed)delete save.treeSpent[k];persist();renderTree();
    }
  });
}
