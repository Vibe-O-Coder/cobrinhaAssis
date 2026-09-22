/* ================= MODOS DE DIFICULDADE =================

   O difícil veio pronto do pedido:
     "começa com metade das vidas, toma +0.5 de dano (ou seja pode ficar com
      meio coração), e não pode encostar na própria cauda ou toma 2 de dano"

   O impossível foi construído por cima dele procurando o que ainda NÃO estava
   sendo testado no difícil. Aumentar número (mais vida, mais dano) não torna
   nada mais interessante — o que muda a partida é tirar recurso e mudar
   comportamento:

     - todo inimigo nasce com um afixo, e os de tier alto com dois: você nunca
       enfrenta "só um corredor", enfrenta um corredor que faz alguma coisa;
     - a cura vale metade, então errar não é mais reversível de graça;
     - a própria cauda mata 4, não 2 — a cobra comprida vira o inimigo principal;
     - chefe enfurece aos 75% de vida em vez de 50%, então a fase perigosa da
       luta é quase a luta inteira. */

export const MODES = [
  {
    id: "normal",
    n: "NORMAL",
    ic: "🙂",
    d: "A experiência completa. 290 ondas, 10 atos.",
    hpMul: 1,
    dmgTaken: 0, // somado ao dano do inimigo
    tailDmg: 0, // 0 = pode atravessar a própria cauda
    healMul: 1,
    affixBonus: 0, // afixos extras por inimigo
    enrageAt: 0.5,
    enemySpd: 1,
    poisonMul: 1,
    soulMul: 1,
  },
  {
    id: "hard",
    n: "DIFÍCIL",
    ic: "😠",
    d: "Metade da vida, +0,5 de dano recebido, e a própria cauda machuca.",
    hpMul: 0.5,
    dmgTaken: 0.5,
    tailDmg: 2,
    healMul: 1,
    affixBonus: 1,
    enrageAt: 0.6,
    enemySpd: 1.08,
    poisonMul: 1.4,
    soulMul: 1.6,
  },
  {
    id: "impossible",
    n: "IMPOSSÍVEL",
    ic: "💀",
    d: "Todo inimigo com afixo, cura pela metade, e a cauda tira 4.",
    hpMul: 0.5,
    dmgTaken: 0.5,
    tailDmg: 4,
    healMul: 0.5,
    affixBonus: 2,
    enrageAt: 0.75,
    enemySpd: 1.16,
    poisonMul: 1.8,
    soulMul: 2.5,
  },
];

export const MODE_BY_ID = new Map(MODES.map((m) => [m.id, m]));

/** Sempre devolve um modo válido — save antigo ou id desconhecido cai no normal. */
export function modeDef(id) {
  return MODE_BY_ID.get(id) || MODES[0];
}

/** Atalho usado pelo código de jogo: `MODE()` é o modo da run em andamento. */
export let CURRENT = MODES[0];

export function setMode(id) {
  CURRENT = modeDef(id);
  return CURRENT;
}

export function MODE() {
  return CURRENT;
}
