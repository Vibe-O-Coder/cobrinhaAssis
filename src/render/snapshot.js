/* ================= SNAPSHOT DE ESTADO =================
   LIVE()  -> o que o host/solo desenha (referências diretas, custo zero)
   snap()  -> o que vai pela rede (compacto)
   applySnapshot() -> o convidado recebe e SUAVIZA

   Sobre o lag: o host manda ~20 pacotes por segundo. Sem suavização, o
   convidado via os inimigos "teleportando" de pacote em pacote — o que parece
   lag mesmo quando a rede está boa. Agora cada entidade tem uma posição de
   exibição que persegue a posição recebida, então o movimento fica contínuo
   mesmo com pacotes espaçados. */

import { S } from "../core/state.js";
import { NET_TICK_MS } from "../core/config.js";
import { reconcilePrediction, tickPrediction, predictedPlayers, resetPrediction } from "../net/prediction.js";
import { setActPalette } from "./canvas.js";
import { actOf } from "../core/scaling.js";
import { drainNetFx, applyNetFx } from "./fx.js";

export function LIVE() {
  return {
    pvp: S.pvp,
    players: S.players,
    enemies: S.enemies,
    pbullets: S.pbullets,
    ebullets: S.ebullets,
    foods: S.foods,
    drops: S.drops,
    blocks: S.blocks,
    bombs: S.bombs,
    wave: S.wave,
    score: S.score,
    paused: S.paused,
    mod: S.waveMod && S.waveMod.id !== "none" ? S.waveMod : null,
  };
}

/* `powerLog` saiu do pacote por tick: ele só muda quando alguém escolhe um
   poder, e ia junto 20x por segundo à toa. Agora vai no evento "powers". */
export function snap() {
  const peer = S.players[1]?.cells?.[0];
  const visible = e => !peer || Math.abs(e.x-(peer[0]+0.5)*28)<1100 && Math.abs(e.y-(peer[1]+0.5)*28)<1100;
  return {
    seq: ++S.stateSeq, time: S.gameT, mode: S.mode,
    pvp: S.pvp ? {t:S.pvp.t,stacks:S.pvp.stacks,sudden:S.pvp.sudden,arena:S.pvp.arena,over:S.pvp.over,winner:S.pvp.winner,choices:S.pvp.choices,pending:S.pvp.pending,meteors:S.pvp.meteors.map(m=>({x:m.x,y:m.y,r:m.r,t:m.t}))} : null,
    wave: S.wave,
    score: S.score,
    paused: S.paused,
    phase: S.phase,
    souls: S.runSouls,
    combo: S.combo,
    mod:
      S.waveMod && S.waveMod.id !== "none"
        ? { n: S.waveMod.n, d: S.waveMod.d }
        : null,
    left: S.enemies.length + S.spawnQ,
    players: S.players.map((p) => ({
      ...Object.fromEntries(["level","xp","xpNext","guard","guardMax","guardRate","guardT","pvpIf","pvpIfBonus","pvpDmg","pvpRes","dodge","itemT","itemCdMul","kills","pvpKills","spd","mt","grow","dmg","dmgMul","dmgFlat","cd","cdBase","shots","pierce","range","crit","critDmg","venom","boom","boomR","ls","thorns","magnetR","abName","name","inputAck","iframeBonus","shieldBase","soulMult","regenMax","sizeMul","pvpSlowT","berserkT"].map(k=>[k,p[k]])),
      item: p.item, powers:p.powers, powerLog:p.powerLog,
      idx: p.idx,
      cls: p.cls,
      color: p.color,
      hp: p.hp,
      maxHp: p.maxHp,
      dead: p.dead,
      shield: p.shield,
      shieldT: Math.round(p.shieldT * 10) / 10,
      abT: Math.round(p.abT * 10) / 10,
      abCd: p.abCd,
      iframes: Math.round(p.iframes * 10) / 10,
      dir: p.dir, qdir:p.qdir,
      cells: p.cells,
      /* Classes novas que desenham FORA do corpo da cobra. Sem estes dois
         campos o convidado veria o Engenheiro e a Hidra atirando do nada. */
      turrets: p.turrets && p.turrets.length
        ? p.turrets.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), life: Math.round(t.life * 10) / 10 }))
        : undefined,
      heads: p.heads && p.heads.length ? p.heads : undefined,
    })),
    enemies: S.enemies.filter(visible).map((e) => ({
      id: e.id,
      x: Math.round(e.x),
      y: Math.round(e.y),
      hp: Math.max(0, Math.round(e.hp)),
      mhp: e.mhp,
      type: e.type,
      r: e.r,
      flash: e.flash > 0 ? 1 : 0,
      elite: e.elite ? 1 : 0,
      enraged: e.enraged ? 1 : 0,
      tier: e.tier || 0,
      ward: e.ward || 0,
      // afixos e estados: o convidado precisa deles para desenhar os anéis
      affixes: e.affixes && e.affixes.length ? e.affixes : undefined,
      openT: e.openT > 0 ? 1 : 0,
      stunT: e.stunT > 0 ? 1 : 0,
      cursedT: e.cursedT > 0 ? 1 : 0,
      mode: e.mode,
      fphase: e.fphase,
      orb: e.orb ? Math.round(e.orb * 100) / 100 : undefined,
      armed: e.armed ? 1 : 0,
    })),
    pbullets: S.pbullets.filter(visible).map((b) => ({
      x: Math.round(b.x), y: Math.round(b.y),
      vx: Math.round(b.vx), vy: Math.round(b.vy),
      crit: b.crit ? 1 : 0, color: b.color, trail: b.trail ? 1 : 0,
    })),
    ebullets: S.ebullets.filter(visible).map((b) => ({
      x: Math.round(b.x), y: Math.round(b.y),
      vx: Math.round(b.vx), vy: Math.round(b.vy),
      r: b.r, c: b.c, trail: b.trail ? 1 : 0,
    })),
    foods: S.foods.map((f) => ({ x: f.x, y: f.y, t: f.t })),
    drops: S.drops.map((f) => ({
      x: Math.round(f.x), y: Math.round(f.y), t: f.t,
      life: Math.round(f.life), born: f.born,
    })),
    blocks: S.blocks.map((b) => ({ x: b.x, y: b.y, hp: b.hp })),
    bombs: S.bombs.map((b) => ({
      x: Math.round(b.x), y: Math.round(b.y), t: Math.round(b.t * 10) / 10, r: b.r,
    })),
    // efeitos e números de dano NOVOS desde o último pacote
    fx: drainNetFx(),
    /* Estado da escolha de poder vai JUNTO do pacote periódico.
       As mensagens "up"/"pick"/"go" eram enviadas uma única vez, sem confirmação
       e sem reenvio — e o MQTT publica com QoS 0, ou seja, sem garantia de
       entrega. Um único pacote perdido travava a partida para sempre: ou o
       convidado nunca via as cartas, ou continuava com a tela de escolha por
       cima do jogo. Indo no pacote de estado (20x/s), qualquer perda se
       corrige sozinha no tique seguinte. */
    pick: S.pickState
      ? {
          deck: S.pickState.deck,
          opts: S.pickState.opts,
          relic: S.pickState.relic,
          alive: S.pickState.alive,
          picked: [...S.pickState.picked],
        }
      : null,
  };
}

