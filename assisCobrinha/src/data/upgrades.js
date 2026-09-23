/* ================= PODERES E RELÍQUIAS =================
   Ganhos DURANTE a run: a cada onda limpa o jogo sorteia 3 de UPGRADES;
   em onda de chefe, 3 de RELICS.

   ---------------------------------------------------------------------------
   O QUE MUDOU NESTA VERSÃO

   Antes cada poder era `{ic, n, d, f}` e o sorteio era `sample([...pool.keys()], 3)`
   — ou seja: nenhuma carta sabia quantas vezes já tinha sido comprada, nenhuma
   sabia se o atributo já estava no teto, e nenhuma dependia de outra. Numa run
   de 50 ondas isso passava; numa de 290 ondas (≈230 escolhas) não: você recebia
   "Ímã de Comida" pela décima vez (é booleano, não acumula nada), "Olho Crítico"
   depois de bater no teto de crítico, e "Veneno Concentrado" sem nunca ter
   pegado veneno nenhum.

   Agora cada poder declara:
     id   — chave estável (o contador do jogador é indexado por ela)
     max  — quantas vezes pode ser comprado; 1 = ÚNICO, sai do sorteio depois
     req  — ids obrigatórios antes de aparecer  (Veneno Concentrado <- Veneno)
     when — condição livre  (dano crítico só aparece se você TEM crítico)
     cap  — "o atributo já está no teto, não ofereça"
     sum  — descrição do TOTAL acumulado, para o menu consolidado mostrar
            "+2 projéteis por ataque [2x]" em vez de duas caixas iguais
   --------------------------------------------------------------------------- */

import { CAPS } from "../core/config.js";
import { HARD } from "../game/stats.js";
import { PVP_UPGRADES } from "./pvpupgrades.js";
import { ULTIMATE_UPGRADES } from "./ultimates.js";

/* Ajudantes de texto: viram o efeito acumulado em porcentagem legível.
   `mulPct` é para efeitos que ainda multiplicam (alcance); as cartas de dano
   passaram a SOMAR em p.dmgMul — ver o comentário em game/player.js. */
const mulPct = (f, l) => Math.round((Math.pow(f, l) - 1) * 100);
const cutPct = (f, l) => Math.round((1 - Math.pow(f, l)) * 100);
const s = (l, one, many) => (l === 1 ? one : many);
/* Vírgula decimal: o resto da UI usa "2,4" e só estas descrições saíam
   com "2.4" porque eram concatenação crua de número. */
const n1 = (v) => String(Math.round(v * 10) / 10).replace(".", ",");

/* Piso de intervalo entre passos, repetido aqui só para o `cap` das cartas de
   movimento poder perguntar "já está no teto?" sem importar o config inteiro. */
const SPD_FLOOR = 105;
const atkFloor = (p) => Math.max(HARD.atkCd, (p.cdBase || p.cd) * 0.3);

