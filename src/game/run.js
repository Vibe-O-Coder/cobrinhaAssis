/* ================= CICLO DA RUN ================= */
import { S, resetRun } from "../core/state.js";
import { MODE, setMode } from "../data/modes.js";
import { save, persist } from "../core/save.js";
import { $, pick, clamp } from "../core/utils.js";
import { PALETTE } from "../data/classes.js";
import { sfx } from "../core/audio.js";
import { UPGRADES, canOffer } from "../data/upgrades.js";
import { BOSS_ROSTER } from "../data/ecology.js";
import { makePlayer, grantPower } from "./player.js";
import { startWave } from "./waves.js";
import { spawnFood } from "./food.js";
import { showScreen, hideOvs, toast } from "../ui/screens.js";
import { submitScore } from "../ui/leaderboard.js";
import { centerCameraOnPlayers } from "../render/camera.js";
import { startPvp, isPvp } from "./pvp.js";
import { fitCanvas } from "../render/canvas.js";
import { syncTouchLayout } from "../ui/touch.js";
import { openSandbox } from '../ui/sandbox.js';

function assignColors() {
  if (save.color === "" || save.color === null || save.color === undefined) {
    const used = [];
    for (const p of S.players) {
      let c, guard = 0;
      do {
        c = pick(PALETTE);
        guard++;
      } while (used.includes(c) && guard < 40);
      used.push(c);
      p.color = c;
    }
  } else {
    const base = clamp(save.color, 0, PALETTE.length - 1);
    S.players.forEach((p, i) => {
      p.color = PALETTE[(base + i) % PALETTE.length];
    });
  }
}

export function setHint() {
  const el = $("#ctrlHint");
  if (!el) return;
  if (S.mode === "pvp") {
    el.innerHTML = S.pvpLocal
      ? 'J1: <span class="kbd">WASD</span> · <span class="kbd">E</span> habilidade · <span class="kbd">Q</span> item &nbsp;|&nbsp; ' +
        'J2: <span class="kbd">setas</span> · <span class="kbd">Enter</span> habilidade · <span class="kbd">.</span> item'
      : '⚔️ duelo online — <span class="kbd">WASD</span>/<span class="kbd">setas</span> mover · ' +
        '<span class="kbd">E</span> habilidade · <span class="kbd">Q</span> item';
    return;
  }
  el.innerHTML =
    S.mode === "local"
      ? 'J1: <span class="kbd">WASD</span>+<span class="kbd">E</span> · J2: <span class="kbd">setas</span>+<span class="kbd">Enter</span> · <span class="kbd">P</span> poderes · <span class="kbd">espaço</span> pausa'
      : S.mode === "online"
        ? '🌐 online — <span class="kbd">WASD</span>/<span class="kbd">setas</span> mover · <span class="kbd">E</span> habilidade · <span class="kbd">P</span> poderes'
        : 'mover: <span class="kbd">WASD</span>/<span class="kbd">setas</span> · habilidade: <span class="kbd">E</span> · <span class="kbd">P</span> poderes · pausa: <span class="kbd">espaço</span>';
}

export function startRun(clsList, m, waveInicial) {
  S.mode = m;
  document.body.classList.toggle("pvp-active",m === "pvp");
  S.lastMode = S.role !== "solo" ? "online" : m;
  resetRun();
  setMode(m === "pvp" || m === 'sandbox' ? "normal" : save.mode);
  S.startWave = Math.round(clamp(Number(waveInicial ?? save.startWave)||1,1,290));
  if(m==='bossrush') { S.bossRush={index:0, roster:BOSS_ROSTER.map(b=>({...b}))}; S.startWave=10; }
  if(m==='pvp'||m==='sandbox') S.startWave=1;
  S.players = clsList.map((c, i) => makePlayer(c, i));
  if(S.startWave>1 && m!=='bossrush' && save.startPowers==='random') {
    for(const p of S.players) for(let i=0;i<S.startWave;i++) {
      const pool=UPGRADES.filter(o=>canOffer(o,p));
      if(!pool.length)break;
      const normal=pool.filter(o=>!o.overflow);
      grantPower(p,pick(normal.length?normal:pool));
    }
  }
  assignColors();
  S.gameT = 0;
  S.paused = false;
  S.runActive = true;
  S.rerolls = m === "pvp" || m === "sandbox" || MODE().hardcore ? 0 : save.upg.rrl || 0;
  S.banishes = m === "pvp" || m === "sandbox" || MODE().hardcore ? 0 : save.upg.ban || 0;
  if (m !== "pvp" && m !== 'sandbox' && !MODE().hardcore && S.role !== "guest") {
    if (save.supplies.reroll > 0) { S.rerolls += 2; save.supplies.reroll--; }
    if (save.supplies.banish > 0) { S.banishes++; save.supplies.banish--; }
    if (S.startWave===1 && save.supplies.blessing > 0) save.supplies.blessing--;
    for (const p of S.players) for(let i=0;i<(save.upg.provisions || 0);i++) {
      S.foods.push({x:p.cells[0][0]+p.dir.x*(i+3),y:p.cells[0][1]+1,t:"n",mt:0});
    }
    persist();
  }
  S.banished = [];
  S.pingMs = null;
  for (let i = 0; i < 5; i++) spawnFood(true);
  hideOvs();
  showScreen("game");
  /* A janela de visão só pode ser medida com a tela do jogo VISÍVEL: escondida,
     o canvas tem 0x0 e a medição não diz nada. Por isso é aqui, e não no boot. */
  fitCanvas();
  centerCameraOnPlayers(true);
  syncTouchLayout();
  $('#sandboxButton').classList.toggle('hidden',m!=='sandbox');
  $('#sandboxPanel').classList.add('hidden');
  if(m==='sandbox'){S.wave=1;S.phase='play';setHint();openSandbox();return;}

  /* PVP não tem onda: startWave() zeraria o spawn por cota e anunciaria "ONDA
     1". O relógio da partida (game/pvp.js) é quem manda daqui para a frente. */
  if (m === "pvp") {
    startPvp(S.role === "solo");
    syncTouchLayout();
    setHint();
    S.phase = "play";
    centerCameraOnPlayers(true);
    return;
  }

  setHint();
  // O salto escolhido concede seus poderes antes de calcular a força dos inimigos.
  startWave(S.startWave);
}

