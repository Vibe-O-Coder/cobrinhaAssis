/* ================= MODO PVP (FASE 3) =================

   Duas cobras no mesmo mapa de 2800x2800, nascendo em pontas opostas. No meio
   nascem inimigos, e é matando eles que se sobe de nível — os abates dão
   EXPERIÊNCIA, não alma. O relógio empurra: a cada 40s os inimigos ganham um
   stack de buff (mais vida, mais xp, mais bicho na tela) e aos 20 minutos, se
   ninguém venceu, o mapa fecha numa arena minúscula sem inimigos onde não
   existe mais para onde correr.

   POR QUE ESTE ARQUIVO EXISTE, em vez de espalhar `if (S.mode === "pvp")` pelo
   jogo: o PVP muda o significado de cinco coisas do motor ao mesmo tempo (o
   que o inimigo derruba, quanta vida o jogador tem, quem pode machucar quem, o
   que acontece quando a onda "acaba" e onde ficam as bordas do mapa).
   Espalhar isso deixaria cada um desses cinco pontos com uma regra escondida.
   Aqui os ganchos nos outros arquivos são uma linha cada, e todos apontam para
   funções deste módulo. */

import { COLS, ROWS, CELL, W, H } from "../core/config.js";
import { S } from "../core/state.js";
import { save, persist } from "../core/save.js";
import { dist, clamp, $, esc } from "../core/utils.js";
import { sfx } from "../core/audio.js";
import {
  addParts, addText, shockwave, ring, aura, quake, bombWarning, shieldFx,
} from "../render/fx.js";
import { headPx } from "./player.js";
import { spawnEnemy, pickType } from "./waves.js";
import { setActPalette } from "../render/canvas.js";
import { actOf } from "../core/scaling.js";
import { banner, showScreen } from "../ui/screens.js";
import {
  PVP_HP, GUARD_RECHARGE_DELAY, GUARD_RECHARGE_RATE, xpToNext,
  levelGivesPower, LEVEL_GAIN, STACK_EVERY, STACK_MAX, stackHpMul, stackXpMul,
  stackSpawnInterval, stackEnemyCap, virtualWave, MATCH_SECS, ARENA_W, ARENA_H,
  ARENA_MIN, SHRINK_EVERY,
} from "../data/pvp.js";
import { PVP_ABILITIES } from "./pvpabilities.js";
import { CLASSES } from "../data/classes.js";
import { EDEF } from "../data/enemies.js";
import { hideOvs } from "../ui/screens.js";
import { lifestealHeal } from "./player.js";
import { clampStats } from "./stats.js";

/* Dano de jogador contra jogador é multiplicado por isto.

   O dano base das classes foi calibrado contra inimigos cuja vida cresce
   centenas de vezes ao longo de 290 ondas. Um alvo de 10 de vida está do outro
   lado dessa escala: sem o ajuste, um Guerreiro sem carta nenhuma levaria uns
   17 segundos de tiro contínuo para derrubar o outro. O multiplicador aproxima
   o duelo de alguns segundos de troca, que é o que um duelo deve ser. */
const PVP_DMG_SCALE = 1.5;

/** Estamos numa partida de PVP? */
export function isPvp() {
  return S.mode === "pvp" && !!S.pvp;
}

/** O outro jogador (o alvo). */
export function foeOf(p) {
  if (!p) return null;
  return S.players.find((q) => q.idx !== p.idx && !q.dead) || null;
}

/* ---------------------------------------------------------------------------
   INÍCIO
   --------------------------------------------------------------------------- */

/** Prepara o estado da partida. Chamado por game/run.js depois de criar os
    jogadores. */
export function startPvp(local) {
  S.pvp = {
    t: 0,
    stacks: 0,
    nextStack: STACK_EVERY,
    spawnT: 1.5,
    sudden: false,
    arena: null,
    shrinkT: 0,
    meteors: [],
    winner: -1,
    over: false,
    warn60: false,
    warn10: false,
    choices: [null, null], pending: [0, 0], pickId: 0, spawnSide: 0,
    queue: [], // jogadores esperando para escolher a carta do nível
  };
  S.pvpLocal = !!local;
  S.wave = virtualWave(0);
  setActPalette(actOf(S.wave));
  for (const p of S.players) initPvpPlayer(p);
  for (const p of S.players) {
    const [x,y] = p.cells[0];
    for (let i=0;i<4;i++) S.foods.push({x:wrapX(x+p.dir.x*(5+i*3)),y:y+(i%2)*3,t:"n",mt:0});
  }
  banner("⚔️ DUELO", "suba de nível e derrube a outra serpente");
}