export const UPGRADES = [
  /* ---------------- dano ---------------- */
  {
    id: "forca", ic: "💪", n: "Força Bruta", d: "+25% de dano", max: 10,
    sum: (l) => "+" + l * 25 + "% de dano",
    f: (p) => (p.dmgMul += 0.25),
  },
  {
    id: "furia", ic: "⚔️", n: "Fúria da Serpente", d: "+40% de dano e +5% de velocidade", max: 6,
    sum: (l) => "+" + l * 40 + "% de dano e +" + cutPct(0.95, l) + "% de velocidade",
    f: (p) => { p.dmgMul += 0.4; p.spd *= 0.95; },
  },
  {
    id: "lamina", ic: "🗡️", n: "Lâmina Afiada", d: "+2 de dano fixo por projétil", max: 8,
    sum: (l) => "+" + l * 2 + " de dano fixo por projétil",
    f: (p) => (p.dmgFlat += 2),
  },
  {
    id: "cometa", ic: "☄️", n: "Cometa", d: "+1 de dano fixo por projétil", max: 10,
    sum: (l) => "+" + l + " de dano fixo por projétil",
    f: (p) => (p.dmgFlat += 1),
  },

  /* ---------------- velocidade de ataque ---------------- */
  {
    id: "frenesi", ic: "⚡", n: "Frenesi", d: "Ataque 20% mais rápido", max: 6,
    sum: (l) => "ataque " + cutPct(0.8, l) + "% mais rápido",
    cap: (p) => p.cd <= atkFloor(p) + 1e-6,
    f: (p) => (p.cd *= 0.8),
  },
  {
    id: "turbilhao", ic: "🌪️", n: "Turbilhão", d: "Ataque 35% mais rápido", max: 4,
    req: ["frenesi"],
    sum: (l) => "ataque " + cutPct(0.65, l) + "% mais rápido",
    cap: (p) => p.cd <= atkFloor(p) + 1e-6,
    f: (p) => (p.cd *= 0.65),
  },

  /* ---------------- movimento ---------------- */
  {
    id: "passos", ic: "👟", n: "Passos Ligeiros", d: "Movimento 12% mais rápido", max: 4,
    sum: (l) => "movimento " + cutPct(0.88, l) + "% mais rápido",
    cap: (p) => p.spd <= SPD_FLOOR + 1e-6,
    f: (p) => (p.spd *= 0.88),
  },
  {
    id: "fantasma", ic: "👻", n: "Passo Fantasma", d: "Movimento 18% mais rápido", max: 3,
    req: ["passos"],
    sum: (l) => "movimento " + cutPct(0.82, l) + "% mais rápido",
    cap: (p) => p.spd <= SPD_FLOOR + 1e-6,
    f: (p) => (p.spd *= 0.82),
  },

  /* ---------------- projéteis ---------------- */
  {
    id: "perfurante", ic: "🏹", n: "Tiro Perfurante", d: "Projéteis atravessam +1 inimigo", max: 8,
    sum: (l) => "projéteis atravessam +" + l + s(l, " inimigo", " inimigos"),
    cap: (p) => p.pierce >= HARD.pierce,
    f: (p) => p.pierce++,
  },
  {
    id: "multi", ic: "🔱", n: "Tiro Múltiplo", d: "+1 projétil por ataque", max: 8,
    sum: (l) => "+" + l + s(l, " projétil", " projéteis") + " por ataque",
    cap: (p) => p.shots >= HARD.shots,
    f: (p) => p.shots++,
  },
  {
    id: "alcance", ic: "🔭", n: "Alcance Arcano", d: "+40% de alcance de ataque", max: 4,
    sum: (l) => "+" + mulPct(1.4, l) + "% de alcance de ataque",
    cap: (p) => p.range >= HARD.range,
    f: (p) => (p.range *= 1.4),
  },
  {
    id: "aguia", ic: "🦅", n: "Olho da Águia", d: "+70% de alcance de ataque", max: 2,
    req: ["alcance"],
    sum: (l) => "+" + mulPct(1.7, l) + "% de alcance de ataque",
    cap: (p) => p.range >= HARD.range,
    f: (p) => (p.range *= 1.7),
  },

  /* ---------------- crítico ----------------
     Taxa para de ser oferecida no teto de 100%; o que sobra de taxa já virou
     dano crítico em stats.js, e aí as cartas de DANO crítico assumem. */
  {
    id: "olho_critico", ic: "🎯", n: "Olho Crítico", d: "+15% de chance de crítico", max: 5,
    sum: (l) => "+" + l * 15 + "% de chance de crítico",
    cap: (p) => p.crit >= CAPS.critChance,
    f: (p) => (p.crit += 0.15),
  },
  {
    id: "certeiro", ic: "💢", n: "Tiro Certeiro", d: "+25% de chance de crítico", max: 3,
    req: ["olho_critico"],
    sum: (l) => "+" + l * 25 + "% de chance de crítico",
    cap: (p) => p.crit >= CAPS.critChance,
    f: (p) => (p.crit += 0.25),
  },
  {
    id: "brutal", ic: "💥", n: "Golpe Brutal", d: "+40% de dano crítico", max: 6,
    when: (p) => p.crit > 0,
    sum: (l) => "+" + l * 40 + "% de dano crítico",
    cap: (p) => p.critDmg >= CAPS.critDmgMax,
    f: (p) => (p.critDmg += 0.4),
  },
  {
    id: "carnificina", ic: "☠️", n: "Carnificina", d: "+80% de dano crítico", max: 3,
    req: ["brutal"],
    sum: (l) => "+" + l * 80 + "% de dano crítico",
    cap: (p) => p.critDmg >= CAPS.critDmgMax,
    f: (p) => (p.critDmg += 0.8),
  },

  /* ---------------- vida e sustentação ---------------- */
  {
    id: "coracao_ferro", ic: "❤️", n: "Coração de Ferro", d: "+2 HP máximo e cura 2", max: 8,
    sum: (l) => "+" + l * 2 + " HP máximo",
    f: (p) => { p.maxHp += 2; p.hp += 2; },
  },
  {
    id: "coracao_valente", ic: "💖", n: "Coração Valente", d: "+1 HP máximo e cura 1", max: 10,
    sum: (l) => "+" + l + " HP máximo",
    f: (p) => { p.maxHp += 1; p.hp += 1; },
  },
  {
    id: "talisma", ic: "📿", n: "Talismã da Sorte", d: "+1 HP máximo e +10% de crítico", max: 4,
    sum: (l) => "+" + l + " HP máximo e +" + l * 10 + "% de crítico",
    f: (p) => { p.maxHp += 1; p.hp += 1; p.crit += 0.1; },
  },
  {
    id: "escudo", ic: "🛡️", n: "Escudo Rúnico", d: "Bloqueia 1 dano (recarrega a cada onda)", max: 3,
    sum: (l) => "bloqueia " + l + s(l, " dano", " danos") + " por onda",
    f: (p) => { p.shieldBase++; p.shield++; },
  },
  /* Vampirismo NERFADO: +7% por carta (era 12%) e teto 22% (era 30%).
     A cura em si também ganhou intervalo próprio — ver player.js. */
  {
    id: "vampirismo", ic: "🩸", n: "Vampirismo", d: "+7% de chance de roubar vida ao acertar", max: 3,
    sum: (l) => "+" + l * 7 + "% de chance de roubar vida",
    cap: (p) => p.ls >= CAPS.lifesteal,
    f: (p) => (p.ls += 0.07),
  },
  /* Antes estes dois eram `p.regenMax ? 4 : 6`, então pegar "Maior" primeiro
     dava o valor FRACO. Agora sempre melhora. */
  {
    id: "regen", ic: "💚", n: "Regeneração", d: "Cura 1 HP a cada 6 comidas", max: 3,
    sum: (l) => "cura 1 HP a cada " + Math.max(3, 8 - l * 2) + " comidas",
    f: (p) => (p.regenMax = p.regenMax ? Math.max(3, p.regenMax - 2) : 6),
  },
  {
    id: "regen_maior", ic: "💞", n: "Regeneração Maior", d: "Regeneração bem mais forte", max: 2,
    req: ["regen"],
    sum: () => "regeneração acelerada",
    f: (p) => (p.regenMax = p.regenMax ? Math.max(2, p.regenMax - 3) : 4),
  },
  {
    id: "sangue_frio", ic: "🥶", n: "Sangue Frio", d: "Cura 1 HP a cada 5 abates", max: 3,
    sum: (l) => "cura 1 HP a cada " + Math.max(3, 6 - l) + " abates",
    f: (p) => (p.killHeal = p.killHeal ? Math.max(3, p.killHeal - 1) : 5),
  },

  /* ---------------- veneno e explosão ---------------- */
  {
    id: "veneno", ic: "🧪", n: "Veneno Sombrio", d: "Seus tiros envenenam inimigos", max: 4,
    sum: (l) => "+" + n1(l * 1.2) + " de dano de veneno por segundo",
    cap: (p) => p.venom >= HARD.venom,
    f: (p) => (p.venom += 1.2),
  },
  {
    id: "veneno_conc", ic: "☣️", n: "Veneno Concentrado", d: "Veneno muito mais forte", max: 3,
    req: ["veneno"],
    sum: (l) => "+" + n1(l * 2.2) + " de dano de veneno por segundo",
    cap: (p) => p.venom >= HARD.venom,
    f: (p) => (p.venom += 2.2),
  },
  {
    id: "detonacao", ic: "💣", n: "Detonação", d: "Inimigos mortos explodem", max: 4,
    sum: (l) => "+" + n1(l * 1.6) + " de dano de explosão",
    cap: (p) => p.boom >= HARD.boom,
    f: (p) => (p.boom += 1.6),
  },
  {
    id: "detonacao_maior", ic: "☢️", n: "Detonação Maior", d: "Explosões mais fortes e maiores", max: 3,
    req: ["detonacao"],
    sum: (l) => "+" + l * 2 + " de dano e +" + l * 25 + " de raio de explosão",
    cap: (p) => p.boom >= HARD.boom,
    f: (p) => { p.boom += 2; p.boomR += 25; },
  },
  {
    id: "espinhos", ic: "🌵", n: "Escama Espinhosa", d: "Inimigos que te tocam sofrem 2 de dano", max: 6,
    sum: (l) => "inimigos que te tocam sofrem " + l * 2 + " de dano",
    cap: (p) => p.thorns >= HARD.thorns,
    f: (p) => (p.thorns += 2),
  },

  /* ---------------- únicos (booleanos: max 1) ---------------- */
  {
    id: "ima", ic: "🧲", n: "Ímã de Comida", d: "A comida vem até você", max: 1,
    sum: () => "a comida vem até você",
    f: (p) => { p.magnet = true; p.magnetR = Math.max(p.magnetR || 0, 190); },
  },
  {
    id: "ima_maior", ic: "🌀", n: "Campo Magnético", d: "+70 de alcance de coleta", max: 3,
    req: ["ima"],
    sum: (l) => "+" + l * 70 + " de alcance de coleta",
    cap: (p) => p.magnetR >= HARD.magnetR,
    f: (p) => { p.magnet = true; p.magnetR = (p.magnetR || 0) + 70; },
  },
  {
    id: "execucao", ic: "⚰️", n: "Execução", d: "Golpes matam inimigos abaixo de 25% de HP", max: 1,
    sum: () => "mata inimigos comuns abaixo de 25% de HP",
    f: (p) => (p.exec = true),
  },
  {
    id: "sorte_dourada", ic: "🍀", n: "Sorte Dourada", d: "O dobro de comida dourada na arena", max: 1,
    sum: () => "o dobro de comida dourada na arena",
    f: (p) => (p.goldLuck = true),
  },
  {
    id: "ima_almas", ic: "💰", n: "Ímã de Almas", d: "+40% de almas no fim da run", max: 3,
    sum: (l) => "+" + l * 40 + "% de almas no fim da run",
    f: (p) => (p.soulMult += 0.4),
  },
  {
    id: "pele_pedra", ic: "🗿", n: "Pele de Pedra", d: "Invulnerabilidade pós-dano dura +0,7s", max: 2,
    sum: (l) => "+" + n1(l * 0.7) + "s de invulnerabilidade pós-dano",
    cap: (p) => p.iframeBonus >= HARD.iframeBonus,
    f: (p) => (p.iframeBonus += 0.7),
  },

  /* ---------------- exclusivos de classe ----------------
     `cls` restringe a carta a uma classe. Elas existem para a identidade da
     classe continuar crescendo durante a run: sem isso, a partir da onda 50
     todo mundo vira "a cobra com muito dano", independente do que escolheu no
     começo. Cada uma aprofunda a mecânica própria daquela classe em vez de só
     somar número.

     Como o baralho tem 16 classes, uma carta exclusiva só aparece para quem
     jogou aquela classe — o pool efetivo continua enxuto. */
  {
    id: "x_guerreiro", ic: "🌀", n: "Ciclone", d: "Giro Mortal atinge muito mais longe", max: 3,
    cls: 0, sum: (l) => "+" + l * 45 + " de raio no Giro Mortal",
    f: (p) => (p.xSpin = (p.xSpin || 0) + 45),
  },
  {
    id: "x_mago", ic: "✨", n: "Nova Gêmea", d: "+6 projéteis na Nova Arcana", max: 3,
    cls: 1, sum: (l) => "+" + l * 6 + " projéteis na Nova Arcana",
    f: (p) => (p.xNova = (p.xNova || 0) + 6),
  },
  {
    id: "x_assassino", ic: "🌑", n: "Sombra Longa", d: "Passo Sombrio anda o dobro", max: 2,
    cls: 2, sum: (l) => "Passo Sombrio anda +" + l * 5 + " células",
    f: (p) => (p.xStep = (p.xStep || 0) + 5),
  },
  {
    id: "x_necromante", ic: "🕯️", n: "Pacto dos Mortos", d: "A Colheita cura mesmo com 1 acerto", max: 1,
    cls: 3, sum: () => "a Colheita cura com qualquer acerto",
    f: (p) => (p.xHarvest = true),
  },
  {
    id: "x_paladino", ic: "🌟", n: "Égide Longa", d: "+1,5s de invencibilidade na Égide", max: 3,
    cls: 4, sum: (l) => "+" + Math.round(l * 1.5 * 10) / 10 + "s de Égide",
    f: (p) => (p.xAegis = (p.xAegis || 0) + 1.5),
  },
  {
    id: "x_bombardeiro", ic: "🧨", n: "Carga Dupla", d: "A Bomba Ambulante solta duas", max: 2,
    cls: 5, sum: (l) => "+" + l + " bomba por ativa",
    f: (p) => (p.xBomb = (p.xBomb || 0) + 1),
  },
  {
    id: "x_berserker", ic: "🩸", n: "Sede de Sangue", d: "A Fúria Cega dura +2s", max: 3,
    cls: 6, sum: (l) => "+" + l * 2 + "s de Fúria Cega",
    f: (p) => (p.xRage = (p.xRage || 0) + 2),
  },
  {
    id: "x_centauro", ic: "🎯", n: "Flecha Pesada", d: "+35% de dano no tiro do Centauro", max: 3,
    cls: 7, sum: (l) => "+" + l * 35 + "% no tiro do corpo",
    f: (p) => (p.xArrow = (p.xArrow || 0) + 0.35),
  },
  {
    id: "x_criomante", ic: "🧊", n: "Permafrost", d: "O gelo dura o dobro e desacelera mais", max: 3,
    cls: 8, sum: (l) => "gelo +" + l * 100 + "% de duração",
    f: (p) => (p.xIce = (p.xIce || 0) + 1),
  },
  {
    id: "x_hidra", ic: "🐍", n: "Ninhada", d: "Uma cabeça nova a cada 4 comidas", max: 2,
    cls: 9, sum: (l) => "cabeça nova a cada " + Math.max(2, 6 - l * 2) + " comidas",
    f: (p) => (p.xHead = (p.xHead || 0) + 2),
  },
  {
    id: "x_cascavel", ic: "📢", n: "Eco do Chocalho", d: "O Chocalho atordoa +2s", max: 3,
    cls: 10, sum: (l) => "+" + l * 2 + "s de atordoamento",
    f: (p) => (p.xStun = (p.xStun || 0) + 2),
  },
  {
    id: "x_apostador", ic: "🍀", n: "Banca Generosa", d: "Resultados positivos: +1 cura/escudo e +1 multiplicador de explosão. O azar continua possível.", max: 3,
    cls: 11, sum: (l) => "+" + l + " na cura, escudos e multiplicador de explosão dos resultados positivos",
    f: (p) => (p.xLuck = (p.xLuck || 0) + 1),
  },
  {
    id: "x_glutao", ic: "🍗", n: "Estômago de Ferro", d: "Digere bem mais devagar", max: 3,
    cls: 12, sum: (l) => "digestão " + l * 30 + "% mais lenta",
    f: (p) => (p.xDigest = (p.xDigest || 0) + 0.3),
  },
  {
    id: "x_engenheiro", ic: "⚙️", n: "Oficina", d: "+1 torre simultânea e elas duram mais", max: 3,
    cls: 13, sum: (l) => "+" + l + " torre e +" + l * 6 + "s de duração",
    f: (p) => (p.xTurret = (p.xTurret || 0) + 1),
  },
  {
    id: "x_tempestade", ic: "🌩️", n: "Condutor", d: "O raio salta em +2 inimigos", max: 3,
    cls: 14, sum: (l) => "+" + l * 2 + " saltos no raio",
    f: (p) => (p.xChain = (p.xChain || 0) + 2),
  },
  {
    id: "x_cronomante", ic: "🕰️", n: "Memória Longa", d: "Retroceder volta mais no tempo", max: 2,
    cls: 15, sum: (l) => "Retroceder volta +" + Math.round(l * 1.5 * 10) / 10 + "s",
    f: (p) => (p.xRewind = (p.xRewind || 0) + 6),
  },

  /* ---------------- transbordo ----------------
     Uma run de 290 ondas dá ~232 escolhas de poder. A soma de TODOS os `max`
     acima é ~170: por volta da onda 210 o baralho acaba e o sorteio passaria a
     oferecer cartas já no máximo, ou seja, escolhas que não fazem nada.

     Estes três não têm teto e não têm `cap`, então o baralho nunca seca. Só
     entram quando sobram menos de 3 cartas normais (ver `offerable` em
     game/picks.js), então não diluem as escolhas do começo da run. */
  {
    id: "of_essencia", ic: "🐍", n: "Essência da Serpente", d: "+8% de dano",
    max: Infinity, overflow: true,
    sum: (l) => "+" + l * 8 + "% de dano",
    f: (p) => (p.dmgMul += 0.08),
  },
  {
    id: "of_vigor", ic: "💗", n: "Vigor Ancestral", d: "+1 HP máximo e cura 1",
    max: Infinity, overflow: true,
    sum: (l) => "+" + l + " HP máximo",
    f: (p) => { p.maxHp += 1; p.hp += 1; },
  },
  {
    id: "of_alma", ic: "🔮", n: "Fragmento de Alma", d: "+15% de almas no fim da run",
    max: Infinity, overflow: true,
    sum: (l) => "+" + l * 15 + "% de almas no fim da run",
    f: (p) => (p.soulMult += 0.15),
  },
  ...ULTIMATE_UPGRADES,
];

