/* ================= MENU, CORES E ESCOLHA DE CLASSE ================= */
import { $, esc } from "../core/utils.js";
import { S } from "../core/state.js";
import { save, persist } from "../core/save.js";
import { CLASSES, PALETTE } from "../data/classes.js";
import { ULTIMATE_PATHS } from "../data/ultimates.js";
import { MODES, modeDef, setMode } from "../data/modes.js";


import { showScreen, updateMenu } from "./screens.js";
import { startRun } from "../game/run.js";
import { sfx } from "../core/audio.js";

export function buildColorRow() {
  const row = $("#colorRow");
  if (!row) return;
  row.innerHTML = "";

  const all = document.createElement("button");
  all.className = "sw" + (save.color === "" ? " sel" : "");
  all.textContent = "🎲";
  all.title = "cor aleatória";
  all.addEventListener("click", () => {
    save.color = "";
    persist();
    buildColorRow();
  });
  row.appendChild(all);

  PALETTE.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "sw" + (save.color === i ? " sel" : "");
    b.style.background = c;
    b.title = c;
    b.addEventListener("click", () => {
      save.color = i;
      persist();
      buildColorRow();
    });
    row.appendChild(b);
  });
}

/* ---------------------------------------------------------------------------
   DIFICULDADE E OPÇÕES
   --------------------------------------------------------------------------- */

export function buildModeRow() {
  const row = $("#modeRow");
  if (!row) return;
  row.innerHTML = "";
  for (const m of MODES) {
    const b = document.createElement("button");
    b.className = "modebtn " + m.id + (save.mode === m.id ? " sel" : "");
    b.textContent = m.ic + " " + m.n;
    b.addEventListener("click", () => {
      save.mode = m.id;
      setMode(m.id);
      persist();
      buildModeRow();
    });
    row.appendChild(b);
  }
  const d = modeDef(save.mode);
  const desc = $("#modeDesc");
  if (desc) {
    desc.textContent =
      d.d + (d.soulMul > 1 ? "  ·  almas x" + d.soulMul : "");
  }
  updateOptionButtons();
}

export function updateOptionButtons() {
  const a = $("#afkBtn");
  if (a) a.textContent = "🤖 AFK: " + (save.afk ? "ligado" : "desligado");
  const f = $("#fastBtn");
  if (f) f.textContent = "⏩ 2x: " + (save.fast ? "ligado" : "desligado");
  const t = $("#touchBtn");
  if (t) {
    const lab = { auto: "auto", on: "ligado", off: "desligado" };
    t.textContent = "🕹️ Toque: " + (lab[save.touch] || "auto");
  }
}

export function startActWave() { return 1; }

import { PVP_ABILITIES } from "../game/pvpabilities.js";

export function buildClassCards(grid, onPick) {
  if (!grid) return;
  grid.innerHTML = "";
  CLASSES.forEach((original, i) => {
    const c = S.mode === "pvp" ? {...original,hp:10,ab:PVP_ABILITIES[i][0],abCd:PVP_ABILITIES[i][1],desc:PVP_ABILITIES[i][2],pass:"Duelo: progressão começa do zero"} : original;
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML =
      `<div class="ic">${c.ic}</div><h3 style="color:${c.color}">${esc(c.name)}</h3>` +
      `<p>${esc(c.desc)}</p>` +
      `<div class="tags"><span class="tag">❤️ ${c.hp} HP</span>` +
      `<span class="tag">⚔️ ${c.dmg}x</span>` +
      `<span class="tag">⏱️ ${c.abCd}s</span></div>` +
      `<div class="tags"><span class="tag" style="color:#ffd75e">✨ ${esc(c.ab)}</span></div>` +
      `<div class="tags"><span class="tag">${esc(c.pass)}</span></div>` +
      `<details class="class-paths"><summary>3 caminhos de ultimate</summary>${ULTIMATE_PATHS[i].map(p => `<p>${esc(p.name)} · 10 níveis</p>`).join("")}</details>`;
    el.querySelector("details").addEventListener("click", e => e.stopPropagation());
    el.addEventListener("click", () => onPick(i));
    grid.appendChild(el);
  });
}

/* Fila de escolha: no co-op local cada jogador escolhe a sua classe. */
let csQueue = [];
let csPicked = [];

export function gotoClass(m) {
  S.mode = m;
  S.role = "solo";
  csPicked = [];
  csQueue = m === "local" || m === "pvp" ? [0, 1] : [0];
  setMode(save.mode); // a dificuldade vale a partir de agora
  showScreen("classSel");

  renderClassStep();
}

function renderClassStep() {
  const who = csQueue[csPicked.length];
  $("#csTitle").textContent =
    S.mode === "pvp"
      ? "⚔️ JOGADOR " + (who + 1) + " — ESCOLHA SUA CLASSE"
      : S.mode === "local"
        ? "JOGADOR " + (who + 1) + " — ESCOLHA SUA CLASSE"
        : "ESCOLHA SUA CLASSE";
  buildClassCards($("#csGrid"), (i) => {
    sfx("eat");
    csPicked.push(i);
    if (csPicked.length >= csQueue.length) {
      startRun(csPicked.slice(), S.mode, startActWave());
    } else {
      renderClassStep();
    }
  });
}

export function installMenu() {
  $("#playerName").value = save.name || "";
  $("#playerName").addEventListener("input", (e) => {
    save.name = e.target.value;
    persist();
  });
  buildColorRow();
  buildModeRow();
  updateMenu();
}
