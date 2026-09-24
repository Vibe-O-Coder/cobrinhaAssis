/* ================= RANKING GLOBAL =================

   Duas coisas estavam erradas na versão anterior:

   1. LB.eps continha "https://seu-projeto.vercel.app/api/score" e
      "https://api.example.com/score" — endereços de exemplo que nunca foram
      trocados. O submit mandava nome e pontuação de quem jogou para TODOS eles,
      ou seja, para domínios de terceiros. E o `top()` tentava os três em ordem,
      com 8s de timeout cada, então abrir o ranking offline travava a tela em
      "carregando..." por até 24 segundos.

   2. O backend (netlify/functions/score.js) gravava com fs.writeFileSync. O
      sistema de arquivos de uma Function é somente-leitura e efêmero, então
      nenhuma pontuação jamais foi salva — o ranking nunca teve como ser global.
      O novo backend usa Netlify Blobs (ver netlify/functions/score.mjs).

   Agora existe UM endpoint. Jogando no XAMPP/localhost, REMOTE_API (em
   core/config.js) aponta pro site publicado, para que o placar seja o mesmo. */

import { $, esc } from "../core/utils.js";
import { S } from "../core/state.js";
import { save, persist } from "../core/save.js";
import { CLASSES } from "../data/classes.js";
import { showScreen, toast } from "./screens.js";

/** Preencha REMOTE_API com a URL do site publicado para que o XAMPP e o
    localhost gravem no MESMO ranking do site. Deixe "" para usar só o relativo. */
export const REMOTE_API = "";

const TIMEOUT_MS = 6000;
const LOCAL_KEY = "srkBoard";

function endpoint() {
  const isLocal = /^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(
    location.hostname,
  ) || location.protocol === "file:";
  if (isLocal && REMOTE_API) return REMOTE_API.replace(/\/$/, "");
  return "/.netlify/functions/score";
}

export const LB = {
  src: "local",

  async req(url, opts) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!r.ok) throw new Error("http " + r.status);
      const j = await r.json();
      if (!j || j.ok === false) throw new Error(j && j.error ? j.error : "api");
      return j;
    } finally {
      clearTimeout(to);
    }
  },

  localList() {
    try {
      const l = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      return Array.isArray(l) ? l : [];
    } catch (e) {
      return [];
    }
  },

  async top() {
    try {
      const j = await this.req(endpoint() + "?limit=50");
      if (j && Array.isArray(j.scores)) {
        this.src = j.source || "global";
        return j.scores;
      }
      throw new Error("resposta sem scores");
    } catch (e) {
      this.src = "local (offline)";
      return this.localList().sort((a, b) => b.score - a.score);
    }
  },

  /** Devolve true só se o servidor realmente aceitou. */
  async submit(entry) {
    const body = {
      name: String(entry.name || "Viajante").slice(0, 16),
      score: Math.max(0, Math.floor(entry.score || 0)),
      wave: Math.max(0, Math.floor(entry.wave || 0)),
      kills: Math.max(0, Math.floor(entry.kills || 0)),
      cls: Math.max(0, Math.floor(entry.cls || 0)),
    };

    // Guarda local sempre — serve de histórico e de fallback offline.
    try {
      const l = this.localList();
      l.push({ ...body, ts: Math.floor(Date.now() / 1000) });
      l.sort((a, b) => b.score - a.score);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(l.slice(0, 500)));
    } catch (e) {
      /* storage indisponível */
    }

    try {
      await this.req(endpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      this.src = "global";
      return true;
    } catch (e) {
      this.src = "local";
      return false;
    }
  },
};

export async function openBoard() {
  showScreen("board");
  $("#boardList").innerHTML =
    '<div style="text-align:center;color:#8f7fc0;padding:20px">carregando...</div>';
  const list = await LB.top();
  $("#boardSrc").textContent = "fonte do ranking: " + LB.src;

  const g = $("#boardList");
  if (!list.length) {
    g.innerHTML =
      '<div style="text-align:center;color:#8f7fc0;padding:20px">Nenhuma pontuação ainda. Seja o primeiro! 🐍</div>';
    return;
  }
  g.innerHTML = list
    .slice(0, 50)
    .map((e, i) => {
      const ic = (CLASSES[e.cls || 0] || {}).ic || "🐍";
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1);
      return (
        `<div class="brow"><span class="rk">${medal}</span>` +
        `<span class="bn">${ic} ${esc(e.name)}</span>` +
        `<span class="bw">🌊 ${e.wave}</span>` +
        `<span class="bs">${e.score} pts</span></div>`
      );
    })
    .join("");
}

/** Envia a pontuação da run. A mensagem reflete o que REALMENTE aconteceu —
    antes o toast dizia "enviada pro ranking!" mesmo quando todos falhavam. */
export async function submitScore() {
  if(S.sandbox || S.bossRush || S.startWave>1 || S.mode==="pvp") return false;
  try {
    const name =
      ($("#playerName").value || save.name || "Viajante").trim().slice(0, 16) ||
      "Viajante";
    save.name = name;
    persist();
    if (S.score <= 0) return;

    const ok = await LB.submit({
      name,
      score: S.score,
      wave: S.wave,
      kills: S.kills,
      cls: S.players[0] ? S.players[0].cls : 0,
    });
    toast(
      ok
        ? "🏆 pontuação enviada pro ranking global!"
        : "💾 sem conexão — pontuação salva só neste aparelho",
    );
  } catch (e) {
    /* nunca deixa o fim de jogo quebrar por causa do ranking */
  }
}
