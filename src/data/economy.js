/* Custos ancorados na recompensa de ondas, sem inflação pelo saldo do jogador. */
import { waveSouls } from '../core/scaling.js';
export const LEGACY_FRAGMENT_RATE = 25;
export function treePrice(depth) {
  // Referências: começo, chefes dos atos I, II, IV, VII e X.
  const waves=[1,29,58,116,203,290], effort=[15,5,8,12,16,24];
  return Math.ceil(waveSouls(waves[depth])*effort[depth]/10)*10;
}
export function shopPrice(base,level) {
  return Math.ceil((base + waveSouls(Math.min(290,1+level*29))*2)*Math.pow(1.55,level)/10)*10;
}
