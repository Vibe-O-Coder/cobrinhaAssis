"use strict";
/* ================= CONFIG ================= */
const $ = (s) => document.querySelector(s);
const TAU = Math.PI * 2,
  COLS = 100,  // Mapa maior
  ROWS = 75,   // Mapa maior
  CELL = 28,
  W = COLS * CELL,
  H = ROWS * CELL;
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
function sample(a, n) {
  const c = [...a],
    o = [];
  while (o.length < n && c.length)
    o.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  return o;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * f, 0, 255) | 0,
    g = clamp(((n >> 8) & 255) * f, 0, 255) | 0,
    b = clamp((n & 255) * f, 0, 255) | 0;
  return `rgb(${r},${g},${b})`;
}
function esc(s) {
  return String(s).replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c],
  );
}

/* ================= SAVE ================= */
let save = {
  souls: 0,
  frags: 0,
  best: 0,
  bestWave: 0,
  name: "",
  color: "",
  tree: [],
  upg: {
    vit: 0,
    frc: 0,
    srt: 0,
    vlt: 0,
    esc: 0,
    ben: 0,
    ini: 0,
    rev: 0,
    crt: 0,
    mag: 0,
    cur: 0,
  },
};
try {
  const s = localStorage.getItem("srkUltra2");
  if (s) {
    const o = JSON.parse(s);
    Object.assign(save, o);
    save.upg = Object.assign(
      {
        vit: 0,
        frc: 0,
        srt: 0,
        vlt: 0,
        esc: 0,
        ben: 0,
        ini: 0,
        rev: 0,
        crt: 0,
        mag: 0,
        cur: 0,
      },
      o.upg || {},
    );
    if (!Array.isArray(save.tree)) save.tree = [];
  }
} catch (e) {}
function persist() {
  try {
    localStorage.setItem("srkUltra2", JSON.stringify(save));
  } catch (e) {}
}

/* ================= LEADERBOARD GLOBAL ================= */
const LB = {
  // Endpoints em ordem de prioridade. Primeiro que funcionar é usado.
  // Para produção: substitua pelo seu endpoint real (Netlify/Vercel/Cloudflare)
  eps: [
    "/.netlify/functions/score",  // Netlify Functions (local e produção)
    "https://seu-projeto.vercel.app/api/score",  // Vercel (exemplo)
    "https://api.example.com/score"  // API customizada (substitua)
  ],
  src: "global",
  async req(ep, opts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch(ep, { ...opts, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error("http");
      const j = await r.json();
      if (!j || j.ok === false) throw new Error("api");
      return j;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  },
  async top() {
    // Tenta endpoint global primeiro
    for (const ep of this.eps) {
      try {
        // GET request para listar leaderboard
        const j = await this.req(ep + "?limit=50&_=" + Date.now());
        if (j && j.scores) {
          this.src = j.source || "Global";
          return j.scores;
        }
      } catch (e) {
        console.log("Falha no endpoint:", ep, e.message);
      }
    }
    // Fallback para localStorage
    this.src = "local (offline)";
    try {
      return JSON.parse(localStorage.getItem("srkBoard") || "[]");
    } catch (e) {
      return [];
    }
  },
  async submit(e) {
    // Envia para todos os endpoints
    const entry = {
      name: e.name || "Anon",
      score: Math.floor(e.score || 0),
      wave: e.wave || 0,
      kills: e.kills || 0,
      cls: e.cls || 0
    };
    let success = false;
    for (const ep of this.eps) {
      try {
        await this.req(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        this.src = "Global";
        success = true;
      } catch (err) {
        console.log("Falha ao enviar para:", ep, err.message);
      }
    }
    // Salva localmente também
    try {
      const l = JSON.parse(localStorage.getItem("srkBoard") || "[]");
      l.push({ ...entry, ts: Math.floor(Date.now() / 1000) });
      l.sort((a, b) => b.score - a.score);
      localStorage.setItem("srkBoard", JSON.stringify(l.slice(0, 500)));
      if (!success) this.src = "local";
    } catch (err) {}
    return true;
  },
};
async function openBoard() {
  showScreen("board");
  $("#boardList").innerHTML =
    '<div style="text-align:center;color:#8f7fc0;padding:20px">carregando...</div>';
  const list = await LB.top();
  $("#boardSrc").textContent = "fonte do banco: " + LB.src;
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
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1);
      return `<div class="brow"><span class="rk">${medal}</span><span class="bn">${ic} ${esc(e.name)}</span><span class="bw">🌊 ${e.wave}</span><span class="bs">${e.score} pts</span></div>`;
    })
    .join("");
}
async function submitScore() {
  try {
    const name =
      ($("#playerName").value || save.name || "Viajante").trim().slice(0, 16) ||
      "Viajante";
    save.name = name;
    persist();
    if (score <= 0) return;
    await LB.submit({
      name,
      score,
      wave,
      cls: players[0] ? players[0].cls : 0,
    });
    toast("🏆 pontuação enviada pro ranking!");
  } catch (e) {}
}

/* ================= ÁUDIO ================= */
let AC = null,
  muted = false;
function initAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
}
function sfx(type) {
  if (muted || !AC) return;
  const t = AC.currentTime,
    o = AC.createOscillator(),
    g = AC.createGain();
  o.connect(g);
  g.connect(AC.destination);
  const P = {
    eat: [520, 900, 0.08, "square", 0.05],
    gold: [660, 1400, 0.18, "triangle", 0.09],
    hurt: [200, 55, 0.22, "sawtooth", 0.13],
    shoot: [760, 320, 0.06, "square", 0.025],
    kill: [420, 70, 0.16, "square", 0.06],
    up: [440, 1200, 0.32, "triangle", 0.09],
    ab: [180, 700, 0.22, "sine", 0.12],
  }[type];
  if (!P) return;
  o.type = P[3];
  o.frequency.setValueAtTime(P[0], t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, P[1]), t + P[2]);
  g.gain.setValueAtTime(P[4], t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + P[2]);
  o.start(t);
  o.stop(t + P[2] + 0.03);
}
function toggleMute() {
  muted = !muted;
  $("#muteBtn").textContent = muted ? "🔇 Som: desligado" : "🔊 Som: ligado";
}

/* ================= ESTADO ================= */
let mode = "solo",
  role = "solo",
  lastMode = "solo";
let phase = "menu",
  paused = false;
let players = [],
  enemies = [],
  pbullets = [],
  ebullets = [],
  foods = [],
  drops = [],
  blocks = [],
  bombs = [],
  parts = [],
  texts = [],
  effects = [];  // Efeitos visuais (lasers, explosões, etc)
let wave = 0,
  score = 0,
  kills = 0,
  runSouls = 0,
  spawnQ = 0,
  bossLeft = 0,
  spawnT = 0,
  foodT = 0,
  shake = 0,
  flash = 0,
  gameT = 0,
  eid = 0,
  runActive = false;
let combo = 0,
  comboT = 0,
  comboMax = 0,
  waveMod = null,
  waveBoss = "boss",
  fragsRun = 0,
  pingMs = null,
  transportLabel = "";
let pickState = null,
  net = null,
  roomCode = "",
  hostCls = 0,
  guestCls = -1,
  guestJoined = false,
  netTimer = null,
  rs = null;
let gPrev = { wave: 0, hp: 0, paused: false };
const DIRMAP = {
  w: [0, -1],
  a: [-1, 0],
  s: [0, 1],
  d: [1, 0],
  arrowup: [0, -1],
  arrowleft: [-1, 0],
  arrowdown: [0, 1],
  arrowright: [1, 0],
};
const MODS = [
  { id: "none", n: "", d: "" },
  { id: "fast", n: "⚡ ONDA VELOZ", d: "inimigos 25% mais rápidos" },
  { id: "tank", n: "🗿 ONDA TANQUE", d: "inimigos com +60% de vida" },
  { id: "swarm", n: "👾 ENXAME", d: "muitos inimigos, porém frágeis" },
  { id: "rage", n: "🔥 FÚRIA", d: "atiradores mais agressivos" },
  { id: "gold", n: "✨ CHUVA DOURADA", d: "comida dourada em abundância" },
];
const embers = [];
for (let i = 0; i < 22; i++)
  embers.push({
    x: rnd(0, W),
    y: rnd(0, H),
    r: rnd(0.8, 2.4),
    vx: rnd(-5, 5),
    vy: rnd(3, 12),
    c: Math.random() < 0.5 ? "#7c4dff" : "#ffd75e",
    a: rnd(0.05, 0.16),
  });
const PALETTE = [
  "#ff5252",
  "#ff9838",
  "#ffd75e",
  "#7dff5e",
  "#4dffa6",
  "#6ee7ff",
  "#4dc3ff",
  "#7c6bff",
  "#b04dff",
  "#ff2e88",
  "#ff6ec7",
  "#e8e2ff",
];

/* ================= CORES ================= */
function buildColorRow() {
  const row = $("#colorRow");
  row.innerHTML = "";
  const all = document.createElement("button");
  all.className = "sw" + (save.color === "" ? " sel" : "");
  all.textContent = "🎲";
  all.title = "cor aleatória";
  all.onclick = () => {
    save.color = "";
    persist();
    buildColorRow();
  };
  row.appendChild(all);
  PALETTE.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "sw" + (save.color === i ? " sel" : "");
    b.style.background = c;
    b.title = c;
    b.onclick = () => {
      save.color = i;
      persist();
      buildColorRow();
    };
    row.appendChild(b);
  });
}
function assignColors() {
  if (save.color === "") {
    const used = [];
    players.forEach((p) => {
      let c;
      do {
        c = pick(PALETTE);
      } while (used.includes(c) && used.length < PALETTE.length);
      used.push(c);
      p.color = c;
    });
  } else {
    const base = clamp(save.color, 0, PALETTE.length - 1);
    players.forEach((p, i) => {
      p.color = PALETTE[(base + i) % PALETTE.length];
    });
  }
}

/* ================= CANVAS ================= */
const cv = $("#cv"),
  ctx = cv.getContext("2d");
const DPR = Math.min(2, window.devicePixelRatio || 1);
cv.width = W * DPR;
cv.height = H * DPR;
ctx.scale(DPR, DPR);
const bg = document.createElement("canvas");
bg.width = W;
bg.height = H;
(function () {
  const b = bg.getContext("2d");
  b.fillStyle = "#0d0918";
  b.fillRect(0, 0, W, H);
  b.strokeStyle = "rgba(124,77,255,0.07)";
  for (let x = 0; x <= COLS; x++) {
    b.beginPath();
    b.moveTo(x * CELL + 0.5, 0);
    b.lineTo(x * CELL + 0.5, H);
    b.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    b.beginPath();
    b.moveTo(0, y * CELL + 0.5);
    b.lineTo(W, y * CELL + 0.5);
    b.stroke();
  }
  const g = b.createRadialGradient(W / 2, H / 2, H / 3, W / 2, H / 2, W / 1.3);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.5)");
  b.fillStyle = g;
  b.fillRect(0, 0, W, H);
})();

/* ================= UI ================= */
function showScreen(id) {
  [
    "menu",
    "classSel",
    "online",
    "lobby",
    "tree",
    "board",
    "shop",
    "how",
    "game",
    "over",
  ].forEach((s) => $("#" + s).classList.toggle("hidden", s !== id));
}
let toastT = null;
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2600);
}
function banner(t, s) {
  $("#bannerT").textContent = t;
  $("#bannerS").textContent = s || "";
  const b = $("#banner");
  b.classList.remove("show");
  void b.offsetWidth;
  b.classList.add("show");
}
function hideOvs() {
  $("#upOv").classList.add("hidden");
  $("#powersOv").classList.add("hidden");
  $("#pauseOv").classList.add("hidden");
}
function updateMenu() {
  $("#mSouls").textContent = save.souls;
  $("#mFrags").textContent = save.frags;
  $("#mBest").textContent = save.best;
  $("#mWave").textContent = save.bestWave;
}

