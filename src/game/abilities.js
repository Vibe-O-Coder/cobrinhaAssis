/* ================= HABILIDADES ESPECIAIS ================= */
import { COLS, ROWS, CELL, TAU, W, H } from "../core/config.js";
import { S } from "../core/state.js";
import { rnd, dist, clamp } from "../core/utils.js";
import { EDEF } from "../data/enemies.js";
import { sfx } from "../core/audio.js";
import {
  addParts, addText, shockwave, ring, vortex, drain, aura, shadow,
  bombWarning, shieldFx, quake,
} from "../render/fx.js";
import { headPx, heal, revive } from "./player.js";
import { toast } from "../ui/screens.js";
import { classAbility } from "./classes.js";
import { bulletDmg } from "./stats.js";
import { cleanupEnemies } from "./enemies.js";

import { isPvp } from "./pvp.js";
import { usePvpAbility } from "./pvpabilities.js";
import { applyUltimate } from './ultimates.js';
import { ultimateCooldown } from '../data/ultimates.js';

export function tryAbility(p) {
  if (S.phase !== "play" || S.paused || S.qte || !S.runActive) return;
  if (!p || p.dead || p.abT > 0 || p.silenceT>0 || p.staggerT>0) return;
  useAbility(p);
}

/** Empurra um inimigo para longe de (ox,oy) com força `force` em pixels.
    A versão antiga fazia `push = (160-d)/d` e depois multiplicava por
    `(e.x-ox)/d * 50` — dividindo por `d` DUAS vezes. Com o inimigo colado
    (d≈5) isso dava um deslocamento de ~1500px e arremessava o bicho para fora
    do mapa. Agora o vetor é normalizado uma vez só. */
function knockback(e, ox, oy, force) {
  if (e.anchored) return;
  const d = dist(ox, oy, e.x, e.y) || 1;
  const ux = (e.x - ox) / d;
  const uy = (e.y - oy) / d;
  e.x = clamp(e.x + ux * force, -20, W + 20);
  e.y = clamp(e.y + uy * force, -20, H + 20);
}

function hurt(e, dmg, p) {
  e.hp -= dmg * (1 - (e.ward || 0));
  e.flash = 0.2;
  e.lastHitBy = p;
}

