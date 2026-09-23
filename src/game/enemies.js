/* ================= INIMIGOS: IA, MORTE E EXPLOSÕES ================= */
import { W, H, TAU, CELL } from "../core/config.js";
import { S } from "../core/state.js";
import { rnd, dist, clamp } from "../core/utils.js";
import { EDEF, isBoss, AFFIXES } from "../data/enemies.js";
import { MODE } from "../data/modes.js";
import { sfx } from "../core/audio.js";
import {
  addParts, addText, shockwave, aim, beam, quake, ring, bombWarning, drain,
} from "../render/fx.js";
import {
  headPx, headVel, nearestPlayer, heal, hitPlayer, blockRegen, weaken,
} from "./player.js";
import { spawnDrop } from "./food.js";
import { stackHpMul, stackXpMul, stackEnemyCap } from "../data/pvp.js";
import { isPvp } from "./pvp.js";
import { banner } from "../ui/screens.js";
import { MAX_ENEMIES, MAX_ENEMY_BULLETS, scaledEnemyHp, enemySpdMul } from "../core/scaling.js";
import { updateBoss, tickBossHazards, protectBossPhase, bossSynergy, addEnemyHazard } from "./bosses.js";

/* ---------------- helpers ---------------- */

/* Quem está atirando AGORA. runPattern é síncrono e é o único caminho que cria
   projétil inimigo, então isto é suficiente para o tiro carregar os afixos de
   quem o disparou — sem ter que passar o inimigo em 30 chamadas de eb(). */
let shooting = null;

function eb(x, y, ang, sp, o = {}) {
  if (S.ebullets.length >= MAX_ENEMY_BULLETS) return;
  S.ebullets.push({
    x, y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    life: o.life ?? 4,
    r: o.r ?? 6,
    c: o.c,
    trail: o.trail,
    turn: o.turn,
    aff: o.aff || (shooting && shooting.affixes) || null,
  });
}

function radial(e, n, sp, o = {}) {
  const off = o.off ?? rnd(0, TAU);
  for (let i = 0; i < n; i++) eb(e.x, e.y, off + (i / n) * TAU, sp, o);
}

function fan(e, ang, n, spread, sp, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * spread;
    eb(e.x, e.y, a, sp, o);
  }
}

export function newMinion(x, y) {
  const d = EDEF.mini;
  const stacks = isPvp() ? S.pvp.stacks : 0;
  const hp = isPvp() ? d.hp * stackHpMul(stacks) : scaledEnemyHp(d, S.wave, S.players) * 0.7;
  return {
    id: S.eid++, type: "mini", x, y,
    pvpXp: Math.round(2 * stackXpMul(stacks)),
    hp, mhp: hp, spd: d.spd * (isPvp() ? 1 + stacks * 0.012 : enemySpdMul(S.wave)), r: d.r, score: d.score,
    shT: 99, flash: 0, dot: 0, dotT: 0, lastHitBy: null,
    elite: false, enraged: false, ward: 0, tier: 0, affixes: [],
  };
}

/* ================= ESTADOS DE INIMIGO =================
   Gelo, atordoamento e maldição — o que as classes novas precisam para existir.

   São três coisas diferentes de propósito:
     slow   diminui a velocidade (Criomante, Cronomante) — ainda age e atira
     stun   congela a AÇÃO inteira (Chocalho da Cascavel, Zero Absoluto)
     cursed recebe o DOBRO de dano (ultimates de maldição)

   Chefe leva metade do tempo de atordoamento; sem isso um Chocalho a cada 10s
   travaria a luta de chefe inteira e apagaria todo o moveset que acabou de ser
   escrito. */
export function slowEnemy(e, secs, factor) {
  if (!e || e.hp <= 0) return;
  e.slowT = Math.max(e.slowT || 0, secs);
  e.slowF = Math.max(e.slowF || 0, Math.min(0.85, factor));
}

export function stunEnemy(e, secs) {
  if (!e || e.hp <= 0) return;
  const s = isBoss(e.type) ? secs * 0.5 : secs;
  e.stunT = Math.max(e.stunT || 0, s);
}

export function curseEnemy(e, secs) {
  if (!e || e.hp <= 0) return;
  e.cursedT = Math.max(e.cursedT || 0, secs);
}

