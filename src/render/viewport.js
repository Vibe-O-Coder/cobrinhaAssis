/* ================= JANELA DE VISÃO (FASE 3) =================

   Até a fase 2 o canvas tinha um tamanho FIXO de 1120x700 e todo o render
   importava `VIEW_W`/`VIEW_H` direto do config. Duas coisas da fase 3 não
   cabem nisso:

   1. CELULAR DEITADO. Um aparelho de 812x375 tem proporção 2,17; o canvas
      1120x700 tem 1,6. Mantendo a proporção fixa sobravam duas tarjas pretas
      enormes nas laterais e o jogo ficava do tamanho de um selo. Agora a
      janela de visão ADOTA a proporção da tela: num celular deitado você
      enxerga mais arena na horizontal, em vez de enxergar menos de tudo.

   2. PVP EM TELA DIVIDIDA. Os dois jogadores estão em pontas opostas de um
      mapa de 2800x2800 — uma câmera só não enquadra os dois. Então o canvas
      passa a ser desenhado em PAINÉIS: cada painel tem a própria origem,
      o próprio tamanho e a própria câmera.

   `VP` é o painel que está sendo desenhado AGORA. Quem desenha lê dele em vez
   de ler as constantes; é a única mudança que o resto do render sofreu. */

import { VIEW_W, VIEW_H } from "../core/config.js";
import { S } from "../core/state.js";

/** Tamanho LÓGICO do canvas inteiro (muda com a tela). */
export const CANVAS = { w: VIEW_W, h: VIEW_H };

/** Painel atual: origem, tamanho e câmera. */
export const VP = { x: 0, y: 0, w: VIEW_W, h: VIEW_H, cam: S.cam, who: -1 };

/* Largura da faixa que separa as duas metades no PVP local. */
export const SPLIT_GAP = 4;

/** Estamos em tela dividida agora? */
export function isSplit() {
  return S.role === "solo" && (S.mode === "local" || S.pvpLocal) && S.players.length > 1;
}

/** Os painéis a desenhar neste frame, na ordem. */
export function panes() {
  if (isSplit()) {
    const half = Math.floor((CANVAS.w - SPLIT_GAP) / 2);
    return [
      { x: 0, y: 0, w: half, h: CANVAS.h, cam: S.cams[0], who: 0 },
      { x: half + SPLIT_GAP, y: 0, w: CANVAS.w - half - SPLIT_GAP, h: CANVAS.h, cam: S.cams[1], who: 1 },
    ];
  }
  return [{ x: 0, y: 0, w: CANVAS.w, h: CANVAS.h, cam: S.cam, who: S.role === "guest" ? 1 : 0 }];
}

/** Torna `p` o painel atual. */
export function setPane(p) {
  VP.x = p.x;
  VP.y = p.y;
  VP.w = p.w;
  VP.h = p.h;
  VP.cam = p.cam || S.cam;
  VP.who = p.who === undefined ? -1 : p.who;
}

/** Volta o painel a ser o canvas inteiro (usado pelo HUD desenhado no canvas). */
export function resetPane() {
  setPane({ x: 0, y: 0, w: CANVAS.w, h: CANVAS.h, cam: S.cam, who: -1 });
}
