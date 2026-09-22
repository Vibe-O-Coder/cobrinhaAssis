# 🗺️ ROADMAP — Snake Roguelike Ultra

Decisões fechadas com o dono do projeto. Este arquivo é a fonte da verdade das
fases 2 e 3 — se algo aqui divergir do código, o código está atrasado.

## Decisões estruturais

| Tema | Decisão |
|---|---|
| Entrega | Em fases. Fase 1 = bugs + balanceamento + UI de stats. Fase 2 = conteúdo (290 ondas, classes, modos). Fase 3 = mobile + PVP. |
| Progressão | **10 atos de 29 ondas = 290 ondas** (29 anos de cobrinha). Cada ato tem bioma, roster e chefe próprios. |
| Checkpoint | Vencer o chefe de um ato **desbloqueia começar dele** numa run futura. Sessões de 20-30 min em vez de maratona de 4h. |
| Mobile | Joystick virtual (polegar esquerdo, só direção) + botões à direita: habilidade, pausa, poderes, status. |
| Classes | **Mínimo 15, alvo 16**, cada uma com mecânica única. |

---

## FASE 1 — bugs, balanceamento e leitura de stats

### Bugs (causa raiz)
1. **P não pausa** — `togglePowers()` não mexia em `S.paused`; o loop só para com `S.paused`.
2. **Poderes por cima do menu** — `#powersOv` tinha z-index maior, mas fundo `rgba(...,0.86)` translúcido deixava os botões da pausa atravessarem.
3. **Inimigo "teleportando"** — é o **Orbitador**. Não se movia: era *reposicionado* todo frame em `Hh + cos(ang)*rad`. Como a cobra dá a volta no mapa (`% COLS`), ele saltava a arena inteira num frame. Virou movimento por velocidade.
4. **Almas perdidas ao abandonar** — a ação `abandon` nunca chamava o crédito de almas.
5. **Chefe sem nome** — o nome existia, mas o banner usava "⚠️ CHEFE ⚠️" como título. Agora nome no título + barra de vida de chefe no HUD.
6. **Ímã não alcança** — comida andava 1 célula/0,12s (~8,3 cél/s) e a cobra chegava a ~14 cél/s com upgrades; e a coleta exigia a cabeça entrar na célula exata. Virou raio de coleta + puxão proporcional à velocidade.

### Sistemas
- **Crítico**: nova stat **dano crítico** (base 200%). Excesso de taxa acima do teto **converte em dano crítico**, e cartas de taxa somem quando no teto.
- **Poderes empilháveis**: upgrades têm `id`, `max`, `req` e `tags`. Menu mostra **uma caixa por poder** com descrição e `[Nx]`, não repetidos.
- **Únicos**: veneno, ímã, execução, sorte dourada etc. não acumulam (`max: 1`) e saem do sorteio depois de comprados.
- **Pré-requisitos**: "Veneno Concentrado" só aparece com "Veneno Sombrio"; idem explosão, regeneração, crítico.
- **Tela de status**: dano, vel., vel. atk, alcance, nº projéteis, dano de veneno, taxa crítica, dano crítico, alcance de coleta, dano de explosão.
- **Escalonamento**: `src/core/scaling.js` centraliza vida/velocidade/dano de inimigos e chefes, com curva desenhada para 290 ondas.

### Duas mudanças estruturais que os testes forçaram
Não estavam na lista original, mas sem elas a onda 290 não fecha:

1. **Dano das cartas virou SOMA, não multiplicação composta.** `p.dmg *= 1.25` repetido
   ~30 vezes dá ~1500x, contra uma vida de inimigo que cresce 250x — o jogador passava a
   matar tudo de um tiro por volta da onda 150. Agora as cartas somam em `p.dmgMul`, o
   teto é o próprio limite de acúmulo (+10,3 = 11,3x) e a vida do chefe é calibrada
   contra isso.
