/* ================= DESENHO DAS ENTIDADES ================= */
import { ctx } from "./canvas.js";
import { CELL, TAU, W, H } from "../core/config.js";
import { VP } from "./viewport.js";
import { S } from "../core/state.js";
import { clamp, dist, shade } from "../core/utils.js";
import { EDEF, bossName, isBoss, AFFIXES } from "../data/enemies.js";
import { artFor } from "./artmap.js";
import { safeColor } from "./hud.js";
import { vHeart, vSoul, vSkull, vShieldIc, vStar, drawApple } from "./art.js";

/* Cor do anel por tier. Antes só existiam dois (veterano e abissal) e o código
   era um ternário; com 5 tiers vira tabela. */
const TIER_RING = [
  null, "#ffaa00", "#ff2e52", "#ff00d0", "#00e5ff", "#ffffff",
];

export function drawEnemy(e) {
  const d = EDEF[e.type] || EDEF.grunter;
  ctx.save();
  ctx.translate(e.x, e.y);

  // sombra/halo
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = d.c;
  ctx.beginPath();
  ctx.arc(0, 0, e.r + 6, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // aura de proteção do guardião
  if (e.ward > 0) {
    ctx.strokeStyle = `rgba(143,168,255,${0.3 + e.ward})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 11, S.gameT * 2, S.gameT * 2 + 4);
    ctx.stroke();
  }

  if (e.enraged || (isBoss(e.type) && e.hp < e.mhp * 0.5)) {
    ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.3 * Math.sin(S.gameT * 10)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 9, 0, TAU);
    ctx.stroke();
  }

  if (e.elite) {
    ctx.strokeStyle = `rgba(255,215,94,${0.55 + 0.3 * Math.sin(S.gameT * 6)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 7, S.gameT * 3, S.gameT * 3 + 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 7, S.gameT * 3 + Math.PI, S.gameT * 3 + Math.PI + 2.2);
    ctx.stroke();
  }

  /* Brecha de punição: enquanto o chefe está aberto ele recebe 50% mais dano.
     Sem um aviso na tela isso seria invisível, e a luta continuaria parecendo
     "atire o tempo todo" — que é exatamente o que a brecha existe para desfazer. */
  if (e.openT > 0) {
    const pulso = 0.5 + 0.5 * Math.sin(S.gameT * 14);
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + 0.45 * pulso})`;
    ctx.lineWidth = 3 + pulso * 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 14, 0, TAU);
    ctx.stroke();
  }

  // marca de variante: um anel por tier (agora vão até 5)
  if (e.tier > 0) {
    ctx.strokeStyle = TIER_RING[e.tier] || "#ffaa00";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < e.tier; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 13 + i * 2.6, 0, TAU);
      ctx.stroke();
    }
  }

  /* Afixos: um arco curto na cor do afixo, um por "fatia" do círculo. É assim
     que dá para saber, no meio da horda, qual bicho é o que te tira a cura e
     qual é o que explode — sem abrir menu nenhum. */
  if (e.affixes && e.affixes.length) {
    const passo = TAU / e.affixes.length;
    for (let i = 0; i < e.affixes.length; i++) {
      const a = AFFIXES[e.affixes[i]];
      if (!a) continue;
      ctx.strokeStyle = a.c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 9, i * passo + S.gameT * 0.8, i * passo + S.gameT * 0.8 + passo * 0.6);
      ctx.stroke();
    }
  }

  artFor(d, e.type)(e.r, e);

  if (e.flash > 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // barra de vida (chefes têm a barra grande no topo)
  if (!isBoss(e.type)) {
    const pct = clamp(e.hp / e.mhp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.6)";
    ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4.5);
    ctx.fillStyle = e.elite
      ? "#ffd75e"
      : pct > 0.5 ? "#7dff5e" : pct > 0.25 ? "#ffd75e" : "#ff4d6d";
    ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * pct, 4.5);
  }
}

/* Torres do Engenheiro e cabeças da Hidra.
   As duas classes produzem dano LONGE da cabeça da cobra, então sem desenho
   próprio o jogador não entende de onde o tiro está saindo. */
export function drawTurret(t, color) {
  const pulso = 0.6 + 0.4 * Math.sin(S.gameT * 6);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.globalAlpha = Math.min(1, t.life / 2); // pisca quando vai acabar
  ctx.fillStyle = "#2b3138";
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.globalAlpha *= pulso;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = S.gameT * 1.5 + (i / 3) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
    ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHydraHead(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-3, -2, 2, 0, TAU);
  ctx.arc(3, -2, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-3, -2, 1, 0, TAU);
  ctx.arc(3, -2, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawBlock(b) {
  const x = b.x * CELL;
  const y = b.y * CELL;
  const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
  g.addColorStop(0, "#3b1d70");
  g.addColorStop(0.5, "#5b2fb8");
  g.addColorStop(1, "#281248");
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = "rgba(210,170,255,.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 2);
  ctx.lineTo(x + CELL / 2, y + CELL / 2);
  ctx.lineTo(x + CELL - 2, y + 2);
  ctx.moveTo(x + 2, y + CELL - 2);
  ctx.lineTo(x + CELL / 2, y + CELL / 2);
  ctx.lineTo(x + CELL - 2, y + CELL - 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(190,140,255,.5)";
  ctx.beginPath();
  ctx.moveTo(x + CELL / 2, y + 8);
  ctx.lineTo(x + CELL - 9, y + CELL / 2);
  ctx.lineTo(x + CELL / 2, y + CELL - 8);
  ctx.lineTo(x + 9, y + CELL / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b06bff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);

  const dmg = 6 - (b.hp === undefined ? 6 : b.hp);
  if (dmg > 0) {
    ctx.strokeStyle = "rgba(10,4,20,.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < dmg; i++) {
      const sx = x + 7 + ((b.x * 31 + b.y * 17 + i * 13) % 18);
      const sy = y + 7 + ((b.x * 13 + b.y * 29 + i * 7) % 18);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (i % 2 ? 6 : -6), sy + 7);
    }
    ctx.stroke();
  }
}

export function drawFood(f) {
  const x = (f.x + 0.5) * CELL;
  const y = (f.y + 0.5) * CELL;
  if (f.t === "g") {
    const pu = 1 + 0.12 * Math.sin(S.gameT * 5);
    const rot = S.gameT * 0.8;
    ctx.shadowColor = "#ffd75e";
    ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(x, y - 2, 1, x, y, 11 * pu);
    g.addColorStop(0, "#fff3c4");
    g.addColorStop(0.6, "#ffd75e");
    g.addColorStop(1, "#e08a1e");
    ctx.fillStyle = g;
    vStar(x, y, 11 * pu, rot);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#8a5a10";
    ctx.lineWidth = 1;
    vStar(x, y, 11 * pu, rot);
    ctx.stroke();
  } else if (f.t === "p") {
    const g = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 10);
    g.addColorStop(0, "#9dffb8");
    g.addColorStop(1, "#1d8a3e");
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(x, y, 9.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#0d5c26";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    vSkull(x, y + 1, 11, "#eafff0");
  } else {
    drawApple(x, y);
  }
}

export function drawDrop(f) {
  const bob = Math.sin(S.gameT * 4 + (f.born || 0) * 7) * 3;
  const x = f.x;
  const y = f.y + bob;
  if (f.life !== undefined && f.life < 3 && Math.sin(S.gameT * 14) > 0) {
    ctx.globalAlpha = 0.35;
  }
  ctx.shadowColor =
    f.t === "heart" ? "#ff4d6d" : f.t === "xp" ? "#6fd3ff" : "#b04dff";
  ctx.shadowBlur = 10;
  if (f.t === "heart") vHeart(x, y, 9);
  else if (f.t === "xp") vXpOrb(x, y, f.v || 2);
  else vSoul(x, y, 10);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

/* Orbe de experiência do PVP. O raio cresce com o valor (devagar, pela raiz)
   para o jogador conseguir escolher DE LONGE qual orbe vale a corrida — num
   mapa de 2800x2800, correr até o orbe errado custa a partida. */
function vXpOrb(x, y, v) {
  const r = 6 + Math.min(7, Math.sqrt(v) * 1.6);
  const pulso = 0.85 + 0.15 * Math.sin(S.gameT * 6 + x * 0.05);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
  g.addColorStop(0, "#eafaff");
  g.addColorStop(0.45, "#6fd3ff");
  g.addColorStop(1, "rgba(60,180,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6 * pulso, 0, TAU);
  ctx.fill();

  // losango central — dá "peso" de item ao orbe e o separa da alma redonda
  ctx.fillStyle = "#dff6ff";
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.62, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.62, y);
  ctx.closePath();
  ctx.fill();
}

export function drawBomb(b) {
  const blink = b.t < 0.5 && Math.sin(S.gameT * 30) > 0;
  const g = ctx.createRadialGradient(b.x - 3, b.y - 4, 2, b.x, b.y, 11);
  g.addColorStop(0, blink ? "#ffd75e" : "#3a3a4a");
  g.addColorStop(1, blink ? "#ff5d1f" : "#0a0a10");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 10, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a6a3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x + 4, b.y - 8);
  ctx.quadraticCurveTo(b.x + 10, b.y - 14, b.x + 7, b.y - 17);
  ctx.stroke();
  const sp = 1 + Math.sin(S.gameT * 25) * 0.4;
  ctx.fillStyle = "#ffd75e";
  ctx.shadowColor = "#ff9838";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(b.x + 7, b.y - 18, 2.5 * sp, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,152,56,.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(b.t / 1.4, 0, 1));
  ctx.stroke();
}

export function drawPlayer(p) {
  if (p.dead) return; // a caveira do morto agora fica no HUD, não no mundo

  const cells = p.cells;
  if (!cells || !cells.length) return; // snapshot de rede pode vir incompleto
  // cor vinda do outro jogador: shade() faz parseInt no hex e devolveria NaN
  const col = safeColor(p.color);
  const blink = p.iframes > 0 && Math.sin(S.gameT * 30) > 0;
  ctx.globalAlpha = blink ? 0.45 : 1;

  for (let i = cells.length - 1; i >= 1; i--) {
    const c = cells[i];
    const t = i / cells.length;
    const x = (c[0] + 0.5) * CELL;
    const y = (c[1] + 0.5) * CELL;
    const r = 12 - 4.5 * t;
    ctx.fillStyle = shade(col, 1.05 - t * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.14)";
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.45, 0, TAU);
    ctx.fill();
  }

  const h = cells[0];
  const hx = (h[0] + 0.5) * CELL;
  const hy = (h[1] + 0.5) * CELL;
  const dx = (p.dir && p.dir.x) || 0;
  const dy = (p.dir && p.dir.y) || 0;
  const px = -dy;
  const py = dx;

  // língua
  if (Math.sin(S.gameT * 2.6 + p.idx * 2) > 0.75) {
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + dx * 12, hy + dy * 12);
    ctx.lineTo(hx + dx * 20, hy + dy * 20);
    ctx.moveTo(hx + dx * 20, hy + dy * 20);
    ctx.lineTo(hx + dx * 24 + px * 3, hy + dy * 24 + py * 3);
    ctx.moveTo(hx + dx * 20, hy + dy * 20);
    ctx.lineTo(hx + dx * 24 - px * 3, hy + dy * 24 - py * 3);
    ctx.stroke();
  }

  ctx.shadowColor = col;
  ctx.shadowBlur = 18;
  const g = ctx.createRadialGradient(
    hx + dx * 4 - px * 3, hy + dy * 4 - py * 3, 2, hx, hy, 14,
  );
  g.addColorStop(0, shade(col, 1.35));
  g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(hx, hy, 13, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (const s of [1, -1]) {
    const ex = hx + dx * 4 + px * 5 * s;
    const ey = hy + dy * 4 + py * 5 * s;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, ey, 3.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(ex + dx * 1.3, ey + dy * 1.3, 1.8, 0, TAU);
    ctx.fill();
  }

  if (p.shieldT > 0) {
    ctx.strokeStyle = "rgba(255,215,94,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, hy, 20, S.gameT * 4, S.gameT * 4 + TAU * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx, hy, 20, S.gameT * 4 + Math.PI, S.gameT * 4 + Math.PI + TAU * 0.8);
    ctx.stroke();
  }
  if (p.guard > 0) {
    ctx.strokeStyle="#6fd3ff"; ctx.lineWidth=2; ctx.shadowColor="#6fd3ff"; ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(hx,hy,23,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,p.guard/Math.max(1,p.guardMax)));ctx.stroke();ctx.shadowBlur=0;
  }
  if (p.shield > 0) vShieldIc(hx + 16, hy - 16, 6);

  if (S.players.length > 1) {
    ctx.font = "bold 12px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText("J" + (p.idx + 1), hx, hy - 22);
    ctx.fillStyle = col;
    ctx.fillText("J" + (p.idx + 1), hx, hy - 22);
  }
  ctx.globalAlpha = 1;
}

/** Barra de chefe — fica no espaço da TELA, não do mundo. */
export function drawBossBar(v) {
  const bosses = v.enemies.filter((e) => isBoss(e.type));
  if (!bosses.length) return;

  // No PVP em tela dividida cada metade tem ~558px: uma barra de 360 fixos
  // encostaria nas duas bordas.
  const w = Math.min(360, VP.w - 40);
  const x = (VP.w - w) / 2;
  let y = 10;

  for (const b of bosses.slice(0, 3)) {
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(x - 2, y - 2, w + 4, 14);
    const pct = clamp(b.hp / b.mhp, 0, 1);
    const final = b.type === "boss_final";
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, final ? "#ffd75e" : "#ff2e88");
    g.addColorStop(1, final ? "#ff2e2e" : "#ff7b3d");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * pct, 10);
    ctx.strokeStyle = "#ffd75e";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 2.5, y - 2.5, w + 5, 15);

    const en = b.enraged || b.hp < b.mhp * 0.5;
    ctx.font = "bold 12px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = en ? "#ff5d7f" : "#ffd75e";
    ctx.fillText(
      bossName(b.type) + (en ? " ENFURECIDO" : ""),
      VP.w / 2,
      y + 24,
    );
    y += 40;
  }
}
