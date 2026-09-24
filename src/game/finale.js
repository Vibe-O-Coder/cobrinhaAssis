import {FINAL_TRACKS} from '../data/soundtrack.js';

export function beginSurvival(boss) {
  boss.survival={elapsed:0,duration:FINAL_TRACKS[1].duration};
  boss.ward=1;boss.dot=0;boss.dotT=0;
}
export function survivalSection(survival) {
  const ratio=survival.elapsed/survival.duration;
  if(ratio<.18)return 0;
  if(ratio<.42)return 1;
  if(ratio<.64)return 2;
  if(ratio<.86)return 3;
  return 4;
}
export const SURVIVAL_SECTIONS=['A última luz','Chuva de mundos','Marés do vazio','Grade em ruptura','Ainda há um sinal'];

// Chamado apenas pelo host, uma vez por passo em velocidade normal.
// Funciona integralmente sem áudio, sem eventos ended ou acesso à internet.
export function advanceSurvival(boss,dt) {
  const s=boss?.survival;
  if(!s)return false;
  s.elapsed=Math.min(s.duration,s.elapsed+Math.max(0,dt));
  if(s.elapsed<s.duration)return false;
  boss.survival=null;
  boss.phaseLockT=0;
  boss.hp=boss.mhp*.33;
  boss.ward=0;
  return true;
}
export function survivalTime(s) {
  const left=Math.max(0,Math.ceil(s.duration-s.elapsed));
  return Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
}
