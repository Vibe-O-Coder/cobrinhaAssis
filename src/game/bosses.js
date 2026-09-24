/* Ataques de chefe usam tempo de simulação e alvos congelados na antecipação.
 * Nenhum setTimeout, mira invisível ou golpe que muda de lugar após o aviso. */
import { W, H, TAU } from "../core/config.js";
import { S } from "../core/state.js";
import { inflict } from './statuses.js';
import { startQte } from "./qte.js";
import {beginSurvival,survivalSection} from './finale.js';
import { castCatalogBoss, tickCatalogPattern } from './boss-catalog.js';
import { MAX_ENEMIES, MAX_ENEMY_BULLETS } from "../core/scaling.js";
import { clamp, dist } from "../core/utils.js";
import { headPx, hitPlayer, blockRegen, weaken } from "./player.js";
import { addText, addParts, aim, bombWarning, shockwave, beam } from "../render/fx.js";

let hazardId = 0;
const angleTo = (e, target) => Math.atan2(target.y - e.y, target.x - e.x);
const arena = () => S.finalArena || { x: 20, y: 20, w: W - 40, h: H - 40 };

function shot(e, x, y, angle, speed, options = {}) {
  if (S.ebullets.length >= MAX_ENEMY_BULLETS) return;
  S.ebullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    life: options.life ?? 7, r: options.r ?? 6, c: options.c || e.bossColor,
    aff: e.affixes, turn: options.turn, trail: options.trail, effect:options.effect,damage:e.contactMul||1 });
}

function fan(e, origin, angle, count, spread, speed, options) {
  for (let i = 0; i < count; i++) shot(e, origin.x, origin.y,
    angle + (i - (count - 1) / 2) * spread, speed, options);
}

export function addEnemyHazard(e, data) {
  e.hazards ||= [];
  if (e.hazards.length >= 48 || (S.hazardCount||0)>=320) return;
  S.hazardCount=(S.hazardCount||0)+1;
  const h = { id: ++hazardId, ownerId: e.id, c: e.bossColor,
    delay: 0.9, life: 0.45, pulse: 0, ...data };
  e.hazards.push(h);
  // O render de hazards já mantém o aviso inteiro; não duplicar eventos visuais.
}
const hazard = addEnemyHazard;

