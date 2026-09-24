import http from 'node:http';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { WebSocketServer, WebSocket } from 'ws';

const deriveKey = promisify(scrypt);
const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const secret = () => randomBytes(32).toString('base64url');
const code = () => 'R-' + [...randomBytes(6)].map(n => alphabet[n % alphabet.length]).join('');
const cleanCode = value => String(value || '').trim().toUpperCase();
const commands = new Set(['rtc','hb','bye','ping','pong','hello','class','k','ab','it','pvpPick','pick','lobby','start','state','powers','up','go','pvpOver','over']);
const guestCommands = new Set(['rtc','hb','bye','ping','pong','hello','class','k','ab','it','pvpPick','pick']);

/** One instance owns its rooms. Add shared storage before scaling horizontally. */
export function createGameServer({ legacyPeer = true, reconnectMs = 12000, roomLimit = 100 } = {}) {
  const app = express(), server = http.createServer(app), rooms = new Map(), limits = new Map();
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const originAllowed = origin => !origin || !allowedOrigins.length || allowedOrigins.includes(origin);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!originAllowed(req.headers.origin)) return res.status(403).json({ error: 'origin_denied', message: 'Origem não autorizada.' });
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins.length ? (req.headers.origin || allowedOrigins[0]) : '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '4kb' }));
  const health = (_req, res) => res.json({ service: 'cobrinha-relay', version: 2, directUpgrade: true, rooms: rooms.size, transports: ['relay', 'webrtc'] });
  app.get('/', health);
  app.get('/health', health);
  const publicRoom = room => ({ code: room.code, name: room.name, mode: room.mode, private: room.private, players: 1 + Number(!!room.guest), maxPlayers: 2, started: room.started, createdAt: room.createdAt });
  app.get('/rooms', (_req, res) => res.json({ rooms: [...rooms.values()].filter(r => !r.private && r.host.ws?.readyState === WebSocket.OPEN).map(publicRoom) }));
  function throttle(req, res, next) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim();
    const now = Date.now();
    let entry = limits.get(ip);
    if (!entry || entry.until < now) { entry = { count: 0, until: now + 60000 }; limits.set(ip, entry); }
    if (++entry.count > 35) return res.status(429).json({ error: 'rate_limit', message: 'Muitas tentativas. Aguarde um minuto.' });
    next();
  }
  const participant = () => ({ token: secret(), id: secret().slice(0, 12), ws: null, expires: Date.now() + 30000, generation: 0 });
  const fail = (res, status, error, message) => res.status(status).json({ error, message });
  app.post('/rooms', throttle, async (req, res) => {
    try {
      if (rooms.size >= roomLimit) return fail(res, 503, 'capacity', 'Servidor cheio. Tente em instantes.');
      const body = req.body || {}, isPrivate = body.private === true;
      const password = typeof body.password === 'string' ? body.password : '';
      if (isPrivate && (password.length < 4 || password.length > 64)) return fail(res, 400, 'password_length', 'A senha deve ter entre 4 e 64 caracteres.');
      const salt = isPrivate ? randomBytes(16) : null;
      const passwordHash = isPrivate ? await deriveKey(password, salt, 32) : null;
      if (rooms.size >= roomLimit) return fail(res, 503, 'capacity', 'Servidor cheio. Tente em instantes.');
      let roomCode; do { roomCode = code(); } while (rooms.has(roomCode));
      const room = { code: roomCode, name: String(body.name || 'Partida da Cobrinha').replace(/[\x00-\x1f]/g, '').trim().slice(0, 40) || 'Partida da Cobrinha', mode: body.mode === 'pvp' ? 'pvp' : 'online', private: isPrivate, salt, passwordHash, host: participant(), guest: null, started: false, createdAt: Date.now() };
      rooms.set(roomCode, room);
      res.status(201).json({ room: publicRoom(room), token: room.host.token });
    } catch { fail(res, 500, 'create_failed', 'Não foi possível criar a sala.'); }
  });
  app.post('/rooms/:code/join', throttle, async (req, res) => {
    try {
      const room = rooms.get(cleanCode(req.params.code));
      if (!room || !room.host.ws) return fail(res, 404, 'room_missing', 'Sala não encontrada. Confira o código e se o host continua conectado.');
      if (room.private) {
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        if (password.length > 64) return fail(res, 403, 'wrong_password', 'Senha incorreta.');
        const hash = await deriveKey(password, room.salt, 32);
        if (!timingSafeEqual(hash, room.passwordHash)) return fail(res, 403, 'wrong_password', 'Senha incorreta.');
      }
      // scrypt yields: recheck occupancy and lifetime after awaiting it.
      if (rooms.get(room.code) !== room) return fail(res, 404, 'room_missing', 'A sala foi encerrada.');
      if (room.guest && room.guest.expires <= Date.now() && !room.guest.ws) room.guest = null;
      if (room.guest) return fail(res, 409, 'room_full', 'Esta sala já está cheia.');
      if (room.started) return fail(res, 409, 'already_started', 'Esta partida já começou.');
      room.guest = participant();
      res.json({ room: publicRoom(room), token: room.guest.token });
    } catch { fail(res, 500, 'join_failed', 'Não foi possível entrar na sala.'); }
  });

  const relay = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024, perMessageDeflate: false });
  const send = (ws, data) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
  function removeRoom(room) {
    if (rooms.get(room.code) !== room) return;
    rooms.delete(room.code);
    for (const person of [room.host, room.guest]) {
      if (!person) continue;
      send(person.ws, { type: 'error', code: 'room_closed', message: 'O host encerrou a sala.' });
      person.ws?.close(1000, 'Room closed');
    }
  }
  relay.on('connection', ws => {
    ws._socket?.setNoDelay(true);
    let room = null, person = null, role = null, explicit = false;
    let count = 0, bytes = 0, windowStart = Date.now();
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('error', () => {});
    const authTimer = setTimeout(() => ws.close(4001, 'Authentication required'), 8000);
    ws.on('message', raw => {
      try {
        const now = Date.now();
        if (now - windowStart > 1000) { count = 0; bytes = 0; windowStart = now; }
        if (++count > 180 || (bytes += raw.length) > 8 * 1024 * 1024) return ws.close(4008, 'Rate limit');
        const message = JSON.parse(raw.toString());
        if (!person) {
          if (message.type !== 'auth') return ws.close(4001, 'Authentication required');
          room = rooms.get(cleanCode(message.code));
          role = room?.host.token === message.token ? 'host' : room?.guest?.token === message.token ? 'guest' : null;
          person = role && room[role];
          if (!person || (!person.ws && person.expires < now)) {
            person = null;
            send(ws, { type: 'error', code: 'session_expired', message: 'A sala expirou ou o servidor reiniciou. Crie uma nova sala.' });
            return ws.close(4001, 'Invalid session');
          }
          clearTimeout(authTimer);
          const previous = person.ws;
          person.ws = ws; person.generation++; person.expires = Infinity;
          previous?.close(4000, 'Reconnected');
          const other = room[role === 'host' ? 'guest' : 'host'];
          send(ws, { type: 'ready', peer: !!other?.ws, room: publicRoom(room) });
          if (other?.ws) send(other.ws, { type: 'peer', connected: true });
          return;
        }
        if (person.ws !== ws) return;
        if (message.type === 'leave') { explicit = true; return ws.close(1000, 'Left room'); }
        if (message.type === 'heartbeat') return send(ws, { type: 'heartbeat' });
        const data = message.data;
        if (message.type !== 'data' || !data || typeof data !== 'object' || !commands.has(data.t)) return;
        if (role === 'guest' && !guestCommands.has(data.t)) return;
        if (role === 'host' && data.t === 'start') room.started = true;
        if (data.t === 'bye') explicit = true;
        const other = room[role === 'host' ? 'guest' : 'host'];
        if (!other?.ws || other.ws.readyState !== WebSocket.OPEN) return;
        if (data.t === 'state' && other.ws.bufferedAmount > 32 * 1024) return;
        if (other.ws.bufferedAmount > 2 * 1024 * 1024) return other.ws.close(4009, 'Slow connection');
        send(other.ws, { type: 'data', data: { ...data, from: person.id } });
      } catch { ws.close(4002, 'Invalid message'); }
    });
    ws.on('close', () => {
      clearTimeout(authTimer);
      if (!person || person.ws !== ws || rooms.get(room.code) !== room) return;
      person.ws = null; person.expires = Date.now() + (explicit ? 0 : reconnectMs);
      const generation = person.generation;
      setTimeout(() => {
        if (person.ws || person.generation !== generation || rooms.get(room.code) !== room) return;
        if (role === 'host') removeRoom(room);
        else if (room.guest === person) { room.guest = null; send(room.host.ws, { type: 'peer', connected: false }); }
      }, explicit ? 0 : reconnectMs).unref();
    });
  });
  let peerSocket = null;
  if (legacyPeer) {
    const peer = ExpressPeerServer(server, { path: '/', key: 'peerjs', proxied: true, allow_discovery: false, concurrent_limit: 100,
      createWebSocketServer(options) { peerSocket = new WebSocketServer({ noServer: true, path: options.path }); return peerSocket; },
    });
    app.use('/peerjs', peer);
  }
  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    const target = path === '/relay' ? relay : peerSocket?.shouldHandle(req) ? peerSocket : null;
    if (!target || !originAllowed(req.headers.origin) || relay.clients.size > roomLimit * 3) return socket.destroy();
    target.handleUpgrade(req, socket, head, ws => target.emit('connection', ws, req));
  });
  app.use((_req, res) => fail(res, 404, 'not_found', 'Rota não encontrada. Use /health para verificar o servidor.'));
  app.use((_error, _req, res, _next) => fail(res, 400, 'invalid_request', 'Requisição inválida.'));
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (!room.host.ws && room.host.expires < now) removeRoom(room);
      else if (room.guest && !room.guest.ws && room.guest.expires < now) {
        room.guest = null; send(room.host.ws, { type: 'peer', connected: false });
      }
    }
    for (const [ip, limit] of limits) if (limit.until < now) limits.delete(ip);
    for (const ws of relay.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false; ws.ping();
    }
  }, 10000);
  sweep.unref();
  return { server, rooms, close() { clearInterval(sweep); for (const ws of relay.clients) ws.terminate(); relay.close(); peerSocket?.close(); server.close(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const game = createGameServer();
  const port = Number(process.env.PORT || 9000);
  game.server.listen(port, '0.0.0.0', () => console.log(`Cobrinha online na porta ${port}: /health, /rooms, /relay e /peerjs`));
  process.on('SIGTERM', () => { game.close(); process.exit(0); });
  process.on('SIGINT', () => { game.close(); process.exit(0); });
}
