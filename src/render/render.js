/* ================= RENDER PRINCIPAL =================
   Regra desta camada: render() SÓ DESENHA. Nada aqui altera o estado do jogo —
   foi exatamente esse o erro da versão anterior, que envelhecia os efeitos
   dentro do render usando um `dt` que não existia no escopo. */

import { ctx, drawBackground, drawWorldBounds } from "./canvas.js";
import { W, H, TAU, CELL } from "../core/config.js";
import { CANVAS, VP, panes, setPane, isSplit, SPLIT_GAP, arenaZoom } from "./viewport.js";
import { S } from "../core/state.js";
import { rnd, clamp, dist } from "../core/utils.js";
import { embers } from "./fx.js";
import {
  drawEnemy, drawBlock, drawFood, drawDrop, drawBomb, drawPlayer, drawBossBar,
  drawTurret, drawHydraHead,
} from "./entities.js";
import { viewRect, inView } from "./camera.js";
import { pvpBounds } from "../game/pvp.js";
import { drawMinimap } from "./minimap.js";
import { drawGlow } from './glows.js';

export function renderConnecting() {
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.fillStyle = "#0d0918";
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.fillStyle = "#b9a8ff";
  ctx.font = "22px Orbitron";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("conectando...", CANVAS.w / 2, CANVAS.h / 2);
}

/* ---------------------------------------------------------------------------
   FASE 3 — PAINÉIS

   `render()` decide QUANTAS janelas existem e `drawPane()` desenha uma. No
   modo normal é uma só e nada muda; no PVP local são duas, cada uma com a sua
   câmera, recortadas com `clip()` para a metade da esquerda não vazar por cima
   da direita.
   --------------------------------------------------------------------------- */

export function render(v, dt) {
  const ps = panes();
  if (ps.length === 1) {
    drawScaledPane(v, dt, ps[0]);
    return;
  }

  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  for (const p of ps) {
    setPane(p);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.rect(0, 0, p.w, p.h);
    ctx.clip();
    drawScaledPane(v, dt, p);
    ctx.restore();
  }
  drawSplitFrame(v, ps);
}

function drawScaledPane(v, dt, p) {
  const zoom = arenaZoom(p, v.finalArena);
  setPane({ ...p, w: p.w/zoom, h: p.h/zoom });
  ctx.save();
  ctx.scale(zoom, zoom);
  drawPane(v, dt);
  ctx.restore();
  setPane(p);
  drawBossBar(v);
  drawMinimap(v, {w:p.w/zoom,h:p.h/zoom});
}

/* Faixa entre as duas metades + a etiqueta de quem é cada lado. Sem isso, dois
   pedaços do MESMO mapa colados viram uma imagem confusa: o jogador não sabe
   onde a visão dele acaba. */
