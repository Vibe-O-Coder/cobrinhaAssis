import { BOSS_DESCRIPTIONS } from './ecology.js';
/* ================= INIMIGOS =================
   Cada entrada define aparência e stats-base. O escalonamento por onda fica em
   game/waves.js.

   `pattern` diz qual comportamento game/enemies.js aplica. Variantes não são só
   "mais vida": elas trocam de padrão (ex.: o atirador veterano passa a dar
   rajada de 3, o abissal atira em leque).

   IMPORTANTE: toda chave usada em VARIANTS precisa existir aqui. A versão
   anterior sorteava `splitter_veteran`, `charger_veteran`, `orbiter_veteran`,
   `healer_veteran` e `sniper_veteran` sem nunca tê-los definido, e o jogo
   quebrava com "Cannot read properties of undefined (reading 'hp')". */

import { ENEMY_SPECIES, NEW_BOSSES, BOSS_ROSTER } from './ecology.js';
export const EDEF = {
  /* ---------- comuns ---------- */
  grunter: { hp: 3, spd: 55, r: 13, score: 2, c: "#ff5d7f", art: "grunter", pattern: "chase" },
  grunter_veteran: { hp: 6, spd: 64, r: 15, score: 5, c: "#ff3355", art: "grunter", pattern: "chase_lunge" },
  grunter_abissal: { hp: 11, spd: 70, r: 17, score: 9, c: "#c9002f", art: "grunter", pattern: "chase_lunge" },

  runner: { hp: 2, spd: 112, r: 11, score: 2, c: "#ffd75e", art: "runner", pattern: "chase" },
  runner_veteran: { hp: 5, spd: 128, r: 13, score: 5, c: "#ffaa00", art: "runner", pattern: "zigzag" },
  runner_abissal: { hp: 9, spd: 142, r: 14, score: 9, c: "#ff7700", art: "runner", pattern: "zigzag" },

  shooter: { hp: 4, spd: 40, r: 14, score: 3, c: "#4dc3ff", art: "shooter", pattern: "shoot_single" },
  shooter_veteran: { hp: 8, spd: 48, r: 16, score: 7, c: "#0099ff", art: "shooter", pattern: "shoot_burst" },
  shooter_abissal: { hp: 14, spd: 54, r: 17, score: 12, c: "#0066cc", art: "shooter", pattern: "shoot_fan" },

  tank: { hp: 14, spd: 26, r: 20, score: 5, c: "#ff9838", art: "tank", pattern: "chase" },
  tank_veteran: { hp: 26, spd: 30, r: 22, score: 10, c: "#e07000", art: "tank", pattern: "chase_slam" },
  tank_abissal: { hp: 42, spd: 34, r: 24, score: 16, c: "#b35400", art: "tank", pattern: "chase_slam" },

  splitter: { hp: 5, spd: 46, r: 14, score: 3, c: "#ff7bd5", art: "splitter", pattern: "chase" },
  splitter_veteran: { hp: 9, spd: 54, r: 16, score: 6, c: "#ff3cb0", art: "splitter", pattern: "chase" },
  splitter_abissal: { hp: 15, spd: 60, r: 17, score: 11, c: "#d4008c", art: "splitter", pattern: "chase" },

  /* `spd` era 0 nos três: o padrão "orbit" não usava velocidade nenhuma,
     ele teleportava o bicho para a posição da órbita. Ver o comentário
     grande em game/enemies.js. Agora estes números são usados de verdade. */
  orbiter: { hp: 4, spd: 165, r: 10, score: 3, c: "#6ee7ff", art: "orbiter", pattern: "orbit" },
  orbiter_veteran: { hp: 8, spd: 185, r: 12, score: 6, c: "#22c9ff", art: "orbiter", pattern: "orbit_shoot" },
  orbiter_abissal: { hp: 13, spd: 205, r: 13, score: 10, c: "#00a3d4", art: "orbiter", pattern: "orbit_shoot" },

  healer: { hp: 6, spd: 42, r: 13, score: 4, c: "#7dff5e", art: "healer", pattern: "heal" },
  healer_veteran: { hp: 11, spd: 50, r: 15, score: 8, c: "#3ce01a", art: "healer", pattern: "heal_shield" },
  healer_abissal: { hp: 18, spd: 56, r: 16, score: 13, c: "#26a810", art: "healer", pattern: "heal_shield" },

  charger: { hp: 6, spd: 55, r: 15, score: 4, c: "#ff9838", art: "charger", pattern: "charge" },
  charger_veteran: { hp: 11, spd: 62, r: 17, score: 8, c: "#ff6a00", art: "charger", pattern: "charge_double" },
  charger_abissal: { hp: 18, spd: 68, r: 18, score: 13, c: "#cc4400", art: "charger", pattern: "charge_double" },

  sniper: { hp: 6, spd: 20, r: 13, score: 5, c: "#ff4d6d", art: "sniper", pattern: "snipe" },
  sniper_veteran: { hp: 11, spd: 24, r: 14, score: 9, c: "#ff2e52", art: "sniper", pattern: "snipe" },
  sniper_abissal: { hp: 17, spd: 28, r: 15, score: 14, c: "#c4001f", art: "sniper", pattern: "snipe_double" },

  /* ---------- novos ---------- */
  bomber: { hp: 5, spd: 62, r: 14, score: 4, c: "#ffb300", art: "bomber", pattern: "suicide" },
  bomber_veteran: { hp: 9, spd: 72, r: 16, score: 8, c: "#ff8f00", art: "bomber", pattern: "suicide" },
  bomber_abissal: { hp: 15, spd: 80, r: 17, score: 13, c: "#e65100", art: "bomber", pattern: "suicide" },

  weaver: { hp: 5, spd: 88, r: 12, score: 4, c: "#c77dff", art: "weaver", pattern: "weave" },
  weaver_veteran: { hp: 9, spd: 100, r: 13, score: 8, c: "#a04dff", art: "weaver", pattern: "weave_shoot" },
  weaver_abissal: { hp: 15, spd: 112, r: 14, score: 13, c: "#7c1fff", art: "weaver", pattern: "weave_shoot" },

  warden: { hp: 10, spd: 34, r: 17, score: 6, c: "#8fa8ff", art: "warden", pattern: "ward" },
  warden_veteran: { hp: 18, spd: 40, r: 19, score: 11, c: "#5c7cff", art: "warden", pattern: "ward" },
  warden_abissal: { hp: 28, spd: 44, r: 20, score: 17, c: "#2f4fe0", art: "warden", pattern: "ward" },

  spitter: { hp: 5, spd: 44, r: 13, score: 4, c: "#5effd1", art: "spitter", pattern: "shoot_fan" },
  spitter_veteran: { hp: 9, spd: 52, r: 15, score: 8, c: "#00e5a0", art: "spitter", pattern: "shoot_fan" },
  spitter_abissal: { hp: 15, spd: 58, r: 16, score: 13, c: "#00b37e", art: "spitter", pattern: "shoot_spiral" },

  /* ---------- sanguessuga: CANCELA REGENERAÇÃO ----------
     Pedido: "Inimigo que cancela regeneração por um curto tempo". Ele não
     empurra nem dá dano grande — o perigo é você perder a sustentação no meio
     de uma onda e só perceber quando a vida não volta. */
  leech: { hp: 7, spd: 74, r: 12, score: 5, c: "#9be36a", art: "leech", pattern: "leech", brand: "noregen" },
  leech_veteran: { hp: 13, spd: 84, r: 14, score: 9, c: "#6fc93c", art: "leech", pattern: "leech", brand: "noregen" },
  leech_abissal: { hp: 21, spd: 92, r: 15, score: 15, c: "#3f9c18", art: "leech", pattern: "leech_burst", brand: "noregen" },

  /* ---------- quebrador: REDUZ O ATAQUE ----------
     Pedido: "Inimigo que diminui o ataque ao atingir o player". Enfraquece por
     6s e acumula até -40%; obriga a matar ele antes de continuar a onda. */
  breaker: { hp: 9, spd: 58, r: 15, score: 6, c: "#ff9ec7", art: "breaker", pattern: "charge", brand: "weaken" },
  breaker_veteran: { hp: 16, spd: 66, r: 17, score: 11, c: "#ff5ba7", art: "breaker", pattern: "charge_double", brand: "weaken" },
  breaker_abissal: { hp: 26, spd: 72, r: 18, score: 18, c: "#d4007a", art: "breaker", pattern: "charge_double", brand: "weaken" },

  mortar: { hp: 12, spd: 28, r: 19, score: 8, c: "#ffbe55", art: "tank", pattern: "mortar" },
  mortar_veteran: { hp: 21, spd: 32, r: 21, score: 13, c: "#ffa126", art: "tank", pattern: "mortar" },
  mortar_abissal: { hp: 33, spd: 37, r: 23, score: 20, c: "#ed7810", art: "tank", pattern: "mortar" },
  sentinel: { hp: 9, spd: 46, r: 16, score: 7, c: "#75c5ff", art: "warden", pattern: "crossfire" },
  sentinel_veteran: { hp: 16, spd: 52, r: 18, score: 12, c: "#45a3ff", art: "warden", pattern: "crossfire" },
  sentinel_abissal: { hp: 26, spd: 58, r: 20, score: 19, c: "#1681ed", art: "warden", pattern: "crossfire" },
  stalker: { hp: 8, spd: 98, r: 12, score: 7, c: "#f39aff", art: "weaver", pattern: "stalk" },
  stalker_veteran: { hp: 14, spd: 110, r: 14, score: 12, c: "#df70ff", art: "weaver", pattern: "stalk" },
  stalker_abissal: { hp: 23, spd: 121, r: 15, score: 19, c: "#bb3fe6", art: "weaver", pattern: "stalk" },

  /* ---------- filhotes ---------- */
  mini: { hp: 2, spd: 95, r: 9, score: 1, c: "#ff7bd5", art: "splitter", pattern: "chase" },

  /* ---------- chefes ----------
     `hp` é a vida BASE; a curva por onda está em core/scaling.js (bossHpMul).
     Antes cada chefe carregava um `hpF(wave)` próprio, e boss5/boss6/boss_elite
     nem tinham um — caíam no escalonamento genérico E ainda podiam ser
     sorteados como "elite" (x3 de vida), virando sacos de pancada. */
  boss: {
    hp: 70, spd: 38, r: 34, score: 25, c: "#ff2e88", art: "boss",
    boss: true, name: "ZARATH, O PRIMOGÊNITO", pattern: "boss_nova",
  },
  boss2: {
    hp: 80, spd: 34, r: 36, score: 30, c: "#b04dff", art: "boss2",
    boss: true, name: "MORVÉLIA, A NECRARCA", pattern: "boss_summon",
  },
  boss3: {
    hp: 75, spd: 40, r: 32, score: 30, c: "#ff5252", art: "boss3",
    boss: true, name: "GRIMHOLD, O CARRASCO", pattern: "boss_dash",
  },
  boss4: {
    hp: 70, spd: 30, r: 30, score: 30, c: "#7c6bff", art: "boss4",
    boss: true, name: "NIHIL, O VAZIO", pattern: "boss_blink",
  },
  boss5: {
    hp: 90, spd: 36, r: 38, score: 35, c: "#00ffff", art: "boss5",
    boss: true, name: "IRIDIS, O PRISMA", pattern: "boss_laser",
  },
  boss6: {
    hp: 85, spd: 42, r: 35, score: 35, c: "#ff00ff", art: "boss6",
    boss: true, name: "ZUMM, A COLMEIA", pattern: "boss_orbitals",
  },
  boss_elite: {
    hp: 120, spd: 40, r: 42, score: 60, c: "#ff3333", art: "boss_elite",
    boss: true, elite: true, name: "O ARAUTO DO FIM", pattern: "boss_herald",
  },
  /* Ato VIII — o chefe que CANCELA REGENERAÇÃO por muito tempo (pedido).
     Enquanto a praga está no ar, cura de comida, de abate e de roubo de vida
     não funcionam. É a luta que pune quem depende de sustentação. */
  boss_plague: {
    hp: 150, spd: 33, r: 44, score: 80, c: "#8bd64a", art: "boss_plague",
    boss: true, elite: true, name: "PESTILENTA, A MÃE DA PRAGA",
    pattern: "boss_plague", brand: "noregen",
  },
  /* Ato IX — o chefe que REDUZ O ATAQUE a cada acerto (pedido). */
  boss_tyrant: {
    hp: 165, spd: 37, r: 46, score: 90, c: "#ff4d9d", art: "boss_tyrant",
    boss: true, elite: true, name: "O TIRANO DE FERRO",
    pattern: "boss_tyrant", brand: "weaken",
  },
  boss_final: {
    hp: 200, spd: 0, r: 132, score: 250, c: "#ffd75e", art: "boss_final",
    boss: true, elite: true, final: true, name: "O DEVORADOR DE MUNDOS",
    pattern: "boss_final",
  },
};

