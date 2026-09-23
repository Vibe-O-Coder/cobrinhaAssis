/* ================= PARTÍCULAS, TEXTOS E EFEITOS =================

   O bug mais grave da versão anterior morava aqui. O envelhecimento dos efeitos
   (`ef.life -= dt`) estava dentro de render(v), que só recebe `v` — `dt` não
   existia naquele escopo. Com "use strict" isso vira ReferenceError, lançado a
   CADA frame a partir da primeira habilidade usada. Como o erro estourava antes
   do splice, nenhum efeito jamais expirava, então ele se repetia para sempre e
   updateHUD() nunca mais rodava: o HUD congelava pelo resto da run.

   Agora o ciclo de vida fica em updateFx(dt), que já recebe dt e já é chamado
   todo frame (inclusive para o convidado). render() só desenha. */

import { S } from "../core/state.js";
import { rnd, clamp } from "../core/utils.js";
import { W, H, TAU, CELL } from "../core/config.js";

const MAX_PARTS = 420;
const MAX_TEXTS = 60;
const MAX_EFFECTS = 160;
const partPool = [];

/* Fila de efeitos para mandar ao convidado.
   O convidado não simula nada, então sem isto ele não via NADA: nem a linha de
   mira do franco-atirador (que existe justamente para dar chance de desviar),
   nem explosões, nem números de dano. Mandar a lista inteira a cada pacote
   seria caro; então mandamos só os efeitos NOVOS, uma vez, e eles envelhecem
   sozinhos no lado de lá. */
const pendingFx = [];
const pendingTexts = [];
const MAX_NET_FX = 24;
const MAX_NET_TEXTS = 14;


export function addParts(x, y, c, n, sp) {
  n = Math.min(n, MAX_PARTS - S.parts.length);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU);
    const s = rnd(40, 150) * (sp || 1) * 0.5;
    S.parts.push(Object.assign(partPool.pop() || {}, {
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: rnd(0.3, 0.7),
      maxLife: 0.7,
      c,
      r: rnd(2, 4),
    }));
  }
}

export function addText(x, y, txt, c, life, s) {
  if(S.texts.length>=MAX_TEXTS)S.texts.shift();
  const t = { x, y, txt, c, life, maxLife: life, s: s || 14 };
  S.texts.push(t);
  if (S.role === "host" && pendingTexts.length < MAX_NET_TEXTS) pendingTexts.push(t);
}

/** Todo efeito guarda maxLife — antes nenhum criador setava esse campo e o
    render dividia por `(ef.maxLife || 1)`, então o alfa ficava constante e
    nada desaparecia suavemente. */
export function addEffect(ef) {
  ef.maxLife = ef.life;
  ef.born = S.gameT;
  S.effects.push(ef);
  if (S.effects.length > MAX_EFFECTS) S.effects.shift();
  if (S.role === "host" && pendingFx.length < MAX_NET_FX) {
    pendingFx.push({ ...ef, follow: undefined });
  }
}

/** Esvazia as filas de rede e devolve o conteúdo (chamado por snap()). */
export function drainNetFx() {
  if (!pendingFx.length && !pendingTexts.length) return null;
  const out = { f: pendingFx.slice(), t: pendingTexts.slice() };
  pendingFx.length = 0;
  pendingTexts.length = 0;
  return out;
}

/** O convidado aplica o que recebeu. */
export function applyNetFx(pack) {
  if (!pack) return;
  for (const ef of pack.f || []) {
    if (S.effects.length >= MAX_EFFECTS) break;
    S.effects.push({ ...ef });
  }
  for (const t of pack.t || []) {
    if (S.texts.length >= MAX_TEXTS) break;
    S.texts.push({ ...t });
  }
}