/** Converte um jogador da campanha num jogador de PVP.

    A vida vira 10 (e não 3): com 3, o primeiro encostão decidiria a partida
    inteira e não existiria troca de dano nenhuma. O escudo regenerativo entra
    pelo mesmo motivo — ele é o que permite recuar, esperar e voltar. */
export function initPvpPlayer(p) {
  p.pvp = true;
  p.abCd = PVP_ABILITIES[p.cls][1];
  p.abName = PVP_ABILITIES[p.cls][0];
  // Dano sustentado normalizado; a identidade vem das passivas e ativas.
  p.dmg = Math.min(p.dmg, p.cdBase * 1.8);
  p.magnet = true; p.magnetR = 105;
  p.revLeft = 0; p.shield = 0; p.shieldBase = 0;
  p.level = 0;
  p.xp = 0;
  p.xpNext = xpToNext(1);
  p.xpMul = 1;
  p.maxHp = PVP_HP;
  p.hp = PVP_HP;
  /* O escudo da campanha (`p.shield`) conta GOLPES; o do PVP conta DANO e
     volta sozinho. São coisas diferentes, então são campos diferentes. */
  p.guard = 0;
  p.guardMax = 0;
  p.guardRate = GUARD_RECHARGE_RATE;
  p.guardT = 0;
  p.guardFull = false;
  p.pvpDmg = 1; // multiplicador do dano QUE ELE causa em jogador
  p.pvpRes = 1; // multiplicador do dano QUE ELE recebe de jogador
  p.pvpIf = 0;
  p.pvpIfBonus = 0;
  p.dodge = 0;
  p.item = null;
  p.itemT = 0;
  p.itemCdMul = 1;
  p.pvpKills = 0;
  clampStats(p);
}

/* ---------------------------------------------------------------------------
   RELÓGIO DA PARTIDA
   --------------------------------------------------------------------------- */

export function pvpTick(dt) {
  const st = S.pvp;
  if (!st || st.over) return;
  st.t += dt;

  /* A "onda virtual": o escalonamento inteiro do jogo é função de S.wave, e o
     PVP não tem ondas. Em vez de duplicar as curvas de vida/velocidade/tier, o
     relógio vira onda e o motor continua funcionando sem saber onde está. */
  const w = virtualWave(st.t);
  if (w !== S.wave) {
    const antes = actOf(S.wave);
    S.wave = w;
    const agora = actOf(w);
    if (agora !== antes) {
      setActPalette(agora);
      banner("🌍 A ERA MUDOU", "o elenco desta era é outro");
    }
  }

  if (!st.sudden) {
    tickStacks(st);
    tickSpawn(st, dt);
  }

  tickPlayers(dt);
  tickMeteors(dt);
  contactDamage();

  if (!st.sudden && st.t >= MATCH_SECS) enterSuddenDeath();
  if (st.sudden) {
    tickArena(st, dt);
    // Pressão crescente encerra até um duelo de duas builds defensivas.
    const elapsed = st.t - MATCH_SECS;
    st.pressureT = (st.pressureT || 0) - dt;
    if (elapsed > 90 && st.pressureT <= 0) {
      st.pressureT = 1;
      for (const p of S.players) {
        if (p.dead) continue;
        p.hp = Math.max(0,p.hp - p.maxHp * Math.min(0.1,0.005 + (elapsed-90)*0.0003));
        if (p.hp <= 0) p.dead = true;
      }
    }
  }

  // avisos do relógio: 1 minuto e 10 segundos antes de o mapa fechar
  if (!st.sudden) {
    const falta = MATCH_SECS - st.t;
    if (!st.warn60 && falta <= 60) {
      st.warn60 = true;
      banner("⏳ 1 MINUTO", "o mapa vai fechar");
      sfx("hurt");
    }
    if (!st.warn10 && falta <= 10) {
      st.warn10 = true;
      banner("⏳ 10 SEGUNDOS", "prepare-se");
    }
  }
}

