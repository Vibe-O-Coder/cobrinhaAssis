/* ================= PAUSA, PODERES E STATUS =================

   HISTÓRICO DOS DOIS BUGS QUE MORAVAM AQUI

   1. "Ao mostrar os upgrades (ao apertar P) o jogo não pausa."
      Verdade: `togglePowers()` nunca tocou em `S.paused`, e o game loop
      (game/loop.js) só para de simular quando `S.paused` é true. Então a tela
      de poderes abria e a onda continuava rodando atrás dela — inclusive os
      inimigos te acertando enquanto você lia a build.
      Consertado abrindo QUALQUER overlay por um caminho único que pausa, e
      despausando na saída SÓ se foi ele que pausou (se você abriu pelo menu de
      pausa, continua pausado ao fechar).

   2. "Ao mostrar os upgrades pelo menu, eles ficam em cima das opções do menu."
      A tela de poderes tinha z-index maior que a de pausa, mas o fundo de
      `.ov` é `rgba(8,4,18,0.86)` — TRANSLÚCIDO. Os botões "Continuar",
      "Poderes da run" e "Abandonar run" apareciam atravessando a lista.
      Agora o overlay de cima é opaco (style.css) E o menu de pausa é escondido
      enquanto ele está aberto, voltando ao fechar. */

import { $ } from "../core/utils.js";
import { S } from "../core/state.js";
import { save } from "../core/save.js";
import { CLASSES } from "../data/classes.js";
import { ULTIMATE_PATHS, ultimateDescription } from "../data/ultimates.js";
import { PVP_UPGRADES } from "../data/pvpupgrades.js";
import { TREE_STAT_LABELS } from "../data/tree.js";
import { treeTotals } from "../game/tree.js";
import { shotCount, attackInterval, cellsPerSec, avgHit, bulletDmg } from "../game/stats.js";
import { powerById, sumText } from "../data/upgrades.js";
import { CELL } from "../core/config.js";
import { esc } from "../core/utils.js";

/* ---------------------------------------------------------------------------
   Empilhamento: um overlay "de leitura" (poderes/status) por vez, por cima da
   pausa. O estado mora em S porque ui/screens.js (hideOvs) também precisa
   limpá-lo, e importar daqui criaria dependência circular.
   --------------------------------------------------------------------------- */

const READERS = ["#powersOv", "#statsOv"];

function openReader(id, render) {
  const ov = $(id);
  if (!ov) return;

  // Já estava aberto o mesmo: fecha (comportamento de "toggle").
  if (S.ovActive === id) {
    closeReader();
    return;
  }

  // Trocando de poderes para status (ou vice-versa): esconde o anterior sem
  // mexer na contabilidade da pausa.
  if (S.ovActive) $(S.ovActive).classList.add("hidden");
  else {
    // Primeira abertura: é ela que pausa, e lembra se o menu de pausa estava
    // visível para poder devolvê-lo depois.
    S.ovPauseWasOpen = !$("#pauseOv").classList.contains("hidden");
    if (S.role !== "guest" && S.mode !== "pvp" && S.phase === "play" && !S.paused) {
      S.paused = true;
      S.ovPaused = true;
    }
  }

  $("#pauseOv").classList.add("hidden");
  render();
  ov.classList.remove("hidden");
  S.ovActive = id;
}

function closeReader() {
  if (S.ovActive) $(S.ovActive).classList.add("hidden");
  S.ovActive = null;

  if (S.ovPaused) {
    // Fomos nós que pausamos: despausa e não mostra o menu de pausa.
    S.ovPaused = false;
    S.paused = false;
    $("#pauseOv").classList.add("hidden");
  } else if (S.ovPauseWasOpen) {
    // Veio do menu de pausa: devolve o menu.
    $("#pauseOv").classList.remove("hidden");
  }
  S.ovPauseWasOpen = false;
}

/** Chamado por screens.js/hideOvs — zera a contabilidade sem tocar no DOM. */
export function resetReaderState() {
  S.ovActive = null;
  S.ovPaused = false;
  S.ovPauseWasOpen = false;
}

export function togglePause() {
  if (S.role === "guest") return; // só o host controla a pausa

  // Com poderes ou status aberto, espaço/ESC fecha a leitura primeiro.
  if (S.ovActive) {
    closeReader();
    return;
  }

  S.paused = !S.paused;
  $("#pauseOv").classList.toggle("hidden", !S.paused);
  if (!S.paused) {
    for (const id of READERS) $(id).classList.add("hidden");
    resetReaderState();
  }
}

