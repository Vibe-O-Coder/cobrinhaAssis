import {S} from '../core/state.js';
import {$,esc,clamp} from '../core/utils.js';
import {CLASSES} from '../data/classes.js';
import {EDEF} from '../data/enemies.js';
import {ENEMY_SPECIES,BOSS_ROSTER,MUTATIONS} from '../data/ecology.js';
import {UPGRADES,RELICS,canOffer} from '../data/upgrades.js';
import {ULTIMATE_UPGRADES,ULTIMATE_PATHS} from '../data/ultimates.js';
import {makePlayer,grantPower,headPx} from '../game/player.js';
import {spawnEnemy,startWave} from '../game/waves.js';
import {hideOvs,toast} from './screens.js';
import {centerCameraOnPlayers} from '../render/camera.js';
import {FINAL_WAVE,W,H} from '../core/config.js';

const num=(id,min,max)=>clamp(Number($(id).value)||min,min,max);
function option(value,label){return `<option value="${esc(value)}">${esc(label)}</option>`;}
export function clearSandbox() {
 if(!S.sandbox)return;
 for(const key of ['enemies','pbullets','ebullets','bombs','bossHazards','drops','parts','texts','effects','blocks'])S[key]=[];
 S.spawnQ=0;S.bossQueue=[];S.bossLeft=0;S.victory=false;S.hazardCount=0;S.sandbox.waveActive=false;
}
export function sandboxWave(wave) {
 if(!S.sandbox)return;clearSandbox();startWave(clamp(Math.round(wave),1,FINAL_WAVE));
 S.sandbox.waveActive=true;closeSandbox();centerCameraOnPlayers(true);
}
export function sandboxSpawn(type,count=1,rank=0,mutation='normal') {
 if(!S.sandbox||!EDEF[type])return 0;
 if(type==='boss_final'&&!S.finalArena){sandboxWave(FINAL_WAVE);return 1;}
 const def=EDEF[type],key=def.boss?type:type+['','_veteran','_elite'][rank];
 const h=headPx(S.players[0]);let spawned=0;
 for(let i=0;i<Math.min(200,count);i++){
  const e=spawnEnemy(key,{rank,mutation});if(!e)break;
  if(!def.final){const a=i*2.399963+S.eid*.2,r=240+i%4*45;e.x=clamp(h.x+Math.cos(a)*r,40,W-40);e.y=clamp(h.y+Math.sin(a)*r,40,H-40);}
  spawned++;
 }
 toast(`${spawned} inimigo(s) criado(s) · limite de 200 vivos`);return spawned;
}
export function sandboxUltimate(branch,level) {
 if(!S.sandbox)return;const p=S.players[0];
 for(const id of Object.keys(p.powers))if(id.startsWith('ult_'))delete p.powers[id];
 p.powerLog=p.powerLog.filter(id=>!id.startsWith('ult_'));p.ultimate=null;p.abName=CLASSES[p.cls].ab;
 p.ultimateBursts=[];p.ultimateTurrets=[];
 for(const card of ULTIMATE_UPGRADES.filter(c=>c.cls===p.cls&&c.branch===branch&&c.tier<=level))grantPower(p,card);
 p.abT=0;
}
function refreshPowers() {
 const p=S.players[0],q=$('#sbPowerSearch').value.toLocaleLowerCase('pt-BR');
 const cards=[...UPGRADES,...RELICS].filter(o=>!o.ultimate&&(o.cls===undefined||o.cls===p.cls)&&o.n.toLocaleLowerCase('pt-BR').includes(q));
 $('#sbPower').innerHTML=cards.map(o=>`<option value="${o.id}" ${canOffer(o,p)?'':'disabled'}>${esc(o.n)} · ${p.powers[o.id]||0}${canOffer(o,p)?'':' (limite/pré-requisito)'}</option>`).join('');
 $('#sbPowerDesc').textContent=cards.find(o=>o.id===$('#sbPower').value)?.d||'Nenhum poder disponível com esse filtro.';
}
function updatePreview(){const d=EDEF[$('#sbEnemy').value];if(!d)return;$('#sbEnemyPreview').src=d.svg;$('#sbEnemyDesc').textContent=d.description||`${d.name}: três ataques e fases. Veteranos e elites fortalecem os padrões.`;}
function characterFields(){const p=S.players[0];$('#sbClass').value=p.cls;$('#sbLevel').value=p.level||1;$('#sbHp').value=p.maxHp;$('#sbDamage').value=p.dmg;$('#sbShots').value=p.shots;$('#sbRate').value=p.cd;$('#sbRange').value=p.range;$('#sbBranch').innerHTML=ULTIMATE_PATHS[p.cls].map((u,i)=>option(i,u.name)).join('');$('#sbBranch').value=p.ultimate?.branch||0;$('#sbUltLevel').value=p.ultimate?.level||0;refreshPowers();}
function rebuildPlayer(){
 const old=S.players[0],p=makePlayer(num('#sbClass',0,15),0),level=num('#sbLevel',1,300);
 p.cells=old.cells.map(c=>c.slice());p.dir={...old.dir};p.level=level;
 // O nível de laboratório é explícito: escala de referência, atributos ainda editáveis.
 p.maxHp+=Math.floor((level-1)/3);p.hp=p.maxHp;p.dmgFlat+=(level-1)*.12;
 S.players=[p];S.runActive=true;S.phase='play';S.paused=true;characterFields();
}
export function openSandbox() {
 if(!S.sandbox)return;hideOvs();S.paused=true;
 const panel=$('#sandboxPanel');if(!panel.dataset.ready)installSandbox();
 S.sandbox.open=openSandbox;characterFields();$('#sbInvulnerable').checked=S.sandbox.invulnerable;$('#sbCooldown').checked=S.sandbox.freeCooldown;
 panel.classList.remove('hidden');panel.scrollTop=0;
}
export function closeSandbox(){if(!S.sandbox)return;$('#sandboxPanel').classList.add('hidden');S.paused=false;}
export function toggleSandbox(){if(!S.sandbox)return;if($('#sandboxPanel').classList.contains('hidden'))openSandbox();else closeSandbox();}
function installSandbox(){
 const panel=$('#sandboxPanel');panel.dataset.ready='1';
 panel.innerHTML=`<div class="sandbox-head"><h2>Laboratório</h2><button class="btn small" id="sbPlay">Jogar / testar</button></div>
 <p class="sandbox-note">Sandbox solo · sem recompensas ou recordes. O painel pausa a simulação. Tecla B para abrir/fechar.</p>
 <fieldset><legend>Personagem</legend><label>Classe<select id="sbClass">${CLASSES.map((c,i)=>option(i,c.name)).join('')}</select></label>
 <label>Nível de teste<input id="sbLevel" type="number" min="1" max="300" value="1"></label><small>Ao recriar: +1 HP a cada 3 níveis e +0,12 de dano por nível. Limpa os poderes anteriores.</small><button class="btn small" id="sbRebuild">Recriar personagem</button>
 <div class="sandbox-grid"><label>HP máximo<input id="sbHp" type="number" min="1" max="9999"></label><label>Dano base<input id="sbDamage" type="number" min=".1" max="10000" step=".1"></label><label>Projéteis<input id="sbShots" type="number" min="1" max="12"></label><label>Intervalo de tiro (s)<input id="sbRate" type="number" min=".06" max="5" step=".01"></label><label>Alcance<input id="sbRange" type="number" min="60" max="1400"></label></div>
 <button class="btn small" id="sbStats">Aplicar atributos e curar</button><label class="sandbox-check"><input id="sbInvulnerable" type="checkbox"> Invulnerabilidade</label><label class="sandbox-check"><input id="sbCooldown" type="checkbox"> Ultimate sem recarga</label></fieldset>
 <fieldset><legend>Poderes e ultimate</legend><label>Buscar poder<input id="sbPowerSearch" placeholder="Nome do poder"></label><label>Poder<select id="sbPower"></select></label><p id="sbPowerDesc"></p><button class="btn small" id="sbGrant">Adicionar poder</button>
 <label>Caminho<select id="sbBranch"></select></label><label>Evolução do ultimate (0 = base)<input id="sbUltLevel" type="number" min="0" max="10"></label><button class="btn small" id="sbUltimate">Aplicar ultimate</button></fieldset>
 <fieldset><legend>Ondas e inimigos</legend><label>Onda<input id="sbWave" type="number" min="1" max="290" value="1"></label><button class="btn small" id="sbStartWave">Jogar esta onda</button><button class="btn gold small" id="sbFinal">Última onda · Devorador</button>
 <label>Buscar inimigo<input id="sbEnemySearch" placeholder="Nome ou comportamento"></label><label>Espécie ou boss<select id="sbEnemy"></select></label><div class="sandbox-preview"><img id="sbEnemyPreview" alt="Arte da criatura selecionada"><p id="sbEnemyDesc"></p></div>
 <div class="sandbox-grid"><label>Patente<select id="sbRank"><option value="0">Natural</option><option value="1">Veterano</option><option value="2">Elite</option></select></label><label>Variação<select id="sbMutation">${Object.entries(MUTATIONS).map(([k,m])=>option(k,m.name)).join('')}</select></label><label>Quantidade<input id="sbCount" type="number" min="1" max="200" value="1"></label></div>
 <button class="btn small" id="sbSpawn">Criar inimigos</button><button class="btn small" id="sbClear">Limpar arena</button><a href="assets/bestiary.html" target="_blank" rel="noopener">Ver o bestiário completo ↗</a></fieldset>`;
 $('#sbPlay').onclick=closeSandbox;$('#sbRebuild').onclick=rebuildPlayer;
 $('#sbStats').onclick=()=>{const p=S.players[0];p.maxHp=num('#sbHp',1,9999);p.hp=p.maxHp;p.dmg=num('#sbDamage',.1,10000);p.shots=num('#sbShots',1,12);p.cd=num('#sbRate',.06,5);p.range=num('#sbRange',60,1400);p.dead=false;p.iframes=1;S.runActive=true;S.phase='play';toast('Atributos aplicados.');};
 $('#sbInvulnerable').onchange=e=>S.sandbox.invulnerable=e.target.checked;
 $('#sbCooldown').onchange=e=>S.sandbox.freeCooldown=e.target.checked;
 $('#sbPowerSearch').oninput=refreshPowers;$('#sbPower').onchange=()=>{$('#sbPowerDesc').textContent=[...UPGRADES,...RELICS].find(o=>o.id===$('#sbPower').value)?.d||'';};
 $('#sbGrant').onclick=()=>{const card=[...UPGRADES,...RELICS].find(o=>o.id===$('#sbPower').value);if(card&&canOffer(card,S.players[0])){grantPower(S.players[0],card);refreshPowers();toast(card.n+' adicionado.');}};
 $('#sbUltimate').onclick=()=>{sandboxUltimate(num('#sbBranch',0,2),num('#sbUltLevel',0,10));toast('Ultimate aplicado.');};
 $('#sbStartWave').onclick=()=>sandboxWave(num('#sbWave',1,290));$('#sbFinal').onclick=()=>sandboxWave(FINAL_WAVE);
 const enemies=[...ENEMY_SPECIES.map(e=>e.id),...BOSS_ROSTER.map(e=>e.id)];
 const filterEnemies=()=>{const q=$('#sbEnemySearch').value.toLocaleLowerCase('pt-BR');$('#sbEnemy').innerHTML=enemies.filter(id=>(EDEF[id].name+' '+(EDEF[id].description||'')).toLocaleLowerCase('pt-BR').includes(q)).map(id=>option(id,EDEF[id].name)).join('');if($('#sbEnemy').value)updatePreview();};
 $('#sbEnemySearch').oninput=filterEnemies;$('#sbEnemy').onchange=updatePreview;filterEnemies();
 $('#sbSpawn').onclick=()=>sandboxSpawn($('#sbEnemy').value,num('#sbCount',1,200),num('#sbRank',0,2),$('#sbMutation').value);
 $('#sbClear').onclick=()=>{clearSandbox();toast('Arena limpa.');};
}
