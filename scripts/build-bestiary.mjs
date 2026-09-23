import fs from 'node:fs';
import {ENEMY_SPECIES,BOSS_ROSTER} from '../src/data/ecology.js';
import {EDEF} from '../src/data/enemies.js';
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const path=d=>`<path d="${d}"/>`;
const circle=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}"/>`;
const shapes={
 maw:path('M-36-19 Q-12-51 21-34 L42-8 30 31 0 42-32 24Z')+'<path d="M-25 0Q0 32 27-2L15 24-15 24Z" fill="#130c29"/><path d="M-19 2-10 15-4 4 4 15 12 1 18 12" fill="none" stroke="#fff3d5"/>',
 raptor:path('M-44 8-22-13-6-43 9-20 39-12 18 8 31 35 5 22-22 35-16 12Z'),
 eye:path('M-47 0Q0-50 47 0Q0 48-47 0Z')+circle(0,0,24),
 beetle:path('M-30-26Q0-47 30-26L39 11 20 34-20 34-39 11Z')+'<path d="M0-33V34M-28-14-47-27M-36 3-53 12M-28 25-40 42M28-14 47-27M36 3 53 12M28 25 40 42" fill="none"/>',
 pod:path('M0-43C55-25 52 32 0 43C-52 32-55-25 0-43Z')+'<path d="M0-35C-22-10 22 12 0 35" fill="none"/>',
 orb:circle(0,0,29)+'<ellipse rx="48" ry="14" transform="rotate(-28)" fill="none"/><circle cx="-41" cy="20" r="7"/>',
 flower:Array.from({length:6},(_,i)=>`<ellipse cy="-23" rx="12" ry="23" transform="rotate(${i*60})"/>`).join('')+circle(0,0,19),
 horn:path('M-25-17-43-48-39-4-25 12-17 35 17 35 25 12 39-4 43-48 25-17Q0-38-25-17Z'),
 needle:path('M0-54 15-8 36 11 14 17 0 46-14 17-36 11-15-8Z')+'<path d="M0-32V26" fill="none"/>',
 bomb:circle(0,8,32)+path('M-12-22V-33H12V-22M0-34Q-12-55 17-51')+'<path d="M-19-3 0-17 19-3 0 22Z" fill="#24122d"/>',
 spider:'<path d="M-16-15-44-38-50-12M-24 0-51-5-52 22M-18 18-38 34-35 50M16-15 44-38 50-12M24 0 51-5 52 22M18 18 38 34 35 50" fill="none" stroke-width="6"/>'+path('M0-32 24-10 21 24 0 37-21 24-24-10Z'),
 shield:path('M0-43 36-26 31 16 0 45-31 16-36-26Z')+'<path d="M0-32V30M-23-10H23" fill="none"/>',
 toad:path('M-37 25Q-50 0-30-13C-45-44-8-48-5-25L5-25C8-48 45-44 30-13Q50 0 37 25L12 37-12 37Z'),
 leech:path('M-34-25C7-55 49-21 34 2S-14 50-38 30Q-12 25 4 1T-34-25Z'),
 hammer:path('M-39-30H39V-3L17 5 10 43H-10L-17 5-39-3Z')+'<path d="M-25-22H25M-8 8H8M-8 23H8" fill="none"/>',
 cannon:path('M-29-25H29L38 28 21 39-21 39-38 28Z')+'<rect x="-15" y="-47" width="30" height="48" rx="5"/><ellipse cy="-43" rx="10" ry="5" fill="#171024"/>',
 obelisk:path('M0-50 22-30 30 28 0 43-30 28-22-30Z')+'<path d="M0-38V32M-16-17 0-5 16-17M-20 8 0 20 20 8" fill="none"/>',
 mantis:path('M0-32 18-9 11 35-11 35-18-9Z')+'<path d="M-12-5-33-42-47-3-29-16M12-5 33-42 47-3 29-16M-10 23-34 42M10 23 34 42" fill="none" stroke-width="5"/>',
 drill:path('M0-50 26-13 34 25 16 40-16 40-34 25-26-13Z')+'<path d="M-8-37 11-30-17-20 23-10-26 1 30 12-28 24" fill="none"/>',
 crystal:path('M0-49 26-21 20 29 0 48-20 29-26-21Z')+path('M-31-26-47-9-37 24-22 8ZM31-26 47-9 37 24 22 8Z')+'<path d="M0-35V33M-20-16 0 0 20-16" fill="none"/>',
 fort:path('M-39-32H-23V-15H-10V-38H10V-15H23V-32H39V34H-39Z')+'<path d="M-8 34V12Q0 2 8 12V34" fill="#171024"/>',
 bell:path('M-36 22Q-23 0-23-19Q0-46 23-19Q23 0 36 22Z')+circle(0,30,8)+'<path d="M-31 13H31M-7-38Q0-49 7-38" fill="none"/>',
 anchor:circle(0,-31,12)+'<path d="M0-19V40M-25-10H25M-43 7Q-41 42 0 40Q41 42 43 7L29 17M-43 7-29 17" fill="none" stroke-width="8"/>',
 coil:path('M-17-38H17L25-13 15 27 0 41-15 27-25-13Z')+'<path d="M-34-21Q0-39 34-21T-34 1T34 23" fill="none" stroke-width="5"/>',
 worm:path('M-39 22C-49-27-3-47 22-28S46 22 15 30S-16 10-6 0C-37 7-12 51-39 22Z'),
 skull:path('M-35-20Q0-51 35-20L33 10 20 20 16 38-16 38-20 20-33 10Z')+'<path d="M-25-9-7-6-11 10-25 5ZM25-9 7-6 11 10 25 5Z" fill="#100b20"/>',
 void:circle(0,0,33)+'<ellipse rx="49" ry="18" transform="rotate(35)" fill="none"/><ellipse rx="49" ry="18" transform="rotate(-35)" fill="none"/>',
 hive:path('M0-43 37-21V21L0 43-37 21V-21Z')+Array.from({length:6},(_,i)=>`<circle cx="${Math.cos(i*Math.PI/3)*23}" cy="${Math.sin(i*Math.PI/3)*23}" r="10" fill="#171024"/>`).join(''),
 reaper:path('M0-46 28-21 21 5 35 38 0 27-35 38-21 5-28-21Z')+'<path d="M-44 42V-32Q0-59 44-24Q0-39-44-10" fill="none" stroke-width="5"/>',
 world:circle(0,0,32)+'<ellipse rx="56" ry="20" transform="rotate(-15)" fill="none"/><path d="M-37-27-42-49-21-33-12-54 0-35 15-53 23-31 44-44 37-22" fill="url(#metal)"/><path d="M-33 17-52 31-30 32-42 47-16 32M33 17 52 31 30 32 42 47 16 32" fill="none"/>',
};
const oldShapes={boss:'maw',boss2:'skull',boss3:'reaper',boss4:'void',boss5:'crystal',boss6:'hive',boss_elite:'reaper',boss_plague:'flower',boss_tyrant:'fort',boss_final:'world'};
function svg(d,boss=false,index=0){
 const shape=d.shape||oldShapes[d.art]||'eye',stage=d.stage||0;
 const seed=boss?index:d.ordinal;
 const detail=stage===0?'':stage===1?`<path d="M-40-28-51-5-37 9M40-28 51-5 37 9M-23 34-13 48 0 39 13 48 23 34" fill="url(#metal)"/>`:`<path d="M-24-30-50-47-42-14-55 12-33 8M24-30 50-47 42-14 55 12 33 8M-22 31-32 50 0 39 32 50 22 31" fill="url(#metal)"/>`;
 const orbit=boss?`<circle r="56" fill="none" stroke="${d.c}" stroke-opacity=".4" stroke-dasharray="${8+seed%8} 9"/><g stroke-width="1.5">${Array.from({length:3+seed%5},(_,i)=>`<path d="M0-58-4-51 4-51Z" transform="rotate(${i*360/(3+seed%5)})" fill="${d.c}"/>`).join('')}</g>`:'';
 const eyeY=['bell','cannon','needle','hammer'].includes(shape)?8:-6;
 const eyes=['eye','orb','void','coil','world'].includes(shape)?`<circle cy="${eyeY}" r="${boss?11:9}" fill="#f6f4ff"/><ellipse cy="${eyeY}" rx="3" ry="8" fill="#20102d"/>`:`<path d="M-20 ${eyeY-3} -6 ${eyeY} -8 ${eyeY+6} -20 ${eyeY+4}ZM20 ${eyeY-3} 6 ${eyeY} 8 ${eyeY+6} 20 ${eyeY+4}Z" fill="#f6f4ff" stroke="none"/>`;
 const emblem=stage>0?`<g transform="translate(0 22) rotate(${seed%4*45})" fill="${d.c}" stroke="#f9e9ca" stroke-width="1"><path d="M0-7 6 0 0 7-6 0Z"/>${stage===2?'<circle r="11" fill="none"/>':''}</g>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 128 128" role="img" aria-label="${xml(d.name)}"><title>${xml(d.name)}</title><defs><linearGradient id="metal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${d.c}"/><stop offset=".5" stop-color="#393057"/><stop offset="1" stop-color="#171126"/></linearGradient><radialGradient id="halo"><stop stop-color="${d.c}" stop-opacity=".25"/><stop offset="1" stop-color="${d.c}" stop-opacity="0"/></radialGradient></defs><circle r="63" fill="url(#halo)"/>${orbit}<g fill="url(#metal)" stroke="${d.c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${detail}${shapes[shape]}${emblem}</g>${eyes}</svg>`;
}
fs.mkdirSync('assets/enemies',{recursive:true});fs.mkdirSync('assets/bosses',{recursive:true});
const entries=[];
for(const d of ENEMY_SPECIES){fs.writeFileSync(`assets/enemies/${d.id}.svg`,svg(d));entries.push({...d,src:`enemies/${d.id}.svg`});}
for(const [i,b]of BOSS_ROSTER.entries()){const d=EDEF[b.id];fs.writeFileSync(`assets/bosses/${b.id}.svg`,svg({...d,stage:b.stage},true,i));entries.push({...d,id:b.id,unlock:b.unlock,src:`bosses/${b.id}.svg`,description:d.description||'Encontro de campanha com três ataques e fases.'});}
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bestiário — Cobrinha</title><style>body{margin:0;padding:32px;background:#100b1e;color:#eee5ff;font:16px system-ui}h1{color:#ffe2a0}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}article{background:#201832;border:1px solid #564070;border-radius:16px;padding:16px}img{width:128px;height:128px;display:block;margin:auto}h2{font-size:16px}p{color:#b9accb;font-size:13px;line-height:1.5}.tag{color:#eed19f}input{padding:12px;margin:16px 0 24px;background:#211832;color:white;border:1px solid #806a9b;border-radius:8px}</style><h1>Bestiário</h1><p>75 espécies e 25 bosses. Veteranos e elites evoluem seus ataques sem aumentar a contagem de espécies.</p><label>Buscar <input id="q" placeholder="Nome, ataque ou elemento"></label><main>${entries.map(d=>`<article><img loading="lazy" src="${d.src}" alt="${xml(d.name)}"><h2>${xml(d.name)}</h2><span class="tag">${d.boss?'Boss':['Inicial','Intermediário','Avançado'][d.stage]} · estreia na onda ${d.unlock}</span><p>${xml(d.description)}</p></article>`).join('')}</main><script>document.querySelector('#q').oninput=e=>document.querySelectorAll('article').forEach(a=>a.hidden=!a.textContent.toLocaleLowerCase('pt-BR').includes(e.target.value.toLocaleLowerCase('pt-BR')))</script></html>`;
fs.writeFileSync('assets/bestiary.html',html);console.log('75 SVGs de inimigos, 25 de bosses e bestiário gerados.');
