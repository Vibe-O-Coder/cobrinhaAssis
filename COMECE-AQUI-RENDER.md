# Servidor próprio de conexão para a Cobrinha

Este pacote configura o jogo para usar seu PeerServer no Render. Você ainda precisa publicar o servidor e preencher seu domínio. Não existe servidor já publicado neste ZIP.

## 1. Publique somente a pasta do servidor

1. Extraia este ZIP.
2. Entre em https://github.com e crie um repositório chamado `cobrinha-peer-server`. Pode ser privado se você conectar sua conta GitHub ao Render.
3. Pelo botão de upload de arquivos do GitHub, envie o CONTEÚDO da pasta `peer-server` para a raiz desse repositório. `package.json`, `package-lock.json` e `server.js` devem aparecer diretamente na primeira tela do repositório, sem uma pasta intermediária. Confirme o upload com Commit changes.
4. Entre em https://render.com e escolha **New > Web Service**.
5. Conecte o repositório criado. Não escolha Static Site: o PeerServer precisa manter WebSockets.
6. Preencha:

| Campo | Valor |
| --- | --- |
| Name | cobrinha-peer-server ou outro nome disponível |
| Runtime / Language | Node |
| Root Directory | deixe vazio |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | **Free** |
| Health Check Path, em Advanced se disponível | `/peerjs` |

7. Clique em Deploy Web Service e aguarde o estado Live.
8. Copie o domínio real apresentado no painel, por exemplo `cobrinha-peer-server-xxxx.onrender.com`.
9. Abra `https://SEU-DOMINIO.onrender.com/peerjs`. Deve aparecer um JSON com informações do PeerServer. Abrir apenas `/` pode retornar 404, o que é normal neste servidor.

Não precisa de banco de dados, domínio comprado, instalação local de Node ou alteração de portas no roteador. O Render define a porta interna por `PORT` e fornece HTTPS.

## 2. Conecte seu jogo

Abra `src/net/peer-config.js` no bloco de notas ou editor e substitua apenas:

```js
host: 'SEU-SERVIDOR.onrender.com',
```

pelo domínio REAL do serviço. Não escreva `https://`, `/peerjs` ou uma barra no campo `host`. Mantenha `port: 443`, `secure: true`, `path: '/peerjs'` e `key: 'peerjs'`.

O jogo já importa essa configuração em `src/net/transports.js`. A configuração incompleta mostra um erro explícito, sem voltar silenciosamente ao servidor público.

Atualize os arquivos do jogo na hospedagem atual ou substitua a pasta do jogo no XAMPP. Não envie o ZIP fechado esperando que o servidor o execute. No XAMPP, acesse pelo endereço HTTP servido pelo Apache, não abrindo index.html com file://.

Todos os jogadores precisam usar a versão atualizada, apontando para o mesmo PeerServer. Recarregue com Ctrl+F5 se o navegador mantiver a versão anterior. A URL do Render é do servidor de sinalização; o jogo continua na sua hospedagem atual. PHP e placar não são hospedados por esse serviço Node.

## 3. Teste

1. Abra a URL `/peerjs` e espere aparecer o JSON antes de criar a sala.
2. No jogo, selecione explicitamente o transporte WebRTC nos dois dispositivos.
3. Crie uma sala no primeiro dispositivo e espere a mensagem de sala aberta.
4. No segundo, entre usando o mesmo código.
5. Teste primeiro na mesma rede e depois com um dispositivo em outra rede, como internet móvel.

## 4. O que é gratuito e quais são os limites

O plano Free do Render suspende serviços após 15 minutos sem tráfego recebido. O primeiro acesso posterior pode levar cerca de um minuto para acordá-los. Abra `/peerjs`, espere o JSON e só depois crie a sala. Não há aquecimento automático nesta versão.

Existem 750 horas gratuitas mensais compartilhadas pelo workspace, além de limites de banda e builds. Selecione Free e acompanhe Usage/Billing. A documentação prevê suspensão ao exceder franquias sem meio de pagamento; com pagamento cadastrado, certos excedentes podem ser cobrados. Verificações de cadastro podem variar, portanto não há garantia de que toda conta dispense cartão.

O serviço gratuito pode reiniciar. Se a sala parar de aceitar conexões, aguarde o servidor voltar e recrie a sala. Esta alteração não adiciona recuperação automática de sessões após reinício do servidor.

## 5. PeerServer e TURN são serviços diferentes

- PeerServer: apresenta os navegadores e troca informações para negociar WebRTC. É o serviço que você acabou de hospedar.
- STUN: ajuda a descobrir uma rota entre os navegadores.
- TURN: retransmite os dados quando a rede impede uma rota direta.

O projeto já inclui STUN e credenciais públicas OpenRelay. Foram preservados, mas sua disponibilidade não foi validada. Ter um PeerServer próprio não torna esse TURN privado nem garante conexão em todas as redes. O Render Web Service deste pacote não é um servidor TURN.

Se a sala abre e funciona no mesmo Wi-Fi, mas falha entre redes, investigue ICE/TURN e firewall. Isso é indício, não diagnóstico definitivo. Nesse caso será necessário um TURN funcional, eventualmente com franquia gratuita de outro provedor. Nunca coloque uma chave administrativa de provedor TURN no JavaScript público do jogo.

## 6. Diagnóstico rápido

| Sintoma | Verificação |
| --- | --- |
| Erro pedindo configuração | Edite peer-config.js e publique o arquivo atualizado |
| /peerjs não mostra JSON | Confirme estado Live, logs e aguarde a inicialização |
| /peerjs mostra JSON, mas jogo não abre sala | Confira host sem protocolo, porta 443, secure true, path e cache |
| Sala não encontrada | Ambos devem usar o mesmo domínio e código; o host precisa criar primeiro |
| Código já em uso | Crie outra sala neste servidor |
| Mesmo Wi-Fi funciona, redes diferentes falham | Verifique ICE, TURN e bloqueios de rede |
| Render não encontra package.json | Envie o conteúdo da pasta peer-server à raiz do repositório |

## Alterações deste pacote

- `peer-server/package.json` e `peer-server/server.js`: servidor separado, adequado ao proxy e à porta do Render.
- `src/net/peer-config.js`: configuração única de domínio para os jogadores.
- `src/net/transports.js`: utiliza o servidor configurado e orienta sobre a inicialização do Render.
- A mensagem de conexão não afirma mais que a rota é direta, pois ela pode usar TURN.

## Documentação oficial consultada

- https://render.com/docs/free
- https://render.com/docs/web-services
- https://render.com/docs/websocket
- https://github.com/peers/peerjs-server
- https://peerjs.com/client/getting-started

## Validação feita antes da entrega

Sintaxe dos módulos e do servidor verificada. Os seis testes de regras existentes passaram. O PeerServer foi iniciado localmente: respondeu a /peerjs, gerou ID e encaminhou OFFER entre dois clientes WebSocket. Isso valida a sinalização local; não valida uma partida entre redes reais nem uma publicação no Render. O teste local usou Node 24; o pacote solicita Node 22 no Render.
