/* ================= ESCALONAMENTO =================
   Curvas de dificuldade num só lugar. Antes cada número estava solto dentro de
   waves.js, calibrado para uma run de 50 ondas:

     hp  = d.hp * (1 + (wave - 1) * 0.16)     -> linear, 47x na onda 290
     spd = d.spd * (1 + min(0.5, wave*0.012)) -> travava na onda 42
     dano de contato = 1                       -> constante a run inteira

   Agora o jogo vai até a onda 290 (10 atos de 29), então a vida precisa de um
   componente que COMPOSTA, a velocidade precisa de teto (senão o inimigo passa
   a correr mais que a cobra e não existe mais esquiva) e o dano de contato
   sobe em degraus por ato.

   Regra que guiou os números: o jogador ganha poder MULTIPLICATIVO (cada carta
   de dano é um fator), então a vida do inimigo também precisa de um fator, não
   só de uma soma. O teto de velocidade existe porque velocidade não tem
   contra-jogo: acima da velocidade da cobra, o inimigo é inesquivável. */

import { ACT_LEN, ACTS, FINAL_WAVE } from "./config.js";
import { clamp } from "./utils.js";

export const MAX_ENEMIES = 200;
export const MAX_ENEMY_BULLETS = 900;

/** Poder sustentado do equipamento, sem debuffs ou bônus temporários.
 * Capturado no nascimento: ganhar um upgrade durante a luta nunca cura o chefe.
 * O leque inteiro não acerta um alvo pequeno, mas chefes grandes recebem mais. */
export function playerPower(p, boss = false) {
  if (!p || p.dead) return 0;
  const num = (v, fallback = 0) => Number.isFinite(v) ? Math.max(0, v) : fallback;
  const size = Math.max(1, num(p.sizeMul, 1));
  const damage = (num(p.dmg, 1) * Math.max(1, num(p.dmgMul, 1)) + num(p.dmgFlat)) * size;
  const critical = 1 + Math.min(1, num(p.crit)) * Math.max(0, num(p.critDmg, 2) - 1);
  const shots = 1 + (Math.min(12, Math.max(1, num(p.shots, 1))) - 1) * (boss ? 0.8 : 0.35);
  const interval = Math.max(0.06, num(p.cd, 0.9) / size);
  const splash = num(p.venom) + num(p.boom) * (boss ? 0.3 : 0.8) + num(p.thorns) * 0.3;
  const ultimate = 1 + Math.min(10, num(p.ultimate?.level)) * 0.025;
  const classBonus = (p.cls === 14 ? 1.25 : p.cls === 9 || p.cls === 15 ? 1.2 : 1.1) * ultimate;
  return Math.min(1000000, Math.max(1, damage * critical * shots / interval * classBonus + splash));
}

export function partyPower(players, boss = false) {
  return Math.max(1, (players || []).reduce((total, p) => total + playerPower(p, boss), 0));
}

export function scaledEnemyHp(def, wave, players, companions = 1) {
  const power = partyPower(players, !!def.boss);
  const w = Math.max(1, wave);
  if (def.boss) {
    const seconds = def.final ? 95 : 24 + actOf(w) * 3.5;
    const group = companions > 1 ? 0.72 : 1;
    const floor = def.hp * (1 + w * 0.035) * Math.pow(1.003, w - 1);
    return Math.ceil(Math.max(floor, power * seconds * group));
  }
  const floor = def.hp * enemyHpMul(w);
  // Sublinear scaling preserves the reward from a strong build on the horde.
  const adaptive = Math.pow(power, 0.82) * (0.5 + Math.min(1.6, w / 130)) * Math.sqrt(def.hp / 3);
  return Math.ceil(Math.max(floor, adaptive));
}

/** Ato (0-9) de uma onda. A onda 290 ainda é o ato 9, não o 10. */
export function actOf(wave) {
  return clamp(Math.floor((Math.max(1, wave) - 1) / ACT_LEN), 0, ACTS - 1);
}

/** Posição da onda dentro do ato (1-29). */
export function waveInAct(wave) {
  return ((Math.max(1, wave) - 1) % ACT_LEN) + 1;
}

/** Multiplicador de vida dos inimigos comuns. Linear + composto. */
export function enemyHpMul(wave) {
  const n = Math.max(0, wave - 1);
  return (1 + 0.15 * n) * Math.pow(1.006, n);
}

