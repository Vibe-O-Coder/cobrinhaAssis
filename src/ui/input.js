import { requestQte } from "../game/qte.js";
import { toggleSandbox } from "./sandbox.js";
/* ================= TECLADO E DIREÇÃO =================

   Dois problemas de foco na versão anterior:

   - `preventDefault()` para espaço e setas rodava ANTES de qualquer checagem de
     foco. Digitando o código da sala, a barra de espaço e as setas não
     funcionavam dentro do <input>.
   - A tecla "m" (mudo) também era tratada antes. Escrever um nome com a letra
     "m" — "Mateus", "Amanda", "Guilherme" — ligava e desligava o som a cada
     letra.

   Agora, se o foco está num campo de texto, o jogo não intercepta nada.

   FASE 3: as decisões de "para onde essa direção vai" (berserker sem controle,
   convidado que só manda pela rede, jogador 1 x jogador 2) saíram do handler de
   teclado e viraram `steer()` / `useAbilityOf()`. O joystick virtual
   (ui/touch.js) chama exatamente as mesmas funções — sem isso o toque
   precisaria repetir essas quatro regras e sairia de sincronia na primeira
   mudança. */

import { $ } from "../core/utils.js";
import { S } from "../core/state.js";
import { initAudio, toggleMute } from "../core/audio.js";
import { tryAbility } from "../game/abilities.js";
import { isPvp, useItem } from "../game/pvp.js";
import { togglePause, togglePowers, toggleStats } from "./overlays.js";

import { predictInput } from "../net/prediction.js";
import { selectPvpOption } from "../game/pvppicks.js";

export const DIRMAP = {
  w: [0, -1],
  a: [-1, 0],
  s: [0, 1],
  d: [1, 0],
  arrowup: [0, -1],
  arrowleft: [-1, 0],
  arrowdown: [0, 1],
  arrowright: [1, 0],
};

/* Caminho inverso: o convidado não simula nada, ele manda a TECLA para o host.
   O joystick não tem tecla nenhuma, então converte o vetor de volta. */
const KEY_OF_DIR = { "0,-1": "w", "-1,0": "a", "0,1": "s", "1,0": "d" };

export function dirKey(dv) {
  return KEY_OF_DIR[dv.x + "," + dv.y] || "d";
}

/** Qual jogador uma tecla comanda. No co-op/PVP local, WASD é o J1 e as setas
    o J2; em qualquer outro modo tudo vai para o J1. */
export function playerOfKey(k) {
  if (S.mode !== "local" && !S.pvpLocal) return 0;
  return ["w", "a", "s", "d"].includes(k) ? 0 : 1;
}

/** Vira a cobra de `who`. Único ponto que escreve `qdir` a partir de um
    comando humano — teclado, joystick e rede passam todos por aqui. */
export function steer(dv, who = 0) {
  if (S.paused || S.phase !== "play") return;

  if(requestQte(dv.x<0?'left':dv.x>0?'right':dv.y<0?'up':'down',who))return;
  /* 🪓 Fúria Cega: durante a ativa do Berserker a cobra não obedece.
     O pedido era literalmente "perde o controle da cobrinha". */
  const p = S.role === "guest" ? S.rs?.players?.[1] : S.players[who];
  if (p && p.berserkT > 0) return;

  if (S.role === "guest") {
    if (S.net) {
      const seq=++S.inputSeq;predictInput(dv,seq);S.net.send({ t: "k", d: dirKey(dv), seq });
    }
    return;
  }
  if (p) p.qdir = dv;
}

/** Dispara a habilidade de `who` (ou pede ao host, se for o convidado). */
export function useAbilityOf(who = 0) {
  if (S.phase !== "play" || S.paused) return;
  if (S.role === "guest") {
    if (S.net) S.net.send({ t: "ab" });
    return;
  }
  if(!S.qte)tryAbility(S.players[who]);
}

/** Usa o ITEM de `who` — a segunda ativa, que só existe no PVP. */
export function useItemOf(who = 0) {
  if (!isPvp() || S.phase !== "play" || S.paused) return;
  if (S.role === "guest") {
    if (S.net) S.net.send({ t: "it" });
    return;
  }
  useItem(S.players[who]);
}

function isTyping(e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
}

export function installInput() {
  window.addEventListener("keydown", (e) => {
    if (isTyping(e)) return; // deixa a pessoa digitar em paz
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const k = e.key.toLowerCase();
    if((S.qte||S.rs?.qte) && e.repeat)return;

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
      e.preventDefault();
    }

    initAudio();

    if (k === "m") {
      toggleMute();
      return;
    }

    if ($("#game").classList.contains("hidden")) return;

    if (k === "b" && S.sandbox) { toggleSandbox(); return; }
    if (!$("#sandboxPanel").classList.contains("hidden")) return;

    if (k === "p") {
      togglePowers();
      return;
    }
    if (k === "t") {
      toggleStats();
      return;
    }
    if (k === " ") {
      if (S.role !== "guest" && S.phase === "play") togglePause();
      return;
    }
    if (k === "escape") {
      if (S.role !== "guest" && S.phase === "play") togglePause();
      return;
    }

    if (S.paused || S.phase !== "play") return;

    if (isPvp() && /^[123789]$/.test(k)) {
      const second = S.pvpLocal && Number(k) >= 7;
      if (!second && Number(k) > 3) return;
      selectPvpOption(second ? 1 : S.role === "guest" ? 1 : 0, Number(k) - (second ? 7 : 1));
      return;
    }

    if (DIRMAP[k]) {
      const m = DIRMAP[k];
      steer({ x: m[0], y: m[1] }, playerOfKey(k));
      return;
    }

    /* Q é habilidade na campanha e ITEM no PVP. O item só existe no duelo, e
       no duelo o polegar esquerdo já está no WASD — Q é a tecla vizinha. */
    if (k === "q" && isPvp()) {
      useItemOf(0);
      return;
    }
    if (k === "." && isPvp()) {
      useItemOf(S.pvpLocal ? 1 : 0);
      return;
    }

    if (["e", "q", "j"].includes(k)) {
      useAbilityOf(0);
      return;
    }

    if (k === "enter" || k === "l") {
      useAbilityOf(S.mode === "local" || S.pvpLocal ? 1 : 0);
    }
  });

  // Enter dentro do campo de código entra na sala — antes não fazia nada.
  const jc = $("#joinCode");
  if (jc) {
    jc.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        import("../net/online.js").then((m) => m.joinRoom());
      }
    });
  }
}
