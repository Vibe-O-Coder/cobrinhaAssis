import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const env={};for(const[k,v]of Object.entries(process.env))if(!Object.keys(env).some(x=>x.toLowerCase()===k.toLowerCase()))env[k]=v;
const browser=await chromium.launch({headless:true,channel:'msedge',env});
try {
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8123');await page.waitForFunction(()=>window.SRK);
 await page.evaluate(async()=>{if(await import('/src/render/sprites.js').catch(()=>null)){const m=await import('/src/render/sprites.js');await m.preloadSprites?.();}});
 const result=await page.evaluate(async()=>{
  const {S,save}=SRK;const {update}=await import('/src/game/loop.js');const {render}=await import('/src/render/render.js');const {LIVE,snap}=await import('/src/render/snapshot.js');const {updateFx,addParts}=await import('/src/render/fx.js');
  const codec=await import('/src/net/codec.js').catch(()=>null);save.afk=false;save.fast=false;save.mode='normal';
  SRK.startRun([0,1],'local');S.paused=true;S.wave=200;S.spawnQ=0;S.enemies=[];S.blocks=[];
  S.players.forEach((p,i)=>{p.cells=[[45+i*10,50],[44+i*10,50],[43+i*10,50]];p.hp=p.maxHp=1e9;p.shieldT=1e9;p.dmg=1;p.range=900;p.cd=.1;});
  for(let i=0;i<197;i++){const e=SRK.spawnEnemy(['grunter','shooter','mortar','sentinel','orbiter','weaver'][i%6]);e.x=800+(i%20)*55;e.y=900+Math.floor(i/20)*65;e.hp=e.mhp=1e9;}
  for(const type of ['boss6','boss5','boss_tyrant']){const e=SRK.spawnEnemy(type);e.x=1450;e.y=1000;e.hp=e.mhp=1e9;}
  const sim=[],draw=[],pack=[];let bytes=0,wireBytes=0,peakParts=0;
  for(let i=0;i<240;i++) {
   if(i%20===0)for(let k=0;k<25;k++)addParts(1300+k*4,1350,'#ffaa22',26,3);
   let t=performance.now();update(1/60);updateFx(1/60);const u=performance.now()-t;
   t=performance.now();render(LIVE(),1/60);const d=performance.now()-t;S.gameT+=1/60;
   if(i>=40){sim.push(u);draw.push(d);}peakParts=Math.max(peakParts,S.parts.length);
   if(i%3===0){t=performance.now();const message={t:'state',s:snap()};bytes+=JSON.stringify(message).length;wireBytes+=JSON.stringify(codec?codec.packMessage(message):message).length;pack.push(performance.now()-t);}
  }
  const stats=a=>({mean:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2),p95:+a.sort((x,y)=>x-y)[Math.floor(a.length*.95)].toFixed(2)});
  return {simulationMs:stats(sim),renderMs:stats(draw),snapshotMs:stats(pack),snapshotBytes:Math.round(bytes/80),wireBytes:Math.round(wireBytes/80),enemies:S.enemies.length,parts:peakParts};
 });
 if(errors.length)throw Error(errors.join('\n'));
 fs.mkdirSync('tests/artifacts',{recursive:true});fs.writeFileSync(`tests/artifacts/perf-${process.argv[2]||'current'}.json`,JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
