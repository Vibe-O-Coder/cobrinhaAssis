/* ================= ONDAS E SPAWN ================= */
/* BOSS_EVERY / VARIANT_EVERY / BOSS_TIER_EVERY / ELITE_BOSS_EVERY saíram:
   a cadência de chefe e o tier de variante agora vêm de core/scaling.js,
   que sabe em que ATO a onda está. */
import { COLS, ROWS, CELL, W, H, FINAL_WAVE } from "../core/config.js";
import {
  enemyHpMul, bossHpMul, enemySpdMul, eliteChance, waveQuota, actOf,
  waveInAct, maxTier, tierChance, bossKind, bossCount, scaledEnemyHp, MAX_ENEMIES,
} from "../core/scaling.js";
import { S } from "../core/state.js";
import { save } from "../core/save.js";
import { rnd, ri, pick, dist, sample } from "../core/utils.js";
import {
  EDEF, BASE_TYPES, BOSS_POOL, variantOf, tierOf, isBoss, bossName,
  affixPoolFor,
} from "../data/enemies.js";
import { ACT_DEFS, actDef, poolUpToAct } from "../data/acts.js";
import { MODE } from "../data/modes.js";
import { MODS } from "../data/classes.js";
import { sfx } from "../core/audio.js";
import { banner } from "../ui/screens.js";
import { addBlock } from "./food.js";
import { headPx, respawn } from "./player.js";
import { shockwave } from "../render/fx.js";
import { setActPalette } from "../render/canvas.js";

/* Quais tipos-base podem nascer nesta onda.

   O ato manda: cada um dos 10 atos ESTREIA alguns tipos (ver data/acts.js) e
   todos os anteriores continuam valendo. Dentro do ato I o elenco ainda abre aos
   poucos, para as primeiras ondas não jogarem tudo de uma vez.

   Antes esta lista era fixa e acabava na onda 16: da 17 à 290 o sorteio era
   sempre o mesmo balde de 13 tipos. */
function poolForWave(w) {
  const a = actOf(w);
  if (a === 0) {
    const pool = ["grunter"];
    if (w >= 2) pool.push("runner", "runner");
    if (w >= 3) pool.push("shooter");
    if (w >= 4) pool.push("runner", "splitter");
    if (w >= 6) pool.push("charger", "orbiter");
    if (w >= 9) pool.push("splitter");
    if (w >= 14) pool.push("shooter", "charger");
    return pool;
  }
  const pool = poolUpToAct(a);
  // os tipos do ato atual saem com peso dobrado: é a novidade da era
  pool.push(...actDef(a).pool);
  return pool.length ? pool : ["grunter"];
}

/* A versão anterior declarava `const pool` e depois fazia `pool = pool.filter(...)`.
   Isso é TypeError: Assignment to constant variable — e a partir da wave 13 o
   pickType falhava em ~193 de cada 200 chamadas, então praticamente nenhum
   inimigo conseguia nascer. Também sorteava tipos como "splitter_veteran" que
   nunca existiram no EDEF. Agora a variante é derivada de variantOf(). */
export function pickType(w) {
  const pool = poolForWave(w);
  const base = pick(pool);
  if (!BASE_TYPES.includes(base)) return base;

  /* Tier: teto pela onda, e dentro da faixa vai migrando do tier-1 para o teto.
     Antes `Math.min(tier, 2)` grampeava tudo no abissal, então da onda 20 até a
     290 o inimigo mais forte possível era o mesmo. */
  const top = maxTier(w);
  if (top <= 0) return base;
  const t = Math.random() < tierChance(w) ? top : Math.max(0, top - 1);
  return variantOf(base, t);
}