/* --- suavização no convidado --- */

let receivedAt = 0;
const smooth = new Map(); // id do inimigo -> {x, y}

export function applySnapshot(d) {
  const prev = S.rs;
  if (prev && d.seq <= prev.seq) return false;
  if (!S.runActive) return false;
  S.rs = d;
  S.phase = d.phase; S.paused = !!d.paused;
  S.mode = d.mode || S.mode;
  if (d.pvp) S.pvp = d.pvp;
  setActPalette(actOf(d.wave));
  receivedAt = performance.now();
  reconcilePrediction(d);

  // Efeitos chegam como eventos: entram na lista local e envelhecem aqui.
  if (d.fx) applyNetFx(d.fx);

  // Mantém a posição suavizada de cada inimigo que continua vivo.
  const alive = new Set();
  for (const e of d.enemies) {
    alive.add(e.id);
    const s = smooth.get(e.id);
    if (s) {
      // guarda onde ele estava desenhado e para onde deve ir
      e._dx = s.x;
      e._dy = s.y;
    } else {
      e._dx = e.x;
      e._dy = e.y;
      smooth.set(e.id, { x: e.x, y: e.y });
    }
  }
  for (const id of [...smooth.keys()]) {
    if (!alive.has(id)) smooth.delete(id);
  }
  return true;
}

/** Aproxima as posições desenhadas das recebidas. Chamado todo frame. */
export function interpolateSnapshot(dt) {
  const d = S.rs;
  if (!d) return;
  tickPrediction(dt);
  // Converge em ~1,5 tick de rede: rápido o bastante pra não "arrastar",
  // lento o bastante pra esconder o intervalo entre pacotes.
  const k = 1 - Math.exp(-(1000 / NET_TICK_MS) * 1.5 * dt);
  for (const e of d.enemies) {
    if (e._dx === undefined) { e._dx = e.x; e._dy = e.y; }
    e._dx += (e.x - e._dx) * k;
    e._dy += (e.y - e._dy) * k;
    const s = smooth.get(e.id);
    if (s) { s.x = e._dx; s.y = e._dy; }
  }
}

/** Visão já suavizada, pronta pro render. */
export function smoothedView() {
  const d = S.rs;
  if (!d) return null;
  return {
    ...d,
    players: predictedPlayers(d.players),
    pbullets: extrapolate(d.pbullets),
    ebullets: extrapolate(d.ebullets),
    enemies: d.enemies.map((e) =>
      e._dx === undefined ? e : { ...e, x: e._dx, y: e._dy },
    ),
  };
}

export function resetSmoothing() {
  smooth.clear(); resetPrediction();
}

function extrapolate(bullets) {
  const age = S.paused || S.phase !== "play" ? 0 : Math.min(0.08,Math.max(0,(performance.now()-receivedAt)/1000));
  return bullets.map(b=>({...b,x:b.x+b.vx*age,y:b.y+b.vy*age}));
}
