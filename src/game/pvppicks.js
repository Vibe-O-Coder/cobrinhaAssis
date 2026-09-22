/* Escolhas independentes por jogador: a arena nunca para por uma carta. */
import { S } from '../core/state.js';
import { $, sample, esc } from '../core/utils.js';
import { PVP_UPGRADES } from '../data/pvpupgrades.js';
import { canOffer } from '../data/upgrades.js';
import { grantPower } from './player.js';
import { sfx } from '../core/audio.js';

export function beginPvpChoice(pi) {
  const p = S.players[pi], st = S.pvp;
  if (!st || st.over || !p || p.dead) return;
  st.pending[pi]++;
  offerNext(pi);
}
function offerNext(pi) {
  const st = S.pvp;
  if (!st || st.choices[pi] || !st.pending[pi]) return;
  const p = S.players[pi];
  const eligible = PVP_UPGRADES.map((o,k)=>({o,k})).filter(({o})=>canOffer(o,p));
  const normal = eligible.filter(({o})=>!o.overflow);
  const pool = normal.length >= 3 ? normal : eligible;
  st.pending[pi]--;
  st.choices[pi] = { id: ++st.pickId, opts: sample(pool.map(({k})=>k), 3), level: p.level };
  renderPvpChoices();
}
export function choosePvpPower(pi, id, k) {
  const st = S.pvp, choice = st?.choices[pi], p = S.players[pi];
  if (!st || st.over || !p || p.dead || !choice || choice.id !== id || !choice.opts.includes(k)) return false;
  const power = PVP_UPGRADES[k];
  if (!power || !canOffer(power,p)) return false;
  grantPower(p,power);
  st.choices[pi] = null;
  offerNext(pi);
  renderPvpChoices();
  return true;
}
let rendered = '';
export function renderPvpChoices() {
  const wrap = $('#pvpChoices');
  if (!wrap) return;
  const st = S.role === 'guest' ? S.rs?.pvp : S.pvp;
  const active = S.mode === 'pvp' && S.runActive && st && !st.over;
  const indices = S.pvpLocal ? [0,1] : [S.role === 'guest' ? 1 : 0];
  const key = active ? JSON.stringify(indices.map(i=>[i,st.choices?.[i],st.pending?.[i]])) + S.pvpLocal : '';
  if (key === rendered) return;
  rendered = key;
  wrap.replaceChildren();
  wrap.classList.toggle('split',S.pvpLocal);
  if (!active) return;
  for (const pi of indices) {
    const choice = st.choices?.[pi];
    if (!choice) continue;
    const panel = document.createElement('section');
    panel.className = 'pvp-choice player-' + pi;
    panel.setAttribute('aria-label','Poder do jogador ' + (pi+1));
    const keys = S.pvpLocal && pi === 1 ? ['7','8','9'] : ['1','2','3'];
    panel.innerHTML = `<div class="pick-heading">⬆ J${pi+1} · ESCOLHA EM MOVIMENTO <small>${(st.pending?.[pi]||0) ? '+'+st.pending[pi]+' escolhas' : 'o duelo continua'}</small><button class="pick-collapse" aria-label="Recolher cartas">−</button></div>`;
    panel.querySelector('.pick-collapse').onclick = () => panel.classList.toggle('collapsed');
    choice.opts.forEach((k,index)=>{
      const o = PVP_UPGRADES[k];
      const button = document.createElement('button');
      button.className = 'pvp-card';
      button.innerHTML = `<kbd>${keys[index]}</kbd><span><b>${o.ic} ${esc(o.n)}</b><small>${esc(o.d)}</small></span>`;
      button.onclick = ()=>selectPvpOption(pi,index);
      panel.appendChild(button);
    });
    wrap.appendChild(panel);
  }
}
export function selectPvpOption(pi, index) {
  if (S.paused || S.phase !== 'play' || !S.runActive) return false;
  const st = S.role === 'guest' ? S.rs?.pvp : S.pvp;
  const choice = st?.choices?.[pi];
  if (!choice || choice.opts[index] === undefined) return false;
  const k = choice.opts[index];
  if (S.role === 'guest') S.net?.send({t:'pvpPick',id:choice.id,k});
  else choosePvpPower(pi,choice.id,k);
  sfx('gold');
  return true;
}
