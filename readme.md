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

O site é estático; só o ranking precisa de servidor.

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
seleciona a conexão e compartilha o código. O convidado escolhe a classe e o host
inicia a partida.

| Conexão | Funcionamento |
|---|---|
| **WebRTC** | Dados diretamente entre navegadores; usa internet na sinalização inicial. Opção preferida. Redes que impedem a conexão direta podem exigir outra opção. |
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
- Loja, árvore, consumíveis, dificuldade, AFK e velocidade 2x da campanha não entram
  no duelo. Classes têm ativas próprias para PVP, além de um item opcional.
- J1 local: **WASD**, **E** habilidade, **Q** item. J2: **setas**, **Enter**,
  **ponto**. Online: WASD ou setas, E, Q. Em telas de toque há controles por jogador.

## Almas, árvore e loja

Fragmentos foram retirados. O save converte cada fragmento antigo em **25 almas**
uma única vez. Nós antigos além da quinta camada são reembolsados; as demais
compras são preservadas. Especializações antigas incompatíveis são reembolsadas.

Cada uma das nove constelações tem **364 nós possíveis**: raiz + 3 + 9 + 27 + 81 +
243. Os três filhos podem ser comprados, exigindo o pai. Apenas especializações
explicitamente marcadas se bloqueiam: Canhão de Vidro/Fortaleza Viva e Arsenal
Vivo/Precisão Absoluta. É possível refazer uma constelação recebendo 80% do valor
registrado em suas compras.

Preços usam as recompensas de ondas como referência e crescem por camada ou nível;
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

- **16 classes**, cada uma com passiva, habilidade e **carta exclusiva** próprias — do
  Berserker que perde o controle da cobra ao Cronomante que rebobina 3 segundos
- **10 atos de 29 ondas**, cada um com paleta, elenco e chefe da sua "era". Vencer o
  chefe de um ato **libera começar dele** numa run futura
- **9 constelações** com **cinco camadas** além da raiz e 364 nós cada
  (três filhos por nó; bloqueios apenas nas especializações sinalizadas)
- **54 poderes** e **11 relíquias** que **acumulam**, têm **pré-requisitos** e param de
  aparecer quando o atributo chega ao teto
- **101 tipos de inimigo**: 15 bases × 6 tiers (veterano → abissal → infernal →
  primordial → corrompido), mais **6 afixos** combináveis que mudam o comportamento
- **10 chefes** nomeados, com moveset telegrafado e **brecha de punição** — todo golpe
  pesado deixa o chefe exposto a 50% mais dano
- **Modos difícil e impossível**, **AFK** e **2x velocidade**
- **Final de verdade**: derrote o Devorador de Mundos na onda 290 e a run termina em
  vitória, com almas em dobro

---

## Testes

Regras e validação de sintaxe (Node.js):

```bash
npm test
npm run check
```

Para os testes de interface e rede, instale as dependências de desenvolvimento,
inicie o servidor PHP na porta 8123 e execute:

```bash
npm install
npm run test:browser
npm run test:network
```

Os testes usam Edge em segundo plano e perfis isolados, sem alterar o save do seu
navegador. "test:network" inclui WebRTC real e precisa de acesso à sinalização e ao
CDN do PeerJS. Resultados e capturas ficam em "tests/artifacts". A validação e suas
limitações estão em [docs/FASE3_VALIDACAO.md](docs/FASE3_VALIDACAO.md).

## Licença

Ver [LICENSE](LICENSE).
