/* ================= CLASSES ================= */

export const CLASSES = [
  {
    name: "Guerreiro",
    ic: "⚔️",
    color: "#ff5252",
    hp: 6,
    dmg: 1.0,
    cd: 0.9,
    spd: 140,
    abCd: 6,
    ab: "Giro Mortal",
    desc: "Tanque de guerra. Onda de choque que empurra e destrói ao redor.",
    pass: "Passiva: +2 HP",
  },
  {
    name: "Mago",
    ic: "🔮",
    color: "#7c6bff",
    hp: 4,
    dmg: 1.5,
    cd: 0.7,
    spd: 140,
    abCd: 5,
    ab: "Nova Arcana",
    desc: "Dano alto. Chuva de projéteis perfurantes em todas as direções.",
    pass: "Passiva: dano brutal",
  },
  {
    name: "Assassino",
    ic: "🗡️",
    color: "#4dffa6",
    hp: 3,
    dmg: 1.2,
    cd: 0.5,
    spd: 112,
    abCd: 4,
    ab: "Passo Sombrio",
    desc: "Veloz e letal. Teleporta deixando rastro de sombras e veneno.",
    pass: "Passiva: velocidade",
  },
  /* NERFADO. Era a classe mais forte do jogo por acumulação de cura:
     vórtice de 190px de raio + cura com 2 acertos + cura a cada 10 abates +
     comida envenenada virando CURA. Numa onda de 40 inimigos isso era cura
     praticamente ininterrupta. */
  {
    name: "Necromante",
    ic: "💀",
    color: "#b04dff",
    hp: 3,
    dmg: 0.95,
    cd: 0.85,
    spd: 140,
    abCd: 11,
    ab: "Colheita Sombria",
    desc: "Vórtice que drena vida. Só cura se acertar 3 ou mais.",
    pass: "Passiva: cura a cada 14 abates",
  },
  {
    name: "Paladino",
    ic: "🛡️",
    color: "#ffd75e",
    hp: 5,
    dmg: 0.9,
    cd: 0.9,
    spd: 145,
    abCd: 9,
    ab: "Égide Divina",
    desc: "Aura dourada: invencível por 3,5s e empurra quem chegar perto.",
    pass: "Passiva: cura ao comer",
  },
  /* BUFFADO. A passiva de 1,2 de explosão era menos que UMA carta de
     Detonação (1,6), então a identidade da classe valia menos que um
     upgrade comum; e a bomba de 110px de raio com 5 de dano não limpava
     nem um aglomerado pequeno. */
  {
    name: "Bombardeiro",
    ic: "💣",
    color: "#ff9838",
    hp: 5,
    dmg: 1.1,
    cd: 0.8,
    spd: 135,
    abCd: 4.5,
    ab: "Bomba Ambulante",
    desc: "Bomba gigante com alerta de área. Mortes já explodem sozinhas.",
    pass: "Passiva: mortes explodem (forte)",
  },

  /* ===================================================================
     CLASSES 7 a 16

     A regra que guiou o desenho: cada uma tem que mudar COMO você joga, não
     só os números. Se a classe nova é "o guerreiro com mais dano", ela não
     precisa existir. Por isso cada uma mexe num recurso diferente —
     o tamanho da cobra, o corpo como arma, o tempo, o controle.
     =================================================================== */

  {
    name: "Berserker", ic: "🪓", color: "#c0392b",
    hp: 8, dmg: 1.35, cd: 1.25, spd: 150, abCd: 16,
    ab: "Fúria Cega",
    desc: "Couro grosso e machadada lenta. A ativa te deixa imortal — e sem volante.",
    pass: "Passiva: +2 HP e dano alto",
  },
  {
    name: "Centauro", ic: "🏹", color: "#d4a017",
    hp: 5, dmg: 1.15, cd: 0.8, spd: 138, abCd: 18,
    ab: "Recomposição",
    desc: "Consome um segmento a cada 1,4s. Recomposição recupera até 4 e causa dano em área.",
    pass: "Passiva: o corpo vira munição",
  },
  {
    name: "Criomante", ic: "❄️", color: "#6ee7ff",
    hp: 4, dmg: 1.0, cd: 0.75, spd: 142, abCd: 9,
    ab: "Zero Absoluto",
    desc: "Cada tiro congela um pouco. A ativa trava tudo em volta no lugar.",
    pass: "Passiva: tiros desaceleram",
  },
  {
    name: "Hidra", ic: "🐉", color: "#2ecc71",
    hp: 5, dmg: 0.7, cd: 0.9, spd: 145, abCd: 11,
    ab: "Brotar",
    desc: "Dano fraco, mas o corpo cria cabeças que atiram sozinhas.",
    pass: "Passiva: cabeça extra a cada 6 comidas",
  },
  {
    name: "Cascavel", ic: "🐍", color: "#e67e22",
    hp: 3, dmg: 1.0, cd: 0.45, spd: 134, abCd: 10,
    ab: "Chocalho",
    desc: "Frágil e rápida no gatilho. A cauda empurra quem vem por trás.",
    pass: "Passiva: +alcance e repulsão na cauda",
  },
  {
    name: "Espectral", ic: "👻", color: "#a29bfe",
    hp: 3, dmg: 1.0, cd: 0.7, spd: 120, abCd: 10,
    ab: "Fase Ectoplasmática",
    desc: "Recebe mais dano, mas quem toca seu corpo fica amaldiçoado.",
    pass: "Passiva: corpo amaldiçoa (dobro de dano)",
  },
  {
    name: "Glutão", ic: "🍖", color: "#e84393",
    hp: 6, dmg: 0.9, cd: 0.95, spd: 143, abCd: 10,
    ab: "Banquete",
    desc: "Quanto maior, mais forte — mas digere e encolhe sozinho o tempo todo.",
    pass: "Passiva: força vem do tamanho",
  },
  {
    name: "Engenheiro", ic: "🔧", color: "#95a5a6",
    hp: 5, dmg: 0.95, cd: 0.95, spd: 140, abCd: 12,
    ab: "Torre Pesada",
    desc: "Deixa torres pelo mapa. Elas atiram por você enquanto você foge.",
    pass: "Passiva: torre automática a cada 12s",
  },
  {
    name: "Tempestade", ic: "⛈️", color: "#74b9ff",
    hp: 4, dmg: 1.05, cd: 0.7, spd: 141, abCd: 10,
    ab: "Trovoada",
    desc: "Os tiros saltam entre inimigos. Em aglomerado, ela é a melhor do jogo.",
    pass: "Passiva: raio em cadeia",
  },
  {
    name: "Cronomante", ic: "⏳", color: "#dfe6e9",
    hp: 4, dmg: 1.0, cd: 0.8, spd: 140, abCd: 15,
    ab: "Retroceder",
    desc: "Desacelera quem chega perto. A ativa te devolve ao que você era há 3s.",
    pass: "Passiva: campo de lentidão",
  },
];

/* Paleta de cores da cobra escolhível no menu. */
export const PALETTE = [
  "#ff5252", "#ff9838", "#ffd75e", "#7dff5e",
  "#4dffa6", "#6ee7ff", "#4dc3ff", "#7c6bff",
  "#b04dff", "#ff2e88", "#ff6ec7", "#e8e2ff",
];

/* Modificadores sorteados por onda. */
export const MODS = [
  { id: "none", n: "", d: "" },
  { id: "fast", n: "⚡ ONDA VELOZ", d: "inimigos 25% mais rápidos" },
  { id: "tank", n: "🗿 ONDA TANQUE", d: "inimigos com +60% de vida" },
  { id: "swarm", n: "👾 ENXAME", d: "muitos inimigos, porém frágeis" },
  { id: "rage", n: "🔥 FÚRIA", d: "atiradores mais agressivos" },
  { id: "gold", n: "✨ CHUVA DOURADA", d: "comida dourada em abundância" },
];
