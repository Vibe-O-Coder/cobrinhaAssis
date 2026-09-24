import { S } from '../core/state.js';
import { UPGRADES, RELICS, canOffer } from '../data/upgrades.js';
import { PVP_UPGRADES } from '../data/pvpupgrades.js';
import { applyGambleResources, rollGamble } from '../data/gambler.js';
import { headPx, grantPower } from './player.js';
import { bulletDmg } from './stats.js';
import { cleanupEnemies } from './enemies.js';
import { foeOf, pvpHit } from './pvp.js';
import { dist } from '../core/utils.js';
import { addText, shockwave } from '../render/fx.js';

/** Recalcula o baralho depois de CADA prêmio: respeita únicos, pré-requisitos,
    caminho de ultimate e tetos mesmo quando as duas cartas vêm de uma vez. */
export function grantRandomPowers(p, pool, count = 2, random = Math.random) {
  const granted = [];
  for (let i = 0; i < count; i++) {
    const eligible = pool.filter(o => canOffer(o, p) && !(S.banished || []).includes(o.id));
    const normal = eligible.filter(o => !o.overflow);
    const cards = normal.length ? normal : eligible;
    if (!cards.length) break;
    const o = cards[Math.min(cards.length - 1, Math.floor(random() * cards.length))];
    grantPower(p, o); granted.push(o);
  }
  if (granted.length && p.cells?.length) {
    const h = headPx(p);
    addText(h.x, h.y - 34, '🎲 ' + granted.map(o => o.n).join(' + '), '#ffd75e', 2.5, 14);
  }
  return granted;
}

export function useGamble(p, pvp = false, random = Math.random) {
  const result = applyGambleResources(p, rollGamble(random), pvp), h = headPx(p);
  addText(h.x, h.y - 32, `🎲 ${result.roll}/10 · ${result.label}`, result.roll < 5 ? '#ff5252' : '#ffd75e', 2.8, 15);
  if (result.damage) {
    const r = 230 + result.roll * 12, damage = bulletDmg(p) * result.damage * (pvp ? 0.18 : 1);
    shockwave(h.x, h.y, r, '#ffd75e', 10);
    for (const e of S.enemies) if (e.hp > 0 && dist(h.x, h.y, e.x, e.y) < r + e.r) {
      e.hp -= damage * (1 - (e.ward || 0)); e.lastHitBy = p; e.flash = 0.2;
    }
    const foe = pvp && foeOf(p);
    if (foe && dist(h.x, h.y, headPx(foe).x, headPx(foe).y) < r) pvpHit(foe, Math.min(8, damage), p, 'ability');
    cleanupEnemies();
  }
  if (result.cards) grantRandomPowers(p, pvp ? PVP_UPGRADES : UPGRADES, result.cards, random);
  return result;
}

export function gamblerRewardPool(relic = false) { return relic ? RELICS : UPGRADES; }
