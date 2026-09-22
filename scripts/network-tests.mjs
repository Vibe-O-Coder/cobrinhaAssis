import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const env={};for(const[k,v]of Object.entries(process.env))if(!Object.keys(env).some(x=>x.toLowerCase()===k.toLowerCase()))env[k]=v;
const browser=await chromium.launch({headless:true,channel:'msedge',env});
const base=process.env.TEST_URL||'http://127.0.0.1:8123',errors=[],results=[];
fs.mkdirSync('tests/artifacts',{recursive:true});
async function pair(transport,mode){
 const hc=await browser.newContext(),gc=await browser.newContext(),h=await hc.newPage(),g=await gc.newPage();
 for(const p of [h,g]){p.on('pageerror',e=>errors.push(e.stack));await p.goto(base);await p.waitForFunction(()=>window.SRK?.startRun);await p.locator('[data-act="open-online"]').click();await p.locator(transport).check();}
 await h.locator('#onlineMode').selectOption(mode);await h.locator('[data-act="create-room"]').click();const code=await h.locator('#lobbyCode').textContent();
 await g.locator('#joinCode').fill(code);await g.locator('[data-act="join-room"]').click();
 try {await g.locator('#lobbyGrid .card').nth(7).click({timeout:25000});}catch(e){console.log('HOST STATUS',await h.locator('#lobbyStatus2').textContent());console.log('GUEST STATUS',await g.locator('#onlineStatus').textContent());throw e;}
 await h.locator('#btnStartOnline').click();await g.waitForFunction(()=>SRK.S.rs?.players?.length===2);
 return {h,g,close:async()=>{await hc.close();await gc.close();}};
}
try{
 const p=await pair('#nmPhp','online'),{h,g}=p;
 await h.evaluate(()=>{SRK.S.paused=true;});await g.waitForFunction(()=>SRK.S.paused);
 assert.deepEqual(await g.evaluate(async()=>{return (await import('/src/render/viewport.js')).panes().map(p=>p.who);}),[1]);
 await h.evaluate(async()=>{SRK.S.paused=false;SRK.S.enemies=[];SRK.S.spawnQ=0;(await import('/src/game/picks.js')).waveClear();});
 await h.waitForSelector('#upOv:not(.hidden) .card');await g.waitForSelector('#upOv:not(.hidden) .card');
 await g.locator('#upCards .card').first().click();await h.locator('#upCards .card').first().click();
 await h.waitForFunction(()=>SRK.S.phase==='play'&&SRK.S.wave>=2);await g.waitForFunction(()=>SRK.S.phase==='play'&&SRK.S.rs.wave>=2);
 assert.deepEqual(await h.evaluate(()=>SRK.S.players.map(p=>p.powerLog.length)),[1,1]);
 results.push('Co-op LAN: câmeras individuais, pausa sincronizada e poderes dos dois jogadores');
 // Simula 250ms de atraso nos comandos, com previsão visual independente.
 await g.evaluate(()=>{const net=SRK.S.net,send=net.send.bind(net);net.send=o=>setTimeout(()=>send(o),250);});
 const before=await h.evaluate(()=>SRK.S.players[1].dir);await g.keyboard.press('w');await g.waitForTimeout(180);
 const predicted=await g.evaluate(async()=>{const {smoothedView}=await import('/src/render/snapshot.js');return smoothedView().players[1].dir;});assert.equal(predicted.y,-1);
 await h.waitForFunction(()=>SRK.S.players[1].dir.y===-1);
 results.push('Predição visual responde antes do comando atrasado chegar ao host');
 await p.close();
 const rtc=await pair('#nmWebRTC','pvp');await rtc.g.keyboard.press('ArrowUp');await rtc.h.waitForFunction(()=>SRK.S.players[1].dir.y===-1);await rtc.h.waitForFunction(()=>SRK.S.pingMs!==null);
 const ping=await rtc.h.evaluate(()=>SRK.S.pingMs);console.log('WEBRTC PING',ping);
 assert.match(await rtc.h.evaluate(()=>SRK.S.transportLabel),/WebRTC/);
 await rtc.g.evaluate(()=>{SRK.S.net.close();});await rtc.h.waitForSelector('#over:not(.hidden)');assert.equal(await rtc.h.evaluate(()=>SRK.S.pvp.winner),0);
 results.push('PVP WebRTC: conexão direta, controles e vitória por desconexão');
 await rtc.close();
 const left=await pair('#nmPhp','pvp');
 await left.h.evaluate(()=>{SRK.S.pvp.t=100;SRK.S.players[1].level=7;SRK.S.players[1].pvpKills=2;SRK.S.players[1].kills=15;});
 await left.g.waitForFunction(()=>SRK.S.rs.players[1].level===7);
 const souls=await left.g.evaluate(()=>SRK.save.souls);
 await left.h.evaluate(()=>SRK.S.net.close());await left.g.waitForSelector('#over:not(.hidden)');
 assert.equal(await left.g.evaluate(()=>SRK.S.pvp.winner),1);
 assert.equal(await left.g.evaluate(()=>SRK.save.souls),souls+92);
 assert.match(await left.g.locator('#overStats').textContent(),/nível 7 · 15 abates/);
 results.push('Host sai: convidado vence com os níveis, abates e recompensa do último estado');await left.close();
 assert.deepEqual(errors,[]);console.log('PASS',results);
 fs.writeFileSync('tests/artifacts/network-results.json',JSON.stringify({results,ping,errors},null,2));
}catch(e){console.error('FAIL',e.stack);console.log('ERRORS',errors);process.exitCode=1;}finally{await browser.close();}
