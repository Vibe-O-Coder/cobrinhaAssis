/* ================= FIM DE ONDA E ESCOLHA DE PODER ================= */
import { S } from "../core/state.js";
import { $, sample, esc } from "../core/utils.js";
import { waveSouls, isBossWave, bossKind, actOf } from "../core/scaling.js";
import { ACTS } from "../core/config.js";
import { actDef } from "../data/acts.js";
import { toast } from "../ui/screens.js";
import {
  UPGRADES, RELICS, canOffer, levelOf, sumText,
} from "../data/upgrades.js";
import { sfx } from "../core/audio.js";
import { addText } from "../render/fx.js";
import { banner, hideOvs } from "../ui/screens.js";
import { headPx, grantPower } from "./player.js";
import { save, persist } from "../core/save.js";
import { startWave } from "./waves.js";
import { MODE } from "../data/modes.js";
import { gameOver } from "./run.js";
import { grantRandomPowers } from './gambler.js';

export function waveClear() {
  if(S.sandbox){S.sandbox.waveActive=false;S.victory=false;S.paused=true;toast('Onda de teste concluída. Abra o laboratório com B.');return;}
  // O chefe final morreu: a run acaba em vitória, não em mais uma onda.
  if (S.victory) {
    gameOver();
    return;
  }

  S.phase = "choice";
  const gain = waveSouls(S.wave) + (bossKind(S.wave) === "act" ? 6 : bossKind(S.wave) ? 3 : 1) * 25;
  S.runSouls += gain;
  sfx("gold");
  banner("ONDA " + S.wave + " LIMPA! ✨", "+" + gain + " almas");

  // Registra o maior ato alcançado; novas campanhas sempre começam na onda 1.
  if (bossKind(S.wave) === "act") {
    const prox = Math.min(ACTS - 1, actOf(S.wave) + 1);
    if (prox > save.acts) {
      save.acts = prox;
      persist();
      toast("🔓 Ato alcançado: " + actDef(prox).n);
    }
  }

  const relic = !!S.bossRush || isBossWave(S.wave);
  const players = S.players, wave = S.wave;
  setTimeout(() => {
    if (S.runActive && S.players === players && S.wave === wave && S.phase === "choice") beginChoice(relic);
  }, 800);
}

/* Quais cartas do baralho podem ser oferecidas agora.

   Antes era `sample([...pool.keys()], 3)` — os 3 índices sorteados entre TODAS
   as cartas, sempre. Numa run de 290 ondas são ~230 escolhas, então você recebia
   "Ímã de Comida" (booleano) pela décima vez, "Olho Crítico" já no teto de
   crítico, e "Veneno Concentrado" sem ter veneno.

   O co-op monta uma oferta para cada jogador, respeitando a classe e o caminho
   de ultimate escolhido por ele. */
function offerable(pool, alive) {
  const normal = [];
  const overflow = [];
  for (let k = 0; k < pool.length; k++) {
    const o = pool[k];
    if (S.banished.includes(o.id)) continue; // banido nesta run
    if (!alive.some((i) => S.players[i] && canOffer(o, S.players[i]))) continue;
    (o.overflow ? overflow : normal).push(k);
  }

  /* Os poderes de transbordo (sem teto, fracos) só entram quando o baralho
     normal não tem mais 3 cartas para oferecer. Numa run de 290 ondas isso
     acontece lá pela onda 210; antes disso eles nem aparecem, para não diluir
     as escolhas boas do começo. */
  const idx = normal.length >= 3 ? normal : normal.concat(overflow);

  // Rede de segurança: nunca devolver lista vazia, senão a fase trava em
  // "choice" com uma tela sem cartas.
  return idx;
}

/** Uma mão por jogador impede conceder a habilidade exclusiva do parceiro. */
function optionsFor(pool, pi, count, relic) {
  const p = S.players[pi], eligible = offerable(pool, [pi]);
  const ultimates = eligible.filter(k => pool[k].ultimate);
  if (!relic && !p.ultimate && S.wave >= 3 && ultimates.length) return sample(ultimates, count);
  const opts = sample(eligible, count);
  const coop=eligible.filter(k=>pool[k].coop);
  if(!relic && coop.length && !opts.some(k=>pool[k].coop)) opts[opts.length-1]=sample(coop,1)[0];
  if (!relic && S.wave % 3 === 0 && ultimates.length && !opts.some(k => pool[k].ultimate)) opts[0] = ultimates[0];
  return opts;
}

function sendChoices(st) {
  if (S.role === 'host' && S.net) S.net.send({ t: 'up', opts: st.opts, optsByPlayer: st.optsByPlayer,
    relic: st.relic, alive: st.alive, deck: st.deck, picked: [...st.picked], automatic: st.automatic });
}

