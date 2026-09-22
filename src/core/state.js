/* ================= ESTADO COMPARTILHADO =================
   Módulos ES não deixam um arquivo reatribuir a variável de outro
   (`import { wave }` é uma ligação só-leitura). Então tudo que muda durante a
   partida vive dentro deste objeto: `S.wave = 3` funciona de qualquer módulo,
   `wave = 3` não funcionaria. */

export const S = {
  /* --- modo e papel --- */
  mode: "solo", // solo | local | online | pvp
  role: "solo", // solo | host | guest
  lastMode: "solo",
  phase: "menu", // menu | play | choice | over
  paused: false,
  runActive: false,

  /* --- overlays de leitura (poderes / status) ---
     Abrir um deles PAUSA o jogo. `ovPaused` lembra se foi o overlay que
     pausou, para o fechamento nao despausar uma pausa que ja existia. */
  ovActive: null, // "#powersOv" | "#statsOv" | null
  ovPaused: false,
  ovPauseWasOpen: false,

  /* --- entidades --- */
  players: [],
  enemies: [],
  pbullets: [],
  ebullets: [],
  foods: [],
  drops: [],
  blocks: [],
  bombs: [],
  parts: [],
  texts: [],
  effects: [],

  /* --- progresso da run --- */
  wave: 0,
  score: 0,
  kills: 0,
  runSouls: 0,
  combo: 0,
  comboT: 0,
  comboMax: 0,

  /* --- spawn --- */
  spawnQ: 0,
  spawnT: 0,
  bossLeft: 0,
  bossQueue: [], // chefes que ainda faltam nascer nesta onda
  waveBoss: "boss",
  waveMod: null,
  eid: 0,

  /* --- tempo / câmera / feedback --- */
  gameT: 0,
  foodT: 0,
  shake: 0,
  flash: 0,
  cam: { x: 0, y: 0 },
  /* PVP local desenha DUAS janelas: os jogadores nascem em pontas opostas de
     um mapa de 2800x2800 e uma câmera só nunca enquadra os dois. `cam` continua
     sendo a câmera do modo normal; `cams[i]` é a da metade do jogador i. */
  cams: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],

  /* --- escolha de poder --- */
  pickState: null,
  rerolls: 0, // trocas de carta restantes nesta run
  banishes: 0, // banimentos restantes
  banished: [], // ids que não aparecem mais nesta run

  /* --- rede --- */
  net: null,
  roomCode: "",
  hostCls: 0,
  guestCls: -1,
  guestJoined: false,
  netTimer: null,
  transportLabel: "",
  netMode: "online",
  stateSeq: 0,
  inputSeq: 0,
  pingMs: null,
  rs: null, // último estado recebido (convidado)
  gPrev: { wave: 0, hp: 0, paused: false },

  /* --- PVP (fase 3) ---
     `pvpLocal` liga a tela dividida (dois jogadores, um teclado). No PVP online
     cada lado enxerga a própria tela inteira, então ele fica false.
     `pvp` guarda o relógio da partida, os stacks de buff dos inimigos e o
     vencedor — a forma completa está em game/pvp.js. */
  pvpLocal: false,
  pvp: null,

  /* --- fim de jogo --- */
  victory: false,
};

/** Zera tudo que pertence a uma run (mantém rede e configuração). */
export function resetRun() {
  S.players = [];
  S.enemies = [];
  S.pbullets = [];
  S.ebullets = [];
  S.foods = [];
  S.drops = [];
  S.blocks = [];
  S.bombs = [];
  S.parts = [];
  S.texts = [];
  S.effects = [];
  S.wave = 0;
  S.score = 0;
  S.kills = 0;
  S.runSouls = 0;
  S.combo = 0;
  S.comboT = 0;
  S.comboMax = 0;
  S.spawnQ = 0;
  S.spawnT = 0;
  S.bossLeft = 0;
  S.bossQueue = [];
  S.waveBoss = "boss";
  S.waveMod = null;
  S.shake = 0;
  S.flash = 0;
  S.foodT = 0;
  S.pickState = null;
  S.rerolls = 0;
  S.banishes = 0;
  S.banished = [];
  S.victory = false;
  S.rs = null;
  S.stateSeq = 0; S.inputSeq = 0;
  S.gPrev = { wave: 0, hp: 0, paused: false };
  S.ovActive = null;
  S.ovPaused = false;
  S.ovPauseWasOpen = false;
  S.pvp = null;
  S.pvpLocal = false;
  S.cams = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
}
