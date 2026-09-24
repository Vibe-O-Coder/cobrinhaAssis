/* ================= ÁUDIO ================= */
import { $ } from "./utils.js";

let AC = null;
let muted = false;

export function audioContext() { return AC; }

export function initAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      /* sem áudio disponível */
    }
  }
  // Navegadores suspendem o contexto até haver interação do usuário.
  if (AC && AC.state === "suspended") AC.resume().catch(() => {});
}

const PRESETS = {
  eat: [520, 900, 0.08, "square", 0.05],
  gold: [660, 1400, 0.18, "triangle", 0.09],
  hurt: [200, 55, 0.22, "sawtooth", 0.13],
  shoot: [760, 320, 0.06, "square", 0.025],
  kill: [420, 70, 0.16, "square", 0.06],
  up: [440, 1200, 0.32, "triangle", 0.09],
  ab: [180, 700, 0.22, "sine", 0.12],
  boss: [90, 42, 0.7, "sawtooth", 0.16],
  win: [523, 1568, 0.9, "triangle", 0.12],
};

const lastSound = new Map();
let voices = 0;
export function sfx(type) {
  if (muted || !AC) return;
  const P = PRESETS[type];
  if (!P) return;
  const t = AC.currentTime;
  const gap = type === 'shoot' ? .045 : type === 'kill' ? .06 : .025;
  if(voices>=24 || t-(lastSound.get(type)??-1)<gap)return;
  lastSound.set(type,t);voices++;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.connect(g);
  g.connect(AC.destination);
  o.type = P[3];
  o.frequency.setValueAtTime(P[0], t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, P[1]), t + P[2]);
  g.gain.setValueAtTime(P[4], t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + P[2]);
  o.start(t);
  o.stop(t + P[2] + 0.03);
  o.onended=()=>{voices--;o.disconnect();g.disconnect();};
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  const b = $("#muteBtn");
  if (b) b.textContent = muted ? "🔇 Som: desligado" : "🔊 Som: ligado";
}
