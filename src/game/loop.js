/* ================= LOOP PRINCIPAL ================= */
import { S } from "../core/state.js";
import { save } from "../core/save.js";
import { spawnInterval, spawnBatch } from "../core/scaling.js";
import { $ } from "../core/utils.js";
import { updatePlayer } from "./player.js";
import { updateEnemies } from "./enemies.js";
import { fireShots, updateBullets, updateEBullets, updateBombs } from "./bullets.js";
import { updateFoods, updateDrops } from "./food.js";
import { spawnStep } from "./waves.js";
import { waveClear } from "./picks.js";
import { beginPvpChoice, renderPvpChoices } from "./pvppicks.js";
import { isPvp, pvpTick, resolvePvpDeaths, pendingLevelPick, nextLevelPick } from "./pvp.js";
import { updateFx } from "../render/fx.js";
import { updateCamera } from "../render/camera.js";
import { render, renderConnecting } from "../render/render.js";
import { updateHUD } from "../render/hud.js";
import { LIVE, interpolateSnapshot, smoothedView } from "../render/snapshot.js";

export function update(dt) {
  /* PVP tem relógio próprio: não existe onda para limpar, os inimigos nascem
     por tempo e o fim vem da morte de um dos dois (ou da morte súbita aos 20
     minutos). Por isso ele roda ANTES e o bloco de onda abaixo é pulado. */
  if (isPvp()) {
    pvpTick(dt);
    while (pendingLevelPick()) beginPvpChoice(nextLevelPick());
    if (!S.runActive) return;
  }

  if (S.spawnQ > 0) {
    S.spawnT -= dt;
    if (S.spawnT <= 0) {
      S.spawnT = spawnInterval(S.wave);
      for (let i = 0; i < spawnBatch(S.wave) && S.spawnQ > 0; i++) {
        if (!spawnStep()) break;
        S.spawnQ--;
      }
    }
  }

  S.comboT -= dt;
  if (S.comboT <= 0) S.combo = 0;

  for (const p of S.players) {
    if (!p.dead) updatePlayer(p, dt, fireShots);
  }

  updateEnemies(dt);
  updateBullets(dt);
  updateEBullets(dt);
  updateBombs(dt);
  updateFoods(dt);
  updateDrops(dt);
  if (isPvp()) resolvePvpDeaths();

  /* "Matou todo mundo? Onda limpa." não vale no PVP: lá o mapa fica vazio o
     tempo todo entre um nascimento e outro, e isso dispararia a tela de
     escolha de carta a cada dois segundos. */
  if (!isPvp() && S.phase === "play" && S.spawnQ === 0 && S.enemies.length === 0) {
    waveClear();
  }
}

let last = 0, lastHUD = 0;

export function frame(t) {
  requestAnimationFrame(frame);

  // Teto de 0,05s para a aba que volta de segundo plano não simular um salto
  // gigante de uma vez; piso em 0 porque um dt negativo faria o tempo andar
  // para trás (cooldowns subindo, spawns nunca acontecendo).
  const dt = Math.max(0, Math.min(0.05, (t - last) / 1000 || 0.016));
  last = t;

  if ($("#game").classList.contains("hidden")) return;

  S.gameT += dt;

  /* OPÇÃO 2x VELOCIDADE.
     Não dá para simplesmente dobrar o dt: com dt de 0,1s um projétil de 620px/s
     anda 62px por frame e atravessa um inimigo de raio 13 sem nunca testar
     colisão dentro dele. Então em vez de um passo grande, damos DOIS passos
     normais — a física continua com a mesma resolução e só o relógio acelera. */
  if (S.role !== "guest" && S.phase === "play" && !S.paused) {
    const passos = !isPvp() && save.fast ? 2 : 1;
    const substeps = Math.max(1,Math.ceil(dt * 60));
    for (let i=0;i<passos*substeps && S.runActive && S.phase === "play";i++) update(dt/substeps);
  }

  // Efeitos envelhecem SEMPRE, e aqui — nunca mais dentro do render.
  updateFx(dt);
  updateCamera(dt);

  if (S.role === "guest") {
    if (S.rs) {
      // suaviza entre pacotes: sem isso os inimigos "pulam" a cada tick
      interpolateSnapshot(dt);
      render(smoothedView(), dt);
    } else {
      renderConnecting();
    }
  } else {
    render(LIVE(), dt);
  }

  if (t-lastHUD >= 100) { updateHUD(); lastHUD=t; }
  renderPvpChoices();
}

export function startLoop() {
  requestAnimationFrame(frame);
}