export const RELICS = [
  {
    id: "r_coroa", ic: "👑", n: "Coroa Serpente", d: "Cura 2 HP ao fim de cada onda", max: 1,
    sum: () => "cura 2 HP ao fim de cada onda",
    f: (p) => (p.relicCrown = true),
  },
  {
    id: "r_presa", ic: "🗡️", n: "Presa do Caos", d: "+60% de dano", max: 4,
    sum: (l) => "+" + l * 60 + "% de dano",
    f: (p) => (p.dmgMul += 0.6),
  },
  {
    id: "r_vazio", ic: "🌌", n: "Olho do Vazio", d: "+2 projéteis", max: 3,
    sum: (l) => "+" + l * 2 + " projéteis",
    cap: (p) => p.shots >= HARD.shots,
    f: (p) => (p.shots += 2),
  },
  {
    id: "r_sangue", ic: "🩸", n: "Sangue Antigo", d: "+3 HP máximo e cura tudo", max: 4,
    sum: (l) => "+" + l * 3 + " HP máximo",
    f: (p) => { p.maxHp += 3; p.hp = p.maxHp; },
  },
  {
    id: "r_nucleo", ic: "☢️", n: "Núcleo Instável", d: "Explosões ao matar ficam enormes", max: 3,
    sum: (l) => "+" + l * 3 + " de dano e +" + l * 35 + " de raio de explosão",
    cap: (p) => p.boom >= HARD.boom,
    f: (p) => { p.boom += 3; p.boomR += 35; },
  },
  {
    id: "r_hermes", ic: "👟", n: "Botas de Hermes", d: "Movimento 25% mais rápido", max: 2,
    sum: (l) => "movimento " + cutPct(0.75, l) + "% mais rápido",
    cap: (p) => p.spd <= SPD_FLOOR + 1e-6,
    f: (p) => (p.spd *= 0.75),
  },
  {
    id: "r_dragao", ic: "🔥", n: "Coração de Dragão", d: "+5 HP máximo e cura tudo", max: 3,
    sum: (l) => "+" + l * 5 + " HP máximo",
    f: (p) => { p.maxHp += 5; p.hp = p.maxHp; },
  },
  {
    id: "r_espinhos", ic: "🌵", n: "Coroa de Espinhos", d: "Inimigos que te tocam sofrem 4 de dano", max: 3,
    sum: (l) => "inimigos que te tocam sofrem " + l * 4 + " de dano",
    cap: (p) => p.thorns >= HARD.thorns,
    f: (p) => (p.thorns += 4),
  },
  {
    id: "r_pacto", ic: "🪦", n: "Pacto Sombrio", d: "+100% de dano, mas -2 HP máximo", max: 3,
    sum: (l) => "+" + l * 100 + "% de dano e -" + l * 2 + " HP máximo",
    when: (p) => p.maxHp > 3, // não oferece um pacto que te mata na hora
    f: (p) => { p.dmgMul += 1; p.maxHp = Math.max(1, p.maxHp - 2); p.hp = Math.min(p.hp, p.maxHp); },
  },
  {
    id: "r_idolo", ic: "💎", n: "Ídolo Dourado", d: "Almas da run em DOBRO", max: 1,
    sum: () => "almas da run em DOBRO",
    f: (p) => (p.soulMult *= 2),
  },
  /* Transbordo das relíquias: são 58 ondas de chefe contra 27 acumulações. */
  {
    id: "of_eco", ic: "👁️", n: "Eco do Chefe", d: "+25% de dano e +1 HP máximo",
    max: Infinity, overflow: true,
    sum: (l) => "+" + l * 25 + "% de dano e +" + l + " HP máximo",
    f: (p) => { p.dmgMul += 0.25; p.maxHp += 1; p.hp += 1; },
  },
];

