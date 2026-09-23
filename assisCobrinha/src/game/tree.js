/* ================= ÁRVORE DE HABILIDADES (lógica) ================= */
import { TREE_BASES, TIERNAMES, TREE_MAX_DEPTH, MASTERIES } from "../data/tree.js";
import { hashStr, clamp } from "../core/utils.js";
import { treePrice } from "../data/economy.js";
import { CAPS, DMG_SOFT_CAP } from "../core/config.js";

/** Estado inicial de treeB num jogador novo. Todos em 0. */
export function emptyTreeB() {
  return {
    dmg: 0, dmgFlat: 0, cd: 0, spd: 0, hp: 0, crit: 0,
    pierce: 0, shots: 0, ls: 0, regen: 0, boom: 0, venom: 0,
    range: 0, souls: 0, gold: 0, shield: 0, thorns: 0,
    iframe: 0, magnet: 0, glass:0, fortress:0, volley:0, focus:0,
  };
}

/** Nó procedural: o mesmo caminho sempre gera o mesmo poder e o mesmo custo. */
export function treeNode(bi, path) {
  const base = TREE_BASES[bi];
  if (!base || !path.length || path.length > TREE_MAX_DEPTH || path.some(n=>!Number.isInteger(n)||n<1||n>3)) return null;
  const key = bi + "-" + path.join("-");
  const h = hashStr("srk" + key);
  const tier = path.length;
  const pool = base.fx;
  const fx = pool[(path[0] - 1 + (path.at(-1) === 3 ? 1 : 0)) % pool.length];
  const mag =
    Math.round(fx.m * (0.3 + tier * 0.12) * (1 + ((h >>> 3) % 3) * 0.1) * 100) / 100;
  const cost = treePrice(tier);
  const mastery = MASTERIES[key];
  if (mastery) return {key,name:mastery.name,desc:mastery.desc,cost,tier,apply:p=>p.treeB[mastery.stat]++,conflict:mastery.conflict};
  return {
    key,
    name: base.n + " · " + path.join(".") + " · " + TIERNAMES[tier-1],
    desc: fx.d(mag),
    cost,
    tier,
    apply: (p) => fx.f(p, mag),
  };
}

export function treeRoot(bi) {
  const base = TREE_BASES[bi];
  return {
    key: String(bi),
    name: base.n + " Essencial",
    desc: base.rootD,
    cost: treePrice(0),
    tier: 0,
    apply: (p) => base.rootF(p),
  };
}

export const MAX_DEPTH = TREE_MAX_DEPTH;

/** Aplica no jogador todos os nós comprados que estão em `treeKeys`. */
export function applyTree(p, treeKeys) {
  const accepted = [];
  for (const k of new Set(treeKeys || [])) {
    if (treeBlocked(k,accepted)) continue;
    accepted.push(k);
    const parts = String(k).split("-");
    const bi = parseInt(parts[0], 10);
    if (!TREE_BASES[bi]) continue;
    if (parts.length === 1) {
      treeRoot(bi).apply(p);
    } else {
      const path = parts.slice(1).map(Number);
      if (path.some((n) => !Number.isFinite(n) || n < 1 || n > 3)) continue;
      const node = treeNode(bi, path);
      if (node) node.apply(p);
    }
  }
}

/* Converte treeB -> atributos do jogador, UMA vez, aplicando tetos.
   Duas correções em relação à versão antiga:
   1. Math.floor virou Math.round nos campos de ponto. Antes, um nó de
      "+0.6 HP máximo" virava floor(0.6) = 0 — você pagava fragmentos por
      literalmente nada até acumular 4 ou 5 nós iguais.
   2. `ls` agora chega em porcentagem (0-100) e é dividido aqui. */
export function finalizeTree(p) {
  const b = effectiveTree(p.treeB);

  // Dano: acima de 50% de bônus, cada ponto extra vale metade (anti-hitkill).
  const soft = DMG_SOFT_CAP * 100;
  const dmgEff = b.dmg <= soft ? b.dmg : soft + (b.dmg - soft) * 0.5;
  p.dmg *= 1 + clamp(dmgEff, 0, 120) / 100;
  p.dmgFlat += clamp(b.dmgFlat, 0, 3);

  p.cd *= 1 - clamp(b.cd, 0, CAPS.cooldownCut * 100) / 100;
  p.spd *= 1 - clamp(b.spd, 0, CAPS.moveSpeedCut * 100) / 100;

  const hp = Math.round(clamp(b.hp, 0, CAPS.treeHp));
  p.maxHp += hp;
  p.hp += hp;

  p.crit += clamp(b.crit, 0, CAPS.critChance * 100) / 100;
  p.pierce += Math.round(clamp(b.pierce, 0, CAPS.pierce));
  p.shots += Math.round(clamp(b.shots, 0, CAPS.extraShots));
  p.ls += clamp(b.ls, 0, CAPS.lifesteal * 100) / 100;

  if (b.regen > 0) p.regenMax = Math.max(3, 7 - Math.round(b.regen));

  p.boom += clamp(b.boom, 0, CAPS.boom);
  p.venom += clamp(b.venom, 0, CAPS.venom);
  p.range *= 1 + clamp(b.range, 0, CAPS.rangeBonus * 100) / 100;
  p.soulMult *= 1 + clamp(b.souls, 0, 60) / 100;
  p.goldBonus = clamp(b.gold, 0, 30);
  p.shieldBase += Math.round(clamp(b.shield, 0, 3));
  p.thorns += Math.round(clamp(b.thorns, 0, CAPS.thorns));
  p.iframeBonus += clamp(b.iframe, 0, 0.8);
  if (b.magnet >= 1) { p.magnet = true; p.magnetR = Math.max(p.magnetR || 0,150 + b.magnet * 8); }
  if (b.glass) { p.dmg *= 1.18; p.maxHp = Math.max(1,p.maxHp*0.9); }
  if (b.fortress) { p.maxHp += 2; p.cd *= 1.05; }
  if (b.volley) { p.shots += 1; p.dmg *= 0.92; }
  if (b.focus) { p.critDmg += 0.5; p.cd *= 1.08; }
  p.hp = Math.min(p.hp,p.maxHp);

  p.shield = Math.max(p.shield, p.shieldBase);
}

/** Total acumulado de cada stat, pra mostrar o progresso real na tela. */
export function treeTotals(treeKeys) {
  const fake = { treeB: emptyTreeB() };
  applyTree(fake, treeKeys);
  return fake.treeB;
}

export function treeBlocked(key,owned) {return !!MASTERIES[key] && owned.includes(MASTERIES[key].conflict);}
export function canBuyNode(bi,path,owned) {
  const node=path.length?treeNode(bi,path):TREE_BASES[bi]&&treeRoot(bi);
  if(!node || owned.includes(node.key) || treeBlocked(node.key,owned)) return false;
  return !path.length || owned.includes(path.length===1?String(bi):bi+'-'+path.slice(0,-1).join('-'));
}
export function effectiveTree(raw) {
  const limits={dmg:200,dmgFlat:3,cd:50,spd:40,hp:6,crit:60,pierce:2,shots:3,ls:22,regen:4,boom:4,venom:3,range:80,souls:60,gold:30,shield:3,thorns:8,iframe:0.8,magnet:40};
  const b={...raw};
  for(const [k,cap] of Object.entries(limits)) {
    const soft=cap*0.25,v=Math.max(0,raw[k]||0);
    b[k]=v<=soft?v:soft+(cap-soft)*(1-Math.exp(-(v-soft)/(cap-soft)));
  }
  return b;
}