2. **Poderes de transbordo.** A soma de todos os `max` é ~170 contra ~232 escolhas numa
   run completa: a partir da onda ~210 o sorteio ficava oferecendo cartas já no máximo.
   Quatro poderes sem teto (Essência da Serpente, Vigor Ancestral, Fragmento de Alma,
   Eco do Chefe) entram **só quando faltam menos de 3 cartas normais**.

### Balanceamento
- **Necromante NERF**: cura a cada 14 abates (era 10), vórtice 150px (era 190), cura exige 3+ acertos (era 2), dano base 0,95.
- **Bombardeiro BUFF**: explosão passiva 2,0 (era 1,2), raio 75 (era 60), bomba 7+boom*0,8 num raio maior, cooldown 4,5s (era 5), +1 HP.
- **Vampirismo NERF**: +7% por carta (era 12%), teto 22% (era 30%), e a cura do roubo tem intervalo próprio de 1,6s.
- **Velocidade da cobra**: piso central de intervalo por passo, para não virar 14 células/s.

---

### Pendente de playtest
O escalonamento foi validado por simulação com escolhas **aleatórias**, que é um proxy
fraco de jogo real (um jogador escolhe com sinergia e fica bem mais forte). Os números que
merecem atenção na primeira jogada longa:
- chefe da onda ~58 pode estar demorando demais para uma build sem foco;
- chefes dos atos VIII-X podem estar caindo rápido demais para uma build focada.
Ajuste em `bossHpMul` (`src/core/scaling.js`), que é o único lugar que controla isso.

---

## FASE 2 — conteúdo ✅ ENTREGUE

### O que mudou de plano durante a execução
- **Cadência de chefe**: era "a cada 5 ondas" (58 lutas com 8 chefes = cada um 7 vezes).
  Virou **ondas 10 e 20 do ato = mini-chefe, onda 29 = chefe do ato**: 30 lutas, e a de
  fechamento de ato é o clímax daquela era.
- **Tiers 3-5 são gerados por código** a partir do abissal, não escritos à mão. 15 tipos
  × 3 tiers seriam 45 entradas quase idênticas — e foi exatamente esse tipo de duplicação
  que quebrou a versão antiga (ela sorteava `splitter_veteran` sem tê-lo definido).
- **Afixos** entraram como a resposta ao "bosses que só jogam projétil é chato": o que
  diferencia um inimigo de tier alto não é vida, é o que ele FAZ. São 6, combináveis,
  e o anel colorido em volta do bicho diz qual é.
- **Brecha de punição** em todos os chefes: todo golpe pesado termina com o chefe exposto
  recebendo 50% mais dano (anel branco pulsante). É o que cria "leia, desvie, puna" no
  lugar de "atire sem parar".

### Entregue
- 10 atos com paleta, elenco e chefe próprios; a paleta do mundo troca na virada do ato.
- 2 chefes novos: **PESTILENTA** (cancela regeneração por 14s) e **O TIRANO DE FERRO**
  (reduz seu ataque a cada acerto). 2 inimigos comuns novos: **Sanguessuga** e **Quebrador**.
- 6 tiers de variante (101 tipos de inimigo no total).
- **16 classes**, cada uma com passiva e ativa próprias e uma carta exclusiva.
- Modos **Difícil** e **Impossível**, **AFK** e **2x velocidade**.
- **Checkpoint por ato**, reroll, 4ª carta e banimento.
- Necromante revive o parceiro caído no co-op.

---

## FASE 2 — plano original

