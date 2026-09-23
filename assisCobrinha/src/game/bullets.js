/* ================= PROJÉTEIS E BOMBAS ================= */
import { W, H, CELL } from "../core/config.js";
import { S } from "../core/state.js";
import { dist } from "../core/utils.js";
import { sfx } from "../core/audio.js";
import { addParts, addText, shockwave } from "../render/fx.js";
import { blockAt, spawnFood } from "./food.js";
import { headPx, lifestealHeal, hitPlayer } from "./player.js";
import { bulletDmg } from "./stats.js";
import { cleanupEnemies, explode } from "./enemies.js";
import { isBoss } from "../data/enemies.js";
import { blockRegen, weaken } from "./player.js";
import { chainLightning } from "./classes.js";
import { slowEnemy, stunEnemy, curseEnemy } from "./enemies.js";
import { isPvp, pvpBulletHit, pvpHit } from "./pvp.js";

/** Afixos que o projétil inimigo carrega (ver game/enemies.js). */
function applyBulletAffix(aff, p) {
  if (aff.includes("noregen")) blockRegen(p, 4);
  if (aff.includes("weaken")) weaken(p, 6);
}

export function fireShots(p, Hh, tgt) {
  const base = Math.atan2(tgt.y - Hh.y, tgt.x - Hh.x);
  const n = p.shots;
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * 0.16;
    const crit = Math.random() < p.crit;
    S.pbullets.push({
      x: Hh.x, y: Hh.y,
      vx: Math.cos(a) * 460,
      vy: Math.sin(a) * 460,
      dmg: bulletDmg(p) * (crit ? p.critDmg : 1),
      pierce: p.pierce,
      venom: p.venom,
      ls: p.ls,
      owner: p,
      color: p.color,
      crit,
      life: 1.4,
      hits: [],
    });
  }
  sfx("shoot");
}

export function hitEnemy(e, b) {
  if (e.hp <= 0) return; // já morreu neste frame — não conta duas vezes
  /* A aura do Guardião reduz o dano recebido. Ela era aplicada em explosões e
     espinhos, mas NÃO nos tiros — que são de longe a principal fonte de dano.
     Na prática o Guardião quase não protegia ninguém. */
  // Ultimates de maldição dobram o dano recebido durante o efeito.
  const mald = e.cursedT > 0 ? 2 : 1;
  const dmg = b.dmg * (1 - (e.ward || 0)) * mald;
  e.hp -= dmg;
  e.flash = 0.12;
  e.lastHitBy = b.owner;
  if (!e.anchored) {
    e.x += b.vx * 0.012;
    e.y += b.vy * 0.012;
  }
  addText(
    e.x, e.y - e.r - 8,
    (b.crit ? "✦" : "") + Math.round(dmg * 10) / 10,
    // azul = protegido pelo Guardião · roxo = amaldiçoado (dano dobrado)
    e.cursedT > 0 ? "#a29bfe" : e.ward > 0 ? "#8fa8ff" : b.crit ? "#ffd75e" : "#fff",
    0.6,
    b.crit ? 15 : 12,
  );
  if (b.venom > 0) {
    e.dot = Math.max(e.dot, b.venom);
    e.dotT = 3;
  }
  if (b.ultimateStatus === "stun") stunEnemy(e, b.ultimateDuration || 1);
  if (b.ultimateStatus === "slow" || b.ultimateStatus === "pull") slowEnemy(e, b.ultimateDuration || 1, .45);
  if (b.ultimateStatus === "curse") curseEnemy(e, b.ultimateDuration || 1);
  if (b.ls > 0 && Math.random() < b.ls && b.owner) lifestealHeal(b.owner);
  /* Execução nunca vale em chefe: um chefe de 40 mil de vida morria de graça
     ao cair abaixo de 25%, o que apagava a fase final da luta. */
  if (b.owner && b.owner.exec && !isBoss(e.type) && e.hp > 0 && e.hp < e.mhp * 0.25) {
    e.hp = 0;
  }

  /* Passivas de classe que dependem do ACERTO. Ficam aqui porque este é o
     único ponto por onde todo projétil do jogador passa. */
  const o = b.owner;
  if (o) {
    // ❄️ Criomante: todo tiro gela um pouco
    // 🧊 Permafrost aumenta duração e intensidade do gelo
    if (o.cls === 8) slowEnemy(e, 2.5 * (1 + (o.xIce || 0)), 0.4 + (o.xIce || 0) * 0.12);
    // ⛈️ Tempestade: o tiro salta para até 3 inimigos próximos
    if (o.cls === 14 && e.hp > 0) chainLightning(o, e, dmg);
  }
}

