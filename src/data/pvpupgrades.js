/* ================= CARTAS DO PVP (FASE 3) =================

   Baralho PRÓPRIO. As cartas da campanha não servem aqui por dois motivos
   concretos:

   - Metade delas fala de inimigo ("execução abaixo de 25%", "almas em dobro",
     "+1 coração a cada 8 maçãs"). Num duelo de 20 minutos isso é carta morta.
   - As da campanha são calibradas contra uma vida de inimigo que cresce 250x.
     Aqui o alvo tem 10 de vida e sobe ~1 por nível: "+25% de dano" oito vezes
     seguidas, que na campanha é um começo de build, aqui mataria o oponente
     antes de ele escolher a segunda carta.

   Então o baralho do PVP é curto, plano, e tem quatro famílias que só existem
   aqui: dano CONTRA jogador, resistência CONTRA jogador, escudo regenerativo,
   e os ITENS — a "ativa extra" que o dono do projeto pediu, com tecla própria.

   O formato é o mesmo de data/upgrades.js (id/max/req/when/cap/sum/f), de
   propósito: game/picks.js sorteia dos dois baralhos com o mesmo código. */

import { ITEMS } from "./pvp.js";

const n1 = (v) => String(Math.round(v * 10) / 10).replace(".", ",");

/* Um item por jogador: a carta de item só aparece para quem ainda não tem.
   Sem isso o quinto nível trocaria a Égide por um Elixir e a decisão de
   montar a build em volta do item perderia o sentido. */
const semItem = (p) => !p.item;

function itemCard(key, max, extra) {
  const it = ITEMS[key];
  return {
    id: "i_" + it.id,
    ic: it.ic,
    n: it.n,
    d: "🎒 ITEM (tecla própria) — " + it.d + " · " + it.cd + "s",
    max: 1,
    when: semItem,
    sum: () => "🎒 " + it.d + " (recarga " + it.cd + "s)",
    f: (p) => {
      p.item = { ...it };
      p.itemT = 0;
    },
    ...extra,
  };
}

