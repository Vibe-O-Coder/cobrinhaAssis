import test from 'node:test';
import assert from 'node:assert/strict';
import { treeNode, treeRoot, canBuyNode, treeBlocked, emptyTreeB, applyTree, finalizeTree } from '../src/game/tree.js';
import { TREE_BASES } from '../src/data/tree.js';
import { SHOP } from '../src/data/shop.js';
import { levelGivesPower, xpToNext, stackHpMul, stackXpMul, stackSpawnInterval, stackEnemyCap } from '../src/data/pvp.js';
import { S } from '../src/core/state.js';
import { predictInput, reconcilePrediction, tickPrediction, predictedPlayers, resetPrediction } from '../src/net/prediction.js';

function paths(depth=5,parent=[]){return parent.length===depth?[]:[1,2,3].flatMap(i=>{const path=[...parent,i];return [path,...paths(depth,path)];});}

test('9 árvores completas, caminhos válidos, pais obrigatórios e conflitos simétricos',()=>{
 const keys=[];
 for(let base=0;base<TREE_BASES.length;base++){
  const owned=[treeRoot(base).key];
  for(const path of paths()){
   const node=treeNode(base,path);assert.ok(node);assert.ok(node.cost>0);keys.push(node.key);
   const parent=path.length===1?String(base):base+'-'+path.slice(0,-1).join('-');
   assert.ok(canBuyNode(base,path,[parent]));assert.ok(!canBuyNode(base,path,[]));
   owned.push(node.key);
  }
  assert.equal(owned.length,364);
 }
 assert.equal(new Set(keys).size,363*9);
 assert.ok(canBuyNode(0,[2],['0','0-1']));
 assert.ok(treeBlocked('0-1-1-1-1-1',['2-1-1-1-1-1']));
 assert.ok(treeBlocked('2-1-1-1-1-1',['0-1-1-1-1-1']));
 assert.equal(treeNode(0,[1,1,1,1,1,1]),null);
 assert.equal(treeNode(0,[0]),null);
});

test('Uma árvore inteira mantém estatísticas finitas e evita crescimento exponencial',()=>{
 const p={treeB:emptyTreeB(),dmg:1,dmgFlat:0,cd:1,spd:140,maxHp:4,hp:4,crit:0,critDmg:2,pierce:0,shots:1,ls:0,regenMax:0,boom:0,venom:0,range:250,soulMult:1,shieldBase:0,shield:0,thorns:0,iframeBonus:0,magnetR:0};
 const keys=TREE_BASES.flatMap((_,i)=>[String(i),...paths().map(p=>i+'-'+p.join('-'))]);
 applyTree(p,keys);finalizeTree(p);
 assert.ok(p.dmg<4);assert.ok(p.cd>=0.5);assert.ok(p.maxHp<=12);assert.ok(p.shots<=5);assert.ok(p.ls<=0.22);
 assert.ok(Object.values(p).filter(v=>typeof v==='number').every(Number.isFinite));
});

test('Cartas PVP nos marcos corretos e pressão cresce sem spawn ilimitado',()=>{
 const milestones=Array.from({length:31},(_,i)=>i).filter(i=>i>0&&levelGivesPower(i));
 assert.deepEqual(milestones,[1,5,10,15,20,25,30]);
 let last=0;for(let l=1;l<=60;l++){assert.ok(xpToNext(l)>last);last=xpToNext(l);}
 assert.ok(stackHpMul(28)>stackHpMul(0));assert.ok(stackXpMul(28)>stackXpMul(0));
 assert.ok(stackSpawnInterval(28)<stackSpawnInterval(0));assert.ok(stackEnemyCap(1000)<=70);
});

test('Preços permanentes crescem por nível e não pelo saldo ou save',()=>{
 for(const item of SHOP){let prev=0;for(let level=0;level<item.max;level++){const price=item.c(level);assert.ok(Number.isInteger(price)&&price>prev,item.k);prev=price;}}
});

test('Predição mantém curva pendente, respeita a autoridade na pausa e descarta comandos confirmados',()=>{
 resetPrediction();S.phase='play';S.paused=false;S.runActive=true;S.pingMs=0;
 const original={idx:1,cells:[[10,10],[9,10],[8,10]],dir:{x:1,y:0},qdir:null,mt:20,spd:140,grow:0,hp:10,dead:false,inputAck:0};
 const snap={players:[{},original],phase:'play',paused:false,pvp:null};S.rs=snap;reconcilePrediction(snap);
 predictInput({x:0,y:-1},1);tickPrediction(0.04);
 assert.equal(predictedPlayers(snap.players)[1].dir.y,-1);
 reconcilePrediction({...snap,players:[{},{...original,cells:[[11,10],[10,10],[9,10]],mt:100}]});
 assert.equal(predictedPlayers(snap.players)[1].dir.y,-1);
 reconcilePrediction({...snap,paused:true});
 assert.deepEqual(predictedPlayers(snap.players)[1].cells,original.cells);
 reconcilePrediction({...snap,players:[{},{...original,inputAck:1}]});
 tickPrediction(0.04);assert.equal(predictedPlayers(snap.players)[1].dir.x,1);
 resetPrediction();
});

test('Migração antiga preserva saldo, reembolsa ramos removidos e resolve especializações incompatíveis uma vez',async()=>{
 let value=JSON.stringify({souls:100,frags:40,tree:['0','0-1-1-1-1-1','2','2-1-1-1-1-1','0-1-1-1-1-1-1'],upg:{}});
 globalThis.localStorage={getItem:()=>value,setItem:(_k,v)=>{value=v;}};
 const {save}=await import('../src/core/save.js?migration=one');
 assert.ok(save.souls>1100);assert.equal(save.frags,undefined);
 assert.ok(save.tree.includes('0-1-1-1-1-1'));assert.ok(!save.tree.includes('2-1-1-1-1-1'));assert.ok(!save.tree.includes('0-1-1-1-1-1-1'));
 const {save:reload}=await import('../src/core/save.js?migration=two');assert.equal(save.souls,reload.souls);
 delete globalThis.localStorage;
});
