# Fase 3 — validação

Implementação concluída em 22/09/2026. Este registro separa verificações
automatizadas de pontos que ainda dependem de partidas humanas.

Resultado final: **23 testes/cenários aprovados**, sem erros de execução no
navegador. Validação de sintaxe dos módulos JavaScript e do relay PHP aprovada.

## Ambiente e reprodução

Node.js, PHP e Microsoft Edge no Windows. Os testes de navegador usam Playwright
1.62.1 e perfis temporários isolados: não leem nem alteram o save do navegador do
jogador. Nesta validação foi utilizado o Playwright já disponível no ambiente.

```bash
npm install
npm test
npm run check
php -l backend/relay.php
```

Com `npm run dev` rodando em outro terminal:

```bash
npm run test:browser
npm run test:network
```

O endereço padrão dos testes é `http://127.0.0.1:8123`; `TEST_URL` permite trocar.
`PLAYWRIGHT_MODULE` permite usar uma instalação existente do Playwright.
O teste WebRTC usa a sinalização e o CDN do PeerJS pela internet. As conexões e
salas dos testes são encerradas ao final. Capturas e relatórios JSON são gravados
em `tests/artifacts/`, pasta ignorada pelo controle de versão.

Para jogar entre computadores da mesma LAN, `npm run dev:lan` serve o jogo em
todas as interfaces. Ambos devem abrir `http://IP-DO-SERVIDOR:8123` e selecionar
PHP na sala. O servidor precisa estar acessível na rede privada do Windows.

## Regras — 6 testes

- As nove árvores têm raiz e cinco camadas ternárias, pais obrigatórios e conflitos simétricos.
- A compra de uma árvore inteira mantém bônus finitos e rendimento decrescente.
- Poderes PVP nos níveis 1/5/10…; buffs e nascimentos têm progressão e limites.
- Preços crescem por nível, sem depender do saldo acumulado.
- Previsão de movimento preserva comandos pendentes e respeita pausa e confirmação do host.
- Migração preserva o saldo, converte fragmentos uma vez e reembolsa caminhos removidos/incompatíveis.

## Navegador — 13 cenários

- Inicialização e co-op local com duas câmeras no mapa 100×100.
- PVP começa com 10 HP e sem vantagens permanentes, mesmo com save avançado.
- Escolhas simultâneas nos níveis corretos; o relógio continua e os atalhos funcionam.
- Morte súbita limpa perigos, limita a arena e encerra impasses defensivos.
- Centauro causa dano finito e repõe munição limitada; raio em cadeia não cura alvos distantes.
- Compra de irmãos na árvore e bloqueio apenas das especializações indicadas.
- Migração de um save antigo, incluindo recarregamento sem conversão duplicada.
- Ativas das 16 classes no PVP sem erros nem estatísticas inválidas.
- Canvas e controles em 844×390, 390×844 e 1024×768.
- Dois toques simultâneos controlam jogadores distintos e liberam os dois joysticks corretamente.
- Escudo contra a horda, derrota por inimigos e empate por mortes simultâneas.
- Compra de reservas, preservação no PVP e consumo único na campanha.
- PVP pelo relay PHP real: sala, câmeras, movimento, item, poder ao vivo e resultado sincronizado.

## Rede — 4 cenários

- Co-op pelo relay PHP: câmera individual, pausa sincronizada e escolha de poderes de ambos.
- Atraso artificial de 250 ms nos comandos: o convidado mostra a curva antes da chegada ao host.
- PVP por WebRTC real: movimento e vitória do host quando o convidado desconecta.
- Saída do host: convidado vence, com nível, abates e recompensa do último estado recebido.

## Medições e limites

Os testes usam dois contextos de navegador **no mesmo computador**. O relay PHP
apresentou amostras de ping de 50–97 ms nas execuções desta revisão; WebRTC direto
apresentou uma amostra de 2 ms. São leituras pontuais do indicador do jogo, não
médias, percentis nem promessa de latência em outra rede. A simulação de 250 ms
verifica a resposta visual antecipada; colisões e dano continuam decididos pelo host.

Não foram medidos ping entre computadores físicos, perda de pacotes em Wi-Fi,
conexões entre regiões ou desempenho em celular físico. O transporte MQTT recebeu
ajustes de fila e confirmação de comandos, mas não entrou na bateria de conexões
reais. Morte súbita foi verificada avançando o relógio da simulação, sem esperar
20 minutos em tempo real. Não houve partida humana completa de todas as classes.

## Playtest sugerido

Jogar algumas partidas em dois computadores e registrar duração, classe vencedora,
nível atingido, ping e travadas. Na campanha, registrar almas por hora e compras
mais usadas. Esses dados permitem ajustar classes e preços sem recolocar o
Centauro como escolha obrigatória ou tornar os ramos profundos triviais de comprar.