export function togglePowers() {
  openReader("#powersOv", renderPowers);
}

export function toggleStats() {
  openReader("#statsOv", renderStats);
}

export function closeReaders() {
  closeReader();
}

/* ---------------------------------------------------------------------------
   Poderes da run — UMA caixa por poder, com o efeito acumulado e o "3x"
   --------------------------------------------------------------------------- */

/** powerLog é a lista de ids na ordem em que foram pegos. Devolve
    [{o, n}] preservando essa ordem e contando as repetições. */
function consolidate(ids) {
  const order = [];
  const count = new Map();
  for (const id of ids || []) {
    if (!count.has(id)) {
      const o = powerById(id) || PVP_UPGRADES.find(o=>o.id===id);
      if (!o) continue; // id de uma versão antiga do save/rede: ignora
      order.push(o);
      count.set(id, 0);
    }
    count.set(id, count.get(id) + 1);
  }
  return order.map((o) => ({ o, n: count.get(o.id) }));
}

function powerCards(ids) {
  const list = consolidate(ids);
  if (!list.length) {
    return '<div style="color:#8f7fc0">nenhum poder ainda</div>';
  }
  return (
    '<div class="pwgrid">' +
    list
      .map(
        ({ o, n }) =>
          '<div class="pwcard' + (o.id.startsWith("r_") ? " relic" : "") + (o.cls !== undefined ? " class-card" : "") + (o.ultimate ? " ultimate-card" : "") + '">' +
          `<div class="pwtop"><span class="pwic">${o.ic}</span>` +
          `<span class="pwn">${esc(o.n)}</span>` +
          (n > 1 ? `<span class="pwx">${n}x</span>` : "") +
          "</div>" +
          `<div class="pwd">${esc(sumText(o, n))}</div>` +
          "</div>",
      )
      .join("") +
    "</div>"
  );
}

function treeSummary() {
  if (S.mode === "pvp" || S.sandbox || S.role === 'guest' || S.players.some(p=>p.hardcore)) return "";
  const totals = treeTotals(save.tree);
  const parts = [];
  for (const [k, v] of Object.entries(totals)) {
    if (!v) continue;
    const lab = TREE_STAT_LABELS[k];
    if (!lab) continue;
    const val = Math.round(v * 100) / 100;
    parts.push(`<span class="pchip">${lab[0]} +${val}${lab[1]}</span>`);
  }
  if (!parts.length) return "";
  const count = (save.tree || []).length;
  return (
    `<div style="margin-top:14px;border-top:1px solid #7c4dff44;padding-top:10px">` +
    `<b style="color:#8fe6b8">🌳 Árvore de Habilidades — ${count} nó(s)</b><br>` +
    parts.join("") +
    `</div>`
  );
}

function renderPowers() {
  const src = S.role === "guest" && S.rs ? S.rs.players : S.players;
  const html = (src || [])
    .map((p) => {
      // O host manda a lista de ids no evento "powers"; o convidado guarda em
      // S.guestPowers. Antes o snapshot mandava como `pw` e esta tela lia
      // `powerLog`, então o convidado nunca via poder nenhum.
      const ids =
        S.role === "guest"
          ? p.powerLog || (S.guestPowers && S.guestPowers[p.idx]) || []
          : p.powerLog || [];
      const c = CLASSES[p.cls] || {};
      return (
        `<div style="margin:12px 0">` +
        `<b style="color:${p.color}">${c.ic || "🐍"} ${esc(c.name || "?")} (J${(p.idx || 0) + 1})</b>` +
        ultimateSummary(p) +
        powerCards(ids) +
        `</div>`
      );
    })
    .join("");

  $("#powersList").innerHTML = html + treeSummary();
}

function ultimateSummary(p) {
  const paths = ULTIMATE_PATHS[p.cls] || [];
  const chosen = p.ultimate;
  return '<div class="ultimate-summary"><b>✨ Evolução da habilidade</b>' +
    (chosen
      ? `<p>${esc(paths[chosen.branch]?.name || "Ultimate")} · ${chosen.level}/10</p><p>${esc(ultimateDescription(p.cls, chosen.branch, chosen.level, S.mode === "pvp"))}</p>`
      : `<p>Três caminhos, dez evoluções em cada um: ${paths.map(p => esc(p.name)).join(" · ")}.</p><p>A primeira carta de ultimate define o caminho desta partida.</p>`) +
    (p.cls === 11 ? `<p>🎲 Último dado: ${p.lastGamble || "—"}. Recebe duas cartas aleatórias por recompensa.</p>` : '') + '</div>';
}

