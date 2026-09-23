/* ================= JOGADOR ================= */
import { COLS, ROWS, CELL, W, H, CRIT_DMG_BASE } from "../core/config.js";
import { enemyTouchDmg } from "../core/scaling.js";
import { S } from "../core/state.js";
import { save } from "../core/save.js";
import { clamp, dist, pick } from "../core/utils.js";
import { CLASSES } from "../data/classes.js";
import { UPGRADES, canOffer } from "../data/upgrades.js";
import { emptyTreeB, applyTree, finalizeTree } from "./tree.js";
import { clampStats } from "./stats.js";
import { initClass, classTick, glutaoMul } from "./classes.js";
import { MODE } from "../data/modes.js";
import { sfx } from "../core/audio.js";
import { addParts, addText } from "../render/fx.js";
import { toast } from "../ui/screens.js";
/* Ciclo proposital: food.js e run.js também importam deste arquivo.
   Módulos ES lidam bem com isso porque `export function` é hoisted — a ligação
   já existe antes de qualquer um dos dois ser executado, e as chamadas só
   acontecem em tempo de partida. */
import { eatFoodAt, blockAt } from "./food.js";
import { gameOver } from "./run.js";
/* Mesmo ciclo proposital dos dois acima: pvp.js importa headPx daqui. */
import { isPvp, pvpBounds, wrapX, wrapY, pvpEnd, pvpAimTarget, pvpHit } from "./pvp.js";
import { wrapArenaX, wrapArenaY } from "./arena.js";

export function headPx(p) {
  return {
    x: (p.cells[0][0] + 0.5) * CELL,
    y: (p.cells[0][1] + 0.5) * CELL,
  };
}

/** Velocidade da cabeça em px/s.
    `p.spd` é o intervalo em MILISSEGUNDOS entre um passo e outro, então a
    velocidade é uma célula a cada p.spd ms.

    Isto existe porque o sniper fazia `const velX = Hh.vx || 0` — e headPx()
    nunca devolveu vx/vy. A "predição extrema" somava exatamente zero e o tiro
    saía direto na posição atual. Agora ele mira de verdade à frente. */
export function headVel(p) {
  const pxPerSec = (CELL * 1000) / Math.max(1, p.spd);
  return { vx: p.dir.x * pxPerSec, vy: p.dir.y * pxPerSec };
}

