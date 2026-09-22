/* ================= REGRAS DO PVP (FASE 3) =================

   O PVP não é o modo normal com um segundo jogador hostil: é um jogo de
   progressão própria, e por isso os números dele moram aqui em vez de
   espalhados pelo core/config.js.

   O DESENHO, em uma frase: os dois começam fracos em pontas opostas de um mapa
   de 2800x2800, sobem de nível matando os inimigos que nascem no meio, e aos 20
   minutos o mapa fecha numa arena minúscula onde não dá mais para fugir.

   Por que a vida é 10 e não 3 como na campanha: com 3 de vida um encontro entre
   as duas cobras acabaria no primeiro encostão e a partida inteira seria
   decidida por quem viu o outro primeiro. Com 10 (e subindo por nível) existe
   troca de dano, existe recuo, e o escudo regenerativo vira uma decisão. */

/* --- vida e escudo --- */
export const PVP_HP = 10;
export const PVP_HP_PER_LEVEL = 1;
/* Escudo que volta sozinho depois de um tempo sem tomar dano. É o que permite
   brigar, recuar e voltar, em vez de a partida ser uma soma que só desce. */
export const GUARD_RECHARGE_DELAY = 6; // s sem tomar dano para começar a voltar
export const GUARD_RECHARGE_RATE = 4; // pontos de escudo por segundo

/* --- experiência ---
   Curva desenhada para ~30 níveis numa partida de 20 minutos: são 7 escolhas de
   poder (níveis 1, 5, 10, 15, 20, 25, 30), uma a cada ~3 minutos. */
export function xpToNext(level) {
  return Math.round(9 + level * 7);
}

/** Este nível dá uma carta? O primeiro dá; depois é de 5 em 5. */
export function levelGivesPower(level) {
  return level === 1 || level % 5 === 0;
}

/** Ganho de atributo POR NÍVEL. Pequeno de propósito: quem decide a partida é
    a carta a cada 5 níveis, o nível sozinho só impede que o atrasado fique
    sem chance nenhuma. */
export const LEVEL_GAIN = {
  maxHp: PVP_HP_PER_LEVEL,
  dmgMul: 0.06,
  cdMul: 0.985,
  range: 4,
  guardMax: 0.6,
};

/* --- inimigos que ficam mais fortes com o relógio ---
   O stack é o relógio da partida virando pressão: mais vida, mais xp e mais
   bicho na tela. Sem isso, o jogador que subisse de nível primeiro limparia o
   mapa sozinho e o outro nunca mais alcançaria. */
export const STACK_EVERY = 40; // segundos por stack
export const STACK_MAX = 28;

export function stackHpMul(stacks) {
  return 1 + 0.2 * stacks;
}
export function stackXpMul(stacks) {
  return 1 + 0.14 * stacks;
}
/** Intervalo entre nascimentos, em segundos. Começa lento e aperta. */
export function stackSpawnInterval(stacks) {
  return Math.max(0.35, 2.4 * Math.pow(0.93, stacks));
}
/** Teto de inimigos vivos ao mesmo tempo — sem ele o mapa vira sopa. */
export function stackEnemyCap(stacks) {
  return Math.min(70, 14 + stacks * 2);
}

/* A "onda virtual": o PVP não tem ondas, mas TODO o escalonamento do jogo
   (vida, velocidade, tiers de variante, paleta do ato) é função da onda. Em
   vez de duplicar essas quatro curvas, o relógio da partida é convertido numa
   onda e o resto do motor continua funcionando sem saber que está num PVP.
   20 minutos = onda ~120, ou seja o ato V. */
export function virtualWave(secs) {
  return Math.max(1, Math.min(145, 1 + Math.floor(secs / 10)));
}

/* --- morte súbita --- */
export const MATCH_SECS = 20 * 60; // 20 minutos
/* A arena de morte súbita, em CÉLULAS. Ela encolhe a cada `SHRINK_EVERY`
   segundos até o mínimo: mesmo dois jogadores que se evitam acabam colados. */
export const ARENA_W = 26;
export const ARENA_H = 18;
export const ARENA_MIN = 9;
export const SHRINK_EVERY = 20;

/* --- itens (as "ativas" extras do PVP) ---
   O pedido foi: "habilidades ativas ou itens que bloqueiam dano ou soltam um
   ataque poderoso". Cada jogador carrega UM item, escolhido como carta, e usa
   com a própria tecla — J1 com Q, J2 com ponto. */
export const ITEMS = {
  egide: {
    id: "egide", ic: "🛡️", n: "Égide Prismática", cd: 22,
    d: "bloqueia TODO dano por 2,5s",
  },
  meteoro: {
    id: "meteoro", ic: "☄️", n: "Meteoro", cd: 18,
    d: "chama um meteoro na cabeça do oponente",
  },
  nova: {
    id: "nova", ic: "💥", n: "Nova de Choque", cd: 16,
    d: "explosão em volta: dano alto e empurrão",
  },
  piscada: {
    id: "piscada", ic: "🌀", n: "Piscada", cd: 10,
    d: "teleporta 7 células à frente, atravessando tudo",
  },
  elixir: {
    id: "elixir", ic: "🧪", n: "Elixir Carmesim", cd: 26,
    d: "cura 45% da vida máxima na hora",
  },
};
