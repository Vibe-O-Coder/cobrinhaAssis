"use strict";
/* ================= DADOS DO JOGO ================= */
const CLASSES = [
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
    desc: "Tanque de guerra. Gira e destrói tudo ao redor.",
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
    desc: "Dano alto. Dispara uma chuva de 10 projéteis.",
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
    desc: "Veloz e letal. Teleporta pra frente ficando invulnerável.",
    pass: "Passiva: velocidade",
  },
  {
    name: "Necromante",
    ic: "💀",
    color: "#b04dff",
    hp: 3,
    dmg: 1.0,
    cd: 0.85,
    spd: 140,
    abCd: 9,
    ab: "Colheita Sombria",
    desc: "Drena inimigos próximos. Só cura se acertar 2 ou mais.",
    pass: "Passiva: cura a cada 10 abates",
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
    desc: "Fica invencível por 3 segundos.",
    pass: "Passiva: cura ao comer",
  },
  {
    name: "Bombardeiro",
    ic: "💣",
    color: "#ff9838",
    hp: 4,
    dmg: 1.1,
    cd: 0.8,
    spd: 135,
    abCd: 5,
    ab: "Bomba Ambulante",
    desc: "Solta uma bomba devastadora no chão.",
    pass: "Passiva: mortes explodem",
  },
];
/* ================= 30 PODERES ================= */
const UPGRADES = [
  { ic: "💪", n: "Força Bruta", d: "+25% de dano", f: (p) => (p.dmg *= 1.25) },
  {
    ic: "⚔️",
    n: "Fúria da Serpente",
    d: "+40% de dano e +5% de velocidade",
    f: (p) => {
      p.dmg *= 1.4;
      p.spd *= 0.95;
    },
  },
  {
    ic: "🗡️",
    n: "Lâmina Afiada",
    d: "+2 de dano fixo por projétil",
    f: (p) => (p.dmgFlat += 2),
  },
  {
    ic: "☄️",
    n: "Cometa",
    d: "+1 de dano fixo por projétil",
    f: (p) => (p.dmgFlat += 1),
  },
  {
    ic: "⚡",
    n: "Frenesi",
    d: "Ataque 20% mais rápido",
    f: (p) => (p.cd *= 0.8),
  },
  {
    ic: "🌪️",
    n: "Turbilhão",
    d: "Ataque 35% mais rápido",
    f: (p) => (p.cd *= 0.65),
  },
  {
    ic: "👟",
    n: "Passos Ligeiros",
    d: "Movimento 12% mais rápido",
    f: (p) => (p.spd = Math.max(70, p.spd * 0.88)),
  },
  {
    ic: "👻",
    n: "Passo Fantasma",
    d: "Movimento 18% mais rápido",
    f: (p) => (p.spd = Math.max(65, p.spd * 0.82)),
  },
  {
    ic: "🏹",
    n: "Tiro Perfurante",
    d: "Projéteis atravessam +1 inimigo",
    f: (p) => p.pierce++,
  },
  {
    ic: "🔱",
    n: "Tiro Múltiplo",
    d: "+1 projétil por ataque",
    f: (p) => p.shots++,
  },
  {
    ic: "🔭",
    n: "Alcance Arcano",
    d: "+40% de alcance de ataque",
    f: (p) => (p.range *= 1.4),
  },
  {
    ic: "🦅",
    n: "Olho da Águia",
    d: "+70% de alcance de ataque",
    f: (p) => (p.range *= 1.7),
  },
  {
    ic: "🩸",
    n: "Vampirismo",
    d: "Chance de roubar vida ao acertar",
    f: (p) => (p.ls += 0.12),
  },
  {
    ic: "🎯",
    n: "Olho Crítico",
    d: "+15% de chance de crítico (2x)",
    f: (p) => (p.crit += 0.15),
  },
  {
    ic: "💢",
    n: "Tiro Certeiro",
    d: "+25% de chance de crítico",
    f: (p) => (p.crit += 0.25),
  },
  {
    ic: "❤️",
    n: "Coração de Ferro",
    d: "+2 HP máximo e cura 2",
    f: (p) => {
      p.maxHp += 2;
      p.hp += 2;
    },
  },
  {
    ic: "💖",
    n: "Coração Valente",
    d: "+1 HP máximo e cura 1",
    f: (p) => {
      p.maxHp += 1;
      p.hp += 1;
    },
  },
  {
    ic: "📿",
    n: "Talismã da Sorte",
    d: "+1 HP máximo e +10% de crítico",
    f: (p) => {
      p.maxHp += 1;
      p.hp += 1;
      p.crit += 0.1;
    },
  },
  {
    ic: "🛡️",
    n: "Escudo Rúnico",
    d: "Bloqueia 1 dano (recarrega a cada onda)",
    f: (p) => {
      p.shieldBase++;
      p.shield++;
    },
  },
  {
    ic: "🧲",
    n: "Ímã de Comida",
    d: "A comida vem até você",
    f: (p) => (p.magnet = true),
  },
  {
    ic: "💚",
    n: "Regeneração",
    d: "Cura 1 HP a cada 6 comidas",
    f: (p) => (p.regenMax = p.regenMax ? 4 : 6),
  },
  {
    ic: "💞",
    n: "Regeneração Maior",
    d: "Regeneração fica mais forte (3 comidas)",
    f: (p) => (p.regenMax = p.regenMax ? 3 : 6),
  },
  {
    ic: "🧪",
    n: "Veneno Sombrio",
    d: "Seus tiros envenenam inimigos",
    f: (p) => (p.venom += 1.2),
  },
  {
    ic: "☣️",
    n: "Veneno Concentrado",
    d: "Veneno muito mais forte",
    f: (p) => (p.venom += 2.2),
  },
  {
    ic: "💥",
    n: "Detonação",
    d: "Inimigos mortos explodem",
    f: (p) => (p.boom += 1.6),
  },
  {
    ic: "☢️",
    n: "Detonação Maior",
    d: "Explosões mais fortes e maiores",
    f: (p) => {
      p.boom += 2;
      p.boomR += 25;
    },
  },
  {
    ic: "🌵",
    n: "Escama Espinhosa",
    d: "Inimigos que te tocam sofrem 2 de dano",
    f: (p) => (p.thorns += 2),
  },
  {
    ic: "⚰️",
    n: "Execução",
    d: "Golpes matam inimigos abaixo de 25% de HP",
    f: (p) => (p.exec = true),
  },
  {
    ic: "🥶",
    n: "Sangue Frio",
    d: "Cura 1 HP a cada 5 abates",
    f: (p) => (p.killHeal = 5),
  },
  {
    ic: "💰",
    n: "Ímã de Almas",
    d: "+40% de almas no fim da run",
    f: (p) => (p.soulMult += 0.4),
  },
  {
    ic: "🍀",
    n: "Sorte Dourada",
    d: "O dobro de comida dourada na arena",
    f: (p) => (p.goldLuck = true),
  },
  {
    ic: "🪨",
    n: "Pele de Pedra",
    d: "Invulnerabilidade pós-dano dura +0,7s",
    f: (p) => (p.iframeBonus += 0.7),
  },
];
/* ================= 10 RELÍQUIAS ================= */
const RELICS = [
  {
    ic: "👑",
    n: "Coroa Serpente",
    d: "Cura 2 HP ao fim de cada onda",
    f: (p) => (p.relicCrown = true),
  },
  { ic: "🗡️", n: "Presa do Caos", d: "+60% de dano", f: (p) => (p.dmg *= 1.6) },
  { ic: "🌌", n: "Olho do Vazio", d: "+2 projéteis", f: (p) => (p.shots += 2) },
  {
    ic: "🩸",
    n: "Sangue Antigo",
    d: "+3 HP máximo e cura tudo",
    f: (p) => {
      p.maxHp += 3;
      p.hp = p.maxHp;
    },
  },
  {
    ic: "☢️",
    n: "Núcleo Instável",
    d: "Explosões ao matar ficam enormes",
    f: (p) => {
      p.boom += 3;
      p.boomR += 35;
    },
  },
  {
    ic: "👟",
    n: "Botas de Hermes",
    d: "Movimento 25% mais rápido",
    f: (p) => (p.spd = Math.max(60, p.spd * 0.75)),
  },
  {
    ic: "🔥",
    n: "Coração de Dragão",
    d: "+5 HP máximo e cura tudo",
    f: (p) => {
      p.maxHp += 5;
      p.hp = p.maxHp;
    },
  },
  {
    ic: "🌵",
    n: "Coroa de Espinhos",
    d: "Inimigos que te tocam sofrem 4 de dano",
    f: (p) => (p.thorns += 4),
  },
  {
    ic: "🪦",
    n: "Pacto Sombrio",
    d: "+100% de dano, mas -2 HP máximo",
    f: (p) => {
      p.dmg *= 2;
      p.maxHp = Math.max(1, p.maxHp - 2);
      p.hp = Math.min(p.hp, p.maxHp);
    },
  },
  {
    ic: "💎",
    n: "Ídolo Dourado",
    d: "Almas da run em DOBRO",
    f: (p) => (p.soulMult *= 2),
  },
];
/* ================= LOJA ================= */
const SHOP = [
  {
    k: "vit",
    ic: "❤️",
    n: "Vitalidade",
    d: "+1 HP inicial por nível",
    max: 5,
    c: (l) => 40 + l * 40,
  },
  {
    k: "frc",
    ic: "⚔️",
    n: "Força Sombria",
    d: "+8% de dano por nível",
    max: 5,
    c: (l) => 50 + l * 45,
  },
  {
    k: "vlt",
    ic: "⚡",
    n: "Voltagem",
    d: "+6% vel. de ataque por nível",
    max: 5,
    c: (l) => 50 + l * 45,
  },
  {
    k: "srt",
    ic: "💰",
    n: "Avareza",
    d: "+15% de almas por nível",
    max: 5,
    c: (l) => 40 + l * 35,
  },
  {
    k: "esc",
    ic: "🛡️",
    n: "Escudo Inicial",
    d: "Começa cada run com 1 escudo",
    max: 1,
    c: (l) => 150,
  },
  {
    k: "ben",
    ic: "🎁",
    n: "Benção Inicial",
    d: "Começa cada run com 1 poder aleatório",
    max: 1,
    c: (l) => 120,
  },
  {
    k: "ini",
    ic: "🎁",
    n: "Poderes Iniciais",
    d: "+1 poder aleatório no início por nível",
    max: 2,
    c: (l) => 150 + l * 100,
  },
  {
    k: "rev",
    ic: "🎲",
    n: "Segunda Chance",
    d: "Renasce 1 vez por run com 2 HP",
    max: 1,
    c: (l) => 300,
  },
  {
    k: "crt",
    ic: "🎯",
    n: "Instinto Crítico",
    d: "+5% de crítico por nível",
    max: 3,
    c: (l) => 90 + l * 60,
  },
  {
    k: "mag",
    ic: "🧲",
    n: "Magnetismo",
    d: "Começa com Ímã de Comida",
    max: 1,
    c: (l) => 180,
  },
  {
    k: "cur",
    ic: "🩹",
    n: "Primeiros Socorros",
    d: "Cura +1 HP por onda limpa por nível",
    max: 2,
    c: (l) => 160 + l * 120,
  },
];
/* ================= INIMIGOS ================= */
const EDEF = {
  grunter: { hp: 3, spd: 55, r: 13, score: 2, c: "#ff5d7f" },
  runner: { hp: 2, spd: 112, r: 11, score: 2, c: "#ffd75e" },
  shooter: { hp: 4, spd: 40, r: 14, score: 3, c: "#4dc3ff" },
  tank: { hp: 14, spd: 26, r: 20, score: 5, c: "#ff9838" },
  splitter: { hp: 5, spd: 46, r: 14, score: 3, c: "#ff7bd5" },
  orbiter: { hp: 4, spd: 0, r: 10, score: 3, c: "#6ee7ff" },
  healer: { hp: 6, spd: 42, r: 13, score: 4, c: "#7dff5e" },
  charger: { hp: 6, spd: 55, r: 15, score: 4, c: "#ff9838" },
  sniper: { hp: 5, spd: 18, r: 13, score: 4, c: "#ffd75e" },
  mini: { hp: 2, spd: 95, r: 9, score: 1, c: "#ff7bd5" },
  boss: { hp: 70, spd: 38, r: 34, score: 25, c: "#ff2e88" },
  boss2: { hp: 80, spd: 34, r: 36, score: 30, c: "#b04dff" },
  boss3: { hp: 75, spd: 40, r: 32, score: 30, c: "#ff5252" },
  boss4: { hp: 70, spd: 30, r: 30, score: 30, c: "#7c6bff" },
};
