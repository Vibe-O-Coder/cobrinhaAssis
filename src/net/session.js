/* ================= SESSÃO (aperto de mão e keep-alive) =================

   MQTT e relay.php são canais de BROADCAST: os dois lados falam no mesmo lugar,
   então é preciso um aperto de mão (knock -> welcome) para saber quem é quem.
   O WebRTC já é ponto-a-ponto — abriu o canal, achou o parceiro.

   Correções sobre a versão anterior:
   - close() fazia `alive = false` ANTES de `S({t:"bye"})`, e S() só envia se
     `alive` for true. O "bye" nunca saía, então o outro lado só descobria a
     saída pelo tempo limite.
   - O host nunca limpava um `peerFrom` morto: se o convidado recarregasse a
     página, o novo knock vinha com outro id e caía no
     `if (d.from !== peerFrom) return`. A sala ficava inutilizável até o host
     recriá-la. Agora um peer silencioso é liberado.
*/

import { NET_KEEPALIVE_MS, NET_STALE_MS } from "../core/config.js";
import {
  T, LABELS, PhpTransport, MqttTransport, WebRTCTransport,
} from "./transports.js";
import { RelayTransport } from "./relay.js";

const PEER_TIMEOUT_MS = 15000;

export function createSession(isHost, code, cbs, kind, ticket) {
  const myId = Math.random().toString(36).slice(2, 9);
  /* No WebRTC o canal é exclusivo entre os dois navegadores: tudo que chega,
     chega do parceiro. Filtrar por id de remetente aqui seria errado — e foi
     exatamente o que quebrou no primeiro teste, porque o parceiro assina com o
     id ALEATÓRIO dele, não com um valor que este lado possa adivinhar. */
  const direct = kind === T.WEBRTC || kind === T.RELAY;
  let alive = true;
  let peerKnown = false;
  let peerFrom = null;
  let tr = null;
  let lastSeen = 0;
  let warnedStale = false;
  let knockTimer = null;
  let hostPingTimer = null;
  let serial = 0; const received = new Set();

  function send(o) {
    if (!tr || !alive) return;
    o = {...(o || {}), from:myId, mid:++serial};
    try {
      tr.send(o);
    } catch (e) {}
  }

  function stopKnock() {
    if (knockTimer) {
      clearInterval(knockTimer);
      knockTimer = null;
    }
  }
  function startKnock() {
    // A sessão pode já ter sido fechada dentro do próprio onPeerLeave (o menu
    // chama close()). Sem esta guarda, cada desconexão do host deixava para
    // trás um setInterval de 1,2s que ninguém mais conseguia limpar.
    if (!alive) return;
    stopKnock();
    send({ t: "knock" });
    knockTimer = setInterval(() => send({ t: "knock" }), 1200);
  }

  function peerUp() {
    if (peerKnown && kind !== T.RELAY) return;
    peerKnown = true;
    lastSeen = Date.now();
    stopKnock();
    cbs.onTransport && cbs.onTransport(kind, LABELS[kind]);
    cbs.onPeer && cbs.onPeer();
  }

  function peerDown() {
    if (!peerKnown && !peerFrom) return;
    peerFrom = null;
    peerKnown = false;
    received.clear();
    cbs.onPeerLeave && cbs.onPeerLeave();
  }

  function raw(d) {
    if (!alive || !d || d.from === myId) return;

    /* Só conta como "sinal de vida" o que vem do parceiro estabelecido.
       Antes qualquer pacote renovava o relógio — inclusive as batidas de um
       convidado NOVO tentando entrar. Resultado: se o convidado antigo fechasse
       a aba sem se despedir, as batidas do novo mantinham a vaga morta viva
       para sempre, o host respondia "sala cheia" eternamente e a sala só
       voltava a funcionar se o host a recriasse. */
    if (direct || !peerFrom || d.from === peerFrom) {
      lastSeen = Date.now();
      warnedStale = false;
    }

    if (d.mid && (direct || d.from === peerFrom)) {
      const id = d.from + ":" + d.mid;
      if (received.has(id)) return;
      received.add(id);
      if (received.size > 512) received.delete(received.values().next().value);
    }
    if (d.t === "hb") return;

    // Canal direto: sem aperto de mão, sem filtro de remetente.
    if (direct) {
      if (!peerFrom) peerFrom = d.from;
      if (d.t === "knock" || d.t === "welcome" || d.t === "hostping") return;
      if (d.t === "bye") {
        peerDown();
        return;
      }
      cbs.onData && cbs.onData(d);
      return;
    }

    if (isHost) {
      if (d.t === "knock") {
        if (!peerFrom) {
          peerFrom = d.from;
          peerUp();
        }
        // Responde sempre ao peer atual: se o welcome se perdeu, o knock
        // seguinte é atendido de novo.
        if (d.from === peerFrom) send({ t: "welcome", to: peerFrom });
        else send({ t: "full", to: d.from });
        return;
      }
      if (d.from !== peerFrom) return;
      if (d.t === "bye") {
        peerDown();
        return;
      }
      cbs.onData && cbs.onData(d);
      return;
    }

    // convidado
    if (d.t === "full" && d.to === myId) {
      // Pode ser sala realmente cheia OU uma vaga ainda presa por um jogador
      // que caiu. A vaga presa é liberada sozinha em poucos segundos e as
      // batidas continuam, então não é um erro final.
      cbs.onStatus &&
        cbs.onStatus("⏳ a sala está ocupada — se alguém caiu, a vaga libera em instantes...");
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
      peerDown();
      startKnock(); // host pode voltar
      return;
    }
    cbs.onData && cbs.onData(d);
  }

  const status = (m) => cbs.onStatus && cbs.onStatus(m);
  const fatal = (m) => cbs.onFatal && cbs.onFatal(m);

  if (kind === T.RELAY) {
    tr = RelayTransport(ticket, raw, status, fatal, peerUp, peerDown, cbs.onReady);
  } else if (kind === T.WEBRTC) {
    // Canal direto: quando o DataChannel abre, o parceiro está lá.
    tr = WebRTCTransport(code, isHost, raw, status, fatal, () => {
      peerFrom = peerFrom || "webrtc";
      peerUp();
    });
  } else if (kind === T.PHP) {
    tr = PhpTransport(code, isHost, raw, status);
    if (isHost) status("🖥️ sala aberta no relay PHP — esperando o outro jogador");
    else startKnock();
  } else {
    tr = MqttTransport(
      code,
      raw,
      () => {
        status(
          isHost
            ? "🌐 sala aberta no MQTT — esperando o outro jogador"
            : "🌐 MQTT pronto, procurando a sala...",
        );
        if (isHost) {
          /* O MQTT chama este callback a CADA reconexão do broker (e os
             brokers públicos caem com frequência). Sem limpar o anterior,
             cada reconexão empilhava mais um timer e o host passava a
             publicar N hostpings a cada 2 segundos. */
          clearInterval(hostPingTimer);
          hostPingTimer = setInterval(() => {
            if (!alive) {
              clearInterval(hostPingTimer);
              return;
            }
            if (!peerKnown) send({ t: "hostping" });
          }, 2000);
        } else {
          startKnock();
        }
      },
      status,
      fatal,
    );
  }

  const hb = setInterval(() => {
    if (alive && peerKnown) send({ t: "hb" });
  }, NET_KEEPALIVE_MS);

  const stale = setInterval(() => {
    if (!alive || !peerKnown) return;
    const silent = Date.now() - lastSeen;
    if (silent > PEER_TIMEOUT_MS) {
      // Libera a vaga: sem isso o host trava a sala para sempre se o
      // convidado fechar a aba ou recarregar a página.
      status("⚠️ o outro jogador sumiu — sala liberada.");
      peerDown();
      if (!isHost && !direct) startKnock();
      return;
    }
    if (silent > NET_STALE_MS && !warnedStale) {
      warnedStale = true;
      status("⚠️ o outro jogador não responde há alguns segundos...");
    }
  }, 2000);

  return {
    kind,
    label: LABELS[kind],
    send(o) {
      if (alive) send(o);
    },
    close() {
      if (!alive) return;
      // manda o adeus ANTES de desligar — era o contrário e o "bye" se perdia
      send({ t: "bye" });
      alive = false;
      stopKnock();
      clearInterval(hostPingTimer);
      clearInterval(hb);
      clearInterval(stale);
      if (tr) {
        try {
          tr.close();
        } catch (e) {}
      }
    },
  };
}
