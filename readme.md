# 🐍 Snake Roguelike Ultra

Jogo da cobrinha transformado em **roguelite de ação em tempo real**: você escolhe uma
classe, sobrevive às ondas, ganha poderes durante a partida e enfrenta chefes com padrões
de ataque próprios — até o Devorador de Mundos, na **onda 290**, que encerra o jogo.

São **10 atos de 29 ondas**: um ato para cada ano desde que a cobrinha original saiu.

---

## Como rodar

O jogo usa **módulos ES**, então **não funciona abrindo o `index.html` com dois cliques**
(o navegador bloqueia módulos em `file://`). Ele precisa ser servido por HTTP.

**No XAMPP:** ponha a pasta em `htdocs/` e abra `http://localhost/assisCobrinha/`.

**Sem XAMPP,** qualquer um destes serve:

```bash
php -S localhost:8123
```

```bash
npx --yes serve -l 8123
```

Depois abra `http://localhost:8123`.

Para outros computadores da mesma rede acessarem o servidor PHP, use
`npm run dev:lan` e abra `http://IP-DO-SERVIDOR:8123` nos dois computadores.
Se o Windows pedir acesso à rede, permita na sua rede privada.

---

## Publicando no Netlify

O jogo é estático; o ranking usa Netlify Functions e o multiplayer automático usa
o servidor de salas no Render. Para atualizar as duas partes, siga
[o guia do Render e Netlify](comece-aqui-render.md).

1. Suba a pasta para um repositório Git e conecte no Netlify (ou arraste a pasta em
   `app.netlify.com/drop`).
2. O `netlify.toml` já aponta `publish = "."` e `functions = "netlify/functions"`.
3. O ranking usa **Netlify Blobs**. Ative em *Site configuration → Blobs* caso não venha
   ligado. Não precisa configurar banco nem variável de ambiente.

### Ranking global jogando no XAMPP

Rodando em `localhost`, o endpoint `/.netlify/functions/score` não existe. Para que o
placar da escola seja **o mesmo** do site publicado, abra
[`src/ui/leaderboard.js`](src/ui/leaderboard.js) e preencha:

```js
export const REMOTE_API = "https://SEU-SITE.netlify.app/.netlify/functions/score";
```

Deixando `""`, o ranking em localhost fica apenas local (salvo no navegador).

---

## Multiplayer

O co-op e o PVP funcionam **localmente e online/LAN**. No mesmo computador a
arena tem duas câmeras lado a lado; em rede cada computador acompanha seu jogador.

Na tela **Multiplayer Online**, quem cria a sala escolhe **Co-op** ou **PVP**,
nome e visibilidade. Salas públicas aparecem na lista; privadas exigem código e
senha criada pelo host ou gerada pelo jogo. O convidado escolhe a classe e o host
inicia a partida. A senha é verificada no servidor, e a sala privada não é listada.

**Automático** é o padrão: inicia o servidor quando necessário, entra pelo relay
WebSocket e tenta uma conexão direta entre os jogadores. Ao entrar por código,
o jogo identifica a conexão da sala. Os modos legados continuam nas opções avançadas.

| Conexão | Funcionamento |
|---|---|
| **Automático / servidor de partidas** | Lista de salas, códigos exclusivos e senha. Começa pelo Render, tenta conexão direta e volta ao servidor se necessário. |
| **WebRTC (avançado)** | Negocia conexão entre navegadores; redes restritivas podem exigir TURN. |
| **PHP / XAMPP** | Relay na rede local, sem necessidade de internet. Os dois computadores precisam abrir o mesmo endereço do servidor, por exemplo o IP LAN de quem hospeda. |
| **MQTT** | Relay público pela internet. Alternativa quando a conexão direta não funciona; a distância até o broker influencia o ping. |

