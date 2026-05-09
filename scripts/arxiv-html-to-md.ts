#!/usr/bin/env bun
/*
  Fetch arXiv HTML version (LaTeXML-rendered) for each paper in papers/index.json
  and convert to markdown via turndown.

  Output: papers/<id>/paper.md
  Skips: papers/<id>/paper.md if it already exists (use --refresh to overwrite)
*/

import TurndownService from "turndown";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const INDEX = "/Users/niquola/fhir2omop/papers/index.json";
const refresh = process.argv.includes("--refresh");
const onlyArg = process.argv.find(a => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1] : null;

type Paper = { id: string; title: string; url: string; published: string };
const index = JSON.parse(readFileSync(INDEX, "utf8")) as { papers: Paper[] };

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Drop noise: nav, footnotes markers, MathJax script tags, equation rendering wrappers.
turndown.remove(["script", "style", "noscript"]);
turndown.addRule("ltx-bibitem", {
  filter: (node: any) => node.classList?.contains("ltx-bibitem"),
  replacement: (content: string) => `- ${content.replace(/\s+/g, " ").trim()}\n`,
});

async function fetchHtml(id: string, version: string): Promise<string | null> {
  const url = `https://arxiv.org/html/${id}${version}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "fhir2omop-arxiv-loader/1.0 (niquola@health-samurai.io)" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  // arXiv returns 200 with a "no HTML available" page for some papers.
  if (html.includes("No HTML for this paper") || html.length < 5000) return null;
  return html;
}

function extractArticle(html: string): string {
  // LaTeXML wraps the paper body in <article class="ltx_document">
  const m = html.match(/<article[^>]*class="[^"]*ltx_document[^"]*"[^>]*>([\s\S]*?)<\/article>/);
  return m ? m[1] : html;
}

let ok = 0;
let skipped = 0;
let failed: string[] = [];

for (const p of index.papers) {
  if (only && p.id !== only) continue;
  const out = `/Users/niquola/fhir2omop/papers/${p.id}/paper.md`;
  if (existsSync(out) && !refresh) {
    skipped++;
    continue;
  }
  // Probe v1, v2, v3 in order until one returns HTML.
  let html: string | null = null;
  let version = "";
  for (const v of ["v1", "v2", "v3", "v4", ""]) {
    html = await fetchHtml(p.id, v);
    if (html) { version = v; break; }
  }
  if (!html) {
    console.log(`✗ ${p.id} — no HTML available`);
    failed.push(p.id);
    continue;
  }
  const article = extractArticle(html);
  const md = turndown.turndown(article);
  const header = [
    `# ${p.title}`,
    ``,
    `- arXiv: [${p.id}${version}](${p.url})`,
    `- Published: ${p.published}`,
    `- Source: \`https://arxiv.org/html/${p.id}${version}\``,
    ``,
    `---`,
    ``,
  ].join("\n");
  writeFileSync(out, header + md + "\n");
  console.log(`✓ ${p.id} — ${(md.length / 1024).toFixed(1)} KB → ${out}`);
  ok++;
  // Be polite — arXiv ToU asks for spacing between requests.
  await new Promise(r => setTimeout(r, 3500));
}

console.log("");
console.log(`Done. ok=${ok}, skipped=${skipped}, failed=${failed.length}`);
if (failed.length) console.log(`Failed IDs: ${failed.join(", ")}`);