### Os 10 atos (a história da cobrinha)
| Ato | Ondas | Era | Chefe de ato |
|---|---|---|---|
| I | 1-29 | Monocromático (1997) | wave 29 |
| II | 30-58 | Pixel / celular | wave 58 |
| III | 59-87 | Flash / navegador | wave 87 |
| IV | 88-116 | Neon / arcade | wave 116 |
| V | 117-145 | 3D | wave 145 (**elite**) |
| VI | 146-174 | Mobile / .io | wave 174 |
| VII | 175-203 | Vaporwave | wave 203 |
| VIII | 204-232 | Glitch / corrupção | wave 232 |
| IX | 233-261 | Vazio / abstrato | wave 261 |
| X | 262-290 | O Fim | wave 290 = **Devorador de Mundos** |

- Cadência de chefe dentro do ato: **ondas 10 e 20 do ato = mini-chefe; onda 29 = chefe de ato**. ~31 lutas na run inteira, em vez de 58 repetidas.
- **Tiers de inimigo** (novo a cada ~2 atos): base → veterano → abissal → infernal → primordial → corrompido.
- **Pools de upgrade por ato**: poderes avançados só entram no sorteio a partir de certos atos; raridade (comum/raro/épico/lendário) com cor na carta.

### Padrões de ataque (pedido explícito)
Chefe que só cospe projétil é chato. Cada chefe passa a ter **3 fases com moveset telegrafado** (antecipação → golpe → janela de punição), não um loop único. Inimigos comuns ganham telegrafia e recuperação. Afixos de chefe:
- **Cancela regeneração por muito tempo** (chefe) / **por pouco tempo** (inimigo comum).
- **Reduz o ataque do jogador ao acertá-lo**.

### Classes — roster de 16
| # | Classe | Mecânica única |
|---|---|---|
| 1 | ⚔️ Guerreiro | onda de choque com empurrão |
| 2 | 🔮 Mago | nova arcana perfurante |
| 3 | 🗡️ Assassino | teleporte com rastro de veneno |
| 4 | 💀 Necromante | vórtice de dreno (+ **revive o parceiro no co-op**) |
| 5 | 🛡️ Paladino | invulnerabilidade em área |
| 6 | 💣 Bombardeiro | bomba com alerta de área |
| 7 | 🪓 Berserker | +vida +dano -vel atk; ativa: imortal, +vel atk, **perde o controle**; explosão final com dano finito e custo de vida (revisado na fase 3) |
| 8 | 🏹 Centauro | consome um segmento a cada 1,4s no tiro pesado; ativa recupera até quatro e causa dano finito em área, com recarga de 18s (revisado na fase 3) |
| 9 | ❄️ Criomante | tiros desaceleram; ativa congela em área (gelo também entra como upgrades no pool geral) |
| 10 | 🐉 Hidra | +projéteis -dano base, cresce mais rápido; a cada X comidas um segmento ganha **cabeça extra que atira sozinha** |
| 11 | 🐍 Cascavel | +vel atk +alcance -vida; cauda empurra quem chega por trás; ativa: **stun** em grande raio |
| 12 | 👻 Espectral | +vel +veneno -defesa; quem toca o corpo fica **amaldiçoado (2x dano)**; ativa: fase etérea (atravessa projétil, obstáculo e o próprio corpo) |
| 13 | 🍖 Glutão | +alcance de ímã -alcance de tiro; dano e vel atk escalam com o **tamanho atual**, mas a cobra encolhe com o tempo |
| 14 | 🔧 Engenheiro | deixa **torretas** que atiram sozinhas; ativa: planta uma torre pesada |
| 15 | ⛈️ Tempestade | acertos **encadeiam raio** entre inimigos; ativa: tempestade que cai em alvos aleatórios |
| 16 | ⏳ Cronomante | campo que desacelera inimigos próximos; ativa: **reverte o tempo** (volta à posição e ao HP de 3s atrás) |

Cada classe ganha **2-3 upgrades exclusivos** no pool.