/* Baralho da escolha de fim de onda. O PVP usa pvppicks.js para manter
   escolhas independentes e a simulação em movimento. */
export function poolOf(st) {
  if (!st) return UPGRADES;
  if (st.deck === "relic") return RELICS;
  return UPGRADES;
}

export function beginChoice(relic) {
  const pool = relic ? RELICS : UPGRADES;
  const alive = S.players.map((p, i) => (p.dead ? -1 : i)).filter((i) => i >= 0);

  // Se todo mundo morreu, não há escolha a fazer.
  if (!alive.length) {
    startWave(S.wave + 1);
    return;
  }

  /* "Quarta Carta" da loja de almas. Numa run de 290 ondas, uma opção a mais
     por escolha é a diferença entre montar a build que você quer e aceitar o
     que veio. */
  const nCartas = 3 + (!MODE().hardcore && save.upg.qrt ? 1 : 0);
  const automatic = alive.filter(i => S.players[i].cls === 11);
  const optsByPlayer = Object.fromEntries(alive.map(i => [i, optionsFor(pool, i, nCartas, relic)]));
  const opts = optsByPlayer[0] || optsByPlayer[alive[0]] || [];

  // `prompting` guarda QUEM está com as cartas na tela agora. Sem isso, quando
  // a escolha do outro jogador chegava pela rede antes do host clicar, o
  // maybeFinish() caía em showWait() e APAGAVA as cartas do host no meio da
  // escolha — o host não tinha mais como escolher, pickState nunca fechava,
  // a fase travava em "choice" e os dois ficavam presos até recarregar.
  S.pickState = {
    opts, optsByPlayer, automatic, relic, alive, deck: relic ? "relic" : "up",
    picked: new Set(), localQ: [], prompting: null, nCartas,
  };
  S.pickState.localQ =
    (S.mode === "local" ? alive.slice() : alive.filter((i) => i === 0)).filter(i => !automatic.includes(i));

  for (const pi of automatic) {
    const awarded = grantRandomPowers(S.players[pi], pool, 2);
    S.pickState.picked.add(pi);
    toast('🎲 J' + (pi + 1) + ': ' + awarded.map(o => o.n).join(' + '));
  }
  sendChoices(S.pickState);
  if (alive.every(i => S.pickState.picked.has(i))) { maybeFinish(); return; }
  nextLocalPick();
}

function nextLocalPick() {
  if (!S.pickState) return;
  if (S.pickState.localQ.length === 0) {
    showWait();
    return;
  }
  showPickerUI(S.pickState.localQ.shift());
}

function showPickerUI(pi) {
  const st = S.pickState;
  st.prompting = pi;
  const pool = poolOf(st);
  const p = S.players[pi];
  $("#upTitle").textContent = st.relic
    ? "👑 RELÍQUIA DO CHEFE"
    : st.deck === "pvp"
      ? "⬆️ NÍVEL " + (p ? p.level : "?") + " — J" + (pi + 1) + " ESCOLHE"
      : S.mode === "local"
        ? "JOGADOR " + (pi + 1) + " — ESCOLHA UM PODER"
        : "ESCOLHA UM PODER";

  const g = $("#upCards");
  g.innerHTML = "";
  $("#upWait").classList.add("hidden");

  for (const k of (st.optsByPlayer?.[pi] || st.opts)) {
    const o = pool[k];
    if (!o) continue;
    const have = levelOf(p, o.id);
    const c = document.createElement("div");
    c.className = 'card' + (o.cls !== undefined ? ' class-card' : '') + (o.ultimate ? ' ultimate-card' : '');
    /* A carta agora mostra quantas você já tem e o que o PRÓXIMO nível deixa no
       total — assim dá para decidir sem abrir o menu de poderes. */
    c.innerHTML =
      `<div class="ic">${o.ic}</div>` +
      (o.cls !== undefined ? `<span class="class-badge">${o.ultimate ? 'ULTIMATE · CAMINHO ' + (o.branch + 1) : 'PODER DE CLASSE'}</span>` : '') +
      `<h3>${esc(o.n)}${have ? ` <span class="stk">${have}x</span>` : ""}</h3>` +
      `<p>${esc(o.d)}</p>` +
      (have
        ? `<div class="nextlv">ficará: ${esc(sumText(o, have + 1))}</div>`
        : "");

    // 🚫 banir: tira este poder da run inteira e sorteia outro no lugar
    if (S.banishes > 0 && !st.relic) {
      const b = document.createElement("button");
      b.className = "banish";
      b.title = "banir " + o.n + " desta run";
      b.textContent = "🚫";
      b.addEventListener("click", (ev) => {
        ev.stopPropagation(); // não conta como escolher a carta
        if (S.banishes <= 0 || st.picked.has(pi)) return;
        S.banishes--;
        S.banished.push(o.id);
        resortear(st, pi);
        sfx("hurt");
      });
      c.appendChild(b);
    }

    c.addEventListener("click", () => {
      if (st.picked.has(pi)) return; // clique duplo não conta duas vezes
      if (!applyPick(pi, k)) return;
      st.picked.add(pi);
      st.prompting = null;
      sfx("gold");
      maybeFinish();
    });
    g.appendChild(c);
  }

  // 🎲 trocar as três cartas
  const barra = $("#upExtra");
  barra.innerHTML = "";
  if (S.rerolls > 0 && !st.picked.has(pi)) {
    const b = document.createElement("button");
    b.className = "btn small";
    b.textContent = "🎲 Trocar as cartas (" + S.rerolls + ")";
    b.addEventListener("click", () => {
      if (S.rerolls <= 0) return;
      S.rerolls--;
      resortear(st, pi);
      sfx("eat");
    });
    barra.appendChild(b);
  }
  if (S.banishes > 0 && !st.relic) {
    const t = document.createElement("span");
    t.className = "hintbar";
    t.style.marginLeft = "10px";
    t.textContent = "🚫 banimentos: " + S.banishes;
    barra.appendChild(t);
  }

  $("#upOv").classList.remove("hidden");

  /* MODO AFK: escolhe sozinho depois de um instante, para dar tempo de ler o
     que saiu. Quem ligou isso quer ver a run acontecer, não clicar 230 vezes. */
  if (save.afk && !st.afkT) {
    st.afkT = setTimeout(() => {
      st.afkT = null;
      if (!S.pickState || S.pickState !== st || st.picked.has(pi)) return;
      const opts = st.optsByPlayer?.[pi] || st.opts;
      const k = opts[Math.floor(Math.random() * opts.length)];
      if (!applyPick(pi, k)) return;
      st.picked.add(pi);
      st.prompting = null;
      sfx("gold");
      maybeFinish();
    }, 900);
  }
}