export function useAbility(p) {
  if (isPvp()) { sfx("ab"); usePvpAbility(p); return; }
  const Hh = headPx(p);
  p.abT = ultimateCooldown(p);
  sfx("ab");

  /* As seis classes originais são um efeito instantâneo e ficam aqui.
     As dez novas têm estado que evolui entre frames e moram em classes.js. */
  if (p.cls >= 6) {
    classAbility(p);
    applyUltimate(p);
    return;
  }

  switch (p.cls) {
    /* ⚔️ Guerreiro — Giro Mortal */
    case 0: {
      const R = 170 + (p.xSpin || 0); // 🌀 Ciclone
      addParts(Hh.x, Hh.y, "#ff5252", 38, 4);
      addParts(Hh.x, Hh.y, "#ff9838", 30, 3);
      S.shake = Math.min(18, S.shake + 9);
      S.flash = 0.18;
      shockwave(Hh.x, Hh.y, R + 40, "#ff5252", 10);
      shockwave(Hh.x, Hh.y, R, "#ffd75e", 5);
      quake(Hh.x, Hh.y, R, "#ff9838");
      for (const e of S.enemies) {
        if (e.hp <= 0) continue;
        const d = dist(Hh.x, Hh.y, e.x, e.y);
        if (d < R + e.r) {
          hurt(e, bulletDmg(p) * 5 + p.boom * 0.3, p);
          // força maior quanto mais perto, mas limitada
          knockback(e, Hh.x, Hh.y, clamp(((R - d) / R) * 90, 10, 90));
          addParts(e.x, e.y, (EDEF[e.type] || {}).c || "#ff5d7f", 8);
        }
      }
      cleanupEnemies();
      break;
    }

    /* 🔮 Mago — Nova Arcana */
    case 1: {
      ring(Hh.x, Hh.y, 220, "#7c6bff", 5);
      ring(Hh.x, Hh.y, 140, "#b04dff", 3);
      const n = 12 + (p.xNova || 0); // ✨ Nova Gêmea
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const crit = Math.random() < p.crit;
        S.pbullets.push({
          x: Hh.x, y: Hh.y,
          vx: Math.cos(a) * 450,
          vy: Math.sin(a) * 450,
          dmg: bulletDmg(p) * 2.2 * (crit ? p.critDmg : 1),
          pierce: p.pierce + 1,
          venom: p.venom,
          ls: p.ls,
          owner: p,
          color: p.color,
          crit,
          life: 1.4,
          hits: [],
          trail: true,
        });
      }
      addParts(Hh.x, Hh.y, "#7c6bff", 32, 3);
      addParts(Hh.x, Hh.y, "#b04dff", 24, 2);
      S.flash = 0.12;
      break;
    }

    /* 🗡️ Assassino — Passo Sombrio */
    case 2: {
      const h = p.cells[0];
      let nx = h[0], ny = h[1];
      const passos = 5 + (p.xStep || 0); // 🌑 Sombra Longa
      for (let i = 0; i < passos; i++) {
        nx = (nx + p.dir.x + COLS) % COLS;
        ny = (ny + p.dir.y + ROWS) % ROWS;
        p.cells.unshift([nx, ny]);
        p.cells.pop();
        shadow((nx + 0.5) * CELL, (ny + 0.5) * CELL, CELL * 0.7, "rgba(77,255,166,0.45)");
      }
      p.iframes = Math.max(p.iframes, 0.8);
      const Nh = headPx(p);
      addParts(Nh.x, Nh.y, "#4dffa6", 26, 3);
      addParts(Nh.x, Nh.y, "#7dff5e", 20, 2);
      shockwave(Nh.x, Nh.y, 130, "#4dffa6", 6);
      S.flash = 0.1;
      for (const e of S.enemies) {
        if (e.hp <= 0) continue;
        if (dist(Nh.x, Nh.y, e.x, e.y) < 110 + e.r) {
          hurt(e, bulletDmg(p) * 5 + p.venom * 0.2, p);
          e.dot = Math.max(e.dot, Math.max(1, p.venom * 0.5));
          e.dotT = 2.4;
        }
      }
      cleanupEnemies();
      break;
    }

    /* 💀 Necromante — Colheita Sombria (NERFADO: raio 190 -> 150)

       RESSURREIÇÃO NO CO-OP (pedido): se o parceiro está caído, a Colheita
       deixa de ser dano e vira revival. Faz sentido para a classe e resolve o
       pior momento do co-op — antes, quem morria ficava olhando a tela até a
       onda seguinte, e o outro jogava sozinho contra uma onda dimensionada
       para dois. */
    case 3: {
      const caido = S.players.find((q) => q !== p && q.dead);
      if (caido) {
        revive(caido, Math.max(2, Math.ceil(caido.maxHp * 0.5)));
        vortex(Hh.x, Hh.y, 220, "#b04dff");
        const Ch = headPx(caido);
        drain(Hh.x, Hh.y, Ch.x, Ch.y, "#b04dff");
        addParts(Ch.x, Ch.y, "#b04dff", 34, 3);
        shockwave(Ch.x, Ch.y, 200, "#b04dff", 10);
        addText(Ch.x, Ch.y - 34, "DE VOLTA DOS MORTOS!", "#b04dff", 1.8, 18);
        toast("💀 " + p.name + " reergueu " + caido.name + "!");
        S.flash = 0.3;
        break;
      }

      let hits = 0;
      const R = 150;
      vortex(Hh.x, Hh.y, R, "#b04dff");
      addParts(Hh.x, Hh.y, "#b04dff", 30, 3);
      addParts(Hh.x, Hh.y, "#7c6bff", 24, 2);
      for (const e of S.enemies) {
        if (e.hp <= 0) continue;
        if (dist(Hh.x, Hh.y, e.x, e.y) < R + e.r) {
          hurt(e, bulletDmg(p) * 4 + p.venom * 0.3, p);
          hits++;
          drain(e.x, e.y, Hh.x, Hh.y, "#b04dff");
        }
      }
      // NERFADO: exige 3 acertos (era 2). 🕯️ Pacto dos Mortos derruba para 1.
      if (hits >= (p.xHarvest ? 1 : 3)) {
        heal(p, 1);
        addText(Hh.x, Hh.y - 30, "❤️ DRENADO!", "#7dff5e", 0.9, 14);
      }
      cleanupEnemies();
      break;
    }

    /* 🛡️ Paladino — Égide Divina */
    case 4: {
      p.shieldT = 3.5 + (p.xAegis || 0); // 🌟 Égide Longa
      aura(Hh.x, Hh.y, 140, "#ffd75e");
      shieldFx(Hh.x, Hh.y, 46, 3.5, "rgba(255,215,94,0.32)", p);
      addParts(Hh.x, Hh.y, "#ffd75e", 34, 3);
      addParts(Hh.x, Hh.y, "#ff9838", 26, 2);
      shockwave(Hh.x, Hh.y, 150, "#ffd75e", 8);
      for (const e of S.enemies) {
        if (e.hp <= 0) continue;
        const d = dist(Hh.x, Hh.y, e.x, e.y);
        if (d < 120 + e.r) {
          hurt(e, bulletDmg(p) * 3, p);
          knockback(e, Hh.x, Hh.y, 55);
        }
      }
      cleanupEnemies();
      break;
    }

    /* 💣 Bombardeiro — Bomba Ambulante (BUFFADO) */
    case 5: {
      const dmg = bulletDmg(p) * 8 + p.boom * 0.9;
      const r = 140 + p.boomR * 0.5;
      // 🧨 Carga Dupla: bombas extras caem em volta
      const nb = 1 + (p.xBomb || 0);
      for (let i = 0; i < nb; i++) {
        const off = i === 0 ? { x: 0, y: 0 } : { x: rnd(-70, 70), y: rnd(-70, 70) };
        S.bombs.push({ x: Hh.x + off.x, y: Hh.y + off.y, t: 1.2, r, dmg, owner: p, mega: true });
        bombWarning(Hh.x + off.x, Hh.y + off.y, r, 1.2, "rgba(255,82,82,0.4)");
      }
      addParts(Hh.x, Hh.y, "#ff5252", 22, 2);
      break;
    }
  }
  applyUltimate(p);
}
