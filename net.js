"use strict";
/* ============ REDE: relay PHP (long polling), MQTT público ou WebRTC LAN ============ */
const BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
  "wss://mqtt.eclipseprojects.io:443/mqtt",
];
const T = { PHP: "php", MQTT: "mqtt", WEBRTC: "webrtc" };


// Detecta se está em rede local (mesmo subnet)
function isLocalNetwork() {
  return window.location.hostname === "localhost" || 
         window.location.hostname === "127.0.0.1" ||
         window.location.hostname.startsWith("192.168.") ||
         window.location.hostname.startsWith("10.") ||
         window.location.hostname.endsWith(".local");
}

// Carrega PeerJS para WebRTC
function ensurePeerJS() {
  return new Promise((res) => {
    if (typeof Peer !== "undefined") return res(true);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    s.onload = () => res(typeof Peer !== "undefined");
    s.onerror = () => res(false);
    document.head.appendChild(s);
  });
}
async function detectPhp() {
  try {
    const r = await fetch("relay.php?ping=1", { cache: "no-store" });
    if (!r.ok) return false;
    const t = await r.text();
    return t.indexOf("PHPRELAY_OK") >= 0;
  } catch (e) {
    return false;
  }
}

function ensureMqtt() {
  return new Promise((res) => {
    if (typeof mqtt !== "undefined") return res(true);
    const urls = [
      "https://unpkg.com/mqtt/dist/mqtt.min.js",
      "https://cdn.jsdelivr.net/npm/mqtt/dist/mqtt.min.js",
    ];
    let i = 0;
    function next() {
      if (i >= urls.length) return res(false);
      const s = document.createElement("script");
      s.src = urls[i++];
      s.onload = () => res(typeof mqtt !== "undefined");
      s.onerror = next;
      document.head.appendChild(s);
    }
    next();
  });
}

/* ---------- PHP ---------- */
function PhpTransport(code, isHost, onRaw, onStatus) {
  const base =
    "relay.php?room=" + encodeURIComponent(String(code).toLowerCase());
  const myBox = isHost ? "a" : "b",
    pushBox = isHost ? "b" : "a";
  let alive = true,
    after = -1;
  onStatus("🖥️ relay PHP ativo");
  (async () => {
    while (alive) {
      try {
        const r = await fetch(
          base + "&side=" + myBox + "&after=" + after + "&wait=1",
          { cache: "no-store" },
        );
        if (!r.ok) throw new Error("http");
        const j = await r.json();
        if (j && j.msgs)
          for (const m of j.msgs) {
            if (m.i > after) after = m.i;
            onRaw(m.d);
          }
      } catch (e) {
        if (alive) {
          onStatus("⚠️ relay PHP instável, tentando de novo...");
          await new Promise((r2) => setTimeout(r2, 1200));
        }
      }
    }
  })();
  return {
    send: (o) => {
      if (alive)
        fetch(base + "&side=" + pushBox, {
          method: "POST",
          body: JSON.stringify(o),
          keepalive: true,
        }).catch(() => {});
    },
    close() {
      alive = false;
    },
  };
}