export function updateBullets(dt) {
  for (let i = S.pbullets.length - 1; i >= 0; i--) {
    const b = S.pbullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead =
      b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;

    const bl = blockAt(Math.floor(b.x / CELL), Math.floor(b.y / CELL));
    if (!dead && bl) {
      bl.hp -= b.dmg;
      addParts(b.x, b.y, "#a86bff", 4);
      dead = true;
    }

    if (!dead) {
      for (const e of S.enemies) {
        if (e.hp <= 0) continue;
        if (b.hits.includes(e.id)) continue;
        if (dist(b.x, b.y, e.x, e.y) < e.r + 6) {
          b.hits.push(e.id);
          hitEnemy(e, b);
          if (b.pierce > 0) b.pierce--;
          else dead = true;
          if (dead) break;
        }
      }
    }

    /* PVP: o tiro do jogador também acerta o OUTRO jogador — e só a cabeça,
       a mesma regra que o projétil inimigo sempre teve ("projéteis só acertam
       a cabeça", na tela de como jogar). Acertar o corpo faria a cobra longa
       ser um alvo gigante e o duelo viraria sorteio de tamanho.

       Perfuração não vale aqui: o projétil morre no jogador. Um tiro
       perfurante que atravessasse a cabeça e continuasse acertaria de novo no
       frame seguinte, e a i-frame de 0,25s seria o único freio. */
    if (!dead && isPvp()) {
      for (const q of S.players) {
        if (q.dead || q === b.owner) continue;
        const h = headPx(q);
        if (dist(b.x, b.y, h.x, h.y) < 13) {
          const hp = q.hp, guard = q.guard;
          pvpBulletHit(q, b);
          if (b.ultimateStatus && (q.hp < hp || q.guard < guard)) q.pvpSlowT = Math.max(q.pvpSlowT || 0, Math.min(1.2, b.ultimateDuration || .5));
          dead = true;
          break;
        }
      }
    }

    if (dead) S.pbullets.splice(i, 1);
  }

  // Blocos destruídos viram pontos e às vezes comida.
  for (let i = S.blocks.length - 1; i >= 0; i--) {
    if (S.blocks[i].hp <= 0) {
      const b = S.blocks[i];
      S.score += 1;
      addParts((b.x + 0.5) * CELL, (b.y + 0.5) * CELL, "#a86bff", 12);
      if (Math.random() < 0.35) spawnFood(false);
      S.blocks.splice(i, 1);
    }
  }

  cleanupEnemies();
}

export function updateEBullets(dt) {
  for (let i = S.ebullets.length - 1; i >= 0; i--) {
    const b = S.ebullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    // Projéteis "curvos" (alguns chefes) giram devagar em direção ao alvo.
    if (b.turn) {
      const tgtP = S.players.find((p) => !p.dead);
      if (tgtP) {
        const Hh = headPx(tgtP);
        const want = Math.atan2(Hh.y - b.y, Hh.x - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        let d = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const sp = Math.hypot(b.vx, b.vy);
        const na = cur + Math.sign(d) * Math.min(Math.abs(d), b.turn * dt);
        b.vx = Math.cos(na) * sp;
        b.vy = Math.sin(na) * sp;
      }
    }

    let dead =
      b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30;

    if (!dead) {
      for (const p of S.players) {
        if (p.dead) continue;
        const h = headPx(p);
        if (dist(b.x, b.y, h.x, h.y) < (b.r || 6) + 11) {
          const hpAntes = p.hp;
          hitPlayer(p);
          /* O projétil carrega os afixos de quem atirou: um atirador Corrosivo
             enfraquece de longe, não só no corpo a corpo. */
          if (p.hp < hpAntes && b.aff) applyBulletAffix(b.aff, p);
          dead = true;
          break;
        }
      }
    }
    if (dead) S.ebullets.splice(i, 1);
  }
}

export function updateBombs(dt) {
  for (let i = S.bombs.length - 1; i >= 0; i--) {
    const b = S.bombs[i];
    b.t -= dt;
    if (b.t <= 0) {
      S.bombs.splice(i, 1);
      explode(b.x, b.y, b.r, b.dmg, b.owner);
      if (b.ultimateStatus) for (const e of S.enemies) {
        if (e.hp <= 0 || dist(b.x,b.y,e.x,e.y)>b.r+e.r) continue;
        if (b.ultimateStatus === 'slow') slowEnemy(e,b.ultimateDuration,.45);
        if (b.ultimateStatus === 'stun') stunEnemy(e,b.ultimateDuration);
        if (b.ultimateStatus === 'curse') curseEnemy(e,b.ultimateDuration);
      }
      shockwave(b.x, b.y, b.r * 1.3, "#ff9838", 12);
      S.flash = Math.max(S.flash, 0.22);
      S.shake = Math.min(18, S.shake + 10);
      if (isPvp() && b.owner && !b.hostile) {
        for (const p of S.players) {
          if (p.dead || p === b.owner) continue;
          const h=headPx(p);
          if (dist(b.x,b.y,h.x,h.y)<b.r && pvpHit(p,b.dmg,b.owner,"ability")>0 && b.ultimateStatus) p.pvpSlowT=Math.max(p.pvpSlowT||0,Math.min(1.2,b.ultimateDuration));
        }
      }
      // Bomba inimiga também machuca o jogador.
      if (b.hostile) {
        for (const p of S.players) {
          if (p.dead) continue;
          const h = headPx(p);
          if (dist(b.x, b.y, h.x, h.y) < b.r) hitPlayer(p);
        }
      }
    }
  }
}
