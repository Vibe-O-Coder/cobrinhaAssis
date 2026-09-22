/* ================= MULTIPLAYER: SALAS, LOBBY E SINCRONIZAÇÃO =================

   O bug que vocês relataram ("ele diz que se conecta, mas só põe o código no
   campo e clicar em Entrar não faz nada") estava TODO aqui, não no transporte.
   Testando host e convidado em duas abas, o MQTT conectava, o lobby sincronizava
   e o convidado recebia o estado normalmente. O que quebrava era o fluxo:

   createRoom() fazia `$("#joinCode").value = roomCode` e deixava o host parado
   na tela "online". O lobby só aparecia quando um convidado chegasse. Então o
   host via o próprio código dentro da caixa de ENTRAR, e a ação óbvia — clicar
   em "Entrar" — chamava joinRoom(), que dava cancelNet() na própria sessão e
   transformava o host em convidado da própria sala vazia. Aí, de fato, nada
   mais acontecia. Para sempre.

   Agora criar uma sala leva direto ao lobby, com o código em destaque e um
   botão de copiar. O campo de entrar nunca é preenchido automaticamente.
*/

import { S } from "../core/state.js";
import { $, ri } from "../core/utils.js";
import { NET_TICK_MS } from "../core/config.js";
import { CLASSES } from "../data/classes.js";
import { T, detectPhp } from "./transports.js";
import { createSession } from "./session.js";
import { showScreen, toast } from "../ui/screens.js";
import { buildClassCards } from "../ui/menu.js";
import { sfx } from "../core/audio.js";
import { snap, applySnapshot, resetSmoothing } from "../render/snapshot.js";
import { startRun, setHint } from "../game/run.js";
import { tryAbility } from "../game/abilities.js";
import { netPick, showWait } from "../game/picks.js";
import { UPGRADES, RELICS } from "../data/upgrades.js";
import { banner, hideOvs } from "../ui/screens.js";
import { save, persist } from "../core/save.js";
import { showOver } from "../game/run.js";
import { pvpEnd, isPvp, useItem } from "../game/pvp.js";
import { choosePvpPower } from "../game/pvppicks.js";
import { DIRMAP } from "../ui/input.js";

let phpOk = false;

export async function openOnline() {
  setNetStatus("escolha criar ou entrar numa sala");
  showScreen("online");

  const badge = $("#phpBadge");
  badge.textContent = "🔎 testando relay.php...";
  phpOk = await detectPhp();

  if (phpOk) {
    badge.innerHTML =
      '✔ <b style="color:#7dff5e">relay.php detectado</b> — funciona até sem internet, mas é o modo mais lento.';
  } else {
    badge.innerHTML =
      "ℹ️ relay.php não encontrado (normal fora do XAMPP). ⚡ WebRTC é o recomendado: conexão direta, menor lag.";
  }

  // Só define o padrão se o jogador ainda não escolheu nada nesta sessão.
  // Antes esta função sobrescrevia a escolha DEPOIS do await, revertendo o
  // que a pessoa tinha acabado de marcar.
  if (!document.querySelector('input[name="netmode"]:checked')) {
    $("#nmWebRTC").checked = true;
  }
}

export function setNetStatus(m) {
  const el = $("#onlineStatus");
  if (el) el.textContent = m;
  const lb = $("#lobbyStatus2");
  if (lb) lb.textContent = m;
}

function randomCode() {
  const ch = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += ch[ri(0, ch.length - 1)];
  return s;
}

/** Transporte escolhido no rádio. A versão anterior só olhava o #nmPhp e caía
    em MQTT no resto — marcar "LAN direta (WebRTC)" usava MQTT caladamente. */
function chosenKind() {
  if ($("#nmWebRTC").checked) return T.WEBRTC;
  if ($("#nmPhp").checked) return T.PHP;
  return T.MQTT;
}

