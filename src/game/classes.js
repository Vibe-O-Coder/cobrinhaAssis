/* ================= CLASSES 7 a 16 =================
   Passivas (classTick, roda todo frame) e ativas (classAbility).

   As seis classes originais vivem em abilities.js porque são só um efeito
   instantâneo no momento do clique. Estas dez precisam de ESTADO que evolui
   entre frames — cabeças que brotam, torres que miram, tamanho que derrete,
   tempo que é gravado para poder ser rebobinado — e por isso ficam aqui.

   Índices (CLASSES em data/classes.js):
     6 Berserker · 7 Centauro · 8 Criomante · 9 Hidra · 10 Cascavel
     11 Apostador · 12 Glutão · 13 Engenheiro · 14 Tempestade · 15 Cronomante */

import { CELL, TAU, W, H } from "../core/config.js";
import { S } from "../core/state.js";
import { rnd, dist, clamp, pick } from "../core/utils.js";
import { EDEF, isBoss } from "../data/enemies.js";
import { sfx } from "../core/audio.js";
import {
  addParts, addText, shockwave, ring, aura, beam, quake, drain,
} from "../render/fx.js";
import { headPx, heal, nearestEnemy } from "./player.js";
import {
  cleanupEnemies, slowEnemy, stunEnemy,
} from "./enemies.js";
import { isPvp, pvpAimTarget } from "./pvp.js";
function classTarget(p,h,r) { return (isPvp() && pvpAimTarget({...p,range:r},h)) || nearestEnemy(h.x,h.y,r); }

import { bulletDmg } from "./stats.js";
import { tickUltimate } from './ultimates.js';
import { useGamble } from './gambler.js';

/* ---------------------------------------------------------------------------
   Ajudantes
   --------------------------------------------------------------------------- */

function hurt(e, dmg, p) {
  e.hp -= dmg * (1 - (e.ward || 0)) * (e.cursedT > 0 ? 2 : 1);
  e.flash = 0.2;
  e.lastHitBy = p;
}

/** Projétil do jogador, com os atributos dele já aplicados. */
function shot(p, x, y, ang, sp, mul, extra = {}) {
  const crit = Math.random() < p.crit;
  S.pbullets.push({
    x, y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    dmg: bulletDmg(p) * mul * (crit ? p.critDmg : 1),
    pierce: p.pierce,
    venom: p.venom,
    ls: p.ls,
    owner: p,
    color: extra.color || p.color,
    crit,
    life: extra.life ?? 1.4,
    hits: [],
    trail: extra.trail,
    ...extra,
  });
}

/** Posição em pixels de um segmento do corpo. */
function cellPx(p, i) {
  const c = p.cells[Math.min(i, p.cells.length - 1)];
  return { x: (c[0] + 0.5) * CELL, y: (c[1] + 0.5) * CELL };
}

/* ---------------------------------------------------------------------------
   INICIALIZAÇÃO — campos que cada classe precisa no jogador
   --------------------------------------------------------------------------- */

export function initClass(p) {
  p.ultimate = null;
  p.ultimateBursts = [];
  p.ultimateTurrets = [];
  switch (p.cls) {
    case 6: // Berserker
      p.berserkT = 0;
      p.berserkKills = 0;
      break;
    case 7: // Centauro
      p.centT = 0;
      p.centStock = 0;
      break;
    case 9: // Hidra
      p.heads = []; // índices de segmentos que viraram cabeça
      p.headT = 0;
      break;
    case 12: // Glutão
      p.digestT = 0;
      break;
    case 13: // Engenheiro
      p.turrets = [];
      p.turretT = 6;
      break;
    case 15: // Cronomante
      p.timeline = []; // instantâneos para o Retroceder
      p.snapT = 0;
      break;
  }
}

/* ---------------------------------------------------------------------------
   PASSIVAS — chamadas todo frame por updatePlayer
   --------------------------------------------------------------------------- */

export function classTick(p, dt) {
  tickUltimate(p, dt);
  switch (p.cls) {
    case 6: return tickBerserker(p, dt);
    case 7: return tickCentauro(p, dt);
    case 9: return tickHidra(p, dt);
    case 10: return tickCascavel(p, dt);
    case 12: return tickGlutao(p, dt);
    case 13: return tickEngenheiro(p, dt);
    case 15: return tickCronomante(p, dt);
  }
}

