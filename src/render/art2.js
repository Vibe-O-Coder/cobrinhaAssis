/* ================= ARTE VETORIAL — TIPOS NOVOS =================
   Os chefes boss5, boss6 e boss_elite eram sorteados pelo jogo mas não tinham
   entrada em ARTFN: caíam no `|| artGrunter` e apareciam como um grunter
   gigante. Aqui eles ganham desenho próprio, junto com o chefe final e os
   quatro inimigos novos. */

import { ctx } from "./canvas.js";
import { TAU } from "../core/config.js";
import { S } from "../core/state.js";
import { vSkull } from "./art.js";

/* 💥 Bombardeiro: pavio aceso, pisca mais rápido quando armado. */
export function artBomber(r, e) {
  const armed = e && e.armed;
  const t = S.gameT * (armed ? 22 : 6);
  ctx.fillStyle = "#2a1c05";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, armed ? "#fff3c4" : "#ffd75e");
  g.addColorStop(1, armed ? "#ff3d00" : "#ffb300");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a4a00";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#5a3a10";
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.5, -r * 1.3, r * 0.2, -r * 1.55);
  ctx.stroke();
  const sp = 0.5 + 0.5 * Math.sin(t);
  ctx.shadowColor = "#ffaa00";
  ctx.shadowBlur = 14 * sp;
  ctx.fillStyle = sp > 0.5 ? "#fff" : "#ff8a00";
  ctx.beginPath();
  ctx.arc(r * 0.2, -r * 1.55, r * (0.2 + 0.12 * sp), 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/* 🌀 Tecelão: corpo alongado com esteira de fantasmas. */
export function artWeaver(r) {
  const t = S.gameT * 5;
  for (let i = 3; i >= 1; i--) {
    ctx.globalAlpha = 0.12 * i;
    ctx.fillStyle = "#c77dff";
    ctx.beginPath();
    ctx.ellipse(-i * r * 0.5, Math.sin(t - i * 0.5) * r * 0.4, r * 0.7, r * 0.45, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, "#7c1fff");
  g.addColorStop(1, "#e0b3ff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.66, Math.sin(t) * 0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3d0a6b";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.1, r * 0.17, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#3d0a6b";
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.1, r * 0.08, 0, TAU);
  ctx.fill();
}

/* 🛡️ Guardião: hexágono com anel orbitando — sinaliza a aura de proteção. */
export function artWarden(r) {
  const t = S.gameT * 1.1;
  ctx.save();
  ctx.rotate(t);
  ctx.strokeStyle = "rgba(143,168,255,.5)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * TAU;
    const x = Math.cos(a) * r * 1.45;
    const y = Math.sin(a) * r * 1.45;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#dfe6ff");
  g.addColorStop(1, "#3a56c9");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16225c";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#16225c";
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.1, r * 0.11, 0, TAU);
  ctx.arc(r * 0.28, -r * 0.1, r * 0.11, 0, TAU);
  ctx.fill();
}

/* 🤢 Cuspidor: bolsa de veneno que pulsa. */
export function artSpitter(r) {
  const pulse = 1 + Math.sin(S.gameT * 7) * 0.08;
  ctx.fillStyle = "rgba(0,229,160,.22)";
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.35 * pulse, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, "#c9ffee");
  g.addColorStop(1, "#00996b");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r * pulse, r * 0.9 * pulse, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#014d35";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = "#013d2a";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.45, r * 0.4, r * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.3, r * 0.14, 0, TAU);
  ctx.arc(r * 0.3, -r * 0.3, r * 0.14, 0, TAU);
  ctx.fill();
}

