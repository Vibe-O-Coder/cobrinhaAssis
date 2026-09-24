import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectFruit,initFruits,tickFruits,fruitAttack,fruitDamage,fruitShots} from '../src/game/fruits.js';
import {quoteBranch,purchaseBranch,treeNode,canBuyNode} from '../src/game/tree.js';

test('Uma banana expirada não retira o bônus da próxima nem o do morango',()=>{
 const p={};initFruits(p);collectFruit(p,'banana');tickFruits(p,9);collectFruit(p,'banana');collectFruit(p,'strawberry');tickFruits(p,1);
 assert.equal(p.fruits.banana.length,1);assert.ok(Math.abs(fruitAttack(p)-1.301)<1e-10);tickFruits(p,9);assert.equal(fruitAttack(p),1.001);
});
test('Uvas roxas preservam o resto para a próxima dezena e bônus excedem tetos de cartas',()=>{
 const p={};for(let i=0;i<29;i++)collectFruit(p,'purple_grape');collectFruit(p,'green_grape');collectFruit(p,'green_grape');
 assert.equal(fruitShots(p),6);tickFruits(p,10);assert.equal(fruitShots(p),2);collectFruit(p,'purple_grape');assert.equal(fruitShots(p),3);
});
test('Melões são aditivos; expirar duas melancias não remove o bônus permanente',()=>{
 const p={};for(let i=0;i<2;i++){collectFruit(p,'watermelon');collectFruit(p,'melon');}assert.equal(fruitDamage(p),2.51);tickFruits(p,10);assert.equal(fruitDamage(p),1.01);
});
test('Comprar a ramificação exige saldo integral e nunca cobra nós já adquiridos',()=>{
 const wallet={tree:['0'],treeSpent:{'0':250},souls:1},before=JSON.stringify(wallet),quote=quoteBranch(0,[],wallet.tree);
 assert.equal(purchaseBranch(wallet,0),false);assert.equal(JSON.stringify(wallet),before);wallet.souls=quote.cost;
 assert.equal(purchaseBranch(wallet,0),true);assert.equal(wallet.souls,0);assert.equal(wallet.tree.length,40);assert.equal(quoteBranch(0,[],wallet.tree).cost,0);
 assert.equal(quoteBranch(2,[],wallet.tree).blocked,1);assert.equal(canBuyNode(0,[1,1,1,1],wallet.tree),false);assert.equal(treeNode(0,[1,1,1,1]),null);
});
