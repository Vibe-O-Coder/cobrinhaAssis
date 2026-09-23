/* ================= ÁRVORE DE HABILIDADES (dados) =================
   9 constelações. Cada nó abre 3 caminhos compráveis. Só especializações sinalizadas
   são mutuamente exclusivas. Os nós são gerados por hash a partir do caminho
   (ver game/tree.js), com cinco camadas:
   3 filhos -> 9 netos -> 27 -> 81 -> 243 ...

   UNIDADES — todo campo de `treeB` é acumulado numa unidade só, e a conversão
   acontece uma única vez em finalizeTree():
     dmg, cd, spd, crit, range, souls, gold, ls .... PORCENTAGEM (0-100)
     dmgFlat, hp, pierce, shots, boom, venom,
     thorns, shield, regen, magnet ................ PONTOS
     iframe ....................................... SEGUNDOS

   Antes `ls` era escrito em duas escalas ao mesmo tempo (Vitalidade somava
   0.02 = "2%", Espírito somava 0.05*100 = 5), e finalizeTree limitava em 0.3.
   Resultado: a raiz de Espírito anunciava +5% de roubo de vida e entregava o
   teto de 30% instantaneamente. Agora é tudo porcentagem. */

export const TIERNAMES = [
  "Iniciado", "Aprendiz", "Adepto", "Veterano", "Mestre",
  "Grão-Mestre", "Ascendente", "Transcendente", "Mítico", "Primordial",
];

/** Profundidade máxima de cada constelação (sem contar a raiz). */
export const TREE_MAX_DEPTH = 5;

const pct = (m) => "+" + m + "%";

export const TREE_BASES = [
  {
    n: "Força", ic: "💪", d: "dano bruto",
    rootD: "+10% de dano",
    rootF: (p) => (p.treeB.dmg += 10),
    fx: [
      { m: 4, f: (p, m) => (p.treeB.dmg += m), d: (m) => pct(m) + " de dano" },
      { m: 0.3, f: (p, m) => (p.treeB.dmgFlat += m), d: (m) => "+" + m + " de dano fixo" },
      { m: 0.6, f: (p, m) => (p.treeB.thorns += m), d: (m) => "+" + m + " de espinhos" },
    ],
  },
  {
    n: "Agilidade", ic: "👟", d: "velocidade e reflexos",
    rootD: "movimento +8%",
    rootF: (p) => (p.treeB.spd += 8),
    fx: [
      { m: 3, f: (p, m) => (p.treeB.spd += m), d: (m) => "movimento " + pct(m) },
      { m: 3, f: (p, m) => (p.treeB.cd += m), d: (m) => "ataque " + pct(m) + " mais rápido" },
      { m: 0.08, f: (p, m) => (p.treeB.iframe += m), d: (m) => "+" + m + "s de invulnerabilidade" },
    ],
  },
  {
    n: "Vitalidade", ic: "❤️", d: "vida e sustentação",
    rootD: "+1 HP máximo",
    rootF: (p) => (p.treeB.hp += 1),
    fx: [
      { m: 0.6, f: (p, m) => (p.treeB.hp += m), d: (m) => "+" + m + " HP máximo" },
      { m: 0.5, f: (p, m) => (p.treeB.regen += m), d: (m) => "regeneração +" + m },
      { m: 2, f: (p, m) => (p.treeB.ls += m), d: (m) => pct(m) + " de roubo de vida" },
    ],
  },
  {
    n: "Arcano", ic: "🔮", d: "projéteis e alcance",
    rootD: "alcance +25%",
    rootF: (p) => (p.treeB.range += 25),
    fx: [
      { m: 0.25, f: (p, m) => (p.treeB.shots += m), d: (m) => "+" + m + " projéteis" },
      { m: 0.3, f: (p, m) => (p.treeB.pierce += m), d: (m) => "+" + m + " perfuração" },
      { m: 8, f: (p, m) => (p.treeB.range += m), d: (m) => pct(m) + " de alcance" },
    ],
  },
  {
    n: "Sorte", ic: "🍀", d: "crítico e tesouros",
    rootD: "crítico +5%",
    rootF: (p) => (p.treeB.crit += 5),
    fx: [
      { m: 2, f: (p, m) => (p.treeB.crit += m), d: (m) => pct(m) + " de crítico" },
      { m: 3, f: (p, m) => (p.treeB.gold += m), d: (m) => pct(m) + " de chance de comida dourada" },
      { m: 5, f: (p, m) => (p.treeB.souls += m), d: (m) => pct(m) + " de almas" },
    ],
  },
  {
    n: "Fúria", ic: "🔥", d: "agressão total",
    rootD: "ataque +8% mais rápido",
    rootF: (p) => (p.treeB.cd += 8),
    fx: [
      { m: 4, f: (p, m) => (p.treeB.cd += m), d: (m) => "ataque " + pct(m) + " mais rápido" },
      { m: 3, f: (p, m) => (p.treeB.dmg += m), d: (m) => pct(m) + " de dano" },
      { m: 0.6, f: (p, m) => (p.treeB.boom += m), d: (m) => "+" + m + " de explosão" },
    ],
  },
  {
    n: "Defesa", ic: "🛡️", d: "proteção",
    rootD: "+1 escudo por onda",
    rootF: (p) => (p.treeB.shield += 1),
    /* O teto de escudo subiu de 1 para 3 — antes TODO nó de escudo acima da
       raiz era um no-op pago, porque finalizeTree fazia floor(clamp(b,0,1)). */
    fx: [
      { m: 0.3, f: (p, m) => (p.treeB.shield += m), d: (m) => "+" + m + " escudos por onda" },
      { m: 0.8, f: (p, m) => (p.treeB.thorns += m), d: (m) => "+" + m + " de espinhos" },
      { m: 0.1, f: (p, m) => (p.treeB.iframe += m), d: (m) => "+" + m + "s de invulnerabilidade" },
    ],
  },
  {
    n: "Caos", ic: "☄️", d: "explosões e veneno",
    rootD: "explosões +1.5",
    rootF: (p) => (p.treeB.boom += 1.5),
    fx: [
      { m: 0.8, f: (p, m) => (p.treeB.boom += m), d: (m) => "+" + m + " de explosão" },
      { m: 0.5, f: (p, m) => (p.treeB.venom += m), d: (m) => "+" + m + " de veneno" },
      { m: 0.2, f: (p, m) => (p.treeB.shots += m), d: (m) => "+" + m + " projéteis" },
    ],
  },
  {
    n: "Espírito", ic: "👻", d: "drenagem e alma",
    rootD: "roubo de vida +5%",
    rootF: (p) => (p.treeB.ls += 5), // era 0.05*100 numa escala 0-1 => 6x o anunciado
    fx: [
      { m: 1.5, f: (p, m) => (p.treeB.ls += m), d: (m) => pct(m) + " de roubo de vida" },
      { m: 0.4, f: (p, m) => (p.treeB.regen += m), d: (m) => "regeneração +" + m },
      { m: 0.34, f: (p, m) => (p.treeB.magnet += m), d: (m) => "+" + m + " de magnetismo" },
    ],
  },
];