/* ---------- MQTT ---------- */
function MqttTransport(code, onRaw, onUp, onStatus, onErr) {
  const topic = "srkx/" + String(code).toLowerCase();
  let alive = true,
    stopped = false,
    bi = 0,
    client = null;
  const transport = {
    send() {},
    close() {
      alive = false;
      stopped = true;
      try {
        client && client.end(true);
      } catch (e) {}
    },
  };
  function attempt() {
    if (!alive || stopped) return;
    if (bi >= BROKERS.length) bi = 0;
    const url = BROKERS[bi++];
    onStatus(
      "🌐 MQTT: conectando em " +
        url.replace("wss://", "").split(":")[0] +
        "...",
    );
    let c,
      done = false;
    try {
      c = mqtt.connect(url, {
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
      if (alive && !stopped) setTimeout(attempt, 700);
    };
    setTimeout(fail, 5500);
    c.on("error", fail);
    c.on("connect", () => {
      if (done) return;
      done = true;
      c.subscribe(topic, { qos: 0 });
      c.on("message", (t, p) => {
        if (t !== topic) return;
        let d;
        try {
          d = JSON.parse(new TextDecoder().decode(p));
        } catch (e) {
          return;
        }
        onRaw(d);
      });
      c.on("close", () => {
        if (alive && !stopped) {
          onStatus("🔁 MQTT caiu, reconectando...");
          setTimeout(attempt, 900);
        }
      });
      transport.send = (o) => {
        try {
          c.publish(topic, JSON.stringify(o), { qos: 0 });
        } catch (e) {}
      };
      onUp();
    });
  }
  (async () => {
    const ok = await ensureMqtt();
    if (!ok) {
      onErr("não consegui carregar o MQTT (sem internet?)");
      return;
    }
    attempt();
  })();
  return transport;
}

/* ---------- Sessão ---------- */
function createSession(isHost, code, cbs, kind) {
  const myId = Math.random().toString(36).slice(2, 9);
  let alive = true,
    peerKnown = false,
    peerFrom = null,
    tr = null,
    lastSeen = 0,
    warnedStale = false,
    knockTimer = null;
  function S(o) {
    if (tr && alive) {
      o = o || {};
      o.from = myId;
      try {
        tr.send(o);
      } catch (e) {}
    }
  }
  function stopKnock() {
    if (knockTimer) {
      clearInterval(knockTimer);
      knockTimer = null;
    }
  }
  function startKnock() {
    stopKnock();
    S({ t: "knock" });
    knockTimer = setInterval(() => S({ t: "knock" }), 1500);
  }
  function peerUp() {
    if (peerKnown) return;
    peerKnown = true;
    stopKnock();
    cbs.onTransport && cbs.onTransport(kind);
    cbs.onPeer && cbs.onPeer();
  }
  function raw(d) {
    if (!alive || !d || d.from === myId) return;
    lastSeen = Date.now();
    warnedStale = false;
    if (d.t === "hb") return;
    if (isHost) {
      if (d.t === "knock") {
        if (!peerFrom) {
          peerFrom = d.from;
          peerUp();
        }
        if (d.from === peerFrom) S({ t: "welcome", to: peerFrom });
        return;
      }
      if (d.from !== peerFrom) return;
      if (d.t === "bye") {
        peerFrom = null;
        peerKnown = false;
        cbs.onPeerLeave && cbs.onPeerLeave();
        return;
      }
      cbs.onData && cbs.onData(d);
    } else {
      if (d.t === "full") {
        cbs.onStatus && cbs.onStatus("⚠️ essa sala já está cheia.");
        return;
      }
      if (d.t === "welcome" && d.to === myId) {
        if (!peerFrom) {
          peerFrom = d.from;
          peerUp();
        }
        stopKnock();
        return;
      }
      if (d.t === "hostping") return;
      if (d.from !== peerFrom) return;
      if (d.t === "bye") {
        peerFrom = null;
        peerKnown = false;
        cbs.onPeerLeave && cbs.onPeerLeave();
        startKnock();
        return;
      }
      cbs.onData && cbs.onData(d);
    }
  }
  if (kind === T.WEBRTC && isLocalNetwork()) {
    tr = WebRTCTransport(code, isHost, raw, (m) => cbs.onStatus && cbs.onStatus(m), (m) => cbs.onFatal && cbs.onFatal(m));
    if (!isHost) startKnock();
  } else if (kind === T.PHP) {
    tr = PhpTransport(
      code,
      isHost,
      raw,
      (m) => cbs.onStatus && cbs.onStatus(m),
    );
    if (!isHost) startKnock();
  } else {
    tr = MqttTransport(
      code,
      raw,
      () => {
        cbs.onStatus && cbs.onStatus("🌐 MQTT pronto");
        if (isHost) {
          const hp = setInterval(() => {
            if (!alive) {
              clearInterval(hp);
              return;
            }
            if (!peerKnown) S({ t: "hostping" });
          }, 2000);
        } else startKnock();
      },
      (m) => cbs.onStatus && cbs.onStatus(m),
      (m) => cbs.onFatal && cbs.onFatal(m),
    );
  }
  const hb = setInterval(() => {
    if (alive && peerKnown) S({ t: "hb" });
  }, 2500);
  const stale = setInterval(() => {
    if (alive && peerKnown && Date.now() - lastSeen > 12000 && !warnedStale) {
      warnedStale = true;
      cbs.onStatus &&
        cbs.onStatus("⚠️ o outro jogador não responde há alguns segundos...");
    }
  }, 3000);
  return {
    kind,
    send: (o) => {
      if (alive) S(o);
    },
    close() {
      if (!alive) return;
      alive = false;
      stopKnock();
      clearInterval(hb);
      clearInterval(stale);
      S({ t: "bye" });
      if (tr)
        try {
          tr.close();
        } catch (e) {}
    },
  };
}

/* ---------- WebRTC (LAN direta - sem lag) ---------- */
function WebRTCTransport(code, isHost, onRaw, onStatus, onErr) {
  let peer = null;
  let conn = null;
  let alive = true;
  const myId = Math.random().toString(36).slice(2, 9);
  const roomPrefix = "srkx-" + String(code).toLowerCase();
  
  onStatus("🔴 WebRTC: inicializando...");

  async function init() {
    try {
      const ok = await ensurePeerJS();
      if (!ok) throw new Error("PeerJS não carregou");

      const peerId = isHost ? roomPrefix : roomPrefix + "-g-" + myId;
      peer = new Peer(peerId, {
        debug: 2,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      });

      peer.on("open", (id) => {
        onStatus("🔴 WebRTC pronto: " + id);
        if (!isHost) {
          // Guest tenta conectar ao host
          onStatus("🔴 Conectando a " + roomPrefix + "...");
          conn = peer.connect(roomPrefix, {
            reliable: true,
            serialization: "json"
          });
          setupConnection();
        }
      });

      peer.on("connection", (c) => {
        if (conn && conn.open) {
          c.close();
          return;
        }
        conn = c;
        setupConnection();
      });

      peer.on("error", (e) => {
        onErr("WebRTC erro: " + e.type);
      });

      peer.on("disconnected", () => {
        if (alive) {
          onStatus("🔴 WebRTC desconectado, tentando reconectar...");
          setTimeout(() => {
            if (peer) peer.reconnect();
          }, 2000);
        }
      });

    } catch (e) {
      onErr("WebRTC falhou: " + e.message);
    }
  }

  function setupConnection() {
    if (!conn) return;
    
    conn.on("open", () => {
      onStatus("🔴 WebRTC conectado!");
      if (!isHost) {
        onRaw({ t: "knock", from: myId });
      }
    });

    conn.on("data", (d) => {
      if (!alive) return;
      onRaw(d);
    });

    conn.on("close", () => {
      if (alive) {
        onStatus("⚠️ WebRTC conexão fechada");
      }
    });

    conn.on("error", (e) => {
      onErr("WebRTC erro: " + e.message);
    });
  }

  return {
    send: (o) => {
      if (alive && conn && conn.open) {
        try {
          conn.send(o);
        } catch (e) {}
      }
    },
    close() {
      alive = false;
      try {
        conn && conn.close();
        peer && peer.destroy();
      } catch (e) {}
    }
  };
}