function tickStacks(st) {
  if (st.t < st.nextStack || st.stacks >= STACK_MAX) return;
  st.nextStack += STACK_EVERY;
  const old = st.stacks;
  st.stacks++;
  for (const e of S.enemies) {
    const ratio = stackHpMul(st.stacks) / stackHpMul(old);
    e.hp *= ratio; e.mhp *= ratio;
    e.spd *= (1 + st.stacks * 0.012) / (1 + old * 0.012);
    e.pvpXp = Math.max(1,Math.round((2 + (e.elite ? 4 : 0) + (e.tier || 0)) * stackXpMul(st.stacks)));
  }
  banner("👹 INIMIGOS x" + st.stacks, "mais vida, mais experiência, mais deles");
  sfx("boss");
  for (const p of S.players) {
    if (p.dead) continue;
    const h = headPx(p);
    ring(h.x, h.y, 260, "#ff2e88", 6);
  }
}

function tickSpawn(st, dt) {
  st.spawnT -= dt;
  if (st.spawnT > 0) return;
  st.spawnT = stackSpawnInterval(st.stacks);
  if (S.enemies.length >= stackEnemyCap(st.stacks)) return;

  spawnEnemy(pickType(S.wave));
  const e = S.enemies[S.enemies.length - 1];
  if (!e) return;
  // A horda usa os atributos base e a curva do duelo, sem multiplicar também
  // pela curva de vida da campanha que a onda virtual usou no nascimento.
  e.hp = EDEF[e.type].hp * (e.elite ? 1.6 : 1) * stackHpMul(st.stacks);
  e.spd = EDEF[e.type].spd * (1 + st.stacks * 0.012);
  const target = S.players[st.spawnSide++ % 2];
  const h = headPx(target);
  for (let attempt=0;attempt<24;attempt++) {
    const angle = Math.random() * Math.PI * 2;
    e.x = clamp(h.x + Math.cos(angle) * 500, 30, W-30);
    e.y = clamp(h.y + Math.sin(angle) * 500, 30, H-30);
    if (S.players.every(p=>dist(e.x,e.y,headPx(p).x,headPx(p).y)>300)) break;
  }
  e.mhp = Math.ceil(e.hp);
  e.pvpXp = Math.max(
    1,
    Math.round((2 + (e.elite ? 4 : 0) + (e.tier || 0)) * stackXpMul(st.stacks)),
  );
}

function tickPlayers(dt) {
  for (const p of S.players) {
    if (p.dead) continue;
    p.pvpSlowT = Math.max(0,(p.pvpSlowT || 0)-dt);
    p.overdriveT = Math.max(0,(p.overdriveT || 0)-dt);
    p.pvpIf = Math.max(0, (p.pvpIf || 0) - dt);
    p.itemT = Math.max(0, (p.itemT || 0) - dt);

    // o escudo volta sozinho depois de um tempo sem apanhar
    p.guardT = Math.max(0, (p.guardT || 0) - dt);
    if (p.guardT <= 0 && p.guard < p.guardMax) {
      p.guard = Math.min(p.guardMax, p.guard + p.guardRate * dt);
      if (p.guard >= p.guardMax && !p.guardFull) {
        p.guardFull = true;
        const h = headPx(p);
        ring(h.x, h.y, 46, "#6fd3ff", 3);
      }
    }
    if (p.guard < p.guardMax) p.guardFull = false;
  }
}

/* ---------------------------------------------------------------------------
   EXPERIÊNCIA E NÍVEL
   --------------------------------------------------------------------------- */

export function gainXp(p, n) {
  if (!p || p.dead || !isPvp()) return;
  p.xp += n * (p.xpMul || 1);
  let subiu = 0;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = xpToNext(p.level + 1);
    applyLevelGain(p);
    subiu++;
    if (levelGivesPower(p.level)) S.pvp.queue.push(p.idx);
  }
  if (subiu) levelUpFx(p);
}

