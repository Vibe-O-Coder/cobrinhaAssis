# O que estava quebrado e o que foi corrigido

Registro do que foi encontrado auditando a versão anterior (um `game.js` de 4405
linhas) e a versão nova, modular. Cada item foi **reproduzido no navegador**
antes de ser corrigido, e testado de novo depois.

---

## 1. Os que impediam o jogo de funcionar

### O HUD congelava na primeira habilidade usada
`render()` fazia `ef.life -= dt`, mas `render(v)` só recebe `v` — `dt` existia
apenas dentro de `frame()`. Com `"use strict"` isso vira `ReferenceError`.

Como o erro estourava **antes** da linha que remove o efeito, nenhum efeito
expirava nunca, e o erro se repetia a cada frame, para sempre. `updateHUD()`
ficava depois do ponto do erro e nunca mais rodava.

> Medido no navegador: **28 erros em 0,7 segundo**, um por frame. Pontuação
> interna 999, HUD mostrando 0.

**Correção:** o envelhecimento dos efeitos foi para `updateFx(dt)`, que já
recebe `dt`. `render()` agora só desenha, nunca altera estado.

### Da onda 13 em diante quase nenhum inimigo conseguia nascer
`pickType()` declarava `const pool = [...]` e depois fazia `pool = pool.filter(...)`.
Isso é `TypeError: Assignment to constant variable`.

> Medido: **falhava 193 de cada 200 chamadas** a partir da onda 13.

**Correção:** `let` + as variantes derivadas de uma tabela (`variantOf`), em vez
de oito blocos repetidos escritos à mão.

### Cinco tipos de inimigo eram sorteados mas não existiam
`splitter_veteran`, `charger_veteran`, `orbiter_veteran`, `healer_veteran` e
`sniper_veteran` eram usados pelo sorteio e não estavam no `EDEF`. Nascer um
deles dava `Cannot read properties of undefined (reading 'hp')`.

**Correção:** todas as variantes existem (13 tipos-base × veterano × abissal), e
`spawnEnemy` avisa no console em vez de derrubar a partida se receber algo
desconhecido.

### `cleanupEnemies()` chamava a si mesmo e lia fora do array
Morte → explosão → `cleanupEnemies()` de novo, dentro do laço original. O índice
ficava maior que o array encolhido. Toda morte múltipla com explosão perdia um
frame inteiro (sem desenho, sem atualização).

**Correção:** guarda de reentrada e varredura reiniciada a cada remoção.

---

## 2. Multiplayer

### O host ficava preso, e clicar em "Entrar" destruía a própria sala
Era o problema relatado por vocês. `createRoom()` escrevia o código gerado
**dentro do campo de ENTRAR** e deixava o host na mesma tela. O lobby só
aparecia quando alguém entrasse.

Então o host via o próprio código na caixa de "Entrar", clicava ali — a coisa
óbvia a fazer — e `joinRoom()` cancelava a sessão de host e o transformava em
convidado da própria sala vazia. Batendo numa porta que não existia mais. Para
sempre.

> **O transporte nunca esteve quebrado.** Testando host e convidado em duas abas,
> o MQTT conectava, o lobby sincronizava e o convidado recebia o estado do jogo
> normalmente. O que matava era só o beco sem saída da interface.

**Correção:** criar sala leva direto ao lobby, com o código em destaque e botão
de copiar. O campo de entrar nunca é preenchido sozinho, e tentar entrar na
própria sala avisa em vez de quebrar.

### Escolher "WebRTC" usava MQTT caladamente
`openByMode()` só olhava o botão do PHP e caía em MQTT no resto.

**Correção:** os três modos funcionam. WebRTC virou o padrão — **ping de 2–3ms
contra 232ms do MQTT** no mesmo teste.

### Um pacote perdido travava a partida para sempre
As mensagens de escolha de poder (`up`/`pick`/`go`) eram enviadas uma única vez,
sem confirmação. O MQTT publica com QoS 0, ou seja, sem garantia de entrega.