/* ================= ÁRVORE DE HABILIDADES ================= */
const TIERNAMES = [
  "Iniciado",
  "Aprendiz",
  "Adepto",
  "Veterano",
  "Mestre",
  "Grão-Mestre",
  "Ascendente",
  "Transcendente",
  "Mítico",
  "Primordial",
];
const TREE_BASES = [
  {
    n: "Força",
    ic: "💪",
    d: "dano bruto",
    rootD: "+10% de dano",
    rootF: (p) => (p.treeB.dmg += 10),
    fx: [
      {
        m: 4,
        f: (p, m) => (p.treeB.dmg += m),
        d: (m) => "+" + m + "% de dano",
      },
      {
        m: 0.3,
        f: (p, m) => (p.treeB.dmgFlat += m),
        d: (m) => "+" + m + " de dano fixo",
      },
      {
        m: 0.5,
        f: (p, m) => (p.treeB.thorns += m),
        d: (m) => "+" + m + " de espinhos",
      },
    ],
  },
  {
    n: "Agilidade",
    ic: "👟",
    d: "velocidade e reflexos",
    rootD: "movimento +8%",
    rootF: (p) => (p.treeB.spd += 8),
    fx: [
      {
        m: 3,
        f: (p, m) => (p.treeB.spd += m),
        d: (m) => "movimento +" + m + "%",
      },
      {
        m: 3,
        f: (p, m) => (p.treeB.cd += m),
        d: (m) => "ataque +" + m + "% mais rápido",
      },
      {
        m: 0.08,
        f: (p, m) => (p.treeB.iframe += m),
        d: (m) => "+" + m + "s de invulnerabilidade",
      },
    ],
  },
  {
    n: "Vitalidade",
    ic: "❤️",
    d: "vida e sustentação",
    rootD: "+1 HP máximo",
    rootF: (p) => (p.treeB.hp += 1),
    fx: [
      {
        m: 0.6,
        f: (p, m) => (p.treeB.hp += m),
        d: (m) => "+" + m + " HP máximo",
      },
      {
        m: 0.5,
        f: (p, m) => (p.treeB.regen += m),
        d: (m) => "regeneração +" + m,
      },
      {
        m: 0.02,
        f: (p, m) => (p.treeB.ls += m),
        d: (m) => "+" + Math.round(m * 100) + "% de roubo de vida",
      },
    ],
  },
  {
    n: "Arcano",
    ic: "🔮",
    d: "projéteis e alcance",
    rootD: "alcance +25%",
    rootF: (p) => (p.treeB.range += 25),
    fx: [
      {
        m: 0.2,
        f: (p, m) => (p.treeB.shots += m),
        d: (m) => "+" + m + " projéteis",
      },
      {
        m: 0.25,
        f: (p, m) => (p.treeB.pierce += m),
        d: (m) => "+" + m + " perfuração",
      },
      {
        m: 8,
        f: (p, m) => (p.treeB.range += m),
        d: (m) => "+" + m + "% de alcance",
      },
    ],
  },
  {
    n: "Sorte",
    ic: "🍀",
    d: "crítico e tesouros",
    rootD: "crítico +5%",
    rootF: (p) => (p.treeB.crit += 5),
    fx: [
      {
        m: 2,
        f: (p, m) => (p.treeB.crit += m),
        d: (m) => "+" + m + "% de crítico",
      },
      {
        m: 3,
        f: (p, m) => (p.treeB.gold += m),
        d: (m) => "+" + m + "% de chance de comida dourada",
      },
      {
        m: 5,
        f: (p, m) => (p.treeB.souls += m),
        d: (m) => "+" + m + "% de almas",
      },
    ],
  },
  {
    n: "Fúria",
    ic: "🔥",
    d: "agressão total",
    rootD: "ataque +8% mais rápido",
    rootF: (p) => (p.treeB.cd += 8),
    fx: [
      {
        m: 4,
        f: (p, m) => (p.treeB.cd += m),
        d: (m) => "ataque +" + m + "% mais rápido",
      },
      {
        m: 3,
        f: (p, m) => (p.treeB.dmg += m),
        d: (m) => "+" + m + "% de dano",
      },
      {
        m: 0.6,
        f: (p, m) => (p.treeB.boom += m),
        d: (m) => "+" + m + " de explosão",
      },
    ],
  },
  {
    n: "Defesa",
    ic: "🛡️",
    d: "proteção",
    rootD: "+1 escudo por onda",
    rootF: (p) => (p.treeB.shield += 1),
    fx: [
      {
        m: 0.15,
        f: (p, m) => (p.treeB.shield += m),
        d: (m) => "+" + m + " escudos por onda",
      },
      {
        m: 0.8,
        f: (p, m) => (p.treeB.thorns += m),
        d: (m) => "+" + m + " de espinhos",
      },
      {
        m: 0.1,
        f: (p, m) => (p.treeB.iframe += m),
        d: (m) => "+" + m + "s de invulnerabilidade",
      },
    ],
  },
  {
    n: "Caos",
    ic: "☄️",
    d: "explosões e veneno",
    rootD: "explosões +1.5",
    rootF: (p) => (p.treeB.boom += 1.5),
    fx: [
      {
        m: 0.8,
        f: (p, m) => (p.treeB.boom += m),
        d: (m) => "+" + m + " de explosão",
      },
      {
        m: 0.5,
        f: (p, m) => (p.treeB.venom += m),
        d: (m) => "+" + m + " de veneno",
      },
      {
        m: 0.15,
        f: (p, m) => (p.treeB.shots += m),
        d: (m) => "+" + m + " projéteis",
      },
    ],
  },
  {
    n: "Espírito",
    ic: "👻",
    d: "drenagem e alma",
    rootD: "roubo de vida +5%",
    rootF: (p) => (p.treeB.ls += 0.05 * 100),
    fx: [
      {
        m: 0.6,
        f: (p, m) => (p.treeB.ls += m),
        d: (m) => "+" + m + "% de roubo de vida",
      },
      {
        m: 0.4,
        f: (p, m) => (p.treeB.regen += m),
        d: (m) => "regeneração +" + m,
      },
      {
        m: 0.1,
        f: (p, m) => (p.treeB.magnet += m),
        d: (m) => "+" + m + " de magnetismo",
      },
    ],
  },
];
function hashStr(s) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
function treeNode(bi, path) {
  const key = bi + "-" + path.join("-");
  const h = hashStr("srk" + key);
  const tier = path.length;
  const pool = TREE_BASES[bi].fx;
  const fx = pool[h % pool.length];
  const mag = Math.round(fx.m * tier * (1 + ((h >> 3) % 3) * 0.25) * 100) / 100;
  const cost = Math.round((6 + tier * tier * 5) * (1 + ((h >> 5) % 25) / 50));
  const roman = ["I", "II", "III"][path[path.length - 1] - 1];
  return {
    key,
    name:
      TREE_BASES[bi].n + " " + TIERNAMES[Math.min(tier - 1, 9)] + " " + roman,
    desc: fx.d(mag),
    cost,
    tier,
    apply: (p) => fx.f(p, mag),
  };
}
function treeRoot(bi) {
  return {
    key: String(bi),
    name: TREE_BASES[bi].n + " Essencial",
    desc: TREE_BASES[bi].rootD,
    cost: 10,
  };
}
let treeView = { bi: -1, path: [] };
function openTree() {
  showScreen("tree");
  treeView = { bi: -1, path: [] };
  renderTree();
}
function nodeCard(node, owned, blocked, canBuy, clickAttr) {
  const state = owned
    ? '<span style="color:#7dff5e">✔ DESBLOQUEADA</span>'
    : blocked
      ? '<span style="color:#ff5d7f">🔒 caminho bloqueado</span>'
      : '<span style="color:' +
        (canBuy ? "#ffd75e" : "#ff5d7f") +
        '">💠 ' +
        node.cost +
        "</span>";
  return `<div class="card ${owned ? "sel" : ""}" style="${blocked ? "opacity:.45;" : ""}" ${clickAttr || ""}>
  <div class="ic">${owned ? "✅" : "✨"}</div><h3>${node.name}</h3><p>${node.desc}</p><div class="tags">${state}</div></div>`;
}
function renderTree() {
  $("#treeFrags").textContent = save.frags;
  const w = $("#treeWrap");
  const tree = save.tree || [];
  const owned = (k) => tree.includes(k);
  if (treeView.bi < 0) {
    w.innerHTML =
      '<div class="grid">' +
      TREE_BASES.map((b, i) => {
        const cnt = tree.filter(
          (k) => k === String(i) || k.indexOf(i + "-") === 0,
        ).length;
        return `<div class="card" onclick="treeView={bi:${i},path:[]};renderTree()"><div class="ic">${b.ic}</div><h3>${b.n}</h3><p>${b.d}</p><div class="tags">${cnt > 0 ? "✅ " + cnt + " skill(s)" : "🔒 fechado"}</div></div>`;
      }).join("") +
      "</div>";
    return;
  }
  const bi = treeView.bi,
    path = treeView.path,
    base = TREE_BASES[bi];
  const curKey = path.length ? bi + "-" + path.join("-") : String(bi);
  let html = `<button class="btn small" onclick="treeBack()">← voltar ${path.length ? "(nível " + path.length + "/10)" : ""}</button>`;
  html +=
    '<div style="margin:8px 0;font-family:Orbitron;color:#ffd75e">' +
    base.ic +
    " CONSTELAÇÃO DE " +
    base.n.toUpperCase() +
    "</div>";
  html += '<div class="grid" style="justify-content:center">';
  if (path.length === 0) {
    const r = treeRoot(bi);
    html += nodeCard(
      r,
      owned(r.key),
      false,
      !owned(r.key) && save.frags >= r.cost,
      owned(r.key) ? "" : 'onclick="buyTree(' + bi + ",'')\"",
    );
  } else {
    const cur = treeNode(bi, path);
    html += nodeCard(cur, true, false, false);
  }
  html += "</div>";
  if (owned(curKey) && path.length < 10) {
    html +=
      '<div class="hintbar">escolha UM dos 3 caminhos — os outros serão bloqueados para sempre:</div><div class="grid">';
    for (let d = 1; d <= 3; d++) {
      const cp = path.concat([d]),
        ck = bi + "-" + cp.join("-");
      const sib = [1, 2, 3].some(
        (x) => x !== d && owned(bi + "-" + path.concat([x]).join("-")),
      );
      const node = treeNode(bi, cp);
      const isOwn = owned(ck);
      const can = !isOwn && !sib && save.frags >= node.cost;
      const click = isOwn
        ? `onclick="treeView.path=treeView.path.concat([${d}]);renderTree()"`
        : !sib
          ? `onclick="buyTree(${bi},'${cp.join("-")}')"`
          : "";
      html += nodeCard(node, isOwn, sib && !isOwn, can, click);
    }
    html += "</div>";
  } else if (!owned(curKey)) {
    html +=
      '<div class="hintbar">desbloqueie o nó acima para abrir caminhos</div>';
  } else {
    html +=
      '<div class="hintbar">🏁 nível máximo (10) alcançado neste caminho</div>';
  }
  const ownKeys = tree.filter(
    (k) => k === String(bi) || k.indexOf(bi + "-") === 0,
  );
  if (ownKeys.length) {
    html +=
      '<div style="margin-top:14px">' +
      ownKeys
        .map((k) => {
          const p = k === String(bi) ? null : k.split("-").slice(1).map(Number);
          const n = p ? treeNode(bi, p).name : treeRoot(bi).name;
          return `<span class="pchip">${n}</span>`;
        })
        .join("") +
      "</div>";
  }
  w.innerHTML = html;
}
function treeBack() {
  if (treeView.path.length) treeView.path.pop();
  else treeView.bi = -1;
  renderTree();
}
function buyTree(bi, pathStr) {
  const path = pathStr ? pathStr.split("-").map(Number) : [];
  const node = path.length ? treeNode(bi, path) : treeRoot(bi);
  const key = path.length ? bi + "-" + path.join("-") : String(bi);
  const tree = save.tree || [];
  if (tree.includes(key)) return;
  if (path.length) {
    const parent =
      path.length === 1 ? String(bi) : bi + "-" + path.slice(0, -1).join("-");
    if (!tree.includes(parent)) return;
    const sib = [1, 2, 3].some(
      (x) =>
        x !== path[path.length - 1] &&
        tree.includes(bi + "-" + path.slice(0, -1).concat([x]).join("-")),
    );
    if (sib) {
      toast("🔒 Caminho bloqueado por outra escolha!");
      return;
    }
  }
  if (save.frags < node.cost) {
    toast("💠 Fragmentos insuficientes!");
    return;
  }
  save.frags -= node.cost;
  tree.push(key);
  save.tree = tree;
  persist();
  sfx("gold");
  renderTree();
}
function finalizeTree(p) {
  const b = p.treeB;
  // DIMINISHING RETURNS para evitar crescimento exponencial
  // Dano: reduz eficácia após 50% de bônus
  const dmgEff = b.dmg <= 50 ? b.dmg : 50 + (b.dmg - 50) * 0.5;
  p.dmg *= 1 + clamp(dmgEff, 0, 120) / 100;
  p.dmgFlat += clamp(b.dmgFlat, 0, 3);
  // Cooldown: limite de 50% redução máxima
  p.cd *= 1 - clamp(b.cd, 0, 50) / 100;
  p.spd *= 1 - clamp(b.spd, 0, 40) / 100;
  const hp = Math.floor(clamp(b.hp, 0, 6));
  p.maxHp += hp;
  p.hp += hp;
  // Crítico: limite de 40% máximo
  p.crit += clamp(b.crit, 0, 40) / 100;
  p.pierce += Math.floor(clamp(b.pierce, 0, 2));
  p.shots += Math.floor(clamp(b.shots, 0, 3));
  p.ls += clamp(b.ls, 0, 0.3);
  if (b.regen > 0) p.regenMax = Math.max(4, 6 - Math.floor(b.regen));
  p.boom += clamp(b.boom, 0, 4);
  p.venom += clamp(b.venom, 0, 3);
  p.range *= 1 + clamp(b.range, 0, 80) / 100;
  p.soulMult *= 1 + clamp(b.souls, 0, 60) / 100;
  p.goldBonus = clamp(b.gold, 0, 30);
  p.shieldBase += Math.floor(clamp(b.shield, 0, 1));
  p.thorns += Math.floor(clamp(b.thorns, 0, 3));
  p.iframeBonus += clamp(b.iframe, 0, 0.8);
  if (b.magnet >= 1) p.magnet = true;
  p.shield = Math.max(p.shield, p.shieldBase);
}

/* ================= LOJA ================= */
function openShop() {
  buildShop();
  showScreen("shop");
}
function buildShop() {
  $("#shopSouls").textContent = save.souls;
  const g = $("#shopGrid");
  g.innerHTML = "";
  SHOP.forEach((it) => {
    const lvl = save.upg[it.k],
      maxed = lvl >= it.max,
      cost = it.c(lvl);
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<div class="ic">${it.ic}</div><h3>${it.n}</h3><p>${it.d}</p><div class="lvl">${"●".repeat(lvl)}${"○".repeat(it.max - lvl)}</div><div style="margin-top:8px;color:${maxed ? "#8f7fc0" : save.souls >= cost ? "#ffd75e" : "#ff5d7f"}">${maxed ? "MÁXIMO" : "💜 " + cost}</div>`;
    if (!maxed && save.souls >= cost)
      c.onclick = () => {
        save.souls -= cost;
        save.upg[it.k]++;
        persist();
        sfx("gold");
        buildShop();
      };
    g.appendChild(c);
  });
}

/* ================= CLASSES ================= */
let csQueue = [],
  csNeed = 1;