/* 🔷 boss5 — O PRISMA: cristal facetado girando, com feixes saindo. */
export function artBoss5(r, e) {
  const en = e && (e.enraged || e.hp < e.mhp * 0.5);
  const t = S.gameT * (en ? 2.2 : 1.2);
  ctx.save();
  ctx.rotate(-t * 0.6);
  ctx.strokeStyle = en ? "rgba(255,255,255,.55)" : "rgba(0,255,255,.4)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos((i / 6) * TAU) * r * 1.8, Math.sin((i / 6) * TAU) * r * 1.8);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(t);
  const faces = 8;
  for (let i = 0; i < faces; i++) {
    const a0 = (i / faces) * TAU;
    const a1 = ((i + 1) / faces) * TAU;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a0) * r, Math.sin(a0) * r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, i % 2 ? (en ? "#ff4d6d" : "#00b8d4") : en ? "#ffd75e" : "#00ffff");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "#004d5c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.shadowColor = en ? "#ff2e2e" : "#00ffff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.26, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/* 🐝 boss6 — A COLMEIA: núcleo com satélites orbitando. */
export function artBoss6(r, e) {
  const en = e && (e.enraged || e.hp < e.mhp * 0.5);
  const orb = (e && e.orb) || S.gameT * 1.6;
  const n = en ? 5 : 4;

  ctx.strokeStyle = "rgba(255,0,255,.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, TAU);
  ctx.stroke();

  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#ffd0ff");
  g.addColorStop(1, en ? "#8b0057" : "#a3008f");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * TAU;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#40002f";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.strokeStyle = "rgba(64,0,47,.6)";
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.28 + k * 0.24), 0, TAU);
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const a = orb + (i / n) * TAU;
    const sx = Math.cos(a) * 90;
    const sy = Math.sin(a) * 90;
    ctx.shadowColor = "#ff00ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = en ? "#ff6ec7" : "#ff00ff";
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/* ☠️ boss_elite — O ARAUTO: coroa de lâminas que muda de cor por fase. */
export function artBossElite(r, e) {
  const mode = (e && e.mode) || 0;
  const en = e && e.enraged;
  const col = ["#ff3333", "#ff9838", "#b04dff"][mode] || "#ff3333";
  const t = S.gameT * (en ? 3 : 1.6);

  ctx.save();
  ctx.rotate(t);
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05);
    ctx.lineTo(Math.cos(a + 0.18) * r * 1.75, Math.sin(a + 0.18) * r * 1.75);
    ctx.lineTo(Math.cos(a + 0.36) * r * 1.05, Math.sin(a + 0.36) * r * 1.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.rotate(-t * 0.5);
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * TAU;
    const x = Math.cos(a) * r * 1.3;
    const y = Math.sin(a) * r * 1.3;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.5, col);
  g.addColorStop(1, "#2a0000");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0000";
  ctx.lineWidth = 3;
  ctx.stroke();

  vSkull(0, 0, r * 1.05, "#1a0000");
}

/* 🌑 boss_final — O DEVORADOR DE MUNDOS: buraco negro coroado. */
export function artBossFinal(r, e) {
  const phase = (e && e.fphase) || 0;
  const t = S.gameT;
  const halo = ["#ffd75e", "#ff9838", "#ff2e2e"][phase] || "#ffd75e";

  for (let i = 4; i >= 1; i--) {
    ctx.globalAlpha = 0.07 * i;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1 + i * 0.28) + Math.sin(t * 2 + i) * 6, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(t * (0.5 + i * 0.35) * (i % 2 ? -1 : 1));
    ctx.strokeStyle = halo;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 4 - i;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (1.45 + i * 0.3), r * (0.5 + i * 0.16), 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  const g = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, r);
  g.addColorStop(0, "#000000");
  g.addColorStop(0.62, "#1a0a2e");
  g.addColorStop(1, halo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#ffd75e";
  ctx.strokeStyle = "#7a5a00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const cw = r * 0.95;
  ctx.moveTo(-cw, -r * 0.72);
  for (let i = 0; i < 5; i++) {
    const x1 = -cw + ((i + 0.5) * 2 * cw) / 5;
    const x2 = -cw + ((i + 1) * 2 * cw) / 5;
    ctx.lineTo(x1, -r * 1.35);
    ctx.lineTo(x2, -r * 0.72);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = halo;
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-r * 0.33, -r * 0.05, r * 0.15, r * 0.1, -0.25, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.33, -r * 0.05, r * 0.15, r * 0.1, 0.25, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/* 🩸 Sanguessuga: boca de ventosa com anéis pulsantes. Ela não parece perigosa
   de longe de propósito — o susto é descobrir que a vida parou de voltar. */
export function artLeech(r) {
  const t = S.gameT * 4;
  const pulso = 0.5 + 0.5 * Math.sin(t);
  ctx.fillStyle = "#1b2a10";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r * 1.1, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#c8f59a");
  g.addColorStop(1, "#5c9c26");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.7, r * 0.95, 0, 0, TAU);
  ctx.fill();
  // anéis de sucção
  ctx.strokeStyle = `rgba(200,245,154,${0.35 + 0.4 * pulso})`;
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.22 * i, r * 0.3 * i, 0, 0, TAU);
    ctx.stroke();
  }
  // boca
  ctx.fillStyle = "#12200a";
  ctx.beginPath();
  ctx.arc(0, 0, r * (0.22 + 0.08 * pulso), 0, TAU);
  ctx.fill();
}