function applyLevelGain(p) {
  p.maxHp += LEVEL_GAIN.maxHp;
  p.hp = Math.min(p.maxHp, p.hp + LEVEL_GAIN.maxHp);
  p.dmgMul += LEVEL_GAIN.dmgMul;
  p.cd *= LEVEL_GAIN.cdMul;
  p.range += LEVEL_GAIN.range;
  p.guardMax += LEVEL_GAIN.guardMax;
  clampStats(p);
}

/* "Tenha certeza de que as animações sejam bem flashy" — subir de nível é o
   momento mais importante da partida, então ele tem anel, onda de choque,
   faíscas, tremor e texto grande. */
function levelUpFx(p) {
  const h = headPx(p);
  ring(h.x, h.y, 150, p.color || "#ffd75e", 7);
  shockwave(h.x, h.y, 210, "#ffd75e", 9);
  aura(h.x, h.y, 90, "#fff3c4");
  addParts(h.x, h.y, "#ffd75e", 40, 4);
  addParts(h.x, h.y, p.color || "#7dff5e", 26, 3);
  addText(h.x, h.y - 34, "NÍVEL " + p.level + "!", "#ffd75e", 1.5, 22);
  S.shake = Math.min(14, S.shake + 6);
  sfx("gold");
}

/** Há alguém esperando para escolher carta? Perguntado pelo loop. */
export function pendingLevelPick() {
  return isPvp() && !S.pvp.over && S.pvp.queue.length > 0 && S.phase === "play";
}

export function nextLevelPick() {
  return S.pvp.queue.shift();
}

/* ---------------------------------------------------------------------------
   DANO ENTRE JOGADORES
   --------------------------------------------------------------------------- */

/** Único caminho de dano de um jogador em outro. Devolve o dano aplicado.

    Não reaproveita `damagePlayer()` de propósito: lá o dano é sempre um golpe
    inteiro com 1,3s de invulnerabilidade — o desenho certo para 3 corações
    contra uma horda. Aqui existem números de dano, escudo que absorve em
    parte, esquiva e resistência, e a invulnerabilidade é curta (0,25s) só para
    uma explosão não contar sessenta vezes no mesmo frame. */
export function pvpHit(victim, raw, attacker, kind) {
  const st = S.pvp;
  if (!victim || victim.dead || !st || st.over) return 0;
  if (victim.shieldT > 0 || victim.phaseT > 0 || victim.iframes > 0) {
    flashBlock(victim, "IMUNE");
    return 0;
  }
  if ((victim.pvpIf || 0) > 0) return 0;
  if (victim.dodge > 0 && Math.random() < victim.dodge) {
    flashBlock(victim, "ESQUIVOU");
    return 0;
  }

  let dmg = raw * (attacker ? (attacker.pvpDmg || 1) * (victim.pvpRes || 1) : 1);
  dmg = Math.max(0.5, Math.round(dmg * 10) / 10);

  const h = headPx(victim);
  victim.pvpIf = (kind === "environment" ? 0.7 : 0.25) + (victim.pvpIfBonus || 0);
  victim.guardT = GUARD_RECHARGE_DELAY;

  // o escudo come o dano primeiro; só o que sobra vai para a vida
  if (victim.guard > 0) {
    const comido = Math.min(victim.guard, dmg);
    victim.guard -= comido;
    dmg -= comido;
    ring(h.x, h.y, 44, "#6fd3ff", 4);
    addParts(h.x, h.y, "#6fd3ff", 10);
    addText(h.x, h.y - 26, "-" + Math.round(comido * 10) / 10 + " 🛡", "#6fd3ff", 0.7, 14);
    if (dmg <= 0.05) return comido;
  }

  victim.hp = Math.round((victim.hp - dmg) * 10) / 10;
  addText(h.x, h.y - 20, "-" + dmg, "#ff4d6d", 0.9, 17);
  addParts(h.x, h.y, "#ff4d6d", 14, 2.4);
  shockwave(h.x, h.y, 60, "#ff2e88", 4);
  S.shake = Math.min(16, S.shake + (kind === "item" ? 10 : 5));
  S.flash = Math.max(S.flash, 0.22);
  sfx("hurt");

  if (victim.hp <= 0) {
    victim.hp = 0;
    victim.dead = true;
    if (attacker) attacker.pvpKills++;
    deathFx(victim);
    // Resultado resolvido após o passo inteiro: mortes simultâneas empatam.
  }
  return dmg;
}

