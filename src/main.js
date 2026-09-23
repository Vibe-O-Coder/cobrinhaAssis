import { toggleSandbox } from "./ui/sandbox.js";
/* ================= PONTO DE ENTRADA =================

   Com módulos ES as funções deixam de ser globais, então os `onclick="..."`
   que existiam direto no HTML parariam de funcionar. Todos os botões agora têm
   `data-act="..."` e são ligados aqui, num só lugar. */

import { $ } from "./core/utils.js";
import { S } from "./core/state.js";
import { save, persist } from "./core/save.js";
import { initAudio, toggleMute } from "./core/audio.js";

import { showScreen, updateMenu, toast } from "./ui/screens.js";
import { installMenu, gotoClass, updateOptionButtons } from "./ui/menu.js";
import { openShop } from "./ui/shop.js";
import { openTree, installTreeUI } from "./ui/treeui.js";
import { openBoard } from "./ui/leaderboard.js";
import { togglePause, togglePowers, toggleStats } from "./ui/overlays.js";
import { installInput } from "./ui/input.js";
import { installTouch, cycleTouchPref } from "./ui/touch.js";

import { startLoop } from "./game/loop.js";
import { startRun, abandonRun } from "./game/run.js";

import {
  openOnline, createRoom, joinRoom, cancelNet, leaveOnline,
  hostStart, toMenu, copyRoomCode, refreshRooms, generateRoomPassword,
} from "./net/online.js";

/* ---------- ações dos botões ---------- */

const ACTIONS = {
  "run-sandbox": () => gotoClass('sandbox'),
  "sandbox-panel": () => toggleSandbox(),
  "run-solo": () => gotoClass("solo"),
  "run-local": () => gotoClass("local"),
  "run-pvp": () => gotoClass("pvp"),
  "open-online": () => openOnline(),
  "open-board": () => openBoard(),
  "open-shop": () => openShop(),
  "open-tree": () => openTree(),
  "open-how": () => showScreen("how"),
  "to-menu": () => {
    toMenu();
    updateMenu();
  },
  "toggle-mute": () => toggleMute(),
  "toggle-afk": () => {
    save.afk = !save.afk;
    persist();
    updateOptionButtons();
  },
  "toggle-fast": () => {
    save.fast = !save.fast;
    persist();
    updateOptionButtons();
  },
  /* auto -> ligado -> desligado. "auto" cobre 99% dos casos; o manual existe
     porque um notebook com tela sensível ao toque responde `maxTouchPoints > 0`
     e ganhava um joystick que ninguém pediu. */
  "toggle-touch": () => {
    cycleTouchPref();
    updateOptionButtons();
  },

  "create-room": () => createRoom(),
  "join-room": () => joinRoom(),
  "refresh-rooms": () => refreshRooms(),
  "generate-password": () => generateRoomPassword(),
  "copy-code": () => copyRoomCode(),
  "cancel-net": () => cancelNet(),
  "leave-online": () => {
    leaveOnline();
    updateMenu();
  },
  "host-start": () => hostStart(),

  "toggle-pause": (el) => {
    el.blur();
    togglePause();
  },
  "toggle-powers": (el) => {
    el.blur();
    togglePowers();
  },
  "toggle-stats": (el) => {
    el.blur();
    toggleStats();
  },
  /* Antes isto so limpava o estado e voltava pro menu: as almas, os
     fragmentos e o recorde da run inteira iam pro lixo. abandonRun()
     credita tudo antes de sair. */
  abandon: (el) => {
    el.blur();
    abandonRun();
    toMenu();
    updateMenu();
  },

  "again": () => {
    toMenu();
    if (S.lastMode === "online") { openOnline(); return; }
    gotoClass(
      S.lastMode === 'sandbox' ? 'sandbox' : S.lastMode === "pvp" ? "pvp" : S.lastMode === "local" ? "local" : "solo",
    );
  },
};

function installActions() {
  document.body.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const fn = ACTIONS[el.dataset.act];
    if (!fn) return;
    initAudio();
    fn(el);
  });
}

/* ---------- inicialização ---------- */

function boot() {
  installActions();
  installMenu();
  installTreeUI();
  installInput();
  installTouch();
  updateMenu();
  showScreen("menu");
  startLoop();

  // Deixa visível no console que módulo carregou — ajuda a depurar no XAMPP.
  console.log("🐍 Snake Roguelike Ultra — módulos carregados");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

/* Gancho de depuração — só em localhost / rede local.
   Com módulos ES nada é global, então sem isto não dá para inspecionar o jogo
   pelo console do navegador (F12). Em produção o objeto simplesmente não
   existe. Útil pra vocês testarem no XAMPP: digite `SRK.S.wave = 40` e veja. */
if (
  /^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(location.hostname) ||
  location.protocol === "file:"
) {
  window.SRK = { S, save };
  import("./game/waves.js").then((m) => Object.assign(window.SRK, m));
  import("./game/abilities.js").then((m) => Object.assign(window.SRK, m));
  import("./game/enemies.js").then((m) => Object.assign(window.SRK, m));
  import("./data/enemies.js").then((m) => Object.assign(window.SRK, m));
  import("./game/run.js").then((m) => Object.assign(window.SRK, m));
  import("./render/artmap.js").then((m) => Object.assign(window.SRK, m));
  import("./game/tree.js").then((m) => Object.assign(window.SRK, m));
}

/* Rede de segurança: um erro solto não pode mais deixar o jogo em estado
   fantasma sem ninguém saber. Antes, o ReferenceError do render acontecia
   silenciosamente 60x por segundo e só o HUD congelado denunciava. */
window.addEventListener("error", (e) => {
  console.error("[erro não tratado]", e.message, e.filename + ":" + e.lineno);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[promessa rejeitada]", e.reason);
});
