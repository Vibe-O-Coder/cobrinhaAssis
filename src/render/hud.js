/* ================= HUD ================= */
import { $, clamp, esc } from "../core/utils.js";
import { S } from "../core/state.js";
import { CLASSES } from "../data/classes.js";
import { ultimateCooldown } from "../data/ultimates.js";
import { FINAL_WAVE } from "../core/config.js";
import { actOf, bossKind } from "../core/scaling.js";
import { LIVE } from "./snapshot.js";
import { isPvp } from "../game/pvp.js";
import { PVP_ABILITIES } from "../game/pvpabilities.js";
import { MATCH_SECS } from "../data/pvp.js";

/** Só aceita #rgb / #rrggbb. Qualquer outra coisa vira a cor padrão. */
export function safeColor(c) {
  return /^#[0-9a-fA-F]{3,8}$/.test(String(c || "")) ? c : "#e8e2ff";
}

/* Dois HP por coração. O valor exato, inclusive frações, fica nos status. */
function hearts(p) {
  const hp = Math.max(0, p.hp);
  if (p.maxHp > 28) return "❤×" + (Math.round(hp) / 2) + " · " + hp + " HP";
  let s = "";
  for (let i = 0; i < p.maxHp; i += 2) {
    if (i + 2 <= hp) s += "❤️";
    else if (hp > i) s += "💔"; // 1 HP = meio coração
    else s += "🖤";
  }
  return s;
}

/* ---------------------------------------------------------------------------
   HUD DO PVP

   Mostra o que decide a partida: nível, vida, escudo, barra de experiência,
   as duas recargas (habilidade e item), o relógio até a morte súbita e o
   stack de buff dos inimigos. Os dois lados ficam nas pontas, na mesma ordem
   das metades da tela — o J1 é sempre o painel da esquerda.
   --------------------------------------------------------------------------- */

function bar(cls, frac, txt) {
  const w = Math.round(clamp(frac, 0, 1) * 100);
  return (
    `<div class="pvpbar ${cls}"><i style="width:${w}%"></i>` +
    (txt ? `<b>${esc(txt)}</b>` : "") +
    `</div>`
  );
}

function cooldownIcon(ic, t, cd, title) {
  const pct = clamp(1 - t / Math.max(0.01, cd), 0, 1);
  const pronto = t <= 0;
  return (
    `<div class="pvpcd ${pronto ? "ready" : ""}" title="${esc(title)}" ` +
    `style="background:conic-gradient(#ffd75e ${pct * 360}deg,#241a3d 0deg)">` +
    `${ic}${pronto ? "" : `<span>${Math.ceil(t)}</span>`}</div>`
  );
}

function pvpPanel(p) {
  if (!p) return "";
  const c = CLASSES[p.cls] || CLASSES[0];
  const col = safeColor(p.color);
  const hpTxt = Math.round(p.hp * 10) / 10 + " / " + p.maxHp;
  const xpFrac = p.xpNext ? p.xp / p.xpNext : 0;

  let icons = cooldownIcon(c.ic, p.abT, ultimateCooldown(p), p.abName || PVP_ABILITIES[p.cls][0]);
  if (p.item) icons += cooldownIcon(p.item.ic, p.itemT, p.item.cd * (p.itemCdMul || 1), p.item.n);

  return (
    `<div class="pvpname" style="color:${col}">${c.ic} J${p.idx + 1} ` +
    `${esc(c.name)}${p.dead ? " 💀" : ""}<span class="lv">Nv ${p.level}</span></div>` +
    bar("hp", p.hp / Math.max(1, p.maxHp), hpTxt) +
    (p.guardMax > 0
      ? bar("gd", p.guard / p.guardMax, "🛡 " + Math.round(p.guard))
      : "") +
    bar("xp", xpFrac, "XP " + Math.floor(p.xp) + "/" + Math.round(p.xpNext)) +
    `<div class="pvpicons">${icons}</div>`
  );
}

