# Otimização, bestiário e sandbox — setembro de 2026

Esta revisão está nos arquivos locais. É necessário republicar o jogo no Netlify e o servidor no Render, conforme [o guia de atualização](../comece-aqui-render.md).

## Conexão e ping

A sala continua autenticada por código e senha. Depois da entrada, o jogo negocia uma conexão WebRTC diretamente entre os dois jogadores. A sinalização e a presença ficam no Render; os dados da partida podem seguir diretamente. Se WebRTC não estiver disponível ou a comunicação direta falhar, o jogo continua pelo relay. A interface informa a rota ativa.

Com ambos no Brasil e o Render em Oregon, a proximidade física entre jogadores não elimina o desvio pelo servidor. O ping do jogo mede uma mensagem indo até o parceiro e voltando. Pelo relay, ambas as viagens passam pelo Render. Os 170 ms observados em outro jogo até um servidor não são necessariamente a mesma medida. Congestionamento, filas de envio, rede móvel, rota do provedor e tempo de processamento também podem contribuir. Não foi medida a causa exata dos 500 ms entre esses dispositivos.

Mudanças:

- Canal confiável para comandos e canal sem retransmissão para estados que já serão substituídos pelo próximo estado.
- Estados compactos, independentes, com sequências que descartam estados atrasados. Sem depender de um pacote anterior para reconstruir a partida.
- Limites de fila menores para não acumular estados antigos. Mensagens grandes usam o relay quando excedem o tamanho aceito pelo canal direto.
- Troca de rota verificada por mensagens de ida e volta; falhas voltam ao relay. A previsão visual do convidado continua respeitando a autoridade do host.

O canal direto depende das redes e não inclui um serviço TURN pago. A alternativa para redes restritivas é o próprio relay. O Render continua necessário para criar, autenticar e manter a sala. A melhoria não garante um valor específico de ping na internet.