export function makePlayer(cls, idx) {
  const c = CLASSES[cls] || CLASSES[0];
  const upg = S.mode === "pvp" ? Object.fromEntries(Object.keys(save.upg).map(k => [k, 0])) : save.upg;
  const p = {
    idx,
    cls,
    name: c.name,
    color: c.color,
    ic: c.ic,
    /* MODO: o difícil e o impossível começam com metade da vida.
       Arredonda para cima e nunca abaixo de 2, senão o Assassino (3 de vida)
       começaria com 1 e morreria no primeiro encostão. */
    hp: Math.max(2, Math.ceil((c.hp + upg.vit) * MODE().hpMul)),
    maxHp: Math.max(2, Math.ceil((c.hp + upg.vit) * MODE().hpMul)),
    dmg: c.dmg * (1 + 0.08 * upg.frc),
    /* Multiplicador de dano das CARTAS, somado e nao composto.

       Antes cada carta fazia `p.dmg *= 1.25`. Com 10 Forcas + 6 Furias +
       4 Presas + 3 Pactos isso da 1.25^10 * 1.4^6 * 1.6^4 * 2^3 = ~1500x,
       enquanto a vida do inimigo na onda 290 cresce 250x. Numa run de 50
       ondas voce nunca acumulava carta suficiente pra sentir; em 290 ondas
       o jogador passa a matar tudo de um tiro por volta da onda 150 e o
       resto da run vira passeio.

       Somando, o teto e o proprio limite de acumulo: 10*0.25 + 6*0.4 +
       4*0.6 + 3*1.0 = +10.3, ou seja 11.3x. Continua enorme, mas e FINITO
       e da pra balancear a vida do chefe contra ele. */
    dmgMul: 1,
    dmgFlat: 0,
    cd: c.cd * Math.pow(0.94, upg.vlt),
    /* Valor de classe puro. O piso de velocidade de ataque é relativo a ele
       (30% do original), então Assassino e Guerreiro não convergem para o
       mesmo número por acumular cartas de Frenesi. */
    cdBase: c.cd,
    at: 0.6,
    spd: c.spd,
    mt: 0,
    dir: { x: idx === 0 ? 1 : -1, y: 0 },
    qdir: null,
    cells: [],
    grow: 2,
    abCd: c.abCd * Math.pow(0.97,upg.focus || 0),
    abT: 0,
    abName: c.ab,
    pierce: 0,
    shots: 1,
    ls: 0,
    lsT: 0, // intervalo próprio da cura por roubo de vida (NERF do vampirismo)
    /* Debuffs do ato VIII em diante (e dos afixos):
       noRegenT — sustentação desligada; só coração de chão ainda cura.
       weakT/weakN — ataque reduzido, acumula até -40%. */
    noRegenT: 0,
    weakT: 0,
    weakN: 0,
    crit: 0.05 * upg.crt,
    /* Dano crítico virou ATRIBUTO. Era um `* 2` escrito à mão em dois arquivos,
       então não havia como melhorá-lo nem como converter taxa excedente. */
    critDmg: CRIT_DMG_BASE,
    range: 250 + 20*(upg.reach || 0),
    magnet: !!upg.mag,
    magnetR: upg.mag ? 190 + 25*(upg.collector || 0) : 0, // alcance de coleta, em pixels
    regenMax: 0,
    regenC: 0,
    venom: 0,
    // BUFF DO BOMBARDEIRO: a passiva era 1,2 — menos que a carta comum
    // "Detonação" (1,6). Agora vale mais que um upgrade qualquer.
    boom: cls === 5 ? 2.2 : 0,
    boomR: cls === 5 ? 78 : 60,
    thorns: 0,
    exec: false,
    iframeBonus: 0,
    soulMult: 1,
    goldLuck: false,
    goldBonus: 0,
    killHeal: 0,
    kc: 0,
    shieldBase: upg.esc,
    shield: upg.esc,
    shieldT: 0,
    iframes: 0,
    healT: 0,
    revLeft: upg.rev || 0,
    dead: false,
    kills: 0,
    apples: 0,
    necroC: 0,
    relicCrown: false,
    /* `powers` conta por id, `powerLog` guarda a ORDEM em que foram pegos.
       Antes powerLog guardava NOMES, então o menu não tinha como saber quantas
       vezes cada poder foi comprado nem o que ele faz — só repetia a caixa. */
    powers: {},
    powerLog: [],
    /* Multiplicador vindo da PASSIVA da classe (hoje só o Glutão usa: a
       força dele vem do tamanho da cobra). Fica separado de dmgMul para as
       cartas continuarem somando sem interferência. */
    sizeMul: 1,
    phaseT: 0,
    treeB: emptyTreeB(),
  };

  if (S.mode !== "pvp") { applyTree(p, save.tree); finalizeTree(p); }
  // Cascavel troca vida por alcance; o resto do ajuste de classe é em initClass.
  if (cls === 10) p.range *= 1.35;
  initClass(p);
  clampStats(p);

  const sx = idx === 0 ? 6 : COLS - 7;
  const sy = Math.floor(ROWS / 2);
  for (let i = 0; i < 3; i++) p.cells.push([sx - i * p.dir.x, sy]);

  /* Poderes iniciais da loja de almas. Agora respeitam pré-requisito e teto:
     antes um `pick(UPGRADES)` solto podia entregar "Veneno Concentrado" sem
     veneno, ou "Ímã de Comida" duas vezes. */
  const startN = ((upg.ben || 0) + (upg.ini || 0) + (S.mode !== "pvp" && save.supplies.blessing > 0 ? 1 : 0)) * (cls === 11 ? 2 : 1);
  for (let i = 0; i < startN; i++) {
    const pool = UPGRADES.filter((u) => canOffer(u, p));
    if (!pool.length) break;
    grantPower(p, pick(pool));
  }
  return p;
}

