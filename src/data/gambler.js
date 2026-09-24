/* Resultados uniformes: upgrades melhoram ganhos, nunca removem o azar. */
export const GAMBLE_RESULTS = [
  'Falência: fica com 1 HP e perde escudos',
  'Perda: perde metade da vida atual (mínimo 1 HP)',
  'Má fase: dano -40% por 6s',
  'Atraso: próxima ativa demora mais 4s',
  'Troco: cura 1 HP',
  'Par: cura 2 HP e ganha 1 escudo',
  'Trinca: cura 3 HP e ganha 2 escudos',
  'Quadra: cura 4 HP, 3 escudos e explosão',
  'Fortuna: cura total, 4 escudos e grande explosão',
  'Jackpot: cura total, 5 escudos, explosão máxima e 2 poderes aleatórios',
];

export function rollGamble(random = Math.random) {
  return Math.max(1, Math.min(10, 1 + Math.floor(random() * 10)));
}

export function applyGambleResources(p, roll, pvp = false) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 10) throw new RangeError('O dado deve estar entre 1 e 10.');
  const bonus = p.xLuck || 0;
  p.lastGamble = roll;
  if (roll === 1) { p.hp = 1; p.shield = 0; p.guard = 0; p.iframes = Math.max(p.iframes || 0, 0.7); }
  if (roll === 2) p.hp = Math.max(1, Math.ceil(p.hp) / 2);
  if (roll === 3) { p.weakT = Math.max(p.weakT || 0, 6); p.weakN = 4; }
  if (roll === 4) p.abT += 4;
  if (roll >= 5) {
    const hp = roll >= 9 ? p.maxHp : roll - 4 + bonus;
    if (!(p.noRegenT > 0)) p.hp = Math.min(p.maxHp, p.hp + hp);
    const shield = roll >= 6 ? roll - 5 + bonus : 0;
    if (pvp) p.guard = Math.min((p.guardMax || 0) + 6, (p.guard || 0) + shield);
    else p.shield = Math.min(6, (p.shield || 0) + shield);
  }
  return { roll, label: GAMBLE_RESULTS[roll - 1], damage: roll >= 8 ? (roll - 5) * 3 + bonus : 0, cards: roll === 10 ? 2 : 0 };
}
