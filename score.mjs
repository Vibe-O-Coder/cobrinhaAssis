import { getStore } from "@netlify/blobs";

const json = (o, code = 200) =>
  new Response(JSON.stringify(o), {
    status: code,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "top";
  const store = getStore("leaderboard");
  let list = (await store.get("scores", { type: "json" })) || [];

  if (action === "submit" && req.method === "POST") {
    let b;
    try {
      b = await req.json();
    } catch {
      b = {};
    }
    const name =
      String(b.name ?? "")
        .replace(/[^\p{L}\p{N} _\-.]/gu, "")
        .trim()
        .slice(0, 16) || "Viajante";
    const score = Math.max(0, Math.min(999999, parseInt(b.score) || 0));
    const wave = Math.max(0, Math.min(999, parseInt(b.wave) || 0));
    const cls = Math.max(0, Math.min(99, parseInt(b.cls) || 0));
    if (score > 0) {
      list.push({ name, score, wave, cls, ts: Math.floor(Date.now() / 1000) });
      list.sort((a, b2) => b2.score - a.score);
      list = list.slice(0, 200);
      await store.set("scores", list);
    }
    return json({ ok: true, source: "Netlify" });
  }
  return json({ ok: true, source: "Netlify", list: list.slice(0, 50) });
};