/** Vida de chefe.

    Cresce mais rápido que a dos comuns porque o poder do JOGADOR é
    super-linear: ele soma projéteis, dano fixo, dano percentual, crítico e
    dano crítico ao mesmo tempo, e o produto disso tudo cresce muito mais que
    a soma. Um multiplicador só (`0,8 * enemyHpMul`, como era) deixava o chefe
    da onda 250 morrendo em 2 segundos.

    O expoente 1,3 é o que faz a curva sair quase igual à comum no começo
    (chefe da onda 5 com ~115 de vida) e abrir distância no fim (chefe final
    com ~210 mil). */
export function bossHpMul(wave) {
  return Math.pow(enemyHpMul(wave), 1.3) * 0.85;
}

/** Velocidade dos inimigos. COM TETO: +85%, alcançado na onda ~114.
    Depois disso a dificuldade vem de padrão de ataque, não de velocidade. */
export function enemySpdMul(wave) {
  return 1 + Math.min(0.85, 0.0075 * Math.max(0, wave - 1));
}

/** Dano de contato / de projétil inimigo, em corações. Sobe em degraus. */
export function enemyTouchDmg(wave) {
  const a = actOf(wave);
  if (a >= 7) return 2; // atos VIII-X
  if (a >= 4) return 1.5; // atos V-VII
  return 1;
}

/** Chance de um inimigo comum nascer "elite". */
export function eliteChance(wave) {
  if (wave < 2) return 0;
  return Math.min(0.35, 0.06 + wave * 0.006);
}

/** Quantos inimigos a onda tem. */
export function waveQuota(wave) {
  return Math.min(MAX_ENEMIES, 6 + Math.floor(wave * 1.05) + actOf(wave) * 6);
}

/** Intervalo entre nascimentos. Encurta bem mais que antes — sem isso uma run
    de 290 ondas passaria a maior parte do tempo esperando inimigo nascer. */
export function spawnInterval(wave) {
  return Math.max(0.16, 1.3 - wave * 0.025);
}

export function spawnBatch(wave) {
  return 1 + Math.min(7, Math.floor(Math.max(0, wave - 18) / 28));
}

/** Fragmentos e almas por onda limpa. */
export function waveSouls(wave) {
  return 3 + Math.round(wave * (1 + actOf(wave) * 0.1));
}

/* ---------------------------------------------------------------------------
   ATOS: tier de variante e cadência de chefe
   --------------------------------------------------------------------------- */

/** Tier MÁXIMO de variante liberado nesta onda.
    0 base · 1 veterano · 2 abissal · 3 infernal · 4 primordial · 5 corrompido

    Deriva da onda, não do ato, para não dar um salto seco na virada. Chega ao
    tier 5 no último ato. */
export function maxTier(wave) {
  return clamp(Math.floor((wave - 1) / 52), 0, 5);
}

/** Chance de um inimigo comum nascer já no tier máximo em vez de um abaixo. */
export function tierChance(wave) {
  const inBand = ((wave - 1) % 52) / 52;
  return 0.25 + inBand * 0.6;
}

/* Cadência de chefe DENTRO do ato: ondas 10 e 20 = mini-chefe, onda 29 = chefe
   do ato.

   Antes era `wave % 5 === 0`: 58 lutas de chefe em 290 ondas, com 8 chefes no
   elenco. Cada um apareceria 7 vezes e a luta deixava de ser evento. Agora são
   30 lutas, e a da onda 29 de cada ato é o clímax daquela era. */
export const MINI_BOSS_WAVES = [10, 20];
export const ACT_BOSS_WAVE = ACT_LEN; // 29

/** "mini" | "act" | null */
export function bossKind(wave) {
  const w = waveInAct(wave);
  if (w === ACT_BOSS_WAVE) return "act";
  if (MINI_BOSS_WAVES.includes(w)) return "mini";
  return null;
}

export function isBossWave(wave) {
  return bossKind(wave) !== null;
}

/** Quantos chefes nascem juntos. O ato final não brinca. */
export function bossCount(wave) {
  const kind = bossKind(wave);
  if (!kind) return 0;
  if (wave >= FINAL_WAVE) return 1; // o Devorador de Mundos vem sozinho
  const a = actOf(wave);
  if (kind === "act") return a >= 6 ? 3 : a >= 3 ? 2 : 1;
  if (waveInAct(wave) === 20) return a >= 4 ? 3 : a >= 1 ? 2 : 1;
  return a >= 6 ? 3 : a >= 3 ? 2 : 1;
}