function gotoClass(m) {
  lastMode = m;
  mode = m;
  role = "solo";
  csQueue = [];
  csNeed = m === "local" ? 2 : 1;
  buildClassCards($("#csGrid"), (i) => {
    csQueue.push(i);
    sfx("eat");
    if (csQueue.length < csNeed) {
      $("#csTitle").textContent = "JOGADOR 2 — ESCOLHA SUA CLASSE";
      markSel(i);
    } else startRun(csQueue.slice(), m);
  });
  $("#csTitle").textContent =
    csNeed === 2 ? "JOGADOR 1 — ESCOLHA SUA CLASSE" : "ESCOLHA SUA CLASSE";
  showScreen("classSel");
}
function markSel(i) {
  $("#csGrid").children[i].classList.add("sel");
}
function buildClassCards(grid, onPick) {
  grid.innerHTML = "";
  CLASSES.forEach((c, i) => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<div class="ic">${c.ic}</div><h3>${c.name}</h3><p>${c.desc}</p><div class="tags">✨ ${c.ab}<br>${c.pass} · ❤️${c.hp}</div>`;
    d.onclick = () => onPick(i);
    grid.appendChild(d);
  });
}

/* ================= RUN ================= */
function makePlayer(cls, idx) {
  const c = CLASSES[cls];
  const p = {
    idx,
    cls,
    name: c.name,
    color: c.color,
    ic: c.ic,
    hp: c.hp + save.upg.vit,
    maxHp: c.hp + save.upg.vit,
    dmg: c.dmg * (1 + 0.08 * save.upg.frc),
    dmgFlat: 0,
    cd: c.cd * Math.pow(0.94, save.upg.vlt),
    at: 0.6,
    spd: c.spd,
    mt: 0,
    dir: { x: idx === 0 ? 1 : -1, y: 0 },
    qdir: null,
    cells: [],
    grow: 2,
    abCd: c.abCd,
    abT: 0,
    abName: c.ab,
    pierce: 0,
    shots: 1,
    ls: 0,
    crit: 0.05 * save.upg.crt,
    range: 250,
    magnet: !!save.upg.mag,
    regenMax: 0,
    regenC: 0,
    venom: 0,
    boom: cls === 5 ? 1.2 : 0,
    boomR: 60,
    thorns: 0,
    exec: false,
    iframeBonus: 0,
    soulMult: 1,
    goldLuck: false,
    goldBonus: 0,
    killHeal: 0,
    kc: 0,
    shieldBase: save.upg.esc,
    shield: save.upg.esc,
    shieldT: 0,
    iframes: 0,
    healT: 0,
    revLeft: save.upg.rev || 0,
    dead: false,
    kills: 0,
    apples: 0,
    necroC: 0,
    relicCrown: false,
    powerLog: [],
    treeB: {
      dmg: 0,
      dmgFlat: 0,
      cd: 0,
      spd: 0,
      hp: 0,
      crit: 0,
      pierce: 0,
      shots: 0,
      ls: 0,
      regen: 0,
      boom: 0,
      venom: 0,
      range: 0,
      souls: 0,
      gold: 0,
      shield: 0,
      thorns: 0,
      iframe: 0,
      magnet: 0,
    },
  };
  (save.tree || []).forEach((k) => {
    const parts = k.split("-");
    const bi = parseInt(parts[0]);
    const b = TREE_BASES[bi];
    if (!b) return;
    if (parts.length === 1) b.rootF(p);
    else treeNode(bi, parts.slice(1).map(Number)).apply(p);
  });
  finalizeTree(p);
  const sx = idx === 0 ? 6 : COLS - 7,
    sy = Math.floor(ROWS / 2);
  for (let i = 0; i < 3; i++) p.cells.push([sx - i * p.dir.x, sy]);
  const startN = (save.upg.ben || 0) + (save.upg.ini || 0);
  for (let i = 0; i < startN; i++) {
    const u = pick(UPGRADES);
    u.f(p);
    p.powerLog.push(u.n);
  }
  return p;
}
function startRun(clsList, m) {
  mode = m;
  lastMode = m;
  players = clsList.map((c, i) => makePlayer(c, i));
  assignColors();
  enemies = [];
  pbullets = [];
  ebullets = [];
  foods = [];
  drops = [];
  blocks = [];
  bombs = [];
  parts = [];
  texts = [];
  effects = [];
  wave = 0;
  score = 0;
  kills = 0;
  runSouls = 0;
  gameT = 0;
  paused = false;
  pickState = null;
  runActive = true;
  rs = null;
  combo = 0;
  comboT = 0;
  comboMax = 0;
  waveMod = null;
  fragsRun = 0;
  pingMs = null;
  gPrev = { wave: 0, hp: 0, paused: false };
  for (let i = 0; i < 5; i++) spawnFood(true);
  hideOvs();
  showScreen("game");
  setHint();
  startWave(1);
}
function setHint() {
  $("#ctrlHint").innerHTML =
    mode === "local"
      ? 'J1: <span class="kbd">WASD</span>+<span class="kbd">E</span> · J2: <span class="kbd">setas</span>+<span class="kbd">Enter</span> · <span class="kbd">P</span> poderes · <span class="kbd">espaço</span> pausa'
      : 'mover: <span class="kbd">WASD</span>/<span class="kbd">setas</span> · habilidade: <span class="kbd">E</span> · <span class="kbd">P</span> poderes · pausa: <span class="kbd">espaço</span>';
}
function headPx(p) {
  return { x: (p.cells[0][0] + 0.5) * CELL, y: (p.cells[0][1] + 0.5) * CELL };
}
function blockAt(x, y) {
  return blocks.find((b) => b.x === x && b.y === y);
}
function addBlock() {
  for (let t = 0; t < 40; t++) {
    const x = ri(1, COLS - 2),
      y = ri(1, ROWS - 2);
    if (blockAt(x, y) || foods.some((f) => f.x === x && f.y === y)) continue;
    if (
      players.some(
        (p) =>
          !p.dead &&
          Math.abs(p.cells[0][0] - x) + Math.abs(p.cells[0][1] - y) < 4,
      )
    )
      continue;
    blocks.push({ x, y, hp: 6 });
    return;
  }
}
function spawnFood(normal) {
  for (let t = 0; t < 40; t++) {
    const x = ri(0, COLS - 1),
      y = ri(0, ROWS - 1);
    if (blockAt(x, y) || foods.some((f) => f.x === x && f.y === y)) continue;
    let ty = "n";
    if (!normal) {
      const gl = players.some((p) => !p.dead && p.goldLuck);
      const gb = players.reduce(
        (a, p) => (!p.dead && p.goldBonus ? Math.max(a, p.goldBonus) : a),
        0,
      );
      const r = Math.random(),
        g = clamp((gl ? 0.4 : 0.16) + gb / 100, 0, 0.7);
      ty = r < g ? "g" : r < g + 0.18 ? "p" : "n";
    }
    foods.push({ x, y, t: ty, mt: 0 });
    return;
  }
}
function spawnDrop(x, y, t) {
  drops.push({ x, y, t, born: gameT, life: 12 });
}
function startWave(n) {
  wave = n;
  phase = "play";
  waveMod = n >= 3 ? (Math.random() < 0.3 ? MODS[0] : pick(MODS)) : MODS[0];
  players.forEach((p) => {
    if (p.dead) {
      p.dead = false;
      p.hp = Math.max(1, Math.ceil(p.maxHp / 2));
      p.dir = { x: p.idx === 0 ? 1 : -1, y: 0 };
      p.cells = [];
      const sx = p.idx === 0 ? 6 : COLS - 7,
        sy = Math.floor(ROWS / 2);
      for (let i = 0; i < 3; i++) p.cells.push([sx - i * p.dir.x, sy]);
      p.grow = 2;
      p.iframes = 2;
    }
    if (p.relicCrown) p.hp = Math.min(p.maxHp, p.hp + 2);
    if (save.upg.cur) p.hp = Math.min(p.maxHp, p.hp + save.upg.cur);
    p.shield = Math.max(p.shield, p.shieldBase);
  });
  for (let i = 0; i < Math.min(3 + Math.floor(n / 2), 8); i++) addBlock();
  let q;
  if (n % 5 === 0) {
    // Boss waves: escolhe 1-3 bosses diferentes baseado na wave
    const bossTier = Math.floor((n / 5 - 1) / 2);
    const bossPool = ["boss", "boss2", "boss3", "boss4", "boss5", "boss6"];
    const availableBosses = bossPool.slice(0, Math.min(4 + bossTier, bossPool.length));
    
    // Sistema de múltiplos bosses mais complexo
    // A cada 15 waves: 2 bosses, a cada 30 waves: 3 bosses ou 1 elite
    let numBosses = 1;
    if (n % 30 === 0 && n >= 30) {
      // Wave 30, 60, 90...: BOSS ELITE super poderoso
      waveBoss = "boss_elite";
      bossLeft = 1;
      banner("⚠️ CHEFE ELITE ⚠️", "Prepare-se para o inimigo supremo!");
      sfx("up");
      spawnQ = 1 + Math.floor(n / 10);
      spawnT = 1.8;
      return;
    } else if (n % 15 === 0 && n >= 15) {
      // Waves 15, 45, 75...: 2 bosses simultâneos
      numBosses = 2;
    } else if (n % 25 === 0 && n >= 25) {
      // Waves 25, 50, 75...: 3 bosses (sobreposição com 15 cria variação)
      numBosses = Math.max(numBosses, 3);
    }
    
    // Seleciona bosses únicos que não se repetem
    const selectedBosses = [];
    const usedIndices = new Set();
    for (let i = 0; i < numBosses && i < availableBosses.length; i++) {
      let attempts = 0;
      let idx;
      do {
        idx = (Math.floor(n / 5) - 1 + i + Math.floor(Math.random() * 3)) % availableBosses.length;
        attempts++;
      } while (usedIndices.has(idx) && attempts < 5);
      
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        selectedBosses.push(availableBosses[idx]);
      }
    }
    
    // Garante pelo menos 1 boss
    if (selectedBosses.length === 0 && availableBosses.length > 0) {
      selectedBosses.push(availableBosses[0]);
    }
    
    waveBoss = selectedBosses[0];
    bossLeft = selectedBosses.length;
    
    // Armazena os bosses secundários para spawnar depois
    if (selectedBosses.length > 1) {
      window.extraBosses = selectedBosses.slice(1);
    }
    
    q = bossLeft + Math.floor(n / 10);
  } else {
    bossLeft = 0;
    q = Math.min(6 + n * 2, 30);
  }
  if (waveMod.id === "swarm") q = Math.min(44, Math.round(q * 1.6));
  spawnQ = q;
  spawnT = 1.2;
  const sub =
    n % 5 === 0
      ? "prepare-se..."
      : waveMod.id !== "none"
        ? waveMod.n + " — " + waveMod.d
        : "";
  banner(n % 5 === 0 ? "⚠️ CHEFE ⚠️" : "ONDA " + n, sub);
  sfx("up");
}
function pickType(w) {
  const pool = ["grunter"];
  if (w >= 2) pool.push("runner", "runner");
  if (w >= 3) pool.push("shooter");
  if (w >= 4) pool.push("runner", "splitter");
  if (w >= 5) pool.push("charger", "orbiter");
  if (w >= 6) pool.push("healer");
  if (w >= 7) pool.push("sniper");
  if (w >= 10) pool.push("sniper_elite");
  
  // Sistema de variantes progressivas
  const tier = Math.floor((w - 1) / 10);  // Tier a cada 10 waves
  const bossTier = Math.floor((w - 1) / 15);  // Boss tier a cada 15 waves
  
  // A cada 10 waves, inimigos básicos são substituídos por variantes elite
  if (tier >= 1) {
    // Waves 10-19: tier 1, waves 20-29: tier 2, etc.
    const upgradeChance = Math.min(0.3 + tier * 0.1, 0.85);  // Chance aumenta com tier
    
    if (w % 10 >= 3) {  // Começa a aplicar variante após wave 3 do tier
      // Substitui inimigos básicos por variantes mais fortes com padrões complexos
      if (pool.includes("grunter") && Math.random() < upgradeChance) {
        pool.push("grunt_veteran");
        pool = pool.filter(t => t !== "grunter");  // Remove básico
      }
      if (pool.includes("runner") && Math.random() < upgradeChance) {
        pool.push("runner_veteran");
        pool = pool.filter(t => t !== "runner");
      }
      if (pool.includes("shooter") && Math.random() < upgradeChance) {
        pool.push("shooter_veteran");
        pool = pool.filter(t => t !== "shooter");
      }
      if (pool.includes("splitter") && Math.random() < upgradeChance) {
        pool.push("splitter_veteran");
        pool = pool.filter(t => t !== "splitter");
      }
      if (pool.includes("charger") && Math.random() < upgradeChance) {
        pool.push("charger_veteran");
        pool = pool.filter(t => t !== "charger");
      }
      if (pool.includes("orbiter") && Math.random() < upgradeChance) {
        pool.push("orbiter_veteran");
        pool = pool.filter(t => t !== "orbiter");
      }
      if (pool.includes("healer") && Math.random() < upgradeChance) {
        pool.push("healer_veteran");
        pool = pool.filter(t => t !== "healer");
      }
      if (pool.includes("sniper") && Math.random() < upgradeChance) {
        pool.push("sniper_veteran");
        pool = pool.filter(t => t !== "sniper");
      }
    }
  }
  
  return pick(pool);
}
function spawnEnemy(type) {
  const d = EDEF[type];
  let x,
    y,
    tries = 0;
  do {
    const side = ri(0, 3);
    if (side === 0) {
      x = rnd(0, W);
      y = -20;
    } else if (side === 1) {
      x = rnd(0, W);
      y = H + 20;
    } else if (side === 2) {
      x = -20;
      y = rnd(0, H);
    } else {
      x = W + 20;
      y = rnd(0, H);
    }
    tries++;
  } while (
    tries < 8 &&
    players.some((p) => !p.dead && dist(x, y, headPx(p).x, headPx(p).y) < 200)
  );
  let hp = d.hp * (1 + (wave - 1) * 0.16);
  let spd = d.spd * (1 + Math.min(0.5, wave * 0.012));
  if (waveMod) {
    if (waveMod.id === "fast") spd *= 1.25;
    if (waveMod.id === "tank") hp *= 1.6;
    if (waveMod.id === "swarm") hp *= 0.6;
  }
  let elite = false;
  if (type === "boss") hp = 30 + wave * 12;
  else if (type === "boss2") hp = 34 + wave * 14;
  else if (type === "boss3") hp = 32 + wave * 13;
  else if (type === "boss4") hp = 28 + wave * 12;
  else if (wave >= 2 && Math.random() < Math.min(0.25, 0.06 + wave * 0.012)) {
    elite = true;
    hp *= 3;
    spd *= 1.1;
  }
  const en = {
    id: eid++,
    type,
    x,
    y,
    hp,
    mhp: Math.ceil(hp),
    spd,
    r: Math.round(d.r * (elite ? 1.2 : 1)),
    score: d.score * (elite ? 3 : 1),
    shT:
      waveMod && waveMod.id === "rage" && type === "shooter"
        ? rnd(0.5, 1.5)
        : rnd(1, 2.5),
    flash: 0,
    dot: 0,
    dotT: 0,
    lastHitBy: null,
    elite,
    enraged: false,
  };
  if (type === "orbiter") {
    en.ang = rnd(0, TAU);
    en.rad = 150;
    en.spin = Math.random() < 0.5 ? -1 : 1;
  }
  if (type === "charger") {
    en.st = "rest";
    en.t = rnd(0.8, 1.6);
    en.dx = 1;
    en.dy = 0;
  }
  if (type === "boss3") {
    en.st = "chase";
    en.t = 2;
    en.dx = 1;
    en.dy = 0;
  }
  if (type === "boss4") {
    en.tp = 2.5;
  }
  enemies.push(en);
}
function newMinion(x, y) {
  return {
    id: eid++,
    type: "mini",
    x,
    y,
    hp: 2,
    mhp: 2,
    spd: 95,
    r: 9,
    score: 1,
    shT: 99,
    flash: 0,
    dot: 0,
    dotT: 0,
    lastHitBy: null,
    elite: false,
    enraged: false,
  };
}
function spawnStep() {
  if (bossLeft > 0) {
    spawnEnemy(waveBoss);
    bossLeft--;
    // Spawn extra bosses se existirem
    if (bossLeft === 0 && window.extraBosses && window.extraBosses.length > 0) {
      const extra = window.extraBosses.shift();
      setTimeout(() => spawnEnemy(extra), 1500);
    }
  } else spawnEnemy(pickType(wave));
}

/* ================= UPDATE ================= */
function update(dt) {
  if (spawnQ > 0) {
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = Math.max(0.45, 1.3 - wave * 0.04);
      spawnQ--;
      spawnStep();
    }
  }
  comboT -= dt;
  if (comboT <= 0) combo = 0;
  players.forEach((p) => {
    if (!p.dead) updatePlayer(p, dt);
  });
  updateEnemies(dt);
  updateBullets(dt);
  updateEBullets(dt);
  updateBombs(dt);
  updateFoods(dt);
  updateDrops(dt);
  if (phase === "play" && spawnQ === 0 && enemies.length === 0) waveClear();
}
function updatePlayer(p, dt) {
  p.iframes = Math.max(0, p.iframes - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);
  p.abT = Math.max(0, p.abT - dt);
  p.healT = Math.max(0, p.healT - dt);
  p.mt -= dt * 1000;
  let guard = 0;
  while (p.mt <= 0 && guard++ < 6) {
    p.mt += p.spd;
    stepSnake(p);
  }
  p.at -= dt;
  if (p.at <= 0) {
    const Hh = headPx(p),
      tgt = nearestEnemy(Hh.x, Hh.y, p.range);
    if (tgt) {
      p.at = p.cd;
      fireShots(p, Hh, tgt);
    } else p.at = 0.1;
  }
}
function stepSnake(p) {
  if (p.qdir) {
    const d = p.qdir;
    p.qdir = null;
    if (!(d.x === -p.dir.x && d.y === -p.dir.y)) p.dir = d;
  }
  const h = p.cells[0];
  const nx = (h[0] + p.dir.x + COLS) % COLS,
    ny = (h[1] + p.dir.y + ROWS) % ROWS;
  p.cells.unshift([nx, ny]);
  if (p.grow > 0) p.grow--;
  else p.cells.pop();
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    if (f.x === nx && f.y === ny) {
      foods.splice(i, 1);
      eatFood(p, f);
    }
  }
  const b = blockAt(nx, ny);
  if (b) {
    damagePlayer(p, 1);
    b.hp -= 3;
    addParts((nx + 0.5) * CELL, (ny + 0.5) * CELL, "#a86bff", 6);
  }
}
function eatFood(p, f) {
  const Hh = headPx(p);
  if (f.t === "g") {
    score += 5;
    runSouls += 2;
    p.grow += 2;
    heal(p, 1);
    texts.push({
      x: Hh.x,
      y: Hh.y - 16,
      txt: "+5 ✦",
      c: "#ffd75e",
      life: 0.9,
      s: 16,
    });
    sfx("gold");
    addParts(Hh.x, Hh.y, "#ffd75e", 12);
  } else if (f.t === "p") {
    if (p.cls === 3) {
      heal(p, 1);
      texts.push({
        x: Hh.x,
        y: Hh.y - 16,
        txt: "veneno absorvido",
        c: "#b04dff",
        life: 0.9,
        s: 13,
      });
    } else damagePlayer(p, 1);
    sfx("hurt");
  } else {
    score += 1;
    p.grow += 1;
    p.apples++;
    sfx("eat");
    if (p.cls === 4 && p.apples % 8 === 0) heal(p, 1);
    if (p.regenMax > 0) {
      p.regenC++;
      if (p.regenC >= p.regenMax) {
        p.regenC = 0;
        heal(p, 1);
      }
    }
  }
}
function updateDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const f = drops[i];
    f.life -= dt;
    if (f.life <= 0) {
      drops.splice(i, 1);
      continue;
    }
    let taken = false;
    for (const p of players) {
      if (p.dead) continue;
      const Hh = headPx(p);
      if (p.magnet && dist(f.x, f.y, Hh.x, Hh.y) < 170) {
        f.x += (Hh.x - f.x) * dt * 4;
        f.y += (Hh.y - f.y) * dt * 4;
      }
      if (dist(f.x, f.y, Hh.x, Hh.y) < 20) {
        drops.splice(i, 1);
        taken = true;
        if (f.t === "heart") {
          heal(p, 1);
          sfx("gold");
        } else {
          runSouls += 2;
          score += 1;
          texts.push({
            x: f.x,
            y: f.y - 12,
            txt: "+2 almas",
            c: "#c9a8ff",
            life: 0.8,
            s: 13,
          });
          sfx("eat");
        }
        addParts(f.x, f.y, f.t === "heart" ? "#ff4d6d" : "#b04dff", 10);
        break;
      }
    }
    if (taken) continue;
  }
}
/* ⚖️ cura com cooldown global — sem imortalidade */
function heal(p, n) {
  if (p.dead || !n) return;
  if (p.healT > 0) return;
  if (p.hp >= p.maxHp) return;
  p.hp = Math.min(p.maxHp, p.hp + n);
  p.healT = 0.6;
  const Hh = headPx(p);
  texts.push({
    x: Hh.x,
    y: Hh.y - 18,
    txt: "+" + n + "❤",
    c: "#7dff5e",
    life: 0.8,
    s: 13,
  });
}
function nearestEnemy(x, y, range) {
  let best = null,
    bd = range;
  for (const e of enemies) {
    const d = dist(x, y, e.x, e.y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}
function nearestPlayer(x, y) {
  let best = null,
    bd = 1e9;
  for (const p of players) {
    if (p.dead) continue;
    const Hh = headPx(p);
    const d = dist(x, y, Hh.x, Hh.y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
function fireShots(p, Hh, tgt) {
  const base = Math.atan2(tgt.y - Hh.y, tgt.x - Hh.x),
    n = p.shots;
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * 0.16,
      crit = Math.random() < p.crit;
    pbullets.push({
      x: Hh.x,
      y: Hh.y,
      vx: Math.cos(a) * 460,
      vy: Math.sin(a) * 460,
      dmg: (p.dmg + p.dmgFlat) * (crit ? 2 : 1),
      pierce: p.pierce,
      venom: p.venom,
      ls: p.ls,
      owner: p,
      color: p.color,
      crit,
      life: 1.4,
      hits: [],
    });
  }
  sfx("shoot");
}
function updateBullets(dt) {
  for (let i = pbullets.length - 1; i >= 0; i--) {
    const b = pbullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead =
      b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;
    const bl = blockAt(Math.floor(b.x / CELL), Math.floor(b.y / CELL));
    if (!dead && bl) {
      bl.hp -= b.dmg;
      addParts(b.x, b.y, "#a86bff", 4);
      dead = true;
    }
    if (!dead)
      for (const e of enemies) {
        if (b.hits.includes(e.id)) continue;
        if (dist(b.x, b.y, e.x, e.y) < e.r + 6) {
          b.hits.push(e.id);
          hitEnemy(e, b);
          if (b.pierce > 0) b.pierce--;
          else {
            dead = true;
          }
          if (dead) break;
        }
      }
    if (dead) pbullets.splice(i, 1);
  }
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].hp <= 0) {
      const b = blocks[i];
      score += 1;
      addParts((b.x + 0.5) * CELL, (b.y + 0.5) * CELL, "#a86bff", 12);
      if (Math.random() < 0.35) spawnFood(false);
      blocks.splice(i, 1);
    }
  }
}
function hitEnemy(e, b) {
  e.hp -= b.dmg;
  e.flash = 0.12;
  e.lastHitBy = b.owner;
  e.x += b.vx * 0.012;
  e.y += b.vy * 0.012;
  texts.push({
    x: e.x,
    y: e.y - e.r - 8,
    txt: (b.crit ? "✦" : "") + Math.round(b.dmg * 10) / 10,
    c: b.crit ? "#ffd75e" : "#fff",
    life: 0.6,
    s: b.crit ? 15 : 12,
  });
  if (b.venom > 0) {
    e.dot = Math.max(e.dot, b.venom);
    e.dotT = 3;
  }
  if (b.ls > 0 && Math.random() < b.ls && b.owner) heal(b.owner, 1);
  if (b.owner && b.owner.exec && e.hp > 0 && e.hp < e.mhp * 0.25) e.hp = 0;
}
function cleanupEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      const e = enemies[i];
      enemies.splice(i, 1);
      onEnemyDeath(e);
    }
  }
}
function onEnemyDeath(e) {
  kills++;
  combo++;
  comboT = 3;
  comboMax = Math.max(comboMax, combo);
  score += Math.round(e.score * (1 + Math.min(combo, 25) * 0.1));
  if (combo >= 3)
    texts.push({
      x: e.x,
      y: e.y - e.r - 24,
      txt: "COMBO x" + combo,
      c: "#ff9838",
      life: 0.7,
      s: 13,
    });
  const p = e.lastHitBy;
  if (p) {
    p.kills++;
    if (p.cls === 3) {
      p.necroC++;
      if (p.necroC >= 10) {
        p.necroC = 0;
        heal(p, 1);
      }
    }
    if (p.killHeal > 0) {
      p.kc++;
      if (p.kc >= p.killHeal) {
        p.kc = 0;
        heal(p, 1);
      }
    }
  }
  addParts(e.x, e.y, EDEF[e.type].c, 14);
  sfx("kill");
  if (e.type === "splitter") {
    for (let k = 0; k < 2; k++)
      enemies.push(newMinion(e.x + rnd(-12, 12), e.y + rnd(-12, 12)));
  }
  if (e.type.startsWith("boss")) {
    spawnDrop(e.x, e.y, "heart");
    spawnDrop(e.x - 24, e.y + 10, "soul");
    spawnDrop(e.x + 24, e.y + 10, "soul");
    runSouls += 5;
    shake = 12;
    banner("💀 CHEFE DERROTADO", "+5 almas");
  } else if (e.elite) {
    spawnDrop(e.x, e.y, "soul");
    if (Math.random() < 0.5)
      spawnDrop(e.x + rnd(-14, 14), e.y + rnd(-14, 14), "heart");
  } else {
    if (Math.random() < 0.3) spawnDrop(e.x, e.y, "soul");
    const hurt = players.some((q) => !q.dead && q.hp < q.maxHp);
    if (Math.random() < (hurt ? 0.18 : 0.06)) spawnDrop(e.x, e.y, "heart");
  }
  if (p && p.boom > 0)
    explode(
      e.x,
      e.y,
      p.boomR + (e.type.startsWith("boss") ? 40 : 0),
      p.boom,
      p,
    );
}
function explode(x, y, r, dmg, p) {
  addParts(x, y, "#ff9838", 22, 4);
  addParts(x, y, "#ffd75e", 10, 3);
  shake = Math.min(14, shake + 5);
  sfx("ab");
  for (const e of enemies) {
    if (dist(x, y, e.x, e.y) < r + e.r) {
      e.hp -= dmg;
      e.flash = 0.15;
      if (!e.lastHitBy) e.lastHitBy = p;
    }
  }
  cleanupEnemies();
}
function updateEnemies(dt) {
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt);
    if (e.dotT > 0) {
      e.dotT -= dt;
      e.hp -= e.dot * dt;
      if (Math.random() < dt * 6) addParts(e.x, e.y, "#7dff5e", 1);
    }
    if (e.type.startsWith("boss") && !e.enraged && e.hp < e.mhp * 0.5) {
      e.enraged = true;
      e.spd *= 1.35;
      shake = Math.min(14, shake + 8);
      texts.push({
        x: e.x,
        y: e.y - e.r - 18,
        txt: "O CHEFE ENFURECEU!",
        c: "#ff2e88",
        life: 1.5,
        s: 18,
      });
    }
    const tgt = nearestPlayer(e.x, e.y);
    const Hh = tgt ? headPx(tgt) : null;
    /* ---- movimento por tipo */
    let chase = true;
    if (e.type === "charger") {
      e.t -= dt;
      chase = false;
      if (e.st === "rest") {
        chase = true;
        if (e.t <= 0) {
          e.st = "wind";
          e.t = 0.55;
        }
      } else if (e.st === "wind") {
        if (e.t <= 0 && Hh) {
          e.st = "dash";
          e.t = 0.75;
          const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
          e.dx = (Hh.x - e.x) / d;
          e.dy = (Hh.y - e.y) / d;
        }
      } else if (e.st === "dash") {
        e.x += e.dx * 430 * dt;
        e.y += e.dy * 430 * dt;
        e.x = clamp(e.x, -30, W + 30);
        e.y = clamp(e.y, -30, H + 30);
        if (e.t <= 0) {
          e.st = "rest";
          e.t = 1.5;
        }
      }
    } else if (e.type === "orbiter") {
      chase = false;
      if (Hh) {
        e.rad = Math.max(46, e.rad - 9 * dt);
        e.ang += (140 / Math.max(30, e.rad)) * dt * e.spin;
        e.x = Hh.x + Math.cos(e.ang) * e.rad;
        e.y = Hh.y + Math.sin(e.ang) * e.rad;
      }
    } else if (e.type === "boss3") {
      e.t -= dt;
      chase = e.st === "chase";
      if (e.st === "chase") {
        if (e.t <= 0) {
          e.st = "wind";
          e.t = 0.7;
        }
      } else if (e.st === "wind") {
        if (e.t <= 0 && Hh) {
          e.st = "dash";
          e.t = 0.8;
          const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
          e.dx = (Hh.x - e.x) / d;
          e.dy = (Hh.y - e.y) / d;
        }
      } else if (e.st === "dash") {
        e.x += e.dx * (e.enraged ? 540 : 450) * dt;
        e.y += e.dy * (e.enraged ? 540 : 450) * dt;
        e.x = clamp(e.x, -40, W + 40);
        e.y = clamp(e.y, -40, H + 40);
        if (e.t <= 0) {
          e.st = "chase";
          e.t = e.enraged ? 1.4 : 2.2;
          const off = rnd(0, TAU);
          for (let i = 0; i < 6; i++) {
            const a = off + (i / 6) * TAU;
            ebullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 170,
              vy: Math.sin(a) * 170,
              life: 3,
              r: 6,
            });
          }
        }
      }
    } else if (e.type === "boss4") {
      if (e.tp === undefined) e.tp = 2.5;
      e.tp -= dt;
      chase = e.tp > 0.4;
      if (e.tp <= 0 && Hh) {
        e.tp = e.enraged ? 2.6 : 3.6;
        addParts(e.x, e.y, "#7c6bff", 18, 3);
        const a = rnd(0, TAU),
          rr = rnd(140, 240);
        e.x = clamp(Hh.x + Math.cos(a) * rr, 30, W - 30);
        e.y = clamp(Hh.y + Math.sin(a) * rr, 30, H - 30);
        addParts(e.x, e.y, "#b04dff", 18, 3);
        const off = rnd(0, TAU);
        for (let i = 0; i < 12; i++) {
          const aa = off + (i / 12) * TAU;
          ebullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(aa) * 160,
            vy: Math.sin(aa) * 160,
            life: 4,
            r: 6,
          });
        }
      }
    }
    if (chase && tgt && Hh) {
      const d = dist(e.x, e.y, Hh.x, Hh.y) || 1;
      const sp = e.type === "charger" ? e.spd * 0.6 : e.spd;
      e.x += ((Hh.x - e.x) / d) * sp * dt;
      e.y += ((Hh.y - e.y) / d) * sp * dt;
    }
    /* ---- ataques por tipo */
    if ((e.type === "shooter" || e.type === "boss") && tgt && Hh) {
      if (dist(e.x, e.y, Hh.x, Hh.y) < 420) {
        e.shT -= dt;
        if (e.shT <= 0) {
          const rage = waveMod && waveMod.id === "rage";
          if (e.type === "boss") {
            e.shT = e.enraged ? 1.5 : 2.2;
            const off = rnd(0, TAU);
            for (let i = 0; i < 8; i++) {
              const a = off + (i / 8) * TAU;
              ebullets.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * 150,
                vy: Math.sin(a) * 150,
                life: 4,
                r: 7,
              });
            }
          } else {
            e.shT = rage ? 1.6 : 2.8;
            const a = Math.atan2(Hh.y - e.y, Hh.x - e.x);
            ebullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 170,
              vy: Math.sin(a) * 170,
              life: 3.5,
              r: 6,
            });
          }
        }
      }
    }
    if (e.type === "boss2") {
      e.shT -= dt;
      if (e.shT <= 0) {
        e.shT = e.enraged ? 1.6 : 2.4;
        const off = rnd(0, TAU);
        for (let i = 0; i < 10; i++) {
          const a = off + (i / 10) * TAU;
          ebullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 150,
            vy: Math.sin(a) * 150,
            life: 5,
            r: 7,
          });
        }
      }
      if (e.sum === undefined) e.sum = 6;
      e.sum -= dt;
      if (e.sum <= 0 && enemies.length < 40) {
        e.sum = e.enraged ? 4 : 7;
        for (let k = 0; k < 2; k++)
          enemies.push(newMinion(e.x + rnd(-24, 24), e.y + rnd(-24, 24)));
      }
    }
    if (e.type === "healer") {
      e.shT -= dt;
      if (e.shT <= 0) {
        e.shT = 3;
        let pulsed = false;
        for (const o of enemies) {
          if (o !== e && dist(e.x, e.y, o.x, o.y) < 130 && o.hp < o.mhp) {
            o.hp = Math.min(o.mhp, o.hp + 2);
            pulsed = true;
          }
        }
        if (pulsed) {
          addParts(e.x, e.y, "#7dff5e", 12, 2);
          texts.push({
            x: e.x,
            y: e.y - e.r - 10,
            txt: "✚",
            c: "#7dff5e",
            life: 0.6,
            s: 16,
          });
        }
      }
    }
    if (e.type === "sniper" || e.type === "sniper_elite") {
      e.shT -= dt;
      const isElite = e.type === "sniper_elite";
      const shootTime = isElite ? 0.7 : 1.1;  // Tiro MUITO mais rápido
      const bulletSpeed = isElite ? 1400 : 1100;  // Projétil muito mais rápido
      if (e.shT <= 0 && Hh) {
        e.shT = shootTime;
        // Predição EXTREMA para atirar bem à frente do jogador
        const leadFactor = isElite ? 0.85 : 0.65;  // Predição muito maior
        const distToPlayer = dist(e.x, e.y, Hh.x, Hh.y);
        const timeToHit = distToPlayer / bulletSpeed;
        const velX = Hh.vx || 0;
        const velY = Hh.vy || 0;
        const predX = Hh.x + velX * timeToHit * leadFactor * 2.5;
        const predY = Hh.y + velY * timeToHit * leadFactor * 2.5;
        const a = Math.atan2(predY - e.y, predX - e.x);
        ebullets.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * bulletSpeed,
          vy: Math.sin(a) * bulletSpeed,
          life: 4,
          r: isElite ? 6 : 5,
          c: isElite ? "#ff2e52" : "#ff4d6d",
          trail: true,  // Rastro visual
        });
        addParts(e.x, e.y, "#ffaa00", 8);
        // Efeito de mira (linha vermelha)
        effects.push({
          type: "laser",
          x: e.x,
          y: e.y,
          tx: e.x + Math.cos(a) * 180,
          ty: e.y + Math.sin(a) * 180,
          life: 0.15,
          c: isElite ? "#ff2e52" : "#ff4d6d",
        });
      }
    }
    /* ---- contato */
    for (const p of players) {
      if (p.dead) continue;
      const Ph = headPx(p);
      if (dist(e.x, e.y, Ph.x, Ph.y) < e.r + 14) {
        damagePlayer(p, 1);
        if (p.thorns > 0 && !p.dead) {
          e.hp -= p.thorns;
          e.flash = 0.12;
          e.lastHitBy = p;
          addParts(e.x, e.y, "#7dff5e", 4);
        }
      }
    }
  }
  for (let i = 0; i < enemies.length; i++)
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i],
        b = enemies[j],
        d = dist(a.x, a.y, b.x, b.y),
        m = a.r + b.r - 4;
      if (d < m && d > 0) {
        const f = (m - d) * 0.5,
          nx = (a.x - b.x) / d,
          ny = (a.y - b.y) / d;
        a.x += nx * f * 0.5;
        a.y += ny * f * 0.5;
        b.x -= nx * f * 0.5;
        b.y -= ny * f * 0.5;
      }
    }
  cleanupEnemies();
}
function updateEBullets(dt) {
  for (let i = ebullets.length - 1; i >= 0; i--) {
    const b = ebullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead =
      b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30;
    if (!dead)
      for (const p of players) {
        if (p.dead) continue;
        const h = headPx(p);
        if (dist(b.x, b.y, h.x, h.y) < (b.r || 6) + 11) {
          damagePlayer(p, 1);
          dead = true;
          break;
        }
      }
    if (dead) ebullets.splice(i, 1);
  }
}
function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.t -= dt;
    if (b.t <= 0) {
      bombs.splice(i, 1);
      explode(b.x, b.y, b.r, b.dmg, b.owner);
    }
  }
}
function updateFoods(dt) {
  foodT -= dt;
  if (foods.length < 5 && foodT <= 0) {
    foodT = 0.4;
    spawnFood(false);
  }
  for (const f of foods) {
    for (const p of players) {
      if (p.dead || !p.magnet) continue;
      const Hh = headPx(p),
        fx = (f.x + 0.5) * CELL,
        fy = (f.y + 0.5) * CELL;
      if (dist(fx, fy, Hh.x, Hh.y) < 170) {
        f.mt -= dt;
        if (f.mt <= 0) {
          f.mt = 0.12;
          const tx = Math.floor(Hh.x / CELL),
            ty = Math.floor(Hh.y / CELL);
          const nx2 = f.x + Math.sign(tx - f.x),
            ny2 = f.y + Math.sign(ty - f.y);
          if (!blockAt(nx2, ny2)) {
            f.x = nx2;
            f.y = ny2;
          }
        }
      }
    }
  }
}
function updateFx(dt) {
  shake = Math.max(0, shake - dt * 26);
  flash = Math.max(0, flash - dt * 2);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 140 * dt;
    p.life -= dt;
    if (p.life <= 0) parts.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.y -= 34 * dt;
    t.life -= dt;
    if (t.life <= 0) texts.splice(i, 1);
  }
  if (parts.length > 250) parts.splice(0, parts.length - 250);
  if (texts.length > 60) texts.splice(0, texts.length - 60);
  for (const em of embers) {
    em.x += em.vx * dt;
    em.y += em.vy * dt;
    if (em.y > H + 4) {
      em.y = -4;
      em.x = rnd(0, W);
    }
    if (em.x < -4) em.x = W + 4;
    if (em.x > W + 4) em.x = -4;
  }
}
function addParts(x, y, c, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU),
      s = rnd(40, 150) * (sp || 1) * 0.5;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: rnd(0.3, 0.7),
      c,
      r: rnd(2, 4),
    });
  }
}
function damagePlayer(p, n) {
  if (p.dead) return;
  if (p.shieldT > 0) return;
  if (p.shield > 0) {
    p.shield--;
    sfx("hurt");
    const Hh = headPx(p);
    texts.push({
      x: Hh.x,
      y: Hh.y - 18,
      txt: "bloqueou!",
      c: "#ffd75e",
      life: 0.8,
      s: 13,
    });
    addParts(Hh.x, Hh.y, "#ffd75e", 8);
    return;
  }
  if (p.iframes > 0) return;
  p.hp -= n;
  p.iframes = 1.3 + p.iframeBonus;
  shake = Math.min(12, shake + 7);
  flash = 0.3;
  sfx("hurt");
  const Hh = headPx(p);
  addParts(Hh.x, Hh.y, "#ff4d6d", 12);
  if (p.hp <= 0) {
    if (p.revLeft > 0) {
      p.revLeft = 0;
      p.hp = 2;
      p.iframes = 2.5;
      texts.push({
        x: Hh.x,
        y: Hh.y - 20,
        txt: "SEGUNDA CHANCE!",
        c: "#ffd75e",
        life: 1.2,
        s: 16,
      });
      addParts(Hh.x, Hh.y, "#ffd75e", 24, 3);
      sfx("gold");
      return;
    }
    p.hp = 0;
    p.dead = true;
    addParts(Hh.x, Hh.y, p.color, 30, 3);
    toast(
      "☠️ " +
        p.name +
        " caiu!" +
        (players.length > 1 ? " (renasce na próxima onda)" : ""),
    );
    if (players.every((q) => q.dead)) gameOver();
  }
}

/* ================= HABILIDADES ESPECIAIS COM REWORK ================= */
function tryAbility(p) {
  if (!p || p.dead || p.abT > 0) return;
  useAbility(p);
}
function useAbility(p) {
  const Hh = headPx(p);
  p.abT = p.abCd;
  sfx("ab");
  switch (p.cls) {
    case 0: { // Guerreiro - Giro Mortal EXPANDIDO
      // Efeito visual MASSIVO de explosão
      addParts(Hh.x, Hh.y, "#ff5252", 35, 4);
      addParts(Hh.x, Hh.y, "#ff9838", 28, 3);
      shake = Math.min(16, shake + 8);
      flash = 0.15;
      // Onda de choque visual
      effects.push({
        type: "shockwave",
        x: Hh.x,
        y: Hh.y,
        r: 0,
        maxR: 180,
        life: 0.5,
        c: "#ff5252",
        w: 8
      });
      for (const e of enemies) {
        const d = dist(Hh.x, Hh.y, e.x, e.y);
        if (d < 160 + e.r) {
          const dmg = 4 + p.boom * 0.3; // Dano escala com boom
          e.hp -= dmg;
          e.flash = 0.2;
          e.lastHitBy = p;
          const push = d > 0 ? (160 - d) / d : 1;
          e.x += ((e.x - Hh.x) / d) * push * 50;
          e.y += ((e.y - Hh.y) / d) * push * 50;
          // Sangue/partículas do inimigo
          addParts(e.x, e.y, EDEF[e.type]?.c || "#ff5d7f", 8);
        }
      }
      cleanupEnemies();
      break;
    }
    case 1: { // Mago - Nova Arcana com EFEITOS
      // Anel mágico visual
      effects.push({
        type: "ring",
        x: Hh.x,
        y: Hh.y,
        r: 10,
        maxR: 200,
        life: 0.4,
        c: "#7c6bff",
        w: 4
      });
      for (let i = 0; i < 12; i++) { // +2 projéteis
        const a = (i / 12) * TAU,
          crit = Math.random() < p.crit;
        pbullets.push({
          x: Hh.x,
          y: Hh.y,
          vx: Math.cos(a) * 450,
          vy: Math.sin(a) * 450,
          dmg: (p.dmg + p.dmgFlat) * 1.3 * (crit ? 2 : 1),
          pierce: p.pierce + 1, // +1 perfuração
          venom: p.venom,
          ls: p.ls,
          owner: p,
          color: p.color,
          crit,
          life: 1.4,
          hits: [],
          trail: true, // Rastro mágico
        });
      }
      // Partículas extras
      addParts(Hh.x, Hh.y, "#7c6bff", 30, 3);
      addParts(Hh.x, Hh.y, "#b04dff", 22, 2);
      break;
    }
    case 2: { // Assassino - Passo Sombrio com RASTRO
      const h = p.cells[0];
      let nx = h[0], ny = h[1];
      // Deixa rastro de sombras
      for (let i = 0; i < 5; i++) {
        nx = (nx + p.dir.x + COLS) % COLS;
        ny = (ny + p.dir.y + ROWS) % ROWS;
        p.cells.unshift([nx, ny]);
        p.cells.pop();
        // Efeito de sombra no chão
        effects.push({
          type: "shadow",
          x: (nx + 0.5) * CELL,
          y: (ny + 0.5) * CELL,
          life: 0.6,
          c: "rgba(77,255,166,0.4)",
          r: CELL * 0.6
        });
      }
      p.iframes = Math.max(p.iframes, 0.8); // +0.2s invulnerabilidade
      const Nh = headPx(p);
      addParts(Nh.x, Nh.y, "#4dffa6", 24, 3);
      addParts(Nh.x, Nh.y, "#7dff5e", 18, 2);
      // Flash visual
      flash = 0.1;
      for (const e of enemies) {
        if (dist(Nh.x, Nh.y, e.x, e.y) < 100 + e.r) {
          e.hp -= 3 + p.venom * 0.2; // Dano com veneno
          e.flash = 0.2;
          e.lastHitBy = p;
          e.dot = Math.max(e.dot, p.venom * 0.5);
          e.dotT = 2;
        }
      }
      cleanupEnemies();
      break;
    }
    case 3: { // Necromante - Colheita Sombria com DRENAGEM VISUAL
      let hits = 0;
      // Vórtice de alma
      effects.push({
        type: "vortex",
        x: Hh.x,
        y: Hh.y,
        r: 0,
        maxR: 180,
        life: 0.6,
        c: "#b04dff",
        w: 3
      });
      addParts(Hh.x, Hh.y, "#b04dff", 28, 3);
      addParts(Hh.x, Hh.y, "#7c6bff", 22, 2);
      for (const e of enemies) {
        const d = dist(Hh.x, Hh.y, e.x, e.y);
        if (d < 180 + e.r) {
          e.hp -= 3 + p.venom * 0.3;
          e.flash = 0.2;
          e.lastHitBy = p;
          hits++;
          // Linha de drenagem
          effects.push({
            type: "drain",
            x: e.x,
            y: e.y,
            tx: Hh.x,
            ty: Hh.y,
            life: 0.4,
            c: "#b04dff"
          });
        }
      }
      if (hits >= 2) {
        heal(p, 1);
        // Cura visual
        texts.push({
          x: Hh.x,
          y: Hh.y - 30,
          txt: "❤️ DRENADO!",
          c: "#7dff5e",
          life: 0.8,
          s: 14
        });
      }
      cleanupEnemies();
      break;
    }
    case 4: { // Paladino - Égide Divina com AURA
      p.shieldT = 3.5; // +0.5s
      // Aura dourada expansiva
      effects.push({
        type: "aura",
        x: Hh.x,
        y: Hh.y,
        r: 20,
        maxR: 120,
        life: 0.5,
        c: "#ffd75e",
        w: 6
      });
      effects.push({
        type: "shield",
        x: Hh.x,
        y: Hh.y,
        r: 40,
        life: 3,
        c: "rgba(255,215,94,0.3)"
      });
      addParts(Hh.x, Hh.y, "#ffd75e", 32, 3);
      addParts(Hh.x, Hh.y, "#ff9838", 24, 2);
      // Empurra inimigos próximos
      for (const e of enemies) {
        const d = dist(Hh.x, Hh.y, e.x, e.y);
        if (d < 100 + e.r) {
          e.hp -= 2;
          e.flash = 0.15;
          e.lastHitBy = p;
          const push = d > 0 ? 1 / d : 1;
          e.x += (e.x - Hh.x) * push * 40;
          e.y += (e.y - Hh.y) * push * 40;
        }
      }
      break;
    }
    case 5: { // Bombardeiro - Bomba Ambulante GIGANTE
      const boomDmg = 5 + p.boom * 0.5; // Dano escala com boom
      const boomRadius = 110 + p.boomR * 0.3;
      bombs.push({ 
        x: Hh.x, 
        y: Hh.y, 
        t: 1.2, // -0.2s mais rápido
        r: boomRadius, 
        dmg: boomDmg, 
        owner: p,
        mega: true // Bandeira para efeito especial
      });
      // Alerta visual da bomba
      effects.push({
        type: "bombWarning",
        x: Hh.x,
        y: Hh.y,
        r: boomRadius,
        life: 1.2,
        c: "rgba(255,82,82,0.4)"
      });
      addParts(Hh.x, Hh.y, "#ff5252", 20, 2);
      break;
    }
  }
}

/* ================= ONDAS / ESCOLHAS ================= */
function waveClear() {
  phase = "choice";
  const gain = 3 + wave;
  runSouls += gain;
  fragsRun += wave % 5 === 0 ? 3 : 1;
  sfx("gold");
  banner("ONDA " + wave + " LIMPA! ✨", "+" + gain + " almas");
  const relic = wave % 5 === 0;
  setTimeout(() => beginChoice(relic), 800);
}
function beginChoice(relic) {
  const pool = relic ? RELICS : UPGRADES;
  const opts = sample([...pool.keys()], 3);
  const alive = players.map((p, i) => (p.dead ? -1 : i)).filter((i) => i >= 0);
  pickState = { opts, relic, alive, picked: new Set(), localQ: [] };
  if (mode === "local") pickState.localQ = alive.slice();
  else pickState.localQ = alive.filter((i) => i === 0);
  if (role === "host" && net) net.send({ t: "up", opts, relic, alive });
  nextLocalPick();
}
function nextLocalPick() {
  if (!pickState) return;
  if (pickState.localQ.length === 0) {
    showWait();
    return;
  }
  showPickerUI(pickState.localQ.shift());
}
function showPickerUI(pi) {
  const pool = pickState.relic ? RELICS : UPGRADES;
  $("#upTitle").textContent = pickState.relic
    ? "👑 RELÍQUIA DO CHEFE"
    : mode === "local"
      ? "JOGADOR " + (pi + 1) + " — ESCOLHA UM PODER"
      : "ESCOLHA UM PODER";
  const g = $("#upCards");
  g.innerHTML = "";
  $("#upWait").classList.add("hidden");
  pickState.opts.forEach((k) => {
    const o = pool[k],
      c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<div class="ic">${o.ic}</div><h3>${o.n}</h3><p>${o.d}</p>`;
    c.onclick = () => {
      applyPick(pi, k);
      pickState.picked.add(pi);
      sfx("gold");
      maybeFinish();
    };
    g.appendChild(c);
  });
  $("#upOv").classList.remove("hidden");
}
function showWait() {
  $("#upCards").innerHTML = "";
  $("#upWait").classList.remove("hidden");
  $("#upTitle").textContent = "⏳ AGUARDANDO O OUTRO JOGADOR...";
}
function applyPick(pi, k) {
  const pool = pickState.relic ? RELICS : UPGRADES;
  pool[k].f(players[pi]);
  players[pi].powerLog.push(pool[k].n);
  const p = players[pi],
    Hh = p.dead ? { x: W / 2, y: H / 2 } : headPx(p);
  texts.push({
    x: Hh.x,
    y: Hh.y - 22,
    txt: pool[k].n,
    c: "#ffd75e",
    life: 1.4,
    s: 14,
  });
}
function netPick(pi, k) {
  if (!pickState || !pickState.alive.includes(pi) || pickState.picked.has(pi))
    return;
  applyPick(pi, k);
  pickState.picked.add(pi);
  maybeFinish();
}
function maybeFinish() {
  if (!pickState) return;
  if (!pickState.alive.every((i) => pickState.picked.has(i))) {
    if (pickState.localQ.length) nextLocalPick();
    else showWait();
    return;
  }
  pickState = null;
  hideOvs();
  if (role === "host" && net) net.send({ t: "go" });
  startWave(wave + 1);
}
function togglePause() {
  if (role === "guest") return;
  paused = !paused;
  $("#pauseOv").classList.toggle("hidden", !paused);
}
function togglePowers() {
  const ov = $("#powersOv");
  const pauseOv = $("#pauseOv");
  // Se estiver pausado, fecha o pause primeiro para mostrar os powers na frente
  if (paused && !pauseOv.classList.contains("hidden")) {
    paused = false;
    pauseOv.classList.add("hidden");
  }
  if (!ov.classList.contains("hidden")) {
    ov.classList.add("hidden");
    return;
  }
  const src = role === "guest" && rs ? rs.players : players;
  $("#powersList").innerHTML = (src || [])
    .map((p) => {
      const list = p.powerLog || [];
      const cname = (CLASSES[p.cls] || {}).name || "?";
      const cic = (CLASSES[p.cls] || {}).ic || "🐍";
      // Mostra também os poderes da skill tree
      const treeCount = (save.tree || []).filter(k => {
        const parts = k.split("-");
        const bi = parseInt(parts[0]);
        return TREE_BASES[bi] && 
          ((parts.length === 1) || treeNode(bi, parts.slice(1).map(Number)));
      }).length;
      const treeInfo = treeCount > 0 ? `<br><small style="color:#8fe6b8">🌳 Skill Tree: ${treeCount} poder(es)</small>` : "";
      return `<div style="margin:10px 0"><b style="color:${p.color}">${cic} ${cname} (J${(p.idx || 0) + 1})</b><br>${list.length ? list.map((n) => `<span class="pchip">${n}</span>`).join("") : '<span style="color:#8f7fc0">nenhum poder ainda</span>'}${treeInfo}</div>`;
    })
    .join("");
  ov.classList.remove("hidden");
}