function drawSplitFrame(v, ps) {
  const x = ps[0].w;
  const g = ctx.createLinearGradient(x, 0, x + SPLIT_GAP, 0);
  g.addColorStop(0, "#b04dff");
  g.addColorStop(0.5, "#ffd75e");
  g.addColorStop(1, "#b04dff");
  ctx.fillStyle = g;
  ctx.fillRect(x, 0, SPLIT_GAP, CANVAS.h);

  ctx.font = "bold 13px Orbitron";
  ctx.textBaseline = "top";
  for (const p of ps) {
    const pl = v.players[p.who];
    if (!pl) continue;
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = pl.color || "#e8e2ff";
    ctx.fillText("J" + (p.who + 1), p.x + p.w / 2, 8);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "middle";
}

function drawPane(v, dt) {
  const camX = -VP.cam.x;
  const camY = -VP.cam.y;
  const vr = viewRect();

  drawBackground(camX, camY);

  ctx.save();
  // tremor de tela + deslocamento da câmera
  if (S.shake > 0) {
    ctx.translate(rnd(-S.shake, S.shake), rnd(-S.shake, S.shake));
  }
  ctx.translate(camX, camY);

  // brasas de fundo (só as visíveis)
  for (const em of embers) {
    if (!inView(em.x, em.y, em.r, vr)) continue;
    ctx.globalAlpha = em.a;
    ctx.fillStyle = em.c;
    ctx.beginPath();
    ctx.arc(em.x, em.y, em.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (!v.finalArena) drawWorldBounds();
  drawArena();
  drawBossHazards(v.bossHazards || []);

  for (const b of v.blocks) {
    if (inView((b.x + 0.5) * CELL, (b.y + 0.5) * CELL, CELL, vr)) drawBlock(b);
  }
  for (const f of v.foods) {
    if (inView((f.x + 0.5) * CELL, (f.y + 0.5) * CELL, CELL, vr)) drawFood(f);
  }
  for (const f of v.drops || []) {
    if (inView(f.x, f.y, 16, vr)) drawDrop(f);
  }
  for (const m of v.pvp?.meteors || []) {
    if (inView(m.x,m.y,m.r,vr)) drawBomb({...m,mega:true});
  }
  for (const b of v.bombs) {
    if (inView(b.x, b.y, 24, vr)) drawBomb(b);
  }

  // projéteis inimigos
  for (const b of v.ebullets) {
    if (!inView(b.x, b.y, 16, vr)) continue;
    const r = b.r || 6;
    if (b.trail && b.vx !== undefined) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = b.c || "#b04dff";
      ctx.lineWidth = r;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawGlow(b.x,b.y,r+3,b.c||'#b04dff');
  }

  for (const e of v.enemies) {
    if (inView(e.x, e.y, e.r + 20, vr)) drawEnemy(e);
  }

  // projéteis do jogador
  for (const b of v.pbullets) {
    if (!inView(b.x, b.y, 12, vr)) continue;
    const c = b.color || (b.crit ? "#ffd75e" : "#ffe9a8");
    if (b.vx) {
      ctx.strokeStyle = c;
      ctx.globalAlpha = b.trail ? 0.75 : 0.5;
      ctx.lineWidth = b.trail ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawGlow(b.x,b.y,b.crit?10:7,c);
    ctx.fillStyle = b.crit ? "#ffd75e" : c;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.crit ? 5 : 3.5, 0, TAU);
    ctx.fill();
  }

  /* Torres do Engenheiro: desenhadas ANTES da cobra, para a cobra passar por
     cima delas em vez de sumir atrás. */
  for (const p of v.players) {
    for (const t of [...(p.turrets || []), ...(p.ultimateTurrets || [])]) {
      if (inView(t.x, t.y, 20, vr)) drawTurret(t, p.color || "#95a5a6");
    }
  }

  for (const p of v.players) drawPlayer(p);

  /* Cabeças da Hidra: depois da cobra, senão ficam escondidas pelo corpo. */
  for (const p of v.players) {
    if (!p.heads || !p.cells) continue;
    for (const idx of p.heads) {
      const c = p.cells[Math.min(idx, p.cells.length - 1)];
      if (!c) continue;
      const hx = (c[0] + 0.5) * CELL;
      const hy = (c[1] + 0.5) * CELL;
      if (inView(hx, hy, 14, vr)) drawHydraHead(hx, hy, p.color || "#2ecc71");
    }
  }

  drawEffects(vr);

  // partículas
  for (const pt of S.parts) {
    if (!inView(pt.x, pt.y, pt.r, vr)) continue;
    ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
    ctx.fillStyle = pt.c;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // textos flutuantes
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of S.texts) {
    if (!inView(t.x, t.y, 60, vr)) continue;
    ctx.globalAlpha = clamp(t.life * 2, 0, 1);
    ctx.font = "bold " + (t.s || 13) + "px Rajdhani";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.c;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore(); // fim do espaço de mundo

  /* ---- a partir daqui é espaço de TELA ---- */

  drawOffscreenArrows(v);

  if (v.mod) {
    ctx.font = "bold 14px Rajdhani";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffd75e";
    ctx.globalAlpha = 0.85;
    ctx.fillText(v.mod.n + " · " + v.mod.d, 12, VP.h - 12);
    ctx.globalAlpha = 1;
  }

  if (S.flash > 0) {
    ctx.fillStyle = `rgba(255,30,60,${S.flash * 0.5})`;
    ctx.fillRect(0, 0, VP.w, VP.h);
  }

  /* Moldura vermelha de vida baixa. Em tela dividida ela é DO PAINEL: o
     jogador 1 quase morrendo não pode pintar de vermelho a metade do
     jogador 2. E no PVP a vida vai a 10+, então "1 de vida" virou "um quinto
     do máximo" — que é o mesmo aviso em qualquer escala. */
  const low = v.players.some(
    (p) =>
      !p.dead &&
      (VP.who < 0 || p.idx === VP.who) &&
      p.hp <= Math.max(1, (p.maxHp || 3) * 0.2),
  );
  if (low) {
    ctx.fillStyle = `rgba(255,30,60,${0.1 + 0.08 * Math.sin(S.gameT * 8)})`;
    ctx.fillRect(0, 0, VP.w, 8);
    ctx.fillRect(0, VP.h - 8, VP.w, 8);
    ctx.fillRect(0, 0, 8, VP.h);
    ctx.fillRect(VP.w - 8, 0, 8, VP.h);
  }
}

function drawBossHazards(hazards) {
  ctx.save();
  for (const h of hazards) {
    const warning = h.delay > 0;
    const pulse = warning ? 0.2 + 0.15 * Math.sin(S.gameT*14) : 0.46;
    ctx.fillStyle = h.c || "#ff527f";
    ctx.strokeStyle = h.c || "#ff527f";
    ctx.globalAlpha = pulse;
    ctx.lineWidth = warning ? 2 : 4;
    ctx.setLineDash(warning ? [10,7] : []);
    ctx.beginPath();
    if (h.shape === "line") {
      ctx.moveTo(h.x,h.y);ctx.lineTo(h.x2,h.y2);
      ctx.lineWidth = h.width || 20;ctx.stroke();
      ctx.globalAlpha = warning ? 0.85 : 1;ctx.lineWidth = warning ? 2 : 4;ctx.stroke();
    } else if (h.shape === "ring") {
      ctx.arc(h.x,h.y,h.r,0,TAU);
      ctx.arc(h.x,h.y,h.inner || 0,0,TAU,true);
      ctx.fill("evenodd");ctx.globalAlpha = warning ? .7 : .9;ctx.stroke();
    } else {
      ctx.arc(h.x,h.y,h.r || 50,0,TAU);ctx.fill();
      ctx.globalAlpha = warning ? .7 : .9;ctx.stroke();
    }
  }
  ctx.restore();
}

/* Paredes da arena de morte súbita.

   Sem uma parede DESENHADA, a caixa invisível em que a cobra dobra pareceria
   um bug: você anda para a direita e reaparece à esquerda sem nada explicando
   por quê. O anel pulsa para dizer "isto está vivo e vai encolher de novo". */
function drawArena() {
  const a = pvpBounds();
  if (!a) return;
  const x = a.x0 * CELL;
  const y = a.y0 * CELL;
  const w = (a.x1 - a.x0) * CELL;
  const h = (a.y1 - a.y0) * CELL;
  const pulso = 0.55 + 0.45 * Math.sin(S.gameT * 3);

  // o lado de fora escurece: o olho entende na hora onde é o campo de jogo
  ctx.save();
  ctx.fillStyle = "rgba(4,2,10,0.72)";
  ctx.beginPath();
  ctx.rect(-CELL * 4, -CELL * 4, W + CELL * 8, H + CELL * 8);
  ctx.rect(x, y, w, h);
  ctx.fill("evenodd");
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "#ff2e88";
  ctx.shadowBlur = 26 * pulso;
  ctx.strokeStyle = `rgba(255,46,136,${0.55 + 0.4 * pulso})`;
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255,215,94,${0.5 * pulso})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 12]);
  ctx.lineDashOffset = -S.gameT * 60;
  ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
  ctx.setLineDash([]);
  ctx.restore();
}

/* Setas na borda apontando chefes fora da tela — com a câmera, um chefe pode
   estar fora do enquadramento e o jogador precisa saber de onde ele vem. */
function drawOffscreenArrows(v) {
  const cx = VP.w / 2;
  const cy = VP.h / 2;
  for (const e of v.enemies) {
    if (!String(e.type).startsWith("boss")) continue;
    const sx = e.x - VP.cam.x;
    const sy = e.y - VP.cam.y;
    if (sx > 0 && sx < VP.w && sy > 0 && sy < VP.h) continue;
    const a = Math.atan2(sy - cy, sx - cx);
    const px = cx + Math.cos(a) * (cx - 30);
    const py = cy + Math.sin(a) * (cy - 30);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = `rgba(255,46,136,${0.6 + 0.3 * Math.sin(S.gameT * 8)})`;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/* Desenha os efeitos. NÃO altera life — quem envelhece é o updateFx(dt). */
function drawEffects(vr) {
  for (const ef of S.effects) {
    const alpha = clamp(ef.life / (ef.maxLife || 1), 0, 1);
    const progress = 1 - alpha;

    switch (ef.type) {
      case "aim": {
        // telegrafia do sniper: linha que "carrega" até o disparo
        ctx.globalAlpha = 0.25 + 0.55 * progress;
        ctx.strokeStyle = ef.c;
        ctx.lineWidth = 1.5 + 2 * progress;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -S.gameT * 40;
        ctx.beginPath();
        ctx.moveTo(ef.x, ef.y);
        ctx.lineTo(ef.tx, ef.ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        // mira no ponto previsto
        ctx.beginPath();
        ctx.arc(ef.tx, ef.ty, 6 + 8 * alpha, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "laser": {
        ctx.globalAlpha = clamp(ef.life * 6, 0, 0.7);
        ctx.strokeStyle = ef.c;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(ef.x, ef.y);
        ctx.lineTo(ef.tx, ef.ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        break;
      }
      case "beam": {
        // feixe grosso com brilho — chefes boss5 / boss_final
        const ex = ef.x + Math.cos(ef.ang) * ef.len;
        const ey = ef.y + Math.sin(ef.ang) * ef.len;
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = ef.c;
        ctx.shadowColor = ef.c;
        ctx.shadowBlur = 18;
        ctx.lineWidth = ef.w;
        ctx.beginPath();
        ctx.moveTo(ef.x, ef.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = Math.max(1, ef.w * 0.35);
        ctx.beginPath();
        ctx.moveTo(ef.x, ef.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        break;
      }
      case "shockwave":
      case "quake": {
        const curR = ef.r + (ef.maxR - ef.r) * progress;
        ctx.globalAlpha = alpha * 0.65;
        ctx.strokeStyle = ef.c;
        ctx.lineWidth = Math.max(1, ef.w * alpha);
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, curR, 0, TAU);
        ctx.stroke();
        if (ef.type === "quake") {
          ctx.globalAlpha = alpha * 0.3;
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, curR * 0.7, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case "ring":
      case "aura": {
        const curR = ef.r + (ef.maxR - ef.r) * progress;
        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = ef.c;
        ctx.lineWidth = Math.max(1, ef.w * alpha);
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, curR, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "vortex": {
        const curR = ef.r + (ef.maxR - ef.r) * progress * 0.7;
        ctx.globalAlpha = alpha * 0.45;
        ctx.strokeStyle = ef.c;
        ctx.lineWidth = Math.max(1, ef.w * alpha);
        ctx.setLineDash([12, 8]);
        for (let k = 0; k < 2; k++) {
          ctx.beginPath();
          ctx.arc(
            ef.x, ef.y, curR * (1 - k * 0.3),
            S.gameT * (3 + k * 2), S.gameT * (3 + k * 2) + TAU * 0.7,
          );
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        break;
      }
      case "shadow": {
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillStyle = ef.c;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "drain": {
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = ef.c;
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.moveTo(ef.x, ef.y);
        ctx.quadraticCurveTo(
          (ef.x + ef.tx) / 2 + Math.sin(S.gameT * 10) * 10,
          (ef.y + ef.ty) / 2,
          ef.tx, ef.ty,
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "shield": {
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = ef.c;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = "rgba(255,215,94,.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "bombWarning": {
        const pulse = 0.5 + 0.5 * Math.sin(S.gameT * 15);
        ctx.globalAlpha = alpha * 0.4 * pulse;
        ctx.fillStyle = ef.c;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = "rgba(255,50,50,0.7)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}
