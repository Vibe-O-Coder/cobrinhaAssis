/* ================= TELAS, TOAST E BANNER ================= */
import { $ } from "../core/utils.js";
import { save } from "../core/save.js";
import { resetReaderState } from "./overlays.js";

const SCREENS = [
  "menu", "classSel", "online", "lobby", "tree",
  "board", "shop", "how", "game", "over",
];

export function showScreen(id) {
  for (const s of SCREENS) {
    const el = $("#" + s);
    if (el) el.classList.toggle("hidden", s !== id);
  }
}

let toastT = null;
export function toast(m) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

export function banner(t, s) {
  const bt = $("#bannerT");
  const bs = $("#bannerS");
  const b = $("#banner");
  if (!b) return;
  bt.textContent = t;
  bs.textContent = s || "";
  b.classList.remove("show");
  void b.offsetWidth; // força o reinício da animação
  b.classList.add("show");
}

export function hideOvs() {
  // #statsOv faltava nesta lista quando a tela de status entrou.
  for (const id of ["#upOv", "#powersOv", "#statsOv", "#pauseOv"]) {
    const el = $(id);
    if (el) el.classList.add("hidden");
  }
  resetReaderState();
}

export function updateMenu() {
  $("#mSouls").textContent = save.souls;
  $("#mBest").textContent = save.best;
  $("#mWave").textContent = save.bestWave;
  const w = $("#mWins");
  if (w) {
    w.parentElement.classList.toggle("hidden", !save.wins);
    w.textContent = save.wins;
  }
}