export const PVP_UPGRADES = [
  /* ---------------- dano ---------------- */
  {
    id: "p_presa", ic: "🗡️", n: "Presa Afiada", d: "+30% de dano", max: 8,
    sum: (l) => "+" + l * 30 + "% de dano",
    f: (p) => (p.dmgMul += 0.3),
  },
  {
    id: "p_frenesi", ic: "⚡", n: "Frenesi", d: "Ataque 15% mais rápido", max: 6,
    cap: (p) => p.cd <= Math.max(0.12,p.cdBase * 0.3),
    sum: (l) => "ataque " + Math.round((1 - Math.pow(0.85, l)) * 100) + "% mais rápido",
    f: (p) => (p.cd = Math.max(0.1, p.cd * 0.85)),
  },
  {
    id: "p_salva", ic: "🔱", n: "Salva Tripla", d: "+1 projétil por ataque", max: 3,
    sum: (l) => "+" + l + " projétil(is) por ataque",
    f: (p) => (p.shots += 1),
  },
  {
    id: "p_olho", ic: "🎯", n: "Olho Certeiro", d: "+12% de chance crítica", max: 5,
    cap: (p) => p.crit >= 1,
    sum: (l) => "+" + l * 12 + "% de chance crítica",
    f: (p) => (p.crit = Math.min(1, p.crit + 0.12)),
  },
  {
    id: "p_brutal", ic: "✦", n: "Golpe Brutal", d: "+80% de dano crítico", max: 5,
    req: ["p_olho"],
    sum: (l) => "+" + l * 80 + "% de dano crítico",
    f: (p) => (p.critDmg += 0.8),
  },
  {
    id: "p_perfura", ic: "🏹", n: "Flecha Perfurante", d: "+1 perfuração", max: 2,
    sum: (l) => "+" + l + " de perfuração",
    f: (p) => (p.pierce += 1),
  },
  {
    id: "p_alcance", ic: "📏", n: "Visão Longa", d: "+18% de alcance", max: 5,
    sum: (l) => "+" + Math.round((Math.pow(1.18, l) - 1) * 100) + "% de alcance",
    f: (p) => (p.range *= 1.18),
  },

  /* ---------------- guerra entre cobras ----------------
     As quatro cartas que NÃO existem na campanha: elas só olham para o outro
     jogador. São o que faz a build de PVP divergir da de PVE já na 2ª escolha. */
  {
    id: "p_cacador", ic: "🐍", n: "Caçador de Serpentes",
    d: "+35% de dano CONTRA o outro jogador", max: 5,
    sum: (l) => "+" + l * 35 + "% de dano contra jogadores",
    f: (p) => (p.pvpDmg += 0.35),
  },
  {
    id: "p_escamas", ic: "🪖", n: "Escamas de Ferro",
    d: "-15% de dano recebido do outro jogador", max: 4,
    sum: (l) => "-" + Math.round((1 - Math.pow(0.85, l)) * 100) + "% de dano de jogador",
    f: (p) => (p.pvpRes *= 0.85),
  },
  {
    id: "p_espinho", ic: "🌵", n: "Coroa de Espinhos",
    d: "Quem encostar no seu corpo leva 3 de dano", max: 4,
    sum: (l) => "quem encosta no seu corpo leva " + l * 3 + " de dano",
    f: (p) => (p.thorns += 3),
  },
  {
    id: "p_sangue", ic: "🩸", n: "Sede de Sangue",
    d: "7% de chance de curar 1 ao acertar", max: 3,
    sum: (l) => Math.min(21, l * 7) + "% de chance de curar ao acertar",
    f: (p) => (p.ls = Math.min(0.21, p.ls + 0.07)),
  },

  /* ---------------- defesa ---------------- */
  {
    id: "p_barreira", ic: "🛡️", n: "Barreira Prismática",
    d: "+6 de escudo máximo (volta sozinho)", max: 6,
    sum: (l) => "+" + l * 6 + " de escudo máximo",
    f: (p) => (p.guardMax += 6),
  },
  {
    id: "p_recarga", ic: "🔋", n: "Núcleo Instável",
    d: "Escudo volta 45% mais rápido", max: 3,
    req: ["p_barreira"],
    sum: (l) => "escudo volta " + Math.round((Math.pow(1.45, l) - 1) * 100) + "% mais rápido",
    f: (p) => (p.guardRate *= 1.45),
  },
  {
    id: "p_vital", ic: "❤️", n: "Vitalidade", d: "+4 de vida máxima (e cura 4)", max: 8,
    sum: (l) => "+" + l * 4 + " de vida máxima",
    f: (p) => { p.maxHp += 4; p.hp = Math.min(p.maxHp, p.hp + 4); },
  },
  {
    id: "p_reflexo", ic: "💫", n: "Reflexo Felino",
    d: "+0,12s de invulnerabilidade depois de apanhar", max: 3,
    sum: (l) => "+" + n1(l * 0.12) + "s de invulnerabilidade",
    f: (p) => (p.pvpIfBonus += 0.12),
  },
  {
    id: "p_nevoa", ic: "🌫️", n: "Pele de Névoa",
    d: "12% de chance de ignorar um golpe", max: 3,
    sum: (l) => Math.min(36, l * 12) + "% de chance de ignorar um golpe",
    f: (p) => (p.dodge = Math.min(0.36, p.dodge + 0.12)),
  },

  /* ---------------- mobilidade e economia ---------------- */
  {
    id: "p_ligeiro", ic: "👟", n: "Ligeireza", d: "+8% de velocidade", max: 6,
    cap: (p) => p.spd <= 105,
    sum: (l) => "+" + Math.round((1 - Math.pow(0.92, l)) * 100) + "% de velocidade",
    f: (p) => (p.spd = Math.max(105, p.spd * 0.92)),
  },
  {
    id: "p_sabedoria", ic: "📖", n: "Sabedoria Ancestral", d: "+25% de experiência", max: 4,
    sum: (l) => "+" + l * 25 + "% de experiência",
    f: (p) => (p.xpMul += 0.25),
  },
  {
    id: "p_ima", ic: "🧲", n: "Chamado da Experiência",
    d: "Atrai a experiência de longe (+90px por nível)", max: 3,
    sum: (l) => "atrai experiência num raio de " + (105 + l * 90) + "px",
    f: (p) => { p.magnet = true; p.magnetR = p.magnetR + 90; },
  },
  {
    id: "p_ceifa", ic: "💀", n: "Ceifador", d: "Cura 1 a cada 6 abates", max: 3,
    sum: (l) => "cura 1 a cada " + Math.max(2, 6 - (l - 1) * 2) + " abates",
    f: (p) => (p.killHeal = p.killHeal ? Math.max(2, p.killHeal - 2) : 6),
  },

  /* ---------------- itens ---------------- */
  itemCard("egide"),
  itemCard("meteoro"),
  itemCard("nova"),
  itemCard("piscada"),
  itemCard("elixir"),
  {
    id: "p_relojoaria", ic: "⏱️", n: "Relojoaria",
    d: "Seu item recarrega 25% mais rápido", max: 3,
    when: (p) => !!p.item,
    sum: (l) => "item recarrega " + Math.round((1 - Math.pow(0.75, l)) * 100) + "% mais rápido",
    f: (p) => (p.itemCdMul *= 0.75),
  },

  /* ---------------- transbordo ----------------
     Rede de segurança: numa partida longa os `max` acabam, e um sorteio sem
     cartas disponíveis travaria a escolha de nível. */
  {
    id: "p_essencia", ic: "🔮", n: "Essência da Serpente",
    d: "+10% de dano e +2 de vida máxima",
    max: Infinity, overflow: true,
    sum: (l) => "+" + l * 10 + "% de dano e +" + l * 2 + " de vida máxima",
    f: (p) => { p.dmgMul += 0.1; p.maxHp += 2; p.hp = Math.min(p.maxHp, p.hp + 2); },
  },
];
