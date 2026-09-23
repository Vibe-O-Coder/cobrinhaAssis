import { ctx } from "./canvas.js";
import { VP } from "./viewport.js";
import { W, H, CELL } from "../core/config.js";
import { clamp } from "../core/utils.js";
import { isBoss } from "../data/enemies.js";

export function minimapBounds(v) {
  if (v.finalArena) return v.finalArena;
  const a = v.pvp?.arena;
  if (a) return { x: a.x0 * CELL, y: a.y0 * CELL, w: (a.x1-a.x0)*CELL, h: (a.y1-a.y0)*CELL };
  return { x: 0, y: 0, w: W, h: H };
}

// Dados de radar incluem inimigos fora da câmera, sem transmitir suas fichas.
export function radarPoints(enemies) {
  return enemies.filter(e => e.hp > 0).map(e => [Math.round(e.x), Math.round(e.y), isBoss(e.type) ? 2 : e.elite ? 1 : 0]);
}

export function drawMinimap(v, view = VP) {
  const b = minimapBounds(v);
  const w = clamp(VP.w * 0.16, 92, 144), h = w * b.h / b.w;
  const bossRows = Math.min(3, (v.enemies || []).filter(e => e.hp > 0 && isBoss(e.type)).length);
  const x = 14, y = 38 + bossRows * 40;
  const px = n => x + clamp((n-b.x)/b.w, 0, 1)*w;
  const py = n => y + clamp((n-b.y)/b.h, 0, 1)*h;
  ctx.save();
  ctx.fillStyle = "rgba(8,5,20,.86)";
  ctx.fillRect(x-5, y-23, w+10, h+44);
  ctx.strokeStyle = "rgba(185,168,255,.7)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x-5, y-23, w+10, h+44);
  ctx.font = "bold 11px Rajdhani";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#e8e2ff";
  ctx.fillText(v.finalArena ? "VAZIO ∞" : "MINIMAPA", x, y-11);
  ctx.save();
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.fillStyle = "rgba(165,143,245,.18)";
  ctx.fillRect(px(VP.cam.x), py(VP.cam.y), view.w/b.w*w, view.h/b.h*h);
  ctx.strokeStyle = "rgba(201,181,255,.65)";
  ctx.strokeRect(x+(VP.cam.x-b.x)/b.w*w, y+(VP.cam.y-b.y)/b.h*h, view.w/b.w*w, view.h/b.h*h);
  for (const f of v.foods || []) {
    ctx.fillStyle = f.t === "g" ? "#ffd75e" : "#75d692";
    ctx.fillRect(px((f.x+.5)*CELL)-1, py((f.y+.5)*CELL)-1, 2, 2);
  }
  for (const [ex,ey,kind] of v.radar || radarPoints(v.enemies || [])) {
    ctx.fillStyle = kind === 2 ? "#ffcb64" : kind === 1 ? "#ff82ba" : "#f15472";
    const size = kind === 2 ? 4 : kind === 1 ? 2.5 : 1.5;
    if (kind === 2) {
      const cx=px(ex),cy=py(ey);
      ctx.beginPath();ctx.moveTo(cx,cy-size);ctx.lineTo(cx+size,cy);ctx.lineTo(cx,cy+size);ctx.lineTo(cx-size,cy);ctx.closePath();ctx.fill();
    } else ctx.fillRect(px(ex)-size/2,py(ey)-size/2,size,size);
  }
  for (const p of v.players || []) {
    if (p.dead || !p.cells?.[0]) continue;
    const cx=px((p.cells[0][0]+.5)*CELL), cy=py((p.cells[0][1]+.5)*CELL);
    ctx.fillStyle = p.idx === VP.who ? "#fff" : "#6fe6ff";
    ctx.beginPath();ctx.arc(cx,cy,3.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#0b0619";ctx.lineWidth=1.5;ctx.stroke();
    ctx.font="bold 10px Rajdhani";ctx.fillText(String(p.idx+1),cx+5,cy);
  }
  ctx.restore();
  ctx.font="10px Rajdhani";ctx.fillStyle="#cdc2ed";
  ctx.fillText("● você  ◆ chefe  · horda",x,y+h+11);
  ctx.restore();
}
