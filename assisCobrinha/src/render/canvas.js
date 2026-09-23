/* ================= CANVAS E FUNDO ================= */
import { $ } from "../core/utils.js";
import { W, H, COLS, ROWS, CELL, VIEW_W, VIEW_H } from "../core/config.js";
import { actDef } from "../data/acts.js";
import { CANVAS, VP } from "./viewport.js";

export const cv = $("#cv");
export const ctx = cv.getContext("2d");

/* O canvas agora tem o tamanho da JANELA de visão, não do mapa inteiro.
   2800x2100 com DPR 2 eram ~23,5 milhões de pixels por frame; agora são
   ~1120x700 (x DPR), cerca de 6x menos trabalho por frame. */
export const DPR = Math.min(2, window.devicePixelRatio || 1);

/* FASE 3 — o tamanho lógico deixou de ser constante.

   Num celular deitado (812x375, proporção 2,17) manter 1120x700 (1,6) deixava
   duas tarjas pretas comendo um terço da tela. Agora o canvas adota a
   proporção da caixa que o CSS lhe deu e a ALTURA lógica fica fixa: você
   enxerga mais arena na horizontal, e não tudo menor.

   Os limites existem porque a proporção da tela é arbitrária: um monitor
   ultrawide pediria uma janela de visão de 3000px de largura, o que daria ao
   dono desse monitor uma vantagem enorme (ver o dobro de inimigos chegando) e
   ainda custaria o dobro de pixels por frame. */
const MIN_W = 380;
const MAX_W = 1600;

function applySize(w, h) {
  CANVAS.w = Math.round(w);
  CANVAS.h = Math.round(h);
  VP.w = CANVAS.w;
  VP.h = CANVAS.h;
  cv.width = CANVAS.w * DPR;
  cv.height = CANVAS.h * DPR;
  /* Mexer em cv.width RESETA a matriz do contexto — inclusive o scale do DPR.
     Sem re-aplicar, tudo passa a ser desenhado pela metade num aparelho com
     DPR 2. */
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

/** Ajusta a janela de visão à caixa que o CSS deu ao canvas. */
export function fitCanvas() {
  const r = cv.getBoundingClientRect();
  /* Caixa colapsada: a tela do jogo está escondida, a aba está em segundo
     plano ou a janela foi minimizada. Medir isso devolve uma proporção
     inventada (1:1, ou pior) e o canvas ficaria quadrado quando a tela
     voltasse. Melhor manter o tamanho anterior e tentar de novo no próximo
     resize. */
  if (r.width < 40 || r.height < 40) return;
  const aspect = r.width / r.height;

  /* A proporção do tamanho LÓGICO tem que bater com a da caixa CSS. Se só a
     largura fosse grampeada em MAX_W, um canvas de 1600x700 seria espremido
     pelo CSS numa caixa de proporção 2,67 e todo círculo do jogo viraria uma
     elipse. Quando o teto bate, é a ALTURA que cede. */
  let w = VIEW_H * aspect;
  let h = VIEW_H;
  if (w > MAX_W) { w = MAX_W; h = MAX_W / aspect; }
  else if (w < MIN_W) { w = MIN_W; h = MIN_W / aspect; }

  if (Math.abs(w - CANVAS.w) < 2 && Math.abs(h - CANVAS.h) < 2) return;
  applySize(w, h);
  buildTile(tileBg, tileGrid); // o padrão de fundo é preso ao contexto
}

applySize(VIEW_W, VIEW_H);

/* ---------------------------------------------------------------------------
   PALETA POR ATO

   O tile do fundo era construído UMA vez, com as cores fixas do roxo. Como
   agora a run atravessa 10 eras — do verde monocromático de 1997 até o vazio —
   ele precisa ser reconstruído quando o ato vira.

   É de propósito que só o FUNDO mude de cor: os inimigos e a cobra mantêm as
   cores deles, senão a leitura do jogo mudaria junto com a estética e o ato IX
   (quase preto) ficaria injogável.
   --------------------------------------------------------------------------- */

const TILE = CELL * 8;
const tile = document.createElement("canvas");
tile.width = TILE;
tile.height = TILE;

let bgPattern = null;
let fog = "rgba(0,0,0,0.55)";
let actAtual = -1;
let tileBg = "#120a24";
let tileGrid = "#1d1140";

function buildTile(bg, grid) {
  tileBg = bg;
  tileGrid = grid;
  const b = tile.getContext("2d");
  b.clearRect(0, 0, TILE, TILE);
  b.fillStyle = bg;
  b.fillRect(0, 0, TILE, TILE);
  b.strokeStyle = grid;
  b.lineWidth = 1;
  for (let x = 0; x <= TILE; x += CELL) {
    b.beginPath();
    b.moveTo(x + 0.5, 0);
    b.lineTo(x + 0.5, TILE);
    b.stroke();
  }
  for (let y = 0; y <= TILE; y += CELL) {
    b.beginPath();
    b.moveTo(0, y + 0.5);
    b.lineTo(TILE, y + 0.5);
    b.stroke();
  }
  bgPattern = ctx.createPattern(tile, "repeat");
}

/** Troca a paleta do mundo para a do ato. Ignora se já é a atual. */
export function setActPalette(actIndex) {
  const i = Math.max(0, actIndex | 0);
  if (i === actAtual) return;
  actAtual = i;
  const a = actDef(i);
  fog = a.fog;
  buildTile(a.bg, a.grid);
}

setActPalette(0);

/** Desenha o fundo visível, já no espaço de mundo (chamar com a câmera aplicada).
    Lê o tamanho do PAINEL atual (VP), não do canvas: na tela dividida do PVP
    cada metade pinta só a si mesma. */
export function drawBackground(camX, camY) {
  ctx.save();
  ctx.fillStyle = bgPattern;
  ctx.translate(camX, camY);
  ctx.fillRect(-camX, -camY, VP.w, VP.h);
  ctx.restore();

  // Vinheta suave nas bordas da janela — a cor vem do ato.
  const g = ctx.createRadialGradient(
    VP.w / 2, VP.h / 2, Math.min(VP.w,VP.h) / 3,
    VP.w / 2, VP.h / 2, Math.max(VP.w,VP.h) / 1.1,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, fog);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VP.w, VP.h);
}

/** Borda do mapa, pra o jogador perceber onde acaba a arena. */
export function drawWorldBounds() {
  ctx.strokeStyle = actDef(actAtual).tint + "66";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(0, 0, W, H);
  ctx.setLineDash([]);
}

export { VIEW_W, VIEW_H };

/* Uma tela girada (celular que vira de lado) muda a proporção, e o CSS já
   reflete isso; o canvas precisa acompanhar. */
window.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 120));

if (typeof ResizeObserver !== "undefined") new ResizeObserver(fitCanvas).observe(cv);