function netCbs() {
  return {
    onStatus: setNetStatus,
    onFatal: (m) => {
      setNetStatus("❌ " + m);
      toast("❌ " + m);
    },
    onTransport: (kind, label) => {
      S.transportLabel = label || kind;
      const el = $("#lobbyTransport");
      if (el) el.textContent = label || kind;
    },
    onPeer: () => {
      if (S.role === "host") {
        S.guestJoined = true;
        if (S.runActive) {
          /* O convidado caiu e voltou no meio da run. Antes ele ficava preso
             no lobby o resto da partida (o botão de iniciar é só do host) e,
             no fim, recebia a tela de fim de jogo e as almas de uma run que
             não jogou. Agora ele é recolocado na partida. */
          toast("🎮 O outro jogador voltou!");
          const cls = S.players.map((p) => p.cls);
          S.net.send({ t: "start", cls: [cls[0] ?? 0, cls[1] ?? S.guestCls ?? 0], mode:S.mode });
          sendPowers();
          sendState();
        } else {
          updateLobby();
          toast("🎮 Jogador conectou!");
        }
        sfx("gold");
      } else {
        // Só vai pro lobby se não estiver em partida; se estiver, o host
        // reenvia o "start" e o jogo continua de onde estava.
        if (!S.runActive) showLobby();
        if (S.net) S.net.send({ t: "hello" });
      }
    },
    onPeerLeave: () => {
      if (S.runActive) {
        if (isPvp()) {
          // O convidado renderiza snapshots; S.players ainda contém o início da run.
          if (S.role === "guest" && S.rs?.players) S.players = S.rs.players;
          pvpEnd(S.role === "host" ? 0 : 1);
          return;
        }
        if (S.role === "host") {
          toast("O outro jogador saiu — continuando solo!");
          S.players = S.players.filter((p) => p.idx === 0);
          /* Se o host já estava morto esperando renascer, tirar o convidado
             deixava a run SEM NENHUMA cobra viva. E como gameOver() só é
             testado no instante de uma morte, ninguém mais checava a condição:
             a partida seguia rodando numa arena vazia, sem fim de jogo e sem
             registrar a pontuação. */
          if (S.players.every((q) => q.dead)) {
            import("../game/run.js").then((m) => m.gameOver());
            return;
          }
          if (S.pickState) {
            S.pickState.alive = S.pickState.alive.filter((i) => i !== 1);
            S.pickState.picked.add(1);
            import("../game/picks.js").then((m) => m.maybeFinish());
          }
        } else {
          toast("O host saiu da sala");
          S.runActive = false;
          toMenu();
        }
      } else {
        S.guestJoined = false;
        updateLobby();
        setNetStatus("⚠️ o outro jogador saiu. A sala continua aberta.");
      }
    },
    onData: onNet,
  };
}

export function createRoom() {
  S.netMode = $("#onlineMode").value === "pvp" ? "pvp" : "online";
  cancelNet(true);
  S.role = "host";
  S.mode = S.netMode;
  S.roomCode = randomCode();
  S.hostCls = S.hostCls || 0;
  S.guestCls = -1;
  S.guestJoined = false;

  // Vai DIRETO pro lobby, com o código em destaque.
  showLobby();
  setNetStatus("🏰 sala criada — passe o código para o outro jogador");
  S.net = createSession(true, S.roomCode, netCbs(), chosenKind());
}

export function joinRoom() {
  const code = ($("#joinCode").value || "").trim().toLowerCase();
  if (code.length < 4) {
    toast("Digite o código da sala");
    return;
  }
  if (S.role === "host" && code === S.roomCode) {
    toast("Esse é o código da SUA sala — mande ele pro outro jogador 🙂");
    return;
  }
  cancelNet(true);
  S.role = "guest";
  S.mode = "online";
  S.roomCode = code;
  S.guestCls = -1;
  setNetStatus("🔑 procurando a sala " + code + "...");
  S.net = createSession(false, code, netCbs(), chosenKind());
}

export function cancelNet(quiet) {
  stopNet();
  if (S.net) {
    try {
      S.net.close();
    } catch (e) {}
    S.net = null;
  }
  S.guestJoined = false;
  if (!quiet) setNetStatus("conexão cancelada.");
}

