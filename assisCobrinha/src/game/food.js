/* ================= COMIDA, DROPS E BLOCOS ================= */
import { COLS, ROWS, CELL } from "../core/config.js";
import { S } from "../core/state.js";
import { ri, clamp, dist } from "../core/utils.js";
import { sfx } from "../core/audio.js";
import { addParts, addText } from "../render/fx.js";
import { headPx, heal, damagePlayer } from "./player.js";
import { gainXp, isPvp } from "./pvp.js";
import { arenaCellBounds } from "./arena.js";

export function blockAt(x, y) {
  return S.blocks.find((b) => b.x === x && b.y === y);
}

export function addBlock() {
  for (let t = 0; t < 40; t++) {
    const x = ri(1, COLS - 2);
    const y = ri(1, ROWS - 2);
    if (blockAt(x, y) || S.foods.some((f) => f.x === x && f.y === y)) continue;
    const tooClose = S.players.some(
      (p) =>
        !p.dead &&
        Math.abs(p.cells[0][0] - x) + Math.abs(p.cells[0][1] - y) < 4,
    );
    if (tooClose) continue;
    S.blocks.push({ x, y, hp: 6 });
    return;
  }
}

export function spawnFood(normal) {
  const arena = arenaCellBounds(S.finalArena);
  for (let t = 0; t < 40; t++) {
    const x = ri(arena?.x0 ?? 0, (arena?.x1 ?? COLS) - 1);
    const y = ri(arena?.y0 ?? 0, (arena?.y1 ?? ROWS) - 1);
    if (blockAt(x, y) || S.foods.some((f) => f.x === x && f.y === y)) continue;
    let ty = "n";
    if (!normal) {
      const gl = S.players.some((p) => !p.dead && p.goldLuck);
      const gb = S.players.reduce(
        (a, p) => (!p.dead && p.goldBonus ? Math.max(a, p.goldBonus) : a),
        0,
      );
      // O modificador "✨ CHUVA DOURADA" era anunciado no banner e não era
      // lido em lugar nenhum — a onda inteira acontecia sem nenhum efeito.
      const chuva = S.waveMod && S.waveMod.id === "gold";
      const r = Math.random();
      const g = clamp((gl ? 0.4 : 0.16) + gb / 100 + (chuva ? 0.35 : 0), 0, 0.8);
      ty = r < g ? "g" : r < g + 0.18 ? "p" : "n";
    }
    S.foods.push({ x, y, t: ty, mt: 0 });
    return;
  }
}

/** `v` só é usado pelos orbes de experiência do PVP (quanto aquele orbe vale).
    Para coração e alma ele fica undefined, como sempre foi. */
export function spawnDrop(x, y, t, v) {
  S.drops.push({ x, y, t, v, born: S.gameT, life: t === "xp" ? 35 : 12 });
}

/** Chamado pelo stepSnake quando a cabeça entra numa célula. */
export function eatFoodAt(p, nx, ny) {
  for (let i = S.foods.length - 1; i >= 0; i--) {
    const f = S.foods[i];
    if (f.x === nx && f.y === ny) {
      S.foods.splice(i, 1);
      eatFood(p, f);
    }
  }
}

function eatFood(p, f) {
  const Hh = headPx(p);
  if (f.t === "g") {
    S.score += 5;
    if (!isPvp()) S.runSouls += 2;
    p.grow += 2;
    heal(p, 1);
    addText(Hh.x, Hh.y - 16, "+5 ✦", "#ffd75e", 0.9, 16);
    sfx("gold");
    addParts(Hh.x, Hh.y, "#ffd75e", 12);
  } else if (f.t === "p") {
    // Necromante absorve veneno em vez de tomar dano.
    if (p.cls === 3) {
      heal(p, 1);
      addText(Hh.x, Hh.y - 16, "veneno absorvido", "#b04dff", 0.9, 13);
    } else {
      damagePlayer(p, 1);
      sfx("hurt");
    }
  } else {
    S.score += 1;
    p.grow += 1;
    p.apples++;
    sfx("eat");
    if (p.cls === 4 && p.apples % 8 === 0) heal(p, 1);
    if (p.regenMax > 0) {
      p.regenC++;
      if (p.regenC >= p.regenMax) {
        p.regenC = 0;
        heal(p, 1);
      }
    }
  }
}