**Correção:** o estado da escolha viaja junto do pacote periódico (20x/s), então
qualquer perda se corrige no tique seguinte.

### Se o convidado escolhesse o poder antes do host, os dois travavam
`maybeFinish()` chamava `showWait()`, que apaga as cartas — inclusive as que o
host ainda estava olhando. O host não tinha mais como escolher e a fase ficava
presa em "choice" para sempre.

**Correção:** a tela só troca para "aguardando" quando ninguém local está
escolhendo.

### Se o convidado caísse, a vaga nunca era liberada
Qualquer pacote renovava o relógio de "sinal de vida" — inclusive as batidas do
convidado **novo** tentando entrar. A vaga morta se mantinha viva pelas próprias
tentativas de reconexão, e o host respondia "sala cheia" eternamente.

**Correção:** só o parceiro estabelecido conta como sinal de vida.
> Testado: convidado recarrega a página e **volta sozinho em poucos segundos**.

### Os dois lados podiam parar em brokers MQTT diferentes
Cada um percorria a lista de brokers por conta própria. Se o primeiro falhasse
só para um deles, cada um ficava num broker — os dois "conectados", sem nunca se
verem.

**Correção:** o broker inicial é derivado do código da sala, igual dos dois lados.

### O convidado não via efeito nenhum
O snapshot não levava efeitos. Na prática o jogador 2 não via explosões, nem
números de dano, **nem a linha de mira do franco-atirador** — que existe
justamente para dar chance de desviar.

**Correção:** efeitos viajam como eventos (só quando nascem) e envelhecem do
outro lado. Custo medido: pacote de ~850 bytes.

### Outros
- O convidado recebia fragmentos mas **não** as almas que a tela anunciava, e o
  recorde dele nunca era registrado.
- Quem entrasse numa sala durante uma partida alheia era premiado com as almas e
  o recorde dessa run.
- Com o host morto esperando renascer, se o convidado saísse a partida seguia
  sem nenhuma cobra viva, sem fim de jogo e sem salvar a pontuação.
- O menu de pausa sumia para sempre depois de jogar como convidado (era escondido
  20x por segundo e nada no código o trazia de volta).
- Um convidado podia disparar a habilidade com o jogo pausado.
- A cor recebida do outro jogador ia direto para `innerHTML` — dava para injetar
  HTML no HUD de quem recebia.
- `leaveOnline()` não parava o timer de envio de estado, que vazava para a run
  seguinte.

---

## 3. Jogabilidade e equilíbrio

### A mira do franco-atirador nunca funcionou
O código lia `Hh.vx` / `Hh.vy` para prever para onde o jogador ia. Mas `headPx()`
devolve só `{x, y}` — nunca teve velocidade. **A predição somava exatamente
zero** e o tiro saía na posição atual.

Pior: o "laser de mira" nascia no mesmo instante do disparo, com 0,15s de vida.
Não avisava nada — um tiro a 1400px/s sem aviso é indesviável.

**Correção:** `headVel()` calcula a velocidade real da cabeça, e existe uma fase
de mira que mostra a linha **antes** do tiro.

### boss5, boss6 e boss_elite eram bolhas genéricas
Existiam no `EDEF` e eram sorteados, mas não tinham padrão de ataque, nem
desenho (caíam no `|| artGrunter`), nem fórmula de vida — e ainda podiam ser
sorteados como "elite" e ganhar 3x de vida em cima da escala da onda.

**Correção:** cada um ganhou comportamento e desenho próprios — O Prisma varre a
arena com feixes giratórios, A Colmeia tem satélites que perseguem, O Arauto
alterna entre três fases. E chefe não é mais sorteado como "elite".

### Uma pilha de escudos sumia num encostão
O escudo era consumido **antes** da checagem de invulnerabilidade e não concedia
i-frames. Como o dano de contato é aplicado a cada frame, encostar num inimigo
por 1/15 de segundo gastava 4 cargas.

