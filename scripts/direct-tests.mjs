import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const env={};for(const[k,v]of Object.entries(process.env))if(!Object.keys(env).some(x=>x.toLowerCase()===k.toLowerCase()))env[k]=v;
const browser=await chromium.launch({headless:true,channel:'msedge',env}),errors=[],passed=[];
const base=process.env.TEST_URL||'http://127.0.0.1:8123',relay=process.env.RELAY_TEST_URL||'http://127.0.0.1:9000';
async function pair(disabled=false,mode='online'){
 const contexts=await Promise.all([browser.newContext(),browser.newContext()]),pages=[];
 for(const c of contexts){const p=await c.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.stack));
  await p.addInitScript(({relay,disabled})=>{window.COBRINHA_RELAY_URL=relay;window.testPCs=[];const Native=window.RTCPeerConnection;window.RTCPeerConnection=disabled?undefined:class extends Native{constructor(...args){super(...args);window.testPCs.push(this);}};},{relay,disabled});
  await p.goto(base);await p.waitForFunction(()=>window.SRK);await p.locator('[data-act="open-online"]').click();
 }
 const [h,g]=pages;await h.locator('#onlineMode').selectOption(mode);await h.locator('[data-act="create-room"]').click();await h.waitForSelector('#lobby:not(.hidden)');
 await g.locator('#joinCode').fill(await h.locator('#lobbyCode').textContent());await g.locator('[data-act="join-room"]').click();
 await g.locator('#lobbyGrid .card').nth(1).click();await h.locator('#btnStartOnline').click();await g.waitForFunction(()=>SRK.S.rs?.players?.length===2);
 return {h,g,close:()=>Promise.all(contexts.map(c=>c.close()))};
}
try{
 const a=await pair();for(const p of [a.h,a.g])await p.waitForFunction(()=>SRK.S.transportLabel.includes('direta'),{},{timeout:20000});
 await a.h.evaluate(()=>{const {S}=SRK;S.paused=true;S.enemies=[];S.spawnQ=0;const h=S.players[1].cells[0];for(let i=0;i<200;i++){const e=SRK.spawnEnemy('grunter');e.x=h[0]*28+(i%10)*4;e.y=h[1]*28+Math.floor(i/10)*4;}});
 await a.g.waitForFunction(()=>SRK.S.rs.enemies.length===200);
 await a.h.waitForFunction(()=>SRK.S.pingMs!==null);const directPing=await a.h.evaluate(()=>SRK.S.pingMs);
 passed.push('Sala automática melhora para conexão direta nos dois jogadores e transmite horda de 200');
 const before=await a.g.evaluate(()=>SRK.S.rs.seq);
 await a.h.evaluate(()=>testPCs.forEach(pc=>pc.close()));
 for(const p of [a.h,a.g])await p.waitForFunction(()=>SRK.S.transportLabel.includes('Servidor'),{},{timeout:12000});
 await a.g.waitForFunction(seq=>SRK.S.rs.seq>seq+3,before);
 await a.h.evaluate(()=>{SRK.S.paused=false;SRK.S.players.forEach(p=>p.iframes=999);});
 await a.g.waitForFunction(()=>!SRK.S.paused);
 await a.g.keyboard.press('ArrowUp');await a.h.waitForFunction(()=>SRK.S.players[1].dir.y===-1);
 passed.push('Perda do canal direto retorna ao relay, preservando estados e controles');await a.close();
 const b=await pair(true);assert.match(await b.h.evaluate(()=>SRK.S.transportLabel),/Servidor/);
 await b.g.keyboard.press('ArrowUp');await b.h.waitForFunction(()=>SRK.S.players[1].dir.y===-1);
 passed.push('Navegador sem WebRTC joga pela mesma sala usando relay');await b.close();
 const c=await pair(false,'pvp');for(const p of [c.h,c.g])await p.waitForFunction(()=>SRK.S.transportLabel.includes('direta'));
 await c.h.evaluate(async()=>(await import('/src/game/pvp.js')).pvpEnd(1));
 await c.g.waitForSelector('#over:not(.hidden)');assert.equal(await c.g.evaluate(()=>SRK.S.pvp.winner),1);
 passed.push('Resultado do PVP chega ao convidado pela conexão direta');await c.close();
 assert.deepEqual(errors,[]);fs.mkdirSync('tests/artifacts',{recursive:true});fs.writeFileSync('tests/artifacts/direct-results.json',JSON.stringify({passed,directPing,errors},null,2));console.log({passed,directPing});
}catch(e){console.error(e.stack,errors);process.exitCode=1;}finally{await browser.close();}