export function showLobby() {
  showScreen("lobby");
  $("#lobbyCode").textContent = S.roomCode || "-----";
  $("#lobbyMode").textContent = S.netMode === "pvp" ? "⚔️ PVP · sem bônus permanentes" : "👥 CO-OP";
  $("#lobbyRole").textContent = S.role === "host" ? "você é o HOST" : "você entrou como convidado";
  buildClassCards($("#lobbyGrid"), (i) => {
    if (S.role === "guest") {
      S.guestCls = i;
      if (S.net) S.net.send({ t: "class", i });
    } else {
      S.hostCls = i;
      broadcastLobby();
    }
    markLobbySel();
    sfx("eat");
  });
  updateLobby();
}

function markLobbySel() {
  const mine = S.role === "guest" ? S.guestCls : S.hostCls;
  const grid = $("#lobbyGrid");
  if (!grid) return;
  [...grid.children].forEach((c, i) => c.classList.toggle("sel", i === mine));
}

export function updateLobby() {
  if ($("#lobby").classList.contains("hidden")) return;
  $("#lobbyCode").textContent = S.roomCode || "-----";
  $("#lobbyMode").textContent = S.netMode === "pvp" ? "⚔️ PVP · sem bônus permanentes" : "👥 CO-OP";

  const st = $("#lobbyStatus");
  if (S.guestJoined || S.role === "guest") {
    st.textContent =
      "✔ Conectado " + (S.transportLabel || "") +
      " · Host: " + ((CLASSES[S.hostCls] || {}).ic || "?") +
      " · Convidado: " + (S.guestCls >= 0 ? (CLASSES[S.guestCls] || {}).ic : "escolhendo...");
  } else {
    st.textContent = "aguardando o outro jogador entrar com o código...";
  }

  $("#btnStartOnline").classList.toggle(
    "hidden",
    !(S.role === "host" && S.guestJoined),
  );
  markLobbySel();
}

export function copyRoomCode() {
  const code = S.roomCode || "";
  if (!code) return;
  navigator.clipboard?.writeText(code).then(
    () => toast("📋 código " + code.toUpperCase() + " copiado!"),
    () => toast("código: " + code.toUpperCase()),
  );
}

function broadcastLobby() {
  if (S.net) {
    S.net.send({ t: "lobby", h: S.hostCls, g: S.guestCls, joined: S.guestJoined, mode:S.netMode });
  }
}

export function hostStart() {
  if (!S.guestJoined) return;
  const cls = [S.hostCls, S.guestCls >= 0 ? S.guestCls : 0];
  S.net.send({ t: "start", cls, mode:S.netMode });
  S.role = "host";
  startRun(cls, S.netMode);
  startNet();
  sendState();
  sendPowers();
}

function startRunRemote(cls, mode) {
  S.netMode = mode === "pvp" ? "pvp" : "online";
  guestPickKey = null;
  resetSmoothing();
  startRun(cls, "online");
  setHint();
}

/* ---------- sincronização ---------- */

export function startNet() {
  stopNet();
  S.netTimer = setInterval(() => {
    sendState();
  }, NET_TICK_MS);
}

export function stopNet() {
  if (S.netTimer) {
    clearInterval(S.netTimer);
    S.netTimer = null;
  }
}
S.stopNet = stopNet;

export function sendState() {
  if (S.net && S.role === "host") S.net.send({ t: "state", s: snap() });
}

/** A lista de poderes só muda quando alguém escolhe — não precisa ir 20x/s. */
export function sendPowers() {
  if (!S.net || S.role !== "host") return;
  S.net.send({ t: "powers", p: S.players.map((p) => p.powerLog) });
}