**Correção:** cada carga absorve um golpe, não um frame.

### Espinhos davam dano 60 vezes por segundo
E o dano dependia do FPS: quem tivesse o PC melhor matava mais rápido só por isso.

**Correção:** intervalo de contato por inimigo.
> Medido: **5 de dano em 2s tanto a 30 quanto a 60 FPS.**

### O Guardião quase não protegia
A aura reduzia dano de explosões e espinhos, mas **não dos tiros** — de longe a
principal fonte de dano.

### A "CHUVA DOURADA" não fazia nada
O modificador aparecia no banner e não era lido em lugar nenhum.
> Agora: 18% → 50% de comida dourada.

### A árvore de habilidades cobrava por nada
- `Math.floor` zerava todo nó de tier baixo: um nó de "+0,6 HP máximo" virava
  `floor(0,6) = 0`. Você pagava fragmentos por literalmente nada.
- Todo nó de escudo acima da raiz era um no-op pago (teto de 1, raiz já dava 1).
- A raiz de Espírito anunciava +5% de roubo de vida e entregava o **teto de 30%**
  na hora, porque o campo era escrito em duas escalas diferentes (0–1 e 0–100).

### Outros
- "Regeneração Maior" pegada **antes** de "Regeneração" dava o valor fraco.
- O empurrão do Guerreiro dividia pela distância duas vezes: com o inimigo
  colado, o arremessava ~1500px para fora do mapa.
- Morrer logo depois de derrotar o chefe final ainda dava a tela de vitória e as
  almas em dobro.
- Chefes vazavam de uma onda para a seguinte (e para a run seguinte) por um
  `window.extraBosses` que nunca era limpo, e um `setTimeout` solto fora do game
  loop podia despejar um chefe na onda errada.
- O sorteio de "múltiplos chefes" spawnava N cópias do **mesmo** chefe.

---

## 4. Ranking

O ranking **nunca teve como ser global**: `netlify/functions/score.js` gravava
com `fs.writeFileSync`. O sistema de arquivos de uma Function é somente-leitura
e efêmero, então toda gravação falhava e o GET sempre devolvia lista vazia.

Pior, a lista de endpoints do cliente continha `https://seu-projeto.vercel.app/...`
e `https://api.example.com/...` — endereços de exemplo que nunca foram trocados.
O jogo mandava **nome e pontuação de quem jogou para esses domínios de
terceiros**, e abrir o ranking offline travava a tela em "carregando..." por até
24 segundos tentando cada um.

**Correção:** um único endpoint, usando **Netlify Blobs** (persistente de
verdade). Os domínios de exemplo foram removidos.
> Medido: ranking offline cai para o local em **0,2 segundo**.

---

## 5. Interface

- `style.css` tinha `z-index: 99 !important;  # comentário` — e `#` **não é
  comentário em CSS**. O navegador descartava a linha. O "conserto" anterior para
  os poderes aparecerem na frente da pausa nunca chegou a existir.
- Por isso `togglePowers()` **despausava o jogo** para mostrar os poderes: era a
  única forma de eles ficarem visíveis. Agora P abre por cima da pausa e o jogo
  continua parado.
- A arena tinha 2800×2100px espremidos em 960px de largura pelo CSS — escala de
  0,34. A cobra ficava com 9px na tela e o navegador ainda pintava 2800×2100 a
  cada frame. Agora existe uma **câmera** que segue o jogador: o mapa continua
  grande, mas você o vê em escala 1:1, com ~6x menos trabalho por frame.
- `#cwrap` tinha `line-height: 0`, herdado pelo banner: título e subtítulo da
  onda eram desenhados um em cima do outro.
- Digitar o nome ligava e desligava o som a cada letra "m", e a barra de espaço
  e as setas não funcionavam dentro do campo do código da sala — o jogo
  interceptava as teclas antes de checar o foco.
- Enter no campo do código não fazia nada.
