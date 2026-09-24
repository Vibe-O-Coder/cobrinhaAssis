import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const env={};for(const[k,v]of Object.entries(process.env))if(!Object.keys(env).some(x=>x.toLowerCase()===k.toLowerCase()))env[k]=v;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge',env});
const base=process.env.TEST_URL||'http://127.0.0.1:8123',relay=process.env.RELAY_TEST_URL||'http://127.0.0.1:9000';
const errors=[],passed=[];
const test=async(name,fn)=>{await fn();passed.push(name);console.log('PASS',name);};
async function context(viewport={width:1280,height:850}) {
  const c=await browser.newContext({viewport});
  await c.addInitScript(url=>window.COBRINHA_RELAY_URL=url,relay);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.stack));
  await p.goto(base);await p.waitForFunction(()=>window.SRK?.startWave);return {c,p};
}
fs.mkdirSync('tests/artifacts',{recursive:true});
try {
  const {c,p}=await context();
  await test('Campanha respeita início avançado e Apostador recebe duas cartas sem escolher',async()=>{
    const result=await p.evaluate(async()=>{
      const {S,save}=SRK;save.acts=9;save.mode='normal';save.afk=false;save.tree=[];save.supplies={};Object.keys(save.upg).forEach(k=>save.upg[k]=0);
      SRK.startRun([11],'solo',262);S.paused=true;const wave=S.wave;
      const {beginChoice}=await import('/src/game/picks.js');beginChoice(false);
      const automatic={wave:S.wave,powers:S.players[0].powerLog.length,phase:S.phase};
      SRK.startRun([0,11],'local');S.paused=true;S.phase='choice';beginChoice(false);
      return {wave,automatic,local:S.pickState?.picked.has(1),gamblePowers:S.players[1].powerLog.length};
    });
    assert.equal(result.wave,262);assert.equal(result.automatic.powers,264);assert.equal(result.automatic.wave,263);assert.equal(result.automatic.phase,'play');assert.ok(result.local);assert.equal(result.gamblePowers,2);
  });
  await test('Todas as 51 especializações executam no nível X em campanha e PVP',async()=>{
    const invalid=await p.evaluate(async()=>{
      const {S}=SRK;const {grantPower}=await import('/src/game/player.js');const {ULTIMATE_UPGRADES,PVP_ULTIMATE_UPGRADES}=await import('/src/data/ultimates.js');
      const {useAbility}=await import('/src/game/abilities.js'),{update}=await import('/src/game/loop.js');const bad=[];
      for(const mode of ['solo','pvp']) for(let cls=0;cls<17;cls++) for(let branch=0;branch<3;branch++) {
        SRK.startRun(mode==='pvp'?[cls,0]:[cls],mode);S.paused=true;S.spawnQ=0;
        const player=S.players[0];player.cells=[[50,50],[49,50],[48,50],[47,50]];player.shieldT=100;player.hp=100;player.maxHp=100;
        if(S.players[1]){S.players[1].cells=[[55,50],[56,50],[57,50]];S.players[1].shieldT=100;}
        const e=SRK.spawnEnemy('grunter');e.x=1470;e.y=1414;e.hp=e.mhp=1e7;
        for(const card of (mode==='pvp'?PVP_ULTIMATE_UPGRADES:ULTIMATE_UPGRADES).filter(o=>o.cls===cls&&o.branch===branch))grantPower(player,card);
        useAbility(player);for(let i=0;i<180;i++)update(1/60);
        if(!Number.isFinite(player.hp)||!Number.isFinite(player.abT)||S.pbullets.some(b=>!Number.isFinite(b.dmg))||S.enemies.some(e=>!Number.isFinite(e.hp)))bad.push([mode,cls,branch]);
      }return bad;
    });assert.deepEqual(invalid,[]);
  });
  await test('Todos os bosses têm três ataques, fases protegidas e a horda respeita 200',async()=>{
    const result=await p.evaluate(async()=>{
      const {S}=SRK;const {EDEF}=await import('/src/data/enemies.js'),{updateEnemies,cleanupEnemies}=await import('/src/game/enemies.js');
      const moves=[];
      for(const type of Object.keys(EDEF).filter(k=>EDEF[k].boss)) {
        SRK.startRun([0],'solo');S.paused=true;S.players[0].shieldT=1000;S.players[0].iframes=1000;
        if(type==='boss_final')SRK.startWave(290);
        const e=SRK.spawnEnemy(type);e.x=1400;e.y=1100;e.shT=0;S.players[0].cells=[[50,50],[49,50],[48,50]];
        const actions=new Set();let hazards=0;
        for(let i=0;i<1800;i++){updateEnemies(1/60);S.gameT+=1/60;if(e.bossAction)actions.add(e.bossAction);hazards=Math.max(hazards,S.bossHazards.length);}
        e.hp=-1e9;cleanupEnemies();const protectedPhase=e.hp>0&&S.enemies.includes(e)&&e.bossPhase===1;
        moves.push({type,actions:[...actions],hazards,protectedPhase});
      }
      SRK.startRun([0],'solo');S.paused=true;S.wave=250;S.enemies=[];
      for(let i=0;i<220;i++)SRK.spawnEnemy('splitter');const cap=S.enemies.length;
      S.enemies[0].hp=0;cleanupEnemies();const afterSplit=S.enemies.length;
      SRK.startRun([0],'solo');S.paused=true;S.enemies=[];
      const boss=SRK.spawnEnemy('boss'),enemy=SRK.spawnEnemy('grunter');
      enemy.x=boss.x;enemy.y=boss.y;enemy.lastHitBy=S.players[0];enemy.hp=0;
      S.players[0].boom=1e9;S.players[0].boomR=200;cleanupEnemies();
      return {moves,cap,afterSplit,chainProtected:S.enemies.includes(boss)&&boss.hp>0&&boss.bossPhase===1};
    });
    assert.equal(result.cap,200);assert.ok(result.afterSplit<=200);assert.ok(result.chainProtected);
    for(const boss of result.moves){assert.ok(boss.actions.length>=3,JSON.stringify(boss));assert.ok(boss.hazards>0);assert.ok(boss.protectedPhase);}
  });
  await test('Minimapa online inclui alvos distantes e arena final cabe no celular',async()=>{
    const packet=await p.evaluate(async()=>{
      const {S}=SRK;SRK.startRun([0,1],'online');S.paused=true;S.enemies=[];
      const far=SRK.spawnEnemy('boss');far.x=0;far.y=0;const near=SRK.spawnEnemy('grunter');near.x=0;near.y=0;
      const {snap}=await import('/src/render/snapshot.js');const packet=snap();
      return {radar:packet.radar.length,enemies:packet.enemies.map(e=>e.type)};
    });assert.equal(packet.radar,2);assert.ok(packet.enemies.includes('boss'));assert.ok(!packet.enemies.includes('grunter'));
    await p.evaluate(()=>{SRK.startRun([0],'solo');SRK.S.paused=true;SRK.startWave(290);SRK.S.spawnQ=0;SRK.spawnEnemy('boss_final');SRK.S.bossHazards=[{shape:'line',x:900,y:1600,x2:1900,y2:1600,width:30,delay:1,life:1,c:'#ff4d9d'}];document.querySelector('#banner').style.visibility='hidden';document.querySelector('#toast').style.visibility='hidden';});
    for(const [width,height] of [[1280,850],[390,844],[844,390]]) {
      await p.setViewportSize({width,height});await p.waitForTimeout(180);
      const frame=await p.evaluate(async()=>{const {S}=SRK;const {panes,arenaZoom}=await import('/src/render/viewport.js');const pane=panes()[0],z=arenaZoom(pane);const boss=S.enemies[0];return {x:(boss.x-pane.cam.x)*z,y:(boss.y-pane.cam.y)*z,w:pane.w,h:pane.h};});
      assert.ok(frame.x>0&&frame.x<frame.w&&frame.y>0&&frame.y<frame.h,JSON.stringify(frame));
      await p.screenshot({path:`tests/artifacts/final-${width}x${height}.png`});
    }
  });await c.close();
  await test('Sala privada rejeita senha errada; código escolhe transporte e sincroniza Apostador',async()=>{
    const {c:hc,p:h}=await context(),{c:gc,p:g}=await context();
    for(const page of [h,g])await page.locator('[data-act="open-online"]').click();
    await h.locator('#roomName').fill('Amigos privados');await h.locator('[data-act="generate-password"]').click();
    const password=await h.locator('#roomPassword').inputValue();assert.equal(password.length,10);
    await h.locator('[data-act="create-room"]').click();await h.waitForSelector('#lobby:not(.hidden)');
    const code=await h.locator('#lobbyCode').textContent();assert.match(code,/^R-/);
    await g.locator('[data-act="refresh-rooms"]').click();await g.waitForTimeout(150);
    assert.ok(!(await g.locator('#roomList').textContent()).includes(code));
    await g.locator('#joinCode').fill(code);await g.locator('#joinPassword').fill('errada');await g.locator('[data-act="join-room"]').click();
    await g.waitForFunction(()=>document.querySelector('#onlineStatus').textContent.includes('Senha incorreta'));
    await g.locator('.net-advanced summary').click();await g.locator('#nmPhp').check();
    await g.locator('#joinPassword').fill(password);await g.locator('[data-act="join-room"]').click();await g.waitForSelector('#lobby:not(.hidden)');
    await g.locator('#lobbyGrid .card').nth(11).click();await h.waitForFunction(()=>SRK.S.guestCls===11);await h.locator('#btnStartOnline').click();
    await g.waitForFunction(()=>SRK.S.rs?.players?.[1]?.cls===11);
    await h.evaluate(async()=>{SRK.S.paused=true;SRK.S.phase='choice';(await import('/src/game/picks.js')).beginChoice(false);});
    await h.waitForSelector('#upCards .card');await h.locator('#upCards .card').first().click();
    await g.waitForFunction(()=>SRK.S.rs?.players?.[1]?.powerLog?.length===2&&SRK.S.rs.wave===2);
    assert.equal(await g.evaluate(()=>SRK.S.net.kind),'relay');
    await hc.close();await gc.close();
  });
  await test('Lista pública permite selecionar a sala manualmente',async()=>{
    const {c:hc,p:h}=await context(),{c:gc,p:g}=await context();
    await h.locator('[data-act="open-online"]').click();await h.locator('#roomName').fill('Duelo público');await h.locator('#onlineMode').selectOption('pvp');
    await h.locator('[data-act="create-room"]').click();await h.waitForSelector('#lobby:not(.hidden)');
    const code=await h.locator('#lobbyCode').textContent();
    await g.setViewportSize({width:390,height:844});
    await g.locator('[data-act="open-online"]').click();const row=g.locator('.room-entry').filter({hasText:code});
    await row.waitFor();assert.ok(await g.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await g.screenshot({path:'tests/artifacts/room-list-mobile.png',fullPage:true});
    await row.getByRole('button',{name:'Entrar'}).click();
    await g.waitForSelector('#lobby:not(.hidden)');assert.match(await g.locator('#lobbyMode').textContent(),/PVP/);
    assert.ok(await g.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await g.screenshot({path:'tests/artifacts/room-lobby-mobile.png'});await g.setViewportSize({width:1280,height:850});
    await g.screenshot({path:'tests/artifacts/room-lobby.png'});await hc.close();await gc.close();
  });
  assert.deepEqual(errors,[]);fs.writeFileSync('tests/artifacts/expansion-results.json',JSON.stringify({passed,errors},null,2));
}catch(error){console.error('FAIL',error.stack);console.log('PAGE ERRORS',errors);process.exitCode=1;}finally{await browser.close();}
