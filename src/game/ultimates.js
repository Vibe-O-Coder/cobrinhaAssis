/* Evoluções da ativa. Efeitos e ecos são atualizados pela simulação do host,
   sem temporizadores de parede: pausar, morrer ou terminar interrompe tudo. */
import { S } from '../core/state.js';
import { CELL, TAU } from '../core/config.js';
import { dist } from '../core/utils.js';
import { isBoss } from '../data/enemies.js';
import { playerUltimate } from '../data/ultimates.js';
import { bulletDmg } from './stats.js';
import { headPx, heal } from './player.js';
import { cleanupEnemies, stunEnemy, slowEnemy, curseEnemy } from './enemies.js';
import { isPvp, foeOf, pvpHit } from './pvp.js';
import { beam, ring, shockwave, vortex, bombWarning, addText, drain } from '../render/fx.js';

function status(e, u, damage) {
  if (u.status === 'stun') stunEnemy(e, u.duration);
  if (u.status === 'slow' || u.status === 'pull') slowEnemy(e, u.duration, 0.45);
  if (u.status === 'curse') curseEnemy(e, u.duration);
  if (u.status === 'poison') { e.dot = Math.max(e.dot || 0, damage * 0.3); e.dotT = Math.max(e.dotT || 0, u.duration); }
}

function hit(p, e, damage, u) {
  if (e.hp <= 0) return;
  e.hp -= damage * (1 - (e.ward || 0)) * (e.cursedT > 0 ? 2 : 1);
  e.flash = 0.2; e.lastHitBy = p;
  status(e, u, damage);
}

function hitFoe(p, x, y, radius, damage, u) {
  if (!u.pvp) return;
  const foe = foeOf(p);
  if (!foe) return;
  const pos = headPx(foe);
  if (dist(x, y, pos.x, pos.y) <= radius && pvpHit(foe, Math.min(8, damage), p, 'ability') > 0 && u.status)
    foe.pvpSlowT = Math.max(foe.pvpSlowT || 0, Math.min(1.2, u.duration));
}

function area(p, at, u, damage) {
  shockwave(at.x, at.y, u.radius, p.color, 6);
  for (const e of S.enemies) {
    const d = dist(at.x, at.y, e.x, e.y);
    if (e.hp <= 0 || d > u.radius + e.r) continue;
    hit(p, e, damage, u);
    if (u.pattern === 'drain') drain(e.x, e.y, at.x, at.y, p.color);
    if (u.status === 'pull' && !isBoss(e.type) && d > 1) {
      e.x += (at.x - e.x) / d * Math.min(d - 1, 65);
      e.y += (at.y - e.y) / d * Math.min(d - 1, 65);
    }
  }
  hitFoe(p, at.x, at.y, u.radius, damage, u);
}

function projectile(p, at, angle, damage, u) {
  if (S.pbullets.length >= 700) return;
  S.pbullets.push({ x: at.x, y: at.y, vx: Math.cos(angle) * 530, vy: Math.sin(angle) * 530,
    dmg: damage, pierce: 1 + Math.floor(u.level / 3), venom: u.status === 'poison' ? damage * 0.3 : p.venom,
    ls: p.ls, owner: p, color: p.color, crit: false, life: 1.6, hits: [], trail: true,
    ultimateStatus: u.status, ultimateDuration: u.duration });
}

function closestTargets(p, at, range) {
  const targets = S.enemies.filter(e => e.hp > 0 && dist(at.x, at.y, e.x, e.y) <= range + e.r);
  if (isPvp()) {
    const foe = foeOf(p);
    if (foe && !foe.dead) {
      const h = headPx(foe);
      if (dist(at.x, at.y, h.x, h.y) <= range) targets.push({ ...h, player: foe });
    }
  }
  return targets.sort((a, b) => dist(at.x, at.y, a.x, a.y) - dist(at.x, at.y, b.x, b.y));
}