/** Aplica um poder e registra o nível. Único ponto que mexe em `powers`. */
export function grantPower(p, o) {
  if (!p || !o) return;
  o.f(p);
  p.powers[o.id] = (p.powers[o.id] || 0) + 1;
  p.powerLog.push(o.id);
  clampStats(p);
}

export function respawn(p) {
  p.dead = false;
  p.hp = Math.max(1, Math.ceil(p.maxHp / 2));
  p.dir = { x: p.idx === 0 ? 1 : -1, y: 0 };
  p.cells = [];
  const sx = p.idx === 0 ? 6 : COLS - 7;
  const sy = Math.floor(ROWS / 2);
  for (let i = 0; i < 3; i++) p.cells.push([sx - i * p.dir.x, sy]);
  p.grow = 2;
  p.iframes = 2;
}

/** Levanta um jogador caído no meio da onda (Colheita Sombria no co-op). */
export function revive(p, hp) {
  if (!p || !p.dead) return false;
  p.dead = false;
  p.hp = Math.max(1, hp || 2);
  p.iframes = 3;
  p.grow = 2;
  // reaparece onde o corpo caiu, não no canto do mapa
  if (!p.cells || !p.cells.length) {
    const sx = p.idx === 0 ? 6 : COLS - 7;
    const sy = Math.floor(ROWS / 2);
    p.cells = [];
    for (let i = 0; i < 3; i++) p.cells.push([sx - i * p.dir.x, sy]);
  }
  return true;
}