/* ---------------------------------------------------------------------------
   Consulta
   --------------------------------------------------------------------------- */

/** id -> poder, cobrindo cartas, relíquias E o baralho do PVP.
    A tela de poderes (tecla P) resolve os ids por aqui; sem o baralho do PVP
    nesta tabela ela mostraria a lista vazia numa partida de PVP. */
export const POWER_BY_ID = new Map();
for (const o of [...UPGRADES, ...RELICS, ...PVP_UPGRADES]) POWER_BY_ID.set(o.id, o);

export function powerById(id) {
  return POWER_BY_ID.get(id) || null;
}

/** Quantas vezes o jogador já comprou este poder. */
export function levelOf(p, id) {
  return (p && p.powers && p.powers[id]) || 0;
}

/** Este poder pode ser oferecido a este jogador agora?
    Cobre as quatro razões de "não": já no máximo, atributo no teto,
    pré-requisito faltando, e condição livre. */
export function canOffer(o, p) {
  if (!o || !p) return false;
  // carta exclusiva: só para a classe dona dela
  if (o.cls !== undefined && o.cls !== p.cls) return false;
  if (levelOf(p, o.id) >= (o.max ?? 99)) return false;
  if (o.req && !o.req.every((r) => levelOf(p, r) > 0)) return false;
  if (o.when && !o.when(p)) return false;
  if (o.cap && o.cap(p)) return false;
  return true;
}

/** Descrição do efeito ACUMULADO, para o menu consolidado. */
export function sumText(o, level) {
  if (!o) return "";
  if (o.sum) {
    try {
      return o.sum(Math.max(1, level));
    } catch (e) {
      /* descrição quebrada não pode derrubar o menu */
    }
  }
  return o.d;
}