/* 🔨 Quebrador: placa de armadura com um martelo cravado. Silhueta pesada para
   o jogador saber, antes de encostar, que aquele ali tira o ataque dele. */
export function artBreaker(r) {
  ctx.fillStyle = "#3a1026";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#ff9ec7");
  g.addColorStop(1, "#b2005f");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2;
    const rr = r * (i % 2 ? 0.7 : 0.95);
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#69002f";
  ctx.lineWidth = 2;
  ctx.stroke();
  // martelo
  ctx.save();
  ctx.rotate(Math.sin(S.gameT * 3) * 0.35);
  ctx.fillStyle = "#e8e2ff";
  ctx.fillRect(-r * 0.12, -r * 0.1, r * 0.24, r * 0.95);
  ctx.fillStyle = "#9aa3b5";
  ctx.fillRect(-r * 0.45, -r * 0.42, r * 0.9, r * 0.36);
  ctx.restore();
}

/* ☣️ PESTILENTA, A MÃE DA PRAGA — chefe do ato VIII.
   Nuvem de esporos orbitando um núcleo que abre e fecha. */
export function artBossPlague(r, e) {
  const t = S.gameT;
  const aberto = e && e.openT > 0;
  // esporos
  for (let i = 0; i < 9; i++) {
    const a = t * 0.7 + (i / 9) * TAU;
    const rr = r * (1.15 + 0.12 * Math.sin(t * 2 + i));
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = i % 2 ? "#8bd64a" : "#4f8f1c";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.14, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#17280c";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#d6f5a6");
  g.addColorStop(0.6, "#8bd64a");
  g.addColorStop(1, "#3f7a12");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, TAU);
  ctx.fill();

  // núcleo que abre na brecha de punição
  ctx.fillStyle = aberto ? "#fff" : "#20340f";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * (aberto ? 0.42 : 0.3), r * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b6ef7a";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  vSkull(0, 0, r * 0.4, aberto ? "#3f7a12" : "#8bd64a");
}

/* ⚙️ O TIRANO DE FERRO — chefe do ato IX.
   Placas de armadura em camadas; abrem e mostram o núcleo na brecha. */
export function artBossTyrant(r, e) {
  const t = S.gameT;
  const aberto = e && e.openT > 0;
  const gap = aberto ? r * 0.22 : 0;

  ctx.fillStyle = "#2b0a1c";
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.02, 0, TAU);
  ctx.fill();

  // núcleo
  ctx.fillStyle = aberto ? "#fff" : "#ff4d9d";
  ctx.shadowColor = "#ff4d9d";
  ctx.shadowBlur = aberto ? 26 : 10;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.34, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 6 placas que se afastam quando ele abre
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + t * 0.25;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(r * 0.62 + gap, 0);
    const g = ctx.createLinearGradient(-r * 0.3, 0, r * 0.3, 0);
    g.addColorStop(0, "#ff9ec7");
    g.addColorStop(1, "#8e0047");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.34);
    ctx.lineTo(r * 0.36, -r * 0.2);
    ctx.lineTo(r * 0.36, r * 0.2);
    ctx.lineTo(-r * 0.3, r * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#54002a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
