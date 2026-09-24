import { CELL, COLS, ROWS } from "../core/config.js";

// A arena final não tem paredes: cruzar uma borda continua na borda oposta.
// Os mesmos limites são usados pela simulação e pela predição do convidado.
export function arenaCellBounds(arena) {
  if (!arena) return null;
  return {
    x0: Math.ceil(arena.x / CELL), y0: Math.ceil(arena.y / CELL),
    x1: Math.floor((arena.x + arena.w) / CELL),
    y1: Math.floor((arena.y + arena.h) / CELL),
  };
}

function wrap(n, start, end) {
  const span = Math.max(1, end - start);
  return start + ((n - start) % span + span) % span;
}

export function wrapArenaX(n, arena) {
  const b = arenaCellBounds(arena);
  return wrap(n, b?.x0 ?? 0, b?.x1 ?? COLS);
}

export function wrapArenaY(n, arena) {
  const b = arenaCellBounds(arena);
  return wrap(n, b?.y0 ?? 0, b?.y1 ?? ROWS);
}
