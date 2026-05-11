#!/usr/bin/env bun
// Fetch a prepared Athena vocabulary bundle via CDP.
//
// Athena's download flow is async:
//   1. Pick vocabularies at https://athena.ohdsi.org/vocabulary/list and DOWNLOAD.
//   2. Athena builds a ZIP server-side (PENDING → ready, usually <1 hour).
//   3. Once ready, the bundle appears at /vocabulary/download-history with a
//      "Download" button that issues a signed S3 URL.
//
// This script uses the cdp skill (Chrome session with Athena cookies already
// logged in) to navigate the history page, click Download on the first ready
// bundle, and copy the resulting ZIP into ./athena/.
//
// Prereqs:
//   tmux new-session -d -s cdp 'bun ~/.agent/skills/cdp/src/index.js'
//   curl localhost:2229/s/athena -d '{"method":"Page.navigate","params":{"url":"https://athena.ohdsi.org/"}}'
//   (log in manually once — cookies persist in the CDP profile)

import { $ } from "bun";

const CDP = "http://localhost:2229/s/athena";
const OUT_DIR = `${import.meta.dir}/../athena`;

async function cdp(method: string, params: object = {}) {
  const res = await fetch(CDP, {
    method: "POST",
    body: JSON.stringify({ method, params }),
  });
  return res.json();
}

async function evalJS(expression: string) {
  const r: any = await cdp("Runtime.evaluate", { expression, returnByValue: true });
  return r?.result?.value;
}

await $`mkdir -p ${OUT_DIR}`;

console.log("Navigating to download history…");
await cdp("Page.navigate", { url: "https://athena.ohdsi.org/vocabulary/download-history" });
await Bun.sleep(4000);

const bundles = await evalJS(`
  JSON.stringify(Array.from(document.querySelectorAll('[class*="download-history__item"], [class*="DownloadHistory"]'))
    .map(el => ({
      text: el.innerText.slice(0, 200),
      hasDownload: !!el.querySelector('button, a').textContent.match(/^Download$/i),
    })))
`);
console.log("Bundles on page:", bundles);

const ready = await evalJS(`
  (() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const dl = btns.find(b => /^Download$/i.test(b.textContent.trim()));
    if (!dl) return null;
    dl.click();
    return 'clicked';
  })()
`);

if (!ready) {
  console.error("No ready bundle found. Latest bundle is likely still PENDING.");
  console.error("Wait for the email from Athena, then re-run.");
  process.exit(1);
}

console.log("Clicked Download — waiting for ZIP…");
// CDP browser saves to its default download dir; we poll the cdp profile's
// downloads folder. Adjust if your CDP profile uses a different location.
const dlDir = `${process.env.HOME}/.agent/skills/cdp/chrome-profile/Default/Downloads`;
for (let i = 0; i < 60; i++) {
  const found = await $`ls -1t ${dlDir} 2>/dev/null | head -1`.text();
  const f = found.trim();
  if (f && f.endsWith(".zip")) {
    console.log(`Found: ${f}`);
    await $`mv ${dlDir}/${f} ${OUT_DIR}/`;
    await $`cd ${OUT_DIR} && unzip -o ${f}`;
    console.log(`Extracted to ${OUT_DIR}/`);
    process.exit(0);
  }
  await Bun.sleep(5000);
}

console.error("Timed out waiting for ZIP. Check the browser session manually.");
process.exit(1);