Referências: [canais de dados WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels), [controle de retransmissões](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/maxRetransmits) e [regiões do Render](https://render.com/docs/regions).

## Desempenho e correções

- Colisões de projéteis e separação de inimigos consultam células próximas, evitando comparar cada entidade com toda a horda.
- Projéteis do jogador verificam o trajeto percorrido entre frames para atingir inimigos pequenos.
- SVGs são carregados em pequenos lotes e desenhados a partir de imagens em cache. Brilhos de projéteis também são reutilizados.
- Partículas são reutilizadas; seu limite é aplicado antes da criação. Sons simultâneos e repetidos têm limites próprios.
- Avisos de áreas perigosas têm uma representação persistente, sem duplicar cada aviso na lista de efeitos. Há limites de 200 inimigos, 900 projéteis inimigos e 320 áreas perigosas; efeitos decorativos têm limites separados.
- Stun, silêncio e desarme têm durações curtas e imunidade temporária à reaplicação. O stun pausa o contador de movimento, evitando uma arrancada indevida ao terminar.
- Corrosão e bloqueio de regeneração das novas espécies são aplicados ao jogador. O sandbox não consome reservas nem altera recompensas, recordes ou ranking.

### Medição local

Cena automatizada: 200 inimigos, incluindo três bosses, 420 partículas no pico e duas câmeras. Edge em segundo plano, 240 passos de simulação. Os resultados variam com a máquina e o sorteio de ataques; a revisão também introduz comportamentos e arte novos, portanto a comparação entre revisões não isola cada otimização.

| Medida média | Antes desta revisão | Revisão atual |
| --- | ---: | ---: |
| Simulação por passo | 2,84 ms | 1,24 ms |
| Envio de comandos de desenho ao canvas | 1,12 ms | 1,26 ms |
| Preparação e serialização do estado | 0,52 ms | 1,03 ms |
| Pacote de estado enviado | 49.327 bytes | 30.301 bytes |

Na revisão atual, o mesmo estado ocupa em média 63.215 bytes sem compactação e 30.301 com ela: **aproximadamente 52% menos dados**. A compactação tem custo de CPU, mostrado na tabela; o teste atual serializa também a versão sem compactação para comparar os tamanhos. O custo de desenho mostrado mede o trabalho de CPU para emitir comandos, não o tempo final da GPU. Estes números **não são FPS nem garantia de desempenho em celulares**.

As medições observadas estão preservadas na tabela acima. `npm run test:perf` mede a versão atual e gera `tests/artifacts/perf-current.json`. Os testes de rede usam navegadores no mesmo computador, portanto o ping deles não representa o ping entre os dois jogadores no Brasil.

## 75 espécies e 25 bosses

O elenco tem 25 espécies por etapa, com combinações próprias de movimento, ataque, comportamento secundário e efeito. Veteranos, elites e variações elementais **não são contados como espécies adicionais**. Espécies anteriores continuam aparecendo com menor peso quando uma etapa nova começa.

| Etapa | Ondas | Evolução das patentes |
| --- | --- | --- |
| Inicial | 1–96 | Veteranos iniciais a partir da 73 |
| Intermediária | 97–193 | Elites iniciais e veteranos intermediários a partir da 170 |
| Avançada | 194–290 | Elites intermediários e veteranos avançados a partir da 242; elites avançados a partir da 275 |

As espécies são introduzidas progressivamente dentro dessas faixas. Veteranos alteram as rajadas, a geometria ou a sequência do ataque. Elites acrescentam uma segunda geometria em ciclos alternados. Variações naturais, frenéticas, pesadas, venenosas, flamejantes, congelantes e elétricas modificam estatísticas ou efeitos de acerto.

Os 25 bosses incluem o Devorador. Cada um alterna três ataques; fases e patentes intensificam os padrões. Há portões de cerco, raízes, sinos silenciadores, formações em V, martelos, marés, relógios, reflexos, constelações e eclipses. Chefes anteriores reaparecem em encontros combinados. A onda 290 mantém a arena especial e as três fases do Devorador.

As 100 artes estão em `assets/enemies` e `assets/bosses`. O [bestiário pesquisável](../assets/bestiary.html) mostra as artes, os nomes, a onda de estreia e os comportamentos. As silhuetas formam famílias visuais entre etapas; a contagem de espécies é baseada no elenco e nos comportamentos, não em recolorações de uma mesma patente.

## Como usar o laboratório

1. Abra **Sandbox** no menu e escolha uma classe. O painel abre com a simulação pausada.
2. Escolha classe e nível de teste e use **Recriar personagem**. Isso limpa a build; o nível aplica a escala de referência descrita no painel. HP, dano, projéteis, intervalo e alcance também podem ser editados diretamente.
3. Adicione poderes e relíquias. Pré-requisitos e limites aparecem no seletor. Escolha um dos três caminhos do ultimate e sua evolução de 0 a 10.
4. Ative ou desative invulnerabilidade e ultimate sem recarga.
5. Crie inimigos e bosses, escolhendo patente, variação e quantidade, até 200 vivos. Ou selecione uma onda de 1 a 290 e use **Jogar esta onda**.
6. **Última onda · Devorador** usa a mesma configuração da onda final da campanha. **Limpar arena** remove criaturas e perigos sem recriar a build.
7. Use **Jogar / testar** para continuar e **B** ou o botão **Laboratório** para reabrir o painel. O painel funciona também no celular.

O laboratório é solo e não gera progresso permanente. Completar a onda pausa o teste; é possível escolher outra onda, limpar a arena ou continuar criando criaturas.

## Validação

36 verificações automatizadas concluídas, além da medição de desempenho e da validação de sintaxe:

- 5 testes de dados, progressão, colisões, compactação e acesso às salas.
- 13 verificações de interface e regras existentes, incluindo classes, PVP, loja, árvore, reservas e controles de toque.
- 4 cenários de rede: escolhas cooperativas, previsão com atraso introduzido, relay e saída de participantes.
- 6 cenários da expansão anterior: 48 especializações, bosses, minimapa, arena final e salas públicas/privadas.
- 4 cenários de laboratório: proteção do save, 75 espécies nas três patentes, 25 bosses, efeitos de controle e carregamento das 100 artes.
- 4 cenários de conexão direta: negociação, estado com 200 inimigos visíveis, retorno ao relay, ausência de WebRTC e resultado do PVP.

As verificações cobrem invariantes e fluxos, mas não equivalem a uma campanha inteira de 290 ondas jogada por pessoas nem a testes em todos os celulares. A calibragem de dificuldade deve ser refinada com partidas reais, sobretudo em encontros de bosses combinados.

## Próximas sugestões

Prioridade sugerida: usar o laboratório para registrar tempo de derrota por boss e legibilidade dos avisos em builds fracas, médias e fortes. Depois, oferecer presets de build e cenários com semente fixa para comparar balanceamento. Uma opção de efeitos decorativos reduzidos, mantendo todos os avisos de ataques, também seria útil para aparelhos modestos.

As cutscenes estão apenas no [documento de planejamento](PLANO_CUTSCENES.md); nenhuma foi implementada.
