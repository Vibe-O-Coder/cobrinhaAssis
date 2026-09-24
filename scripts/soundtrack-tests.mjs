import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.TEST_URL||'http://127.0.0.1:8123';
const passed=[],errors=[];
const test=async(name,fn)=>{await fn();passed.push(name);console.log('PASS',name);};
fs.mkdirSync('tests/artifacts',{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1360,height:960}});
 page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(base);await page.waitForFunction(()=>window.SRK);
 await page.evaluate(async()=>{window.testMusic=await import('/src/core/music.js');});
 await page.mouse.click(20,20);
 const status=()=>page.evaluate(async()=>(await import('/src/core/music.js')).musicStatus());
 await test('Menu toca o MP3 após interação do jogador',async()=>{
  await page.waitForFunction(()=>{const s=testMusic.musicStatus();return s?.id==='menu'&&s.time>.2&&!s.paused;});
 });
 await test('Quatro atos usam os arquivos entregues, sem alterar a velocidade do áudio',async()=>{
  for(const [wave,id] of [[1,'monocromo'],[30,'pixel'],[59,'navegador'],[88,'arcade']]){
   await page.evaluate(wave=>{SRK.startRun([0],'sandbox');SRK.S.paused=false;SRK.S.wave=wave;SRK.save.speed=20;},wave);
   await page.waitForFunction(id=>{const s=testMusic.musicStatus();return s?.id===id&&s.time>.1&&!s.paused;},id);
  }
 });
 await test('Pausa, mute e retomada preservam o ponto da faixa',async()=>{
  await page.evaluate(()=>{SRK.save.speed=1;SRK.S.paused=true;});
  await page.waitForFunction(()=>testMusic.musicStatus()?.paused);
  const a=await status();await page.waitForTimeout(300);const b=await status();
  assert.ok(a.paused&&b.paused,JSON.stringify({a,b}));assert.ok(Math.abs(a.time-b.time)<.02,JSON.stringify({a,b}));
  await page.evaluate(async()=>{SRK.S.paused=false;(await import('/src/core/audio.js')).toggleMute();});
  await page.waitForFunction(time=>{const s=testMusic.musicStatus();return !s?.paused&&s?.time>time;},b.time);
  const c=await status();assert.equal(c.volume,0);assert.ok(c.time>b.time,JSON.stringify({a,b,c,state:await page.evaluate(()=>({phase:SRK.S.phase,active:SRK.S.runActive,wave:SRK.S.wave}))}));
  await page.evaluate(async()=>(await import('/src/core/audio.js')).toggleMute());
 });
 await test('Entrada, QTE e faixa vocal acompanham as fases do Devorador',async()=>{
  await page.evaluate(async()=>{SRK.save.speed=1;(await import('/src/ui/sandbox.js')).sandboxWave(290);SRK.S.paused=false;});
  await page.waitForFunction(()=>SRK.S.enemies.some(e=>e.type==='boss_final'));
  await page.waitForFunction(()=>{const s=testMusic.musicStatus();return s?.id==='a-fome-entre-os-mundos'&&s.time>.1;});
  await page.evaluate(async()=>{const e=SRK.S.enemies[0];e.hp=0;(await import('/src/game/bosses.js')).protectBossPhase(e);});
  await page.waitForFunction(()=>{const s=testMusic.musicStatus();return s?.id==='ainda-ha-um-sinal'&&s.paused;});
  assert.equal(await page.evaluate(()=>SRK.S.enemies[0].bossPhase),1);
  await page.evaluate(async()=>(await import('/src/game/qte.js')).resolveQte(true));
  await page.waitForFunction(()=>{const s=testMusic.musicStatus();return s?.id==='ainda-ha-um-sinal'&&s.time>.2&&!s.paused;});
 });
 await test('Survival resiste a dano letal, ignora 20× e congela quando pausado',async()=>{
  const r=await page.evaluate(async()=>{
   const {advanceSimulation}=await import('/src/game/loop.js');const {protectBossPhase}=await import('/src/game/bosses.js');
   const e=SRK.S.enemies[0];e.hp=-1e12;protectBossPhase(e);SRK.save.speed=20;
   const before=e.survival.elapsed;advanceSimulation(.05);const elapsed=e.survival.elapsed-before;
   SRK.S.paused=true;advanceSimulation(.05);
   return {elapsed,paused:e.survival.elapsed-before,hp:e.hp,phase:e.bossPhase};
  });assert.ok(Math.abs(r.elapsed-.05)<1e-6);assert.equal(r.elapsed,r.paused);assert.ok(r.hp>0);assert.equal(r.phase,1);
  await page.screenshot({path:'tests/artifacts/soundtrack-survival.png'});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'tests/artifacts/soundtrack-survival-mobile.png'});
  await page.setViewportSize({width:1360,height:960});
 });
 await test('Fim da canção libera fase III e QTE correto; a música não repete a letra',async()=>{
  await page.evaluate(async()=>{const e=SRK.S.enemies[0];e.survival.elapsed=e.survival.duration-.02;SRK.S.paused=false;(await import('/src/game/loop.js')).advanceSimulation(.03);});
  assert.equal(await page.evaluate(()=>SRK.S.enemies[0].bossPhase),2);
  assert.equal(await page.evaluate(()=>SRK.S.qte.phase),3);
  await page.waitForFunction(()=>testMusic.musicStatus()?.id==='o-ultimo-pixel');
  assert.match(await page.locator('#qtePanel b').textContent(),/FASE III/);
  await page.evaluate(async()=>{SRK.save.speed=1;(await import('/src/game/qte.js')).resolveQte(true);});
  await page.waitForFunction(()=>{const s=testMusic.musicStatus();return s?.id==='o-ultimo-pixel'&&s.time>.1&&!s.paused;});
 });
 await test('Faixa ausente não trava o combate nem a transição do survival',async()=>{
  await page.route('**/tracks/ainda-ha-um-sinal.mp3',r=>r.abort());
  await page.evaluate(async()=>{SRK.startRun([0],'sandbox');(await import('/src/ui/sandbox.js')).closeSandbox();const e=SRK.spawnEnemy('boss_final');e.hp=0;(await import('/src/game/bosses.js')).protectBossPhase(e);(await import('/src/game/qte.js')).resolveQte(true);});
  await page.waitForFunction(()=>testMusic.musicStatus()?.failed);
  await page.evaluate(async()=>{const e=SRK.S.enemies[0];e.survival.elapsed=e.survival.duration-.01;(await import('/src/game/loop.js')).advanceSimulation(.02);});
  assert.equal(await page.evaluate(()=>SRK.S.enemies[0].bossPhase),2);
 });
 await test('Reiniciar e voltar ao menu descartam o estado musical da luta anterior',async()=>{
  await page.evaluate(()=>{SRK.startRun([0],'sandbox');SRK.S.paused=false;});
  await page.waitForFunction(()=>testMusic.musicStatus()?.id==='monocromo');
  await page.evaluate(async()=>{SRK.S.runActive=false;(await import('/src/ui/screens.js')).showScreen('menu');});
  await page.waitForFunction(()=>testMusic.musicStatus()?.id==='menu');
 });
 await test('Survival completo atravessa cinco seções com projéteis e chega à fase III',async()=>{
  const r=await page.evaluate(async()=>{
   const {sandboxWave}=await import('/src/ui/sandbox.js'),{advanceSimulation}=await import('/src/game/loop.js');
   const {protectBossPhase}=await import('/src/game/bosses.js'),{resolveQte}=await import('/src/game/qte.js');
   const {updateFx}=await import('/src/render/fx.js'),{survivalSection}=await import('/src/game/finale.js');
   SRK.startRun([0],'sandbox');sandboxWave(290);SRK.S.spawnQ=0;SRK.S.bossQueue=[];SRK.S.bossLeft=0;
   const e=SRK.spawnEnemy('boss_final');e.hp=0;protectBossPhase(e);resolveQte(true);SRK.save.speed=20;
   const sections=new Set();let peak=0;
   for(let i=0;i<5300&&e.survival;i++){
    sections.add(survivalSection(e.survival));advanceSimulation(.05);updateFx(.05);peak=Math.max(peak,SRK.S.ebullets.length);
   }
   return {phase:e.bossPhase,qte:SRK.S.qte?.phase,sections:[...sections],peak,active:SRK.S.runActive};
  });assert.equal(r.phase,2);assert.equal(r.qte,3);assert.deepEqual(r.sections,[0,1,2,3,4]);assert.ok(r.peak>20&&r.peak<=1000);assert.ok(r.active);
 });
 await test('Concepts abrem em desktop e celular sem rolagem horizontal',async()=>{
  await page.goto(base+'/docs/CONCEPTS_CUTSCENES.html');
  assert.equal(await page.locator('article').count(),6);
  await page.screenshot({path:'tests/artifacts/concepts-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'tests/artifacts/concepts-mobile.png',fullPage:true});
 });
 assert.deepEqual(errors,[]);
 fs.writeFileSync('tests/artifacts/soundtrack-results.json',JSON.stringify({passed,errors},null,2));
}finally{await browser.close();}
