#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    throw new Error(`dist/ not found at ${dir}. Run the site build first.`);
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(dist);
const banned = files.filter((file) => {
  const base = path.basename(file).toLowerCase();
  return base.endsWith(".dta") || base === "mcs_class.csv";
});

if (banned.length > 0) {
  console.error("Dataset files leaked into dist/:\n" + banned.join("\n"));
  process.exit(1);
}

console.log(`dist/ is clean (${files.length} files, no class dataset).`);
