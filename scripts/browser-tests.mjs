import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const env={};for(const[k,v]of Object.entries(process.env))if(!Object.keys(env).some(x=>x.toLowerCase()===k.toLowerCase()))env[k]=v;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge',env});
const base=process.env.TEST_URL || 'http://127.0.0.1:8123';
const errors=[], passed=[];
const test=async(name,fn)=>{await fn();passed.push(name);console.log('PASS',name);};
const context=await browser.newContext({viewport:{width:1280,height:850}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
fs.mkdirSync('tests/artifacts',{recursive:true});
try {
 await page.goto(base);await page.waitForFunction(()=>window.SRK?.startRun);
 await test('Boot e modo local com câmeras independentes',async()=>{
  await page.locator('[data-act="run-local"]').click();
  await page.locator('#csGrid .card').nth(0).click();await page.locator('#csGrid .card').nth(7).click();
  const r=await page.evaluate(async()=>{const {panes}=await import('/src/render/viewport.js');SRK.S.paused=true;return {phase:SRK.S.phase,panes:panes().map(p=>({who:p.who,x:p.cam.x})),rows:(await import('/src/core/config.js')).ROWS};});
  assert.equal(r.phase,'play');assert.equal(r.rows,100);assert.equal(r.panes.length,2);assert.ok(r.panes[1].x>r.panes[0].x+1000);
  await page.screenshot({path:'tests/artifacts/coop-local.png'});
 });
 await test('PVP começa justo mesmo com loja, árvore, impossível e 2x',async()=>{
  const r=await page.evaluate(async()=>{
   const {S,save}=SRK;Object.keys(save.upg).forEach(k=>save.upg[k]=5);save.tree=['0','1','2','3','4','5','6','7','8'];save.mode='impossible';save.fast=true;save.supplies={reroll:2,banish:2,blessing:2};
   S.role='solo';SRK.startRun([0,7],'pvp');S.paused=true;
   return {ps:S.players.map(p=>({hp:p.hp,max:p.maxHp,rev:p.revLeft,powers:p.powerLog,shield:p.shield,crit:p.crit})),supplies:save.supplies,mode:(await import('/src/data/modes.js')).MODE().id,rerolls:S.rerolls};
  });
  for(const p of r.ps){assert.equal(p.hp,10);assert.equal(p.max,10);assert.equal(p.rev,0);assert.equal(p.shield,0);assert.equal(p.crit,0);assert.deepEqual(p.powers,[]);}
  assert.equal(r.mode,'normal');assert.equal(r.rerolls,0);assert.equal(r.supplies.blessing,2);
 });
 await test('Poderes nos níveis 1, 5 e 10; escolhas simultâneas sem pausa',async()=>{
  const r=await page.evaluate(async()=>{
   const {S}=SRK;const {gainXp}=await import('/src/game/pvp.js');const {xpToNext}=await import('/src/data/pvp.js');
   let xp=0;for(let n=1;n<=10;n++)xp+=xpToNext(n);
   gainXp(S.players[0],xp);gainXp(S.players[1],xpToNext(1));
   const queue=[...S.pvp.queue];
   S.paused=false;(await import('/src/game/loop.js')).update(0.016);
   return {queue,phase:S.phase,paused:S.paused,level:S.players[0].level,pending:S.pvp.pending,choices:S.pvp.choices.map(c=>c?.id),t:S.pvp.t};
  });
  assert.deepEqual(r.queue,[0,0,0,1]);assert.equal(r.phase,'play');assert.equal(r.paused,false);assert.equal(r.level,10);assert.deepEqual(r.pending,[2,0]);assert.ok(r.choices.every(Boolean));
  await page.waitForSelector('.pvp-choice.player-0');await page.waitForSelector('.pvp-choice.player-1');
  const before=await page.evaluate(()=>SRK.S.pvp.t);await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>SRK.S.pvp.t)>before);
  await page.keyboard.press('1');await page.keyboard.press('7');
  assert.deepEqual(await page.evaluate(()=>SRK.S.players.map(p=>p.powerLog.length)),[1,1]);
  await page.evaluate(()=>SRK.S.paused=true);await page.screenshot({path:'tests/artifacts/pvp-choices.png'});
 });
 await test('Morte súbita limpa perigos, mantém habilidades dentro e termina empates defensivos',async()=>{
  const r=await page.evaluate(async()=>{
   const {S}=SRK;SRK.startRun([2,15],'pvp');S.paused=true;
   const pvp=await import('/src/game/pvp.js');S.pvp.t=1200;S.bombs.push({hostile:true});S.foods.push({x:1,y:1});pvp.enterSuddenDeath();
   const a={...S.pvp.arena};S.players[0].cells[0]=[a.x1-1,a.y0];S.players[0].dir={x:1,y:0};
   (await import('/src/game/pvpabilities.js')).usePvpAbility(S.players[0]);
   const inside=S.players.every(p=>p.cells.every(([x,y])=>x>=a.x0&&x<a.x1&&y>=a.y0&&y<a.y1));
   const cleared=[S.enemies.length,S.ebullets.length,S.bombs.length,S.foods.length];
   for(let i=0;i<70;i++)pvp.pvpTick(20);
   const size=[S.pvp.arena.x1-S.pvp.arena.x0,S.pvp.arena.y1-S.pvp.arena.y0];
   pvp.resolvePvpDeaths();return {inside,cleared,size,over:S.pvp.over};
  });assert.ok(r.inside);assert.deepEqual(r.cleared,[0,0,0,0]);assert.deepEqual(r.size,[9,9]);assert.equal(r.over,true);
 });
 await test('Centauro não executa elites, não repõe munição ilimitada e raio nunca cura inimigos',async()=>{
  const r=await page.evaluate(async()=>{
   const {S,save}=SRK;save.mode='normal';save.fast=false;save.tree=[];Object.keys(save.upg).forEach(k=>save.upg[k]=0);save.supplies={};SRK.startRun([7],'solo');S.paused=true;
   const p=S.players[0];p.cells=Array.from({length:5},(_,i)=>[20-i,20]);p.grow=0;
   const e={id:99,type:'grunter',x:574,y:574,hp:10000,mhp:10000,ward:0,r:12};S.enemies=[e];
   const {classAbility,chainLightning}=await import('/src/game/classes.js');classAbility(p);classAbility(p);const growth=p.grow,hp=e.hp;
   p.xChain=4;S.enemies=Array.from({length:8},(_,i)=>({...e,id:i,x:574+i*20,hp:10000}));chainLightning(p,S.enemies[0],10);
   return {growth,hp,healed:S.enemies.some(e=>e.hp>10000)};
  });assert.ok(r.growth<=7);assert.ok(r.hp>9900&&r.hp<10000);assert.equal(r.healed,false);
 });
 await test('Árvore tem 40 nós por atributo; compra irmãos e bloqueia só especializações',async()=>{
  const r=await page.evaluate(async()=>{
   const {treeNode,treeRoot,canBuyNode,treeBlocked}=await import('/src/game/tree.js');let count=1,min=Infinity;
   const walk=p=>{if(p.length===3)return;for(let i=1;i<=3;i++){const n=treeNode(0,[...p,i]);count++;min=Math.min(min,n.cost);walk([...p,i]);}};walk([]);
   return {count,min,root:treeRoot(0).cost,sibling:canBuyNode(0,[2],['0','0-1']),conflict:treeBlocked('0-1-1-1',['2-1-1-1']),invalid:treeNode(0,[1,1,1,1])};
  });assert.equal(r.count,40);assert.ok(r.min>r.root);assert.ok(r.sibling);assert.ok(r.conflict);assert.equal(r.invalid,null);
  await page.evaluate(async()=>{SRK.save.souls=100000;(await import('/src/ui/treeui.js')).openTree();});
  await page.locator('[data-open="0"]').click();await page.locator('[data-node=""]').click();await page.locator('[data-node="1"]').click();await page.locator('[data-node="2"]').click();
  assert.deepEqual(await page.evaluate(()=>SRK.save.tree),['0','0-1','0-2']);
  await page.screenshot({path:'tests/artifacts/tree.png'});
 });
 await test('Migração converte fragmentos uma vez e reembolsa caminhos antigos profundos',async()=>{
  const c=await browser.newContext();const p=await c.newPage();await p.goto(base);
  await p.evaluate(()=>localStorage.setItem('srkUltra2',JSON.stringify({souls:100,frags:40,tree:['0','0-1','0-1-1-1-1-1-1'],upg:{}})));
  await p.reload();await p.waitForFunction(()=>window.SRK?.save.economyVersion===3);
  const first=await p.evaluate(()=>({souls:SRK.save.souls,tree:SRK.save.tree,frags:SRK.save.frags}));await p.reload();
  assert.ok(first.souls>1100);assert.deepEqual(first.tree,['0','0-1']);assert.equal(first.frags,undefined);assert.equal(await p.evaluate(()=>SRK.save.souls),first.souls);await c.close();
 });
 await test('As 17 classes usam ativas no PVP sem erros ou valores inválidos',async()=>{
  const bad=await page.evaluate(async()=>{
   const {S}=SRK,bad=[];const {usePvpAbility}=await import('/src/game/pvpabilities.js');const {update}=await import('/src/game/loop.js');
   for(let cls=0;cls<17;cls++){
    SRK.startRun([cls,0],'pvp');S.paused=true;
    S.players[0].cells=[[48,50],[47,50],[46,50],[45,50],[44,50]];S.players[1].cells=[[53,50],[54,50],[55,50]];
    usePvpAbility(S.players[0]);for(let n=0;n<80&&S.runActive;n++)update(1/60);
    for(const p of S.players)if(!Number.isFinite(p.hp)||!Number.isFinite(p.cd)||p.cells.some(c=>c.some(n=>!Number.isFinite(n))))bad.push(cls);
   }return bad;
  });assert.deepEqual(bad,[]);
 });
 await test('Tablet e celular: canvas cabe, mantém proporção e controles de toque aparecem',async()=>{
  await page.evaluate(()=>{SRK.startRun([0,1],'pvp');SRK.S.paused=true;SRK.save.touch='on';});
  await page.evaluate(async()=>{(await import('/src/ui/touch.js')).refreshTouchUI();});
  for(const [width,height] of [[844,390],[390,844],[1024,768]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(160);
    const r=await page.evaluate(()=>{const cv=document.querySelector('#cv'),b=cv.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,r:cv.width/cv.height,touch:!document.querySelector('#touchUI').classList.contains('hidden')};});
    assert.ok(r.y+r.h<=height+1,JSON.stringify(r));assert.ok(r.x+r.w<=width+1);assert.ok(Math.abs(r.w/r.h-r.r)<0.015);assert.ok(r.touch);
    await page.screenshot({path:`tests/artifacts/pvp-${width}x${height}.png`});
  }
 });
 await test('Dois joysticks recebem toques simultâneos sem trocar os jogadores',async()=>{
  const c=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true});const p=await c.newPage();
  p.on('pageerror',e=>errors.push(e.stack));await p.goto(base);await p.waitForFunction(()=>window.SRK?.startRun);
  await p.evaluate(()=>{SRK.startRun([0,1],'pvp');});
  const boxes=await Promise.all(['#tStickZone','#tStickZone2'].map(id=>p.locator(id).boundingBox()));
  const points=boxes.map((b,i)=>({id:i+1,x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height*.7)}));
  const cdp=await c.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map((pt,i)=>({...pt,y:pt.y+(i?60:-60)}))});
  await p.waitForFunction(()=>SRK.S.players[0].dir.y===-1&&SRK.S.players[1].dir.y===1);
  assert.equal(await p.locator('#tStick.live, #tStick2.live').count(),2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await p.locator('#tStick.live, #tStick2.live').count(),0);await c.close();
 });
 await test('Escudo absorve a horda, morrer para inimigos perde e mortes simultâneas empatam',async()=>{
  const r=await page.evaluate(async()=>{
   const {S}=SRK,{damagePlayer}=await import('/src/game/player.js'),{pvpHit,resolvePvpDeaths}=await import('/src/game/pvp.js');
   SRK.startRun([0,1],'pvp');S.paused=true;const p=S.players[0];p.iframes=0;p.guard=4;p.guardMax=4;
   damagePlayer(p,2);const blocked={hp:p.hp,guard:p.guard};p.pvpIf=0;damagePlayer(p,999);resolvePvpDeaths();const hordeWinner=S.pvp.winner;
   SRK.startRun([0,1],'pvp');S.paused=true;
   for(const q of S.players){q.iframes=0;pvpHit(q,999,null,'environment');}resolvePvpDeaths();
   return {blocked,hordeWinner,draw:S.pvp.winner,over:S.pvp.over};
  });assert.deepEqual(r.blocked,{hp:10,guard:2});assert.equal(r.hordeWinner,1);assert.equal(r.draw,-1);assert.ok(r.over);
 });
 await test('Reservas compradas são usadas uma vez na campanha e preservadas no PVP',async()=>{
  await page.evaluate(async()=>{const {save}=SRK;save.souls=10000;save.tree=[];Object.keys(save.upg).forEach(k=>save.upg[k]=0);save.supplies={reroll:0,banish:0,blessing:0};(await import('/src/ui/shop.js')).openShop();});
  for(const name of ['Reserva de Rerrolagem','Selo de Banimento','Bênção Engarrafada'])await page.locator('#shopGrid .card').filter({has:page.getByRole('heading',{name,exact:true})}).click();
  assert.deepEqual(await page.evaluate(()=>({souls:SRK.save.souls,stock:SRK.save.supplies})),{souls:2600,stock:{reroll:1,banish:1,blessing:1}});
  const r=await page.evaluate(()=>{
   const {S,save}=SRK;SRK.startRun([0,1],'pvp');const afterPvp={...save.supplies};
   SRK.startRun([0],'solo');S.paused=true;const first={stock:{...save.supplies},rr:S.rerolls,ban:S.banishes,powers:S.players[0].powerLog.length};
   SRK.startRun([0],'solo');S.paused=true;return {afterPvp,first,second:{rr:S.rerolls,ban:S.banishes,powers:S.players[0].powerLog.length}};
  });assert.deepEqual(r.afterPvp,{reroll:1,banish:1,blessing:1});assert.deepEqual(r.first,{stock:{reroll:0,banish:0,blessing:0},rr:2,ban:1,powers:1});assert.deepEqual(r.second,{rr:0,ban:0,powers:0});
 });
 await page.setViewportSize({width:1280,height:850});
 // Conexão real entre dois contextos, pelo relay PHP da aplicação.
 await test('PVP LAN: lobby, câmera própria, movimento, item, escolha ao vivo e resultado nos dois lados',async()=>{
  const hc=await browser.newContext(),gc=await browser.newContext();const h=await hc.newPage(),g=await gc.newPage();
  for(const p of [h,g]){p.on('pageerror',e=>errors.push(e.stack));await p.goto(base);await p.waitForFunction(()=>window.SRK?.startRun);await p.locator('[data-act="open-online"]').click();await p.locator('.net-advanced summary').click();await p.locator('#nmPhp').check();}
  await h.locator('#onlineMode').selectOption('pvp');await h.locator('[data-act="create-room"]').click();await h.waitForSelector('#lobby:not(.hidden)');const code=await h.locator('#lobbyCode').textContent();
  await g.locator('#joinCode').fill(code);await g.locator('[data-act="join-room"]').click();await g.locator('#lobbyGrid .card').nth(1).click();
  await h.locator('#btnStartOnline').click();await g.waitForFunction(()=>SRK.S.rs?.pvp && SRK.S.phase==='play');
  assert.equal(await g.evaluate(()=>SRK.S.mode),'pvp');
  const cameras=await Promise.all([h,g].map(p=>p.evaluate(async()=>{const {panes}=await import('/src/render/viewport.js');return panes().map(p=>p.who);})));assert.deepEqual(cameras,[[0],[1]]);
  await g.keyboard.press('ArrowUp');await h.waitForFunction(()=>SRK.S.players[1].dir.y===-1);
  await h.evaluate(async()=>{SRK.S.players[1].item={...(await import('/src/data/pvp.js')).ITEMS.egide};});
  await g.keyboard.press('q');await h.waitForFunction(()=>SRK.S.players[1].shieldT>0);
  await h.evaluate(async()=>{(await import('/src/game/pvp.js')).gainXp(SRK.S.players[1],16);});await g.waitForSelector('.pvp-choice');
  assert.equal(await h.evaluate(()=>SRK.S.phase),'play');await g.keyboard.press('1');await h.waitForFunction(()=>SRK.S.players[1].powerLog.length===1);
  await h.waitForFunction(()=>SRK.S.pingMs!==null,{timeout:6000});console.log('LAN ping observado:',await h.evaluate(()=>SRK.S.pingMs));
  await g.screenshot({path:'tests/artifacts/pvp-lan-guest.png'});
  await h.evaluate(async()=>{const {S}=SRK;S.pvp.t=100;S.players[1].shieldT=0;S.players[1].iframes=0;S.players[1].pvpIf=0;(await import('/src/game/pvp.js')).pvpHit(S.players[1],999,S.players[0],'test');(await import('/src/game/pvp.js')).resolvePvpDeaths();});
  await h.waitForSelector('#over:not(.hidden)');await g.waitForSelector('#over:not(.hidden)');
  assert.equal(await h.locator('#overTitle').textContent(),await g.locator('#overTitle').textContent());assert.equal(await g.evaluate(()=>SRK.S.pvp.winner),0);
  await hc.close();await gc.close();
 });
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:passed.length,errors},null,2));
 fs.writeFileSync('tests/artifacts/results.json',JSON.stringify({passed,errors},null,2));
} catch(e){console.error('FAILED',e.stack);console.log('PAGE ERRORS',errors);await page.screenshot({path:'tests/artifacts/failure.png'}).catch(()=>{});process.exitCode=1;} finally {await browser.close();}