O relay PHP usa leituras curtas e mantém apenas o estado mais recente, evitando a
fila que causava travadas. Snapshots têm sequência, recorte de entidades visíveis,
suavização e previsão visual do movimento do convidado. O host decide colisões e dano.
Não é preciso abrir portas adicionais para usar o relay PHP já acessível na LAN.

## Duelo PVP

- Mapa **100×100**, nascimento em lados opostos e **10/10 HP**, nível zero.
- Inimigos deixam XP disputável no chão; cada nível melhora os atributos. Poderes
  nos níveis **1, 5, 10, 15…**, em um baralho próprio.
- As cartas aparecem em um painel pequeno e **não pausam a partida**. J1 escolhe
  com **1/2/3** e J2 local com **7/8/9**; mouse e toque também funcionam. O painel
  pode ser recolhido sem perder a escolha.
- Buffs acumulam a cada 40 segundos: vida, velocidade, dano, XP e frequência de
  nascimento aumentam, com limite de inimigos vivos.
- Aos **20 minutos**, ambos vão para uma arena sem inimigos que encolhe até 9×9.
  Pressão adicional depois de 90 segundos impede duelos defensivos intermináveis.
- Morrer para o oponente **ou para os inimigos** perde a partida. Mortes simultâneas
  empatam. Desconexão detectada concede a vitória ao jogador que permaneceu.
- Loja, árvore, consumíveis, dificuldade, AFK e acelerações da campanha não entram
  no duelo. Classes têm ativas próprias para PVP, além de um item opcional.
- J1 local: **WASD**, **E** habilidade, **Q** item. J2: **setas**, **Enter**,
  **ponto**. Online: WASD ou setas, E, Q. Em telas de toque há controles por jogador.

## Almas, árvore e loja

Fragmentos foram retirados. O save converte cada fragmento antigo em **25 almas**
uma única vez. Nós antigos além da terceira camada são reembolsados; as demais
compras são preservadas. Especializações antigas incompatíveis são reembolsadas.

Cada uma das nove constelações tem **40 nós possíveis**: raiz + 3 + 9 + 27.
O mapa exibe todos os nós da constelação, inclusive os ainda bloqueados. É possível
comprar uma ramificação inteira de uma vez, descontando nós adquiridos e
incluindo pré-requisitos; a operação exige saldo integral. Os três filhos podem ser comprados, exigindo o pai. Apenas especializações
explicitamente marcadas se bloqueiam: Canhão de Vidro/Fortaleza Viva e Arsenal
Vivo/Precisão Absoluta. É possível refazer uma constelação recebendo 80% do valor
registrado em suas compras.

Na árvore, raiz e níveis 1/2/3 custam 250/750/2.250/6.500 almas. Os buffs de cada
nível crescem em fatores de 1/2,5/6. Preços da loja usam recompensas de ondas como referência;
o saldo acumulado não aumenta os preços. Há rendimento decrescente nos atributos.
A loja inclui alcance, coleta, recarga de habilidade e provisões, além de reservas
recorrentes de rerrolagem, banimento e bênção. Uma carga de cada reserva é consumida
na próxima run de campanha, inclusive se ela for abandonada; no co-op online, as
melhorias e reservas usadas pela simulação são as do host.

---

## Estrutura

```
index.html            página única; carrega só src/main.js
style.css
src/
  main.js             ponto de entrada: liga os botões e inicia o loop
  core/               config, escalonamento, estado compartilhado, save, áudio,
                      utilitários
  data/               classes, atos, modos, inimigos, poderes, relíquias, loja, árvore
  game/               loop, ondas, jogador, IA dos inimigos, projéteis,
                      habilidades, classes 7-16, escolha de poder, árvore,
                      tetos de atributo, ciclo da run
  render/             canvas, câmera, desenho, arte vetorial, efeitos, HUD
  net/                transportes, sessão, salas e sincronização
  ui/                 telas, menu, loja, árvore, ranking, overlays, teclado
backend/
  relay.php           relay de sala para LAN/XAMPP
  api.php             ranking alternativo em MySQL/arquivo para XAMPP
netlify/functions/
  score.mjs           ranking global (Netlify Blobs)
docs/                 ROADMAP.md (decisões das próximas fases) e anotações antigas
```

