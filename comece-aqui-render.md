# Atualizar o multiplayer no Render e no Netlify

O jogo continua no Netlify. O Render hospeda o **servidor de salas e partidas**, com transmissão por WebSocket. A conexão automática entra pela sala autenticada e tenta estabelecer **WebRTC direto** entre os jogadores. Se a rede impedir essa conexão, ou ela falhar, a partida usa o servidor. WebRTC legado, PHP/LAN e MQTT continuam nas opções avançadas.

**É necessário publicar as duas partes desta atualização.** Atualizar só o Netlify não adiciona a lista de salas ao servidor antigo. Os arquivos estão preparados localmente; a publicação nas contas de hospedagem não foi realizada nesta revisão.

## 1. Atualize o serviço existente no Render

Use o serviço de `cobrinhaassis.onrender.com`, se ele ainda estiver na sua conta. Não é necessário criar outro serviço apenas por causa da atualização.

1. No repositório conectado ao Render, substitua os arquivos do servidor pelos desta pasta `peer-server`: `server.js`, `package.json` e `package-lock.json`. Não envie `node_modules`, `.npm-cache` ou `tests`; o Render instala as dependências. O novo `server.js` é necessário para negociar a rota direta dentro das salas.
2. Confira a configuração:

| Campo | Valor |
| --- | --- |
| Tipo de serviço | Web Service |
| Runtime | Node |
| Root Directory | `peer-server` se o repositório contém o jogo inteiro; vazio se contém somente os arquivos do servidor |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

3. Publique a nova versão e aguarde o estado Live. O pacote pede Node 22; o Render fornece a variável `PORT` e o HTTPS.
4. Abra [a verificação do servidor](https://cobrinhaassis.onrender.com/health). A resposta deve conter `"service":"cobrinha-relay"`, `"version":2` e **`"directUpgrade":true`**. A raiz do domínio também mostra essas informações. Se `directUpgrade` estiver ausente, ainda está rodando o servidor anterior. O endereço do Render não é a página do jogo.

O servidor aceita conexões de outras origens por padrão. Se você já definiu `ALLOWED_ORIGINS` no painel, inclua a URL exata do seu Netlify e dos outros endereços usados para jogar, separados por vírgulas. Uma origem ausente nessa lista será bloqueada.

## 2. Atualize o jogo no Netlify

1. Confira `src/net/peer-config.js`. O domínio atual é `cobrinhaassis.onrender.com`. Se o Render forneceu outro, altere apenas `host`, sem `https://` e sem caminho. Mantenha porta 443 e `secure: true`.
2. Republique os arquivos atualizados do jogo, incluindo `index.html`, `style.css`, toda a pasta `src` e **toda a pasta `assets`**, que contém as 100 artes e o bestiário. Preserve `netlify.toml` e `netlify/functions` para o ranking. Cache, dependências locais, scripts de teste e capturas não são necessários no site.
3. Recarregue a página nos dois dispositivos para ambos usarem a mesma versão.

O modo **Automático** já vem selecionado. Ao abrir a lista ou criar/entrar em uma sala, o jogo tenta iniciar o servidor e mostra o progresso por até cerca de 90 segundos. Não é necessário abrir `/peerjs` manualmente para acordá-lo. Se a versão antiga estiver publicada, o jogo informa que o servidor precisa da atualização.

## 3. Como jogar

- **Sala pública:** escolha nome e Co-op/PVP, crie a sala e compartilhe o código. Ela também aparece na lista de partidas abertas; o colega pode clicar em Entrar.
- **Sala privada:** selecione Privada e crie uma senha de 4 a 64 caracteres, ou use Gerar senha. Compartilhe código e senha. A sala fica fora da lista pública, e a senha é conferida pelo servidor.
- Cada sala recebe um código exclusivo enquanto existe. O código identifica o modo de conexão automaticamente; o convidado não precisa escolher o mesmo botão de transporte do host.
- Depois de escolher as classes, o host inicia a partida. São dois jogadores por sala.

As opções avançadas são úteis para configurações específicas. PHP exige que ambos acessem o mesmo servidor PHP, pelo mesmo endereço; WebRTC depende de sinalização e das condições da rede; MQTT usa o relay público legado. Lista pública e proteção por senha estão disponíveis no novo servidor de partidas.

## 4. Verificação entre dispositivos

1. No computador, abra o jogo atualizado no Netlify e crie uma sala pública em Automático.
2. No celular, abra o mesmo site usando dados móveis e entre pela lista ou pelo código.
3. Teste movimento, habilidades e escolha de poderes no Co-op; repita no PVP.
4. Crie uma sala privada: ela não deve aparecer na lista, uma senha errada deve ser recusada e a senha correta deve permitir entrar.
5. Confira a indicação da rota: **Conexão direta** quando WebRTC funcionar, ou **Servidor de partidas** quando o relay for necessário. Observe o ping durante movimento, horda e boss. Distância física pequena entre jogadores não garante a mesma rota de internet.

Os testes locais validaram dois navegadores isolados, salas públicas/privadas, senha, sincronização e reconexão. **Isso não substitui este teste com aparelhos e redes físicas diferentes após publicar.** Não foi possível confirmar a disponibilidade do serviço público nesta revisão.

Com os dois jogadores no Brasil e o servidor em Oregon, o ping mostrado pelo jogo é a ida e volta **entre os jogadores**. Pelo relay, tanto a ida como a resposta passam pelo servidor; por isso ele pode superar o ping medido em outro jogo até um servidor americano. A rota direta evita esse desvio quando as redes permitem. Não existe garantia de 170 ms, nem de que 500 ms seja causado somente pela região. Veja as [regiões do Render](https://render.com/docs/regions) e os [detalhes da atualização](docs/OTIMIZACAO_E_SANDBOX.md).

## 5. Limites e diagnóstico

O plano gratuito pode suspender o serviço após inatividade; o primeiro acesso volta a iniciá-lo e pode demorar cerca de um minuto. O jogo faz essa espera automaticamente. Veja a [documentação do Render sobre serviços gratuitos](https://render.com/docs/free) e [WebSockets](https://render.com/docs/websocket).

As salas ficam na memória de uma única instância. Quedas breves de conexão têm recuperação automática, com reserva do jogador por 12 segundos; reiniciar o serviço apaga as salas e exige criar outra. O projeto mantém o host como autoridade da simulação; o servidor encaminha os dados e controla acesso às salas. Não é um servidor dedicado de simulação nem um sistema antitrapaça.

| Sintoma | O que conferir |
| --- | --- |
| `/health` não responde após a espera | Estado e logs do serviço, domínio, publicação e disponibilidade do Render |
| Pedido para atualizar `peer-server` | Os três arquivos do servidor ainda não foram publicados, ou a pasta raiz está errada |
| Netlify atualizado, mas lista falha | Publique também o servidor e verifique `ALLOWED_ORIGINS`, caso esteja configurado |
| Sala não encontrada | Código correto, mesmo domínio de servidor e host ainda conectado; salas são perdidas se o serviço reiniciar |
| Sala cheia ou partida iniciada | Aguarde uma sala nova; cada sala aceita host e um convidado |
| Senha incorreta | A senha diferencia maiúsculas e minúsculas; confira a senha mostrada ao host |
| Conexão recusada em uma rede específica | Confirme que HTTPS e WebSocket seguro para o domínio do Render são permitidos nessa rede |

Para testar o servidor localmente: dentro de `peer-server`, execute `npm ci`, `npm test` e `npm start`. Por padrão ele atende em `http://localhost:9000`.

