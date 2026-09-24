import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const env={};for(const[k,v]of Object.entries(process.env))if(!Object.keys(env).some(x=>x.toLowerCase()===k.toLowerCase()))env[k]=v;
const browser=await chromium.launch({headless:true,channel:'msedge',env});
const errors=[],passed=[];const base=process.env.TEST_URL||'http://127.0.0.1:8123';
async function test(name,fn){await fn();passed.push(name);console.log('PASS',name);}
fs.mkdirSync('tests/artifacts',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1360,height:960}});page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(base);await page.waitForFunction(()=>window.SRK,{timeout:10000});
 await test('Frutas acumulam e expiram individualmente, sem perder bônus permanentes',async()=>{
  const r=await page.evaluate(async()=>{
   SRK.startRun([0],'sandbox');const p=SRK.S.players[0];
   const {eatFood}=await import('/src/game/food.js'),{tickFruits}=await import('/src/game/fruits.js'),{shotCount,attackInterval,bulletDmg}=await import('/src/game/stats.js');
   const base={damage:bulletDmg(p),cd:attackInterval(p),shots:shotCount(p)};
   eatFood(p,{t:'banana'});eatFood(p,{t:'watermelon'});tickFruits(p,5);eatFood(p,{t:'banana'});eatFood(p,{t:'watermelon'});
   eatFood(p,{t:'green_grape'});eatFood(p,{t:'green_grape'});for(let i=0;i<20;i++)eatFood(p,{t:'purple_grape'});
   eatFood(p,{t:'melon'});eatFood(p,{t:'strawberry'});
   const stacked=[base.cd/attackInterval(p),bulletDmg(p)/base.damage,shotCount(p)-base.shots];
   tickFruits(p,5);const partial=[p.fruits.banana.length,p.fruits.watermelon.length];tickFruits(p,5);
   return {stacked,partial,final:[base.cd/attackInterval(p),bulletDmg(p)/base.damage,shotCount(p)-base.shots],score:SRK.S.score,souls:SRK.S.runSouls};
  });assert.ok(Math.abs(r.stacked[0]-1.601)<1e-8);assert.ok(Math.abs(r.stacked[1]-2.505)<1e-8);assert.equal(r.stacked[2],6);assert.deepEqual(r.partial,[1,1]);assert.ok(Math.abs(r.final[0]-1.001)<1e-8);assert.equal(r.final[2],2);assert.equal(r.score,0);assert.equal(r.souls,0);
 });
 await test('Hardcore ignora loja, consumíveis e árvore; HP não cresce nem por concessão direta',async()=>{
  const r=await page.evaluate(async()=>{
   const {save,S}=SRK,{grantPower}=await import('/src/game/player.js'),{UPGRADES,RELICS,canOffer}=await import('/src/data/upgrades.js');
   save.mode='hardcore';save.upg.vit=10;save.upg.ini=10;save.upg.qrt=1;save.upg.cur=8;save.upg.rrl=4;save.tree=['0','2'];save.supplies={reroll:3,banish:3,blessing:3};
   const before=JSON.stringify(save.supplies);SRK.startRun([0],'solo',1);S.paused=true;const p=S.players[0],hp=p.maxHp;
   const excluded=UPGRADES.filter(o=>o.id==='coracao_ferro').every(o=>!canOffer(o,p));
   for(const o of [...UPGRADES,...RELICS])if(o.d?.includes('HP máximo'))grantPower(p,o);
   const res={hp,pmax:p.maxHp,excluded,powersBefore:p.powerLog.length,rerolls:S.rerolls,consumed:JSON.stringify(save.supplies)!==before};
   save.mode='normal';Object.keys(save.upg).forEach(k=>save.upg[k]=0);save.tree=[];save.supplies={reroll:0,banish:0,blessing:0};return res;
  });assert.equal(r.hp,6);assert.ok(r.pmax<=6);assert.equal(r.excluded,true);assert.equal(r.rerolls,0);assert.equal(r.consumed,false);
 });
 await test('Salto para onda 200 concede exatamente 200 poderes ou nenhum; bloqueia ranking',async()=>{
  const r=await page.evaluate(async()=>{
   const {S,save}=SRK;save.upg.ini=5;save.startPowers='random';SRK.startRun([16],'solo',200);S.paused=true;const count=S.players[0].powerLog.length,wave=S.wave;
   const ranked=await (await import('/src/ui/leaderboard.js')).submitScore();
   save.startPowers='none';SRK.startRun([16],'solo',200);S.paused=true;save.upg.ini=0;return {count,wave,none:S.players[0].powerLog.length,ranked};
  });assert.deepEqual(r,{count:200,wave:200,none:0,ranked:false});
 });
 await test('17 classes com três caminhos e ativa; Atirador funciona em campanha e PVP',async()=>{
  const r=await page.evaluate(async()=>{
   const {CLASSES}=await import('/src/data/classes.js'),{ULTIMATE_PATHS}=await import('/src/data/ultimates.js'),{classAbility,classTick}=await import('/src/game/classes.js');
   SRK.startRun([16],'sandbox');const p=SRK.S.players[0];const e=SRK.spawnEnemy('grunter');e.x=(p.cells[0][0]+.5)*28+100;e.y=(p.cells[0][1]+.5)*28;
   classAbility(p);classTick(p,.01);const shots=SRK.S.pbullets.length;SRK.startRun([16,0],'pvp');SRK.S.paused=true;
   (await import('/src/game/pvpabilities.js')).usePvpAbility(SRK.S.players[0]);
   return {count:CLASSES.length,paths:ULTIMATE_PATHS.map(a=>a.length),shots,pvp:SRK.S.pbullets.length};
  });assert.equal(r.count,17);assert.ok(r.paths.every(n=>n===3));assert.ok(r.shots>0);assert.ok(r.pvp>=3);
 });
 await test('Compra de ramo é atômica, desconta adquiridos e preserva especializações conflitantes',async()=>{
  const r=await page.evaluate(async()=>{
   const {quoteBranch,purchaseBranch,treeNode}=await import('/src/game/tree.js');
   const wallet={tree:[],treeSpent:{},souls:0},q=quoteBranch(0,[],[]);const before=JSON.stringify(wallet);
   const denied=!purchaseBranch(wallet,0)&&before===JSON.stringify(wallet);wallet.souls=q.cost;const bought=purchaseBranch(wallet,0);
   const second=quoteBranch(0,[],wallet.tree),conflict=quoteBranch(2,[],wallet.tree);
   return {denied,bought,count:wallet.tree.length,balance:wallet.souls,second:second.cost,blocked:conflict.blocked,deep:treeNode(0,[1,1,1,1])};
  });assert.deepEqual(r,{denied:true,bought:true,count:40,balance:0,second:0,blocked:1,deep:null});
 });
 await test('Árvore exibe 40 nós de uma vez e compra o ramo pelo botão',async()=>{
  await page.evaluate(async()=>{SRK.S.runActive=false;SRK.save.mode='normal';SRK.save.tree=[];SRK.save.treeSpent={};SRK.save.souls=1000000;(await import('/src/ui/treeui.js')).openTree();});
  assert.equal(await page.locator('.tree-map-node').count(),40);await page.locator('[data-buy-branch="1"]').click();
  assert.equal(await page.evaluate(()=>SRK.save.tree.length),14);await page.screenshot({path:'tests/artifacts/progression-tree-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'tests/artifacts/progression-tree-mobile.png'});await page.setViewportSize({width:1360,height:960});
 });
 await test('Boss Rush agenda 25 chefes e avança sem hordas normais',async()=>{
  const r=await page.evaluate(async()=>{SRK.startRun([0],'bossrush');SRK.S.paused=true;const s=SRK.S,first={wave:s.wave,q:s.spawnQ,roster:s.bossRush.roster.length};s.bossRush.index=1;SRK.startWave(s.wave+1);return {first,next:s.wave,q:s.spawnQ,boss:s.bossQueue[0]};});
  assert.deepEqual(r,{first:{wave:10,q:1,roster:25},next:20,q:1,boss:'boss_shell'});
 });
 await test('QTE da fase II aceita teclado e toque, pausa com a run e pune timeout',async()=>{
  await page.evaluate(async()=>{SRK.startRun([0],'sandbox');(await import('/src/ui/sandbox.js')).closeSandbox();const e=SRK.spawnEnemy('boss_final');e.hp=e.mhp*.6;(await import('/src/game/bosses.js')).protectBossPhase(e);});
  await page.waitForSelector('#qtePanel:not(.hidden)');
  await page.keyboard.press('Space');await page.waitForSelector('#pauseOv:not(.hidden)');assert.equal(await page.locator('#qtePanel').isVisible(),false);
  await page.keyboard.press('Space');await page.waitForSelector('#qtePanel:not(.hidden)');
  const seq=await page.evaluate(()=>SRK.S.qte.sequence);await page.keyboard.press({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[seq[0]]);
  await page.locator('[data-qte="'+seq[1]+'"]').click();await page.locator('[data-qte="'+seq[2]+'"]').click();
  assert.equal(await page.evaluate(()=>SRK.S.qte),null);
  const r=await page.evaluate(async()=>{const {startQte,tickQte}=await import('/src/game/qte.js');const p=SRK.S.players[0];SRK.S.sandbox.invulnerable=false;p.iframes=0;p.shield=0;p.hp=6;startQte(SRK.S.enemies[0]);tickQte(3);SRK.S.paused=true;return {hp:p.hp,q:SRK.S.qte};});assert.deepEqual(r,{hp:4,q:null});
 });
 await test('Upgrades co-op são exclusivos por jogador e aplicam suporte na onda seguinte',async()=>{
  const r=await page.evaluate(async()=>{SRK.save.tree=[];SRK.startRun([0,1],'local',1);SRK.S.paused=true;const {UPGRADES,canOffer}=await import('/src/data/upgrades.js'),{grantPower}=await import('/src/game/player.js'),p=SRK.S.players;
   const a=UPGRADES.find(o=>o.id==='coop_ward'),b=UPGRADES.find(o=>o.id==='coop_mend');const offers=[canOffer(a,p[0]),canOffer(a,p[1]),canOffer(b,p[0]),canOffer(b,p[1])];grantPower(p[0],a);grantPower(p[1],b);p[0].hp=2;SRK.startWave(2);return {offers,shield:p[1].shield,hp:p[0].hp};});assert.deepEqual(r,{offers:[true,false,false,true],shield:1,hp:3});
 });
 await test('Menu, arte vetorial, fallback de emojis e velocidades no celular',async()=>{
  await page.evaluate(async()=>{SRK.S.runActive=false;(await import('/src/ui/screens.js')).showScreen('menu');});
  await page.setViewportSize({width:390,height:844});await page.locator('.run-options summary').click();
  for(const speed of [2,3,4,5,10,20,1]){await page.locator('#fastBtn').click();assert.equal(await page.evaluate(()=>SRK.save.speed),speed);}
  await page.locator('#artSelect').selectOption('emoji');assert.equal(await page.locator('body').getAttribute('data-art'),'emoji');
  await page.locator('#artSelect').selectOption('vector');await page.screenshot({path:'tests/artifacts/progression-menu-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
 await test('Acelerações até 20× usam tempo de simulação e respeitam pausa e QTE',async()=>{
  const r=await page.evaluate(async()=>{
   const {advanceSimulation}=await import('/src/game/loop.js'),{S,save}=SRK,{collectFruit}=await import('/src/game/fruits.js');
   const observed=[];for(const speed of [1,2,3,4,5,10,20]){SRK.startRun([0],'sandbox');S.paused=false;save.speed=speed;collectFruit(S.players[0],'banana');advanceSimulation(.05);observed.push([S.gameT,S.players[0].fruits.banana[0]]);}
   S.paused=true;const time=S.gameT;advanceSimulation(.05);const paused=S.gameT===time;
   S.paused=false;S.qte={};advanceSimulation(.05);const qte=S.gameT===time;S.qte=null;S.paused=true;save.speed=1;
   return {observed,paused,qte};
  });for(const [i,speed] of [1,2,3,4,5,10,20].entries()){assert.ok(Math.abs(r.observed[i][0]-.05*speed)<1e-7);assert.ok(Math.abs(r.observed[i][1]-(10-.05*speed))<1e-7);}assert.ok(r.paused&&r.qte);
 });
 await test('Berserker mantém dano após a habilidade e cada ato/chefe tem tema próprio',async()=>{
  const r=await page.evaluate(async()=>{SRK.startRun([6],'sandbox');SRK.S.spawnQ=0;const p=SRK.S.players[0],{classAbility,classTick}=await import('/src/game/classes.js'),{bulletDmg}=await import('/src/game/stats.js');
   const before=bulletDmg(p);classAbility(p);classTick(p,30);
   const {ACT_THEMES,musicTheme}=await import('/src/core/music.js'),{BOSS_ROSTER}=await import('/src/data/ecology.js');
   return {before,after:bulletDmg(p),acts:new Set(ACT_THEMES.map(t=>JSON.stringify(t))).size,bosses:new Set(BOSS_ROSTER.map(b=>{const t=musicTheme(b.unlock,{type:b.id});return JSON.stringify([t.root,t.notes,t.bpm]);})).size};
  });assert.equal(r.before,r.after);assert.equal(r.acts,10);assert.equal(r.bosses,25);
 });
 await test('Boss Rush oferece a relíquia, avança e encerra com vitória no último chefe',async()=>{
  const r=await page.evaluate(async()=>{const {S,save}=SRK;SRK.startRun([11],'bossrush');S.paused=true;S.enemies=[];S.spawnQ=0;(await import('/src/game/picks.js')).beginChoice(true);
   const next={index:S.bossRush.index,wave:S.wave};S.bossRush.index=24;SRK.startWave(290);S.spawnQ=0;const e=SRK.spawnEnemy('boss_final');e.bossGates=[];e.hp=0;
   (await import('/src/game/enemies.js')).cleanupEnemies();(await import('/src/game/picks.js')).waveClear();
   return {next,victory:S.victory,active:S.runActive,phase:S.phase};
  });assert.deepEqual(r,{next:{index:1,wave:20},victory:true,active:false,phase:'over'});
 });
 await test('Save com cinco níveis reembolsa os removidos uma única vez',async()=>{
  const p=await browser.newPage();await p.goto(base);await p.evaluate(()=>localStorage.setItem('srkUltra2',JSON.stringify({economyVersion:3,souls:100,tree:['0','0-1','0-1-1-1-1','0-1-1-1-1-1'],treeSpent:{'0-1-1-1-1':4000,'0-1-1-1-1-1':8000}})));
  await p.reload();await p.waitForFunction(()=>window.SRK?.save);const first=await p.evaluate(()=>({souls:SRK.save.souls,tree:SRK.save.tree}));await p.reload();await p.waitForFunction(()=>window.SRK?.save);
  assert.deepEqual(first,{souls:12100,tree:['0','0-1']});assert.equal(await p.evaluate(()=>SRK.save.souls),12100);await p.close();
 });
 await test('Frutas e QTE sobrevivem ao protocolo co-op; entradas atrasadas não contam duas vezes',async()=>{
  const r=await page.evaluate(async()=>{SRK.startRun([0,1],'online',290);const {S}=SRK;S.paused=false;S.spawnQ=0;const boss=SRK.spawnEnemy('boss_final'),{startQte,qteInput}=await import('/src/game/qte.js');
   (await import('/src/game/fruits.js')).collectFruit(S.players[1],'green_grape');startQte(boss);const id=S.qte.id,key=S.qte.sequence[0];qteInput(key,1,id,0);const duplicate=qteInput(key,1,id,0);
   const {packMessage,unpackMessage}=await import('/src/net/codec.js'),snap=(await import('/src/render/snapshot.js')).snap();const restored=unpackMessage(packMessage({t:'state',s:snap})).s;
   return {duplicate,step:restored.qte.step,fruit:restored.players[1].fruits.green_grape[0],wave:restored.startWave};
  });assert.deepEqual(r,{duplicate:false,step:1,fruit:10,wave:290});
  await page.setViewportSize({width:1280,height:850});await page.screenshot({path:'tests/artifacts/progression-final-qte.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tests/artifacts/progression-qte-mobile.png'});
 });
 assert.deepEqual(errors,[]);fs.writeFileSync('tests/artifacts/progression-results.json',JSON.stringify({passed,errors},null,2));
}catch(e){console.error(e.stack);console.error(errors);process.exitCode=1;}finally{await browser.close();}