Todo o estado que muda durante a partida vive no objeto `S`
([`src/core/state.js`](src/core/state.js)) — módulos ES não permitem que um arquivo
reatribua a variável de outro, então `S.wave = 3` funciona de qualquer lugar e
`wave = 3` não funcionaria.

---

## Depurando

Em `localhost` ou na rede local, o jogo expõe `window.SRK` no console (F12):

```js
SRK.S.wave                  // onda atual
SRK.S.players[0].hp = 999   // vida infinita
SRK.save.souls = 100000     // almas para testar loja e árvore
SRK.startWave(250)          // pular direto pro ato IX
```

Em jogo: <kbd>P</kbd> mostra os poderes da run, <kbd>T</kbd> mostra os atributos, e
**as duas telas pausam a campanha**. No PVP, a leitura de poderes e status também
mantém a partida em movimento; a pausa explícita continua disponível ao host.

Em produção esse objeto não existe.

---

## Conteúdo

- **17 classes**, incluindo **Atirador**, com passivas, habilidades e cartas exclusivas. O **Apostador**
  substitui o Espectral: recebe duas cartas aleatórias por recompensa e lança um
  dado de dez resultados; o pior deixa 1 HP (meio coração).
- **3 caminhos de ultimate por classe, com 10 evoluções cada**: 510 cartas de
  especialização, com versões ajustadas para PVP. Escolher um caminho exclui os
  outros durante aquela run; nível X adiciona um golpe final reforçado.
- **10 atos de 29 ondas**, cada um com paleta, elenco e chefe da sua era. O menu
  permite iniciar em qualquer onda, com um upgrade aleatório por onda inicial ou
  sem cartas iniciais. Exemplo: onda 200 concede exatamente 200 upgrades.
  Os benefícios de atributos da loja e árvore continuam valendo fora do Hardcore.
  Partidas avançadas não alteram o ranking nem os recordes da campanha.
- **9 constelações** com **três camadas** além da raiz e 40 nós cada
  (três filhos por nó; bloqueios apenas nas especializações sinalizadas)
- Poderes e relíquias com pré-requisitos e limites. Cartas de classe têm borda
  própria; ultimates têm borda dourada dupla e exibem caminho e evolução.
- **75 espécies**, divididas em 25 iniciais, 25 intermediárias e 25 avançadas.
  Todas têm patentes veterana e elite, com padrões melhorados, além de variações
  de velocidade, resistência e efeitos. Hordas de até **200 inimigos**;
  a vida considera a onda e o poder ofensivo da equipe.
- **25 chefes** com padrões próprios, ataques anunciados e fases protegidas contra
  morte instantânea. Chefes conhecidos voltam em duplas e trios, inclusive em
  grupos mistos, com proteção e ataques coordenados por proximidade.
- **Minimapa** na campanha e no PVP, incluindo alvos fora da câmera no multiplayer.
- **Modos difícil, impossível e Hardcore**, **AFK** e velocidades **1×/2×/3×/4×/5×/10×/20×**.
  Hardcore impede aumentar a vida máxima, ignora loja/árvore/consumíveis e aumenta
  em 60% a vida e 25% a velocidade dos inimigos. Aceleração não se aplica ao PVP.
- **Boss Rush:** 25 encontros, relíquias entre chefes e vitória no Devorador;
  sem ranking ou recordes da campanha.
- **Seis frutas acumuláveis:** banana (+30% ataque/10s), morango (+0,1% ataque/run),
  melancia (+75% dano/10s), melão (+0,5% dano/run), uva verde (+2 tiros/10s) e
  uva roxa (cada 10 dão +1 tiro/run). Cada coleta temporária expira separadamente.