function flashBlock(p, txt) {
  const h = headPx(p);
  addText(h.x, h.y - 26, txt, "#ffd75e", 0.8, 14);
  ring(h.x, h.y, 40, "#ffd75e", 3);
}

function deathFx(p) {
  const h = headPx(p);
  for (let i = 0; i < 5; i++) {
    shockwave(h.x, h.y, 120 + i * 70, i % 2 ? "#ff2e88" : "#ffd75e", 12 - i);
  }
  addParts(h.x, h.y, p.color || "#ff4d6d", 70, 6);
  quake(h.x, h.y, 320, "#ff2e88");
  S.shake = 22;
  S.flash = 0.6;
  sfx("boss");
}

/* Encostar na outra cobra.

   Regra: quem entra no corpo do outro se machuca — é a colisão clássica da
   cobrinha, só que o "muro" agora é uma pessoa. Cabeça contra cabeça machuca
   os dois, senão bastaria mirar na cabeça do outro para trocar 2 de dano por
   zero. */
function contactDamage() {
  const [a, b] = S.players;
  if (!a || !b || a.dead || b.dead) return;
  if (!a.cells.length || !b.cells.length) return;

  const ha = a.cells[0];
  const hb = b.cells[0];

  if (ha[0] === hb[0] && ha[1] === hb[1]) {
    pvpHit(a, 3 + (b.thorns || 0), b, "contact");
    pvpHit(b, 3 + (a.thorns || 0), a, "contact");
    return;
  }
  if (a.phaseT <= 0 && b.cells.some((c) => c[0] === ha[0] && c[1] === ha[1])) {
    pvpHit(a, 2 + (b.thorns || 0), b, "contact");
  }
  if (b.phaseT <= 0 && a.cells.some((c) => c[0] === hb[0] && c[1] === hb[1])) {
    pvpHit(b, 2 + (a.thorns || 0), a, "contact");
  }
}

/* Mira automática no PVP.

   O tiro do jogador sempre mirou em `nearestEnemy()` — e o outro jogador não é
   um inimigo, é um jogador. Sem este desvio o duelo seria impossível: as duas
   cobras andariam uma em volta da outra atirando nos bichos.

   A regra é "o oponente tem prioridade dentro do alcance": num duelo, quando
   você consegue ver o outro, é nele que você quer atirar. O alvo devolvido é
   um objeto com x/y — o mesmo contrato que fireShots() já espera de um
   inimigo. */
export function pvpAimTarget(p, Hh) {
  const foe = foeOf(p);
  if (!foe) return null;
  const t = headPx(foe);
  return dist(Hh.x, Hh.y, t.x, t.y) <= p.range ? { x: t.x, y: t.y, foe } : null;
}

/** Dano de projétil de jogador em jogador — chamado por game/bullets.js. */
export function pvpBulletHit(victim, b) {
  const dealt = pvpHit(victim, b.dmg * PVP_DMG_SCALE, b.owner, "shot");
  if (dealt > 0 && b.owner && Math.random() < (b.ls || 0)) lifestealHeal(b.owner);
  return dealt;
}

/* ---------------------------------------------------------------------------
   ITENS — as "ativas extras" do PVP, com tecla própria
   --------------------------------------------------------------------------- */

