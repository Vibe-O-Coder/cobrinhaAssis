// 75 espécies: veteranos e elites são evoluções destas espécies, não entram na contagem.
// id | nome | ataque | comportamento adicional | elemento | silhueta
const early=`grunter|Mordedor|pursuit|none|none|maw
runner|Corredor|skirmish|none|none|raptor
shooter|Vigia|volley|retreat|none|eye
tank|Couraça|stomp|shield|none|beetle
splitter|Ninhada|brood|none|none|pod
orbiter|Satélite|orbit|none|none|orb
healer|Flor Vital|mend|retreat|none|flower
charger|Aríete|rush|none|none|horn
sniper|Agulha|snipe|retreat|none|needle
bomber|Pavio|detonate|none|burn|bomb
weaver|Tecelão|weave|none|slow|spider
warden|Guardião|ward|escort|none|shield
spitter|Cuspidor|fan|none|poison|toad
leech|Sanguessuga|siphon|none|noregen|leech
breaker|Quebrador|ram|none|weaken|hammer
mortar|Morteiro|mortar|none|none|cannon
sentinel|Sentinela|lattice|none|none|obelisk
stalker|Espreitador|flank|none|none|mantis
miner|Escavador|mine|burrow|none|drill
prism|Fragmento|reflect|orbit|none|crystal
bulwark|Bastião|wall|shield|none|fort
bell|Sino Mudo|chime|retreat|silence|bell
anchor|Âncora|well|none|slow|anchor
conductor|Condutor|arc|none|stun|coil
burrower|Toupeira|ambush|burrow|none|worm`;
const middle=`blade_monk|Monge das Lâminas|pursuit|blades|none|maw
ember_hound|Cão de Brasa|skirmish|trail|burn|raptor
ice_seer|Oráculo de Gelo|volley|echo|freeze|eye
siege_crab|Caranguejo de Cerco|stomp|aftershock|none|beetle
spore_mother|Mãe dos Esporos|brood|cloud|poison|pod
tesla_moon|Lua Tesla|orbit|cross|stun|orb
thorn_orchid|Orquídea de Espinhos|mend|thorns|weaken|flower
fire_ram|Carneiro Ígneo|rush|trail|burn|horn
hex_lancer|Lanceiro Maldito|snipe|cross|disarm|needle
frost_cask|Barril Glacial|detonate|ring|freeze|bomb
silk_jailer|Carcereiro de Seda|weave|wall|silence|spider
mirror_knight|Cavaleiro Espelho|ward|reflect|none|shield
acid_alchemist|Alquimista Ácido|fan|cloud|poison|toad
blood_scribe|Escriba de Sangue|siphon|echo|noregen|leech
chain_brute|Bruto das Correntes|ram|trap|disarm|hammer
storm_battery|Bateria de Tempestade|mortar|cross|stun|cannon
sun_pillar|Pilar Solar|lattice|aftershock|burn|obelisk
phase_hunter|Caçador de Fase|flank|blink|weaken|mantis
crystal_miner|Mineiro de Cristal|mine|blades|freeze|drill
prism_weaver|Tecelão Prismático|reflect|echo|silence|crystal
mobile_fort|Fortaleza Andante|wall|escort|disarm|fort
dirge_bell|Sino Fúnebre|chime|ring|noregen|bell
gravity_eel|Enguia Gravitacional|well|trap|slow|anchor
spark_crown|Coroa de Faíscas|arc|haste|stun|coil
glass_worm|Verme de Vidro|ambush|decoy|weaken|worm`;
const late=`void_gnawer|Roedor do Vazio|pursuit|blink|disarm|maw
comet_hound|Cão Cometa|skirmish|nova|burn|raptor
omniscient_eye|Olho Onisciente|volley|orbit|silence|eye
continent_crab|Caranguejo Continental|stomp|wall|stun|beetle
eclipse_womb|Útero do Eclipse|brood|drain|noregen|pod
singularity_moon|Lua Singular|orbit|trap|slow|orb
entropy_lotus|Lótus da Entropia|mend|cloud|silence|flower
stellar_ram|Aríete Estelar|rush|echo|disarm|horn
event_lancer|Lanceiro do Horizonte|snipe|blades|burn|needle
supernova_seed|Semente Supernova|detonate|aftershock|stun|bomb
time_weaver|Tecelão do Tempo|weave|echo|freeze|spider
null_paladin|Paladino Nulo|ward|ring|silence|shield
plague_chalice|Cálice da Praga|fan|drain|noregen|toad
memory_leech|Sanguessuga de Memórias|siphon|blink|disarm|leech
world_anvil|Bigorna de Mundos|ram|cross|stun|hammer
star_engine|Motor de Estrelas|mortar|nova|burn|cannon
void_monolith|Monólito do Vazio|lattice|trap|silence|obelisk
fate_reaper|Ceifador do Destino|flank|decoy|noregen|mantis
rift_drill|Broca Dimensional|mine|wall|disarm|drill
infinite_prism|Prisma Infinito|reflect|nova|freeze|crystal
living_citadel|Cidadela Viva|wall|haste|weaken|fort
last_toll|Último Badalar|chime|drain|silence|bell
abyss_anchor|Âncora Abissal|well|blades|poison|anchor
magnetic_king|Rei Magnético|arc|orbit|disarm|coil
world_serpent|Serpente de Fendas|ambush|trail|burn|worm`;
export const ELEMENTS={none:{name:'Físico',c:'#e5dfff'},burn:{name:'Chamas',c:'#ff974e'},poison:{name:'Veneno',c:'#89e66a'},freeze:{name:'Gelo',c:'#75e4ff'},slow:{name:'Lentidão',c:'#99aeff'},stun:{name:'Choque',c:'#ffe277'},silence:{name:'Silêncio',c:'#ce97ff'},disarm:{name:'Desarme',c:'#ff80b8'},weaken:{name:'Corrosão',c:'#ffb5d0'},noregen:{name:'Praga',c:'#b9d667'}};
export const ATTACK_NAMES={pursuit:'bote anunciado',skirmish:'passadas em zigue-zague',volley:'rajada dirigida',stomp:'pisão em anel',brood:'criação de filhotes',orbit:'órbita e tiros tangentes',mend:'cura de aliados',rush:'investida reta',snipe:'tiro com mira',detonate:'explosão com aviso',weave:'teias em diagonais',ward:'aura de proteção',fan:'leque de projéteis',siphon:'drenagem anunciada',ram:'investida e impacto',mortar:'bombardeio preditivo',lattice:'grade de lasers',flank:'contorno pelo flanco',mine:'campo de minas',reflect:'escudo intermitente e resposta',wall:'barreiras de energia',chime:'ondas sonoras',well:'poço gravitacional',arc:'arcos elétricos',ambush:'emboscada subterrânea'};
export const GIMMICK_NAMES={none:'aproximação direta',retreat:'recua durante a recarga',shield:'couraça frontal',escort:'acompanha e protege aliados',burrow:'mergulha entre ataques',orbit:'muda o ângulo de aproximação',blades:'lâminas laterais',trail:'rastro persistente',echo:'repete o golpe com atraso',aftershock:'segundo impacto maior',cloud:'nuvem elemental',cross:'cruz de projéteis',thorns:'coroa de espinhos',wall:'corta rotas com barreiras',reflect:'barreira intermitente',ring:'anel com centro seguro',trap:'armadilha na rota prevista',blink:'teleporte anunciado',haste:'acelera aliados próximos',decoy:'duas áreas falsas que se tornam perigos reais',drain:'converte pressão em cura',nova:'explosão de projéteis alternados'};
const colors=['#ef7293','#ffd66b','#69cfff','#ffa14f','#ea8cdc','#7be0db','#95dc73','#ff8371','#db9bff','#ffc566','#b29bff','#9bacff','#70eab1','#b5db70','#f49ccd','#e7ac69','#90cddd','#d99aee','#c8b284','#bdaeff','#97b9b2','#d2a1ee','#88bdce','#e7da8d','#d58eaf'];
const hefty=new Set(['stomp','ward','wall','mortar','ram']);
export const ENEMY_SPECIES=[early,middle,late].flatMap((group,stage)=>group.split('\n').map((line,i)=>{
 const [id,name,attack,gimmick,element,shape]=line.split('|');
 return {id,name,stage,attack,gimmick,element,shape,ordinal:i,unlock:stage===0?1+Math.floor(i*3.5):stage===1?97+i*3:194+i*3,
  hp:(hefty.has(attack)?10:4)+stage*5,spd:hefty.has(attack)?34:attack==='skirmish'?104:58+stage*5,r:hefty.has(attack)?19:13+stage,
  score:3+stage*5,c:element==='none'?colors[i]:ELEMENTS[element].c,pattern:'ecology',art:id,
  description:ATTACK_NAMES[attack]+'; '+GIMMICK_NAMES[gimmick]+'. '+ELEMENTS[element].name+'.'};
}));
export const SPECIES_BY_ID=Object.fromEntries(ENEMY_SPECIES.map(e=>[e.id,e]));
export function rankAvailable(stage,wave) {
 if(stage===0)return wave>=170?2:wave>=73?1:0;
 if(stage===1)return wave>=242?2:wave>=170?1:0;
 return wave>=275?2:wave>=242?1:0;
}
export function ecologyPool(wave) {
 const stage=wave<=96?0:wave<=193?1:2;
 const pool=[];for(const e of ENEMY_SPECIES)if(e.unlock<=wave){pool.push(e.id);if(e.stage===stage)pool.push(e.id,e.id);}
 return pool.length?pool:['grunter'];
}
// Variações independentes da patente; cada uma muda cadência, movimento ou acerto.
export const MUTATIONS={normal:{name:'Natural',speed:1,hp:1,rate:1,damage:1},swift:{name:'Frenético',speed:1.2,hp:.8,rate:.75,damage:.9},heavy:{name:'Pesado',speed:.72,hp:1.6,rate:1.3,damage:1.7},venom:{name:'Venenoso',speed:1,hp:1,rate:1,damage:1,effect:'poison'},flame:{name:'Flamejante',speed:1,hp:1,rate:1,damage:1,effect:'burn'},frost:{name:'Congelante',speed:.9,hp:1,rate:1.1,damage:1,effect:'freeze'},shock:{name:'Elétrico',speed:1,hp:1,rate:1.15,damage:1,effect:'stun'}};