function updatePvpHUD(v) {
  const st = S.role === "guest" ? S.rs?.pvp : S.pvp;
  $("#pvpP1").innerHTML = pvpPanel(v.players[0]);
  $("#pvpP2").innerHTML = pvpPanel(v.players[1]);

  const falta = Math.max(0, MATCH_SECS - (st ? st.t : 0));
  const mm = Math.floor(falta / 60);
  const ss = String(Math.floor(falta % 60)).padStart(2, "0");
  const clock = $("#pvpClock");
  const sudden = st && st.sudden;
  clock.textContent = sudden ? "☠️ MORTE SÚBITA" : mm + ":" + ss;
  clock.classList.toggle("urgent", sudden || falta <= 60);

  const net = $("#pvpNet");
  if (net) net.textContent = S.role !== "solo" ? (S.transportLabel || "") + " · " + (S.pingMs == null ? "…" : S.pingMs+"ms") : "";
  $("#pvpStacks").textContent =
    sudden && st.arena
      ? "🔻 arena " + (st.arena.x1 - st.arena.x0) + "x" + (st.arena.y1 - st.arena.y0)
      : "👹 inimigos x" + (st ? st.stacks : 0);
}

export function updateHUD() {
  const v = S.role === "guest" && S.rs ? S.rs : LIVE();
  if (!v || !v.players || !v.players.length) return;

  /* O PVP tem HUD próprio, num bloco separado: ele mostra nível e experiência,
     que não existem na campanha, e não mostra onda nem almas, que não existem
     no duelo. */
  const pvp = isPvp();
  $("#hud").classList.toggle("hidden", pvp);
  $("#pvpHud").classList.toggle("hidden", !pvp);
  if (pvp) {
    updatePvpHUD(v);
    return;
  }

  let hl = "";
  for (const p of v.players) {
    const c = CLASSES[p.cls] || CLASSES[0];
    // p.color vem do snapshot do outro jogador. Sem validar, um peer podia
    // mandar `red" onload="..."` e injetar HTML no HUD de quem recebe.
    const col = safeColor(p.color);
    hl +=
      `<div class="hpbox" style="border-color:${col}88">` +
      `<span class="nm" style="color:${col}">${c.ic} J${p.idx + 1} ${esc(c.name)}${p.dead ? " 💀" : ""}</span><br>` +
      `${p.dead ? "—" : hearts(p)}${p.shield > 0 ? " 🛡️" + p.shield : ""}</div>`;
  }
  $("#hudL").innerHTML = hl;

  /* A cadencia de chefe deixou de ser "a cada 5 ondas" e virou 10/20/29 de
     cada ato, entao o icone tem que perguntar para quem manda nisso. */
  const kind = bossKind(v.wave);
  const isFinal = v.wave >= FINAL_WAVE;
  $("#hudWave").textContent =
    (isFinal ? "☠️ " : kind === "act" ? "👑 " : kind ? "👹 " : "") +
    "ONDA " + v.wave + " / " + FINAL_WAVE +
    "  ·  ATO " + (actOf(v.wave) + 1);

  const left =
    S.role === "guest"
      ? S.rs && S.rs.left !== undefined ? S.rs.left : "?"
      : S.enemies.length + S.spawnQ;
  $("#hudScore").textContent = v.score + " pts · 👾 restam " + left;
  $("#hudSouls").textContent =
    S.role === "guest" && S.rs ? S.rs.souls : S.runSouls;

  let aw = "";
  for (const p of v.players) {
    const c = CLASSES[p.cls] || CLASSES[0];
    const pct = clamp(1 - p.abT / ultimateCooldown(p), 0, 1);
    aw +=
      `<div class="abicon ${p.abT <= 0 ? "ready" : ""}" title="${esc(p.abName || c.ab)}" ` +
      `style="background:conic-gradient(${safeColor(p.color)} ${pct * 360}deg,#241a3d 0deg)">${c.ic}</div>`;
  }
  $("#abWrap").innerHTML = aw;

  const hn = $("#hudNet");
  if (S.mode === "online" && S.runActive) {
    hn.classList.remove("hidden");
    const pk = S.pingMs == null ? "…" : S.pingMs + "ms";
    const col =
      S.pingMs == null ? "#b9a8ff"
        : S.pingMs < 120 ? "#7dff5e"
        : S.pingMs < 260 ? "#ffd75e"
        : "#ff5d7f";
    hn.innerHTML =
      (S.transportLabel || "🌐") + ' <b style="color:' + col + '">' + pk + "</b>";
  } else {
    hn.classList.add("hidden");
  }

  const ce = $("#hudCombo");
  const cmb = S.role === "guest" && S.rs ? S.rs.combo || 0 : S.combo;
  if (cmb >= 3) {
    ce.classList.remove("hidden");
    ce.textContent = "🔥 COMBO x" + cmb;
  } else {
    ce.classList.add("hidden");
  }
}