export function pointInBossHazard(h, x, y, pad = 11) {
  if (h.shape === "line") {
    const dx = h.x2 - h.x, dy = h.y2 - h.y;
    const t = clamp(((x - h.x) * dx + (y - h.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return dist(x, y, h.x + t * dx, h.y + t * dy) <= (h.width || 16) / 2 + pad;
  }
  const d = dist(x, y, h.x, h.y);
  return d <= h.r + pad && (h.shape !== "ring" || d >= h.inner - pad);
}

export function tickBossHazards(e, dt) {
  const hazards = e.hazards || [];
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    if (h.delay > 0) {
      h.delay -= dt;
      if (h.delay > 0) continue;
      if (h.shape === "line") beam(h.x, h.y, Math.atan2(h.y2 - h.y, h.x2 - h.x),
        dist(h.x, h.y, h.x2, h.y2), h.width || 16, h.life, h.c);
      else shockwave(h.x, h.y, h.r, h.c, 8);
    }
    h.life -= dt;
    if (h.life <= 0) { hazards.splice(i, 1); continue; }
    h.pulse -= dt;
    if (h.pulse > 0) continue;
    h.pulse = 0.15;
    for (const p of S.players) {
      if (p.dead) continue;
      const pos = headPx(p);
      if (!pointInBossHazard(h, pos.x, pos.y)) continue;
      const hp = p.hp;
      hitPlayer(p,h.damage||1);
      if (p.hp >= hp) continue;
      inflict(p,h.effect);
      if (e.affixes?.includes("noregen")) blockRegen(p, 14);
      if (e.affixes?.includes("weaken")) weaken(p, 8);
    }
  }
}

function circle(e, x, y, r, delay = 1, life = 0.45, extra = {}) {
  hazard(e, { shape: "circle", x, y, r, delay, life, ...extra });
}

function line(e, x, y, x2, y2, delay = 0.95, width = 24, life = 0.55) {
  hazard(e, { shape: "line", x, y, x2, y2, delay, width, life });
}

function summon(e, count, newMinion, extra = {}) {
  for (let k = 0; k < count && S.enemies.length < MAX_ENEMIES; k++) {
    const a = (k / count) * TAU;
    const minion = newMinion(e.x + Math.cos(a) * (e.r + 45), e.y + Math.sin(a) * (e.r + 45));
    minion.summonerId = e.id;
    Object.assign(minion, extra);
    S.enemies.push(minion);
  }
}

function targetPoint(e, head) {
  return head || { x: e.x, y: e.y + 200 };
}

/** Persisted gates make a huge ultimate transition phases instead of deleting
 * the entire moveset. Each phase is protected once for 1.4 seconds. */
export function protectBossPhase(e) {
  if(e.survival){e.hp=Math.max(e.hp,e.phaseFloor||Math.ceil(e.mhp*.66));e.ward=1;return;}
  if (!e.bossGates) return;
  if ((e.phaseLockT || 0) > 0) {
    e.hp = Math.max(e.hp, e.phaseFloor || 1);
    return;
  }
  const threshold = e.bossGates[0];
  if (threshold !== undefined && e.hp <= e.mhp * threshold) {
    e.bossGates.shift();
    e.phaseFloor = Math.max(1, Math.ceil(e.mhp * threshold));
    e.hp = Math.max(e.hp, e.phaseFloor);
    e.phaseLockT = 1.4;
    e.bossPhase = (e.bossPhase || 0) + 1;
    e.enraged = true;
    e.bossClock = 0.5;
    e.bossMove = 0;
    e.burst = null;
    e.hazards = [];
    if(e.type==="boss_final"){
      if(e.bossPhase===1)beginSurvival(e);
      startQte(e);
    }
    addText(e.x, e.y + e.r + 24, "FASE " + (e.bossPhase + 1), "#fff", 1.4, 20);
    shockwave(e.x, e.y, e.r + 110, e.bossColor || "#ffd75e", 12);
    S.shake = Math.min(18, S.shake + 8);
  }
}

function burst(e, kind, target, duration, period) {
  e.burst = { kind, target: { ...target }, left: duration, clock: 0, period, n: 0 };
}

function tickBurst(e, dt) {
  const b = e.burst;
  if (!b) return;
  b.left -= dt;
  if (b.left <= 0) { e.burst = null; e.openT = Math.max(e.openT || 0, 0.9); return; }
  b.clock -= dt;
  if (b.clock > 0) return;
  b.clock = b.period;
  const stage = Math.min(2,(e.bossPhase || 0)+(e.rank || 0));
  const n = b.n++;
  if(b.kind==='prism'){
    for(const side of [-1,1]){const origin={x:e.x+side*140,y:e.y+60};
      fan(e,origin,angleTo(origin,b.target)+side*Math.sin(n*.4)*.6,3+stage,.14,180+n%3*35,{c:side<0?'#6ee7ff':'#e39aff',life:5});}
  }else if(b.kind==='judgment'){
    for(let i=0;i<10;i++){if((i+n)%5===0)continue;shot(e,e.x,e.y,i*TAU/10+n*.31,160+(n%3)*35,{r:5,turn:n%2?.18:-.18,life:5});}
  }else if (b.kind === "petals") {
    // Eight petals rotate between pulses, with wide sectors to move through.
    for (let i = 0; i < 8; i++) {
      shot(e, e.x, e.y, i / 8 * TAU + n * 0.17, 145 + stage * 20);
      if (stage) shot(e, e.x, e.y, i / 8 * TAU - n * 0.11, 215, { r: 4 });
    }
  } else if (b.kind === "sentries") {
    const count = stage ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const a = e.orb + i / count * TAU;
      const at = { x: e.x + Math.cos(a) * 125, y: e.y + Math.sin(a) * 125 };
      fan(e, at, angleTo(at, b.target), stage ? 3 : 1, 0.22, 190, { life: 5 });
    }
  } else if (b.kind === "scythe") {
    fan(e, e, angleTo(e, b.target) + Math.sin(n * 0.9) * 0.8, stage ? 5 : 3, 0.12, 245);
  } else if (b.kind === "curtain") {
    const a = arena();
    const gap = a.x + a.w * (0.25 + ((n + stage) % 3) * 0.25);
    for (let x = a.x + 28; x < a.x + a.w; x += 43) {
      if (Math.abs(x - gap) < (stage === 2 ? 85 : 115)) continue;
      shot(e, x, a.y + 18, Math.PI / 2, 150 + stage * 25, { life: 6, r: 8 });
    }
  } else if (b.kind === "jaw") {
    const a = arena(), gap = a.y + a.h * (0.5 + Math.sin(n * 1.4) * 0.23);
    for (let y = a.y + 150; y < a.y + a.h; y += 45) {
      if (Math.abs(y - gap) < 80) continue;
      shot(e, a.x + 8, y, 0, 170, { life: 7 });
      shot(e, a.x + a.w - 8, y, Math.PI, 170, { life: 7 });
    }
  }
}

function announce(e, name) {
  e.bossAction = name;
  addText(e.x, e.y + e.r + 26, name, e.bossColor, 1.3, 14);
}

function cast(e, head, newMinion) {
  if(castCatalogBoss(e,head,newMinion,{hazard,shot,fan,summon}))return;
  const stage = Math.min(2,(e.bossPhase || 0)+(e.rank || 0));
  const move = (e.bossMove || 0) % 3;
  e.bossMove = (e.bossMove || 0) + 1;
  const target = targetPoint(e, head);
  e.bossClock = (stage ? 3.6 : 4.5) + (e.bossSlot || 0) * 0.15;
  const a = angleTo(e, target);
  switch (e.type) {
    case "boss":
      if (move === 0) {
        announce(e, "COROA DE ESPINHOS");
        burst(e, "petals", target, stage ? 2.2 : 1.6, 0.3);
      } else if (move === 1) {
        announce(e, "ANÉIS DE RUPTURA");
        for (let i = 0; i < (stage ? 4 : 3); i++) hazard(e, { shape: "ring", x: e.x, y: e.y,
          r: 120 + i * 100, inner: 80 + i * 100, delay: 0.8 + i * 0.45, life: 0.32 });
      } else {
        announce(e, "CRUZ DO PRIMOGÊNITO");
        for (let i = 0; i < (stage ? 4 : 2); i++) {
          const ang = a + i * Math.PI / 2;
          line(e, e.x, e.y, e.x + Math.cos(ang) * 800, e.y + Math.sin(ang) * 800, 1.1, 32);
        }
      }
      break;
    case "boss2":
      if (move === 0) {
        announce(e, "NECRÓPOLE");
        summon(e, stage ? 12 : 7, newMinion);
        for (let i = 0; i < 4; i++) circle(e, target.x + Math.cos(i * Math.PI / 2) * 145,
          target.y + Math.sin(i * Math.PI / 2) * 145, 72, 1.2, stage ? 3 : 1.8);
      } else if (move === 1) {
        announce(e, "PACTO DOS MORTOS");
        const servants = S.enemies.filter(o => o.summonerId === e.id && o.hp > 0).slice(0, stage ? 7 : 4);
        for (const m of servants) {
          line(e, e.x, e.y, m.x, m.y, 1.1, 26, 0.8);
          circle(e, m.x, m.y, 90, 1.5, 0.6);
        }
        if (!servants.length) circle(e, target.x, target.y, 150, 1.1);
      } else {
        announce(e, "CEIFA DE ALMAS");
        burst(e, "scythe", target, 2.2, 0.25);
      }
      break;
    case "boss3":
    case "boss_tyrant": {
      const tyrant = e.type === "boss_tyrant";
      if (move === 0) {
        announce(e, tyrant ? "MARCHA DE FERRO" : "EXECUÇÃO");
        const end = { x: clamp(target.x + Math.cos(a) * 160, 35, W - 35),
          y: clamp(target.y + Math.sin(a) * 160, 35, H - 35) };
        line(e, e.x, e.y, end.x, end.y, 0.95, tyrant ? 70 : 48, 0.5);
        e.charge = { x: e.x, y: e.y, x2: end.x, y2: end.y, delay: 0.95, t: 0, duration: 0.55 };
        if (stage || tyrant) for (let i = 1; i <= 4; i++) circle(e,
          e.x + (end.x - e.x) * i / 4, e.y + (end.y - e.y) * i / 4, 80, 1.6 + i * 0.12, 0.4);
      } else if (move === 1) {
        announce(e, tyrant ? "FORNALHA DE GUERRA" : "LÂMINAS DA CAÇADA");
        if (tyrant) {
          for (let i = -1; i <= 1; i++) {
            const x = target.x + i * 180;
            line(e, x, target.y - 480, x, target.y + 480, 1.2 + Math.abs(i)*.4, 48, .65);
          }
          if (stage) for (const side of [-1,1]) circle(e,target.x+side*90,target.y,65,2.4,1.1);
        } else {
          for (let i = 0; i < (stage ? 4 : 2); i++) {
            const ang = a + Math.PI/4 + i*Math.PI/2;
            line(e,target.x-Math.cos(ang)*280,target.y-Math.sin(ang)*280,
              target.x+Math.cos(ang)*280,target.y+Math.sin(ang)*280,1+i*.25,30,.35);
          }
          if (stage) hazard(e,{shape:'ring',x:target.x,y:target.y,r:270,inner:210,delay:1.7,life:.8});
        }
      } else {
        announce(e, tyrant ? "GRILHÕES DO TIRANO" : "GUILHOTINA");
        for (const offset of [-130, 130]) {
          line(e, target.x + offset, target.y - 400, target.x + offset, target.y + 400, 1.1, 42);
          if (stage) line(e, target.x - 400, target.y + offset, target.x + 400, target.y + offset, 1.75, 42);
        }
        circle(e, e.x, e.y, tyrant ? 250 : 185, 1.2, 0.35);
      }
      break;
    }
    case "boss4":
      if (move === 0) {
        announce(e, "PORTAIS DO VAZIO");
        const end = { x: clamp(target.x + Math.cos(a + Math.PI / 2) * 220, 50, W - 50),
          y: clamp(target.y + Math.sin(a + Math.PI / 2) * 220, 50, H - 50) };
        circle(e, e.x, e.y, 135, 1.1);
        circle(e, end.x, end.y, 125, 1.1);
        e.teleport = { ...end, t: 1.1 };
        if (stage) circle(e, target.x, target.y, 120, 1.65, 0.6);
      } else if (move === 1) {
        announce(e, "FENDAS PARALELAS");
        for (let i = -1; i <= 1; i++) line(e, target.x - 360, target.y + i * 160,
          target.x + 360, target.y + i * 160, 1 + (i + 1) * 0.25, 28, 0.6);
        if (stage) line(e, target.x, target.y - 360, target.x, target.y + 360, 1.9, 32);
      } else {
        announce(e, "HORIZONTE DE EVENTOS");
        hazard(e, { shape: "ring", x: target.x, y: target.y, r: 280, inner: 150, delay: 1.35, life: 1.2 });
      }
      break;
    case "boss5": {
      announce(e, ["REFRAÇÃO", "PRISÃO DE LUZ", "LEQUE ESPECTRAL"][move]);
      if (move === 0) {
        for (let i = -2; i <= 2; i++) {
          const ang = a + i * 0.34;
          line(e, e.x, e.y, e.x + Math.cos(ang) * 1050, e.y + Math.sin(ang) * 1050,
            1 + (i + 2) * 0.18, stage ? 35 : 24, 0.35);
        }
      } else if (move === 1) {
        for (const offset of [-170, 170]) {
          line(e, target.x + offset, target.y - 240, target.x + offset, target.y + 240, 1, 24, 1.4);
          line(e, target.x - 240, target.y + offset, target.x + 240, target.y + offset, 1, 24, 1.4);
        }
        if (stage) circle(e, target.x, target.y, 90, 1.65, 0.4);
      } else burst(e, "prism", target, 2.8, stage ? 0.22 : 0.32);
      break;
    }
    case "boss6":
      announce(e, ["ENXAME ORBITAL", "FAVOS EXPLOSIVOS", "RAINHA DA COLMEIA"][move]);
      if (move === 0) burst(e, "sentries", target, 2.5, stage ? 0.35 : 0.5);
      else if (move === 1) {
        for (let i = 0; i < 6; i++) circle(e, target.x + Math.cos(i / 6 * TAU) * 170,
          target.y + Math.sin(i / 6 * TAU) * 170, stage ? 85 : 68, 1 + i * 0.12, 0.7);
      } else {
        summon(e, stage ? 14 : 8, newMinion, { rageT: 5 });
        hazard(e, { shape: "ring", x: e.x, y: e.y, r: 330, inner: 220, delay: 1.3, life: 0.7 });
      }
      break;
    case "boss_elite":
      announce(e, ["JULGAMENTO", "SELOS DO FIM", "FOICE DO ARAUTO"][move]);
      if (move === 0) {
        for (let i = -2; i <= 2; i++) line(e, target.x + i * 140, target.y - 600,
          target.x + i * 140, target.y + 600, 1 + Math.abs(i) * 0.3, 32, 0.5);
        if (stage) line(e, target.x - 600, target.y, target.x + 600, target.y, 2.1, 36);
      } else if (move === 1) {
        for (let i = 0; i < (stage ? 7 : 4); i++) circle(e,
          target.x + Math.cos(i * 2.4) * (90 + i * 30), target.y + Math.sin(i * 2.4) * (90 + i * 30),
          110, 1 + i * 0.15, 1.7);
      } else burst(e, "judgment", target, 3.1, 0.28);
      break;
    case "boss_plague":
      announce(e, ["JARDIM DA PRAGA", "ANEL PESTILENTO", "GERMINAÇÃO"][move]);
      if (move === 0) {
        for (let i = 0; i < (stage ? 7 : 4); i++) circle(e,
          target.x + Math.cos(i * 2.4) * (60 + i * 48), target.y + Math.sin(i * 2.4) * (60 + i * 48),
          100, 1.25 + i * 0.12, stage ? 4.5 : 3);
      } else if (move === 1) {
        hazard(e, { shape: "ring", x: e.x, y: e.y, r: 380, inner: 200, delay: 1.3, life: 1.5 });
        if (stage) circle(e, target.x, target.y, 120, 2.2, 1.5);
      } else summon(e, stage ? 12 : 7, newMinion, { affixes: ["noregen"] });
      break;
    case "boss_final": {
      const ar = arena();
      const section=e.survival?survivalSection(e.survival):null;
      const pattern=section===null?move:section===0?0:(move+section-1)%3;
      e.bossClock = section===null?(stage===2?4.5:5.1):6.2-section*.4;
      announce(e, ["CHUVA DE MUNDOS", "MANDÍBULAS DO COSMOS", "EXTINÇÃO"][pattern]);
      if (pattern === 0) {
        burst(e, "curtain", target, stage === 2 ? 3.7 : 2.9, 0.82);
        if (stage) circle(e, target.x, target.y, 80, 1.25, 0.5);
      } else if (pattern === 1) {
        burst(e, "jaw", target, 3, 1.0);
        if (stage) {
          const gapX = ar.x + ar.w * 0.5;
          line(e, ar.x + 100, ar.y + 20, gapX - 100, ar.y + ar.h, 1.5, 34, 0.65);
          line(e, ar.x + ar.w - 100, ar.y + 20, gapX + 100, ar.y + ar.h, 1.5, 34, 0.65);
        }
      } else {
        // The cross fires in two beats; the intersection remains avoidable.
        line(e, ar.x, target.y, ar.x + ar.w, target.y, 1.4, 42, 0.45);
        line(e, target.x, ar.y, target.x, ar.y + ar.h, 2.0, 42, 0.45);
        for (let i = 0; i < 3 + stage; i++) circle(e,
          ar.x + ar.w * (0.15 + i * 0.17), ar.y + ar.h * (i % 2 ? 0.45 : 0.78),
          stage === 2 ? 105 : 80, 1.2 + i * 0.22, 0.8);
      }
      break;
    }
  }
}

export function updateBoss(e, def, dt, head, newMinion) {
  e.bossColor = def.c;
  e.orb = (e.orb || 0) + dt * (e.bossPhase ? 1.6 : 1);
  e.phaseLockT = Math.max(0, (e.phaseLockT || 0) - dt);
  if (e.phaseLockT > 0) return false;
  if (e.anchored) {
    const a = arena();
    e.x = a.x + a.w / 2;
    e.y = a.y + 105;
  }
  if (e.teleport) {
    e.teleport.t -= dt;
    if (e.teleport.t <= 0) {
      addParts(e.x, e.y, def.c, 16);
      e.x = e.teleport.x; e.y = e.teleport.y; e.teleport = null;
      e.openT = 0.8;
    }
  }
  if (e.charge) {
    const c = e.charge;
    c.delay -= dt;
    if (c.delay <= 0) {
      c.t += dt;
      const progress = Math.min(1, c.t / c.duration);
      e.x = c.x + (c.x2 - c.x) * progress;
      e.y = c.y + (c.y2 - c.y) * progress;
      if (progress >= 1) { e.charge = null; e.openT = 1.3; }
    }
  }
  tickCatalogPattern(e,dt,shot);
  if(def.final && e.bossPhase>0){
    const section=e.survival?survivalSection(e.survival):4;
    e.cosmosT=(e.cosmosT||0)-dt;
    if(section>0&&e.cosmosT<=0){e.cosmosT=.95-section*.12;const phase=e.orb*.65;
      for(let i=0;i<12;i++){
        // Dois setores abertos giram com a espiral; nunca forma uma parede fechada.
        if(i===2||i===3||i===8||i===9)continue;
        shot(e,e.x,e.y,phase+i*TAU/12,165+(e.bossPhase>1?35:0),{r:5,life:5,turn:i%2?.12:-.12});
      }
    }
  }
  tickBurst(e, dt);
  e.bossClock = (e.bossClock ?? (1.1 + (e.bossSlot || 0) * 0.9)) - dt;
  if (e.bossClock <= 0) cast(e, head, newMinion);
  if (e.bossClock > 0.4 && e.bossClock < 1.4 && !e.burst) e.openT = Math.max(e.openT || 0, 0.2);
  return !e.anchored && !e.charge && !e.teleport && !e.burst && !(e.openT > 0);
}

/** Nearby bosses share a modest shield; their attack clocks are staggered. */
export function bossSynergy(enemies) {
  const bosses = enemies.filter(e => e.bossGates && e.hp > 0);
  for (const e of bosses) {
    const partner = bosses.find(o => o !== e && dist(e.x, e.y, o.x, o.y) < 600);
    e.bossLinked = !!partner;
    if (partner && !(e.openT > 0)) e.ward = Math.max(e.ward, 0.15);
  }
}