/* ---------------------------------------------------------------------------
   Tela de status
   --------------------------------------------------------------------------- */

const num = (v, d = 1) => {
  const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  return String(r).replace(".", ",");
};
const pct = (v) => Math.round(v * 100) + "%";

function statRows(p) {
  const dmg = bulletDmg(p);
  const dps = (avgHit(p) * shotCount(p)) / Math.max(0.001, attackInterval(p));
  const rows = [
    ["⚔️", "Dano", num(dmg, 2)],
    ["👟", "Vel.", num(cellsPerSec(p), 1) + " cél/s"],
    ["⏱️", "Vel. Atk", num(attackInterval(p), 3) + "s"],
    ["🔭", "Alcance", Math.round(p.range) + "px (" + num(p.range / CELL, 1) + " cél)"],
    ["🔱", "Nº Projéteis", String(shotCount(p))],
    ["🏹", "Perfuração", String(p.pierce)],
    ["🧪", "D. Veneno", num(p.venom, 1) + "/s"],
    ["🎯", "T. Crítica", pct(p.crit)],
    ["✦", "D. Crítico", pct(p.critDmg)],
    ["🧲", "Alcance Coleta", p.magnetR ? Math.round(p.magnetR) + "px" : "—"],
    ["💥", "D. Explosão", p.boom ? num(p.boom, 1) : "—"],
    ["🌵", "Espinhos", p.thorns ? String(p.thorns) : "—"],
    ["🩸", "Roubo de Vida", p.ls ? pct(p.ls) : "—"],
    ["💚", "Regeneração", p.regenMax ? "1 HP / " + p.regenMax + " comidas" : "—"],
    ["🛡️", "Escudo", p.shield + " / " + p.shieldBase],
    ["💫", "Invulnerab.", num(1.3 + p.iframeBonus, 2) + "s"],
    ["💜", "Almas", "x" + num(p.soulMult, 2)],
    ["📊", "Dano/segundo", num(dps, 1)],
  ];
  return S.mode === 'pvp' ? rows.filter(([,name])=>!['Escudo','Invulnerab.','Almas'].includes(name)).concat([
    ['⬆','Nível',String(p.level)],['✦','Experiência',Math.floor(p.xp)+' / '+p.xpNext],
    ['🛡','Escudo',num(p.guard)+' / '+num(p.guardMax)],
    ['⚔','Dano em jogador','x'+num(p.pvpDmg)],['🪖','Resistência a jogador',pct(1-p.pvpRes)],
    ['🎒','Item',p.item ? p.item.n+' · '+Math.ceil(p.itemT)+'s' : 'nenhum'],
  ]) : rows;
}

function renderStats() {
  const src = S.role === "guest" && S.rs ? S.rs.players : S.players;
  const html = (src || [])
    .map((p) => {
      const c = CLASSES[p.cls] || {};
      /* O convidado recebe um snapshot enxuto, sem os atributos todos — então
         mostra o que tem em vez de imprimir "undefined" em 18 linhas. */
      if (p.dmg === undefined) {
        return (
          `<div style="margin:12px 0"><b style="color:${p.color}">` +
          `${c.ic || "🐍"} ${esc(c.name || "?")} (J${(p.idx || 0) + 1})</b><br>` +
          `<span style="color:#8f7fc0">os atributos completos só aparecem para quem hospeda a sala</span></div>`
        );
      }
      return (
        `<div style="margin:12px 0">` +
        `<b style="color:${p.color}">${c.ic || "🐍"} ${esc(c.name || "?")} (J${(p.idx || 0) + 1})` +
        ` — ❤️ ${num(p.hp, 1)}/${p.maxHp}</b>` +
        '<div class="stgrid">' +
        statRows(p)
          .map(
            ([ic, k, v]) =>
              `<div class="strow"><span class="stk2">${ic} ${k}</span>` +
              `<span class="stv">${esc(v)}</span></div>`,
          )
          .join("") +
        "</div></div>"
      );
    })
    .join("");

  $("#statsList").innerHTML = html;
}