export function useItem(p) {
  if (!isPvp() || S.pvp.over || S.paused || S.phase !== "play" || !p || p.dead || !p.item) return;
  if ((p.itemT || 0) > 0) return;
  p.itemT = p.item.cd * (p.itemCdMul || 1);
  const h = headPx(p);
  const foe = foeOf(p);
  sfx("ab");

  switch (p.item.id) {
    /* 🛡️ bloqueia TODO dano — reaproveita o `shieldT` da Égide do Paladino,
       que já é o "imune de verdade" reconhecido por damagePlayer e por
       pvpHit. Um campo novo com o mesmo significado só criaria dois lugares
       para esquecer de checar. */
    case "egide": {
      p.shieldT = 2.5;
      shieldFx(h.x, h.y, 60, 2.5, "#6fd3ff", p);
      ring(h.x, h.y, 120, "#6fd3ff", 6);
      addParts(h.x, h.y, "#6fd3ff", 30, 3);
      addText(h.x, h.y - 30, "ÉGIDE!", "#6fd3ff", 1.2, 18);
      break;
    }
    case "meteoro": {
      if (!foe) break;
      const t = headPx(foe);
      S.pvp.meteors.push({ x: t.x, y: t.y, t: 1, r: 130, dmg: 9, owner: p });
      bombWarning(t.x, t.y, 130, 1, "rgba(255,120,40,0.55)");
      addText(t.x, t.y - 40, "☄️ METEORO", "#ff9838", 1.2, 18);
      break;
    }
    case "nova": {
      const R = 190;
      shockwave(h.x, h.y, R + 50, "#b04dff", 12);
      shockwave(h.x, h.y, R, "#ffffff", 6);
      quake(h.x, h.y, R, "#b04dff");
      addParts(h.x, h.y, "#b04dff", 45, 5);
      S.shake = Math.min(18, S.shake + 10);
      if (foe) {
        const t = headPx(foe);
        if (dist(h.x, h.y, t.x, t.y) < R) pvpHit(foe, 7, p, "item");
      }
      for (const e of S.enemies) {
        if (e.hp > 0 && dist(h.x, h.y, e.x, e.y) < R) {
          e.hp -= 30;
          e.flash = 0.2;
          e.lastHitBy = p;
        }
      }
      break;
    }
    case "piscada": {
      const b = pvpBounds();
      let cx = p.cells[0][0];
      let cy = p.cells[0][1];
      for (let i = 0; i < 7; i++) {
        cx = wrapX(cx + p.dir.x, b);
        cy = wrapY(cy + p.dir.y, b);
      }
      addParts(h.x, h.y, p.color || "#b9a8ff", 26, 4);
      p.cells[0] = [cx, cy];
      const n = headPx(p);
      addParts(n.x, n.y, "#ffffff", 26, 4);
      ring(n.x, n.y, 90, p.color || "#b9a8ff", 4);
      p.iframes = Math.max(p.iframes, 0.4);
      break;
    }
    case "elixir": {
      const q = Math.max(1, Math.round(p.maxHp * 0.45));
      p.hp = Math.min(p.maxHp, p.hp + q);
      p.healT = 0; // o elixir fura o intervalo global: é um item de emergência
      aura(h.x, h.y, 80, "#ff4d6d");
      addParts(h.x, h.y, "#ff4d6d", 30, 3);
      addText(h.x, h.y - 30, "+" + q + " ❤", "#7dff5e", 1.2, 20);
      break;
    }
  }
}

function tickMeteors(dt) {
  const ms = S.pvp.meteors;
  for (let i = ms.length - 1; i >= 0; i--) {
    const m = ms[i];
    m.t -= dt;
    if (m.t > 0) continue;
    ms.splice(i, 1);
    shockwave(m.x, m.y, m.r + 60, "#ff9838", 14);
    shockwave(m.x, m.y, m.r, "#fff3c4", 7);
    quake(m.x, m.y, m.r, "#ff5252");
    addParts(m.x, m.y, "#ff9838", 50, 6);
    S.shake = Math.min(20, S.shake + 12);
    S.flash = Math.max(S.flash, 0.35);
    sfx("boss");
    for (const q of S.players) {
      if (q.dead || q === m.owner) continue;
      const t = headPx(q);
      if (dist(m.x, m.y, t.x, t.y) < m.r) pvpHit(q, m.dmg, m.owner, "item");
    }
    for (const e of S.enemies) {
      if (e.hp > 0 && dist(m.x, m.y, e.x, e.y) < m.r) {
        e.hp -= 40;
        e.flash = 0.2;
        e.lastHitBy = m.owner;
      }
    }
  }
}

/* ---------------------------------------------------------------------------
   MORTE SÚBITA
   --------------------------------------------------------------------------- */

