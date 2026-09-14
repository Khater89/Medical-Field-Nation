import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const TOKEN = "r3st0re-9f2a7c41-mfn-temp";

function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let dollarTag: string | null = null;
  let lineComment = false;
  let blockComment = false;
  let quote: string | null = null;
  while (i < sql.length) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);
    if (lineComment) {
      cur += ch;
      if (ch === "\n") lineComment = false;
      i++;
      continue;
    }
    if (blockComment) {
      cur += ch;
      if (two === "*/") { cur += "/"; i += 2; blockComment = false; continue; }
      i++;
      continue;
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        cur += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (two === "--") { lineComment = true; cur += two; i += 2; continue; }
    if (two === "/*") { blockComment = true; cur += two; i += 2; continue; }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; i++; continue; }
    if (ch === "$") {
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (m) { dollarTag = m[0]; cur += m[0]; i += m[0].length; continue; }
    }
    if (ch === ";") {
      out.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter((s) => s.length > 0 && !/^(--|\/\*)/.test(s) === true || s.length > 0).filter((s) => s.replace(/--[^\n]*\n?/g, "").trim().length > 0);
}

Deno.serve(async (req) => {
  if (req.headers.get("x-restore-token") !== TOKEN) {
    return new Response("forbidden", { status: 403 });
  }
  const perStatement = req.headers.get("x-per-statement") === "1";
  const raw = await req.text();
  const sql = new TextDecoder().decode(
    Uint8Array.from(atob(raw.trim()), (c) => c.charCodeAt(0)),
  );
  const client = new Client(Deno.env.get("SUPABASE_DB_URL")!);
  try {
    await client.connect();
    if (!perStatement) {
      await client.queryArray(sql);
      return Response.json({ ok: true });
    }
    const stmts = splitStatements(sql);
    const errors: string[] = [];
    let applied = 0;
    for (const s of stmts) {
      try {
        await client.queryArray(s);
        applied++;
      } catch (e) {
        errors.push(`${String(e).slice(0, 160)} :: ${s.slice(0, 80)}`);
      }
    }
    return Response.json({ ok: errors.length === 0, total: stmts.length, applied, errors });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) });
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
});
