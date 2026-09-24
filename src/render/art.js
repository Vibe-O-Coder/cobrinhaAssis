/* ================= ARTE VETORIAL =================
   Desenho procedural de cada inimigo, chefe e item. Portado da versão
   monolítica com uma diferença: além dos que já existiam, aqui estão os
   desenhos de boss5, boss6, boss_elite e boss_final — que eram sorteados no
   jogo mas não tinham entrada em ARTFN e caíam no desenho do grunter, virando
   uma bolha genérica gigante. Também entram os 4 inimigos novos. */

import { ctx } from "./canvas.js";
import { TAU } from "../core/config.js";
import { clamp } from "../core/utils.js";
import { S } from "../core/state.js";

export function vHeart(x, y, s, c1, c2) {
  const g = ctx.createRadialGradient(x, y - s * 0.3, s * 0.1, x, y, s * 1.2);
  g.addColorStop(0, c1 || "#ff8ba0");
  g.addColorStop(1, c2 || "#c22040");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(
    x - s * 1.3,
    y,
    x - s * 0.55,
    y - s * 1.05,
    x,
    y - s * 0.35,
  );
  ctx.bezierCurveTo(
    x + s * 0.55,
    y - s * 1.05,
    x + s * 1.3,
    y,
    x,
    y + s * 0.85,
  );
  ctx.fill();
}
export function vSoul(x, y, s) {
  const g = ctx.createRadialGradient(x, y, s * 0.1, x, y, s);
  g.addColorStop(0, "#e0b3ff");
  g.addColorStop(1, "#7c3dff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.15, s * 0.65, Math.PI, 0);
  ctx.quadraticCurveTo(x + s * 0.65, y + s * 0.5, x + s * 0.3, y + s * 0.7);
  ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.45, x, y + s * 0.75);
  ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.45, x - s * 0.4, y + s * 0.7);
  ctx.quadraticCurveTo(x - s * 0.65, y + s * 0.4, x - s * 0.65, y - s * 0.15);
  ctx.fill();
  ctx.fillStyle = "#2a1050";
  ctx.beginPath();
  ctx.arc(x - s * 0.22, y - s * 0.2, s * 0.09, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.22, y - s * 0.2, s * 0.09, 0, TAU);
  ctx.fill();
}
export function vSkull(x, y, s, c) {
  ctx.fillStyle = c || "#fff";
  ctx.beginPath();
  ctx.arc(x, y - s * 0.15, s * 0.55, Math.PI, 0);
  ctx.lineTo(x + s * 0.55, y + s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.4, y + s * 0.55, x, y + s * 0.5);
  ctx.quadraticCurveTo(x - s * 0.4, y + s * 0.55, x - s * 0.55, y + s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1030";
  ctx.beginPath();
  ctx.arc(x - s * 0.22, y - s * 0.15, s * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.22, y - s * 0.15, s * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.05);
  ctx.lineTo(x + s * 0.08, y + s * 0.22);
  ctx.lineTo(x - s * 0.08, y + s * 0.22);
  ctx.closePath();
  ctx.fill();
}
export function vShieldIc(x, y, s) {
  ctx.fillStyle = "#ffd75e";
  ctx.strokeStyle = "#8a6a1a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s, y - s * 0.7, x + s, y);
  ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.8, x, y + s * 1.15);
  ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.8, x - s, y);
  ctx.quadraticCurveTo(x - s, y - s * 0.7, x, y - s);
  ctx.fill();
  ctx.stroke();
}
export function vStar(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * TAU - Math.PI / 2,
      rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr,
      py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
export function drawApple(x, y) {
  const g = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, 10);
  g.addColorStop(0, "#ff9d9d");
  g.addColorStop(0.6, "#e63950");
  g.addColorStop(1, "#8f1030");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 8.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5c0f22";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "#6b4423";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 7);
  ctx.quadraticCurveTo(x + 1, y - 11, x + 3, y - 12.5);
  ctx.stroke();
  ctx.fillStyle = "#4ddb6a";
  ctx.beginPath();
  ctx.ellipse(x + 5.5, y - 11, 4, 2, -0.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.beginPath();
  ctx.arc(x - 3, y - 3.5, 1.8, 0, TAU);
  ctx.fill();
}
export function artGrunter(r) {
  const g = ctx.createRadialGradient(0, -r * 0.35, r * 0.15, 0, 0, r * 1.1);
  g.addColorStop(0, "#ff9db1");
  g.addColorStop(1, "#b31f45");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5c0f24";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = "#ffd75e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.75);
  ctx.lineTo(-r * 0.55, -r * 1.25);
  ctx.moveTo(r * 0.35, -r * 0.75);
  ctx.lineTo(r * 0.55, -r * 1.25);
  ctx.stroke();
  ctx.fillStyle = "#ffd75e";
  ctx.beginPath();
  ctx.arc(-r * 0.55, -r * 1.3, 2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 1.3, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.1, r * 0.26, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.1, r * 0.26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#20060f";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.05, r * 0.12, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.05, r * 0.12, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3d0a1c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.35);
  ctx.lineTo(-r * 0.27, r * 0.58);
  ctx.lineTo(0, r * 0.35);
  ctx.lineTo(r * 0.27, r * 0.58);
  ctx.lineTo(r * 0.55, r * 0.35);
  ctx.stroke();
}
export function artRunner(r) {
  const f = Math.sin(S.gameT * 16) * 0.7;
  ctx.fillStyle = "#c9932e";
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.1);
  ctx.quadraticCurveTo(-r * 1.5, -r * (1.3 + f), -r * 2, r * (0.15 + f * 0.3));
  ctx.quadraticCurveTo(-r * 1.2, r * 0.1, -r * 0.3, r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.1);
  ctx.quadraticCurveTo(r * 1.5, -r * (1.3 + f), r * 2, r * (0.15 + f * 0.3));
  ctx.quadraticCurveTo(r * 1.2, r * 0.1, r * 0.3, r * 0.45);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(0, -r * 0.2, 1, 0, 0, r * 0.8);
  g.addColorStop(0, "#ffe9a8");
  g.addColorStop(1, "#d9a13a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#c9932e";
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.4);
  ctx.lineTo(-r * 0.6, -r * 1.05);
  ctx.lineTo(-r * 0.1, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.45, -r * 0.4);
  ctx.lineTo(r * 0.6, -r * 1.05);
  ctx.lineTo(r * 0.1, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff2e2e";
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.05, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.05, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, r * 0.28);
  ctx.lineTo(-r * 0.06, r * 0.55);
  ctx.lineTo(0, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.14, r * 0.28);
  ctx.lineTo(r * 0.06, r * 0.55);
  ctx.lineTo(0, r * 0.28);
  ctx.closePath();
  ctx.fill();
}
export function artShooter(r, e) {
  const charge =
    e && e.shT !== undefined && e.shT < 0.7 ? clamp(1 - e.shT / 0.7, 0, 1) : 0;
  ctx.fillStyle = "#eef8ff";
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(0, -r * 1.15, r, 0);
  ctx.quadraticCurveTo(0, r * 1.15, -r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = charge > 0.2 ? "#ff4d6d" : "#4dc3ff";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,90,110,.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.15);
  ctx.lineTo(-r * 0.5, -r * 0.05);
  ctx.moveTo(-r * 0.8, r * 0.2);
  ctx.lineTo(-r * 0.45, r * 0.1);
  ctx.moveTo(r * 0.85, -r * 0.15);
  ctx.lineTo(r * 0.5, -r * 0.05);
  ctx.stroke();
  const ir = r * 0.42 * (1 + charge * 0.35);
  const gi = ctx.createRadialGradient(0, 0, 1, 0, 0, ir);
  gi.addColorStop(0, "#06121e");
  gi.addColorStop(0.45, charge > 0.25 ? "#ff2e55" : "#2ea8ff");
  gi.addColorStop(1, "#a8dcff");
  ctx.fillStyle = gi;
  ctx.beginPath();
  ctx.arc(0, 0, ir, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#04080e";
  ctx.beginPath();
  ctx.arc(0, 0, ir * 0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.beginPath();
  ctx.arc(-ir * 0.25, -ir * 0.3, ir * 0.14, 0, TAU);
  ctx.fill();
  if (charge > 0) {
    ctx.strokeStyle = `rgba(255,60,90,${charge * 0.9})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
    ctx.stroke();
  }
}
export function artTank(r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const px = Math.cos(a) * r,
      py = Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, "#d98e4a");
  g.addColorStop(1, "#4e2c10");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#241206";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,.3)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.6);
  ctx.lineTo(-r * 0.2, 0);
  ctx.lineTo(-r * 0.6, r * 0.5);
  ctx.moveTo(r * 0.55, -r * 0.5);
  ctx.lineTo(r * 0.25, r * 0.1);
  ctx.stroke();
  ctx.shadowColor = "#ffd75e";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffd75e";
  ctx.fillRect(-r * 0.45, -r * 0.25, r * 0.3, r * 0.16);
  ctx.fillRect(r * 0.15, -r * 0.25, r * 0.3, r * 0.16);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ff9838";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, r * 0.4);
  ctx.lineTo(-r * 0.15, r * 0.55);
  ctx.lineTo(r * 0.1, r * 0.38);
  ctx.lineTo(r * 0.4, r * 0.55);
  ctx.stroke();
}
export function artBoss(r, e) {
  const en = e && (e.enraged || e.hp < e.mhp * 0.5);
  ctx.save();
  ctx.rotate(S.gameT * (en ? 2.4 : 1));
  ctx.strokeStyle = en ? "rgba(255,60,80,.7)" : "rgba(255,46,136,.4)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, (i / 3) * TAU, (i / 3) * TAU + 1.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#ffd75e";
  ctx.strokeStyle = "#8a6a1a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.45);
  ctx.quadraticCurveTo(-r * 1.15, -r * 1.35, -r * 0.3, -r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.65, -r * 0.45);
  ctx.quadraticCurveTo(r * 1.15, -r * 1.35, r * 0.3, -r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r * 1.05);
  g.addColorStop(0, "#ff77b8");
  g.addColorStop(1, en ? "#7e0c26" : "#96164a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3d0716";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#3d0716";
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.45);
  ctx.lineTo(-r * 0.15, -r * 0.2);
  ctx.moveTo(r * 0.6, -r * 0.45);
  ctx.lineTo(r * 0.15, -r * 0.2);
  ctx.stroke();
  ctx.shadowColor = en ? "#ff2e2e" : "#ffd75e";
  ctx.shadowBlur = 10;
  ctx.fillStyle = en ? "#ff5d5d" : "#ffd75e";
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.05, r * 0.16, r * 0.1, -0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.35, -r * 0.05, r * 0.16, r * 0.1, 0.3, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#2b0714";
  ctx.beginPath();
  ctx.arc(0, r * 0.3, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.3 - r * 0.08, r * 0.44);
    ctx.lineTo(i * r * 0.3, r * 0.44 + r * 0.2);
    ctx.lineTo(i * r * 0.3 + r * 0.08, r * 0.44);
    ctx.closePath();
    ctx.fill();
  }
}
export function artSplitter(r) {
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#ffb3e2");
  g.addColorStop(1, "#c2338f");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5c0f44";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  for (let i = 0; i < 4; i++)
    ctx.lineTo(
      i % 2 ? r * 0.2 : -r * 0.2,
      -r * 0.85 + (i + 1) * ((r * 1.7) / 4),
    );
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.15, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.15, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#20060f";
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.12, r * 0.08, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.12, r * 0.08, 0, TAU);
  ctx.fill();
}
export function artOrbiter(r) {
  ctx.strokeStyle = "#6ee7ff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, S.gameT * 3, S.gameT * 3 + TAU * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, S.gameT * 3 + Math.PI, S.gameT * 3 + Math.PI + TAU * 0.8);
  ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
  g.addColorStop(0, "#e6fbff");
  g.addColorStop(1, "#1e7fa8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a2a3d";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffd75e";
  ctx.beginPath();
  ctx.arc(
    Math.cos(S.gameT * 5) * (r + 4),
    Math.sin(S.gameT * 5) * (r + 4),
    2.5,
    0,
    TAU,
  );
  ctx.fill();
}
export function artSniper(r, e) {
  const isElite = e && e.type === "sniper_elite";
  const maxTime = isElite ? 1.8 : 2.8;
  const charge =
    e && e.shT !== undefined && e.shT < maxTime ? clamp(1 - e.shT / maxTime, 0, 1) : 0;
  ctx.fillStyle = "#14100a";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = charge > 0.3 ? (isElite ? "#ff2e52" : "#ff4d6d") : (isElite ? "#ff995e" : "#ffd75e");
  ctx.lineWidth = isElite ? 3.5 : 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 1.25, 0);
  ctx.lineTo(-r * 0.7, 0);
  ctx.moveTo(r * 0.7, 0);
  ctx.lineTo(r * 1.25, 0);
  ctx.moveTo(0, -r * 1.25);
  ctx.lineTo(0, -r * 0.7);
  ctx.moveTo(0, r * 0.7);
  ctx.lineTo(0, r * 1.25);
  ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.55);
  g.addColorStop(0, charge > 0.3 ? (isElite ? "#ff4d4d" : "#ff2e55") : (isElite ? "#ffcc5e" : "#ffd75e"));
  g.addColorStop(1, isElite ? "#4d1a06" : "#3d2c06");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, TAU);
  ctx.fill();
  if (charge > 0) {
    ctx.strokeStyle = `rgba(255,60,90,${charge})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
    ctx.stroke();
  }
}
export function artHealer(r) {
  const pu = 1 + 0.1 * Math.sin(S.gameT * 6);
  ctx.strokeStyle = "rgba(125,255,94,.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, (r + 8) * pu, 0, TAU);
  ctx.stroke();
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, "#eafff0");
  g.addColorStop(1, "#2f9e4f");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#0d5c26";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(-r * 0.16, -r * 0.5, r * 0.32, r);
  ctx.fillRect(-r * 0.5, -r * 0.16, r, r * 0.32);
}
export function artCharger(r, e) {
  const wind = e.st === "wind";
  ctx.save();
  ctx.rotate(Math.atan2(e.dy || 0, e.dx || 1));
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, "#7e3a10");
  g.addColorStop(1, "#ffb35e");
  ctx.fillStyle = wind ? "#ffe9a8" : g;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.7, -r * 0.75);
  ctx.lineTo(-r * 0.3, 0);
  ctx.lineTo(-r * 0.7, r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3d1a06";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.18, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, r * 0.18, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.restore();
}
export function artBoss2(r, e) {
  const en = e.enraged || e.hp < e.mhp * 0.5;
  ctx.fillStyle = "#ffd75e";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.85 + i * ((Math.PI * 0.7) / 4);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
    ctx.lineTo(Math.cos(a + 0.2) * r * 0.85, Math.sin(a + 0.2) * r * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#d98bff");
  g.addColorStop(1, en ? "#5c1a8a" : "#7c3dff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a1050";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#1a0826";
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.62, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (i / 5),
      tx = Math.cos(a) * r * 0.55,
      ty = r * 0.15 + Math.sin(a) * r * 0.55;
    ctx.beginPath();
    ctx.moveTo(tx - 4, ty);
    ctx.lineTo(tx, ty + 9);
    ctx.lineTo(tx + 4, ty);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = en ? "#ff5d5d" : "#ffd75e";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.3, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, r * 0.14, 0, TAU);
  ctx.fill();
}
export function artBoss3(r, e) {
  const en = e.enraged || e.hp < e.mhp * 0.5;
  const wind = e.st === "wind";
  ctx.save();
  if (e.st === "dash") ctx.rotate(Math.atan2(e.dy || 0, e.dx || 1));
  ctx.fillStyle = "#8f1f1f";
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.2);
  ctx.lineTo(-r * 1.4, -r * 0.6);
  ctx.lineTo(-r * 0.5, r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -r * 0.2);
  ctx.lineTo(r * 1.4, -r * 0.6);
  ctx.lineTo(r * 0.5, r * 0.3);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, "#ff7b6b");
  g.addColorStop(1, "#7e1a10");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.85, -r * 0.2);
  ctx.lineTo(r * 0.6, r * 0.8);
  ctx.lineTo(-r * 0.6, r * 0.8);
  ctx.lineTo(-r * 0.85, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3d0706";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffd75e";
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.7);
  ctx.lineTo(-r * 0.9, -r * 1.3);
  ctx.lineTo(-r * 0.25, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.7);
  ctx.lineTo(r * 0.9, -r * 1.3);
  ctx.lineTo(r * 0.25, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = wind ? "#fff" : en ? "#ff5d5d" : "#ffd75e";
  ctx.fillRect(-r * 0.4, -r * 0.25, r * 0.3, r * 0.14);
  ctx.fillRect(r * 0.1, -r * 0.25, r * 0.3, r * 0.14);
  ctx.restore();
}
export function artBoss4(r, e) {
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(S.gameT * 3);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
  g.addColorStop(0, "#0a0618");
  g.addColorStop(0.7, "#2a1050");
  g.addColorStop(1, "#7c3dff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#b04dff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, S.gameT * 2, S.gameT * 2 + 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.3, -S.gameT * 1.5, -S.gameT * 1.5 + 2.5);
  ctx.stroke();
  const ph = e.tp !== undefined && e.tp < 0.8;
  ctx.fillStyle = ph ? "#ff5d5d" : "#e0b3ff";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.35, r * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a0618";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.1, 0, TAU);
  ctx.fill();
}