/* 🪓 BERSERKER — durante a Fúria Cega ele é imortal e NÃO OBEDECE.
   A cobra segue sozinha, virando de vez em quando. Foi o pedido: "perde o
   controle da cobrinha". O preço vem no fim: metade do dano acumulado. */
function tickBerserker(p, dt) {
  if (p.berserkT <= 0) return;
  p.berserkT -= dt;
  p.iframes = Math.max(p.iframes, 0.2); // imortal enquanto dura

  p.berserkTurn = (p.berserkTurn ?? 0) - dt;
  if (p.berserkTurn <= 0) {
    p.berserkTurn = rnd(0.35, 0.9);
    const eixos = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const alvo = nearestEnemy(headPx(p).x, headPx(p).y, 9999);
    if (alvo && Math.random() < 0.65) {
      // ele "vê vermelho": vira na direção geral do inimigo mais próximo
      const Hh = headPx(p);
      const dx = alvo.x - Hh.x;
      const dy = alvo.y - Hh.y;
      p.qdir = Math.abs(dx) > Math.abs(dy)
        ? { x: Math.sign(dx), y: 0 }
        : { x: 0, y: Math.sign(dy) };
    } else {
      p.qdir = pick(eixos);
    }
  }

  const Hh = headPx(p);
  if (Math.random() < dt * 12) addParts(Hh.x, Hh.y, "#c0392b", 2);

  if (p.berserkT <= 0) endBerserk(p);
}

function endBerserk(p) {
  const Hh = headPx(p);
  // A explosão final atinge parte da horda com dano finito e cobra vida.
  const vivos = S.enemies.filter((e) => e.hp > 0 && !isBoss(e.type));
  vivos.sort((a, b) => dist(Hh.x, Hh.y, a.x, a.y) - dist(Hh.x, Hh.y, b.x, b.y));
  const n = Math.min(10, Math.ceil(vivos.length / 3));
  for (let i = 0; i < n; i++) {
    hurt(vivos[i], bulletDmg(p) * 5, p);
    vivos[i].lastHitBy = p;
    addParts(vivos[i].x, vivos[i].y, "#c0392b", 8);
  }
  for (const e of S.enemies) {
    if (isBoss(e.type) && e.hp > 0) hurt(e, bulletDmg(p) * 4, p);
  }
  shockwave(Hh.x, Hh.y, 320, "#c0392b", 14);
  S.shake = 18;
  S.flash = 0.35;
  sfx("ab");

  // o preço: metade da vida atual
  const custo = Math.max(1, Math.floor(p.hp / 2));
  p.hp = Math.max(0.5, p.hp - custo);
  addText(Hh.x, Hh.y - 34, "A FÚRIA COBRA O PREÇO", "#ff5252", 1.4, 15);
  cleanupEnemies();
}

/* 🏹 CENTAURO — o corpo é munição.
   A cada 1,4s perde 1 de tamanho e dispara um tiro pesado. Quando fica no
   mínimo, para de atirar: você precisa comer para voltar a ter munição. */
function tickCentauro(p, dt) {
  p.centT -= dt;
  if (p.centT > 0) return;
  p.centT = 1.4;

  if (p.cells.length <= 4) {
    // sem corpo, sem tiro — a classe te obriga a voltar a comer
    return;
  }
  p.cells.pop();

  const Hh = headPx(p);
  const alvo = classTarget(p,Hh,p.range * 1.8);
  const ang = alvo
    ? Math.atan2(alvo.y - Hh.y, alvo.x - Hh.x)
    : Math.atan2(p.dir.y, p.dir.x);
  // 🎯 Flecha Pesada
  shot(p, Hh.x, Hh.y, ang, 580, 2.1 * (1 + (p.xArrow || 0)), {
    color: "#d4a017", trail: true, life: 1.8, pierce: p.pierce + 1,
  });
  addParts(Hh.x, Hh.y, "#d4a017", 8);
  sfx("shoot");
}

/* 🐉 HIDRA — cabeças extras no corpo, que atiram sozinhas.
   O dano base é o mais fraco do jogo; a força vem de ter 6 bocas atirando ao
   mesmo tempo. Comer deixou de ser só crescer: é recrutar. */