/* Tipos-base que podem virar variante. */
export const BASE_TYPES = ENEMY_SPECIES.map(e=>e.id);

export const SUFFIX = [
  "", "_veteran", "_abissal", "_infernal", "_primordial", "_corrompido",
];

export const TIER_NAMES = [
  "", "Veterano", "Abissal", "Infernal", "Primordial", "Corrompido",
];

/* ---------------------------------------------------------------------------
   TIERS 3, 4 e 5 — gerados a partir do abissal

   Escrever 15 tipos-base x 3 tiers = 45 entradas à mão seria 45 oportunidades
   de errar um número e 45 linhas quase idênticas. Pior: foi exatamente isso que
   quebrou a versão antiga, que sorteava `splitter_veteran` sem ter definido.

   O que muda de verdade num tier alto não é o número — é o AFIXO. Cada tier
   acima do abissal carrega um afixo garantido a mais (ver `brand` e
   game/enemies.js), então o infernal não é "o abissal com mais vida", é o
   abissal que também explode, ou que também cancela sua regeneração. */
const TIER_MUL = { hp: 1.75, spd: 1.055, score: 1.6 };

function darken(hex, f) {
  const n = parseInt(String(hex).slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return "#" + ((c[0] << 16) | (c[1] << 8) | c[2]).toString(16).padStart(6, "0");
}

for (const base of BASE_TYPES) {
  const src = EDEF[base + "_abissal"] || EDEF[base];
  if (!src) continue;
  for (let t = 3; t <= 5; t++) {
    const k = t - 2; // quantos passos acima do abissal
    EDEF[base + SUFFIX[t]] = {
      ...src,
      hp: Math.round(src.hp * Math.pow(TIER_MUL.hp, k) * 10) / 10,
      spd: Math.round(src.spd * Math.pow(TIER_MUL.spd, k)),
      r: src.r + k,
      score: Math.round(src.score * Math.pow(TIER_MUL.score, k)),
      c: darken(src.c, 1 + k * 0.12), // tiers altos ficam mais berrantes
      art: src.art || base,
    };
  }
}

/** Devolve a versão do tipo no tier pedido, caindo pro mais forte que existir. */
export function variantOf(base, tier) {
  for (let t = Math.min(tier, SUFFIX.length - 1); t > 0; t--) {
    const key = base + SUFFIX[t];
    if (EDEF[key]) return key;
  }
  return base;
}

/** Tier (0-5) a partir do nome do tipo. */
export function tierOf(type) {
  if(EDEF[type]?.rank!==undefined)return EDEF[type].rank;
  for (let t = SUFFIX.length - 1; t > 0; t--) {
    if (String(type).endsWith(SUFFIX[t])) return t;
  }
  return 0;
}

export const BOSS_POOL = BOSS_ROSTER.filter(b=>b.id!=='boss_final').map(b=>b.id);

export function isBoss(type) {
  return !!(EDEF[type] && EDEF[type].boss);
}

/* Todo chefe do EDEF tem `name`. O "CHEFE" genérico sobrou como rede de
   segurança para um tipo inválido — e era ele que aparecia na tela, porque o
   banner usava "⚠️ CHEFE ⚠️" como TÍTULO e jogava o nome no subtítulo
   pequeno. Agora o nome é o título (ver game/waves.js) e ainda aparece na
   barra de vida do chefe (ver render/hud.js). */
export function bossName(type) {
  return (EDEF[type] && EDEF[type].name) || "CHEFE DESCONHECIDO";
}

/* ================= AFIXOS =================
   O que faz um inimigo de tier alto ser diferente não é a vida — é isto.

   O pedido era "gostaria que os modos mudassem o comportamento dos inimigos,
   especialmente porque bosses que só ficam jogando projéteis fica meio chato".
   Afixo é a resposta barata e composta para isso: o mesmo Corredor Corrompido
   pode ser o que explode, o que te deixa sem cura, ou o que enfurece os colegas
   ao morrer — e você lê qual é pelo anel colorido em volta dele.

   `brand` no EDEF força um afixo (a Sanguessuga SEMPRE cancela regeneração).
   Tiers 3+ ganham afixos sorteados por cima, e os modos difícil/impossível
   somam mais. */

export const AFFIXES = {
  noregen: {
    n: "Pestilento", ic: "☣", c: "#8bd64a",
    d: "cancela sua regeneração ao acertar",
  },
  weaken: {
    n: "Corrosivo", ic: "⬇", c: "#ff9ec7",
    d: "reduz seu ataque ao acertar",
  },
  explosive: {
    n: "Instável", ic: "💥", c: "#ff9838",
    d: "explode ao morrer",
  },
  shielded: {
    n: "Couraçado", ic: "🛡", c: "#8fa8ff",
    d: "recebe 25% menos dano",
  },
  hasty: {
    n: "Frenético", ic: "⚡", c: "#ffd75e",
    d: "dispara arrancadas de velocidade",
  },
  vengeful: {
    n: "Vingativo", ic: "🔥", c: "#ff5252",
    d: "enfurece os aliados ao morrer",
  },
};

export const AFFIX_KEYS = Object.keys(AFFIXES);

Object.assign(EDEF, NEW_BOSSES);
for(const species of ENEMY_SPECIES) {
  for(let rank=0;rank<=2;rank++) {
    const id=species.id+['','_veteran','_elite'][rank];
    EDEF[id]={...species,base:species.id,rank,hp:species.hp*[1,1.65,2.5][rank],spd:species.spd*[1,1.08,1.14][rank],r:species.r+rank,
      name:species.name+['',' Veterano',' de Elite'][rank],svg:'assets/enemies/'+species.id+'.svg'};
  }
  // Alias de saves/replays e do elenco legado de PVP.
  EDEF[species.id+'_abissal']={...EDEF[species.id+'_elite']};
}
for(const b of BOSS_ROSTER)Object.assign(EDEF[b.id],{stage:b.stage,unlock:b.unlock,svg:'assets/bosses/'+b.id+'.svg',description:BOSS_DESCRIPTIONS[b.id]});

/** Afixos que combinam com o tipo. Um atirador parado não ganha "Frenético". */
export function affixPoolFor(type) {
  const d = EDEF[type] || {};
  const pat = String(d.pattern || "");
  let pool = AFFIX_KEYS.slice();
  if (pat.startsWith("orbit") || pat.startsWith("snipe")) {
    pool = pool.filter((k) => k !== "hasty");
  }
  if (pat === "suicide") pool = pool.filter((k) => k !== "explosive");
  return pool;
}