/** O inimigo tem este afixo? */
export function has(e, k) {
  return !!(e.affixes && e.affixes.includes(k));
}

/* O que o afixo faz QUANDO O INIMIGO TE ACERTA. Chamado tanto pelo contato
   quanto pelos projéteis dele — senão um atirador "Corrosivo" seria idêntico a
   um atirador comum, que é exatamente a crítica de "só joga projétil". */
export function onEnemyHitPlayer(e, p) {
  if (!e || !p || p.dead) return;
  if (has(e, "noregen")) blockRegen(p, isBoss(e.type) ? 14 : 4);
  if (has(e, "weaken")) weaken(p, 6);
}

/* ---------------- ciclo de vida ----------------
   O `cleaning` existe porque onEnemyDeath -> explode -> cleanupEnemies
   reentrava no mesmo laço e lia enemies[i] fora dos limites
   ("Cannot read properties of undefined (reading 'hp')"), derrubando o
   restante do update() naquele frame. Agora a reentrada é ignorada e o laço
   de fora recomeça a varredura, então cascatas de explosão são seguras. */

let cleaning = false;

export function cleanupEnemies() {
  if (cleaning) return;
  cleaning = true;
  try {
    for (let guard = 0; guard < MAX_ENEMIES * 6; guard++) {
      let found = false;
      for (let i = S.enemies.length - 1; i >= 0; i--) {
        const e = S.enemies[i];
        if (e) protectBossPhase(e); // inclui dano das explosões encadeadas desta varredura
        if (!e || e.hp > 0) continue;
        S.enemies.splice(i, 1);
        onEnemyDeath(e);
        found = true;
        break; // o array mudou — recomeça a varredura
      }
      if (!found) break;
    }
  } finally {
    cleaning = false;
  }
}