export function updateFoods(dt) {
  if (isPvp() && S.pvp.sudden) return;
  S.foodT -= dt;
  if (S.foods.length < (isPvp() ? 28 : 5) && S.foodT <= 0) {
    S.foodT = 0.4;
    spawnFood(false);
  }
  /* ---------------- ÍMÃ DE COMIDA ----------------
     O BUG: "a cobra anda muito rápido e a comida puxada pelo ímã não chega até
     ela". Duas causas somadas:

     1. VELOCIDADE. A comida andava uma célula a cada 0,12s fixo — 8,3 células
        por segundo. A cobra base faz 7,1 (p.spd = 140ms por célula), então até
        aí ok; mas cada carta de movimento reduz p.spd, e com o piso antigo de
        70ms a cobra chegava a 14,3 células/s. A comida ficava para trás para
        sempre, perseguindo uma cabeça mais rápida que ela.
        Agora o intervalo é DERIVADO da velocidade do jogador: a comida sempre
        anda ~1,8x mais rápido que quem a está puxando.

     2. COLETA. Comer exigia a cabeça entrar na célula EXATA da comida
        (eatFoodAt, chamado pelo stepSnake). A comida puxada vinha atrás da
        cabeça e nunca ocupava a mesma célula. Agora, para quem tem ímã, existe
        raio de coleta.

     O alcance também virou atributo (p.magnetR) em vez do 170 fixo, para o
     "Campo Magnético" e a tela de status terem o que mostrar. */
  for (let i = S.foods.length - 1; i >= 0; i--) {
    const f = S.foods[i];
    for (const p of S.players) {
      if (p.dead || !p.magnet) continue;
      const Hh = headPx(p);
      const fx = (f.x + 0.5) * CELL;
      const fy = (f.y + 0.5) * CELL;
      const d = dist(fx, fy, Hh.x, Hh.y);

      // Raio de coleta: perto o bastante conta como comido.
      if (d < CELL * 0.9) {
        S.foods.splice(i, 1);
        eatFood(p, f);
        break;
      }

      if (d < (p.magnetR || 190)) {
        f.mt -= dt;
        if (f.mt <= 0) {
          // 1,8x a velocidade da cobra — nunca mais fica para trás.
          f.mt = (p.spd / 1000) * 0.55;
          const tx = Math.floor(Hh.x / CELL);
          const ty = Math.floor(Hh.y / CELL);
          const nx2 = f.x + Math.sign(tx - f.x);
          const ny2 = f.y + Math.sign(ty - f.y);
          if (!blockAt(nx2, ny2)) {
            f.x = nx2;
            f.y = ny2;
          }
        }
        break; // um puxão por frame, do jogador mais próximo
      }
    }
  }
}

export function updateDrops(dt) {
  for (let i = S.drops.length - 1; i >= 0; i--) {
    const f = S.drops[i];
    f.life -= dt;
    if (f.life <= 0) {
      S.drops.splice(i, 1);
      continue;
    }
    for (const p of S.players) {
      if (p.dead) continue;
      const Hh = headPx(p);
      // Drops também: alcance vem de p.magnetR, e a atração acompanha a
      // velocidade da cobra (antes era `dt * 4` fixo e ficava atrás).
      if (p.magnet && dist(f.x, f.y, Hh.x, Hh.y) < (p.magnetR || 190)) {
        const pull = Math.min(1, dt * (4 + 900 / Math.max(1, p.spd)));
        f.x += (Hh.x - f.x) * pull;
        f.y += (Hh.y - f.y) * pull;
      }
      if (dist(f.x, f.y, Hh.x, Hh.y) < 20) {
        S.drops.splice(i, 1);
        if (f.t === "heart") {
          heal(p, 1, true); // coração de chão fura o bloqueio de regeneração
          sfx("gold");
        } else if (f.t === "xp") {
          /* PVP: o orbe fica NO CHÃO e vale para quem chegar primeiro. É de
             propósito que ele não vá direto para quem matou — é o que faz as
             duas cobras disputarem o meio do mapa em vez de cada uma farmar
             sozinha no seu canto. */
          const q = f.v || 2;
          gainXp(p, q);
          addText(f.x, f.y - 12, "+" + q + " XP", "#6fd3ff", 0.8, 14);
          sfx("eat");
        } else {
          S.runSouls += 2;
          S.score += 1;
          addText(f.x, f.y - 12, "+2 almas", "#c9a8ff", 0.8, 13);
          sfx("eat");
        }
        addParts(
          f.x, f.y,
          f.t === "heart" ? "#ff4d6d" : f.t === "xp" ? "#6fd3ff" : "#b04dff",
          10,
        );
        break;
      }
    }
  }
}

/** Remove blocos destruídos. */
export function cleanupBlocks() {
  for (let i = S.blocks.length - 1; i >= 0; i--) {
    if (S.blocks[i].hp <= 0) {
      const b = S.blocks[i];
      S.blocks.splice(i, 1);
      addParts((b.x + 0.5) * CELL, (b.y + 0.5) * CELL, "#a86bff", 10);
    }
  }
}
