/* Três especializações exclusivas por classe, dez evoluções em cada caminho.
   Os mesmos dados alimentam as cartas, a descrição e a execução: o nível nunca
   é apenas uma mudança de nome. Índices de classe antigos continuam estáveis. */
import { CLASSES } from './classes.js';

const path = (name, pattern, damage, radius, count, status = '', support = '') =>
  ({ name, pattern, damage, radius, count, status, support });

export const ULTIMATE_PATHS = [
  [path('Terremoto', 'pulse', 3.8, 210, 1, 'stun'), path('Lâminas Dançantes', 'fan', 1.4, 300, 7), path('Muralha de Aço', 'ward', 1.8, 180, 1, '', 'shield')],
  [path('Chuva de Cometas', 'meteor', 3.1, 100, 3), path('Singularidade', 'field', 1.3, 240, 1, 'pull'), path('Constelação', 'ring', 1.1, 300, 12)],
  [path('Execução Sombria', 'strike', 4.6, 440, 2), path('Jardim Venenoso', 'field', 1.5, 200, 1, 'poison'), path('Dança das Sombras', 'fan', 1.5, 300, 5, '', 'phase')],
  [path('Ceifador de Almas', 'drain', 3.1, 270, 1, '', 'heal'), path('Domínio dos Mortos', 'field', 1.2, 260, 1, 'curse'), path('Legião de Ossos', 'fan', 1.6, 400, 8)],
  [path('Julgamento Solar', 'line', 4.8, 560, 1), path('Fortaleza Sagrada', 'ward', 1.3, 270, 1, '', 'shield'), path('Aurora Restauradora', 'drain', 2.1, 250, 1, '', 'heal')],
  [path('Bombardeio Orbital', 'meteor', 4, 130, 3), path('Campo Minado', 'mines', 3.4, 110, 4), path('Estilhaços', 'ring', 1.5, 350, 14)],
  [path('Carnificina', 'strike', 4.5, 300, 3), path('Abalo Sísmico', 'pulse', 3.3, 310, 1, 'stun'), path('Sangue Imortal', 'drain', 2.8, 230, 1, '', 'heal')],
  [path('Flecha do Horizonte', 'line', 5.2, 700, 1), path('Chuva de Flechas', 'fan', 1.8, 440, 9), path('Manada Ancestral', 'ward', 2.4, 260, 1, '', 'grow')],
  [path('Estilhaçar', 'pulse', 4.2, 280, 1, 'stun'), path('Era Glacial', 'field', 1.5, 340, 1, 'slow'), path('Lanças de Gelo', 'fan', 2, 460, 7, 'slow')],
  [path('Mil Cabeças', 'body', 1.5, 350, 4), path('Pântano Ácido', 'field', 1.6, 300, 1, 'poison'), path('Regeneração Dracônica', 'ward', 2, 230, 1, '', 'grow')],
  [path('Ressonância', 'tail', 3.5, 370, 1, 'stun'), path('Círculo de Veneno', 'ring', 1.5, 360, 11, 'poison'), path('Presas Predadoras', 'strike', 4.5, 420, 3)],
  [path('Mesa de Guerra', 'fan', 1.8, 390, 9), path('Banco Seguro', 'ward', 2.4, 270, 1, '', 'shield'), path('Grande Prêmio', 'meteor', 4.5, 130, 4)],
  [path('Fome Infinita', 'drain', 3.4, 310, 1, '', 'heal'), path('Peso do Mundo', 'pulse', 4, 330, 1, 'stun'), path('Reserva de Banquete', 'ward', 2.2, 240, 1, '', 'grow')],
  [path('Bateria de Cerco', 'turret', 2, 490, 2), path('Enxame de Drones', 'fan', 1.5, 490, 10), path('Bunker Portátil', 'ward', 1.7, 260, 1, '', 'shield')],
  [path('Juízo dos Raios', 'strike', 4, 600, 5), path('Olho do Furacão', 'field', 1.7, 340, 1, 'pull'), path('Tempestade Elétrica', 'ring', 1.7, 420, 14, 'slow')],
  [path('Ecos do Futuro', 'strike', 3.8, 420, 3), path('Prisão Temporal', 'field', 1.7, 330, 1, 'stun'), path('Segundo Amanhecer', 'ward', 2.5, 270, 1, '', 'heal')],
  [path('Linha de Execução','line',5.4,740,1),path('Chuva Balística','fan',1.9,520,11),path('Mira Orbital','strike',4.1,680,4)],
];