export function enterSuddenDeath() {
  const st = S.pvp;
  st.sudden = true;
  st.shrinkT = SHRINK_EVERY;

  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  st.arena = {
    x0: cx - Math.floor(ARENA_W / 2),
    y0: cy - Math.floor(ARENA_H / 2),
    x1: cx + Math.ceil(ARENA_W / 2),
    y1: cy + Math.ceil(ARENA_H / 2),
  };

  // o mapa se esvazia num estouro só
  for (const e of S.enemies) addParts(e.x, e.y, "#b04dff", 10);
  S.enemies.length = 0;
  S.ebullets.length = 0;
  S.pbullets.length = 0;
  S.drops.length = 0;
  S.blocks.length = 0;
  S.foods.length = 0;
  S.bombs.length = 0;
  for (const p of S.players) { if (p.turrets) p.turrets.length = 0; if (p.timeline) p.timeline.length = 0; }
  st.meteors.length = 0;

  // e as duas cobras são jogadas para dentro da caixa, em cantos opostos
  teleportIntoArena(S.players[0], st.arena, 0);
  teleportIntoArena(S.players[1], st.arena, 1);

  banner("☠️ MORTE SÚBITA", "sem inimigos, sem saída — a arena vai encolher");
  S.flash = 0.7;
  S.shake = 20;
  sfx("boss");
}

function teleportIntoArena(p, a, side) {
  if (!p || p.dead) return;
  const y = Math.floor((a.y0 + a.y1) / 2);
  const x = side === 0 ? a.x0 + 2 : a.x1 - 3;
  p.dir = { x: side === 0 ? 1 : -1, y: 0 };
  p.qdir = null;
  /* O corpo é reconstruído curto: uma cobra de 60 segmentos numa arena de
     26x18 cobriria metade do chão e a luta viraria sorteio. */
  p.cells = [];
  for (let i = 0; i < 4; i++) {
    p.cells.push([clamp(x - i * p.dir.x, a.x0, a.x1 - 1), y]);
  }
  p.grow = 0;
  p.iframes = 1.5;
  p.pvpIf = 1.5;
  const h = headPx(p);
  ring(h.x, h.y, 120, p.color || "#ffffff", 5);
  addParts(h.x, h.y, p.color || "#ffffff", 30, 4);
}

function tickArena(st, dt) {
  st.shrinkT -= dt;
  if (st.shrinkT > 0) return;
  st.shrinkT = SHRINK_EVERY;

  const a = st.arena;
  if (a.x1 - a.x0 <= ARENA_MIN && a.y1 - a.y0 <= ARENA_MIN) return;
  if (a.x1 - a.x0 > ARENA_MIN) { a.x0++; if (a.x1 - a.x0 > ARENA_MIN) a.x1--; }
  if (a.y1 - a.y0 > ARENA_MIN) { a.y0++; if (a.y1 - a.y0 > ARENA_MIN) a.y1--; }

  banner("🔻 A ARENA ENCOLHE", a.x1 - a.x0 + " x " + (a.y1 - a.y0));
  sfx("hurt");

  /* Quem ficou de fora é puxado para dentro. Sem isso, encolher a caixa
     poderia deixar um jogador do lado de fora e ele nunca mais voltaria. */
  for (const p of S.players) {
    if (p.dead) continue;
    p.cells = p.cells.map(([x, y]) => [
      clamp(x, a.x0, a.x1 - 1),
      clamp(y, a.y0, a.y1 - 1),
    ]);
  }
}

/** Bordas do mundo para a cobra, em células. `null` = o mapa inteiro. */
export function pvpBounds() {
  return isPvp() && S.pvp.arena ? S.pvp.arena : null;
}

export function wrapX(x, b) {
  if (!b) return (x + COLS) % COLS;
  const w = b.x1 - b.x0;
  return b.x0 + (((x - b.x0) % w) + w) % w;
}

export function wrapY(y, b) {
  if (!b) return (y + ROWS) % ROWS;
  const h = b.y1 - b.y0;
  return b.y0 + (((y - b.y0) % h) + h) % h;
}

/* ---------------------------------------------------------------------------
   FIM DA PARTIDA
   --------------------------------------------------------------------------- */