export function spawnEnemy(type) {
  if (S.enemies.length >= MAX_ENEMIES) return null;
  const d = EDEF[type];
  if (!d) {
    // Rede de segurança: nunca mais derruba o update() por um tipo inexistente.
    console.warn("[waves] tipo de inimigo desconhecido:", type);
    return;
  }

  let x, y, tries = 0;
  do {
    const side = ri(0, 3);
    if (side === 0) { x = rnd(0, W); y = -20; }
    else if (side === 1) { x = rnd(0, W); y = H + 20; }
    else if (side === 2) { x = -20; y = rnd(0, H); }
    else { x = W + 20; y = rnd(0, H); }
    tries++;
  } while (
    tries < 8 &&
    S.players.some((p) => !p.dead && dist(x, y, headPx(p).x, headPx(p).y) < 220)
  );

  // Encounters arrive near the action instead of crossing an empty world.
  const alive = S.players.filter(p => !p.dead);
  if (alive.length) {
    const h = headPx(pick(alive));
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = rnd(0, Math.PI * 2), radius = rnd(520, 730);
      x = Math.max(35, Math.min(W - 35, h.x + Math.cos(angle) * radius));
      y = Math.max(35, Math.min(H - 35, h.y + Math.sin(angle) * radius));
      if (alive.every(p => dist(x, y, headPx(p).x, headPx(p).y) >= 320)) break;
    }
  }
  const boss = !!d.boss;
  let hp = scaledEnemyHp(d, S.wave, S.players, bossCount(S.wave));
  let spd = d.spd * enemySpdMul(S.wave);
  if (d.final && S.finalArena) {
    x = S.finalArena.x + S.finalArena.w / 2;
    y = S.finalArena.y + 105;
    spd = 0;
  }

  if (S.waveMod) {
    if (S.waveMod.id === "fast") spd *= 1.25;
    if (S.waveMod.id === "tank" && !boss) hp *= 1.6;
    if (S.waveMod.id === "swarm" && !boss) hp *= 0.6;
  }

  /* Só inimigo comum pode virar "elite". Antes boss5/boss6/boss_elite caíam
     no else-if genérico e podiam ganhar x3 de vida em cima da escala de onda. */
  let elite = false;
  if (!boss && Math.random() < eliteChance(S.wave)) {
    elite = true;
    hp *= 2.4;
    spd *= 1.1;
  }

  spd *= MODE().enemySpd;

  /* AFIXOS — ver o comentário grande em data/enemies.js.
     `brand` é o afixo assinatura do tipo (Sanguessuga sempre cancela cura).
     Tiers 3+ ganham sorteados por cima, e o modo difícil/impossível soma mais. */
  const tier = tierOf(type);
  const affixes = [];
  if (d.brand) affixes.push(d.brand);
  if (!boss) {
    let extra = Math.max(0, tier - 2) + MODE().affixBonus + (elite ? 1 : 0);
    const pool = affixPoolFor(type).filter((k) => !affixes.includes(k));
    while (extra-- > 0 && pool.length) {
      affixes.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
  }
  if (affixes.includes("shielded")) hp *= 1.1;

  const enemy = {
    id: S.eid++,
    type,
    x, y,
    hp,
    mhp: Math.ceil(hp),
    spd,
    r: Math.round(d.r * (elite ? 1.2 : 1)),
    score: d.score * (elite ? 3 : 1),
    shT:
      S.waveMod && S.waveMod.id === "rage" && String(type).startsWith("shooter")
        ? rnd(0.5, 1.5)
        : rnd(1, 2.5),
    flash: 0,
    dot: 0,
    dotT: 0,
    lastHitBy: null,
    elite,
    enraged: false,
    ward: 0,
    tier,
    affixes,
    ...(boss ? {
      bossGates: d.final ? [0.66, 0.33] : [MODE().enrageAt],
      bossPhase: 0,
      bossSlot: S.enemies.filter(e => isBoss(e.type)).length,
      bossColor: d.c,
      anchored: !!d.final,
    } : {}),
  };
  S.enemies.push(enemy);
  return enemy;
}

/* Quais chefes nascem nesta onda.

   Agora é o ATO que decide, não uma conta de módulo: a onda 29 de cada ato tem
   o chefe daquela era (o clímax), e as ondas 10 e 20 têm um mini-chefe tirado do
   elenco do ato. Antes eram 58 lutas sorteadas de um balde de 6, com o mesmo
   chefe reaparecendo 7 ou 8 vezes na mesma run. */