function emit(p, u, origin, index = 0) {
  const at = u.pattern === 'field' ? origin : headPx(p);
  const damage = bulletDmg(p) * u.damage * (u.finisher && index === u.pulses - 1 ? 2 : 1);
  const targets = closestTargets(p, at, Math.max(u.radius, 500));
  const aim = targets[0] ? Math.atan2(targets[0].y - at.y, targets[0].x - at.x) : Math.atan2(p.dir.y, p.dir.x);
  switch (u.pattern) {
    case 'fan': case 'ring': case 'body': {
      const anchors = u.pattern === 'body'
        ? Array.from({ length: Math.min(4, p.cells.length) }, (_, i) => {
          const c = p.cells[Math.floor(i * (p.cells.length - 1) / 3)];
          return { x: (c[0] + 0.5) * CELL, y: (c[1] + 0.5) * CELL };
        }) : [at];
      for (const a of anchors) for (let i = 0; i < u.count; i++) {
        const angle = u.pattern === 'ring' ? i * TAU / u.count + index * 0.15 : aim + (i - (u.count - 1) / 2) * 0.13;
        projectile(p, a, angle, damage, u);
      }
      ring(at.x, at.y, 120, p.color, 5);
      break;
    }
    case 'strike': {
      const selected = targets.filter(t => dist(at.x, at.y, t.x, t.y) <= u.radius).slice(0, u.count);
      for (const target of selected) {
        beam(at.x, at.y, Math.atan2(target.y - at.y, target.x - at.x), dist(at.x, at.y, target.x, target.y), 5, 0.2, p.color);
        if (target.player) hitFoe(p, target.x, target.y, 24, damage, u);
        else hit(p, target, damage, u);
      }
      break;
    }
    case 'line': {
      const dx = Math.cos(aim), dy = Math.sin(aim), width = 24 + u.level * 2;
      beam(at.x, at.y, aim, u.radius, width, 0.35, p.color);
      for (const target of targets) {
        const rx = target.x - at.x, ry = target.y - at.y, along = rx * dx + ry * dy;
        if (along < 0 || along > u.radius || Math.abs(rx * dy - ry * dx) > width + (target.r || 14)) continue;
        if (target.player) hitFoe(p, target.x, target.y, 24, damage, u);
        else hit(p, target, damage, u);
      }
      break;
    }
    case 'meteor': case 'mines': {
      for (let i = 0; i < u.count; i++) {
        const target = u.pattern === 'meteor' ? targets[i] : null;
        const x = target ? target.x : at.x + Math.cos(i * TAU / u.count) * 160;
        const y = target ? target.y : at.y + Math.sin(i * TAU / u.count) * 160;
        S.bombs.push({ x, y, t: 0.7, r: u.radius, dmg: damage, owner: p, mega: !u.pvp, ultimateStatus: u.status, ultimateDuration: u.duration });
        bombWarning(x, y, u.radius, 0.7, p.color);
      }
      break;
    }
    case 'turret': {
      p.ultimateTurrets ??= [];
      for (let i = 0; i < u.count; i++) p.ultimateTurrets.push({ x: at.x + Math.cos(i * TAU / u.count) * 65,
        y: at.y + Math.sin(i * TAU / u.count) * 65, t: 0, life: 4 + u.level, u, damage });
      p.ultimateTurrets = p.ultimateTurrets.slice(-12);
      break;
    }
    case 'tail': {
      const c = p.cells.at(-1); area(p, { x: (c[0] + 0.5) * CELL, y: (c[1] + 0.5) * CELL }, u, damage); break;
    }
    case 'field': vortex(at.x, at.y, u.radius, p.color); area(p, at, u, damage); break;
    default: area(p, at, u, damage);
  }
  cleanupEnemies();
}

export function applyUltimate(p, pvp = false) {
  const u = playerUltimate(p, pvp);
  if (!u || (p.cls === 11 && p.lastGamble < 5)) return;
  const at = headPx(p);
  if (u.support === 'shield') {
    if (pvp) p.guard = Math.min((p.guardMax || 0) + 6, (p.guard || 0) + u.supportAmount);
    else p.shield = Math.min(6, (p.shield || 0) + u.supportAmount);
  }
  if (u.support === 'heal' || u.support === 'grow') heal(p, u.supportAmount);
  if (u.support === 'grow') p.grow += u.supportAmount * 2;
  if (u.support === 'phase') { p.phaseT = Math.max(p.phaseT || 0, u.duration); p.iframes = Math.max(p.iframes, u.duration); }
  emit(p, u, at);
  p.ultimateBursts ??= [];
  for (let i = 1; i < u.pulses; i++) p.ultimateBursts.push({ t: i * 0.7, at, u, index: i });
  addText(at.x, at.y - 50, `${u.name} ${u.level}/10`, p.color, 1.3, 14);
}

export function tickUltimate(p, dt) {
  p.phaseT = Math.max(0, (p.phaseT || 0) - dt);
  if (!isPvp()) p.overdriveT = Math.max(0, (p.overdriveT || 0) - dt);
  if (p.dead) { p.ultimateBursts = []; p.ultimateTurrets = []; return; }
  for (let i = (p.ultimateBursts?.length || 0) - 1; i >= 0; i--) {
    const burst = p.ultimateBursts[i]; burst.t -= dt;
    if (burst.t > 0) continue;
    p.ultimateBursts.splice(i, 1); emit(p, burst.u, burst.at, burst.index);
  }
  for (let i = (p.ultimateTurrets?.length || 0) - 1; i >= 0; i--) {
    const t = p.ultimateTurrets[i]; t.life -= dt; t.t -= dt;
    if (t.life <= 0) { p.ultimateTurrets.splice(i, 1); continue; }
    if (t.t > 0) continue;
    t.t = 0.8;
    const target = closestTargets(p, t, t.u.radius)[0];
    ring(t.x, t.y, 20, p.color, 3);
    if (target) projectile(p, t, Math.atan2(target.y - t.y, target.x - t.x), t.damage, t.u);
  }
}