/* ================= GAME OVER ================= */
function gameOver() {
  phase = "over";
  runActive = false;
  const mult =
    (1 + 0.15 * save.upg.srt) * Math.max(1, ...players.map((p) => p.soulMult));
  const earned = Math.round((runSouls + kills) * mult);
  save.souls += earned;
  save.frags += fragsRun;
  if (score > save.best) save.best = score;
  if (wave > save.bestWave) save.bestWave = wave;
  persist();
  if (role === "host" && net)
    net.send({
      t: "over",
      score,
      wave,
      kills,
      earned,
      comboMax,
      frags: fragsRun,
    });
  else if (role !== "guest") submitScore();
  stopNet();
  showOver(earned, comboMax, fragsRun);
}
function showOver(earned, cm, fr) {
  $("#overStats").innerHTML =
    `<div>🎯 Pontos: <b>${score}</b></div><div>🌊 Onda alcançada: <b>${wave}</b></div><div>💀 Abates: <b>${kills}</b></div><div>🔥 Combo máx: <b>x${cm || 0}</b></div><div>💜 Almas ganhas: <b>+${earned}</b></div><div>💠 Fragmentos: <b>+${fr || 0}</b></div><div style="margin-top:6px;color:#8f7fc0">Total de almas: ${save.souls} · Recorde: ${save.best}${mode === "online" ? " · Conexão: " + (transportLabel || "?") : ""}</div>`;
  showScreen("over");
  sfx("hurt");
}

