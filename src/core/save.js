/* ================= SAVE (localStorage) ================= */

import { hashStr } from "./utils.js";
import { LEGACY_FRAGMENT_RATE, legacyTreePrice } from "../data/economy.js";
import { TREE_MAX_DEPTH, MASTERIES } from "../data/tree.js";

const KEY = "srkUltra2";

const DEFAULT_UPG = {
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
  rrl: 0,
  qrt: 0,
  ban: 0,
  reach:0, collector:0, focus:0, provisions:0,
};

export const save = {
  /* Fase 2:
     mode   — dificuldade escolhida (normal | hard | impossible)
     acts   — maior ato JÁ VENCIDO; libera começar a run dele
     afk    — escolhe os poderes sozinho
     fast   — jogo em velocidade dobrada

     Fase 3:
     touch  — controles de toque: "auto" (decide pelo aparelho) | "on" | "off"
     pvpWins— vitórias no PVP, só para o menu ter o que mostrar */
  mode: "normal",
  acts: 0,
  afk: false,
  fast: false,
  speed: 1,
  art: 'vector',
  musicVolume: .3,
  startWave: 1,
  startPowers: 'random',
  touch: "auto",
  pvpWins: 0,
  souls: 0,
  economyVersion: 3,
  treeVersion: 2,
  supplies: {reroll:0,banish:0,blessing:0},
  treeSpent: {},
  best: 0,
  bestWave: 0,
  name: "",
  color: "",
  tree: [],
  wins: 0, // quantas vezes derrotou o Devorador de Mundos
  upg: { ...DEFAULT_UPG },
};

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const o = JSON.parse(raw);
    Object.assign(save, o);
    // Migração: um save antigo pode não ter todas as chaves de upgrade.
    save.upg = Object.assign({ ...DEFAULT_UPG }, o.upg || {});
    if (!Array.isArray(save.tree)) save.tree = [];
    save.supplies = {...{reroll:0,banish:0,blessing:0},...o.supplies};
    save.treeSpent = o.treeSpent || {};
    if ((o.economyVersion || 0) < 3) {
      save.souls += Math.max(0,Number(o.frags)||0) * LEGACY_FRAGMENT_RATE;
      // Caminhos antigos de dez camadas viram saldo, não compras inacessíveis.
      save.tree = [...new Set(save.tree)].filter(k=>{
        const depth=String(k).split("-").length-1;
        const oldCost=depth ? Math.round((6+depth*depth*5)*(1+((hashStr("srk"+k)>>5)%25)/50)) : 10;
        save.treeSpent[k] = Math.max(0,oldCost)*LEGACY_FRAGMENT_RATE;
        const tier=String(k).split("-").length-1;
        if(tier <= TREE_MAX_DEPTH) return true;
        save.souls += save.treeSpent[k]; delete save.treeSpent[k]; return false;
      });
    }
    // Devolve integralmente os níveis removidos, uma única vez.
    if((o.treeVersion||0)<2) {
      save.tree=[...new Set(save.tree)].filter(k=>{
        const depth=String(k).split('-').length-1;
        if(depth<=TREE_MAX_DEPTH)return true;
        save.souls+=Math.max(0,Number(save.treeSpent[k])||legacyTreePrice(depth));
        delete save.treeSpent[k];return false;
      });
    }
    save.treeVersion=2;
    const accepted = [];
    save.tree = save.tree.filter(k=>{
      if (MASTERIES[k] && accepted.includes(MASTERIES[k].conflict)) {
        save.souls += save.treeSpent[k] || 0; delete save.treeSpent[k]; return false;
      }
      accepted.push(k);return true;
    });
    delete save.frags;
    save.economyVersion=3;
    if (typeof save.wins !== "number") save.wins = 0;
    // migração de save da fase 1: os campos novos podem não existir
    if (typeof save.mode !== "string") save.mode = "normal";
    if (typeof save.acts !== "number") save.acts = 0;
    save.afk = !!save.afk;
    save.fast = !!save.fast;
    save.speed = [1,2,3,4,5,10,20].includes(o.speed) ? o.speed : o.fast ? 2 : 1;
    save.art = o.art === 'emoji' ? 'emoji' : 'vector';
    save.startWave = Math.max(1,Math.min(290,Math.round(Number(o.startWave)||1)));
    save.startPowers = o.startPowers === 'none' ? 'none' : 'random';
    save.musicVolume = Number.isFinite(o.musicVolume) ? Math.max(0,Math.min(1,o.musicVolume)) : .3;
    // migração de save da fase 2: os campos da fase 3 podem não existir
    if (!["auto", "on", "off"].includes(save.touch)) save.touch = "auto";
    if (typeof save.pvpWins !== "number") save.pvpWins = 0;
  }
} catch (e) {
  /* save corrompido: segue com os valores padrão */
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch (e) {
    /* modo anônimo / storage cheio */
  }
}

// Persiste a migração imediatamente: recarregar não reconverte o saldo.
persist();