/** Sorteia cartas novas para a mesma escolha (reroll e banimento). */
function resortear(st, pi) {
  const pool = poolOf(st);
  st.optsByPlayer ||= {};
  for (const i of st.alive) if (!st.picked.has(i)) st.optsByPlayer[i] = optionsFor(pool, i, st.nCartas || 3, st.relic);
  st.opts = st.optsByPlayer[0] || st.optsByPlayer[pi];
  sendChoices(st);
  showPickerUI(pi);
}

export function showWait() {
  $("#upCards").innerHTML = "";
  $("#upWait").classList.remove("hidden");
  $("#upTitle").textContent = "⏳ AGUARDANDO O OUTRO JOGADOR...";
  $('#upOv').classList.remove('hidden');
}

export function applyPick(pi, k) {
  const st = S.pickState;
  if (!st) return;
  const pool = poolOf(st);
  const o = pool[k];
  const p = S.players[pi];
  if (!o || !p || p.cls === 11 || !canOffer(o, p) || !(st.optsByPlayer?.[pi] || st.opts).includes(k)) return false;
  /* grantPower aplica o efeito, incrementa o contador por id e reaplica os
     tetos. Antes aqui era `o.f(p); p.powerLog.push(o.n)` — o nome ia para uma
     lista solta e nada contava nível nenhum. */
  grantPower(p, o);
  const lv = levelOf(p, o.id);
  const Hh = p.dead ? { x: 0, y: 0 } : headPx(p);
  addText(Hh.x, Hh.y - 22, o.n + (lv > 1 ? " " + lv + "x" : ""), "#ffd75e", 1.4, 14);
  return true;
}

/** Escolha vinda da rede. Valida o índice — nunca confie no que chega do peer. */
export function netPick(pi, k) {
  const st = S.pickState;
  if (!st) return;
  if (!st.alive.includes(pi) || st.picked.has(pi)) return;
  const pool = poolOf(st);
  if (!Number.isInteger(k) || k < 0 || k >= pool.length) return;
  if (!(st.optsByPlayer?.[pi] || st.opts).includes(k)) return;
  if (!applyPick(pi, k)) return;
  st.picked.add(pi);
  maybeFinish();
}

export function maybeFinish() {
  const st = S.pickState;
  if (!st) return;
  if (!st.alive.every((i) => st.picked.has(i))) {
    if (st.localQ.length) nextLocalPick();
    // Só mostra "aguardando" se NINGUÉM daqui ainda estiver escolhendo.
    // Antes isto era incondicional e limpava as cartas na cara do host.
    else if (st.prompting == null) showWait();
    return;
  }
  st.prompting = null;
  if (st.afkT) clearTimeout(st.afkT);
  S.pickState = null;
  hideOvs();
  if (S.role === "host" && S.net) S.net.send({ t: "go" });

  if(S.bossRush) S.bossRush.index++;
  startWave(S.wave + 1);
}