/* ================= ARTE VETORIAL ================= */
function vHeart(x, y, s, c1, c2) {
  const g = ctx.createRadialGradient(x, y - s * 0.3, s * 0.1, x, y, s * 1.2);
  g.addColorStop(0, c1 || "#ff8ba0");
  g.addColorStop(1, c2 || "#c22040");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.85);
  ctx.bezierCurveTo(
    x - s * 1.3,
    y,
    x - s * 0.55,
    y - s * 1.05,
    x,
    y - s * 0.35,
  );
  ctx.bezierCurveTo(
    x + s * 0.55,
    y - s * 1.05,
    x + s * 1.3,
    y,
    x,
    y + s * 0.85,
  );
  ctx.fill();
}
function vSoul(x, y, s) {
  const g = ctx.createRadialGradient(x, y, s * 0.1, x, y, s);
  g.addColorStop(0, "#e0b3ff");
  g.addColorStop(1, "#7c3dff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.15, s * 0.65, Math.PI, 0);
  ctx.quadraticCurveTo(x + s * 0.65, y + s * 0.5, x + s * 0.3, y + s * 0.7);
  ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.45, x, y + s * 0.75);
  ctx.quadraticCurveTo(x - s * 0.2, y + s * 0.45, x - s * 0.4, y + s * 0.7);
  ctx.quadraticCurveTo(x - s * 0.65, y + s * 0.4, x - s * 0.65, y - s * 0.15);
  ctx.fill();
  ctx.fillStyle = "#2a1050";
  ctx.beginPath();
  ctx.arc(x - s * 0.22, y - s * 0.2, s * 0.09, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.22, y - s * 0.2, s * 0.09, 0, TAU);
  ctx.fill();
}
function vSkull(x, y, s, c) {
  ctx.fillStyle = c || "#fff";
  ctx.beginPath();
  ctx.arc(x, y - s * 0.15, s * 0.55, Math.PI, 0);
  ctx.lineTo(x + s * 0.55, y + s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.4, y + s * 0.55, x, y + s * 0.5);
  ctx.quadraticCurveTo(x - s * 0.4, y + s * 0.55, x - s * 0.55, y + s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1030";
  ctx.beginPath();
  ctx.arc(x - s * 0.22, y - s * 0.15, s * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.22, y - s * 0.15, s * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.05);
  ctx.lineTo(x + s * 0.08, y + s * 0.22);
  ctx.lineTo(x - s * 0.08, y + s * 0.22);
  ctx.closePath();
  ctx.fill();
}
function vShieldIc(x, y, s) {
  ctx.fillStyle = "#ffd75e";
  ctx.strokeStyle = "#8a6a1a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s, y - s * 0.7, x + s, y);
  ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.8, x, y + s * 1.15);
  ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.8, x - s, y);
  ctx.quadraticCurveTo(x - s, y - s * 0.7, x, y - s);
  ctx.fill();
  ctx.stroke();
}
function vStar(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * TAU - Math.PI / 2,
      rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr,
      py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawApple(x, y) {
  const g = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, 10);
  g.addColorStop(0, "#ff9d9d");
  g.addColorStop(0.6, "#e63950");
  g.addColorStop(1, "#8f1030");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 8.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5c0f22";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "#6b4423";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 7);
  ctx.quadraticCurveTo(x + 1, y - 11, x + 3, y - 12.5);
  ctx.stroke();
  ctx.fillStyle = "#4ddb6a";
  ctx.beginPath();
  ctx.ellipse(x + 5.5, y - 11, 4, 2, -0.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.beginPath();
  ctx.arc(x - 3, y - 3.5, 1.8, 0, TAU);
  ctx.fill();
}
function artGrunter(r) {
  const g = ctx.createRadialGradient(0, -r * 0.35, r * 0.15, 0, 0, r * 1.1);
  g.addColorStop(0, "#ff9db1");
  g.addColorStop(1, "#b31f45");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5c0f24";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = "#ffd75e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.75);
  ctx.lineTo(-r * 0.55, -r * 1.25);
  ctx.moveTo(r * 0.35, -r * 0.75);
  ctx.lineTo(r * 0.55, -r * 1.25);
  ctx.stroke();
  ctx.fillStyle = "#ffd75e";
  ctx.beginPath();
  ctx.arc(-r * 0.55, -r * 1.3, 2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 1.3, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.1, r * 0.26, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.1, r * 0.26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#20060f";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.05, r * 0.12, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.05, r * 0.12, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3d0a1c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.35);
  ctx.lineTo(-r * 0.27, r * 0.58);
  ctx.lineTo(0, r * 0.35);
  ctx.lineTo(r * 0.27, r * 0.58);
  ctx.lineTo(r * 0.55, r * 0.35);
  ctx.stroke();
}
function artRunner(r) {
  const f = Math.sin(gameT * 16) * 0.7;
  ctx.fillStyle = "#c9932e";
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.1);
  ctx.quadraticCurveTo(-r * 1.5, -r * (1.3 + f), -r * 2, r * (0.15 + f * 0.3));
  ctx.quadraticCurveTo(-r * 1.2, r * 0.1, -r * 0.3, r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.1);
  ctx.quadraticCurveTo(r * 1.5, -r * (1.3 + f), r * 2, r * (0.15 + f * 0.3));
  ctx.quadraticCurveTo(r * 1.2, r * 0.1, r * 0.3, r * 0.45);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(0, -r * 0.2, 1, 0, 0, r * 0.8);
  g.addColorStop(0, "#ffe9a8");
  g.addColorStop(1, "#d9a13a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#c9932e";
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.4);
  ctx.lineTo(-r * 0.6, -r * 1.05);
  ctx.lineTo(-r * 0.1, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.45, -r * 0.4);
  ctx.lineTo(r * 0.6, -r * 1.05);
  ctx.lineTo(r * 0.1, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff2e2e";
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.05, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.05, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, r * 0.28);
  ctx.lineTo(-r * 0.06, r * 0.55);
  ctx.lineTo(0, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.14, r * 0.28);
  ctx.lineTo(r * 0.06, r * 0.55);
  ctx.lineTo(0, r * 0.28);
  ctx.closePath();
  ctx.fill();
}
function artShooter(r, e) {
  const charge =
    e && e.shT !== undefined && e.shT < 0.7 ? clamp(1 - e.shT / 0.7, 0, 1) : 0;
  ctx.fillStyle = "#eef8ff";
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(0, -r * 1.15, r, 0);
  ctx.quadraticCurveTo(0, r * 1.15, -r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = charge > 0.2 ? "#ff4d6d" : "#4dc3ff";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,90,110,.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.15);
  ctx.lineTo(-r * 0.5, -r * 0.05);
  ctx.moveTo(-r * 0.8, r * 0.2);
  ctx.lineTo(-r * 0.45, r * 0.1);
  ctx.moveTo(r * 0.85, -r * 0.15);
  ctx.lineTo(r * 0.5, -r * 0.05);
  ctx.stroke();
  const ir = r * 0.42 * (1 + charge * 0.35);
  const gi = ctx.createRadialGradient(0, 0, 1, 0, 0, ir);
  gi.addColorStop(0, "#06121e");
  gi.addColorStop(0.45, charge > 0.25 ? "#ff2e55" : "#2ea8ff");
  gi.addColorStop(1, "#a8dcff");
  ctx.fillStyle = gi;
  ctx.beginPath();
  ctx.arc(0, 0, ir, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#04080e";
  ctx.beginPath();
  ctx.arc(0, 0, ir * 0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.beginPath();
  ctx.arc(-ir * 0.25, -ir * 0.3, ir * 0.14, 0, TAU);
  ctx.fill();
  if (charge > 0) {
    ctx.strokeStyle = `rgba(255,60,90,${charge * 0.9})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
    ctx.stroke();
  }
}
function artTank(r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const px = Math.cos(a) * r,
      py = Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, "#d98e4a");
  g.addColorStop(1, "#4e2c10");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#241206";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,.3)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.6);
  ctx.lineTo(-r * 0.2, 0);
  ctx.lineTo(-r * 0.6, r * 0.5);
  ctx.moveTo(r * 0.55, -r * 0.5);
  ctx.lineTo(r * 0.25, r * 0.1);
  ctx.stroke();
  ctx.shadowColor = "#ffd75e";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffd75e";
  ctx.fillRect(-r * 0.45, -r * 0.25, r * 0.3, r * 0.16);
  ctx.fillRect(r * 0.15, -r * 0.25, r * 0.3, r * 0.16);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ff9838";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, r * 0.4);
  ctx.lineTo(-r * 0.15, r * 0.55);
  ctx.lineTo(r * 0.1, r * 0.38);
  ctx.lineTo(r * 0.4, r * 0.55);
  ctx.stroke();
}
function artBoss(r, e) {
  const en = e && (e.enraged || e.hp < e.mhp * 0.5);
  ctx.save();
  ctx.rotate(gameT * (en ? 2.4 : 1));
  ctx.strokeStyle = en ? "rgba(255,60,80,.7)" : "rgba(255,46,136,.4)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, (i / 3) * TAU, (i / 3) * TAU + 1.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#ffd75e";
  ctx.strokeStyle = "#8a6a1a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.45);
  ctx.quadraticCurveTo(-r * 1.15, -r * 1.35, -r * 0.3, -r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.65, -r * 0.45);
  ctx.quadraticCurveTo(r * 1.15, -r * 1.35, r * 0.3, -r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r * 1.05);
  g.addColorStop(0, "#ff77b8");
  g.addColorStop(1, en ? "#7e0c26" : "#96164a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3d0716";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "#3d0716";
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.45);
  ctx.lineTo(-r * 0.15, -r * 0.2);
  ctx.moveTo(r * 0.6, -r * 0.45);
  ctx.lineTo(r * 0.15, -r * 0.2);
  ctx.stroke();
  ctx.shadowColor = en ? "#ff2e2e" : "#ffd75e";
  ctx.shadowBlur = 10;
  ctx.fillStyle = en ? "#ff5d5d" : "#ffd75e";
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.05, r * 0.16, r * 0.1, -0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.35, -r * 0.05, r * 0.16, r * 0.1, 0.3, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#2b0714";
  ctx.beginPath();
  ctx.arc(0, r * 0.3, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.3 - r * 0.08, r * 0.44);
    ctx.lineTo(i * r * 0.3, r * 0.44 + r * 0.2);
    ctx.lineTo(i * r * 0.3 + r * 0.08, r * 0.44);
    ctx.closePath();
    ctx.fill();
  }
}
function artSplitter(r) {
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#ffb3e2");
  g.addColorStop(1, "#c2338f");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5c0f44";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  for (let i = 0; i < 4; i++)
    ctx.lineTo(
      i % 2 ? r * 0.2 : -r * 0.2,
      -r * 0.85 + (i + 1) * ((r * 1.7) / 4),
    );
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.15, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.15, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#20060f";
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.12, r * 0.08, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.12, r * 0.08, 0, TAU);
  ctx.fill();
}
function artOrbiter(r) {
  ctx.strokeStyle = "#6ee7ff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, gameT * 3, gameT * 3 + TAU * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, gameT * 3 + Math.PI, gameT * 3 + Math.PI + TAU * 0.8);
  ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
  g.addColorStop(0, "#e6fbff");
  g.addColorStop(1, "#1e7fa8");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a2a3d";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffd75e";
  ctx.beginPath();
  ctx.arc(
    Math.cos(gameT * 5) * (r + 4),
    Math.sin(gameT * 5) * (r + 4),
    2.5,
    0,
    TAU,
  );
  ctx.fill();
}
function artSniper(r, e) {
  const isElite = e && e.type === "sniper_elite";
  const maxTime = isElite ? 1.8 : 2.8;
  const charge =
    e && e.shT !== undefined && e.shT < maxTime ? clamp(1 - e.shT / maxTime, 0, 1) : 0;
  ctx.fillStyle = "#14100a";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = charge > 0.3 ? (isElite ? "#ff2e52" : "#ff4d6d") : (isElite ? "#ff995e" : "#ffd75e");
  ctx.lineWidth = isElite ? 3.5 : 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 1.25, 0);
  ctx.lineTo(-r * 0.7, 0);
  ctx.moveTo(r * 0.7, 0);
  ctx.lineTo(r * 1.25, 0);
  ctx.moveTo(0, -r * 1.25);
  ctx.lineTo(0, -r * 0.7);
  ctx.moveTo(0, r * 0.7);
  ctx.lineTo(0, r * 1.25);
  ctx.stroke();
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.55);
  g.addColorStop(0, charge > 0.3 ? (isElite ? "#ff4d4d" : "#ff2e55") : (isElite ? "#ffcc5e" : "#ffd75e"));
  g.addColorStop(1, isElite ? "#4d1a06" : "#3d2c06");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, TAU);
  ctx.fill();
  if (charge > 0) {
    ctx.strokeStyle = `rgba(255,60,90,${charge})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
    ctx.stroke();
  }
}
function artHealer(r) {
  const pu = 1 + 0.1 * Math.sin(gameT * 6);
  ctx.strokeStyle = "rgba(125,255,94,.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, (r + 8) * pu, 0, TAU);
  ctx.stroke();
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.15, 0, 0, r);
  g.addColorStop(0, "#eafff0");
  g.addColorStop(1, "#2f9e4f");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#0d5c26";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(-r * 0.16, -r * 0.5, r * 0.32, r);
  ctx.fillRect(-r * 0.5, -r * 0.16, r, r * 0.32);
}
function artCharger(r, e) {
  const wind = e.st === "wind";
  ctx.save();
  ctx.rotate(Math.atan2(e.dy || 0, e.dx || 1));
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, "#7e3a10");
  g.addColorStop(1, "#ffb35e");
  ctx.fillStyle = wind ? "#ffe9a8" : g;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.7, -r * 0.75);
  ctx.lineTo(-r * 0.3, 0);
  ctx.lineTo(-r * 0.7, r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3d1a06";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.18, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, r * 0.18, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function artBoss2(r, e) {
  const en = e.enraged || e.hp < e.mhp * 0.5;
  ctx.fillStyle = "#ffd75e";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.85 + i * ((Math.PI * 0.7) / 4);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
    ctx.lineTo(Math.cos(a + 0.2) * r * 0.85, Math.sin(a + 0.2) * r * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, "#d98bff");
  g.addColorStop(1, en ? "#5c1a8a" : "#7c3dff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#2a1050";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#1a0826";
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.62, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (i / 5),
      tx = Math.cos(a) * r * 0.55,
      ty = r * 0.15 + Math.sin(a) * r * 0.55;
    ctx.beginPath();
    ctx.moveTo(tx - 4, ty);
    ctx.lineTo(tx, ty + 9);
    ctx.lineTo(tx + 4, ty);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = en ? "#ff5d5d" : "#ffd75e";
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.3, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, r * 0.14, 0, TAU);
  ctx.fill();
}
function artBoss3(r, e) {
  const en = e.enraged || e.hp < e.mhp * 0.5;
  const wind = e.st === "wind";
  ctx.save();
  if (e.st === "dash") ctx.rotate(Math.atan2(e.dy || 0, e.dx || 1));
  ctx.fillStyle = "#8f1f1f";
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.2);
  ctx.lineTo(-r * 1.4, -r * 0.6);
  ctx.lineTo(-r * 0.5, r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -r * 0.2);
  ctx.lineTo(r * 1.4, -r * 0.6);
  ctx.lineTo(r * 0.5, r * 0.3);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, "#ff7b6b");
  g.addColorStop(1, "#7e1a10");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.85, -r * 0.2);
  ctx.lineTo(r * 0.6, r * 0.8);
  ctx.lineTo(-r * 0.6, r * 0.8);
  ctx.lineTo(-r * 0.85, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3d0706";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffd75e";
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.7);
  ctx.lineTo(-r * 0.9, -r * 1.3);
  ctx.lineTo(-r * 0.25, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.7);
  ctx.lineTo(r * 0.9, -r * 1.3);
  ctx.lineTo(r * 0.25, -r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = wind ? "#fff" : en ? "#ff5d5d" : "#ffd75e";
  ctx.fillRect(-r * 0.4, -r * 0.25, r * 0.3, r * 0.14);
  ctx.fillRect(r * 0.1, -r * 0.25, r * 0.3, r * 0.14);
  ctx.restore();
}
function artBoss4(r, e) {
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(gameT * 3);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
  g.addColorStop(0, "#0a0618");
  g.addColorStop(0.7, "#2a1050");
  g.addColorStop(1, "#7c3dff");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#b04dff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, gameT * 2, gameT * 2 + 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.3, -gameT * 1.5, -gameT * 1.5 + 2.5);
  ctx.stroke();
  const ph = e.tp !== undefined && e.tp < 0.8;
  ctx.fillStyle = ph ? "#ff5d5d" : "#e0b3ff";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.35, r * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0a0618";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.1, 0, TAU);
  ctx.fill();
}
const ARTFN = {
  grunter: artGrunter,
  grunt_veteran: artGrunter,
  runner: artRunner,
  runner_veteran: artRunner,
  shooter: artShooter,
  shooter_veteran: artShooter,
  tank: artTank,
  boss: artBoss,
  splitter: artSplitter,
  mini: artSplitter,
  orbiter: artOrbiter,
  sniper: artSniper,
  sniper_elite: artSniper,
  healer: artHealer,
  charger: artCharger,
  boss2: artBoss2,
  boss3: artBoss3,
  boss4: artBoss4,
};
function drawEnemy(e) {
  const d = EDEF[e.type];
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = d.c;
  ctx.beginPath();
  ctx.arc(0, 0, e.r + 6, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (e.enraged || (String(e.type).startsWith("boss") && e.hp < e.mhp * 0.5)) {
    ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.3 * Math.sin(gameT * 10)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 9, 0, TAU);
    ctx.stroke();
  }
  if (e.elite) {
    ctx.strokeStyle = `rgba(255,215,94,${0.55 + 0.3 * Math.sin(gameT * 6)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 7, gameT * 3, gameT * 3 + 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, e.r + 7, gameT * 3 + Math.PI, gameT * 3 + Math.PI + 2.2);
    ctx.stroke();
  }
  const r = e.r;
  (ARTFN[e.type] || artGrunter)(r, e);
  if (e.flash > 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  const pct = clamp(e.hp / e.mhp, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 4.5);
  ctx.fillStyle = e.elite
    ? "#ffd75e"
    : pct > 0.5
      ? "#7dff5e"
      : pct > 0.25
        ? "#ffd75e"
        : "#ff4d6d";
  ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * pct, 4.5);
}
function drawBlock(b) {
  const x = b.x * CELL,
    y = b.y * CELL;
  const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
  g.addColorStop(0, "#3b1d70");
  g.addColorStop(0.5, "#5b2fb8");
  g.addColorStop(1, "#281248");
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  ctx.strokeStyle = "rgba(210,170,255,.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 2);
  ctx.lineTo(x + CELL / 2, y + CELL / 2);
  ctx.lineTo(x + CELL - 2, y + 2);
  ctx.moveTo(x + 2, y + CELL - 2);
  ctx.lineTo(x + CELL / 2, y + CELL / 2);
  ctx.lineTo(x + CELL - 2, y + CELL - 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(190,140,255,.5)";
  ctx.beginPath();
  ctx.moveTo(x + CELL / 2, y + 8);
  ctx.lineTo(x + CELL - 9, y + CELL / 2);
  ctx.lineTo(x + CELL / 2, y + CELL - 8);
  ctx.lineTo(x + 9, y + CELL / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b06bff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
  const dmg = 6 - (b.hp === undefined ? 6 : b.hp);
  if (dmg > 0) {
    ctx.strokeStyle = "rgba(10,4,20,.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < dmg; i++) {
      const sx = x + 7 + ((b.x * 31 + b.y * 17 + i * 13) % 18),
        sy = y + 7 + ((b.x * 13 + b.y * 29 + i * 7) % 18);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (i % 2 ? 6 : -6), sy + 7);
    }
    ctx.stroke();
  }
}
function drawFood(f) {
  const x = (f.x + 0.5) * CELL,
    y = (f.y + 0.5) * CELL;
  if (f.t === "g") {
    const pu = 1 + 0.12 * Math.sin(gameT * 5),
      rot = gameT * 0.8;
    ctx.shadowColor = "#ffd75e";
    ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(x, y - 2, 1, x, y, 11 * pu);
    g.addColorStop(0, "#fff3c4");
    g.addColorStop(0.6, "#ffd75e");
    g.addColorStop(1, "#e08a1e");
    ctx.fillStyle = g;
    vStar(x, y, 11 * pu, rot);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#8a5a10";
    ctx.lineWidth = 1;
    vStar(x, y, 11 * pu, rot);
    ctx.stroke();
  } else if (f.t === "p") {
    const g = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 10);
    g.addColorStop(0, "#9dffb8");
    g.addColorStop(1, "#1d8a3e");
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(x, y, 9.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#0d5c26";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    vSkull(x, y + 1, 11, "#eafff0");
  } else drawApple(x, y);
}
function drawDrop(f) {
  const bob = Math.sin(gameT * 4 + (f.born || 0) * 7) * 3;
  const x = f.x,
    y = f.y + bob;
  if (f.life !== undefined && f.life < 3 && Math.sin(gameT * 14) > 0)
    ctx.globalAlpha = 0.35;
  ctx.shadowColor = f.t === "heart" ? "#ff4d6d" : "#b04dff";
  ctx.shadowBlur = 10;
  if (f.t === "heart") vHeart(x, y, 9);
  else vSoul(x, y, 10);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
function drawBomb(b) {
  const blink = b.t < 0.5 && Math.sin(gameT * 30) > 0;
  const g = ctx.createRadialGradient(b.x - 3, b.y - 4, 2, b.x, b.y, 11);
  g.addColorStop(0, blink ? "#ffd75e" : "#3a3a4a");
  g.addColorStop(1, blink ? "#ff5d1f" : "#0a0a10");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 10, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#8a6a3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x + 4, b.y - 8);
  ctx.quadraticCurveTo(b.x + 10, b.y - 14, b.x + 7, b.y - 17);
  ctx.stroke();
  const sp = 1 + Math.sin(gameT * 25) * 0.4;
  ctx.fillStyle = "#ffd75e";
  ctx.shadowColor = "#ff9838";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(b.x + 7, b.y - 18, 2.5 * sp, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,152,56,.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(
    b.x,
    b.y,
    14,
    -Math.PI / 2,
    -Math.PI / 2 + TAU * clamp(b.t / 1.4, 0, 1),
  );
  ctx.stroke();
}
const BOSSNAMES = {
  boss: "CHEFE",
  boss2: "DEVORADOR",
  boss3: "CARRASCO",
  boss4: "O VAZIO",
};
function drawBossBar(v) {
  const b = v.enemies.find((e) => String(e.type).startsWith("boss"));
  if (!b) return;
  const w = 320,
    x = (W - w) / 2,
    y = 10;
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(x - 2, y - 2, w + 4, 14);
  const pct = clamp(b.hp / b.mhp, 0, 1);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#ff2e88");
  g.addColorStop(1, "#ff7b3d");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w * pct, 10);
  ctx.strokeStyle = "#ffd75e";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 2.5, y - 2.5, w + 5, 15);
  const en = b.enraged || b.hp < b.mhp * 0.5;
  ctx.font = "bold 12px Orbitron";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = en ? "#ff5d7f" : "#ffd75e";
  ctx.fillText(
    en
      ? (BOSSNAMES[b.type] || "CHEFE") + " ENFURECIDO"
      : BOSSNAMES[b.type] || "CHEFE",
    W / 2,
    y + 26,
  );
}
function LIVE() {
  return {
    players,
    enemies,
    pbullets,
    ebullets,
    foods,
    drops,
    blocks,
    bombs,
    wave,
    score,
    paused,
    mod: waveMod && waveMod.id !== "none" ? waveMod : null,
  };
}
function render(v) {
  ctx.drawImage(bg, 0, 0);
  for (const em of embers) {
    ctx.globalAlpha = em.a;
    ctx.fillStyle = em.c;
    ctx.beginPath();
    ctx.arc(em.x, em.y, em.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  if (shake > 0) ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
  for (const b of v.blocks) drawBlock(b);
  for (const f of v.foods) drawFood(f);
  for (const f of v.drops || []) drawDrop(f);
  for (const b of v.bombs) drawBomb(b);
  for (const b of v.ebullets) {
    const r = b.r || 6;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r + 3);
    g.addColorStop(0, "#f0d9ff");
    g.addColorStop(0.5, "#b04dff");
    g.addColorStop(1, "rgba(176,77,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 3, 0, TAU);
    ctx.fill();
  }
  for (const e of v.enemies) drawEnemy(e);
  /* linha de mira do franco-atirador */
  for (const e of v.enemies) {
    if ((e.type === "sniper" || e.type === "sniper_elite") && e.shT !== undefined && e.shT < 1.4) {
      let tgt2 = null,
        bd = 1e9;
      for (const p of v.players) {
        if (p.dead || !p.cells || !p.cells.length) continue;
        const hx = (p.cells[0][0] + 0.5) * CELL,
          hy = (p.cells[0][1] + 0.5) * CELL;
        const dd = dist(e.x, e.y, hx, hy);
        if (dd < bd) {
          bd = dd;
          tgt2 = p;
        }
      }
      if (tgt2) {
        const hx = (tgt2.cells[0][0] + 0.5) * CELL,
          hy = (tgt2.cells[0][1] + 0.5) * CELL;
        const isElite = e.type === "sniper_elite";
        ctx.strokeStyle = `rgba(255,${isElite ? 46 : 77},${isElite ? 82 : 109},${0.3 + 0.5 * (1 - e.shT / (isElite ? 1.8 : 2.8))})`;
        ctx.lineWidth = isElite ? 2.5 : 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  for (const b of v.pbullets) {
    const c = b.color || (b.crit ? "#ffd75e" : "#ffe9a8");
    if (b.vx) {
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowColor = c;
    ctx.shadowBlur = 8;
    ctx.fillStyle = b.crit ? "#ffd75e" : c;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.crit ? 5 : 3.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  for (const p of v.players) drawPlayer(p);
  drawBossBar(v);
  for (const pt of parts) {
    ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
    ctx.fillStyle = pt.c;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of texts) {
    ctx.globalAlpha = clamp(t.life * 2, 0, 1);
    ctx.font = "bold " + (t.s || 13) + "px Rajdhani";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.c;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  if (v.mod) {
    ctx.font = "bold 14px Rajdhani";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd75e";
    ctx.globalAlpha = 0.85;
    ctx.fillText(v.mod.n + " · " + v.mod.d, 12, H - 12);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Render TODOS os efeitos visuais
  for (let i = effects.length - 1; i >= 0; i--) {
    const ef = effects[i];
    ef.life -= dt;
    if (ef.life <= 0) {
      effects.splice(i, 1);
      continue;
    }
    const alpha = clamp(ef.life / (ef.maxLife || 1), 0, 1);
    
    if (ef.type === "laser") {
      ctx.globalAlpha = clamp(ef.life * 6, 0, 0.7);
      ctx.strokeStyle = ef.c;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(ef.x, ef.y);
      ctx.lineTo(ef.tx, ef.ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "shockwave") { // Onda de choque do Guerreiro
      const progress = 1 - ef.life / 0.5;
      const curR = ef.r + (ef.maxR - ef.r) * progress;
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = ef.c;
      ctx.lineWidth = ef.w * alpha;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, curR, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "ring") { // Anel mágico do Mago
      const progress = 1 - ef.life / 0.4;
      const curR = ef.r + (ef.maxR - ef.r) * progress;
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = ef.c;
      ctx.lineWidth = ef.w * alpha;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, curR, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "shadow") { // Sombra do Assassino
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = ef.c;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "vortex") { // Vórtice do Necromante
      const progress = 1 - ef.life / 0.6;
      const curR = ef.r + (ef.maxR - ef.r) * progress * 0.7;
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = ef.c;
      ctx.lineWidth = ef.w * alpha;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, curR, gameT * 3, gameT * 3 + TAU * 0.7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "drain") { // Linha de drenagem
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = ef.c;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.moveTo(ef.x, ef.y);
      ctx.quadraticCurveTo(
        (ef.x + ef.tx) / 2 + Math.sin(gameT * 10) * 10,
        (ef.y + ef.ty) / 2,
        ef.tx, ef.ty
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "aura") { // Aura do Paladino
      const progress = 1 - ef.life / 0.5;
      const curR = ef.r + (ef.maxR - ef.r) * progress;
      ctx.globalAlpha = alpha * 0.4;
      ctx.strokeStyle = ef.c;
      ctx.lineWidth = ef.w * alpha;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, curR, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "shield") { // Escudo visual
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = ef.c;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    else if (ef.type === "bombWarning") { // Alerta de bomba
      const pulse = 0.5 + 0.5 * Math.sin(gameT * 15);
      ctx.globalAlpha = alpha * 0.4 * pulse;
      ctx.fillStyle = ef.c;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,50,50,0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,30,60,${flash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  const low = v.players.some((p) => !p.dead && p.hp === 1);
  if (low) {
    ctx.fillStyle = `rgba(255,30,60,${0.1 + 0.08 * Math.sin(gameT * 8)})`;
    ctx.fillRect(0, 0, W, 8);
    ctx.fillRect(0, H - 8, W, 8);
    ctx.fillRect(0, 0, 8, H);
    ctx.fillRect(W - 8, 0, 8, H);
  }
}
function drawPlayer(p) {
  if (p.dead) {
    vSkull(W / 2 + (p.idx ? 120 : -120), H - 24, 16, "#9c8cc9");
    return;
  }
  const cells = p.cells,
    col = p.color;
  const blink = p.iframes > 0 && Math.sin(gameT * 30) > 0;
  ctx.globalAlpha = blink ? 0.45 : 1;
  for (let i = cells.length - 1; i >= 1; i--) {
    const c = cells[i],
      t = i / cells.length,
      x = (c[0] + 0.5) * CELL,
      y = (c[1] + 0.5) * CELL,
      r = 12 - 4.5 * t;
    ctx.fillStyle = shade(col, 1.05 - t * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.14)";
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.45, 0, TAU);
    ctx.fill();
  }
  const h = cells[0],
    hx = (h[0] + 0.5) * CELL,
    hy = (h[1] + 0.5) * CELL;
  const dx = (p.dir && p.dir.x) || 0,
    dy = (p.dir && p.dir.y) || 0,
    px = -dy,
    py = dx;
  if (Math.sin(gameT * 2.6 + p.idx * 2) > 0.75) {
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + dx * 12, hy + dy * 12);
    ctx.lineTo(hx + dx * 20, hy + dy * 20);
    ctx.moveTo(hx + dx * 20, hy + dy * 20);
    ctx.lineTo(hx + dx * 24 + px * 3, hy + dy * 24 + py * 3);
    ctx.moveTo(hx + dx * 20, hy + dy * 20);
    ctx.lineTo(hx + dx * 24 - px * 3, hy + dy * 24 - py * 3);
    ctx.stroke();
  }
  ctx.shadowColor = col;
  ctx.shadowBlur = 18;
  const g = ctx.createRadialGradient(
    hx + dx * 4 - px * 3,
    hy + dy * 4 - py * 3,
    2,
    hx,
    hy,
    14,
  );
  g.addColorStop(0, shade(col, 1.35));
  g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(hx, hy, 13, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (const s of [1, -1]) {
    const ex = hx + dx * 4 + px * 5 * s,
      ey = hy + dy * 4 + py * 5 * s;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, ey, 3.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(ex + dx * 1.3, ey + dy * 1.3, 1.8, 0, TAU);
    ctx.fill();
  }
  if (p.shieldT > 0) {
    ctx.strokeStyle = "rgba(255,215,94,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, hy, 20, gameT * 4, gameT * 4 + TAU * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx, hy, 20, gameT * 4 + Math.PI, gameT * 4 + Math.PI + TAU * 0.8);
    ctx.stroke();
  }
  if (p.shield > 0) vShieldIc(hx + 16, hy - 16, 6);
  if (mode === "local" || mode === "online") {
    ctx.font = "bold 12px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeText("J" + (p.idx + 1), hx, hy - 22);
    ctx.fillStyle = col;
    ctx.fillText("J" + (p.idx + 1), hx, hy - 22);
  }
  ctx.globalAlpha = 1;
}

/* ================= HUD ================= */
function hearts(p) {
  if (p.maxHp > 14) return "❤×" + p.hp;
  let s = "";
  for (let i = 0; i < p.maxHp; i++) s += i < p.hp ? "❤️" : "🖤";
  return s;
}
function updateHUD() {
  const v = role === "guest" && rs ? rs : LIVE();
  if (!v || !v.players || !v.players.length) return;
  let hl = "";
  v.players.forEach((p) => {
    hl += `<div class="hpbox" style="border-color:${p.color}88"><span class="nm" style="color:${p.color}">${CLASSES[p.cls].ic} J${p.idx + 1} ${CLASSES[p.cls].name}${p.dead ? " 💀" : ""}</span><br>${p.dead ? "—" : hearts(p)}${p.shield > 0 ? " 🛡️" + p.shield : ""}</div>`;
  });
  $("#hudL").innerHTML = hl;
  $("#hudWave").textContent =
    (v.wave % 5 === 0 && v.wave > 0 ? "👹 " : "") + "ONDA " + v.wave;
  const left =
    role === "guest"
      ? rs && rs.left !== undefined
        ? rs.left
        : "?"
      : enemies.length + spawnQ;
  $("#hudScore").textContent = v.score + " pts · 👾 restam " + left;
  $("#hudSouls").textContent = role === "guest" && rs ? rs.souls : runSouls;
  let aw = "";
  v.players.forEach((p) => {
    const pct = clamp(1 - p.abT / p.abCd, 0, 1);
    aw += `<div class="abicon ${p.abT <= 0 ? "ready" : ""}" title="${CLASSES[p.cls].ab}" style="background:conic-gradient(${p.color} ${pct * 360}deg,#241a3d 0deg)">${CLASSES[p.cls].ic}</div>`;
  });
  $("#abWrap").innerHTML = aw;
  const hn = $("#hudNet");
  if (mode === "online" && runActive) {
    hn.classList.remove("hidden");
    const pk = pingMs == null ? "…" : pingMs + "ms";
    const col =
      pingMs == null
        ? "#b9a8ff"
        : pingMs < 120
          ? "#7dff5e"
          : pingMs < 260
            ? "#ffd75e"
            : "#ff5d7f";
    hn.innerHTML =
      (transportLabel || "🌐") + ' <b style="color:' + col + '">' + pk + "</b>";
  } else hn.classList.add("hidden");
  const ce = $("#hudCombo");
  const cmb = role === "guest" && rs ? rs.combo || 0 : combo;
  if (cmb >= 3) {
    ce.classList.remove("hidden");
    ce.textContent = "🔥 COMBO x" + cmb;
  } else ce.classList.add("hidden");
}

/* ================= ONLINE ================= */
let phpOk = false;
async function openOnline() {
  $("#onlineStatus").textContent = "escolha criar ou entrar numa sala";
  showScreen("online");
  $("#phpBadge").textContent = "🔎 testando relay.php...";
  phpOk = await detectPhp();
  if (phpOk) {
    $("#phpBadge").innerHTML =
      '✔ <b style="color:#7dff5e">relay.php detectado</b> — modo PHP disponível (menor lag, funciona até sem internet)';
    $("#nmPhp").disabled = false;
    $("#nmPhp").checked = true;
    $("#nmInet").checked = false;
  } else {
    $("#phpBadge").innerHTML =
      "ℹ️ relay.php não detectado — se estiver no XAMPP, confira se o arquivo está na mesma pasta do index.html. Você ainda pode forçar o modo PHP.";
    $("#nmPhp").disabled = false;
    $("#nmPhp").checked = false;
    $("#nmInet").checked = true;
  }
}
function setNetStatus(m) {
  $("#onlineStatus").textContent = m;
}
function randomCode() {
  const ch = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += ch[ri(0, ch.length - 1)];
  return s;
}
function netCbs() {
  return {
    onStatus: setNetStatus,
    onFatal: (m) => {
      setNetStatus("❌ " + m);
    },
    onTransport: (k) => {
      transportLabel = k === "php" ? "🖥️ PHP" : "🌐 MQTT";
    },
    onPeer: () => {
      if (role === "host") {
        guestJoined = true;
        showLobby();
        toast("🎮 Jogador conectou!");
      } else {
        showLobby();
        if (net) net.send({ t: "hello" });
      }
    },
    onPeerLeave: () => {
      if (runActive) {
        if (role === "host") {
          toast("O outro jogador saiu — continuando solo!");
          players = players.filter((p) => p.idx === 0);
          if (pickState) {
            pickState.alive = pickState.alive.filter((i) => i !== 1);
            pickState.picked.add(1);
            maybeFinish();
          }
        } else {
          toast("O host saiu da sala");
          runActive = false;
          toMenu();
        }
      } else {
        guestJoined = false;
        toast("O outro jogador saiu.");
        if (!$("#lobby").classList.contains("hidden")) showScreen("online");
        setNetStatus("⚠️ o outro jogador saiu. tente de novo.");
      }
    },
    onData: onNet,
  };
}
function openByMode(isHost, code, cbs) {
  if ($("#nmPhp").checked) return createSession(isHost, code, cbs, T.PHP);
  return createSession(isHost, code, cbs, T.MQTT);
}
function createRoom() {
  cancelNet();
  role = "host";
  roomCode = randomCode();
  $("#joinCode").value = roomCode;
  showScreen("online");
  setNetStatus("🏰 criando sala " + roomCode + "...");
  net = openByMode(true, roomCode, netCbs());
}
function joinRoom() {
  const code = $("#joinCode").value.trim().toLowerCase();
  if (code.length < 4) {
    toast("Digite o código da sala");
    return;
  }
  cancelNet();
  role = "guest";
  roomCode = code;
  showScreen("online");
  setNetStatus("🔑 procurando a sala " + code + "...");
  net = openByMode(false, code, netCbs());
}
function cancelNet() {
  if (net) {
    try {
      net.close();
    } catch (e) {}
    net = null;
  }
  guestJoined = false;
  setNetStatus("conexão cancelada.");
}
function showLobby() {
  showScreen("lobby");
  $("#lobbyCode").textContent = roomCode || "-----";
  buildClassCards($("#lobbyGrid"), (i) => {
    if (role === "guest") {
      guestCls = i;
      if (net) net.send({ t: "class", i });
      markLobbySel();
      sfx("eat");
    } else {
      hostCls = i;
      markLobbySel();
      sfx("eat");
      broadcastLobby();
    }
  });
  updateLobby();
}
function markLobbySel() {
  const mine = role === "guest" ? guestCls : hostCls;
  [...$("#lobbyGrid").children].forEach((c, i) =>
    c.classList.toggle("sel", i === mine),
  );
}
function updateLobby() {
  if ($("#lobby").classList.contains("hidden")) return;
  $("#lobbyStatus").textContent = guestJoined
    ? "✔ Conectado " +
      transportLabel +
      " · Host: " +
      CLASSES[hostCls].ic +
      " · Convidado: " +
      (guestCls >= 0 ? CLASSES[guestCls].ic : "escolhendo...")
    : "aguardando jogador entrar...";
  $("#btnStartOnline").classList.toggle(
    "hidden",
    !(role === "host" && guestJoined),
  );
  markLobbySel();
}
function broadcastLobby() {
  if (net)
    net.send({ t: "lobby", h: hostCls, g: guestCls, joined: guestJoined });
}
function hostStart() {
  if (!guestJoined) return;
  const cls = [hostCls, guestCls >= 0 ? guestCls : 0];
  net.send({ t: "start", cls });
  role = "host";
  startRun(cls, "online");
  startNet();
  sendState();
}
function startRunRemote(cls) {
  startRun(cls, "online");
  $("#ctrlHint").innerHTML =
    '🌐 online — <span class="kbd">WASD/setas</span> mover · <span class="kbd">E</span>/<span class="kbd">Enter</span> habilidade · <span class="kbd">P</span> poderes';
}
function startNet() {
  stopNet();
  netTimer = setInterval(sendState, 100);
}
function stopNet() {
  if (netTimer) {
    clearInterval(netTimer);
    netTimer = null;
  }
}
function snap() {
  return {
    wave,
    score,
    paused,
    phase,
    souls: runSouls,
    combo,
    mod:
      waveMod && waveMod.id !== "none" ? { n: waveMod.n, d: waveMod.d } : null,
    left: enemies.length + spawnQ,
    players: players.map((p) => ({
      idx: p.idx,
      cls: p.cls,
      color: p.color,
      hp: p.hp,
      maxHp: p.maxHp,
      dead: p.dead,
      shield: p.shield,
      shieldT: Math.round(p.shieldT * 10) / 10,
      abT: Math.round(p.abT * 10) / 10,
      abCd: p.abCd,
      dir: p.dir,
      cells: p.cells,
      pw: p.powerLog,
    })),
    enemies: enemies.map((e) => ({
      x: Math.round(e.x),
      y: Math.round(e.y),
      hp: Math.max(0, Math.round(e.hp)),
      mhp: e.mhp,
      type: e.type,
      r: e.r,
      flash: e.flash > 0 ? 1 : 0,
      shT: Math.round(e.shT * 10) / 10,
      elite: e.elite ? 1 : 0,
      enraged: e.enraged ? 1 : 0,
    })),
    pbullets: pbullets.map((b) => ({
      x: Math.round(b.x),
      y: Math.round(b.y),
      crit: b.crit ? 1 : 0,
    })),
    ebullets: ebullets.map((b) => ({
      x: Math.round(b.x),
      y: Math.round(b.y),
      r: b.r,
    })),
    foods: foods.map((f) => ({ x: f.x, y: f.y, t: f.t })),
    drops: drops.map((f) => ({
      x: Math.round(f.x),
      y: Math.round(f.y),
      t: f.t,
      life: Math.round(f.life),
      born: f.born,
    })),
    blocks: blocks.map((b) => ({ x: b.x, y: b.y, hp: b.hp })),
    bombs: bombs.map((b) => ({
      x: Math.round(b.x),
      y: Math.round(b.y),
      t: b.t,
    })),
  };
}
function sendState() {
  if (net) net.send({ t: "state", s: snap() });
}
function onNet(d) {
  if (d.t === "hb") return;
  if (d.t === "ping") {
    if (net) net.send({ t: "pong", ts: d.ts });
    return;
  }
  if (d.t === "pong") {
    pingMs = Math.round(Date.now() - d.ts);
    return;
  }
  if (role === "host") {
    switch (d.t) {
      case "hello":
        updateLobby();
        broadcastLobby();
        break;
      case "class":
        guestCls = d.i;
        updateLobby();
        broadcastLobby();
        break;
      case "k": {
        const m = DIRMAP[d.d];
        if (m && players[1]) players[1].qdir = { x: m[0], y: m[1] };
        break;
      }
      case "ab":
        tryAbility(players[1]);
        break;
      case "pick":
        netPick(1, d.k);
        break;
    }
  } else if (role === "guest") {
    switch (d.t) {
      case "lobby":
        hostCls = d.h;
        guestCls = d.g;
        guestJoined = d.joined;
        updateLobby();
        break;
      case "start":
        startRunRemote(d.cls);
        break;
      case "state":
        rs = d.s;
        guestFx();
        break;
      case "up":
        showGuestPicker(d);
        break;
      case "go":
        hideOvs();
        break;
      case "over":
        stopNet();
        runActive = false;
        save.frags += d.frags || 0;
        persist();
        $("#overStats").innerHTML =
          `<div>🎯 Pontos: <b>${d.score}</b></div><div>🌊 Onda: <b>${d.wave}</b></div><div>💀 Abates: <b>${d.kills}</b></div><div>🔥 Combo máx: <b>x${d.comboMax || 0}</b></div><div>💜 Almas do grupo: <b>+${d.earned}</b></div><div>💠 Fragmentos: <b>+${d.frags || 0}</b></div>`;
        showScreen("over");
        break;
    }
  }
}
function showGuestPicker(d) {
  const pool = d.relic ? RELICS : UPGRADES;
  $("#upTitle").textContent = d.relic
    ? "👑 RELÍQUIA DO CHEFE"
    : "ESCOLHA UM PODER";
  const g = $("#upCards");
  g.innerHTML = "";
  $("#upWait").classList.add("hidden");
  d.opts.forEach((k) => {
    const o = pool[k],
      c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<div class="ic">${o.ic}</div><h3>${o.n}</h3><p>${o.d}</p>`;
    c.onclick = () => {
      if (net) net.send({ t: "pick", k });
      showWait();
      sfx("gold");
    };
    g.appendChild(c);
  });
  $("#upOv").classList.remove("hidden");
}
function guestFx() {
  if (!rs) return;
  if (rs.wave !== gPrev.wave && rs.phase === "play") {
    banner(
      rs.wave % 5 === 0 ? "⚠️ CHEFE ⚠️" : "ONDA " + rs.wave,
      rs.wave % 5 === 0
        ? "prepare-se..."
        : rs.mod
          ? rs.mod.n + " — " + rs.mod.d
          : "",
    );
  }
  const hp = rs.players.reduce((a, p) => a + (p.dead ? 0 : p.hp), 0);
  if (hp < gPrev.hp) {
    sfx("hurt");
    shake = Math.min(12, shake + 6);
    flash = 0.3;
  }
  $("#pauseOv").classList.toggle("hidden", !rs.paused);
  $("#pauseBtns").classList.add("hidden");
  $("#pauseGuest").classList.remove("hidden");
  gPrev = { wave: rs.wave, hp, paused: rs.paused };
}
function leaveOnline() {
  cancelNet();
  role = "solo";
  showScreen("menu");
  updateMenu();
}
function abandon() {
  paused = false;
  runActive = false;
  phase = "menu";
  leaveOnline();
}
function toMenu() {
  runActive = false;
  phase = "menu";
  stopNet();
  if (net) {
    try {
      net.close();
    } catch (e) {}
    net = null;
  }
  role = "solo";
  guestJoined = false;
  transportLabel = "";
  showScreen("menu");
  updateMenu();
}
window.addEventListener("beforeunload", () => {
  if (net) {
    try {
      net.close();
    } catch (e) {}
  }
});
setInterval(() => {
  if (net && runActive) net.send({ t: "ping", ts: Date.now() });
}, 2000);

