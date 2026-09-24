import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const env={};for(const[k,v]of Object.entries(process.env))if(!Object.keys(env).some(x=>x.toLowerCase()===k.toLowerCase()))env[k]=v;
const browser=await chromium.launch({headless:true,channel:'msedge',env}),errors=[],passed=[];
const base=process.env.TEST_URL||'http://127.0.0.1:8123';
const test=async(name,fn)=>{await fn();passed.push(name);console.log('PASS',name);};
try {
 const page=await browser.newPage({viewport:{width:1280,height:850}});page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(base);await page.waitForFunction(()=>window.SRK);fs.mkdirSync('tests/artifacts',{recursive:true});
 await test('Sandbox isola save, monta poderes, cria inimigos e reproduz a onda final',async()=>{
  const before=await page.evaluate(()=>{SRK.save.supplies={blessing:4,reroll:3,banish:2};SRK.save.upg.cur=3;SRK.save.upg.ini=5;return JSON.stringify(SRK.save);});
  await page.locator('[data-act="run-sandbox"]').click();await page.locator('#csGrid .card').first().click();await page.waitForSelector('#sandboxPanel:not(.hidden)');
  assert.equal(await page.evaluate(()=>SRK.S.players[0].powerLog.length),0);
  await page.locator('#sbClass').selectOption('11');await page.locator('#sbLevel').fill('60');await page.locator('#sbRebuild').click();
  await page.locator('#sbBranch').selectOption('2');await page.locator('#sbUltLevel').fill('10');await page.locator('#sbUltimate').click();
  assert.deepEqual(await page.evaluate(()=>[SRK.S.players[0].cls,SRK.S.players[0].level,SRK.S.players[0].ultimate.level]),[11,60,10]);
  await page.locator('#sbEnemy').selectOption('ice_seer');await page.locator('#sbRank').selectOption('2');await page.locator('#sbMutation').selectOption('heavy');await page.locator('#sbCount').fill('200');await page.locator('#sbSpawn').click();
  assert.equal(await page.evaluate(()=>SRK.S.enemies.length),200);assert.equal(await page.evaluate(()=>SRK.S.enemies[0].rank),2);
  await page.screenshot({path:'tests/artifacts/sandbox-desktop.png'});await page.locator('#sbClear').click();
  assert.equal(await page.evaluate(()=>SRK.S.enemies.length),0);
  await page.locator('#sbFinal').click();await page.waitForFunction(()=>SRK.S.enemies.some(e=>e.type==='boss_final'));
  assert.equal(await page.evaluate(()=>SRK.S.wave),290);assert.ok(await page.evaluate(()=>!!SRK.S.finalArena));
  await page.evaluate(async()=>{SRK.S.paused=true;SRK.S.enemies=[];SRK.S.spawnQ=0;SRK.S.victory=true;(await import('/src/game/picks.js')).waveClear();(await import('/src/game/run.js')).abandonRun();});
  assert.equal(await page.evaluate(()=>JSON.stringify(SRK.save)),before);
 });
 await test('Todas as espécies agem nas três patentes; todos os bosses têm três ataques',async()=>{
  const result=await page.evaluate(async()=>{
   const {S}=SRK,{ENEMY_SPECIES,BOSS_ROSTER}=await import('/src/data/ecology.js'),{updateEnemies}=await import('/src/game/enemies.js');
   const bad=[],seen=[];
   for(const species of ENEMY_SPECIES)for(let rank=0;rank<3;rank++){
    SRK.startRun([0],'sandbox');S.paused=true;S.sandbox.invulnerable=true;S.players[0].cells=[[50,50],[49,50],[48,50]];
    const e=SRK.spawnEnemy(species.id+['','_veteran','_elite'][rank],{mutation:'normal'});e.x=1500;e.y=1250;e.shT=0;
    for(let i=0;i<100;i++){updateEnemies(.05);S.gameT+=.05;}
    if(e.lastAttack!==species.attack||!Number.isFinite(e.x)||!Number.isFinite(e.hp)||S.enemies.length>200||S.ebullets.some(b=>!Number.isFinite(b.vx)))bad.push(species.id+':'+rank);
   }
   for(const b of BOSS_ROSTER){SRK.startRun([0],'sandbox');S.paused=true;S.players[0].cells=[[50,50],[49,50],[48,50]];if(b.id==='boss_final')SRK.startWave(290);S.spawnQ=0;
    const e=SRK.spawnEnemy(b.id,{rank:2});e.x=1400;e.y=1100;e.bossPhase=1;const moves=new Set();
    for(let i=0;i<700;i++){updateEnemies(.05);S.gameT+=.05;if(e.bossAction)moves.add(e.bossAction);}
    if(moves.size<3)bad.push(b.id+':moves='+moves.size);seen.push([b.id,moves.size]);
   }return {bad,seen};
  });assert.deepEqual(result.bad,[]);assert.equal(result.seen.length,25);
 });
 await test('Stun tem imunidade de repetição, silêncio bloqueia ativa e desarme bloqueia tiro',async()=>{
  const result=await page.evaluate(async()=>{
   const {S}=SRK;SRK.startRun([0],'solo');S.paused=true;const p=S.players[0];
   const {inflict,tickStatuses}=await import('/src/game/statuses.js'),{tryAbility}=await import('/src/game/abilities.js'),{updatePlayer}=await import('/src/game/player.js');
   inflict(p,'stun');tickStatuses(p,.4);inflict(p,'stun');const stun=p.staggerT;
   S.paused=false;p.abT=0;inflict(p,'silence');tryAbility(p);const cd=p.abT;
   inflict(p,'disarm');p.at=0;let shots=0;updatePlayer(p,.1,()=>shots++);return {stun,cd,shots};
  });assert.equal(result.stun,0);assert.equal(result.cd,0);assert.equal(result.shots,0);
 });
 await test('SVGs carregam e sandbox cabe em celular; bestiário tem 100 entradas',async()=>{
  const loaded=await page.evaluate(async()=>(await import('/src/render/sprites.js')).preloadSprites());assert.ok(loaded.every(Boolean));
  await page.evaluate(()=>SRK.startRun([0],'sandbox'));await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tests/artifacts/sandbox-mobile.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.goto(base+'/assets/bestiary.html');assert.equal(await page.locator('article').count(),100);await page.setViewportSize({width:1280,height:850});
  await page.evaluate(()=>Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode())));
  await page.screenshot({path:'tests/artifacts/bestiary.png'});await page.locator('#q').fill('Boss');
  await page.evaluate(()=>Promise.all([...document.querySelectorAll('article:not([hidden]) img')].map(i=>i.decode())));
  await page.screenshot({path:'tests/artifacts/boss-catalog.png'});
 });
 assert.deepEqual(errors,[]);fs.writeFileSync('tests/artifacts/laboratory-results.json',JSON.stringify({passed,errors},null,2));
}catch(e){console.error(e.stack);console.error(errors);process.exitCode=1;}finally{await browser.close();}
