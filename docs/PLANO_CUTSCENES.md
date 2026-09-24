# Cutscenes — proposta para uma etapa futura

**Status: somente planejamento.** Nenhuma cutscene, animação cinematográfica, fala ou integração de reprodução foi implementada nesta revisão. A história abaixo é uma proposta para discutir antes de produzir as cenas.

**Atualização:** a direção narrativa foi desenvolvida em [Memórias da Grade](PROJETO_LORE.md), com [seis quadros vetoriais de conceito](CONCEPTS_CUTSCENES.html). A música foi integrada ao jogo e a fase II do Devorador agora é um survival de aproximadamente 4min18s. Os quadros continuam sendo estudos, sem reprodução de cutscenes dentro da partida.

## Direção narrativa

A cobrinha atravessa as eras do próprio jogo. Cada mundo acrescenta cor, volume, regras e criaturas, até que o excesso de poder começa a consumir a grade que sustenta todos eles. O Devorador seria a manifestação dessa fome: ele não quer derrotar a serpente, quer apagar o espaço onde qualquer jogo poderia existir.

A personagem é a classe escolhida pelo jogador, sem protagonista fixo que descaracterize as 16 classes. A história funcionaria principalmente por imagens, som e poucas frases. No co-op, as duas serpentes participariam dos enquadramentos. A proposta preserva o contraste entre humor de cobrinha e escala crescente dos bosses.

O objetivo das cenas seria apresentar mudanças importantes e dar significado ao final. A repetição de uma partida não deveria obrigar o jogador a rever longas introduções.

## Estrutura sugerida

| Momento | Proposta visual e narrativa | Duração desejada |
| --- | --- | --- |
| Primeira entrada na campanha | Uma tela monocromática acende. A primeira comida vira um pequeno fragmento de cor. Ao comê-la, a serpente abre uma fissura na grade. | 15–20 s |
| Transições entre atos | Vinhetas que transformam a grade e antecipam a linguagem visual da próxima era. | 3–5 s |
| Primeiro encontro com cada boss | Retrato animado, nome e uma ação característica que antecipa seu perigo. Encontros repetidos usam apenas o aviso curto do combate. | 2–4 s |
| Passagem para CORRUPÇÃO | Partes do cenário deixam de acompanhar a serpente. Uma sombra apaga comida e inimigos indistintamente. | 10–15 s |
| Antes da onda 290 | As bordas se desfazem; a silhueta do Devorador ocupa o topo. A arena revela sua continuidade pelas bordas. | 20–25 s |
| Mudanças de fase do Devorador | Breves transformações visuais integradas ao combate, sem filme separado nem interrupções longas. | até 1 s cada |
| Vitória | A serpente devolve cor à grade; fragmentos das eras anteriores retornam. O último alimento tem a forma do primeiro pixel. | 20–30 s |
| Derrota | A tela recolhe os fragmentos em uma semente para a próxima tentativa. Deve poder ser dispensada imediatamente. | 2–3 s |

## As dez eras

Os atos visuais continuam independentes das três faixas de progressão dos inimigos. As cenas não devem sugerir que uma espécie só existe em um ato específico.

| Ato existente | Ideia para a vinheta |
| --- | --- |
| MONOCROMO | Grade verde acende por linhas, como um visor antigo. |
| PIXEL | A serpente deixa uma trilha que ganha cores pela primeira vez. |
| NAVEGADOR | Molduras de pequenas janelas se abrem e viram caminhos. |
| ARCADE | A grade pulsa com luzes de fliperama, sem flashes rápidos. |
| TRIDIMENSIONAL | As células ganham profundidade; a câmera revela um relevo breve. |
| ENXAME | Outras trilhas cruzam o mundo e sugerem várias partidas coexistindo. |
| VAPORONDA | Um horizonte rosa e ciano aparece nos fragmentos da grade. |
| CORRUPÇÃO | Células se deslocam fora de ordem e deixam espaços vazios. |
| O VAZIO | O som se estreita e a grade desaparece gradualmente. |
| O FIM | Fragmentos das nove eras convergem para uma luz que o Devorador tenta consumir. |

