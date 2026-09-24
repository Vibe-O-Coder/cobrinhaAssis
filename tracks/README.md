# Faixas em uso

Os oito MP3 originais permanecem nesta pasta, sem alteração da gravação ou da letra. A fase II utiliza a versão cantada em inglês entregue pelo autor.

| Arquivo | Uso | Duração medida |
| --- | --- | --- |
| `menu.mp3` | Menu, seleção de classe e telas fora da run | 2:08.832 |
| `monocromo.mp3` | Ato 1 | 2:59.520 |
| `pixel.mp3` | Ato 2 | 2:59.584 |
| `navegador.mp3` | Ato 3 | 3:54.048 |
| `arcade.mp3` | Ato 4 | 3:14.645 |
| `a-fome-entre-os-mundos.mp3` | Devorador, fase I | 3:34.912 |
| `ainda-ha-um-sinal.mp3` | Devorador, fase II — survival | 4:18.539 |
| `o-ultimo-pixel.mp3` | Devorador, fase III | 4:09.856 |

Menu e atos repetem com uma transição de volume de dois segundos entre o fim e o começo. Isso suaviza a emenda; não transforma a composição original num loop musical perfeito. As músicas do chefe final tocam uma vez em cada fase. Se as fases I ou III durarem mais, o acompanhamento procedural assume; se acabarem antes, há uma transição para a próxima faixa.

A faixa vocal acompanha o relógio do survival. Pausa, QTE, aba oculta e telas de escolha suspendem a reprodução. Desligar o som ou zerar o volume não altera o combate. Durante o survival, a velocidade efetiva é 1×; depois, volta a preferência do jogador. O host determina o progresso no co-op, e o convidado ajusta sua reprodução a esse relógio. Falha ou bloqueio de áudio não impede a conclusão da luta.

## Encenação da fase II

| Tempo aproximado | Direção do combate |
| --- | --- |
| 0:00–0:47 | A última luz: cortinas, apresentação do survival, sem espiral contínua. |
| 0:47–1:49 | Chuva de mundos: entram espirais com espaços de fuga e alternância de padrões. |
| 1:49–2:45 | Marés do vazio: aumenta a cadência, com mandíbulas e corredores. |
| 2:45–3:42 | Grade em ruptura: pressão crescente e ataques de extinção alternados. |
| 3:42–4:18.539 | Ainda há um sinal: clímax, seguido da abertura automática da fase III. |

Os marcadores dividem a duração da gravação em seções de encenação. Não representam detecção das batidas ou transcrição dos versos. Para alinhar ataques a refrões específicos, ajustar os limites depois de marcar esses pontos numa audição editorial. Nunca esconder os avisos visuais nem exigir que o jogador ouça uma palavra para reagir.

Os atos 5–10 e chefes sem MP3 continuam com os temas procedurais. Os arquivos são carregados conforme o uso, com no máximo dois tocadores durante uma transição; o jogo não baixa a pasta inteira ao abrir.

O catálogo está em [soundtrack.js](../src/data/soundtrack.js). Ao substituir um MP3, conferir a duração com `npm run inspect:tracks` e atualizar o catálogo, sobretudo a faixa do survival. Verificações: `npm run test:soundtrack`, `npm run test:progression` e `npm test`.
