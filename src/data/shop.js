/* ================= LOJA DE ALMAS =================
   Melhorias permanentes entre runs, pagas com 💜 Almas. */

import { shopPrice } from "./economy.js";

export const SHOP = [
  { k: "vit", ic: "❤️", n: "Vitalidade", d: "+1 HP inicial por nível", max: 5, c: (l) => 40 + l * 40 },
  { k: "frc", ic: "⚔️", n: "Força Sombria", d: "+8% de dano por nível", max: 5, c: (l) => 50 + l * 45 },
  { k: "vlt", ic: "⚡", n: "Voltagem", d: "+6% vel. de ataque por nível", max: 5, c: (l) => 50 + l * 45 },
  { k: "srt", ic: "💰", n: "Avareza", d: "+15% de almas por nível", max: 5, c: (l) => 40 + l * 35 },
  { k: "esc", ic: "🛡️", n: "Escudo Inicial", d: "Começa cada run com 1 escudo", max: 1, c: () => 150 },
  { k: "ben", ic: "🎁", n: "Benção Inicial", d: "Começa cada run com 1 poder aleatório", max: 1, c: () => 120 },
  { k: "ini", ic: "🎁", n: "Poderes Iniciais", d: "+1 poder aleatório no início por nível", max: 2, c: (l) => 150 + l * 100 },
  { k: "rev", ic: "🎲", n: "Segunda Chance", d: "Renasce 1 vez por run com 2 HP", max: 1, c: () => 300 },
  { k: "crt", ic: "🎯", n: "Instinto Crítico", d: "+5% de crítico por nível", max: 3, c: (l) => 90 + l * 60 },
  { k: "mag", ic: "🧲", n: "Magnetismo", d: "Começa com Ímã de Comida", max: 1, c: () => 180 },
  { k: "cur", ic: "🩹", n: "Primeiros Socorros", d: "Cura +1 HP por onda limpa por nível", max: 2, c: (l) => 160 + l * 120 },
  /* Economia da escolha (fase 2). A run de 290 ondas tem ~230 escolhas, e a
     diferença entre uma build boa e uma build sofrida é quantas vezes você
     conseguiu recusar as três cartas ruins. */
  { k: "rrl", ic: "🎲", n: "Rerrolagem", d: "+1 troca de cartas por run", max: 8, c: (l) => 120 + l * 110 },
  { k: "qrt", ic: "🃏", n: "Quarta Carta", d: "Uma 4ª opção em toda escolha", max: 1, c: () => 400 },
  { k:"reach",ic:"🔭",n:"Olhar do Explorador",d:"+20px de alcance inicial por nível",max:5,c:l=>180 },
  { k:"collector",ic:"🧲",n:"Coletor de Campo",d:"+25px no ímã inicial por nível (requer Magnetismo)",max:6,req:"mag",c:l=>200 },
  { k:"focus",ic:"⌛",n:"Disciplina",d:"Habilidade recarrega 3% mais rápido por nível",max:5,c:l=>250 },
  { k:"provisions",ic:"🍎",n:"Provisões",d:"+1 comida segura perto de cada jogador no início",max:5,c:l=>120 },
  { k: "ban", ic: "🚫", n: "Banimento", d: "+1 poder banido da run por nível", max: 5, c: (l) => 200 + l * 180 },
].map(item=>({...item,c:level=>shopPrice(item.c(0),level)}));

// Compras recorrentes: uma carga por run de campanha; nunca usadas no PVP.
export const SUPPLIES = [
 {k:'reroll',ic:'🎲',n:'Reserva de Rerrolagem',d:'+2 trocas de cartas na próxima run.',cost:1800},
 {k:'banish',ic:'🚫',n:'Selo de Banimento',d:'+1 banimento na próxima run.',cost:2400},
 {k:'blessing',ic:'🎁',n:'Bênção Engarrafada',d:'+1 poder inicial na próxima run.',cost:3200},
];
