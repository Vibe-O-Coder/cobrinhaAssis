/* ================= LOJA DE ALMAS ================= */
import { $, esc } from "../core/utils.js";
import { save, persist } from "../core/save.js";
import { SHOP, SUPPLIES } from "../data/shop.js";
import { showScreen, toast } from "./screens.js";
import { sfx } from "../core/audio.js";

export function openShop() {
  buildShop();
  showScreen("shop");
}

export function buildShop() {
  $("#shopSouls").textContent = save.souls;
  const g = $("#shopGrid");
  g.innerHTML = "";

  for (const it of SHOP) {
    const lvl = save.upg[it.k] || 0;
    const maxed = lvl >= it.max;
    const cost = it.c(lvl);
    const locked=it.req && !save.upg[it.req];
    const afford = !locked && save.souls >= cost;

    const c = document.createElement("div");
    c.className = "card" + (maxed ? " sel" : "");
    c.innerHTML =
      `<div class="ic">${it.ic}</div><h3>${esc(it.n)}</h3><p>${esc(it.d)}</p>` +
      `<div class="lvl">${"●".repeat(Math.min(it.max, Math.max(0, lvl)))}${"○".repeat(Math.max(0, it.max - lvl))}</div>` +
      `<div style="margin-top:8px;color:${maxed ? "#8f7fc0" : afford ? "#ffd75e" : "#ff5d7f"}">` +
      `${maxed ? "MÁXIMO" : locked ? "🔒 requer Magnetismo" : "💜 " + cost}</div>`;

    if (!maxed && !locked) {
      c.addEventListener("click", () => {
        const lv = save.upg[it.k] || 0;
        if (lv >= it.max) return;
        const price = it.c(lv);
        if (save.souls < price) {
          toast("💜 Almas insuficientes!");
          return;
        }
        save.souls -= price;
        save.upg[it.k] = lv + 1;
        persist();
        sfx("gold");
        buildShop();
      });
    }
    g.appendChild(c);
  }
  for(const item of SUPPLIES){
    const count=save.supplies[item.k]||0;
    const card=document.createElement('button');card.className='card';
    card.innerHTML='<div class="ic">'+item.ic+'</div><h3>'+item.n+'</h3><p>'+item.d+' Uma carga é usada por run, inclusive ao abandonar.</p><div class="tags">Estoque: '+count+'/20 · 💜 '+item.cost+'</div>';
    card.disabled=count>=20;
    card.onclick=()=>{if(save.souls<item.cost){toast('💜 Almas insuficientes');return;}if((save.supplies[item.k]||0)>=20)return;save.souls-=item.cost;save.supplies[item.k]=(save.supplies[item.k]||0)+1;persist();buildShop();};
    g.appendChild(card);
  }
}