/** Campos de treeB e como são apresentados na tela da árvore. */
export const TREE_STAT_LABELS = {
  dmg: ["💪 dano", "%"],
  dmgFlat: ["🗡️ dano fixo", ""],
  cd: ["⚡ vel. de ataque", "%"],
  spd: ["👟 movimento", "%"],
  hp: ["❤️ HP máximo", ""],
  crit: ["🎯 crítico", "%"],
  pierce: ["🏹 perfuração", ""],
  shots: ["🔱 projéteis", ""],
  ls: ["🩸 roubo de vida", "%"],
  regen: ["💚 regeneração", ""],
  boom: ["💥 explosão", ""],
  venom: ["🧪 veneno", ""],
  range: ["🔭 alcance", "%"],
  souls: ["💜 almas", "%"],
  gold: ["🍀 comida dourada", "%"],
  shield: ["🛡️ escudos", ""],
  thorns: ["🌵 espinhos", ""],
  iframe: ["🪨 invulnerabilidade", "s"],
  magnet: ["🧲 magnetismo", ""],
};

// Quatro especializações, dois conflitos. Os outros 3.272 nós ficam livres.
export const MASTERIES = {
  '0-1-1-1-1-1': {name:'Canhão de Vidro',desc:'+18% de dano final, −10% de vida. Bloqueia Fortaleza Viva.',stat:'glass',conflict:'2-1-1-1-1-1'},
  '2-1-1-1-1-1': {name:'Fortaleza Viva',desc:'+2 HP; ataque 5% mais lento. Bloqueia Canhão de Vidro.',stat:'fortress',conflict:'0-1-1-1-1-1'},
  '3-1-1-1-1-1': {name:'Arsenal Vivo',desc:'+1 projétil; −8% dano por projétil. Bloqueia Precisão Absoluta.',stat:'volley',conflict:'4-1-1-1-1-1'},
  '4-1-1-1-1-1': {name:'Precisão Absoluta',desc:'+50% dano crítico; ataque 8% mais lento. Bloqueia Arsenal Vivo.',stat:'focus',conflict:'3-1-1-1-1-1'},
};