export function onNet(d) {
  if (d.t === "hb") return;
  if (d.t === "ping") {
    if (S.net) S.net.send({ t: "pong", ts: d.ts });
    return;
  }
  if (d.t === "pong") {
    S.pingMs = Math.round(Date.now() - d.ts);
    return;
  }

  if (S.role === "host") {
    switch (d.t) {
      case "hello":
        updateLobby();
        broadcastLobby();
        break;
      case "class":
        if (!Number.isInteger(d.i) || d.i < 0 || d.i >= CLASSES.length || S.runActive) break;
        S.guestCls = d.i;
        updateLobby();
        broadcastLobby();
        break;
      /* O host não confia no convidado: comandos só valem se a partida estiver
         realmente rolando. Antes, um convidado podia disparar a habilidade com
         o jogo pausado ou durante a tela de escolha de poder. */
      case "k": {
        if (S.phase !== "play" || S.paused) break;
        const m = DIRMAP[d.d];
        const p = S.players[1];
        if (m && p && !p.dead && !(p.berserkT > 0)) {
          if (d.seq && d.seq <= (p.inputAck || 0)) break;
          p.qdir = {x:m[0],y:m[1]}; p.inputAck = d.seq || 0;
        }
        break;
      }
      case "ab":
        if (S.phase !== "play" || S.paused) break;
        if (S.players[1]) tryAbility(S.players[1]);
        break;
      case "it":
        if (S.phase === "play" && !S.paused) useItem(S.players[1]);
        break;
      case "pvpPick":
        if (isPvp()) choosePvpPower(1,d.id,d.k);
        break;
      case "pick":
        netPick(1, d.k);
        sendPowers();
        break;
    }
    return;
  }

  if (S.role === "guest") {
    switch (d.t) {
      case "lobby": {
        const previousMode=S.netMode;
        S.netMode = d.mode === "pvp" ? "pvp" : "online"; S.mode = S.netMode;
        S.hostCls = d.h;
        S.guestCls = d.g;
        S.guestJoined = d.joined;
        if (previousMode !== S.netMode) showLobby();
        else updateLobby();
        break;
      }
      case "start":
        if (S.runActive && S.rs) break;
        startRunRemote(d.cls,d.mode);
        break;
      case "state":
        if (applySnapshot(d.s)) {
          guestFx();
          if (d.s.pvp?.over) {
            S.players = d.s.players; pvpEnd(d.s.pvp.winner,true);
          }
        }
        break;
      case "powers":
        S.guestPowers = d.p;
        break;
      case "up":
        showGuestPicker(d);
        break;
      case "go":
        hideOvs();
        break;
      case "pvpOver":
        if (!S.runActive || S.pvp?.rewarded) break;
        S.players = d.players; S.pvp = {...d.pvp,rewarded:false};
        pvpEnd(d.winner,true);
        break;
      case "over": {
        // Só credita se este convidado estava mesmo na run. Sem esta guarda,
        // quem entrasse na sala durante uma partida alheia recebia almas,
        // fragmentos e até o recorde de uma run que nunca jogou.
        if (!S.runActive) return;
        stopNet();
        S.runActive = false;
        // O convidado recebia os fragmentos mas NÃO as almas que a tela
        // anunciava — e o recorde dele nunca era registrado.
        save.souls += d.souls || d.earned || 0;
        if (d.score > save.best) save.best = d.score;
        if (d.wave > save.bestWave) save.bestWave = d.wave;
        if (d.victory) save.wins++;
        persist();
        S.victory = !!d.victory;
        S.score = d.score;
        S.wave = d.wave;
        S.kills = d.kills;
        showOver(d.earned, d.comboMax);
        break;
      }
    }
  }
}