### Modos
- **Normal** — como hoje, com os padrões de ataque novos.
- **Difícil** — metade das vidas iniciais; toma **+0,5 de dano** (existe meio coração); **encostar na própria cauda tira 2**; inimigos mais agressivos e variantes mais cedo.
- **Impossível** — sobre o difícil: todo inimigo nasce com um afixo, chefes com dois, cura 50% mais fraca, comida envenenada mais comum, e a própria cauda tira 4.
- **AFK** — escolhe os upgrades sozinho, aleatoriamente.
- **2x velocidade** — multiplicador de `dt` (com teto de passo para não furar colisão).

### Economia
- **Reroll** das 3 cartas no fim da onda, e **4ª carta**, comprados na loja de almas.
- **Banir** um poder para ele não aparecer mais na run.

---

## FASE 3 — mobile, PVP e revisão de progressão ✅ IMPLEMENTADA

Escopo atualizado com as decisões do dono do projeto em setembro de 2026.

### PVP local + online/LAN

- Arena 100×100, dois jogadores em lados opostos, 10/10 HP e nível zero.
- Progressão por XP deixado pelos inimigos; cartas nos níveis 1, 5, 10 e múltiplos de cinco.
- Escolhas independentes **sem pausa**, em painéis compactos recolhíveis; atalhos 1/2/3 e 7/8/9 no local.
- Baralho, escudos, itens e ativas das 16 classes próprios do duelo.
- Buffs acumulados a cada 40s, inclusive nos inimigos vivos; mais XP, dano, velocidade, vida e nascimentos.
- Após 20 minutos, teleporte para arena pequena sem inimigos. Encolhimento até 9×9 e pressão para encerrar impasses.
- Morrer para a horda também perde. Mortes simultâneas empatam. Saída detectada encerra por desistência.
- Sem loja, árvore, reservas, AFK, dificuldade ou 2x da campanha.
- Efeitos de nível, escudo, explosões, teleporte e morte súbita; avisos persistentes de ataques na rede.

### Câmera, toque e rede

- Co-op e PVP locais em tela dividida; câmera própria por computador no online.
- Canvas ocupa a altura disponível, HUD compacto e dois joysticks independentes no local por toque.
- Sala permite escolher co-op ou PVP e transmite modo, poderes, itens, XP, arena e resultado.
- Relay PHP sem long polling bloqueante: mensagens agrupadas, estados antigos substituídos e comandos preservados.
- Sequência de snapshots, descarte de estados atrasados, recorte de entidades, limite de fila WebRTC,
  comandos MQTT confirmados e deduplicados, suavização e previsão visual do convidado.

### Balanceamento e economia

- Centauro: ativa recupera até 4 segmentos, contando crescimento pendente, com recarga de 18s;
  dano finito em área, sem execução de elites nem dano percentual gratuito em chefes.
  Flecha pesada a cada 1,4s, multiplicador 2,1 e carta exclusiva de +35%, até três vezes.
- Berserker: explosão final com dano finito e até dez alvos; aceleração temporária sem corromper upgrades.
- Hidra limitada a cinco cabeças; Glutão com escalonamento menor; ajustes de base para Guerreiro,
  Necromante e Engenheiro. Raio em cadeia não passa a curar inimigos em saltos longos.
- Almas como moeda única. Fragmentos antigos convertidos a 25:1; ramos antigos além da camada cinco
  e especializações incompatíveis reembolsados, sem reaplicar a conversão ao recarregar.
- Nove árvores com 364 nós possíveis cada; três filhos compráveis por nó e cinco camadas.
  Bloqueios só nas especializações indicadas, rendimento decrescente e opção de refazer com 80% de retorno.
- Custos por camada/nível ancorados na recompensa das ondas; novas melhorias e reservas consumíveis.

### Validação e próximo playtest

Testes automatizados de regras, interface, co-op LAN e PVP LAN/WebRTC estão disponíveis no projeto.
Ver [FASE3_VALIDACAO.md](FASE3_VALIDACAO.md) para cenários e medições. Latência entre computadores
físicos, partidas humanas completas e equilíbrio de vitórias por classe ainda exigem playtest real.
