import { PEER_SERVER } from "./peer-config.js";

/* ================= TRANSPORTES DE REDE =================

   Três caminhos, do menor para o maior lag:

   1. WebRTC (PeerJS)  — dados vão DIRETO de um navegador ao outro. Na mesma
      rede da escola isso é praticamente instantâneo. Precisa de internet só
      para o aperto de mão inicial (o seu servidor de sinalização PeerServer).
      Funciona no Netlify (HTTPS) e no XAMPP.

   2. relay.php        — funciona sem internet nenhuma, só com o XAMPP na rede
      local. É o mais lento: cada mensagem é uma requisição HTTP e a leitura é
      por consultas curtas com estado mais recente e fila limitada.

   3. MQTT público     — funciona em qualquer lugar, mas passa por um broker na
      internet. O ping medido daqui foi de ~230ms.
*/

const BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
  "wss://mqtt.eclipseprojects.io:443/mqtt",
];

export const T = { PHP: "php", MQTT: "mqtt", WEBRTC: "webrtc" };

/** Hash estável do código da sala — os dois lados precisam chegar ao mesmo número. */
function hashCode(s) {
  let h = 7;
  for (const ch of String(s).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export const LABELS = {
  [T.PHP]: "🖥️ PHP",
  [T.MQTT]: "🌐 MQTT",
  [T.WEBRTC]: "⚡ WebRTC",
};

/* ---------- carregamento sob demanda ---------- */

function loadScript(src) {
  return new Promise((res) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.head.appendChild(s);
  });
}

export async function ensurePeerJS() {
  if (typeof window.Peer !== "undefined") return true;
  for (const url of [
    "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js",
    "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js",
  ]) {
    if (await loadScript(url)) {
      if (typeof window.Peer !== "undefined") return true;
    }
  }
  return false;
}

export async function ensureMqtt() {
  if (typeof window.mqtt !== "undefined") return true;
  for (const url of [
    "https://unpkg.com/mqtt/dist/mqtt.min.js",
    "https://cdn.jsdelivr.net/npm/mqtt/dist/mqtt.min.js",
  ]) {
    if (await loadScript(url)) {
      if (typeof window.mqtt !== "undefined") return true;
    }
  }
  return false;
}

/** Detecta o relay.php. Precisa validar o CONTEÚDO: num host estático o
    arquivo .php é servido como texto puro e um teste de status 200 daria
    falso-positivo, prendendo o jogo num transporte que não funciona. */
export async function detectPhp() {
  try {
    const r = await fetch("backend/relay.php?ping=1", { cache: "no-store" });
    if (!r.ok) return false;
    const t = await r.text();
    // O PHP executado devolve exatamente PHPRELAY_OK. Servido como texto, o
    // arquivo viria com "<?php" junto.
    return t.trim() === "PHPRELAY_OK";
  } catch (e) {
    return false;
  }
}

/* ---------- relay PHP (leituras curtas e fila limitada) ---------- */

export function PhpTransport(code, isHost, onRaw, onStatus) {
  const base = "backend/relay.php?room=" + encodeURIComponent(code.toLowerCase());
  const myBox = isHost ? "a" : "b", pushBox = isHost ? "b" : "a";
  let alive = true, after = -1, sending = false, latest = null;
  const queue = [];
  const abort = new AbortController();
  onStatus("🖥️ LAN: relay local ativo");
  async function flush() {
    if (sending || (!queue.length && !latest)) return;
    sending = true;
    const batch = queue.splice(0,32);
    if (latest) { batch.push(latest); latest=null; }
    try {
      const r = await fetch(base+"&side="+pushBox,{method:"POST",body:JSON.stringify({batch}),signal:abort.signal});
      if (!r.ok) throw new Error("http");
    } catch {
      if (alive) {
        queue.unshift(...batch.filter(m=>m.t!=="state"));
        if(queue.length>128) queue.length=128;
      }
    } finally { sending=false; }
  }
  const timer = setInterval(flush,20);
  (async()=>{
    while(alive) {
      try {
        const r=await fetch(base+"&side="+myBox+"&after="+after+"&wait=0",{cache:"no-store",signal:abort.signal});
        if(!r.ok) throw new Error("http");
        const j=await r.json();
        for(const m of j.msgs || []) { if(m.i<=after) continue; after=m.i; onRaw(m.d); }
        await new Promise(r=>setTimeout(r,30));
      } catch { if(alive) await new Promise(r=>setTimeout(r,500)); }
    }
  })();
  return {
    kind:T.PHP,
    send(o) {
      if(!alive) return;
      if(o.t==="state") latest=o;
      else {
        if(o.t==="k") {const i=queue.findIndex(m=>m.t==="k");if(i>=0) queue.splice(i,1);}
        queue.push(o);
      }
      flush();
    },
    close(){
      // O adeus foi enfileirado pela sessão antes de fechar.
      const remaining=queue.splice(0);
      if(remaining.length) fetch(base+"&side="+pushBox,{method:"POST",body:JSON.stringify({batch:remaining}),keepalive:true}).catch(()=>{});
      alive=false; clearInterval(timer); abort.abort();
    },
  };
}

/* ---------- MQTT ---------- */

export function MqttTransport(code, onRaw, onUp, onStatus, onErr) {
  const topic = "srkx/" + String(code).toLowerCase();
  let alive = true;
  /* O broker inicial é derivado do CÓDIGO DA SALA, não de zero.
     Antes os dois lados começavam no broker 0 e desciam a lista por conta
     própria: se o primeiro falhasse só para um deles, um ficava no emqx e o
     outro no hivemq — cada um "conectado", e nunca se viam. Partindo do mesmo
     ponto, os dois percorrem a mesma ordem. */
  let bi = hashCode(code) % BROKERS.length;
  let client = null;

  const transport = {
    kind: T.MQTT,
    send() {},
    close() {
      alive = false;
      try {
        client && client.end(true);
      } catch (e) {}
    },
  };

  function attempt() {
    if (!alive) return;
    if (bi >= BROKERS.length) bi = 0;
    const url = BROKERS[bi++];
    onStatus("🌐 MQTT: conectando em " + url.replace("wss://", "").split(":")[0] + "...");

    let c;
    let done = false;
    try {
      c = window.mqtt.connect(url, {
        clientId: "srk" + Math.random().toString(36).slice(2, 10),
        connectTimeout: 4500,
        reconnectPeriod: 0,
        clean: true,
      });
    } catch (e) {
      setTimeout(attempt, 900);
      return;
    }
    client = c;

    const fail = () => {
      if (done) return;
      done = true;
      try {
        c.end(true);
      } catch (e) {}
      if (alive) setTimeout(attempt, 700);
    };
    const failTimer = setTimeout(fail, 5500);
    c.on("error", fail);

    c.on("connect", () => {
      if (done) return;
      done = true;
      clearTimeout(failTimer);
      c.subscribe(topic, { qos: 1 });
      c.on("message", (t, p) => {
        if (t !== topic) return;
        try {
          onRaw(JSON.parse(new TextDecoder().decode(p)));
        } catch (e) {
          /* pacote corrompido */
        }
      });
      c.on("close", () => {
        if (alive) {
          onStatus("🔁 MQTT caiu, reconectando...");
          setTimeout(attempt, 900);
        }
      });
      transport.send = (o) => {
        try {
          if (!alive || !c.connected) return;
          c.publish(topic, JSON.stringify(o), { qos: o.t === "state" || o.t === "hb" ? 0 : 1 });
        } catch (e) {}
      };
      onUp();
    });
  }

  (async () => {
    if (!(await ensureMqtt())) {
      onErr("não consegui carregar a biblioteca MQTT (sem internet?)");
      return;
    }
    attempt();
  })();

  return transport;
}

/* ---------- WebRTC direto (PeerJS) ----------
   Correções em relação à versão anterior:
   - o convidado injetava um "knock" falso no PRÓPRIO receptor
     (onRaw em vez de send), então o host nunca era avisado;
   - qualquer erro do PeerJS era tratado como fatal, inclusive
     "peer-unavailable", que é normal enquanto o host ainda não abriu a sala;
   - o id fixo da sala é compartilhado no PeerServer configurado: se o código
     coincidir com o de outra sala, dá "unavailable-id". Agora isso
     é avisado em português em vez de travar calado. */

export function WebRTCTransport(code, isHost, onRaw, onStatus, onErr, onUp) {
  let peer = null;
  let conn = null;
  let alive = true;
  let retries = 0;
  const hostId = "srkx-v2-" + String(code).toLowerCase();

  onStatus("⚡ WebRTC: inicializando...");

  function bind(c) {
    conn = c;
    c.on("open", () => {
      if (!alive) return;
      onStatus("WebRTC conectado (rota direta ou TURN).");
      onUp && onUp();
    });
    c.on("data", (d) => {
      if (alive) onRaw(d);
    });
    c.on("close", () => {
      if (alive) onStatus("⚠️ conexão WebRTC encerrada");
    });
    c.on("error", () => {
      /* erros de canal não são fatais: o keep-alive detecta a queda */
    });
  }

  function tryConnect() {
    if (!alive || isHost || !peer || peer.destroyed) return;
    onStatus("⚡ procurando o host da sala " + code + "...");
    const c = peer.connect(hostId, { reliable: true, serialization: "json" });
    if (c) bind(c);
  }

  (async () => {
    if (!PEER_SERVER.host || PEER_SERVER.host === "SEU-SERVIDOR.onrender.com") {
      onErr("Configure o domínio do Render em src/net/peer-config.js antes de usar WebRTC.");
      return;
    }
    if (!(await ensurePeerJS())) {
      onErr("não consegui carregar o WebRTC (PeerJS). Tente o modo MQTT.");
      return;
    }
    if (!alive) return;

    try {
      peer = new window.Peer(isHost ? hostId : undefined, {
        ...PEER_SERVER,
        debug: 0,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            // TURN público (OpenRelay/Metered) — necessário quando os dois
            // lados estão atrás de CGNAT/NAT restritivo e o STUN sozinho
            // não consegue abrir uma rota direta entre eles.
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443?transport=tcp",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
        },
      });
    } catch (e) {
      onErr("WebRTC falhou ao iniciar: " + e.message);
      return;
    }

    peer.on("open", () => {
      if (!alive) return;
      if (isHost) onStatus("⚡ sala WebRTC aberta — esperando o outro jogador");
      else tryConnect();
    });

    // Só o host recebe conexões.
    peer.on("connection", (c) => {
      if (!alive) return;
      if (conn && conn.open) {
        c.close(); // sala cheia
        return;
      }
      bind(c);
    });

    peer.on("error", (e) => {
      if (!alive) return;
      const type = e && e.type;
      if (type === "peer-unavailable") {
        // normal: o host ainda não abriu. Tenta de novo por um tempo.
        if (++retries <= 12) {
          onStatus("⚡ sala ainda não existe, tentando... (" + retries + "/12)");
          setTimeout(tryConnect, 1500);
        } else {
          onErr("não achei essa sala. Confira o código ou peça pro host criar.");
        }
        return;
      }
      if (type === "unavailable-id") {
        onErr("esse código de sala já está em uso neste servidor. Crie outra sala.");
        return;
      }
      if (type === "network" || type === "server-error" || type === "socket-error") {
        onErr("Sem acesso ao PeerServer configurado. Abra https://" + PEER_SERVER.host + PEER_SERVER.path + " para acordar o Render, aguarde o JSON e recrie a sala.");
        return;
      }
      onErr("WebRTC: " + (type || "erro desconhecido"));
    });
  })();

  return {
    kind: T.WEBRTC,
    send(o) {
      if (alive && conn && conn.open) {
        try {
          // Descarta imagens antigas do mundo em vez de acumular segundos de atraso.
          if (o.t === "state" && ((conn.dataChannel?.bufferedAmount || 0) > 65536 || (conn.bufferSize || 0) > 2)) return;
          conn.send(o);
        } catch (e) {}
      }
    },
    close() {
      alive = false;
      try {
        conn && conn.close();
      } catch (e) {}
      try {
        peer && peer.destroy();
      } catch (e) {}
    },
  };
}
