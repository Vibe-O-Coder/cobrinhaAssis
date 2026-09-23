/* ================= CONFIG =================
   Constantes de mundo e de balanceamento.
   Tudo que é "número mágico" do jogo mora aqui. */

export const TAU = Math.PI * 2;

/* --- Arena ---
   O mapa é grande de propósito, mas a câmera (render/camera.js) segue o jogador
   e desenha só o pedaço visível. Antes o canvas inteiro (2800x2100) era espremido
   em 960px de largura, o que deixava a cobra do tamanho de um pixel e o
   desenho absurdamente caro. */
export const COLS = 100;
export const ROWS = 100;
export const CELL = 28;
export const W = COLS * CELL; // 2800
export const H = ROWS * CELL; // 2800

/* --- Câmera ---
   Área efetivamente visível, em pixels de mundo. A câmera interpola até a cabeça
   do jogador (ou até o meio do grupo, no co-op). */
export const VIEW_W = 1120;
export const VIEW_H = 700;
export const CAM_LERP = 6; // quanto maior, mais "colada" no jogador

/* --- Ritmo das ondas ---
   O jogo vai até a onda 290: 10 atos de 29 ondas, um por ano desde que a
   cobrinha original saiu. O conteúdo de cada ato (bioma, roster, chefe) entra
   na fase 2 do roadmap; aqui ficam só as constantes de ritmo. */
export const ACT_LEN = 29;
export const ACTS = 10;
export const FINAL_WAVE = ACT_LEN * ACTS; // 290 — onda do chefe final

/* A cadencia de chefe e o tier de variante sairam daqui na fase 2: agora sao
   funcao do ATO, e moram em core/scaling.js (bossKind, maxTier). As quatro
   constantes que existiam aqui - BOSS_EVERY, VARIANT_EVERY, BOSS_TIER_EVERY e
   ELITE_BOSS_EVERY - foram removidas em vez de ficarem mentindo para quem
   lesse este arquivo. */

/* --- Tetos de atributo (anti-bola-de-neve) ---
   Sem isso a run vira "um monte de coisa voando por aí matando os bixo tudo".

   `critChance` agora é 100% de verdade: o que passar disso é convertido em
   DANO crítico por stats.js, então carta de taxa nunca mais é lixo — e para de
   aparecer no sorteio quando o teto é alcançado. */
export const CAPS = {
  critChance: 1.0, // 100%
  critDmgMax: 8, // 800% de dano crítico
  cooldownCut: 0.5, // no máximo metade do cooldown
  moveSpeedCut: 0.4,
  rangeBonus: 0.8, // +80% de alcance
  lifesteal: 0.22, // NERF do vampirismo (era 0.3)
  boom: 4,
  venom: 3,
  extraShots: 3,
  pierce: 2,
  treeHp: 6,
  thorns: 8,
};

/* Intervalo MÍNIMO entre dois passos da cobra, em ms.
   `p.spd` é esse intervalo, então menor = mais rápido. Antes as cartas de
   movimento tinham piso próprio (70 e 65 ms), o que dava ~14 células/s: a cobra
   corria mais que a comida do ímã e mais que a leitura do jogador. */
export const SNAKE_SPD_MIN = 105; // ~9,5 células/s
export const SNAKE_SPD_MAX = 220; // piso de lentidão (Berserker, gelo, etc.)

/* Rendimento decrescente: acima de `soft`, cada ponto extra vale metade.
   Usado no dano pra evitar o hitkill dos 20 minutos. */
export const DMG_SOFT_CAP = 0.5;

/* Dano crítico inicial: 200% = o "2x" que o jogo sempre teve. */
export const CRIT_DMG_BASE = 2;

/* --- Rede --- */
export const NET_TICK_MS = 50; // host manda estado 20x/s (era 10x/s com snapshot cheio)
export const NET_KEEPALIVE_MS = 2500;
export const NET_STALE_MS = 12000;
