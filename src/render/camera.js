/* ================= CÂMERA =================

   A arena tem 2800x2100px. A versão anterior desenhava TUDO num canvas desse
   tamanho e deixava o CSS espremer o resultado em 960px de largura — escala de
   0,34. Na prática: a cobra ficava com 9px, os inimigos viravam pontinhos, e
   ainda assim o navegador pintava 2800x2100 (x DPR) todo frame.

   Agora o canvas tem o tamanho da JANELA de visão e a câmera segue o jogador. O
   mapa continua grande; o que muda é que você enxerga um pedaço dele em escala
   1:1.

   FASE 3: existe MAIS DE UMA câmera. No PVP local os dois jogadores estão em
   pontas opostas do mapa e cada metade da tela tem a sua. A função que
   enquadra é a mesma; o que muda é o tamanho do painel e quem ela segue. */

import { S } from "../core/state.js";
import { W, H, CAM_LERP, CELL } from "../core/config.js";
import { clamp } from "../core/utils.js";
import { VP, panes } from "./viewport.js";

/** Ponto que a câmera quer enquadrar.
    `who >= 0` segue só aquele jogador (PVP); `who < 0` segue o meio do grupo. */
function focusPoint(who) {
  const base = who >= 0 ? S.players.filter((p) => p.idx === who) : S.players;
  const live = base.filter((p) => !p.dead && p.cells && p.cells[0]);
  const src = live.length ? live : base.filter((p) => p.cells && p.cells[0]);
  if (!src.length) return { x: W / 2, y: H / 2 };
  let sx = 0, sy = 0;
  for (const p of src) {
    sx += (p.cells[0][0] + 0.5) * CELL;
    sy += (p.cells[0][1] + 0.5) * CELL;
  }
  return { x: sx / src.length, y: sy / src.length };
}

/** Para o convidado, o foco vem do estado recebido. */
function focusFromSnapshot(rs, who) {
  const all = rs.players || [];
  const base = who >= 0 ? all.filter((p) => p.idx === who) : all;
  const src = base.filter((p) => p.cells && p.cells[0]);
  const live = src.filter((p) => !p.dead);
  const use = live.length ? live : src;
  if (!use.length) return { x: W / 2, y: H / 2 };
  let sx = 0, sy = 0;
  for (const p of use) {
    sx += (p.cells[0][0] + 0.5) * CELL;
    sy += (p.cells[0][1] + 0.5) * CELL;
  }
  return { x: sx / use.length, y: sy / use.length };
}

/** Canto superior esquerdo que enquadra `f` num painel de `w` x `h`.
    Se o painel for MAIOR que o mapa (arena de morte súbita do PVP, que tem
    ~600x450), `Math.max(0, W - w)` vira 0 e a câmera trava no canto — é o
    comportamento certo: não há para onde rolar. */
function target(f, w, h) {
  return {
    x: clamp(f.x - w / 2, 0, Math.max(0, W - w)),
    y: clamp(f.y - h / 2, 0, Math.max(0, H - h)),
  };
}

function focusOf(who) {
  return S.role === "guest" && S.rs
    ? focusFromSnapshot(S.rs, who)
    : focusPoint(who);
}

export function updateCamera(dt) {
  const k = 1 - Math.exp(-CAM_LERP * dt); // suavização independente de FPS
  for (const p of panes()) {
    const t = target(focusOf(p.who), p.w, p.h);
    p.cam.x += (t.x - p.cam.x) * k;
    p.cam.y += (t.y - p.cam.y) * k;
  }
}

export function centerCameraOnPlayers(instant) {
  for (const p of panes()) {
    const t = target(focusPoint(p.who), p.w, p.h);
    if (instant) {
      p.cam.x = t.x;
      p.cam.y = t.y;
    }
  }
}

/** Retângulo de mundo visível no painel atual — usado para pular o que está
    fora. Lê VP, então funciona igual numa tela inteira e numa metade. */
export function viewRect(margin = 80) {
  const c = VP.cam || S.cam;
  return {
    x0: c.x - margin,
    y0: c.y - margin,
    x1: c.x + VP.w + margin,
    y1: c.y + VP.h + margin,
  };
}

export function inView(x, y, r = 0, vr) {
  const v = vr || viewRect();
  return x + r >= v.x0 && x - r <= v.x1 && y + r >= v.y0 && y - r <= v.y1;
}
