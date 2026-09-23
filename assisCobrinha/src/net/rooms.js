import { PEER_SERVER } from './peer-config.js';

export function relayOrigin() {
  // Optional boot configuration also makes local integration tests independent of Render.
  const override = globalThis.COBRINHA_RELAY_URL;
  if (override) return String(override).replace(/\/$/, '');
  const port = PEER_SERVER.port;
  const suffix = port && ![80, 443].includes(port) ? ':' + port : '';
  return `${PEER_SERVER.secure ? 'https' : 'http'}://${PEER_SERVER.host}${suffix}`;
}

function aborted() { return new DOMException('Operação cancelada', 'AbortError'); }
const pause = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(aborted());
  const stop = () => { clearTimeout(timer); reject(aborted()); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
  signal?.addEventListener('abort', stop, { once: true });
});

export async function relayRequest(path, { body, signal, timeout = 12000 } = {}) {
  const abort = new AbortController();
  const stop = () => abort.abort();
  if (signal?.aborted) throw aborted();
  signal?.addEventListener('abort', stop, { once: true });
  const timer = setTimeout(stop, timeout);
  try {
    const response = await fetch(relayOrigin() + path, {
      method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: abort.signal,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json) {
      const error = new Error(json?.message || (response.status === 404 ? 'O servidor precisa receber a atualização de salas (peer-server).' : 'O servidor de partidas ainda não respondeu.'));
      error.code = json?.error || (response.status === 404 ? 'server_outdated' : 'unavailable');
      throw error;
    }
    return json;
  } catch (error) {
    if (signal?.aborted) throw aborted();
    if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Sem resposta do servidor de partidas. Confira sua conexão e a publicação no Render.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', stop); }
}

let readyUntil = 0;
export async function wakeRelay({ signal, onStatus = () => {}, timeout = 90000 } = {}) {
  if (Date.now() < readyUntil) return;
  const start = Date.now();
  let failure;
  while (Date.now() - start < timeout) {
    if (signal?.aborted) throw aborted();
    onStatus(Date.now() - start < 5000 ? 'Conectando ao servidor de partidas…' : 'Aguardando o servidor iniciar automaticamente… isso pode levar cerca de um minuto.');
    try {
      const health = await relayRequest('/health', { signal });
      if (health.service !== 'cobrinha-relay' || health.version < 2) {
        const error = new Error('Atualize a pasta peer-server no Render para habilitar salas e conexão automática.');
        error.code = 'server_outdated'; throw error;
      }
      readyUntil = Date.now() + 15000;
      return;
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'server_outdated') throw error;
      failure = error;
      await pause(2500, signal);
    }
  }
  throw failure || new Error('O servidor não iniciou a tempo. Tente novamente ou verifique o serviço no Render.');
}

export async function listRooms(options = {}) { await wakeRelay(options); return (await relayRequest('/rooms', options)).rooms || []; }
export async function reserveRoom(body, options = {}) { await wakeRelay(options); return relayRequest('/rooms', { ...options, body }); }
export async function enterRoom(code, password, options = {}) { await wakeRelay(options); return relayRequest('/rooms/' + encodeURIComponent(code) + '/join', { ...options, body: { password } }); }

export function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return [...crypto.getRandomValues(new Uint8Array(10))].map(n => chars[n % chars.length]).join('');
}