- **QTEs no Devorador:** sequência de três direções, 2,8s reais por entrada,
  teclado e toque; pausa o combate, funciona em co-op e ignora aceleração.
  Karkos usa pinças de canhões, muralhas móveis e xadrez de estilhaços;
  Iridis e Arauto também receberam padrões próprios de projéteis.
- **Trilha instrumental original:** dez temas de atos e 25 arranjos de chefes,
  sintetizados localmente. Volume independente e respeito ao botão de mudo.
- **Co-op:** cartas exclusivas de Vanguarda (J1) e Retaguarda (J2), com escudo e
  cura do aliado entre ondas. Minimapa azul/branco/vermelho para você/aliados/inimigos.
- **Sandbox / Laboratório:** escolha classe, nível, atributos, poderes e ultimate;
  crie criaturas de qualquer patente ou jogue qualquer onda, incluindo a 290.
  Sem alterar recompensas e recordes da campanha. Tecla **B** abre o painel.
- **100 artes SVG** de criaturas e chefes, com [bestiário pesquisável](assets/bestiary.html).
  Frutas e ícones da interface usam vetores. A opção **Arte → Emojis** reverte
  os ícones e criaturas; os sprites vetoriais são carregados em cache.
- Conexão automática tenta **WebRTC direto** dentro da sala autenticada e volta
  ao relay se necessário. Estados compactos, colisões por proximidade, sprites
  e brilhos em cache reduzem o trabalho durante as hordas.
- **Devorador de Mundos** gigante e fixo no alto de uma arena sem paredes fatais:
  sair por uma borda leva à oposta. Tem três fases, lasers, corredores seguros e
  ataques próprios; vencê-lo na onda 290 encerra a campanha.

---

## Testes

Regras e validação de sintaxe (Node.js):

```bash
npm test
npm run check
```

Para os testes de interface e rede, instale as dependências, inicie o servidor PHP
na porta 8123 e o servidor de salas na porta 9000 (em `peer-server`, rode `npm ci`
e `npm start`). Depois execute na raiz do projeto:

```bash
npm install
npm run test:rooms
npm run test:browser
npm run test:network
npm run test:expansion
npm run test:lab
npm run test:progression
npm run test:soundtrack
npm run test:direct
npm run test:perf
```

Os testes usam Edge em segundo plano e perfis isolados, sem alterar o save do seu
navegador. Os testes de rede usam PHP e o relay local; a expansão também cobre
as 51 especializações em campanha/PVP, bosses, salas e telas de celular. Resultados
e capturas ficam em `tests/artifacts`. A validação e as limitações das medições estão
em [docs/OTIMIZACAO_E_SANDBOX.md](docs/OTIMIZACAO_E_SANDBOX.md).
Use `npm run build:bestiary` para regenerar as artes e o catálogo a partir dos dados.
O [planejamento de cutscenes](docs/PLANO_CUTSCENES.md) é somente uma proposta; cenas
cinemáticas ainda não foram implementadas.

## Música e narrativa

As oito faixas de `tracks/` já tocam no menu, nos quatro primeiros atos e nas três
fases do Devorador. Atos e chefes sem MP3 preservam os temas procedurais.
A fase II é um survival de aproximadamente 4min18s, acompanhado pela gravação
vocal em inglês: núcleo protegido, contador visível e velocidade 1×. Ao terminar,
a fase III volta a ser vencida por dano. Pausa e QTE suspendem a música; desligar
o áudio não impede a progressão. O [catálogo das faixas](tracks/README.md) explica
as transições e os marcadores de encenação.

O projeto de lore [Memórias da Grade](docs/PROJETO_LORE.md) tem
[seis concepts de cutscenes](docs/CONCEPTS_CUTSCENES.html), com referências musicais
que podem ser ouvidas no navegador. São estudos para produção futura.

## Licença

Ver [LICENSE](LICENSE).