function showGuestPicker(d) {
  /* Quem morreu durante a onda não participa desta escolha (o host recusa o
     pick com `!st.alive.includes(pi)`). Antes as cartas apareciam mesmo assim,
     clicáveis e com som de confirmação, e a escolha era descartada em silêncio
     — o jogador achava que tinha ganhado um poder e não tinha. */
  if (!Array.isArray(d.alive) || !d.alive.includes(1)) {
    $("#upTitle").textContent = "💀 você caiu — fora desta escolha";
    $("#upCards").innerHTML = "";
    $("#upWait").classList.remove("hidden");
    $("#upOv").classList.remove("hidden");
    return;
  }

  const pool = d.relic ? RELICS : UPGRADES;
  $("#upTitle").textContent = d.relic ? "👑 RELÍQUIA DO CHEFE" : "ESCOLHA UM PODER";
  const g = $("#upCards");
  g.innerHTML = "";
  $("#upWait").classList.add("hidden");

  for (const k of d.opts) {
    const o = pool[k];
    if (!o) continue;
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<div class="ic">${o.ic}</div><h3>${o.n}</h3><p>${o.d}</p>`;
    c.addEventListener("click", () => {
      if (S.net) S.net.send({ t: "pick", k });
      showWait();
      sfx("gold");
    });
    g.appendChild(c);
  }
  $("#upOv").classList.remove("hidden");
}

/* Reconcilia a tela de escolha com o que o host diz, a cada pacote.
   É isto que torna o "up"/"go" perdido inofensivo. */
let guestPickKey = null;
function reconcileGuestPick(rs) {
  const p = rs.pick;
  if (!p) {
    guestPickKey = null;
    const ov = $("#upOv");
    if (!ov.classList.contains("hidden")) ov.classList.add("hidden");
    return;
  }
  const jaEscolheu = (p.picked || []).includes(1);
  const participa = Array.isArray(p.alive) && p.alive.includes(1);
  const key = p.opts.join(",") + "|" + p.relic + "|" + jaEscolheu + "|" + participa;
  if (key === guestPickKey) return; // nada mudou, não repinta
  guestPickKey = key;

  if (jaEscolheu) {
    showWait();
    $("#upOv").classList.remove("hidden");
  } else {
    showGuestPicker({ opts: p.opts, relic: p.relic, alive: p.alive });
  }
}

function guestFx() {
  const rs = S.rs;
  if (!rs) return;
  if (!isPvp()) reconcileGuestPick(rs);

  if (!isPvp() && rs.wave !== S.gPrev.wave && rs.phase === "play") {
    banner(
      rs.wave % 5 === 0 ? "⚠️ CHEFE ⚠️" : "ONDA " + rs.wave,
      rs.wave % 5 === 0 ? "prepare-se..." : rs.mod ? rs.mod.n + " — " + rs.mod.d : "",
    );
  }

  const hp = rs.players.reduce((a, p) => a + (p.dead ? 0 : p.hp), 0);
  if (hp < S.gPrev.hp) {
    sfx("hurt");
    S.shake = Math.min(12, S.shake + 6);
    S.flash = 0.3;
  }

  $("#pauseOv").classList.toggle("hidden", !rs.paused);
  // Marca o modo convidado no <body>; o CSS cuida de esconder os botões.
  // Antes isto era `$("#pauseBtns").classList.add("hidden")` a cada pacote —
  // 20x por segundo — e NADA no código inteiro voltava a mostrar. Quem jogasse
  // como convidado ficava sem menu de pausa até recarregar a página.
  document.body.classList.add("is-guest");

  S.gPrev = { wave: rs.wave, hp, paused: rs.paused };
}

export function leaveOnline() {
  cancelNet(true);
  S.role = "solo";
  S.mode = "solo";
  // Como convidado, S.hostCls guarda a classe do OUTRO jogador. Sem limpar,
  // ela vazava para a próxima sala criada por esta aba.
  S.hostCls = 0;
  S.guestCls = -1;
  S.guestPowers = null;
  document.body.classList.remove("is-guest");
  showScreen("menu");
}

export function toMenu() {
  S.runActive = false;
  S.phase = "menu";
  S.paused = false;
  cancelNet(true);
  S.role = "solo";
  S.mode = "solo";
  S.guestJoined = false;
  S.transportLabel = "";
  S.guestPowers = null;
  S.hostCls = 0;
  S.guestCls = -1;
  document.body.classList.remove("is-guest");
  hideOvs();
  showScreen("menu");
}

/* Mede o ping só durante a partida. */
setInterval(() => {
  if (S.net && S.runActive) S.net.send({ t: "ping", ts: Date.now() });
}, 2000);

window.addEventListener("beforeunload", () => {
  if (S.net) {
    try {
      S.net.close();
    } catch (e) {}
  }
});