const patterns = {
  pulse: 'onda de impacto', fan: 'leque de projéteis', ring: 'anel de projéteis',
  strike: 'golpes nos alvos mais próximos', line: 'feixe perfurante na direção do alvo',
  field: 'campo persistente no ponto de ativação', ward: 'onda protetora',
  drain: 'drenagem em área', meteor: 'bombardeio nas posições dos alvos',
  mines: 'minas ao redor da cobra', body: 'rajadas de quatro pontos do corpo',
  tail: 'onda na cauda', turret: 'torres de cerco temporárias',
};
const statuses = { stun: 'atordoa', slow: 'desacelera', pull: 'puxa inimigos comuns e desacelera chefes', poison: 'envenena', curse: 'amaldiçoa (dano dobrado)' };
const number = n => String(Math.round(n * 100) / 100).replace('.', ',');

export function ultimateSpec(cls, branch, level, pvp = false) {
  const def = ULTIMATE_PATHS[cls]?.[branch];
  if (!def || !Number.isInteger(level) || level < 1 || level > 10) return null;
  return {
    ...def, cls, branch, level, pvp,
    damage: def.damage * (1 + level * 0.18) * (pvp ? 0.26 : 1),
    radius: def.radius + level * (pvp ? 3 : 8),
    count: def.count + (['fan', 'ring', 'body', 'meteor', 'mines', 'strike', 'turret'].includes(def.pattern) ? Math.floor(level / 3) : 0),
    pulses: def.pattern === 'field' ? 3 + Math.floor(level / 2) : 1 + Math.floor(level / 4),
    duration: (1.2 + level * 0.18) * (pvp ? 0.35 : 1),
    supportAmount: pvp ? 1 + Math.floor(level / 4) : 1 + Math.floor(level / 3),
    finisher: level === 10,
  };
}

export function playerUltimate(p, pvp = !!p.pvp) {
  return ultimateSpec(p.cls, p.ultimate?.branch, p.ultimate?.level, pvp);
}

export function ultimateDescription(cls, branch, level, pvp = false) {
  const u = ultimateSpec(cls, branch, level, pvp);
  if (!u) return 'Escolha um dos três caminhos de ultimate.';
  let text = `${patterns[u.pattern]}; ${u.pulses} pulso(s), ${u.count} alvo(s)/projétil(is), ${number(u.damage)}× dano de tiro e raio/alcance ${u.radius}px.`;
  if (u.status) text += ` ${statuses[u.status]} por ${number(u.duration)}s.`;
  if (u.status && pvp) text += ' Contra jogadores, o controle vira lentidão curta (até 1,2s).';
  if (u.support === 'shield') text += ` Ganha ${u.supportAmount} carga(s) de escudo${pvp ? ' temporário (absorve dano)' : ' (limite 6)'}.`;
  if (u.support === 'heal') text += ` Cura até ${u.supportAmount} HP ao ativar.`;
  if (u.support === 'grow') text += ` Recupera ${u.supportAmount * 2} segmentos e ${u.supportAmount} HP.`;
  if (u.support === 'phase') text += ` Atravessa perigos por ${number(u.duration)}s.`;
  if (u.pattern === 'turret') text += ` Cada torre dura ${4 + level}s e atira a cada 0,8s.`;
  if (u.finisher) text += ' Versão X: pulso final causa o dobro de dano.';
  text += ` Recarga da ativa -${level * 2}%.`;
  if (cls === 11) text += ' O efeito extra só ocorre com dado 5–10; azar continua possível.';
  return text;
}

export function ultimateCooldown(p) {
  return p.abCd * (1 - Math.min(10, p.ultimate?.level || 0) * 0.02);
}

export function createUltimateCards(pvp = false) {
  return ULTIMATE_PATHS.flatMap((branches, cls) => branches.flatMap((def, branch) =>
    Array.from({ length: 10 }, (_, i) => {
      const level = i + 1;
      const id = `${pvp ? 'p_' : ''}ult_${cls}_${branch}_${level}`;
      return {
        id, cls, ultimate: true, branch, tier: level, max: 1, ic: CLASSES[cls].ic,
        n: `${def.name} · ${level}/10`,
        d: (level === 1 ? 'Escolhe este caminho; os outros dois ficam fechados nesta partida. ' : '') + ultimateDescription(cls, branch, level, pvp),
        req: level > 1 ? [`${pvp ? 'p_' : ''}ult_${cls}_${branch}_${level - 1}`] : undefined,
        when: p => (p.ultimate?.branch == null || p.ultimate.branch === branch) && (p.ultimate?.level || 0) === level - 1,
        sum: () => ultimateDescription(cls, branch, level, pvp),
        f: p => {
          p.ultimate = { branch, level };
          p.abName = `${CLASSES[cls].ab} · ${def.name} ${level}/10`;
        },
      };
    })));
}

export const ULTIMATE_UPGRADES = createUltimateCards();
export const PVP_ULTIMATE_UPGRADES = createUltimateCards(true);
