#!/usr/bin/env bun
/*
  Parses /tmp/arxiv-omop-meta.txt produced by:
    bun ~/.claude/skills/arxiv/scripts/arxiv.ts search "all:OMOP" --raw-query --id-list "<ids>" --max-results 50
  and writes papers/index.json + papers/README.md
*/

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "/tmp/arxiv-omop-meta.txt";
const OUT_DIR = "/Users/niquola/fhir2omop/papers";
const FHIR_OMOP_STRICT = new Set(["2507.03067", "2602.11223", "2512.03098"]);

type Paper = {
  id: string;
  title: string;
  authors: string[];
  published: string; // YYYY-MM-DD
  url: string;
  summary: string;
  fhir_omop_strict: boolean;
  pdf: string;
};

const text = readFileSync(SRC, "utf8");
// Split on numbered headings: "[N] Title"
const blocks = text.split(/\n(?=\[\d+\] )/).filter(b => /^\[\d+\] /.test(b));

const papers: Paper[] = blocks.map(block => {
  const lines = block.split("\n");
  const title = lines[0].replace(/^\[\d+\] /, "").trim();
  const get = (prefix: string) => {
    const line = lines.find(l => l.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : "";
  };
  const idUrl = get("ID: ");
  const id = idUrl.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
  const authors = get("Authors: ").split(",").map(s => s.trim()).filter(Boolean);
  const published = get("Published: ").slice(0, 10);
  const url = get("URL: ");
  // Summary is multi-line — everything after "Summary: " until end of block
  const summaryStart = block.indexOf("Summary: ");
  const summary = summaryStart >= 0
    ? block.slice(summaryStart + "Summary: ".length).trim().replace(/\s+/g, " ")
    : "";
  return {
    id,
    title,
    authors,
    published,
    url,
    summary,
    fhir_omop_strict: FHIR_OMOP_STRICT.has(id),
    pdf: `${id}/pdf/${id}.pdf`,
  };
});

papers.sort((a, b) => b.published.localeCompare(a.published));

writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify({
  generated_at: new Date().toISOString(),
  source_query: "all:OMOP",
  total: papers.length,
  fhir_omop_strict_count: papers.filter(p => p.fhir_omop_strict).length,
  papers,
}, null, 2));

const md: string[] = [];
md.push("# FHIR & OMOP arXiv Papers — Index");
md.push("");
md.push(`Generated: ${new Date().toISOString().slice(0, 10)} • Source query: \`all:OMOP\` (33 papers).`);
md.push("");
md.push("Papers explicitly mentioning **both FHIR and OMOP** (strict `all:FHIR AND all:OMOP` query) are marked **[FHIR+OMOP]**.");
md.push("");
md.push("Layout: `papers/<arxiv-id>/pdf/<arxiv-id>.pdf`. Structured metadata in [`index.json`](index.json).");
md.push("");
md.push("---");
md.push("");
md.push("## By date (newest first)");
md.push("");
for (const p of papers) {
  const flag = p.fhir_omop_strict ? " **[FHIR+OMOP]**" : "";
  const authors = p.authors.length > 3
    ? `${p.authors.slice(0, 3).join(", ")}, et al.`
    : p.authors.join(", ");
  md.push(`### ${p.published} · [${p.id}](${p.pdf})${flag}`);
  md.push(`**${p.title}**`);
  md.push("");
  md.push(`*${authors}* · [arXiv](${p.url})`);
  md.push("");
  md.push(`> ${p.summary.slice(0, 600)}${p.summary.length > 600 ? "…" : ""}`);
  md.push("");
}

md.push("---");
md.push("");
md.push("## Quick table");
md.push("");
md.push("| Date | arXiv ID | Title |");
md.push("|---|---|---|");
for (const p of papers) {
  const flag = p.fhir_omop_strict ? " **[FHIR+OMOP]**" : "";
  md.push(`| ${p.published} | [${p.id}](${p.pdf}) | ${p.title}${flag} |`);
}

writeFileSync(join(OUT_DIR, "README.md"), md.join("\n") + "\n");

console.log(`Wrote index for ${papers.length} papers.`);
console.log(`  - ${OUT_DIR}/index.json`);
console.log(`  - ${OUT_DIR}/README.md`);
console.log(`  - FHIR+OMOP strict matches: ${papers.filter(p => p.fhir_omop_strict).length}`);
