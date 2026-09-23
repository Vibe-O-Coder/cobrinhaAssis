/* ================= UTILITÁRIOS ================= */

export const $ = (s) => document.querySelector(s);

export const rnd = (a, b) => a + Math.random() * (b - a);
export const ri = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const lerp = (a, b, t) => a + (b - a) * t;

/** n itens distintos de a, sem repetir. */
export function sample(a, n) {
  const c = [...a];
  const out = [];
  while (out.length < n && c.length) {
    out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  }
  return out;
}

/** Clareia (f>1) ou escurece (f<1) uma cor #rrggbb. */
export function shade(hex, f) {
  const n = parseInt(String(hex).slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
  const b = clamp(Math.round((n & 255) * f), 0, 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

/** Escapa texto antes de jogar em innerHTML (nome do jogador vem do ranking). */
export function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

/** Hash estável — a árvore de habilidades é gerada a partir dele,
    então o mesmo caminho sempre dá o mesmo poder. */
export function hashStr(s) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
