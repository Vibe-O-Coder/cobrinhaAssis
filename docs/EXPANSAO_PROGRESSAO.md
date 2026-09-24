# Expansão de progressão e combate

As opções de início, aparência e áudio estão no menu **Início avançado, arte e música**.
Hardcore aparece nas dificuldades; Boss Rush tem botão próprio. No Sandbox,
**B** abre o painel a qualquer momento, inclusive para consumir as seis frutas.

## Regras implementadas

| Fruta | Efeito por coleta | Duração |
|---|---|---|
| Banana | +30% velocidade de ataque | 10s |
| Morango | +0,1% velocidade de ataque | Partida |
| Melancia | +75% dano | 10s |
| Melão | +0,5% dano | Partida |
| Uva verde | +2 projéteis por tiro | 10s |
| Uva roxa | +1 projétil a cada 10 unidades | Partida |

Coletas iguais somam. Cada bônus temporário conta seu próprio tempo de simulação;
pausar preserva a duração, acelerar também acelera a expiração. Os bônus das frutas
são separados dos atributos limitados das cartas e aparecem no HUD e em Status.
O PVP preserva sua economia e alimentos anteriores.

Hardcore mantém a vida máxima inicial como teto e bloqueia cartas que a aumentam,
assim como todos os benefícios da loja, árvore e consumíveis. Os inimigos, incluindo
invocações, ganham 60% de vida e 25% de velocidade. As dificuldades anteriores continuam disponíveis.

No início avançado, a opção aleatória concede exatamente tantas cartas quanto
o número da onda, respeitando classe, pré-requisitos e limites. Sem upgrades deixa
as cartas iniciais vazias. Atributos permanentes da loja e árvore ainda se aplicam
fora do Hardcore. O salto e o Boss Rush concedem almas, mas não entram no ranking
nem alteram os recordes da campanha; Sandbox não acumula pontos ou almas.

Boss Rush percorre os 25 chefes do catálogo sem hordas entre encontros. Escolhas
de relíquias acontecem entre chefes; o Apostador recebe suas recompensas automáticas.
O Atirador tem alcance e perfuração, disparos rápidos em leque fechado, ativa
de rajada e três caminhos de ultimate, também integrados ao PVP.

## Chefes e interface

Zarath preserva seus padrões. Karkos passa a combinar canhões laterais em pinça,
fileiras de projéteis com passagens móveis e explosões em xadrez. Iridis dispara
de dois prismas, e o Arauto usa salvas espirais com lacunas.

O Devorador preserva os três estágios existentes e recebe QTEs nas transições,
incluindo o início da segunda fase. Cada evento pede três direções e oferece
2,8 segundos reais por entrada. Teclado, toque e co-op usam a mesma sequência.
O combate aguarda; acerto abre uma janela de vulnerabilidade de 4s, erro causa
2 HP de dano, sujeito às proteções habituais. A partir da segunda fase,
espirais contínuas se combinam às cortinas, mandíbulas e lasers.

A árvore tem nove constelações de 40 nós: raiz e caminhos até 1.1.1. A tela
mostra os nós adquiridos, disponíveis e bloqueados. Comprar um ramo calcula
pré-requisitos e descontos antes de cobrar o valor integral, excluindo
especializações incompatíveis. Raiz/níveis 1/2/3 custam 250/750/2.250/6.500 almas.
Os níveis removidos dos saves antigos são reembolsados uma única vez.

Os desenhos das criaturas são SVGs existentes em cache. Frutas e interface
recebem vetores locais. **Arte → Emojis** permite trocar a apresentação. A música
é instrumental e original, sintetizada no navegador: dez temas de ato e 25
arranjos de chefes. Não depende de downloads ou de uma conta em serviço musical.

O Berserker mantém seu dano após a habilidade. A versão recebida já não reduzia
esse atributo; a penalidade existente de vida foi preservada e foi acrescentada
uma verificação para garantir que o dano continue intacto.

## Validação

- 4 verificações unitárias de frutas e compra atômica de ramos.
- 15 cenários de expansão no navegador, incluindo migração, 20×, QTE, co-op e fim do Boss Rush.
- 13 cenários de regressão, incluindo as 17 classes em PVP, toque simultâneo e PVP LAN em dois navegadores.
- 4 cenários de laboratório: todas as espécies/patentes, 25 chefes com três ataques, Sandbox e SVGs.
- Módulos sem erros de sintaxe; inspeção visual em desktop e celular.
- Medição local com 200 inimigos e três chefes: simulação média de 1,21ms e
  renderização média de 1,20ms por passo/quadro a 1×. Isso não garante 20× em
  todos os aparelhos: a aceleração executa mais passos da simulação por quadro.

As verificações e capturas ficam em `tests/artifacts`; execute `npm run test:progression`,
`npm run test:browser`, `npm run test:lab`, `npm run test:perf` e `npm run check`.
Para os testes unitários, `npm test`; em ambientes que bloqueiam subprocessos,
`node --test --test-isolation=none tests/progression.test.mjs`.

A dificuldade dos novos padrões e o ritmo dos temas ainda se beneficiam de
uma sessão de jogo humana; os testes verificam funcionamento e estabilidade.