function tickHidra(p, dt) {
  // brota uma cabeça a cada 6 comidas
  // 🐍 Ninhada: cabeça nova a cada menos comidas
  const passoComida = Math.max(2, 6 - (p.xHead || 0));
  const querer = Math.min(5, Math.floor(p.apples / passoComida));
  while (p.heads.length < querer) {
    const passo = Math.max(2, Math.floor(p.cells.length / (p.heads.length + 2)));
    p.heads.push(passo * (p.heads.length + 1));
    const q = cellPx(p, p.heads[p.heads.length - 1]);
    addParts(q.x, q.y, "#2ecc71", 16, 2);
    addText(q.x, q.y - 16, "nova cabeça!", "#2ecc71", 1, 13);
  }

  p.headT -= dt;
  if (p.headT > 0) return;
  p.headT = p.cd * 1.15;

  for (const idx of p.heads) {
    if (idx >= p.cells.length) continue;
    const q = cellPx(p, idx);
    const alvo = classTarget(p,q,p.range * 0.85);
    if (!alvo) continue;
    shot(p, q.x, q.y, Math.atan2(alvo.y - q.y, alvo.x - q.x), 420, 0.55, {
      color: "#2ecc71", life: 1.1,
    });
  }
}

/* 🐍 CASCAVEL — a cauda empurra quem chega por trás. */
function tickCascavel(p, dt) {
  const t = cellPx(p, p.cells.length - 1);
  for (const e of S.enemies) {
    if (e.hp <= 0 || isBoss(e.type)) continue;
    const d = dist(t.x, t.y, e.x, e.y);
    if (d < 80 && d > 0) {
      const f = ((80 - d) / 80) * 190 * dt;
      e.x = clamp(e.x + ((e.x - t.x) / d) * f, -20, W + 20);
      e.y = clamp(e.y + ((e.y - t.y) / d) * f, -20, H + 20);
    }
  }
  if (Math.random() < dt * 3) addParts(t.x, t.y, "#e67e22", 1);
}

/* 🍖 GLUTÃO — força vem do tamanho, e o tamanho derrete.
   Isso inverte o loop: em vez de matar para sobreviver, você come para
   continuar forte, e parar de comer é perder a build no meio da onda. */
export function glutaoMul(p) {
  if (p.cls !== 12) return 1;
  return 1 + clamp((p.cells.length - 4) / 32, 0, 0.8);
}

function tickGlutao(p, dt) {
  p.digestT -= dt;
  if (p.digestT <= 0) {
    p.digestT = 2.2 * (1 + (p.xDigest || 0)); // 🍗 Estômago de Ferro
    if (p.cells.length > 4) {
      p.cells.pop();
      const t = cellPx(p, p.cells.length - 1);
      addParts(t.x, t.y, "#e84393", 4);
    }
  }
}

/* 🔧 ENGENHEIRO — torres que atiram sozinhas.
   É a única classe que produz dano longe do corpo da cobra, então ela joga de
   forma diferente: você planta e depois puxa a horda para longe das torres. */
function tickEngenheiro(p, dt) {
  p.turretT -= dt;
  if (p.turretT <= 0) {
    p.turretT = 12;
    plantTurret(p, 14, 0.8);
  }
  for (let i = p.turrets.length - 1; i >= 0; i--) {
    const t = p.turrets[i];
    t.life -= dt;
    if (t.life <= 0) {
      addParts(t.x, t.y, "#95a5a6", 10);
      p.turrets.splice(i, 1);
      continue;
    }
    t.cd -= dt;
    if (t.cd > 0) continue;
    const alvo = classTarget(p,t,330);
    if (!alvo) continue;
    t.cd = t.rate;
    shot(p, t.x, t.y, Math.atan2(alvo.y - t.y, alvo.x - t.x), 500, t.mul, {
      color: "#95a5a6", life: 1.2,
    });
    addParts(t.x, t.y, "#95a5a6", 2);
  }
}

function plantTurret(p, life, mul) {
  const Hh = headPx(p);
  // ⚙️ Oficina: mais torres simultâneas
  if (p.turrets.length >= 6 + (p.xTurret || 0)) p.turrets.shift();
  p.turrets.push({
    x: Hh.x, y: Hh.y, life: life + (p.xTurret || 0) * 6, cd: 0,
    rate: p.cd * 0.8, mul, owner: p,
  });
  ring(Hh.x, Hh.y, 40, "#95a5a6", 3);
  addParts(Hh.x, Hh.y, "#95a5a6", 12);
}