function onEnemyDeath(e) {
  S.kills++;
  S.combo++;
  S.comboT = 3;
  S.comboMax = Math.max(S.comboMax, S.combo);
  S.score += Math.round(e.score * (1 + Math.min(S.combo, 25) * 0.1));
  if (S.combo >= 3) {
    addText(e.x, e.y - e.r - 24, "COMBO x" + S.combo, "#ff9838", 0.7, 13);
  }

  const p = e.lastHitBy;
  if (p) {
    p.kills++;
    /* NERF DO NECROMANTE: cura a cada 14 abates (era 10). Com explosão em
       cadeia numa onda de 40 inimigos, 10 abates era cura garantida várias
       vezes por onda — a classe se curava mais rápido do que tomava dano. */
    if (p.cls === 3) {
      p.necroC++;
      if (p.necroC >= 14) { p.necroC = 0; heal(p, 1); }
    }
    if (p.killHeal > 0) {
      p.kc++;
      if (p.kc >= p.killHeal) { p.kc = 0; heal(p, 1); }
    }
  }

  const def = EDEF[e.type] || EDEF.grunter;
  addParts(e.x, e.y, def.c, 14);
  sfx("kill");

  // AFIXO "Instável": deixa um presente ao morrer.
  if (has(e, "explosive")) {
    const r = 70 + (e.tier || 0) * 14;
    shockwave(e.x, e.y, r, "#ff9838", 7);
    for (const q of S.players) {
      if (q.dead) continue;
      const h = headPx(q);
      if (dist(e.x, e.y, h.x, h.y) < r) hitPlayer(q);
    }
  }
  // AFIXO "Vingativo": os colegas por perto ficam furiosos.
  if (has(e, "vengeful")) {
    let n = 0;
    for (const o of S.enemies) {
      if (o === e || o.hp <= 0) continue;
      if (dist(e.x, e.y, o.x, o.y) < 220) {
        o.rageT = Math.max(o.rageT || 0, 4);
        n++;
      }
    }
    if (n) {
      ring(e.x, e.y, 220, "#ff5252", 4);
      addText(e.x, e.y - e.r - 20, "VINGANÇA!", "#ff5252", 0.9, 14);
    }
  }

  if (e.type.startsWith("splitter")) {
    const n = e.type === "splitter_abissal" ? 3 : 2;
    for (let k = 0; k < n; k++) {
      if (S.enemies.length >= MAX_ENEMIES) break;
      if (isPvp() && S.enemies.length >= stackEnemyCap(S.pvp.stacks)) break;
      S.enemies.push(newMinion(e.x + rnd(-12, 12), e.y + rnd(-12, 12)));
    }
  }

  // Bombardeiro inimigo explode ao morrer, tenha chegado no jogador ou não.
  if (e.type.startsWith("bomber")) {
    const r = 90 + (e.tier || 0) * 25;
    bombWarning(e.x, e.y, r, 0.18, "rgba(255,179,0,0.5)");
    shockwave(e.x, e.y, r, "#ffb300", 9);
    for (const q of S.players) {
      if (q.dead) continue;
      const h = headPx(q);
      if (dist(e.x, e.y, h.x, h.y) < r) hitPlayer(q);
    }
    S.shake = Math.min(16, S.shake + 7);
  }

  /* PVP: inimigo não derruba alma, derruba EXPERIÊNCIA.

     O orbe fica no chão e vale para quem pegar, não para quem matou — é o que
     transforma o centro do mapa em território disputado em vez de duas
     fazendas separadas. O elite e o chefe espalham vários orbes, porque um
     orbe gordo sozinho seria decidido por quem estava mais perto na hora, e
     não por quem brigou pelo espaço. */
  if (isPvp()) {
    const q = e.pvpXp || 2;
    if (isBoss(e.type)) {
      spawnDrop(e.x, e.y, "heart");
      for (let k = 0; k < 6; k++) {
        spawnDrop(e.x + rnd(-40, 40), e.y + rnd(-40, 40), "xp", Math.ceil(q * 1.5));
      }
      S.shake = 14;
      shockwave(e.x, e.y, 260, def.c, 14);
    } else if (e.elite) {
      for (let k = 0; k < 3; k++) {
        spawnDrop(e.x + rnd(-20, 20), e.y + rnd(-20, 20), "xp", q);
      }
      if (Math.random() < 0.4) spawnDrop(e.x, e.y, "heart");
    } else {
      spawnDrop(e.x, e.y, "xp", q);
      const ferido = S.players.some((qq) => !qq.dead && qq.hp < qq.maxHp * 0.6);
      if (Math.random() < (ferido ? 0.1 : 0.03)) spawnDrop(e.x, e.y, "heart");
    }
  } else if (isBoss(e.type)) {
    spawnDrop(e.x, e.y, "heart");
    spawnDrop(e.x - 24, e.y + 10, "soul");
    spawnDrop(e.x + 24, e.y + 10, "soul");
    S.runSouls += 5;
    S.shake = 14;
    shockwave(e.x, e.y, 260, def.c, 14);
    banner("💀 CHEFE DERROTADO", "+5 almas");
    if (def.final) S.victory = true;
  } else if (e.elite) {
    spawnDrop(e.x, e.y, "soul");
    if (Math.random() < 0.5) {
      spawnDrop(e.x + rnd(-14, 14), e.y + rnd(-14, 14), "heart");
    }
  } else {
    if (Math.random() < 0.3) spawnDrop(e.x, e.y, "soul");
    const hurt = S.players.some((q) => !q.dead && q.hp < q.maxHp);
    if (Math.random() < (hurt ? 0.18 : 0.06)) spawnDrop(e.x, e.y, "heart");
  }

  if (p && p.boom > 0) {
    explode(e.x, e.y, p.boomR + (isBoss(e.type) ? 40 : 0), p.boom, p);
  }
}

export function explode(x, y, r, dmg, p) {
  addParts(x, y, "#ff9838", 26, 4);
  addParts(x, y, "#ffd75e", 14, 3);
  shockwave(x, y, r, "#ff9838", 7);
  S.shake = Math.min(14, S.shake + 5);
  sfx("ab");
  for (const e of S.enemies) {
    if (e.hp <= 0) continue;
    if (dist(x, y, e.x, e.y) < r + e.r) {
      e.hp -= dmg * (1 - (e.ward || 0));
      e.flash = 0.15;
      if (!e.lastHitBy) e.lastHitBy = p;
    }
  }
  cleanupEnemies();
}

/* ---------------- IA ---------------- */

