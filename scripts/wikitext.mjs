// Small, dependency-free helpers for reading football data out of Wikipedia wikitext.

const ENGLAND_SENIOR = /^\s*\[\[\s*England national football team\s*(\|[^\]]*)?\]\]\s*$/i;

/** Remove refs, comments and nested templates so a value can be read as plain text. */
export function clean(value) {
  return String(value ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Find the template that starts at `start` (pointing at "{{") and return its inner text. */
function templateBody(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{") { depth++; i++; }
    else if (text[i] === "}" && text[i + 1] === "}") {
      depth--; i++;
      if (depth === 0) return text.slice(start + 2, i - 1);
    }
  }
  return null;
}

/** Split template text into named parameters, ignoring pipes inside [[links]] and {{templates}}. */
export function templateParams(body) {
  const parts = [];
  let depth = 0, current = "";
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "[[" || two === "{{") { depth++; current += two; i++; continue; }
    if ((two === "]]" || two === "}}") && depth > 0) { depth--; current += two; i++; continue; }
    if (body[i] === "|" && depth === 0) { parts.push(current); current = ""; continue; }
    current += body[i];
  }
  parts.push(current);
  const params = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
  }
  return params;
}

/** Return the params of every template whose name matches. */
export function findTemplates(text, name) {
  const out = [];
  const re = new RegExp("\\{\\{\\s*" + name.replace(/ /g, "[ _]") + "\\s*[|}]", "gi");
  let m;
  while ((m = re.exec(text))) {
    const body = templateBody(text, m.index);
    if (body) out.push(templateParams(body));
  }
  return out;
}

/**
 * Read England senior caps from a player's article.
 * Returns { caps, years, asOf } or null when the infobox has no England senior entry.
 */
export function englandCaps(wikitext) {
  const [box] = findTemplates(wikitext, "Infobox football biography");
  if (!box) return null;
  for (let n = 1; n <= 20; n++) {
    const team = box[`nationalteam${n}`];
    if (team === undefined) continue;
    if (!ENGLAND_SENIOR.test(clean(team))) continue;
    const caps = parseInt(clean(box[`nationalcaps${n}`]), 10);
    if (!Number.isFinite(caps)) return null;
    return {
      caps,
      years: clean(box[`nationalyears${n}`]).replace(/-/g, "–") || null,
      asOf: clean(box["nationalteam-update"]) || null,
    };
  }
  return null;
}

/** Read the current squad table from the England national football team article. */
export function currentSquad(wikitext) {
  return findTemplates(wikitext, "nat fs g player").map(p => {
    const link = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(p.name || "");
    if (!link) return null;
    return {
      wiki: link[1].trim(),
      name: (link[2] || link[1]).replace(/\s*\(.*\)$/, "").trim(),
      pos: (p.pos || "").trim().toUpperCase(),
      caps: parseInt(clean(p.caps), 10),
    };
  }).filter(p => p && Number.isFinite(p.caps));
}