export function chooseBosses(n) {
  if (n >= FINAL_WAVE) return ["boss_final"];

  const a = actOf(n);
  const def = actDef(a);
  const kind = bossKind(n);
  const count = bossCount(n);

  if (kind === "act") {
    const out = [def.actBoss];
    // A new act boss arrives with veterans introduced in previous acts.
    const veterans = ACT_DEFS.slice(0, a).map(d => d.actBoss).filter(b => b !== "boss_final");
    while (out.length < count) out.push(veterans[(n + out.length) % veterans.length] || def.mini[0]);
    return out;
  }

  const pool = a > 0 ? ACT_DEFS.slice(0, a).map(d => d.actBoss) : ["boss"];
  // Wave 20 repeats a familiar boss in a duo/trio; wave 10 mixes veterans.
  if (waveInAct(n) === 20) return Array(count).fill(pool[(a + 1) % pool.length]);
  return Array.from({ length: count }, (_, i) => pool[(a + i) % pool.length]);
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function startWave(n) {
  S.wave = n;
  S.phase = "play";
  S.bossHazards = [];
  S.finalArena = n >= FINAL_WAVE ? { x: 840, y: 1050, w: 1120, h: 700 } : null;
  setActPalette(actOf(n)); // o mundo troca de era junto com o ato
  S.waveMod = n >= 3 ? (Math.random() < 0.3 ? MODS[0] : pick(MODS)) : MODS[0];

  for (const p of S.players) {
    if (p.dead) respawn(p);
    if (p.relicCrown) p.hp = Math.min(p.maxHp, p.hp + 2);
    if (save.upg.cur) p.hp = Math.min(p.maxHp, p.hp + save.upg.cur);
    p.shield = Math.max(p.shield, p.shieldBase);
  }

  if (S.finalArena) {
    S.blocks = [];
    S.foods = [];
    S.bombs = [];
    S.pbullets = [];
    S.drops = [];
    S.ebullets = [];
    S.enemies = [];
    S.players.forEach((p, idx) => {
      const cx = 46 + idx * 8, cy = 54;
      p.cells = p.cells.map((_, i) => [cx - i, cy]);
      p.dir = { x: 1, y: 0 }; p.qdir = null;
      p.iframes = Math.max(p.iframes || 0, 2);
    });
  } else for (let i = 0; i < Math.min(3 + Math.floor(n / 2), 8); i++) addBlock();

  /* Entrada de ato: a onda 1 de cada ato anuncia a era. É o único banner que
     dura mais, porque é quando a paleta do mundo muda. */
  if (waveInAct(n) === 1) {
    const a = actDef(actOf(n));
    banner(
      a.ic + " ATO " + ROMAN[actOf(n)] + " — " + a.n,
      a.era + " · ondas " + (actOf(n) * 29 + 1) + " a " + (actOf(n) * 29 + 29),
    );
    sfx("boss");
  }

  let q;
  if (bossKind(n)) {
    // S.bossQueue é sempre reescrita — a versão antiga usava window.extraBosses
    // e nunca limpava, então chefes vazavam para ondas (e runs) seguintes.
    S.bossQueue = chooseBosses(n);
    S.bossLeft = S.bossQueue.length;
    S.waveBoss = S.bossQueue[0];

    const final = S.bossQueue[0] === "boss_final";
    const chefeDeAto = bossKind(n) === "act";
    const names = S.bossQueue.map(bossName);
    /* O NOME é o título. Antes o título era o genérico "⚠️ CHEFE ⚠️" e o
       nome ia para o subtítulo pequeno — daí a impressão de que o primeiro
       chefe não tinha nome. O nome também aparece na barra de vida agora. */
    banner(
      (final ? "☠️ " : "⚠️ ") + names.join(" · ") + (final ? " ☠️" : " ⚠️"),
      final
        ? "Arena sem paredes: atravesse uma borda e retorne pela outra. Três fases."
        : (names.length > 1
            ? names.length + " CHEFES AO MESMO TEMPO"
            : chefeDeAto
              ? "CHEFE DO ATO " + ROMAN[actOf(n)]
              : "MINI-CHEFE") +
          " · " + actDef(actOf(n)).n + " · onda " + n,
    );
    sfx("boss");
    q = final ? 1 : S.bossLeft + Math.floor(waveQuota(n) * 0.35);
  } else {
    S.bossQueue = [];
    S.bossLeft = 0;
    q = waveQuota(n);
    const sub =
      S.waveMod.id !== "none" ? S.waveMod.n + " — " + S.waveMod.d : "";
    banner("ONDA " + n, sub);
    sfx("up");
  }

  if (S.waveMod.id === "swarm" && !S.finalArena) q = Math.min(MAX_ENEMIES, Math.round(q * 1.6));
  S.spawnQ = q;
  S.spawnT = 1.2;
}

/* Cada chamada tira UM chefe da fila. A versão antiga fazia
   `spawnEnemy(waveBoss)` N vezes — ou seja, N cópias do MESMO chefe — e depois
   tentava compensar com um setTimeout solto fora do game loop, que podia
   despejar um chefe já na onda seguinte. */
export function spawnStep() {
  if (S.enemies.length >= MAX_ENEMIES) return false;
  if (S.bossLeft > 0 && S.bossQueue.length) {
    const type = S.bossQueue.shift();
    S.bossLeft--;
    spawnEnemy(type);
    shockwave(W / 2, H / 2, 200, (EDEF[type] || {}).c || "#fff", 6);
  } else {
    spawnEnemy(pickType(S.wave));
  }
  return true;
}

export { isBoss, bossName };