/* ================= INPUT ================= */
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
    e.preventDefault();
  initAudio();
  if (k === "m") {
    toggleMute();
    return;
  }
  if ($("#game").classList.contains("hidden")) return;
  if (k === "p") {
    togglePowers();
    return;
  }
  if (k === " ") {
    if (role !== "guest" && phase === "play") togglePause();
    return;
  }
  if (paused || phase !== "play") return;
  if (DIRMAP[k]) {
    const m = DIRMAP[k],
      dv = { x: m[0], y: m[1] };
    if (role === "guest") {
      if (net) net.send({ t: "k", d: k });
      return;
    }
    if (mode === "local") {
      if (["w", "a", "s", "d"].includes(k))
        players[0] && (players[0].qdir = dv);
      else players[1] && (players[1].qdir = dv);
    } else players[0] && (players[0].qdir = dv);
    return;
  }
  if (["e", "q", "j"].includes(k)) {
    if (role === "guest") {
      if (net) net.send({ t: "ab" });
    } else tryAbility(players[0]);
    return;
  }
  if (k === "enter" || k === "l") {
    if (mode === "local") tryAbility(players[1]);
    else if (role === "guest") {
      if (net) net.send({ t: "ab" });
    } else tryAbility(players[0]);
  }
});

/* ================= LOOP ================= */
let last = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  if ($("#game").classList.contains("hidden")) return;
  gameT += dt;
  if (role !== "guest" && phase === "play" && !paused) update(dt);
  updateFx(dt);
  if (role === "guest") {
    if (rs) render(rs);
    else {
      ctx.drawImage(bg, 0, 0);
      ctx.fillStyle = "#b9a8ff";
      ctx.font = "22px Orbitron";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("conectando...", W / 2, H / 2);
    }
  } else render(LIVE());
  updateHUD();
}
$("#playerName").value = save.name || "";
$("#playerName").addEventListener("input", (e) => {
  save.name = e.target.value;
  persist();
});
buildColorRow();
requestAnimationFrame(frame);
updateMenu();