export function shockwave(x, y, maxR, c, w) {
  addEffect({ type: "shockwave", x, y, r: 0, maxR, life: 0.5, c, w: w || 8 });
}
export function ring(x, y, maxR, c, w) {
  addEffect({ type: "ring", x, y, r: 10, maxR, life: 0.4, c, w: w || 4 });
}
export function vortex(x, y, maxR, c) {
  addEffect({ type: "vortex", x, y, r: 0, maxR, life: 0.6, c, w: 3 });
}
export function drain(x, y, tx, ty, c) {
  addEffect({ type: "drain", x, y, tx, ty, life: 0.4, c });
}
export function aura(x, y, maxR, c) {
  addEffect({ type: "aura", x, y, r: 20, maxR, life: 0.5, c, w: 6 });
}
export function shadow(x, y, r, c) {
  addEffect({ type: "shadow", x, y, r, life: 0.6, c });
}
export function laser(x, y, tx, ty, c, life) {
  addEffect({ type: "laser", x, y, tx, ty, life: life || 0.15, c });
}
/** Linha de mira que aparece ANTES do tiro — o sniper precisa telegrafar. */
export function aim(x, y, tx, ty, c, life) {
  addEffect({ type: "aim", x, y, tx, ty, life, c });
}
export function bombWarning(x, y, r, life, c) {
  addEffect({ type: "bombWarning", x, y, r, life, c });
}
export function shieldFx(x, y, r, life, c, follow) {
  addEffect({ type: "shield", x, y, r, life, c, follow });
}
export function beam(x, y, ang, len, w, life, c) {
  addEffect({ type: "beam", x, y, ang, len, w, life, c });
}
export function quake(x, y, maxR, c) {
  addEffect({ type: "quake", x, y, r: 0, maxR, life: 0.7, c, w: 10 });
}

export function updateFx(dt) {
  S.shake = Math.max(0, S.shake - dt * 26);
  S.flash = Math.max(0, S.flash - dt * 2);

  let liveParts=0;
  for (let i = 0; i < S.parts.length; i++) {
    const p = S.parts[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt;
    p.life -= dt;
    if (p.life <= 0) {if(partPool.length<MAX_PARTS)partPool.push(p);}
    else S.parts[liveParts++]=p;
  }
  S.parts.length=liveParts;

  for (let i = S.texts.length - 1; i >= 0; i--) {
    const t = S.texts[i];
    t.y -= 34 * dt;
    t.life -= dt;
    if (t.life <= 0) S.texts.splice(i, 1);
  }

  // Aqui, com dt de verdade. Efeitos "follow" acompanham o dono.
  for (let i = S.effects.length - 1; i >= 0; i--) {
    const ef = S.effects[i];
    ef.life -= dt;
    if (ef.life <= 0) {
      S.effects.splice(i, 1);
      continue;
    }
    if (ef.follow && !ef.follow.dead && ef.follow.cells && ef.follow.cells[0]) {
      ef.x = (ef.follow.cells[0][0] + 0.5) * CELL;
      ef.y = (ef.follow.cells[0][1] + 0.5) * CELL;
    }
  }

  if (S.parts.length > MAX_PARTS) S.parts.splice(0, S.parts.length - MAX_PARTS);
  if (S.texts.length > MAX_TEXTS) S.texts.splice(0, S.texts.length - MAX_TEXTS);

  for (const em of embers) {
    em.x += em.vx * dt;
    em.y += em.vy * dt;
    if (em.y > H + 4) {
      em.y = -4;
      em.x = rnd(0, W);
    }
    if (em.x < -4) em.x = W + 4;
    if (em.x > W + 4) em.x = -4;
  }
}

/** Brasas de fundo. */
export const embers = [];
for (let i = 0; i < 40; i++) {
  embers.push({
    x: rnd(0, W),
    y: rnd(0, H),
    r: rnd(0.8, 2.4),
    vx: rnd(-5, 5),
    vy: rnd(3, 12),
    c: Math.random() < 0.5 ? "#7c4dff" : "#ffd75e",
    a: rnd(0.05, 0.16),
  });
}

export { clamp };
