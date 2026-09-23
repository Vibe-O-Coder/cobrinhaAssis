import { relayOrigin } from './rooms.js';

/** Authenticated relay: both browsers make outbound HTTPS/WebSocket connections.
 * It therefore works across ordinary NAT/CGNAT without relying on a public TURN.
 */
export function RelayTransport(ticket, onRaw, onStatus, onError, onPeer, onLeave, onReady) {
  let socket = null, alive = true, ready = false, attempt = 0, retry = null, watchdog = null, lastReply = 0;
  const queue = [];
  function control(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
  function fatal(message) { if (!alive) return; alive = false; clearTimeout(retry); clearInterval(heartbeat); clearTimeout(watchdog); socket?.close(); onError(message); }
  function connect() {
    if (!alive) return;
    ready = false;
    onStatus(attempt ? 'Reconectando à partida…' : 'Abrindo canal de jogo…');
    const ws = new WebSocket(relayOrigin().replace(/^http/, 'ws') + '/relay');
    socket = ws;
    watchdog = setTimeout(() => ws.close(), 10000);
    ws.addEventListener('open', () => control({ type: 'auth', code: ticket.room.code, token: ticket.token }));
    ws.addEventListener('message', event => {
      if (!alive || socket !== ws) return;
      try {
        const message = JSON.parse(event.data);
        lastReply = Date.now();
        if (message.type === 'ready') {
          clearTimeout(watchdog); ready = true; attempt = 0;
          onStatus(message.peer ? 'Conectado pelo servidor de partidas.' : 'Sala aberta — compartilhe o código.');
          onReady?.(message.room);
          if (message.peer) onPeer();
          for (const data of queue.splice(0)) control({ type: 'data', data });
        } else if (message.type === 'peer') {
          if (message.connected) onPeer(); else onLeave();
        } else if (message.type === 'data') onRaw(message.data);
        else if (message.type === 'error') {
          if (message.code === 'room_closed') onLeave();
          fatal(message.message || 'A sala não está mais disponível.');
        }
      } catch { /* Ignore malformed packets without breaking rendering. */ }
    });
    ws.addEventListener('error', () => {});
    ws.addEventListener('close', event => {
      if (!alive || socket !== ws) return;
      clearTimeout(watchdog); ready = false;
      if (event.code === 4000) return fatal('Esta conexão foi substituída por outra aba.');
      if (++attempt > 5) return fatal('Não foi possível recuperar a conexão. Volte à lista e entre novamente.');
      retry = setTimeout(connect, Math.min(4000, 500 * 2 ** (attempt - 1)));
    });
  }
  const heartbeat = setInterval(() => {
    if (!alive || !ready) return;
    if (Date.now() - lastReply > 15000) { socket?.close(); return; }
    control({ type: 'heartbeat' });
  }, 4000);
  connect();
  return {
    kind: 'relay',
    send(data) {
      if (!alive) return;
      if (!ready) {
        // States are superseded by the next tick. Retain bounded reliable commands.
        if (!['state','hb','ping','pong'].includes(data.t)) { if (data.t === 'k') { const i = queue.findIndex(m => m.t === 'k'); if (i >= 0) queue.splice(i, 1); } queue.push(data); if (queue.length > 64) queue.shift(); }
        return;
      }
      if (data.t === 'state' && socket.bufferedAmount > 128 * 1024) return;
      control({ type: 'data', data });
    },
    close() {
      if (!alive) return;
      alive = false; clearTimeout(retry); clearTimeout(watchdog); clearInterval(heartbeat);
      control({ type: 'leave' }); socket?.close(1000, 'Left room'); queue.length = 0;
    },
  };
}