export function updateEnemies(dt) {
  // Aura dos wardens: recalculada por frame, aplicada como redução de dano.
  for (const e of S.enemies) e.ward = 0;
  for (const g of S.enemies) {
    if (g.hp <= 0 || !String(g.type).startsWith("warden")) continue;
    const red = g.type === "warden_abissal" ? 0.4 : g.type === "warden_veteran" ? 0.3 : 0.2;
    for (const e of S.enemies) {
      if (e === g || e.hp <= 0) continue;
      if (dist(g.x, g.y, e.x, e.y) < 150) e.ward = Math.max(e.ward, red);
    }
  }
  bossSynergy(S.enemies);

  for (const e of S.enemies) {
    protectBossPhase(e);
    if (e.hp <= 0) continue; // já morto neste frame: não age, não é curado

    e.flash = Math.max(0, e.flash - dt);
    if (e.dotT > 0) {
      e.dotT -= dt;
      e.hp -= e.dot * dt;
      if (Math.random() < dt * 6) addParts(e.x, e.y, "#7dff5e", 1);
    }

    const def = EDEF[e.type] || EDEF.grunter;
    const pattern = def.pattern || "chase";
    if (e.hazards?.length) tickBossHazards(e, dt);

    /* AFIXO "Frenético" e a fúria herdada do "Vingativo": arrancadas de
       velocidade. Ficam fora de e.spd para não se acumularem para sempre. */
    e.rageT = Math.max(0, (e.rageT || 0) - dt);
    if (has(e, "hasty")) {
      e.hastyT = (e.hastyT ?? rnd(1, 3)) - dt;
      if (e.hastyT <= 0) {
        e.hastyT = rnd(2.5, 4.5);
        e.rageT = Math.max(e.rageT, 1.2);
        addParts(e.x, e.y, "#ffd75e", 5);
      }
    }
    // Gelo / lentidão / atordoamento
    e.slowT = Math.max(0, (e.slowT || 0) - dt);
    e.stunT = Math.max(0, (e.stunT || 0) - dt);
    e.cursedT = Math.max(0, (e.cursedT || 0) - dt);
    if (e.slowT <= 0) e.slowF = 0;

    e.spdNow =
      e.spd * (e.rageT > 0 ? 1.7 : 1) * (e.slowT > 0 ? 1 - e.slowF : 1);

    // AFIXO "Couraçado": reduz o dano recebido, somando com a aura do Guardião.
    if (has(e, "shielded")) e.ward = Math.max(e.ward, 0.25);

    // Brecha de punição: enquanto aberta, o chefe recebe 50% mais dano.
    e.openT = Math.max(0, (e.openT || 0) - dt);
    if (e.openT > 0) e.ward = -0.5;
    if (e.phaseLockT > 0) e.ward = 1;

    // Chefes enfurecem — o limiar sobe nos modos difícil e impossível.
    if (def.boss && !e.bossGates && !e.enraged && e.hp < e.mhp * MODE().enrageAt) {
      e.enraged = true;
      e.spd *= 1.3;
      S.shake = Math.min(14, S.shake + 8);
      addText(e.x, e.y - e.r - 18, "O CHEFE ENFURECEU!", "#ff2e88", 1.5, 18);
      shockwave(e.x, e.y, 200, def.c, 10);
      sfx("boss");
    }

    /* Atordoado não age: não anda, não atira, não avança padrão. É a única
       forma de a Cascavel e o Criomante terem uma ativa que valha o cooldown. */
    if (e.stunT > 0) {
      if (Math.random() < dt * 8) addParts(e.x, e.y, "#6ee7ff", 1);
      continue;
    }

    const tgt = nearestPlayer(e.x, e.y);
    const Hh = tgt ? headPx(tgt) : null;
    const Hv = tgt ? headVel(tgt) : null;

    /* Investida do Tirano: o `strike` só arma o dash, o deslocamento acontece
       aqui, para a colisão do frame valer normalmente. */
    if (e.dashT > 0) {
      e.dashT -= dt;
      e.x = clamp(e.x + (e.dx || 0) * 620 * dt, -40, W + 40);
      e.y = clamp(e.y + (e.dy || 0) * 620 * dt, -40, H + 40);
      addParts(e.x, e.y, (def.c || "#fff"), 2);
    }

    const chase = def.boss
      ? updateBoss(e, def, dt, Hh, newMinion)
      : runPattern(e, def, pattern, dt, tgt, Hh, Hv);

    if (chase && tgt && Hh && !(e.dashT > 0)) {
      const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
      const sp = (pattern.startsWith("charge") ? 0.6 : 1) * (e.spdNow || e.spd);
      e.x += ((Hh.x - e.x) / d) * sp * dt;
      e.y += ((Hh.y - e.y) / d) * sp * dt;
    }

    /* Contato — com intervalo POR INIMIGO.
       Antes isto rodava a cada frame enquanto houvesse sobreposição, então os
       espinhos davam ~60 acertos por segundo e o dano dependia do FPS: quem
       tivesse o PC melhor matava mais rápido só por isso. */
    e.touchT = Math.max(0, (e.touchT || 0) - dt);
    if (e.touchT <= 0) {
      for (const p of S.players) {
        if (p.dead) continue;
        const Ph = headPx(p);
        if (dist(e.x, e.y, Ph.x, Ph.y) < e.r + 14) {
          const hpAntes = p.hp;
          hitPlayer(p);
          // só aplica o debuff se o golpe passou (escudo e i-frames barram)
          if (p.hp < hpAntes) onEnemyHitPlayer(e, p);
          if (p.thorns > 0 && !p.dead) {
            e.hp -= p.thorns * (1 - (e.ward || 0));
            e.flash = 0.12;
            e.lastHitBy = p;
            addParts(e.x, e.y, "#7dff5e", 4);
          }
          e.touchT = 0.5;
          break;
        }
      }
    }
  }

  separate();
  cleanupEnemies();
  S.bossHazards = S.enemies.flatMap(e => (e.hazards || []).map(({ pulse, ...h }) => h));
}

