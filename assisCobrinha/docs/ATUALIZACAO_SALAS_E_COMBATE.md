# Salas, classes e combate — setembro de 2026

Implementação local concluída. A publicação do servidor e do jogo deve seguir
[o guia do Render e Netlify](../comece-aqui-render.md).

## Conexão e salas

O padrão é um relay WebSocket autenticado no Render. Os dois dispositivos abrem
conexões de saída com o mesmo serviço; essa rota dispensa a negociação direta
WebRTC/ICE que podia falhar entre redes diferentes. O host continua simulando a
partida. A interface tenta iniciar o servidor automaticamente antes de listar,
criar ou entrar em salas, e orienta quando encontra uma publicação antiga.

Salas públicas são selecionáveis na lista. Salas privadas ficam ocultas e exigem
código e senha, conferida no servidor com hash scrypt; a senha pode ser criada
pelo host ou gerada aleatoriamente. Cada sala tem código exclusivo enquanto
existe e aceita dois jogadores. O prefixo do código seleciona a conexão ao entrar.
PHP, WebRTC e MQTT permanecem como opções avançadas. Quedas breves permitem
reconexão; reiniciar o servidor encerra as salas, que ficam na memória.

## Classes e progressão

- Espectral foi substituído por Apostador, preservando os índices das 16 classes.
- O Apostador recebe o dobro de recompensas de cartas, sorteadas individualmente
  respeitando classe, pré-requisitos, poderes únicos e limites. Isso inclui suas
  especializações, sem tela de escolha, na campanha e no PVP.
- Sua ativa tem dez resultados uniformes: falência com 1 HP e perda de escudos,
  perda de metade da vida, dano reduzido, atraso de recarga, curas crescentes,
  escudos e explosões, até jackpot com cura, escudos e duas cartas extras.
- Cada classe possui três caminhos exclusivos de ultimate, dez evoluções por
  caminho: 480 cartas na campanha e 480 versões ajustadas para PVP. Um personagem
  desenvolve um caminho por run. Dano e alcance melhoram a cada nível; novos
  projéteis, pulsos e suporte aparecem ao longo da evolução. A versão X dobra
  o dano do pulso final. Os nomes, efeitos e descrições vêm dos mesmos dados.
- A campanha oferece especializações periodicamente; no co-op, cada jogador
  recebe opções compatíveis com sua própria classe. Cartas de classe e de
  ultimate têm bordas distintas, e o menu de poderes mostra o caminho atual.
- Novas campanhas começam sempre na onda 1. O ato alcançado continua salvo como
  progresso, sem iniciar uma cobra fraca em ondas avançadas.

## Hordas e bosses

- Limite global de 200 inimigos vivos, inclusive divisões e invocações, e teto de
  projéteis inimigos. Novos morteiros, sentinelas e perseguidores com variantes.
- Mais nascimentos por lote e menor intervalo nas ondas avançadas.
- HP calculado ao nascer considerando onda, dano, multiplicadores, crítico,
  frequência, projéteis, fontes adicionais e nível do ultimate dos jogadores.
  A adaptação dos comuns é sublinear para preservar o ganho de uma build forte.
  Ganhar um poder no meio da luta não cura o boss.
- Dez bosses com três ataques próprios cada, avisos de área e mudanças de fase.
  Portões de vida impedem que um único golpe ou explosões encadeadas apaguem
  todas as fases. A transição tem proteção breve de 1,4 segundo.
- Duplas, trios, repetições e grupos com bosses de atos anteriores. Bosses próximos
  se protegem e têm cadência deslocada para criar pressão combinada.
- O Devorador de Mundos fica ancorado no alto da arena, tem tamanho ampliado,
  três fases, cortinas de projéteis com passagens, mandíbulas e lasers cruzados.
  A arena é contínua: atravessar uma borda leva à oposta, sem parede fatal.
  O enquadramento mantém a arena visível em telas de proporções diferentes.

## Leitura da partida

O minimapa está presente na campanha e no PVP, mostrando jogadores, inimigos,
elites, bosses, alimentos e área da câmera. Snapshots levam pontos de radar de
inimigos distantes sem enviar sua ficha completa. Barras de boss e minimapa são
desenhados fora do zoom da arena para permanecerem legíveis no celular.

## Validação

- Sintaxe de todos os módulos verificada.
- 6 testes de regras existentes, 4 de progressão/escala e 1 de integração do
  servidor de salas passaram.
- 13 cenários de navegador existentes e 4 de rede passaram, com contextos
  independentes, PHP local e relay local.
- 6 cenários de expansão passaram: Apostador e começo na onda 1; execução das
  48 especializações no nível X em campanha e PVP; padrões e fases dos dez bosses,
  explosões encadeadas e limite 200; radar e enquadramento final; sala privada com
  senha e sincronização; seleção pela lista pública.
- Capturas em 1280×850, 390×844 e 844×390; testes anteriores também cobrem toque,
  dois joysticks e tablet. Resultados ficam em `tests/artifacts`.
- O servidor local respondeu a `/health`, `/peerjs/` e à geração de IDs do PeerJS.

Esses testes verificam funcionamento e regressões, não substituem partidas
completas para ajustar a dificuldade. As 290 ondas não foram jogadas manualmente.
Não houve publicação em contas externas nem teste com celular e computador em
redes físicas diferentes. Uma consulta ao `/health` público não respondeu dentro
do prazo usado, o que não distingue suspensão, indisponibilidade ou bloqueio de
acesso; por isso a disponibilidade pública permanece sem confirmação.