/* ⛈️ TEMPESTADE — raio em cadeia. Chamado por bullets.js quando um tiro acerta. */
export function chainLightning(p, e0, dmg) {
  let atual = e0;
  const vistos = new Set([e0.id]);
  const saltos = 3 + (p.xChain || 0); // 🌩️ Condutor
  for (let i = 0; i < saltos; i++) {
    let alvo = null;
    let melhor = 190;
    for (const e of S.enemies) {
      if (e.hp <= 0 || vistos.has(e.id)) continue;
      const d = dist(atual.x, atual.y, e.x, e.y);
      if (d < melhor) {
        melhor = d;
        alvo = e;
      }
    }
    if (!alvo) break;
    vistos.add(alvo.id);
    beam(
      atual.x, atual.y,
      Math.atan2(alvo.y - atual.y, alvo.x - atual.x),
      dist(atual.x, atual.y, alvo.x, alvo.y),
      3, 0.12, "#74b9ff",
    );
    hurt(alvo, dmg * Math.max(0.15, 0.6 - i * 0.12), p);
    addParts(alvo.x, alvo.y, "#74b9ff", 5);
    atual = alvo;
  }
  cleanupEnemies();
}

/* ⏳ CRONOMANTE — campo de lentidão e gravação do tempo. */
function tickCronomante(p, dt) {
  const Hh = headPx(p);
  for (const e of S.enemies) {
    if (e.hp <= 0) continue;
    if (dist(Hh.x, Hh.y, e.x, e.y) < 210) slowEnemy(e, 0.2, 0.35);
  }

  /* Grava um instantâneo a cada 0,25s e guarda 3 segundos. O Retroceder devolve
     o mais antigo: é uma segunda chance de verdade, não um empurrão. */
  p.snapT -= dt;
  if (p.snapT <= 0) {
    p.snapT = 0.25;
    p.timeline.push({
      cells: p.cells.map((c) => [c[0], c[1]]),
      dir: { x: p.dir.x, y: p.dir.y },
      hp: p.hp,
    });
    // 🕰️ Memória Longa: guarda mais instantâneos = volta mais no tempo
    if (p.timeline.length > 12 + (p.xRewind || 0)) p.timeline.shift();
  }
}

/* ---------------------------------------------------------------------------
   ATIVAS
   --------------------------------------------------------------------------- */