// 24 encontros de estreia e o chefe final. Os demais encontros fazem remixes.
export const BOSS_ROSTER=[
 ['boss',10],['boss_shell',20],['boss2',29],['boss_bramble',39],['boss3',49],['boss_bell',58],['boss4',68],['boss_locust',78],
 ['boss5',97],['boss_smith',107],['boss6',116],['boss_serpent',126],['boss_tide',136],['boss_frost',145],['boss_plague',155],['boss_chronos',165],
 ['boss_elite',194],['boss_mirror',203],['boss_tyrant',213],['boss_forge',223],['boss_grave',232],['boss_null',242],['boss_star',252],['boss_eclipse',261],['boss_final',290],
].map(([id,unlock])=>({id,unlock,stage:unlock<=96?0:unlock<=193?1:2}));
const newBosses=`boss_shell|KARKOS, A FORTALEZA|bastion|beetle|#ffb365
boss_bramble|VERDÁRIA, A RAIZ|garden|flower|#a5df73
boss_bell|CANTOR DO SILÊNCIO|carillon|bell|#c5a4ef
boss_locust|SAHR, A REVOADA|migration|raptor|#e4ca71
boss_smith|FERROX, O FERREIRO|anvil|hammer|#ff9b69
boss_serpent|NÁJARA, A SERPENTE|coil|worm|#86d8c6
boss_tide|ABISSA, A MARÉ|tide|anchor|#70cfe7
boss_frost|ISOLDE, O INVERNO|glacier|crystal|#b1e7ff
boss_chronos|HORO, O RELÓGIO|clock|coil|#f2d28f
boss_mirror|REFLEXO SEM ROSTO|mirror|eye|#e5bafa
boss_forge|SOLARIS, A FORNALHA|furnace|cannon|#ffc36c
boss_grave|OSSUÁRIO ANDANTE|graveyard|fort|#d5d0b5
boss_null|O CANCELADOR|null|obelisk|#bd8fe7
boss_star|ASTRA, A ESTRELA PARTIDA|starfall|orb|#a3c6ff
boss_eclipse|A ÚLTIMA SOMBRA|eclipse|maw|#ec8fbd`;
export const NEW_BOSSES=Object.fromEntries(newBosses.split('\n').map((line,i)=>{
 const [id,name,routine,shape,c]=line.split('|');return [id,{name,routine,shape,c,boss:true,hp:90+i*7,spd:30+i%5*3,r:35+i%6*2,score:40+i*4,art:id,pattern:'boss_catalog'}];
}));
export const BOSS_DESCRIPTIONS={
 boss:'Investidas, impactos e cerco de projéteis. A segunda fase combina pressão de perto e de longe.',
 boss_shell:'Portões com passagens seguras, carga da fortaleza e bombardeio de artilharia.',
 boss2:'Invocações, zonas de morte e ataques cruzados da necrarca.',
 boss_bramble:'Raízes bifurcadas, anéis venenosos que florescem em sequência e semeadura de criaturas.',
 boss3:'O carrasco alterna perseguição, golpes de foice e áreas de execução anunciadas.',
 boss_bell:'Três badaladas expansivas, linhas que silenciam o ultimate e um acorde que atordoa.',
 boss4:'Fendas, feixes e zonas do vazio que obrigam a mudar de rota.',
 boss_locust:'Revoadas em V, ventos cruzados em dois tempos e corredores varridos por ataques.',
 boss5:'Prismas, feixes e padrões de cristal que se sobrepõem na segunda fase.',
 boss_smith:'Martelos em sequência, ferro em brasa e bigorna seguida por uma onda de impacto.',
 boss6:'Enxames, áreas infestadas e ataques coordenados pela colmeia.',
 boss_serpent:'Anéis venenosos concêntricos, duas presas paralelas e uma espiral de impactos.',
 boss_tide:'Marés com intervalos seguros, ressaca em anel e rajadas gêmeas com velocidades distintas.',
 boss_frost:'Estalactites em sequência, rosa de feixes gelados e estilhaços que cercam o jogador.',
 boss_plague:'A praga restringe a cura e espalha zonas perigosas durante o combate.',
 boss_chronos:'Ponteiros com tempos diferentes, doze impactos de relógio e um golpe que retorna após o teleporte.',
 boss_elite:'O general mistura pressão de combate, reforços e ataques de área.',
 boss_mirror:'Feixes refletidos, imagens laterais que se tornam perigos e três rajadas desencontradas.',
 boss_tyrant:'Um tirano que combina cerco pesado e domínio do espaço da arena.',
 boss_forge:'Corredores em chamas, expansão do núcleo solar e uma roda de fogo.',
 boss_grave:'Lápides fecham rotas, a exumação traz reforços e as foices varrem o ossuário.',
 boss_null:'Alterna silêncio, desarme e apagamento; os bloqueios têm duração limitada e proteção contra repetição.',
 boss_star:'Constelações partidas, cometas em sequência e estrelas binárias.',
 boss_eclipse:'Penumbra, totalidade e feixes de luz que rasgam a área de combate.',
 boss_final:'O Devorador ocupa o alto da arena sem paredes fatais. Três fases combinam lasers, corredores seguros e ataques sobre toda a arena.',
};
