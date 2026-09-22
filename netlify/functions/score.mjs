/* ================= RANKING GLOBAL — Netlify Function =================

   Substitui netlify/functions/score.js, que usava fs.writeFileSync sobre
   __dirname. O sistema de arquivos de uma Function é somente-leitura e some a
   cada invocação, então aquela escrita sempre falhava (EROFS) e o GET sempre
   devolvia lista vazia — o ranking nunca chegou a ser global de verdade.

   Aqui o armazenamento é o Netlify Blobs, que é persistente e compartilhado
   entre todas as invocações e todos os jogadores.

   Contrato (o mesmo que src/ui/leaderboard.js espera):
     GET  /.netlify/functions/score?limit=50  -> { ok, scores: [...], source }
     POST /.netlify/functions/score           -> { ok }
          corpo: { name, score, wave, kills, cls }
*/

import { getStore } from "@netlify/blobs";

const STORE = "leaderboard";
const KEY = "scores";
const MAX_ROWS = 500;
const MAX_RETURN = 100;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

function clampInt(v, lo, hi) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/** Nome: só letras, números e pontuação leve. Evita HTML e nomes gigantes. */
function cleanName(v) {
  const s = String(v ?? "")
    .replace(/[^\p{L}\p{N} _\-.]/gu, "")
    .trim()
    .slice(0, 16);
  return s || "Viajante";
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  let store;
  try {
    store = getStore(STORE);
  } catch (e) {
    return json({ ok: false, error: "blobs indisponível" }, 500);
  }

  /* ---------- listar ---------- */
  if (req.method === "GET") {
    const url = new URL(req.url);
    const limit = clampInt(url.searchParams.get("limit") || "50", 1, MAX_RETURN);
    let list = [];
    try {
      list = (await store.get(KEY, { type: "json" })) || [];
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list)) list = [];
    const scores = list
      .slice()
      .sort((a, b) => b.score - a.score || a.ts - b.ts)
      .slice(0, limit);
    return json({ ok: true, source: "global", scores });
  }

  /* ---------- enviar ---------- */
  if (req.method === "POST") {
    let b;
    try {
      b = await req.json();
    } catch (e) {
      return json({ ok: false, error: "JSON inválido" }, 400);
    }

    const entry = {
      name: cleanName(b.name),
      score: clampInt(b.score, 0, 9_999_999),
      wave: clampInt(b.wave, 0, 9999),
      kills: clampInt(b.kills, 0, 999999),
      cls: clampInt(b.cls, 0, 99),
      ts: Math.floor(Date.now() / 1000),
    };
    if (entry.score <= 0) {
      return json({ ok: false, error: "pontuação vazia" }, 400);
    }

    let list = [];
    try {
      list = (await store.get(KEY, { type: "json" })) || [];
    } catch (e) {
      list = [];
    }
    if (!Array.isArray(list)) list = [];

    list.push(entry);
    list.sort((a, b2) => b2.score - a.score || a.ts - b2.ts);
    list = list.slice(0, MAX_ROWS);

    try {
      await store.setJSON(KEY, list);
    } catch (e) {
      return json({ ok: false, error: "falha ao gravar" }, 500);
    }

    const rank = list.findIndex((s) => s.ts === entry.ts && s.name === entry.name) + 1;
    return json({ ok: true, rank: rank || null });
  }

  return json({ ok: false, error: "método não suportado" }, 405);
};

export const config = { path: "/.netlify/functions/score" };
