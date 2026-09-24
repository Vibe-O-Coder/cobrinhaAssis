/* ================= TETOS DE ATRIBUTO =================
   Um lugar só para apertar todos os limites, chamado DEPOIS de qualquer coisa
   que mexa nos atributos (criar jogador, comprar carta, aplicar relíquia,
   aplicar árvore).

   Antes cada carta carregava o próprio piso — `Math.max(70, p.spd * 0.88)` —
   e cada teto vivia num arquivo diferente (uns em tree.js, uns em config.js,
   uns em lugar nenhum). Com 290 ondas isso não fecha: "Tiro Múltiplo" podia ser
   sorteado 40 vezes e a cobra terminava a run com 40 projéteis por ataque.

   A conversão de crítico também mora aqui: taxa acima de 100% não é jogada no
   lixo, ela vira DANO crítico. */

import {
  CAPS, SNAKE_SPD_MIN, SNAKE_SPD_MAX, CRIT_DMG_BASE,
} from "../core/config.js";
import { fruitAttack, fruitDamage, fruitShots } from "./fruits.js";
import { clamp } from "../core/utils.js";

/** Tetos absolutos — valem para carta, relíquia e árvore somadas. */
export const HARD = {
  shots: 12,
  pierce: 8,
  venom: 8,
  boom: 12,
  thorns: 20,
  range: 700,
  magnetR: 520,
  iframeBonus: 1.6,
  atkCd: 0.12, // segundos, piso absoluto entre dois ataques
};

export function clampStats(p) {
  if (!p) return p;

  /* --- crítico: excesso de TAXA vira DANO ---
     Cada 10% de taxa que passaria de 100% se transforma em +15% de dano
     crítico. Assim uma carta de taxa nunca é desperdício, e o sorteio pode
     parar de oferecer taxa sem sumir com o poder. */
  if (p.crit > CAPS.critChance) {
    const over = p.crit - CAPS.critChance;
    p.crit = CAPS.critChance;
    p.critDmg = (p.critDmg || CRIT_DMG_BASE) + over * 1.5;
  }
  p.crit = clamp(p.crit, 0, CAPS.critChance);
  p.critDmg = clamp(p.critDmg || CRIT_DMG_BASE, 1, CAPS.critDmgMax);

  /* --- movimento --- a cobra não pode passar de ~9,5 células/s. */
  p.spd = clamp(p.spd, SNAKE_SPD_MIN, SNAKE_SPD_MAX);

  /* --- ataque --- piso relativo à classe E piso absoluto. */
  const cdFloor = Math.max(HARD.atkCd, (p.cdBase || p.cd) * 0.3);
  p.cd = Math.max(cdFloor, p.cd);

  /* --- projéteis --- */
  p.shots = Math.round(clamp(p.shots, 1, HARD.shots));
  p.pierce = Math.round(clamp(p.pierce, 0, HARD.pierce));
  p.range = clamp(p.range, 60, HARD.range);

  /* --- efeitos --- */
  p.venom = clamp(p.venom, 0, HARD.venom);
  p.boom = clamp(p.boom, 0, HARD.boom);
  p.thorns = clamp(p.thorns, 0, HARD.thorns);
  p.ls = clamp(p.ls, 0, CAPS.lifesteal);
  p.iframeBonus = clamp(p.iframeBonus, 0, HARD.iframeBonus);
  p.magnetR = clamp(p.magnetR || 0, 0, HARD.magnetR);

  /* --- vida --- nunca acima do máximo, nunca negativa. */
  p.maxHp = Math.max(1, Math.min(p.maxHp, p.hardcore ? p.hpCeiling ?? p.maxHp : Infinity));
  p.hp = clamp(p.hp, 0, p.maxHp);

  return p;
}

/** Velocidade da cobra em células por segundo — usada pelo ímã e pela tela de
    status. `p.spd` é intervalo em ms, então isto é o inverso. */
export function cellsPerSec(p) {
  return 1000 / Math.max(1, p.spd);
}

/** Dano de UM projétil, sem crítico. Ponto único de verdade: antes a conta
    `p.dmg + p.dmgFlat` estava copiada em bullets.js e abilities.js. */
export function bulletDmg(p) {
  // sizeMul é a passiva da classe (Glutão: força proporcional ao tamanho).
  const base = (p.dmg * (p.dmgMul || 1) + p.dmgFlat) * (p.sizeMul || 1);
  // "Enfraquecido": -10% por acúmulo, teto de -40%.
  const fraco = p.weakT > 0 ? 1 - Math.min(0.4, (p.weakN || 0) * 0.1) : 1;
  return base * fraco * fruitDamage(p);
}

/** Dano médio por projétil, já contando crítico. Só para exibir na tela de
    status: o dano real é sorteado tiro a tiro. */
export function avgHit(p) {
  return bulletDmg(p) * (1 + p.crit * ((p.critDmg || CRIT_DMG_BASE) - 1));
}

export const shotCount = p => p.shots + fruitShots(p);
export const attackInterval = p => p.cd / fruitAttack(p) / (p.sizeMul || 1) * (p.berserkT > 0 ? .45 : p.overdriveT > 0 ? .65 : 1);