/** Índice do jogador que está NESTE navegador (no online o convidado é o 1). */
function localIdx() {
  return S.role === "guest" ? 1 : 0;
}

export function resolvePvpDeaths() {
  if (!isPvp() || S.pvp.over) return;
  const alive = S.players.filter(p=>!p.dead);
  if (alive.length < 2) pvpEnd(alive.length ? alive[0].idx : -1);
}

export function pvpEnd(winner, remote = false) {
  const st = S.pvp;
  if (!st || st.rewarded || (st.over && !remote)) return;
  st.over = true; st.rewarded = true;
  hideOvs();
  const choiceUI = $("#pvpChoices"); if (choiceUI) choiceUI.replaceChildren();
  st.winner = winner;
  S.phase = "over"; S.paused = false;
  S.runActive = false;

  banner(winner < 0 ? "EMPATE" : "👑 J" + (winner + 1) + " VENCEU", "");

  /* Almas: uma partida de 20 minutos tem que valer alguma coisa na loja, mas
     não pode virar a melhor fazenda de almas do jogo — senão ninguém joga a
     campanha. O nível alcançado é a métrica justa: ele já resume abates,
     sobrevivência e tempo. */
  const ganho = (p, venceu) =>
    Math.round((p ? p.level * 4 + p.pvpKills * 2 : 0) + (venceu ? 60 : 20));

  const eu = S.pvpLocal ? S.players[winner < 0 ? 0 : winner] : S.players[localIdx()];
  const venci = winner >= 0 && (S.pvpLocal || localIdx() === winner);
  const almas = st.t < 60 ? 0 : ganho(eu, venci);

  save.souls += almas;
  if (venci) save.pvpWins++;
  persist();

  if (S.role === "host" && S.net) S.net.send({t:"pvpOver", winner, pvp:{...st, meteors:[]}, players:S.players.map(p=>({idx:p.idx,cls:p.cls,name:p.name,color:p.color,level:p.level,kills:p.kills,pvpKills:p.pvpKills,hp:p.hp,maxHp:p.maxHp,dead:p.dead}))});
  S.stopNet?.();
  setTimeout(() => { if (S.pvp === st && S.phase === "over") showPvpOver(winner, almas); }, 1200);
}

function showPvpOver(winner, almas) {
  const g = S.players[winner < 0 ? 0 : winner];
  const l = S.players[winner < 0 ? 1 : 1 - winner];
  const linha = (p, tag) =>
    `<div style="margin:4px 0"><b style="color:${p ? CLASSES[p.cls]?.color || "#fff" : "#fff"}">` +
    `${tag} J${p ? p.idx + 1 : "?"} ${p ? esc(CLASSES[p.cls]?.name || "Serpente") : ""}</b>` +
    ` — nível <b>${p ? p.level : 0}</b> · ${p ? p.kills : 0} abates · ` +
    `${p ? Math.round((p.hp / Math.max(1, p.maxHp)) * 100) : 0}% de vida</div>`;

  const big = $("#overBig");
  const tit = $("#overTitle");
  if (big) big.textContent = "⚔️";
  if (tit) tit.textContent = winner < 0 ? "EMPATE NO DUELO" : "J" + (winner + 1) + " VENCEU O DUELO";

  const mm = Math.floor(S.pvp.t / 60);
  const ss = String(Math.floor(S.pvp.t % 60)).padStart(2, "0");

  $("#overStats").innerHTML =
    linha(g, winner < 0 ? "🤝" : "👑") +
    linha(l, winner < 0 ? "🤝" : "💀") +
    `<div style="margin-top:8px">⏱️ Duração: <b>${mm}:${ss}</b>` +
    (S.pvp.sudden ? " (morte súbita)" : "") +
    `</div>` +
    `<div>👹 Buff dos inimigos: <b>x${S.pvp.stacks}</b></div>` +
    `<div>💜 Almas ganhas: <b>+${almas}</b></div>` +
    `<div style="margin-top:6px;color:#8f7fc0">Total de almas: ${save.souls} · ` +
    `duelos vencidos: ${save.pvpWins}</div>`;

  showScreen("over");
  sfx("win");
}