/** Empurra inimigos sobrepostos. */
function separate() {
  const n = S.enemies.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = S.enemies[i];
      const b = S.enemies[j];
      if (!a || !b) continue;
      if (a.anchored || b.anchored) continue;
      const d = dist(a.x, a.y, b.x, b.y);
      const m = a.r + b.r - 4;
      if (d < m && d > 0) {
        const f = (m - d) * 0.5;
        const nx = (a.x - b.x) / d;
        const ny = (a.y - b.y) / d;
        a.x += nx * f * 0.5;
        a.y += ny * f * 0.5;
        b.x -= nx * f * 0.5;
        b.y -= ny * f * 0.5;
      }
    }
  }
}

/** Devolve true se o inimigo ainda deve perseguir o alvo neste frame. */
function runPattern(e, def, pattern, dt, tgt, Hh, Hv) {
  shooting = e;
  e.shT -= dt;
  const rage = S.waveMod && S.waveMod.id === "rage";

  switch (pattern) {
    case "mortar": {
      if (!Hh) return true;
      if (e.shT <= 0 && dist(e.x, e.y, Hh.x, Hh.y) < 820) {
        e.shT = Math.max(2.5, 4.2 - (e.tier || 0) * 0.25);
        const target = { x: clamp(Hh.x + (Hv?.vx || 0) * 0.5, 20, W - 20),
          y: clamp(Hh.y + (Hv?.vy || 0) * 0.5, 20, H - 20) };
        addEnemyHazard(e, { shape: "circle", ...target, r: 75 + (e.tier || 0) * 6,
          delay: 1.2, life: 0.4, c: def.c });
      }
      return dist(e.x, e.y, Hh.x, Hh.y) > 420;
    }
    case "crossfire": {
      if (!Hh) return true;
      if (e.shT <= 0 && dist(e.x, e.y, Hh.x, Hh.y) < 520) {
        e.shT = 3.4;
        const a = Math.atan2(Hh.y - e.y, Hh.x - e.x);
        for (const offset of [-0.25, 0.25]) addEnemyHazard(e, {
          shape: "line", x: e.x, y: e.y,
          x2: e.x + Math.cos(a + offset) * 600, y2: e.y + Math.sin(a + offset) * 600,
          width: 16, delay: 1, life: 0.35, c: def.c,
        });
      }
      return true;
    }
    case "stalk": {
      if (!Hh) return true;
      e.ph = (e.ph || 0) + dt * 2;
      const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
      const side = Math.sin(e.ph) >= 0 ? 1 : -1;
      const tx = Hh.x - (Hv?.vx || 0) * 0.65 - (Hh.y - e.y) / d * 95 * side;
      const ty = Hh.y - (Hv?.vy || 0) * 0.65 + (Hh.x - e.x) / d * 95 * side;
      const to = dist(e.x, e.y, tx, ty) || 1;
      e.x += (tx - e.x) / to * e.spdNow * dt;
      e.y += (ty - e.y) / to * e.spdNow * dt;
      if (e.shT <= 0 && d < 350) {
        e.shT = 2.4;
        fan(e, Math.atan2(Hh.y - e.y, Hh.x - e.x), 3, 0.15, 205, { c: def.c, life: 2.2 });
      }
      return false;
    }
    /* ---------- movimento simples ---------- */
    case "chase":
      return true;

    case "chase_lunge": {
      // Investida curta e frequente: obriga o jogador a mudar de linha.
      e.lg = (e.lg ?? rnd(1, 2.5)) - dt;
      if (e.lg <= 0 && Hh) {
        e.lg = rnd(2, 3.4);
        const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
        e.lvx = ((Hh.x - e.x) / d) * 320;
        e.lvy = ((Hh.y - e.y) / d) * 320;
        e.lgT = 0.3;
        addParts(e.x, e.y, def.c, 6);
      }
      if (e.lgT > 0) {
        e.lgT -= dt;
        e.x = clamp(e.x + e.lvx * dt, -30, W + 30);
        e.y = clamp(e.y + e.lvy * dt, -30, H + 30);
        return false;
      }
      return true;
    }

    case "zigzag": {
      // Anda em direção ao alvo mas oscilando de lado.
      if (!Hh) return true;
      e.ph = (e.ph ?? rnd(0, TAU)) + dt * 6;
      const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
      const ux = (Hh.x - e.x) / d;
      const uy = (Hh.y - e.y) / d;
      /* A oscilação lateral encolhe quando o inimigo está perto: com offset
         fixo ele orbitava o jogador de lado e nunca encostava, o que também
         parecia "fuga". */
      const off = Math.sin(e.ph) * 90 * Math.min(1, d / 220);
      e.x += (ux * e.spd + -uy * off) * dt;
      e.y += (uy * e.spd + ux * off) * dt;
      return false;
    }

    case "weave":
    case "weave_shoot": {
      if (!Hh) return true;
      e.ph = (e.ph ?? rnd(0, TAU)) + dt * 3.4;
      const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
      const ux = (Hh.x - e.x) / d;
      const uy = (Hh.y - e.y) / d;
      const off = Math.sin(e.ph) * 170 * Math.min(1, d / 300);
      e.x += (ux * e.spd * 0.8 + -uy * off) * dt;
      e.y += (uy * e.spd * 0.8 + ux * off) * dt;
      if (pattern === "weave_shoot" && e.shT <= 0) {
        e.shT = rage ? 1.2 : 1.9;
        eb(e.x, e.y, Math.atan2(Hh.y - e.y, Hh.x - e.x), 230, { c: def.c, r: 5 });
      }
      return false;
    }

    case "suicide": {
      // Corre pro jogador; a explosão acontece em onEnemyDeath.
      if (!Hh) return true;
      const d = dist(e.x, e.y, Hh.x, Hh.y);
      if (d < 60 && !e.armed) {
        e.armed = true;
        e.fuse = 0.55;
        bombWarning(e.x, e.y, 90, 0.55, "rgba(255,179,0,0.35)");
      }
      if (e.armed) {
        e.fuse -= dt;
        if (e.fuse <= 0) { e.hp = 0; return false; }
        return false;
      }
      return true;
    }

    /* ---------- O BUG DO "INIMIGO QUE FOGE TELEPORTANDO" ----------
       Este é o Orbitador, e ele não se movia: era REPOSICIONADO todo frame em
       `Hh + cos(ang) * rad`, uma posição relativa à cabeça do jogador.

       Duas consequências:
       1. A cobra dá a volta no mapa (`% COLS` no stepSnake). Quando ela
          atravessava a borda, `Hh` saltava 2800px de um frame para o outro — e
          o orbitador saltava junto, atravessando a arena inteira num frame.
       2. O raio só encolhia 9px/s, então ele nunca chegava: parecia estar
          fugindo de propósito.

       Agora ele tem velocidade de verdade (`spd` deixou de ser 0 no EDEF) e
       PERSEGUE o ponto da órbita, limitado por `e.spd * dt`. Se você corre mais
       que ele, ele fica atrás — o que é o comportamento que dá para ler. */
    case "orbit":
    case "orbit_shoot": {
      if (!Hh) return true;
      e.ang = (e.ang ?? rnd(0, TAU));
      e.rad = Math.max(60, (e.rad ?? 200) - 14 * dt);
      e.spin = e.spin ?? (Math.random() < 0.5 ? -1 : 1);
      e.ang += (150 / Math.max(40, e.rad)) * dt * e.spin;

      const tx = Hh.x + Math.cos(e.ang) * e.rad;
      const ty = Hh.y + Math.sin(e.ang) * e.rad;
      const od = dist(e.x, e.y, tx, ty);
      const step = e.spd * dt;
      if (od <= step || od < 0.5) {
        e.x = tx;
        e.y = ty;
      } else {
        e.x += ((tx - e.x) / od) * step;
        e.y += ((ty - e.y) / od) * step;
      }
      if (pattern === "orbit_shoot" && e.shT <= 0) {
        e.shT = 2.2;
        eb(e.x, e.y, Math.atan2(Hh.y - e.y, Hh.x - e.x), 210, { c: def.c, r: 5 });
      }
      return false;
    }

    case "charge":
    case "charge_double": {
      e.st = e.st ?? "rest";
      e.t = (e.t ?? rnd(0.8, 1.6)) - dt;
      if (e.st === "rest") {
        if (e.t <= 0) { e.st = "wind"; e.t = 0.55; e.dashes = pattern === "charge_double" ? 2 : 1; }
        return true;
      }
      if (e.st === "wind") {
        if (e.t <= 0 && Hh) {
          e.st = "dash";
          e.t = 0.7;
          const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
          e.dx = (Hh.x - e.x) / d;
          e.dy = (Hh.y - e.y) / d;
          aim(e.x, e.y, e.x + e.dx * 260, e.y + e.dy * 260, def.c, 0.25);
        }
        return false;
      }
      if (e.st === "dash") {
        e.x = clamp(e.x + e.dx * 430 * dt, -30, W + 30);
        e.y = clamp(e.y + e.dy * 430 * dt, -30, H + 30);
        if (e.t <= 0) {
          e.dashes = (e.dashes ?? 1) - 1;
          if (e.dashes > 0) { e.st = "wind"; e.t = 0.28; }
          else { e.st = "rest"; e.t = 1.5; }
        }
        return false;
      }
      return true;
    }

    case "chase_slam": {
      if (e.shT <= 0 && Hh && dist(e.x, e.y, Hh.x, Hh.y) < 190) {
        e.shT = 3.2;
        quake(e.x, e.y, 200, def.c);
        for (const p of S.players) {
          if (p.dead) continue;
          const h = headPx(p);
          if (dist(e.x, e.y, h.x, h.y) < 200) hitPlayer(p);
        }
        S.shake = Math.min(16, S.shake + 9);
      }
      return true;
    }

    /* ---------- atiradores ---------- */
    case "shoot_single": {
      if (Hh && dist(e.x, e.y, Hh.x, Hh.y) < 460 && e.shT <= 0) {
        e.shT = rage ? 1.6 : 2.8;
        eb(e.x, e.y, Math.atan2(Hh.y - e.y, Hh.x - e.x), 170, { c: def.c, life: 3.5 });
      }
      return true;
    }

    case "shoot_burst": {
      if (Hh && dist(e.x, e.y, Hh.x, Hh.y) < 470) {
        if (e.shT <= 0) {
          e.shT = rage ? 2.0 : 3.2;
          e.burst = 3;
          e.burstT = 0;
        }
        if (e.burst > 0) {
          e.burstT -= dt;
          if (e.burstT <= 0) {
            e.burstT = 0.14;
            e.burst--;
            eb(e.x, e.y, Math.atan2(Hh.y - e.y, Hh.x - e.x), 210, { c: def.c, life: 3.5 });
          }
        }
      }
      return true;
    }

    case "shoot_fan": {
      if (Hh && dist(e.x, e.y, Hh.x, Hh.y) < 480 && e.shT <= 0) {
        e.shT = rage ? 1.9 : 3.0;
        fan(e, Math.atan2(Hh.y - e.y, Hh.x - e.x), 5, 0.22, 190, { c: def.c, life: 3.5 });
      }
      return true;
    }

    case "shoot_spiral": {
      if (e.shT <= 0) {
        e.shT = 0.14;
        e.spiral = (e.spiral ?? 0) + 0.5;
        eb(e.x, e.y, e.spiral, 170, { c: def.c, life: 3.2, r: 5 });
        eb(e.x, e.y, e.spiral + Math.PI, 170, { c: def.c, life: 3.2, r: 5 });
      }
      return true;
    }

    /* ---------- sniper com telegrafia real ----------
       Antes o "laser de mira" era criado NO MESMO instante do disparo, com
       0.15s de vida — ou seja, não avisava nada, e o tiro de 1400px/s era
       impossível de desviar. Agora há uma fase de mira que mostra a linha
       ANTES, e só depois vem o tiro, já liderando a velocidade real da cabeça. */
    case "snipe":
    case "snipe_double": {
      if (!Hh) return true;
      const elite = e.type === "sniper_abissal";
      const bulletSpeed = elite ? 1150 : 900;
      const aimTime = elite ? 0.45 : 0.6;

      if (e.aimT === undefined) e.aimT = -1;

      if (e.aimT < 0 && e.shT <= 0) {
        // entra em mira
        e.aimT = aimTime;
        const d = dist(e.x, e.y, Hh.x, Hh.y);
        const t = d / bulletSpeed + aimTime;
        e.px = Hh.x + Hv.vx * t;
        e.py = Hh.y + Hv.vy * t;
        aim(e.x, e.y, e.px, e.py, def.c, aimTime);
      } else if (e.aimT >= 0) {
        e.aimT -= dt;
        if (e.aimT <= 0) {
          e.aimT = -1;
          e.shT = elite ? 1.5 : 2.1;
          const a = Math.atan2(e.py - e.y, e.px - e.x);
          const shots = pattern === "snipe_double" ? 2 : 1;
          for (let i = 0; i < shots; i++) {
            eb(e.x, e.y, a + (i - (shots - 1) / 2) * 0.07, bulletSpeed, {
              c: def.c, r: elite ? 6 : 5, trail: true, life: 4,
            });
          }
          addParts(e.x, e.y, "#ffaa00", 8);
        }
      }
      return e.aimT < 0; // fica parado enquanto mira
    }

    /* ---------- sanguessuga: desliga a sua cura ----------
       Ela não vem te matar, vem te tirar a saída. O pulso verde não dá dano
       nenhum — só apaga a regeneração por alguns segundos. Se você ignorar,
       descobre tarde demais que a vida parou de voltar. */
    case "leech":
    case "leech_burst": {
      if (!Hh) return true;
      const forte = pattern === "leech_burst";
      const alcance = forte ? 260 : 200;
      if (e.shT <= 0 && dist(e.x, e.y, Hh.x, Hh.y) < alcance) {
        e.shT = forte ? 2.2 : 3.5;
        ring(e.x, e.y, alcance, "#8bd64a", 4);
        addParts(e.x, e.y, "#8bd64a", 14, 2);
        for (const q of S.players) {
          if (q.dead) continue;
          const h = headPx(q);
          if (dist(e.x, e.y, h.x, h.y) < alcance) {
            blockRegen(q, forte ? 6 : 4);
            drain(h.x, h.y, e.x, e.y, "#8bd64a");
          }
        }
      }
      return true;
    }

    /* ---------- suporte ---------- */
    case "heal":
    case "heal_shield": {
      if (e.shT <= 0) {
        e.shT = 3;
        let pulsed = false;
        for (const o of S.enemies) {
          if (o === e || o.hp <= 0) continue; // não ressuscita cadáver
          if (dist(e.x, e.y, o.x, o.y) < 140 && o.hp < o.mhp) {
            o.hp = Math.min(o.mhp, o.hp + 2);
            pulsed = true;
          }
        }
        if (pulsed) {
          addParts(e.x, e.y, "#7dff5e", 12, 2);
          addText(e.x, e.y - e.r - 10, "✚", "#7dff5e", 0.6, 16);
          ring(e.x, e.y, 140, "#7dff5e", 3);
        }
      }
      return true;
    }

    case "ward": {
      // A redução já foi aplicada no começo de updateEnemies.
      if (e.shT <= 0) {
        e.shT = 1.4;
        ring(e.x, e.y, 150, def.c, 2);
      }
      return true;
    }

    default:
      return true;
  }
}