## Rascunho de storyboard: entrada do Devorador

| Tempo | Imagem | Som e informação |
| --- | --- | --- |
| 0–4 s | A última linha da grade se rompe. As criaturas menores desaparecem. A câmera acompanha a serpente. | O ruído da horda diminui; fica o som do movimento. |
| 4–9 s | Uma sombra cruza o topo e ocupa a largura da arena. Elementos das eras anteriores são atraídos para ela. | Um pulso grave anuncia a escala do inimigo. |
| 9–15 s | A cabeça do Devorador se revela. Uma pequena trilha luminosa sai por uma borda e reaparece na outra. | A imagem demonstra a continuidade da arena sem exigir uma explicação longa. |
| 15–20 s | Três núcleos acendem no boss, antecipando suas três fases. O nome aparece uma única vez. | Frase opcional: “Quando não restar mundo, ainda haverá fome.” |
| 20–25 s | A câmera retorna à visão normal. Surgem primeiro os avisos do ataque; depois o controle e o combate são liberados. | Som curto de retorno ao jogo, com tempo seguro para orientação. |

As falas são rascunhos, não texto final. Os concepts podem evoluir com a direção narrativa; a produção de voz e dos animatics será uma etapa posterior.

## Linguagem visual e custo

Usar composições vetoriais com poucos elementos animados: câmera, olhos, anéis, grade e fragmentos. Reaproveitar as artes SVG do bestiário como referência e criar poses próprias apenas quando necessárias. Evitar simular uma horda inteira para produzir uma cena.

Separar efeitos de atmosfera de informações essenciais. O desenho do Devorador pode ocupar grande parte da tela na introdução, mas o enquadramento deve voltar à arena jogável antes do primeiro ataque. Celulares precisam de composição própria que preserve personagem, olhos do boss e legendas.

## Regras propostas para jogar e pular

- Todas as cenas longas podem ser puladas por botão, teclado e toque. Depois de vistas, uma preferência permitiria pulá-las automaticamente.
- Na campanha solo, o jogo inteiro pausa durante uma cena: inimigos, projéteis, dano, efeitos de controle e recargas. O retorno não acumula tempo de simulação.
- No co-op, o host determina início e fim para os dois jogadores. Cada pessoa marca “Pronto”; ambos prontos pulam a cena. Uma desconexão segue o tratamento normal da partida e não deixa o outro preso na cena.
- PVP não recebe cutscenes que interrompam movimento ou decisões. O sandbox teria, futuramente, uma visualização separada e opcional das cenas, sem impedir testes rápidos.
- Legendas, volume independente e movimento reduzido devem estar disponíveis. Informação de combate nunca depende apenas de uma fala, uma cor ou um flash.
- Um atraso no carregamento da arte não pode bloquear a partida: usar imagem estática de reserva ou pular a apresentação.

## Ordem de produção sugerida

1. Revisar a premissa, o tom e a quantidade de falas; manter como base esta proposta visual e breve.
2. Preparar storyboards estáticos da abertura, da entrada do Devorador e da vitória. Conferir versões para computador e celular.
3. Implementar primeiro pausa, pular, legendas e retorno ao combate usando uma única cena simples.
4. Validar sincronização do co-op, carregamento lento e acessibilidade.
5. Produzir as três cenas principais; só depois as vinhetas dos atos e apresentações curtas dos bosses.

## Critérios para considerar essa etapa pronta no futuro

Pular uma cena deve levar exatamente ao mesmo estado de jogo que assisti-la. Nenhum jogador pode sofrer dano durante a apresentação ou ganhar recarga extra por diferenças de duração. Os dois participantes devem retomar o co-op no mesmo momento. Repetir uma campanha não deve impor cenas longas. A transição deve manter fluidez com o orçamento visual do jogo e funcionar sem áudio.

Sugestão inicial: priorizar **entrada do Devorador e vitória**. Essas duas cenas dariam um encerramento forte às 290 ondas, enquanto a abertura e as vinhetas poderiam ser refinadas depois com o mesmo sistema.
