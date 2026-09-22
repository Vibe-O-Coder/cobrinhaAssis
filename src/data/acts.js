/* ================= OS 10 ATOS =================
   290 ondas = 10 atos de 29. Um ato por ano desde que a cobrinha original saiu,
   e cada ato é uma "era" visual do jogo — começa monocromático num celular de
   1997 e termina no vazio.

   Cada ato define:
     n, era, ic ... identidade, mostrada no banner de entrada do ato
     bg, grid, fog  paleta do fundo (render/canvas.js reconstrói o tile)
     tint ......... cor de destaque do ato (banner, HUD, borda do mapa)
     pool ......... tipos de inimigo que ESTREIAM neste ato
     actBoss ...... o chefe da onda 29 do ato
     mini ......... de onde saem os mini-chefes das ondas 10 e 20

   O tier de variante (base -> veterano -> abissal -> infernal -> primordial ->
   corrompido) NÃO fica aqui: é derivado da onda em core/scaling.js, para a
   curva ser contínua em vez de dar saltos na virada do ato. */

export const ACT_DEFS = [
  {
    n: "MONOCROMO", era: "1997 — a tela de 84 por 48", ic: "📟",
    bg: "#0e120c", grid: "rgba(150,200,120,0.09)", fog: "rgba(8,14,6,0.55)",
    tint: "#9ee06a",
    pool: ["grunter", "runner", "shooter", "splitter", "charger", "orbiter"],
    actBoss: "boss",
    mini: ["boss", "boss3"],
  },
  {
    n: "PIXEL", era: "2000 — a cobra ganhou cor", ic: "🕹️",
    bg: "#100a1c", grid: "rgba(124,77,255,0.08)", fog: "rgba(6,4,14,0.55)",
    tint: "#7c6bff",
    pool: ["healer", "sniper"],
    actBoss: "boss3",
    mini: ["boss", "boss2", "boss3"],
  },
  {
    n: "NAVEGADOR", era: "2004 — mil clones em Flash", ic: "🖱️",
    bg: "#0c1420", grid: "rgba(77,195,255,0.09)", fog: "rgba(4,8,16,0.55)",
    tint: "#4dc3ff",
    pool: ["bomber", "weaver"],
    actBoss: "boss2",
    mini: ["boss2", "boss3", "boss4"],
  },
  {
    n: "ARCADE", era: "2008 — neon e fliperama", ic: "👾",
    bg: "#16081a", grid: "rgba(255,46,136,0.09)", fog: "rgba(12,2,14,0.55)",
    tint: "#ff2e88",
    pool: ["tank", "spitter"],
    actBoss: "boss4",
    mini: ["boss2", "boss3", "boss4", "boss6"],
  },
  {
    n: "TRIDIMENSIONAL", era: "2011 — a serpente ganhou volume", ic: "🧊",
    bg: "#081618", grid: "rgba(94,255,209,0.09)", fog: "rgba(2,10,12,0.55)",
    tint: "#5effd1",
    pool: ["warden"],
    actBoss: "boss_elite",
    mini: ["boss4", "boss5", "boss6"],
  },
  {
    n: "ENXAME", era: "2014 — todo mundo no mesmo servidor", ic: "📱",
    bg: "#0a1410", grid: "rgba(125,255,94,0.09)", fog: "rgba(4,10,6,0.55)",
    tint: "#7dff5e",
    pool: ["leech"],
    actBoss: "boss6",
    mini: ["boss4", "boss5", "boss6"],
  },
  {
    n: "VAPORONDA", era: "2017 — nostalgia em rosa e ciano", ic: "🌴",
    bg: "#160c20", grid: "rgba(255,110,199,0.10)", fog: "rgba(10,4,16,0.5)",
    tint: "#ff6ec7",
    pool: ["breaker"],
    actBoss: "boss5",
    mini: ["boss5", "boss6", "boss_elite"],
  },
  {
    n: "CORRUPÇÃO", era: "2020 — o arquivo salvou errado", ic: "📉",
    bg: "#140808", grid: "rgba(255,82,82,0.10)", fog: "rgba(12,2,2,0.6)",
    tint: "#ff5252",
    pool: [],
    actBoss: "boss_plague",
    mini: ["boss5", "boss6", "boss_elite", "boss_plague"],
  },
  {
    n: "O VAZIO", era: "2023 — não sobrou grade nenhuma", ic: "🕳️",
    bg: "#07060e", grid: "rgba(180,170,255,0.06)", fog: "rgba(2,2,6,0.7)",
    tint: "#b9a8ff",
    pool: [],
    actBoss: "boss_tyrant",
    mini: ["boss_elite", "boss_plague", "boss_tyrant"],
  },
  {
    n: "O FIM", era: "2026 — 29 anos depois", ic: "☠️",
    bg: "#1a1206", grid: "rgba(255,215,94,0.08)", fog: "rgba(14,8,0,0.6)",
    tint: "#ffd75e",
    pool: [],
    actBoss: "boss_final",
    mini: ["boss_plague", "boss_tyrant", "boss_elite"],
  },
];

/** Ato por índice, sempre com algo válido de volta. */
export function actDef(i) {
  return ACT_DEFS[Math.max(0, Math.min(ACT_DEFS.length - 1, i | 0))];
}

/** Todos os tipos de inimigo liberados até este ato (inclusive). */
export function poolUpToAct(actIndex) {
  const out = [];
  for (let i = 0; i <= Math.min(actIndex, ACT_DEFS.length - 1); i++) {
    out.push(...ACT_DEFS[i].pool);
  }
  return out;
}