export function classAbility(p) {
  const Hh = headPx(p);
  switch (p.cls) {
    /* 🪓 Fúria Cega */
    case 6: {
      p.berserkT = 5 + (p.xRage || 0); // 🩸 Sede de Sangue
      p.berserkTurn = 0;
      // A recarga é calculada no ataque, sem alterar o atributo permanente.
      aura(Hh.x, Hh.y, 160, "#c0392b");
      shockwave(Hh.x, Hh.y, 180, "#c0392b", 10);
      addText(Hh.x, Hh.y - 34, "FÚRIA CEGA — SEM CONTROLE!", "#ff5252", 1.6, 16);
      S.flash = 0.25;
      break;
    }

    /* 🏹 Recomposição */
    case 7: {
      // Recupera no máximo quatro segmentos, incluindo crescimento pendente.
      // A explosão tem dano finito: não executa elites nem reabastece 20 flechas.
      p.grow += Math.max(0, Math.min(4, 12 - p.cells.length - p.grow));
      shockwave(Hh.x, Hh.y, 300, "#d4a017", 14);
      ring(Hh.x, Hh.y, 300, "#ffe9a8", 6);
      for (const e of S.enemies) {
        if (e.hp <= 0 || dist(Hh.x, Hh.y, e.x, e.y) > 300) continue;
        hurt(e, bulletDmg(p) * (isBoss(e.type) ? 5 : 7), p);
      }
      S.shake = 12;
      cleanupEnemies();
      break;
    }

    /* ❄️ Zero Absoluto */
    case 8: {
      const R = 300;
      ring(Hh.x, Hh.y, R, "#6ee7ff", 6);
      shockwave(Hh.x, Hh.y, R, "#a8f0ff", 10);
      addParts(Hh.x, Hh.y, "#6ee7ff", 34, 3);
      for (const e of S.enemies) {
        if (e.hp <= 0 || dist(Hh.x, Hh.y, e.x, e.y) > R) continue;
        stunEnemy(e, 3);
        slowEnemy(e, 6, 0.6);
        hurt(e, bulletDmg(p) * 4, p);
        addParts(e.x, e.y, "#a8f0ff", 6);
      }
      S.flash = 0.2;
      cleanupEnemies();
      break;
    }

    /* 🐉 Brotar */
    case 9: {
      p.grow += 6;
      if (p.heads.length < 5) {
        p.heads.push(Math.max(2, Math.floor(p.cells.length / 2)));
      }
      // rajada de todas as cabeças, em leque
      for (const idx of [0, ...p.heads]) {
        const q = cellPx(p, idx);
        for (let i = 0; i < 5; i++) {
          shot(p, q.x, q.y, (i / 5) * TAU + rnd(0, 0.4), 430, 1.4, {
            color: "#2ecc71", life: 1.2,
          });
        }
      }
      addParts(Hh.x, Hh.y, "#2ecc71", 30, 3);
      break;
    }

    /* 🐍 Chocalho — atordoa em área grande a partir da CAUDA */
    case 10: {
      const t = cellPx(p, p.cells.length - 1);
      const R = 340;
      ring(t.x, t.y, R, "#e67e22", 7);
      ring(t.x, t.y, R * 0.6, "#ffd75e", 4);
      quake(t.x, t.y, R, "#e67e22");
      let n = 0;
      for (const e of S.enemies) {
        if (e.hp <= 0 || dist(t.x, t.y, e.x, e.y) > R) continue;
        stunEnemy(e, 3 + (p.xStun || 0)); // 📢 Eco do Chocalho
        hurt(e, bulletDmg(p) * 3.5, p);
        n++;
      }
      addText(t.x, t.y - 30, "CHOCALHO — " + n + " parados", "#e67e22", 1.2, 15);
      S.shake = 14;
      cleanupEnemies();
      break;
    }

    /* 🎲 Dado do Destino — dez possibilidades uniformes, risco real. */
    case 11: {
      useGamble(p);
      break;
    }

    /* 🍖 Banquete */
    case 12: {
      p.grow += 10;
      p.digestT = 6; // pausa a digestão
      heal(p, 2);
      const R = 260;
      ring(Hh.x, Hh.y, R, "#e84393", 6);
      for (const e of S.enemies) {
        if (e.hp <= 0 || dist(Hh.x, Hh.y, e.x, e.y) > R) continue;
        hurt(e, bulletDmg(p) * 4 * glutaoMul(p), p);
        drain(e.x, e.y, Hh.x, Hh.y, "#e84393");
      }
      addText(Hh.x, Hh.y - 30, "BANQUETE", "#e84393", 1.3, 16);
      cleanupEnemies();
      break;
    }

    /* 🔧 Torre Pesada */
    case 13: {
      plantTurret(p, 18, 2.6);
      shockwave(Hh.x, Hh.y, 140, "#95a5a6", 8);
      addText(Hh.x, Hh.y - 30, "TORRE PESADA", "#95a5a6", 1.2, 15);
      break;
    }

    /* ⛈️ Trovoada */
    case 14: {
      const alvos = S.enemies.filter((e) => e.hp > 0).slice(0, 14);
      for (const e of alvos) {
        beam(e.x, e.y - 400, Math.PI / 2, 400, 6, 0.2, "#74b9ff");
        hurt(e, bulletDmg(p) * 3.8, p);
        addParts(e.x, e.y, "#74b9ff", 10, 2);
        chainLightning(p, e, bulletDmg(p) * 1.2);
      }
      S.flash = 0.25;
      S.shake = 12;
      addText(Hh.x, Hh.y - 30, "TROVOADA", "#74b9ff", 1.3, 16);
      cleanupEnemies();
      break;
    }

    /* ⏳ Retroceder */
    case 15: {
      const snap = p.timeline[0];
      if (!snap) break;
      p.cells = snap.cells.map((c) => [c[0], c[1]]);
      p.dir = { x: snap.dir.x, y: snap.dir.y };
      p.qdir = null;
      if (snap.hp > p.hp) p.hp = Math.min(p.maxHp, snap.hp);
      p.timeline.length = 0;
      p.iframes = Math.max(p.iframes, 1.5);
      const N = headPx(p);
      ring(N.x, N.y, 240, "#dfe6e9", 6);
      addParts(N.x, N.y, "#dfe6e9", 30, 3);
      addText(N.x, N.y - 30, "RETROCEDER", "#dfe6e9", 1.4, 16);
      // o tempo volta para os inimigos também: eles congelam por um instante
      for (const e of S.enemies) {
        if (e.hp <= 0 || dist(N.x, N.y, e.x, e.y) > 260) continue;
        stunEnemy(e, 1.2);
        slowEnemy(e, 4, 0.5);
        hurt(e, bulletDmg(p) * 3, p);
      }
      S.flash = 0.3;
      cleanupEnemies();
      break;
    }
  }
}