export function nearestEnemy(x, y, range) {
  let best = null;
  let bd = range;
  for (const e of S.enemies) {
    const d = dist(x, y, e.x, e.y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

export function nearestPlayer(x, y) {
  let best = null;
  let bd = Infinity;
  for (const p of S.players) {
    if (p.dead) continue;
    const Hh = headPx(p);
    const d = dist(x, y, Hh.x, Hh.y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/* Cura tem intervalo global — imortalidade por stacking de cura não existe.

   `fromDrop` marca a cura que vem de um coração caído no chão: ela é a ÚNICA
   que atravessa o bloqueio de regeneração. A ideia é que a Pestilenta (e os
   inimigos com afixo "noregen") desliguem a sustentação passiva — comida,
   abate, roubo de vida — sem tornar a luta impossível: o coração que cai no
   chão continua sendo uma saída, só que você precisa ir buscar. */
export function heal(p, n, fromDrop) {
  if (p.dead || !n) return;
  if (!fromDrop && p.noRegenT > 0) {
    const Hb = headPx(p);
    addText(Hb.x, Hb.y - 18, "regeneração bloqueada", "#8bd64a", 0.7, 12);
    return;
  }
  if (p.healT > 0) return;
  if (p.hp >= p.maxHp) return;
  // MODO impossível: toda cura vale metade.
  p.hp = Math.min(p.maxHp, p.hp + n * MODE().healMul);
  p.healT = 0.6;
  const Hh = headPx(p);
  addText(Hh.x, Hh.y - 18, "+" + n + "❤", "#7dff5e", 0.8, 13);
}

/* NERF DO VAMPIRISMO — a cura por roubo de vida agora tem intervalo PRÓPRIO,
   além do intervalo global de cura.

   O problema: com 5 projéteis e ataque rápido são ~15 acertos por segundo. Com
   30% de chance, isso era uma cura a cada 0,6s (o intervalo global), para
   sempre, sem custo nenhum — dava para ficar encostado num chefe e ganhar a
   corrida de cura contra o dano de contato. Agora é no máximo uma a cada 1,6s,
   e a chance máxima caiu de 30% para 22%. */
export function lifestealHeal(p) {
  if (!p || p.dead || p.lsT > 0) return;
  p.lsT = 1.6;
  heal(p, 1);
}

/** Desliga a sustentação do jogador por `secs` segundos. */
export function blockRegen(p, secs) {
  if (!p || p.dead) return;
  const novo = Math.max(p.noRegenT || 0, secs);
  if (novo > (p.noRegenT || 0) + 0.5) {
    const Hh = headPx(p);
    addText(Hh.x, Hh.y - 30, "☣ SEM REGENERAÇÃO", "#8bd64a", 1.1, 14);
  }
  p.noRegenT = novo;
}

/** Enfraquece o ataque. Acumula até o teto de -40%. */
export function weaken(p, secs) {
  if (!p || p.dead) return;
  p.weakT = Math.max(p.weakT || 0, secs);
  p.weakN = Math.min(4, (p.weakN || 0) + 1);
  const Hh = headPx(p);
  addText(Hh.x, Hh.y - 30, "⬇ ATAQUE -" + p.weakN * 10 + "%", "#ff9ec7", 1, 13);
}

/** Dano de inimigo no jogador, já com o escalonamento por ato.
    Existia como `damagePlayer(p, 1)` repetido em 8 lugares — todos fixos em 1,
    então a onda 290 machucava igual à onda 1. */
export function hitPlayer(p, mul = 1) {
  // MODO: +0,5 no difícil e no impossível — é o que cria o meio coração.
  damagePlayer(p, (isPvp() ? 1.1 + S.pvp.stacks * 0.08 : enemyTouchDmg(S.wave) + MODE().dmgTaken) * mul);
}

export function damagePlayer(p, n) {
  if (isPvp()) { pvpHit(p,n,null,"environment"); return; }
  if (p.dead) return;
  if (p.shieldT > 0) return; // Égide do Paladino: imune de verdade

  /* A checagem de invulnerabilidade vem ANTES do escudo. Estava depois, e o
     escudo não concedia i-frames: como o dano de contato é aplicado a cada
     frame, encostar num inimigo por 1/15 de segundo consumia 4 cargas de
     escudo de uma vez. Agora cada carga absorve um golpe, não um frame. */
  if (p.iframes > 0) return;

  const Hh = headPx(p);

  if (p.shield > 0) {
    p.shield--;
    p.iframes = 1.3 + p.iframeBonus;
    sfx("hurt");
    addText(Hh.x, Hh.y - 18, "bloqueou!", "#ffd75e", 0.8, 13);
    addParts(Hh.x, Hh.y, "#ffd75e", 8);
    return;
  }

  /* Dano pode ser fracionário (1,5 nos atos V-VII, 2 do VIII em diante, e +0,5
     no modo difícil), então existe meio coração. O arredondamento evita que
     somas de 0,5 deixem um resto de 0,0000001 de vida. */
  p.hp = Math.round((p.hp - n) * 2) / 2;
  p.iframes = 1.3 + p.iframeBonus;
  S.shake = Math.min(12, S.shake + 7);
  S.flash = 0.3;
  sfx("hurt");
  addParts(Hh.x, Hh.y, "#ff4d6d", 12);

  if (p.hp <= 0) {
    if (p.revLeft > 0) {
      p.revLeft = 0;
      p.hp = 2;
      p.iframes = 2.5;
      addText(Hh.x, Hh.y - 20, "SEGUNDA CHANCE!", "#ffd75e", 1.2, 16);
      addParts(Hh.x, Hh.y, "#ffd75e", 24, 3);
      sfx("gold");
      return;
    }
    p.hp = 0;
    p.dead = true;
    addParts(Hh.x, Hh.y, p.color, 30, 3);
    /* No PVP não há "renasce na próxima onda": morrer para a horda entrega a
       vitória para o outro. É a única forma de o relógio de 20 minutos ter
       peso — dá para jogar seguro, mas nunca de graça. */
    if (isPvp()) {
      toast("☠️ " + p.name + " caiu para a horda!");
      pvpEnd(1 - p.idx);
      return;
    }
    toast(
      "☠️ " + p.name + " caiu!" +
        (S.players.length > 1 ? " (renasce na próxima onda)" : ""),
    );
    if (S.players.every((q) => q.dead)) gameOver();
  }
}

export function updatePlayer(p, dt, fireShots) {
  if (S.finalArena) {
    p.cells = p.cells.map(([x,y]) => [wrapArenaX(x,S.finalArena),wrapArenaY(y,S.finalArena)]);
  }
  p.iframes = Math.max(0, p.iframes - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);
  p.abT = Math.max(0, p.abT - dt);
  p.healT = Math.max(0, p.healT - dt);
  p.lsT = Math.max(0, (p.lsT || 0) - dt);
  p.noRegenT = Math.max(0, (p.noRegenT || 0) - dt);
  p.weakT = Math.max(0, (p.weakT || 0) - dt);
  if (p.weakT <= 0) p.weakN = 0;

  // Passiva da classe (cabeças da Hidra, torres, digestão, gravação do tempo)
  p.sizeMul = glutaoMul(p);
  classTick(p, dt);

  p.mt -= dt * 1000;
  let guard = 0;
  while (p.mt <= 0 && guard++ < 6) {
    p.mt += p.spd * (p.pvpSlowT > 0 ? 1.25 : 1);
    stepSnake(p);
  }

  p.at -= dt;
  if (p.at <= 0) {
    const Hh = headPx(p);
    /* No PVP o oponente tem prioridade: dentro do alcance, é nele que a cobra
       atira. Fora do PVP pvpAimTarget() devolve null e nada muda. */
    const tgt = (isPvp() && pvpAimTarget(p, Hh)) || nearestEnemy(Hh.x, Hh.y, p.range);
    if (tgt) {
      p.at = p.cd / (p.sizeMul || 1) * (p.berserkT > 0 ? 0.45 : p.overdriveT > 0 ? 0.65 : 1);
      fireShots(p, Hh, tgt);
    } else {
      p.at = 0.1;
    }
  }
}

export function stepSnake(p) {
  if (p.qdir) {
    const d = p.qdir;
    p.qdir = null;
    // Não deixa dar meia-volta em cima do próprio pescoço.
    if (!(d.x === -p.dir.x && d.y === -p.dir.y)) p.dir = d;
  }
  const h = p.cells[0];
  /* Fora do PVP `pvpBounds()` devolve null e wrapX/wrapY caem no `% COLS` de
     sempre. Na morte súbita eles dobram dentro da caixinha, que é o que
     impede os dois de simplesmente correrem para lados opostos do mapa. */
  const b = pvpBounds();
  const nx = S.finalArena ? wrapArenaX(h[0] + p.dir.x, S.finalArena) : wrapX(h[0] + p.dir.x, b);
  const ny = S.finalArena ? wrapArenaY(h[1] + p.dir.y, S.finalArena) : wrapY(h[1] + p.dir.y, b);
  p.cells.unshift([nx, ny]);
  if (p.grow > 0) p.grow--;
  else p.cells.pop();

  eatFoodAt(p, nx, ny);

  /* ================= COLISÃO COM A PRÓPRIA CAUDA =================
     No modo normal a cobra atravessa o próprio corpo — é o que permite as
     builds que enrolam no meio da horda, e tirar isso quebraria o jogo que já
     existe. No difícil ela tira 2 e no impossível 4.

     `tailDmg === 0` desliga a checagem inteira, então o modo normal nem paga o
     custo do laço. Ultimates com efeito de fase também permitem atravessar.

     Começa no índice 4 porque os três primeiros segmentos são o pescoço e
     estão sempre colados na cabeça por construção. */
  const tailDmg = MODE().tailDmg;
  if (tailDmg > 0 && p.phaseT <= 0 && p.iframes <= 0) {
    for (let i = 4; i < p.cells.length; i++) {
      if (p.cells[i][0] === nx && p.cells[i][1] === ny) {
        damagePlayer(p, tailDmg);
        S.shake = Math.min(14, S.shake + 8);
        addText((nx + 0.5) * CELL, (ny + 0.5) * CELL - 20, "A PRÓPRIA CAUDA!", "#ff4d6d", 1.1, 14);
        addParts((nx + 0.5) * CELL, (ny + 0.5) * CELL, "#ff4d6d", 12);
        break;
      }
    }
  }

  const block = blockAt(nx, ny);
  // Fase Ectoplasmática atravessa obstáculo.
  if (block && p.phaseT > 0) return;
  if (block) {
    damagePlayer(p, 1);
    block.hp -= 3;
    addParts((nx + 0.5) * CELL, (ny + 0.5) * CELL, "#a86bff", 6);
  }
}

export { clamp, dist, W, H };