/* Credita almas e recordes.

   Isto estava escrito DENTRO de gameOver(). E "Abandonar run" (o botao do menu
   de pausa) nunca chamava gameOver(): a acao so fazia `S.runActive = false` e
   voltava pro menu. Resultado: sair da run sem morrer jogava no lixo as almas,
   os fragmentos e o recorde da run inteira. Agora as duas saidas passam aqui. */
function cashOut() {
  if(S.sandbox)return 0;
  /* O modo difícil e o impossível pagam mais almas: sem isso ninguém teria
     motivo para jogar neles além de orgulho. */
  const mult =
    (1 + (MODE().hardcore ? 0 : 0.15 * save.upg.srt)) *
    MODE().soulMul *
    Math.max(1, ...S.players.map((p) => p.soulMult));
  const earned = Math.round((S.runSouls + S.kills) * mult * (S.victory ? 2 : 1));

  save.souls += earned;
  if (S.startWave === 1 && !S.bossRush && S.score > save.best) save.best = S.score;
  if (S.startWave === 1 && !S.bossRush && S.wave > save.bestWave) save.bestWave = S.wave;
  if (S.victory) save.wins++;
  persist();
  return earned;
}

/** Sair da run pelo menu de pausa, sem morrer. Guarda o que foi ganho. */
export function abandonRun() {
  if (!S.runActive) return 0;
  S.runActive = false;
  S.phase = "menu";
  S.paused = false;

  /* Duelo abandonado não paga nada e não entra no ranking: a pontuação da
     campanha (onda alcançada, almas por abate) não significa nada num PVP, e
     creditá-la daria para farmar almas criando duelo e saindo. */
  if (isPvp()) {
    S.pvp = null;
    S.stopNet && S.stopNet();
    toast("🏳️ Duelo abandonado");
    return 0;
  }
  if(S.sandbox){S.stopNet&&S.stopNet();toast('Laboratório encerrado');return 0;}
  const earned = cashOut();
  if (S.role !== "guest" && !S.sandbox) submitScore();
  S.stopNet && S.stopNet();
  toast(
    "\u{1F3F3}️ Abandonou na onda " + S.wave + " · \u{1F49C} +" + earned +
      " almas guardadas",
  );
  return earned;
}

export function gameOver() {
  if(S.sandbox){S.paused=true;openSandbox();return;}
  if (!S.runActive) return; // não contabiliza duas vezes
  S.phase = "over";
  S.runActive = false;

  /* Vitória só vale com alguém de pé. S.victory é marcado quando o chefe final
     morre; se os restos da horda matassem o jogador logo depois, a tela de
     "VOCÊ VENCEU" aparecia mesmo assim, com almas em dobro. */
  if (S.victory && !S.players.some((p) => !p.dead)) S.victory = false;

  const earned = cashOut();

  if (S.role === "host" && S.net) {
    S.net.send({
      t: "over",
      score: S.score,
      wave: S.wave,
      kills: S.kills,
      earned,
      comboMax: S.comboMax,
      souls: earned,
      victory: S.victory,
      ranked: S.startWave===1 && !S.bossRush,
    });
  }
  // O host também manda a própria pontuação — antes o `else if` pulava isso.
  if (S.role !== "guest") submitScore();

  S.stopNet && S.stopNet();
  showOver(earned, S.comboMax);
}

export function showOver(earned, cm, fr) {
  const won = S.victory;
  const big = $("#overBig");
  const tit = $("#overTitle");
  if (big) big.textContent = won ? "👑" : "💀";
  if (tit) tit.textContent = won ? "VOCÊ VENCEU!" : "FIM DE JOGO";

  $("#overStats").innerHTML =
    (won
      ? '<div style="color:#ffd75e;margin-bottom:8px">O Devorador de Mundos caiu. A serpente devorou o fim.<br><small>almas em DOBRO por vencer</small></div>'
      : "") +
    `<div>🎯 Pontos: <b>${S.score}</b></div>` +
    `<div>🌊 Onda alcançada: <b>${S.wave}</b></div>` +
    `<div>💀 Abates: <b>${S.kills}</b></div>` +
    `<div>🔥 Combo máx: <b>x${cm || 0}</b></div>` +
    `<div>💜 Almas ganhas: <b>+${earned}</b></div>` +
    `<div style="margin-top:6px;color:#8f7fc0">Total de almas: ${save.souls} · Recorde: ${save.best}` +
    (save.wins ? ` · 👑 vitórias: ${save.wins}` : "") +
    (S.mode === "online" ? " · Conexão: " + (S.transportLabel || "?") : "") +
    `</div>`;

  showScreen("over");
  sfx(won ? "win" : "hurt");
}

/** Chamado quando o chefe final morre. */
export function triggerVictory() {
  S.victory = true;
  gameOver();
}
