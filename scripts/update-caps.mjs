// Refresh data/players.json from Wikipedia.
// - Updates every player's England caps from their article's infobox.
// - Adds anyone in the current England squad who isn't in the deck yet.
// Usage: node scripts/update-caps.mjs [--dry-run]
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { englandCaps, currentSquad } from "./wikitext.mjs";

const DATA = new URL("../data/players.json", import.meta.url);
const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "PlayYourCapsRight/1.0 (https://github.com/pdobson1/play-your-caps-right)" };
const POSITIONS = new Set(["GK", "DF", "MF", "FW"]);

/** Fetch the wikitext of up to 50 pages per request, following redirects. Returns Map<requestedTitle, text>. */
async function fetchPages(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = new URL(API);
    Object.entries({
      action: "query", format: "json", formatversion: "2", redirects: "1",
      prop: "revisions", rvprop: "content", rvslots: "main", titles: batch.join("|"),
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);
    const json = await res.json();
    // map each requested title through normalisation and redirects to the final page title
    const alias = new Map();
    for (const { from, to } of [...(json.query.normalized || []), ...(json.query.redirects || [])]) alias.set(from, to);
    const resolve = t => { let seen = 0; while (alias.has(t) && seen++ < 5) t = alias.get(t); return t; };
    const byTitle = new Map(json.query.pages.map(p => [p.title, p.revisions?.[0]?.slots?.main?.content]));
    for (const t of batch) { const text = byTitle.get(resolve(t)); if (text) out.set(t, text); }
  }
  return out;
}

/** Write one player per line so diffs in pull requests and commits stay readable. */
function serialise(data) {
  const { players, ...meta } = data;
  const head = JSON.stringify(meta, null, 2).replace(/\n}$/, "");
  return `${head},\n  "players": [\n${players.map(p => "    " + JSON.stringify(p)).join(",\n")}\n  ]\n}\n`;
}

export async function update({ dryRun = false } = {}) {
  const data = JSON.parse(await readFile(DATA, "utf8"));
  const known = new Set(data.players.map(p => p.wiki));
  const changes = [], missing = [];

  // 1. New faces from the current squad
  const squadPage = await fetchPages(["England national football team"]);
  const squad = currentSquad(squadPage.get("England national football team") || "");
  if (!squad.length) console.warn("Could not read the current squad table; skipping new-player check.");
  for (const s of squad) {
    if (known.has(s.wiki) || s.caps < 1) continue;
    data.players.push({
      name: s.name, wiki: s.wiki, caps: s.caps, years: "", pos: POSITIONS.has(s.pos) ? s.pos : "MF",
      era: 2020, active: true, look: null,
    });
    known.add(s.wiki);
    changes.push(`+ ${s.name} added (${s.caps} caps)`);
  }

  // 2. Caps for everyone from their own article
  const pages = await fetchPages(data.players.map(p => p.wiki));
  for (const p of data.players) {
    const found = englandCaps(pages.get(p.wiki) || "");
    if (!found) { missing.push(p.name); continue; }
    if (found.caps !== p.caps) {
      changes.push(`${p.name}: ${p.caps} → ${found.caps}`);
      p.caps = found.caps;
    }
    if (!p.years && found.years) p.years = found.years;
    if (p.active && found.asOf) p.asOf = found.asOf;
  }

  console.log(changes.length ? `Changes:\n  ${changes.join("\n  ")}` : "No caps changed.");
  if (missing.length) console.warn(`No England caps found on Wikipedia for: ${missing.join(", ")}. Check their "wiki" page titles.`);

  // A big miss rate means Wikipedia changed its layout or was unreachable: keep the old date rather than claim accuracy.
  if (missing.length > data.players.length / 2) throw new Error(`Caps missing for ${missing.length} of ${data.players.length} players; not updating.`);

  if (!dryRun) {
    data.updated = new Date().toISOString().slice(0, 10);
    data.source = "English Wikipedia player articles (CC BY-SA 4.0)";
    await writeFile(DATA, serialise(data));
  }
  return { changes, missing };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  update({ dryRun: process.argv.includes("--dry-run") }).catch(err => { console.error(err); process.exit(1); });
}

export { serialise };
